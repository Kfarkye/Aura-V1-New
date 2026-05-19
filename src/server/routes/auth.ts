/**
 * Auth Routes — GitHub, Google (Firebase), Yahoo OAuth flows.
 * Extracted from server.ts for modularity.
 */
import type express from 'express';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { Octokit } from '@octokit/rest';
import { google } from 'googleapis';

import { AppLogger } from '../lib/logger.ts';
import { asyncHandler, safeParseJson } from '../utils/core.ts';
import { config } from '../config/env.ts';
import type { BigQueryTelemetry } from '../../infrastructure/gcp/index.ts';

// ── Dependencies injected from server.ts ───────────────────────────────────
export interface AuthRouteDeps {
  bqTelemetry: BigQueryTelemetry;
}

// ── Universal Design Success View ──────────────────────────────────────────
const renderAccessibleAuthSuccess = (title: string, triggerType: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f5f5f7; margin: 0; color: #1d1d1f; -webkit-font-smoothing: antialiased; }
    main { text-align: center; padding: 2.5rem; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); width: 90%; max-width: 400px; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 600; letter-spacing: -0.015em; }
    p { color: #515154; line-height: 1.5; font-size: 0.95rem; margin: 0; }
  </style>
</head>
<body>
  <script>
    if (window.opener) { window.opener.postMessage({ type: '${triggerType}' }, '*'); window.close(); }
    else { window.location.href = '/'; }
  </script>
  <main role="main" aria-live="polite">
    <h1>${title}</h1>
    <p>Identity secured. This window will transition automatically.</p>
  </main>
</body>
</html>
`;

export function setupAuthRoutes(app: express.Express, deps: AuthRouteDeps) {
  const { bqTelemetry } = deps;

  const getBaseUrl = (req: Request) => `${req.protocol}://${req.get('host')}`;
  const getGoogleOAuthClient = (req: Request) => new google.auth.OAuth2(
    config.google.clientId, config.google.clientSecret, config.google.redirectUri || `${getBaseUrl(req)}/auth/google/callback`
  );

  // ── Structured Workspace Audit Logger (SOC 2-aligned, PII-minimized) ─────
  function emitWorkspaceAudit(event: string, details: Record<string, any>) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      domain: 'workspace_oauth',
      event,
      ...details,
    };
    AppLogger.info(`[WORKSPACE_AUDIT] ${event}`, auditEntry);
    bqTelemetry.streamTelemetryEvent(`workspace_audit_${event}`, auditEntry).catch(() => { });
  }

  // ── Google Workspace Scope Definitions (Contract-Compliant) ──────────────
  const GOOGLE_INITIAL_SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];
  const GOOGLE_INCREMENTAL_SCOPES: Record<string, string[]> = {
    drive: ['https://www.googleapis.com/auth/drive.file'],
    docs: ['https://www.googleapis.com/auth/documents.readonly'],
    gmail: ['https://www.googleapis.com/auth/gmail.readonly'],
    youtube: ['https://www.googleapis.com/auth/youtube.readonly'],
  };

  // QA FIX: Browsers drop `SameSite=none` cookies without `Secure`. This matrix ensures local dev doesn't break.
  const getCookieOpts = () => ({
    httpOnly: true,
    secure: config.isProd,
    sameSite: (config.isProd ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/'
  });
  const getClearCookieOpts = () => ({ httpOnly: true, secure: config.isProd, sameSite: (config.isProd ? 'none' : 'lax') as 'none' | 'lax', path: '/' });

  // ── GitHub OAuth ─────────────────────────────────────────────────────────
  app.get('/api/auth/github/url', (req, res) => {
    if (!config.github.clientId) return res.status(500).json({ error: 'GITHUB_CLIENT_ID missing' });
    const state = randomUUID();
    res.cookie('oauth_state_gh', state, { ...getCookieOpts(), maxAge: 600000 });

    const params = new URLSearchParams({
      client_id: config.github.clientId,
      redirect_uri: config.github.redirectUri || `${getBaseUrl(req)}/auth/github/callback`,
      scope: 'repo,workflow,write:packages',
      state
    });
    res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
  });

  app.get(['/auth/github/callback', '/auth/github/callback/'], asyncHandler(async (req, res) => {
    const { code, state } = req.query;

    if (!state || state !== req.cookies.oauth_state_gh) {
      AppLogger.warn('GitHub OAuth CSRF state mismatch', { traceId: (req as any).traceId, hasState: !!state, hasCookie: !!req.cookies.oauth_state_gh });
      return res.status(403).send('Invalid verification state (CSRF rejection).');
    }
    res.clearCookie('oauth_state_gh', getClearCookieOpts());

    try {
      const { data } = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: config.github.clientId, client_secret: config.github.clientSecret, code,
      }, { headers: { Accept: 'application/json' } });

      if (!data.access_token) {
        AppLogger.error('GitHub OAuth token exchange returned no token', null, { traceId: (req as any).traceId, error: data.error, errorDescription: data.error_description });
        return res.status(500).send(`GitHub auth failed: ${data.error_description || data.error || 'No token returned'}`);
      }

      res.cookie('github_token', data.access_token, getCookieOpts());
      res.send(renderAccessibleAuthSuccess('GitHub Sync', 'GITHUB_AUTH_SUCCESS'));
    } catch (err: any) {
      AppLogger.error('GitHub OAuth token exchange failed', err, { traceId: (req as any).traceId });
      res.status(500).send(`GitHub auth failed: ${err.message || 'Token exchange error'}`);
    }
  }));

  // ── Google Identity ────────────────────────────────────────────────────────
  // Google OAuth is now handled by Firebase Auth (signInWithPopup with
  // GoogleAuthProvider) on the client side. The server verifies identity via
  // firebase-admin verifyIdToken() in the firebaseAuth middleware.
  //
  // LIMITATION: Firebase signInWithPopup returns a short-lived Google OAuth
  // access_token suitable for user-initiated Workspace API calls. It does NOT
  // provide durable offline-access/refresh tokens. Background Workspace access
  // requires a separate server-side offline OAuth flow (needs_infrastructure).

  // ── Google Workspace Token Persistence (via Firebase ID token) ───────────
  app.post('/api/auth/google/store-token', asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Firebase ID token' });
    }

    try {
      const admin = (await import('../middleware/firebaseAuth.js')).admin;
      const decoded = await admin.auth().verifyIdToken(authHeader.slice(7));
      const { access_token, scope } = req.body;

      if (!access_token) {
        return res.status(400).json({ error: 'access_token is required' });
      }

      const { storeWorkspaceTokens } = await import('../services/firestoreTokenStore.js');
      await storeWorkspaceTokens(decoded.uid, {
        access_token,
        scope: scope || '',
      });

      emitWorkspaceAudit('oauth_callback_success', {
        traceId: (req as any).traceId,
        uid_hash: decoded.uid.slice(0, 6) + '...',
        has_access_token: true,
        note: 'Stored via Firebase Auth flow',
      });

      res.json({ success: true });
    } catch (err: any) {
      AppLogger.error('Google token store failed', err, { traceId: (req as any).traceId });
      res.status(403).json({ error: 'Invalid Firebase token or storage failure' });
    }
  }));

  // ── Yahoo OAuth ──────────────────────────────────────────────────────────
  app.get('/api/auth/yahoo/url', (req, res) => {
    if (!config.yahoo.clientId) return res.status(500).json({ error: 'YAHOO_CLIENT_ID missing' });
    const state = randomUUID();
    res.cookie('oauth_state_yh', state, { ...getCookieOpts(), maxAge: 600000 });

    const params = new URLSearchParams({
      client_id: config.yahoo.clientId,
      redirect_uri: config.yahoo.redirectUri || `${getBaseUrl(req)}/auth/yahoo/callback`,
      response_type: 'code',
      state
    });
    res.json({ url: `https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}` });
  });

  app.get(['/auth/yahoo/callback', '/auth/yahoo/callback/'], asyncHandler(async (req, res) => {
    const { code, state } = req.query;

    if (!state || state !== req.cookies.oauth_state_yh) {
      AppLogger.warn('Yahoo OAuth CSRF state mismatch', { traceId: (req as any).traceId, hasState: !!state, hasCookie: !!req.cookies.oauth_state_yh });
      if (!code) return res.status(403).send('Invalid verification state (CSRF rejection). No authorization code present.');
    }
    res.clearCookie('oauth_state_yh', getClearCookieOpts());

    try {
      const redirectUri = config.yahoo.redirectUri || `${getBaseUrl(req)}/auth/yahoo/callback`;
      const yahooAuthHeader = Buffer.from(`${config.yahoo.clientId}:${config.yahoo.clientSecret}`).toString('base64');

      const { data } = await axios.post('https://api.login.yahoo.com/oauth2/get_token', new URLSearchParams({
        client_id: config.yahoo.clientId!,
        client_secret: config.yahoo.clientSecret!,
        redirect_uri: redirectUri,
        code: code as string,
        grant_type: 'authorization_code'
      }).toString(), {
        headers: {
          'Authorization': `Basic ${yahooAuthHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!data.access_token) {
        AppLogger.error('Yahoo OAuth token exchange returned no token', null, { traceId: (req as any).traceId, error: data.error, errorDescription: data.error_description });
        return res.status(500).send(`Yahoo auth failed: ${data.error_description || data.error || 'No token returned'}`);
      }

      res.cookie('yahoo_token', JSON.stringify(data), getCookieOpts());
      res.send(renderAccessibleAuthSuccess('Yahoo Sync', 'YAHOO_AUTH_SUCCESS'));
    } catch (err: any) {
      AppLogger.error('Yahoo OAuth token exchange failed', err, { traceId: (req as any).traceId, response: err.response?.data });
      res.status(500).send(`Yahoo auth failed: ${err.message || 'Token exchange error'}`);
    }
  }));

  // ── Auth Status ──────────────────────────────────────────────────────────
  app.get('/api/auth/status', asyncHandler(async (req, res) => {
    const result: any = { github: !!req.cookies.github_token, google: !!req.cookies.google_token, yahoo: !!req.cookies.yahoo_token };

    // Validate GitHub token independently
    if (req.cookies.github_token) {
      try {
        const { data } = await new Octokit({ auth: req.cookies.github_token }).users.getAuthenticated();
        result.githubUser = data.login;
      } catch {
        AppLogger.warn('GitHub token validation failed — marking disconnected', { traceId: (req as any).traceId });
        result.github = false;
      }
    }

    // Validate Google identity via Firebase Auth, fallback to legacy cookie
    const firebaseAuthHeader = req.headers.authorization;
    if (firebaseAuthHeader?.startsWith('Bearer ')) {
      try {
        const admin = (await import('../middleware/firebaseAuth.js')).admin;
        const decoded = await admin.auth().verifyIdToken(firebaseAuthHeader.slice(7));
        result.google = true;
        result.googleUser = decoded.email || decoded.uid;
        result.authSource = 'firebase';

        // Check if Workspace tokens are stored in Firestore
        const { getWorkspaceTokens } = await import('../services/firestoreTokenStore.js');
        const tokens = await getWorkspaceTokens(decoded.uid);
        result.hasWorkspaceTokens = !!tokens;
      } catch {
        AppLogger.warn('Firebase token validation failed — checking legacy cookie', { traceId: (req as any).traceId });
      }
    }

    // Legacy: Validate Google token from cookie (backward compat during migration)
    if (!result.google && req.cookies.google_token) {
      try {
        const tokenPayload = safeParseJson(req.cookies.google_token);
        if (tokenPayload) {
          const oauthClient = getGoogleOAuthClient(req);
          oauthClient.setCredentials(tokenPayload);
          const { data } = await google.oauth2({ version: 'v2', auth: oauthClient }).userinfo.get();
          result.googleUser = data.email;
          result.google = true;
          result.authSource = 'legacy_cookie';
        } else {
          result.google = false;
        }
      } catch {
        AppLogger.warn('Google token validation failed — marking disconnected', { traceId: (req as any).traceId });
        result.google = false;
      }
    }

    // Validate Yahoo token independently
    if (req.cookies.yahoo_token) {
      try {
        const tokenData = safeParseJson(req.cookies.yahoo_token);
        if (tokenData && tokenData.access_token) {
          await axios.get('https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games?format=json', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
          });
          result.yahooUser = true;
        } else {
          result.yahoo = false;
        }
      } catch (err) {
        AppLogger.warn('Yahoo token validation failed — marking disconnected', { traceId: (req as any).traceId });
        result.yahoo = false;
      }
    }

    res.json(result);
  }));

  // ── Google Picker Config ─────────────────────────────────────────────────
  app.get('/api/auth/google/picker-config', asyncHandler(async (req, res) => {
    // Firebase-first: try Bearer token + Firestore
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const admin = (await import('../middleware/firebaseAuth.js')).admin;
        const decoded = await admin.auth().verifyIdToken(authHeader.slice(7));
        const { getWorkspaceTokens } = await import('../services/firestoreTokenStore.js');
        const tokens = await getWorkspaceTokens(decoded.uid);
        if (tokens?.access_token) {
          return res.json({
            clientId: config.google.clientId,
            apiKey: config.gemini.apiKey || '',
            accessToken: tokens.access_token,
          });
        }
      } catch {
        // Fall through to legacy
      }
    }

    // Legacy: cookie-based (backward compat)
    if (!req.cookies.google_token) return res.status(401).json({ error: 'Not authenticated with Google' });
    const tokens = safeParseJson<any>(req.cookies.google_token);
    if (!tokens?.access_token) return res.status(401).json({ error: 'Invalid or expired Google token' });
    res.json({
      clientId: config.google.clientId,
      apiKey: config.gemini.apiKey || '',
      accessToken: tokens.access_token,
    });
  }));

  // ── Yahoo Fantasy Proxy ──────────────────────────────────────────────────
  app.get('/api/yahoo/*', asyncHandler(async (req, res) => {
    if (!req.cookies.yahoo_token) return res.status(401).json({ error: 'Not authenticated with Yahoo' });
    let tokens = safeParseJson<any>(req.cookies.yahoo_token);
    if (!tokens?.access_token) return res.status(401).json({ error: 'Invalid or expired Yahoo token' });

    const targetUrl = `https://fantasysports.yahooapis.com/fantasy/v2/${req.params[0]}`;

    try {
      const { data } = await axios.get(targetUrl, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        params: req.query
      });
      res.json(data);
    } catch (err: any) {
      if (err.response?.status === 401 && tokens.refresh_token) {
        try {
          AppLogger.info('Yahoo proxy encountered 401, attempting token refresh', { traceId: (req as any).traceId });
          const yahooAuthHeader = Buffer.from(`${config.yahoo.clientId}:${config.yahoo.clientSecret}`).toString('base64');
          const redirectUri = config.yahoo.redirectUri || `${getBaseUrl(req)}/auth/yahoo/callback`;

          const { data: refreshData } = await axios.post('https://api.login.yahoo.com/oauth2/get_token', new URLSearchParams({
            client_id: config.yahoo.clientId!,
            client_secret: config.yahoo.clientSecret!,
            redirect_uri: redirectUri,
            refresh_token: tokens.refresh_token,
            grant_type: 'refresh_token'
          }).toString(), {
            headers: {
              'Authorization': `Basic ${yahooAuthHeader}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });

          if (refreshData.access_token) {
            tokens = { ...tokens, ...refreshData };
            res.cookie('yahoo_token', JSON.stringify(tokens), getCookieOpts());

            // Retry original request
            const { data: retryData } = await axios.get(targetUrl, {
              headers: { Authorization: `Bearer ${tokens.access_token}` },
              params: req.query
            });
            return res.json(retryData);
          }
        } catch (refreshErr: any) {
          AppLogger.error('Yahoo proxy token refresh failed', refreshErr, { traceId: (req as any).traceId, response: refreshErr.response?.data });
        }
      }

      AppLogger.error('Yahoo proxy request failed', err, { traceId: (req as any).traceId, targetUrl, response: err.response?.data });
      res.status(err.response?.status || 500).json(err.response?.data || { error: 'Yahoo API error' });
    }
  }));

  // ── Logout ───────────────────────────────────────────────────────────────
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('github_token', getClearCookieOpts());
    res.clearCookie('google_token', getClearCookieOpts());
    res.clearCookie('yahoo_token', getClearCookieOpts());
    emitWorkspaceAudit('workspace_disconnect', { traceId: (req as any).traceId });
    res.json({ success: true });
  });
}

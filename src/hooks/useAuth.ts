/**
 * useAuth — Central Firebase Authentication Hook
 * Contract: AURA.CONTRACT.AUTH.FIREBASE_CLIENT_WIRING_V1.002
 *
 * Manages identity via Firebase Auth. On signInWithPopup with GoogleAuthProvider,
 * Firebase returns BOTH a Firebase ID token (for server auth) and a Google OAuth
 * access_token (for user-initiated Workspace API calls).
 *
 * After successful sign-in, the hook automatically attempts to hand off the Google
 * access_token to the server via /api/auth/google/store-token. This handoff is
 * non-blocking — if it fails, the user still enters /app but Workspace shows
 * "needs permission" state.
 *
 * IMPORTANT: The OAuth access_token from signInWithPopup is short-lived and NOT
 * a durable offline-access token. Background/refresh-capable Workspace access
 * requires a separate server-side offline OAuth flow (needs_infrastructure).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import { getFirebaseAuth } from '../lib/firebase';

export type WorkspaceStatus =
  | 'disconnected'
  | 'signing_in'
  | 'connected'
  | 'needs_permission'
  | 'expired'
  | 'error';

export interface AuthState {
  user: User | null;
  loading: boolean;
  /** Google OAuth access_token from the last signInWithPopup. Short-lived. */
  googleAccessToken: string | null;
  /** Workspace connection status — derived from token handoff result */
  workspaceStatus: WorkspaceStatus;
}

// GoogleAuthProvider is created lazily — importing firebase/auth at module scope
// triggers getAuth() as a side effect, crashing production builds.
let _googleProvider: any = null;
async function getGoogleProvider() {
  if (!_googleProvider) {
    const { GoogleAuthProvider } = await import('firebase/auth');
    _googleProvider = new GoogleAuthProvider();
    _googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
    _googleProvider.addScope('https://www.googleapis.com/auth/documents.readonly');
    _googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
    _googleProvider.addScope('https://www.googleapis.com/auth/youtube.readonly');
    _googleProvider.setCustomParameters({ prompt: 'consent', include_granted_scopes: 'true' });
  }
  return _googleProvider;
}

/**
 * Hands off the Google OAuth access token to the server for Firestore persistence.
 * Non-blocking — failure does not prevent app entry.
 */
async function handoffWorkspaceToken(
  idToken: string,
  accessToken: string,
  scopes: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/google/store-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        access_token: accessToken,
        scope: scopes,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function useAuth() {
  const initialToken = typeof window !== 'undefined' ? localStorage.getItem('gmail_access_token') : null;

  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    googleAccessToken: initialToken,
    workspaceStatus: initialToken ? 'connected' : 'disconnected',
  });
  const accessTokenRef = useRef<string | null>(initialToken);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    let resolved = false;

    // Safety timeout — if Firebase Auth never fires onAuthStateChanged
    // (e.g. unauthorized domain, network failure), stop hanging on "Initializing…"
    const timeout = setTimeout(() => {
      if (!resolved && !cancelled) {
        console.warn('[useAuth] Firebase Auth did not resolve within 10s — forcing loading=false');
        setState((prev) => prev.loading ? { ...prev, loading: false } : prev);
      }
    }, 10_000);

    (async () => {
      try {
        const firebaseAuth = await getFirebaseAuth();
        if (cancelled) return;

        // Set up the persistent auth state listener
        const { onAuthStateChanged } = await import('firebase/auth');
        unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
          resolved = true;
          clearTimeout(timeout);
          setState((prev) => ({
            ...prev,
            user,
            loading: false,
            googleAccessToken: user ? accessTokenRef.current : null,
            workspaceStatus: user
              ? accessTokenRef.current
                ? prev.workspaceStatus // Keep status ('connected') if token exists
                : 'needs_permission'
              : 'disconnected',
          }));
        });
      } catch (err) {
        console.error('[useAuth] Firebase Auth init failed:', err);
        if (!cancelled) {
          clearTimeout(timeout);
          setState((prev) => ({ ...prev, loading: false }));
        }
      }
    })();

    return () => { cancelled = true; clearTimeout(timeout); unsubscribe?.(); };
  }, []);

  const signIn = useCallback(async () => {
    setState((prev) => ({ ...prev, workspaceStatus: 'signing_in' }));
    try {
      const firebaseAuth = await getFirebaseAuth();
      const googleProvider = await getGoogleProvider();
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken ?? null;
      
      if (accessToken) {
        localStorage.setItem('gmail_access_token', accessToken);
        accessTokenRef.current = accessToken;
        
        // Non-blocking workspace handoff
        const idToken = await result.user.getIdToken();
        const grantedScopes = (await getGoogleProvider()).getScopes().join(' ');
        handoffWorkspaceToken(idToken, accessToken, grantedScopes).then((ok) => {
          setState((prev) => ({
            ...prev,
            googleAccessToken: accessToken,
            workspaceStatus: ok ? 'connected' : 'needs_permission',
          }));
        });
      } else {
         setState((prev) => ({ ...prev, workspaceStatus: 'needs_permission' }));
      }
    } catch (error: any) {
      const code = error?.code ?? '';
      // User dismissed or browser blocked the popup — not a real error
      if (code === 'auth/popup-closed-by-user' || code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        setState((prev) => ({ ...prev, workspaceStatus: 'disconnected' }));
        return;
      }
      console.error('[useAuth] signIn error:', code, error?.message);
      setState((prev) => ({ ...prev, workspaceStatus: 'error' }));
    }
  }, []);

  /**
   * Re-triggers Firebase Google sign-in to refresh Workspace access.
   * Used when Workspace is in needs_permission or expired state.
   */
  const reconnectWorkspace = useCallback(async () => {
    return signIn();
  }, [signIn]);

  const signOutUser = useCallback(async () => {
    const firebaseAuth = await getFirebaseAuth();
    const { signOut: firebaseSignOut } = await import('firebase/auth');
    await firebaseSignOut(firebaseAuth);
    accessTokenRef.current = null;
    localStorage.removeItem('gmail_access_token');
    setState({ user: null, loading: false, googleAccessToken: null, workspaceStatus: 'disconnected' });
  }, []);

  /**
   * Returns the Firebase ID token for server-side verification.
   * This is NOT the Google OAuth access_token — it is the Firebase identity token
   * that the server validates with admin.auth().verifyIdToken().
   */
  const getIdToken = useCallback(async (): Promise<string | null> => {
    const firebaseAuth = await getFirebaseAuth();
    if (!firebaseAuth.currentUser) return null;
    return firebaseAuth.currentUser.getIdToken();
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    googleAccessToken: state.googleAccessToken,
    workspaceStatus: state.workspaceStatus,
    signIn,
    signOut: signOutUser,
    getIdToken,
    reconnectWorkspace,
  };
}

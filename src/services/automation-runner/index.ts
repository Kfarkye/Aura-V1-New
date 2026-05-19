import express from 'express';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { ChronosEngine } from './engine.ts';
import { AppLogger } from '../../infrastructure/observability.ts';

export const chronosRouter = express.Router();
chronosRouter.use(express.json());

const authClient = new OAuth2Client();

// ── SECURITY BOUNDARY: OIDC VERIFICATION ──
const verifyCloudScheduler = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // DEV BYPASS: Allow manual testing if a specific DEV token is provided.
  if (process.env.NODE_ENV !== 'production' && req.headers['x-dev-bypass'] === 'chronos-test') {
    AppLogger.info('[Chronos] DEV bypass active: Executing temporal sequence without OIDC.');
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    AppLogger.warn('[Chronos] Blocked execution attempt: Missing OIDC token', { ip: req.ip });
    return res.status(401).send('Unauthorized');
  }
  
  try {
    const ticket = await authClient.verifyIdToken({
      idToken: authHeader.split(' ')[1],
      audience: process.env.CHRONOS_SERVICE_URL, // e.g., https://runner.aura.internal
    });
    
    const payload = ticket.getPayload();
    if (payload?.email !== process.env.SCHEDULER_SA_EMAIL) {
      throw new Error('Unauthorized invoker identity');
    }
    next();
  } catch (err: any) {
    AppLogger.error('[Chronos] Blocked execution attempt: Invalid OIDC signature', err);
    res.status(403).send('Forbidden');
  }
};

const CronPayloadSchema = z.object({
  target_domain: z.enum(['work', 'music', 'sports', 'crypto', 'markets']).optional(),
  timezone: z.string().optional()
});

chronosRouter.post('/api/internal/cron/tick', verifyCloudScheduler, async (req, res) => {
  try {
    const { target_domain, timezone } = CronPayloadSchema.parse(req.body);
    
    // Fire and forget: Acknowledge instantly so Cloud Scheduler doesn't timeout.
    // The execution runs asynchronously in the background.
    res.status(202).json({ status: 'accepted', message: 'Chronos temporal sequence initiated.' });
    
    const engine = new ChronosEngine();
    await engine.executeTick(target_domain, timezone).catch(err => {
      AppLogger.error('[Chronos] Fatal tick execution fault', err);
    });

  } catch (error) {
    res.status(400).json({ error: 'Malformed chronos payload' });
  }
});

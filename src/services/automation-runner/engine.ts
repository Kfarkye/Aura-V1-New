import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as cronParser from 'cron-parser';
import { IdentityHydrator } from './identity.ts';
import { APNSDispatcher } from './apns.ts';
import { HeadlessWorkAgent } from './agents/work.ts';
import { AppLogger } from '../../infrastructure/observability.ts';
import type { Artifact, WorkArtifactPayload } from '../../server/artifact-core.ts';

export function calculateNextTick(cronExpression: string, userTimezone: string): Date {
    try {
        // Evaluate the precise next interval relative to the user's actual body-clock
        const interval = (cronParser as any).parseExpression(cronExpression, {
            tz: userTimezone || 'UTC', // e.g., 'America/Los_Angeles'
            currentDate: new Date()
        });
        
        return interval.next().toDate();
    } catch (err) {
        AppLogger.warn(`[CHRONOS_WARN] Cron parse failed for tz: ${userTimezone}. Fallback 1h retry.`);
        // Fallback safety to 1 hour, not 24h, preventing zombie automations if a tz string is malformed
        return new Date(Date.now() + 60 * 60 * 1000); 
    }
}

export class ChronosEngine {
  private db = getFirestore();
  private identity = new IdentityHydrator();
  private apns = new APNSDispatcher();
  private workAgent = new HeadlessWorkAgent();

  async executeTick(targetDomain?: string, timezone?: string) {
    const now = new Date();
    
    // 1. Sweep for due automations using a composite index: (status, next_run_at)
    let query: any = this.db.collection('automations')
      .where('status', '==', 'active')
      .where('next_run_at', '<=', now);
      
    if (targetDomain) query = query.where('target_domain', '==', targetDomain);
    if (timezone) query = query.where('timezone', '==', timezone);

    const snapshot = await query.limit(500).get(); // Batch limit to prevent memory exhaustion
    if (snapshot.empty) return;

    AppLogger.info(`[Chronos] Sweeping ${snapshot.size} due automations.`);

    // 2. Fan-out execution (Promise.allSettled guarantees one failure doesn't crash the batch)
    const executions = snapshot.docs.map((doc: any) => this.executeAutomation(doc.id, doc.data()));
    await Promise.allSettled(executions); 
  }

  private async executeAutomation(automationId: string, data: any) {
    const { user_id, intent_to_execute, target_domain } = data;

    try {
      // 3. Hydrate Secure Offline Identity
      const principal = await this.identity.hydratePrincipal(user_id);
      let payload: WorkArtifactPayload;
      
      // 4. Headless Agent Execution
      AppLogger.info(`[Chronos] Executing ${target_domain} agent for ${user_id}`);
      
      if (target_domain === 'work') {
        const workspaceAuth = await this.identity.hydrateWorkspaceTokens(user_id);
        payload = await this.workAgent.generateInboxBrief(principal, workspaceAuth, intent_to_execute);
      } else {
        throw new Error(`Domain ${target_domain} headless runner not implemented.`);
      }

      // 5. Persist strictly typed Artifact to the Spine
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const artifactId = `AURA.${target_domain.toUpperCase()}.AUTOMATION.${dateStr}.${sequence}`;

      const artifact: Artifact<WorkArtifactPayload> = {
        id: artifactId,
        domain: target_domain,
        intent: intent_to_execute,
        payload,
        user_id,
        status: 'draft', // DRAFT state. Awaiting user interaction (e.g. tapping "Approve & Send")
        partner: { name: 'google_workspace' },
        approval_required: true,
        audit: { created_at: FieldValue.serverTimestamp(), created_by: 'chronos', parent_automation_id: automationId }
      };

      // Atomic commit: Save artifact, update next_run_at
      const nextRunAt = calculateNextTick(data.cron_schedule || '0 7 * * *', data.timezone);
      const batch = this.db.batch();
      batch.set(this.db.collection('artifacts').doc(artifactId), artifact);
      batch.update(this.db.collection('automations').doc(automationId), {
        last_run_at: FieldValue.serverTimestamp(),
        // Simple logic here; production uses a cron-parser for the exact next interval
        next_run_at: nextRunAt 
      });
      await batch.commit();

      // 6. Habit Loop Trigger: Fire Native iOS Push
      if (target_domain === 'work') {
        await this.apns.sendMorningBrief(user_id, payload.inbox_summary!, artifactId);
      }

    } catch (err: any) {
      AppLogger.error(`[Chronos] Fault on automation ${automationId}`, err, { user_id });
      // In production: DLQ insertion or retry backoff logic goes here. 
      // Suspend automation if token is permanently revoked to prevent failing loops.
    }
  }
}

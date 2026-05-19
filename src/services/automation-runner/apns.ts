import { getMessaging } from 'firebase-admin/messaging';
import { AppLogger } from '../../infrastructure/observability.ts';
import type { WorkArtifactPayload } from '../../server/artifact-core.ts';

export class APNSDispatcher {
  /**
   * Fires a heavily formatted Apple Push Notification.
   * Optimizes for lock-screen dopamine and instant deep-linking.
   */
  async sendMorningBrief(userId: string, summary: NonNullable<WorkArtifactPayload['inbox_summary']>, artifactId: string) {
    const db = (await import('firebase-admin/firestore')).getFirestore();
    const tokenDoc = await db.collection('users').doc(userId).collection('devices').doc('primary').get();
    const fcmToken = tokenDoc.data()?.fcm_token;

    if (!fcmToken) return;

    const priorities = summary.priority_items.length;
    const itemsCleared = summary.noise_cleared || 0;

    const message = {
      token: fcmToken,
      notification: {
        title: "Morning Brief Ready ✨",
        body: priorities > 0 ? summary.hero_insight : `Inbox Zero achieved. ${itemsCleared} emails cleared.` // "Sarah pushed the design review to Thursday."
      },
      apns: {
        payload: {
          aps: {
            sound: "aura_chime.wav",
            badge: priorities,
            // 'time-sensitive' breaks through iOS Sleep/Do Not Disturb modes
            'interruption-level': 'time-sensitive', 
            // Groups all morning briefs neatly on the lock screen
            'thread-id': 'aura_routine_morning',
            category: 'MORNING_BRIEF_ACTION', 
            // Wakes the iOS Notification Service Extension to pre-fetch the Artifact
            'mutable-content': 1 
          },
          // Custom Aura Deep-Link Payload. 
          // iOS reads this on tap to instantly mount the ArtifactRouter without a network roundtrip.
          aura_routing: {
            target: "artifact",
            artifact_id: artifactId,
            domain: "work",
            action: "summarize_inbox"
          }
        }
      }
    };

    try {
      await getMessaging().send(message);
      AppLogger.info(`[APNS] Morning brief delivered to ${userId}`, { artifactId });
    } catch (err: any) {
      AppLogger.error(`[APNS] Delivery fault for ${userId}`, err);
      // In production: catch 'messaging/registration-token-not-registered' to purge dead tokens
    }
  }
}

import { google } from 'googleapis';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from '../../server/config/env.ts';
import type { GovernancePrincipal } from '../../server/utils/core.ts';

export class IdentityHydrator {
  private db = getFirestore();

  /**
   * Synthesizes a headless Governance Principal for autonomous execution.
   */
  async hydratePrincipal(userId: string): Promise<GovernancePrincipal> {
    const userDoc = await this.db.collection('users').doc(userId).get();
    if (!userDoc.exists) throw new Error(`User ${userId} not found in registry.`);
    
    return {
      principal_id: userId,
      // 'system_automation' explicitly bypasses interactive UI gates while preserving data access isolation
      roles: ['user', 'system_automation'], 
      tier: userDoc.data()?.tier || 'standard',
      claims: { is_headless: true }
    };
  }

  /**
   * Retrieves and automatically refreshes Google Workspace offline tokens securely.
   */
  async hydrateWorkspaceTokens(userId: string) {
    const tokenDoc = await this.db.collection('users').doc(userId).collection('tokens').doc('google_workspace').get();
    if (!tokenDoc.exists) throw new Error(`No offline Workspace tokens for ${userId}.`);

    const tokens = tokenDoc.data()!;
    if (!tokens.refresh_token) throw new Error(`Missing refresh_token for ${userId}. Cannot execute headlessly.`);

    const oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret
    );
    oauth2Client.setCredentials(tokens);

    // Auto-refresh if expired. If refresh throws, the user revoked OAuth access.
    if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      // Atomically persist the new access token to prevent thrashing
      await tokenDoc.ref.set({
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date
      }, { merge: true });
      oauth2Client.setCredentials(credentials);
    }

    return oauth2Client;
  }
}

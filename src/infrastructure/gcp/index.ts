import { google } from 'googleapis';

export class SpannerAuditClient {}

export class BigQueryTelemetry {
  async streamTelemetryEvent(...args: any[]) {}
}

export class CloudLoggingClient {
  async writeLog(...args: any[]) {}
}

export class SecretManager {
  private client: any = null;
  private auth: any = null;
  private projectId: string;

  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || 'mock-project';
    try {
      this.auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
      this.client = google.secretmanager({ version: 'v1', auth: this.auth });
    } catch (e) {
      // Silence constructor warning, fallback will log during resolution if needed
    }
  }

  /**
   * Retrieves a secret value from Google Cloud Secret Manager.
   * Gracefully falls back to local environment variables if Secret Manager is not available.
   */
  async getSecret(secretName: string): Promise<string> {
    if (!this.client || this.projectId === 'mock-project') {
      return process.env[secretName] || '';
    }

    try {
      const name = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;
      const res = await this.client.projects.secrets.versions.access({ name });
      const payload = res.data.payload?.data;
      if (!payload) {
        return process.env[secretName] || '';
      }
      return Buffer.from(payload, 'base64').toString('utf8');
    } catch (e: any) {
      // Fallback to local environment variable if API call fails
      return process.env[secretName] || '';
    }
  }
}

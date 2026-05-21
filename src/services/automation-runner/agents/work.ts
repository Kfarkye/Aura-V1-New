import { google, Auth } from 'googleapis';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { WORK_SPECIALIST } from '../../../server/prompts.ts';
import { AppLogger } from '../../../infrastructure/observability.ts';
import type { GovernancePrincipal } from '../../../server/utils/core.ts';
import type { WorkArtifactPayload } from '../../../server/artifact-core.ts';

// The canonical schema the LLM MUST conform to for the Morning Brief
const InboxSummarySchema = z.object({
  period: z.enum(['overnight', 'today']),
  hero_insight: z.string().describe("1-sentence bottom-line-up-front synthesis of the most critical update"),
  priority_items: z.array(z.object({
    id: z.string(),
    sender: z.object({ name: z.string(), role_context: z.string().optional() }),
    subject: z.string(),
    tldr: z.string().describe("1-sentence summary of the required action"),
    suggested_action: z.enum(['draft_reply', 'schedule_meeting', 'fyi']),
    suggested_reply_text: z.string().optional()
  }))
});

export class HeadlessWorkAgent {
  private ai = (() => {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    if (project && project !== 'gen-lang-client-0281999829') {
      return new GoogleGenAI({ enterprise: true, project, location: process.env.GOOGLE_CLOUD_LOCATION || 'us-west2' });
    }
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'MISSING_API_KEY' });
  })();

  async generateInboxBrief(
    principal: GovernancePrincipal, 
    authClient: Auth.OAuth2Client, 
    intent: string
  ): Promise<WorkArtifactPayload> {
    const gmail = google.gmail({ version: 'v1', auth: authClient });

    // 1. Broad Query: Total overnight volume (The Firehose)
    const totalMeta = await gmail.users.messages.list({
        userId: 'me',
        q: 'in:inbox newer_than:1d',
        maxResults: 1 
    });
    const totalVolume = totalMeta.data.resultSizeEstimate || 0;

    // 2. Filtered Query: Extracting strictly the signal
    const list = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread in:inbox newer_than:1d -category:(promotions,social,updates)',
      maxResults: 15,
    });

    const messageMetas = list.data.messages || [];
    const signalCount = messageMetas.length;
    
    // 3. Deterministic Mathematics (Zero Hallucination)
    const noiseCleared = Math.max(0, totalVolume - signalCount);

    if (signalCount === 0) {
      return { 
        action: 'summarize_inbox', 
        inbox_summary: { period: 'overnight', hero_insight: "Inbox Zero achieved. No critical overnight traffic.", noise_cleared: noiseCleared, priority_items: [] } 
      };
    }

    // 4. Hydrate raw message bodies
    const rawEmails = await Promise.all(messageMetas.map(async (m) => {
      const full = await gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
      const getHeader = (name: string) => full.data.payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      return `ID: ${m.id} | Date: ${getHeader('date')} | From: ${getHeader('from')} | Subject: ${getHeader('subject')} | Snippet: ${full.data.snippet}`;
    }));

    AppLogger.info(`[WorkAgent] Extracted ${rawEmails.length} messages for headless analysis.`, { principalId: principal.principal_id });

    // 5. Cognitive Engine Extraction (Strict JSON Enforcement)
    // Flatten $ref strings explicitly so Gemini's compiler doesn't choke.
    const jsonSchema = zodToJsonSchema(InboxSummarySchema as any, { $refStrategy: "none" }) as any;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash', // Flash is perfect for high-speed, cheap structural mapping in batch jobs
      contents: `Intent: "${intent}". Normalize these priority emails into the requested schema. Extract next meetings. Draft a suggested reply for the most urgent thread.\nData: ${rawEmails.join('\n---\n')}`,
      config: {
        systemInstruction: WORK_SPECIALIST,
        temperature: 0.1, // Highly deterministic
        responseMimeType: 'application/json',
        responseSchema: jsonSchema
      }
    });

    // 6. Final Gatekeeper Validation
    const parsed = JSON.parse(response.text!);
    const validated = InboxSummarySchema.parse(parsed);

    // Merge infallible metadata with cognitive extraction
    return { 
      action: 'summarize_inbox', 
      inbox_summary: {
        ...validated,
        noise_cleared: noiseCleared
      } 
    } as unknown as WorkArtifactPayload;
  }
}

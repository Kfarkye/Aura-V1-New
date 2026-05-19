export interface Artifact<T> {
  id: string;
  domain: string;
  intent: string;
  payload: T;
  user_id: string;
  status: string;
  partner: any;
  approval_required: boolean;
  audit: any;
}

export interface WorkArtifactPayload {
  action: string;
  inbox_summary?: {
    period: 'overnight' | 'today';
    hero_insight: string;
    noise_cleared: number;
    priority_items: Array<{
      id: string;
      sender: { name: string; role_context?: string };
      subject: string;
      tldr: string;
      suggested_action: 'draft_reply' | 'schedule_meeting' | 'fyi';
      suggested_reply_text?: string;
    }>;
  };
}

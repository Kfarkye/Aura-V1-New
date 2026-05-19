import { getAccessToken, setWorkspaceAuthError } from './auth';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  htmlLink: string;
  hangoutLink?: string;
  attachments?: {
    fileId: string;
    title: string;
    iconLink?: string;
    fileUrl: string;
    mimeType?: string;
  }[];
}

export const listUpcomingEvents = async (maxResults: number = 10): Promise<CalendarEvent[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const timeMin = new Date().toISOString();
  
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=${maxResults}&orderBy=startTime&singleEvents=true`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
     const errorData = await response.json().catch(() => ({}));
     if (response.status === 401 || response.status === 403) {
       setWorkspaceAuthError(true);
       throw new Error(`Authentication error (${response.status}): Please sign out and sign back in to refresh permissions.`);
     }
     throw new Error(errorData.error?.message || `Calendar API error: ${response.status}`);
  }

  const data = await response.json();
  return data.items || [];
};

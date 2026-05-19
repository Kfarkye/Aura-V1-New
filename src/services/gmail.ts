import { getAccessToken, setWorkspaceAuthError } from './auth';

export const listMessages = async (query: string = '', maxResults: number = 10) => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const q = new URLSearchParams({
    maxResults: maxResults.toString(),
    ...(query ? { q: query } : {})
  });

  const res = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?${q.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
       setWorkspaceAuthError(true);
       throw new Error(`Authentication error (${res.status}): Please sign out and sign back in to refresh permissions.`);
    }
    throw new Error(errorData.error?.message || `Failed to fetch messages: ${res.status}`);
  }
  const data = await res.json();
  
  // Gmail API just returns message IDs for list, we need to fetch the actual messages
  if (!data.messages) return [];
  
  const detailedMessages = await Promise.all(
    data.messages.map(async (msg: { id: string }) => {
      const msgRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return msgRes.json();
    })
  );

  return detailedMessages;
};

export const sendMessage = async (to: string, subject: string, body: string) => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  // Create the email in RFC 2822 format and base64url encode it
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body
  ].join('\n');

  const encodedMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedMessage })
  });

  if (!res.ok) {
    const errorData = await res.json();
    console.error('Failed to send email:', errorData);
    throw new Error('Failed to send email');
  }
  
  return res.json();
};

export const createDraft = async (to: string, subject: string, body: string, inReplyToMessageId?: string, threadId?: string) => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  // Create the email in RFC 2822 format and base64url encode it
  let headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8'
  ];

  if (inReplyToMessageId) {
     headers.push(`In-Reply-To: ${inReplyToMessageId}`);
     headers.push(`References: ${inReplyToMessageId}`);
  }

  const message = [
    ...headers,
    '',
    body
  ].join('\n');

  const encodedMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const requestBody: any = { message: { raw: encodedMessage } };
  if (threadId) {
    requestBody.message.threadId = threadId;
  }

  const res = await fetch('https://www.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error('Failed to create draft:', errorData);
    throw new Error('Failed to create draft');
  }
  
  return res.json();
};

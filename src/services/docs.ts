import { getAccessToken, setWorkspaceAuthError } from './auth';

export const getDocumentText = async (documentId: string): Promise<string> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    }
  });

  if (!res.ok) {
     const errorData = await res.json().catch(() => ({}));
     if (res.status === 401 || res.status === 403) {
       setWorkspaceAuthError(true);
       throw new Error(`Authentication error (${res.status}): Please sign out and sign back in to refresh permissions.`);
     }
     throw new Error(errorData.error?.message || `Docs API error: ${res.status}`);
  }

  const doc = await res.json();
  let contentText = '';
  if (doc.body && doc.body.content) {
    doc.body.content.forEach((el: any) => {
      if (el.paragraph && el.paragraph.elements) {
        el.paragraph.elements.forEach((elem: any) => {
          if (elem.textRun && elem.textRun.content) {
            contentText += elem.textRun.content;
          }
        });
      }
    });
  }
  return contentText.trim();
};

export const createDocument = async (title: string, textContent: string) => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  // 1. Create a blank document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  });

  if (!createRes.ok) {
     const errorData = await createRes.json().catch(() => ({}));
     if (createRes.status === 401 || createRes.status === 403) {
       setWorkspaceAuthError(true);
       throw new Error(`Authentication error (${createRes.status}): Please sign out and sign back in to refresh permissions.`);
     }
     throw new Error(errorData.error?.message || `Docs API error: ${createRes.status}`);
  }

  const doc = await createRes.json();
  const documentId = doc.documentId;

  // 2. Insert the text content
  if (textContent) {
    const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: textContent
            }
          }
        ]
      })
    });

    if (!updateRes.ok) {
       const errorData = await updateRes.json().catch(() => ({}));
       console.error("Failed to insert text in doc:", errorData);
    }
  }

  return doc;
};

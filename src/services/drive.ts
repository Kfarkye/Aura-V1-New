import { getAccessToken, setWorkspaceAuthError } from './auth';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
}

export type DocumentType = 'all' | 'docs' | 'sheets' | 'slides' | 'media';

export const createHtmlDocument = async (title: string, htmlContent: string) => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const metadata = {
    name: title,
    mimeType: 'application/vnd.google-apps.document'
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/html\r\n\r\n' +
    htmlContent +
    close_delim;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });
  
  if (!res.ok) {
     const errorData = await res.json().catch(() => ({}));
     throw new Error(errorData.error?.message || `Drive API error: ${res.status}`);
  }
  return res.json();
};

export const exportDriveFile = async (fileId: string, mimeType: string): Promise<string> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  let exportType = 'text/plain';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    exportType = 'text/csv';
  } else if (mimeType === 'application/vnd.google-apps.presentation') {
    exportType = 'text/plain';
  } else if (!mimeType.includes('google-apps')) {
     // fallback to get for non-workspace files (just alt=media)
     const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${token}` }
     });
     if (res.ok) return await res.text();
     return '';
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${exportType}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  });

  if (!response.ok) {
    console.error(`Export failed for ${fileId}`);
    return '';
  }
  return await response.text();
};

export const getRecentDriveFiles = async (type: DocumentType = 'all', nameQuery: string = ''): Promise<DriveFile[]> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated properly to access Drive');
  }

  let q = 'trashed = false';
  const mimeTypes: Record<string, string> = {
    docs: 'application/vnd.google-apps.document',
    sheets: 'application/vnd.google-apps.spreadsheet',
    slides: 'application/vnd.google-apps.presentation'
  };

  if (type !== 'all') {
    if (type === 'media') {
      q += ` and (mimeType contains 'image/' or mimeType contains 'video/')`;
    } else if (mimeTypes[type]) {
      q += ` and mimeType = '${mimeTypes[type]}'`;
    }
  }

  if (nameQuery.trim() !== '') {
    const escapedQuery = nameQuery.replace(/'/g, "\\'");
    q += ` and name contains '${escapedQuery}'`;
  }

  const queryParams = new URLSearchParams({
    q,
    orderBy: 'modifiedTime desc',
    pageSize: '20',
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink)'
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      setWorkspaceAuthError(true);
      throw new Error(`Authentication error (${response.status}): Please sign out and sign back in to refresh permissions.`);
    }
    throw new Error(errorData.error?.message || `Drive API error: ${response.status}`);
  }

  const data = await response.json();
  return data.files || [];
};

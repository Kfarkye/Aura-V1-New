import { getAccessToken, setWorkspaceAuthError } from './auth';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
}

export type DocumentType = 'all' | 'docs' | 'sheets' | 'slides';

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

  if (type !== 'all' && mimeTypes[type]) {
    q += ` and mimeType = '${mimeTypes[type]}'`;
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

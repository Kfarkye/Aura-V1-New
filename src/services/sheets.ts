import { getAccessToken, setWorkspaceAuthError } from './auth';

export const appendRowsToSheet = async (spreadsheetId: string, sheetName: string, rows: any[][]) => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  // We append to the sheet by specifying the range. e.g. "Sheet1"
  const range = `${sheetName}`;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: rows
      })
    }
  );

  if (!res.ok) {
     const errorData = await res.json().catch(() => ({}));
     if (res.status === 401 || res.status === 403) {
       setWorkspaceAuthError(true);
       throw new Error(`Authentication error (${res.status}): Please sign out and sign back in to refresh permissions.`);
     }
     throw new Error(errorData.error?.message || `Sheets API error: ${res.status}`);
  }

  return await res.json();
};

export const createSpreadsheet = async (title: string, headers?: string[]): Promise<any> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title
      }
    })
  });

  if (!createRes.ok) {
     const errorData = await createRes.json().catch(() => ({}));
     if (createRes.status === 401 || createRes.status === 403) {
       setWorkspaceAuthError(true);
       throw new Error(`Authentication error (${createRes.status}): Please sign out and sign back in to refresh permissions.`);
     }
     throw new Error(errorData.error?.message || `Sheets API error: ${createRes.status}`);
  }

  const sheet = await createRes.json();
  const spreadsheetId = sheet.spreadsheetId;

  if (headers && headers.length > 0) {
    await appendRowsToSheet(spreadsheetId, 'Sheet1', [headers]);
  }

  return sheet;
}

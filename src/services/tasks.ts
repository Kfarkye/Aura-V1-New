import { getAccessToken, setWorkspaceAuthError } from './auth';

export interface Task {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: string;
}

export const listTasks = async (taskListId: string = '@default'): Promise<Task[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=false&showHidden=false`,
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
     throw new Error(errorData.error?.message || `Tasks API error: ${response.status}`);
  }

  const data = await response.json();
  return data.items || [];
};

export const createTask = async (title: string, notes?: string, due?: string, taskListId: string = '@default'): Promise<Task> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const bodyData: any = { title };
  if (notes) bodyData.notes = notes;
  if (due) bodyData.due = new Date(due).toISOString();

  const response = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    }
  );

  if (!response.ok) {
     const errorData = await response.json().catch(() => ({}));
     if (response.status === 401 || response.status === 403) {
       setWorkspaceAuthError(true);
       throw new Error(`Authentication error (${response.status}): Please sign out and sign back in to refresh permissions.`);
     }
     throw new Error(errorData.error?.message || `Tasks API error: ${response.status}`);
  }

  return await response.json();
};

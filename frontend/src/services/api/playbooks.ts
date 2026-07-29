import { getAuthHeaders } from './auth';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export interface Playbook {
  id: string;
  name: string;
  trigger_type: string;
  actions: Array<{ action: string; [key: string]: unknown }>;
  status: 'active' | 'inactive';
  created_at: string | null;
  last_triggered: string | null;
}

export interface PlaybookExecution {
  id: number;
  playbook_id: string;
  playbook_name: string | null;
  trigger_event: string;
  trigger_ref_id: string | null;
  actions_taken: Array<{ action: string; status: string }>;
  executed_at: string | null;
}

export const fetchPlaybooks = async (): Promise<Playbook[]> => {
  const response = await fetch(`${API_BASE_URL}/playbooks/`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch playbooks');
  return response.json();
};

export const createPlaybook = async (data: {
  name: string;
  trigger_type: string;
  actions_json: Array<{ action: string }>;
}): Promise<Playbook> => {
  const response = await fetch(`${API_BASE_URL}/playbooks/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create playbook');
  return response.json();
};

export const updatePlaybook = async (id: string, data: Partial<Playbook> & { actions_json?: any }) => {
  const response = await fetch(`${API_BASE_URL}/playbooks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update playbook');
  return response.json();
};

export const deletePlaybook = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/playbooks/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete playbook');
};

export const executePlaybook = async (id: string, triggerRefId?: string) => {
  const query = triggerRefId ? `?trigger_ref_id=${triggerRefId}` : '';
  const response = await fetch(`${API_BASE_URL}/playbooks/${id}/execute${query}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to execute playbook');
  return response.json();
};

export const fetchPlaybookExecutions = async (limit = 50): Promise<PlaybookExecution[]> => {
  const response = await fetch(`${API_BASE_URL}/playbooks/executions?limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch executions');
  return response.json();
};

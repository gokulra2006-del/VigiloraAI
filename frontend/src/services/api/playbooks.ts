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
  return [
    {
      id: 'PB-901',
      name: 'Ransomware Network Isolation',
      trigger_type: 'Incident: Ransomware Lateral Movement Detected',
      actions: [
        { action: 'Block Malicious IP at Perimeter Firewall' },
        { action: 'Isolate Endpoint via EDR' },
        { action: 'Revoke Affected User Active Directory Tokens' }
      ],
      status: 'active',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      last_triggered: new Date(Date.now() - 120000).toISOString()
    },
    {
      id: 'PB-902',
      name: 'Active Shooter / Weapon Detected',
      trigger_type: 'Object Alert: Weapon / Handgun',
      actions: [
        { action: 'Lockdown All Sector Doors (Magnetic Locks)' },
        { action: 'Dispatch Emergency Alert to Local Law Enforcement' },
        { action: 'Trigger Audible PA System Warning' }
      ],
      status: 'active',
      created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      last_triggered: null
    },
    {
      id: 'PB-903',
      name: 'Tailgating / Access Violation',
      trigger_type: 'Incident: Tailgating Event',
      actions: [
        { action: 'Alert Nearest Roving Guard' },
        { action: 'Capture High-Res Snapshots of Individuals' },
        { action: 'Log Badge IDs for HR Review' }
      ],
      status: 'active',
      created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
      last_triggered: new Date(Date.now() - 900000).toISOString()
    }
  ];
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
  return [
    {
      id: 1045,
      playbook_id: 'PB-901',
      playbook_name: 'Ransomware Network Isolation',
      trigger_event: 'INC-4022',
      trigger_ref_id: 'INC-4022',
      actions_taken: [
        { action: 'Block Malicious IP at Perimeter Firewall', status: 'success' },
        { action: 'Isolate Endpoint via EDR', status: 'success' },
        { action: 'Revoke Affected User Active Directory Tokens', status: 'pending' }
      ],
      executed_at: new Date(Date.now() - 120000).toISOString()
    },
    {
      id: 1044,
      playbook_id: 'PB-903',
      playbook_name: 'Tailgating / Access Violation',
      trigger_event: 'INC-4024',
      trigger_ref_id: 'INC-4024',
      actions_taken: [
        { action: 'Alert Nearest Roving Guard', status: 'success' },
        { action: 'Capture High-Res Snapshots of Individuals', status: 'success' },
        { action: 'Log Badge IDs for HR Review', status: 'success' }
      ],
      executed_at: new Date(Date.now() - 900000).toISOString()
    }
  ];
};

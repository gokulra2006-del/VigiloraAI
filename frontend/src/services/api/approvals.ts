const API_BASE = 'http://127.0.0.1:8000/api/v1';

export interface PlaybookApproval {
  id: number;
  playbook_id: string;
  playbook_name: string | null;
  trigger_event: string;
  tier: string;
  status: string;
  actions: any;
  justification_text: string | null;
  created_at: string | null;
}

export async function fetchPendingApprovals(): Promise<PlaybookApproval[]> {
  const res = await fetch(`${API_BASE}/playbooks/approvals`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  if (!res.ok) throw new Error('Failed to fetch approvals');
  return res.json();
}

export async function approveAction(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/playbooks/approvals/${id}/approve`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  if (!res.ok) throw new Error('Failed to approve');
}

export async function rejectAction(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/playbooks/approvals/${id}/reject`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  if (!res.ok) throw new Error('Failed to reject');
}

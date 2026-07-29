import { getAuthHeaders } from './auth';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export interface Incident {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'detected' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  camera_id: string | null;
  description: string | null;
  assigned_to: string | null;
  case_id: string | null;
  detected_at: string | null;
  acknowledged_at: string | null;
  in_progress_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  justification_text: string | null;
  correlation_group: string | null;
  autonomy_tier: 'auto_resolve' | 'suggest_confirm' | 'require_ack' | null;
  approval_status: 'pending' | 'approved' | 'rejected' | null;
  zone: string | null;
  source: 'camera' | 'audio' | 'thermal' | 'iot' | 'manual' | null;
  model_confidence: number | null;
}

export const fetchIncidents = async (): Promise<Incident[]> => {
  const response = await fetch(`${API_BASE_URL}/incidents/`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch incidents');
  return response.json();
};

export const transitionIncident = async (id: string, status: string): Promise<Incident> => {
  const response = await fetch(`${API_BASE_URL}/incidents/${id}/transition`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ status })
  });
  if (!response.ok) throw new Error('Failed to transition incident');
  return response.json();
};

export const assignIncident = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/incidents/${id}/assign`, {
    method: 'POST', headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to assign incident');
  return response.json();
};

export const createCaseFromIncident = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/incidents/${id}/create-case`, {
    method: 'POST', headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to create case');
  return response.json();
};

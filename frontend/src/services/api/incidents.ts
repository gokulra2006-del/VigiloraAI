import { getAuthHeaders } from './auth';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface Incident {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'detected' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  camera_id: string | null;
  description: string | null;
  assigned_to: string | null;
  detected_at: string | null;
  acknowledged_at: string | null;
  in_progress_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
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

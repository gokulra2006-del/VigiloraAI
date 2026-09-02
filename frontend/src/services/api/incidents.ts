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
  return [
    {
      id: 'INC-4022', type: 'Ransomware Lateral Movement Detected', severity: 'critical', status: 'in_progress', 
      camera_id: null, description: 'Multiple SMB brute-force attempts detected targeting Active Directory.',
      assigned_to: 'Auto-SOAR', case_id: 'CAS-99', detected_at: new Date(Date.now() - 120000).toISOString(),
      acknowledged_at: new Date(Date.now() - 60000).toISOString(), in_progress_at: new Date().toISOString(), resolved_at: null, closed_at: null,
      justification_text: 'Endpoint behavior matches known ransomware signatures.', correlation_group: 'cyber',
      autonomy_tier: 'auto_resolve', approval_status: 'approved', zone: 'Server Room Alpha', source: 'iot', model_confidence: 0.99
    },
    {
      id: 'INC-4023', type: 'Unauthorized Perimeter Breach', severity: 'high', status: 'detected', 
      camera_id: 'CAM-02', description: 'Subject crossed virtual tripwire on North Fence.',
      assigned_to: 'Unassigned', case_id: null, detected_at: new Date(Date.now() - 300000).toISOString(),
      acknowledged_at: null, in_progress_at: null, resolved_at: null, closed_at: null,
      justification_text: 'YOLOv8 detected person in restricted zone after hours.', correlation_group: 'physical',
      autonomy_tier: 'require_ack', approval_status: 'pending', zone: 'Perimeter North', source: 'camera', model_confidence: 0.94
    },
    {
      id: 'INC-4024', type: 'Tailgating Event', severity: 'medium', status: 'acknowledged', 
      camera_id: 'CAM-01', description: 'Two individuals entered through lobby on a single badge swipe.',
      assigned_to: 'Guard Desk', case_id: null, detected_at: new Date(Date.now() - 900000).toISOString(),
      acknowledged_at: new Date(Date.now() - 800000).toISOString(), in_progress_at: null, resolved_at: null, closed_at: null,
      justification_text: 'Optical turnstile sensors do not match facial count.', correlation_group: 'physical',
      autonomy_tier: 'suggest_confirm', approval_status: 'pending', zone: 'Lobby HQ', source: 'camera', model_confidence: 0.88
    }
  ];
};

export const transitionIncident = async (id: string, status: string): Promise<Incident> => {
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

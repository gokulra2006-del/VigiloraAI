import { getAuthHeaders } from './auth';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export interface SecurityEvent {
  id: number;
  event_type: string;
  source_ip: string | null;
  target_username: string | null;
  description: string | null;
  mitre_technique_id: string | null;
  mitre_technique_name: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
  is_resolved: boolean;
  timestamp: string;
}

export const fetchSecurityEvents = async (): Promise<SecurityEvent[]> => {
  const response = await fetch(`${API_BASE_URL}/security-events/`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch security events');
  return response.json();
};

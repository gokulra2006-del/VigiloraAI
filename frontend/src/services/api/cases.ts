import { getAuthHeaders } from './auth';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export interface Case {
  id: string;
  title: string;
  status: 'open' | 'investigating' | 'closed';
  severity: 'critical' | 'high' | 'medium' | 'low';
  summary: string | null;
  incident_count: number;
  assignee: string | null;
  created_at: string | null;
}

export interface CaseTimelineEvent {
  event_type: string;
  label: string;
  severity: string;
  incident_id?: string;
  camera_id?: string;
  timestamp: string | null;
  source: string;
}

export const fetchCases = async (status?: string): Promise<Case[]> => {
  const query = new URLSearchParams();
  if (status) query.set('status_filter', status);
  const response = await fetch(`${API_BASE_URL}/cases/?${query}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch cases');
  return response.json();
};

export const createCase = async (data: {
  title: string;
  severity: string;
  summary?: string;
  incident_ids?: string[];
}): Promise<Case> => {
  const response = await fetch(`${API_BASE_URL}/cases/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create case');
  return response.json();
};

export const updateCaseStatus = async (id: string, status: string) => {
  const response = await fetch(`${API_BASE_URL}/cases/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update case status');
  return response.json();
};

export const fetchCaseTimeline = async (caseId: string): Promise<{
  case_id: string;
  title: string;
  events: CaseTimelineEvent[];
}> => {
  const response = await fetch(`${API_BASE_URL}/cases/${caseId}/timeline`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch case timeline');
  return response.json();
};

export const generateCaseReport = async (caseId: string) => {
  const response = await fetch(`${API_BASE_URL}/cases/${caseId}/report`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to generate report');
  return response.json();
};

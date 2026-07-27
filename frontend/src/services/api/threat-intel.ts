const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface ThreatIntel {
  id: string;
  title: string;
  cvss: number | null;
  status: 'patching' | 'active' | 'completed';
  details: string;
  published_date: string;
}

export const fetchThreats = async (): Promise<ThreatIntel[]> => {
  const response = await fetch(`${API_BASE_URL}/threats/`);
  if (!response.ok) throw new Error('Failed to fetch threats');
  return response.json();
};

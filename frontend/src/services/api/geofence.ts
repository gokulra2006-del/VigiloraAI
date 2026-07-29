import { getAuthHeaders } from './auth';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export interface Zone {
  id: string;
  name: string;
  polygon_coords: [number, number][];
  rule: string | null;
  status: string;
  color: string;
  created_at: string;
}

export const fetchZones = async (): Promise<Zone[]> => {
  const response = await fetch(`${API_BASE_URL}/geofence/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch zones');
  return response.json();
};

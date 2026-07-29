import { getAuthHeaders } from './auth';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export interface ObjectAlert {
  id: number;
  camera_id: string;
  class_name: string;
  confidence: number;
  confidence_pct: number;
  bbox: [number, number, number, number] | null;
  is_threat: boolean;
  is_weapon: boolean;
  snapshot_path: string | null;
  timestamp: string | null;
}

export const fetchObjectAlerts = async (params?: {
  threat_only?: boolean;
  camera_id?: string;
  min_confidence?: number;
  limit?: number;
}): Promise<ObjectAlert[]> => {
  const query = new URLSearchParams();
  if (params?.threat_only) query.set('threat_only', 'true');
  if (params?.camera_id) query.set('camera_id', params.camera_id);
  if (params?.min_confidence) query.set('min_confidence', String(params.min_confidence));
  if (params?.limit) query.set('limit', String(params.limit));

  const response = await fetch(`${API_BASE_URL}/object-alerts/?${query}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch object alerts');
  return response.json();
};

export const injectDetection = async (params?: {
  camera_id?: string;
  class_name?: string;
}) => {
  const query = new URLSearchParams();
  if (params?.camera_id) query.set('camera_id', params.camera_id);
  if (params?.class_name) query.set('class_name', params.class_name);

  const response = await fetch(`${API_BASE_URL}/object-alerts/inject?${query}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to inject detection');
  return response.json();
};

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
  const alerts: ObjectAlert[] = [
    { id: 1, camera_id: 'CAM-01', class_name: 'person', confidence: 0.95, confidence_pct: 95, bbox: [100, 100, 200, 200], is_threat: true, is_weapon: false, snapshot_path: null, timestamp: new Date().toISOString() },
    { id: 2, camera_id: 'CAM-02', class_name: 'knife', confidence: 0.88, confidence_pct: 88, bbox: [150, 150, 180, 180], is_threat: true, is_weapon: true, snapshot_path: null, timestamp: new Date(Date.now() - 50000).toISOString() },
    { id: 3, camera_id: 'CAM-03', class_name: 'handgun', confidence: 0.92, confidence_pct: 92, bbox: [300, 400, 350, 450], is_threat: true, is_weapon: true, snapshot_path: null, timestamp: new Date(Date.now() - 120000).toISOString() },
    { id: 4, camera_id: 'CAM-04', class_name: 'backpack', confidence: 0.75, confidence_pct: 75, bbox: [50, 50, 100, 100], is_threat: false, is_weapon: false, snapshot_path: null, timestamp: new Date(Date.now() - 300000).toISOString() }
  ];
  
  if (params?.threat_only) {
    return alerts.filter(a => a.is_threat);
  }
  return alerts;
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

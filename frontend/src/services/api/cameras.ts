const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export interface Camera {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
  location?: string;
  zone_id?: string | null;
  fps: number;
  resolution: string;
  active_models: string[];
  source_type?: string;
  source_url?: string;
}

export const fetchCameras = async (): Promise<Camera[]> => {
  const response = await fetch(`${API_BASE_URL}/cameras/`);
  if (!response.ok) throw new Error('Failed to fetch cameras');
  return response.json();
};

export const updateCameraStatus = async (id: string, status: Camera['status']) => {
  const response = await fetch(`${API_BASE_URL}/cameras/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update camera status');
  return response.json();
};

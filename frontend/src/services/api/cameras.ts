const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface Camera {
  id: string;
  name: string;
  status: 'online' | 'offline';
  location: string;
  fps: number;
  resolution: string;
  active_models: string[];
}

export const fetchCameras = async (): Promise<Camera[]> => {
  const response = await fetch(`${API_BASE_URL}/cameras/`);
  if (!response.ok) throw new Error('Failed to fetch cameras');
  return response.json();
};

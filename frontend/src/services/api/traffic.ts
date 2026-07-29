const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export interface TrafficData {
  time: string;
  vehicles: number;
  pedestrians: number;
  avg_speed: number;
}

export const fetchTrafficData = async (): Promise<TrafficData[]> => {
  const response = await fetch(`${API_BASE_URL}/traffic/`);
  if (!response.ok) throw new Error('Failed to fetch traffic');
  return response.json();
};

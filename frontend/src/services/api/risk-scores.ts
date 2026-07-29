import { getAuthHeaders } from './auth';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export interface RiskZone {
  zone_id: string;
  zone_name: string;
  score: number;
  level: 'critical' | 'high' | 'medium' | 'low';
  factors: {
    time_of_day_weight: number;
    recent_alerts: number;
    historical_factor: number;
    hour: number;
  };
  polygon_coords: [number, number][];
  computed_at: string;
}

export const fetchRiskHeatmap = async (): Promise<RiskZone[]> => {
  const response = await fetch(`${API_BASE_URL}/risk-scores/heatmap`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch risk heatmap');
  return response.json();
};

export const recomputeRiskScores = async () => {
  const response = await fetch(`${API_BASE_URL}/risk-scores/recompute`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to recompute risk scores');
  return response.json();
};

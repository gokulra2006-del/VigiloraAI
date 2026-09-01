const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export interface ThreatOverview {
  global_threats: number;
  active_threats: number;
  high_risk_regions: number;
  predicted_threats: number;
  risk_trend: string;
}

export interface ThreatEvent {
  id: string;
  timestamp: string;
  description: string;
  region: string;
  severity: string;
  type: string;
}

export interface ThreatPrediction {
  id: number;
  region: string;
  lat: number;
  lng: number;
  current_risk: number;
  predicted_risk: number;
  confidence: number;
  trend: string;
  threat_types: string[];
  prediction_window: string;
  contributing_features: string[];
  incident_count?: number;
  created_at: string;
}

export interface ThreatTrend {
  time: string;
  observed: number | null;
  predicted: number | null;
}

export const fetchThreatOverview = async (): Promise<ThreatOverview> => {
  const response = await fetch(`${API_BASE_URL}/threats/overview`);
  if (!response.ok) throw new Error('Failed to fetch overview');
  return response.json();
};

export const fetchThreatEvents = async (): Promise<ThreatEvent[]> => {
  const response = await fetch(`${API_BASE_URL}/threats/events`);
  if (!response.ok) throw new Error('Failed to fetch events');
  return response.json();
};

export const fetchThreatPredictions = async (window?: string): Promise<ThreatPrediction[]> => {
  const url = window ? `${API_BASE_URL}/threats/predictions?window=${encodeURIComponent(window)}` : `${API_BASE_URL}/threats/predictions`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch predictions');
  return response.json();
};

export const fetchThreatTrends = async (): Promise<ThreatTrend[]> => {
  const response = await fetch(`${API_BASE_URL}/threats/trends`);
  if (!response.ok) throw new Error('Failed to fetch trends');
  return response.json();
};

export const runPredictiveDemo = async (): Promise<{ status: string, predictions: ThreatPrediction[] }> => {
  const response = await fetch(`${API_BASE_URL}/threats/demo`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to run demo');
  return response.json();
};

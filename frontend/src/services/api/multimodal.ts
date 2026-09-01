import { getAuthHeaders } from './auth';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export interface AudioEvent {
  id: string;
  camera_id: string | null;
  event_type: 'glass_break' | 'scream_aggression' | 'loud_impact' | 'alarm_siren' | string;
  confidence: number;
  decibel_level?: number | null;
  duration: number;
  source: string;
  is_simulated: boolean;
  metadata_json?: Record<string, any> | null;
  timestamp: string;
}

export interface MultimodalCorrelation {
  id: string;
  incident_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | string;
  camera_id: string | null;
  zone?: string | null;
  source: string;
  audio_event_type: string;
  audio_confidence: number;
  visual_event_type: string | null;
  visual_confidence: number | null;
  combined_confidence: number;
  justification: string | null;
  status: string;
  timestamp: string;
}

export async function fetchAudioEvents(
  cameraId?: string,
  eventType?: string,
  limit = 50
): Promise<AudioEvent[]> {
  const params = new URLSearchParams();
  if (cameraId) params.set('camera_id', cameraId);
  if (eventType) params.set('event_type', eventType);
  params.set('limit', String(limit));

  const response = await fetch(`${API_BASE_URL}/multimodal/audio-events?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch audio events');
  return response.json();
}

export async function simulateAudioEvent(data: {
  event_type: string;
  camera_id?: string;
  confidence?: number;
  duration?: number;
}): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/multimodal/simulate-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      event_type: data.event_type,
      camera_id: data.camera_id || 'cam-1',
      confidence: data.confidence ?? 0.92,
      duration: data.duration ?? 1.5,
    }),
  });
  if (!response.ok) throw new Error('Failed to simulate audio event');
  return response.json();
}

export async function fetchMultimodalCorrelations(limit = 30): Promise<MultimodalCorrelation[]> {
  const response = await fetch(`${API_BASE_URL}/multimodal/correlations?limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch multimodal correlations');
  return response.json();
}
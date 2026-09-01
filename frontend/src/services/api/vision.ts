/**
 * VIGILORA AI — Vision AI API Client Service
 */

const API_BASE = 'http://127.0.0.1:8000/api/v1/vision';

export interface DetectedObject {
  label: string;
  confidence: number;
  bbox?: number[];
  category?: string;
}

export interface ThreatItem {
  type: string;
  severity: 'NORMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  description: string;
}

export interface VisionAnalysisResponse {
  analysis_id: string;
  camera_name: string;
  sector: string;
  threat_level: 'NORMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  threat_score: number;
  confidence: number;
  summary: string;
  incident_title: string;
  incident_description: string;
  detected_objects: DetectedObject[];
  threats: ThreatItem[];
  location_context: string;
  visual_observations: string[];
  recommended_actions: string[];
  image_url?: string;
  image_metadata?: Record<string, any>;
  timestamp: string;
  is_demo_mode: boolean;
  model_provider: string;
}

export interface VisionScenario {
  id: string;
  title: string;
  category: string;
  sector: string;
  camera_name: string;
  threat_level: string;
  threat_score: number;
  description: string;
  image_url: string;
}

export interface VisionIncidentRecord {
  id: string;
  camera_name: string;
  sector: string;
  threat_level: string;
  threat_score: number;
  confidence: number;
  summary: string;
  incident_title: string;
  incident_description?: string;
  detected_objects_json?: DetectedObject[];
  threats_json?: ThreatItem[];
  visual_observations_json?: string[];
  recommended_actions_json?: string[];
  image_url?: string;
  image_metadata_json?: Record<string, any>;
  is_demo_mode: boolean;
  created_at?: string;
}

export async function fetchVisionScenarios(): Promise<VisionScenario[]> {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error('Failed to fetch demo scenarios');
  return res.json();
}

export async function analyzeVisionFrame(
  file?: File,
  scenarioId?: string,
  cameraName?: string,
  sector?: string
): Promise<VisionAnalysisResponse> {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  if (scenarioId) {
    formData.append('scenario_id', scenarioId);
  }
  if (cameraName) {
    formData.append('camera_name', cameraName);
  }
  if (sector) {
    formData.append('sector', sector);
  }

  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(err.detail || 'Vision threat analysis failed');
  }

  return res.json();
}

export async function fetchVisionIncidents(): Promise<VisionIncidentRecord[]> {
  const res = await fetch(`${API_BASE}/incidents`);
  if (!res.ok) throw new Error('Failed to fetch vision incidents history');
  return res.json();
}

export async function fetchVisionIncident(id: string): Promise<VisionIncidentRecord> {
  const res = await fetch(`${API_BASE}/incidents/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch vision incident ${id}`);
  return res.json();
}

export async function saveVisionIncident(
  data: Partial<VisionAnalysisResponse>
): Promise<VisionIncidentRecord> {
  const res = await fetch(`${API_BASE}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to save incident' }));
    throw new Error(err.detail || 'Failed to save incident');
  }

  return res.json();
}
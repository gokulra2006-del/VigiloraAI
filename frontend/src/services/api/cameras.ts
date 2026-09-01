import { getAuthHeaders } from './auth';

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
  source_type?: 'webcam' | 'rtsp_phone' | 'real_hardware' | 'video_file' | string;
  stream_url?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  area?: string | null;
}

export interface DiscoveredDevice {
  device_index: number;
  name: string;
  resolution: string;
  fps: number;
  source_type: string;
  stream_url: string;
}

export interface DeviceDiscoveryResult {
  count: number;
  devices: DiscoveredDevice[];
  supported_sources: Array<{
    type: string;
    label: string;
    description: string;
    example_url: string;
  }>;
}

export const fetchCameras = async (): Promise<Camera[]> => {
  const response = await fetch(`${API_BASE_URL}/cameras/`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch cameras');
  return response.json();
};

export const fetchCameraById = async (id: string): Promise<Camera> => {
  const response = await fetch(`${API_BASE_URL}/cameras/${id}`);
  if (!response.ok) throw new Error('Failed to fetch camera');
  return response.json();
};

export const createCamera = async (data: Partial<Camera>): Promise<Camera> => {
  const response = await fetch(`${API_BASE_URL}/cameras/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create camera');
  }
  return response.json();
};

export const updateCamera = async (id: string, data: Partial<Camera>): Promise<Camera> => {
  const response = await fetch(`${API_BASE_URL}/cameras/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update camera');
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

export const deleteCamera = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/cameras/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete camera');
  return response.json();
};

export const discoverDevices = async (): Promise<DeviceDiscoveryResult> => {
  const response = await fetch(`${API_BASE_URL}/cameras/discover/devices`);
  if (!response.ok) throw new Error('Failed to discover camera devices');
  return response.json();
};

export const getCameraLiveStreamUrl = (cameraId: string): string => {
  return `${API_BASE_URL}/cameras/${cameraId}/live-stream`;
};
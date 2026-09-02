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
  return [
    { id: 'CAM-01', name: 'Main Entrance HQ', status: 'online', location: 'Lobby', fps: 30, resolution: '4K', active_models: ['yolo', 'face_rec'], source_type: 'real_hardware' },
    { id: 'CAM-02', name: 'Perimeter Fence North', status: 'online', location: 'Exterior', fps: 24, resolution: '1080p', active_models: ['yolo'], source_type: 'real_hardware' },
    { id: 'CAM-03', name: 'Server Room Alpha', status: 'online', location: 'Datacenter', fps: 60, resolution: '1080p', active_models: ['yolo', 'anomaly'], source_type: 'webcam' },
    { id: 'CAM-04', name: 'Loading Dock A', status: 'online', location: 'Warehouse', fps: 30, resolution: '1440p', active_models: ['yolo'], source_type: 'real_hardware' },
    { id: 'CAM-05', name: 'Executive Suite Hall', status: 'online', location: 'Floor 4', fps: 30, resolution: '4K', active_models: ['face_rec'], source_type: 'real_hardware' },
    { id: 'CAM-06', name: 'Parking Garage L1', status: 'offline', location: 'Garage', fps: 15, resolution: '720p', active_models: [], source_type: 'real_hardware' },
    { id: 'CAM-07', name: 'Cafeteria', status: 'degraded', location: 'Floor 1', fps: 10, resolution: '480p', active_models: ['yolo'], source_type: 'real_hardware' },
    { id: 'CAM-08', name: 'Mobile Patrol Unit 3', status: 'online', location: 'Sector 7', fps: 30, resolution: '1080p', active_models: ['yolo'], source_type: 'rtsp_phone' },
  ];
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
  const mockImages: Record<string, string> = {
    'CAM-01': 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&q=80',
    'CAM-02': 'https://images.unsplash.com/photo-1628003666014-99b3b063d8de?w=800&q=80',
    'CAM-03': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
    'CAM-04': 'https://images.unsplash.com/photo-1586528116311-ad8ed7c83a50?w=800&q=80',
    'CAM-05': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'CAM-07': 'https://images.unsplash.com/photo-1525610553991-2bede1a236e2?w=800&q=80',
    'CAM-08': 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800&q=80',
  };
  return mockImages[cameraId] || 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&q=80';
};
import { getAuthHeaders } from './auth';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface DashboardStats {
  activeIncidents: number;
  activeSecurityEvents: number;
  camerasOnline: number;
  camerasOffline: number;
  modelsRunning: number;
  systemHealth: string;
  threatLevel: string;
  recentAlerts: {
    id: string;
    title: string;
    time: string;
    severity: string;
  }[];
}

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch dashboard stats');
  return response.json();
};

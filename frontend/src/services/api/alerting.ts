import { getAuthHeaders } from './auth';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export type ChannelType = 'slack' | 'discord' | 'telegram' | 'email' | 'sms';
export type SeverityThreshold = 'critical' | 'high' | 'medium' | 'low';

export interface AlertChannel {
  id: string;
  name: string;
  channel_type: ChannelType;
  webhook_url: string | null;
  email_address: string | null;
  phone_number: string | null;
  chat_id: string | null;
  severity_threshold: SeverityThreshold;
  incident_types: string[] | null;
  enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface AlertChannelCreate {
  name: string;
  channel_type: ChannelType;
  webhook_url?: string;
  bot_token?: string;
  chat_id?: string;
  email_address?: string;
  phone_number?: string;
  smtp_config?: Record<string, unknown>;
  twilio_config?: Record<string, unknown>;
  severity_threshold: SeverityThreshold;
  incident_types?: string[] | null;
  enabled: boolean;
}

export const fetchAlertChannels = async (): Promise<AlertChannel[]> => {
  const response = await fetch(`${API_BASE_URL}/alerting/channels`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch alert channels');
  return response.json();
};

export const createAlertChannel = async (data: AlertChannelCreate): Promise<AlertChannel> => {
  const response = await fetch(`${API_BASE_URL}/alerting/channels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.detail || 'Failed to create alert channel');
  }
  return response.json();
};

export const updateAlertChannel = async (
  id: string,
  data: Partial<AlertChannelCreate>
): Promise<AlertChannel> => {
  const response = await fetch(`${API_BASE_URL}/alerting/channels/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update alert channel');
  return response.json();
};

export const deleteAlertChannel = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/alerting/channels/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete alert channel');
};

export const testAlertChannel = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/alerting/channels/${id}/test`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to test alert channel');
  return response.json();
};

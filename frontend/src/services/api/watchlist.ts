import { getAuthHeaders } from './auth';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export interface WatchlistEntry {
  id: string;
  name: string;
  category: 'POI' | 'Suspect' | 'Missing' | 'VIP';
  status: 'active' | 'inactive';
  photo_url: string | null;
  notes: string | null;
  added_at: string | null;
  last_match: string | null;
}

export interface WatchlistMatch {
  id: number;
  watchlist_id: string;
  watchlist_name: string | null;
  watchlist_category: string | null;
  camera_id: string | null;
  confidence: number;
  confidence_pct: number;
  frame_path: string | null;
  timestamp: string | null;
}

export const fetchWatchlist = async (params?: {
  category?: string;
  status?: string;
}): Promise<WatchlistEntry[]> => {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.status) query.set('status', params.status);
  const response = await fetch(`${API_BASE_URL}/watchlist/?${query}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch watchlist');
  return response.json();
};

export const createWatchlistEntry = async (data: {
  name: string;
  category: string;
  notes?: string;
  photo_url?: string;
}): Promise<WatchlistEntry> => {
  const response = await fetch(`${API_BASE_URL}/watchlist/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create watchlist entry');
  return response.json();
};

export const updateWatchlistEntry = async (id: string, data: Partial<WatchlistEntry>) => {
  const response = await fetch(`${API_BASE_URL}/watchlist/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update watchlist entry');
  return response.json();
};

export const deleteWatchlistEntry = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/watchlist/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete watchlist entry');
};

export const fetchWatchlistMatches = async (limit = 50): Promise<WatchlistMatch[]> => {
  const response = await fetch(`${API_BASE_URL}/watchlist/matches?limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch watchlist matches');
  return response.json();
};

export const simulateWatchlistMatch = async () => {
  const response = await fetch(`${API_BASE_URL}/watchlist/simulate-match`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to simulate match');
  return response.json();
};

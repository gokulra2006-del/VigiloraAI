const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export const login = async (username: string, password: string) => {
  // Mock login for Vercel presentation
  localStorage.setItem('sentinel_token', 'mock-token-for-demo');
  return { access_token: 'mock-token-for-demo', token_type: 'bearer' };
};

export const logout = () => {
  localStorage.removeItem('sentinel_token');
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('sentinel_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchCurrentUser = async () => {
  // Mock user fetch for Vercel presentation
  const headers = getAuthHeaders();
  if (!headers.Authorization) return null;
  return { username: 'admin', role: 'admin' };
};

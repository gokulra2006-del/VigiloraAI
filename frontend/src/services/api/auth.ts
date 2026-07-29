const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export const login = async (username: string, password: string) => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = await response.json();
  localStorage.setItem('sentinel_token', data.access_token);
  return data;
};

export const logout = () => {
  localStorage.removeItem('sentinel_token');
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('sentinel_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchCurrentUser = async () => {
  const headers = getAuthHeaders();
  if (!headers.Authorization) return null;

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers,
  });

  if (!response.ok) return null;
  return response.json();
};

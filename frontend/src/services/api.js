const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = typeof body.detail === 'string' ? body.detail : message;
    } catch { /* Keep the status message for non-JSON responses. */ }
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const apiJson = (method, body) => ({ method, body: JSON.stringify(body) });

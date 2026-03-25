/**
 * src/api/client.js
 *
 * Fix: do NOT send Authorization header to /auth/ endpoints.
 * If a stale/expired token exists in localStorage and is sent on the
 * login or register request, DRF's JWT authenticator raises
 * AuthenticationFailed (401) before AllowAny even gets a chance to run.
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Public auth endpoints that must NEVER receive a Bearer token
const PUBLIC_PATHS = [
  '/auth/login/',
  '/auth/register/',
  '/auth/token/refresh/',
];

client.interceptors.request.use((config) => {
  const isPublic = PUBLIC_PATHS.some(p => config.url?.includes(p));
  if (!isPublic) {
    const token = localStorage.getItem('access');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const isPublic  = PUBLIC_PATHS.some(p => original.url?.includes(p));

    if (err.response?.status === 401 && !original._retry && !isPublic) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh');
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/token/refresh/`, { refresh });
          localStorage.setItem('access', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return client(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default client;

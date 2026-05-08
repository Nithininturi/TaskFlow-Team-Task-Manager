import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  signup: (data) => api.post('/api/auth/signup', data),
  login: (data) => api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
};

// ─── Projects ──────────────────────────────────────────────────────────────────
export const projectsApi = {
  getAll: () => api.get('/api/projects'),
  getOne: (id) => api.get(`/api/projects/${id}`),
  create: (data) => api.post('/api/projects', data),
  update: (id, data) => api.put(`/api/projects/${id}`, data),
  delete: (id) => api.delete(`/api/projects/${id}`),
  addMember: (id, data) => api.post(`/api/projects/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/api/projects/${id}/members/${userId}`),
};

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const tasksApi = {
  getDashboard: () => api.get('/api/tasks/dashboard'),
  getByProject: (projectId, params) => api.get(`/api/tasks/project/${projectId}`, { params }),
  create: (data) => api.post('/api/tasks', data),
  update: (id, data) => api.put(`/api/tasks/${id}`, data),
  delete: (id) => api.delete(`/api/tasks/${id}`),
  getComments: (id) => api.get(`/api/tasks/${id}/comments`),
  addComment: (id, data) => api.post(`/api/tasks/${id}/comments`, data),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  search: (q) => api.get('/api/users/search', { params: { q } }),
};

export default api;

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ww_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ww_token');
      localStorage.removeItem('ww_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  getMe:    ()     => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
};

export const energyApi = {
  getReadings:   (params) => api.get('/energy', { params }),
  createReading: (data)   => api.post('/energy', data),
  getReading:    (id)     => api.get(`/energy/${id}`),
  updateReading: (id, d)  => api.put(`/energy/${id}`, d),
  deleteReading: (id)     => api.delete(`/energy/${id}`),
  importCSV:     (form)   => api.post('/energy/import', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  exportCSV:     (params) => api.get('/energy/export', { params, responseType: 'blob' }),
  seedSample:    (days)   => api.post('/energy/seed-sample', { days }),
};

export const analyticsApi = {
  getSummary:     (params) => api.get('/analytics/summary', { params }),
  getConsumption: (params) => api.get('/analytics/consumption', { params }),
  getCostAnalysis:(params) => api.get('/analytics/cost', { params }),
};

export const mlApi = {
  getStatus:             ()     => api.get('/ml/status'),
  train:                 (data) => api.post('/ml/train', data || {}),
  getEvaluation:         ()     => api.get('/ml/evaluation'),
  forecast:              (data) => api.post('/ml/forecast', data),
  detectAnomalies:       (data) => api.post('/ml/detect-anomalies', data),
  getRecommendations:    ()     => api.get('/recommendations'),
  dismissRecommendation: (id)   => api.post(`/recommendations/${id}/dismiss`),
};

export const goalsApi = {
  getGoals:   ()         => api.get('/goals'),
  createGoal: (data)     => api.post('/goals', data),
  updateGoal: (id, data) => api.put(`/goals/${id}`, data),
  deleteGoal: (id)       => api.delete(`/goals/${id}`),
};

export const settingsApi = {
  getSettings:    ()     => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
};


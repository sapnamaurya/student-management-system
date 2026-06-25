import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
});

API.interceptors.response.use(
  res => res,
  err => {
    const isAuthCheck = err.config?.url?.includes('/auth/me');
    const onAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
    if (err.response?.status === 401 && !isAuthCheck && !onAuthPage) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
  logout: () => API.post('/auth/logout'),
  me: () => API.get('/auth/me'),
};

export const studentAPI = {
  getAll: (params) => API.get('/students', { params }),
  getOne: (id) => API.get(`/students/${id}`),
  create: (data) => API.post('/students', data),
  update: (id, data) => API.put(`/students/${id}`, data),
  delete: (id) => API.delete(`/students/${id}`),
};

export const courseAPI = {
  getAll: () => API.get('/courses'),
  create: (data) => API.post('/courses', data),
  update: (id, data) => API.put(`/courses/${id}`, data),
  delete: (id) => API.delete(`/courses/${id}`),
};

export const gradeAPI = {
  getAll: (params) => API.get('/grades', { params }),
  create: (data) => API.post('/grades', data),
  update: (id, data) => API.put(`/grades/${id}`, data),
  delete: (id) => API.delete(`/grades/${id}`),
};

export const statsAPI = { get: () => API.get('/stats') };
export const userAPI = {
  getAll: () => API.get('/users'),
  update: (id, data) => API.put(`/users/${id}`, data),
  delete: (id) => API.delete(`/users/${id}`),
  register: (data) => API.post('/auth/register', data),
};

export const aiAPI = {
  studentSummary: (id) => API.post(`/ai/student-summary/${id}`),
  reportComment: (id, tone) => API.post(`/ai/report-comment/${id}`, { tone }),
  chat: (message, history) => API.post('/ai/chat', { message, history }),
};

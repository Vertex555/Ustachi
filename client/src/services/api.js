import { http } from './apiClient';

export const authApi = {
  register: (payload) => http.post('/auth/register', payload),
  verify: (payload) => http.post('/auth/verify', payload),
  login: (payload) => http.post('/auth/login', payload),
  logout: () => http.post('/auth/logout'),
  me: () => http.get('/auth/me'),
  requestOtp: (payload) => http.post('/auth/request-otp', payload),
};

export const userApi = {
  me: () => http.get('/users/me'),
  updateMe: (payload) => http.patch('/users/me', payload),
};

export const masterApi = {
  list: (params) => http.get('/masters', { params }),
  me: () => http.get('/masters/me'),
  create: (payload) => http.post('/masters/me', payload),
  update: (payload) => http.patch('/masters/me', payload),
  get: (id) => http.get(`/masters/${id}`),
};

export const deviceApi = {
  list: (params) => http.get('/devices', { params }),
  get: (id) => http.get(`/devices/${id}`),
};

export const uploadApi = {
  image: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return http.post('/uploads/image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  video: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return http.post('/uploads/video', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const healthApi = {
  check: () => http.get('/health'),
};

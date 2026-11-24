import axios from 'axios';

export const TOKEN_KEY = 'hiretrack_token';
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({ baseURL, timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const onLogin = window.location.pathname.startsWith('/login');
    if (error.response?.status === 401 && !onLogin) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.assign('/login?expired=1');
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.error?.message) return error.response.data.error.message;
  if (error?.request && !error.response) return 'Cannot reach the server. Check your connection and try again.';
  return fallback;
}

const data = (res) => res.data.data;
const page = (res) => ({ items: res.data.data, meta: res.data.meta });

export const authApi = {
  login: (body) => api.post('/auth/login', body).then(data),
  register: (body) => api.post('/auth/register', body).then(data),
  me: () => api.get('/auth/me').then(data),
  changePassword: (body) => api.post('/auth/change-password', body).then(data),
};

export const jobsApi = {
  list: (params) => api.get('/jobs', { params }).then(page),
  get: (id) => api.get(`/jobs/${id}`).then(data),
  save: (id) => api.post(`/jobs/${id}/save`).then(data),
  unsave: (id) => api.delete(`/jobs/${id}/save`).then(data),
  saved: (params) => api.get('/saved-jobs', { params }).then(page),
};

export const recruiterApi = {
  profile: () => api.get('/recruiter/profile').then(data),
  updateProfile: (body) => api.put('/recruiter/profile', body).then(data),
  jobs: (params) => api.get('/recruiter/jobs', { params }).then(page),
  createJob: (body) => api.post('/jobs', body).then(data),
  updateJob: (id, body) => api.put(`/jobs/${id}`, body).then(data),
  closeJob: (id) => api.post(`/jobs/${id}/close`).then(data),
  reopenJob: (id) => api.post(`/jobs/${id}/reopen`).then(data),
  deleteJob: (id) => api.delete(`/jobs/${id}`).then(data),
  applicants: (jobId, params) => api.get(`/jobs/${jobId}/applications`, { params }).then(page),
};

export const candidateApi = {
  profile: () => api.get('/candidate/profile').then(data),
  updateProfile: (body) => api.put('/candidate/profile', body).then(data),
  recommendations: () => api.get('/candidate/recommendations').then(data),
  resumes: () => api.get('/resumes').then(data),
  uploadResume: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/resumes', form).then(data);
  },
  deleteResume: (id) => api.delete(`/resumes/${id}`).then(data),
  apply: (jobId, body) => api.post(`/jobs/${jobId}/apply`, body).then(data),
  applications: (params) => api.get('/applications', { params }).then(page),
};

export const applicationsApi = {
  get: (id) => api.get(`/applications/${id}`).then(data),
  match: (id) => api.get(`/applications/${id}/match`).then(data),
  withdraw: (id) => api.post(`/applications/${id}/withdraw`).then(data),
  updateStatus: (id, body) => api.patch(`/applications/${id}/status`, body).then(data),
  scheduleInterview: (id, body) => api.post(`/applications/${id}/interviews`, body).then(data),
};

export const notificationsApi = {
  list: (params) => api.get('/notifications', { params }).then((res) => ({
    items: res.data.data,
    meta: res.data.meta,
    unreadCount: res.data.unread_count ?? 0,
  })),
  markRead: (id) => api.post(`/notifications/${id}/read`).then(data),
  markAllRead: () => api.post('/notifications/read-all').then(data),
};

export const adminApi = {
  stats: () => api.get('/admin/stats').then(data),
  users: (params) => api.get('/admin/users', { params }).then(page),
  updateUser: (id, body) => api.patch(`/admin/users/${id}`, body).then(data),
  jobs: (params) => api.get('/admin/jobs', { params }).then(page),
  removeJob: (id, reason) => api.patch(`/admin/jobs/${id}/remove`, { reason }).then(data),
  restoreJob: (id) => api.patch(`/admin/jobs/${id}/restore`).then(data),
  activity: (params) => api.get('/admin/activity', { params }).then(page),
  report: () => api.get('/admin/reports/applications').then(data),
};

/** Downloads a file through the authenticated API (a plain link cannot send the bearer token). */
export async function downloadProtected(path, filename) {
  const res = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default api;

import axios from 'axios';

/** NestJS validation returns `message` as string or string[] */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: {
      status?: number;
      data?: { message?: string | string[]; error?: string };
    };
    message?: string;
  };
  const data = e.response?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string' && msg.length > 0) return msg;
  if (typeof data?.error === 'string' && data.error.length > 0) return data.error;
  if (!e.response) {
    return `${fallback} — không kết nối được API. Kiểm tra backend đang chạy và NEXT_PUBLIC_API_URL trong frontend/.env.local (phải trùng PORT trong backend/.env, ví dụ http://localhost:3003).`;
  }
  if (e.response?.status === 401) {
    return 'Phiên đăng nhập hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.';
  }
  return fallback;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = String(err.config?.url ?? '');
    const isAuthAttempt =
      url.includes('/auth/login') || url.includes('/auth/register');
    const isAiChat = url.includes('/ai/chat') || url.includes('/ai/detect');
    // Do not redirect on wrong password (401) — only when an existing session is rejected
    if (
      err.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !isAuthAttempt &&
      !isAiChat
    ) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),
  me: () => api.get('/auth/me'),
};

export type JsonRecord = Record<string, unknown>;

export const roomsApi = {
  list: (floorId?: string) => api.get('/rooms', { params: { floorId } }),
  available: (params: { startTime: string; endTime: string }) =>
    api.get('/rooms/available', { params }),
  get: (id: string) => api.get(`/rooms/${id}`),
  create: (data: JsonRecord) => api.post('/rooms', data),
  update: (id: string, data: JsonRecord) => api.patch(`/rooms/${id}`, data),
  delete: (id: string) => api.delete(`/rooms/${id}`),
};

export const equipmentApi = {
  list: (status?: string) => api.get('/equipment', { params: { status } }),
  get: (id: string) => api.get(`/equipment/${id}`),
  checkout: (id: string, dueReturnAt: string) => api.post(`/equipment/${id}/checkout`, { dueReturnAt }),
  returnEquipment: (id: string) => api.post(`/equipment/${id}/return`),
  create: (data: JsonRecord) => api.post('/equipment', data),
  update: (id: string, data: JsonRecord) => api.patch(`/equipment/${id}`, data),
};

export const bookingsApi = {
  list: () => api.get('/bookings'),
  listAll: () => api.get('/bookings/all'),
  get: (id: string) => api.get(`/bookings/${id}`),
  create: (data: JsonRecord) => api.post('/bookings', data),
  cancel: (id: string, reason?: string) => api.delete(`/bookings/${id}`, { data: { reason } }),
  roomSchedule: (roomId: string, date: string) =>
    api.get(`/bookings/room/${roomId}/schedule`, { params: { date } }),
};

export const floorsApi = {
  list: () => api.get('/floors'),
  get: (id: string) => api.get(`/floors/${id}`),
  create: (data: JsonRecord) => api.post('/floors', data),
  update: (id: string, data: JsonRecord) => api.patch(`/floors/${id}`, data),
  updateSvgMap: (id: string, svgMap: string) => api.patch(`/floors/${id}/svg-map`, { svgMap }),
};

export const aiApi = {
  chat: (message: string, sessionId?: string) => api.post('/ai/chat', { message, sessionId }),
  detect: (imageBase64: string, equipmentId?: string) =>
    api.post('/ai/detect', { imageBase64, equipmentId }),
};

export const usersApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: { name?: string; telegramChatId?: string; avatarUrl?: string }) =>
    api.patch('/users/profile', data),
};

import api from './axios.js';
export const getNotifications = (p) => api.get('/notifications', { params: p });
export const markRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllRead = () => api.patch('/notifications/read-all');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);

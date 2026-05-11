import api from './axios.js';
export const chat = (d) => api.post('/ai/chat', d);
export const getChatHistory = (p) => api.get('/ai/chat/history', { params: p });
export const submitFeedback = (id, d) => api.patch(`/ai/chat/${id}/feedback`, d);
export const getFactoryContext = () => api.get('/ai/context');

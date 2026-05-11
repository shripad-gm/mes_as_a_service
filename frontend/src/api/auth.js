import api from './axios.js';
export const login = (d) => api.post('/auth/login', d);
export const register = (d) => api.post('/auth/register', d);
export const refresh = (d) => api.post('/auth/refresh', d);
export const logout = (d) => api.post('/auth/logout', d);
export const me = () => api.get('/auth/me');
export const changePassword = (d) => api.patch('/auth/change-password', d);

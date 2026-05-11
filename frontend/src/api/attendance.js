import api from './axios.js';
export const getAttendance = (p) => api.get('/attendance', { params: p });
export const checkIn = (d) => api.post('/attendance/check-in', d);
export const checkOut = (d) => api.patch('/attendance/check-out', d);
export const getAttendanceSummary = (p) => api.get('/attendance/summary', { params: p });

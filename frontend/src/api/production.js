import api from './axios.js';
export const floorDashboard = () => api.get('/production/floor-dashboard');
export const getBottlenecks = () => api.get('/production/bottlenecks');
export const getEfficiency = () => api.get('/production/efficiency');
export const getTimeline = (id) => api.get(`/production/work-orders/${id}/timeline`);
export const createLog = (d) => api.post('/production/log', d);

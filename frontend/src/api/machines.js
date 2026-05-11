import api from './axios.js';
export const getMachines = (p) => api.get('/machines', { params: p });
export const createMachine = (d) => api.post('/machines', d);
export const updateMachine = (id, d) => api.patch(`/machines/${id}`, d);
export const startDowntime = (id, d) => api.post(`/machines/${id}/downtime/start`, d);
export const resolveDowntime = (downtimeId, d) => api.patch(`/machines/downtime/${downtimeId}/resolve`, d);
export const logMaintenance = (id, d) => api.post(`/machines/${id}/maintenance`, d);
export const maintenanceDue = () => api.get('/machines/maintenance-due');

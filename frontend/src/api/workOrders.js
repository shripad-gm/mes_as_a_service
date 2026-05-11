import api from './axios.js';
export const getWorkOrders = (p) => api.get('/work-orders', { params: p });
export const getWorkOrder = (id) => api.get(`/work-orders/${id}`);
export const createWorkOrder = (d) => api.post('/work-orders', d);
export const releaseWorkOrder = (id) => api.patch(`/work-orders/${id}/release`);
export const updateOperation = (id, opId, d) => api.patch(`/work-orders/${id}/operations/${opId}`, d);
export const issueMaterial = (id, d) => api.post(`/work-orders/${id}/material-issue`, d);

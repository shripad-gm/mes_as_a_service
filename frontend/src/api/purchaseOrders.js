import api from './axios.js';
export const getPurchaseOrders = (p) => api.get('/purchase-orders', { params: p });
export const getPurchaseOrder = (id) => api.get(`/purchase-orders/${id}`);
export const createPurchaseOrder = (d) => api.post('/purchase-orders', d);
export const updatePoStatus = (id, d) => api.patch(`/purchase-orders/${id}/status`, d);
export const createGrn = (id, d) => api.post(`/purchase-orders/${id}/grn`, d);

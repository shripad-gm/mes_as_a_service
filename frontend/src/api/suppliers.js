import api from './axios.js';
export const getSuppliers = (p) => api.get('/suppliers', { params: p });
export const getSupplier = (id) => api.get(`/suppliers/${id}`);
export const createSupplier = (d) => api.post('/suppliers', d);
export const updateSupplier = (id, d) => api.patch(`/suppliers/${id}`, d);
export const linkMaterial = (id, d) => api.post(`/suppliers/${id}/materials`, d);
export const getSupplierPerformance = (id) => api.get(`/suppliers/${id}/performance`);

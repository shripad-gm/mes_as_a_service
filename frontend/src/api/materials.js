import api from './axios.js';
export const getMaterials = (p) => api.get('/materials', { params: p });
export const getMaterial = (id) => api.get(`/materials/${id}`);
export const createMaterial = (d) => api.post('/materials', d);
export const updateMaterial = (id, d) => api.patch(`/materials/${id}`, d);
export const stockIn = (id, d) => api.post(`/materials/${id}/stock-in`, d);
export const adjustStock = (id, d) => api.post(`/materials/${id}/adjust`, d);
export const stockSummary = () => api.get('/materials/stock-summary');
export const getMovements = (id) => api.get(`/materials/${id}/movements`);

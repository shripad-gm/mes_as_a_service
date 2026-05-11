import api from './axios.js';
export const getShipments = (p) => api.get('/shipments', { params: p });
export const getShipment = (id) => api.get(`/shipments/${id}`);
export const createShipment = (d) => api.post('/shipments', d);
export const updateShipmentStatus = (id, d) => api.patch(`/shipments/${id}/status`, d);
export const addPackingList = (id, d) => api.post(`/shipments/${id}/packing-list`, d);

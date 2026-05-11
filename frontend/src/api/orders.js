import api from './axios.js';
export const getOrders = (p) => api.get('/orders', { params: p });
export const getOrder = (id) => api.get(`/orders/${id}`);
export const createOrder = (d) => api.post('/orders', d);
export const updateOrder = (id, d) => api.patch(`/orders/${id}`, d);
export const updateOrderStatus = (id, d) => api.patch(`/orders/${id}/status`, d);
export const assignOrder = (id, d) => api.post(`/orders/${id}/assign`, d);
export const getOrderDashboard = () => api.get('/orders/dashboard');

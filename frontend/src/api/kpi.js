import api from './axios.js';
export const getKpiDashboard = () => api.get('/kpi/dashboard');
export const getEfficiencyTrend = (p) => api.get('/kpi/efficiency', { params: p });
export const getDhuTrend = (p) => api.get('/kpi/dhu', { params: p });
export const getOee = (p) => api.get('/kpi/oee', { params: p });
export const getOrderFulfillment = () => api.get('/kpi/order-fulfillment');
export const getSnapshots = () => api.get('/kpi/snapshots');
export const saveSnapshot = (d) => api.post('/kpi/snapshots', d);

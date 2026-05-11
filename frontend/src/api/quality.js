import api from './axios.js';
export const getChecks = (p) => api.get('/quality/checks', { params: p });
export const getCheck = (id) => api.get(`/quality/checks/${id}`);
export const createCheck = (d) => api.post('/quality/checks', d);
export const getDefectTypes = () => api.get('/quality/defect-types');
export const createDefectType = (d) => api.post('/quality/defect-types', d);
export const getAnalytics = (p) => api.get('/quality/analytics', { params: p });
export const createCvInspection = (d) => api.post('/quality/cv-inspection', d);

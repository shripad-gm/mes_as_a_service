import api from './axios.js';
export const getEmployees = (p) => api.get('/employees', { params: p });
export const getEmployee = (id) => api.get(`/employees/${id}`);
export const createEmployee = (d) => api.post('/employees', d);
export const updateEmployee = (id, d) => api.patch(`/employees/${id}`, d);
export const upsertSkill = (id, d) => api.post(`/employees/${id}/skills`, d);
export const getEmployeePerformance = (id) => api.get(`/employees/${id}/performance`);
export const getAvailableForOperation = (p) => api.get('/employees/available', { params: p });

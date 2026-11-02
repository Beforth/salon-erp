import api from './api'

export const payrollService = {
  getSettings: () => api.get('/payroll/settings'),
  saveSettings: (data) => api.put('/payroll/settings', data),
  listCycles: () => api.get('/payroll/cycles'),
  getCycle: (id) => api.get(`/payroll/cycles/${id}`),
  getEmployee: (id, employeeId) => api.get(`/payroll/cycles/${id}/employees/${employeeId}`),
  saveAdvances: (id, employeeId, deductions) => api.put(`/payroll/cycles/${id}/employees/${employeeId}/advances`, { deductions }),
  saveEntry: (id, employeeId, data) => api.put(`/payroll/cycles/${id}/employees/${employeeId}`, data),
  resetEntry: (id, employeeId) => api.delete(`/payroll/cycles/${id}/employees/${employeeId}`),
  createCycle: (data) => api.post('/payroll/cycles', data),
  deleteCycle: (id) => api.delete(`/payroll/cycles/${id}`),
}

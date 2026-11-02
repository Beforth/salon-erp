import api from './api'

export const payrollService = {
  listCycles: () => api.get('/payroll/cycles'),
  createCycle: (data) => api.post('/payroll/cycles', data),
  deleteCycle: (id) => api.delete(`/payroll/cycles/${id}`),
}

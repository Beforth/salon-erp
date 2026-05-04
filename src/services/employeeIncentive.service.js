import api from './api'

export const employeeIncentiveService = {
  list: (params) => api.get('/employee-incentives', { params }),

  getForEmployee: (employeeId, params) =>
    api.get(`/employee-incentives/${employeeId}`, { params }),

  lock: (data) => api.post('/employee-incentives/lock', data),

  recompute: (data) => api.post('/employee-incentives/recompute', data),

  disburse: (data) => api.post('/employee-incentives/disburse', data),
}

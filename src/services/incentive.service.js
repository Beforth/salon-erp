import api from './api'

export const incentiveService = {
  getConfigs: (params) => api.get('/incentives/config', { params }),
  createConfig: (data) => api.post('/incentives/config', data),
  updateConfig: (id, data) => api.put(`/incentives/config/${id}`, data),
  deleteConfig: (id) => api.delete(`/incentives/config/${id}`),
  getReport: (params) => api.get('/incentives/report', { params }),
}

import api from './api'

export const maintenanceService = {
  getRecords: (params) => api.get('/maintenance', { params }),
  getRecordById: (id) => api.get(`/maintenance/${id}`),
  createRecord: (data) => api.post('/maintenance', data),
  updateRecord: (id, data) => api.put(`/maintenance/${id}`, data),
  deleteRecord: (id) => api.delete(`/maintenance/${id}`),
}

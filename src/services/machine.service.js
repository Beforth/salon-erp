import api from './api'

export const machineService = {
  list: (params) => api.get('/machines', { params }),
  getById: (id) => api.get(`/machines/${id}`),
  create: (data) => api.post('/machines', data),
  update: (id, data) => api.put(`/machines/${id}`, data),
  remove: (id) => api.delete(`/machines/${id}`),
}

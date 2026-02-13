import api from './api'

export const chairService = {
  getChairs: (params) => api.get('/chairs', { params }),

  getChairById: (id) => api.get(`/chairs/${id}`),

  createChair: (data) => api.post('/chairs', data),

  updateChair: (id, data) => api.put(`/chairs/${id}`, data),

  updateChairStatus: (id, data) => api.patch(`/chairs/${id}/status`, data),
}

import api from './api'

export const docsService = {
  getDocs: () => api.get('/docs'),

  getDocById: (id) => api.get(`/docs/${id}`),

  createDoc: (data) => api.post('/docs', data),

  updateDoc: (id, data) => api.put(`/docs/${id}`, data),

  deleteDoc: (id) => api.delete(`/docs/${id}`),
}

import api from './api'

export const billService = {
  getBills: (params) => api.get('/bills', { params }),

  getBillById: (id) => api.get(`/bills/${id}`),

  createBill: (data) => api.post('/bills', data),

  updateBill: (id, data) => api.put(`/bills/${id}`, data),

  cancelBill: (id) => api.delete(`/bills/${id}`),
}

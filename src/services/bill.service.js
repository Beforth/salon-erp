import api from './api'

export const billService = {
  getBills: (params) => api.get('/bills', { params }),

  getBillById: (id) => api.get(`/bills/${id}`),

  createBill: (data) => api.post('/bills', data),

  updateBill: (id, data) => api.put(`/bills/${id}`, data),

  completeBill: (id, data) => api.post(`/bills/${id}/complete`, data),

  cancelBill: (id) => api.delete(`/bills/${id}`),
}

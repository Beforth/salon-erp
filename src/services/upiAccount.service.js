import api from './api'

export const upiAccountService = {
  getAccounts: (params) => api.get('/upi-accounts', { params }),
  getAccountById: (id) => api.get(`/upi-accounts/${id}`),
  createAccount: (data) => api.post('/upi-accounts', data),
  updateAccount: (id, data) => api.put(`/upi-accounts/${id}`, data),
  deleteAccount: (id) => api.delete(`/upi-accounts/${id}`),
  getDailyCollection: (params) => api.get('/upi-accounts/daily-collection', { params }),
}

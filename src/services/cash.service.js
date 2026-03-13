import api from './api'

export const cashService = {
  getDailySummary: (params) => api.get('/cash/summary', { params }),

  recordReconciliation: (data) => api.post('/cash/reconcile', data),

  addCashSource: (data) => api.post('/cash/sources', data),

  recordBankDeposit: (data) => api.post('/cash/deposits', data),

  getDeposits: (params) => api.get('/cash/deposits', { params }),

  updateDeposit: (id, data) => api.put(`/cash/deposits/${id}`, data),

  getCashHistory: (params) => api.get('/cash/history', { params }),

  setStartingBalance: (data) => api.post('/cash/starting-balance', data),

  getDashboardStatus: () => api.get('/cash/dashboard-status'),
}

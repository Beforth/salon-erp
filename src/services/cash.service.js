import api from './api'

export const cashService = {
  getDailySummary: (params) => api.get('/cash/summary', { params }),

  recordReconciliation: (data) => api.post('/cash/reconcile', data),

  addCashSource: (data) => api.post('/cash/sources', data),

  recordBankDeposit: (data) => api.post('/cash/deposits', data),

  getCashHistory: (params) => api.get('/cash/history', { params }),
}

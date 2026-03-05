import api from './api'

export const purchaseBatchService = {
  getBatches: (params) => api.get('/purchase-batches', { params }),
  getBatchById: (id) => api.get(`/purchase-batches/${id}`),
  createBatch: (data) => api.post('/purchase-batches', data),
  recordPayment: (id, data) => api.post(`/purchase-batches/${id}/payment`, data),
}

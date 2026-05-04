import api from './api'

export const skuService = {
  getSkus: (params) => api.get('/skus', { params }),
  getSkuById: (id) => api.get(`/skus/${id}`),
  createSku: (data) => api.post('/skus', data),
  updateSku: (id, data) => api.put(`/skus/${id}`, data),
  deactivateSku: (id) => api.patch(`/skus/${id}/deactivate`),
}

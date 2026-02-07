import api from './api'

export const inventoryService = {
  getInventory: (params) => api.get('/inventory', { params }),

  adjustStock: (data) => api.post('/inventory/adjust', data),

  getLocations: () => api.get('/inventory/locations'),

  getTransfers: (params) => api.get('/inventory/transfers', { params }),

  createTransfer: (data) => api.post('/inventory/transfers', data),

  approveTransfer: (id) => api.post(`/inventory/transfers/${id}/approve`),
}

import api from './api'

export const inventoryService = {
  getInventory: (params) => api.get('/inventory', { params }),

  adjustStock: (data) => api.post('/inventory/adjust', data),

  getLocations: () => api.get('/inventory/locations'),

  getTransfers: (params) => api.get('/inventory/transfers', { params }),

  createTransfer: (data) => api.post('/inventory/transfers', data),

  approveTransfer: (id) => api.post(`/inventory/transfers/${id}/approve`),

  rejectTransfer: (id, data) => api.post(`/inventory/transfers/${id}/reject`, data),

  cancelTransfer: (id, data) => api.post(`/inventory/transfers/${id}/cancel`, data),

  getOpenContainers: (params) => api.get('/inventory/open-containers', { params }),

  getOpenContainerByBarcode: (barcode, params) =>
    api.get(`/inventory/open-containers/barcode/${encodeURIComponent(barcode)}`, { params }),

  openContainer: (data) => api.post('/inventory/open-containers', data),

  discardOpenContainer: (id) => api.post(`/inventory/open-containers/${id}/discard`),
}

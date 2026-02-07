import api from './api'

export const serviceService = {
  // Categories
  getCategories: (params) => api.get('/services/categories', { params }),

  createCategory: (data) => api.post('/services/categories', data),

  // Services
  getServices: (params) => api.get('/services', { params }),

  getServiceById: (id) => api.get(`/services/${id}`),

  createService: (data) => api.post('/services', data),

  updateService: (id, data) => api.put(`/services/${id}`, data),

  // Packages
  getPackages: (params) => api.get('/packages', { params }),

  getPackageById: (id) => api.get(`/packages/${id}`),

  createPackage: (data) => api.post('/packages', data),

  updatePackage: (id, data) => api.put(`/packages/${id}`, data),
}

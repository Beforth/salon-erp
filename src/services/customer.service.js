import api from './api'

export const customerService = {
  getCustomers: (params) => api.get('/customers', { params }),

  getCustomerById: (id) => api.get(`/customers/${id}`),

  getCustomerHistory: (id, params) =>
    api.get(`/customers/${id}/history`, { params }),

  createCustomer: (data) => api.post('/customers', data),

  updateCustomer: (id, data) => api.put(`/customers/${id}`, data),

  searchCustomers: (query, limit = 10) =>
    api.get('/customers/search', { params: { q: query, limit } }),
}

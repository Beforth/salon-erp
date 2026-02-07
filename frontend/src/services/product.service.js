import api from './api'

export const productService = {
  getProducts: (params) => api.get('/products', { params }),

  getProductById: (id) => api.get(`/products/${id}`),

  createProduct: (data) => api.post('/products', data),

  updateProduct: (id, data) => api.put(`/products/${id}`, data),

  deleteProduct: (id) => api.delete(`/products/${id}`),

  getCategories: () => api.get('/products/categories'),

  getLowStock: () => api.get('/products/low-stock'),
}

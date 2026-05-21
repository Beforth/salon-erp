import api from './api'

export const categoryService = {
  getCategories: () => api.get('/products/categories'),

  createCategory: (data) =>
    api.post('/products/categories', data),

  updateCategory: (id, data) =>
    api.put(`/products/categories/${id}`, data),

  deleteCategory: (id) =>
    api.delete(`/products/categories/${id}`),
}
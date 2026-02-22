import api from './api'

export const expenseService = {
  getExpenses: (params) => api.get('/expenses', { params }),

  getExpenseById: (id) => api.get(`/expenses/${id}`),

  createExpense: (data) => api.post('/expenses', data),

  updateExpense: (id, data) => api.put(`/expenses/${id}`, data),

  deleteExpense: (id) => api.delete(`/expenses/${id}`),

  getSummary: (params) => api.get('/expenses/summary', { params }),

  getCategories: () => api.get('/expenses/categories'),

  createCategory: (data) => api.post('/expenses/categories', data),

  updateCategory: (id, data) => api.put(`/expenses/categories/${id}`, data),

  deleteCategory: (id) => api.delete(`/expenses/categories/${id}`),
}

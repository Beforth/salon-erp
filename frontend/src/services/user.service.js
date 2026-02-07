import api from './api'

export const userService = {
  getUsers: (params) => api.get('/users', { params }),

  getUserById: (id) => api.get(`/users/${id}`),

  getUserPerformance: (id, period = 30) => api.get(`/users/${id}/performance`, { params: { period } }),

  createUser: (data) => api.post('/users', data),

  updateUser: (id, data) => api.put(`/users/${id}`, data),

  deleteUser: (id) => api.delete(`/users/${id}`),
}

import api from './api'

export const userService = {
  getUsers: (params) => api.get('/users', { params }),

  getUserById: (id) => api.get(`/users/${id}`),

  getUserPerformance: (id, period = 30) => api.get(`/users/${id}/performance`, { params: { period } }),

  createUser: (data) => api.post('/users', data),

  updateUser: (id, data) => api.put(`/users/${id}`, data),

  deleteUser: (id) => api.delete(`/users/${id}`),

  updateStarGoal: (id, monthly_star_goal) => api.put(`/users/${id}/star-goal`, { monthly_star_goal }),

  // Employee services (limited data, no amounts)
  getMyServices: (params) => api.get('/users/me/services', { params }),

  // Employee assets
  getEmployeeAssets: (id) => api.get(`/users/${id}/assets`),
  addEmployeeAsset: (id, data) => api.post(`/users/${id}/assets`, data),
  updateEmployeeAsset: (id, assetId, data) => api.put(`/users/${id}/assets/${assetId}`, data),
  deleteEmployeeAsset: (id, assetId) => api.delete(`/users/${id}/assets/${assetId}`),
}

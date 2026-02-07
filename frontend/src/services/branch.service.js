import api from './api'

export const branchService = {
  getBranches: (params) => api.get('/branches', { params }),

  getBranchById: (id) => api.get(`/branches/${id}`),

  getBranchEmployees: (id) => api.get(`/branches/${id}/employees`),

  getBranchChairs: (id) => api.get(`/branches/${id}/chairs`),

  createBranch: (data) => api.post('/branches', data),

  updateBranch: (id, data) => api.put(`/branches/${id}`, data),
}

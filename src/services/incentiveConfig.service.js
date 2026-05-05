import api from './api'

export const incentiveConfigService = {
  getForBranch: (branchId) => api.get(`/incentive-configs/${branchId}`),

  updateForBranch: (branchId, data) =>
    api.put(`/incentive-configs/${branchId}`, data),

  resetForBranch: (branchId) =>
    api.post(`/incentive-configs/${branchId}/reset`),
}

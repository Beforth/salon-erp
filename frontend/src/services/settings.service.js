import api from './api'

export const settingsService = {
  getSettings: () => api.get('/settings'),

  getSetting: (key) => api.get(`/settings/${key}`),

  updateSettings: (data) => api.put('/settings', data),

  updateSetting: (key, value) => api.put(`/settings/${key}`, { value }),

  resetSettings: () => api.post('/settings/reset'),

  getBranchFeatures: (branchId) => api.get(`/settings/branch/${branchId}/features`),

  updateBranchFeature: (branchId, featureId, isEnabled) =>
    api.put(`/settings/branch/${branchId}/features/${featureId}`, { is_enabled: isEnabled }),
}

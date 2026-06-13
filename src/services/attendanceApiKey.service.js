import api from './api'

export const attendanceApiKeyService = {
  listKeys: () => api.get('/settings/attendance-api-keys'),

  createKey: (data) => api.post('/settings/attendance-api-keys', data),

  revokeKey: (id) => api.delete(`/settings/attendance-api-keys/${id}`),
}

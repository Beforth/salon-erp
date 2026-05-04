import api from './api'

export const tokenService = {
  getOpenTokens: (params) => api.get('/tokens', { params }),

  lookupToken: ({ branchId, number }) =>
    api.get('/tokens/lookup', { params: { branch_id: branchId, number } }),

  createToken: (data) => api.post('/tokens', data),

  cancelToken: (id) => api.post(`/tokens/${id}/cancel`),
}

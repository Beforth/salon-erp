import api from './api'

export const jobRunService = {
  list: (params) => api.get('/jobs', { params }),
  getById: (id) => api.get(`/jobs/${id}`),
  listNames: () => api.get('/jobs/names'),
  listScheduled: () => api.get('/jobs/scheduled'),
}

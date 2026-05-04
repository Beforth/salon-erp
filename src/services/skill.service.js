import api from './api'

export const skillService = {
  getSkills: (params) => api.get('/skills', { params }),

  getSkillById: (id) => api.get(`/skills/${id}`),

  createSkill: (data) => api.post('/skills', data),

  updateSkill: (id, data) => api.put(`/skills/${id}`, data),

  deactivateSkill: (id) => api.patch(`/skills/${id}/deactivate`),
}

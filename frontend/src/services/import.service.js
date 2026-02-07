import api from './api'

export const importService = {
  uploadCSV: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/import/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  validateImport: (data) => api.post('/import/validate', data),

  importBills: (data) => api.post('/import/bills', data),
}

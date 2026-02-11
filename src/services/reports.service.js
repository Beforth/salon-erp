import api from './api'

export const reportsService = {
  getDashboardStats: (params) => api.get('/reports/dashboard', { params }),

  getDailySales: (params) => api.get('/reports/daily-sales', { params }),

  getMonthlyRevenue: (params) => api.get('/reports/monthly-revenue', { params }),

  getCustomerAnalytics: (params) => api.get('/reports/customers', { params }),

  getEmployeePerformance: (params) => api.get('/reports/employees', { params }),

  getServiceAnalytics: (params) => api.get('/reports/services', { params }),

  getInventoryReport: (params) => api.get('/reports/inventory', { params }),
}

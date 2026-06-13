import api from './api'

export const reportsService = {
  getDashboardStats: (params) => api.get('/reports/dashboard', { params }),

  getDailySales: (params) => api.get('/reports/daily-sales', { params }),

  getMonthlyRevenue: (params) => api.get('/reports/monthly-revenue', { params }),

  getCustomerAnalytics: (params) => api.get('/reports/customers', { params }),

  getEmployeePerformance: (params) => api.get('/reports/employees', { params }),

  getServiceAnalytics: (params) => api.get('/reports/services', { params }),

  getInventoryReport: (params) => api.get('/reports/inventory', { params }),

  getServiceLiability: (params) => api.get('/reports/service-liability', { params }),

  getSupplierCredit: (params) => api.get('/reports/supplier-credit', { params }),

  // Warehouse reports (Feature 3)
  getWarehouseStockOnHand: (params) => api.get('/reports/warehouse/stock-on-hand', { params }),
  getWarehousePurchases:   (params) => api.get('/reports/warehouse/purchases', { params }),
  getWarehouseTransfersOut:(params) => api.get('/reports/warehouse/transfers-out', { params }),
  getBranchPL:             (params) => api.get('/reports/branch/pl', { params }),
  getStockValueSnapshot:   ()       => api.get('/reports/inventory/value-snapshot'),

  getConsumptionUsageByService: (params) => api.get('/reports/consumption/usage-by-service', { params }),
  getConsumptionWastage: (params) => api.get('/reports/consumption/wastage', { params }),
  getBottleLifecycle: (params) => api.get('/reports/consumption/bottles', { params }),
  getBottleLifecycleDetail: (id) => api.get(`/reports/consumption/bottles/${id}`),
}

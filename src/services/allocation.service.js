import api from './api'

export const allocationService = {
  previewAllocation: ({ branchId, serviceIds }) =>
    api.post('/allocations/preview', { branch_id: branchId, service_ids: serviceIds }),
}

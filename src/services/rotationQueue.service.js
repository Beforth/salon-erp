import api from './api'

export const rotationQueueService = {
  getQueue: ({ branchId, heldEmployeeIds = [] }) =>
    api.get('/rotation-queue', {
      params: {
        branch_id: branchId,
        ...(heldEmployeeIds.length ? { held: heldEmployeeIds.join(',') } : {}),
      },
    }),

  pickNext: ({ branchId, serviceId, exclude = [], held = [] }) =>
    api.post('/rotation-queue/pick', {
      branch_id: branchId,
      ...(serviceId ? { service_id: serviceId } : {}),
      exclude,
      held,
    }),
}

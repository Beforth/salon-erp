import api from './api'

const fileParams = (params) => Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== '' && v != null))

/** Download needs the Authorization header, so it goes through axios and a Blob (not a plain link). */
export const dataTransferService = {
  getEntities: () => api.get('/data-transfer/entities'),
  exportFile: (entity, params) => api.get(`/data-transfer/${entity}/export`, { params: fileParams(params), responseType: 'blob' }),
  template: (entity, format) => api.get(`/data-transfer/${entity}/template`, { params: { format }, responseType: 'blob' }),
  importFile: (entity, file, { dryRun, onDuplicate }) => {
    const body = new FormData()
    body.append('file', file)
    body.append('dry_run', dryRun ? 'true' : 'false')
    if (onDuplicate) body.append('on_duplicate', onDuplicate)
    return api.post(`/data-transfer/${entity}/import`, body, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

/** Error text from a normal or a blob error response. */
export async function errorMessage(err) {
  const data = err?.response?.data
  try {
    const json = data instanceof Blob ? JSON.parse(await data.text()) : data
    return json?.error?.message || err.message || 'Something went wrong'
  } catch {
    return err?.message || 'Something went wrong'
  }
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

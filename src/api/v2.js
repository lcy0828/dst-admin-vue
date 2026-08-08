import axios from 'axios'
import apiConfig from './config'

const baseURL = `${apiConfig.BASE_URL.replace(/\/$/, '')}/v2`
let csrfToken = ''

export class APIError extends Error {
  constructor(status, body = {}, requestId = '') {
    const message = body.message || '服务器返回了无效响应'
    super(requestId ? `${message}（请求 ID：${requestId}）` : message)
    this.name = 'APIError'
    this.status = status
    this.code = body.code || 'UNKNOWN_ERROR'
    this.details = body.details
    this.requestId = requestId
  }
}

const client = axios.create({
  baseURL,
  timeout: apiConfig.TIMEOUT,
  withCredentials: true,
  headers: apiConfig.HEADERS
})

client.interceptors.request.use(config => {
  const method = (config.method || 'get').toUpperCase()
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    config.headers['X-CSRF-Token'] = csrfToken
    if (!config.headers['Idempotency-Key']) config.headers['Idempotency-Key'] = crypto.randomUUID()
  }
  return config
})

client.interceptors.response.use(response => {
  const envelope = response.data
  if (!envelope || envelope.error) {
    throw new APIError(response.status, envelope?.error, envelope?.meta?.requestId)
  }
  return envelope.data
}, error => {
  if (error instanceof APIError) return Promise.reject(error)
  const response = error.response
  if (!response) {
    return Promise.reject(new APIError(0, {
      code: 'BACKEND_UNAVAILABLE',
      message: '无法连接真实后端，请检查服务是否已启动'
    }))
  }
  const envelope = response.data
  return Promise.reject(new APIError(
    response.status,
    envelope?.error || { code: 'INVALID_RESPONSE', message: '服务器返回了无效响应' },
    envelope?.meta?.requestId || response.headers?.['x-request-id']
  ))
})

function rememberSession(session) {
  csrfToken = session?.csrfToken || ''
  return session
}

export const authAPI = {
  session: () => client.get('/auth/session').then(rememberSession),
  setup: (username, password) => client.post('/auth/setup', { username, password }).then(rememberSession),
  login: (username, password) => client.post('/auth/login', { username, password }).then(rememberSession),
  logout: () => client.post('/auth/logout').then(session => {
    csrfToken = ''
    return session
  }),
  changePassword: (currentPassword, newPassword) => client.put('/auth/password', {
    currentPassword,
    newPassword
  }).then(session => {
    csrfToken = ''
    return session
  })
}

const encode = value => encodeURIComponent(String(value))

export const systemV2API = {
  capabilities: () => client.get('/system/capabilities'),
  status: () => client.get('/system/status'),
  settings: () => client.get('/system/settings', { headers: { 'Cache-Control': 'no-store' } })
}

export const roomsV2API = {
  list: () => client.get('/rooms'),
  get: roomId => client.get(`/rooms/${encode(roomId)}`),
  worlds: roomId => client.get(`/rooms/${encode(roomId)}/worlds`),
  create: input => client.post('/rooms', input),
  action: (roomId, action, worldIds = []) => client.post(`/rooms/${encode(roomId)}/actions/${encode(action)}`, {
    worldIds
  })
}

export const worldStatesV2API = {
  list: roomId => client.get(`/rooms/${encode(roomId)}/world-states`)
}

export const gameV2API = {
  version: () => client.get('/game/version'),
  update: input => client.post('/game/actions/update', input),
  updateRun: jobId => client.get(`/game/update-runs/${encode(jobId)}`)
}

export const containersV2API = {
  list: () => client.get('/containers'),
  action: (containerId, action, confirmation = '') => client.post(
    `/containers/${encode(containerId)}/actions/${encode(action)}`,
    { confirmation }
  )
}

export const backupsV2API = {
  list: roomId => client.get(`/rooms/${encode(roomId)}/backups`),
  create: (roomId, name = '') => client.post(`/rooms/${encode(roomId)}/backups`, { name }),
  upload: (roomId, file, name = '') => {
    const body = new FormData()
    body.set('file', file)
    if (name) body.set('name', name)
    return client.post(`/rooms/${encode(roomId)}/backups/upload`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: apiConfig.DOWNLOAD_TIMEOUT
    })
  },
  rename: (backupId, name) => client.patch(`/backups/${encode(backupId)}`, { name }),
  delete: (backupId, confirmation) => client.delete(`/backups/${encode(backupId)}`, {
    data: { confirmation }
  }),
  restore: (backupId, confirmation) => client.post(`/backups/${encode(backupId)}/actions/restore`, { confirmation }),
  downloadURL: backupId => `${baseURL}/backups/${encode(backupId)}/download`
}

export default client

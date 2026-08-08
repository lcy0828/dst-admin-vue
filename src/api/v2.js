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
  createWorld: (roomId, input) => client.post(`/rooms/${encode(roomId)}/worlds`, input),
  deleteWorld: (roomId, worldId, confirmation) => client.delete(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}`,
    { data: { confirmation } }
  ),
  action: (roomId, action, worldIds = []) => client.post(`/rooms/${encode(roomId)}/actions/${encode(action)}`, {
    worldIds
  })
}

export const configurationV2API = {
  room: roomId => client.get(`/rooms/${encode(roomId)}/configuration`, { headers: { 'Cache-Control': 'no-store' } }),
  previewRoom: (roomId, input) => client.post(`/rooms/${encode(roomId)}/configuration/preview`, input),
  applyRoom: (roomId, input) => client.post(`/rooms/${encode(roomId)}/configuration/actions/apply`, input),
  access: roomId => client.get(`/rooms/${encode(roomId)}/access`, { headers: { 'Cache-Control': 'no-store' } }),
  previewAccess: (roomId, input) => client.post(`/rooms/${encode(roomId)}/access/preview`, input),
  applyAccess: (roomId, input) => client.post(`/rooms/${encode(roomId)}/access/actions/apply`, input),
  tokenStatus: roomId => client.get(`/rooms/${encode(roomId)}/cluster-token`, { headers: { 'Cache-Control': 'no-store' } }),
  revealToken: (roomId, confirmation) => client.post(`/rooms/${encode(roomId)}/cluster-token/reveal`, { confirmation }),
  previewToken: (roomId, input) => client.post(`/rooms/${encode(roomId)}/cluster-token/preview`, input),
  applyToken: (roomId, input) => client.post(`/rooms/${encode(roomId)}/cluster-token/actions/apply`, input),
  world: (roomId, worldId) => client.get(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/configuration`,
    { headers: { 'Cache-Control': 'no-store' } }
  ),
  previewWorld: (roomId, worldId, input) => client.post(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/configuration/preview`,
    input
  ),
  applyWorld: (roomId, worldId, input) => client.post(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/configuration/actions/apply`,
    input
  )
}

export const jobsV2API = {
  get: jobId => client.get(`/jobs/${encode(jobId)}`),
  cancel: jobId => client.post(`/jobs/${encode(jobId)}/cancel`)
}

export const playersV2API = {
  list: (roomId, params = {}) => client.get(`/rooms/${encode(roomId)}/players`, { params }),
  get: (roomId, playerId) => client.get(`/rooms/${encode(roomId)}/players/${encode(playerId)}`),
  refresh: (roomId, worldIds = []) => client.post(`/rooms/${encode(roomId)}/players/actions/refresh`, { worldIds }),
  action: (roomId, playerId, action, input = {}) => client.post(
    `/rooms/${encode(roomId)}/players/${encode(playerId)}/actions/${encode(action)}`,
    input
  )
}

export const modsV2API = {
  search: (query, page = 1, pageSize = 20) => client.get('/mods/search', {
    params: { query, page, pageSize }
  }),
  details: modId => client.get(`/mods/${encode(modId)}`),
  list: roomId => client.get(`/rooms/${encode(roomId)}/mods`, {
    headers: { 'Cache-Control': 'no-store' }
  }),
  install: (roomId, input) => client.post(`/rooms/${encode(roomId)}/mods/actions/install`, input),
  checkUpdates: roomId => client.post(`/rooms/${encode(roomId)}/mods/actions/check-updates`),
  update: (roomId, modId) => client.post(
    `/rooms/${encode(roomId)}/mods/${encode(modId)}/actions/update`
  ),
  enable: (roomId, modId, input) => client.post(
    `/rooms/${encode(roomId)}/mods/${encode(modId)}/actions/enable`,
    input
  ),
  repair: (roomId, modId, input) => client.post(
    `/rooms/${encode(roomId)}/mods/${encode(modId)}/actions/repair`,
    input
  ),
  uninstall: (roomId, modId, input) => client.post(
    `/rooms/${encode(roomId)}/mods/${encode(modId)}/actions/uninstall`,
    input
  ),
  configurationFile: (roomId, worldId) => client.get(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/mods/configuration-file`,
    { headers: { 'Cache-Control': 'no-store' } }
  ),
  configuration: (roomId, worldId, modId) => client.get(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/mods/${encode(modId)}/configuration`,
    { headers: { 'Cache-Control': 'no-store' } }
  ),
  previewConfiguration: (roomId, worldId, modId, input) => client.post(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/mods/${encode(modId)}/configuration/preview`,
    input
  ),
  applyConfiguration: (roomId, worldId, modId, input) => client.post(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/mods/${encode(modId)}/configuration/actions/apply`,
    input
  )
}

export const automationV2API = {
  groups: roomId => client.get(`/rooms/${encode(roomId)}/automation/groups`),
  createGroup: (roomId, input) => client.post(`/rooms/${encode(roomId)}/automation/groups`, input),
  tasks: roomId => client.get(`/rooms/${encode(roomId)}/automation/tasks`),
  createTask: (roomId, input) => client.post(`/rooms/${encode(roomId)}/automation/tasks`, input)
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

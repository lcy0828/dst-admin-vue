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
  settings: () => client.get('/system/settings', { headers: { 'Cache-Control': 'no-store' } }),
  previewSettings: input => client.post('/system/settings/preview', input),
  applySettings: input => client.post('/system/settings/actions/apply', input),
  testEmail: input => client.post('/system/settings/actions/test-email', input)
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

export const structuredLogsV2API = {
  list: (roomId, params = {}) => client.get(`/rooms/${encode(roomId)}/structured-logs`, { params }),
  refresh: roomId => client.post(`/rooms/${encode(roomId)}/structured-logs/actions/refresh`),
  clear: (roomId, worldId) => client.post(`/rooms/${encode(roomId)}/structured-logs/actions/clear`, { worldId })
}

export const logRulesV2API = {
  list: roomId => client.get(`/rooms/${encode(roomId)}/log-rules`, {
    headers: { 'Cache-Control': 'no-store' }
  }),
  create: (roomId, input) => client.post(`/rooms/${encode(roomId)}/log-rules`, input),
  update: (roomId, ruleId, input) => client.put(`/rooms/${encode(roomId)}/log-rules/${encode(ruleId)}`, input),
  delete: (roomId, ruleId) => client.delete(`/rooms/${encode(roomId)}/log-rules/${encode(ruleId)}`),
  test: (roomId, input) => client.post(`/rooms/${encode(roomId)}/log-rules/actions/test`, input)
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
  actions: roomId => client.get(`/rooms/${encode(roomId)}/automation/actions`),
  groups: roomId => client.get(`/rooms/${encode(roomId)}/automation/groups`),
  createGroup: (roomId, input) => client.post(`/rooms/${encode(roomId)}/automation/groups`, input),
  updateGroup: (roomId, groupId, input) => client.put(`/rooms/${encode(roomId)}/automation/groups/${encode(groupId)}`, input),
  deleteGroup: (roomId, groupId) => client.delete(`/rooms/${encode(roomId)}/automation/groups/${encode(groupId)}`),
  tasks: roomId => client.get(`/rooms/${encode(roomId)}/automation/tasks`),
	createTask: (roomId, input) => client.post(`/rooms/${encode(roomId)}/automation/tasks`, input),
	task: (roomId, taskId) => client.get(`/rooms/${encode(roomId)}/automation/tasks/${encode(taskId)}`),
	updateTask: (roomId, taskId, input) => client.put(`/rooms/${encode(roomId)}/automation/tasks/${encode(taskId)}`, input),
	deleteTask: (roomId, taskId) => client.delete(`/rooms/${encode(roomId)}/automation/tasks/${encode(taskId)}`),
	runTask: (roomId, taskId) => client.post(`/rooms/${encode(roomId)}/automation/tasks/${encode(taskId)}/actions/run`),
	runs: (roomId, params = {}) => client.get(`/rooms/${encode(roomId)}/automation/runs`, { params }),
	run: (roomId, runId) => client.get(`/rooms/${encode(roomId)}/automation/runs/${encode(runId)}`),
	clearRuns: (roomId, input) => client.post(`/rooms/${encode(roomId)}/automation/runs/actions/clear`, input),
	stats: (roomId, days = 7) => client.get(`/rooms/${encode(roomId)}/automation/stats`, { params: { days } }),
	export: roomId => client.get(`/rooms/${encode(roomId)}/automation/export`),
	previewImport: (roomId, document) => client.post(`/rooms/${encode(roomId)}/automation/imports/preview`, document),
	import: (roomId, input) => client.post(`/rooms/${encode(roomId)}/automation/imports`, input)
}

export const agentsV2API = {
	list: () => client.get('/agents', { headers: { 'Cache-Control': 'no-store' } }),
	get: agentId => client.get(`/agents/${encode(agentId)}`, { headers: { 'Cache-Control': 'no-store' } }),
	forget: agentId => client.delete(`/agents/${encode(agentId)}`),
	actions: () => client.get('/agents/actions'),
	commands: (params = {}) => client.get('/agents/commands', { params }),
	command: commandId => client.get(`/agents/commands/${encode(commandId)}`, { headers: { 'Cache-Control': 'no-store' } }),
	agentCommands: (agentId, params = {}) => client.get(`/agents/${encode(agentId)}/commands`, { params }),
	runCommand: (agentId, input) => client.post(`/agents/${encode(agentId)}/commands`, input),
	security: () => client.get('/agents/security', { headers: { 'Cache-Control': 'no-store' } }),
	rotateKey: confirmation => client.post('/agents/security/actions/rotate', { confirmation })
}

export const consoleV2API = {
	definitions: () => client.get('/commands', { headers: { 'Cache-Control': 'no-store' } }),
	definition: commandId => client.get(`/commands/${encode(commandId)}`, { headers: { 'Cache-Control': 'no-store' } }),
	createDefinition: input => client.post('/commands', input),
	updateDefinition: (commandId, input) => client.put(`/commands/${encode(commandId)}`, input),
	deleteDefinition: commandId => client.delete(`/commands/${encode(commandId)}`),
	execute: (roomId, worldId, input) => client.post(
		`/rooms/${encode(roomId)}/worlds/${encode(worldId)}/commands`,
		input
	),
	executeRaw: (roomId, worldId, input) => client.post(
		`/rooms/${encode(roomId)}/worlds/${encode(worldId)}/raw-commands`,
		input
	),
	runs: (roomId, params = {}) => client.get(`/rooms/${encode(roomId)}/command-runs`, { params }),
	run: (roomId, runId) => client.get(`/rooms/${encode(roomId)}/command-runs/${encode(runId)}`),
	clearRuns: (roomId, worldId = '') => client.delete(`/rooms/${encode(roomId)}/command-runs`, {
		params: worldId ? { worldId } : {}
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
  downloadURL: backupId => `${baseURL}/backups/${encode(backupId)}/download`,
  policy: roomId => client.get(`/rooms/${encode(roomId)}/backup-policy`),
  savePolicy: (roomId, input) => client.put(`/rooms/${encode(roomId)}/backup-policy`, input)
}

export default client

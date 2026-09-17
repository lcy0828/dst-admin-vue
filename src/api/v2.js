import axios from 'axios'
import apiConfig from './config'
import { createIdempotencyKey } from '@/lib/idempotencyKey.mjs'
import { createAsyncResourceCache } from '@/lib/asyncResourceCache.mjs'
import { filterManagementRooms } from '@/lib/managementScope.mjs'
import { emitGlobalJobSubmitted } from '@/lib/globalJobs.mjs'
import { isWorldProgressJob } from '@/lib/taskProgress.mjs'

const baseURL = `${apiConfig.BASE_URL.replace(/\/$/, '')}/v2`
const GAME_RELEASE_REQUEST_TIMEOUT = 65_000
const GAME_VERSION_REQUEST_TIMEOUT = 12_000
const RUNTIME_OVERVIEW_REQUEST_TIMEOUT = 35_000
let csrfToken = ''
const authSessionCache = createAsyncResourceCache({ ttlMs: 1_000 })
const capabilityCache = createAsyncResourceCache({ ttlMs: 30_000 })
const gameVersionCache = createAsyncResourceCache({ ttlMs: 1_000 })
const gameVersionSummaryCache = createAsyncResourceCache({ ttlMs: 1_000 })

export class APIError extends Error {
  constructor(status, body = {}, requestId = '') {
    const message = String(body.message || 'The server returned an invalid response.')
    const detail = String(body?.details?.reason || '').trim()
    const displayMessage = detail && detail !== message && !message.includes(detail)
      ? `${message}: ${detail}`
      : message
    super(requestId ? `${displayMessage} (request ID: ${requestId})` : displayMessage)
    this.name = 'APIError'
    this.status = status
    this.code = body.code || 'UNKNOWN_ERROR'
    this.details = body.details
    this.detail = detail
    this.requestId = requestId
  }
}

async function getBinary(path, accept) {
  const response = await fetch(`${baseURL}${path}`, {
    credentials: 'include',
    headers: {
      Accept: accept,
      'Cache-Control': 'no-store',
      Pragma: 'no-cache'
    }
  })
  if (!response.ok) {
    const envelope = await response.json().catch(() => null)
    throw new APIError(
      response.status,
      envelope?.error || { code: 'BINARY_REQUEST_FAILED', message: `Resource request failed (HTTP ${response.status}).` },
      envelope?.meta?.requestId || response.headers.get('X-Request-Id') || ''
    )
  }
  return response.blob()
}

async function getJSONArtifact(path) {
  const response = await fetch(`${baseURL}${path}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json'
    }
  })
  if (!response.ok) {
    const envelope = await response.json().catch(() => null)
    throw new APIError(
      response.status,
      envelope?.error || { code: 'BINARY_REQUEST_FAILED', message: `Resource request failed (HTTP ${response.status}).` },
      envelope?.meta?.requestId || response.headers.get('X-Request-Id') || ''
    )
  }
  const artifact = await response.json().catch(() => null)
  if (!artifact || typeof artifact !== 'object') {
    throw new APIError(response.status, { code: 'INVALID_RESPONSE', message: 'The server returned an invalid JSON artifact.' })
  }
  return artifact
}

const client = axios.create({
  baseURL,
  timeout: apiConfig.TIMEOUT,
  withCredentials: true,
  headers: apiConfig.HEADERS
})

client.interceptors.request.use(config => {
  const method = (config.method || 'get').toUpperCase()
  if (['GET', 'HEAD'].includes(method)) {
    config.headers['Cache-Control'] = 'no-store'
    config.headers.Pragma = 'no-cache'
  }
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    config.headers['X-CSRF-Token'] = csrfToken
    if (!config.headers['Idempotency-Key']) config.headers['Idempotency-Key'] = createIdempotencyKey()
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
    const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || /timeout/i.test(error.message || '')
    if (timedOut) {
      return Promise.reject(new APIError(0, {
        code: 'REQUEST_TIMEOUT',
        message: 'The request timed out before the server responded.'
      }))
    }
    return Promise.reject(new APIError(0, {
      code: 'BACKEND_UNAVAILABLE',
      message: 'Unable to connect to the backend service.'
    }))
  }
  const envelope = response.data
  return Promise.reject(new APIError(
    response.status,
    envelope?.error || { code: 'INVALID_RESPONSE', message: 'The server returned an invalid response.' },
    envelope?.meta?.requestId || response.headers?.['x-request-id']
  ))
})

function rememberSession(session) {
  csrfToken = session?.csrfToken || ''
  return session
}

function presentWorldActionJob(job) {
  if (isWorldProgressJob(job)) emitGlobalJobSubmitted(job)
  return job
}

export const authAPI = {
  session: () => authSessionCache.load(() => client.get('/auth/session')).then(rememberSession),
  saveOnboarding: step => client.put('/auth/onboarding', { step }).then(state => {
    authSessionCache.invalidate()
    return state
  }),
  setup: (username, password) => {
    authSessionCache.invalidate()
    return client.post('/auth/setup', { username, password }).then(session => {
      authSessionCache.invalidate()
      return rememberSession(session)
    })
  },
  login: (username, password) => {
    authSessionCache.invalidate()
    return client.post('/auth/login', { username, password }).then(session => {
      authSessionCache.invalidate()
      return rememberSession(session)
    })
  },
  logout: () => client.post('/auth/logout').then(session => {
    csrfToken = ''
    authSessionCache.invalidate()
    return session
  }),
  changePassword: (currentPassword, newPassword) => client.put('/auth/password', {
    currentPassword,
    newPassword
  }).then(session => {
    csrfToken = ''
    authSessionCache.invalidate()
    return session
  })
}

const encode = value => encodeURIComponent(String(value))
const scopeRoomList = value => ({ ...value, items: filterManagementRooms(value?.items) })

export const systemV2API = {
	capabilities: ({ fresh = false } = {}) => {
    if (fresh) capabilityCache.invalidate()
    return capabilityCache.load(() => client.get('/system/capabilities'))
  },
	setupChecks: () => client.get('/system/setup-checks', { headers: { 'Cache-Control': 'no-store' } }),
	status: () => client.get('/system/status'),
	/** @returns {Promise<import('./distributedManagement').NodeResourceSnapshot>} */
	resources: (targetId = '', options = {}) => client.get('/system/resources', {
		params: { ...(targetId ? { targetId } : {}), ...(options.refresh ? { refresh: true } : {}) },
		headers: { 'Cache-Control': 'no-store' }
	}),
	settings: () => client.get('/system/settings', { headers: { 'Cache-Control': 'no-store' } }),
  previewSettings: input => client.post('/system/settings/preview', input),
  applySettings: input => client.post('/system/settings/actions/apply', input).then(result => {
    capabilityCache.invalidate()
    window.dispatchEvent(new CustomEvent('system-runtime-updated'))
    return result
  }),
  testEmail: input => client.post('/system/settings/actions/test-email', input)
}

export const gameNotificationsV2API = {
  maintenancePreview: (roomId, signal) => client.get(`/rooms/${encode(roomId)}/maintenance-preview`, {
    signal, timeout: 8000, runtimeTarget: false, headers: { 'Cache-Control': 'no-store' }
  }),
  list: (roomId = '', limit = 25, offset = 0) => client.get('/game-notifications', {
    params: { ...(roomId ? { roomId } : {}), limit, offset },
    headers: { 'Cache-Control': 'no-store' }
  }),
  send: input => client.post('/game-notifications', input),
  policy: roomId => client.get(`/rooms/${encode(roomId)}/game-notification-policy`, {
    headers: { 'Cache-Control': 'no-store' }
  }),
  savePolicy: (roomId, input) => client.put(`/rooms/${encode(roomId)}/game-notification-policy`, input)
}

export const entityCatalogV2API = {
  search: ({ query = '', kind = '', limit = 120 } = {}) => client.get('/entity-catalog/entities', {
    params: { q: query, kind, limit },
    headers: { 'Cache-Control': 'no-store' }
  })
}

export const roomsV2API = {
  list: () => client.get('/rooms', { headers: { 'Cache-Control': 'no-store' } }).then(scopeRoomList),
  controlPlaneList: ({ all = false } = {}) => client.get('/rooms', {
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }).then(value => all ? value : scopeRoomList(value)),
  recoveries: () => client.get('/rooms/recovery', { headers: { 'Cache-Control': 'no-store' } }),
  restoreRoom: recoveryName => client.post(`/rooms/recovery/${encode(recoveryName)}/actions/restore`),
  purgeRoomRecovery: (recoveryName, confirmation) => client.delete(`/rooms/recovery/${encode(recoveryName)}`, {
    data: { confirmation }
  }),
  get: roomId => client.get(`/rooms/${encode(roomId)}`, { headers: { 'Cache-Control': 'no-store' } }),
  worlds: roomId => client.get(`/rooms/${encode(roomId)}/worlds`, { headers: { 'Cache-Control': 'no-store' } }),
  runtimeModes: (roomId, worldIds = []) => client.get(`/rooms/${encode(roomId)}/runtime-modes`, {
    params: worldIds.length ? { worldIds: worldIds.join(',') } : {},
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }),
  worldRecoveries: roomId => client.get(`/rooms/${encode(roomId)}/worlds/recovery`, {
    headers: { 'Cache-Control': 'no-store' }
  }),
  restoreWorld: (roomId, recoveryName) => client.post(
    `/rooms/${encode(roomId)}/worlds/recovery/${encode(recoveryName)}/actions/restore`
  ),
  purgeWorldRecovery: (roomId, recoveryName, confirmation) => client.delete(
    `/rooms/${encode(roomId)}/worlds/recovery/${encode(recoveryName)}`,
    { data: { confirmation } }
  ),
  create: input => client.post('/rooms', input),
  deleteRoom: (roomId, confirmation) => client.delete(`/rooms/${encode(roomId)}`, {
    data: { confirmation }
  }),
  createWorld: (roomId, input) => client.post(`/rooms/${encode(roomId)}/worlds`, input),
  deleteWorld: (roomId, worldId, confirmation) => client.delete(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}`,
    { data: { confirmation } }
  ),
  action: (roomId, action, worldIds = [], options = {}) => client.post(`/rooms/${encode(roomId)}/actions/${encode(action)}`, {
    worldIds,
    ...(options.allowCapacityRisk === true ? { allowCapacityRisk: true } : {}),
    ...(options.immediate === true ? { immediate: true } : {}),
    ...(options.runtimeMode ? { runtimeMode: options.runtimeMode } : {}),
    ...(options.runtimeVersion ? { runtimeVersion: options.runtimeVersion } : {})
  }, { runtimeTarget: false }).then(presentWorldActionJob)
}

export const topologyV2API = {
  rooms: roomsV2API.controlPlaneList,
  get: roomId => client.get(`/rooms/${encode(roomId)}/topology`, {
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }),
  worlds: roomId => client.get(`/rooms/${encode(roomId)}/worlds`, {
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }),
  batchAction: (action, rooms, allowCapacityRisk = false) => client.post(`/rooms/actions/${encode(action)}`, {
    rooms,
    ...(allowCapacityRisk === true ? { allowCapacityRisk: true } : {})
  }, { runtimeTarget: false }).then(presentWorldActionJob),
  /** @returns {Promise<import('./distributedManagement').RuntimeInfrastructure>} */
  infrastructure: () => client.get('/runtime-infrastructure', {
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }),
  updateNetworkProfile: (profileId, input) => client.put(
    `/runtime-infrastructure/network-profiles/${encode(profileId)}`,
    input,
    { runtimeTarget: false }
  ),
  detectNetworkProfileEgress: (profileId, region = 'global') => client.post(
    `/runtime-infrastructure/network-profiles/${encode(profileId)}/actions/detect-egress`,
    { region },
    { runtimeTarget: false }
  ),
  updateCPUAllocation: input => client.put('/runtime-infrastructure/cpu-allocations', input, {
    runtimeTarget: false
  }),
  /** @returns {Promise<import('./distributedManagement').ShardLinkDiscoveryResult>} */
	discoverShardLinks: (roomId, input) => client.post(
    `/rooms/${encode(roomId)}/topology/shard-links/actions/discover`,
    input,
    { runtimeTarget: false }
  ),
  preview: (roomId, input) => client.post(`/rooms/${encode(roomId)}/topology/preview`, input, { runtimeTarget: false }),
  update: (roomId, input) => client.put(`/rooms/${encode(roomId)}/topology`, input, { runtimeTarget: false }),
  applyPlacement: (roomId, input) => client.post(
    `/rooms/${encode(roomId)}/topology/actions/apply`,
    input,
    { runtimeTarget: false }
  ),
  provision: (roomId, input) => client.post(
    `/rooms/${encode(roomId)}/topology/actions/provision`,
    input,
    { runtimeTarget: false }
  ),
  provisionOperations: roomId => client.get(`/rooms/${encode(roomId)}/provision-operations`, {
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }),
  recoverProvisionOperation: operationId => client.post(
    `/provision-operations/${encode(operationId)}/actions/recover`,
    {},
    { runtimeTarget: false }
  )
}

export const fleetOverviewV2API = {
  get: (targetId = '', { detail = 'full' } = {}) => client.get('/runtime-overview', {
    params: { ...(targetId ? { targetId } : {}), ...(detail !== 'full' ? { detail } : {}) },
    runtimeTarget: false,
    timeout: RUNTIME_OVERVIEW_REQUEST_TIMEOUT,
    headers: { 'Cache-Control': 'no-store' }
  })
}

export const runtimeObservationsV2API = {
  streamURL: ({ targetId = '', roomId = '' } = {}) => {
    const query = new URLSearchParams()
    if (targetId) query.set('targetId', targetId)
    if (roomId) query.set('roomId', roomId)
    const suffix = query.toString()
    return `${baseURL}/runtime-observations/stream${suffix ? `?${suffix}` : ''}`
  },
  refresh: ({ targetId = '', roomId = '' } = {}) => client.post(
    '/runtime-observations/actions/refresh',
    { ...(targetId ? { targetId } : {}), ...(roomId ? { roomId } : {}) },
    { runtimeTarget: false }
  )
}

export const kubernetesRuntimeV2API = {
  /** @returns {Promise<import('./distributedManagement').KubernetesRuntimeService>} */
  status: () => client.get('/runtime-providers/kubernetes', {
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }),
  /** @returns {Promise<import('./distributedManagement').KubernetesObservation>} */
  observe: (providerId, input) => client.post(
    `/runtime-providers/kubernetes/${encode(providerId)}/shards/observe`,
    input,
    { runtimeTarget: false }
  ),
  /** @returns {Promise<import('./distributedManagement').KubernetesPreview>} */
  preflight: (providerId, input) => client.post(
    `/runtime-providers/kubernetes/${encode(providerId)}/shards/preflight`,
    input,
    { runtimeTarget: false }
  )
}

export const runtimeV2API = {
  status: roomId => client.get(`/rooms/${encode(roomId)}/runtime`, {
    headers: { 'Cache-Control': 'no-store' }
  }),
  lifecycleEvents: (roomId, params = {}) => client.get(
    `/rooms/${encode(roomId)}/runtime-events`,
    { params, headers: { 'Cache-Control': 'no-store' } }
  ),
  /** @returns {Promise<import('./distributedManagement').RuntimeOverview>} */
  overview: roomId => client.get(`/rooms/${encode(roomId)}/runtime/overview`, {
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }),
  eventStreamURL: (roomId, worldId, cursor = '') => {
    const path = `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/runtime/events/stream`
    return cursor ? `${baseURL}${path}?cursor=${encode(cursor)}` : `${baseURL}${path}`
  },
  installRoom: roomId => client.post(`/rooms/${encode(roomId)}/runtime/actions/install`),
  installWorld: (roomId, worldId) => client.post(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/runtime/actions/install`
  ),
  activate: (roomId, worldId) => client.post(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/runtime/actions/activate`
  ),
  reload: (roomId, worldId) => client.post(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/runtime/actions/reload`
  ),
  events: (roomId, worldId) => client.get(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/runtime/events`,
    { runtimeTarget: false, headers: { 'Cache-Control': 'no-store' } }
  ),
  latestDiagnostic: (roomId, worldId) => client.get(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/runtime/diagnostics/latest`,
    { runtimeTarget: false, headers: { 'Cache-Control': 'no-store' } }
  ),
  captureDiagnostic: (roomId, worldId, input) => client.post(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/runtime/diagnostics`,
    input,
    { runtimeTarget: false }
  )
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
  list: (params = {}) => client.get('/jobs', { params }),
  controlPlaneList: (params = {}) => client.get('/jobs', { params, runtimeTarget: false }),
  get: jobId => client.get(`/jobs/${encode(jobId)}`),
  controlPlaneGet: jobId => client.get(`/jobs/${encode(jobId)}`, { runtimeTarget: false }),
  cancel: jobId => client.post(`/jobs/${encode(jobId)}/cancel`),
  eventsURL: (after = '') => (
    after ? `${baseURL}/jobs/events?after=${encode(after)}` : `${baseURL}/jobs/events`
  )
}

export const structuredLogsV2API = {
  list: (roomId, params = {}) => client.get(`/rooms/${encode(roomId)}/structured-logs`, { params }),
  refresh: roomId => client.post(`/rooms/${encode(roomId)}/structured-logs/actions/refresh`),
  clear: (roomId, worldId) => client.post(`/rooms/${encode(roomId)}/structured-logs/actions/clear`, { worldId })
}

export const chatLogsV2API = {
  repair: roomId => client.post(`/rooms/${encode(roomId)}/chat-logs/actions/repair`),
  list: (roomId, params = {}) => client.get(`/rooms/${encode(roomId)}/chat-logs`, { params })
}

export const worldMapsV2API = {
  list: roomId => client.get(`/rooms/${encode(roomId)}/maps`, {
    headers: { 'Cache-Control': 'no-store' }
  }),
  sessions: (roomId, worldId) => client.get(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/sessions`,
    { headers: { 'Cache-Control': 'no-store' } }
  ),
  generate: (roomId, input) => client.post(`/rooms/${encode(roomId)}/maps/actions/generate`, input),
  imageBlob: (mapId, layer) => getBinary(`/maps/${encode(mapId)}/images/${encode(layer)}`, 'image/png'),
  manifest: mapId => getJSONArtifact(`/maps/${encode(mapId)}/manifest`),
  features: mapId => getJSONArtifact(`/maps/${encode(mapId)}/features`),
  sessionBlob: sessionId => getBinary(`/sessions/${encode(sessionId)}/download`, 'application/octet-stream')
}

export const worldLogsV2API = {
  roomSnapshot: (roomId, params = {}) => client.get(
    `/rooms/${encode(roomId)}/logs`,
    { params, runtimeTarget: false }
  ),
  snapshot: (roomId, worldId, params = {}) => client.get(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/logs`,
    { params }
  ),
  eventURL: (roomId, worldId, tail = 200) => (
    `${baseURL}/rooms/${encode(roomId)}/worlds/${encode(worldId)}/logs/events?tail=${encode(tail)}`
  ),
  downloadBlob: (roomId, worldId) => getBinary(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/logs/download`,
    'text/plain'
  )
}

export const logRulesV2API = {
  list: roomId => client.get(`/rooms/${encode(roomId)}/log-rules`, {
    headers: { 'Cache-Control': 'no-store' }
  }),
  create: (roomId, input) => client.post(`/rooms/${encode(roomId)}/log-rules`, input),
  update: (roomId, ruleId, input) => client.put(`/rooms/${encode(roomId)}/log-rules/${encode(ruleId)}`, input),
  delete: (roomId, ruleId) => client.delete(`/rooms/${encode(roomId)}/log-rules/${encode(ruleId)}`),
  test: (roomId, input) => client.post(`/rooms/${encode(roomId)}/log-rules/actions/test`, input),
  migrationPreview: roomId => client.get(`/rooms/${encode(roomId)}/log-rules/migration-preview`, {
    headers: { 'Cache-Control': 'no-store' }
  }),
  migrateLegacy: roomId => client.post(`/rooms/${encode(roomId)}/log-rules/actions/migrate-legacy`)
}

export const playersV2API = {
  list: (roomId, params = {}) => client.get(`/rooms/${encode(roomId)}/players`, { params, runtimeTarget: false }),
  get: (roomId, playerId) => client.get(`/rooms/${encode(roomId)}/players/${encode(playerId)}`, { runtimeTarget: false }),
  refresh: (roomId, worldIds = []) => client.post(`/rooms/${encode(roomId)}/players/actions/refresh`, { worldIds }, { runtimeTarget: false }),
  action: (roomId, playerId, action, input = {}) => client.post(
    `/rooms/${encode(roomId)}/players/${encode(playerId)}/actions/${encode(action)}`,
    input,
    { runtimeTarget: false }
  )
}

export const modsV2API = {
  metadata: (ids, options = {}) => client.get('/mods/metadata', { params: { ids: ids.join(','), ...(options.cached ? { cached: true } : {}) }, runtimeTarget: false }),
  search: (params = {}) => client.get('/mods/search', {
    params,
    runtimeTarget: false
  }),
  library: () => client.get('/mods/library', {
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }),
  runtimeInventory: (targetId, installationId, params = {}) => client.get(
    `/runtime-targets/${encode(targetId)}/installations/${encode(installationId)}/mods`,
    { params, runtimeTarget: false, headers: { 'Cache-Control': 'no-store' } }
  ),
  downloadRuntimeMod: (targetId, installationId, modId) => client.post(
    `/runtime-targets/${encode(targetId)}/installations/${encode(installationId)}/mods/${encode(modId)}/actions/download`,
    {},
    { runtimeTarget: false }
  ),
  updateRuntimeMod: (targetId, installationId, modId) => client.post(
    `/runtime-targets/${encode(targetId)}/installations/${encode(installationId)}/mods/${encode(modId)}/actions/update`,
    {},
    { runtimeTarget: false }
  ),
  updateOutdatedRuntimeMods: (targetId, installationId) => client.post(
    `/runtime-targets/${encode(targetId)}/installations/${encode(installationId)}/mods/actions/update-outdated`,
    {},
    { runtimeTarget: false }
  ),
  download: input => client.post('/mods/library/actions/download', input, { runtimeTarget: false }),
  updateLibrary: modId => client.post(
    `/mods/library/${encode(modId)}/actions/update`,
    {},
    { runtimeTarget: false }
  ),
  details: modId => client.get(`/mods/${encode(modId)}`, { runtimeTarget: false }),
  list: (roomId, params = {}) => client.get(`/rooms/${encode(roomId)}/mods`, {
    params,
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }),
  install: (roomId, input) => client.post(`/rooms/${encode(roomId)}/mods/actions/install`, input, { runtimeTarget: false }),
  addToRoom: (roomId, modId, input) => client.post(
    `/rooms/${encode(roomId)}/mods/${encode(modId)}/actions/add`,
    input,
    { runtimeTarget: false }
  ),
  checkUpdates: roomId => client.post(`/rooms/${encode(roomId)}/mods/actions/check-updates`, {}, { runtimeTarget: false }),
  update: (roomId, modId) => client.post(
    `/rooms/${encode(roomId)}/mods/${encode(modId)}/actions/update`,
    {},
    { runtimeTarget: false }
  ),
  enable: (roomId, modId, input) => client.post(
    `/rooms/${encode(roomId)}/mods/${encode(modId)}/actions/enable`,
    input,
    { runtimeTarget: false }
  ),
  repair: (roomId, modId, input) => client.post(
    `/rooms/${encode(roomId)}/mods/${encode(modId)}/actions/repair`,
    input,
    { runtimeTarget: false }
  ),
  uninstall: (roomId, modId, input) => client.post(
    `/rooms/${encode(roomId)}/mods/${encode(modId)}/actions/uninstall`,
    input,
    { runtimeTarget: false }
  ),
  configurationFile: (roomId, worldId) => client.get(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/mods/configuration-file`,
    { runtimeTarget: false, headers: { 'Cache-Control': 'no-store' } }
  ),
  configuration: (roomId, worldId, modId) => client.get(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/mods/${encode(modId)}/configuration`,
    { runtimeTarget: false, headers: { 'Cache-Control': 'no-store' } }
  ),
  previewConfiguration: (roomId, worldId, modId, input) => client.post(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/mods/${encode(modId)}/configuration/preview`,
    input,
    { runtimeTarget: false }
  ),
  applyConfiguration: (roomId, worldId, modId, input) => client.post(
    `/rooms/${encode(roomId)}/worlds/${encode(worldId)}/mods/${encode(modId)}/configuration/actions/apply`,
    input,
    { runtimeTarget: false }
  ),
  setConfigurationMode: (roomId, modId, mode) => client.put(
    `/rooms/${encode(roomId)}/mods/${encode(modId)}/configuration-mode`,
    { mode },
    { runtimeTarget: false }
  ),
  profile: roomId => client.get(
    `/rooms/${encode(roomId)}/mod-profile`,
    { runtimeTarget: false, headers: { 'Cache-Control': 'no-store' } }
  )
}

export const modPublicationsV2API = {
  replicas: roomId => client.get(
    `/rooms/${encode(roomId)}/mod-replicas`,
    { runtimeTarget: false, headers: { 'Cache-Control': 'no-store' } }
  ),
  preview: (roomId, input) => client.post(
    `/rooms/${encode(roomId)}/mod-publications/preview`,
    input,
    { runtimeTarget: false }
  ),
  create: (roomId, input) => client.post(
    `/rooms/${encode(roomId)}/mod-publications`,
    input,
    { runtimeTarget: false }
  ),
  list: (roomId, params = {}) => client.get(
    `/rooms/${encode(roomId)}/mod-publications`,
    { params, runtimeTarget: false, headers: { 'Cache-Control': 'no-store' } }
  ),
  get: publicationId => client.get(
    `/mod-publications/${encode(publicationId)}`,
    { runtimeTarget: false, headers: { 'Cache-Control': 'no-store' } }
  ),
  retry: publicationId => client.post(
    `/mod-publications/${encode(publicationId)}/actions/retry-failed`,
    {},
    { runtimeTarget: false }
  ),
  activate: (publicationId, input) => client.post(
    `/mod-publications/${encode(publicationId)}/actions/activate`,
    input,
    { runtimeTarget: false }
  )
}

export const modUpdatesV2API = {
  overview: roomId => client.get(
    `/rooms/${encode(roomId)}/mod-update`,
    { runtimeTarget: false, headers: { 'Cache-Control': 'no-store' } }
  ),
  updatePolicy: (roomId, input) => client.put(
    `/rooms/${encode(roomId)}/mod-update/policy`,
    input,
    { runtimeTarget: false }
  ),
  check: roomId => client.post(
    `/rooms/${encode(roomId)}/mod-update/actions/check`,
    {},
    { runtimeTarget: false }
  ),
  applyWhenEmpty: roomId => client.post(
    `/rooms/${encode(roomId)}/mod-update/actions/apply-when-empty`,
    {},
    { runtimeTarget: false }
  ),
  applyNow: roomId => client.post(
    `/rooms/${encode(roomId)}/mod-update/actions/apply`,
    {},
    { runtimeTarget: false }
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
	list: () => client.get('/agents', { runtimeTarget: false, headers: { 'Cache-Control': 'no-store' } }),
	get: agentId => client.get(`/agents/${encode(agentId)}`, { headers: { 'Cache-Control': 'no-store' } }),
	inventory: agentId => client.get(`/agents/${encode(agentId)}/inventory`, { headers: { 'Cache-Control': 'no-store' } }),
	refreshInventory: agentId => client.post(`/agents/${encode(agentId)}/inventory/actions/refresh`),
	forget: agentId => client.delete(`/agents/${encode(agentId)}`),
	actions: () => client.get('/agents/actions'),
	commands: (params = {}) => client.get('/agents/commands', { params }),
	command: commandId => client.get(`/agents/commands/${encode(commandId)}`, { headers: { 'Cache-Control': 'no-store' } }),
	agentCommands: (agentId, params = {}) => client.get(`/agents/${encode(agentId)}/commands`, { params }),
	runCommand: (agentId, input) => client.post(`/agents/${encode(agentId)}/commands`, input),
	security: () => client.get('/agents/security', { headers: { 'Cache-Control': 'no-store' } }),
	rotateKey: confirmation => client.post('/agents/security/actions/rotate', { confirmation }),
	releases: () => client.get('/agent-releases', { runtimeTarget: false, headers: { 'Cache-Control': 'no-store' } }),
	uploadRelease: (file, version, onUploadProgress) => {
		const body = new FormData()
		body.set('file', file)
		body.set('version', version)
		return client.post('/agent-releases', body, {
			runtimeTarget: false,
			timeout: apiConfig.UPLOAD_TIMEOUT,
			onUploadProgress
		})
	},
	deleteRelease: releaseId => client.delete(`/agent-releases/${encode(releaseId)}`, { runtimeTarget: false }),
	upgrade: (agentId, releaseId = '') => client.post(
		`/agents/${encode(agentId)}/actions/upgrade`,
		releaseId ? { releaseId } : {},
		{ runtimeTarget: false }
	)
}

export const gameInstallationsV2API = {
  list: targetId => client.get('/runtime-targets/game-installations', { params: targetId ? { targetId } : {}, runtimeTarget: false, timeout: 35000 }),
  probe: input => client.post('/runtime-targets/game-installations/probe', input, { runtimeTarget: false, timeout: 35000 }),
  install: input => client.post('/runtime-targets/game-installations/actions/install', input, { runtimeTarget: false }),
  adopt: input => client.post('/runtime-targets/game-installations/actions/adopt', input, { runtimeTarget: false }),
}

export const luaJITV2API = {
  catalog: targetId => client.get('/runtime-targets/luajit', { params: targetId ? { targetId } : {}, runtimeTarget: false, timeout: 35000 }),
  status: (targetId, installationId, refreshUpstream = false) => client.get('/runtime-targets/luajit/status', { params: { targetId, installationId, ...(refreshUpstream ? { refreshUpstream: true } : {}) }, runtimeTarget: false, timeout: 35000 }),
  install: input => client.post('/runtime-targets/luajit/actions/install', input, { runtimeTarget: false }),
  download: input => client.post('/runtime-targets/luajit/actions/download', input, { runtimeTarget: false }),
  upload: file => {
    const data = new FormData()
    data.append('file', file)
    return client.post('/runtime-targets/luajit/packages', data, { headers: { 'Content-Type': 'multipart/form-data' }, runtimeTarget: false, timeout: 180000 })
  },
}

export const runtimeTargetsV2API = {
	list: () => client.get('/runtime-targets', { headers: { 'Cache-Control': 'no-store' } }),
	rename: (targetId, displayName) => client.patch(`/runtime-targets/${encode(targetId)}`, { displayName }),
	get: agentId => client.get(`/runtime-targets/agents/${encode(agentId)}`, { headers: { 'Cache-Control': 'no-store' } }),
	save: (agentId, input) => client.put(`/runtime-targets/agents/${encode(agentId)}`, input),
	remove: agentId => client.delete(`/runtime-targets/agents/${encode(agentId)}`)
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
	applyShardLinks: (roomId, input) => client.post(
		`/rooms/${encode(roomId)}/topology/shard-links/actions/apply`,
		input,
		{ runtimeTarget: false }
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
	list: roomId => client.get(`/rooms/${encode(roomId)}/world-states`, { runtimeTarget: false }),
  refreshWorld: (roomId, worldId) => client.post(
    `/rooms/${encode(roomId)}/world-states/${encode(worldId)}/actions/refresh`,
    undefined,
    { runtimeTarget: false }
  )
}

export const gameV2API = {
  version: ({ fresh = false, lightweight = false } = {}) => {
    const cache = lightweight ? gameVersionSummaryCache : gameVersionCache
    if (fresh) cache.invalidate()
    return cache.load(() => client.get('/game/version', {
      params: lightweight ? { steam: false, refresh: fresh } : undefined,
      runtimeTarget: false,
      timeout: lightweight ? GAME_VERSION_REQUEST_TIMEOUT : 35_000
    }))
  },
  update: input => client.post('/game/actions/update', input).then(job => {
    gameVersionCache.invalidate()
    gameVersionSummaryCache.invalidate()
    return job
  }),
  updateRun: jobId => client.get(`/game/update-runs/${encode(jobId)}`)
}

export const gameReleasesV2API = {
  installedVersions: (input = {}) => client.get('/game/installed-versions', {
    params: { targetIds: (input.targetIds || []).join(',') },
    runtimeTarget: false,
    timeout: 35_000
  }),
  /** @returns {Promise<import('./distributedManagement').GameReleasePlan>} */
  preview: input => client.post('/game/releases/preview', input, { runtimeTarget: false, timeout: GAME_RELEASE_REQUEST_TIMEOUT }),
  /** @returns {Promise<{id: string, kind: string, status: string, progress: number}>} */
  create: input => client.post('/game/releases', input, { runtimeTarget: false, timeout: GAME_RELEASE_REQUEST_TIMEOUT }),
  /** @returns {Promise<{items: import('./distributedManagement').GameRelease[], total: number, limit: number, offset: number}>} */
  list: (params = {}) => client.get('/game/releases', {
    params,
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }),
  /** @returns {Promise<import('./distributedManagement').GameRelease>} */
  get: releaseId => client.get(`/game/releases/${encode(releaseId)}`, {
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }),
  /** @returns {Promise<{id: string, kind: string, status: string, progress: number}>} */
  retry: releaseId => client.post(
    `/game/releases/${encode(releaseId)}/actions/retry`,
    {},
    { runtimeTarget: false }
  )
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
  downloadBlob: backupId => getBinary(`/backups/${encode(backupId)}/download`, 'application/zip'),
  policy: roomId => client.get(`/rooms/${encode(roomId)}/backup-policy`),
  savePolicy: (roomId, input) => client.put(`/rooms/${encode(roomId)}/backup-policy`, input)
}

export const backupSetsV2API = {
  /** @returns {Promise<{items: import('./distributedManagement').DistributedBackupSet[], total: number}>} */
  list: roomId => client.get(`/rooms/${encode(roomId)}/backup-sets`, {
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }),
  /** @returns {Promise<import('./distributedManagement').DistributedBackupSet>} */
  get: backupSetId => client.get(`/backup-sets/${encode(backupSetId)}`, {
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }),
  create: (roomId, name = '', mode = 'hot-consistent') => client.post(
    `/rooms/${encode(roomId)}/backup-sets`,
    { ...(name ? { name } : {}), mode },
    { runtimeTarget: false }
  ),
  restore: (backupSetId, confirmation) => client.post(
    `/backup-sets/${encode(backupSetId)}/actions/restore`,
    { confirmation },
    { runtimeTarget: false }
  ),
  operations: roomId => client.get(`/rooms/${encode(roomId)}/backup-operations`, {
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }),
  recoverOperation: operationId => client.post(
    `/backup-operations/${encode(operationId)}/actions/recover`,
    {},
    { runtimeTarget: false }
  )
}

export const saveImportsV2API = {
  list: () => client.get('/save-imports', {
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }),
  get: importId => client.get(`/save-imports/${encode(importId)}`, {
    runtimeTarget: false,
    headers: { 'Cache-Control': 'no-store' }
  }),
  upload: (file, name = '', onUploadProgress) => {
    const body = new FormData()
    body.set('file', file)
    if (name) body.set('name', name)
    return client.post('/save-imports/upload', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
      runtimeTarget: false,
      timeout: apiConfig.UPLOAD_TIMEOUT,
      onUploadProgress
    })
  },
  analyze: importId => client.post(`/save-imports/${encode(importId)}/actions/analyze`, {}, {
    runtimeTarget: false
  }),
  apply: (importId, input) => client.post(`/save-imports/${encode(importId)}/actions/apply`, input, {
    runtimeTarget: false
  }),
  delete: (importId, confirmation) => client.delete(`/save-imports/${encode(importId)}`, {
    data: { confirmation },
    runtimeTarget: false
  })
}

export default client

import { DEFAULT_LIVE_LOG_LINE_COUNT, LIVE_LOG_LINE_OPTIONS } from './liveLogLines.mjs'

const STORAGE_KEY = 'dst-admin-workspace-preferences'
const tabs = ['players', 'logs', 'chat', 'console']
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {}
const identifier = value => typeof value === 'string' ? value : ''

function read() {
  try { return object(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')) } catch { return {} }
}

function save(value) {
  try {
    const encoded = JSON.stringify(value)
    if (localStorage.getItem(STORAGE_KEY) !== encoded) localStorage.setItem(STORAGE_KEY, encoded)
  } catch { /* Preferences are optional when browser storage is unavailable. */ }
}

function roomView(value = {}) {
  const limit = value.playerDisplayLimit
  return {
    worldId: identifier(value.worldId),
    activeOperation: tabs.includes(value.activeOperation) ? value.activeOperation : 'players',
    playerDisplayLimit: limit === 'all' ? 'all' : Number.isInteger(limit) && limit >= 5 ? limit : 5
  }
}

export function readRoomView(roomId) {
  return roomView(object(object(read().rooms)[roomId]))
}

export function readWorkspaceSelection(targetId = '', query = {}) {
  const preferences = read()
  const explicit = typeof query.roomId === 'string' && (query.targetId == null || query.targetId === targetId)
  const roomId = explicit ? query.roomId : identifier(object(preferences.targets)[targetId || 'all'])
  const view = roomView(object(object(preferences.rooms)[roomId]))
  return { roomId, ...view, worldId: explicit && typeof query.worldId === 'string' ? query.worldId : view.worldId }
}

export function rememberWorkspaceView(targetId, roomId, view) {
  if (!roomId) return
  const preferences = read()
  save({ ...preferences,
    targets: { ...object(preferences.targets), [targetId || 'all']: roomId },
    rooms: { ...object(preferences.rooms), [roomId]: roomView(view) }
  })
}

export function rememberRoomSelection(targetId, roomId) {
  const preferences = read()
  save({ ...preferences, targets: { ...object(preferences.targets), [targetId || 'all']: roomId } })
}

function logView(value = {}) {
  return {
    logLineCount: [...LIVE_LOG_LINE_OPTIONS, 'all'].includes(value.logLineCount) ? value.logLineCount : DEFAULT_LIVE_LOG_LINE_COUNT,
    timeDisplayMode: value.timeDisplayMode === 'runtime' ? 'runtime' : 'wallclock',
    autoScroll: typeof value.autoScroll === 'boolean' ? value.autoScroll : true
  }
}

export function readLogView() {
  return logView(object(read().logs))
}

export function rememberLogView(view) {
  save({ ...read(), logs: logView(view) })
}

import {
  automationV2API,
  playersV2API,
  roomsV2API,
  topologyV2API
} from './v2'
import { waitForV2Job } from './v2ConfigurationAdapters'
import { adapterError, adapterSuccess } from './adapterProtocol.mjs'
import { composeRoomResults, throwWhenAllRoomsFailed } from './roomSettlements.mjs'
import { playerPlayDays, sortPlayers } from '@/lib/playerSorting.mjs'
import {
  isSystemAutomationGroup,
  SYSTEM_AUTOMATION_GROUP_IDS
} from '@/lib/systemDataIdentifiers.mjs'

const success = (data, msg = 'operation_succeeded') => adapterSuccess(data, msg, { numericCode: true })
const DEFAULT_PLAYER_REFRESH_TASK_NAME = '自动刷新玩家数据'
const PLAYER_REFRESH_SCHEDULES = Object.freeze({
  30: '*/30 * * * * *',
  60: '* * * * *',
  120: '*/2 * * * *',
  300: '*/5 * * * *',
  600: '*/10 * * * *'
})

function isDefaultPlayerRefreshTask(task) {
  return task?.action === 'player.refresh' && (task.worldIds || []).length === 0 && task.name === DEFAULT_PLAYER_REFRESH_TASK_NAME
}

function playerRefreshInterval(schedule) {
  const normalized = String(schedule || '').trim().replace(/\s+/g, ' ')
  const entry = Object.entries(PLAYER_REFRESH_SCHEDULES).find(([, value]) => value === normalized)
  return entry ? Number(entry[0]) : 0
}

async function loadRooms() {
  const response = await roomsV2API.controlPlaneList()
  return response.items || []
}

async function loadCatalog() {
  const rooms = await loadRooms()
  const settlements = await Promise.allSettled(rooms.map(room => topologyV2API.worlds(room.id)))
  const { completed, failures } = composeRoomResults(rooms, settlements)
  throwWhenAllRoomsFailed(rooms.length, failures)
  const worldsByRoom = new Map(completed.map(({ room, value }) => [room.id, value.items || []]))
  const failuresByRoom = new Map(failures.map(failure => [failure.room_id, failure.error]))
  return rooms.map(room => ({
    ...room,
    worlds: worldsByRoom.get(room.id) || [],
    worldsError: failuresByRoom.get(room.id) || null
  }))
}

function roomMatches(room, value) {
  return room.id === value || room.name === value || room.directoryName === value
}

function worldMatches(world, value) {
  return world.id === value || world.name === value || world.directoryName === value
}

function sessionName(room, world) {
  return `${room.name} / ${world.name}`
}

function sessionsFromCatalog(catalog) {
  return catalog.flatMap(room => room.worlds.map(world => ({
    key: `${room.id}:${world.id}`,
    name: sessionName(room, world),
    state: world.status || 'unknown',
    room_id: room.id,
    room_name: room.name,
    archive_name: room.name,
    world_id: world.id,
    world_name: world.name
  })))
}

async function resolveRoom(value, catalog = null) {
  const rooms = catalog || await loadCatalog()
  const room = rooms.find(item => roomMatches(item, value))
  if (!room) throw adapterError('ROOM_NOT_MANAGED', { context: { reference: value || '' } })
  return room
}

async function resolveSession(value, catalog = null) {
  const rooms = catalog || await loadCatalog()
  const session = sessionsFromCatalog(rooms).find(item =>
    item.key === value || item.name === value
  )
  if (!session) throw adapterError('RESOURCE_NOT_FOUND', { context: { reference: value || '' } })
  return { session, room: await resolveRoom(session.room_id, rooms) }
}

function legacyPlayer(player, room) {
  const presenceStatus = player.presenceStatus || player.fields?.online?.status || 'unavailable'
  const status = !player.online
    ? 'offline'
    : (presenceStatus === 'live' ? 'online' : 'stale')
  return {
    id: player.id,
    room_id: room.id,
    world_id: player.worldId,
    world_name: player.worldConfirmed === false ? '' : player.worldName,
    world_confirmed: player.worldConfirmed,
    archive_name: room.name,
    user_id: player.id,
    player_name: player.name,
    player_age: playerPlayDays({ player_age: player.age, field_states: player.fields || {} }),
    prefab: player.prefab,
    gameplay_state: player.gameplayState || '',
    status,
    is_admin: player.admin,
    is_friend: null,
    is_host: null,
    is_muted: null,
    net_id: player.netId,
    net_score: player.netScore ?? null,
    performance: player.performance ?? null,
    first_seen: player.firstSeenAt,
    last_seen: player.lastSeenAt,
    last_seen_source: player.lastSeenSource || player.fields?.lastSeenAt?.source || '',
    last_connected_at: player.lastConnectedAt || null,
    last_disconnected_at: player.lastDisconnectedAt || null,
    status_change: player.statusChangedAt,
    last_refreshed_at: player.lastRefreshedAt,
    presence_status: presenceStatus,
    history_only: !player.online && presenceStatus === 'unavailable' && player.lastSeenSource === 'native-log',
    presence_observed_at: player.presenceObservedAt || player.fields?.online?.observedAt || null,
    presence_conflict: Boolean(player.presenceConflict),
    observed_world_ids: Array.isArray(player.observedWorldIds) ? player.observedWorldIds : [],
    field_states: player.fields || {},
    created_at: null,
    updated_at: player.lastRefreshedAt,
    banned: player.banned,
    ban_reason: player.banReason,
    banned_at: player.bannedAt,
    ban_expires_at: player.banExpiresAt,
    health_percent: player.healthPercent,
    hunger_percent: player.hungerPercent,
    sanity_percent: player.sanityPercent,
    health: player.health,
    health_max: player.healthMax,
    hunger: player.hunger,
    hunger_max: player.hungerMax,
    sanity: player.sanity,
    sanity_max: player.sanityMax,
    temperature: player.temperature,
    moisture: player.moisture
  }
}

async function roomPlayers(room, params = {}) {
  const items = []
  let offset = 0
  let total = 0
  do {
    const response = await playersV2API.list(room.id, {
      query: params.keyword || '',
      status: params.status === 'stale' ? 'online' : (params.status || ''),
      prefab: params.prefab || '',
      includeAccessLists: params.include_access_lists !== false,
      limit: 100,
      offset
    })
    const page = response.items || []
    const mapped = page.map(player => legacyPlayer(player, room))
    items.push(...(params.status ? mapped.filter(player => player.status === params.status) : mapped))
    total = response.total || 0
    offset += page.length
    if (page.length === 0) break
  } while (offset < total)
  return items
}

async function listPlayers(params = {}, paginate = true) {
  const catalog = await loadRooms()
  const rooms = params.archive_name
    ? [await resolveRoom(params.archive_name, catalog)]
    : catalog
  const settlements = await Promise.allSettled(rooms.map(room => roomPlayers(room, params)))
  const { completed, failures } = composeRoomResults(rooms, settlements)
  throwWhenAllRoomsFailed(rooms.length, failures)
  const players = completed.flatMap(({ value }) => value)
  const sorted = sortPlayers(players, params.sort_by, params.sort_order)
  const page = Math.max(1, Number.parseInt(params.page, 10) || 1)
  const pageSize = Math.max(1, Number.parseInt(params.page_size, 10) || 10)
  const data = paginate ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted
  return { data, total: sorted.length, page, size: pageSize, failures }
}

async function actionContext(player, selectedSession) {
  if (!player || typeof player !== 'object' || !player.user_id || !player.room_id) {
    throw adapterError('INVALID_PLAYER_INPUT')
  }
  const catalog = await loadCatalog()
  const room = await resolveRoom(player.room_id, catalog)
  if (room.worldsError) throw room.worldsError
  let worldId = player.world_id
  if (selectedSession) {
    const selected = await resolveSession(selectedSession, catalog)
    if (selected.room.id !== room.id) {
      throw adapterError('INVALID_PLAYER_INPUT', {
        context: { selectedRoom: selected.room.name, playerRoom: room.name }
      })
    }
    worldId = selected.session.world_id
  }
  if (!room.worlds.some(world => world.id === worldId)) {
    throw adapterError('RESOURCE_NOT_FOUND', { context: { worldId } })
  }
  return { room, worldId, playerId: player.user_id }
}

async function runAction(player, selectedSession, action, input = {}) {
  const target = await actionContext(player, selectedSession)
  const job = await playersV2API.action(target.room.id, target.playerId, action, {
    worldId: target.worldId,
    ...input
  })
  return success(await waitForV2Job(job), 'player_action_completed')
}

function normalizeSchedule(value) {
  const fields = String(value || '').trim().split(/\s+/).filter(Boolean)
  if (fields.length === 6 && fields[0] === '0') return fields.slice(1).join(' ')
  if (fields.length === 5) return fields.join(' ')
  throw adapterError('INVALID_PLAYER_INPUT', { context: { field: 'schedule' } })
}

async function ensurePlayerGroup(roomId) {
  const response = await automationV2API.groups(roomId)
  const existing = (response.items || []).find(group => (
    isSystemAutomationGroup(group.name, SYSTEM_AUTOMATION_GROUP_IDS.PLAYER_MANAGEMENT)
  ))
  if (existing) return existing
  return automationV2API.createGroup(roomId, {
    name: SYSTEM_AUTOMATION_GROUP_IDS.PLAYER_MANAGEMENT,
    description: 'Scheduled player information refreshes',
    type: 'system',
    enabled: true,
    expectedRevision: ''
  })
}

export const playerApi = {
  async getOnlinePlayers(archiveName) {
    return listPlayers({ archive_name: archiveName, status: 'online', page: 1, page_size: 100 })
  },

  getAllPlayers(params = {}) {
    return listPlayers(params)
  },

  async getBannedPlayers(params = {}) {
    const response = await listPlayers({
      ...params,
      page: 1,
      page_size: 100000,
      sort_by: 'banned_at',
      sort_order: 'desc'
    }, false)
    const keyword = String(params.keyword || '').trim().toLocaleLowerCase('zh-CN')
    const bannedPlayers = response.data.filter(player => {
      if (!player.banned) return false
      if (!keyword) return true
      return [player.player_name, player.user_id, player.ban_reason]
        .some(value => String(value || '').toLocaleLowerCase('zh-CN').includes(keyword))
    })
    const page = Math.max(1, Number.parseInt(params.page, 10) || 1)
    const pageSize = Math.max(1, Number.parseInt(params.page_size, 10) || 20)
    return {
      data: bannedPlayers.slice((page - 1) * pageSize, page * pageSize),
      total: bannedPlayers.length,
      page,
      size: pageSize,
      failures: response.failures || []
    }
  },

  async getPlayerStats(archiveName, worldIds = [], roomId = '') {
    const response = roomId
      ? { data: await roomPlayers({ id: roomId, name: archiveName }, { include_access_lists: false }), failures: [] }
      : await listPlayers({ archive_name: archiveName, include_access_lists: false }, false)
    const selectedWorldIds = new Set((Array.isArray(worldIds) ? worldIds : []).map(value => String(value)))
    const players = selectedWorldIds.size > 0
      ? response.data.filter(player => selectedWorldIds.has(String(player.world_id || '')))
      : response.data
    const online = players.filter(player => player.status === 'online').length
    const staleOnline = players.filter(player => player.status === 'stale').length
    const onlineByWorld = players.reduce((counts, player) => {
      if (player.status !== 'online' || !player.world_id) return counts
      counts[player.world_id] = (counts[player.world_id] || 0) + 1
      return counts
    }, {})
    return success({
      total_count: players.length,
      online_count: online,
      online_by_world: onlineByWorld,
      stale_online_count: staleOnline,
      offline_count: players.length - online - staleOnline,
      recent_players: players
    })
  },

  async getPlayerDetail(player) {
    if (!player?.room_id || !player?.user_id) throw adapterError('INVALID_PLAYER_INPUT')
    const catalog = await loadRooms()
    const room = await resolveRoom(player.room_id, catalog)
    return success(legacyPlayer(await playersV2API.get(room.id, player.user_id), room))
  },

  async updatePlayerInfo(data = {}) {
    const catalog = await loadRooms()
    const roomReference = typeof data === 'string' ? data : data.archive_name
    const selectedRooms = roomReference ? [await resolveRoom(roomReference, catalog)] : catalog
    const requestedWorld = typeof data === 'object' ? data.world_name : ''
    const requestedWorldIdValues = typeof data === 'object' ? (data.world_ids || data.worldIds || []) : []
    const requestedWorldIds = (Array.isArray(requestedWorldIdValues) ? requestedWorldIdValues : [])
      .map(value => String(value))
    if (requestedWorld && selectedRooms.length !== 1) throw adapterError('INVALID_PLAYER_INPUT')
    const settlements = await Promise.allSettled(selectedRooms.map(async room => {
      const worldIds = []
      if (requestedWorld || requestedWorldIds.length > 0) {
        const worlds = await topologyV2API.worlds(room.id)
        const requested = requestedWorld ? [requestedWorld] : requestedWorldIds
        for (const value of requested) {
          const world = (worlds.items || []).find(item => worldMatches(item, value))
          if (!world) throw adapterError('RESOURCE_NOT_FOUND', {
            context: { room: room.name, world: value }
          })
          if (!worldIds.includes(world.id)) worldIds.push(world.id)
        }
      }
      const job = await playersV2API.refresh(room.id, worldIds)
      return waitForV2Job(job, 120000)
    }))
    const { completed, failures } = composeRoomResults(selectedRooms, settlements)
    throwWhenAllRoomsFailed(selectedRooms.length, failures)
    return success({ results: completed.map(({ value }) => value), failures }, 'players_refreshed')
  },

  kickPlayer(player, selectedSession, confirmation) {
    return runAction(player, selectedSession, 'kick', { confirmation })
  },

  banPlayer(player, data) {
    return actionContext(player).then(target =>
      playersV2API.action(target.room.id, target.playerId, 'ban', {
        worldId: target.worldId,
        confirmation: data.confirmation,
        reason: data.reason,
        duration: data.duration
      })
    ).then(job => waitForV2Job(job)).then(job => success(job, 'player_banned'))
  },

  unbanPlayer(player, confirmation) {
    return actionContext(player).then(target =>
      playersV2API.action(target.room.id, target.playerId, 'unban', {
        worldId: target.worldId,
        confirmation
      })
    ).then(job => waitForV2Job(job)).then(job => success(job, 'player_unbanned'))
  },

  sendMessage(player, message, selectedSession) {
    return runAction(player, selectedSession, 'announce', { message })
  },

  async getArchives() {
    const catalog = await loadRooms()
    return success(catalog.map(room => ({
      id: room.id,
      name: room.name,
      archive_name: room.name,
      directory_name: room.directoryName
    })))
  },

  async getSessions() {
    return success(sessionsFromCatalog(await loadCatalog()))
  },

  killPlayer(player, selectedSession, confirmation) {
    return runAction(player, selectedSession, 'kill', { confirmation })
  },

  setGodMode(player, enabled, selectedSession) {
    return runAction(player, selectedSession, 'god-mode', { enabled })
  },

  setCreativeMode(player, enabled, selectedSession) {
    return runAction(player, selectedSession, 'creative-mode', { enabled })
  },

  resurrectPlayer(player, selectedSession, confirmation) {
    return runAction(player, selectedSession, 'resurrect', { confirmation })
  },

  changeCharacter(player, selectedSession, confirmation) {
    return runAction(player, selectedSession, 'change-character', { confirmation })
  },

  async getPlayerRefreshSettings(roomReference) {
    const catalog = await loadRooms()
    const room = await resolveRoom(roomReference, catalog)
    const response = await automationV2API.tasks(room.id)
    const task = (response.items || []).find(isDefaultPlayerRefreshTask)
    if (!task) throw adapterError('RESOURCE_NOT_FOUND', { context: { roomId: room.id } })
    return success({
      room_id: room.id,
      room_name: room.name,
      enabled: Boolean(task.enabled),
      interval_seconds: playerRefreshInterval(task.schedule),
      task
    })
  },

  async updatePlayerRefreshSettings(data) {
    const intervalSeconds = Number(data?.interval_seconds)
    const schedule = PLAYER_REFRESH_SCHEDULES[intervalSeconds]
    const task = data?.task
    if (!data?.room_id || !schedule || !isDefaultPlayerRefreshTask(task)) {
      throw adapterError('INVALID_PLAYER_INPUT', { context: { field: 'refresh_settings' } })
    }
    const updated = await automationV2API.updateTask(data.room_id, task.id, {
      groupId: task.groupId,
      name: task.name,
      description: task.description || '',
      enabled: Boolean(data.enabled),
      schedule,
      timezone: task.timezone || 'Asia/Shanghai',
      action: task.action,
      worldIds: task.worldIds || [],
      parameters: task.parameters || {},
      timeoutSeconds: task.timeoutSeconds || 60,
      retryTimes: task.retryTimes || 0,
      retryIntervalSeconds: task.retryIntervalSeconds || 60,
      dependencies: task.dependencies || [],
      expectedRevision: task.revision
    })
    return success({
      room_id: data.room_id,
      enabled: Boolean(updated.enabled),
      interval_seconds: playerRefreshInterval(updated.schedule),
      task: updated
    }, 'player_refresh_settings_updated')
  },

  async addRefreshSchedule(data) {
    const catalog = await loadCatalog()
    const selected = await resolveSession(data.session_name, catalog)
    const group = await ensurePlayerGroup(selected.room.id)
    const task = await automationV2API.createTask(selected.room.id, {
      groupId: group.id,
      name: data.name,
      description: data.description || '',
      enabled: true,
      schedule: normalizeSchedule(data.spec),
      timezone: 'Asia/Shanghai',
      action: 'player.refresh',
      worldIds: [selected.session.world_id],
      parameters: {},
      timeoutSeconds: 300,
      expectedRevision: ''
    })
    return success(task, 'player_refresh_schedule_created')
  },

  async exportPlayers(params = {}) {
    const response = await listPlayers(params, false)
    if (response.failures.length > 0) throw response.failures[0].error
    return response.data
  },

  executeCommand() {
    throw adapterError('INVALID_PLAYER_ACTION', { context: { action: 'raw_lua' } })
  }
}

export default playerApi

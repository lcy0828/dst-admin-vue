import {
  automationV2API,
  playersV2API,
  roomsV2API
} from './v2'
import { waitForV2Job } from './v2ConfigurationAdapters'

const success = (data, msg = '操作成功') => ({ status: 200, code: 200, data, msg })

async function loadCatalog() {
  const response = await roomsV2API.list()
  const rooms = (response.items || []).filter(room => room.managed)
  return Promise.all(rooms.map(async room => {
    const worlds = await roomsV2API.worlds(room.id)
    return { ...room, worlds: worlds.items || [] }
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
  if (!room) throw new Error(`未找到已接管的存档：${value || '未选择'}`)
  return room
}

async function resolveSession(value, catalog = null) {
  const rooms = catalog || await loadCatalog()
  const session = sessionsFromCatalog(rooms).find(item =>
    item.key === value || item.name === value
  )
  if (!session) throw new Error(`未找到游戏世界：${value || '未选择'}`)
  return { session, room: await resolveRoom(session.room_id, rooms) }
}

function legacyPlayer(player, room) {
  return {
    id: player.id,
    room_id: room.id,
    world_id: player.worldId,
    world_name: player.worldName,
    archive_name: room.name,
    user_id: player.id,
    player_name: player.name,
    player_age: player.age,
    prefab: player.prefab,
    status: player.online ? 'online' : 'offline',
    is_admin: player.admin,
    is_friend: null,
    is_host: null,
    is_muted: null,
    net_id: player.netId,
    net_score: null,
    performance: player.performance,
    first_seen: player.firstSeenAt,
    last_seen: player.lastSeenAt,
    status_change: player.statusChangedAt,
    created_at: null,
    updated_at: player.lastRefreshedAt,
    banned: player.banned,
    ban_reason: player.banReason,
    banned_at: player.bannedAt,
    ban_expires_at: player.banExpiresAt,
    health_percent: player.healthPercent,
    hunger_percent: player.hungerPercent,
    sanity_percent: player.sanityPercent,
    temperature: player.temperature,
    moisture: player.moisture
  }
}

async function roomPlayers(room, params) {
  const items = []
  let offset = 0
  let total = 0
  do {
    const response = await playersV2API.list(room.id, {
      query: params.keyword || '',
      status: params.status || '',
      prefab: params.prefab || '',
      limit: 100,
      offset
    })
    const page = response.items || []
    items.push(...page.map(player => legacyPlayer(player, room)))
    total = response.total || 0
    offset += page.length
    if (page.length === 0) break
  } while (offset < total)
  return items
}

function sortableValue(player, key) {
  const value = player[key]
  if (key === 'first_seen' || key === 'last_seen' || key === 'status_change' || key === 'updated_at') {
    const time = new Date(value || 0).getTime()
    return Number.isFinite(time) ? time : 0
  }
  return typeof value === 'string' ? value.toLocaleLowerCase('zh-CN') : value
}

function sortPlayers(players, sortBy, sortOrder) {
  if (!sortBy || !sortOrder) return players
  const direction = sortOrder === 'asc' ? 1 : -1
  return players.slice().sort((left, right) => {
    const leftValue = sortableValue(left, sortBy)
    const rightValue = sortableValue(right, sortBy)
    if (leftValue === rightValue) return 0
    if (leftValue === null || leftValue === undefined) return 1
    if (rightValue === null || rightValue === undefined) return -1
    return leftValue > rightValue ? direction : -direction
  })
}

async function listPlayers(params = {}, paginate = true) {
  const catalog = await loadCatalog()
  const rooms = params.archive_name
    ? [await resolveRoom(params.archive_name, catalog)]
    : catalog
  const players = (await Promise.all(rooms.map(room => roomPlayers(room, params)))).flat()
  const sorted = sortPlayers(players, params.sort_by, params.sort_order)
  const page = Math.max(1, Number.parseInt(params.page, 10) || 1)
  const pageSize = Math.max(1, Number.parseInt(params.page_size, 10) || 10)
  const data = paginate ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted
  return { data, total: sorted.length, page, size: pageSize }
}

async function actionContext(player, selectedSession) {
  if (!player || typeof player !== 'object' || !player.user_id || !player.room_id) {
    throw new Error('玩家操作缺少真实的房间或玩家标识')
  }
  const catalog = await loadCatalog()
  const room = await resolveRoom(player.room_id, catalog)
  let worldId = player.world_id
  if (selectedSession) {
    const selected = await resolveSession(selectedSession, catalog)
    if (selected.room.id !== room.id) {
      throw new Error(`所选世界属于存档“${selected.room.name}”，玩家属于存档“${room.name}”`)
    }
    worldId = selected.session.world_id
  }
  if (!room.worlds.some(world => world.id === worldId)) {
    throw new Error('玩家所在世界已不存在，请先手动更新玩家列表')
  }
  return { room, worldId, playerId: player.user_id }
}

async function runAction(player, selectedSession, action, input = {}) {
  const target = await actionContext(player, selectedSession)
  const job = await playersV2API.action(target.room.id, target.playerId, action, {
    worldId: target.worldId,
    ...input
  })
  return success(await waitForV2Job(job), '玩家操作已完成')
}

function normalizeSchedule(value) {
  const fields = String(value || '').trim().split(/\s+/).filter(Boolean)
  if (fields.length === 6 && fields[0] === '0') return fields.slice(1).join(' ')
  if (fields.length === 5) return fields.join(' ')
  throw new Error('执行计划必须是五段 Cron，或以 0 秒开头的六段 Cron')
}

async function ensurePlayerGroup(roomId) {
  const response = await automationV2API.groups(roomId)
  const existing = (response.items || []).find(group => group.name === '玩家管理')
  if (existing) return existing
  return automationV2API.createGroup(roomId, {
    name: '玩家管理',
    description: '玩家信息采集任务',
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
      size: pageSize
    }
  },

  async getPlayerStats(archiveName) {
    const response = await listPlayers({ archive_name: archiveName }, false)
    const online = response.data.filter(player => player.status === 'online').length
    return success({
      total_count: response.total,
      online_count: online,
      offline_count: response.total - online,
      recent_players: response.data.slice(0, 10)
    })
  },

  async getPlayerDetail(player) {
    if (!player?.room_id || !player?.user_id) throw new Error('玩家详情缺少真实标识')
    const catalog = await loadCatalog()
    const room = await resolveRoom(player.room_id, catalog)
    return success(legacyPlayer(await playersV2API.get(room.id, player.user_id), room))
  },

  async updatePlayerInfo(data) {
    const catalog = await loadCatalog()
    const room = await resolveRoom(typeof data === 'string' ? data : data.archive_name, catalog)
    const worldIds = []
    const requestedWorld = typeof data === 'object' ? data.world_name : ''
    if (requestedWorld) {
      const world = room.worlds.find(item => worldMatches(item, requestedWorld))
      if (!world) throw new Error(`存档“${room.name}”中没有找到所选世界`)
      worldIds.push(world.id)
    }
    const job = await playersV2API.refresh(room.id, worldIds)
    return success(await waitForV2Job(job, 120000), '玩家列表更新成功')
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
    ).then(job => waitForV2Job(job)).then(job => success(job, '玩家已封禁'))
  },

  unbanPlayer(player, confirmation) {
    return actionContext(player).then(target =>
      playersV2API.action(target.room.id, target.playerId, 'unban', {
        worldId: target.worldId,
        confirmation
      })
    ).then(job => waitForV2Job(job)).then(job => success(job, '已解除玩家封禁'))
  },

  sendMessage(player, message, selectedSession) {
    return runAction(player, selectedSession, 'announce', { message })
  },

  async getArchives() {
    const catalog = await loadCatalog()
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
    return success(task, '定时更新任务添加成功')
  },

  async exportPlayers(params = {}) {
    const response = await listPlayers(params, false)
    return response.data
  },

  executeCommand() {
    throw new Error('玩家页面不允许执行任意 Lua，请使用受控玩家操作')
  }
}

export default playerApi

import {
  backupsV2API,
  containersV2API,
  gameV2API,
  roomsV2API,
  systemV2API,
  worldStatesV2API
} from './v2'
import { waitForV2Job } from './v2ConfigurationAdapters'

const MEBIBYTE = 1024 * 1024
const GIBIBYTE = 1024 * 1024 * 1024
const ROOM_JOB_TIMEOUT = 3 * 60 * 1000
const BACKUP_JOB_TIMEOUT = 5 * 60 * 1000

let roomCatalog = []

const success = (data, msg = '操作成功') => ({ status: 200, data, msg })

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function gameUpdateCapabilities(version = {}) {
  return {
    updateSupported: typeof version.updateSupported === 'boolean'
      ? version.updateSupported
      : version.updateMethod !== 'steam-client',
    steamcmdAvailable: typeof version.steamcmdAvailable === 'boolean'
      ? version.steamcmdAvailable
      : null
  }
}

function formatUptime(seconds) {
  if (!Number.isFinite(Number(seconds))) return ''
  const total = Math.max(0, Math.floor(seconds))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return [days ? `${days}天` : '', hours ? `${hours}小时` : '', `${minutes}分钟`].filter(Boolean).join(' ')
}

function bytesValue(bytes, divisor) {
  return Number.isFinite(Number(bytes)) ? Number(bytes) / divisor : null
}

function base32(value) {
  const bytes = new TextEncoder().encode(String(value))
  let buffer = 0
  let bits = 0
  let output = ''
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(buffer >>> (bits - 5)) & 31]
      bits -= 5
    }
    buffer &= bits > 0 ? (1 << bits) - 1 : 0
  }
  if (bits > 0) output += BASE32_ALPHABET[(buffer << (5 - bits)) & 31]
  return output
}

function worldType(role, directoryName = '') {
  if (role === 'master') return 'forest'
  if (role === 'caves') return 'cave'
  return directoryName.toLowerCase().includes('cave') ? 'cave' : 'forest'
}

function mapWorld(world, state) {
  return {
    ...world,
    worldName: world.name,
    type: worldType(world.role, world.directoryName),
    updateTime: world.updatedAt,
    season: state?.season || null,
    day: state?.cycles ?? null,
    stateObservedAt: state?.observedAt || null
  }
}

function mapRoom(room, worlds = [], states = []) {
  const statesByWorld = new Map(states.map(state => [state.worldId, state]))
  return {
    ...room,
    savename: room.name,
    savepath: room.directoryName,
    updateTime: room.updatedAt,
    worlds: worlds.map(world => mapWorld(world, statesByWorld.get(world.id))),
    isRunning: worlds.some(world => world.status === 'running')
  }
}

function setDerivedFlag(target, source, key, expected) {
  if (source !== undefined && source !== null && source !== '') {
    target[key] = source === expected
  }
}

function mapWorldState(snapshot, room) {
  const state = {
    archive_name: room.name,
    world_name: snapshot.worldName,
    room_id: snapshot.roomId,
    world_id: snapshot.worldId,
    world_role: snapshot.worldRole,
    season: snapshot.season,
    phase: snapshot.phase,
    cycles: snapshot.cycles,
    elapsed_days_in_season: snapshot.elapsedDaysInSeason,
    remaining_days_in_season: snapshot.remainingDaysInSeason,
    season_progress: snapshot.seasonProgress,
    time: snapshot.dayProgress,
    time_in_phase: snapshot.phaseProgress,
    precipitation: snapshot.precipitation,
    moon_phase: snapshot.moonPhase,
    temperature: snapshot.temperature,
    wetness: snapshot.wetness,
    moisture: snapshot.moisture,
    moisture_ceil: snapshot.moistureCeil,
    precipitation_rate: snapshot.precipitationRate,
    nightmarephase: snapshot.nightmarePhase,
    nightmare_progress: snapshot.nightmareProgress,
    observed_at: snapshot.observedAt,
    raw_data: JSON.stringify(snapshot, null, 2)
  }

  setDerivedFlag(state, snapshot.season, 'is_autumn', 'autumn')
  setDerivedFlag(state, snapshot.season, 'is_winter', 'winter')
  setDerivedFlag(state, snapshot.season, 'is_spring', 'spring')
  setDerivedFlag(state, snapshot.season, 'is_summer', 'summer')
  setDerivedFlag(state, snapshot.phase, 'is_day', 'day')
  setDerivedFlag(state, snapshot.phase, 'is_dusk', 'dusk')
  setDerivedFlag(state, snapshot.phase, 'is_night', 'night')
  setDerivedFlag(state, snapshot.moonPhase, 'is_full_moon', 'full')
  setDerivedFlag(state, snapshot.moonPhase, 'is_new_moon', 'new')
  setDerivedFlag(state, snapshot.precipitation, 'is_raining', 'rain')
  setDerivedFlag(state, snapshot.precipitation, 'is_snowing', 'snow')
  setDerivedFlag(state, snapshot.nightmarePhase, 'isnightmarecalm', 'calm')
  setDerivedFlag(state, snapshot.nightmarePhase, 'isnightmarewild', 'wild')
  setDerivedFlag(state, snapshot.nightmarePhase, 'isnightmarewarn', 'warn')
  setDerivedFlag(state, snapshot.nightmarePhase, 'isnightmaredawn', 'dawn')

  return state
}

async function loadRoomCatalog() {
  const response = await roomsV2API.list()
  const rooms = response.items || []
  roomCatalog = await Promise.all(rooms.map(async room => {
    const [worlds, states] = await Promise.all([
      roomsV2API.worlds(room.id),
      worldStatesV2API.list(room.id).catch(() => ({ items: [] }))
    ])
    return mapRoom(room, worlds.items || [], states.items || [])
  }))
  return roomCatalog
}

async function resolveRoom(value) {
  const rooms = roomCatalog.length ? roomCatalog : await loadRoomCatalog()
  const room = rooms.find(item => item.id === value || item.name === value || item.savename === value)
  if (!room) throw new Error(`未找到房间：${value}`)
  return room
}

function roomReference(input) {
  if (!input || typeof input !== 'object') return input
  return input.room_id || input.roomId || input.archive_name || input.archiveName
}

function selectedWorldIDs(room, input = {}) {
  const requested = input.world_ids || input.worldIds || [
    input.world_id || input.worldId || input.world_name || input.worldName
  ].filter(Boolean)

  return requested.map(value => {
    const world = room.worlds.find(item =>
      item.id === value || item.name === value || item.worldName === value
    )
    if (!world) throw new Error(`未找到世界：${value}`)
    return world.id
  })
}

function legacyServers(rooms) {
  return rooms.flatMap(room => room.worlds.map(world => ({
    id: world.id,
    room_id: room.id,
    world_id: world.id,
    archive_name: room.name,
    archive_directory: room.directoryName,
    world_name: world.name,
    world_type: world.type,
    cluster: room.name,
    session_name: `dstserver_v2_${base32(room.directoryName)}_${base32(world.directoryName)}`,
    status: world.status,
    start_time: null,
    update_time: world.updatedAt,
    deployment: null,
    server_mode: null,
    season: world.season,
    day: world.day,
    players: null,
    control_available: world.controlAvailable,
    status_message: world.statusMessage || ''
  })))
}

function legacySystemStatus(status) {
  const cpu = status.cpu || {}
  const memory = status.memory || {}
  const disk = status.disk || {}
  const host = status.host || {}
  const process = status.process || {}
  const runtime = status.runtime || {}

  return {
    current_time: status.observedAt,
    hostname: host.hostname,
    os_info: [host.platform, host.version, host.architecture].filter(Boolean).join(' '),
    uptime_formatted: host.available ? formatUptime(host.uptimeSeconds) : '',
    cpu_model: cpu.available ? cpu.model : null,
    cpu_cores: cpu.available ? cpu.cores : null,
    cpu_threads: cpu.available ? cpu.threads : null,
    cpu_usage: cpu.available ? cpu.usage : null,
    cpu_core_usage: cpu.available ? (cpu.coreUsage || []) : [],
    cpu_load1: cpu.available && cpu.loadSupported ? cpu.load1 : null,
    cpu_load5: cpu.available && cpu.loadSupported ? cpu.load5 : null,
    cpu_load15: cpu.available && cpu.loadSupported ? cpu.load15 : null,
    total_memory: memory.available ? bytesValue(memory.totalBytes, MEBIBYTE) : null,
    used_memory: memory.available ? bytesValue(memory.usedBytes, MEBIBYTE) : null,
    free_memory: memory.available ? bytesValue(memory.availableBytes, MEBIBYTE) : null,
    memory_usage: memory.available ? memory.usage : null,
    total_disk: disk.available ? bytesValue(disk.totalBytes, GIBIBYTE) : null,
    used_disk: disk.available ? bytesValue(disk.usedBytes, GIBIBYTE) : null,
    free_disk: disk.available ? bytesValue(disk.availableBytes, GIBIBYTE) : null,
    disk_usage: disk.available ? disk.usage : null,
    process_id: process.pid,
    process_uptime_fmt: formatUptime(process.uptimeSeconds),
    process_memory_rss: process.available ? bytesValue(process.memoryRssBytes, MEBIBYTE) : null,
    process_memory_vms: process.available ? bytesValue(process.memoryVmsBytes, MEBIBYTE) : null,
    process_cpu_usage: process.available ? process.cpuUsage : null,
    process_threads: process.available ? process.threads : null,
    go_version: runtime.goVersion,
    go_routines: runtime.goroutines,
    go_memory_alloc: bytesValue(runtime.heapAllocBytes, MEBIBYTE),
    go_memory_sys: bytesValue(runtime.systemBytes, MEBIBYTE),
    go_memory_heap_objs: runtime.heapObjects,
    go_gc_pause: runtime.lastGcPauseNano,
    go_gc_runs: runtime.gcRuns,
    warnings: status.warnings || [],
    application: status.application || {}
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(Number(bytes))) return '--'
  bytes = Number(bytes)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < MEBIBYTE) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < GIBIBYTE) return `${(bytes / MEBIBYTE).toFixed(1)} MB`
  return `${(bytes / GIBIBYTE).toFixed(2)} GB`
}

function mapBackup(backup, roomName) {
  const createdAt = backup.createdAt ? new Date(backup.createdAt) : null
  return {
    ...backup,
    archive_name: roomName,
    size_formatted: formatBytes(backup.size),
    create_time: createdAt && Number.isFinite(createdAt.getTime()) ? createdAt.toLocaleString() : '--'
  }
}

export const legacyRoomApi = {
  async getRoomList() {
    return success(await loadRoomCatalog(), '房间列表已刷新')
  },
  async getRoomDetail(id) {
    return success(await resolveRoom(id))
  },
  async createRoom(data) {
    return success(await roomsV2API.create(data), '房间已创建')
  },
  async updateRoom() {
    throw new Error('真实 v2 后端暂未提供房间基本信息更新接口')
  },
  async getRoomWorlds(roomValue) {
    const room = await resolveRoom(roomValue)
    return room.worlds
  },
  async startRoom(params) {
    const room = await resolveRoom(roomReference(params))
    const job = await waitForV2Job(
      await roomsV2API.action(room.id, 'start', selectedWorldIDs(room, params)),
      ROOM_JOB_TIMEOUT
    )
    roomCatalog = []
    return success(job, '启动完成')
  },
  async stopRoom(input) {
    const room = await resolveRoom(roomReference(input))
    const worldIds = input && typeof input === 'object' ? selectedWorldIDs(room, input) : []
    const job = await waitForV2Job(
      await roomsV2API.action(room.id, 'stop', worldIds),
      ROOM_JOB_TIMEOUT
    )
    roomCatalog = []
    return success(job, '停止完成')
  },
  async backupRoom(roomValue, name = '') {
    const room = await resolveRoom(roomValue)
    const job = await waitForV2Job(await backupsV2API.create(room.id, name), BACKUP_JOB_TIMEOUT)
    return success(job, '备份已创建')
  },
  async deleteRoom() {
    throw new Error('真实 v2 后端暂未提供房间删除接口')
  },
  async regenerateWorld() {
    throw new Error('真实 v2 后端暂未提供世界重新生成接口，未执行任何操作')
  },
  async deleteWorld() {
    throw new Error('真实 v2 后端暂未提供世界删除接口，未执行任何操作')
  },
  async saveWorldSettings() {
    throw new Error('请使用 v2 房间配置预览与应用接口，旧世界设置接口未执行')
  }
}

export const legacyWorldApi = {
  async getWorldList() {
    return success(await loadRoomCatalog(), '世界列表已刷新')
  },
  async getWorldState(params = {}) {
    const room = await resolveRoom(roomReference(params))
    const worldIDs = selectedWorldIDs(room, params)
    const response = await worldStatesV2API.list(room.id)
    const snapshot = (response.items || []).find(item => item.worldId === worldIDs[0])
    if (!snapshot) throw new Error('没有找到该世界的真实状态快照，请确认世界已运行并完成状态采样')
    return success(mapWorldState(snapshot, room), '世界状态已刷新')
  },
  async forestWorld() {
    throw new Error('真实 v2 后端暂未提供独立创建地表世界接口，未执行任何操作')
  },
  async caveWorld() {
    throw new Error('真实 v2 后端暂未提供独立创建洞穴世界接口，未执行任何操作')
  },
  async getServerIni() {
    throw new Error('世界 server.ini 读取将在 v2 配置接口接入后可用')
  },
  async saveServerIni() {
    throw new Error('世界 server.ini 保存将在 v2 配置接口接入后可用，未执行任何操作')
  },
  async deleteWorld() {
    throw new Error('真实 v2 后端暂未提供世界删除接口，未执行任何操作')
  }
}

export const legacySystemApi = {
  async getDashboardStatus() {
    return success(legacySystemStatus(await systemV2API.status()), '系统状态已刷新')
  },
  async getTmuxServers() {
    return success(legacyServers(await loadRoomCatalog()), '服务器状态已刷新')
  },
  async getSystemStatus() {
    return this.getDashboardStatus()
  },
  async createBackup() {
    throw new Error('系统级备份在 v2 中已改为按房间备份，未执行任何操作')
  },
  async getBackupList() {
    throw new Error('系统级备份在 v2 中已改为按房间查询')
  },
  async restoreFromBackup() {
    throw new Error('系统级恢复在 v2 中已改为按房间恢复，未执行任何操作')
  },
  async deleteBackup() {
    throw new Error('系统级备份删除在 v2 中已改为按房间删除，未执行任何操作')
  },
  async updateSystemConfig() {
    throw new Error('请使用 v2 系统设置预览与应用接口，旧配置接口未执行')
  },
  async stopTmuxServer(params) {
    const rooms = roomCatalog.length ? roomCatalog : await loadRoomCatalog()
    const server = legacyServers(rooms).find(item =>
      item.session_name === params.session_name ||
      (item.archive_name === params.archive_name && item.world_name === params.world_name)
    )
    if (!server) throw new Error('未找到要停止的世界')
    const job = await waitForV2Job(
      await roomsV2API.action(server.room_id, 'stop', [server.world_id]),
      ROOM_JOB_TIMEOUT
    )
    roomCatalog = []
    return success(job, '停止完成')
  },
  async restartTmuxServer(params) {
    const rooms = roomCatalog.length ? roomCatalog : await loadRoomCatalog()
    const server = legacyServers(rooms).find(item =>
      item.session_name === params.session_name ||
      (item.archive_name === params.archive_name && item.world_name === params.world_name)
    )
    if (!server) throw new Error('未找到要重启的世界')
    const job = await waitForV2Job(
      await roomsV2API.action(server.room_id, 'restart', [server.world_id]),
      ROOM_JOB_TIMEOUT
    )
    roomCatalog = []
    return success(job, '重启完成')
  },
  async getGameVersion() {
    const version = await gameV2API.version()
    const checkError = version.checkError || null
    const capabilities = gameUpdateCapabilities(version)
    const installed = typeof version.installed === 'boolean'
      ? version.installed
      : Boolean(version.localVersion)
    return success({
      local: {
        version: version.localVersion || null,
        path: version.installPath || null,
        installed,
        checked_at: version.checkedAt || null,
        check_error: checkError
      },
      latest: {
        version: version.latestVersion || null,
        update_url: null,
        release_date: null,
        build_number: null,
        up_to_date: typeof version.upToDate === 'boolean' ? version.upToDate : null,
        checked_at: version.checkedAt || null,
        check_error: checkError
      },
      installed,
      app_id: version.appId || null,
      install_path: version.installPath || null,
      update_method: version.updateMethod || null,
      update_supported: capabilities.updateSupported,
      steamcmd_available: capabilities.steamcmdAvailable,
      steamcmd_path: version.steamcmdPath || null,
      check_error: checkError,
      checked_at: version.checkedAt || null
    }, '游戏版本状态已刷新')
  },
  async getLocalVersion() {
    const version = await gameV2API.version()
    const capabilities = gameUpdateCapabilities(version)
    return success({
      version: version.localVersion || null,
      path: version.installPath || null,
      installed: version.installed,
      app_id: version.appId || null,
      update_method: version.updateMethod || null,
      update_supported: capabilities.updateSupported,
      steamcmd_available: capabilities.steamcmdAvailable,
      checked_at: version.checkedAt,
      check_error: version.checkError || null
    }, '本地版本已读取')
  },
  async getLatestVersion() {
    const version = await gameV2API.version()
    const capabilities = gameUpdateCapabilities(version)
    return success({
      version: version.latestVersion || null,
      update_url: null,
      release_date: null,
      build_number: null,
      up_to_date: version.upToDate,
      app_id: version.appId || null,
      update_method: version.updateMethod || null,
      update_supported: capabilities.updateSupported,
      steamcmd_available: capabilities.steamcmdAvailable,
      checked_at: version.checkedAt,
      check_error: version.checkError || null
    }, '最新版本已读取')
  },
  async updateDstServer() {
    const job = await gameV2API.update({ confirmation: '更新游戏', restartRunning: true, cleanCache: false })
    return success({ ...job, session_name: job.id }, '更新任务已提交')
  },
  async getDstUpdateStatus(jobId) {
    const run = await gameV2API.updateRun(jobId)
    return success({
      ...run,
      is_running: run.status === 'running',
      is_completed: run.status === 'succeeded',
      progress: run.status === 'succeeded' ? 100 : null,
      last_output: run.log || '',
      error: run.status === 'failed' ? (run.errorMessage || '更新失败') : ''
    })
  },
  async getAnnouncements() {
    throw new Error('真实 v2 后端暂未提供公告查询接口')
  },
  async createAnnouncement() {
    throw new Error('真实 v2 后端暂未提供公告接口')
  },
  async updateAnnouncement() {
    throw new Error('真实 v2 后端暂未提供公告接口')
  },
  async deleteAnnouncement() {
    throw new Error('真实 v2 后端暂未提供公告接口')
  },
  async getAnnouncementDetail() {
    throw new Error('真实 v2 后端暂未提供公告接口')
  },
  async getDockerContainers() {
    const list = await containersV2API.list()
    return success(list.items || [], '容器列表已刷新')
  },
  async startDockerContainer(containerId) {
    const job = await waitForV2Job(await containersV2API.action(containerId, 'start'), ROOM_JOB_TIMEOUT)
    return success(job, '容器启动完成')
  },
  async stopDockerContainer(containerId) {
    const job = await waitForV2Job(await containersV2API.action(containerId, 'stop'), ROOM_JOB_TIMEOUT)
    return success(job, '容器停止完成')
  },
  async deleteDockerContainer(containerId) {
    const list = await containersV2API.list()
    const container = (list.items || []).find(item => item.id === containerId)
    if (!container) throw new Error('未找到要删除的容器')
    const job = await waitForV2Job(
      await containersV2API.action(containerId, 'remove', container.name),
      ROOM_JOB_TIMEOUT
    )
    return success(job, '容器删除完成')
  }
}

export const legacyBackupApi = {
  async getBackupList() {
    const rooms = await loadRoomCatalog()
    const grouped = {}
    await Promise.all(rooms.map(async room => {
      const response = await backupsV2API.list(room.id)
      grouped[room.name] = (response.items || []).map(item => mapBackup(item, room.name))
    }))
    return success(grouped, '备份列表已刷新')
  },
  async createBackup(archive) {
    const room = await resolveRoom(archive)
    const job = await waitForV2Job(await backupsV2API.create(room.id), BACKUP_JOB_TIMEOUT)
    return success(job, '备份已创建')
  },
  async restoreBackup(archive, backupName, targetName) {
    if (targetName) throw new Error('真实 v2 后端暂不支持恢复到新房间')
    const room = await resolveRoom(archive)
    const response = await backupsV2API.list(room.id)
    const backup = (response.items || []).find(item => item.name === backupName || item.id === backupName)
    if (!backup) throw new Error(`未找到备份：${backupName}`)
    const job = await waitForV2Job(
      await backupsV2API.restore(backup.id, room.name),
      BACKUP_JOB_TIMEOUT
    )
    roomCatalog = []
    return success(job, '备份恢复完成')
  },
  async deleteBackup(archive, backupName) {
    const room = await resolveRoom(archive)
    const response = await backupsV2API.list(room.id)
    const backup = (response.items || []).find(item => item.name === backupName || item.id === backupName)
    if (!backup) throw new Error(`未找到备份：${backupName}`)
    return success(await backupsV2API.delete(backup.id, backup.name), '备份已删除')
  },
  async downloadBackup(archive, backupName) {
    const room = await resolveRoom(archive)
    const response = await backupsV2API.list(room.id)
    const backup = (response.items || []).find(item => item.name === backupName || item.id === backupName)
    if (!backup) throw new Error(`未找到备份：${backupName}`)
    return backupsV2API.downloadURL(backup.id)
  }
}

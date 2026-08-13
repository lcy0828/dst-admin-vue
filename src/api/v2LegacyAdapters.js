import {
  announcementsV2API,
  backupsV2API,
  containersV2API,
  consoleV2API,
  gameV2API,
  roomsV2API,
  systemV2API,
  worldStatesV2API
} from './v2'
import { waitForV2Job } from './v2ConfigurationAdapters'
import { adapterError, adapterSuccess } from './adapterProtocol.mjs'
import { createAsyncResourceCache } from '@/lib/asyncResourceCache.mjs'
import { announcementTypeId } from '@/lib/systemDataIdentifiers.mjs'

const MEBIBYTE = 1024 * 1024
const GIBIBYTE = 1024 * 1024 * 1024
const ROOM_JOB_TIMEOUT = 3 * 60 * 1000
const BACKUP_JOB_TIMEOUT = 5 * 60 * 1000

const roomCatalogCache = createAsyncResourceCache({ ttlMs: 750 })

const success = (data, msg = 'operation_succeeded') => adapterSuccess(data, msg)

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function announcementInput(input = {}) {
  const rawExpireTime = String(input.expireTime || '').trim()
  const expiresAt = new Date(rawExpireTime.includes('T') ? rawExpireTime : rawExpireTime.replace(' ', 'T'))
  if (!rawExpireTime || Number.isNaN(expiresAt.getTime())) {
    throw adapterError('INVALID_ANNOUNCEMENT_EXPIRY', { context: { value: rawExpireTime } })
  }
  return {
    title: String(input.title || '').trim(),
    content: String(input.content || '').trim(),
    expireTime: expiresAt.toISOString(),
    target: input.target || 'all',
    important: input.important === true
  }
}

function legacyAnnouncement(value) {
  const publishedAt = new Date(value.publishTime)
  return {
    ...value,
    type: announcementTypeId(value.important),
    time: Number.isNaN(publishedAt.getTime()) ? '' : publishedAt.toISOString()
  }
}

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

function formatCompactDuration(seconds) {
  if (!Number.isFinite(Number(seconds))) return ''
  const total = Math.max(0, Math.floor(seconds))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', `${minutes}m`].filter(Boolean).join(' ')
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
    stateObservedAt: state?.observedAt || null,
    stateRuntimeState: state?.runtimeState || world.status || 'unknown',
    stateFreshness: state?.freshness || 'unavailable',
    stateAgeSeconds: state?.ageSeconds ?? null,
    stateStale: state?.stale ?? true
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
    runtime_state: snapshot.runtimeState || 'unknown',
    freshness: snapshot.freshness || 'unavailable',
    age_seconds: snapshot.ageSeconds ?? null,
    stale: snapshot.stale ?? true,
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
  return roomCatalogCache.load(async () => {
    const response = await roomsV2API.list()
    const rooms = response.items || []
    return Promise.all(rooms.map(async room => {
      const [worlds, states] = await Promise.all([
        roomsV2API.worlds(room.id),
        worldStatesV2API.list(room.id).catch(() => ({ items: [] }))
      ])
      return mapRoom(room, worlds.items || [], states.items || [])
    }))
  })
}

async function resolveRoom(value) {
  const rooms = await loadRoomCatalog()
  const room = rooms.find(item => item.id === value || item.name === value || item.savename === value)
  if (!room) throw adapterError('ROOM_NOT_FOUND', { context: { reference: value || '' } })
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
    if (!world) throw adapterError('WORLD_NOT_FOUND', { context: { reference: value || '' } })
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
    state_observed_at: world.stateObservedAt,
    state_runtime_state: world.stateRuntimeState,
    state_freshness: world.stateFreshness,
    state_age_seconds: world.stateAgeSeconds,
    state_stale: world.stateStale,
    latest_exit: world.latestExit || null,
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
    uptime: host.available ? host.uptimeSeconds : null,
    uptime_seconds: host.available ? host.uptimeSeconds : null,
    uptime_formatted: host.available ? formatCompactDuration(host.uptimeSeconds) : '',
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
    process_uptime: process.available ? process.uptimeSeconds : null,
    process_uptime_seconds: process.available ? process.uptimeSeconds : null,
    process_uptime_fmt: process.available ? formatCompactDuration(process.uptimeSeconds) : '',
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
  return {
    ...backup,
    archive_name: roomName,
    size_formatted: formatBytes(backup.size),
    create_time: backup.createdAt || ''
  }
}

export const legacyRoomApi = {
  async getRoomList() {
    return success(await loadRoomCatalog(), 'rooms_loaded')
  },
  async getRoomDetail(id) {
    return success(await resolveRoom(id))
  },
  async createRoom(data) {
    return success(await roomsV2API.create(data), 'room_created')
  },
  async updateRoom() {
    throw adapterError('ROOM_UPDATE_UNAVAILABLE')
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
    roomCatalogCache.invalidate()
    return success(job, 'room_started')
  },
  async stopRoom(input) {
    const room = await resolveRoom(roomReference(input))
    const worldIds = input && typeof input === 'object' ? selectedWorldIDs(room, input) : []
    const job = await waitForV2Job(
      await roomsV2API.action(room.id, 'stop', worldIds),
      ROOM_JOB_TIMEOUT
    )
    roomCatalogCache.invalidate()
    return success(job, 'room_stopped')
  },
  async cleanupRoom(input) {
    const room = await resolveRoom(roomReference(input))
    const worldIds = input && typeof input === 'object' ? selectedWorldIDs(room, input) : []
    const job = await waitForV2Job(
      await roomsV2API.action(room.id, 'cleanup', worldIds),
      ROOM_JOB_TIMEOUT
    )
    roomCatalogCache.invalidate()
    return success(job, 'room_session_cleaned')
  },
  async backupRoom(roomValue, name = '') {
    const room = await resolveRoom(roomValue)
    const job = await waitForV2Job(await backupsV2API.create(room.id, name), BACKUP_JOB_TIMEOUT)
    return success(job, 'backup_created')
  },
  async deleteRoom(input = {}) {
    const room = await resolveRoom(roomReference(input))
    const confirmation = input && typeof input === 'object' ? input.confirmation : ''
    const result = await roomsV2API.deleteRoom(room.id, confirmation)
    roomCatalogCache.invalidate()
    return success(result, 'room_moved_to_recovery')
  },
  async getRoomRecoveries() {
    return success(await roomsV2API.recoveries(), 'room_recoveries_loaded')
  },
  async restoreRoomRecovery(recoveryName) {
    const result = await roomsV2API.restoreRoom(recoveryName)
    roomCatalogCache.invalidate()
    return success(result, 'room_recovery_restored')
  },
  async purgeRoomRecovery(recoveryName, confirmation) {
    return success(await roomsV2API.purgeRoomRecovery(recoveryName, confirmation), 'room_recovery_purged')
  },
  async getWorldRecoveries(roomId) {
    return success(await roomsV2API.worldRecoveries(roomId), 'world_recoveries_loaded')
  },
  async restoreWorldRecovery(roomId, recoveryName) {
    const result = await roomsV2API.restoreWorld(roomId, recoveryName)
    roomCatalogCache.invalidate()
    return success(result, 'world_recovery_restored')
  },
  async purgeWorldRecovery(roomId, recoveryName, confirmation) {
    return success(await roomsV2API.purgeWorldRecovery(roomId, recoveryName, confirmation), 'world_recovery_purged')
  },
  async regenerateWorld(input = {}) {
    const room = await resolveRoom(roomReference(input))
    const [worldId] = selectedWorldIDs(room, input)
    let run = await consoleV2API.execute(room.id, worldId, {
      commandId: 'regenerate',
      arguments: {},
      confirmation: input.confirmation || ''
    })
    const deadline = Date.now() + ROOM_JOB_TIMEOUT
    while (run.status === 'sending') {
      if (Date.now() >= deadline) {
        throw adapterError('REGENERATE_COMMAND_TIMEOUT', { context: { runId: run.id } })
      }
      await new Promise(resolve => setTimeout(resolve, 300))
      run = await consoleV2API.run(room.id, run.id)
    }
    if (run.status !== 'sent') {
      throw adapterError('REGENERATE_COMMAND_FAILED', {
        detail: run.errorMessage || run.message || '',
        context: { runId: run.id }
      })
    }
    roomCatalogCache.invalidate()
    return success(run, 'regenerate_command_sent')
  },
  async deleteWorld(input = {}) {
    const room = await resolveRoom(roomReference(input))
    const [worldId] = selectedWorldIDs(room, input)
    const result = await roomsV2API.deleteWorld(room.id, worldId, input.confirmation || '')
    roomCatalogCache.invalidate()
    return success(result, 'world_moved_to_recovery')
  },
  async saveWorldSettings() {
    throw adapterError('LEGACY_WORLD_SETTINGS_UNAVAILABLE')
  }
}

export const legacyWorldApi = {
  async getWorldList() {
    return success(await loadRoomCatalog(), 'worlds_loaded')
  },
  async getWorldState(params = {}) {
    const room = await resolveRoom(roomReference(params))
    const worldIDs = selectedWorldIDs(room, params)
    const response = await worldStatesV2API.list(room.id)
    const snapshot = (response.items || []).find(item => item.worldId === worldIDs[0])
    if (!snapshot) {
      throw adapterError('WORLD_STATE_NOT_FOUND', {
        context: { roomId: room.id, worldId: worldIDs[0] || '' }
      })
    }
    return success(mapWorldState(snapshot, room), 'world_state_loaded')
  },
  async forestWorld() {
    throw adapterError('FOREST_WORLD_CREATE_UNAVAILABLE')
  },
  async caveWorld() {
    throw adapterError('CAVE_WORLD_CREATE_UNAVAILABLE')
  },
  async getServerIni() {
    throw adapterError('SERVER_INI_READ_UNAVAILABLE')
  },
  async saveServerIni() {
    throw adapterError('SERVER_INI_WRITE_UNAVAILABLE')
  },
  async deleteWorld() {
    throw adapterError('WORLD_DELETE_UNAVAILABLE')
  }
}

export const legacySystemApi = {
  async getDashboardStatus() {
    return success(legacySystemStatus(await systemV2API.status()), 'system_status_loaded')
  },
  async getTmuxServers() {
    return success(legacyServers(await loadRoomCatalog()), 'servers_loaded')
  },
  async getSystemStatus() {
    return this.getDashboardStatus()
  },
  async createBackup() {
    throw adapterError('SYSTEM_BACKUP_CREATE_UNAVAILABLE')
  },
  async getBackupList() {
    throw adapterError('SYSTEM_BACKUP_LIST_UNAVAILABLE')
  },
  async restoreFromBackup() {
    throw adapterError('SYSTEM_BACKUP_RESTORE_UNAVAILABLE')
  },
  async deleteBackup() {
    throw adapterError('SYSTEM_BACKUP_DELETE_UNAVAILABLE')
  },
  async updateSystemConfig() {
    throw adapterError('SYSTEM_CONFIGURATION_UPDATE_UNAVAILABLE')
  },
  async stopTmuxServer(params) {
    const rooms = await loadRoomCatalog()
    const server = legacyServers(rooms).find(item =>
      item.session_name === params.session_name ||
      (item.archive_name === params.archive_name && item.world_name === params.world_name)
    )
    if (!server) throw adapterError('WORLD_STOP_TARGET_NOT_FOUND')
    const job = await waitForV2Job(
      await roomsV2API.action(server.room_id, 'stop', [server.world_id]),
      ROOM_JOB_TIMEOUT
    )
    roomCatalogCache.invalidate()
    return success(job, 'world_stopped')
  },
  async restartTmuxServer(params) {
    const rooms = await loadRoomCatalog()
    const server = legacyServers(rooms).find(item =>
      item.session_name === params.session_name ||
      (item.archive_name === params.archive_name && item.world_name === params.world_name)
    )
    if (!server) throw adapterError('WORLD_RESTART_TARGET_NOT_FOUND')
    const job = await waitForV2Job(
      await roomsV2API.action(server.room_id, 'restart', [server.world_id]),
      ROOM_JOB_TIMEOUT
    )
    roomCatalogCache.invalidate()
    return success(job, 'world_restarted')
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
    }, 'game_version_status_loaded')
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
    }, 'local_game_version_loaded')
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
    }, 'latest_game_version_loaded')
  },
  async updateDstServer() {
    const job = await gameV2API.update({ confirmation: '更新游戏', restartRunning: true, cleanCache: false })
    return success({ ...job, session_name: job.id }, 'game_update_submitted')
  },
  async getDstUpdateStatus(jobId) {
    const run = await gameV2API.updateRun(jobId)
    return success({
      ...run,
      is_running: run.status === 'running',
      is_completed: run.status === 'succeeded',
      progress: run.status === 'succeeded' ? 100 : null,
      last_output: run.log || '',
      error: run.status === 'failed' ? (run.errorMessage || 'Game update failed') : '',
      error_code: run.status === 'failed' ? 'GAME_UPDATE_FAILED' : ''
    })
  },
  async getAnnouncements() {
    const items = await announcementsV2API.list()
    return (Array.isArray(items) ? items : []).map(legacyAnnouncement)
  },
  async createAnnouncement(input) {
    return legacyAnnouncement(await announcementsV2API.create(announcementInput(input)))
  },
  async updateAnnouncement(announcementId, input) {
    return legacyAnnouncement(await announcementsV2API.update(announcementId, announcementInput(input)))
  },
  async deleteAnnouncement(announcementId) {
    return announcementsV2API.delete(announcementId)
  },
  async getAnnouncementDetail(announcementId) {
    return legacyAnnouncement(await announcementsV2API.get(announcementId))
  },
  async getDockerContainers() {
    const list = await containersV2API.list()
    return success(list.items || [], 'containers_loaded')
  },
  async startDockerContainer(containerId) {
    const job = await waitForV2Job(await containersV2API.action(containerId, 'start'), ROOM_JOB_TIMEOUT)
    return success(job, 'container_started')
  },
  async stopDockerContainer(containerId) {
    const job = await waitForV2Job(await containersV2API.action(containerId, 'stop'), ROOM_JOB_TIMEOUT)
    return success(job, 'container_stopped')
  },
  async deleteDockerContainer(containerId) {
    const list = await containersV2API.list()
    const container = (list.items || []).find(item => item.id === containerId)
    if (!container) throw adapterError('CONTAINER_NOT_FOUND', { context: { containerId } })
    const job = await waitForV2Job(
      await containersV2API.action(containerId, 'remove', container.name),
      ROOM_JOB_TIMEOUT
    )
    return success(job, 'container_removed')
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
    return success(grouped, 'backups_loaded')
  },
  async createBackup(archive) {
    const room = await resolveRoom(archive)
    const job = await waitForV2Job(await backupsV2API.create(room.id), BACKUP_JOB_TIMEOUT)
    return success(job, 'backup_created')
  },
  async restoreBackup(archive, backupName, targetName) {
    if (targetName) {
      throw adapterError('BACKUP_RESTORE_TO_NEW_ROOM_UNAVAILABLE', {
        context: { targetName }
      })
    }
    const room = await resolveRoom(archive)
    const response = await backupsV2API.list(room.id)
    const backup = (response.items || []).find(item => item.name === backupName || item.id === backupName)
    if (!backup) throw adapterError('BACKUP_NOT_FOUND', { context: { backupName } })
    const job = await waitForV2Job(
      await backupsV2API.restore(backup.id, room.name),
      BACKUP_JOB_TIMEOUT
    )
    roomCatalogCache.invalidate()
    return success(job, 'backup_restored')
  },
  async deleteBackup(archive, backupName) {
    const room = await resolveRoom(archive)
    const response = await backupsV2API.list(room.id)
    const backup = (response.items || []).find(item => item.name === backupName || item.id === backupName)
    if (!backup) throw adapterError('BACKUP_NOT_FOUND', { context: { backupName } })
    return success(await backupsV2API.delete(backup.id, backup.name), 'backup_deleted')
  },
  async downloadBackup(archive, backupName) {
    const room = await resolveRoom(archive)
    const response = await backupsV2API.list(room.id)
    const backup = (response.items || []).find(item => item.name === backupName || item.id === backupName)
    if (!backup) throw adapterError('BACKUP_NOT_FOUND', { context: { backupName } })
    return backupsV2API.downloadURL(backup.id)
  }
}

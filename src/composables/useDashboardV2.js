import { computed, onBeforeUnmount, ref } from 'vue'
import { playerApi, roomApi, systemApi } from '@/api/index'
import { systemV2API } from '@/api/v2'
import { confirmAction } from '@/lib/feedback'
import { formatDurationSeconds } from '@/lib/localeFormatters.mjs'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { isCapacityRiskCanceled, startRoomWithCapacityRisk } from '@/lib/startCapacityRisk'
import {
  canCleanFailedWorld,
  canStartWorld,
  worldPrimaryAction,
  worldStatusMessage
} from '@/lib/worldRuntimeStatus.mjs'
import { i18n, translate } from '@/i18n'
import { toast } from 'vue-sonner'

const emptyVersion = () => ({
  local: null,
  latest: null,
  official: null,
  installed: false,
  app_id: null,
  install_path: null,
  update_method: null,
  update_supported: false,
  steamcmd_available: false,
  check_error: null,
  official_check_error: null,
  checked_at: null
})

const emptyCapabilities = () => ({
  deployment: null,
  tools: {},
  paths: {},
  features: {}
})

const emptyReadiness = () => ({
  ready: false,
  checks: []
})

export function useDashboardV2() {
  const systemStatus = ref({})
  const serverList = ref([])
  const roomList = ref([])
  const playerSummary = ref({ total: 0, online: 0, staleOnline: 0, loadedRooms: 0, failedRooms: 0 })
  const versionInfo = ref(emptyVersion())
  const capabilities = ref(emptyCapabilities())
  const setupReadiness = ref(emptyReadiness())
  const updateStatus = ref(null)
  const lastRefreshedAt = ref(null)

  const systemLoading = ref(false)
  const serverLoading = ref(false)
  const playerLoading = ref(false)
  const versionLoading = ref(false)
  const guidanceLoading = ref(true)
  const updateStarting = ref(false)

  const systemError = ref('')
  const serverError = ref('')
  const roomError = ref('')
  const playerError = ref('')
  const versionError = ref('')
  const guidanceError = ref('')
  let updateTimer = null
  let systemRequestSequence = 0
  let serverRequestSequence = 0
  let playerRequestSequence = 0
  let versionRequestSequence = 0
  let guidanceRequestSequence = 0
  let updatePollInFlight = false
  let runtimePollInFlight = false

  const runningServerCount = computed(() => serverList.value.filter(server => server.status === 'running').length)
  const totalWorldCount = computed(() => roomList.value.reduce(
    (total, room) => total + (Array.isArray(room.worlds) ? room.worlds.length : 0),
    0
  ))
  const dashboardLoading = computed(() => (
    systemLoading.value || serverLoading.value || playerLoading.value || versionLoading.value || guidanceLoading.value
  ))
  const isVersionOutdated = computed(() => {
    if (!versionInfo.value.installed) return false
    return versionInfo.value.latest?.up_to_date === false
  })
  const canUpdateGame = computed(() => Boolean(
    versionInfo.value.update_supported &&
    versionInfo.value.steamcmd_available
  ))
  const canInstallGame = computed(() => !versionInfo.value.installed && canUpdateGame.value)
  const gameUpdateBusy = computed(() => updateStarting.value || Boolean(updateStatus.value?.is_running))

  async function refreshSystem() {
    const sequence = ++systemRequestSequence
    systemLoading.value = true
    systemError.value = ''
    try {
      const response = await systemApi.getDashboardStatus()
      if (response?.status !== 200 || !response.data) throw new Error(response?.msg || translate('dashboard.feedback.invalidSystemResponse'))
      if (sequence !== systemRequestSequence) return false
      systemStatus.value = response.data
      return true
    } catch (error) {
      if (sequence !== systemRequestSequence) return false
      systemError.value = error.message || translate('dashboard.feedback.systemLoadFailed')
      return false
    } finally {
      if (sequence === systemRequestSequence) systemLoading.value = false
    }
  }

  async function refreshPlayers() {
    const sequence = ++playerRequestSequence
    playerLoading.value = true
    playerError.value = ''
    try {
      if (roomError.value) {
        playerError.value = translate('dashboard.feedback.playersBlocked')
        return false
      }
      const summary = { total: 0, online: 0, staleOnline: 0, loadedRooms: 0, failedRooms: 0 }
      const results = await Promise.allSettled(
        roomList.value.map(room => playerApi.getPlayerStats(room.name))
      )
      if (sequence !== playerRequestSequence) return false
      for (const result of results) {
        if (result.status === 'rejected') {
          summary.failedRooms += 1
          continue
        }
        const value = result.value?.data || {}
        summary.total += Number(value.total_count) || 0
        summary.online += Number(value.online_count) || 0
        summary.staleOnline += Number(value.stale_online_count) || 0
        summary.loadedRooms += 1
      }
      if (summary.failedRooms > 0) {
        playerError.value = translate('dashboard.feedback.playerRoomsFailed', { count: summary.failedRooms })
      }
      if (summary.loadedRooms > 0 || roomList.value.length === 0) playerSummary.value = summary
      return summary.failedRooms === 0
    } finally {
      if (sequence === playerRequestSequence) playerLoading.value = false
    }
  }

  async function refreshServers() {
    const sequence = ++serverRequestSequence
    serverLoading.value = true
    serverError.value = ''
    roomError.value = ''
    const [servers, rooms] = await Promise.allSettled([
      systemApi.getTmuxServers(),
      roomApi.getRoomList()
    ])
    if (sequence !== serverRequestSequence) return false

    if (servers.status === 'fulfilled' && servers.value?.status === 200) {
      serverList.value = Array.isArray(servers.value.data) ? servers.value.data : []
    } else {
      serverError.value = servers.reason?.message || servers.value?.msg || translate('dashboard.feedback.serverLoadFailed')
    }

    if (rooms.status === 'fulfilled' && rooms.value?.status === 200) {
      roomList.value = Array.isArray(rooms.value.data) ? rooms.value.data : []
    } else {
      roomError.value = rooms.reason?.message || rooms.value?.msg || translate('dashboard.feedback.roomLoadFailed')
    }

    await refreshPlayers()
    if (sequence === serverRequestSequence) serverLoading.value = false
    return servers.status === 'fulfilled' && servers.value?.status === 200 && rooms.status === 'fulfilled' && rooms.value?.status === 200
  }

  async function refreshRuntimeServers() {
    if (serverLoading.value || runtimePollInFlight) return false
    runtimePollInFlight = true
    const observedSequence = serverRequestSequence
    try {
      const [servers, rooms] = await Promise.allSettled([
        systemApi.getTmuxServers(),
        roomApi.getRoomList()
      ])
      if (observedSequence !== serverRequestSequence) return false

      const serversReady = servers.status === 'fulfilled' && servers.value?.status === 200
      const roomsReady = rooms.status === 'fulfilled' && rooms.value?.status === 200
      if (serversReady) {
        serverList.value = Array.isArray(servers.value.data) ? servers.value.data : []
        serverError.value = ''
      } else if (serverList.value.length === 0) {
        serverError.value = servers.reason?.message || servers.value?.msg || translate('dashboard.feedback.serverLoadFailed')
      }
      if (roomsReady) {
        roomList.value = Array.isArray(rooms.value.data) ? rooms.value.data : []
        roomError.value = ''
      } else if (roomList.value.length === 0) {
        roomError.value = rooms.reason?.message || rooms.value?.msg || translate('dashboard.feedback.roomLoadFailed')
      }
      return serversReady && roomsReady
    } finally {
      runtimePollInFlight = false
    }
  }

  async function refreshVersion() {
    const sequence = ++versionRequestSequence
    versionLoading.value = true
    versionError.value = ''
    try {
      const response = await systemApi.getGameVersion()
      if (response?.status !== 200 || !response.data) throw new Error(response?.msg || translate('dashboard.feedback.invalidVersionResponse'))
      if (sequence !== versionRequestSequence) return false
      versionInfo.value = response.data
      return true
    } catch (error) {
      if (sequence !== versionRequestSequence) return false
      versionError.value = error.message || translate('dashboard.feedback.versionLoadFailed')
      return false
    } finally {
      if (sequence === versionRequestSequence) versionLoading.value = false
    }
  }

  async function refreshGuidance() {
    const sequence = ++guidanceRequestSequence
    guidanceLoading.value = true
    guidanceError.value = ''
    const [capabilityResult, readinessResult] = await Promise.allSettled([
      systemV2API.capabilities(),
      systemV2API.setupChecks()
    ])
    if (sequence !== guidanceRequestSequence) return false

    if (capabilityResult.status === 'fulfilled') {
      capabilities.value = capabilityResult.value || emptyCapabilities()
    }
    if (readinessResult.status === 'fulfilled') {
      setupReadiness.value = readinessResult.value || emptyReadiness()
    }
    if (capabilityResult.status === 'rejected' || readinessResult.status === 'rejected') {
      guidanceError.value = capabilityResult.reason?.message || readinessResult.reason?.message || translate('dashboard.onboarding.loadFailed')
    }
    guidanceLoading.value = false
    return capabilityResult.status === 'fulfilled'
  }

  async function refreshDashboard() {
    const results = await Promise.all([refreshSystem(), refreshServers(), refreshVersion(), refreshGuidance()])
    if (results.some(Boolean)) lastRefreshedAt.value = new Date()
    return results.slice(0, 3).every(Boolean)
  }

  async function handleServerAction(server) {
    const primaryAction = worldPrimaryAction(server, translate)
    if (primaryAction.disabled || !primaryAction.kind) {
      toast.warning(worldStatusMessage(server) || translate('dashboard.feedback.actionUnavailable'))
      return
    }
    const stopping = primaryAction.kind === 'stop'
    const action = primaryAction.label
    try {
      await confirmAction(translate('dashboard.feedback.actionConfirm', { action, room: server.archive_name, world: server.world_name }), translate('dashboard.feedback.actionConfirmTitle'), {
        confirmText: translate('dashboard.feedback.actionConfirmButton', { action })
      })
    } catch {
      return
    }

    serverLoading.value = true
    try {
      const input = { room_id: server.room_id, world_id: server.world_id }
      await (stopping ? roomApi.stopRoom(input) : startRoomWithCapacityRisk(input))
      const refreshed = await refreshServers()
      if (refreshed) toast.success(translate('dashboard.feedback.actionCompleted', { action }))
      else toast.warning(translate('dashboard.feedback.actionCompletedRefreshFailed', { action }))
    } catch (error) {
      if (isCapacityRiskCanceled(error)) return
      toast.error(translate('dashboard.feedback.actionFailed', { action, error: error.message || translate('common.errors.unknown') }))
    } finally {
      serverLoading.value = false
    }
  }

  async function startRoom(room, worlds) {
    const startableWorlds = worlds.filter(canStartWorld)
    if (!startableWorlds.length) {
      toast.warning(translate('dashboard.feedback.selectWorld'))
      return false
    }
    serverLoading.value = true
    try {
      await startRoomWithCapacityRisk({
        room_id: room.id,
        world_ids: startableWorlds.map(world => world.id)
      })
      const refreshed = await refreshServers()
      if (refreshed) toast.success(translate('dashboard.feedback.roomStarted', { room: room.name }))
      else toast.warning(translate('dashboard.feedback.roomStartedRefreshFailed', { room: room.name }))
      return true
    } catch (error) {
      if (isCapacityRiskCanceled(error)) return false
      toast.error(translate('dashboard.feedback.roomStartFailed', { error: error.message || translate('common.errors.unknown') }))
      return false
    } finally {
      serverLoading.value = false
    }
  }

  async function cleanupFailedServer(server) {
    if (!canCleanFailedWorld(server)) {
      toast.warning(worldStatusMessage(server) || translate('dashboard.feedback.cleanupUnavailable'))
      return
    }
    try {
      await confirmAction(translate('dashboard.feedback.cleanupConfirm', { room: server.archive_name, world: server.world_name }), translate('dashboard.feedback.cleanupTitle'), {
        confirmText: translate('dashboard.feedback.cleanupButton')
      })
    } catch {
      return
    }

    serverLoading.value = true
    try {
      await roomApi.cleanupRoom({ room_id: server.room_id, world_id: server.world_id })
      const refreshed = await refreshServers()
      if (refreshed) toast.success(translate('dashboard.feedback.cleanupSucceeded'))
      else toast.warning(translate('dashboard.feedback.cleanupSucceededRefreshFailed'))
    } catch (error) {
      toast.error(translate('dashboard.feedback.cleanupFailed', { error: error.message || translate('common.errors.unknown') }))
    } finally {
      serverLoading.value = false
    }
  }

  function stopUpdatePolling() {
    if (updateTimer) clearInterval(updateTimer)
    updateTimer = null
  }

  async function pollUpdateStatus(jobId) {
    if (updatePollInFlight) return false
    updatePollInFlight = true
    try {
      const response = await systemApi.getDstUpdateStatus(jobId)
      if (response?.status !== 200 || !response.data) throw new Error(response?.msg || translate('dashboard.feedback.updateStatusFailed'))
      updateStatus.value = response.data
      if (updateStatus.value?.is_completed || updateStatus.value?.error) {
        stopUpdatePolling()
        sessionStorage.removeItem('dstUpdateSessionName')
        if (updateStatus.value.is_completed && !updateStatus.value.error) await refreshVersion()
      }
      return true
    } catch (error) {
      stopUpdatePolling()
      toast.error(error.message || translate('dashboard.feedback.updateStatusFailed'))
      return false
    } finally {
      updatePollInFlight = false
    }
  }

  async function updateGame() {
    if (!canUpdateGame.value) return
    const installing = !versionInfo.value.installed
    try {
      await confirmAction(translate(installing ? 'dashboard.feedback.installConfirm' : 'dashboard.feedback.updateConfirm'), translate(installing ? 'dashboard.feedback.installConfirmTitle' : 'dashboard.feedback.updateConfirmTitle'), {
        confirmText: translate(installing ? 'dashboard.feedback.installConfirmButton' : 'dashboard.feedback.updateConfirmButton')
      })
    } catch {
      return
    }

    updateStarting.value = true
    try {
      const response = await systemApi.updateDstServer({ force: true })
      const jobId = response.data?.session_name
      if (!jobId) throw new Error(response.msg || translate('dashboard.feedback.invalidUpdateResponse'))
      sessionStorage.setItem('dstUpdateSessionName', jobId)
      toast.success(translate(installing ? 'dashboard.feedback.installSubmitted' : 'dashboard.feedback.updateSubmitted'))
      const pollingReady = await pollUpdateStatus(jobId)
      if (pollingReady && !updateStatus.value?.is_completed && !updateStatus.value?.error) {
        stopUpdatePolling()
        updateTimer = setInterval(() => pollUpdateStatus(jobId), 3000)
      }
    } catch (error) {
      toast.error(error.message || translate('dashboard.feedback.updateFailed'))
    } finally {
      updateStarting.value = false
    }
  }

  async function resumeUpdatePolling() {
    const jobId = sessionStorage.getItem('dstUpdateSessionName')
    if (!jobId) return
    const pollingReady = await pollUpdateStatus(jobId)
    if (pollingReady && !updateStatus.value?.is_completed && !updateStatus.value?.error) {
      stopUpdatePolling()
      updateTimer = setInterval(() => pollUpdateStatus(jobId), 3000)
    }
  }

  onBeforeUnmount(stopUpdatePolling)

  return {
    systemStatus,
    serverList,
    roomList,
    playerSummary,
    versionInfo,
    capabilities,
    setupReadiness,
    updateStatus,
    lastRefreshedAt,
    systemLoading,
    serverLoading,
    playerLoading,
    versionLoading,
    guidanceLoading,
    systemError,
    serverError,
    roomError,
    playerError,
    versionError,
    guidanceError,
    runningServerCount,
    totalWorldCount,
    dashboardLoading,
    isVersionOutdated,
    canUpdateGame,
    canInstallGame,
    gameUpdateBusy,
    refreshDashboard,
    refreshSystem,
    refreshServers,
    refreshRuntimeServers,
    refreshVersion,
    refreshGuidance,
    handleServerAction,
    cleanupFailedServer,
    startRoom,
    updateGame,
    resumeUpdatePolling
  }
}

export function hasMetric(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
}

export function percentage(value) {
  if (!hasMetric(value)) return 0
  const normalized = Math.max(0, Math.min(100, Number(value)))
  return Math.round(normalized * 10) / 10
}

export function loadPercentage(value, capacity) {
  if (!hasMetric(value) || !hasMetric(capacity) || Number(capacity) <= 0) return 0
  return percentage((Number(value) / Number(capacity)) * 100)
}

export function formatMemory(value) {
  if (!hasMetric(value)) return '--'
  return Number(value) < 1024 ? `${Number(value).toFixed(2)} MB` : `${(Number(value) / 1024).toFixed(2)} GB`
}

export function formatDisk(value) {
  return hasMetric(value) ? `${Number(value).toFixed(2)} GB` : '--'
}

export function formatDecimal(value) {
  return hasMetric(value) ? Number(value).toFixed(2) : '--'
}

export function formatDateTime(value, locale = i18n.global.locale.value) {
  return formatSystemDateTime(value, {
    locale,
    fallback: value ? String(value) : '--',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

export function formatServerUptime(value, translator = translate) {
  if (!value) return '--'
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return '--'
  const totalMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return translator('dashboard.duration.daysHours', { days, hours })
  if (hours > 0) return translator('dashboard.duration.hoursMinutes', { hours, minutes })
  return translator('dashboard.duration.minutes', { minutes })
}

export function formatSystemUptime(status = {}, translator = translate) {
  const seconds = status.uptime_seconds ?? status.uptime
  if (hasMetric(seconds)) return formatDurationSeconds(seconds, translator)
  return status.uptime_formatted || '--'
}

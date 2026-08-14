import { computed, onBeforeUnmount, ref } from 'vue'
import { playerApi, roomApi, systemApi } from '@/api/index'
import { confirmAction } from '@/lib/feedback'
import { formatDurationSeconds } from '@/lib/localeFormatters.mjs'
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

export function useDashboardV2() {
  const systemStatus = ref({})
  const serverList = ref([])
  const roomList = ref([])
  const playerSummary = ref({ total: 0, online: 0, loadedRooms: 0, failedRooms: 0 })
  const versionInfo = ref(emptyVersion())
  const updateStatus = ref(null)
  const lastRefreshedAt = ref(null)

  const systemLoading = ref(false)
  const serverLoading = ref(false)
  const playerLoading = ref(false)
  const versionLoading = ref(false)
  const updateStarting = ref(false)

  const systemError = ref('')
  const serverError = ref('')
  const roomError = ref('')
  const playerError = ref('')
  const versionError = ref('')
  let updateTimer = null

  const runningServerCount = computed(() => serverList.value.filter(server => server.status === 'running').length)
  const totalWorldCount = computed(() => roomList.value.reduce(
    (total, room) => total + (Array.isArray(room.worlds) ? room.worlds.length : 0),
    0
  ))
  const dashboardLoading = computed(() => (
    systemLoading.value || serverLoading.value || playerLoading.value || versionLoading.value
  ))
  const isVersionOutdated = computed(() => {
    if (!versionInfo.value.installed) return false
    return versionInfo.value.latest?.up_to_date === false
  })
  const canUpdateGame = computed(() => Boolean(
    versionInfo.value.installed &&
    versionInfo.value.update_supported &&
    versionInfo.value.local?.version
  ))
  const gameUpdateBusy = computed(() => updateStarting.value || Boolean(updateStatus.value?.is_running))

  async function refreshSystem() {
    systemLoading.value = true
    systemError.value = ''
    try {
      const response = await systemApi.getDashboardStatus()
      if (response?.status !== 200 || !response.data) throw new Error(response?.msg || translate('dashboard.feedback.invalidSystemResponse'))
      systemStatus.value = response.data
    } catch (error) {
      systemError.value = error.message || translate('dashboard.feedback.systemLoadFailed')
    } finally {
      systemLoading.value = false
    }
  }

  async function refreshPlayers() {
    playerLoading.value = true
    playerError.value = ''
    playerSummary.value = { total: 0, online: 0, loadedRooms: 0, failedRooms: 0 }
    try {
      if (roomError.value) {
        playerError.value = translate('dashboard.feedback.playersBlocked')
        return
      }
      const results = await Promise.allSettled(
        roomList.value.map(room => playerApi.getPlayerStats(room.name))
      )
      for (const result of results) {
        if (result.status === 'rejected') {
          playerSummary.value.failedRooms += 1
          continue
        }
        const value = result.value?.data || {}
        playerSummary.value.total += Number(value.total_count) || 0
        playerSummary.value.online += Number(value.online_count) || 0
        playerSummary.value.loadedRooms += 1
      }
      if (playerSummary.value.failedRooms > 0) {
        playerError.value = translate('dashboard.feedback.playerRoomsFailed', { count: playerSummary.value.failedRooms })
      }
    } finally {
      playerLoading.value = false
    }
  }

  async function refreshServers() {
    serverLoading.value = true
    serverError.value = ''
    roomError.value = ''
    const [servers, rooms] = await Promise.allSettled([
      systemApi.getTmuxServers(),
      roomApi.getRoomList()
    ])

    if (servers.status === 'fulfilled' && servers.value?.status === 200) {
      serverList.value = Array.isArray(servers.value.data) ? servers.value.data : []
    } else {
      serverList.value = []
      serverError.value = servers.reason?.message || translate('dashboard.feedback.serverLoadFailed')
    }

    if (rooms.status === 'fulfilled' && rooms.value?.status === 200) {
      roomList.value = Array.isArray(rooms.value.data) ? rooms.value.data : []
    } else {
      roomList.value = []
      roomError.value = rooms.reason?.message || translate('dashboard.feedback.roomLoadFailed')
    }

    serverLoading.value = false
    await refreshPlayers()
  }

  async function refreshVersion() {
    versionLoading.value = true
    versionError.value = ''
    try {
      const response = await systemApi.getGameVersion()
      if (response?.status !== 200 || !response.data) throw new Error(response?.msg || translate('dashboard.feedback.invalidVersionResponse'))
      versionInfo.value = response.data
    } catch (error) {
      versionError.value = error.message || translate('dashboard.feedback.versionLoadFailed')
    } finally {
      versionLoading.value = false
    }
  }

  async function refreshDashboard() {
    await Promise.allSettled([refreshSystem(), refreshServers(), refreshVersion()])
    lastRefreshedAt.value = new Date()
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
      toast.success(translate('dashboard.feedback.actionCompleted', { action }))
      await refreshServers()
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
      toast.success(translate('dashboard.feedback.roomStarted', { room: room.name }))
      await refreshServers()
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
      toast.success(translate('dashboard.feedback.cleanupSucceeded'))
      await refreshServers()
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
    try {
      const response = await systemApi.getDstUpdateStatus(jobId)
      updateStatus.value = response.data
      if (updateStatus.value?.is_completed || updateStatus.value?.error) {
        stopUpdatePolling()
        sessionStorage.removeItem('dstUpdateSessionName')
        if (updateStatus.value.is_completed && !updateStatus.value.error) await refreshVersion()
      }
    } catch (error) {
      stopUpdatePolling()
      toast.error(error.message || translate('dashboard.feedback.updateStatusFailed'))
    }
  }

  async function updateGame() {
    if (!canUpdateGame.value) return
    try {
      await confirmAction(translate('dashboard.feedback.updateConfirm'), translate('dashboard.feedback.updateConfirmTitle'), {
        confirmText: translate('dashboard.feedback.updateConfirmButton')
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
      toast.success(translate('dashboard.feedback.updateSubmitted'))
      await pollUpdateStatus(jobId)
      if (!updateStatus.value?.is_completed && !updateStatus.value?.error) {
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
    await pollUpdateStatus(jobId)
    if (!updateStatus.value?.is_completed && !updateStatus.value?.error) {
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
    updateStatus,
    lastRefreshedAt,
    systemLoading,
    serverLoading,
    playerLoading,
    versionLoading,
    systemError,
    serverError,
    roomError,
    playerError,
    versionError,
    runningServerCount,
    totalWorldCount,
    dashboardLoading,
    isVersionOutdated,
    canUpdateGame,
    gameUpdateBusy,
    refreshDashboard,
    refreshSystem,
    refreshServers,
    refreshVersion,
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
  if (!value) return '--'
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(locale, { hour12: false })
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

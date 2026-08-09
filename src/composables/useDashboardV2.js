import { computed, onBeforeUnmount, ref } from 'vue'
import { playerApi, roomApi, systemApi } from '@/api/index'
import { confirmAction } from '@/lib/feedback'
import { formatTimeDiff } from '@/utils/dateUtils'
import { toast } from 'vue-sonner'

const emptyVersion = () => ({
  local: null,
  latest: null,
  installed: false,
  app_id: null,
  install_path: null,
  update_method: null,
  update_supported: false,
  steamcmd_available: false,
  check_error: null,
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
    const localValue = String(versionInfo.value.local?.version || '').trim()
    const latestValue = String(versionInfo.value.latest?.version || '').trim()
    if (!versionInfo.value.installed || !localValue || !latestValue) return false
    if (typeof versionInfo.value.latest?.up_to_date === 'boolean') return !versionInfo.value.latest.up_to_date
    const local = Number(localValue)
    const latest = Number(latestValue)
    return Number.isFinite(local) && Number.isFinite(latest) && local < latest
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
      if (response?.status !== 200 || !response.data) throw new Error(response?.msg || '系统状态响应无效')
      systemStatus.value = response.data
    } catch (error) {
      systemError.value = error.message || '获取系统状态失败'
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
        playerError.value = '房间列表读取失败，无法汇总玩家数据'
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
        playerError.value = `${playerSummary.value.failedRooms} 个房间的玩家数据读取失败`
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
      serverError.value = servers.reason?.message || '获取服务器状态失败'
    }

    if (rooms.status === 'fulfilled' && rooms.value?.status === 200) {
      roomList.value = Array.isArray(rooms.value.data) ? rooms.value.data : []
    } else {
      roomList.value = []
      roomError.value = rooms.reason?.message || '获取房间列表失败'
    }

    serverLoading.value = false
    await refreshPlayers()
  }

  async function refreshVersion() {
    versionLoading.value = true
    versionError.value = ''
    try {
      const response = await systemApi.getGameVersion()
      if (response?.status !== 200 || !response.data) throw new Error(response?.msg || '版本响应无效')
      versionInfo.value = response.data
    } catch (error) {
      versionError.value = error.message || '获取游戏版本失败'
    } finally {
      versionLoading.value = false
    }
  }

  async function refreshDashboard() {
    await Promise.allSettled([refreshSystem(), refreshServers(), refreshVersion()])
    lastRefreshedAt.value = new Date()
  }

  async function handleServerAction(server) {
    const running = server.status === 'running'
    const action = running ? '停止' : '启动'
    try {
      await confirmAction(`确定要${action}“${server.archive_name} / ${server.world_name}”吗？`, '服务器操作确认', {
        confirmText: `确认${action}`
      })
    } catch {
      return
    }

    serverLoading.value = true
    try {
      const input = { room_id: server.room_id, world_id: server.world_id }
      const response = running ? await roomApi.stopRoom(input) : await roomApi.startRoom(input)
      toast.success(response.msg || `${action}完成`)
      await refreshServers()
    } catch (error) {
      toast.error(`${action}失败：${error.message || '未知错误'}`)
    } finally {
      serverLoading.value = false
    }
  }

  async function startRoom(room, worlds) {
    serverLoading.value = true
    try {
      const response = await roomApi.startRoom({
        room_id: room.id,
        world_ids: worlds.map(world => world.id)
      })
      toast.success(response.msg || `房间 ${room.name} 已启动`)
      await refreshServers()
      return true
    } catch (error) {
      toast.error(`启动房间失败：${error.message || '未知错误'}`)
      return false
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
      toast.error(error.message || '获取更新状态失败')
    }
  }

  async function updateGame() {
    if (!canUpdateGame.value) return
    try {
      await confirmAction('确定要更新饥荒服务器吗？更新期间服务器将暂时不可用。', '更新确认', {
        confirmText: '确定更新'
      })
    } catch {
      return
    }

    updateStarting.value = true
    try {
      const response = await systemApi.updateDstServer({ force: true })
      const jobId = response.data?.session_name
      if (!jobId) throw new Error(response.msg || '更新任务响应无效')
      sessionStorage.setItem('dstUpdateSessionName', jobId)
      toast.success(response.msg || '更新任务已提交')
      await pollUpdateStatus(jobId)
      if (!updateStatus.value?.is_completed && !updateStatus.value?.error) {
        updateTimer = setInterval(() => pollUpdateStatus(jobId), 3000)
      }
    } catch (error) {
      toast.error(error.message || '更新游戏失败')
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

export function formatDateTime(value) {
  if (!value) return '--'
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN', { hour12: false })
}

export function formatServerUptime(value) {
  if (!value) return '--'
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? formatTimeDiff(Date.now() - timestamp) : '--'
}

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { roomApi, systemApi } from '@/api/index'
import { systemV2API } from '@/api/v2'
import { confirmAction } from '@/lib/feedback'
import { confirmRoomMaintenance } from '@/lib/maintenanceConfirmation'
import { formatResourceDateTime } from '@/lib/systemResourceMetrics.mjs'
import { isCapacityRiskCanceled, startRoomWithCapacityRisk } from '@/lib/startCapacityRisk'
import {
  canCleanFailedWorld,
  canStartWorld,
  worldPrimaryAction,
  worldStatusMessage
} from '@/lib/worldRuntimeStatus.mjs'
import { i18n, translate } from '@/i18n'
import { useSystemResourceStatus } from '@/composables/useSystemResourceStatus'
import { toast } from 'vue-sonner'
import {
  getManagementScope,
  MANAGEMENT_SCOPE_CHANGED_EVENT,
  managementScopeTargetId
} from '@/lib/managementScope.mjs'
import { RUNTIME_OBSERVATION_UPDATED_EVENT } from '@/lib/runtimeObservationStreams.mjs'

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
  checks: [],
  onboarding: {
    firstStartCompleted: false
  }
})

export function useDashboardV2({ observeRuntime = true } = {}) {
  const {
    status: systemStatus,
    loading: systemLoading,
    error: systemError,
    refreshSystemResourceStatus: refreshSystem
  } = useSystemResourceStatus()
  const serverList = ref([])
  const roomList = ref([])
  const versionInfo = ref(emptyVersion())
  const capabilities = ref(emptyCapabilities())
  const setupReadiness = ref(emptyReadiness())
  const updateStatus = ref(null)
  const lastRefreshedAt = ref(null)
  const onboardingResolved = ref(false)
  const managementScope = ref(getManagementScope())

  const serverLoading = ref(false)
  const versionLoading = ref(false)
  const guidanceLoading = ref(true)
  const updateStarting = ref(false)

  const serverError = ref('')
  const roomError = ref('')
  const versionError = ref('')
  const guidanceError = ref('')
  let updateTimer = null
  let serverRequestSequence = 0
  let versionRequestSequence = 0
  let guidanceRequestSequence = 0
  let updatePollInFlight = false

  const runningServerCount = computed(() => serverList.value.filter(server => server.status === 'running').length)
  const dashboardLoading = computed(() => (
    systemLoading.value || serverLoading.value || versionLoading.value || guidanceLoading.value
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

  async function refreshServers() {
    const sequence = ++serverRequestSequence
    serverLoading.value = true
    serverError.value = ''
    roomError.value = ''
    const overview = await Promise.allSettled([
      roomApi.getScopedRuntimeOverview(managementScopeTargetId(managementScope.value))
    ])
    if (sequence !== serverRequestSequence) return false

    const result = overview[0]
    if (result.status === 'fulfilled' && result.value?.status === 200) {
      serverList.value = Array.isArray(result.value.data?.servers) ? result.value.data.servers : []
      roomList.value = Array.isArray(result.value.data?.rooms) ? result.value.data.rooms : []
    } else {
      const message = result.reason?.message || result.value?.msg || translate('dashboard.feedback.serverLoadFailed')
      serverError.value = message
      roomError.value = message
    }

    if (sequence === serverRequestSequence) serverLoading.value = false
    return result.status === 'fulfilled' && result.value?.status === 200
  }

  function handleManagementScopeChange(event) {
    const previousTargetId = managementScopeTargetId(managementScope.value)
    managementScope.value = event?.detail || getManagementScope()
    if (previousTargetId === managementScopeTargetId(managementScope.value)) return
    serverRequestSequence += 1
    serverList.value = []
    roomList.value = []
    serverError.value = ''
    roomError.value = ''
    void refreshServers()
  }

  function handleRuntimeObservationUpdate() {
    void refreshServers()
  }

  async function refreshVersion(options = {}) {
    const sequence = ++versionRequestSequence
    versionLoading.value = true
    versionError.value = ''
    try {
      const response = await systemApi.getGameVersion(options)
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
    try {
      const results = await Promise.all([refreshSystem(), refreshServers(), refreshVersion(), refreshGuidance()])
      if (results.some(Boolean)) lastRefreshedAt.value = new Date()
      return results.slice(0, 3).every(Boolean)
    } finally {
      onboardingResolved.value = true
    }
  }

  async function handleServerAction(server) {
    const primaryAction = worldPrimaryAction(server, translate)
    if (primaryAction.disabled || !primaryAction.kind) {
      toast.warning(worldStatusMessage(server) || translate('dashboard.feedback.actionUnavailable'))
      return
    }
    const stopping = primaryAction.kind === 'stop'
    const action = primaryAction.label
    let maintenance = {}
    try {
      const confirm = stopping ? (...args) => confirmRoomMaintenance(server.room_id, ...args) : confirmAction
      maintenance = await confirm(translate('dashboard.feedback.actionConfirm', { action, room: server.archive_name, world: server.world_name }), translate('dashboard.feedback.actionConfirmTitle'), {
        confirmButtonText: translate('dashboard.feedback.actionConfirmButton', { action })
      })
    } catch {
      return
    }

    serverLoading.value = true
    try {
      const input = {
        immediate: maintenance?.immediate === true,
        room_id: server.room_id,
        world_id: server.world_id,
        exact_world_ids: Boolean(managementScopeTargetId(managementScope.value))
      }
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
        world_ids: startableWorlds.map(world => world.id),
        exact_world_ids: Boolean(managementScopeTargetId(managementScope.value))
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

  onMounted(() => {
    if (!observeRuntime) return
    window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, handleManagementScopeChange)
    window.addEventListener(RUNTIME_OBSERVATION_UPDATED_EVENT, handleRuntimeObservationUpdate)
  })
  onBeforeUnmount(() => {
    stopUpdatePolling()
    window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, handleManagementScopeChange)
    window.removeEventListener(RUNTIME_OBSERVATION_UPDATED_EVENT, handleRuntimeObservationUpdate)
  })

  return {
    systemStatus,
    serverList,
    roomList,
    versionInfo,
    capabilities,
    setupReadiness,
    onboardingResolved,
    updateStatus,
    lastRefreshedAt,
    systemLoading,
    serverLoading,
    versionLoading,
    guidanceLoading,
    systemError,
    serverError,
    roomError,
    versionError,
    guidanceError,
    runningServerCount,
    dashboardLoading,
    isVersionOutdated,
    canUpdateGame,
    canInstallGame,
    gameUpdateBusy,
    refreshDashboard,
    refreshSystem,
    refreshServers,
    refreshVersion,
    refreshGuidance,
    handleServerAction,
    cleanupFailedServer,
    startRoom,
    updateGame,
    resumeUpdatePolling
  }
}

export {
  formatDecimal,
  formatDisk,
  formatMemory,
  formatSystemUptime,
  hasMetric,
  loadPercentage,
  percentage
} from '@/lib/systemResourceMetrics.mjs'

export function formatDateTime(value, locale = i18n.global.locale.value) {
  return formatResourceDateTime(value, locale)
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

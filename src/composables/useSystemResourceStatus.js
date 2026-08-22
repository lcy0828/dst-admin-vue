import { ref } from 'vue'
import { systemApi } from '@/api/index'
import { translate } from '@/i18n'

export const SYSTEM_RESOURCE_REFRESH_INTERVAL_MS = 5_000
export const SYSTEM_RESOURCE_DETAIL_REFRESH_INTERVAL_MS = 1_000

const status = ref({})
const loading = ref(false)
const error = ref('')
const lastUpdatedAt = ref(null)

let activePollingConsumers = 0
let detailedPollingConsumers = 0
let refreshPromise = null
let refreshTimer = null
let visibilityListenerAttached = false

async function refreshSystemResourceStatus(options = {}) {
  if (refreshPromise) return refreshPromise

  const silent = options?.silent === true
  if (!silent) loading.value = true
  error.value = ''
  const request = (async () => {
    try {
      const response = await systemApi.getDashboardStatus()
      if (response?.status !== 200 || !response.data) {
        throw new Error(response?.msg || translate('dashboard.feedback.invalidSystemResponse'))
      }
      status.value = response.data
      lastUpdatedAt.value = new Date()
      return true
    } catch (requestError) {
      error.value = requestError.message || translate('dashboard.feedback.systemLoadFailed')
      return false
    }
  })()
  refreshPromise = request

  try {
    return await request
  } finally {
    if (refreshPromise === request) {
      if (!silent) loading.value = false
      refreshPromise = null
    }
  }
}

function stopRefreshTimer() {
  if (refreshTimer && typeof window !== 'undefined') window.clearInterval(refreshTimer)
  refreshTimer = null
}

function startRefreshTimer() {
  stopRefreshTimer()
  if (activePollingConsumers <= 0 || typeof window === 'undefined') return
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  const interval = detailedPollingConsumers > 0
    ? SYSTEM_RESOURCE_DETAIL_REFRESH_INTERVAL_MS
    : SYSTEM_RESOURCE_REFRESH_INTERVAL_MS
  refreshTimer = window.setInterval(
    () => refreshSystemResourceStatus({ silent: true }),
    interval
  )
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    stopRefreshTimer()
    return
  }
  refreshSystemResourceStatus({ silent: true })
  startRefreshTimer()
}

function startSystemResourcePolling() {
  activePollingConsumers += 1
  if (activePollingConsumers > 1) return

  if (typeof document !== 'undefined' && !visibilityListenerAttached) {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    visibilityListenerAttached = true
  }
  refreshSystemResourceStatus({ silent: true })
  startRefreshTimer()
}

function stopSystemResourcePolling() {
  activePollingConsumers = Math.max(0, activePollingConsumers - 1)
  if (activePollingConsumers > 0) return

  detailedPollingConsumers = 0
  stopRefreshTimer()
  if (typeof document !== 'undefined' && visibilityListenerAttached) {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    visibilityListenerAttached = false
  }
}

function startSystemResourceDetailedPolling() {
  detailedPollingConsumers += 1
  if (detailedPollingConsumers > 1) return

  refreshSystemResourceStatus({ silent: true })
  startRefreshTimer()
}

function stopSystemResourceDetailedPolling() {
  detailedPollingConsumers = Math.max(0, detailedPollingConsumers - 1)
  if (detailedPollingConsumers > 0) return
  startRefreshTimer()
}

export function useSystemResourceStatus() {
  return {
    status,
    loading,
    error,
    lastUpdatedAt,
    refreshSystemResourceStatus,
    startSystemResourcePolling,
    stopSystemResourcePolling,
    startSystemResourceDetailedPolling,
    stopSystemResourceDetailedPolling
  }
}

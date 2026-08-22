import { ref } from 'vue'
import { systemApi } from '@/api/index'
import { translate } from '@/i18n'

export const SYSTEM_RESOURCE_REFRESH_INTERVAL_MS = 10_000

const status = ref({})
const loading = ref(false)
const error = ref('')
const lastUpdatedAt = ref(null)

let activePollingConsumers = 0
let refreshPromise = null
let refreshTimer = null
let visibilityListenerAttached = false

async function refreshSystemResourceStatus() {
  if (refreshPromise) return refreshPromise

  loading.value = true
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
      loading.value = false
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
  refreshTimer = window.setInterval(refreshSystemResourceStatus, SYSTEM_RESOURCE_REFRESH_INTERVAL_MS)
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    stopRefreshTimer()
    return
  }
  refreshSystemResourceStatus()
  startRefreshTimer()
}

function startSystemResourcePolling() {
  activePollingConsumers += 1
  if (activePollingConsumers > 1) return

  if (typeof document !== 'undefined' && !visibilityListenerAttached) {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    visibilityListenerAttached = true
  }
  refreshSystemResourceStatus()
  startRefreshTimer()
}

function stopSystemResourcePolling() {
  activePollingConsumers = Math.max(0, activePollingConsumers - 1)
  if (activePollingConsumers > 0) return

  stopRefreshTimer()
  if (typeof document !== 'undefined' && visibilityListenerAttached) {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    visibilityListenerAttached = false
  }
}

export function useSystemResourceStatus() {
  return {
    status,
    loading,
    error,
    lastUpdatedAt,
    refreshSystemResourceStatus,
    startSystemResourcePolling,
    stopSystemResourcePolling
  }
}

import { ref } from 'vue'
import { systemApi } from '@/api/index'
import { translate } from '@/i18n'

export const SYSTEM_RESOURCE_REFRESH_INTERVAL_MS = 5_000
export const SYSTEM_RESOURCE_REFRESH_INTERVAL_OPTIONS_MS = Object.freeze([1_000, 5_000, 10_000, 30_000])
export const SYSTEM_RESOURCE_REFRESH_INTERVAL_STORAGE_KEY = 'dst-admin-system-resource-refresh-interval'

const status = ref({})
const loading = ref(false)
const error = ref('')
const lastUpdatedAt = ref(null)
const refreshIntervalMs = ref(readStoredRefreshInterval())

let activePollingConsumers = 0
let refreshPromise = null
let refreshTimer = null
let visibilityListenerAttached = false

function normalizeRefreshInterval(value) {
  const interval = Number(value)
  return SYSTEM_RESOURCE_REFRESH_INTERVAL_OPTIONS_MS.includes(interval)
    ? interval
    : SYSTEM_RESOURCE_REFRESH_INTERVAL_MS
}

function readStoredRefreshInterval() {
  if (typeof localStorage === 'undefined') return SYSTEM_RESOURCE_REFRESH_INTERVAL_MS
  try {
    return normalizeRefreshInterval(localStorage.getItem(SYSTEM_RESOURCE_REFRESH_INTERVAL_STORAGE_KEY))
  } catch {
    return SYSTEM_RESOURCE_REFRESH_INTERVAL_MS
  }
}

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
  refreshTimer = window.setInterval(
    () => refreshSystemResourceStatus({ silent: true }),
    refreshIntervalMs.value
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

  stopRefreshTimer()
  if (typeof document !== 'undefined' && visibilityListenerAttached) {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    visibilityListenerAttached = false
  }
}

function setSystemResourceRefreshInterval(value) {
  const interval = normalizeRefreshInterval(value)
  if (interval === refreshIntervalMs.value) return
  refreshIntervalMs.value = interval
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SYSTEM_RESOURCE_REFRESH_INTERVAL_STORAGE_KEY, String(interval))
    } catch {
      // A denied storage write must not prevent the in-memory preference from applying.
    }
  }
  refreshSystemResourceStatus({ silent: true })
  startRefreshTimer()
}

export function useSystemResourceStatus() {
  return {
    status,
    loading,
    error,
    lastUpdatedAt,
    refreshIntervalMs,
    refreshSystemResourceStatus,
    startSystemResourcePolling,
    stopSystemResourcePolling,
    setSystemResourceRefreshInterval
  }
}

import { ref, watch } from 'vue'
import { systemV2API } from '@/api/v2'
import { useSystemResourceRefreshInterval } from '@/composables/useDashboardRefreshIntervals'
import { translate } from '@/i18n'
import {
  getManagementScope,
  MANAGEMENT_SCOPE_CHANGED_EVENT,
  MANAGEMENT_SCOPE_TARGET,
  managementScopeTargetId
} from '@/lib/managementScope.mjs'
import { fleetNodeResourceStatus, nodeResourceStatus } from '@/lib/systemResourceMetrics.mjs'

const status = ref({})
const loading = ref(false)
const error = ref('')
const lastUpdatedAt = ref(null)
const scope = ref(getManagementScope())
const { refreshIntervalMs } = useSystemResourceRefreshInterval()
const INITIAL_POLLING_GRACE_MS = 2_000

let activePollingConsumers = 0
let refreshPromise = null
let refreshPromiseScope = ''
let refreshTimer = null
let visibilityListenerAttached = false
let scopeListenerAttached = false
let requestSequence = 0

async function loadScopedSystemStatus(scopeSnapshot) {
  const targetId = scopeSnapshot.kind === MANAGEMENT_SCOPE_TARGET ? String(scopeSnapshot.targetId || '').trim() : ''
  const snapshot = await systemV2API.resources(targetId, { refresh: true })
  if (targetId) {
    const node = snapshot?.items?.[0]
    if (!node) throw new Error(translate('dashboard.feedback.invalidSystemResponse'))
    return nodeResourceStatus(node, scopeSnapshot)
  }
  return fleetNodeResourceStatus(snapshot, translate('dashboard.resources.controller'))
}

async function refreshSystemResourceStatus(options = {}) {
  const scopeSnapshot = getManagementScope()
  const scopeKey = `${scopeSnapshot.kind}:${scopeSnapshot.targetId}`
  const silent = options?.silent === true
  if (!silent) loading.value = true
  if (refreshPromise && refreshPromiseScope === scopeKey) return refreshPromise

  error.value = ''
  const sequence = ++requestSequence
  const request = (async () => {
    try {
      const value = await loadScopedSystemStatus(scopeSnapshot)
      if (sequence !== requestSequence) return false
      status.value = value
      lastUpdatedAt.value = new Date()
      return true
    } catch (requestError) {
      if (sequence !== requestSequence) return false
      error.value = requestError.message || translate('dashboard.feedback.systemLoadFailed')
      return false
    }
  })()
  refreshPromise = request
  refreshPromiseScope = scopeKey

  try {
    return await request
  } finally {
    if (refreshPromise === request) {
      loading.value = false
      refreshPromise = null
      refreshPromiseScope = ''
    }
  }
}

function handleManagementScopeChange(event) {
  const previousTargetId = managementScopeTargetId(scope.value)
  scope.value = event?.detail || getManagementScope()
  if (previousTargetId === managementScopeTargetId(scope.value)) return
  requestSequence += 1
  refreshPromise = null
  refreshPromiseScope = ''
  status.value = {}
  error.value = ''
  void refreshSystemResourceStatus()
  startRefreshTimer()
}

function stopRefreshTimer() {
  if (refreshTimer && typeof window !== 'undefined') window.clearTimeout(refreshTimer)
  refreshTimer = null
}

function startRefreshTimer(delayMs = refreshIntervalMs.value) {
  stopRefreshTimer()
  if (activePollingConsumers <= 0 || typeof window === 'undefined') return
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  refreshTimer = window.setTimeout(async () => {
    refreshTimer = null
    await refreshSystemResourceStatus({ silent: true })
    startRefreshTimer()
  }, delayMs)
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    stopRefreshTimer()
    return
  }
  refreshSystemResourceStatus({ silent: true })
  startRefreshTimer(Math.max(INITIAL_POLLING_GRACE_MS, refreshIntervalMs.value))
}

function startSystemResourcePolling() {
  activePollingConsumers += 1
  if (activePollingConsumers > 1) return

  if (typeof document !== 'undefined' && !visibilityListenerAttached) {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    visibilityListenerAttached = true
  }
  if (typeof window !== 'undefined' && !scopeListenerAttached) {
    window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, handleManagementScopeChange)
    scopeListenerAttached = true
  }
  refreshSystemResourceStatus({ silent: true })
  startRefreshTimer(Math.max(INITIAL_POLLING_GRACE_MS, refreshIntervalMs.value))
}

function stopSystemResourcePolling() {
  activePollingConsumers = Math.max(0, activePollingConsumers - 1)
  if (activePollingConsumers > 0) return

  stopRefreshTimer()
  if (typeof document !== 'undefined' && visibilityListenerAttached) {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    visibilityListenerAttached = false
  }
  if (typeof window !== 'undefined' && scopeListenerAttached) {
    window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, handleManagementScopeChange)
    scopeListenerAttached = false
  }
}

watch(refreshIntervalMs, () => {
  if (activePollingConsumers <= 0) return
  refreshSystemResourceStatus({ silent: true })
  startRefreshTimer()
})

export function useSystemResourceStatus() {
  return {
    status,
    loading,
    error,
    lastUpdatedAt,
    scope,
    refreshIntervalMs,
    refreshSystemResourceStatus,
    startSystemResourcePolling,
    stopSystemResourcePolling
  }
}

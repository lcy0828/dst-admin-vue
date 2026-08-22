import { ref } from 'vue'

export const DASHBOARD_REFRESH_INTERVAL_MS = 5_000
export const DASHBOARD_REFRESH_INTERVAL_OPTIONS_MS = Object.freeze([1_000, 5_000, 10_000, 30_000])
export const DASHBOARD_REFRESH_INTERVAL_STORAGE_KEY = 'dst-admin-dashboard-refresh-interval'

const LEGACY_STORAGE_KEY = 'dst-admin-system-resource-refresh-interval'

function normalizeRefreshInterval(value) {
  const interval = Number(value)
  return DASHBOARD_REFRESH_INTERVAL_OPTIONS_MS.includes(interval)
    ? interval
    : DASHBOARD_REFRESH_INTERVAL_MS
}

function readStoredRefreshInterval() {
  if (typeof localStorage === 'undefined') return DASHBOARD_REFRESH_INTERVAL_MS
  try {
    return normalizeRefreshInterval(
      localStorage.getItem(DASHBOARD_REFRESH_INTERVAL_STORAGE_KEY)
        || localStorage.getItem(LEGACY_STORAGE_KEY)
    )
  } catch {
    return DASHBOARD_REFRESH_INTERVAL_MS
  }
}

const refreshIntervalMs = ref(readStoredRefreshInterval())

function setDashboardRefreshInterval(value) {
  const interval = normalizeRefreshInterval(value)
  if (interval === refreshIntervalMs.value) return

  refreshIntervalMs.value = interval
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(DASHBOARD_REFRESH_INTERVAL_STORAGE_KEY, String(interval))
  } catch {
    // Keep the in-memory preference when browser storage is unavailable.
  }
}

export function useDashboardRefreshInterval() {
  return {
    refreshIntervalMs,
    setDashboardRefreshInterval
  }
}

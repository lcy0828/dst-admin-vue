import { ref } from 'vue'

export const SYSTEM_RESOURCE_REFRESH_INTERVAL_MS = 5_000
export const SYSTEM_RESOURCE_REFRESH_INTERVAL_OPTIONS_MS = Object.freeze([1_000, 2_000, 5_000, 10_000])
export const SYSTEM_RESOURCE_REFRESH_INTERVAL_STORAGE_KEY = 'dst-admin-system-resource-refresh-interval'

export const ROOM_REFRESH_INTERVAL_MS = 5_000
export const ROOM_REFRESH_INTERVAL_OPTIONS_MS = Object.freeze([5_000, 10_000, 30_000, 60_000])
export const ROOM_REFRESH_INTERVAL_STORAGE_KEY = 'dst-admin-room-refresh-interval'

const SHARED_LEGACY_STORAGE_KEY = 'dst-admin-dashboard-refresh-interval'

function createRefreshIntervalPreference({ defaultMs, optionsMs, storageKey, legacyStorageKeys = [] }) {
  const normalize = value => {
    const interval = Number(value)
    return optionsMs.includes(interval) ? interval : null
  }

  const readStored = () => {
    if (typeof localStorage === 'undefined') return defaultMs
    try {
      for (const key of [storageKey, ...legacyStorageKeys]) {
        const interval = normalize(localStorage.getItem(key))
        if (interval !== null) return interval
      }
    } catch {
      return defaultMs
    }
    return defaultMs
  }

  const intervalMs = ref(readStored())

  const setInterval = value => {
    const interval = normalize(value) ?? defaultMs
    if (interval === intervalMs.value) return

    intervalMs.value = interval
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(storageKey, String(interval))
    } catch {
      // Keep the in-memory preference when browser storage is unavailable.
    }
  }

  return { intervalMs, setInterval }
}

const systemResourcePreference = createRefreshIntervalPreference({
  defaultMs: SYSTEM_RESOURCE_REFRESH_INTERVAL_MS,
  optionsMs: SYSTEM_RESOURCE_REFRESH_INTERVAL_OPTIONS_MS,
  storageKey: SYSTEM_RESOURCE_REFRESH_INTERVAL_STORAGE_KEY,
  legacyStorageKeys: [SHARED_LEGACY_STORAGE_KEY]
})

const roomPreference = createRefreshIntervalPreference({
  defaultMs: ROOM_REFRESH_INTERVAL_MS,
  optionsMs: ROOM_REFRESH_INTERVAL_OPTIONS_MS,
  storageKey: ROOM_REFRESH_INTERVAL_STORAGE_KEY,
  legacyStorageKeys: [SHARED_LEGACY_STORAGE_KEY]
})

export function useSystemResourceRefreshInterval() {
  return {
    refreshIntervalMs: systemResourcePreference.intervalMs,
    setRefreshInterval: systemResourcePreference.setInterval
  }
}

export function useRoomRefreshInterval() {
  return {
    refreshIntervalMs: roomPreference.intervalMs,
    setRefreshInterval: roomPreference.setInterval
  }
}

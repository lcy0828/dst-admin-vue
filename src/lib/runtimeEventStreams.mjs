/* global globalThis */

const STREAM_EVENTS = Object.freeze([
  'runtime.cursor',
  'runtime.event',
  'runtime.reset',
  'runtime.gap',
  'runtime.error'
])

const CURSOR_EVENTS = new Set(['runtime.cursor', 'runtime.event'])

const defaultEventSourceFactory = typeof globalThis.EventSource === 'function'
  ? (url, options) => new globalThis.EventSource(url, options)
  : null

function defaultStorage() {
  try {
    return globalThis.sessionStorage || null
  } catch {
    return null
  }
}

function storageKey(roomId, worldId) {
  return `dst-admin:runtime-event-cursor:${roomId}:${worldId}`
}

function readCursor(storage, roomId, worldId) {
  if (!storage) return ''
  try {
    return storage.getItem(storageKey(roomId, worldId)) || ''
  } catch {
    return ''
  }
}

function writeCursor(storage, roomId, worldId, cursor) {
  if (!storage || !cursor) return
  try {
    storage.setItem(storageKey(roomId, worldId), cursor)
  } catch {
    // Private browsing or a full storage quota must not break live updates.
  }
}

export function runtimeStreamOverall(states) {
  if (!states.length) return 'unavailable'
  const live = states.filter(state => state === 'live').length
  if (live === states.length) return 'live'
  if (live > 0) return 'partial'
  if (states.some(state => state === 'connecting')) return 'connecting'
  return 'unavailable'
}

export function createRuntimeEventStreamManager({
  buildURL,
  eventSourceFactory = defaultEventSourceFactory,
  storage = defaultStorage(),
  schedule = (callback, delay) => setTimeout(callback, delay),
  cancelSchedule = handle => clearTimeout(handle),
  onActivity = () => {},
  onState = () => {}
}) {
  if (typeof buildURL !== 'function') throw new TypeError('buildURL is required')

  let roomId = ''
  let disposed = false
  let active = true
  const entries = new Map()

  function publishState() {
    const worlds = Object.fromEntries([...entries].map(([worldId, entry]) => [worldId, entry.state]))
    onState({ overall: runtimeStreamOverall(Object.values(worlds)), worlds })
  }

  function stopEntry(entry) {
    if (entry.retryHandle !== null) cancelSchedule(entry.retryHandle)
    entry.retryHandle = null
    if (entry.source) entry.source.close()
    entry.source = null
  }

  function retryDelay(attempt) {
    return Math.min(15000, 1000 * (2 ** Math.min(attempt, 4)))
  }

  function openEntry(entry) {
    if (disposed || !active || entries.get(entry.worldId) !== entry || !roomId) return
    entry.retryHandle = null
    entry.state = 'connecting'
    publishState()

    let source
    try {
      source = eventSourceFactory(buildURL(roomId, entry.worldId, entry.cursor), { withCredentials: true })
    } catch {
      entry.state = 'unavailable'
      entry.attempt += 1
      publishState()
      entry.retryHandle = schedule(() => openEntry(entry), retryDelay(entry.attempt))
      return
    }

    entry.source = source
    source.onopen = () => {
      if (entry.source !== source) return
      entry.attempt = 0
      entry.state = 'live'
      publishState()
    }

    for (const eventName of STREAM_EVENTS) {
      source.addEventListener(eventName, event => {
        if (entry.source !== source) return
        const deliveredCursor = String(event.lastEventId || '').trim()
        if (CURSOR_EVENTS.has(eventName) && deliveredCursor) {
          entry.cursor = deliveredCursor
          writeCursor(storage, roomId, entry.worldId, deliveredCursor)
        }
        entry.state = 'live'
        publishState()
        onActivity({ roomId, worldId: entry.worldId, eventName, event, cursor: entry.cursor })
      })
    }

    source.onerror = () => {
      if (entry.source !== source) return
      source.close()
      entry.source = null
      entry.state = 'connecting'
      entry.attempt += 1
      publishState()
      entry.retryHandle = schedule(() => openEntry(entry), retryDelay(entry.attempt))
    }
  }

  function sync(nextRoomId, worldIds = []) {
    if (disposed) return
    const normalizedRoomId = String(nextRoomId || '')
    const nextWorldIds = [...new Set(worldIds.map(value => String(value || '')).filter(Boolean))]

    if (roomId !== normalizedRoomId) {
      for (const entry of entries.values()) stopEntry(entry)
      entries.clear()
      roomId = normalizedRoomId
    }

    const wanted = new Set(nextWorldIds)
    for (const [worldId, entry] of entries) {
      if (wanted.has(worldId)) continue
      stopEntry(entry)
      entries.delete(worldId)
    }

    if (!roomId || !active || typeof eventSourceFactory !== 'function') {
      publishState()
      return
    }

    for (const worldId of nextWorldIds) {
      if (entries.has(worldId)) continue
      const entry = {
        worldId,
        cursor: readCursor(storage, roomId, worldId),
        source: null,
        retryHandle: null,
        attempt: 0,
        state: 'connecting'
      }
      entries.set(worldId, entry)
      openEntry(entry)
    }
    publishState()
  }

  function setActive(nextActive) {
    if (disposed) return
    const normalized = Boolean(nextActive)
    if (active === normalized) return
    active = normalized
    if (!active) {
      for (const entry of entries.values()) {
        stopEntry(entry)
        entry.state = 'connecting'
      }
      publishState()
      return
    }
    for (const entry of entries.values()) {
      if (!entry.source && entry.retryHandle === null) openEntry(entry)
    }
    publishState()
  }

  function close() {
    disposed = true
    for (const entry of entries.values()) stopEntry(entry)
    entries.clear()
  }

  function snapshot() {
    return Object.fromEntries([...entries].map(([worldId, entry]) => [worldId, {
      state: entry.state,
      cursor: entry.cursor,
      attempt: entry.attempt
    }]))
  }

  return { close, setActive, snapshot, sync }
}

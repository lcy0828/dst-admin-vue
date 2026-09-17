/* global globalThis */

export const RUNTIME_OBSERVATION_UPDATED_EVENT = 'runtime-observation-updated'

const OBSERVATION_EVENTS = Object.freeze([
  'observation.snapshot',
  'observation.refreshing',
  'observation.refreshed',
  'inventory.updated',
  'metrics.updated',
  'topology.changed',
  'observation.error'
])

export function runtimeObservationChangesViews(eventName) {
  return ['inventory.updated', 'topology.changed', 'observation.error'].includes(eventName)
}

function normalizedScope(scope = {}) {
  return {
    targetId: String(scope.targetId || '').trim(),
    roomId: String(scope.roomId || '').trim()
  }
}

function scopeKey(scope) {
  return `${scope.targetId}\u0000${scope.roomId}`
}

function parseEvent(eventName, event) {
  let data = null
  try {
    data = event?.data ? JSON.parse(event.data) : null
  } catch {
    data = null
  }
  return { eventName, data, event }
}

export function createRuntimeObservationStreamRegistry({
  buildURL,
  eventSourceFactory = typeof globalThis.EventSource === 'function'
    ? (url, options) => new globalThis.EventSource(url, options)
    : null,
  schedule = (callback, delay) => setTimeout(callback, delay),
  cancelSchedule = handle => clearTimeout(handle),
  visibilityDocument = typeof document === 'undefined' ? null : document,
  hiddenGraceMs = 0
} = {}) {
  if (typeof buildURL !== 'function') throw new TypeError('buildURL is required')
  const entries = new Map()
  let hiddenTimer = null
  let hidden = visibilityDocument?.visibilityState === 'hidden'

  function notify(entry, method, payload) {
    for (const subscriber of entry.subscribers) subscriber?.[method]?.(payload)
  }

  function stop(entry) {
    if (entry.retryTimer !== null) cancelSchedule(entry.retryTimer)
    entry.retryTimer = null
    if (entry.source) entry.source.close()
    entry.source = null
  }

  function retryDelay(attempt) {
    return Math.min(30_000, 1000 * (2 ** Math.min(attempt, 5)))
  }

  function open(entry) {
    if (hidden || entry.source || entry.subscribers.size === 0 || typeof eventSourceFactory !== 'function') return
    entry.state = 'connecting'
    notify(entry, 'onState', entry.state)
    let source
    try {
      source = eventSourceFactory(buildURL(entry.scope), { withCredentials: true })
    } catch {
      entry.state = 'unavailable'
      entry.attempt += 1
      notify(entry, 'onState', entry.state)
      entry.retryTimer = schedule(() => {
        entry.retryTimer = null
        open(entry)
      }, retryDelay(entry.attempt))
      return
    }
    entry.source = source
    source.onopen = () => {
      if (entry.source !== source) return
      entry.attempt = 0
      entry.state = 'live'
      notify(entry, 'onState', entry.state)
    }
    for (const eventName of OBSERVATION_EVENTS) {
      source.addEventListener(eventName, event => {
        if (entry.source !== source) return
        entry.state = 'live'
        notify(entry, 'onState', entry.state)
        notify(entry, 'onEvent', parseEvent(eventName, event))
      })
    }
    source.onerror = () => {
      if (entry.source !== source) return
      source.close()
      entry.source = null
      entry.state = 'connecting'
      entry.attempt += 1
      notify(entry, 'onState', entry.state)
      entry.retryTimer = schedule(() => {
        entry.retryTimer = null
        open(entry)
      }, retryDelay(entry.attempt))
    }
  }

  function subscribe(inputScope, subscriber = {}) {
    const scope = normalizedScope(inputScope)
    const key = scopeKey(scope)
    let entry = entries.get(key)
    if (!entry) {
      entry = { scope, subscribers: new Set(), source: null, retryTimer: null, attempt: 0, state: 'connecting' }
      entries.set(key, entry)
    }
    entry.subscribers.add(subscriber)
    subscriber.onState?.(entry.state)
    open(entry)
    let released = false
    return () => {
      if (released) return
      released = true
      entry.subscribers.delete(subscriber)
      if (entry.subscribers.size > 0) return
      stop(entry)
      entries.delete(key)
    }
  }

  function pauseHiddenEntries() {
    if (!hidden) return
    for (const entry of entries.values()) {
      stop(entry)
      entry.state = 'paused'
      notify(entry, 'onState', entry.state)
    }
  }

  function handleVisibilityChange() {
    hidden = visibilityDocument?.visibilityState === 'hidden'
    if (hiddenTimer !== null) cancelSchedule(hiddenTimer)
    hiddenTimer = null
    if (hidden) {
      if (hiddenGraceMs <= 0) {
        pauseHiddenEntries()
        return
      }
      hiddenTimer = schedule(() => {
        hiddenTimer = null
        pauseHiddenEntries()
      }, hiddenGraceMs)
      return
    }
    for (const entry of entries.values()) open(entry)
  }

  visibilityDocument?.addEventListener?.('visibilitychange', handleVisibilityChange)

  function close() {
    if (hiddenTimer !== null) cancelSchedule(hiddenTimer)
    hiddenTimer = null
    visibilityDocument?.removeEventListener?.('visibilitychange', handleVisibilityChange)
    for (const entry of entries.values()) stop(entry)
    entries.clear()
  }

  function snapshot() {
    return [...entries.values()].map(entry => ({
      scope: { ...entry.scope }, state: entry.state, subscribers: entry.subscribers.size, attempt: entry.attempt
    }))
  }

  return { close, snapshot, subscribe }
}

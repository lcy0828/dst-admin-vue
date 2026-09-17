import test from 'node:test'
import assert from 'node:assert/strict'

import { createRuntimeObservationStreamRegistry, runtimeObservationChangesViews } from '../src/lib/runtimeObservationStreams.mjs'

class FakeEventSource {
  constructor(url) {
    this.url = url
    this.listeners = new Map()
    this.closed = false
  }

  addEventListener(name, listener) {
    this.listeners.set(name, listener)
  }

  emit(name, data) {
    this.listeners.get(name)?.({ data: JSON.stringify(data) })
  }

  close() {
    this.closed = true
  }
}

test('runtime observation registry shares one stream per management scope', () => {
  const sources = []
  const registry = createRuntimeObservationStreamRegistry({
    buildURL: scope => `/observations?targetId=${scope.targetId}`,
    eventSourceFactory: url => {
      const source = new FakeEventSource(url)
      sources.push(source)
      return source
    },
    visibilityDocument: null
  })
  const first = []
  const second = []
  const releaseFirst = registry.subscribe({ targetId: 'agent:node' }, { onEvent: value => first.push(value) })
  const releaseSecond = registry.subscribe({ targetId: 'agent:node' }, { onEvent: value => second.push(value) })

  assert.equal(sources.length, 1)
  assert.equal(registry.snapshot()[0].subscribers, 2)
  sources[0].emit('inventory.updated', { observation: { targetId: 'agent:node', state: 'fresh' } })
  assert.equal(first.length, 1)
  assert.equal(second.length, 1)

  releaseFirst()
  assert.equal(sources[0].closed, false)
  releaseSecond()
  assert.equal(sources[0].closed, true)
  assert.deepEqual(registry.snapshot(), [])
})

test('runtime observation registry pauses after the hidden grace period and resumes visibly', () => {
  const listeners = new Map()
  const visibilityDocument = {
    visibilityState: 'visible',
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: name => listeners.delete(name)
  }
  const scheduled = []
  const sources = []
  const registry = createRuntimeObservationStreamRegistry({
    buildURL: () => '/observations',
    eventSourceFactory: url => {
      const source = new FakeEventSource(url)
      sources.push(source)
      return source
    },
    visibilityDocument,
    schedule: callback => {
      scheduled.push(callback)
      return scheduled.length - 1
    },
    cancelSchedule: handle => { scheduled[handle] = null },
    hiddenGraceMs: 60_000
  })
  registry.subscribe({}, {})
  visibilityDocument.visibilityState = 'hidden'
  listeners.get('visibilitychange')()
  assert.equal(sources[0].closed, false)
  scheduled.find(Boolean)()
  assert.equal(sources[0].closed, true)

  visibilityDocument.visibilityState = 'visible'
  listeners.get('visibilitychange')()
  assert.equal(sources.length, 2)
  registry.close()
})

test('runtime observation registry delegates the hidden grace period to the backend by default', () => {
  const listeners = new Map()
  const visibilityDocument = {
    visibilityState: 'visible',
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: name => listeners.delete(name)
  }
  const sources = []
  const registry = createRuntimeObservationStreamRegistry({
    buildURL: () => '/observations',
    eventSourceFactory: url => {
      const source = new FakeEventSource(url)
      sources.push(source)
      return source
    },
    visibilityDocument
  })
  registry.subscribe({}, {})

  visibilityDocument.visibilityState = 'hidden'
  listeners.get('visibilitychange')()
  assert.equal(sources[0].closed, true)
  assert.equal(registry.snapshot()[0].state, 'paused')

  visibilityDocument.visibilityState = 'visible'
  listeners.get('visibilitychange')()
  assert.equal(sources.length, 2)
  registry.close()
})

test('completed unchanged observations update freshness without reloading runtime views', () => {
  const source = new FakeEventSource('/observations')
  const registry = createRuntimeObservationStreamRegistry({
    buildURL: () => '/observations', eventSourceFactory: () => source, visibilityDocument: null
  })
  const received = []
  const reloads = []
  registry.subscribe({}, { onEvent: event => {
    received.push(event)
    if (runtimeObservationChangesViews(event.eventName)) reloads.push(event)
  } })
  source.emit('inventory.updated', { observation: { targetId: 'local', state: 'fresh' } })
  for (let index = 0; index < 5; index += 1) {
    source.emit('observation.refreshing', { observation: { targetId: 'local', state: 'refreshing' } })
    source.emit('observation.refreshed', { observation: { targetId: 'local', state: 'fresh' } })
  }
  assert.equal(received.length, 11)
  assert.equal(received.at(-1).data.observation.state, 'fresh')
  assert.equal(reloads.length, 1)
  source.emit('observation.error', { observation: { targetId: 'local', state: 'error', error: 'offline' } })
  assert.equal(reloads.length, 2)
  source.emit('observation.refreshed', { observation: { targetId: 'local', state: 'error', error: 'offline' } })
  assert.equal(received.at(-1).data.observation.error, 'offline')
  assert.equal(reloads.length, 2)
  registry.close()
})

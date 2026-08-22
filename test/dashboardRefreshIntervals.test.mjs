import assert from 'node:assert/strict'
import test from 'node:test'

import {
  useRoomRefreshInterval,
  useSystemResourceRefreshInterval
} from '../src/composables/useDashboardRefreshIntervals.js'

test('system and room refresh preferences remain independent', () => {
  const system = useSystemResourceRefreshInterval()
  const room = useRoomRefreshInterval()

  assert.equal(system.refreshIntervalMs.value, 5_000)
  assert.equal(room.refreshIntervalMs.value, 5_000)

  system.setRefreshInterval(1_000)
  assert.equal(system.refreshIntervalMs.value, 1_000)
  assert.equal(room.refreshIntervalMs.value, 5_000)

  room.setRefreshInterval(30_000)
  assert.equal(system.refreshIntervalMs.value, 1_000)
  assert.equal(room.refreshIntervalMs.value, 30_000)

  system.setRefreshInterval(5_000)
  room.setRefreshInterval(5_000)
})

test('unsupported intervals fall back to safe category defaults', () => {
  const system = useSystemResourceRefreshInterval()
  const room = useRoomRefreshInterval()

  system.setRefreshInterval(30_000)
  room.setRefreshInterval(1_000)

  assert.equal(system.refreshIntervalMs.value, 5_000)
  assert.equal(room.refreshIntervalMs.value, 5_000)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { playerHistoryTime, playerLastObservation, playerListPresenceTime, playerWorldConfirmed } from '../src/lib/playerHistoryPresentation.mjs'

test('short connection events are distinguished from telemetry sample times', () => {
  const sample = '2026-09-11T02:44:00Z'
  const disconnected = '2026-09-11T02:47:37Z'
  assert.deepEqual(playerLastObservation({ last_seen: sample, last_seen_source: 'customcommands' }), { key: 'lastSampledAt', time: sample })
  assert.deepEqual(playerLastObservation({ last_seen: disconnected, last_seen_source: 'native-log', last_disconnected_at: disconnected }), { key: 'lastDisconnectedAt', time: disconnected })
  assert.equal(playerHistoryTime('0001-01-01T00:00:00Z'), null)
  assert.equal(playerLastObservation({ last_seen: '0001-01-01T00:00:00Z' }).key, 'lastSeenUnknown')
})

test('cluster-wide selecting clients cannot claim a confirmed Caves location', () => {
  const player = { world_name: 'Caves', gameplay_state: 'selecting_character' }
  assert.equal(playerWorldConfirmed(player), false)
  assert.equal(playerWorldConfirmed({ ...player, world_confirmed: false }), false)
  assert.equal(playerWorldConfirmed({ ...player, world_name: 'Master', world_confirmed: true }), true)
  assert.equal(playerWorldConfirmed({ ...player, gameplay_state: 'alive' }), true)
})

test('player list separates connection events from later collection times', () => {
  const connected = '2026-09-13T09:00:00Z'
  const disconnected = '2026-09-13T10:00:00Z'
  const sampled = '2026-09-14T02:00:00Z'
  const player = { status: 'offline', last_connected_at: connected, last_disconnected_at: disconnected, last_refreshed_at: sampled }
  assert.deepEqual(playerListPresenceTime(player), { key: 'lastDisconnected', time: disconnected })
  assert.deepEqual(playerListPresenceTime({ ...player, status: 'online' }), { key: 'lastConnected', time: connected })
  assert.deepEqual(playerListPresenceTime({ ...player, status: 'stale', presence_observed_at: connected }), { key: 'presenceObservedAt', time: connected })
  assert.deepEqual(playerListPresenceTime({ ...player, last_connected_at: sampled }), { key: 'lastConnected', time: sampled })
  assert.deepEqual(playerListPresenceTime({ status: 'offline', last_refreshed_at: sampled }), { key: 'lastRefreshed', time: sampled })
  assert.deepEqual(playerListPresenceTime({ last_disconnected_at: '0001-01-01T00:00:00Z', last_refreshed_at: 'invalid' }), { key: 'lastSeen', time: null })
})

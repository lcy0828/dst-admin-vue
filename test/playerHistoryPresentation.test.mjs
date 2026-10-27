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

test('an online cluster connection retains historical world only as last location', async () => {
  const { playerWorldFields, playerLocationPending, playerLastWorld } = await import('../src/lib/playerHistoryPresentation.mjs')
  const at = '2026-10-27T07:00:00Z'
  const fields = playerWorldFields({ online: true, worldId: 'master', worldName: 'Master', worldConfirmed: false, localEntity: false, fields: { world: { status: 'stale', observedAt: at } } })
  assert.equal(fields.world_id, '')
  assert.equal(fields.world_name, '')
  assert.equal(fields.last_world_name, 'Master')
  const player = { ...fields, status: 'online' }
  assert.equal(playerLocationPending(player), true)
  assert.equal(playerWorldConfirmed(player), false)
  assert.equal(playerLastWorld(player), 'Master')
  assert.equal(playerLocationPending({ ...player, status: 'offline' }), false)
})

test('a selecting client cannot invent historical Caves location', async () => {
  const { playerWorldFields, playerLastWorld } = await import('../src/lib/playerHistoryPresentation.mjs')
  const player = playerWorldFields({ online: true, worldId: 'caves', worldName: 'Caves', worldConfirmed: false })
  assert.equal(player.world_id, '')
  assert.equal(player.last_world_id, '')
  assert.equal(playerLastWorld(player), '')
})

test('a confirmed local entity and offline world history keep their scope', async () => {
  const { playerWorldFields } = await import('../src/lib/playerHistoryPresentation.mjs')
  const local = { worldId: 'caves', worldName: 'Caves', worldConfirmed: true, online: true, localEntity: true }
  assert.equal(playerWorldFields(local).world_id, 'caves')
  assert.equal(playerWorldFields(local).world_name, 'Caves')
  assert.equal(playerWorldFields({ ...local, online: false }).world_id, 'caves')
})

test('world counts use explicit local entities, including migration and conflict evidence', async () => {
  const { playerLocalWorldIds } = await import('../src/lib/playerHistoryPresentation.mjs')
  assert.deepEqual(playerLocalWorldIds({ status: 'online', local_entity: false, world_confirmed: false, observed_world_ids: ['master'] }), [])
  assert.deepEqual(playerLocalWorldIds({ status: 'online', local_entity: true, world_confirmed: false, observed_world_ids: ['master'], gameplay_state: 'migrating' }), ['master'])
  assert.deepEqual(playerLocalWorldIds({ status: 'online', local_entity: true, presence_conflict: true, world_confirmed: false, observed_world_ids: ['master', 'caves', 'caves'] }), ['master', 'caves'])
  assert.deepEqual(playerLocalWorldIds({ status: 'offline', local_entity: true, observed_world_ids: ['master'] }), [])
  assert.deepEqual(playerLocalWorldIds({ status: 'online', world_confirmed: false, observed_world_ids: ['master'] }), [])
  assert.deepEqual(playerLocalWorldIds({ status: 'online', world_confirmed: true, world_id: 'master' }), ['master'])
  assert.deepEqual(playerLocalWorldIds({ status: 'online', world_confirmed: true, world_id: 'master', observed_world_ids: [] }), ['master'])
})

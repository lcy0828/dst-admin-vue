import assert from 'node:assert/strict'
import test from 'node:test'
import {
  composeAccessCopy,
  matchRoomWorlds,
  pickCopiedRoomFields,
  roomCopyValuesFromConfig,
  summarizeAccessCopy
} from '../src/lib/roomCopy.mjs'

test('special list copy merges by KU id without duplicates and can replace selected lists', () => {
  const current = { admin: ['KU_A'], block: ['KU_B'], white: ['KU_C'] }
  const source = { admin: ['KU_A', 'KU_D'], block: ['KU_E'], white: [] }

  const merged = composeAccessCopy(current, source, ['admin', 'block'], 'merge')
  assert.deepEqual(merged, {
    admin: ['KU_A', 'KU_D'],
    block: ['KU_B', 'KU_E'],
    white: ['KU_C']
  })
  assert.deepEqual(summarizeAccessCopy(current, merged).admin, { total: 2, added: 1, removed: 0 })

  const replaced = composeAccessCopy(current, source, ['block'], 'replace')
  assert.deepEqual(replaced.block, ['KU_E'])
  assert.deepEqual(summarizeAccessCopy(current, replaced).block, { total: 1, added: 1, removed: 1 })
})

test('legacy room configuration converts into copyable form values', () => {
  const values = roomCopyValuesFromConfig({
    GAMEPLAY: { max_players: '6', pause_when_empty: 'yes' },
    NETWORK: { cluster_language: 'zh', autosaver_enabled: 'true' },
    MISC: { max_snapshots: '10' }
  })
  assert.equal(values.max_players, 6)
  assert.equal(values.pause_when_empty, true)
  assert.equal(values.cluster_language, 'zh')
  assert.equal(values.max_snapshots, 10)
})

test('world copy pairs Master and Caves by identity before role', () => {
  const source = [
    { id: 'Master', name: 'Forest', isMaster: true },
    { id: 'Caves', name: 'Underground' }
  ]
  const target = [
    { id: 'world-1', name: 'Master', isMaster: true },
    { id: 'world-2', name: 'Caves' }
  ]

  const matches = matchRoomWorlds(source, target)
  assert.equal(matches[0].target.id, 'world-1')
  assert.equal(matches[1].target.id, 'world-2')
})

test('world copy keeps shard role independent from Forest and Cave type', () => {
  const source = [
    { id: 'surface-secondary', name: 'Forest', type: 'forest', isMaster: false },
    { id: 'deep-primary', name: 'Underground Primary', role: 'master', type: 'cave', isMaster: true },
    { id: 'deep-secondary', name: 'Deep Two', role: 'caves', type: 'cave', isMaster: false }
  ]
  const target = [
    { id: 'target-primary', name: 'Primary', role: 'master', type: 'cave', isMaster: true },
    { id: 'target-surface', name: 'Surface Two', role: 'custom', type: 'forest', isMaster: false },
    { id: 'target-deep', name: 'Cave Two', role: 'caves', type: 'cave', isMaster: false }
  ]

  const matches = matchRoomWorlds(source, target)
  assert.equal(matches[0].target.id, 'target-surface')
  assert.equal(matches[1].target.id, 'target-primary')
  assert.equal(matches[2].target.id, 'target-deep')
})

test('world copy does not let duplicate display names override shard identity', () => {
  const source = [
    { id: 'source-surface', name: 'World', type: 'forest', isMaster: false },
    { id: 'source-primary', name: 'World', type: 'cave', isMaster: true }
  ]
  const target = [
    { id: 'target-primary', name: 'World', type: 'cave', isMaster: true },
    { id: 'target-surface', name: 'World', type: 'forest', isMaster: false }
  ]

  const matches = matchRoomWorlds(source, target)
  assert.equal(matches[0].target.id, 'target-surface')
  assert.equal(matches[1].target.id, 'target-primary')
})

test('room settings copy preserves room identity and physical shard fields', () => {
  const copied = pickCopiedRoomFields({
    cluster_name: 'source',
    cluster_description: 'copied',
    max_players: 8,
    master_port: 10999,
    cluster_key: 'secret'
  }, ['gameplay', 'network', 'shard'])

  assert.deepEqual(copied, { cluster_description: 'copied', max_players: 8 })
  assert.equal(Object.hasOwn(copied, 'cluster_name'), false)
  assert.equal(Object.hasOwn(copied, 'master_port'), false)
  assert.equal(Object.hasOwn(copied, 'cluster_key'), false)
})

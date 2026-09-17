import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeRoomModCatalog, roomModSortWeight, sortRoomModCatalog } from '../src/lib/roomModCatalog.mjs'

function observation(targetId, items, error = null) {
  return {
    targetId,
    installationId: targetId === 'local' ? 'default' : 'native',
    inventory: error ? null : { items },
    error
  }
}

function runtimeMod(id, overrides = {}) {
  return {
    id,
    name: `Mod ${id}`,
    currentVersion: '1.0',
    latestVersion: '1.0',
    versionStatus: 'current',
    fileStatus: 'ready',
    ...overrides
  }
}

test('room Mod catalog merges machine-only content and machine coverage', () => {
  const configured = [{
    id: '100',
    modid: '100',
    name: 'Configured',
    configuredWorlds: ['master', 'caves'],
    enabledWorlds: ['master', 'caves'],
    runtimeReadyTargets: 99
  }]
  const items = mergeRoomModCatalog(configured, [
    observation('local', [runtimeMod('100'), runtimeMod('200')]),
    observation('agent:node', [runtimeMod('100'), runtimeMod('200'), runtimeMod('300')])
  ])

  assert.equal(items.length, 3)
  assert.equal(items.find(item => item.id === '100').runtimeReadyTargets, 2)
  assert.equal(items.find(item => item.id === '200').machineOnly, true)
  assert.equal(items.find(item => item.id === '200').runtimeReadyTargets, 2)
  assert.equal(items.find(item => item.id === '300').runtimePendingTargets, 1)
  assert.equal(items.find(item => item.id === '300').runtimeFileStatus, 'pending')
})

test('room Mod catalog keeps unavailable machines distinct from missing content', () => {
  const items = mergeRoomModCatalog([], [
    observation('local', [runtimeMod('200', { versionStatus: 'outdated', latestVersion: '2.0' })]),
    observation('agent:offline', [], new Error('offline'))
  ])
  const mod = items[0]

  assert.equal(mod.runtimeTotalTargets, 2)
  assert.equal(mod.runtimeReadyTargets, 1)
  assert.equal(mod.runtimeUnavailableTargets, 1)
  assert.equal(mod.runtimeFileStatus, 'unavailable')
  assert.equal(mod.runtimeVersions.find(item => item.targetId === 'agent:offline').status, 'unavailable')
  assert.equal(mod.runtimePendingTargets, 1)
  assert.equal(mod.updateAvailable, true)
})

test('room catalog keeps the actual missing machines and incomplete files for direct downloads', () => {
  const items = mergeRoomModCatalog([{ id: '100', configured: true, enabled: true }], [
    observation('local', [runtimeMod('100', { fileStatus: 'invalid', versionStatus: 'unknown' })]),
    observation('agent:node', [])
  ])
  assert.deepEqual(items[0].runtimeVersions.map(item => [item.targetId, item.status]), [['local', 'invalid'], ['agent:node', 'missing']])
})

test('room Mod catalog defaults to enabled-first and supports explicit sort modes', () => {
  const worlds = ['master', 'caves']
  const allEnabled = { id: '100', name: 'Zulu', configuredWorlds: worlds, enabledWorlds: worlds }
  const partial = { id: '200', name: 'Beta', configuredWorlds: ['master'], enabledWorlds: ['master'] }
  const machineOnly = { id: '300', name: 'Alpha', machineOnly: true, configuredWorlds: [], enabledWorlds: [], updateAvailable: true }
  const disabled = { id: '400', name: 'Delta', configuredWorlds: worlds, enabledWorlds: [] }
  const items = [disabled, machineOnly, partial, allEnabled]

  assert.deepEqual(items.map(item => roomModSortWeight(item, worlds)), [3, 2, 1, 0])
  assert.deepEqual(sortRoomModCatalog(items, 'enabled', worlds).map(item => item.id), ['100', '200', '300', '400'])
  assert.equal(sortRoomModCatalog(items, 'name', worlds)[0].id, '300')
  assert.equal(sortRoomModCatalog(items, 'update_status', worlds)[0].id, '300')
})

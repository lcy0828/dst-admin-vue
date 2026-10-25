import assert from 'node:assert/strict'
import test from 'node:test'
import { isLocalMod, localModCopy, modSourceFields, workshopMetadataIds } from '../src/lib/modReference.mjs'
import { mergeRoomModCatalog } from '../src/lib/roomModCatalog.mjs'
import { enrichModMetadata } from '../src/lib/modMetadata.mjs'

test('local numeric and Unicode names never enter Workshop metadata requests', () => {
  const items = [{ id: '123' }, { id: 'local:123' }, { id: 'local:鱼干_自用' }, { id: '123' }]
  assert.deepEqual(workshopMetadataIds(items), ['123'])
  assert.deepEqual(modSourceFields(items[2]), { source: 'local', directoryName: '鱼干_自用' })
  assert.equal(isLocalMod(items[0]), false)
})

test('mixed room catalog preserves counts, local status, missing and distinct copies', () => {
  const configured = [...Array(7)].map((_, i) => ({ id: String(100 + i), name: `Workshop ${i}`, configured: true }))
  configured.push({ id: 'local:fishdried_custom', configured: true, source: 'local' })
  const copies = [
    { targetId: 'local', installationId: 'default', inventory: { items: [{ id: 'local:fishdried_custom', name: '鱼干', currentVersion: '1', fileStatus: 'ready', versionStatus: 'local' }] } },
    { targetId: 'remote', installationId: 'native', inventory: { items: [{ id: 'local:fishdried_custom', name: '鱼干', currentVersion: '2', fileStatus: 'ready', versionStatus: 'local' }] } }
  ]
  const result = mergeRoomModCatalog(configured, copies)
  assert.equal(result.length, 8)
  const local = result.find(isLocalMod)
  assert.equal(local.runtimeVersionStatus, 'mixed')
  assert.equal(local.runtimeReadyTargets, 2)
  assert.equal(local.updateAvailable, false)
  assert.equal(local.directoryName, 'fishdried_custom')
  assert.equal(local.runtimeVersions.length, 2)
  const [only] = mergeRoomModCatalog([{ id: 'local:123' }], [{ targetId: 'local', installationId: 'default', inventory: { items: [{ id: 'local:123', fileStatus: 'ready', versionStatus: 'local' }] } }])
  assert.equal(only.runtimeVersionStatus, 'local')
  assert.equal(enrichModMetadata([only], { 'local:123': { name: 'Incorrect Steam metadata', version: '99' } })[0], only)
})

test('local details always carry an explicit physical copy and preserve a selected copy', () => {
  assert.equal(localModCopy({ id: 'local:fishdried_custom' }), null)
  const mod = { runtimeVersions: [{ targetId: 'local', installationId: 'default' }, { targetId: 'remote', installationId: 'second' }] }
  assert.deepEqual(localModCopy(mod), { targetId: 'local', installationId: 'default' })
  assert.deepEqual(localModCopy(mod, mod.runtimeVersions[1]), { targetId: 'remote', installationId: 'second' })
  assert.deepEqual(localModCopy({ ...mod, detailsScope: mod.runtimeVersions[1] }), { targetId: 'remote', installationId: 'second' })
})

test('local directory identity remains exact while merging physical copies', () => {
  const result = mergeRoomModCatalog([{ id: 'local:custom ' }, { id: 'local:custom' }], [])
  assert.equal(result.length, 2)
  assert.deepEqual(result.map(item => item.id), ['local:custom ', 'local:custom'])
})

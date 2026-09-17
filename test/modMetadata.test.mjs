import assert from 'node:assert/strict'
import test from 'node:test'
import { enrichModMetadata, runtimeModVersionStatus } from '../src/lib/modMetadata.mjs'

test('display version comparison keeps server precedence and never guesses without metadata', () => {
  const current = { status: 'unknown', steamManifestId: '10', version: '1', steamUpdatedAt: '2026-09-01T00:00:00Z' }
  assert.equal(runtimeModVersionStatus(current, {}), 'unknown')
  assert.equal(runtimeModVersionStatus(current, { steamManifestId: '10', version: '2' }), 'current')
  assert.equal(runtimeModVersionStatus(current, { steamManifestId: '11', version: '1' }), 'outdated')
  assert.equal(runtimeModVersionStatus(current, { updatedAt: '2026-09-01T00:00:01Z', version: '2' }), 'current')
  assert.equal(runtimeModVersionStatus(current, { updatedAt: '2026-09-01T00:00:02Z', version: '1' }), 'outdated')
  assert.equal(runtimeModVersionStatus(current, { version: '1' }), 'current')
  assert.equal(runtimeModVersionStatus(current, { version: '2' }), 'outdated')
  assert.equal(runtimeModVersionStatus({ ...current, status: 'unavailable' }, { version: '1' }), 'unavailable')
  assert.equal(runtimeModVersionStatus({ ...current, status: 'not_installed' }, { version: '1' }), 'not_installed')
})

test('Workshop names enrich observations without changing settings or disk versions', () => {
  const item = {
    id: '100', name: 'Local name', version: '1', currentVersion: '1', enabled: false,
    loadedWorlds: ['master'], worldRevisions: { master: 'manual' }, runtimeFileStatus: 'ready',
    runtimeVersions: [
      { targetId: 'local', status: 'unknown', version: '1', steamManifestId: '10' },
      { targetId: 'agent:node', status: 'unknown', version: '2', steamManifestId: '11' }
    ]
  }
  const [result] = enrichModMetadata([item], { 100: { name: 'Steam name', version: '2', steamManifestId: '11', previewUrl: '/image' } })
  assert.equal(result.name, 'Steam name')
  assert.equal(result.currentVersion, '1')
  assert.equal(result.version, '1')
  assert.equal(result.latestVersion, '2')
  assert.equal(result.runtimeVersionStatus, 'mixed')
  assert.equal(result.runtimeCurrentTargets, 1)
  assert.equal(result.runtimeOutdatedTargets, 1)
  assert.equal(result.updateAvailable, true)
  assert.equal(result.enabled, false)
  assert.deepEqual(result.worldRevisions, { master: 'manual' })
  assert.deepEqual(result.loadedWorlds, ['master'])
  assert.equal(item.runtimeVersions[0].status, 'unknown')
  assert.equal(enrichModMetadata([{ id: '100', name: 'Workshop 100' }], { 100: { name: 'Steam name' } })[0].name, 'Steam name')
})

test('Workshop display names replace internal modinfo names and supply authors', () => {
  const items = [
    { id: '3760106287', name: 'Title', author: '', currentVersion: '2.0.3', version: '2.0.3' },
    { id: '376333686', name: 'SHOWTEMPERATURE', currentVersion: '1.9.8', version: '1.9.8' }
  ]
  const metadata = {
    3760106287: { name: 'Workshop title name', author: 'Title author', version: '2.0.4' },
    376333686: { name: 'Workshop temperature name', author: 'Temperature author', version: '1.9.9' }
  }
  const result = enrichModMetadata(items, metadata)
  for (const [index, item] of result.entries()) {
    assert.equal(item.name, metadata[item.id].name)
    assert.equal(item.author, metadata[item.id].author)
    assert.equal(item.currentVersion, items[index].currentVersion)
    assert.equal(item.version, items[index].version)
  }
  assert.equal(items[0].name, 'Title')
  assert.equal(items[1].name, 'SHOWTEMPERATURE')
})

test('blank Workshop names and authors preserve the available local metadata', () => {
  const item = { id: '100', name: 'Local name', author: 'Local author', currentVersion: '1' }
  for (const latest of [{}, { name: '', author: '' }, { name: '  ', author: '\n' }]) {
    const [result] = enrichModMetadata([item], { 100: latest })
    assert.equal(result.name, item.name)
    assert.equal(result.author, item.author)
    assert.equal(result.currentVersion, '1')
  }
})

test('failed and missing metadata cannot mark an unknown version current', () => {
  const item = { id: '100', runtimeVersionStatus: 'unknown', runtimeVersions: [{ status: 'unknown', version: '1' }] }
  assert.equal(enrichModMetadata([item], {})[0], item)
  const [result] = enrichModMetadata([item], { 100: { id: '100' } })
  assert.equal(result.runtimeVersionStatus, 'unknown')
  assert.equal(result.latestVersion, '')
  assert.equal(result.updateAvailable, false)
})

test('display-only fallback preserves known updates but cannot confirm current versions', () => {
  const [outdated, current] = enrichModMetadata([
    { id: '100', latestVersion: '2', updateAvailable: true, runtimeVersions: [{ status: 'outdated', version: '1' }] },
    { id: '200', runtimeVersions: [{ status: 'current', version: '1' }] }
  ], { 100: { name: 'Stored title', author: 'Stored author' }, 200: { name: 'Another stored title' } })
  assert.equal(outdated.updateAvailable, true)
  assert.equal(outdated.latestVersion, '2')
  assert.equal(outdated.runtimeVersions[0].status, 'outdated')
  assert.equal(current.runtimeVersionStatus, 'unknown')
})

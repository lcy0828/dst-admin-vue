import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { bundledEntityArtwork, entityArtworkCandidates } from '../src/lib/entityArtwork.mjs'
const target = { roomId: 'room/one', worldId: 'Master', apiBase: '/api' }
test('World entities reuse only shipped artwork and mod overrides never borrow vanilla art', () => {
 assert.equal(entityArtworkCandidates({ id: 'log', source: 'runtime' }, target)[0], '/static/entities/log.webp')
 const urls = entityArtworkCandidates({ id: 'log', source: 'runtime', modId: 'workshop-123' }, target)
 assert.equal(urls.length, 1)
 assert.match(urls[0], /rooms\/room%2Fone\/worlds\/Master\/entity-catalog\/artwork\/log\?modId=workshop-123$/)
 assert.equal(entityArtworkCandidates({ id: 'mod_sword', source: 'runtime' }, target).length, 1)
 assert.deepEqual(entityArtworkCandidates({ id: 'mod_sword', source: 'runtime' }), [])
})
test('Artwork manifest matches the actual packaged assets', async () => {
 const names = (await readdir(new URL('../public/static/entities/', import.meta.url))).filter(name=>name.endsWith('.webp')).map(name=>name.slice(0,-5)).sort()
 assert.deepEqual([...bundledEntityArtwork].sort(), names)
})
test('Untrusted image URLs and invalid Prefabs are never used as image sources', () => {
 for (const artworkUrl of ['javascript:alert(1)', '//untrusted.test/x', 'data:image/svg+xml,<svg/>']) {
  assert.deepEqual(entityArtworkCandidates({ id:'mod_sword', artworkUrl }), [])
 }
 assert.deepEqual(entityArtworkCandidates({ id: '../secret', source: 'runtime' }, target), [])
 assert.deepEqual(entityArtworkCandidates({ id: 'mod_sword', artworkUrl: 'https://beacon.test/assets/sword.webp' }), ['https://beacon.test/assets/sword.webp'])
})

test('Optional artwork is revisioned, skips missing images and mod overrides, and detaches cleanly', () => {
 const pack = { revision: 'release-1', prefabs: new Set(['log', 'bundle']) }
 const vanilla = { id: 'log', source: 'runtime' }
 const candidates = entityArtworkCandidates(vanilla, { ...target, pack })
 assert.equal(candidates[0], '/api/v2/entity-catalog/artwork-pack/artwork/log?v=release-1')
 assert.equal(candidates[1], '/static/entities/log.webp')
 assert.equal(entityArtworkCandidates({ id: 'bundle' }, { pack })[0], '/api/v2/entity-catalog/artwork-pack/artwork/bundle?v=release-1')
 assert.equal(entityArtworkCandidates({ id: 'missing', source: 'runtime' }, { ...target, pack }).length, 1)
 assert.equal(entityArtworkCandidates({ ...vanilla, modId: 'workshop-123' }, { ...target, pack }).length, 1)
 assert.deepEqual(entityArtworkCandidates({ id: 'bundle' }, { pack: { revision: '', prefabs: new Set() } }), [])
 assert.notEqual(entityArtworkCandidates(vanilla, { pack: { ...pack, revision: 'release-2' } })[0], candidates[0])
})

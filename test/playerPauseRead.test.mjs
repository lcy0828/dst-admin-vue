import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { babelParse } from '@vue/compiler-sfc'

const source = readFileSync(new URL('../src/api/playerApi.js', import.meta.url), 'utf8')
const ast = babelParse(source, { sourceType: 'module' }).program.body
const roomRead = ast.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'roomPlayers')
const api = ast.find(node => node.type === 'ExportNamedDeclaration' && node.declaration?.declarations?.[0]?.id.name === 'playerApi').declaration.declarations[0].init
const stats = api.properties.find(node => node.key.name === 'getPlayerStats')
function fixture(response) {
  const scope = {
    playersV2API: { list: async () => response },
    legacyPlayer: p => p,
    playerLocalWorldIds: () => [],
    success: data => ({ data })
  }
  return runInNewContext(`const roomPlayers = ${source.slice(roomRead.start, roomRead.end)}; ({ ${source.slice(stats.start, stats.end)} })`, scope)
}

test('paused shard notices survive empty player lists and are scoped to the selected world', async () => {
  const api = fixture({ items: [], total: 0, pausedWorldIds: ['master'] })
  const all = (await api.getPlayerStats('room', [], 'room')).data
  assert.deepEqual(Array.from(all.paused_world_ids), ['master'])
  assert.deepEqual(Array.from(all.collection_warnings), [])
  const caves = (await api.getPlayerStats('room', ['caves'], 'room')).data
  assert.deepEqual(Array.from(caves.paused_world_ids), [])
})
test('pause notice does not hide a different shard failure or relabel stale players online', async () => {
  const api = fixture({ items: [{ status: 'stale', observed_online: true, world_id: 'master' }], total: 1,
    pausedWorldIds: ['master'], warnings: ['Caves unavailable'] })
  const result = (await api.getPlayerStats('room', [], 'room')).data
  assert.equal(result.online_count, 0)
  assert.equal(result.stale_online_count, 1)
  assert.deepEqual(Array.from(result.collection_warnings), ['Caves unavailable'])
})
test('older panels without pausedWorldIds retain warnings and remain readable', async () => {
  const api = fixture({ items: [], total: 0, warnings: ['Unable to read players'] })
  const result = (await api.getPlayerStats('room', [], 'room')).data
  assert.deepEqual(Array.from(result.paused_world_ids), [])
  assert.deepEqual(Array.from(result.collection_warnings), ['Unable to read players'])
})

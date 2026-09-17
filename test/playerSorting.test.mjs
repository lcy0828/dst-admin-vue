import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { babelParse, parse } from '@vue/compiler-sfc'
import { playerPlayDays, sortPlayers } from '../src/lib/playerSorting.mjs'
import { composeRoomResults, throwWhenAllRoomsFailed } from '../src/api/roomSettlements.mjs'

const ids = players => Array.from(players, player => player.id)
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('days sort numerically in both directions and preserve real zero ahead of unknown values', () => {
  const players = [
    { id: 'unknown', player_age: 0, field_states: {} },
    { id: 'nine', player_age: '9' },
    { id: 'hundred', player_age: '100' },
    { id: 'zero', player_age: 0, field_states: { age: { status: 'stale' } } },
    { id: 'missing', player_age: null }
  ]
  assert.deepEqual(ids(sortPlayers(players, 'player_age', 'desc')), ['hundred', 'nine', 'zero', 'missing', 'unknown'])
  assert.deepEqual(ids(sortPlayers(players, 'player_age', 'asc')), ['zero', 'nine', 'hundred', 'missing', 'unknown'])
  assert.deepEqual(ids(players), ['unknown', 'nine', 'hundred', 'zero', 'missing'])
  for (const player_age of ['', ' ', -1, NaN, Infinity, undefined, false]) {
    assert.equal(playerPlayDays({ player_age }), null)
  }
  assert.equal(playerPlayDays({ player_age: 68, field_states: {} }), 68)
  assert.equal(playerPlayDays({ player_age: 68, field_states: { age: { status: 'unavailable' } } }), null)
})

test('equal days use recent evidence and stable room/player identities, independent of presence', () => {
  const players = [
    { id: 'older', player_age: 5, status: 'online', last_seen: '2026-09-10T00:00:00Z' },
    { id: 'b', room_id: 'room-b', player_age: 5, last_seen: '2026-09-11T00:00:00Z' },
    { id: 'b', room_id: 'room-a', player_age: 5, status: 'offline', last_seen: '2026-09-11T00:00:00Z' },
    { id: 'a', room_id: 'room-a', player_age: 5, last_seen: '2026-09-11T00:00:00Z' }
  ]
  for (const direction of ['asc', 'desc']) {
    const sorted = sortPlayers(players, 'player_age', direction)
    assert.deepEqual(ids(sorted), ['a', 'b', 'b', 'older'])
    assert.deepEqual(sorted.map(player => player.room_id), ['room-a', 'room-a', 'room-b', undefined])
    assert.deepEqual(sortPlayers([...players].reverse(), 'player_age', direction), sorted)
  }
})

test('fixed ordering puts online players first, then days descending within each group', () => {
  const players = [
    { id: 'offline', status: 'offline', player_age: 500, last_seen: '2026-09-12T00:00:00Z' },
    { id: 'stale', status: 'stale', player_age: 100, last_seen: '2026-09-11T00:00:00Z' },
    { id: 'unknown-age', status: 'online', player_age: null, last_seen: '2026-09-12T00:00:00Z' },
    { id: 'online-new', status: 'online', player_age: 0, last_seen: '2026-09-12T00:00:00Z' },
    { id: 'online-veteran', status: 'online', player_age: 20, last_seen: '2026-09-10T00:00:00Z' },
    { id: 'offline-unknown', status: 'offline', player_age: null, last_seen: '0001-01-01T00:00:00Z' }
  ]
  assert.deepEqual(ids(sortPlayers(players)), ['online-veteran', 'online-new', 'unknown-age', 'offline', 'stale', 'offline-unknown'])
  assert.equal(ids(sortPlayers(players, 'last_seen', 'asc')).at(-1), 'offline-unknown')
  assert.equal(ids(sortPlayers(players, 'last_seen', 'desc')).at(-1), 'offline-unknown')
})

function componentMembers(path, group, names, context = {}) {
  const source = parse(read(path)).descriptor.script.content
  const component = babelParse(source, { sourceType: 'module' }).program.body
    .find(node => node.type === 'ExportDefaultDeclaration').declaration
  const members = component.properties.find(node => node.key.name === group).value.properties
    .filter(node => names.includes(node.key.name))
    .map(node => source.slice(node.start, node.end)).join(',\n')
  return runInNewContext(`({ ${members} })`, context)
}

test('workspace applies online priority and days to the full history before limiting', () => {
  const path = 'src/views/servers/ServerWorkspace.vue'
  const { recentPlayers } = componentMembers(path, 'computed', ['recentPlayers'], { sortPlayers })
  const state = {
    playerDisplayLimit: 5,
    playerStats: { recent_players: Array.from({ length: 20 }, (_, index) => ({ id: index, player_age: index, status: index < 2 ? 'online' : 'offline' })) }
  }
  assert.deepEqual(ids(recentPlayers.call(state)), [1, 0, 19, 18, 17])
  state.playerDisplayLimit = 25
  assert.equal(recentPlayers.call(state).length, 20)
  state.playerDisplayLimit = 'all'
  assert.equal(recentPlayers.call(state).length, 20)
})

test('API sorts all backend pages and rooms before applying the requested display page', async () => {
  const source = read('src/api/playerApi.js')
  const script = babelParse(source, { sourceType: 'module' }).program.body
    .filter(node => node.type !== 'ImportDeclaration')
    .map(node => source.slice(node.declaration?.start ?? node.start, node.end)).join('\n')
  const requested = []
  const api = runInNewContext(`${script}; playerApi`, {
    playerPlayDays, sortPlayers, composeRoomResults, throwWhenAllRoomsFailed,
    roomsV2API: { controlPlaneList: async () => ({ items: [{ id: 'A' }, { id: 'B' }] }) },
    playersV2API: {
      list: async (roomId, { offset, limit }) => {
        requested.push([roomId, offset])
        const players = roomId === 'A'
          ? Array.from({ length: 105 }, (_, index) => ({ id: `A${index}`, age: index + 1, online: index === 0, presenceStatus: 'live' }))
          : [{ id: 'B', age: 2, online: true, presenceStatus: 'live' }]
        return { items: players.slice(offset, offset + limit), total: players.length }
      }
    }
  })
  const params = { page: 1, page_size: 3 }
  const first = await api.getAllPlayers(params)
  assert.equal(first.total, 106)
  assert.deepEqual(ids(first.data), ['B', 'A0', 'A104'])
  assert.ok(requested.some(([room, offset]) => room === 'A' && offset === 100))
  const second = await api.getAllPlayers({ ...params, page: 2 })
  assert.deepEqual(ids(second.data), ['A103', 'A102', 'A101'])
  const exported = await api.exportPlayers({})
  assert.equal(exported.length, 106)
  assert.deepEqual(ids(exported.slice(0, 6)), [...ids(first.data), ...ids(second.data)])
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { composeRoomResults, throwWhenAllRoomsFailed } from '../src/api/roomSettlements.mjs'

test('room results retain successful values when another room fails', () => {
  const rooms = [{ id: 'room-a', name: 'A' }, { id: 'room-b', name: 'B' }]
  const failure = new Error('room B unavailable')
  const result = composeRoomResults(rooms, [
    { status: 'fulfilled', value: ['KU_ONE'] },
    { status: 'rejected', reason: failure }
  ])

  assert.deepEqual(result.completed, [{ room: rooms[0], value: ['KU_ONE'] }])
  assert.equal(result.failures.length, 1)
  assert.equal(result.failures[0].room_id, 'room-b')
  assert.equal(result.failures[0].error, failure)
  assert.doesNotThrow(() => throwWhenAllRoomsFailed(rooms.length, result.failures))
})

test('room results throw the original error only when every room fails', () => {
  const rooms = [{ id: 'room-a', name: 'A' }, { id: 'room-b', name: 'B' }]
  const first = new Error('first failure')
  const result = composeRoomResults(rooms, [
    { status: 'rejected', reason: first },
    { status: 'rejected', reason: new Error('second failure') }
  ])

  assert.throws(() => throwWhenAllRoomsFailed(rooms.length, result.failures), error => error === first)
})

test('player rows use room-scoped keys and room requests settle independently', async () => {
  const [view, api] = await Promise.all([
    readFile(new URL('../src/views/players/PlayerList.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/playerApi.js', import.meta.url), 'utf8')
  ])

  assert.match(view, /:key="`\$\{player\.room_id\}:\$\{player\.id\}`"/)
  assert.match(api, /Promise\.allSettled\(rooms\.map\(room => roomPlayers/)
  assert.match(api, /Promise\.allSettled\(selectedRooms\.map/)
  assert.match(api, /async getPlayerDetail[\s\S]*?const catalog = await loadRooms\(\)/)
})

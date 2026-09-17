import assert from 'node:assert/strict'
import test from 'node:test'
import { pageHasMachineScope, preferredRoomId, queryAfterMachineChange } from '../src/lib/pageScope.mjs'
import { readRoomView, readWorkspaceSelection, rememberRoomSelection, rememberWorkspaceView } from '../src/lib/workspacePreferences.mjs'

test('global pages hide machine scope while runtime pages and room editing expose it', () => {
  for (const path of ['/system/settings', '/agents/list', '/agents/security', '/logs/rules', '/servers/commands', '/cron/tasks']) {
    assert.equal(pageHasMachineScope({ path }), false, path)
  }
  for (const path of ['/dashboard', '/mods', '/players/list', '/worlds/settings', '/backups', '/servers/releases']) {
    assert.equal(pageHasMachineScope({ path }), true, path)
  }
  assert.equal(pageHasMachineScope({ path: '/rooms/settings' }), false)
  assert.equal(pageHasMachineScope({ path: '/rooms/settings', query: { id: 'room-a' } }), true)
  assert.equal(pageHasMachineScope({ path: '/rooms/settings', query: { edit: 'true' } }), true)
})

test('room selection follows each machine, preserves view preferences, and recovers deleted remembered rooms', () => {
  const values = new Map()
  globalThis.localStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }
  try {
    const rooms = [{ id: 'stopped', name: 'Stopped', status: 'stopped' }, { id: 'running', name: '666777', worlds: [{ status: 'running' }] }]
    rememberWorkspaceView('debian', 'stopped', { worldId: 'caves', activeOperation: 'chat', playerDisplayLimit: 'all' })
    rememberRoomSelection('local', 'local-room')
    assert.equal(preferredRoomId(rooms, undefined, { targetId: 'debian' }), 'stopped')
    assert.equal(preferredRoomId(rooms, '666777', { targetId: 'debian' }), 'running')
    assert.equal(preferredRoomId(rooms, 'missing', { targetId: 'debian' }), '')
    rememberRoomSelection('debian', 'deleted')
    assert.equal(preferredRoomId(rooms, undefined, { targetId: 'debian' }), 'running')
    rememberRoomSelection('debian', 'running')
    assert.deepEqual(readRoomView('stopped'), { worldId: 'caves', activeOperation: 'chat', playerDisplayLimit: 'all' })
    assert.equal(readWorkspaceSelection('local').roomId, 'local-room')
    assert.equal(preferredRoomId(rooms, '', { allowAll: true, targetId: 'debian' }), '')
    assert.equal(preferredRoomId([], undefined, { targetId: 'debian' }), '')
  } finally { delete globalThis.localStorage }
})

test('changing machines drops old room/world/player targets and preserves the page operation', () => {
  const route = { path: '/mods', query: { tab: 'room', roomId: 'old', worldId: 'master', playerId: 'KU_old', archive: 'old', targetId: 'old-machine' } }
  assert.deepEqual(queryAfterMachineChange(route, 'local'), { tab: 'room', targetId: 'local' })
  assert.equal(route.query.roomId, 'old')
  assert.deepEqual(queryAfterMachineChange({ path: '/rooms/settings', query: { id: 'old', deployment: 'edit' } }, 'local'), {
    targetId: 'local', edit: 'true', deployment: 'edit'
  })
})

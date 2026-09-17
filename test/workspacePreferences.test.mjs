import assert from 'node:assert/strict'
import test from 'node:test'
import { readLogView, readRoomView, readWorkspaceSelection, rememberLogView, rememberWorkspaceView } from '../src/lib/workspacePreferences.mjs'

const key = 'dst-admin-workspace-preferences'
function storage() {
  const data = new Map()
  const writes = []
  globalThis.localStorage = {
    getItem: key => data.get(key) || null,
    setItem: (key, value) => { data.set(key, value); writes.push(value) }
  }
  return { data, writes }
}

test('room selection belongs to each machine while display preferences belong to each room', () => {
  storage()
  rememberWorkspaceView('local', 'room-a', { worldId: 'caves', activeOperation: 'logs', playerDisplayLimit: 'all' })
  rememberWorkspaceView('agent:debian', 'room-b', { worldId: 'master', activeOperation: 'chat', playerDisplayLimit: 25 })
  assert.deepEqual(readWorkspaceSelection('local'), { roomId: 'room-a', worldId: 'caves', activeOperation: 'logs', playerDisplayLimit: 'all' })
  assert.equal(readWorkspaceSelection('agent:debian').roomId, 'room-b')
  assert.equal(readWorkspaceSelection().roomId, '')
  assert.equal(readRoomView('room-b').playerDisplayLimit, 25)
})

test('explicit room and world links take priority, but links for another machine do not', () => {
  storage()
  rememberWorkspaceView('local', 'room-a', { worldId: 'caves', activeOperation: 'logs' })
  rememberWorkspaceView('agent:debian', 'room-b', { worldId: 'caves', activeOperation: 'chat' })
  assert.deepEqual(readWorkspaceSelection('local', { roomId: 'room-b', worldId: 'master', targetId: 'local' }), {
    roomId: 'room-b', worldId: 'master', activeOperation: 'chat', playerDisplayLimit: 5
  })
  assert.equal(readWorkspaceSelection('local', { roomId: 'room-b', targetId: 'agent:debian' }).roomId, 'room-a')
  assert.equal(readWorkspaceSelection('local', { roomId: 'room-b' }).roomId, 'room-b')
})

test('only display preferences are saved, unchanged refreshes do not write, and log preferences remain independent', () => {
  const { data, writes } = storage()
  const view = { worldId: 'master', activeOperation: 'console', playerDisplayLimit: 'all', commandInput: 'c_shutdown()', playerStats: { total: 8 }, status: 'running' }
  rememberWorkspaceView('local', 'room-a', view)
  rememberWorkspaceView('local', 'room-a', view)
  assert.equal(writes.length, 1)
  rememberLogView({ logLineCount: '1000', timeDisplayMode: 'runtime', autoScroll: false, followLog: false, rawLogLines: ['secret'] })
  assert.deepEqual(readLogView(), { logLineCount: '1000', timeDisplayMode: 'runtime', autoScroll: false })
  assert.equal(readWorkspaceSelection('local').roomId, 'room-a')
  assert.doesNotMatch(data.get(key), /commandInput|playerStats|status|followLog|rawLogLines|secret/)
})

test('invalid, malformed or unavailable browser storage keeps the page usable with defaults', () => {
  const { data } = storage()
  data.set(key, JSON.stringify({ rooms: { broken: { worldId: [], activeOperation: 'invalid', playerDisplayLimit: -5 } }, logs: { logLineCount: '999', autoScroll: 'false' } }))
  assert.deepEqual(readRoomView('broken'), { worldId: '', activeOperation: 'players', playerDisplayLimit: 5 })
  assert.deepEqual(readLogView(), { logLineCount: '300', timeDisplayMode: 'wallclock', autoScroll: true })
  data.set(key, '{broken')
  assert.equal(readWorkspaceSelection().roomId, '')
  globalThis.localStorage = { getItem() { throw Error('denied') }, setItem() { throw Error('quota') } }
  assert.equal(readLogView().autoScroll, true)
  assert.doesNotThrow(() => rememberWorkspaceView('local', 'room-a', {}))
  assert.doesNotThrow(() => rememberLogView({}))
  delete globalThis.localStorage
  assert.equal(readRoomView('missing').playerDisplayLimit, 5)
})

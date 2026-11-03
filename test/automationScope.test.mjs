import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { babelParse } from '@vue/compiler-sfc'
import { createAutomationScope, guardAutomationAPI, AUTOMATION_SCOPE_EVENT, AUTH_SCOPE_EVENT } from '../src/lib/automationScope.mjs'
function storage(initial = '') {
  let value = initial
  return { getItem: () => value, setItem: (_, v) => { value = v }, removeItem: () => { value = '' } }
}
const rooms = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
test('multiple rooms need a choice; single room and valid session choices restore without world reads', async () => {
  for (const [items, remembered, want] of [[rooms, '', ''], [rooms, 'b', 'b'], [rooms, 'gone', ''], [[rooms[0]], '', 'a'], [[], 'a', '']]) {
    let calls = 0
    const scope = createAutomationScope({ listRooms: async () => { calls++; return { items } }, storage: storage(remembered) })
    const result = await scope.load()
    assert.equal(result.roomId, want)
    await scope.load()
    assert.equal(calls, 1)
    if (!want) assert.throws(scope.capture, /选择/)
  }
})
test('failed catalog can retry; invalidation prevents late catalog from restoring revoked rooms', async () => {
  const late = deferred(); let attempts = 0
  const scope = createAutomationScope({ listRooms: () => ++attempts === 1 ? late.promise : Promise.resolve({ items: [] }), storage: storage('a') })
  const old = scope.load()
  scope.invalidate({ forget: true })
  assert.equal((await scope.load()).rooms.length, 0)
  late.resolve({ items: rooms })
  await assert.rejects(old, { code: 'AUTOMATION_SCOPE_CHANGED' })
  assert.equal((await scope.load()).rooms.length, 0)
  let fail = true
  const retry = createAutomationScope({ listRooms: async () => { if (fail) throw Error('offline'); return { items: rooms } } })
  await assert.rejects(retry.load(), /offline/)
  fail = false
  assert.equal((await retry.load()).rooms.length, 2)
})
test('slow responses, stale confirmation callbacks, and account changes cannot read or write the next room', async () => {
  const scope = createAutomationScope({ listRooms: async () => ({ items: rooms }), storage: storage('a') })
  await scope.load()
  const binding = scope.capture()
  const late = deferred(); let writes = 0
  const api = guardAutomationAPI({ list: () => late.promise, update: async () => { writes++ } }, scope, binding)
  const old = api.list()
  scope.select('b')
  late.resolve({ items: ['A private task'] })
  await assert.rejects(old, { code: 'AUTOMATION_SCOPE_CHANGED' })
  await assert.rejects(api.update(), { code: 'AUTOMATION_SCOPE_CHANGED' })
  assert.equal(writes, 0)
  const second = guardAutomationAPI({ update: async () => { writes++ } }, scope, scope.capture())
  scope.invalidate({ forget: true })
  await assert.rejects(second.update(), { code: 'AUTOMATION_SCOPE_CHANGED' })
  assert.equal(writes, 0)
})
function adapter({ api = {}, roomList = rooms, remembered = 'a' } = {}) {
  const source = readFileSync(new URL('../src/api/cronApi.js', import.meta.url), 'utf8')
  const ast = babelParse(source, { sourceType: 'module' })
  const code = ast.program.body.map(node => node.type === 'ImportDeclaration' ? '' : source.slice(node.start, node.end).replace(/^export /, '')).join('\n')
  const events = new EventTarget()
  const context = { rawAutomationAPI: api, rawConsoleAPI: { definitions: async () => ({ items: [] }) }, rawRoomsAPI: { list: async () => ({ items: roomList }), worlds: async () => ({ items: [] }) },
    createAutomationScope, guardAutomationAPI, AUTOMATION_SCOPE_EVENT, AUTH_SCOPE_EVENT, MANAGEMENT_SCOPE_CHANGED_EVENT: 'scope',
    sessionStorage: storage(remembered), window: events, Event, Blob, isSystemAutomationGroup: () => false, SYSTEM_AUTOMATION_GROUP_IDS: {}, SYSTEM_EXECUTOR_ID: 'system' }
  return runInNewContext(`${code}; realCronTaskApi`, context)
}
test('actual task adapter cancels a write after a slow revision read and does not change room on object lookup', async () => {
  const late = deferred(); const calls = []
  const api = adapter({ api: { task: () => late.promise, updateTask: async room => { calls.push(room) } } })
  await api.getRoomScope()
  const old = api.forCurrentRoom()
  const pending = old.setTaskEnabled('task-a', false)
  await Promise.resolve(); await Promise.resolve()
  api.setRoom('b')
  late.resolve({ id: 'task-a', revision: '1' })
  await assert.rejects(pending, { code: 'AUTOMATION_SCOPE_CHANGED' })
  await assert.rejects(old.clearLogs({ keep_days: 1 }), { code: 'AUTOMATION_SCOPE_CHANGED' })
  assert.equal(calls.length, 0)
  assert.equal((await api.getRoomScope()).roomId, 'b')
})
test('detail resolution respects explicit rooms and never treats 403 as not found', async () => {
  const calls = []
  let forbidden = true
  const api = adapter({ api: { task: async room => { calls.push(room); if (forbidden) throw Object.assign(Error('forbidden'), { status: 403 }); if (room === 'a') throw Object.assign(Error('missing'), { status: 404 }) } } })
  await assert.rejects(api.resolveRoom('task', 'id'), /forbidden/)
  assert.deepEqual(calls, ['a'])
  forbidden = false
  await api.resolveRoom('task', 'id')
  assert.equal((await api.getRoomScope()).roomId, 'b')
  await assert.rejects(api.resolveRoom('task', 'id', 'a'), /没有找到/)
})
test('disposed page API cannot submit a delayed confirmation even if room ID is unchanged', async () => {
  let writes = 0
  const api = adapter({ api: { clearRuns: async () => { writes++ } } })
  await api.getRoomScope()
  const old = api.forCurrentRoom(); old.dispose()
  await assert.rejects(old.clearLogs({ keep_days: 1 }), { code: 'AUTOMATION_SCOPE_CHANGED' })
  assert.equal(writes, 0)
})

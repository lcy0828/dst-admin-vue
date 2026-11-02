import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { babelParse, parse } from '@vue/compiler-sfc'

const script = parse(readFileSync(new URL('../src/views/servers/ServerWorkspace.vue', import.meta.url), 'utf8')).descriptor.script.content
const component = babelParse(script, { sourceType: 'module' }).program.body.find(node => node.type === 'ExportDefaultDeclaration').declaration
const method = component.properties.find(node => node.key.name === 'methods').value.properties.find(node => node.key.name === 'regenerateRoomWorlds')
function fixture() {
  const calls = [], api = { regenerateWorld: async input => { calls.push(['request', input]) } }
  const confirmation = { run: async () => {} }
  const methods = runInNewContext(`({ ${script.slice(method.start, method.end)} })`, {
    roomApi: api, confirmAction: (...args) => { calls.push(['confirm', ...args]); return confirmation.run() },
    canStopWorld: world => world.status === 'running' && world.controlAvailable !== false,
    toast: { success: text => calls.push(['success', text]), error: text => calls.push(['error', text]) }
  })
  const state = {
    ...methods, selectedRoom: { id: 'room-a', name: 'Example room' }, roomActionsBusy: false, roomControlAvailable: true,
    worlds: [{ id: 'caves', status: 'running' }, { id: 'master', status: 'running', role: 'master' }],
    worldIsMaster: world => world.role === 'master',
    $t: (key, vars) => `${key}:${JSON.stringify(vars || {})}`,
    setRoomActionPending: (id, kind, pending, token) => { calls.push(['pending', id, kind, pending, token]); state.roomActionsBusy = pending; return 7 },
    refreshWorkspace: async () => calls.push(['refresh'])
  }
  return { calls, api, confirmation, state }
}
test('overview reset confirms the whole room and submits once through Master', async () => {
  const { state, calls, confirmation } = fixture()
  let release
  confirmation.run = () => new Promise(resolve => { release = resolve })
  const first = state.regenerateRoomWorlds()
  await state.regenerateRoomWorlds()
  assert.equal(calls.filter(c => c[0] === 'request').length, 0)
  release()
  await first
  assert.equal(calls.filter(c => c[0] === 'confirm').length, 1)
  assert.deepEqual(JSON.parse(JSON.stringify(calls.find(c => c[0] === 'request')[1])), { room_id: 'room-a', world_id: 'master', confirmation: 'Example room' })
  assert.equal(state.roomActionsBusy, false)
  assert.ok(calls.some(c => c[0] === 'refresh'))
})
test('cancel, a stopped world, unavailable control and pending operations never submit reset', async () => {
  for (const mode of ['cancel', 'stopped', 'unavailable', 'pending']) {
    const { state, calls, confirmation } = fixture()
    if (mode === 'cancel') confirmation.run = async () => { throw new Error('cancel') }
    if (mode === 'stopped') state.worlds[0].status = 'stopped'
    if (mode === 'unavailable') state.roomControlAvailable = false
    if (mode === 'pending') state.roomActionsBusy = true
    await state.regenerateRoomWorlds()
    assert.ok(!calls.some(c => c[0] === 'request'), mode)
  }
})
test('failed reset shows the failure and releases the busy state', async () => {
  const { state, api, calls } = fixture()
  api.regenerateWorld = async () => { throw Object.assign(new Error('not ready'), { code: 'REGENERATE_WORLDS_NOT_READY' }) }
  await state.regenerateRoomWorlds()
  assert.equal(state.roomActionsBusy, false)
  assert.ok(calls.some(c => c[0] === 'error' && c[1].includes('regenerateNeedsRunning')))
  assert.ok(!calls.some(c => c[0] === 'success'))
})

test('shared reset adapter rechecks every room world, including worlds hidden by a machine filter', async () => {
  const source = readFileSync(new URL('../src/api/v2LegacyAdapters.js', import.meta.url), 'utf8')
  const ast = babelParse(source, { sourceType: 'module' }).program.body
  const declaration = ast.find(node => node.type === 'ExportNamedDeclaration' && node.declaration?.declarations?.[0]?.id.name === 'legacyRoomApi')
  const method = declaration.declaration.declarations[0].init.properties.find(node => node.key.name === 'regenerateWorld')
  const worlds = [{ id: 'master', status: 'running' }, { id: 'remote-caves', status: 'stopped' }]
  let sends = 0
  const api = runInNewContext(`({ ${source.slice(method.start, method.end)} })`, {
    resolveRoom: async () => ({ id: 'room', worlds }), roomReference: input => input.room_id,
    canStopWorld: world => world.status === 'running', selectedWorldIDs: () => ['master'],
    adapterError: code => Object.assign(new Error(code), { code }),
    consoleV2API: { execute: async () => { sends++; return { status: 'succeeded' } } },
    ROOM_JOB_TIMEOUT: 1000, invalidateRoomCatalog: () => {}, success: data => data
  })
  await assert.rejects(api.regenerateWorld({ room_id: 'room' }), { code: 'REGENERATE_WORLDS_NOT_READY' })
  assert.equal(sends, 0)
  worlds[1].status = 'running'
  await api.regenerateWorld({ room_id: 'room' })
  assert.equal(sends, 1)
})

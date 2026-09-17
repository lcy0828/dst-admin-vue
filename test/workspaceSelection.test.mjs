import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { babelParse, parse } from '@vue/compiler-sfc'
import { baseParse } from '@vue/compiler-dom'
import { selectWorkspaceRoom } from '../src/lib/fleetOverview.mjs'
import { managementScopeTargetId } from '../src/lib/managementScope.mjs'
import { readRoomView, readWorkspaceSelection, rememberWorkspaceView } from '../src/lib/workspacePreferences.mjs'

const source = parse(readFileSync(new URL('../src/views/servers/ServerWorkspace.vue', import.meta.url), 'utf8')).descriptor.script.content
const component = babelParse(source, { sourceType: 'module' }).program.body
  .find(node => node.type === 'ExportDefaultDeclaration').declaration
const names = new Set(['resolveSelection', 'restoreRoomView', 'rememberRoomView', 'handleManagementScopeChange', 'syncRouteContext', 'handleRoomChange', 'refreshWorkspace'])
const methodsSource = component.properties.find(node => node.key.name === 'methods').value.properties
  .filter(node => names.has(node.key.name)).map(node => source.slice(node.start, node.end)).join(',\n')
const routeWatcher = component.properties.find(node => node.key.name === 'watch').value.properties
  .find(node => node.key.value === '$route.query')

test('the actual workspace route key stays stable across room and machine changes', () => {
  const layout = parse(readFileSync(new URL('../src/layouts/MainLayoutV2.vue', import.meta.url), 'utf8')).descriptor.template.content
  function findRouterView(node) {
    if (node.tag === 'RouterView') return node
    return node.children?.map(findRouterView).find(Boolean)
  }
  const expression = findRouterView(baseParse(layout)).props.find(prop => prop.arg?.content === 'key').exp.content
  const routeKey = new Function('route', 'managementScopeRevision', `return ${expression}`)
  const before = routeKey({ path: '/dashboard', fullPath: '/dashboard?roomId=old&targetId=local' }, 0)
  const after = routeKey({ path: '/dashboard', fullPath: '/dashboard?roomId=running&targetId=agent:new' }, 1)
  assert.equal(after, before)
  assert.notEqual(routeKey({ path: '/mods', fullPath: '/mods?tab=room' }, 0), routeKey({ path: '/mods', fullPath: '/mods?tab=room' }, 1))
})

function fixture() {
  const storage = new Map()
  globalThis.localStorage = {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value)
  }
  const calls = []
  const reads = []
  const methods = runInNewContext(`({ ${methodsSource}, ${source.slice(routeWatcher.start, routeWatcher.end)} })`, {
    selectWorkspaceRoom, managementScopeTargetId, readRoomView, readWorkspaceSelection, rememberWorkspaceView,
    document: { visibilityState: 'visible' },
    roomApi: { getScopedRuntimeOverview: targetId => new Promise(resolve => reads.push({ targetId, resolve })) }
  })
  const stopped = { id: 'stopped', worlds: [{ id: 'master', status: 'stopped' }] }
  const running = { id: 'running', worlds: [{ id: 'master', status: 'running' }, { id: 'caves', status: 'stopped' }] }
  const state = {
    ...methods, rooms: [stopped, running], selectedRoomId: 'stopped', selectedWorldId: 'master',
    managementScope: { kind: 'target', targetId: 'local' }, preferRunningRoom: false,
    activeOperation: 'players', playerDisplayLimit: 5,
    refreshSequence: 0, contextSequence: 0, worldStateSequence: 0, connectionProbeSequence: 0,
    refreshInFlightCount: 0, workspaceDisposed: false, runtimeRefreshPending: false,
    $route: { path: '/dashboard', query: { targetId: 'local', roomId: 'stopped', worldId: 'master' } },
    $router: { replace: async value => calls.push(['route', value.query]) },
    syncConsoleTarget: () => {}, pruneStaleRoomActions: () => {}, clearRoomContext: () => {},
    refreshRoomContext: async () => calls.push(['context']),
    refreshPlayerStats: async () => {}, refreshWorldStates: async () => {}
  }
  Object.defineProperty(state, 'selectedRoom', { get: () => state.rooms.find(room => room.id === state.selectedRoomId) })
  Object.defineProperty(state, 'worlds', { get: () => state.selectedRoom?.worlds || [] })
  return { state, calls, reads, stopped, running }
}

test('workspace chooses a running room once, then leaves manual stopped-room selection alone', () => {
  const { state, stopped, running } = fixture()
  state.preferRunningRoom = true
  state.resolveSelection()
  assert.equal(state.selectedRoomId, running.id)
  assert.equal(state.preferRunningRoom, false)
  state.selectedRoomId = stopped.id
  state.resolveSelection()
  assert.equal(state.selectedRoomId, stopped.id)
})

test('machine metadata updates preserve the current room and do not reload the workspace', () => {
  const { state, reads } = fixture()
  state.handleManagementScopeChange({ detail: { kind: 'target', targetId: 'local', online: false, targetName: 'Renamed' } })
  assert.equal(state.selectedRoomId, 'stopped')
  assert.equal(state.rooms.length, 2)
  assert.equal(state.refreshSequence, 0)
  assert.equal(reads.length, 0)
})

test('late reads from earlier machine selections cannot replace the latest room or route', async () => {
  const { state, calls, reads, running, stopped } = fixture()
  const completions = []
  const refresh = state.refreshWorkspace
  state.refreshWorkspace = (...args) => {
    const pending = refresh.apply(state, args)
    completions.push(pending)
    return pending
  }
  state.handleManagementScopeChange({ detail: { kind: 'target', targetId: 'agent:first' } })
  state.handleManagementScopeChange({ detail: { kind: 'target', targetId: 'agent:second' } })
  assert.deepEqual(reads.map(read => read.targetId), ['agent:first', 'agent:second'])
  reads[1].resolve({ data: { rooms: [stopped, running] } })
  await completions[1]
  reads[0].resolve({ data: { rooms: [{ ...running, id: 'old-machine-room' }] } })
  await completions[0]
  assert.equal(state.selectedRoomId, running.id)
  const routeCalls = calls.filter(([kind]) => kind === 'route')
  assert.equal(routeCalls.length, 1)
  assert.equal(routeCalls[0][1].targetId, 'agent:second')
  assert.equal(routeCalls[0][1].roomId, running.id)
})

test('explicit room and world links update the workspace without remounting it', async () => {
  const { state, calls } = fixture()
  state.$route.query = { roomId: 'running', worldId: 'caves', targetId: 'local' }
  state['$route.query'](state.$route.query)
  assert.equal(state.selectedRoomId, 'running')
  assert.equal(state.selectedWorldId, 'caves')
  assert.equal(calls.filter(([kind]) => kind === 'context').length, 1)
  assert.equal(calls.filter(([kind]) => kind === 'route').length, 0)
  state['$route.query']({ roomId: 'stopped', worldId: 'master', targetId: 'agent:previous' })
  assert.equal(state.selectedRoomId, 'running')
  state['$route.query']({ roomId: 'deleted', targetId: 'local' })
  assert.equal(state.selectedRoomId, 'running')
})

test('switching rooms restores their individual tab, world and expansion preferences', async () => {
  const { state } = fixture()
  rememberWorkspaceView('local', 'running', { worldId: 'caves', activeOperation: 'chat', playerDisplayLimit: 'all' })
  state.selectedRoomId = 'running'
  await state.handleRoomChange()
  assert.equal(state.selectedWorldId, 'caves')
  assert.equal(state.activeOperation, 'chat')
  assert.equal(state.playerDisplayLimit, 'all')

  state.selectedRoomId = 'stopped'
  await state.handleRoomChange()
  assert.equal(state.activeOperation, 'players')
  assert.equal(state.playerDisplayLimit, 5)
  assert.equal(readRoomView('running').playerDisplayLimit, 'all')
})

test('a remembered stopped room wins over a running room when returning to its machine', async () => {
  const { state, reads, stopped, running } = fixture()
  rememberWorkspaceView('agent:second', 'stopped', { activeOperation: 'logs', playerDisplayLimit: 'all', worldId: 'deleted' })
  state.handleManagementScopeChange({ detail: { kind: 'target', targetId: 'agent:second' } })
  reads[0].resolve({ data: { rooms: [stopped, running] } })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(state.selectedRoomId, 'stopped')
  assert.equal(state.selectedWorldId, 'master')
  assert.equal(state.activeOperation, 'logs')
  assert.equal(state.playerDisplayLimit, 'all')
})

test('deleted room memories fall back to a running room and update the stored selection', () => {
  const { state } = fixture()
  rememberWorkspaceView('local', 'deleted', { activeOperation: 'console' })
  state.selectedRoomId = 'deleted'
  state.resolveSelection()
  assert.equal(state.selectedRoomId, 'running')
  assert.equal(state.activeOperation, 'players')
  assert.equal(readWorkspaceSelection('local').roomId, 'running')
})

test('an unavailable explicit room falls back to the remembered valid room', () => {
  const { state } = fixture()
  rememberWorkspaceView('local', 'stopped', { activeOperation: 'chat' })
  state.selectedRoomId = 'deleted'
  state.resolveSelection()
  assert.equal(state.selectedRoomId, 'stopped')
  assert.equal(state.activeOperation, 'chat')
})

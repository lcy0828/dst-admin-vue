import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { babelParse, parse } from '@vue/compiler-sfc'

const source = parse(readFileSync(new URL('../src/views/servers/ServerWorkspace.vue', import.meta.url), 'utf8')).descriptor.script.content
const component = babelParse(source, { sourceType: 'module' }).program.body
  .find(node => node.type === 'ExportDefaultDeclaration').declaration
const methodNames = new Set(['refreshPollingWorkspace', 'refreshWorldStates', 'refreshRoomContext', 'reloadPlayerStats'])
const methodsSource = component.properties.find(node => node.key.name === 'methods').value.properties
  .filter(node => methodNames.has(node.key.name))
  .map(node => source.slice(node.start, node.end)).join(',\n')

function fixture() {
  const calls = []
  const playerApi = { getPlayerStats: async () => ({ data: {} }) }
  const playersV2API = { refresh: async (...args) => { calls.push(['collect-players', ...args]); return {} } }
  const document = { visibilityState: 'visible' }
  const worldStatesV2API = {
    list: async roomId => {
      calls.push(['world-states', roomId])
      return { items: [{ worldId: 'Master', cycles: 200, season: 'summer' }] }
    }
  }
  const methods = runInNewContext(`({ ${methodsSource} })`, {
    document,
    worldStatesV2API,
    playerApi,
    playersV2API,
    waitForV2Job: async value => value,
    backupSetsV2API: { list: async () => ({ items: [{ id: 'backup-1' }] }) },
    topologyV2API: {
      get: async () => { calls.push(['topology']); return {} },
      infrastructure: async () => { calls.push(['infrastructure']); return {} }
    },
    configurationV2API: { room: async () => { calls.push(['configuration']); return { values: { maxSnapshots: 15 } } } }
  })
  const state = {
    ...methods,
    workspaceDisposed: false,
    contextLoading: false,
    refreshInFlightCount: 0,
    runtimeObservationState: 'live',
    worlds: [{ id: 'Master', status: 'running' }],
    runningWorlds: [{ id: 'Master', status: 'running' }],
    selectedRoom: { id: 'room-1', name: '666777' },
    selectedRoomId: 'room-1',
    contextSequence: 0,
    playerReadSequence: 0,
    playerStatsLoading: false,
    playerStats: null,
    worldStateSequence: 0,
    topologyDialogSequence: 0,
    connectionProbeSequence: 0,
    worldStateRefreshInFlight: false,
    worldStateSnapshots: [],
    contextErrors: {},
    refreshPlayerStats: async () => { calls.push(['players']) },
    refreshWorkspace: async (...args) => { calls.push(['overview', ...args]); return true },
    playerScopeWorldIds: () => [],
    consoleTargetsForSelectedRoom: () => [],
    syncConsoleTarget: () => {},
    detectDefaultConnectionAddress: () => { calls.push(['egress']) },
    errorState: (_key, error) => ({ message: error.message })
  }
  return { state, calls, document, worldStatesV2API, playerApi }
}

test('unchanged runtime inventory does not prevent live telemetry updates or cause overview reads', async () => {
  const { state, calls } = fixture()
  for (let index = 0; index < 3; index++) await state.refreshPollingWorkspace()
  assert.equal(calls.filter(([name]) => name === 'world-states').length, 3)
  assert.equal(calls.filter(([name]) => name === 'players').length, 3)
  assert.equal(calls.filter(([name]) => name === 'overview').length, 0)
  assert.equal(state.worldStateSnapshots[0].cycles, 200)
  assert.equal(state.worldStateSnapshots[0].season, 'summer')
})

test('live player and world-state reads start concurrently', async () => {
  const { state, calls } = fixture()
  let finishPlayers
  state.refreshPlayerStats = () => new Promise(resolve => { finishPlayers = resolve })
  const pending = state.refreshPollingWorkspace()
  try {
    assert.equal(calls[0]?.[0], 'world-states')
  } finally {
    finishPlayers()
    await pending
  }
})

for (const condition of ['hidden', 'disposed', 'stopped', 'context-loading', 'overview-loading']) {
  test(`scheduled workspace refresh is idle when ${condition}`, async () => {
    const { state, calls, document } = fixture()
    if (condition === 'hidden') document.visibilityState = 'hidden'
    if (condition === 'disposed') state.workspaceDisposed = true
    if (condition === 'stopped') state.runningWorlds = []
    if (condition === 'context-loading') state.contextLoading = true
    if (condition === 'overview-loading') state.refreshInFlightCount = 1
    assert.equal(await state.refreshPollingWorkspace(), false)
    assert.deepEqual(calls, [])
  })
}

test('a disconnected observation stream still refreshes the overview and world telemetry', async () => {
  const { state, calls } = fixture()
  state.runtimeObservationState = 'connecting'
  await state.refreshPollingWorkspace()
  assert.deepEqual(calls, [['overview', true]])
})

for (const status of ['starting', 'stopping', 'unknown']) {
  test(`the existing refresh interval observes a ${status} world even without inventory changes`, async () => {
    const { state, calls } = fixture()
    state.worlds[0].status = status
    state.runningWorlds = []
    await state.refreshPollingWorkspace()
    assert.deepEqual(calls, [['overview', true]])
  })
}

for (const status of ['stopped', 'failed', 'running']) {
  test(`a changed ${status} runtime status refreshes lifecycle controls without rereading telemetry`, async () => {
    const { state, calls, worldStatesV2API } = fixture()
    worldStatesV2API.list = async () => ({ items: [{
      worldId: 'Master', runtimeState: status, runtimeCode: status === 'running' ? 'SAVE_WRITE_FAILED' : ''
    }] })
    await state.refreshWorldStates()
    assert.equal(calls.length, 1)
    const [name, silent, options] = calls[0]
    assert.equal(name, 'overview')
    assert.equal(silent, true)
    assert.equal(options.refreshWorldStates, false)
    assert.equal(options.refreshPlayers, false)
  })
}

test('unchanged runtime status and unavailable placements do not request another overview', async () => {
  const { state, calls, worldStatesV2API } = fixture()
  worldStatesV2API.list = async () => ({ items: [{ worldId: 'Master', runtimeState: 'running' }] })
  await state.refreshWorldStates()
  state.worlds[0].status = 'unknown'
  state.worlds[0].controlAvailable = false
  await state.refreshWorldStates()
  assert.deepEqual(calls, [])
})

test('a pending telemetry read does not start an overview refresh after the page is hidden', async () => {
  const { state, calls, document, worldStatesV2API } = fixture()
  let complete
  worldStatesV2API.list = () => new Promise(resolve => { complete = resolve })
  const pending = state.refreshWorldStates()
  document.visibilityState = 'hidden'
  complete({ items: [{ worldId: 'Master', runtimeState: 'failed' }] })
  await pending
  assert.deepEqual(calls, [])
})

test('overlapping world-state refreshes share the pending read and accept its response', async () => {
  const { state, calls, worldStatesV2API } = fixture()
  let complete
  worldStatesV2API.list = () => {
    calls.push(['world-states'])
    return new Promise(resolve => { complete = resolve })
  }
  const pending = state.refreshWorldStates()
  await state.refreshWorldStates()
  assert.equal(calls.length, 1)
  assert.equal(state.worldStateRefreshInFlight, true)
  complete({ items: [{ worldId: 'Master', cycles: 201 }] })
  await pending
  assert.equal(state.worldStateSnapshots[0].cycles, 201)
  assert.equal(state.worldStateRefreshInFlight, false)
})

test('world-state errors stay visible and release the pending read for the next interval', async () => {
  const { state, worldStatesV2API } = fixture()
  const read = worldStatesV2API.list
  worldStatesV2API.list = async () => { throw new Error('node unavailable') }
  await state.refreshPollingWorkspace()
  assert.equal(state.contextErrors.worldStates.message, 'node unavailable')
  assert.equal(state.worldStateRefreshInFlight, false)
  worldStatesV2API.list = read
  await state.refreshPollingWorkspace()
  assert.equal(state.contextErrors.worldStates, null)
  assert.equal(state.worldStateSnapshots[0].cycles, 200)
})

for (const change of ['room', 'unmount']) {
  test(`a late world-state response cannot overwrite the view after ${change}`, async () => {
    const { state, worldStatesV2API } = fixture()
    let complete
    worldStatesV2API.list = () => new Promise(resolve => { complete = resolve })
    const pending = state.refreshWorldStates()
    if (change === 'room') state.selectedRoomId = 'room-2'
    else state.worldStateSequence++
    complete({ items: [{ worldId: 'Master', cycles: 201 }] })
    await pending
    assert.equal(state.worldStateSnapshots.length, 0)
    assert.equal(state.worldStateRefreshInFlight, false)
  })
}

test('room context keeps telemetry and backups without requesting closed tools', async () => {
  const { state, calls, worldStatesV2API } = fixture()
  let complete
  worldStatesV2API.list = () => new Promise(resolve => { complete = resolve })
  const pending = state.refreshRoomContext()
  state.worldStateSequence++
  state.worldStateSnapshots = [{ worldId: 'Master', cycles: 201 }]
  complete({ items: [{ worldId: 'Master', cycles: 200 }] })
  await pending
  assert.equal(state.contextLoading, false)
  assert.equal(state.worldStateSnapshots[0].cycles, 201)
  assert.equal(state.backups[0].id, 'backup-1')
  assert.equal(calls.some(([name]) => ['topology', 'infrastructure', 'configuration', 'egress'].includes(name)), false)
})

test('a player refresh cannot invalidate room loading or leave subsequent polling blocked', async () => {
  const { state, worldStatesV2API } = fixture()
  let finishWorlds
  worldStatesV2API.list = () => new Promise(resolve => { finishWorlds = resolve })
  const context = state.refreshRoomContext()
  await state.reloadPlayerStats()
  finishWorlds({ items: [] })
  await context
  assert.equal(state.contextLoading, false)
  assert.equal(state.backups[0].id, 'backup-1')
})

test('a temporary player list failure preserves the visible cards and retries on the next read', async () => {
  const { state, playerApi } = fixture()
  const previous = state.playerStats = { total_count: 1, recent_players: [{ user_id: 'KU_EXISTING' }] }
  playerApi.getPlayerStats = async () => { throw new Error('temporary connection loss') }
  await assert.rejects(state.reloadPlayerStats(), /temporary connection loss/)
  assert.equal(state.playerStats, previous)
  assert.equal(state.playerStatsLoading, false)
  assert.match(state.contextErrors.players.message, /temporary connection loss/)
  playerApi.getPlayerStats = async () => ({ data: previous })
  await state.reloadPlayerStats()
  assert.equal(state.contextErrors.players, null)
})

test('the initial empty player cache is collected once for active worlds in the selected room', async () => {
  const { state, calls, playerApi } = fixture()
  let reads = 0
  playerApi.getPlayerStats = async () => ({ data: ++reads === 1 ? { total_count: 0, recent_players: [] } : { total_count: 1, recent_players: [{ user_id: 'KU_CURRENT' }] } })
  state.runningWorlds = [{ id: 'Master', status: 'running' }, { id: 'Caves', status: 'running', paused: true }]
  await state.refreshRoomContext()
  assert.equal(state.playerStats.total_count, 1)
  assert.equal(state.playerStatsLoading, false)
  assert.equal(calls.filter(([name]) => name === 'collect-players').length, 1)
  const collect = calls.find(([name]) => name === 'collect-players')
  assert.equal(collect[1], 'room-1')
  assert.deepEqual(Array.from(collect[2]), ['Master'])
  await state.reloadPlayerStats()
  assert.equal(calls.filter(([name]) => name === 'collect-players').length, 1)
})

test('a room with only paused worlds reads its saved player list without sending collection commands', async () => {
  const { state, calls, playerApi } = fixture()
  state.runningWorlds = [{ id: 'Master', status: 'running', paused: true }]
  playerApi.getPlayerStats = async () => ({ data: { total_count: 0, recent_players: [] } })
  await state.refreshRoomContext()
  assert.equal(state.playerStats.total_count, 0)
  assert.equal(calls.some(([name]) => name === 'collect-players'), false)
})

test('a failed initial collection shows the failure and releases the loading state', async () => {
  const { state, playerApi } = fixture()
  playerApi.getPlayerStats = async () => { throw new Error('node unavailable') }
  await state.refreshRoomContext()
  assert.equal(state.playerStatsLoading, false)
  assert.match(state.contextErrors.players.message, /node unavailable/)
})


test('repeated empty-cache context reads do not enqueue another initial collection', async () => {
  const { state, calls, playerApi } = fixture()
  state.runningWorlds = [{ id: 'Master', status: 'running' }]
  playerApi.getPlayerStats = async () => ({ data: { total_count: 0, recent_players: [] } })
  await state.refreshRoomContext()
  await state.refreshRoomContext()
  assert.equal(calls.filter(([name]) => name === 'collect-players').length, 1)
})

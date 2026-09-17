import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { babelParse, parse } from '@vue/compiler-sfc'

const source = parse(readFileSync(new URL('../src/views/servers/ServerWorkspace.vue', import.meta.url), 'utf8')).descriptor.script.content
const component = babelParse(source, { sourceType: 'module' }).program.body.find(node => node.type === 'ExportDefaultDeclaration').declaration
const selected = new Set(['openRollbackDialog', 'loadRollbackConfiguration', 'selectRollbackDays', 'executeRollback',
  'refreshTopologyDialog', 'handleConnectionPopoverOpen', 'detectDefaultConnectionAddress', 'probeConnectionAddress'])
const methods = component.properties.find(node => node.key.name === 'methods').value.properties
  .filter(node => selected.has(node.key.name)).map(node => source.slice(node.start, node.end)).join(',\n')
const validity = component.properties.find(node => node.key.name === 'computed').value.properties.find(node => node.key.name === 'rollbackDaysValid')
const flush = async () => { for (let index = 0; index < 12; index++) await Promise.resolve() }

function fixture() {
  const calls = [], commands = []
  const read = (kind, roomId) => new Promise((resolve, reject) => calls.push({ kind, roomId, resolve, reject }))
  const context = {
    configurationV2API: { room: id => read('configuration', id) },
    topologyV2API: {
      get: id => read('topology', id), infrastructure: () => read('infrastructure'),
      detectNetworkProfileEgress: id => read('egress', id)
    },
    commandApi: { executeCommand: (...args) => commands.push(args) },
    canStopWorld: world => world.status === 'running', worldStatusMessage: () => '',
    egressProbeRegion: () => 'cn', toast: { warning() {}, error() {}, success() {} }
  }
  const state = {
    ...runInNewContext(`({ ${methods} })`, context),
    selectedRoomId: 'one', selectedRoom: { id: 'one' },
    roomActionsBusy: false, isWorldActionPending: () => false,
    rollbackDialogOpen: false, rollbackWorldId: '', rollbackDays: 1, rollbackExecuting: false,
    rollbackConfigurationSequence: 0, rollbackConfigurationLoading: false, rollbackConfigurationError: '', roomMaxSnapshots: null,
    topologyDialogSequence: 0, topologyDialogRefreshing: false, topologyDialogError: '',
    roomTopology: null, runtimeInfrastructure: null, connectionPopoverOpen: false,
    connectionProbeSequence: 0, connectionProbeKey: '', activeLocale: 'zh-CN',
    $t: (key, values) => values?.error || key
  }
  const computed = runInNewContext(`({ ${source.slice(validity.start, validity.end)} })`)
  Object.defineProperty(state, 'rollbackDaysValid', { get: () => computed.rollbackDaysValid.call(state) })
  Object.defineProperty(state, 'rollbackWorld', { get: () => ({ id: state.rollbackWorldId, status: 'running' }) })
  Object.defineProperty(state, 'roomConnection', { get: () => ({ profile: state.runtimeInfrastructure?.networkProfiles?.[0] }) })
  return { state, calls, commands }
}

test('rollback settings load only when opened and are reread on the next opening', async () => {
  const { state, calls } = fixture()
  assert.equal(calls.length, 0)
  state.openRollbackDialog({ id: 'Master', status: 'running' })
  assert.equal(state.rollbackConfigurationLoading, true)
  assert.equal(state.rollbackDaysValid, false)
  assert.equal(calls[0].kind, 'configuration')
  calls[0].resolve({ values: { maxSnapshots: 15 } })
  await flush()
  assert.equal(state.roomMaxSnapshots, 15)
  assert.equal(state.rollbackDaysValid, true)
  state.rollbackDialogOpen = false
  state.openRollbackDialog({ id: 'Master', status: 'running' })
  calls[1].resolve({ values: { maxSnapshots: 3 } })
  await flush()
  state.selectRollbackDays(20)
  assert.equal(state.rollbackDays, 3)
})

test('failed rollback settings prevent commands and expose a retryable error', async () => {
  const { state, calls, commands } = fixture()
  state.openRollbackDialog({ id: 'Master', status: 'running' })
  calls[0].reject(new Error('runtime disconnected'))
  await flush()
  assert.equal(state.rollbackConfigurationLoading, false)
  assert.equal(state.rollbackConfigurationError, 'runtime disconnected')
  assert.equal(state.rollbackDaysValid, false)
  await state.executeRollback()
  assert.equal(commands.length, 0)
  const retry = state.loadRollbackConfiguration()
  calls[1].resolve({ values: { maxSnapshots: 12 } })
  await retry
  assert.equal(state.rollbackConfigurationError, '')
  assert.equal(state.rollbackDaysValid, true)
})

test('invalid rollback limits are not replaced with a guessed valid value', async () => {
  const { state, calls } = fixture()
  state.openRollbackDialog({ id: 'Master', status: 'running' })
  calls[0].resolve({ values: { maxSnapshots: 0 } })
  await flush()
  assert.equal(state.rollbackDaysValid, false)
  assert.ok(state.rollbackConfigurationError)
})

test('late rollback settings cannot overwrite another room or a newer opening', async () => {
  const { state, calls } = fixture()
  state.openRollbackDialog({ id: 'Master', status: 'running' })
  state.selectedRoomId = 'two'
  state.selectedRoom = { id: 'two' }
  state.openRollbackDialog({ id: 'Master', status: 'running' })
  calls[1].resolve({ values: { maxSnapshots: 2 } })
  await flush()
  calls[0].resolve({ values: { maxSnapshots: 15 } })
  await flush()
  assert.equal(state.roomMaxSnapshots, 2)
})

for (const address of ['', '198.51.100.10']) {
  test(`opening direct connection reads topology and ${address ? 'uses the saved address' : 'probes a missing address'}`, async () => {
    const { state, calls } = fixture()
    state.handleConnectionPopoverOpen(false)
    assert.equal(calls.length, 0)
    state.handleConnectionPopoverOpen(true)
    state.handleConnectionPopoverOpen(true)
    assert.deepEqual(calls.map(call => call.kind), ['topology', 'infrastructure'])
    assert.equal(state.topologyDialogRefreshing, true)
    calls[0].resolve({ worlds: [] })
    calls[1].resolve({ networkProfiles: [{ id: 'profile', advertiseAddress: address }] })
    await flush()
    assert.equal(state.topologyDialogRefreshing, false)
    if (address) {
      assert.equal(calls.length, 2)
      assert.equal(state.connectionAddressDraft, address)
    } else {
      assert.equal(calls[2].kind, 'egress')
      calls[2].resolve({ address: '198.51.100.20' })
      await flush()
      assert.equal(state.connectionAddressDraft, '198.51.100.20')
    }
  })
}

test('topology alone does not probe the external address', async () => {
  const { state, calls } = fixture()
  const read = state.refreshTopologyDialog()
  calls[0].resolve({})
  calls[1].resolve({ networkProfiles: [{ id: 'profile' }] })
  await read
  assert.equal(calls.length, 2)
})

test('closing direct connection before loading finishes does not start an egress probe', async () => {
  const { state, calls } = fixture()
  state.handleConnectionPopoverOpen(true)
  state.handleConnectionPopoverOpen(false)
  calls[0].resolve({})
  calls[1].resolve({ networkProfiles: [{ id: 'profile' }] })
  await flush()
  assert.equal(calls.length, 2)
})

test('direct connection errors stay visible and retry rereads the dependencies', async () => {
  const { state, calls } = fixture()
  state.handleConnectionPopoverOpen(true)
  calls[0].resolve({})
  calls[1].reject(new Error('network configuration unavailable'))
  await flush()
  assert.equal(state.topologyDialogError, 'network configuration unavailable')
  assert.equal(state.topologyDialogRefreshing, false)
  const retry = state.refreshTopologyDialog()
  calls[2].resolve({})
  calls[3].resolve({ networkProfiles: [{ id: 'profile', advertiseAddress: '198.51.100.10' }] })
  await retry
  assert.equal(state.topologyDialogError, '')
  assert.equal(state.connectionAddressDraft, '198.51.100.10')
})

test('an automatic egress failure is visible without hiding the direct connection editor', async () => {
  const { state, calls } = fixture()
  state.handleConnectionPopoverOpen(true)
  calls[0].resolve({})
  calls[1].resolve({ networkProfiles: [{ id: 'profile' }] })
  await flush()
  calls[2].reject(new Error('probe timed out'))
  await flush()
  assert.equal(state.connectionAddressError, 'probe timed out')
  assert.equal(state.topologyDialogError, '')
  assert.equal(state.connectionAddressDetecting, false)
})

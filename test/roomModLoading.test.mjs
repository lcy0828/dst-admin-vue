import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { babelParse, parse } from '@vue/compiler-sfc'
import { computed, reactive, ref, watch } from 'vue'
import { buildRoomModOverview, roomModAttentionCount, roomModPrepareCount, roomModUpdateErrorKey } from '../src/lib/roomModOverview.mjs'
import { enrichModMetadata } from '../src/lib/modMetadata.mjs'
import { taskProgress } from '../src/lib/taskProgress.mjs'

const source = parse(readFileSync(new URL('../src/components/mods/RoomModOverview.vue', import.meta.url), 'utf8')).descriptor.scriptSetup.content
const script = babelParse(source, { sourceType: 'module' }).program.body
  .filter(node => node.type !== 'ImportDeclaration')
  .map(node => source.slice(node.start, node.end)).join('\n')
const workspace = parse(readFileSync(new URL('../src/views/servers/ServerWorkspace.vue', import.meta.url), 'utf8')).descriptor
const component = babelParse(workspace.script.content, { sourceType: 'module' }).program.body
  .find(node => node.type === 'ExportDefaultDeclaration').declaration
const methods = component.properties.find(node => node.key.name === 'methods').value.properties
const manualRefresh = methods.find(node => node.key.name === 'manualRefreshWorkspace')
const overviewID = component.properties.find(node => node.key.name === 'computed').value.properties
  .find(node => node.key.name === 'roomModOverviewId')
const workspaceMethods = runInNewContext(`({ ${[manualRefresh, overviewID].map(node => workspace.script.content.slice(node.start, node.end)).join(',')} })`)

const flush = () => new Promise(resolve => setImmediate(resolve))
const mod = id => ({ id, name: `Mod ${id}`, configured: true, enabled: true, runtimeFileStatus: 'ready' })

function fixture({ deferMetadata = false } = {}) {
  const calls = []
  const props = reactive({ roomId: 'room-1', roomName: '666777', worldCount: 2 })
  const jobStatus = { activeJobs: ref([]), rememberRoomLabel() {} }
  const stops = []
  let roomChanged
  let unmount
  const notifications = []
  function read(kind, roomId, items) {
    return new Promise((resolve, reject) => calls.push({ kind, roomId, items, resolve, reject }))
  }
  const state = runInNewContext(`${script}; ({ refresh, rows, mods, loading, loadError, metadataWarning, metadataLoading, incompleteMetadataIds, retryMetadata, overviewDescription, updateOverview, updateStateUnavailable, updateError, updateErrorDetail, updateKnown, statusLabel, applying })`, {
    computed, ref, buildRoomModOverview, roomModAttentionCount, roomModPrepareCount, roomModUpdateErrorKey, enrichModMetadata, taskProgress,
    defineProps: () => props, defineEmits: () => () => {}, defineExpose: () => {},
    useI18n: () => ({ t: key => key, locale: ref('en-US') }), useRouter: () => ({}),
    useSharedJobStatus: () => jobStatus,
    watch: (source, handler, options) => {
      if (Array.isArray(source)) stops.push(watch(source, handler, options))
      else {
        if (typeof source() === 'string') roomChanged = () => handler(source())
        if (options?.immediate) handler(source())
      }
    },
    onBeforeUnmount: handler => { unmount = handler },
    toast: { info: message => notifications.push(message), success: message => notifications.push(message) },
    modApi: {
      getModMetadata: items => deferMetadata ? read('metadata', props.roomId, items) : Promise.resolve({ metadata: {}, warning: '', incompleteModIds: [] }),
      getRoomModFacts: ({ roomId }) => read('mods', roomId),
      getModUpdateOverview: roomId => read('updates', roomId)
    }
  })
  return { state, calls, props, notifications, jobStatus, roomChanged: () => roomChanged(), unmount: () => { stops.forEach(stop => stop()); unmount() } }
}

test('existing job events refresh disk versions once before restart, without polling each world log update', async () => {
  const { state, calls, jobStatus, unmount } = fixture({ deferMetadata: true })
  const facts = manifest => ({ ...mod('1'), currentVersion: manifest, runtimeTotalTargets: 1,
    runtimeVersions: [{ targetId: 'debian', installationId: 'native', status: 'unknown', version: manifest, steamManifestId: manifest }] })
  const overview = { state: { status: 'activating', availableModIds: ['1'], preparedAt: '2026-09-14T15:35:34Z' } }
  const settleRead = async manifest => {
    calls.findLast(call => call.kind === 'mods').resolve([facts(manifest)])
    calls.findLast(call => call.kind === 'updates').resolve(overview)
    await flush()
    calls.findLast(call => call.kind === 'metadata').resolve({ metadata: { 1: { name: 'Insight', author: 'Author', version: '2', steamManifestId: '2' } }, warning: '', incompleteModIds: [] })
    await flush()
  }
  await settleRead('1')
  assert.equal(state.rows.value[0].updateAvailable, true)
  const job = { id: 'update-1', kind: 'mod.update.activate', roomId: 'room-1', status: 'running', progress: 60, progressDetail: { stage: 'mod.cache' } }
  jobStatus.activeJobs.value = [job]
  await flush()
  assert.equal(calls.filter(call => call.kind === 'mods').length, 1)
  // The same boundary emitted by the Controller after node downloads return.
  jobStatus.activeJobs.value = [{ ...job, progress: 80, progressDetail: { items: [{ workshopId: '1', status: 'succeeded' }] } }]
  await flush()
  assert.equal(state.rows.value[0].currentVersion, '1', 'old facts stay visible until the fresh response')
  await settleRead('2')
  assert.equal(state.rows.value[0].currentVersion, '2')
  assert.equal(state.rows.value[0].updateAvailable, false, 'pending restart IDs do not override confirmed disk versions')
  assert.equal(jobStatus.activeJobs.value[0].status, 'running')
  assert.equal(state.updateOverview.value.state.availableModIds.length, 1, 'restart tracking stays intact')
  const reads = calls.length
  for (const stage of ['stopping', 'starting', 'loading_mods', 'ready']) {
    jobStatus.activeJobs.value = [{ ...job, progress: 90, progressDetail: { stage: 'world.restart', worlds: [{ worldId: 'master', stage }] } }]
    await flush()
  }
  assert.equal(calls.length, reads, 'world progress must not trigger repeated Mod reads')
  jobStatus.activeJobs.value = []
  await flush()
  assert.equal(calls.filter(call => call.kind === 'mods').length, 3, 'completion from another page also refreshes the list')
  await settleRead('2')
  unmount()
})

test('opening another room during a restart does not add a second Mod refresh', async () => {
  const { state, calls, props, jobStatus, roomChanged, unmount } = fixture()
  calls.find(call => call.kind === 'mods').resolve([mod('1')])
  calls.find(call => call.kind === 'updates').resolve(null)
  await flush()
  jobStatus.activeJobs.value = [{ id: 'update-1', kind: 'mod.update.activate', roomId: 'room-1', status: 'running', progress: 80 }]
  await flush()
  const oldReads = calls.slice(-2)
  props.roomId = 'room-2'
  roomChanged()
  await flush()
  assert.equal(calls.filter(call => call.kind === 'mods' && call.roomId === 'room-2').length, 1)
  for (const call of calls.filter(call => call.roomId === 'room-2')) call.resolve(call.kind === 'mods' ? [mod('2')] : null)
  for (const call of oldReads) call.resolve(call.kind === 'mods' ? [mod('1')] : null)
  await flush()
  assert.equal(state.rows.value[0].id, '2')
  unmount()
})

test('the locally submitted update retains its own single completion refresh', async () => {
  const { state, calls, jobStatus, unmount } = fixture()
  calls.find(call => call.kind === 'mods').resolve([mod('1')])
  calls.find(call => call.kind === 'updates').resolve(null)
  await flush()
  state.applying.value = true
  jobStatus.activeJobs.value = [{ id: 'update-1', kind: 'mod.update.activate', roomId: 'room-1', status: 'running', progress: 80 }]
  await flush()
  calls.at(-1).resolve([mod('1')])
  calls.at(-2).resolve(null)
  await flush()
  const reads = calls.length
  jobStatus.activeJobs.value = []
  await flush()
  assert.equal(calls.length, reads, 'applyUpdates already performs the final refresh')
  unmount()
})

test('overview retries only missing metadata and keeps the action available after a failed attempt', async () => {
  const { state, calls, notifications } = fixture({ deferMetadata: true })
  calls.find(call => call.kind === 'mods').resolve([mod('1'), { ...mod('2'), currentVersion: '1.9.8' }])
  calls.find(call => call.kind === 'updates').resolve(null)
  await flush()
  calls.find(call => call.kind === 'metadata').resolve({ metadata: { 1: { name: 'Known', author: 'Author' } }, warning: 'missing', incompleteModIds: ['2'] })
  await flush()
  const known = state.mods.value[0]
  const retry = state.retryMetadata()
  assert.equal(state.metadataLoading.value, true)
  assert.equal(state.loading.value, false)
  const request = calls.at(-1)
  assert.deepEqual(Array.from(request.items, item => item.id), ['2'])
  await state.retryMetadata()
  assert.equal(calls.at(-1), request)
  request.reject(new Error('Steam timeout'))
  await retry
  assert.equal(state.metadataLoading.value, false)
  assert.equal(state.metadataWarning.value, 'Steam timeout')
  assert.equal(notifications.at(-1), 'mods.metadata.retryIncomplete')
  const completed = state.retryMetadata()
  calls.at(-1).resolve({ metadata: { 2: { name: 'Combined Status', author: 'rezecib', version: '2.0' } }, warning: '', incompleteModIds: [] })
  await completed
  assert.equal(state.mods.value[0], known)
  assert.equal(state.mods.value[1].name, 'Combined Status')
  assert.equal(state.mods.value[1].currentVersion, '1.9.8')
  assert.equal(state.mods.value[1].enabled, true)
  assert.equal(state.metadataWarning.value, '')
  assert.equal(state.incompleteMetadataIds.value.length, 0)
  assert.equal(state.metadataLoading.value, false)
  assert.equal(notifications.at(-1), 'mods.metadata.retryCompleted')
})

test('home summarizes an old repeated Steam timeout without hiding Mod facts or diagnostic details', async () => {
  const { state, calls } = fixture()
  const detail = ['load Steam Workshop details: context deadline exceeded',
    ...Array.from({ length: 21 }, (_, i) => `Workshop ${100 + i} 在 agent:debian12/native 的版本未确认：unknown`)].join('\n')
  calls.find(call => call.kind === 'mods').resolve([{ ...mod('100'), currentVersion: '1.9.8' }])
  calls.find(call => call.kind === 'updates').resolve({
    state: { status: 'blocked', errorCode: 'MOD_UPDATE_FAILED', errorMessage: detail, lastCheckedAt: '2026-09-11T16:22:50Z' }
  })
  await flush()
  assert.equal(state.updateError.value, 'mods.autoUpdate.errors.checkTimeout')
  assert.equal(state.updateErrorDetail.value, detail)
  assert.equal(state.updateKnown.value, true)
  assert.equal(state.rows.value[0].currentVersion, '1.9.8')
  assert.equal(state.rows.value[0].status, 'enabled')
  assert.equal(state.overviewDescription.value, 'servers.workspace.mods.updateUnavailableDescription')
  state.updateOverview.value = { state: { status: 'idle', lastCheckedAt: '2026-09-11T17:02:40Z' } }
  assert.equal(state.updateError.value, '')
  assert.equal(state.updateErrorDetail.value, '')
})

test('a retry finishing after a room switch does not show an old result or hide the new loading state', async () => {
  const { state, calls, props, roomChanged, notifications } = fixture({ deferMetadata: true })
  calls.find(call => call.kind === 'mods').resolve([mod('1')])
  calls.find(call => call.kind === 'updates').resolve(null)
  await flush()
  calls.find(call => call.kind === 'metadata').resolve({ metadata: {}, warning: 'missing', incompleteModIds: ['1'] })
  await flush()
  const oldRetry = state.retryMetadata()
  const oldRequest = calls.at(-1)
  props.roomId = 'room-2'
  roomChanged()
  for (const call of calls.filter(call => call.roomId === 'room-2')) call.resolve(call.kind === 'mods' ? [mod('2')] : null)
  await flush()
  oldRequest.resolve({ metadata: { 1: { name: 'Old' } }, warning: '', incompleteModIds: [] })
  await oldRetry
  assert.deepEqual(notifications, [])
  assert.equal(state.metadataLoading.value, true)
  calls.at(-1).resolve({ metadata: { 2: { name: 'New', author: 'Author' } }, warning: '', incompleteModIds: [] })
  await flush()
  assert.equal(state.mods.value[0].name, 'New')
  assert.equal(state.metadataWarning.value, '')
  assert.equal(state.metadataLoading.value, false)
})

test('slow or failed Steam metadata does not hold the loading state or hide Mod facts', async () => {
  const { state, calls } = fixture({ deferMetadata: true })
  calls.find(call => call.kind === 'mods').resolve([{ ...mod('1'), currentVersion: '1.9.8' }])
  await flush()
  assert.equal(state.loading.value, false)
  assert.equal(state.rows.value[0].name, 'Mod 1')
  calls.find(call => call.kind === 'metadata').resolve({ metadata: {}, warning: 'Steam timed out' })
  await flush()
  assert.equal(state.metadataWarning.value, 'Steam timed out')
  assert.equal(state.loadError.value, '')
  assert.equal(state.rows.value.length, 1)
  assert.equal(state.rows.value[0].currentVersion, '1.9.8')
  assert.equal(state.statusLabel(state.rows.value[0].status), 'servers.workspace.mods.status.enabled')
  calls.find(call => call.kind === 'updates').resolve(null)
})

test('home overview labels configured Mods as enabled without needing runtime load evidence', async () => {
  const { state, calls } = fixture()
  calls.find(call => call.kind === 'mods').resolve([
    { ...mod('1'), loaded: false },
    { ...mod('2'), loaded: true },
    { ...mod('3'), enabled: false, loaded: true },
    { ...mod('4'), configured: false, enabled: false, runtimeFileStatus: 'ready' }
  ])
  calls.find(call => call.kind === 'updates').resolve(null)
  await flush()
  const label = id => state.statusLabel(state.rows.value.find(row => row.id === id).status)
  assert.equal(label('1'), 'servers.workspace.mods.status.enabled')
  assert.equal(label('2'), 'servers.workspace.mods.status.enabled')
  assert.equal(label('3'), 'servers.workspace.mods.status.disabled')
  assert.equal(label('4'), 'servers.workspace.mods.status.ready')
  assert.equal(state.statusLabel('unexpected'), 'servers.workspace.mods.status.unknown')
})

test('late Steam metadata is discarded after switching rooms or unmounting', async () => {
  for (const unmounted of [false, true]) {
    const { state, calls, props, roomChanged, unmount } = fixture({ deferMetadata: true })
    calls.find(call => call.kind === 'mods').resolve([mod('1')])
    await flush()
    const oldMetadata = calls.find(call => call.kind === 'metadata')
    if (unmounted) unmount()
    else {
      props.roomId = 'room-2'
      roomChanged()
    }
    oldMetadata.resolve({ metadata: { 1: { previewUrl: '/old-image' } }, warning: 'old warning' })
    await flush()
    assert.equal(state.metadataWarning.value, '')
    assert.notEqual(state.mods.value[0]?.image, '/old-image')
    for (const call of calls) if (call !== oldMetadata) call.resolve(call.kind === 'mods' ? [] : null)
    await flush()
  }
})

test('Mod facts render without waiting for the update overview', async () => {
  const { state, calls } = fixture()
  assert.equal(state.loading.value, true)
  assert.equal(state.overviewDescription.value, 'servers.workspace.mods.loading')
  calls.find(call => call.kind === 'mods').resolve([mod('1')])
  await flush()
  assert.equal(state.loading.value, false)
  assert.equal(state.rows.value[0].name, 'Mod 1')
  assert.equal(state.updateOverview.value, null)
  calls.find(call => call.kind === 'updates').resolve({ state: { availableModIds: ['1'] } })
  await flush()
  assert.equal(state.rows.value[0].updateAvailable, true)
})

test('failed Mod reads show an error immediately, not a false empty room', async () => {
  const { state, calls } = fixture()
  calls.find(call => call.kind === 'mods').reject(new Error('I/O Operation Failed'))
  await flush()
  assert.equal(state.loading.value, false)
  assert.equal(state.loadError.value, 'I/O Operation Failed')
  assert.equal(state.overviewDescription.value, 'servers.workspace.mods.loadFailed')
  calls.find(call => call.kind === 'updates').resolve(null)
  await flush()
  assert.equal(state.loadError.value, 'I/O Operation Failed')
})

test('only a successful empty Mod response shows the empty room description', async () => {
  const { state, calls } = fixture()
  calls.find(call => call.kind === 'updates').resolve(null)
  await flush()
  assert.equal(state.overviewDescription.value, 'servers.workspace.mods.loading')
  calls.find(call => call.kind === 'mods').resolve([])
  await flush()
  assert.equal(state.overviewDescription.value, 'servers.workspace.mods.emptyDescription')
  assert.equal(state.loading.value, false)
})

test('update read failures do not hide current Mod facts', async () => {
  const { state, calls } = fixture()
  calls.find(call => call.kind === 'updates').reject(new Error('update state unavailable'))
  calls.find(call => call.kind === 'mods').resolve([mod('1')])
  await flush()
  assert.equal(state.rows.value.length, 1)
  assert.equal(state.loadError.value, '')
  assert.equal(state.updateStateUnavailable.value, true)
})

test('silent refresh keeps current rows visible and exposes failures', async () => {
  const { state, calls } = fixture()
  calls.find(call => call.kind === 'mods').resolve([mod('1')])
  calls.find(call => call.kind === 'updates').resolve(null)
  await flush()
  const pending = state.refresh({ silent: true })
  assert.equal(state.loading.value, false)
  assert.equal(state.rows.value[0].id, '1')
  calls.at(-1).reject(new Error('node offline'))
  calls.at(-2).resolve(null)
  await pending
  assert.equal(state.rows.value[0].id, '1')
  assert.equal(state.loadError.value, 'node offline')
})

test('late responses cannot replace Mods after switching rooms', async () => {
  const { state, calls, props, roomChanged } = fixture()
  const old = [...calls]
  props.roomId = 'room-2'
  roomChanged()
  assert.equal(state.rows.value.length, 0)
  for (const call of calls.filter(call => call.roomId === 'room-2')) {
    call.resolve(call.kind === 'mods' ? [mod('2')] : { state: { availableModIds: ['2'] } })
  }
  await flush()
  for (const call of old) call.resolve(call.kind === 'mods' ? [mod('1')] : { state: { availableModIds: ['1'] } })
  await flush()
  assert.equal(state.rows.value[0].id, '2')
  assert.equal(state.rows.value[0].updateAvailable, true)
})

test('unmounting discards pending Mod and update responses', async () => {
  const { state, calls, unmount } = fixture()
  unmount()
  for (const call of calls) call.resolve(call.kind === 'mods' ? [mod('1')] : { state: {} })
  await flush()
  assert.equal(state.rows.value.length, 0)
  assert.equal(state.updateOverview.value, null)
})

test('explicit room reloads can start Mod reads before the runtime overview', () => {
  const current = { selectedRoom: null, initialLoading: true, preferRunningRoom: false, selectedRoomId: 'room-1' }
  assert.equal(workspaceMethods.roomModOverviewId.call(current), 'room-1')
  current.preferRunningRoom = true
  assert.equal(workspaceMethods.roomModOverviewId.call(current), '')
  current.selectedRoom = { id: 'room-2' }
  assert.equal(workspaceMethods.roomModOverviewId.call(current), 'room-2')
  current.selectedRoom = null
  current.preferRunningRoom = false
  current.initialLoading = false
  assert.equal(workspaceMethods.roomModOverviewId.call(current), '')
})

test('manual refresh starts Mods alongside the workspace without an extra inventory request', async () => {
  const calls = []
  const completions = []
  const read = kind => {
    calls.push(kind)
    return new Promise(resolve => completions.push(resolve))
  }
  const state = {
    loading: false, workspaceDisposed: false,
    $refs: { roomModOverview: { refresh: options => { assert.equal(options.silent, true); return read('mods') } } },
    refreshWorkspace: () => read('overview')
  }
  const pending = workspaceMethods.manualRefreshWorkspace.call(state)
  assert.deepEqual(calls, ['mods', 'overview'])
  completions.forEach(resolve => resolve())
  await pending
  state.loading = true
  await workspaceMethods.manualRefreshWorkspace.call(state)
  assert.equal(calls.length, 2)
})

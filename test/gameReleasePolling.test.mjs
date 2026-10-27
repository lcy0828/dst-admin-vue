import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createRenderer, h, nextTick, reactive, ssrContextKey } from 'vue'
import { createI18n } from 'vue-i18n'
import { routeLocationKey } from 'vue-router'
import { gameReleaseMessages } from '../src/i18n/gameReleaseMessages.js'

let server, View, api
before(async () => {
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' })
  View = (await server.ssrLoadModule('/src/views/servers/GameReleases.vue')).default
  api = await server.ssrLoadModule('/src/api/v2.js')
})
after(async () => { await server?.close() })

const settle = async () => { for (let i = 0; i < 12; i++) { await nextTick(); await Promise.resolve() } }
const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done }), resolve: value => resolve(value) } }
const fixture = (id = 'release-1', stage = 'updating') => ({
  id, sourceJobId: 'job-1', stage, protectionBackupIds: ['backup-1'],
  plan: { installations: [{ targetId: 'local', installationId: 'default', targetName: 'Local runtime', shards: [
    { roomId: 'room-code', worldId: 'world-code', roomName: '测试房间', worldName: 'Master', wasRunning: true }
  ] }], affectedRoomIds: ['room-code'], policy: { restartRunning: true }, updateRequired: true },
  installations: [{ targetId: 'local', installationId: 'default', stage: 'updating' }],
  shards: [{ roomId: 'room-code', worldId: 'world-code', targetId: 'local', installationId: 'default', wasRunning: true, stage: 'staged' }]
})

function mount({ items = [fixture()], jobStatus = 'running', query = {}, historyResult } = {}) {
  let state, timerId = 0, currentItems = items
  const timers = new Map(), storage = new Map(), reads = []
  const oldWindow = globalThis.window, oldStorage = globalThis.sessionStorage
  const sessionStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
  globalThis.sessionStorage = sessionStorage
  globalThis.window = { addEventListener() {}, removeEventListener() {}, setTimeout: callback => { timers.set(++timerId, callback); return timerId }, clearTimeout: id => timers.delete(id), sessionStorage }
  api.gameReleasesV2API.list = async () => historyResult || { items: structuredClone(currentItems) }
  api.gameReleasesV2API.get = async id => { reads.push(id); return structuredClone(currentItems.find(item => item.id === id)) }
  api.jobsV2API.controlPlaneGet = async id => ({ id, status: jobStatus, progress: 100 })
  api.gameReleasesV2API.create = async () => { throw new Error('Polling must never create an update') }
  api.gameReleasesV2API.preview = async () => ({ ready: true, updateRequired: false, installations: [] })
  api.runtimeObservationsV2API.refresh = async () => ({})
  api.gameV2API.version = async () => ({ officialRelease: { version: '701' } })
  const component = { ...View, setup(props, context) { state = View.setup(props, context); return state }, render: () => null }
  const renderer = createRenderer({ createElement: () => ({}), createText: () => ({}), createComment: () => ({}), insert() {}, remove() {}, patchProp() {}, setElementText() {}, setText() {}, parentNode: () => null, nextSibling: () => null })
  const app = renderer.createApp({ render: () => h(component) })
  app.provide(ssrContextKey, { modules: new Set() })
  app.provide(routeLocationKey, reactive({ query }))
  app.use(createI18n({ legacy: false, locale: 'zh-CN', messages: gameReleaseMessages }))
  app.mount({})
  return {
    state, timers, reads, items: value => { currentItems = value },
    unmount() { app.unmount(); globalThis.window = oldWindow; globalThis.sessionStorage = oldStorage }
  }
}

test('opening the page discovers externally started updates without session storage and uses real names', async () => {
  const view = mount()
  try {
    await settle()
    assert.equal(view.state.activeJob.value.id, 'job-1')
    assert.equal(view.state.trackedRelease.value.stage, 'updating')
    assert.equal(view.state.activeJobRunning.value, true)
    assert.equal(view.state.selectedReleaseShards.value[0].roomName, '测试房间')
    assert.equal(view.state.shardName(view.state.selectedReleaseShards.value[0]), '测试房间 / Master')
    assert.equal(view.state.targetName(view.state.selectedReleaseInstallations.value[0]), '本机')
    assert.equal(view.timers.size, 1)
  } finally { view.unmount() }
})

test('a successful job does not stop tracking an update until its actual release is complete', async () => {
  const view = mount({ jobStatus: 'succeeded' })
  try {
    await settle()
    assert.equal(view.state.activeJobRunning.value, true)
    assert.equal(view.timers.size, 1)
    const complete = fixture('release-1', 'succeeded')
    complete.installations[0] = { ...complete.installations[0], stage: 'succeeded', beforeVersion: '700', afterVersion: '701', writeState: 'verified' }
    complete.shards[0] = { ...complete.shards[0], stage: 'succeeded', runtimeState: 'running', loadConfirmedAt: '2026-10-27T12:00:00Z' }
    view.items([complete])
    await view.state.pollActivity('job-1', 'release-1')
    assert.equal(view.state.trackedRelease.value.stage, 'succeeded')
    assert.equal(view.state.selectedRelease.value.installations[0].afterVersion, '701')
    assert.equal(view.state.activeJobRunning.value, false)
    assert.equal(view.timers.size, 0)
  } finally { view.unmount() }
})

test('polling an active update does not overwrite a different historical selection', async () => {
  const old = fixture('old-release', 'succeeded')
  old.sourceJobId = 'old-job'
  const view = mount({ items: [fixture(), old] })
  try {
    await settle()
    await view.state.openDetails(old)
    await view.state.pollActivity('job-1', 'release-1')
    assert.equal(view.state.selectedRelease.value.id, 'old-release')
    assert.equal(view.state.trackedRelease.value.id, 'release-1')
  } finally { view.unmount() }
})

test('an old failed source job does not stop monitoring a retry that is actually running', async () => {
  const view = mount({ jobStatus: 'failed' })
  try {
    await settle()
    for (let i = 0; i < 12; i++) await view.state.pollActivity('job-1', 'release-1')
    assert.equal(view.state.activeJobRunning.value, true)
    assert.equal(view.state.trackedRelease.value.stage, 'updating')
    assert.equal(view.state.taskError.value, '')
    assert.equal(view.timers.size, 1)
  } finally { view.unmount() }
})

test('release details remain readable when the generic jobs endpoint is temporarily unavailable', async () => {
  const view = mount()
  try {
    await settle()
    api.jobsV2API.controlPlaneGet = async () => { throw new Error('Job endpoint unavailable') }
    view.items([fixture('release-1', 'protecting')])
    await view.state.pollActivity('job-1', 'release-1')
    assert.equal(view.state.trackedRelease.value.stage, 'protecting')
    assert.equal(view.state.taskError.value, '')
    assert.equal(view.timers.size, 1)
  } finally { view.unmount() }
})

test('unmount cancels polling and late detail responses cannot revive it', async () => {
  const view = mount()
  await settle()
  const held = deferred()
  api.gameReleasesV2API.get = () => held.promise
  const request = view.state.pollActivity('job-1', 'release-1')
  await settle()
  view.unmount()
  held.resolve(fixture('release-1', 'succeeded'))
  await request
  assert.equal(view.timers.size, 0)
  assert.equal(view.state.trackedRelease.value.stage, 'updating')
})

test('late initial history cannot start background polling after leaving the page', async () => {
  const held = deferred()
  const view = mount({ historyResult: held.promise })
  view.unmount()
  held.resolve({ items: [fixture()] })
  await settle()
  assert.equal(view.state.activeJob.value, null)
  assert.equal(view.timers.size, 0)
})

test('tracking still works without browser storage, and repeated read failures allow a manual retry', async () => {
  const view = mount()
  try {
    await settle()
    globalThis.sessionStorage.setItem = () => { throw new Error('Storage disabled') }
    view.state.startPolling({ id: 'job-1', status: 'running' }, 'release-1')
    await settle()
    assert.equal(view.state.trackedRelease.value.stage, 'updating')
    api.gameReleasesV2API.get = async () => { throw new Error('Disconnected') }
    for (let i = 0; i < 5; i++) await view.state.pollActivity('job-1', 'release-1')
    assert.equal(view.timers.size, 0)
    assert.equal(view.state.taskError.value, 'Disconnected')
    api.gameReleasesV2API.get = async () => fixture('release-1', 'confirming')
    view.state.startPolling({ id: 'job-1', status: 'running' }, 'release-1')
    await settle()
    assert.equal(view.state.trackedRelease.value.stage, 'confirming')
    assert.equal(view.state.taskError.value, '')
    assert.equal(view.timers.size, 1)
  } finally { view.unmount() }
})

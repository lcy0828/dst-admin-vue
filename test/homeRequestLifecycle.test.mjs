import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { ref as vueRef, computed as vueComputed, watch as vueWatch } from 'vue'
import { babelParse, parse } from '@vue/compiler-sfc'
import { createAsyncResourceCache } from '../src/lib/asyncResourceCache.mjs'
import { managementScopeTargetId } from '../src/lib/managementScope.mjs'
import { createRuntimeObservationStreamRegistry, runtimeObservationChangesViews } from '../src/lib/runtimeObservationStreams.mjs'
import { GLOBAL_JOB_SUBMITTED_EVENT, globalJobWarning, mergeActiveJobs, parseGlobalJobEvent, reduceGlobalJobEvent } from '../src/lib/globalJobs.mjs'
import { isActiveJob, isTaskProgressJob, retainCompletedProgressJob } from '../src/lib/taskProgress.mjs'

function script(path) {
  const file = readFileSync(new URL('../src/' + path, import.meta.url), 'utf8')
  return path.endsWith('.vue') ? parse(file).descriptor.scriptSetup.content : file
}

function body(source) {
  return babelParse(source, { sourceType: 'module' }).program.body
}

function moduleScript(path) {
  const source = script(path)
  return body(source).filter(node => node.type !== 'ImportDeclaration').map(node => {
    const declaration = node.type === 'ExportNamedDeclaration' ? node.declaration : node
    return declaration ? source.slice(declaration.start, declaration.end) : ''
  }).join('\n')
}

const flush = async () => { for (let index = 0; index < 12; index++) await Promise.resolve() }
const ref = value => ({ value })
const computed = get => ({ get value() { return get() } })

function lifecycle() {
  const mounts = [], unmounts = [], streams = [], timers = new Map(), listeners = new Map()
  let timerID = 0
  const document = {
    visibilityState: 'visible',
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name)
  }
  class EventSource {
    constructor(url) { this.url = url; this.handlers = {}; this.closed = false; streams.push(this) }
    addEventListener(name, handler) { this.handlers[name] = handler }
    close() { this.closed = true }
    emit(name, data, lastEventId = '') { this.handlers[name]?.({ data: JSON.stringify(data), lastEventId }) }
  }
  const context = {
    ref, computed, document, EventSource,
    onMounted: fn => mounts.push(fn), onBeforeUnmount: fn => unmounts.push(fn),
    window: { ...document, dispatchEvent() {} },
    setTimeout: fn => { const id = ++timerID; timers.set(id, fn); return id },
    clearTimeout: id => timers.delete(id)
  }
  return { context, mounts, unmounts, streams, timers, listeners, mount: () => mounts.forEach(fn => fn()), unmount: () => unmounts.forEach(fn => fn()) }
}

function jobsFixture({ unavailable = false, throwing = false, reactive = false } = {}) {
  const fixture = lifecycle()
  const calls = []
  Object.assign(fixture.context, {
    GLOBAL_JOB_SUBMITTED_EVENT, mergeActiveJobs, parseGlobalJobEvent, reduceGlobalJobEvent,
    isActiveJob, isTaskProgressJob, retainCompletedProgressJob,
    inject: (_key, fallback) => fallback,
    jobsV2API: {
      eventsURL: after => '/jobs/events?after=' + after,
      controlPlaneList: params => new Promise((resolve, reject) => calls.push({ ...params, resolve, reject }))
    }
  })
  if (reactive) Object.assign(fixture.context, {
    ref: vueRef, computed: vueComputed, watch: vueWatch,
    waitForV2Job: (job, timeout, report, options) => { report?.(job); return options.observe(job, Date.now() + timeout, report) }
  })
  if (unavailable) fixture.context.EventSource = undefined
  if (throwing) fixture.context.EventSource = class { constructor() { throw new Error('SSE disabled') } }
  const api = runInNewContext(moduleScript('composables/useGlobalJobStatus.js') + '\nuseGlobalJobStatus()', fixture.context)
  const finish = (items = []) => { for (const call of calls) call.resolve({ items: items.filter(job => job.status === call.status) }) }
  return { ...fixture, api, calls, finish }
}

test('job subscription initializes queued and running once after the cursor', async () => {
  const f = jobsFixture()
  f.mount()
  assert.equal(f.calls.length, 0)
  f.streams[0].emit('job.cursor', { watermark: 10 })
  assert.deepEqual(f.calls.map(call => call.status), ['queued', 'running'])
  assert.equal(f.timers.size, 0)
  f.finish([{ id: 'a', status: 'running' }])
  await flush()
  f.listeners.get('pageshow')()
  assert.equal(f.calls.length, 2)
  assert.equal(f.streams.length, 1)
  assert.equal(f.api.activeCount.value, 1)
  f.unmount()
})

test('task entry and dock reuse their layout provider without opening another stream', () => {
  const f = jobsFixture()
  f.context.inject = () => f.api
  const child = runInNewContext(moduleScript('composables/useGlobalJobStatus.js') + '\nuseGlobalJobStatus()', { ...f.context })
  assert.equal(child, f.api)
  f.mount()
  assert.equal(f.streams.length, 1)
  f.unmount()
})

test('reloaded task components keep the mounted layout state and its single subscription', () => {
  const f = jobsFixture()
  const provided = new Map()
  const context = {
    ...f.context,
    provide: (key, value) => provided.set(key, value),
    inject: (key, fallback) => provided.get(key) ?? fallback
  }
  const source = moduleScript('composables/useGlobalJobStatus.js')
  const parent = runInNewContext(source + '\nprovideGlobalJobStatus()', context)
  // A separate module evaluation models Vite replacing the composable while
  // MainLayoutV2 and its provided task state remain mounted.
  const dock = runInNewContext(source + '\nuseSharedJobStatus()', { ...context })
  assert.equal(dock, parent)
  const header = runInNewContext(source + '\nuseGlobalJobStatus()', { ...context })
  assert.equal(header, parent)
  // Only mount the provider created for this test, not jobsFixture's helper.
  f.mounts.at(-1)()
  assert.equal(f.streams.length, 1)
  f.streams[0].emit('job.progress', { data: { id: 'start-after-reload', kind: 'room.start', status: 'running', progress: 55 } })
  assert.equal(dock.activeJobs.value[0].progress, 55)
  assert.equal(header.activeCount.value, 1)
  f.unmounts.at(-1)()
})

test('download dock reads cached Mod names once across byte progress updates', async () => {
  const api = { activeJobs: vueRef([]), recentProgressJobs: vueRef([]), closedProgressIds: vueRef([]), focusedJobId: vueRef(''), dockExpanded: vueRef(false), dockMinimized: vueRef(false), roomLabels: vueRef({}), jobLabels: vueRef({}), rememberRoomLabel() {} }
  const calls = []
  const stops = []
  const context = { ref: vueRef, computed: vueComputed,
    watch: (...args) => { const stop = vueWatch(...args); stops.push(stop); return stop },
    useSharedJobStatus: () => api, useI18n: () => ({ t: key => key }),
    isTaskProgressJob, taskProgress: () => ({}), readableTaskText: value => value,
    globalJobKindLabel: () => '', globalJobWarning, setTimeout, clearTimeout,
    modsV2API: { metadata: async (ids, options) => { calls.push({ ids: [...ids], ...options }); return { items: {} } } },
    roomsV2API: { get: async () => ({ name: 'Room', targetIds: [] }) },
    runtimeTargetsV2API: { list: async () => ({ items: [] }) }
  }
  runInNewContext(moduleScript('components/layout/RoomUpdateProgress.vue'), context)
  const job = { id: 'a', kind: 'mod.update.activate', roomId: 'room', status: 'running', progressDetail: { items: [{ workshopId: '100', status: 'queued' }, { workshopId: '200', status: 'queued' }] } }
  api.activeJobs.value = [job]
  await flush()
  api.activeJobs.value = [{ ...job, progress: 40, progressDetail: { items: job.progressDetail.items.map(item => ({ ...item, status: 'downloading', currentBytes: 25 })) } }]
  await flush()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].cached, true)
  assert.deepEqual(calls[0].ids, ['100', '200'])
  stops.forEach(stop => stop())
})

test('multiple mod observers share one stream, keep separate results, and close only finished displays', async () => {
  const f = jobsFixture({ reactive: true })
  f.mount()
  const a = { id: 'a', kind: 'mod.installation.download', status: 'running' }
  const b = { id: 'b', kind: 'mod.installation.update-all', status: 'running' }
  f.listeners.get(GLOBAL_JOB_SUBMITTED_EVENT)({ detail: a })
  f.listeners.get(GLOBAL_JOB_SUBMITTED_EVENT)({ detail: b })
  const seen = []
  const first = f.api.waitForJob(a, 10000, value => seen.push(value.id + ':' + value.status))
  const second = f.api.waitForJob(b, 10000)
  f.api.closeJobProgress('a')
  assert.equal(f.api.closedProgressIds.value.length, 0)
  f.streams[0].emit('job.completed', { data: { ...a, status: 'succeeded' } })
  assert.equal((await first).status, 'succeeded')
  assert.equal(f.api.activeJobs.value[0].id, 'b')
  f.api.closeJobProgress('a')
  assert.ok(f.api.closedProgressIds.value.includes('a'))
  f.api.showJobProgress('a')
  assert.equal(f.api.closedProgressIds.value.length, 0)
  f.streams[0].emit('job.completed', { data: { ...b, status: 'failed', error: { message: 'I/O Operation Failed' } } })
  assert.equal((await second).error.message, 'I/O Operation Failed')
  assert.equal(f.streams.length, 1)
  assert.equal(f.calls.length, 0)
  assert.ok(seen.includes('a:succeeded'))
  f.unmount()
})

test('reconnect recovers completed mod jobs missed while the page was hidden', async () => {
  const f = jobsFixture()
  const reads = []
  f.context.jobsV2API.controlPlaneGet = async id => { reads.push(id); return { id, kind: 'mod.installation.download', status: 'succeeded' } }
  f.mount()
  f.listeners.get(GLOBAL_JOB_SUBMITTED_EVENT)({ detail: { id: 'missed', kind: 'mod.installation.download', status: 'running' } })
  f.context.document.visibilityState = 'hidden'
  f.listeners.get('visibilitychange')()
  f.context.document.visibilityState = 'visible'
  f.listeners.get('visibilitychange')()
  f.streams.at(-1).emit('job.cursor', { watermark: 12 })
  f.finish([])
  await flush()
  assert.deepEqual(reads, ['missed'])
  assert.equal(f.api.recentProgressJobs.value[0].status, 'succeeded')
  f.unmount()
})

test('ordinary startup submissions focus the shared dock without replacing newer SSE progress', () => {
  for (const kind of ['room.start', 'room.restart', 'rooms.start', 'rooms.restart']) {
    const f = jobsFixture()
    f.mount()
    f.api.focusedJobId.value = 'old-mod-job'
    f.api.dockMinimized.value = true
    const job = { id: 'world-job', kind, status: 'running', progressDetail: { worlds: [{ worldId: 'master', name: 'Master', stage: 'loading_world', percent: 80 }] } }
    f.streams[0].emit('job.progress', { data: job })
    f.listeners.get(GLOBAL_JOB_SUBMITTED_EVENT)({ detail: { ...job, status: 'queued', progressDetail: null } })
    assert.equal(f.api.focusedJobId.value, job.id)
    assert.equal(f.api.dockMinimized.value, false)
    assert.equal(f.api.activeJobs.value[0].progressDetail.worlds[0].stage, 'loading_world')
    f.streams[0].emit('job.completed', { data: { ...job, status: 'succeeded' } })
    assert.equal(f.api.recentProgressJobs.value[0].id, job.id)
    f.api.closeJobProgress(job.id)
    f.api.showJobProgress(job.id)
    assert.equal(f.api.closedProgressIds.value.includes(job.id), false)
    assert.equal(f.calls.length, 0)
    assert.equal(f.streams.length, 1)
    f.unmount()
  }
})

test('a late submission response cannot put a finished Mod task back in the active list', () => {
  const f = jobsFixture()
  f.mount()
  const job = { id: 'fast', kind: 'mod.installation.download', status: 'succeeded' }
  f.streams[0].emit('job.completed', { data: job })
  f.listeners.get(GLOBAL_JOB_SUBMITTED_EVENT)({ detail: { ...job, status: 'queued', displayName: 'Local download' } })
  assert.equal(f.api.activeJobs.value.length, 0)
  assert.equal(f.api.recentProgressJobs.value[0].status, 'succeeded')
  assert.equal(f.api.jobLabels.value.fast, 'Local download')
  f.unmount()
})

for (const mode of ['unavailable', 'throwing', 'error', 'delayed']) {
  test(`task lists remain available when subscription is ${mode}`, async () => {
    const f = jobsFixture({ [mode]: true })
    f.mount()
    if (mode === 'error') f.streams[0].onerror()
    if (mode === 'delayed') {
      const [id, tick] = [...f.timers][0]
      f.timers.delete(id)
      tick()
    }
    assert.equal(f.calls.length, 2)
    f.finish([{ id: 'a', status: 'queued' }])
    await flush()
    assert.equal(f.api.activeCount.value, 1)
    f.unmount()
    assert.equal(f.timers.size, 0)
  })
}

test('late subscription resynchronizes after an earlier fallback read finishes', async () => {
  const f = jobsFixture()
  f.mount()
  f.streams[0].onerror()
  f.streams[0].emit('job.cursor', { watermark: 20 })
  assert.equal(f.calls.length, 2)
  f.finish()
  await flush()
  assert.equal(f.calls.length, 4)
  f.finish([{ id: 'new', status: 'running' }])
  await flush()
  assert.equal(f.api.activeJobs.value[0].id, 'new')
  f.unmount()
})

test('pending job lists do not overwrite progress, completed jobs, or local submissions', async () => {
  const f = jobsFixture()
  f.mount()
  f.streams[0].emit('job.cursor', { watermark: 20 })
  f.streams[0].emit('job.progress', { data: { id: 'progress', status: 'running', progress: 90 } }, '21')
  f.streams[0].emit('job.completed', { data: { id: 'finished', status: 'failed' } }, '22')
  f.listeners.get(GLOBAL_JOB_SUBMITTED_EVENT)({ detail: { id: 'submitted', status: 'queued' } })
  f.finish([
    { id: 'progress', status: 'running', progress: 10 },
    { id: 'finished', status: 'running' },
    { id: 'other', status: 'queued' }
  ])
  await flush()
  assert.deepEqual(Array.from(f.api.activeJobs.value, job => job.id).sort(), ['other', 'progress', 'submitted'])
  assert.equal(f.api.activeJobs.value.find(job => job.id === 'progress').progress, 90)
  assert.equal(f.api.failureCount.value, 1)
  f.unmount()
})

test('hidden pages close the stream, discard late reads, and resume with the saved cursor', async () => {
  const f = jobsFixture()
  f.mount()
  f.streams[0].emit('job.cursor', { watermark: 20 })
  f.context.document.visibilityState = 'hidden'
  f.listeners.get('visibilitychange')()
  assert.equal(f.streams[0].closed, true)
  f.finish([{ id: 'old', status: 'running' }])
  await flush()
  assert.equal(f.api.activeCount.value, 0)
  f.context.document.visibilityState = 'visible'
  f.listeners.get('visibilitychange')()
  assert.equal(f.streams.length, 2)
  assert.equal(f.streams[1].url, '/jobs/events?after=20')
  assert.equal(f.calls.length, 2)
  f.streams[1].emit('job.cursor', { watermark: 21 })
  assert.equal(f.calls.length, 4)
  f.finish()
  await flush()
  f.unmount()
})

test('runtime stream stays connected on metadata hydration and reconnects on actual target changes', () => {
  const f = lifecycle()
  let scope = { kind: 'target', targetId: 'agent:a' }
  Object.assign(f.context, {
    getManagementScope: () => scope, managementScopeTargetId,
    MANAGEMENT_SCOPE_CHANGED_EVENT: 'scope', RUNTIME_OBSERVATION_UPDATED_EVENT: 'runtime',
    runtimeObservationChangesViews, invalidateScopedRuntimeOverviewCaches() {},
    runtimeObservationsV2API: { streamURL: value => value.targetId },
    createRuntimeObservationStreamRegistry: options => createRuntimeObservationStreamRegistry({
      ...options, visibilityDocument: null, eventSourceFactory: url => new f.context.EventSource(url)
    })
  })
  runInNewContext(moduleScript('composables/useRuntimeObservation.js') + '\nuseRuntimeObservation()', f.context)
  f.mount()
  scope = { ...scope, agentId: 'a', targetName: 'renamed', online: false }
  f.listeners.get('scope')({ detail: scope })
  assert.equal(f.streams.length, 1)
  assert.equal(f.streams[0].closed, false)
  scope = { kind: 'target', targetId: 'agent:b' }
  f.listeners.get('scope')({ detail: scope })
  assert.equal(f.streams.length, 2)
  assert.equal(f.streams[0].closed, true)
  f.unmount()
  assert.equal(f.streams[1].closed, true)
})

for (const path of ['components/layout/GameVersionStatus.vue', 'composables/useDashboardV2.js']) {
  test(`${path} updates metadata without refreshing the same target`, () => {
    const source = script(path)
    const nodes = body(source)
    const fn = path.endsWith('.vue')
      ? nodes.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'handleManagementScopeChange')
      : nodes.find(node => node.type === 'ExportNamedDeclaration' && node.declaration?.id?.name === 'useDashboardV2')
        .declaration.body.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'handleManagementScopeChange')
    const context = { managementScope: ref({ kind: 'target', targetId: 'agent:a' }), managementScopeTargetId }
    const handle = runInNewContext(source.slice(fn.start, fn.end) + '\nhandleManagementScopeChange', context)
    handle({ detail: { kind: 'target', targetId: 'agent:a', targetName: 'renamed' } })
    assert.equal(context.managementScope.value.targetName, 'renamed')
  })
}

test('overview in-flight sharing survives metadata updates but not a real scope switch', async () => {
  const source = script('api/v2LegacyAdapters.js')
  const node = body(source).find(node => node.type === 'IfStatement')
  const cache = createAsyncResourceCache({ ttlMs: 0 })
  let scope = { kind: 'target', targetId: 'agent:a' }, listener, reads = 0
  runInNewContext(source.slice(node.start, node.end), {
    MANAGEMENT_SCOPE_CHANGED_EVENT: 'scope',
    managementScopeTargetId: (value = scope) => managementScopeTargetId(value),
    invalidateRoomCatalog: () => cache.invalidate(),
    window: { addEventListener: (_name, fn) => { listener = fn } }
  })
  const read = () => cache.load(() => { reads++; return new Promise(() => {}) })
  read()
  scope = { ...scope, agentId: 'a' }
  listener({ detail: scope })
  read()
  await flush()
  assert.equal(reads, 1)
  scope = { kind: 'target', targetId: 'agent:b' }
  listener({ detail: scope })
  read()
  await flush()
  assert.equal(reads, 2)
})

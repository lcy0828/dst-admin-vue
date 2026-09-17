import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { babelParse } from '@vue/compiler-sfc'
import { fleetNodeResourceStatus, nodeResourceStatus } from '../src/lib/systemResourceMetrics.mjs'
import { managementScopeTargetId } from '../src/lib/managementScope.mjs'

const source = readFileSync(new URL('../src/composables/useSystemResourceStatus.js', import.meta.url), 'utf8')
const script = babelParse(source, { sourceType: 'module' }).program.body
  .filter(node => node.type !== 'ImportDeclaration')
  .map(node => node.type === 'ExportNamedDeclaration' ? source.slice(node.declaration.start, node.declaration.end) : source.slice(node.start, node.end))
  .join('\n')

function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function sample(time = '2026-09-06T05:35:43Z') {
  return { items: [{ targetId: 'agent:debian12', observedAt: time, online: true, host: {}, cpu: {}, memory: {}, disk: {} }] }
}

function harness() {
  let scope = { kind: 'target', targetId: 'agent:debian12' }
  let load = async () => sample()
  const calls = []
  const listeners = new Map()
  const timers = new Map()
  let timerID = 0
  const api = runInNewContext(`${script}; useSystemResourceStatus()`, {
    ref: value => ({ value }), watch: () => {},
    getManagementScope: () => scope,
    MANAGEMENT_SCOPE_TARGET: 'target', MANAGEMENT_SCOPE_CHANGED_EVENT: 'scope-change',
    managementScopeTargetId,
    useSystemResourceRefreshInterval: () => ({ refreshIntervalMs: { value: 5000 } }),
    translate: key => key,
    fleetNodeResourceStatus, nodeResourceStatus,
    systemV2API: { resources: (targetId, options) => { calls.push({ targetId, options }); return load(targetId) } },
    window: {
      addEventListener: (key, handler) => listeners.set(key, handler),
      removeEventListener: key => listeners.delete(key),
      setTimeout: handler => { const id = ++timerID; timers.set(id, handler); return id },
      clearTimeout: id => timers.delete(id)
    },
    document: { visibilityState: 'visible', addEventListener: () => {}, removeEventListener: () => {} }
  })
  return { api, calls, timers, setLoad: next => { load = next }, setScope: next => {
    scope = next
    listeners.get('scope-change')?.({ detail: next })
  } }
}

test('manual refresh requests a fresh sample and replaces the displayed sampling time', async () => {
  const { api, calls, setLoad } = harness()
  await api.refreshSystemResourceStatus()
  setLoad(async () => sample('2026-09-06T05:35:48Z'))
  assert.equal(await api.refreshSystemResourceStatus(), true)
  assert.equal(calls[1].targetId, 'agent:debian12')
  assert.equal(calls[1].options.refresh, true)
  assert.equal(api.status.value.current_time, '2026-09-06T05:35:48Z')
  assert.equal(api.loading.value, false)
})

test('manual refresh joining automatic collection shows loading without duplicating the request', async () => {
  const { api, calls, setLoad } = harness()
  const pending = deferred()
  setLoad(() => pending.promise)
  const automatic = api.refreshSystemResourceStatus({ silent: true })
  assert.equal(api.loading.value, false)
  const manual = api.refreshSystemResourceStatus()
  assert.equal(api.loading.value, true)
  assert.equal(calls.length, 1)
  pending.resolve(sample())
  await Promise.all([automatic, manual])
  assert.equal(api.loading.value, false)
})

test('failed refresh preserves the original sample and exposes its error', async () => {
  const { api, setLoad } = harness()
  await api.refreshSystemResourceStatus()
  const original = api.status.value
  setLoad(async () => { throw new Error('connection timed out') })
  assert.equal(await api.refreshSystemResourceStatus(), false)
  assert.equal(api.status.value, original)
  assert.equal(api.error.value, 'connection timed out')
  assert.equal(api.loading.value, false)
})

test('automatic polling requests live samples and keeps only one pending request', async () => {
  const { api, calls, timers, setLoad } = harness()
  api.startSystemResourcePolling()
  await api.refreshSystemResourceStatus({ silent: true })
  const pending = deferred()
  setLoad(() => pending.promise)
  const tick = timers.values().next().value
  timers.clear()
  const running = tick()
  assert.equal(calls.length, 2)
  assert.equal(calls[1].options.refresh, true)
  assert.equal(timers.size, 0)
  pending.resolve(sample('2026-09-06T05:35:48Z'))
  await running
  assert.equal(timers.size, 1)
  api.stopSystemResourcePolling()
  assert.equal(timers.size, 0)
})

test('changing scope prevents a late response from replacing the selected machine', async () => {
  const { api, setScope, setLoad } = harness()
  api.startSystemResourcePolling()
  await api.refreshSystemResourceStatus({ silent: true })
  const old = deferred()
  setLoad(() => old.promise)
  const stale = api.refreshSystemResourceStatus()
  setLoad(async () => ({ items: [{ ...sample().items[0], targetId: 'local' }] }))
  setScope({ kind: 'target', targetId: 'local' })
  await api.refreshSystemResourceStatus()
  old.resolve(sample())
  await stale
  assert.equal(api.status.value.application.targetId, 'local')
  assert.equal(api.loading.value, false)
  api.stopSystemResourcePolling()
})

test('hydrating the selected machine metadata does not discard or repeat its resource read', async () => {
  const { api, calls, setScope, setLoad } = harness()
  const pending = deferred()
  setLoad(() => pending.promise)
  api.startSystemResourcePolling()
  setScope({ kind: 'target', targetId: 'agent:debian12', agentId: 'debian12', targetName: 'Debian 12' })
  assert.equal(calls.length, 1)
  assert.equal(api.scope.value.targetName, 'Debian 12')
  pending.resolve(sample())
  assert.equal(await api.refreshSystemResourceStatus(), true)
  assert.ok(api.lastUpdatedAt.value)
  assert.equal(calls.length, 1)
  api.stopSystemResourcePolling()
})

test('the API forwards explicit live refresh requests without changing passive reads', async () => {
  const apiSource = readFileSync(new URL('../src/api/v2.js', import.meta.url), 'utf8')
  const declaration = babelParse(apiSource, { sourceType: 'module' }).program.body
    .find(node => node.type === 'ExportNamedDeclaration' && node.declaration?.declarations?.[0]?.id.name === 'systemV2API')
    .declaration.declarations[0].init
  const calls = []
  const api = runInNewContext(`(${apiSource.slice(declaration.start, declaration.end)})`, {
    client: { get: (url, options) => calls.push({ url, options }) }
  })
  api.resources('agent:debian12', { refresh: true })
  api.resources('local')
  api.resources('', { refresh: true })
  assert.equal(calls[0].options.params.targetId, 'agent:debian12')
  assert.equal(calls[0].options.params.refresh, true)
  assert.equal(calls[1].options.params.refresh, undefined)
  assert.equal(calls[2].options.params.targetId, undefined)
  assert.equal(calls[2].options.params.refresh, true)
  assert.equal(calls[0].options.headers['Cache-Control'], 'no-store')
})

test('resource details expose collection errors for selected and all-machine scopes', () => {
  const component = readFileSync(new URL('../src/components/layout/SystemResourceStatus.vue', import.meta.url), 'utf8')
  assert.match(component, /machine\.resource\.warnings\.join/)
  assert.match(component, /status\.warnings\.join/)
  assert.match(component, /role="alert"[^>]*>\{\{ error \}\}/)
})

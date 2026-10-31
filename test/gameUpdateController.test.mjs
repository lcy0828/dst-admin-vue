import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createGameUpdateController, gameUpdateAvailability } from '../src/lib/gameUpdateController.mjs'

const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done }), resolve } }
const installation = (targetId = 'local') => ({ targetId, installationId: 'default', installed: true, online: true, branch: 'public', gameVersion: '700', shards: [{ roomId: 'room', worldId: 'master', wasRunning: true }] })
const plan = () => ({ ready: true, updateRequired: true, planHash: 'hash', selectedInstallations: [{ targetId: 'local', installationId: 'default' }], installations: [installation(), installation('agent:connected')], policy: { restartRunning: true, timeoutSeconds: 300 }, affectedRoomIds: ['room'] })
function fixture(overrides = {}) {
  const calls = { overview: [], versions: [], preview: [], create: [], list: [] }, state = {}
  const api = {
    installedVersions: async input => { calls.overview.push(input); return { installations: [installation()] } },
    list: async input => { calls.list.push(input); return { items: [], total: 0 } },
    get: async () => { throw new Error('No record yet') },
    preview: async input => { calls.preview.push(input); return plan() },
    create: async input => { calls.create.push(input); return { id: 'job', status: 'queued', kind: 'game.release' } },
    ...overrides
  }
  const versionAPI = { version: async input => { calls.versions.push(input); return { officialRelease: { version: '701' } } } }
  let now = 100000
  const c = createGameUpdateController({ api, versionAPI, changed: next => Object.assign(state, next), now: () => now })
  Object.assign(state, c.state)
  return { c, state, calls, api, versionAPI, time: n => { now = n } }
}

test('header and page share coalesced lightweight reads, keeping known versions after refresh failure', async () => {
  const f = fixture()
  await Promise.all([f.c.ensureOverview(), f.c.ensureOverview()])
  assert.equal(f.calls.overview.length, 1)
  assert.deepEqual(f.calls.versions, [{ fresh: false, lightweight: true }])
  assert.equal(f.calls.preview.length, 0)
  await f.c.ensureOverview()
  assert.equal(f.calls.overview.length, 1)
  f.api.installedVersions = async () => { throw new Error('Agent offline') }
  f.versionAPI.version = async () => { throw new Error('Klei unavailable') }
  await f.c.ensureOverview({ fresh: true })
  assert.equal(f.state.installations[0].gameVersion, '700')
  assert.equal(f.state.report.officialRelease.version, '701')
  assert.equal(f.state.installationsError, 'Agent offline')
})

test('late old-target overview cannot overwrite the selected target', async () => {
  const held = deferred(), f = fixture()
  f.api.installedVersions = async request => request.targetIds ? { installations: [installation('agent:two')] } : held.promise
  const old = f.c.ensureOverview()
  f.c.setScope({ kind: 'target', targetId: 'agent:two' })
  await f.c.ensureOverview()
  held.resolve({ installations: [installation()] })
  await old
  assert.equal(f.state.installations[0].targetId, 'agent:two')
})

test('opening the dialog performs only preflight and closing during it cannot submit', async () => {
  const held = deferred(), f = fixture({ preview: () => held.promise })
  const open = f.c.openUpdate()
  assert.equal(f.state.open, true)
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
  f.c.close()
  held.resolve(plan())
  await open
  await f.c.submit()
  assert.equal(f.state.plan, null)
  assert.equal(f.calls.create.length, 0)
})

test('confirmed submission copies the exact seed and policy; duplicate clicks submit once', async () => {
  const held = deferred(), f = fixture()
  await f.c.openUpdate({ policy: { restartRunning: false } })
  assert.equal(f.calls.preview[0].includeModDiagnostics, false)
  f.api.create = async input => { f.calls.create.push(input); return held.promise }
  const first = f.c.submit()
  await f.c.submit()
  assert.equal(f.calls.create.length, 1)
  assert.deepEqual(f.calls.create[0].installations, plan().selectedInstallations)
  assert.deepEqual(f.calls.create[0].policy, plan().policy)
  assert.equal(f.calls.create[0].includeModDiagnostics, undefined)
  held.resolve({ id: 'job', status: 'queued' }); await first
  assert.equal(f.state.open, false)
  assert.equal(f.state.accepted.id, 'job')
})

test('changed plans require a second explicit confirmation without an automatic write retry', async () => {
  const f = fixture()
  await f.c.openUpdate()
  f.api.create = async () => { f.calls.create.push(1); throw { status: 409, code: 'PLAN_CHANGED', message: 'Changed' } }
  f.api.preview = async () => ({ ...plan(), planHash: 'new-hash' })
  await f.c.submit()
  assert.equal(f.state.planChanged, true)
  assert.equal(f.state.previousPlan.planHash, 'hash')
  assert.equal(f.state.plan.planHash, 'new-hash')
  assert.equal(f.calls.create.length, 1)
  assert.equal(f.state.submitting, false)
})

test('lost submission response remains uncertain across close/reopen and never resends', async () => {
  const f = fixture()
  await f.c.openUpdate()
  f.api.create = async () => { f.calls.create.push(1); throw new Error('Disconnected') }
  await f.c.submit()
  f.c.close(); await f.c.openUpdate(); await f.c.submit(); await f.c.refreshPending()
  assert.equal(f.state.uncertain, true)
  assert.equal(f.calls.create.length, 1)
  assert.equal(f.state.plan, null)
})

test('old unresolved recovery blocks a new plan even outside recent history', async () => {
  const f = fixture({ list: async () => ({ items: [{ id: 'old', stage: 'recovery_required', plan: plan() }], total: 1 }) })
  await f.c.openUpdate()
  assert.equal(f.c.currentPending().id, 'old')
  assert.equal(f.calls.preview.length, 0)
  assert.equal(f.calls.create.length, 0)
})

test('pending read failure fails closed; diagnostic failures do not invalidate required checks', async () => {
  const f = fixture({ list: async () => { throw new Error('Unavailable') } })
  await f.c.openUpdate()
  assert.equal(f.state.pendingError, 'Unavailable')
  assert.equal(f.calls.preview.length, 0)
  f.api.list = async () => ({ items: [], total: 0 })
  await f.c.prepare()
  f.api.preview = async () => { throw new Error('Mod unavailable') }
  await f.c.loadDiagnostics()
  assert.equal(f.state.plan.planHash, 'hash')
  assert.equal(f.state.diagnosticsError, 'Mod unavailable')
})

test('disposal ignores late reads and platform branches do not imply update readiness', async () => {
  const f = fixture(), held = deferred()
  f.api.preview = () => held.promise
  const open = f.c.openUpdate()
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
  f.c.dispose(); held.resolve(plan()); await open
  assert.equal(f.state.plan, null)
  assert.equal(gameUpdateAvailability([installation()], { version: '701' }), 'available')
  assert.equal(gameUpdateAvailability([{ ...installation(), branch: 'updatebeta' }], { version: '701' }), 'unknown')
  assert.equal(gameUpdateAvailability([{ ...installation(), gameVersion: '701' }], { version: '701' }), 'current')
})

test('page and dock coalesce receipt reads and never poll the release provider for progress', async () => {
  const held = deferred(), f = fixture()
  let reads = 0
  f.api.get = async id => { reads++; assert.equal(id, 'release'); return held.promise }
  f.c.rememberRelease({ id: 'release', stage: 'updating', sourceJobId: 'job', plan: plan() })
  const progress = f.c.refreshProgress()
  const page = f.c.readRelease('release')
  held.resolve({ id: 'release', sourceJobId: 'job', currentJobId: 'retry', stage: 'succeeded', plan: plan() })
  await Promise.all([progress, page])
  assert.equal(reads, 1)
  assert.equal(f.state.pending.length, 0)
  assert.equal(f.calls.versions.length, 0)
  assert.equal(f.state.records[0].currentJobId, 'retry')
  await f.c.refreshProgress()
  assert.equal(reads, 1)
})

test('renaming the current target updates shared labels without discarding or repeating an in-flight read', async () => {
  const held = deferred(), f = fixture({ installedVersions: async () => held.promise })
  f.c.setScope({ kind: 'target', targetId: 'agent:a', targetName: 'before' })
  const read = f.c.ensureOverview()
  f.c.setScope({ kind: 'target', targetId: 'agent:a', targetName: 'after' })
  assert.equal(f.c.ensureOverview(), read)
  assert.equal(f.state.scope.targetName, 'after')
  held.resolve({ installations: [installation('agent:a')] }); await read
  assert.equal(f.state.installations[0].targetId, 'agent:a')
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createSoftwareUpdateController, formatSoftwareBytes } from '../src/lib/softwareUpdate.mjs'

const snapshot = (phase, version = 'v1.0.0') => ({
  current: { version }, supported: true, check: { hasUpdate: true, latest: { version: 'v1.1.0', onlineUpdate: true } },
  ...(phase ? { operation: { id: 'op', version: 'v1.1.0', phase, progress: 80 } } : {})
})

function fixture(overrides = {}, saved = '') {
  let time = 0, reloaded = 0
  const scheduled = new Map(), memory = new Map(saved ? [['dst-admin-software-operation', saved]] : [])
  const calls = { status: 0, check: 0, apply: 0 }
  const api = {
    status: async () => { calls.status++; return snapshot() },
    check: async () => { calls.check++; return snapshot() },
    update: async () => snapshot('downloading').operation,
    apply: async () => { calls.apply++; return snapshot('restarting').operation },
    ...overrides
  }
  const controller = createSoftwareUpdateController({ api, changed: () => {}, reload: () => reloaded++,
    storage: { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) },
    now: () => time, schedule: fn => { const key = Symbol(); scheduled.set(key, fn); return key }, unschedule: key => scheduled.delete(key)
  })
  return { controller, scheduled, memory, calls, setTime: value => { time = value }, reloaded: () => reloaded }
}

test('initial release check is cached at the UI layer and idle creates no timers', async () => {
  const f = fixture()
  await Promise.all([f.controller.initialize(), f.controller.initialize()])
  assert.equal(f.calls.status, 1)
  assert.equal(f.calls.check, 1)
  assert.equal(f.scheduled.size, 0)
})

test('only a browser-authorized prepared operation automatically applies', async () => {
  const foreign = fixture({ status: async () => snapshot('prepared') })
  await foreign.controller.refresh()
  assert.equal(foreign.calls.apply, 0)
  const authorized = fixture({ status: async () => snapshot('prepared') }, 'op')
  await authorized.controller.refresh()
  assert.equal(authorized.calls.apply, 1)
  assert.equal(authorized.controller.state.snapshot.operation.phase, 'restarting')
  assert.equal(authorized.scheduled.size, 1)
})

test('transient restart errors reconnect, then success reloads exactly once', async () => {
  let returned = false
  const f = fixture({ status: async () => {
    if (!returned) throw Object.assign(new Error('temporarily offline'), { status: 503 })
    return snapshot('succeeded', 'v1.1.0')
  } }, 'op')
  // Initiate a prepared switch; status requests will observe the outage.
  f.controller.state.snapshot = snapshot('prepared')
  await f.controller.apply()
  await f.controller.refresh()
  assert.equal(f.controller.state.reconnecting, true)
  assert.equal(f.controller.state.error, '')
  returned = true
  await f.controller.refresh()
  assert.equal(f.reloaded(), 1)
  assert.equal(f.memory.size, 0)
  assert.equal(f.scheduled.size, 0)
  await f.controller.refresh()
  assert.equal(f.reloaded(), 1)
})

test('restart retries are bounded and an explicit reconnect can resume them', async () => {
  const f = fixture({ status: async () => { throw Object.assign(new Error('offline'), { status: 503 }) } })
  f.controller.state.snapshot = snapshot('prepared')
  await f.controller.apply()
  f.setTime(121000)
  await f.controller.refresh()
  assert.equal(f.scheduled.size, 0)
  assert.equal(f.controller.state.reconnecting, false)
})

test('busy background work leaves the verified package ready for a manual retry', async () => {
  const f = fixture({ status: async () => snapshot('prepared'), apply: async () => { throw Object.assign(new Error('busy'), { status: 409 }) } }, 'op')
  await f.controller.refresh()
  assert.equal(f.controller.state.snapshot.operation.phase, 'prepared')
  assert.equal(f.controller.state.error, 'busy')
  assert.equal(f.scheduled.size, 0)
})

test('failed boot reloads the restored frontend once and retains rollback diagnostics', async () => {
  const f = fixture({ status: async () => snapshot('rolled_back') }, 'op')
  await f.controller.refresh()
  assert.equal(f.reloaded(), 1)
  assert.equal(f.controller.state.snapshot.current.version, 'v1.0.0')
  assert.equal(f.memory.size, 0)
  assert.equal(f.scheduled.size, 0)
})

test('persisted startup verification polls until ready and blocks premature reload', async () => {
  let ready = false
  const f = fixture({ status: async () => ({ ...snapshot('succeeded', 'v1.1.0'), ready }) }, 'op')
  await f.controller.refresh()
  assert.equal(f.reloaded(), 0)
  assert.equal(f.scheduled.size, 1)
  ready = true
  await f.controller.refresh()
  assert.equal(f.reloaded(), 1)
  assert.equal(f.scheduled.size, 0)
})

test('applying reconnects even if the accepted HTTP response was lost', async () => {
  const f = fixture({ apply: async () => { throw Object.assign(new Error('offline'), { status: 503 }) }, status: async () => snapshot('succeeded', 'v1.1.0') })
  f.controller.state.snapshot = snapshot('prepared')
  await f.controller.apply()
  await f.controller.refresh()
  assert.equal(f.reloaded(), 1)
  assert.equal(f.scheduled.size, 0)
})

test('status requests coalesce and disposal cancels further polling', async () => {
  let resolve
  const f = fixture({ status: () => new Promise(done => { resolve = done }) })
  const first = f.controller.refresh(), second = f.controller.refresh()
  assert.equal(first, second)
  f.controller.dispose()
  resolve(snapshot('downloading'))
  await first
  assert.equal(f.scheduled.size, 0)
})

test('download sizes and speed use bounded human-readable units', () => {
  assert.equal(formatSoftwareBytes(11 * 1024 * 1024), '11.0 MiB')
  assert.equal(formatSoftwareBytes(0), '0 B')
  assert.equal(formatSoftwareBytes(-1), '—')
})

test('a download status timeout keeps observing and applies only once after recovery', async () => {
  let reachable = false
  const f = fixture({ status: async () => {
    if (!reachable) throw Object.assign(Error('network timeout'), { status: 504 })
    return snapshot('prepared')
  } })
  await f.controller.update('v1.1.0', 'auto')
  await f.controller.refresh()
  assert.equal(f.controller.state.retrying, true)
  assert.equal(f.scheduled.size, 1)
  assert.equal(f.calls.apply, 0)
  reachable = true
  await f.controller.refresh()
  assert.equal(f.calls.apply, 1)
  assert.equal(f.controller.state.retrying, false)
})

test('download observation retries stop after two minutes and reconnect resumes the existing operation', async () => {
  let reachable = false
  const f = fixture({ status: async () => {
    if (!reachable) throw Object.assign(Error('network timeout'), { status: 503 })
    return snapshot('prepared')
  } })
  await f.controller.update('v1.1.0', 'auto')
  await f.controller.refresh()
  f.setTime(121000)
  await f.controller.refresh()
  assert.equal(f.controller.state.error, 'SOFTWARE_CONNECTION_TIMEOUT')
  assert.equal(f.scheduled.size, 0)
  reachable = true
  await f.controller.reconnect()
  assert.equal(f.calls.apply, 1)
  assert.equal(f.controller.state.error, '')
})

test('authorization errors stop observation immediately without a restart loop', async () => {
  const f = fixture({ status: async () => { throw Object.assign(Error('session expired'), { status: 401 }) } })
  await f.controller.update('v1.1.0', 'auto')
  await f.controller.refresh()
  assert.equal(f.controller.state.error, 'session expired')
  assert.equal(f.scheduled.size, 0)
})

test('interrupted downloads clear pending apply intent and stop idle polling', async () => {
  const f = fixture({ status: async () => snapshot('interrupted') }, 'op')
  await f.controller.refresh()
  assert.equal(f.memory.has('dst-admin-software-operation'), false)
  assert.equal(f.scheduled.size, 0)
  assert.equal(f.calls.apply, 0)
  assert.equal(f.controller.state.snapshot.operation.phase, 'interrupted')
})

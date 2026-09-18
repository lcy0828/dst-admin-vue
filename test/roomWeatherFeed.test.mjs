import test from 'node:test'
import assert from 'node:assert/strict'
import { createRoomWeatherFeed } from '../src/lib/roomWeatherFeed.mjs'

const room = { id: 'room-a', name: 'Room A', worlds: [{ id: 'master', name: 'Master', isMaster: true, status: 'running' }] }
const live = { roomId: room.id, worldId: 'master', runtimeState: 'running', freshness: 'live', season: 'autumn', phase: 'night', precipitation: 'rain' }
const context = { active: true, targetId: 'local', roomId: room.id }
function fixture(overrides = {}) {
  const timers = new Map(), reads = [], output = []
  let sequence = 0
  const feed = createRoomWeatherFeed({
    loadOverview: async target => { reads.push(['overview', target]); return { rooms: [room] } },
    loadStates: async id => { reads.push(['states', id]); return { items: [live] } },
    publish: value => output.push(value),
    schedule: (fn, delay) => { const id = ++sequence; timers.set(id, { fn, delay }); return id },
    cancel: id => timers.delete(id),
    ...overrides
  })
  async function tick() {
    const [id, timer] = timers.entries().next().value || []
    assert(timer, 'scheduled refresh expected')
    timers.delete(id)
    await timer.fn()
  }
  return { feed, timers, reads, output, tick }
}

test('direct entry loads the remembered room and continues updating outside the dashboard', async () => {
  let precipitation = 'rain'
  const f = fixture({ loadStates: async () => ({ items: [{ ...live, precipitation }] }) })
  f.feed.configure(context)
  await f.tick()
  assert.equal(f.output.at(-1).effect, 'rain')
  precipitation = 'snow'
  await f.tick()
  assert.equal(f.output.at(-1).effect, 'snow')
  assert.deepEqual(f.reads, [['overview', 'local']])
  f.feed.dispose()
  assert.equal(f.timers.size, 0)
})

test('dashboard handoff preserves weather without duplicate polling or losing manual/off control', async () => {
  const f = fixture()
  f.feed.configure(context)
  const workspace = f.feed.claimWorkspace()
  workspace.publish(room, [live])
  const before = f.output.at(-1)
  assert.equal(f.timers.size, 0)
  workspace.release()
  assert.equal(f.output.at(-1), before, 'leaving a page must not clear weather')
  await f.tick()
  assert.deepEqual(f.reads, [['states', room.id]])
  const remounted = f.feed.claimWorkspace()
  assert.equal(f.timers.size, 0)
  f.feed.configure({ ...context, active: false })
  remounted.release()
  assert.equal(f.timers.size, 0, 'manual/off mode must not fetch')
  f.feed.configure(context)
  await f.tick()
  assert.equal(f.output.at(-1).available, true)
  f.feed.dispose()
})

test('off or hidden pages suspend reads and ignore an outstanding response', async () => {
  let resolve
  const f = fixture({ loadStates: () => new Promise(done => { resolve = done }) })
  f.feed.configure(context)
  const pending = f.tick()
  await Promise.resolve()
  f.feed.configure({ ...context, active: false })
  resolve({ items: [live] })
  await pending
  assert.equal(f.timers.size, 0)
  assert.equal(f.output.filter(value => value?.available).length, 0)
  f.feed.dispose()
})

test('scope changes discard late responses and never show another room or machine', async () => {
  let resolve
  const f = fixture({ loadStates: () => new Promise(done => { resolve = done }) })
  f.feed.configure(context)
  const pending = f.tick()
  await Promise.resolve()
  f.feed.configure({ ...context, targetId: 'agent:remote', roomId: 'missing-room' })
  resolve({ items: [live] })
  await pending
  await f.tick()
  assert.equal(f.output.at(-1), null)
  assert.equal(f.output.filter(value => value?.available).length, 0)
  f.feed.dispose()
})

test('stale snapshots and read failures stop old weather; later recovery resumes it', async () => {
  let state = 'live'
  const f = fixture({ loadStates: async () => {
    if (state === 'error') throw Error('offline')
    return { items: [{ ...live, freshness: state }] }
  } })
  f.feed.configure(context)
  await f.tick()
  assert.equal(f.output.at(-1).available, true)
  for (state of ['delayed', 'error', 'stopped']) {
    await f.tick()
    assert.equal(f.output.at(-1).available, false)
  }
  state = 'live'
  await f.tick()
  assert.equal(f.output.at(-1).available, true)
  f.feed.dispose()
})

test('recording the currently displayed room does not clear its source', () => {
  const f = fixture()
  f.feed.configure({ ...context, roomId: '' })
  const workspace = f.feed.claimWorkspace()
  workspace.publish(room, [live])
  const before = f.output.at(-1)
  f.feed.configure(context)
  assert.equal(f.output.at(-1), before)
  f.feed.dispose()
  workspace.publish(room, [live])
  workspace.release()
  assert.equal(f.timers.size, 0)
})

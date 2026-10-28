import test from 'node:test'
import assert from 'node:assert/strict'
import { activityPaths, activityPlot, activityQuery } from '../src/lib/playerActivity.mjs'
const event = (id, worldId = 'Master', producerInstanceId = 'boot-1', extra = {}) => ({ id, userId: 'KU_TEST', worldId, producerInstanceId, sessionId: 'session-1', continuousRangeId: 'range-1', kind: 'position', position: { x: id, z: id * 2 }, ...extra })
test('trajectory splits on collection boundaries, world, instance and player', () => {
  const chronological = [event(1), event(2), event(3, 'Caves'), event(4, 'Caves', 'boot-2'), event(5, 'Caves', 'boot-2', { kind: 'collection.gap', position: null }), event(6, 'Caves', 'boot-2'), event(7, 'Caves', 'boot-2', { userId: 'KU_OTHER' })]
  const paths = activityPaths(chronological.reverse())
  assert.deepEqual(paths.map(p => p.points.length), [2, 1, 1, 1, 1])
  assert.equal(activityPlot(paths).every(p => !/NaN|Infinity/.test(p.line)), true)
})
test('trajectory rejects missing/nonfinite positions, supports stationary single sample', () => {
  assert.deepEqual(activityPaths([event(1, 'Master', 'boot', { position: { x: NaN, z: 2 } })]), [])
  assert.equal(activityPlot(activityPaths([event(1)]))[0].line, '20,260')
})
test('pagination preserves the exact time window and query filters', () => {
  const now = Date.parse('2026-10-27T12:00:00Z')
  const first = activityQuery({ now, userId: ' KU_TEST ', kind: 'action.', hours: '24' })
  const next = activityQuery({ now, userId: ' KU_TEST ', kind: 'action.', hours: '24', before: 'cursor' })
  assert.equal(first.from, next.from); assert.equal(first.to, next.to)
  assert.equal(next.before, 'cursor'); assert.equal(next.userId, 'KU_TEST')
})

test('a discovered gap never connects historic points through an unknown loss window', () => {
  const events = [event(5, 'Master', 'boot-1', { kind: 'collection.gap', position: null }), event(4), event(3), event(2), event(1)]
  assert.equal(activityPaths(events).every(path => path.points.length === 1), true)
})

test('persistent ranges split without a visible gap event, and legacy points never connect', () => {
  const records = [event(4, 'Master', 'boot-1', { continuousRangeId: 'after' }), event(3, 'Master', 'boot-1', { continuousRangeId: 'after' }), event(2), event(1)]
  assert.deepEqual(activityPaths(records).map(p => p.points.length), [2, 2])
  assert.deepEqual(activityPaths([event(2, 'Master', 'boot-1', { continuousRangeId: '' }), event(1, 'Master', 'boot-1', { continuousRangeId: '' })]).map(p => p.points.length), [1, 1])
  assert.deepEqual(activityPaths([event(2, 'Master', 'boot-1', { sessionId: 'session-2' }), event(1)]).map(p => p.points.length), [1, 1])
})

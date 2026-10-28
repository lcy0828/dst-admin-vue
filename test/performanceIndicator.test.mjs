import assert from 'node:assert/strict'
import test from 'node:test'
import { performanceIndicator } from '../src/lib/performanceIndicator.mjs'

const running = point => performanceIndicator({ running: true, point })
test('missing scores report their cause instead of waiting forever for samples', () => {
  for (const [reason, state] of [
    ['CLOCK_DISCONTINUITY', 'clockError'],
    ['SIMULATION_CLOCK_UNAVAILABLE', 'incomplete'],
    ['TIME_SCALE_CHANGED', 'resampling'],
    ['SIMULATION_NOT_ADVANCING', 'sleeping'],
    ['WARMING_UP', 'pending'],
    ['NOT_RUNNING', 'unavailable'],
    ['UNKNOWN_FAILURE', 'unavailable']
  ]) assert.deepEqual(running({ state: 'running', score: null, reason }), { state, value: null })
  assert.equal(running(null).state, 'pending')
  assert.equal(running({ state: 'running', score: null }).state, 'unavailable')
})
test('real scores including zero stay distinct from pause, sleep and stale data', () => {
  for (const value of [0, 79.5, 98, 100]) assert.deepEqual(running({ state: 'running', score: value }), { state: 'scored', value })
  for (const score of [null, undefined, '98', -1, 101, NaN, Infinity]) assert.equal(running({ state: 'running', score }).state, 'unavailable')
  assert.equal(running({ state: 'idle', score: null }).state, 'sleeping')
  assert.equal(running({ state: 'paused', score: 99 }).state, 'paused')
  assert.equal(performanceIndicator({ running: false, point: { state: 'running', score: 99 } }).state, 'stopped')
  assert.equal(performanceIndicator({ running: true, paused: true, point: { state: 'running', score: 99 } }).state, 'paused')
  assert.equal(performanceIndicator({ running: true, loadState: 'unavailable', point: { state: 'running', score: 99 } }).state, 'unavailable')
})

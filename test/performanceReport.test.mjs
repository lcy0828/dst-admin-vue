import assert from 'node:assert/strict'
import test from 'node:test'
import { performanceSeries, performanceCSV, performanceWorldSummaries } from '../src/lib/performanceReport.mjs'
import { performanceMessages } from '../src/i18n/performanceMessages.js'

const point = (seconds, values = {}) => ({ worldId: 'master', worldName: 'Master', targetId: 'local', installationId: 'default', instanceId: 'boot-a', scoreVersion: 'v1', at: new Date(seconds * 1000).toISOString(), state: 'running', score: 95, rssBytes: 2 << 20, ...values })
test('performance charts keep missing observations and runtime identities separate', () => {
  const series = performanceSeries([point(0), point(30, { state: 'paused', score: null }), point(60), point(300), point(330, { instanceId: 'boot-b' }), point(360, { instanceId: 'boot-b', scoreVersion: 'v2' })], 'score', 30)
  assert.equal(series.length, 3)
  assert.equal(series[0].data[1][1], null)
  assert(series[0].data.some(([at, score]) => at === 90000 && score === null))
  assert.deepEqual(performanceSeries([point(1)], 'rssBytes')[0].data, [[1000, 2]])
  assert.deepEqual(performanceSeries([point(1, { state: 'unavailable' }), point(31, { rssBytes: 0 }), point(61, { state: 'paused' })], 'rssBytes')[0].data, [[1000, null], [31000, null], [61000, 2]])
})
test('report CSV preserves score versions, absent values, quotes and formula safety', () => {
  const csv = performanceCSV({ items: [point(0, { worldName: '=SUM(1,2)"\nnext', score: null })] })
  assert(csv.startsWith('\uFEFFat,'))
  assert(csv.includes('"\'=SUM(1,2)""\nnext"'))
  assert(csv.includes('"v1"'))
  assert(!csv.includes('undefined'))
})

const summary = (worldId, scoreVersion, values = {}) => ({ worldId, worldName: worldId, scoreVersion, averageScore: null, minimumScore: null, validSeconds: 0, observedSeconds: 30, lowSeconds: 0, peakCPUPercent: null, peakRSSBytes: 0, findings: [], ...values })
const report = values => ({ scoreVersion: 'v2', from: new Date(0).toISOString(), to: new Date(120000).toISOString(), items: [], worlds: [], ...values })

test('reports show one card per world using current scores and resource history from all algorithms', () => {
  const worlds = performanceWorldSummaries(report({ worlds: ['Master', 'Caves'].flatMap(world => [
    summary(world, 'v1', { observedSeconds: 60, peakCPUPercent: 96, peakRSSBytes: 1 << 30 }),
    summary(world, 'v2', { averageScore: 99.9, minimumScore: 99, validSeconds: 30, peakCPUPercent: 48, peakRSSBytes: 512 << 20 })
  ]) }))
  assert.equal(worlds.length, 2)
  for (const world of worlds) {
    assert.equal(world.hasScore, true)
    assert.equal(world.averageScore, 99.9)
    assert.equal(world.minimumScore, 99)
    assert.equal(world.validSeconds, 30)
    assert.equal(world.observedSeconds, 90)
    assert.equal(world.coverage, 0.75)
    assert.equal(world.peakCPUPercent, 96)
    assert.equal(world.peakRSSBytes, 1 << 30)
  }
})

test('old scores and slow findings do not change current statistics; shared warnings are deduplicated', () => {
  const [world] = performanceWorldSummaries(report({ worlds: [
    summary('Master', 'v1', { averageScore: 1, minimumScore: 0, validSeconds: 90, lowSeconds: 90, findings: [
      { code: 'SIMULATION_SLOW', value: 90 }, { code: 'CPU_CORE_BUSY', value: 99 },
      { code: 'PARTIAL_COVERAGE' }, { code: 'NO_VALID_SIMULATION_WINDOW' }, { code: 'UNEXPECTED_EXIT_RECORDED', value: 1 }
    ] }),
    summary('Master', 'v2', { averageScore: 100, minimumScore: 100, validSeconds: 30, findings: [
      { code: 'CPU_CORE_BUSY', value: 95 }, { code: 'UNEXPECTED_EXIT_RECORDED', value: 1 }
    ] })
  ] }))
  assert.equal(world.averageScore, 100)
  assert.equal(world.minimumScore, 100)
  assert.equal(world.validSeconds, 30)
  assert.equal(world.lowSeconds, 0)
  assert.deepEqual(world.findings, [{ code: 'CPU_CORE_BUSY', value: 99 }, { code: 'UNEXPECTED_EXIT_RECORDED', value: 1 }])
})

test('zero remains a valid performance score', () => {
  const [world] = performanceWorldSummaries(report({ worlds: [summary('Master', 'v2', { averageScore: 0, minimumScore: 0, validSeconds: 30, lowSeconds: 30, peakCPUPercent: 0 })] }))
  assert.equal(world.hasScore, true)
  assert.equal(world.averageScore, 0)
  assert.equal(world.minimumScore, 0)
  assert.equal(world.peakCPUPercent, 0)
  assert.equal(world.lowSeconds, 30)
})

test('a paused world explains absent scores without losing CPU and memory records', () => {
  const [world] = performanceWorldSummaries(report({
    worlds: [summary('Master', 'v2', { peakCPUPercent: 12, peakRSSBytes: 512 << 20 })],
    items: [point(90, { worldId: 'Master', scoreVersion: 'v2', state: 'paused', score: null }), point(30, { worldId: 'Master', scoreVersion: 'v2', state: 'running', score: null, reason: 'WARMING_UP' }), point(110, { worldId: 'Master', scoreVersion: 'v1' })]
  }))
  assert.equal(world.hasScore, false)
  assert.equal(world.averageScore, null)
  assert.equal(world.lowSeconds, null)
  assert.equal(world.missingReason, 'PAUSED')
  assert.equal(world.peakCPUPercent, 12)
  assert.equal(world.peakRSSBytes, 512 << 20)
})

test('historical records stay unscored even when a previous algorithm had valid scores', () => {
  const [world] = performanceWorldSummaries(report({ worlds: [summary('Master', 'v1', { averageScore: 75, validSeconds: 30, peakCPUPercent: 42 })] }))
  assert.equal(world.hasScore, false)
  assert.equal(world.averageScore, null)
  assert.equal(world.missingReason, 'HISTORICAL_ONLY')
  assert.equal(world.peakCPUPercent, 42)
})

test('missing-score explanations use current world state and preserve clock diagnostics', () => {
  for (const [state, reason, expected] of [
    ['idle', '', 'SIMULATION_NOT_ADVANCING'], ['stopped', '', 'NOT_RUNNING'], ['failed', '', 'NOT_RUNNING'],
    ['running', 'CLOCK_DISCONTINUITY', 'CLOCK_DISCONTINUITY'], ['running', 'SIMULATION_CLOCK_UNAVAILABLE', 'SIMULATION_CLOCK_UNAVAILABLE'],
    ['running', 'TIME_SCALE_CHANGED', 'TIME_SCALE_CHANGED'], ['running', 'WARMING_UP', 'WARMING_UP'], ['running', '', 'NO_VALID_SIMULATION_WINDOW']
  ]) {
    const [world] = performanceWorldSummaries(report({ worlds: [summary('master', 'v2')], items: [point(30, { state, reason, scoreVersion: 'v2', score: null })] }))
    assert.equal(world.hasScore, false)
    assert.equal(world.missingReason, expected)
  }
  assert.deepEqual(performanceWorldSummaries(), [])
})

test('coverage stays bounded and nonfinite observations never become scores', () => {
  const [world] = performanceWorldSummaries(report({ worlds: [summary('Master', 'v2', { averageScore: Infinity, validSeconds: 30, observedSeconds: 200, peakCPUPercent: NaN })] }))
  assert.equal(world.hasScore, false)
  assert.equal(world.coverage, 1)
  assert.equal(world.peakCPUPercent, null)
})

test('report translations cover the same controls and missing-score states in both languages', () => {
  const keys = value => Object.entries(value).flatMap(([key, item]) => item && typeof item === 'object' ? keys(item).map(child => `${key}.${child}`) : [key]).sort()
  assert.deepEqual(keys(performanceMessages['zh-CN']), keys(performanceMessages['en-US']))
})

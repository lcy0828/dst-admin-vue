import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { babelParse, parse } from '@vue/compiler-sfc'

import {
  ALL_LIVE_LOG_LINES,
  LIVE_LOG_LINE_OPTIONS,
  limitLiveLogLines,
  liveLogRequestLimit,
  liveLogScrollbackSize,
  mergeLiveLogTail,
  splitLiveLogText
} from '../src/lib/liveLogLines.mjs'

test('live log line selections include bounded choices and all', () => {
  assert.deepEqual(LIVE_LOG_LINE_OPTIONS, ['100', '300', '500', '1000', '2000'])
  assert.equal(liveLogRequestLimit('300'), 300)
  assert.equal(liveLogRequestLimit(ALL_LIVE_LOG_LINES), 2000)
  assert.equal(liveLogRequestLimit('invalid'), 300)
})

test('downloaded live logs retain every complete and partial line', () => {
  assert.deepEqual(splitLiveLogText('first\r\n\r\nlast'), ['first', '', 'last'])
  assert.deepEqual(splitLiveLogText('first\nlast\n'), ['first', 'last'])
  assert.deepEqual(splitLiveLogText(''), [])
})

test('live log retention only trims bounded selections', () => {
  const lines = Array.from({ length: 350 }, (_, index) => `line-${index}`)
  assert.deepEqual(limitLiveLogLines(lines, '100'), lines.slice(-100))
  assert.deepEqual(limitLiveLogLines(lines, ALL_LIVE_LOG_LINES), lines)
})

test('terminal scrollback reserves space for wrapped log lines', () => {
  assert.equal(liveLogScrollbackSize(100, '100'), 5000)
  assert.equal(liveLogScrollbackSize(2000, '2000'), 9000)
  assert.equal(liveLogScrollbackSize(2500, ALL_LIVE_LOG_LINES), 11000)
  assert.equal(liveLogScrollbackSize('invalid', '300'), 5000)
})

test('an all-lines snapshot merges the connected stream tail without duplicates', () => {
  assert.deepEqual(
    mergeLiveLogTail(['one', 'two', 'three'], ['two', 'three', 'four'], ALL_LIVE_LOG_LINES),
    ['one', 'two', 'three', 'four']
  )
  assert.deepEqual(
    mergeLiveLogTail(['one', 'two'], ['three'], '100'),
    ['one', 'two', 'three']
  )
})

test('leaving the log tab cancels its pending layout and ignores late room and log responses', async () => {
  const source = parse(readFileSync(new URL('../src/components/WorldLog.vue', import.meta.url), 'utf8')).descriptor.script.content
  const component = babelParse(source, { sourceType: 'module' }).program.body.find(node => node.type === 'ExportDefaultDeclaration').declaration
  const unmount = component.properties.find(node => node.key.name === 'beforeUnmount')
  const methods = component.properties.find(node => node.key.name === 'methods').value.properties
    .filter(node => ['loadLog', 'loadArchives'].includes(node.key.name))
  let resolveRooms, resolveLog
  const frames = [], events = []
  const handlers = runInNewContext(`({ ${[unmount, ...methods].map(node => source.slice(node.start, node.end)).join(',')} })`, {
    window: { removeEventListener() {}, cancelAnimationFrame: frame => frames.push(frame) },
    MANAGEMENT_SCOPE_CHANGED_EVENT: 'scope-changed', managementScopeTargetId: () => 'local',
    roomApi: { getScopedRuntimeOverview: () => new Promise(resolve => { resolveRooms = resolve }) }
  })
  const viewport = { _refreshAnimationFrame: 42, syncScrollArea: () => events.push('layout') }
  const state = {
    ...handlers, archiveRequestSequence: 0, logRequestSequence: 0,
    selectedRoomId: 'room', selectedWorldId: 'master',
    terminal: { _core: { viewport }, clear() {}, writeln() {}, dispose() { events.push('disposed') } },
    fitAddon: {}, clearLogRetry() {}, closeEventSource() {}, resetLogMetadata() {},
    fetchLogSnapshot: () => new Promise(resolve => { resolveLog = resolve }),
    resolveInitialSelection: () => events.push('selected'), renderSnapshot: () => events.push('rendered'),
    connectEventSource: () => events.push('connected')
  }
  const pending = [state.loadArchives(), state.loadLog()]
  state.beforeUnmount()
  viewport.syncScrollArea()
  resolveRooms({ data: { rooms: [] } })
  resolveLog({ lines: ['late log'] })
  await Promise.all(pending)
  assert.deepEqual(frames, [42])
  assert.deepEqual(events, ['disposed'])
  assert.equal(state.terminal, null)
  assert.equal(state.fitAddon, null)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildStructuredLogFilter,
  normalizeLogSources,
  normalizeStructuredLogList,
  shouldBootstrapStructuredLogs,
  structuredLogSnapshotKey
} from '../src/lib/logQuerySupport.mjs'

test('log sources preserve stable room and world ids while accepting legacy names', () => {
  assert.deepEqual(normalizeLogSources([
    {
      room_id: 'room-id',
      archive_name: 'room1',
      worlds: [
        { world_id: 'master-id', world_name: 'Master' },
        'LegacyCaves',
        null
      ]
    },
    { archive_name: '', worlds: [] }
  ]), [{
    id: 'room-id',
    name: 'room1',
    worlds: [
      { id: 'master-id', name: 'Master' },
      { id: 'LegacyCaves', name: 'LegacyCaves' }
    ]
  }])
})

test('structured log filters trim search text and calculate bounded offsets', () => {
  assert.deepEqual(buildStructuredLogFilter({
    page: 3,
    page_size: 500,
    type: ' error ',
    query: ' disk space '
  }, 'master-id'), {
    worldId: 'master-id',
    type: 'error',
    query: 'disk space',
    limit: 100,
    offset: 200
  })
})

test('structured log responses retain refresh metadata and raw source data', () => {
  assert.deepEqual(normalizeStructuredLogList({
    items: [{
      id: 7,
      roomId: 'room-id',
      worldId: 'master-id',
      worldName: 'Master',
      type: 'system',
      content: 'server started',
      rawContent: '[00:00:01]: server started',
      observedAt: '2026-08-09T15:00:00Z'
    }],
    total: 1,
    counts: { system: 1 },
    snapshotState: 'ready',
    snapshotUpdatedAt: '2026-08-09T15:01:00Z',
    lastRefreshedAt: '2026-08-09T15:01:00Z'
  }), {
    logs: [{
      id: 7,
      room_id: 'room-id',
      world_id: 'master-id',
      world_name: 'Master',
      log_type: 'system',
      content: 'server started',
      raw_content: '[00:00:01]: server started',
      timestamp: '2026-08-09T15:00:00Z',
      rule_id: undefined,
      rule_name: undefined
    }],
    total: 1,
    counts: { system: 1 },
    snapshot_state: 'ready',
    snapshot_updated_at: '2026-08-09T15:01:00Z',
    last_refreshed_at: '2026-08-09T15:01:00Z'
  })
})

test('log query page keeps the refresh job and requery lifecycle visible', async () => {
  const source = await readFile(new URL('../src/views/LogQueryView.vue', import.meta.url), 'utf8')

  assert.match(source, /logApi\.refresh\(this\.queryParams\.archive\)/)
  assert.match(source, /await this\.queryLogs\(true\)/)
  assert.match(source, /尚未解析日志/)
  assert.match(source, /InputGroupInput[^>]+queryParams\.query/)
  assert.match(source, /@update:model-value="handleWorldChange"/)
  assert.match(source, /Promise\.allSettled/)
})

test('an uninitialized world snapshot is bootstrapped only once', () => {
  const key = structuredLogSnapshotKey('room-id', 'master-id')
  assert.equal(key, 'room-id:master-id')
  assert.equal(shouldBootstrapStructuredLogs({
    roomId: 'room-id',
    worldId: 'master-id',
    snapshotState: 'uninitialized',
    lastRefreshedAt: null,
    attemptedKeys: []
  }), true)
  assert.equal(shouldBootstrapStructuredLogs({
    roomId: 'room-id',
    worldId: 'master-id',
    snapshotState: 'uninitialized',
    lastRefreshedAt: null,
    attemptedKeys: [key]
  }), false)
  assert.equal(shouldBootstrapStructuredLogs({
    roomId: 'room-id',
    worldId: 'master-id',
    snapshotState: 'ready',
    lastRefreshedAt: '2026-08-09T15:00:00Z',
    attemptedKeys: []
  }), false)
  assert.equal(shouldBootstrapStructuredLogs({
    roomId: 'room-id',
    worldId: 'master-id',
    snapshotState: 'cleared',
    lastRefreshedAt: null,
    attemptedKeys: []
  }), false)
})

test('cleared snapshots remain distinct from worlds that were never parsed', () => {
  assert.deepEqual(normalizeStructuredLogList({
    items: [],
    snapshotState: 'cleared',
    snapshotUpdatedAt: '2026-08-09T16:00:00Z'
  }), {
    logs: [],
    total: 0,
    counts: {},
    snapshot_state: 'cleared',
    snapshot_updated_at: '2026-08-09T16:00:00Z',
    last_refreshed_at: null
  })
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildStructuredLogFilter,
  inspectStructuredLogRefreshJob,
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

test('partial structured log refreshes remain usable when a shard succeeded', () => {
  assert.deepEqual(inspectStructuredLogRefreshJob({
    status: 'failed',
    outcome: 'partial',
    targets: [
      { status: 'succeeded', targetId: 'master' },
      { status: 'failed', targetId: 'caves', error: { message: 'caves log missing' } }
    ]
  }), {
    terminal: true,
    usable: true,
    partial: true,
    errorMessage: 'caves log missing'
  })
  assert.equal(inspectStructuredLogRefreshJob({
    status: 'failed',
    targets: [{ status: 'failed', error: { message: 'all failed' } }]
  }).usable, false)
  assert.deepEqual(inspectStructuredLogRefreshJob({ status: 'running' }), {
    terminal: false,
    usable: false,
    partial: false,
    errorMessage: '日志刷新任务执行失败'
  })
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
  assert.match(source, /logs\.query\.empty\.uninitializedTitle/)
  assert.match(source, /InputGroupInput[^>]+queryParams\.query/)
  assert.match(source, /@update:model-value="handleWorldChange"/)
  assert.match(source, /Promise\.allSettled/)
  assert.match(source, /refreshLogs\(\{ bootstrapKey \}\)/)
  assert.match(source, /\{ type: 'startup' \}/)
  assert.match(source, /\{ type: 'worldgen' \}/)
  assert.match(source, /\{ type: 'diagnostic' \}/)
  assert.match(source, /getLogTypeText\(log\.log_type\)/)
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

test('live log views reconnect transient streams and validate downloads', async () => {
  const [terminalSource, viewerSource, apiSource] = await Promise.all([
    readFile(new URL('../src/components/WorldLog.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/servers/LogViewer.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/v2.js', import.meta.url), 'utf8')
  ])

  assert.match(terminalSource, /streamState = 'reconnecting'/)
  assert.match(terminalSource, /if \(payload\?\.message\)/)
  assert.match(terminalSource, /scheduleLogRetry\(requestSequence\)/)
  assert.match(terminalSource, /Math\.min\(30_000, 3_000/)
  assert.match(terminalSource, /clearLogRetry\(true\)/)
  assert.match(terminalSource, /\\d\{2,\}/)
  assert.match(terminalSource, /formatSystemDateTime\(timestamp, \{/)
  assert.match(terminalSource, /id="world-log-line-count"/)
  assert.match(terminalSource, /<SelectItem value="all">/)
  assert.doesNotMatch(terminalSource, /<FieldContent>[\s\S]*world-log-follow/)
  assert.match(terminalSource, /\.log-actions \{[\s\S]*?min-height: 36px/)
  assert.match(terminalSource, /const viewportY = terminal\.buffer\.active\.viewportY/)
  assert.match(terminalSource, /terminal\.scrollToLine\(viewportY\)/)
  assert.match(terminalSource, /handleAutoScrollChange\(enabled\)/)
  assert.match(terminalSource, /width: 10px/)
  assert.doesNotMatch(terminalSource, /this\.terminal\.writeln\(this\.formatLogLine\(value\)\)\s*\n\s*if \(this\.autoScroll\)/)
  assert.match(terminalSource, /worldLogsV2API\.downloadBlob\(this\.selectedRoomId, this\.selectedWorldId\)/)
  assert.match(terminalSource, /limit: this\.selectedLogLineLimit/)
  assert.match(terminalSource, /if \(!this\.allLogLinesSelected && this\.rawLogLines\.length > this\.selectedLogLineLimit\)/)
  assert.doesNotMatch(terminalSource, /this\.rawLogLines\.length > 5000/)
  assert.match(viewerSource, /servers\.liveLogs\.feedback\.reconnecting/)
  assert.match(viewerSource, /worldLogsV2API\.downloadBlob/)
  assert.match(viewerSource, /this\.logs\.length > 5000/)
  assert.match(apiSource, /downloadBlob:[\s\S]+getBinary/)
})

test('legacy rule migration previews changes before importing and reparsing real logs', async () => {
  const [viewSource, adapterSource, apiSource] = await Promise.all([
    readFile(new URL('../src/views/RuleManagementView.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/logApi.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/v2.js', import.meta.url), 'utf8')
  ])

  assert.match(apiSource, /log-rules\/migration-preview/)
  assert.match(apiSource, /log-rules\/actions\/migrate-legacy/)
  assert.match(adapterSource, /getMigrationPreview/)
  assert.match(adapterSource, /migrateLegacyRules/)
  assert.match(viewSource, /migrationPreview\.items/)
  assert.match(viewSource, /ruleManagementApi\.migrateLegacyRules\(roomId\)/)
  assert.match(viewSource, /await logApi\.refresh\(roomId\)/)
  assert.match(viewSource, /scopeTargetId !== managementScopeTargetId\(this\.managementScope\)/)
})

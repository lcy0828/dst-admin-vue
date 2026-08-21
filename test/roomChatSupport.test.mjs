import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { buildChatLogFilter, normalizeChatLogList } from '../src/lib/chatLogSupport.mjs'

test('chat filters trim values, omit all-options, and calculate offsets', () => {
  assert.deepEqual(buildChatLogFilter({
    query: '  Willow  ',
    worldId: ' master ',
    kind: 'whisper',
    page: 3,
    pageSize: 100
  }), {
    query: 'Willow',
    worldId: 'master',
    kind: 'whisper',
    limit: 100,
    offset: 200
  })
  assert.deepEqual(buildChatLogFilter({ kind: 'all' }), { limit: 100, offset: 0 })
})

test('chat response normalization keeps partial availability metadata', () => {
  assert.deepEqual(normalizeChatLogList({
    items: [{ id: 'one' }],
    total: 1,
    counts: { say: 1 },
    partial: true,
    truncated: true,
    availableWorlds: 1,
    unavailableWorlds: 1,
    startedAt: '2026-08-21T01:00:00Z',
    updatedAt: '2026-08-21T02:00:00Z',
    problems: [{ worldId: 'caves' }]
  }), {
    items: [{ id: 'one' }],
    total: 1,
    counts: { say: 1, whisper: 0, announcement: 0 },
    partial: true,
    truncated: true,
    availableWorlds: 1,
    unavailableWorlds: 1,
    startedAt: '2026-08-21T01:00:00Z',
    updatedAt: '2026-08-21T02:00:00Z',
    problems: [{ worldId: 'caves' }]
  })
})

test('server workspace exposes room chat with shadcn composition', async () => {
  const [workspace, panel, api] = await Promise.all([
    readFile(new URL('../src/views/servers/ServerWorkspace.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/RoomChatPanel.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/v2.js', import.meta.url), 'utf8')
  ])

  assert.match(workspace, /TabsTrigger value="chat"/)
  assert.match(workspace, /<RoomChatPanel/)
  assert.match(panel, /<InputGroup>/)
  assert.match(panel, /<SelectContent><SelectGroup>/)
  assert.match(panel, /<UiTable class="chat-table">/)
  assert.match(panel, /entry\.occurredAt/)
  assert.match(panel, /chat\.columns\.runtime/)
  assert.match(panel, /chat\.startedAt/)
  assert.match(panel, /<Empty v-else-if=/)
  assert.match(panel, /chatLogsV2API\.list/)
  assert.match(api, /\/rooms\/\$\{encode\(roomId\)\}\/chat-logs/)
})

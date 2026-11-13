import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildChatHistoryReviewItems,
  buildChatLogFilter,
  formatChatParseProblem,
  formatDstChatPlayer,
  formatDstChatText,
  isChatContentExpandable,
  normalizeChatLogList,
  shouldShowPrimaryChatRepairAction
} from '../src/lib/chatLogSupport.mjs'
import { serverMessages } from '../src/i18n/serverMessages.js'

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
    problems: [{ worldId: 'caves' }],
    historyAvailable: true,
    pendingGenerations: 0,
    unavailableGenerations: 0,
    parseErrors: 0,
    uncertainTimes: 0,
    parseProblems: [],
    syncState: 'partial',
    syncMessage: 'agent offline',
    lastSyncedAt: '2026-08-21T02:00:00Z'
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
    problems: [{ worldId: 'caves' }],
    historyAvailable: true,
    pendingGenerations: 0,
    unavailableGenerations: 0,
    parseErrors: 0,
    uncertainTimes: 0,
    parseProblems: [],
    syncState: 'partial',
    syncMessage: 'agent offline',
    lastSyncedAt: '2026-08-21T02:00:00Z'
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
  assert.match(panel, /clearSearch/)
  assert.match(panel, /handleSearchInput/)
  assert.match(panel, /<SelectContent><SelectGroup>/)
  assert.match(panel, /<UiTable class="chat-table" container-class="overflow-visible">/)
  assert.match(panel, /min-width:\s*720px/)
  assert.doesNotMatch(panel, /min-width:\s*940px/)
  assert.match(panel, /width:\s*102px/)
  assert.match(panel, /width:\s*108px/)
  assert.match(panel, /position:\s*sticky/)
  assert.match(panel, /toggleEntryExpanded/)
  assert.match(panel, /formatDstChatPlayer/)
  assert.match(panel, /isChatContentExpandable/)
  assert.match(panel, /window\.getSelection\?\.\(\)\?\.toString\(\)/)
  assert.match(panel, /@keydown\.enter\.prevent="toggleEntryExpanded\(entry\)"/)
  assert.match(panel, /@keydown\.space\.prevent="toggleEntryExpanded\(entry\)"/)
  assert.match(panel, /class="shrink-0"/)
  assert.match(panel, /entry\.occurredAt/)
  assert.match(panel, /chat\.columns\.runtime/)
  assert.match(panel, /chat\.startedAt/)
  assert.match(panel, /chat\.lastSyncedAt/)
  assert.match(panel, /historyPartialTitle/)
  assert.match(panel, /<Popover v-if="historyAvailable" v-model:open="historyReviewOpen">/)
  assert.doesNotMatch(panel, /chat-review-alert/)
  assert.match(panel, /historyReviewOpen:\s*false/)
  assert.match(panel, /historyProblemDetailsOpen:\s*false/)
  assert.match(panel, /useRoomRefreshInterval/)
  assert.match(panel, /shouldAutoRefresh\(\)[\s\S]*?this\.page === 1 && this\.hasActiveWorlds/)
  assert.match(panel, /loadChatLogs\(\{ silent: true \}\)/)
  assert.match(panel, /<Empty v-else-if=/)
  assert.match(panel, /chatLogsV2API\.list/)
  assert.match(api, /\/rooms\/\$\{encode\(roomId\)\}\/chat-logs/)

  assert.equal(serverMessages['zh-CN'].servers.workspace.chat.announcements.roll, '掷骰')
  assert.equal(serverMessages['en-US'].servers.workspace.chat.announcements.roll, 'Roll')
  assert.equal(serverMessages['zh-CN'].servers.workspace.chat.announcements.system, '系统')
  assert.equal(serverMessages['en-US'].servers.workspace.chat.announcements.system, 'System')
})

test('chat review metadata preserves parse and time problems independently of read completion', () => {
  const list = normalizeChatLogList({ historyAvailable: true, syncState: 'review', pendingGenerations: 0,
    parseErrors: 2, uncertainTimes: 3, unavailableGenerations: 1, parseProblems: ['Master / archive: byte 123'] })
  assert.equal(list.syncState, 'review')
  assert.equal(list.parseErrors, 2)
  assert.equal(list.uncertainTimes, 3)
  assert.equal(list.unavailableGenerations, 1)
  assert.deepEqual(list.parseProblems, ['Master / archive: byte 123'])
})

test('chat archive review helpers omit zero counts, contextualize repair action, and resolve world names', () => {
  assert.deepEqual(
    buildChatHistoryReviewItems({ parseErrors: 654, uncertainTimes: 0, unavailableGenerations: 43 }),
    [
      { key: 'unavailableGenerations', messageKey: 'servers.workspace.chat.reviewUnavailableGenerations', count: 43 },
      { key: 'parseErrors', messageKey: 'servers.workspace.chat.reviewParseErrors', count: 654 }
    ]
  )
  assert.deepEqual(buildChatHistoryReviewItems({ parseErrors: 0, uncertainTimes: 0, unavailableGenerations: 0 }), [])

  assert.equal(shouldShowPrimaryChatRepairAction({ historyAvailable: true, syncState: 'ready', pendingGenerations: 0, activeRepair: false }), false)
  assert.equal(shouldShowPrimaryChatRepairAction({ historyAvailable: true, syncState: 'review', pendingGenerations: 0, activeRepair: false }), false)
  assert.equal(shouldShowPrimaryChatRepairAction({ historyAvailable: true, syncState: 'partial', pendingGenerations: 0, activeRepair: false }), true)
  assert.equal(shouldShowPrimaryChatRepairAction({ historyAvailable: true, syncState: 'pending', pendingGenerations: 0, activeRepair: false }), true)
  assert.equal(shouldShowPrimaryChatRepairAction({ historyAvailable: true, syncState: 'review', pendingGenerations: 2, activeRepair: false }), true)
  assert.equal(shouldShowPrimaryChatRepairAction({ historyAvailable: true, syncState: 'ready', pendingGenerations: 0, activeRepair: true }), true)

  assert.equal(
    formatChatParseProblem('Q2F2ZXM / server_chat_log_2026-10-31-16-52-26.txt: 字节 217：无法识别聊天行', [
      { id: 'TWFzdGVy', name: '森林' },
      { id: 'Q2F2ZXM', name: '洞穴' }
    ]),
    '洞穴 / server_chat_log_2026-10-31-16-52-26.txt: 字节 217：无法识别聊天行'
  )
})

test('formatDstChatText strips unsupported mod/controller PUA boxes while preserving Klei emojis and multiline text', () => {
  assert.equal(
    formatDstChatText('\uE102 地表将会在 14分27秒 后迎来一场降雨。'),
    '地表将会在 14分27秒 后迎来一场降雨。'
  )
  assert.equal(
    formatDstChatText('\u{F0000} 饥荒原版表情保留'),
    '\u{F0000} 饥荒原版表情保留'
  )
  assert.equal(
    formatDstChatText('\u{F0031}'),
    '\u{F0031}'
  )
  assert.equal(
    formatDstChatText('今日播报：\n\uE102 春季第 5 天\n\u{F0099} 鹿鹅已刷新'),
    '今日播报：\n春季第 5 天\n鹿鹅已刷新'
  )
  assert.equal(
    formatDstChatText('\uE102\u{100001}', { fallback: '[表情]' }),
    '[表情]'
  )
  assert.equal(formatDstChatText('   ', { fallback: '[表情]' }), '')
})

test('formatDstChatPlayer avoids labeling real PUA-only players as system', () => {
  assert.equal(formatDstChatPlayer({ playerName: '\uE102', playerId: 'KU_ABC' }, { systemLabel: '系统', fallback: '[表情]' }), 'KU_ABC')
  assert.equal(formatDstChatPlayer({ playerName: '\uE102', playerId: '' }, { systemLabel: '系统', fallback: '[表情]' }), '[表情]')
  assert.equal(formatDstChatPlayer({ playerName: '', playerId: '' }, { systemLabel: '系统', fallback: '[表情]' }), '系统')
  assert.equal(formatDstChatPlayer({ playerName: 'Host', playerId: '' }, { systemLabel: '系统', fallback: '[表情]' }), 'Host')
  assert.equal(formatDstChatPlayer({ playerName: '\uE102 Willow', playerId: 'KU_1' }, { systemLabel: '系统', fallback: '[表情]' }), 'Willow')
})

test('isChatContentExpandable accounts for wide CJK glyphs and multiline breaks', () => {
  assert.equal(isChatContentExpandable('一切正常'), false)
  assert.equal(isChatContentExpandable('这是一个只有二十四个汉字左右的短公告'), false)
  assert.equal(isChatContentExpandable('这是一个超过二十五个中文全角字符且在窄表格列下会被截断的公告内容'), true)
  assert.equal(isChatContentExpandable('a'.repeat(48)), false)
  assert.equal(isChatContentExpandable('a'.repeat(49)), true)
  assert.equal(isChatContentExpandable('第一行\n第二行'), true)
})

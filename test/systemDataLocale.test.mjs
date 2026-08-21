import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { formatDurationSeconds } from '../src/lib/localeFormatters.mjs'
import { formatSystemDateTime, formatSystemUnixTime } from '../src/lib/dateTime.mjs'
import {
  ANNOUNCEMENT_TYPE_IDS,
  announcementTypeId,
  isSystemAutomationGroup,
  normalizeSystemAutomationGroup,
  SYSTEM_AUTOMATION_GROUP_IDS,
  SYSTEM_EXECUTOR_ID
} from '../src/lib/systemDataIdentifiers.mjs'

test('system-owned values use stable English identifiers and accept legacy Chinese aliases', () => {
  assert.equal(SYSTEM_EXECUTOR_ID, 'system')
  assert.deepEqual(SYSTEM_AUTOMATION_GROUP_IDS, {
    UNGROUPED: 'ungrouped',
    PLAYER_MANAGEMENT: 'player-management'
  })
  assert.deepEqual(ANNOUNCEMENT_TYPE_IDS, { IMPORTANT: 'important', NOTICE: 'notice' })
  assert.equal(normalizeSystemAutomationGroup('未分组'), 'ungrouped')
  assert.equal(normalizeSystemAutomationGroup('玩家管理'), 'player-management')
  assert.equal(normalizeSystemAutomationGroup('player-refresh-system'), 'player-management')
  assert.equal(normalizeSystemAutomationGroup('custom-group'), 'custom-group')
  assert.equal(isSystemAutomationGroup('未分组', SYSTEM_AUTOMATION_GROUP_IDS.UNGROUPED), true)
  assert.equal(announcementTypeId(true), 'important')
  assert.equal(announcementTypeId(false), 'notice')
})

test('durations are formatted by the active locale catalog', () => {
  const zh = {
    'common.duration.daysHours': ({ days, hours }) => `${days} 天 ${hours} 小时`,
    'common.duration.hoursMinutes': ({ hours, minutes }) => `${hours} 小时 ${minutes} 分钟`,
    'common.duration.minutes': ({ minutes }) => `${minutes} 分钟`
  }
  const en = {
    'common.duration.daysHours': ({ days, hours }) => `${days} days ${hours} hours`,
    'common.duration.hoursMinutes': ({ hours, minutes }) => `${hours} hours ${minutes} minutes`,
    'common.duration.minutes': ({ minutes }) => `${minutes} minutes`
  }
  const translator = messages => (key, values) => messages[key](values)

  assert.equal(formatDurationSeconds(90061, translator(zh)), '1 天 1 小时')
  assert.equal(formatDurationSeconds(90061, translator(en)), '1 days 1 hours')
  assert.equal(formatDurationSeconds(3661, translator(en)), '1 hours 1 minutes')
  assert.equal(formatDurationSeconds(0, translator(en)), '0 minutes')
  assert.equal(formatDurationSeconds('invalid', translator(en)), '--')
})

test('system date formatting uses the configured IANA timezone', () => {
  const value = '2026-08-21T00:00:00Z'
  const options = { locale: 'en-CA', timeZone: 'Asia/Shanghai', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
  assert.match(formatSystemDateTime(value, options), /08:00/)
  assert.match(formatSystemUnixTime(Date.parse(value) / 1000, options), /08:00/)
  assert.equal(formatSystemDateTime('invalid', { fallback: '--' }), '--')
})

test('legacy adapters no longer persist or return localized enum values', () => {
  const cronApi = fs.readFileSync(new URL('../src/api/cronApi.js', import.meta.url), 'utf8')
  const playerApi = fs.readFileSync(new URL('../src/api/playerApi.js', import.meta.url), 'utf8')
  const adapters = fs.readFileSync(new URL('../src/api/v2LegacyAdapters.js', import.meta.url), 'utf8')

  assert.match(cronApi, /executor: SYSTEM_EXECUTOR_ID/)
  assert.match(cronApi, /name: SYSTEM_AUTOMATION_GROUP_IDS\.UNGROUPED/)
  assert.match(playerApi, /name: SYSTEM_AUTOMATION_GROUP_IDS\.PLAYER_MANAGEMENT/)
  assert.match(adapters, /type: value\.source \|\| 'manual'/)
  assert.doesNotMatch(adapters, /toLocaleString\('zh-CN'\)/)
  assert.doesNotMatch(adapters, /type: value\.important \? '重要' : '通知'/)
})

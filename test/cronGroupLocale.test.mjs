import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  CRON_GROUP_TYPE_IDS,
  cronGroupDescriptionLabel,
  cronGroupMessages,
  cronGroupNameLabel,
  cronGroupStatusMeta,
  cronGroupText,
  cronGroupTypeDescription,
  cronGroupTypeLabel,
  cronTaskTypeLabel,
  formatCronGroupDate,
  formatCronGroupDuration,
  formatCronGroupError,
  formatCronGroupNumber,
  formatCronGroupPercent
} from '../src/i18n/cronGroupMessages.js'

function leafPaths(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => (
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  ))
}

function translator(locale) {
  return (key, parameters = {}) => cronGroupText(locale, key, parameters)
}

test('task group locale catalogs expose identical message keys', () => {
  assert.deepEqual(
    leafPaths(cronGroupMessages['en-US']).sort(),
    leafPaths(cronGroupMessages['zh-CN']).sort()
  )
  assert.doesNotMatch(JSON.stringify(cronGroupMessages['en-US']), /[\u3400-\u9fff]/)
})

test('known task group protocol values are translated and unknown values remain untouched', () => {
  const zh = translator('zh-CN')
  const en = translator('en-US')

  assert.deepEqual(CRON_GROUP_TYPE_IDS, ['system', 'world', 'custom'])
  assert.equal(cronGroupTypeLabel('system', en), 'System')
  assert.equal(cronGroupTypeLabel('世界', en), 'World')
  assert.equal(cronGroupTypeLabel('custom', zh), '自定义')
  assert.equal(cronGroupTypeDescription('world', en), 'Game world tasks')
  assert.equal(cronGroupTypeLabel('mod-defined-group', en), 'mod-defined-group')
  assert.equal(cronGroupTypeDescription('mod-defined-group', en), 'mod-defined-group')

  assert.equal(cronTaskTypeLabel('function', en), 'Controlled Function')
  assert.equal(cronTaskTypeLabel('tmux_command', zh), '内建命令')
  assert.equal(cronTaskTypeLabel('shell', en), 'Shell Command')
  assert.equal(cronTaskTypeLabel('tmux_raw_command', zh), '原始命令')
  assert.equal(cronTaskTypeLabel('mod_runtime', en), 'mod_runtime')

  assert.deepEqual(cronGroupStatusMeta(1, en), { label: 'Enabled', variant: 'default' })
  assert.deepEqual(cronGroupStatusMeta('禁用', en), { label: 'Disabled', variant: 'secondary' })
  assert.deepEqual(cronGroupStatusMeta('paused', en), { label: 'paused', variant: 'outline' })
})

test('system task group names translate without changing custom group content', () => {
  const zh = translator('zh-CN')
  const en = translator('en-US')
  const ungrouped = { name: 'ungrouped', description: 'legacy description', type: 'system' }
  const legacyPlayers = { name: '玩家管理', description: '旧描述', type: 'system' }
  const custom = { name: '未分组', description: '我的自定义分组', type: 'custom' }

  assert.equal(cronGroupNameLabel(ungrouped, zh), '未分组')
  assert.equal(cronGroupNameLabel(ungrouped, en), 'Ungrouped')
  assert.equal(cronGroupDescriptionLabel(ungrouped, en), 'Holds automation tasks that have not been assigned to a group.')
  assert.equal(cronGroupNameLabel(legacyPlayers, en), 'Player Management')
  assert.equal(cronGroupDescriptionLabel(legacyPlayers, zh), '用于执行定时玩家信息刷新。')
  assert.equal(ungrouped.name, 'ungrouped')
  assert.equal(legacyPlayers.name, '玩家管理')

  assert.equal(cronGroupNameLabel(custom, en), '未分组')
  assert.equal(cronGroupDescriptionLabel(custom, en), '我的自定义分组')
})

test('task group statistics follow the active locale', () => {
  const en = translator('en-US')
  const zh = translator('zh-CN')
  const date = '2026-08-10'

  assert.equal(formatCronGroupNumber(1234.5, 'en-US'), new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(1234.5))
  assert.equal(formatCronGroupNumber('duration-from-mod', 'en-US'), 'duration-from-mod')
  assert.equal(formatCronGroupPercent(87.5, 'en-US'), new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 }).format(0.875))
  assert.equal(formatCronGroupDuration(12.5, 'zh-CN', zh), '12.5 秒')
  assert.equal(formatCronGroupDuration(12.5, 'en-US', en), '12.5 sec')
  assert.equal(formatCronGroupDate(date, 'en-US'), new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T00:00:00`)))
  assert.equal(formatCronGroupDate('mod-defined-date', 'en-US'), 'mod-defined-date')
})

test('localized task group failures preserve technical error detail', () => {
  const en = translator('en-US')
  const zh = translator('zh-CN')
  const detail = 'Lua fallback: module socket not found'

  assert.equal(
    formatCronGroupError(en, 'cronGroups.errors.runTask', new Error(detail)),
    `Could not run the task: ${detail}`
  )
  assert.equal(
    formatCronGroupError(zh, 'cronGroups.errors.detail', { response: { data: { detail } } }),
    `获取任务组详情失败：${detail}`
  )
})

test('task group pages localize visible copy while preserving user and protocol values', async () => {
  const paths = [
    '../src/views/cron/TaskGroups.vue',
    '../src/views/cron/TaskGroupDetail.vue',
    '../src/views/cron/TaskGroupForm.vue'
  ]
  const pages = await Promise.all(paths.map(path => readFile(new URL(path, import.meta.url), 'utf8')))

  for (const page of pages) {
    const template = page.slice(0, page.indexOf('<script>'))
    assert.doesNotMatch(template, /[\u3400-\u9fff]/)
    assert.doesNotMatch(page, /mergeLocaleMessage|install\w*Messages/)
  }

  assert.match(pages[0], /groupName\(group\)/)
  assert.match(pages[1], /\{\{ task\.name \}\}/)
  assert.match(pages[1], /\{\{ task\.spec \}\}/)
  assert.match(pages[1], /\{\{ task\.target \}\}/)
  assert.match(pages[2], /v-model="groupForm\.name"/)
  assert.match(pages[2], /v-model="groupForm\.description"/)
  assert.match(pages[2], /v-model="groupForm\.type"/)
  assert.match(pages[2], /cronTaskApi\.updateGroup\(this\.groupId, this\.groupForm\)/)
  assert.match(pages[2], /cronTaskApi\.addGroup\(this\.groupForm\)/)
})

test('task group messages are statically registered in the global locale catalog', async () => {
  const messages = await readFile(new URL('../src/i18n/messages.js', import.meta.url), 'utf8')

  assert.match(messages, /import \{ cronGroupMessages \} from '\.\/cronGroupMessages\.js'/)
  assert.match(messages, /\.\.\.cronGroupMessages\['zh-CN'\]/)
  assert.match(messages, /\.\.\.cronGroupMessages\['en-US'\]/)
  assert.doesNotMatch(messages, /mergeLocaleMessage/)
})

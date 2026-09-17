import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  createCronTaskFailure,
  cronTaskActionDescription,
  cronTaskActionName,
  cronTaskFailureText,
  cronTaskGroupLabel,
  cronTaskMessages,
  cronTaskStatusLabel,
  cronTaskText,
  cronTaskTriggerLabel,
  cronTaskTypeLabel,
  formatCronTaskDate,
  formatCronTaskFlexibleDuration,
  formatCronTaskMilliseconds
} from '../src/i18n/cronTaskMessages.js'

function leafPaths(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => (
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  ))
}

const pageNames = ['TaskList.vue', 'TaskForm.vue', 'TaskExecutionResult.vue', 'TaskCharts.vue']

test('Cron task catalogs expose identical keys and English contains no Chinese', () => {
  assert.deepEqual(
    leafPaths(cronTaskMessages['en-US']).sort(),
    leafPaths(cronTaskMessages['zh-CN']).sort()
  )
  assert.doesNotMatch(JSON.stringify(cronTaskMessages['en-US']), /[\u3400-\u9fff]/)
})

test('Cron task labels translate known protocol values and preserve unknown values', () => {
  assert.equal(cronTaskTypeLabel('function', 'en-US'), 'Controlled function')
  assert.equal(cronTaskTypeLabel('mod_task', 'en-US'), 'mod_task')
  assert.equal(cronTaskStatusLabel('pending', 'en-US'), 'Queued')
  assert.equal(cronTaskStatusLabel('mod_waiting', 'en-US'), 'mod_waiting')
  assert.equal(cronTaskTriggerLabel(0, 'en-US'), 'Scheduled')
  assert.equal(cronTaskTriggerLabel('mod_event', 'en-US'), 'mod_event')
  assert.equal(cronTaskActionName('room.start', 'en-US', '启动分片'), 'Start shards')
  assert.equal(cronTaskActionDescription('room.start', 'en-US', '启动选中的分片'), 'Start selected shards, or every shard when none are selected')
  assert.equal(cronTaskActionName('mod.action', 'en-US'), 'mod.action')
  assert.equal(cronTaskActionName('mod.action', 'en-US', '模组动作'), '模组动作')
})

test('Cron task system groups translate only for display', () => {
  assert.equal(cronTaskGroupLabel('未分组', 'en-US'), 'Ungrouped')
  assert.equal(cronTaskGroupLabel('Ungrouped', 'zh-CN'), '未分组')
  assert.equal(cronTaskGroupLabel('玩家管理', 'en-US'), 'Player management')
  assert.equal(cronTaskGroupLabel('商家自动化', 'en-US'), '商家自动化')
})

test('Cron task failures retain stable keys and technical detail across locales', () => {
  const failure = createCronTaskFailure('list.feedback.taskListFailed', new Error('HTTP 502: upstream reset'))

  assert.deepEqual(failure, {
    key: 'list.feedback.taskListFailed',
    detail: 'HTTP 502: upstream reset'
  })
  assert.equal(cronTaskFailureText(failure, 'zh-CN'), '获取任务列表失败：HTTP 502: upstream reset')
  assert.equal(cronTaskFailureText(failure, 'en-US'), 'Unable to load tasks: HTTP 502: upstream reset')
})

test('Cron task date and duration formatting follows the selected locale', () => {
  const timestamp = '2026-08-10T08:30:00.000Z'

  assert.equal(
    formatCronTaskDate(timestamp, 'en-US'),
    new Date(timestamp).toLocaleString('en-US', { hour12: false, timeZone: 'Asia/Shanghai' })
  )
  assert.equal(formatCronTaskDate('invalid-date', 'en-US'), 'invalid-date')
  assert.equal(formatCronTaskMilliseconds(500, 'zh-CN'), '500 毫秒')
  assert.equal(formatCronTaskMilliseconds(1500, 'en-US'), '1.5 s')
  assert.equal(formatCronTaskFlexibleDuration(1.5, 'en-US'), '1.5 s')
  assert.equal(formatCronTaskFlexibleDuration('mod_duration', 'en-US'), 'mod_duration')
})

test('Cron task pages localize presentation without rewriting task payloads', async () => {
  const pages = await Promise.all(pageNames.map(async name => ({
    name,
    source: await readFile(new URL(`../src/views/cron/${name}`, import.meta.url), 'utf8')
  })))

  for (const { name, source } of pages) {
    const template = source.slice(0, source.indexOf('<script>'))
    assert.doesNotMatch(template, /[\u3400-\u9fff]/, name)
    assert.match(source, /from '@\/i18n\/cronTaskMessages'/, name)
    assert.doesNotMatch(source, /mergeLocaleMessage|installCronTaskMessages/, name)
  }

  const list = pages.find(page => page.name === 'TaskList.vue').source
  const form = pages.find(page => page.name === 'TaskForm.vue').source
  const execution = pages.find(page => page.name === 'TaskExecutionResult.vue').source
  const charts = pages.find(page => page.name === 'TaskCharts.vue').source

  assert.match(list, /cronTaskActionName\(task\.target, this\.activeLocale, task\.target\)/)
  assert.match(list, /task\.raw_command/)
  assert.match(list, /taskResult\.output/)
  assert.match(form, /currentTmuxCommand\.script \|\| currentTmuxCommand\.command/)
  assert.match(form, /spec: '0 0 \* \* \* \*'/)
  assert.match(form, /errors\.name = 'form\.validation\.nameRequired'/)
  assert.match(execution, /\{\{ logData\.output \}\}/)
  assert.match(execution, /\{\{ logData\.error \}\}/)
  assert.match(charts, /watch:\s*\{\s*activeLocale\(\)/s)
  assert.match(charts, /this\.text\('charts\.graph\.overviewTitle'\)/)
  assert.match(charts, /this\.text\('common\.units\.secondsAxis'\)/)
})

test('Cron task catalog is static and protocol identifiers remain intact', async () => {
  const catalog = await readFile(new URL('../src/i18n/cronTaskMessages.js', import.meta.url), 'utf8')
  const globalCatalog = await readFile(new URL('../src/i18n/messages.js', import.meta.url), 'utf8')

  for (const actionId of [
    'room.start', 'room.stop', 'room.restart', 'backup.create', 'backup.prune',
    'command.execute', 'notification.send', 'player.refresh', 'log.structured.refresh', 'world.state.refresh'
  ]) {
    assert.ok(catalog.includes(`'${actionId}'`), actionId)
  }
  assert.doesNotMatch(catalog, /mergeLocaleMessage/)
  assert.match(globalCatalog, /import \{ cronTaskMessages \} from '\.\/cronTaskMessages\.js'/)
  assert.match(globalCatalog, /cronTasks: cronTaskMessages\['zh-CN'\]/)
  assert.match(globalCatalog, /cronTasks: cronTaskMessages\['en-US'\]/)
  assert.doesNotMatch(globalCatalog, /mergeLocaleMessage/)
  assert.equal(cronTaskText('form.fields.cronPlaceholder', 'en-US'), 'Example: 0 0 * * * *')
  assert.equal(cronTaskActionName('mod.lua', 'en-US'), 'mod.lua')
})

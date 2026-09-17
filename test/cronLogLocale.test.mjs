import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  cronExecutorLabel,
  cronLogMessages,
  cronRunStatusLabel,
  cronRunStatusVariant,
  cronTaskTypeLabel,
  cronTriggerLabel,
  formatCronLogDate,
  formatCronLogDuration
} from '../src/i18n/cronLogMessages.js'

function leafPaths(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => (
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  ))
}

function translator(locale) {
  const catalog = cronLogMessages[locale]
  return (key, parameters = {}) => {
    let value = key.split('.').reduce((current, segment) => current?.[segment], catalog)
    for (const [name, replacement] of Object.entries(parameters)) {
      value = value.replaceAll(`{${name}}`, String(replacement))
    }
    return value
  }
}

test('cron log locale catalogs expose matching keys', () => {
  assert.deepEqual(
    leafPaths(cronLogMessages['en-US']).sort(),
    leafPaths(cronLogMessages['zh-CN']).sort()
  )
})

test('known cron log values translate while unknown runtime values remain unchanged', () => {
  const en = translator('en-US')
  assert.equal(cronRunStatusLabel('succeeded', en), 'Succeeded')
  assert.equal(cronRunStatusLabel('mod_status', en), 'mod_status')
  assert.equal(cronRunStatusVariant('mod_status'), 'outline')
  assert.equal(cronTriggerLabel(1, en), 'Manual')
  assert.equal(cronTriggerLabel(undefined, en, false), 'Scheduled')
  assert.equal(cronTriggerLabel('mod_trigger', en), 'mod_trigger')
  assert.equal(cronTaskTypeLabel('tmux_command', en), 'Built-in command')
  assert.equal(cronTaskTypeLabel('mod_task', en), 'mod_task')
  assert.equal(cronExecutorLabel('system', en), 'System')
  assert.equal(cronExecutorLabel('系统', en), 'System')
  assert.equal(cronExecutorLabel('operator@example', en), 'operator@example')
})

test('cron log dates and durations follow the active locale', () => {
  const value = '2026-08-10T08:30:00.000Z'
  const en = translator('en-US')
  assert.equal(formatCronLogDate(value, 'en-US'), new Date(value).toLocaleString('en-US', { hour12: false, timeZone: 'Asia/Shanghai' }))
  assert.equal(formatCronLogDate(value, 'zh-CN'), new Date(value).toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' }))
  assert.equal(formatCronLogDate('mod-time', 'en-US'), 'mod-time')
  assert.equal(formatCronLogDuration(250, 'en-US', en), '250 ms')
  assert.equal(formatCronLogDuration(1500, 'en-US', en), '1.5 s')
})

test('cron log and transfer pages delegate visible copy to static i18n catalogs', () => {
  const paths = [
    '../src/views/cron/TaskLogs.vue',
    '../src/views/cron/TaskLogDetail.vue',
    '../src/views/cron/TaskImportExport.vue'
  ]
  for (const path of paths) {
    const page = fs.readFileSync(new URL(path, import.meta.url), 'utf8')
    const template = page.slice(page.indexOf('<template>'), page.indexOf('</template>'))
    assert.doesNotMatch(template, /[\u3400-\u9fff]/, path)
  }

  const messages = fs.readFileSync(new URL('../src/i18n/messages.js', import.meta.url), 'utf8')
  const api = fs.readFileSync(new URL('../src/api/cronApi.js', import.meta.url), 'utf8')
  assert.match(messages, /\.\.\.cronLogMessages\['en-US'\]/)
  assert.match(api, /created_at: new Date\(\)\.toISOString\(\)/)
})

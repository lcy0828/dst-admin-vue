import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  agentCommandActionDescription,
  agentCommandActionName,
  agentCommandFailureText,
  agentCommandStatusLabel,
  agentMessages,
  createAgentCommandFailure,
  formatAgentCommandDuration,
  formatAgentCommandTime
} from '../src/i18n/agentMessages.js'

function readPath(value, path) {
  return path.split('.').reduce((current, segment) => current?.[segment], value)
}

function translator(locale) {
  return (key, parameters = {}) => {
    let message = readPath(agentMessages[locale], key) || key
    for (const [name, replacement] of Object.entries(parameters)) {
      message = message.replaceAll(`{${name}}`, String(replacement))
    }
    return message
  }
}

test('Agent command labels translate known protocol values and preserve unknown values', () => {
  const en = translator('en-US')

  assert.equal(agentCommandStatusLabel('pending', en), 'Pending')
  assert.equal(agentCommandStatusLabel('succeeded', en), 'Completed')
  assert.equal(agentCommandStatusLabel('mod_waiting', en), 'mod_waiting')
  assert.equal(
    agentCommandActionName({ id: 'system.refresh', name: '刷新系统信息' }, en),
    'Refresh system information'
  )
  assert.equal(
    agentCommandActionDescription({ id: 'disk.inspect', description: '检查磁盘' }, en),
    'Run a read-only disk capacity inspection with an argument array'
  )
  assert.equal(
    agentCommandActionName({ id: 'mod.action', name: '模组动作' }, en),
    '模组动作'
  )
})

test('Agent command failures retain stable keys and backend detail across locales', () => {
  const failure = createAgentCommandFailure(
    'agents.command.feedback.historyLoadFailed',
    new Error('stderr: permission denied')
  )

  assert.deepEqual(failure, {
    key: 'agents.command.feedback.historyLoadFailed',
    detail: 'stderr: permission denied'
  })
  assert.equal(
    agentCommandFailureText(failure, translator('zh-CN')),
    '获取命令历史失败：stderr: permission denied'
  )
  assert.equal(
    agentCommandFailureText(failure, translator('en-US')),
    'Unable to load command history: stderr: permission denied'
  )
})

test('Agent command dates and durations follow the active locale', () => {
  const timestamp = '2026-08-10T08:30:00.000Z'
  const zh = translator('zh-CN')
  const en = translator('en-US')

  assert.equal(
    formatAgentCommandTime(timestamp, 'en-US', en),
    new Date(timestamp).toLocaleString('en-US')
  )
  assert.equal(formatAgentCommandTime('invalid', 'en-US', en), 'N/A')
  assert.equal(formatAgentCommandDuration(999, 'zh-CN', zh), '999 毫秒')
  assert.equal(formatAgentCommandDuration(1500, 'en-US', en), '1.5 s')
  assert.equal(formatAgentCommandDuration(-1, 'en-US', en), 'N/A')
})

test('Agent command page localizes presentation while preserving command protocols', async () => {
  const source = await readFile(new URL('../src/views/agents/AgentCommand.vue', import.meta.url), 'utf8')
  const template = source.split('<script>')[0]

  assert.doesNotMatch(template, /[\u3400-\u9fff]/)
  assert.match(source, /agentCommandStatusLabel\(status, this\.\$t\)/)
  assert.match(source, /createAgentCommandFailure\('agents\.command\.feedback\.historyLoadFailed', error\)/)
  assert.match(source, /const localeState = this\.\$i18n\?\.locale/)
  assert.match(source, /formatAgentCommandTime\(timestamp, this\.activeLocale\(\), this\.\$t\)/)
  assert.match(template, /\{\{ command\.content \}\}/)
  assert.match(template, /\{\{ selectedCommand\.output \}\}/)
  assert.match(template, /\{\{ selectedCommand\.error_msg \}\}/)
  assert.match(source, /type: 'action'/)
  assert.match(source, /action: this\.commandForm\.action/)
})

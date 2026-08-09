import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  logParserLoadFailure,
  logParserServerTypeLabel,
  logParserStatusMeta,
  logToolsMessages,
  regexTesterErrorLabel
} from '../src/i18n/logToolsMessages.js'

function translator(locale) {
  return (key, parameters = {}) => {
    let value = key.split('.').reduce((item, part) => item?.[part], logToolsMessages[locale])
    for (const [name, replacement] of Object.entries(parameters)) {
      value = value.replaceAll(`{${name}}`, String(replacement))
    }
    return value
  }
}

function assertSameShape(left, right, path = []) {
  assert.equal(typeof right, typeof left, path.join('.'))
  if (!left || typeof left !== 'object' || Array.isArray(left)) return
  assert.deepEqual(Object.keys(right).sort(), Object.keys(left).sort(), path.join('.'))
  for (const key of Object.keys(left)) assertSameShape(left[key], right[key], [...path, key])
}

test('log tool locale catalogs expose the same keys', () => {
  assertSameShape(logToolsMessages['zh-CN'], logToolsMessages['en-US'])
  assert.doesNotMatch(JSON.stringify(logToolsMessages['en-US']), /[\u3400-\u9fff]/)
})

test('parser labels translate known protocol values and preserve custom values', () => {
  const zh = translator('zh-CN')
  const en = translator('en-US')

  assert.deepEqual(logParserStatusMeta('running', en), { label: 'Running', variant: 'default' })
  assert.equal(logParserStatusMeta('custom_status', en).label, 'custom_status')
  assert.equal(logParserServerTypeLabel('Forest', zh), '森林世界')
  assert.equal(logParserServerTypeLabel('Caves', en), 'Caves world')
  assert.equal(logParserServerTypeLabel('modded_world', en), 'modded_world')
})

test('parser and regex error state is translated without rewriting technical detail', () => {
  const zh = translator('zh-CN')
  const en = translator('en-US')

  assert.equal(
    logParserLoadFailure({ kind: 'request', detail: 'connection refused' }, en),
    'Could not load running worlds: connection refused'
  )
  assert.equal(
    regexTesterErrorLabel({ key: 'tailInvalid', detail: 'Invalid regular expression: /[/' }, zh),
    '尾行正则表达式错误：Invalid regular expression: /[/'
  )
  assert.equal(
    regexTesterErrorLabel({ key: 'custom_error', detail: 'Lua matcher failed' }, en),
    'Lua matcher failed'
  )
})

test('log tools delegate visible templates to i18n while leaving tool payloads untouched', async () => {
  const [parser, tester] = await Promise.all([
    readFile(new URL('../src/views/logs/LogParser.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/RegexTester.vue', import.meta.url), 'utf8')
  ])
  const parserTemplate = parser.split('<script>')[0]
  const testerTemplate = tester.split('<script>')[0]

  assert.match(parser, /\$t\('logTools\.parser\./)
  assert.match(tester, /\$t\('logTools\.regex\./)
  assert.match(tester, /this\.regexForm\.pattern/)
  assert.match(tester, /this\.regexForm\.testContent/)
  assert.doesNotMatch(parserTemplate, /[\u3400-\u9fff]/)
  assert.doesNotMatch(testerTemplate, /[\u3400-\u9fff]/)
})

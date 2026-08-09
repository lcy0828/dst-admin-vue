import test from 'node:test'
import assert from 'node:assert/strict'

import { logRuleDescription, logRuleName } from '../src/i18n/logRules.js'
import { KNOWN_LOG_TYPES, logTypeLabel } from '../src/i18n/logTypes.js'
import { messages } from '../src/i18n/messages.js'
import { migrationReasonLabel } from '../src/i18n/migrationReasons.js'

function keys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return child && typeof child === 'object' && !Array.isArray(child)
      ? keys(child, path)
      : [path]
  }).sort()
}

function translator(locale) {
  return (key, parameters = {}) => {
    const message = key.split('.').reduce((value, segment) => value?.[segment], messages[locale]) || key
    return Object.entries(parameters).reduce(
      (value, [name, replacement]) => value.replaceAll(`{${name}}`, String(replacement)),
      message
    )
  }
}

test('supported locale catalogs expose exactly the same message keys', () => {
  assert.deepEqual(keys(messages['en-US']), keys(messages['zh-CN']))
})

test('known log types have Chinese and English display labels while custom values remain unchanged', () => {
  const zh = translator('zh-CN')
  const en = translator('en-US')

  for (const type of KNOWN_LOG_TYPES) {
    assert.notEqual(logTypeLabel(type, zh), `logs.types.${type}`)
    assert.notEqual(logTypeLabel(type, en), `logs.types.${type}`)
  }
  assert.equal(logTypeLabel('worldgen', zh), '世界生成')
  assert.equal(logTypeLabel('worldgen', en), 'World generation')
  assert.equal(logTypeLabel('my_custom_type', zh), 'my_custom_type')
})

test('built-in rule metadata is localized by stable id without rewriting user rules', () => {
  const en = translator('en-US')
  const builtIn = {
    id: 'builtin-startup',
    built_in: true,
    name: '专服启动',
    description: '专服路径、构建版本、平台与 Lua 初始化'
  }
  assert.equal(logRuleName(builtIn, en), 'Dedicated server startup')
  assert.equal(logRuleDescription(builtIn, en), 'Server paths, build information, platform setup, and Lua initialization')
  assert.equal(logRuleName({ id: 'legacy-1', name: '我的规则' }, en), '我的规则')
})

test('legacy migration reasons are localized without changing unknown backend detail', () => {
  const en = translator('en-US')
  assert.equal(migrationReasonLabel('可以导入', en), 'Ready to import')
  assert.equal(migrationReasonLabel('新版暂不支持 fixed_lines（旧规则配置为 4 行）', en), 'fixed_lines is not supported yet (legacy rule uses 4 lines)')
  assert.equal(migrationReasonLabel('正则表达式无效：bad escape', en), '正则表达式无效：bad escape')
})

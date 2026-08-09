import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  createModFailure,
  formatModDate,
  formatModFailure,
  modMessages,
  translateModBuiltinValue
} from '../src/i18n/modMessages.js'

function leafPaths(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => (
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  ))
}

function readPath(value, path) {
  return path.split('.').reduce((current, key) => current?.[key], value)
}

function translator(locale) {
  const catalog = modMessages[locale]
  return (key, parameters = {}) => {
    let message = readPath(catalog, key)
    for (const [name, replacement] of Object.entries(parameters)) {
      message = message.replaceAll(`{${name}}`, String(replacement))
    }
    return message
  }
}

test('mod locale catalogs expose identical message keys', () => {
  assert.deepEqual(
    leafPaths(modMessages['en-US']).sort(),
    leafPaths(modMessages['zh-CN']).sort()
  )
})

test('known mod protocol values are translated while unknown values remain untouched', () => {
  const zh = translator('zh-CN')
  const en = translator('en-US')

  assert.equal(translateModBuiltinValue(zh, 'health', 'update_available'), '有可用更新')
  assert.equal(translateModBuiltinValue(zh, 'fieldType', 'boolean'), '布尔值')
  assert.equal(translateModBuiltinValue(zh, 'fieldType', 'json'), 'JSON 数据')
  assert.equal(translateModBuiltinValue(zh, 'source', 'PATH'), '环境路径')
  assert.equal(translateModBuiltinValue(en, 'parser', 'lua'), 'Lua compatibility parser')
  assert.equal(translateModBuiltinValue(en, 'repairAction', 'restart'), 'Restart')
  assert.equal(translateModBuiltinValue(en, 'health', 'my_mod_health'), 'my_mod_health')
  assert.equal(translateModBuiltinValue(en, 'fieldType', 'custom_widget'), 'custom_widget')
  assert.equal(translateModBuiltinValue(en, 'source', 'mod_runtime'), 'mod_runtime')
})

test('mod dates follow the active locale and preserve unparseable source values', () => {
  const value = '2026-08-10T08:30:00.000Z'
  const options = {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }

  assert.equal(formatModDate(value, 'zh-CN'), new Intl.DateTimeFormat('zh-CN', options).format(new Date(value)))
  assert.equal(formatModDate(value, { value: 'en-US' }), new Intl.DateTimeFormat('en-US', options).format(new Date(value)))
  assert.equal(formatModDate('mod-defined-time', 'en-US'), 'mod-defined-time')
  assert.equal(formatModDate('', 'en-US'), '--')
})

test('mod failures keep a stable message key and untouched technical detail', () => {
  const failure = createModFailure('mods.errors.config', new Error('Lua fallback: module socket not found'))

  assert.deepEqual(failure, {
    key: 'mods.errors.config',
    detail: 'Lua fallback: module socket not found'
  })
  assert.equal(
    formatModFailure(translator('en-US'), failure),
    'Could not load the mod configuration: Lua fallback: module socket not found'
  )
  assert.equal(
    formatModFailure(translator('zh-CN'), failure),
    '获取模组配置失败：Lua fallback: module socket not found'
  )
})

test('mod pages delegate visible copy to i18n without translating mod-owned data', async () => {
  const paths = [
    '../src/views/mods/ModList.vue',
    '../src/views/mods/ModSearch.vue',
    '../src/views/mods/ModConfigDialog.vue'
  ]
  const pages = await Promise.all(paths.map(path => readFile(new URL(path, import.meta.url), 'utf8')))

  for (const page of pages) {
    const template = page.slice(0, page.indexOf('<script>'))
    assert.doesNotMatch(template, /[\u3400-\u9fff]/)
    assert.doesNotMatch(page, /installModMessages/)
  }

  assert.match(pages[0], /\{\{ mod\.name \}\}/)
  assert.match(pages[0], /\{\{ mod\.author \|\| \$t\(/)
  assert.match(pages[1], /\{\{ currentModInfo\.describe \}\}/)
  assert.match(pages[2], /\{\{ option\.label \}\}/)
  assert.match(pages[2], /:value="opt\.data"/)
  assert.match(pages[2], /this\.configForm\[option\.name\] = value/)
})

test('mod messages are registered statically in the global catalog', async () => {
  const messages = await readFile(new URL('../src/i18n/messages.js', import.meta.url), 'utf8')

  assert.match(messages, /\.\.\.modMessages\['zh-CN'\]/)
  assert.match(messages, /\.\.\.modMessages\['en-US'\]/)
})

test('mod API leaves timestamps raw so locale formatting stays in the view layer', async () => {
  const api = await readFile(new URL('../src/api/modApi.js', import.meta.url), 'utf8')

  assert.doesNotMatch(api, /Intl\.DateTimeFormat\('zh-CN'/)
  assert.match(api, /time: mod\.updatedAt \|\| ''/)
  assert.match(api, /update_time: mod\.updatedAt \|\| ''/)
  assert.match(api, /installedAt: mod\.localUpdatedAt \|\| ''/)
})

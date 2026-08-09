import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  commandMessages,
  formatCommandTime,
  localizeCommandError,
  translateBuiltinCommandField,
  translateBuiltinParameterField,
  translateBuiltinParameterOption,
  translateCommandCategory,
  translateCommandStatus
} from '../src/i18n/commandMessages.js'
import {
  COMMAND_CATEGORY_IDS,
  normalizeCommandCategory
} from '../src/lib/commandCategories.mjs'

function readPath(value, path) {
  return path.split('.').reduce((current, key) => current?.[key], value)
}

function leafPaths(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => (
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  ))
}

test('command locale catalogs expose identical message keys', () => {
  assert.deepEqual(
    leafPaths(commandMessages['en-US']).sort(),
    leafPaths(commandMessages['zh-CN']).sort()
  )
})

test('command categories persist as stable English ids and migrate legacy Chinese values', () => {
  assert.deepEqual(COMMAND_CATEGORY_IDS, {
    INFO: 'info', PLAYER: 'player', WORLD: 'world', SYSTEM: 'system', CUSTOM: 'custom'
  })
  assert.equal(normalizeCommandCategory('信息查询'), 'info')
  assert.equal(normalizeCommandCategory('玩家管理'), 'player')
  assert.equal(normalizeCommandCategory('基础操作'), 'basic')
  assert.equal(normalizeCommandCategory('查询'), 'info')
  assert.equal(normalizeCommandCategory('世界信息'), 'world_info')
  assert.equal(normalizeCommandCategory('世界控制'), 'world_control')
  assert.equal(normalizeCommandCategory('危险操作'), 'dangerous')
  assert.equal(normalizeCommandCategory('自定义命令'), 'custom')
  assert.equal(normalizeCommandCategory('my_mod_category'), 'my_mod_category')
})

test('command category and status labels preserve unknown protocol values', () => {
  const messages = commandMessages['en-US']
  const translate = (key, parameters) => {
    let value = readPath(messages, key)
    for (const [name, replacement] of Object.entries(parameters || {})) {
      value = value.replaceAll(`{${name}}`, replacement)
    }
    return value
  }
  const hasTranslation = key => readPath(messages, key) !== undefined

  assert.equal(translateCommandCategory(translate, hasTranslation, '世界控制'), 'World control')
  assert.equal(translateCommandCategory(translate, hasTranslation, 'my_mod_category'), 'my_mod_category')
  assert.equal(translateCommandStatus(translate, hasTranslation, 'sending'), 'Sending')
  assert.equal(translateCommandStatus(translate, hasTranslation, 'mod_status'), 'mod_status')

  assert.equal(
    translateBuiltinCommandField(translate, hasTranslation, {
      id: 'announce', name: '发送公告', isBuiltin: true
    }, 'name'),
    'Send announcement'
  )
  assert.equal(
    translateBuiltinParameterField(translate, hasTranslation, {
      id: 'set_season', isBuiltin: true
    }, { name: 'season', label: '季节' }, 'label'),
    'Season'
  )
  assert.equal(
    translateBuiltinParameterOption(translate, hasTranslation, {
      id: 'set_season', isBuiltin: true
    }, { name: 'season' }, 'winter'),
    'Winter'
  )
  assert.equal(
    translateBuiltinParameterOption(translate, hasTranslation, {
      id: 'set_season', isBuiltin: true
    }, { name: 'season' }, 'modded_season'),
    'modded_season'
  )
  assert.equal(
    translateBuiltinCommandField(translate, hasTranslation, {
      id: 'custom_builtin', name: 'Custom backend name', isBuiltin: true
    }, 'name'),
    'Custom backend name'
  )

  const error = Object.assign(new Error('internal fallback'), {
    code: 'COMMAND_IMPORT_ITEM_FAILED',
    itemNumber: 3,
    detail: 'custom diagnostic'
  })
  assert.equal(
    localizeCommandError(translate, hasTranslation, error, 'commands.errors.import'),
    'Command 3 could not be imported: custom diagnostic'
  )
})

test('command history time follows the active locale', () => {
  const value = '2026-08-10T08:30:00.000Z'
  assert.equal(formatCommandTime(value, 'zh-CN'), new Date(value).toLocaleString('zh-CN', { hour12: false }))
  assert.equal(formatCommandTime(value, 'en-US'), new Date(value).toLocaleString('en-US', { hour12: false }))
  assert.equal(formatCommandTime(value, { value: 'en-US' }), new Date(value).toLocaleString('en-US', { hour12: false }))
  assert.equal(formatCommandTime('invalid', 'en-US'), '--')
})

test('command page localizes display copy while preserving Lua command content', () => {
  const page = fs.readFileSync(new URL('../src/views/servers/CommandManager.vue', import.meta.url), 'utf8')
  const api = fs.readFileSync(new URL('../src/api/commandManager.js', import.meta.url), 'utf8')
  const globalMessages = fs.readFileSync(new URL('../src/i18n/messages.js', import.meta.url), 'utf8')
  const template = page.slice(0, page.indexOf('<script>'))

  assert.doesNotMatch(template, /[一-鿿]/)
  assert.match(page, /c_announce\(\\'这里输入你的公告内容\\'\)/)
  assert.match(page, /normalizeCommandCategory\(this\.commandForm\.type\)/)
  assert.match(api, /export const COMMAND_TYPES = COMMAND_CATEGORY_IDS/)
  assert.match(api, /category: normalizeCommandCategory\(command\.type \|\| command\.category\)/)
  assert.match(globalMessages, /\.\.\.commandMessages\['en-US'\]/)
  assert.doesNotMatch(page, /installCommandMessages/)
})

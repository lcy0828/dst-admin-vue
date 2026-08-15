import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  formatBanExpiry,
  formatPlayerDate,
  isPlayerOnline,
  PLAYER_BAN_DURATION_IDS,
  playerBanDurationLabel,
  playerCharacterLabel,
  playerErrorDetail,
  playerMessages,
  playerStatusMeta
} from '../src/i18n/playerMessages.js'

function translator(locale) {
  return (key, parameters = {}) => {
    let value = key.split('.').reduce((item, part) => item?.[part], playerMessages[locale])
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

test('player locale catalogs expose the same keys', () => {
  assertSameShape(playerMessages['zh-CN'], playerMessages['en-US'])
  assert.doesNotMatch(JSON.stringify(playerMessages['en-US']), /[\u3400-\u9fff]/)
})

test('known player status and legacy Chinese values follow the selected locale', () => {
  const zh = translator('zh-CN')
  const en = translator('en-US')

  assert.equal(isPlayerOnline('online'), true)
  assert.equal(isPlayerOnline('在线'), true)
  assert.equal(isPlayerOnline('stale'), false)
  assert.deepEqual(playerStatusMeta('online', en), { label: 'Online', variant: 'default' })
  assert.deepEqual(playerStatusMeta('stale', en), { label: 'Last known online', variant: 'outline' })
  assert.deepEqual(playerStatusMeta('在线', zh), { label: '在线', variant: 'default' })
  assert.equal(playerStatusMeta('mod_spectating', en).label, 'mod_spectating')
})

test('character and ban duration labels preserve unknown mod values', () => {
  const zh = translator('zh-CN')
  const en = translator('en-US')

  assert.equal(playerCharacterLabel('wilson', zh), '威尔逊')
  assert.equal(playerCharacterLabel('威尔逊', en), 'Wilson')
  assert.equal(playerCharacterLabel('mod_character_ember', en), 'mod_character_ember')
  assert.equal(playerBanDurationLabel('永久', en), 'Permanent')
  assert.equal(playerBanDurationLabel('custom_duration', zh), 'custom_duration')
  assert.deepEqual(PLAYER_BAN_DURATION_IDS, ['1h', '6h', '12h', '1d', '3d', '7d', '30d', 'permanent'])
})

test('player dates and ban expiry follow the selected locale', () => {
  const value = '2026-08-10T08:05:04Z'
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }
  const zh = translator('zh-CN')
  const en = translator('en-US')

  assert.equal(formatPlayerDate(value, 'zh-CN'), new Date(value).toLocaleString('zh-CN', options))
  assert.equal(formatPlayerDate(value, 'en-US'), new Date(value).toLocaleString('en-US', options))
  assert.equal(formatBanExpiry(null, 'en-US', en), 'Permanent')
  assert.equal(formatBanExpiry('invalid', 'zh-CN', zh), '未知')
  assert.equal(formatBanExpiry(value, 'en-US', en, new Date('2026-08-11T00:00:00Z').getTime()), 'Expired')
  assert.equal(formatBanExpiry(value, 'zh-CN', zh, new Date('2026-08-09T00:00:00Z').getTime()), formatPlayerDate(value, 'zh-CN'))
})

test('stable errors are localized while custom technical detail stays untouched', () => {
  const zh = translator('zh-CN')
  const en = translator('en-US')

  assert.equal(playerErrorDetail({ response: { data: { code: 'WORLD_NOT_RUNNING', message: '世界未运行' } } }, en), 'The world is not running')
  assert.equal(playerErrorDetail({ code: 'CUSTOM_MOD_ERROR', message: 'Lua bridge exited with code 2' }, zh), 'Lua bridge exited with code 2')
})

test('player identity and custom ban text are never rewritten by display helpers', () => {
  const en = translator('en-US')
  const values = ['KU_abc123', '76561198000000000', '霜月', '商家自定义封禁原因']

  for (const value of values) assert.equal(playerCharacterLabel(value, en), value)
})

test('player pages delegate visible copy to i18n and retain stable API values', async () => {
  const [playerList, banList] = await Promise.all([
    readFile(new URL('../src/views/players/PlayerList.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/players/BanList.vue', import.meta.url), 'utf8')
  ])
  const playerTemplate = playerList.split('<script>')[0]
  const banTemplate = banList.split('<script setup>')[0]

  assert.match(playerList, /\$t\('players\./)
  assert.match(banList, /\bt\('players\./)
  assert.match(playerList, /PLAYER_BAN_DURATION_IDS/)
  assert.match(playerList, /name: `player_refresh_\$\{sessionName\}`/)
  assert.match(playerList, /duration: '1d'/)
  assert.match(playerList, /isPlayerOnline\(player\.status\)/)
  assert.match(banList, /formatBanExpiry\(value, locale\.value, t\)/)
  assert.doesNotMatch(playerTemplate, /[\u3400-\u9fff]/)
  assert.doesNotMatch(banTemplate, /[\u3400-\u9fff]/)
})

test('player messages are registered in the global locale catalogs', async () => {
  const source = await readFile(new URL('../src/i18n/messages.js', import.meta.url), 'utf8')

  assert.match(source, /import \{ playerMessages \} from '\.\/playerMessages\.js'/)
  assert.match(source, /\.\.\.playerMessages\['zh-CN'\]/)
  assert.match(source, /\.\.\.playerMessages\['en-US'\]/)
})

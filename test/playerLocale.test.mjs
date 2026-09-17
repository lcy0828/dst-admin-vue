import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  formatBanExpiry,
  formatPlayerDate,
  formatPlayerPercentage,
  formatPlayerTemperature,
  formatPlayerVital,
  isKnownPlayerMetric,
  isLivePlayerMetric,
  isPlayerOnline,
  normalizePlayerGameplayState,
  PLAYER_BAN_DURATION_IDS,
  playerBanDurationLabel,
  playerAvatarState,
  playerCharacterDisplayLabel,
  playerCharacterLabel,
  playerErrorDetail,
  playerGameplayStateLabel,
  playerMessages,
  playerPresenceMeta,
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
  assert.deepEqual(playerStatusMeta('online', en), { label: 'Online', variant: 'success' })
  assert.deepEqual(playerStatusMeta('stale', en), { label: 'Last known online', variant: 'warning' })
  assert.deepEqual(playerStatusMeta('在线', zh), { label: '在线', variant: 'success' })
  assert.equal(playerStatusMeta('mod_spectating', en).label, 'mod_spectating')
  assert.equal(zh('players.list.taskWorld', { world: 'Caves' }), '定时任务默认世界：Caves')
  assert.equal(en('players.list.taskWorld', { world: 'Caves' }), 'Default scheduled-task world: Caves')
  assert.equal(zh('players.actions.openDiagnostics'), '房间诊断')
})

test('gameplay state is distinct from connection state and localized consistently', () => {
  const zh = translator('zh-CN')
  const en = translator('en-US')

  assert.equal(normalizePlayerGameplayState('GHOST'), 'ghost')
  assert.equal(playerGameplayStateLabel('selecting_character', zh), '选择角色')
  assert.equal(playerGameplayStateLabel('ghost', en), 'Ghost')
  assert.equal(playerGameplayStateLabel('mod_spectating', zh), '状态未知')
  assert.deepEqual(playerPresenceMeta({ status: 'online', gameplay_state: 'alive' }, zh), { label: '在线 · 游戏中', variant: 'success' })
  assert.deepEqual(playerPresenceMeta({ status: 'online', gameplay_state: 'ghost' }, zh), { label: '在线 · 幽灵状态', variant: 'destructive' })
  assert.deepEqual(playerPresenceMeta({ status: 'online', gameplay_state: 'selecting_character' }, en), { label: 'Online · Selecting character', variant: 'warning' })
  assert.deepEqual(playerPresenceMeta({ status: 'stale', gameplay_state: 'alive' }, zh), { label: '状态已过期 · 上次游戏中', variant: 'warning' })
  assert.deepEqual(playerPresenceMeta({ status: 'offline', gameplay_state: 'ghost' }, zh), { label: '离线', variant: 'outline' })
})

test('avatar transitions require current online gameplay and override retained old characters', () => {
  const selecting = { status: 'online', gameplay_state: 'selecting_character', prefab: 'wendy' }
  assert.equal(playerAvatarState(selecting), 'selecting_character')
  assert.equal(playerCharacterDisplayLabel(selecting, translator('zh-CN')), '选择角色')
  assert.equal(playerCharacterDisplayLabel({ ...selecting, gameplay_state: 'loading' }, translator('en-US')), 'Entering world')
  for (const status of ['offline', 'stale']) {
    assert.equal(playerAvatarState({ ...selecting, status }), 'static')
    assert.equal(playerCharacterDisplayLabel({ ...selecting, status }, translator('en-US')), 'Wendy')
  }
  assert.equal(playerAvatarState({ ...selecting, field_states: { gameplayState: { status: 'stale' } } }), 'static')
  assert.equal(playerAvatarState({ status: 'offline', prefab: '' }), 'static')
  assert.equal(playerAvatarState({ status: 'online', prefab: '', gameplay_state: 'unknown' }), 'static')
  assert.equal(playerAvatarState({ ...selecting, gameplay_state: 'alive' }), 'active')
  assert.equal(playerAvatarState({ ...selecting, history_only: true }), 'static')
})

test('live survival metrics reject cached values and format bounded readings', () => {
  const online = { status: 'online', field_states: { healthPercent: { status: 'live' } } }
  const staleMetric = { status: 'online', field_states: { healthPercent: { status: 'stale' } } }

  assert.equal(isLivePlayerMetric(online, 'healthPercent', 0), true)
  assert.equal(isLivePlayerMetric(staleMetric, 'healthPercent', 75), false)
  assert.equal(isLivePlayerMetric({ status: 'offline' }, 'healthPercent', 75), false)
  assert.equal(isLivePlayerMetric({ status: 'online' }, 'healthPercent', null), false)
  assert.equal(isKnownPlayerMetric(online, 'healthPercent', 0), true)
  assert.equal(isKnownPlayerMetric(staleMetric, 'healthPercent', 75), true)
  assert.equal(isKnownPlayerMetric({ status: 'offline' }, 'healthPercent', 75), true)
  assert.equal(isKnownPlayerMetric({ status: 'offline' }, 'healthPercent', null), false)
  assert.equal(isKnownPlayerMetric({ status: 'offline', field_states: { healthPercent: { status: 'unavailable' } } }, 'healthPercent', 75), false)
  assert.equal(formatPlayerPercentage(75.6), '76%')
  assert.equal(formatPlayerPercentage(105), '100%')
  assert.equal(formatPlayerVital(53.75, 150, 35.8, 'zh-CN'), '53.8 / 150')
  assert.equal(formatPlayerVital(null, 150, 35.8, 'zh-CN'), '36%')
  assert.equal(formatPlayerTemperature(23.45, 'zh-CN'), '23.5 °C')
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
    timeZone: 'Asia/Shanghai',
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
  assert.equal(playerErrorDetail({ code: 'AGENT_UPGRADE_REQUIRED', message: '升级 Agent' }, en), 'The target Agent is outdated. Upgrade the Agent and try again.')
  assert.equal(playerErrorDetail({ code: 'AGENT_UNAVAILABLE', message: 'Agent 不可用' }, en), 'The target Agent is offline or unavailable.')
  assert.equal(playerErrorDetail({ code: 'ROOM_UNAVAILABLE', message: '房间不可用' }, en), 'This room is unavailable. Check its runtime node and topology.')
  assert.equal(playerErrorDetail({ code: 'PLAYER_TARGET_UNAVAILABLE', message: '目标不可用' }, en), 'The player action target is currently unavailable.')
  assert.equal(playerErrorDetail({ code: 'RUNTIME_NOT_INSTALLED', message: '未安装 Runtime' }, en), 'The player collection Runtime is not installed for the target world.')
  assert.equal(playerErrorDetail({ code: 'RUNTIME_UNAVAILABLE', message: 'Runtime 不可用' }, en), 'The target world Runtime is currently unavailable.')
  assert.equal(playerErrorDetail({ code: 'PLAYER_SNAPSHOT_UNAVAILABLE', message: '快照不可用' }, en), 'The target world has not produced a usable player snapshot.')
  assert.equal(playerErrorDetail({ code: 'PLAYER_COMMAND_NOT_DISPATCHED', message: '命令未发送' }, en), 'The player command could not be sent to the target runtime node.')
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
  assert.match(playerList, /getPlayerPresenceMeta\(player\)/)
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

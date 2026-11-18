import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { modMessages } from '../src/i18n/modMessages.js'
import { playerMessages } from '../src/i18n/playerMessages.js'
import { serverMessages } from '../src/i18n/serverMessages.js'
import { worldsMessages } from '../src/i18n/worldsMessages.js'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('Batch C6 actionable empty/error i18n keys are symmetric and free of CJK in en-US', () => {
  const checks = [
    ['mods.installed.empty.noMatches', modMessages['zh-CN'].mods.installed.empty.noMatches, modMessages['en-US'].mods.installed.empty.noMatches],
    ['mods.installed.empty.noMatchesDescription', modMessages['zh-CN'].mods.installed.empty.noMatchesDescription, modMessages['en-US'].mods.installed.empty.noMatchesDescription],
    ['players.actions.openWorkspace', playerMessages['zh-CN'].players.actions.openWorkspace, playerMessages['en-US'].players.actions.openWorkspace],
    ['players.list.emptyFilteredTitle', playerMessages['zh-CN'].players.list.emptyFilteredTitle, playerMessages['en-US'].players.list.emptyFilteredTitle],
    ['players.list.emptyFilteredDescription', playerMessages['zh-CN'].players.list.emptyFilteredDescription, playerMessages['en-US'].players.list.emptyFilteredDescription],
    ['players.banList.emptyUnfilteredDescription', playerMessages['zh-CN'].players.banList.emptyUnfilteredDescription, playerMessages['en-US'].players.banList.emptyUnfilteredDescription],
    ['servers.workspace.empty.noWorldsDescription', serverMessages['zh-CN'].servers.workspace.empty.noWorldsDescription, serverMessages['en-US'].servers.workspace.empty.noWorldsDescription],
    ['servers.workspace.empty.configureWorlds', serverMessages['zh-CN'].servers.workspace.empty.configureWorlds, serverMessages['en-US'].servers.workspace.empty.configureWorlds],
    ['servers.workspace.empty.selectFirstWorld', serverMessages['zh-CN'].servers.workspace.empty.selectFirstWorld, serverMessages['en-US'].servers.workspace.empty.selectFirstWorld],
    ['worlds.settingsPage.selectFirstRoom', worldsMessages['zh-CN'].worlds.settingsPage.selectFirstRoom, worldsMessages['en-US'].worlds.settingsPage.selectFirstRoom]
  ]

  for (const [key, zhValue, enValue] of checks) {
    assert.ok(typeof zhValue === 'string' && zhValue.length > 0, `${key} should exist in zh-CN`)
    assert.ok(typeof enValue === 'string' && enValue.length > 0, `${key} should exist in en-US`)
    assert.doesNotMatch(enValue, /[\u3400-\u9fff]/, `${key} in en-US should not contain CJK characters`)
  }
})

test('C6 views expose AlertAction on alerts and remove inline error-description layout hacks', async () => {
  const alertActionFiles = [
    'src/views/mods/ModList.vue',
    'src/views/rooms/RoomDiagnostics.vue',
    'src/components/layout/GlobalJobStatus.vue',
    'src/components/layout/GameVersionStatus.vue',
    'src/components/layout/SystemResourceStatus.vue',
    'src/views/rooms/RoomList.vue',
    'src/views/rooms/RoomSettings.vue',
    'src/views/backups/DistributedBackupPanel.vue',
    'src/views/backups/SaveImportsPanel.vue',
    'src/views/players/PlayerList.vue',
    'src/views/servers/ServerWorkspace.vue',
    'src/views/InitialSetup.vue',
    'src/views/cron/TaskGroups.vue',
    'src/views/worlds/WorldSettings.vue',
    'src/views/rooms/SpecialLists.vue',
    'src/views/rooms/ServerToken.vue'
  ]

  for (const file of alertActionFiles) {
    const content = await source(file)
    assert.match(content, /<AlertAction\b/, `${file} should use <AlertAction>`)
  }

  for (const file of [
    'src/views/rooms/RoomList.vue',
    'src/views/rooms/RoomSettings.vue',
    'src/views/rooms/SpecialLists.vue',
    'src/views/rooms/ServerToken.vue'
  ]) {
    const content = await source(file)
    assert.doesNotMatch(content, /error-description/, `${file} should not rely on inline .error-description CSS`)
  }
})

test('C6 empty states provide EmptyContent next actions', async () => {
  const emptyContentFiles = [
    'src/views/mods/ModList.vue',
    'src/views/backups/DistributedBackupPanel.vue',
    'src/views/backups/SaveImportsPanel.vue',
    'src/components/AutomationWorkspace.vue',
    'src/views/players/PlayerList.vue',
    'src/views/players/BanList.vue',
    'src/views/servers/ServerWorkspace.vue',
    'src/views/worlds/WorldSettings.vue',
    'src/views/rooms/SpecialLists.vue',
    'src/views/rooms/ServerToken.vue'
  ]

  for (const file of emptyContentFiles) {
    const content = await source(file)
    assert.match(content, /<EmptyContent\b/, `${file} should provide next actions in <EmptyContent>`)
  }
})

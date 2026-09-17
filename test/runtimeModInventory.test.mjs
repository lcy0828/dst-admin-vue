import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  buildRuntimeInstallationOptions,
  filterRuntimeMods,
  groupRuntimeModRoomReferences,
  parseRuntimeInstallationKey,
  runtimeInstallationKey,
  selectRuntimeInstallation
} from '../src/lib/runtimeModInventory.mjs'

test('runtime Mod inventory builds stable machine and installation choices', () => {
  const response = {
    defaultTargetId: 'local',
    items: [
      { id: 'agent:node', name: 'Debian 12', online: true, installations: [{ id: 'native', displayName: '裸机游戏服务端' }] },
      { id: 'local', name: '本机', online: true, defaultInstallationId: 'default', installations: [{ id: 'default' }] },
      { id: 'agent:offline', name: '离线节点', online: false, installations: [{ id: 'one' }, { id: 'two' }] }
    ]
  }
  const options = buildRuntimeInstallationOptions(response)

  assert.equal(options.length, 4)
  assert.equal(options[0].targetId, 'local')
  assert.equal(options.find(option => option.installationId === 'native').label, 'Debian 12')
  assert.equal(options.find(option => option.installationId === 'one').label, '离线节点 · one')
  assert.deepEqual(parseRuntimeInstallationKey(runtimeInstallationKey('agent:node', 'native')), {
    targetId: 'agent:node', installationId: 'native'
  })
  assert.equal(parseRuntimeInstallationKey('invalid'), null)
  assert.equal(selectRuntimeInstallation(options, 'agent:node', 'native').installationId, 'native')
  assert.equal(selectRuntimeInstallation(options, 'missing', 'missing').targetId, 'local')

  const scopedOptions = buildRuntimeInstallationOptions(response, 'agent:offline')
  assert.equal(scopedOptions.length, 2)
  assert.ok(scopedOptions.every(option => option.targetId === 'agent:offline'))
  assert.deepEqual(buildRuntimeInstallationOptions(response, 'missing'), [])
})

test('runtime Mod inventory filters by metadata and operational attention', () => {
  const items = [
    { id: '100', name: 'Current Mod', author: 'A', versionStatus: 'current', fileStatus: 'ready' },
    { id: '200', name: 'Old Mod', author: 'B', versionStatus: 'outdated', fileStatus: 'ready' },
    { id: '300', name: 'Unknown Mod', author: 'Example Author', versionStatus: 'unknown', fileStatus: 'ready' },
    { id: '400', name: 'Broken Mod', author: 'D', versionStatus: 'invalid', fileStatus: 'invalid' }
  ]


  assert.deepEqual(filterRuntimeMods(items).map(item => item.id), ['100', '200', '300'])
  assert.deepEqual(filterRuntimeMods(items, '', 'outdated').map(item => item.id), ['200'])
  assert.deepEqual(filterRuntimeMods(items, '', 'attention').map(item => item.id), ['400'])
  assert.deepEqual(filterRuntimeMods(items, 'example author', 'all').map(item => item.id), ['300'])
  assert.deepEqual(filterRuntimeMods(items, '400', 'all').map(item => item.id), ['400'])
})

test('runtime Mod room references are grouped by room with unique worlds', () => {
  assert.deepEqual(groupRuntimeModRoomReferences([
    { roomId: '666777', roomName: '666777', worldId: 'master', worldName: 'Master' },
    { roomId: '666777', roomName: '666777', worldId: 'caves', worldName: 'Caves' },
    { roomId: '666777', roomName: '666777', worldId: 'master', worldName: 'Master' },
    { roomId: 'second', roomName: '测试房间', worldId: 'master', worldName: 'Master' }
  ]), [
    {
      key: '666777', id: '666777', name: '666777',
      worlds: [
        { key: 'master', id: 'master', name: 'Master' },
        { key: 'caves', id: 'caves', name: 'Caves' }
      ]
    },
    {
      key: 'second', id: 'second', name: '测试房间',
      worlds: [{ key: 'master', id: 'master', name: 'Master' }]
    }
  ])
})

test('machine content view uses a control-plane live inventory contract', async () => {
  const [client, adapter, component, management] = await Promise.all([
    readFile(new URL('../src/api/v2.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/modApi.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/mods/RuntimeModInventory.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/mods/ModManagement.vue', import.meta.url), 'utf8')
  ])

  assert.match(client, /`\/runtime-targets\/\$\{encode\(targetId\)\}\/installations\/\$\{encode\(installationId\)\}\/mods`/)
  assert.match(client, /runtimeInventory:[\s\S]*?runtimeTarget:\s*false/)
  assert.match(adapter, /async function getRuntimeModInventory\(targetId, installationId, params = \{\}\)/)
  assert.match(component, /selectedOption && !selectedOption\.online/)
  assert.match(component, /installationOptions\.value\.length <= 4/)
  assert.match(component, /buildRuntimeInstallationOptions\(targets\.value, fixedTargetId\.value\)/)
  assert.match(component, /<div v-if="fixedTargetId" class="fixed-machine-scope">/)
  assert.match(component, /<UiSelect v-if="installationOptions\.length > 1"/)
  assert.match(component, /MANAGEMENT_SCOPE_CHANGED_EVENT/)
  assert.match(component, /inventoryWarnings/)
  assert.doesNotMatch(component, /inventoryCache/)
  assert.match(component, /loading && !inventoryLoaded/)
  assert.match(component, /inventory\.value = emptyRuntimeInventory\(\)[\s\S]*?inventoryLoaded\.value = false/)
  assert.match(client, /mods\/\$\{encode\(modId\)\}\/actions\/update/)
  assert.match(client, /mods\/actions\/update-outdated/)
  assert.match(component, /modApi\.updateRuntimeMod/)
  assert.match(component, /modApi\.updateOutdatedRuntimeMods/)
  assert.match(component, /emitGlobalJobSubmitted\(\{ \.\.\.job, displayName:/)
  assert.match(component, /await \(jobStatus\?\.waitForJob \|\| waitForV2Job\)\(job,[\s\S]*?value => \{[\s\S]*?updateJob\.value = value/)
  assert.match(component, /v-if="updateBusy && updateJob\?\.id"/)
  assert.match(component, /jobStatus\?\.showJobProgress\(updateJob\.id\)/)
  assert.match(component, /globalJobs\.viewProgress/)
  assert.doesNotMatch(component, /class="inventory-update-tray"|const updateProgressStage/)
  assert.match(component, /groupRuntimeModRoomReferences\(mod\.roomReferences\)/)
  assert.match(component, /<Popover v-if="roomGroups\(mod\)\.length > 1">/)
  assert.match(component, /<section v-if="!loadError" class="inventory-content">/)
  assert.match(component, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(component, /contentReasonLabel\(mod\)/)
  assert.match(component, /error\?\.details\?\.reason/)
  assert.doesNotMatch(component, /setInterval|poll/)
  assert.match(management, /<RuntimeModInventory \/>/)
  assert.doesNotMatch(management, /<ModLibrary|Controller|catalogSource/)
})

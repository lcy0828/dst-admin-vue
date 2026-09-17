import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { parse as parseSFC } from '@vue/compiler-sfc'

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

test('controller content library remains internal while machine content is the user-facing catalog', async () => {
  const [client, adapter, library, management, messages] = await Promise.all([
    source('../src/api/v2.js'),
    source('../src/api/modApi.js'),
    source('../src/views/mods/ModLibrary.vue'),
    source('../src/views/mods/ModManagement.vue'),
    source('../src/i18n/modMessages.js')
  ])

  assert.match(client, /client\.get\('\/mods\/library'/)
  assert.match(client, /client\.post\('\/mods\/library\/actions\/download'/)
  assert.match(client, /`\/mods\/library\/\$\{encode\(modId\)\}\/actions\/update`/)
  assert.match(client, /`\/rooms\/\$\{encode\(roomId\)\}\/mods\/\$\{encode\(modId\)\}\/actions\/add`/)
  assert.match(adapter, /async function getLibrary\(\)/)
  assert.match(adapter, /async function addModToRoom\(input\)/)
  assert.match(adapter, /async function publishPreparedModMutation\(input\)/)
  assert.match(adapter, /action: 'remove'/)
  const libraryBlock = client.slice(client.indexOf('export const modsV2API'), client.indexOf('export const modPublicationsV2API'))
  const entries = [
    'search', 'library', 'download', 'updateLibrary', 'details', 'list', 'install', 'addToRoom',
    'checkUpdates', 'update', 'enable', 'repair', 'uninstall', 'configurationFile', 'configuration',
    'previewConfiguration', 'applyConfiguration', 'profile'
  ]
  for (const [index, name] of entries.entries()) {
    const start = libraryBlock.indexOf(`  ${name}:`)
    const end = index + 1 < entries.length ? libraryBlock.indexOf(`\n  ${entries[index + 1]}:`, start) : libraryBlock.length
    assert.ok(start >= 0 && end > start, `missing Mod API entry: ${name}`)
    assert.match(libraryBlock.slice(start, end), /runtimeTarget:\s*false/, `${name} must use the control-plane target`)
  }
  assert.doesNotMatch(library, /RuntimeTargetSelectV2|handleRuntimeTargetChange|getActiveRuntimeTarget/)
  assert.match(management, /<RuntimeModInventory \/>/)
  assert.doesNotMatch(management, /<ModLibrary|Controller|catalogSource|catalogStatus/)
  assert.match(messages, /选择机器，查看和更新 DST 实际使用的模组文件/)
  assert.match(messages, /Select a machine to inspect and update the Mod files DST actually uses/)
})

test('Workshop search distinguishes direct machine download from download and add to room', async () => {
  const [search, addDialog, downloadDialog, adapter, client] = await Promise.all([
    source('../src/views/mods/ModSearch.vue'),
    source('../src/views/mods/AddModToRoomDialog.vue'),
    source('../src/views/mods/DownloadModDialog.vue'),
    source('../src/api/modApi.js'),
    source('../src/api/v2.js')
  ])

  assert.match(search, /openAddDialog\(mod\)/)
  assert.match(search, /openDownloadDialog\(mod\)/)
  assert.match(search, /mods\.actions\.downloadAndAddToRoom/)
  assert.match(search, /downloadedInstallations\(mod\)/)
  assert.match(search, /modApi\.getRuntimeModInventory/)
  assert.doesNotMatch(search, /selectedRoomId/)
  assert.doesNotMatch(search, /modApi\.getServerList/)
  assert.doesNotMatch(addDialog, /ensureControllerContent|modApi\.getLibrary\(\)|modApi\.downloadMod\(/)
  assert.match(addDialog, /emitGlobalJobSubmitted/)
  assert.match(addDialog, /waitForJob: jobStatus\?\.waitForJob/)
  assert.doesNotMatch(addDialog, /scaleProgress|<Progress/)
  assert.match(addDialog, /await modApi\.addModToRoom\(/)
  assert.match(downloadDialog, /await modApi\.downloadMod\(/)
  assert.match(downloadDialog, /targetId: option\.targetId/)
  assert.match(downloadDialog, /installationId: option\.installationId/)
  assert.match(client, /actions\/download/)
  const downloadBlock = adapter.slice(adapter.indexOf('async function downloadMod'), adapter.indexOf('async function addModToRoom'))
  assert.match(downloadBlock, /modsV2API\.downloadRuntimeMod/)
  assert.doesNotMatch(downloadBlock, /updateLibrary|modsV2API\.download\(/)
  const addBlock = adapter.slice(adapter.indexOf('async function addModToRoom'), adapter.indexOf('async function getModConfig'))
  assert.match(addBlock, /modsV2API\.install\(roomId/)
  assert.match(addBlock, /input\.waitForJob \|\| waitForV2Job/)
  assert.doesNotMatch(addBlock, /getLibrary\(|downloadMod\(|publishPreparedModMutation/)
  assert.match(adapter, /keyword = ''/)
  assert.match(adapter, /sort,/)
  assert.match(adapter, /days,/)
  assert.match(adapter, /tags: Array\.isArray\(tags\)/)
  assert.doesNotMatch(adapter, /requireValue\(keyword/)
  assert.match(adapter, /modsV2API\.details\(modId\)/)
  assert.match(search, /modApi\.getModDetails\(mod\)/)
})

test('the internal controller library still separates metadata refresh from content updates', async () => {
  const library = await source('../src/views/mods/ModLibrary.vue')

  assert.match(library, /mod\.downloaded && !mod\.updateAvailable/)
  assert.match(library, /refreshLibraryMod\(mod\)/)
})

test('every mod details entry refreshes Workshop metadata before presentation', async () => {
  const pages = await Promise.all([
    source('../src/views/mods/ModSearch.vue'),
    source('../src/views/mods/ModLibrary.vue'),
    source('../src/views/mods/ModList.vue')
  ])

  for (const page of pages) {
    assert.match(page, /modApi\.getModDetails\(mod\)/)
    assert.match(page, /:loading="detailsLoading"/)
  }
})

test('room Mod rows preserve complete square Workshop artwork in a stable compact summary', async () => {
  const list = await source('../src/views/mods/ModList.vue')

  assert.match(list, /\.mod-summary\s*\{[\s\S]*?min-height:\s*72px[\s\S]*?grid-template-columns:/)
  assert.match(list, /\.mod-image\s*\{[\s\S]*?width:\s*48px[\s\S]*?aspect-ratio:\s*1/)
  assert.match(list, /\.mod-image img\s*\{[\s\S]*?object-fit:\s*contain/)
  assert.match(list, /:aria-expanded="isModExpanded\(mod\)"/)
  assert.match(list, /:disabled="!filterChanged"/)
  assert.equal((list.match(/class="mod-summary-icon"/g) || []).length, 2)
  assert.match(list, /\.mod-summary-icon,[\s\S]*?\.mod-expand-button\s*\{[\s\S]*?width:\s*36px[\s\S]*?height:\s*36px/)
  assert.match(list, /\.mod-expand-button\s*\{[\s\S]*?width:\s*36px[\s\S]*?height:\s*36px/)
  assert.match(list, /class="mod-summary-progress"/)
  assert.match(list, /modActionProgress\(mod\)/)
  assert.match(list, /onProgress: job => this\.setModJobProgress/)
  assert.match(list, /globalJobTransfer\(this\.modActionState\[mod\?\.modid\]\)/)
  assert.match(list, /transfer: job\?\.transfer \|\| null/)
  assert.match(list, /\.mod-summary-progress\s*\{[\s\S]*?position:\s*absolute[\s\S]*?height:\s*3px/)
})

test('room Mod updates run on the installations that reported an outdated copy', async () => {
  const [adapter, list] = await Promise.all([
    source('../src/api/modApi.js'),
    source('../src/views/mods/ModList.vue')
  ])

  const updateBlock = adapter.slice(adapter.indexOf('async function updateMod'), adapter.indexOf('async function deleteMod'))
  assert.match(updateBlock, /runtimeVersions/)
  assert.match(updateBlock, /runtime\?\.status === 'outdated'/)
  assert.match(updateBlock, /modsV2API\.updateRuntimeMod\(target\.targetId, target\.installationId, modId\)/)
  assert.match(updateBlock, /input\.waitForJob \|\| waitForV2Job/)
  assert.doesNotMatch(updateBlock, /updateLibrary|publishPreparedModMutation/)
  assert.match(list, /runtimeVersions: mod\.runtimeVersions/)
})

test('room Mod catalog includes runtime-machine content and defaults to enabled-first sorting', async () => {
  const [list, adapter, helper] = await Promise.all([
    source('../src/views/mods/ModList.vue'),
    source('../src/api/modApi.js'),
    source('../src/lib/roomModCatalog.mjs')
  ])

  assert.match(adapter, /async function getRoomModCatalog/)
  assert.match(adapter, /getRuntimeModInventory\(endpoint\.targetId, endpoint\.installationId, \{ view: 'facts' \}\)/)
  assert.match(list, /modApi\.getRoomModCatalog/)
  assert.match(list, /sortBy: 'enabled'/)
  assert.match(list, /sortRoomModCatalog\(result, this\.filterForm\.sortBy/)
  assert.match(list, /mod\.machineOnly/)
  assert.doesNotMatch(list, /ensureMachineModInLibrary/)
  assert.match(list, /await modApi\.addModToRoom\([\s\S]*?onProgress: job => this\.setModJobProgress/)
  assert.match(helper, /if \(item\.machineOnly\) return 2/)
})

test('room Mod status shows operational facts without publication diagnostics', async () => {
  const [client, adapter, list, messages] = await Promise.all([
    source('../src/api/v2.js'),
    source('../src/api/modApi.js'),
    source('../src/views/mods/ModList.vue'),
    source('../src/i18n/modMessages.js')
  ])

  assert.match(client, /`\/rooms\/\$\{encode\(roomId\)\}\/mod-replicas`/)
  assert.match(adapter, /async function getRoomModReplicas\(roomId\)/)
  assert.match(adapter, /modPublicationsV2API\.replicas\(requireValue\(roomId, 'ROOM_REQUIRED'\)\)/)
  assert.match(adapter, /runtimeReplicaAvailable:/)
  assert.match(adapter, /runtimeObserved: Boolean\(mod\.runtimeObserved\)/)
  assert.match(adapter, /runtimeFileStatus: mod\.runtimeFileStatus/)
  assert.match(list, /modOperationalStatusLabel\(mod\)/)
  assert.match(list, /roomModOperationalStatus/)
  assert.doesNotMatch(list, /replicaCoverageLabel\(mod\)/)
  assert.doesNotMatch(list, /mods\.installed\.replicas\.technicalDetails|loadRuntimeDetails|runtimeReplica|replicaFetch/)
  assert.match(messages, /机器文件已就绪/)
  assert.match(messages, /已启用/)
  assert.match(messages, /\{count\} 台机器缺少文件/)
  assert.doesNotMatch(messages, /待同步到 \{count\} 台机器/)
  assert.match(messages, /Machine files are ready/)
  assert.match(messages, /Cannot read \{count\} machines/)
})

test('adding a downloaded mod explicitly selects room worlds', async () => {
  const [dialog, adapter] = await Promise.all([
    source('../src/views/mods/AddModToRoomDialog.vue'),
    source('../src/api/modApi.js')
  ])

  assert.match(dialog, /modApi\.getRooms\(\)/)
  assert.match(dialog, /modApi\.getRoomWorlds\(roomId\)/)
  assert.match(dialog, /modApi\.addModToRoom/)
  assert.doesNotMatch(dialog, /modApi\.previewModPublication/)
  assert.doesNotMatch(dialog, /modApi\.createModPublication/)
  assert.match(dialog, /const worldIds = \[\.\.\.selectedWorldIds\.value\]/)
  assert.match(dialog, /targetIds: worlds\.value/)
  assert.match(adapter, /async function addModToRoom\(input\)[\s\S]*?modsV2API\.install\(roomId/)
  const addBlock = adapter.slice(adapter.indexOf('async function addModToRoom'), adapter.indexOf('async function getModConfig'))
  assert.doesNotMatch(addBlock, /modsV2API\.addToRoom|publishPreparedModMutation|getLibrary\(|downloadMod\(/)
})

test('room mods default to shared configuration and expose per-world configuration behind a switch', async () => {
  const [list, dialog, adapter] = await Promise.all([
    source('../src/views/mods/ModList.vue'),
    source('../src/views/mods/ModConfigDialog.vue'),
    source('../src/api/modApi.js')
  ])

  assert.doesNotMatch(list, /mods\.installed\.profile|profileWorldStates|inheritedWorlds|exceptionWorlds/)
  assert.match(list, /v-for="\(world, worldIndex\) in selectedRoomWorlds"/)
  assert.match(list, /worldStateLabel\(mod, world\)/)
  assert.match(list, /isConfiguredInWorld\(mod, world\)/)
  assert.match(list, /isEnabledInWorld\(mod, world\)/)
  assert.match(list, /toggleModStatus\(mod, world, value\)/)
  assert.match(list, /toggleRoomModStatus\(mod, true\)/)
  assert.match(list, /toggleRoomModStatus\(mod, false\)/)
  assert.match(list, /addModToWorld\(mod, world\)/)
  assert.match(list, /usesSeparateWorldConfig\(mod\)/)
  assert.match(list, /setSeparateWorldConfig\(mod, value\)/)
  assert.match(list, /v-if="!usesSeparateWorldConfig\(mod\)"[\s\S]*?openRoomConfigDialog\(mod\)/)
  assert.match(list, /<Tooltip v-if="usesSeparateWorldConfig\(mod\)"/)
  assert.match(list, /const worlds = this\.selectedRoomWorlds\.filter\(world => this\.isConfiguredInWorld\(mod, world\)\)/)
  assert.match(list, /this\.configScope = 'room'/)
  assert.doesNotMatch(list, /uninstallMod\(mod|confirmUninstall|removeFromWorld|removeFromRoom/)
  assert.match(list, /const worldId = world\.id/)
  assert.match(list, /worldIds: \[worldId\]/)
  assert.match(list, /expectedRevision: expectedRevisions\[worldId\]/)
  assert.match(list, /:world-name="currentWorld\?\.name \|\| ''"/)
  assert.match(list, /:configuration-scope="configScope"/)
  assert.match(list, /:expected-revisions="configExpectedRevisions"/)
  assert.match(dialog, /<UiDialog/)
  assert.doesNotMatch(dialog, /<Sheet/)
  assert.match(dialog, /Object\.keys\(this\.customOverrides\)/)
  assert.match(dialog, /\.map\(key => \[key, null\]\)/)
  assert.match(dialog, /modApi\.saveModConfigurationForWorld/)
  assert.match(dialog, /configurationScope === 'room'/)
  assert.match(dialog, /this\.configurationScope === 'room'[\s\S]*?this\.allOptions\.map/)
  assert.match(dialog, /preserveEnabled: this\.configurationScope === 'room'/)
  assert.match(dialog, /expectedRevisions:/)
  assert.match(dialog, /this\.saveJob = \{ status: 'running' \}/)
  assert.doesNotMatch(dialog, /savingDescription'[\s\S]{0,160}progress:/)
  assert.match(dialog, /onProgress: job =>/)
  assert.match(dialog, /this\.configWorldRevisions = \{ \.\.\.this\.configWorldRevisions, \.\.\.revisions \}/)
  assert.doesNotMatch(dialog, /this\.dialogVisible = false;[\s\S]{0,160}publicationSubmitted/)
  assert.match(adapter, /async function saveModConfigurationForWorld\(input\)/)
  const saveBlock = adapter.slice(adapter.indexOf('async function saveModConfigurationForWorld'), adapter.indexOf('async function toggleMod'))
  assert.match(saveBlock, /modsV2API\.applyConfiguration/)
  assert.match(saveBlock, /expectedRevisions,/)
  assert.match(saveBlock, /preserveEnabled: Boolean\(input\.preserveEnabled\)/)
  assert.doesNotMatch(saveBlock, /publishPreparedModMutation/)
  assert.doesNotMatch(saveBlock, /targetId === 'local'/)
  const toggleBlock = adapter.slice(adapter.indexOf('async function toggleMod'), adapter.indexOf('async function updateMod'))
  assert.match(toggleBlock, /modsV2API\.enable/)
  assert.match(toggleBlock, /expectedRevisions/)
  assert.doesNotMatch(toggleBlock, /publishPreparedModMutation/)
  const deleteBlock = adapter.slice(adapter.indexOf('async function deleteMod'), adapter.indexOf('const removeModFromRoom'))
  assert.match(deleteBlock, /publishPreparedModMutation/)
  assert.doesNotMatch(deleteBlock, /modsV2API\.uninstall/)
  assert.match(adapter, /overridden_configuration_options: configuration\.overrides \|\| \{\}/)
})

test('room mod profile stays an internal projection detail', async () => {
  const [client, adapter, list] = await Promise.all([
    source('../src/api/v2.js'),
    source('../src/api/modApi.js'),
    source('../src/views/mods/ModList.vue')
  ])

  assert.match(client, /`\/rooms\/\$\{encode\(roomId\)\}\/mod-profile`/)
  assert.match(adapter, /modsV2API\.profile\(roomId\)/)
  assert.match(adapter, /roomProfileAvailable:/)
  assert.match(adapter, /defaultWorldId: profileContext\.defaultWorldId/)
  assert.match(adapter, /worldRevisions/)
  assert.doesNotMatch(parseSFC(list).descriptor.template.content, /roomProfile|房间默认|世界例外/)
})

test('mod navigation exposes one management page and preserves legacy URLs', async () => {
  const [router, navigation, management] = await Promise.all([
    source('../src/router/index.js'),
    source('../src/v2/navigation.js'),
    source('../src/views/mods/ModManagement.vue')
  ])

  assert.match(router, /path: ''[\s\S]*?views\/mods\/ModManagement\.vue/)
  assert.match(router, /path: 'library'[\s\S]*?scope: 'downloaded'/)
  assert.match(router, /path: 'list'[\s\S]*?tab: 'room'/)
  assert.match(router, /path: 'search'[\s\S]*?query: \{ \.\.\.to\.query \}/)
  assert.match(navigation, /labelKey: 'navigation\.mods'[\s\S]*?to: '\/mods'/)
  assert.doesNotMatch(navigation, /navigation\.nodeModLibrary|navigation\.roomMods|navigation\.modSearch/)
  assert.match(management, /<TabsTrigger value="workshop">/)
  assert.match(management, /<TabsTrigger value="catalog">/)
  assert.match(management, /<TabsTrigger value="room">/)
  assert.match(management, /<RuntimeModInventory \/>/)
  assert.doesNotMatch(management, /<ModLibrary|value="controller"|value="downloaded"|value="updates"/)
})

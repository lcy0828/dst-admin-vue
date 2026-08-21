import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

test('controller content library API is independent from room publication APIs', async () => {
  const [client, adapter, library, messages] = await Promise.all([
    source('../src/api/v2.js'),
    source('../src/api/modApi.js'),
    source('../src/views/mods/ModLibrary.vue'),
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
  assert.match(adapter, /action: 'reconcile'/)
  const libraryBlock = client.slice(client.indexOf('export const modsV2API'), client.indexOf('export const modPublicationsV2API'))
  assert.equal(libraryBlock.match(/runtimeTarget:\s*false/g)?.length, 9)
  assert.doesNotMatch(library, /RuntimeTargetSelectV2|handleRuntimeTargetChange|getActiveRuntimeTarget/)
  assert.match(messages, /Workshop 内容由控制器统一下载和管理/)
  assert.match(messages, /The controller downloads and manages Workshop content centrally/)
})

test('Workshop search downloads to the controller content library without requiring a room', async () => {
  const [search, adapter] = await Promise.all([
    source('../src/views/mods/ModSearch.vue'),
    source('../src/api/modApi.js')
  ])

  assert.match(search, /modApi\.getLibrary\(\)/)
  assert.match(search, /downloaded: wasDownloaded/)
  assert.doesNotMatch(search, /selectedRoomId/)
  assert.doesNotMatch(search, /modApi\.getServerList/)
  assert.match(adapter, /keyword = ''/)
  assert.match(adapter, /sort,/)
  assert.match(adapter, /days,/)
  assert.match(adapter, /tags: Array\.isArray\(tags\)/)
  assert.doesNotMatch(adapter, /requireValue\(keyword/)
  assert.match(adapter, /modsV2API\.details\(modId\)/)
  assert.match(search, /modApi\.getModDetails\(mod\)/)
})

test('downloaded mods separate status refresh from file updates', async () => {
  const [search, library, details] = await Promise.all([
    source('../src/views/mods/ModSearch.vue'),
    source('../src/views/mods/ModLibrary.vue'),
    source('../src/views/mods/ModDetailsDialog.vue')
  ])

  assert.match(search, /updateAvailable: Boolean\(localMod\?\.updateAvailable\)/)
  assert.match(search, /mod\.isDownloaded && !mod\.updateAvailable/)
  assert.match(library, /mod\.downloaded && !mod\.updateAvailable/)
  assert.match(search, /refreshModStatus\(mod\)/)
  assert.match(library, /refreshLibraryMod\(mod\)/)
  assert.match(details, /v-if="downloaded && !updateAvailable"/)
  assert.match(details, /\$emit\('refresh', mod\)/)
  assert.match(details, /v-else-if="updateAvailable"/)
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

test('adding a downloaded mod explicitly selects room worlds', async () => {
  const [dialog, adapter] = await Promise.all([
    source('../src/views/mods/AddModToRoomDialog.vue'),
    source('../src/api/modApi.js')
  ])

  assert.match(dialog, /modApi\.getManagedRooms\(\)/)
  assert.match(dialog, /modApi\.getRoomWorlds\(roomId\)/)
  assert.match(dialog, /modApi\.addModToRoom/)
  assert.doesNotMatch(dialog, /modApi\.previewModPublication/)
  assert.doesNotMatch(dialog, /modApi\.createModPublication/)
  assert.match(dialog, /worldIds: selectedWorldIds\.value/)
  assert.match(adapter, /async function addModToRoom\(input\)[\s\S]*?publishPreparedModMutation/)
})

test('room mod controls and configuration target one explicit world', async () => {
  const [list, dialog, adapter] = await Promise.all([
    source('../src/views/mods/ModList.vue'),
    source('../src/views/mods/ModConfigDialog.vue'),
    source('../src/api/modApi.js')
  ])

  assert.match(list, /<ToggleGroup[^>]+type="single"/)
  assert.match(list, /worldIds: \[this\.selectedWorldId\]/)
  assert.match(list, /this\.isConfiguredInSelectedWorld\(mod\) && this\.isEnabledInSelectedWorld\(mod\)/)
  assert.match(list, /:world-name="currentWorld\?\.name \|\| ''"/)
  assert.match(dialog, /<UiDialog/)
  assert.doesNotMatch(dialog, /<Sheet/)
  assert.match(dialog, /Object\.keys\(this\.customOverrides\)/)
  assert.match(dialog, /\.map\(key => \[key, null\]\)/)
  assert.match(adapter, /overridden_configuration_options: configuration\.overrides \|\| \{\}/)
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
  assert.match(management, /<TabsTrigger value="library">/)
  assert.match(management, /<TabsTrigger value="room">/)
  assert.match(management, /value="downloaded"/)
  assert.match(management, /value="updates"/)
})

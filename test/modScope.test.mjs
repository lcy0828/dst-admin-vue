import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

test('node library API is independent from room configuration APIs', async () => {
  const [client, adapter] = await Promise.all([
    source('../src/api/v2.js'),
    source('../src/api/modApi.js')
  ])

  assert.match(client, /client\.get\('\/mods\/library'/)
  assert.match(client, /client\.post\('\/mods\/library\/actions\/download'/)
  assert.match(client, /`\/mods\/library\/\$\{encode\(modId\)\}\/actions\/update`/)
  assert.match(client, /`\/rooms\/\$\{encode\(roomId\)\}\/mods\/\$\{encode\(modId\)\}\/actions\/add`/)
  assert.match(adapter, /async function getLibrary\(\)/)
  assert.match(adapter, /async function addModToRoom\(input\)/)
  assert.match(adapter, /removeFiles: false/)
})

test('Workshop search downloads to the node without requiring a room', async () => {
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
  const dialog = await source('../src/views/mods/AddModToRoomDialog.vue')

  assert.match(dialog, /modApi\.getManagedRooms\(\)/)
  assert.match(dialog, /modApi\.getRoomWorlds\(roomId\)/)
  assert.match(dialog, /modApi\.addModToRoom/)
  assert.match(dialog, /worldIds: selectedWorldIds\.value/)
})

test('mod navigation exposes separate node library and room views', async () => {
  const [router, navigation] = await Promise.all([
    source('../src/router/index.js'),
    source('../src/v2/navigation.js')
  ])

  assert.match(router, /redirect: '\/mods\/library'/)
  assert.match(router, /path: 'library'/)
  assert.match(navigation, /navigation\.nodeModLibrary/)
  assert.match(navigation, /navigation\.roomMods/)
})

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
  const search = await source('../src/views/mods/ModSearch.vue')

  assert.match(search, /modApi\.getLibrary\(\)/)
  assert.match(search, /downloaded: wasDownloaded/)
  assert.doesNotMatch(search, /selectedRoomId/)
  assert.doesNotMatch(search, /modApi\.getServerList/)
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

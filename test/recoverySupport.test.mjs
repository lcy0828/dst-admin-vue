import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('room API exposes list, restore, and confirmed purge for room and world recoveries', async () => {
  const api = await source('src/api/v2.js')

  assert.match(api, /recoveries:\s*\(\) => client\.get\('\/rooms\/recovery'/)
  assert.match(api, /restoreRoom:\s*recoveryName => client\.post/)
  assert.match(api, /purgeRoomRecovery:[\s\S]*?data:\s*\{ confirmation \}/)
  assert.match(api, /worldRecoveries:\s*roomId => client\.get/)
  assert.match(api, /restoreWorld:\s*\(roomId, recoveryName\) => client\.post/)
  assert.match(api, /purgeWorldRecovery:[\s\S]*?data:\s*\{ confirmation \}/)
})

test('room and world deletion preserve recoveryName and expose recycle bin dialogs', async () => {
  const [rooms, worlds, dialog, adapter] = await Promise.all([
    source('src/views/rooms/RoomList.vue'),
    source('src/views/worlds/WorldList.vue'),
    source('src/components/recovery/RecoveryDialog.vue'),
    source('src/api/v2LegacyAdapters.js')
  ])

  assert.match(rooms, /const response = await roomApi\.deleteRoom/)
  assert.match(rooms, /response\?\.data\?\.recoveryName/)
  assert.match(rooms, /<Trash2 data-icon="inline-start" \/>/)
  assert.match(rooms, /:disabled="roomHasActiveWorlds\(room\) \|\| isRoomBusy\(room\)"/)
  assert.doesNotMatch(rooms, /allTargetIds[^\n]*includes\(['"]local['"]\)[^\n]*deleteRoom/)
  assert.match(rooms, /<RecoveryDialog[^>]*scope="room"/)
  assert.match(worlds, /const response = await roomApi\.deleteWorld/)
  assert.match(worlds, /response\?\.data\?\.recoveryName/)
  assert.match(worlds, /<RecoveryDialog[^>]*scope="world"/)
  assert.match(dialog, /const confirmation = selectedItem\.value\.recoveryName/)
  assert.doesNotMatch(dialog, /recovery-confirmation|v-model="confirmation"/)
  assert.match(dialog, /emit\('restored'\)/)
  assert.match(adapter, /return success\(result, 'room_moved_to_recovery'\)/)
  assert.match(adapter, /return success\(result, 'world_moved_to_recovery'\)/)
})

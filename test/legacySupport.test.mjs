import test from 'node:test'
import assert from 'node:assert/strict'

import {
  BACKEND_CAPABILITIES,
  buildBackupCatalog,
  legacyPayload,
  roomNamesFromResponse
} from '../src/lib/legacySupport.mjs'

test('legacyPayload accepts legacy envelopes and direct v2 payloads', () => {
  const rooms = [{ name: 'survival' }]
  assert.equal(legacyPayload({ status: 200, data: rooms }, null), rooms)
  assert.equal(legacyPayload(rooms, null), rooms)
  assert.deepEqual(legacyPayload({ data: null }, []), [])
})

test('roomNamesFromResponse normalizes names without duplicates', () => {
  assert.deepEqual(roomNamesFromResponse({
    status: 200,
    data: [
      { name: 'survival' },
      { savename: 'caves', name: 'alternate' },
      { name: 'survival' },
      null
    ]
  }), ['survival', 'caves'])
})

test('backup catalog rebuild drops archives absent from the latest response', () => {
  const first = buildBackupCatalog({ data: {
    old_room: [{ name: 'old.zip' }],
    active_room: [{ name: 'active-1.zip' }]
  } })
  const next = buildBackupCatalog({ data: {
    active_room: [{ name: 'active-2.zip' }]
  } })

  assert.deepEqual(first.archives, ['old_room', 'active_room'])
  assert.deepEqual(next.archives, ['active_room'])
  assert.deepEqual(next.backups, [{ name: 'active-2.zip', archive_name: 'active_room' }])
})

test('backup capability prevents exposing unsupported new-room restore', () => {
  assert.equal(BACKEND_CAPABILITIES.backups.restoreToOriginalRoom, true)
  assert.equal(BACKEND_CAPABILITIES.backups.restoreToNewRoom, false)
})

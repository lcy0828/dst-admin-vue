import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  projectRoomList,
  roomRuntimeSummary,
  worldMachineName,
  worldPlacementNotice
} from '../src/lib/roomListPresentation.mjs'

const overview = {
  targets: [
    { id: 'local', name: 'Local machine' },
    { id: 'agent:debian', name: 'debian12' }
  ],
  rooms: [{
    id: 'room-id',
    directoryName: 'room1',
    name: 'Shared room',
    worlds: [
      {
        id: 'master', name: 'Master', status: 'running', controlAvailable: true,
        placement: { appliedTargetId: 'local', appliedInstallationId: 'default', desiredTargetId: 'local', desiredInstallationId: 'default', state: 'aligned' }
      },
      {
        id: 'caves', name: 'Caves', status: 'stopped', controlAvailable: true,
        placement: { appliedTargetId: 'agent:debian', appliedInstallationId: 'native', desiredTargetId: 'agent:debian', desiredInstallationId: 'native', state: 'aligned' }
      }
    ]
  }]
}

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('room list keeps complete room dependencies while showing only the selected machine', () => {
  const [room] = projectRoomList(overview, 'agent:debian')

  assert.equal(room.roomId, 'room-id')
  assert.equal(room.directoryName, 'room1')
  assert.deepEqual(room.worlds.map(world => world.name), ['Caves'])
  assert.deepEqual(room.allWorlds.map(world => world.name), ['Master', 'Caves'])
  assert.equal(worldMachineName(room.worlds[0]), 'debian12')
  assert.doesNotMatch(worldMachineName(room.worlds[0]), /native|default/)
})

test('room runtime summary distinguishes complete, partial and attention states', () => {
  const [room] = projectRoomList(overview)
  assert.deepEqual(roomRuntimeSummary(room), {
    total: 2, running: 1, stopped: 1, starting: 0, stopping: 0, failed: 0, unknown: 0,
    transitioning: 0, attention: 0, state: 'partial'
  })

  assert.equal(roomRuntimeSummary({ worlds: [{ status: 'running' }, { status: 'running' }] }).state, 'running')
  assert.equal(roomRuntimeSummary({ worlds: [{ status: 'failed' }, { status: 'unknown' }] }).state, 'attention')
  assert.equal(roomRuntimeSummary({ worlds: [{ status: 'starting' }, { status: 'stopped' }] }).state, 'transitioning')
})

test('room-level control capability is not widened by one available world', () => {
  const [room] = projectRoomList({
    ...overview,
    rooms: [{ ...overview.rooms[0], controlAvailable: false }]
  })

  assert.equal(room.worlds.some(world => world.controlAvailable), true)
  assert.equal(room.controlAvailable, false)
})

test('placement notice reports pending machine changes without exposing installation identifiers', () => {
  const notice = worldPlacementNotice({
    desiredTargetName: 'debian12',
    placement: {
      appliedTargetId: 'local', appliedInstallationId: 'default',
      desiredTargetId: 'agent:debian', desiredInstallationId: 'native', state: 'planned'
    }
  })

  assert.deepEqual(notice, { pending: true, state: 'planned', desiredTargetName: 'debian12' })
  assert.equal(worldMachineName({ targetId: 'agent:missing' }, 'Local', 'Unknown machine'), 'Unknown machine')
})

test('room list keeps room batch actions and world lifecycle controls visually separate', async () => {
  const page = await source('src/views/rooms/RoomList.vue')

  assert.match(page, /roomApi\.getScopedRuntimeOverview\(managementScopeTargetId\(this\.managementScope\)\)/)
  assert.doesNotMatch(page, /roomApi\.getRoomList/)
  assert.match(page, /<article class="world-row" role="listitem">/)
  assert.match(page, /rooms\.list\.startAll/)
  assert.match(page, /rooms\.list\.stopAll/)
  assert.match(page, /manageWorldPlacement\(room, world\)/)
  assert.match(page, /deployment: 'edit', worldId: world\.id/)
  assert.match(page, /confirmWorldAction\(scope, primary\.kind, primary\.label, world, room\.roomId\)/)
  assert.doesNotMatch(page, /(?:applied|desired)?InstallationId/)
})

test('static room and world configuration stay available when runtime control is unavailable', async () => {
  const page = await source('src/views/rooms/RoomList.vue')

  assert.match(page, /<UiButton variant="outline" size="sm" @click="editRoom\(room\)"/)
  assert.match(page, /<DropdownMenuItem @select="editWorld\(room, world\)"/)
  assert.doesNotMatch(page, /:disabled="!room\.controlAvailable" @click="editRoom\(room\)"/)
  assert.doesNotMatch(page, /:disabled="world\.status !== 'stopped'" @select="editWorld\(room, world\)"/)
})

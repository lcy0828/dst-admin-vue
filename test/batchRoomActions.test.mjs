import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  attachBatchWorldTargets,
  batchTargetKey,
  selectedBatchRooms,
  unsuccessfulBatchSelection,
} from '../src/lib/batchRoomActions.mjs'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('batch room selections preserve room boundaries and omit empty rooms', () => {
  const rooms = [{ id: 'room-a' }, { id: 'room-b' }, { id: 'room-c' }]
  assert.deepEqual(selectedBatchRooms(rooms, {
    'room-a': ['master', 'caves'],
    'room-b': [],
    'room-c': ['forest'],
  }), [
    { roomId: 'room-a', worldIds: ['master', 'caves'] },
    { roomId: 'room-c', worldIds: ['forest'] },
  ])
})

test('batch worlds expose their applied runtime node', () => {
  assert.deepEqual(attachBatchWorldTargets(
    [{ id: 'master', name: 'Master' }, { id: 'caves', name: 'Caves' }],
    {
      placements: [
        { worldId: 'master', appliedTargetId: 'local' },
        { worldId: 'caves', appliedTargetId: 'agent:node-a' },
      ],
      targets: [
        { id: 'local', name: 'This server' },
        { id: 'agent:node-a', name: 'Node A' },
      ],
    }
  ), [
    { id: 'master', name: 'Master', runtimeTargetId: 'local', runtimeTargetName: 'This server' },
    { id: 'caves', name: 'Caves', runtimeTargetId: 'agent:node-a', runtimeTargetName: 'Node A' },
  ])
})

test('retry selection keeps only unsuccessful room-scoped targets', () => {
  const rooms = [
    { id: 'room-a', worlds: [{ id: 'master' }, { id: 'caves' }] },
    { id: 'room-b', worlds: [{ id: 'master' }] },
  ]
  const result = {
    targets: [
      { targetId: batchTargetKey('room-a', 'master'), status: 'succeeded' },
      { targetId: batchTargetKey('room-a', 'caves'), status: 'failed' },
      { targetId: batchTargetKey('room-b', 'master'), status: 'canceled' },
    ],
  }

  assert.deepEqual(unsuccessfulBatchSelection(result, rooms), {
    'room-a': ['caves'],
    'room-b': ['master'],
  })
})

test('batch action UI uses the control-plane route and preserves failed Job results', async () => {
  const [api, adapter, page] = await Promise.all([
    source('src/api/v2.js'),
    source('src/api/v2ConfigurationAdapters.js'),
    source('src/views/rooms/RoomTopology.vue'),
  ])

  assert.match(api, /\/rooms\/actions\/\$\{encode\(action\)\}/)
  assert.match(api, /batchAction:[\s\S]*runtimeTarget:\s*false/)
  assert.match(adapter, /options\.allowFailure !== true/)
  assert.match(page, /<ToggleGroup type="single"/)
  assert.match(page, /<Checkbox/)
  assert.match(page, /retryUnsuccessfulBatchTargets/)
  assert.match(page, /allowFailure:\s*true/)
})

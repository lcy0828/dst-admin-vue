import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('room diagnostics aggregate placement-aware logs without hiding partial failures', async () => {
  const [api, diagnostics, panel] = await Promise.all([
    source('src/api/v2.js'),
    source('src/views/rooms/RoomDiagnostics.vue'),
    source('src/components/runtime/RoomLogOverviewPanel.vue')
  ])

  assert.match(api, /roomSnapshot:[\s\S]*?\/rooms\/\$\{encode\(roomId\)\}\/logs[\s\S]*?runtimeTarget:\s*false/)
  assert.match(diagnostics, /<RoomLogOverviewPanel :room-id="selectedRoomId"/)
  assert.match(panel, /worldLogsV2API\.roomSnapshot/)
  assert.match(panel, /snapshot\?\.partial/)
  assert.match(panel, /world\.problem/)
  assert.match(panel, /AccordionItem v-for="world in snapshot\.worlds"/)
})

test('player adapter and surfaces expose sampling freshness and shard presence conflicts', async () => {
  const [adapter, list] = await Promise.all([
    source('src/api/playerApi.js'),
    source('src/views/players/PlayerList.vue')
  ])

  assert.match(adapter, /last_refreshed_at:\s*player\.lastRefreshedAt/)
  assert.match(adapter, /presence_conflict:\s*Boolean\(player\.presenceConflict\)/)
  assert.match(adapter, /observed_world_ids:\s*Array\.isArray\(player\.observedWorldIds\)/)
  assert.match(adapter, /field_states:\s*player\.fields \|\| \{\}/)
  assert.match(list, /player\.presence_conflict/)
  assert.match(list, /player\.observed_world_ids\.join/)
  assert.match(list, /player\.last_refreshed_at/)
})

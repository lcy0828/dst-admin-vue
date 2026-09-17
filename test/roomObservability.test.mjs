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
  assert.match(diagnostics, /<RoomLogOverviewPanel[\s\S]*?:room-id="selectedRoomId"[\s\S]*?embedded/)
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
  assert.match(adapter, /presence_status:\s*presenceStatus/)
  assert.match(adapter, /presence_observed_at:\s*player\.presenceObservedAt/)
  assert.match(adapter, /stale_online_count:\s*staleOnline/)
  assert.match(adapter, /online_by_world:\s*onlineByWorld/)
  assert.match(adapter, /player\.status !== 'online' \|\| !player\.world_id/)
  assert.match(adapter, /presence_conflict:\s*Boolean\(player\.presenceConflict\)/)
  assert.match(adapter, /observed_world_ids:\s*Array\.isArray\(player\.observedWorldIds\)/)
  assert.match(adapter, /field_states:\s*player\.fields \|\| \{\}/)
  assert.match(list, /player\.presence_conflict/)
  assert.match(list, /player\.observed_world_ids\.join/)
  assert.match(list, /playerListPresenceTime\(player\)/)
  assert.match(list, /currentPlayer\.last_refreshed_at/)
  assert.match(list, /currentPlayer\.status === 'stale'/)
  assert.match(list, /players\.detail\.staleDescription/)
})

test('room diagnostics keep world-state aggregation on the control plane', async () => {
  const [api, diagnostics, panel] = await Promise.all([
    source('src/api/v2.js'),
    source('src/views/rooms/RoomDiagnostics.vue'),
    source('src/components/runtime/RuntimeOverviewPanel.vue')
  ])

  assert.match(api, /worldStatesV2API[\s\S]*?world-states[\s\S]*?runtimeTarget:\s*false/)
  assert.match(api, /refreshWorld:[\s\S]*?actions\/refresh[\s\S]*?runtimeTarget:\s*false/)
  assert.match(api, /playersV2API[\s\S]*?runtimeTarget:\s*false/)
  assert.match(diagnostics, /<RuntimeOverviewPanel/)
  assert.doesNotMatch(diagnostics, /<RoomWorldStatePanel/)
  assert.match(panel, /WorldDataFreshnessBadge/)
  assert.match(panel, /worldStatesV2API\.list/)
  assert.match(panel, /Promise\.allSettled/)
  assert.match(panel, /validObservedAt/)
})

test('runtime management is scoped to the selected room diagnostics view', async () => {
  const [players, diagnostics, panel] = await Promise.all([
    source('src/views/players/PlayerList.vue'),
    source('src/views/rooms/RoomDiagnostics.vue'),
    source('src/components/runtime/RuntimeStatusPanel.vue')
  ])

  assert.doesNotMatch(players, /<RuntimeStatusPanel/)
  assert.match(players, /openRoomDiagnostics\(\)/)
  assert.match(players, /this\.partialFailures\[0\]\?\.room_id/)
  assert.match(players, /path: '\/rooms\/diagnostics'/)
  assert.match(diagnostics, /<TabsTrigger value="runtime">/)
  assert.match(diagnostics, /<RuntimeStatusPanel[\s\S]*?:room-id="selectedRoomId"/)
  assert.match(diagnostics, /runtimeStatusPanel\.value\?\.loadStatus\(\)/)
  assert.match(panel, /defineProps\([\s\S]*?roomId/)
  assert.match(panel, /String\(room\.id\) === String\(props\.roomId\)/)
  assert.match(panel, /defineExpose\(\{ loadStatus \}\)/)
})

test('legacy running-log route redirects to room diagnostics and stays out of navigation', async () => {
  const [router, navigation] = await Promise.all([
    source('src/router/index.js'),
    source('src/v2/navigation.js')
  ])

  assert.match(router, /path: 'parser',[\s\S]*?redirect:[\s\S]*?path: '\/rooms\/diagnostics'[\s\S]*?hidden: true/)
  assert.doesNotMatch(navigation, /to: '\/logs\/parser'/)
})

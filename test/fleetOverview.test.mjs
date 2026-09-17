import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { projectFleetOverview, selectWorkspaceRoom, summarizeFleetActivity } from '../src/lib/fleetOverview.mjs'

function fixture() {
  const local = { id: 'local', name: 'Local', online: true }
  const remote = { id: 'agent:debian12', name: 'Debian12', online: true }
  return {
    targets: [local, remote],
    summary: {},
    issues: [],
    rooms: [{
      id: 'room-1',
      name: 'Mixed room',
      directoryName: 'Cluster_1',
      targetIds: [local.id, remote.id],
      mixedPlacement: true,
      worlds: [
        {
          id: 'master', roomId: 'room-1', name: 'Master', directoryName: 'Master', role: 'master',
          status: 'running', controlAvailable: true,
          placement: { appliedTargetId: local.id }, target: local
        },
        {
          id: 'caves', roomId: 'room-1', name: 'Caves', directoryName: 'Caves', role: 'caves',
          status: 'stopped', controlAvailable: true,
          placement: { appliedTargetId: remote.id }, target: remote
        }
      ]
    }]
  }
}

function activityFixture() {
  const value = fixture()
  value.targets.forEach(target => Object.assign(target, { configured: true, inventoryAvailable: true }))
  value.rooms[0].worlds[1].status = 'running'
  value.rooms.push({
    id: 'stopped-room', worlds: [{ id: 'master', status: 'stopped', placement: { appliedTargetId: 'local' } }]
  })
  return value
}

test('activity counts running worlds and deduplicates split rooms across the fleet', () => {
  const value = activityFixture()
  value.rooms[0].worlds.push({ ...value.rooms[0].worlds[0] })
  const result = summarizeFleetActivity(value)
  assert.deepEqual(result.byTarget.local, { state: 'known', worlds: 1, rooms: 1 })
  assert.deepEqual(result.byTarget['agent:debian12'], { state: 'known', worlds: 1, rooms: 1 })
  assert.deepEqual(result.total, { state: 'known', worlds: 2, rooms: 1 })
})

test('activity counts only applied placements, and a healthy empty machine really has zero running worlds', () => {
  const value = activityFixture()
  value.rooms[0].worlds[1].placement = { appliedTargetId: 'local', desiredTargetId: 'agent:debian12' }
  const result = summarizeFleetActivity(value)
  assert.deepEqual(result.byTarget.local, { state: 'known', worlds: 2, rooms: 1 })
  assert.deepEqual(result.byTarget['agent:debian12'], { state: 'known', worlds: 0, rooms: 0 })
})

test('offline, missing, stale and failed observations are unknown instead of zero', () => {
  for (const patch of [
    { online: false }, { configured: false }, { inventoryAvailable: false },
    { inventoryStale: true }, { observationError: 'I/O Operation Failed' }
  ]) {
    const value = activityFixture()
    Object.assign(value.targets[1], patch)
    const result = summarizeFleetActivity(value)
    assert.equal(result.byTarget['agent:debian12'].state, 'unknown')
    assert.deepEqual(result.total, { state: 'partial', worlds: 1, rooms: 1 })
  }
  const targets = activityFixture().targets
  assert.equal(summarizeFleetActivity({}, targets).total.state, 'unknown')
  const value = activityFixture()
  value.rooms[0].worlds[1].status = 'failed'
  assert.equal(summarizeFleetActivity(value).byTarget['agent:debian12'].state, 'unknown')
  const newerTargets = value.targets.map(target => ({ ...target, online: false }))
  assert.equal(summarizeFleetActivity(value, newerTargets).total.state, 'unknown')
})

test('room defaults prefer a running room on the selected machine and retain the current running room', () => {
  const value = activityFixture()
  const stopped = value.rooms[1]
  const running = value.rooms[0]
  const another = { ...running, id: 'another-running-room' }
  const rooms = [stopped, running, another]
  assert.equal(selectWorkspaceRoom(rooms, stopped.id, true), running)
  assert.equal(selectWorkspaceRoom(rooms, another.id, true), another)
  assert.equal(selectWorkspaceRoom(rooms, '', true), running)
  assert.equal(selectWorkspaceRoom(rooms, stopped.id), stopped)
  assert.equal(selectWorkspaceRoom([stopped], 'deleted', true), stopped)
  assert.equal(selectWorkspaceRoom([], 'deleted', true), null)

  value.rooms[0].worlds[1].status = 'stopped'
  const scoped = projectFleetOverview(value, 'agent:debian12')
  assert.equal(scoped.rooms[0].isRunning, false)
  assert.equal(selectWorkspaceRoom(scoped.rooms, '', true).id, running.id)
})

test('fleet worlds place the main shard first without changing the source or secondary order', () => {
  const value = fixture()
  const [master, caves] = value.rooms[0].worlds
  master.name = 'Z Prime'
  master.type = 'cave'
  const secondary = { ...caves, id: 'custom', name: 'A Forest', role: 'custom', type: 'forest' }
  value.rooms[0].worlds = [caves, secondary, master]

  const result = projectFleetOverview(value)
  assert.deepEqual(result.rooms[0].worlds.map(world => world.id), ['master', 'caves', 'custom'])
  assert.deepEqual(value.rooms[0].worlds.map(world => world.id), ['caves', 'custom', 'master'])
  assert.deepEqual(projectFleetOverview(value, 'agent:debian12').rooms[0].worlds.map(world => world.id), ['caves', 'custom'])
})

test('a machine scope keeps mixed-room context but projects only that machine worlds', () => {
  const result = projectFleetOverview(fixture(), 'agent:debian12')
  assert.equal(result.targets.length, 1)
  assert.equal(result.targets[0].id, 'agent:debian12')
  assert.equal(result.rooms.length, 1)
  assert.equal(result.rooms[0].mixedPlacement, true)
  assert.deepEqual(result.rooms[0].targetIds, ['local', 'agent:debian12'])
  assert.deepEqual(result.rooms[0].worlds.map(world => world.id), ['caves'])
  assert.deepEqual(result.summary, {
    targets: 1,
    onlineTargets: 1,
    rooms: 1,
    mixedRooms: 1,
    worlds: 1,
    running: 0,
    stopped: 1,
    attention: 0
  })
})

test('offline target worlds remain visible and disabled', () => {
  const value = fixture()
  value.targets[1].online = false
  value.rooms[0].worlds[1].status = 'unknown'
  value.rooms[0].worlds[1].controlAvailable = false
  const result = projectFleetOverview(value, 'agent:debian12')
  assert.equal(result.rooms[0].worlds[0].status, 'unknown')
  assert.equal(result.rooms[0].worlds[0].controlAvailable, false)
  assert.equal(result.summary.attention, 1)
})

test('a running world with a save failure remains running and needs attention', () => {
  const value = fixture()
  value.rooms[0].worlds[0].statusCode = 'SAVE_WRITE_FAILED'
  value.rooms[0].worlds[0].statusMessage = 'session directory is not writable'
  const result = projectFleetOverview(value)
  assert.equal(result.rooms[0].worlds[0].status, 'running')
  assert.equal(result.rooms[0].worlds[0].controlAvailable, true)
  assert.equal(result.summary.running, 1)
  assert.equal(result.summary.attention, 1)
})

test('discovered unmanaged worlds stay visible as attention items', () => {
  const value = fixture()
  value.rooms = [{
    id: 'remote-room', name: 'Remote room', managed: false, targetIds: ['agent:debian12'],
    worlds: [{
      id: 'master', roomId: 'remote-room', name: 'Master', directoryName: 'Master', role: 'master',
      status: 'unmanaged', controlAvailable: false,
      placement: { appliedTargetId: 'agent:debian12' }, target: value.targets[1]
    }]
  }]
  const result = projectFleetOverview(value, 'agent:debian12')
  assert.equal(result.rooms.length, 1)
  assert.equal(result.rooms[0].managed, false)
  assert.equal(result.rooms[0].worlds[0].status, 'unmanaged')
  assert.equal(result.summary.attention, 1)
})

test('world projection keeps Cave Master and secondary Forest identities separate', () => {
  const value = fixture()
  value.rooms[0].worlds = [
    {
      id: 'cave-master', roomId: 'room-1', name: 'Cave Prime', directoryName: 'CavePrime',
      role: 'master', type: 'cave', isMaster: true, shardId: 7, status: 'running',
      placement: { appliedTargetId: 'local' }, target: value.targets[0]
    },
    {
      id: 'forest-secondary', roomId: 'room-1', name: 'Forest Two', directoryName: 'ForestTwo',
      role: 'custom', type: 'forest', isMaster: false, shardId: 3, status: 'stopped',
      placement: { appliedTargetId: 'agent:debian12' }, target: value.targets[1]
    }
  ]
  const result = projectFleetOverview(value)
  assert.equal(result.rooms[0].worlds[0].type, 'cave')
  assert.equal(result.rooms[0].worlds[0].isMaster, true)
  assert.equal(result.rooms[0].worlds[0].shardId, 7)
  assert.equal(result.rooms[0].worlds[1].type, 'forest')
  assert.equal(result.rooms[0].worlds[1].isMaster, false)
})

test('legacy Master role without a world type remains unknown', () => {
  const value = fixture()
  delete value.rooms[0].worlds[0].type
  assert.equal(projectFleetOverview(value).rooms[0].worlds[0].type, 'unknown')
})

test('workspace scope changes invalidate old requests before clearing rendered data', async () => {
  const [workspace, dashboard, adapter, playerApi, api, commands, commandPage, logApi, logQuery, worldLog] = await Promise.all([
    readFile(new URL('../src/views/servers/ServerWorkspace.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/composables/useDashboardV2.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/v2LegacyAdapters.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/playerApi.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/v2.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/commandManager.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/servers/CommandManager.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/logApi.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/LogQueryView.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/WorldLog.vue', import.meta.url), 'utf8')
  ])

  assert.match(api, /client\.get\('\/runtime-overview',[\s\S]*?runtimeTarget: false/)
  assert.match(api, /client\.get\('\/runtime-overview',[\s\S]*?timeout: RUNTIME_OVERVIEW_REQUEST_TIMEOUT/)
  assert.match(workspace, /MANAGEMENT_SCOPE_CHANGED_EVENT/)
  assert.match(workspace, /RUNTIME_OBSERVATION_UPDATED_EVENT/)
  assert.doesNotMatch(workspace, /RUNTIME_TARGET_CHANGED_EVENT/)
  assert.match(workspace, /this\.refreshSequence \+= 1[\s\S]*?this\.rooms = \[\]/)
  assert.match(workspace, /getScopedRuntimeOverview\(scopeTargetId\)/)
  assert.doesNotMatch(workspace, /adoptRoom|selectedRoom\.managed/)
  assert.match(workspace, /backupSetsV2API\.create\(this\.selectedRoom\.id\)/)
  assert.match(workspace, /exact_world_ids: Boolean\(managementScopeTargetId\(this\.managementScope\)\)/)
  assert.match(dashboard, /getScopedRuntimeOverview\(managementScopeTargetId\(managementScope\.value\)\)/)
  assert.match(dashboard, /serverRequestSequence \+= 1[\s\S]*?serverList\.value = \[\]/)
  assert.match(adapter, /if \(input\?\.exact_world_ids === true \|\| input\?\.exactWorldIds === true\) return requested/)
  assert.match(playerApi, /const players = selectedWorldIds\.size > 0[\s\S]*?total_count: players\.length/)
  assert.match(workspace, /getPlayerStats\(roomName, this\.playerScopeWorldIds\(\), roomId\)/)
  assert.match(workspace, /world_ids: this\.playerScopeWorldIds\(\)/)
  assert.doesNotMatch(api, /X-DST-Runtime-Target|getActiveRuntimeTarget/)
  assert.match(commands, /getScopedRuntimeOverview\(normalizedTargetId\)/)
  assert.match(commandPage, /MANAGEMENT_SCOPE_CHANGED_EVENT/)
  assert.match(commandPage, /getServers\(managementScopeTargetId\(this\.managementScope\)\)/)
  assert.match(logApi, /getScopedRuntimeOverview\(scopeKey\)/)
  assert.match(logQuery, /getArchivesWithLogs\(managementScopeTargetId\(this\.managementScope\)\)/)
  assert.match(worldLog, /getScopedRuntimeOverview\(managementScopeTargetId\(this\.managementScope\)\)/)
})

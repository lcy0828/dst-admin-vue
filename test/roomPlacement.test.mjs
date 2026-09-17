import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  ROOM_PLACEMENT_MODE,
  createRoomPlacementDraft,
  deriveRoomPlacementMode,
  isProvisionPlacement,
  hasCompleteRoomPlacementShardLinks,
  placementExecutionBlockers,
  placementRuntimeInterruptions,
  resolvedRoomPlacementEndpoints,
  resolvedRoomPlacementTargets,
  roomPlacementChanges,
  roomPlacementDiscoveryInput,
  roomPlacementInput,
  roomPlacementLinkRequirements,
	roomPlacementShardLinksChanged,
	roomPlacementShardLinksPending,
  roomPlacementSummary,
  shardLinkCandidateKey,
  shardLinkCandidateMode,
  switchRoomPlacementMode
} from '../src/lib/roomPlacement.mjs'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

const targets = [
  { id: 'local', name: 'Local', kind: 'local', configured: true, online: true, defaultInstallationId: 'default', installations: [{ id: 'default', default: true }] },
  { id: 'agent:a', name: 'Node A', kind: 'agent', configured: true, online: true, defaultInstallationId: 'primary', installations: [{ id: 'primary', default: true }, { id: 'testing', default: false }] },
  { id: 'agent:b', name: 'Node B', kind: 'agent', configured: true, online: true, defaultInstallationId: 'primary', installations: [{ id: 'primary', default: true }] }
]

function snapshot(placements) {
  return { revision: 'revision-1', targets, placements }
}

test('room placement defaults to one machine and expands one selection to every world', () => {
  const value = snapshot([
    { worldId: 'master', worldName: 'Master', worldRole: 'master', desiredTargetId: 'local', appliedTargetId: 'local', state: 'aligned' },
    { worldId: 'caves', worldName: 'Caves', worldRole: 'caves', desiredTargetId: 'local', appliedTargetId: 'local', state: 'aligned' }
  ])
  const draft = createRoomPlacementDraft(value)

  assert.equal(draft.mode, ROOM_PLACEMENT_MODE.COLOCATED)
  draft.roomTargetId = 'agent:a'
  assert.deepEqual(resolvedRoomPlacementTargets(value, draft), { master: 'agent:a', caves: 'agent:a' })
  assert.deepEqual(roomPlacementInput(value, draft).placements, [
    { worldId: 'master', targetId: 'agent:a', installationId: 'primary' },
    { worldId: 'caves', targetId: 'agent:a', installationId: 'primary' }
  ])
  assert.deepEqual(roomPlacementInput(value, draft).shardLinks, [])
  assert.equal(roomPlacementChanges(value, draft, 'appliedTargetId').length, 2)
})

test('distributed placement requires one selected Master route for every Secondary runtime endpoint', () => {
  const value = snapshot([
    { worldId: 'master', worldName: 'Master', worldRole: 'master', desiredTargetId: 'agent:a', desiredInstallationId: 'primary', appliedTargetId: 'agent:a', appliedInstallationId: 'primary' },
    { worldId: 'caves', worldName: 'Caves', worldRole: 'caves', desiredTargetId: 'agent:b', desiredInstallationId: 'primary', appliedTargetId: 'agent:b', appliedInstallationId: 'primary' }
  ])
  const draft = createRoomPlacementDraft(value)
  const requirements = roomPlacementLinkRequirements(value, draft)

  assert.equal(requirements.distributed, true)
  assert.equal(requirements.master.targetId, 'agent:a')
  assert.deepEqual(requirements.secondaries.map(item => item.sourceTargetId), ['agent:b'])
  assert.equal(hasCompleteRoomPlacementShardLinks(value, draft), false)

  draft.shardLinks = [{
    sourceTargetId: 'agent:b',
    sourceInstallationId: 'primary',
    address: '192.168.2.20',
    port: 10889,
    mode: 'lan'
  }]
  assert.equal(hasCompleteRoomPlacementShardLinks(value, draft), true)
  assert.equal(roomPlacementShardLinksChanged(value, draft), true)
  assert.deepEqual(roomPlacementInput(value, draft).shardLinks, draft.shardLinks)

	value.shardLinks = [...draft.shardLinks]
	assert.equal(roomPlacementShardLinksChanged(value, draft), false)
	assert.equal(roomPlacementShardLinksPending(value), false)
	value.appliedShardLinks = []
	assert.equal(roomPlacementShardLinksPending(value), true)
	value.appliedShardLinks = [...value.shardLinks]
	assert.equal(roomPlacementShardLinksPending(value), false)
})

test('Shard route candidates keep endpoint identity and discovery sends manual tunnel endpoints', () => {
  const value = snapshot([
    { worldId: 'master', worldRole: 'master', desiredTargetId: 'agent:a', desiredInstallationId: 'primary', appliedTargetId: 'agent:a', appliedInstallationId: 'primary' },
    { worldId: 'caves', worldRole: 'caves', desiredTargetId: 'agent:b', desiredInstallationId: 'primary', appliedTargetId: 'agent:b', appliedInstallationId: 'primary' }
  ])
  const draft = createRoomPlacementDraft(value)
  const input = roomPlacementDiscoveryInput(value, draft, [{ address: 'tunnel.example.com', port: 20889 }])

  assert.equal(shardLinkCandidateKey('TUNNEL.example.com', 20889), shardLinkCandidateKey('tunnel.example.com', 20889))
  assert.equal(shardLinkCandidateMode({ kind: 'interface' }), 'manual')
  assert.deepEqual(input.manualCandidates, [{ address: 'tunnel.example.com', port: 20889 }])
  assert.deepEqual(input.placements.map(item => item.targetId), ['agent:a', 'agent:b'])
})

test('distributed placement keeps independent world targets and reports a room summary', () => {
  const placements = [
    { worldId: 'master', worldRole: 'master', desiredTargetId: 'agent:a', desiredInstallationId: 'primary', appliedTargetId: 'agent:a', appliedInstallationId: 'primary', state: 'aligned' },
    { worldId: 'caves', worldRole: 'caves', desiredTargetId: 'agent:b', desiredInstallationId: 'primary', appliedTargetId: 'agent:b', appliedInstallationId: 'primary', state: 'aligned' }
  ]
  const value = snapshot(placements)
  const draft = createRoomPlacementDraft(value)

  assert.equal(deriveRoomPlacementMode(placements), ROOM_PLACEMENT_MODE.PER_WORLD)
  assert.equal(draft.mode, ROOM_PLACEMENT_MODE.PER_WORLD)
  assert.deepEqual(resolvedRoomPlacementTargets(value, draft), { master: 'agent:a', caves: 'agent:b' })
  assert.deepEqual(roomPlacementSummary(value), {
    worldCount: 2,
    machineCount: 2,
    endpointCount: 2,
    targetIds: ['agent:a', 'agent:b'],
    locations: [
      { targetId: 'agent:a', installationId: 'primary' },
      { targetId: 'agent:b', installationId: 'primary' }
    ],
    colocated: false
  })
})

test('multiple installations stay hidden from the common path but remain distinct placement endpoints', () => {
  const value = snapshot([
    { worldId: 'master', worldRole: 'master', desiredTargetId: 'agent:a', desiredInstallationId: 'primary', appliedTargetId: 'agent:a', appliedInstallationId: 'primary', state: 'aligned' },
    { worldId: 'caves', worldRole: 'caves', desiredTargetId: 'agent:a', desiredInstallationId: 'testing', appliedTargetId: 'agent:a', appliedInstallationId: 'testing', state: 'aligned' }
  ])
  const draft = createRoomPlacementDraft(value)

  assert.equal(draft.mode, ROOM_PLACEMENT_MODE.PER_WORLD)
  assert.deepEqual(resolvedRoomPlacementEndpoints(value, draft), {
    master: { targetId: 'agent:a', installationId: 'primary' },
    caves: { targetId: 'agent:a', installationId: 'testing' }
  })
  assert.equal(roomPlacementSummary(value).machineCount, 1)
  assert.equal(roomPlacementSummary(value).endpointCount, 2)
})

test('placement modes seed from the room target once and preserve later per-world choices', () => {
  const value = snapshot([
    { worldId: 'master', worldRole: 'master', desiredTargetId: 'local', appliedTargetId: 'local', state: 'aligned' },
    { worldId: 'caves', worldRole: 'caves', desiredTargetId: 'local', appliedTargetId: 'local', state: 'aligned' }
  ])
  const colocated = createRoomPlacementDraft(value)
  colocated.roomTargetId = 'agent:a'

  const expanded = switchRoomPlacementMode(value, colocated, ROOM_PLACEMENT_MODE.PER_WORLD)
  assert.deepEqual(expanded.draft.worldTargets, { master: 'agent:a', caves: 'agent:a' })

  expanded.draft.worldTargets.caves = 'agent:b'
  const collapsed = switchRoomPlacementMode(
    value,
    expanded.draft,
    ROOM_PLACEMENT_MODE.COLOCATED,
    expanded.draft.worldTargets
  )
  collapsed.draft.roomTargetId = 'local'

  const restored = switchRoomPlacementMode(
    value,
    collapsed.draft,
    ROOM_PLACEMENT_MODE.PER_WORLD,
    collapsed.preservedWorldTargets
  )
  assert.deepEqual(restored.draft.worldTargets, { master: 'agent:a', caves: 'agent:b' })
})

test('execution distinguishes initial provisioning from blocked plans', () => {
  const value = snapshot([
    { worldId: 'master', desiredTargetId: 'agent:a', appliedTargetId: 'local', state: 'shard_missing' },
    { worldId: 'caves', desiredTargetId: 'agent:b', appliedTargetId: 'local', state: 'target_offline' }
  ])

  assert.equal(isProvisionPlacement(value, value.placements[0]), true)
  assert.deepEqual(placementExecutionBlockers(value).map(placement => placement.worldId), ['caves'])
})

test('initial room provisioning reports every running world that must pause', () => {
  const value = snapshot([
    { worldId: 'master', desiredTargetId: 'agent:a', appliedTargetId: 'local', state: 'shard_missing', running: true },
    { worldId: 'caves', desiredTargetId: 'local', appliedTargetId: 'local', state: 'aligned', running: true }
  ])

  assert.deepEqual(placementRuntimeInterruptions(value).map(placement => placement.worldId), ['master', 'caves'])
})

test('room settings owns the normal placement flow while the topology page remains an overview', async () => {
  const [settings, roomList, workspace, card, picker, endpointPicker, messages] = await Promise.all([
    source('src/views/rooms/RoomSettings.vue'),
    source('src/views/rooms/RoomList.vue'),
    source('src/views/servers/ServerWorkspace.vue'),
    source('src/components/rooms/RoomPlacementCard.vue'),
    source('src/components/rooms/RuntimeTargetPicker.vue'),
    source('src/components/rooms/RuntimeEndpointPicker.vue'),
    source('src/i18n/messages.js')
  ])

  assert.match(settings, /<RoomPlacementCard/)
  assert.match(settings, /:auto-open="\$route\.query\.deployment === 'edit'"/)
  assert.match(settings, /:focus-world-id="String\(\$route\.query\.worldId \|\| ''\)"/)
  assert.match(roomList, /query: \{ id: room\.roomId \|\| room\.id, deployment: 'edit' \}/)
  assert.match(roomList, /deployment: 'edit', worldId: world\.id/)
  assert.match(workspace, /query: \{ id: this\.selectedRoomId, deployment: 'edit' \}/)
  assert.match(card, /ROOM_PLACEMENT_MODE\.COLOCATED/)
  assert.match(card, /ROOM_PLACEMENT_MODE\.PER_WORLD/)
  assert.match(card, /openEditor\(props\.focusWorldId\)/)
  assert.match(card, /changeMode\(ROOM_PLACEMENT_MODE\.PER_WORLD\)/)
  assert.match(card, /reviewReady \? applyPlacementPlan\(\) : reviewPlacementPlan\(\)/)
  assert.match(card, /topologyV2API\.update/)
  assert.match(card, /topologyV2API\.applyPlacement/)
  assert.match(card, /topologyV2API\.provision/)
  assert.match(card, /topologyV2API\.discoverShardLinks/)
  assert.match(card, /<ShardLinkSelector/)
  assert.match(card, /hasCompleteRoomPlacementShardLinks/)
  assert.match(card, /placementExecutionBlockers/)
  assert.match(card, /runningDraftExecutionChanges/)
  assert.match(picker, /InputGroupInput v-model="search"/)
  assert.match(picker, /left\.online \? -1 : 1/)
  assert.match(endpointPicker, /installations\.length > 1/)
  assert.match(endpointPicker, /defaultInstallation/)
  assert.match(messages, /roomTopology: '部署总览'/)
  assert.match(messages, /roomTopology: 'Deployment overview'/)
})

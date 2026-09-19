import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRoomTopologyView } from '../src/lib/roomTopologyPresentation.mjs'

const room = {
  id: 'room-1',
  name: 'Survival',
  worlds: [
    { id: 'master', name: 'Master', role: 'master', status: 'running' },
    { id: 'caves', name: 'Caves', role: 'caves', status: 'running' }
  ]
}

const worldPorts = [
  { id: 'master', port: 10999 },
  { id: 'caves', port: 11000 }
]

test('single-machine topology connects players to Master and Caves without a remote route', () => {
  const topology = {
    updatedAt: '2026-08-29T10:00:00Z',
    placements: [
      { worldId: 'master', worldName: 'Master', worldRole: 'master', appliedTargetId: 'local', appliedInstallationId: 'default', state: 'aligned', running: true },
      { worldId: 'caves', worldName: 'Caves', worldRole: 'caves', appliedTargetId: 'local', appliedInstallationId: 'default', state: 'aligned', running: true }
    ],
    targets: [{
      id: 'local', name: '本机', online: true, defaultInstallationId: 'default',
      installations: [{ id: 'default', driver: 'native', default: true, available: true, stale: false }]
    }],
    shardLinks: [],
    issues: []
  }
  const infrastructure = {
    portReservations: [{ roomId: 'room-1', worldId: 'master', targetId: 'local', purpose: 'cluster_master', state: 'active', port: 10888 }]
  }
  const view = buildRoomTopologyView({
    room,
    topology,
    infrastructure,
    connection: { ready: true, endpoint: '192.168.2.42:10999', port: 10999, addressSource: 'lan' },
    worldPorts
  })

  assert.equal(view.mode, 'singleMachine')
  assert.equal(view.status, 'healthy')
  assert.equal(view.master.name, 'Master')
  assert.equal(view.master.installationKind, 'default')
  assert.equal(view.master.shardPort, 10888)
  assert.equal(view.secondaries[0].route.mode, 'local')
  assert.equal(view.secondaries[0].route.endpoint, 'UDP 10888')
})

test('distributed topology shows the selected LAN route and friendly installation kinds', () => {
  const topology = {
    placements: [
      { worldId: 'master', worldName: 'Master', worldRole: 'master', appliedTargetId: 'local', appliedInstallationId: 'default', state: 'aligned' },
      { worldId: 'caves', worldName: 'Caves', worldRole: 'caves', appliedTargetId: 'agent:debian12', appliedInstallationId: 'native', state: 'aligned' }
    ],
    targets: [
      { id: 'local', name: '本机', online: true, defaultInstallationId: 'default', installations: [{ id: 'default', driver: 'native', default: true }] },
      { id: 'agent:debian12', name: 'debian12', online: true, defaultInstallationId: 'native', installations: [{ id: 'native', driver: 'native', default: true }] }
    ],
    shardLinks: [{
      sourceTargetId: 'agent:debian12', sourceInstallationId: 'native', masterTargetId: 'local', masterInstallationId: 'default',
      address: '192.168.2.42', port: 10888, mode: 'lan'
    }],
    issues: []
  }
  const view = buildRoomTopologyView({
    room,
    topology,
    connection: { ready: true, endpoint: 'example.com:10999', port: 10999, addressSource: 'configured' },
    worldPorts
  })

  assert.equal(view.mode, 'distributed')
  assert.equal(view.status, 'healthy')
  assert.equal(view.master.installationKind, 'default')
  assert.equal(view.secondaries[0].installationKind, 'native')
  assert.equal(view.secondaries[0].route.mode, 'lan')
  assert.equal(view.secondaries[0].route.endpoint, '192.168.2.42:10888')
})

test('distributed topology renders the applied route while a different desired route is pending', () => {
	const topology = {
		placements: [
			{ worldId: 'master', worldName: 'Master', worldRole: 'master', appliedTargetId: 'local', appliedInstallationId: 'default', state: 'aligned' },
			{ worldId: 'caves', worldName: 'Caves', worldRole: 'caves', appliedTargetId: 'agent:debian12', appliedInstallationId: 'native', state: 'aligned' }
		],
		targets: [
			{ id: 'local', name: '本机', online: true, installations: [{ id: 'default', driver: 'native' }] },
			{ id: 'agent:debian12', name: 'debian12', online: true, installations: [{ id: 'native', driver: 'native' }] }
		],
		shardLinks: [{
			sourceTargetId: 'agent:debian12', sourceInstallationId: 'native', masterTargetId: 'local', masterInstallationId: 'default',
			address: 'future.example.com', port: 20888, mode: 'public'
		}],
		appliedShardLinks: [{
			sourceTargetId: 'agent:debian12', sourceInstallationId: 'native', masterTargetId: 'local', masterInstallationId: 'default',
			address: '192.168.2.42', port: 10888, mode: 'lan'
		}],
		issues: []
	}
	const view = buildRoomTopologyView({
		room,
		topology,
		connection: { ready: true, endpoint: 'example.com:10999', port: 10999 },
		worldPorts
	})

	assert.equal(view.secondaries[0].route.endpoint, '192.168.2.42:10888')
	assert.equal(view.secondaries[0].route.mode, 'lan')
})

test('missing player entry, offline target and missing Shard route remain visible as issues', () => {
  const topology = {
    placements: [
      { worldId: 'master', worldName: 'Master', worldRole: 'master', appliedTargetId: 'local', appliedInstallationId: 'default', state: 'aligned' },
      { worldId: 'caves', worldName: 'Caves', worldRole: 'caves', appliedTargetId: 'agent:debian12', appliedInstallationId: 'container', state: 'target_offline' }
    ],
    targets: [
      { id: 'local', name: '本机', online: true, installations: [{ id: 'default', driver: 'native' }] },
      { id: 'agent:debian12', name: 'debian12', online: false, installations: [{ id: 'container', driver: 'container' }] }
    ],
    shardLinks: [],
    issues: []
  }
  const view = buildRoomTopologyView({ room, topology, connection: { ready: false }, worldPorts })

  assert.equal(view.status, 'error')
  assert.equal(view.secondaries[0].installationKind, 'container')
  assert.equal(view.secondaries[0].route.state, 'missing')
  assert.ok(view.issues.some(item => item.code === 'TOPOLOGY_PLAYER_ENTRY_MISSING'))
  assert.ok(view.issues.some(item => item.code === 'TOPOLOGY_TARGET_OFFLINE'))
  assert.ok(view.issues.some(item => item.code === 'TOPOLOGY_SHARD_LINK_MISSING'))
})

test('capacity risks remain visible without mislabeling a complete connection topology', () => {
  const topology = {
    updatedAt: '2026-08-29T05:13:38Z',
    placements: [
      { worldId: 'master', worldName: 'Master', worldRole: 'master', appliedTargetId: 'local', appliedInstallationId: 'default', state: 'aligned', running: true },
      { worldId: 'caves', worldName: 'Caves', worldRole: 'caves', appliedTargetId: 'agent:debian12', appliedInstallationId: 'native', state: 'aligned', running: true }
    ],
    targets: [
      {
        id: 'local', name: '本机', online: true, observedAt: '2026-08-29T09:30:00Z',
        currentCapacity: { state: 'available', runningShards: 1, recommendedShardLimit: 3, memoryState: 'critical' },
        installations: [{ id: 'default', driver: 'native', default: true }]
      },
      {
        id: 'agent:debian12', name: 'debian12', online: true, observedAt: '2026-08-29T09:29:55Z',
        installations: [{ id: 'native', driver: 'native', default: true }]
      }
    ],
    shardLinks: [{
      sourceTargetId: 'agent:debian12', sourceInstallationId: 'native', masterTargetId: 'local', masterInstallationId: 'default',
      address: '192.168.2.24', port: 10888, mode: 'lan'
    }],
    issues: [{
      code: 'TARGET_MEMORY_CRITICAL', severity: 'warning', targetId: 'local',
      message: '节点 本机 启动计划世界后预计可用内存不足 384 MiB，可能触发 OOM'
    }]
  }
  const view = buildRoomTopologyView({
    room,
    topology,
    connection: { ready: true, endpoint: 'example.com:10999', port: 10999, addressSource: 'configured' },
    worldPorts
  })

  assert.equal(view.status, 'healthy')
  assert.equal(view.connectionIssues.length, 0)
  assert.equal(view.runtimeRisks.length, 1)
  assert.equal(view.runtimeRisks[0].code, 'TARGET_MEMORY_CRITICAL')
  assert.equal(view.observedAt, '2026-08-29T09:29:55Z')
  assert.equal(view.updatedAt, '2026-08-29T05:13:38Z')
})

test('inventory notices request configuration review without becoming connection failures', () => {
  const topology = {
    placements: [
      { worldId: 'master', worldName: 'Master', worldRole: 'master', appliedTargetId: 'local', appliedInstallationId: 'default', state: 'aligned', running: true },
      { worldId: 'caves', worldName: 'Caves', worldRole: 'caves', appliedTargetId: 'local', appliedInstallationId: 'default', state: 'aligned', running: true }
    ],
    targets: [{
      id: 'local', name: '本机', online: true,
      installations: [{ id: 'default', driver: 'native', default: true, available: true }]
    }],
    issues: [{ code: 'INVENTORY_STALE', severity: 'warning', targetId: 'local', message: '节点本机的运行时清单已过期' }]
  }
  const view = buildRoomTopologyView({
    room,
    topology,
    infrastructure: {
      portReservations: [{ roomId: 'room-1', worldId: 'master', targetId: 'local', purpose: 'cluster_master', state: 'active', port: 10888 }]
    },
    connection: { ready: true, endpoint: '192.168.2.42:10999', port: 10999, addressSource: 'lan' },
    worldPorts
  })

  assert.equal(view.status, 'warning')
  assert.equal(view.connectionIssues.length, 0)
  assert.equal(view.configurationNotices.length, 1)
  assert.equal(view.runtimeRisks.length, 0)
})

function capacityTopology(overrides = {}) {
  return {
    placements: room.worlds.map(world => ({
      worldId: world.id, worldName: world.name, worldRole: world.role,
      appliedTargetId: 'local', appliedInstallationId: 'default', state: 'aligned', running: true
    })),
    targets: [{
      id: 'local', name: '本机', online: true, inventoryAvailable: true, inventoryStale: false,
      installations: [{ id: 'default', driver: 'native', available: true, stale: false }],
      observedRunningShards: 2, plannedShards: 4, projectedShards: 4,
      currentCapacity: { state: 'available', runningShards: 2, recommendedShardLimit: 3, memoryState: 'healthy' },
      projectedCapacity: { state: 'overcommitted', runningShards: 4, recommendedShardLimit: 3, memoryState: 'critical' },
      ...overrides
    }],
    issues: [
      { code: 'TARGET_OVERCOMMITTED', severity: 'warning', targetId: 'local', message: '计划承载 4 个世界分片' },
      { code: 'TARGET_MEMORY_CRITICAL', severity: 'warning', targetId: 'local', message: '启动计划世界后预计可用内存不足' }
    ]
  }
}

function capacityView(topology) {
  return buildRoomTopologyView({
    room, topology, worldPorts,
    connection: { ready: true, endpoint: 'example.com:10999', port: 10999 }
  })
}

test('four configured worlds with only two running do not produce current CPU or memory warnings', () => {
  const view = capacityView(capacityTopology())
  assert.deepEqual(view.runtimeRisks, [])
  assert(!view.issues.some(value => value.message?.includes('计划')))
  assert.equal(view.status, 'healthy')
})

test('current capacity includes other rooms on the same machine without counting this room twice', () => {
  const view = capacityView(capacityTopology({
    observedRunningShards: 4,
    currentCapacity: { state: 'overcommitted', runningShards: 4, recommendedShardLimit: 3, memoryState: 'healthy' }
  }))
  assert.equal(view.runtimeRisks.length, 1)
  assert.equal(view.runtimeRisks[0].messageKey, 'roomTopology.issues.capacityOvercommitted')
  assert.deepEqual(view.runtimeRisks[0].parameters, { machine: '本机', count: 4, limit: 3 })
  assert.equal(view.status, 'healthy')
})

test('a 2C4G machine running Master and Caves only gets an at-capacity reminder', () => {
  const view = capacityView(capacityTopology({
    currentCapacity: { state: 'full', runningShards: 2, recommendedShardLimit: 2, memoryState: 'healthy' }
  }))
  assert.deepEqual(view.runtimeRisks.map(value => value.code), ['TARGET_CAPACITY_FULL'])
  assert.equal(view.runtimeRisks[0].messageKey, 'roomTopology.issues.capacityFull')
  assert.equal(view.status, 'healthy')
})

for (const memoryState of ['tight', 'critical']) {
  test(`current ${memoryState} memory remains visible independently of CPU capacity`, () => {
    const view = capacityView(capacityTopology({
      currentCapacity: { state: 'available', runningShards: 2, recommendedShardLimit: 3, memoryState }
    }))
    assert.deepEqual(view.runtimeRisks.map(value => value.code), [`TARGET_MEMORY_${memoryState.toUpperCase()}`])
    assert.equal(view.runtimeRisks[0].targetId, 'local')
  })
}

for (const unavailable of [{ inventoryStale: true }, { online: false }, { inventoryAvailable: false }]) {
  test(`retained load is not treated as current when ${JSON.stringify(unavailable)}`, () => {
    const topology = capacityTopology({
      ...unavailable,
      currentCapacity: { state: 'overcommitted', runningShards: 4, recommendedShardLimit: 3, memoryState: 'critical' }
    })
    const view = capacityView(topology)
    assert.deepEqual(view.runtimeRisks.map(value => value.code), ['TARGET_CAPACITY_UNKNOWN'])
    assert.equal(view.runtimeRisks[0].messageKey, 'roomTopology.issues.capacityUnknown')
  })
}

test('CPU capacity can be unknown while current memory still needs attention', () => {
  const view = capacityView(capacityTopology({
    currentCapacity: { state: 'unknown', runningShards: 2, memoryState: 'critical' }
  }))
  assert.deepEqual(view.runtimeRisks.map(value => value.code), ['TARGET_CAPACITY_UNKNOWN', 'TARGET_MEMORY_CRITICAL'])
})

test('split rooms show each applied machine once and exclude unrelated or future destinations', () => {
  const topology = capacityTopology()
  topology.placements[0].desiredTargetId = 'agent:future'
  topology.placements[1].appliedTargetId = 'agent:caves'
  for (const id of ['agent:caves', 'agent:unrelated', 'agent:future']) {
    topology.targets.push({
      id, name: id, online: true,
      installations: [{ id: 'default', driver: 'native', available: true }],
      currentCapacity: { state: 'overcommitted', runningShards: 4, recommendedShardLimit: 3, memoryState: 'healthy' }
    })
    topology.issues.push({ code: 'TARGET_OVERCOMMITTED', targetId: id, severity: 'warning', message: '计划容量提醒' })
  }
  const view = capacityView(topology)
  assert.deepEqual(view.runtimeRisks.map(value => value.targetId), ['agent:caves'])
})

test('missing current capacity never falls back to all-configured projections', () => {
  assert.deepEqual(capacityView(capacityTopology({ currentCapacity: undefined })).runtimeRisks, [])
})

test('topology accepts a Cave Master and does not promote a secondary Forest', () => {
  const mixedRoom = {
    id: 'mixed-room',
    name: 'Mixed',
    worlds: [
      { id: 'forest-secondary', name: 'Forest Two', role: 'custom', type: 'forest', isMaster: false, shardId: 3, status: 'running' },
      { id: 'cave-master', name: 'Cave Prime', role: 'master', type: 'cave', isMaster: true, shardId: 7, status: 'running' }
    ]
  }
  const mixedTopology = {
    placements: [
      { worldId: 'forest-secondary', worldName: 'Forest Two', worldRole: 'custom', appliedTargetId: 'local', appliedInstallationId: 'default', state: 'aligned' },
      { worldId: 'cave-master', worldName: 'Cave Prime', worldRole: 'master', appliedTargetId: 'local', appliedInstallationId: 'default', state: 'aligned' }
    ],
    targets: [{
      id: 'local', name: 'Local', online: true,
      installations: [{ id: 'default', driver: 'native', available: true }]
    }],
    issues: []
  }
  const view = buildRoomTopologyView({
    room: mixedRoom,
    topology: mixedTopology,
    infrastructure: {
      portReservations: [{ roomId: 'mixed-room', worldId: 'cave-master', targetId: 'local', purpose: 'cluster_master', state: 'active', port: 10888 }]
    },
    connection: { ready: true, endpoint: '203.0.113.7:10999', port: 10999 },
    worldPorts: [{ id: 'forest-secondary', port: 11003 }, { id: 'cave-master', port: 11007 }]
  })
  assert.equal(view.master.id, 'cave-master')
  assert.equal(view.master.type, 'cave')
  assert.equal(view.master.shardId, 7)
  assert.equal(view.master.shardPort, 10888)
  assert.deepEqual(view.secondaries.map(world => world.id), ['forest-secondary'])
  assert.equal(view.secondaries[0].type, 'forest')
  assert.equal(view.secondaries[0].shardId, 3)
})

test('topology reports multiple Master worlds instead of silently accepting them', () => {
  const invalidRoom = {
    id: 'invalid-room',
    worlds: [
      { id: 'forest-master', name: 'Forest Master', role: 'master', type: 'forest', isMaster: true },
      { id: 'cave-master', name: 'Cave Master', role: 'master', type: 'cave', isMaster: true }
    ]
  }
  const invalidTopology = {
    placements: invalidRoom.worlds.map(world => ({
      worldId: world.id, worldName: world.name, worldRole: 'master',
      appliedTargetId: 'local', appliedInstallationId: 'default', state: 'aligned'
    })),
    targets: [{ id: 'local', name: 'Local', online: true, installations: [{ id: 'default', driver: 'native' }] }],
    issues: []
  }
  const view = buildRoomTopologyView({
    room: invalidRoom,
    topology: invalidTopology,
    connection: { ready: true, endpoint: '203.0.113.7:10999', port: 10999 }
  })
  assert.equal(view.status, 'error')
  assert.ok(view.issues.some(item => item.code === 'TOPOLOGY_MASTER_MULTIPLE'))
})

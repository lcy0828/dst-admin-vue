import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDirectConnectCode,
  egressProbeRegion,
  findMasterWorld,
  formatConnectionEndpoint,
  privateIPv4Addresses,
  resolveRoomConnection,
  resolveWorldConnection,
  worldListenPort
} from '../src/lib/serverConnection.mjs'

test('egress probe region follows the active interface language', () => {
  assert.equal(egressProbeRegion('zh-CN'), 'cn')
  assert.equal(egressProbeRegion({ value: 'zh-Hans' }), 'cn')
  assert.equal(egressProbeRegion('en-US'), 'global')
  assert.equal(egressProbeRegion(), 'global')
})

const room = {
  id: 'room-1',
  worlds: [
    { id: 'caves', role: 'caves', directoryName: 'Caves', serverPort: 11000 },
    { id: 'master', role: 'master', directoryName: 'Master', serverPort: 10999 }
  ]
}

const topology = {
  placements: [
    { worldId: 'master', appliedTargetId: 'local' },
    { worldId: 'caves', appliedTargetId: 'agent-1' }
  ]
}

const infrastructure = {
  providers: [{ id: 'provider-local', targetId: 'local', ipAddresses: ['192.168.2.42', '220.196.237.31'] }],
  environments: [{ id: 'environment-local', targetId: 'local', networkProfileId: 'network-local' }],
  networkProfiles: [{ id: 'network-local', environmentId: 'environment-local', advertiseAddress: '220.196.237.31' }],
  portReservations: [
    { roomId: 'room-1', worldId: 'master', targetId: 'local', purpose: 'dst_server', state: 'active', port: 12001 }
  ]
}

test('findMasterWorld selects the room entry world', () => {
  assert.equal(findMasterWorld(room.worlds)?.id, 'master')
})

test('findMasterWorld does not confuse a secondary Forest with the Master role', () => {
  const worlds = [
    { id: 'forest-secondary', role: 'custom', type: 'forest', isMaster: false, directoryName: 'ForestOne' },
    { id: 'cave-master', role: 'master', type: 'cave', isMaster: true, directoryName: 'CavePrime' }
  ]
  assert.equal(findMasterWorld(worlds)?.id, 'cave-master')
  assert.equal(findMasterWorld([{ id: 'forest-secondary', role: 'forest', type: 'forest', isMaster: false }]), null)
})

test('worldListenPort prefers runtime reservations and falls back to server.ini', () => {
  assert.equal(worldListenPort({ roomId: room.id, world: room.worlds[1], topology, infrastructure }), 12001)
  assert.equal(worldListenPort({ roomId: room.id, world: room.worlds[0], topology, infrastructure }), 11000)
})

test('room connection follows the Master target and configured network profile', () => {
  const connection = resolveRoomConnection({ room, topology, infrastructure, browserHostname: '127.0.0.1' })
  assert.equal(connection.endpoint, '220.196.237.31:12001')
  assert.equal(connection.addressSource, 'configured')
})

test('room connection falls back to the current panel host', () => {
  const connection = resolveRoomConnection({ room, topology, infrastructure: {}, browserHostname: '192.168.2.42' })
  assert.equal(connection.endpoint, '192.168.2.42:10999')
  assert.equal(connection.addressSource, 'panel')
})

test('room connection never uses the controller hostname for a remote Master', () => {
  const remoteTopology = {
    placements: [
      { worldId: 'master', appliedTargetId: 'agent:debian12' },
      { worldId: 'caves', appliedTargetId: 'agent:debian12' }
    ]
  }
  const connection = resolveRoomConnection({
    room,
    topology: remoteTopology,
    infrastructure: {},
    browserHostname: 'localhost'
  })
  assert.equal(connection.targetId, 'agent:debian12')
  assert.equal(connection.address, '')
  assert.equal(connection.endpoint, '')
  assert.equal(connection.addressSource, 'missing')
  assert.equal(connection.ready, false)
})

test('room connection rejects a loopback address saved on a remote Master', () => {
  const remoteTopology = {
    placements: [
      { worldId: 'master', appliedTargetId: 'agent:debian12' },
      { worldId: 'caves', appliedTargetId: 'agent:debian12' }
    ]
  }
  const remoteInfrastructure = {
    providers: [{ id: 'provider-remote', targetId: 'agent:debian12', ipAddresses: ['192.168.2.42'] }],
    environments: [{ id: 'environment-remote', targetId: 'agent:debian12', networkProfileId: 'network-remote' }],
    networkProfiles: [{ id: 'network-remote', environmentId: 'environment-remote', advertiseAddress: 'localhost' }]
  }
  const connection = resolveRoomConnection({
    room,
    topology: remoteTopology,
    infrastructure: remoteInfrastructure,
    browserHostname: 'localhost'
  })
  assert.deepEqual(connection.lanAddresses, ['192.168.2.42'])
  assert.equal(connection.address, '')
  assert.equal(connection.endpoint, '')
  assert.equal(connection.addressSource, 'missing')
  assert.equal(connection.ready, false)
})

test('room connection retains the remote target when topology is unavailable', () => {
  const remoteRoom = {
    ...room,
    worlds: room.worlds.map(world => ({ ...world, targetIds: ['agent:debian12'] }))
  }
  const connection = resolveRoomConnection({
    room: remoteRoom,
    topology: null,
    infrastructure: {},
    browserHostname: '192.168.2.10'
  })
  assert.equal(connection.targetId, 'agent:debian12')
  assert.equal(connection.address, '')
  assert.equal(connection.endpoint, '')
  assert.equal(connection.addressSource, 'missing')
})

test('room connection uses a detected Master egress before the panel host', () => {
  const connection = resolveRoomConnection({
    room,
    topology,
    infrastructure: { ...infrastructure, networkProfiles: [{ ...infrastructure.networkProfiles[0], advertiseAddress: '' }] },
    browserHostname: '127.0.0.1',
    detectedAddress: '220.196.237.31'
  })
  assert.equal(connection.endpoint, '220.196.237.31:12001')
  assert.equal(connection.addressSource, 'detected')
})

test('private IPv4 addresses include only RFC1918 addresses in stable order', () => {
  assert.deepEqual(privateIPv4Addresses([
    '192.168.2.42', '10.0.0.8', '172.31.5.2', '172.32.0.1', '169.254.1.2',
    '127.0.0.1', '220.196.237.31', '2001:db8::1', '10.0.0.8', 'invalid'
  ]), ['10.0.0.8', '172.31.5.2', '192.168.2.42'])
})

test('room connection previews a selected LAN address before it is saved', () => {
  const connection = resolveRoomConnection({
    room,
    topology,
    infrastructure,
    browserHostname: '127.0.0.1',
    draftAddress: '192.168.2.42'
  })
  assert.deepEqual(connection.lanAddresses, ['192.168.2.42'])
  assert.equal(connection.endpoint, '192.168.2.42:12001')
  assert.equal(connection.addressSource, 'lan')
})

test('world connection resolves each world against its own Runtime target', () => {
  const world = room.worlds[0]
  const remoteInfrastructure = {
    providers: [{ id: 'provider-agent', targetId: 'agent-1', ipAddresses: ['10.0.0.7'] }],
    environments: [{ id: 'environment-agent', targetId: 'agent-1', networkProfileId: 'network-agent' }],
    networkProfiles: [{ id: 'network-agent', environmentId: 'environment-agent', advertiseAddress: '198.51.100.7' }],
    portReservations: [{ roomId: room.id, worldId: world.id, targetId: 'agent-1', purpose: 'dst_server', state: 'active', port: 13007 }]
  }
  const connection = resolveWorldConnection({ room, world, topology, infrastructure: remoteInfrastructure })
  assert.equal(connection.world.id, 'caves')
  assert.equal(connection.targetId, 'agent-1')
  assert.equal(connection.endpoint, '198.51.100.7:13007')
  assert.equal(connection.addressSource, 'configured')
})

test('direct connect code supports IPv6 and optional passwords', () => {
  assert.equal(formatConnectionEndpoint('::1', 10999), '[::1]:10999')
  assert.equal(buildDirectConnectCode('::1', 10999), 'c_connect("::1", 10999)')
  assert.equal(buildDirectConnectCode('game.example.com', 10999, 'secret'), 'c_connect("game.example.com", 10999, "secret")')
})

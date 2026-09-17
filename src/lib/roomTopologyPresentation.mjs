const MASTER_ROLES = new Set(['master'])
const ERROR_PLACEMENT_STATES = new Set([
  'target_offline',
  'inventory_missing',
  'shard_missing',
  'conflict',
  'unknown'
])
const WARNING_PLACEMENT_STATES = new Set(['planned', 'inventory_stale'])
const CONFIGURATION_NOTICE_CODES = new Set([
  'TARGET_MISSING',
  'INSTALLATION_MISSING',
  'INVENTORY_MISSING',
  'INVENTORY_STALE',
  'SHARD_MISSING',
  'TOPOLOGY_INSTALLATION_UNAVAILABLE'
])

function clean(value) {
  return String(value || '').trim()
}

function roleOf(value = {}) {
  return clean(value.worldRole || value.role).toLowerCase()
}

function typeOf(value = {}) {
  const valueType = clean(value.type).toLowerCase()
  return ['forest', 'cave'].includes(valueType) ? valueType : 'unknown'
}

function isMaster(value = {}) {
  if (typeof value.isMaster === 'boolean') return value.isMaster
  return MASTER_ROLES.has(roleOf(value)) || clean(value.directoryName).toLowerCase() === 'master'
}

function port(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535 ? parsed : null
}

function endpoint(targetId, installationId) {
  return `${clean(targetId)}\u0000${clean(installationId)}`
}

function appliedEndpoint(placement = {}) {
  return {
    targetId: clean(placement.appliedTargetId || placement.desiredTargetId),
    installationId: clean(placement.appliedInstallationId || placement.desiredInstallationId)
  }
}

function desiredEndpoint(placement = {}) {
  return {
    targetId: clean(placement.desiredTargetId || placement.appliedTargetId),
    installationId: clean(placement.desiredInstallationId || placement.appliedInstallationId)
  }
}

function worldPlacementFallback(world = {}) {
  const placement = world.placement || {}
  const targetIds = (Array.isArray(world.targetIds) ? world.targetIds : []).map(clean).filter(Boolean)
  const targetId = clean(placement.appliedTargetId || placement.desiredTargetId || (targetIds.length === 1 ? targetIds[0] : ''))
  return {
    worldId: clean(world.id),
    worldName: clean(world.name || world.directoryName || world.id),
    worldRole: roleOf(world),
    desiredTargetId: clean(placement.desiredTargetId || targetId),
    appliedTargetId: clean(placement.appliedTargetId || targetId),
    desiredInstallationId: clean(placement.desiredInstallationId),
    appliedInstallationId: clean(placement.appliedInstallationId),
    state: clean(placement.state || 'unknown'),
    running: world.status === 'running'
  }
}

function installationKind(installationId, installation = {}) {
  if (clean(installationId).toLowerCase() === 'default') return 'default'
  const driver = clean(installation.driver).toLowerCase()
  if (driver === 'container') return 'container'
  if (driver === 'native') return 'native'
  return 'registered'
}

function findInstallation(target, installationId) {
  const installations = Array.isArray(target?.installations) ? target.installations : []
  const requested = clean(installationId || target?.defaultInstallationId)
  return installations.find(item => clean(item.id) === requested)
    || installations.find(item => item.default)
    || installations[0]
    || null
}

function findShardLink(links, source, master) {
  const exact = (links || []).find(link => (
    clean(link.sourceTargetId) === source.targetId
    && clean(link.masterTargetId) === master.targetId
    && (!clean(link.sourceInstallationId) || clean(link.sourceInstallationId) === source.installationId)
    && (!clean(link.masterInstallationId) || clean(link.masterInstallationId) === master.installationId)
  ))
  if (exact) return exact
  return (links || []).find(link => (
    clean(link.sourceTargetId) === source.targetId
    && clean(link.masterTargetId) === master.targetId
  )) || null
}

function findReservation(infrastructure, roomId, worldId, purpose, targetId) {
  return (infrastructure?.portReservations || []).find(item => (
    clean(item.roomId) === clean(roomId)
    && clean(item.worldId) === clean(worldId)
    && clean(item.purpose) === purpose
    && clean(item.state).toLowerCase() !== 'released'
    && (!targetId || !clean(item.targetId) || clean(item.targetId) === targetId)
  )) || null
}

function routeForSecondary(links, secondaryEndpoint, masterEndpoint, shardPort) {
  if (secondaryEndpoint.targetId && secondaryEndpoint.targetId === masterEndpoint.targetId) {
    return { state: 'ready', mode: 'local', address: '', port: shardPort, endpoint: shardPort ? `UDP ${shardPort}` : '' }
  }
  const link = findShardLink(links, secondaryEndpoint, masterEndpoint)
  const address = clean(link?.address)
  const linkPort = port(link?.port)
  if (!address || !linkPort) return { state: 'missing', mode: 'missing', address: '', port: null, endpoint: '' }
  return {
    state: 'ready',
    mode: clean(link.mode || 'manual').toLowerCase(),
    address,
    port: linkPort,
    endpoint: `${address.includes(':') ? `[${address}]` : address}:${linkPort}`
  }
}

function nodeForPlacement({ placement, worldsById, targetsById, portsByWorld }) {
  const worldId = clean(placement.worldId)
  const world = worldsById.get(worldId) || {}
  const current = appliedEndpoint(placement)
  const desired = desiredEndpoint(placement)
  const target = targetsById.get(current.targetId) || world.target || null
  const installation = findInstallation(target, current.installationId)
  const resolvedInstallationId = clean(current.installationId || installation?.id || target?.defaultInstallationId)
  const state = clean(placement.state || 'unknown').toLowerCase()
  return {
    id: worldId,
    name: clean(placement.worldName || world.name || world.directoryName || worldId),
    directoryName: clean(world.directoryName),
    role: roleOf(placement) || roleOf(world),
    type: typeOf(world),
    master: isMaster(placement) || isMaster(world),
    shardId: Number.isInteger(Number(world.shardId)) ? Number(world.shardId) : 0,
    runtimeState: clean(world.status || (placement.running ? 'running' : 'stopped')).toLowerCase(),
    placementState: state,
    placementTone: ERROR_PLACEMENT_STATES.has(state) ? 'error' : (WARNING_PLACEMENT_STATES.has(state) ? 'warning' : 'healthy'),
    targetId: current.targetId,
    targetName: clean(target?.name || current.targetId),
    targetOnline: target?.online !== false,
    installationId: resolvedInstallationId,
    installationKind: installationKind(resolvedInstallationId, installation || {}),
    installationAvailable: installation?.available !== false,
    installationStale: installation?.stale === true,
    port: portsByWorld.get(worldId) || null,
    desiredTargetId: desired.targetId,
    desiredTargetName: clean(targetsById.get(desired.targetId)?.name || desired.targetId),
    desiredInstallationId: desired.installationId,
    pending: endpoint(current.targetId, current.installationId) !== endpoint(desired.targetId, desired.installationId)
  }
}

function issue(code, severity, messageKey, parameters = {}) {
  return { code, severity, messageKey, parameters }
}

function uniqueIssues(values) {
  const seen = new Set()
  return values.filter(value => {
    const key = `${value.code}\u0000${value.worldId || ''}\u0000${value.targetId || ''}\u0000${value.message || value.messageKey || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function isRuntimeRisk(value = {}) {
  const code = clean(value.code).toUpperCase()
  return code === 'TARGET_OVERCOMMITTED'
    || code.startsWith('TARGET_CAPACITY_')
    || code.startsWith('TARGET_MEMORY_')
}

function isConfigurationNotice(value = {}) {
  return CONFIGURATION_NOTICE_CODES.has(clean(value.code).toUpperCase())
}

function oldestTimestamp(values) {
  const parsed = values
    .map(value => ({ value: clean(value), timestamp: Date.parse(value) }))
    .filter(item => item.value && Number.isFinite(item.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp)
  return parsed[0]?.value || ''
}

export function buildRoomTopologyView({ room = {}, topology = null, infrastructure = null, connection = {}, worldPorts = [] } = {}) {
  const worlds = Array.isArray(room.worlds) ? room.worlds : []
  const worldsById = new Map(worlds.map(world => [clean(world.id), world]))
  const targets = Array.isArray(topology?.targets) ? topology.targets : []
  const targetsById = new Map(targets.map(target => [clean(target.id), target]))
  const placements = Array.isArray(topology?.placements) && topology.placements.length
    ? topology.placements
    : worlds.map(worldPlacementFallback)
  const portsByWorld = new Map((worldPorts || []).map(item => [clean(item.id), port(item.port)]))
  const nodes = placements.map(placement => nodeForPlacement({ placement, worldsById, targetsById, portsByWorld }))
  const masters = nodes.filter(node => node.master)
  const master = masters[0] || null
  const masterEndpoint = master ? { targetId: master.targetId, installationId: master.installationId } : { targetId: '', installationId: '' }
  const clusterReservation = master
    ? findReservation(infrastructure, room.id, master.id, 'cluster_master', master.targetId)
    : null
  const shardPort = port(clusterReservation?.port)
  const secondaries = nodes.filter(node => !master || node.id !== master.id).map(node => ({
    ...node,
    route: routeForSecondary(
      Array.isArray(topology?.appliedShardLinks) ? topology.appliedShardLinks : (topology?.shardLinks || []),
      { targetId: node.targetId, installationId: node.installationId },
      masterEndpoint,
      shardPort
    )
  }))
  const targetCount = new Set(nodes.map(node => node.targetId).filter(Boolean)).size
  const endpointCount = new Set(nodes.map(node => endpoint(node.targetId, node.installationId)).filter(value => !value.startsWith('\u0000'))).size
  const mode = targetCount > 1 ? 'distributed' : (endpointCount > 1 ? 'multiInstallation' : 'singleMachine')
  const issues = [...(topology?.issues || [])]

  if (!master) issues.push(issue('TOPOLOGY_MASTER_MISSING', 'error', 'roomTopology.issues.masterMissing'))
  if (masters.length > 1) issues.push(issue('TOPOLOGY_MASTER_MULTIPLE', 'error', 'roomTopology.issues.masterMultiple', { count: masters.length }))
  if (!connection?.ready) issues.push(issue('TOPOLOGY_PLAYER_ENTRY_MISSING', 'warning', 'roomTopology.issues.playerEntryMissing'))
  for (const node of nodes) {
    if (!node.targetId) issues.push(issue('TOPOLOGY_TARGET_UNASSIGNED', 'error', 'roomTopology.issues.targetUnassigned', { world: node.name }))
    else if (!node.targetOnline) issues.push(issue('TOPOLOGY_TARGET_OFFLINE', 'error', 'roomTopology.issues.targetOffline', { world: node.name, machine: node.targetName }))
    if (node.installationStale || !node.installationAvailable) {
      issues.push(issue('TOPOLOGY_INSTALLATION_UNAVAILABLE', 'warning', 'roomTopology.issues.installationUnavailable', { world: node.name }))
    }
  }
  for (const node of secondaries) {
    if (node.route.state === 'missing') {
      issues.push(issue('TOPOLOGY_SHARD_LINK_MISSING', 'error', 'roomTopology.issues.shardLinkMissing', { world: node.name }))
    }
  }

  const normalizedIssues = uniqueIssues(issues)
  const runtimeRisks = normalizedIssues.filter(isRuntimeRisk)
  const configurationNotices = normalizedIssues.filter(isConfigurationNotice)
  const connectionIssues = normalizedIssues.filter(value => !isRuntimeRisk(value) && !isConfigurationNotice(value))
  const hasNodeError = nodes.some(node => node.placementTone === 'error' || !node.targetOnline)
  const hasNodeWarning = nodes.some(node => node.placementTone === 'warning' || node.installationStale || !node.installationAvailable)
  const status = !nodes.length
    ? 'unavailable'
    : (connectionIssues.some(item => item.severity === 'error') || hasNodeError
        ? 'error'
        : (connectionIssues.some(item => item.severity === 'warning')
            || configurationNotices.some(item => item.severity === 'warning' || item.severity === 'error')
            || hasNodeWarning
            ? 'warning'
            : 'healthy'))
  const observedTargetIds = new Set(nodes.map(node => node.targetId).filter(Boolean))
  const observedAt = oldestTimestamp([...observedTargetIds].map(targetId => targetsById.get(targetId)?.observedAt))

  return {
    roomId: clean(room.id || topology?.roomId),
    roomName: clean(room.name || room.directoryName || topology?.roomId),
    worldCount: nodes.length,
    mode,
    status,
    master: master ? { ...master, shardPort } : null,
    secondaries,
    issues: normalizedIssues,
    connectionIssues,
    configurationNotices,
    runtimeRisks,
    observedAt,
    updatedAt: topology?.updatedAt || '',
    playerEntry: {
      ready: connection?.ready === true,
      endpoint: clean(connection?.endpoint),
      address: clean(connection?.address),
      port: port(connection?.port),
      source: clean(connection?.addressSource || 'missing').toLowerCase(),
      lanAddresses: Array.isArray(connection?.lanAddresses) ? connection.lanAddresses.map(clean).filter(Boolean) : []
    }
  }
}

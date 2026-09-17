export const ROOM_PLACEMENT_MODE = Object.freeze({
  COLOCATED: 'co-located',
  PER_WORLD: 'per-world'
})

function clean(value) {
  return String(value || '').trim()
}

function endpointKey(targetId, installationId) {
  return `${clean(targetId)}\u0000${clean(installationId)}`
}

export function shardLinkEndpointKey(targetId, installationId) {
  return endpointKey(targetId, installationId)
}

export function shardLinkCandidateKey(address, port) {
  return `${clean(address).toLowerCase()}\u0000${Number(port) || 0}`
}

export function shardLinkCandidateMode(candidate = {}) {
  const kind = clean(candidate.kind).toLowerCase()
  return ['lan', 'overlay', 'public', 'configured', 'manual', 'tunnel'].includes(kind)
    ? kind
    : 'manual'
}

function installationKey(targetKey) {
  return targetKey === 'appliedTargetId' ? 'appliedInstallationId' : 'desiredInstallationId'
}

function uniquePlacementEndpoints(placements, targetKey) {
  const installKey = installationKey(targetKey)
  return [...new Set((placements || []).map(placement => endpointKey(
    placement?.[targetKey],
    placement?.[installKey]
  )).filter(value => !value.startsWith('\u0000')))]
}

function placementEndpoint(snapshot, placement, targetKey) {
  const targetId = clean(placement?.[targetKey])
  const installKey = installationKey(targetKey)
  return {
    targetId,
    installationId: runtimeInstallationId(snapshot, targetId, placement?.[installKey])
  }
}

export function runtimeTarget(snapshot = {}, targetId = '') {
  return (snapshot.targets || []).find(target => clean(target.id) === clean(targetId)) || null
}

export function runtimeInstallations(snapshot = {}, targetId = '') {
  const target = runtimeTarget(snapshot, targetId)
  return Array.isArray(target?.installations)
    ? target.installations.filter(item => clean(item?.id))
    : []
}

export function runtimeInstallationId(snapshot = {}, targetId = '', preferred = '') {
  const target = runtimeTarget(snapshot, targetId)
  const installations = runtimeInstallations(snapshot, targetId)
  const requested = clean(preferred)
  if (requested && (!installations.length || installations.some(item => clean(item.id) === requested))) return requested
  return clean(
    target?.defaultInstallationId ||
    installations.find(item => item.default)?.id ||
    installations[0]?.id
  )
}

export function runtimeEndpointLabel(snapshot = {}, targetId = '', installationId = '') {
  const target = runtimeTarget(snapshot, targetId)
  const name = clean(target?.name || targetId) || '--'
  const resolvedInstallationId = runtimeInstallationId(snapshot, targetId, installationId)
  return runtimeInstallations(snapshot, targetId).length > 1 && resolvedInstallationId
    ? `${name} / ${resolvedInstallationId}`
    : name
}

export function deriveRoomPlacementMode(placements = []) {
  return uniquePlacementEndpoints(placements, 'desiredTargetId').length <= 1
    ? ROOM_PLACEMENT_MODE.COLOCATED
    : ROOM_PLACEMENT_MODE.PER_WORLD
}

export function createRoomPlacementDraft(snapshot = {}) {
  const placements = snapshot.placements || []
  const worldTargets = {}
  const worldInstallations = {}
  for (const placement of placements) {
    const worldId = clean(placement.worldId)
    const endpoint = placementEndpoint(snapshot, placement, placement.desiredTargetId ? 'desiredTargetId' : 'appliedTargetId')
    worldTargets[worldId] = endpoint.targetId
    worldInstallations[worldId] = endpoint.installationId
  }
  const entryPlacement = placements.find(placement => placement.worldRole === 'master') || placements[0]
  const entryWorldId = clean(entryPlacement?.worldId)

  return {
    mode: deriveRoomPlacementMode(placements),
    roomTargetId: entryPlacement ? worldTargets[entryWorldId] : '',
    roomInstallationId: entryPlacement ? worldInstallations[entryWorldId] : '',
    worldTargets,
    worldInstallations,
    shardLinks: (snapshot.shardLinks || []).map(link => ({
      sourceTargetId: clean(link.sourceTargetId),
      sourceInstallationId: clean(link.sourceInstallationId),
      address: clean(link.address),
      port: Number(link.port) || 0,
      mode: clean(link.mode) || 'manual'
    }))
  }
}

export function switchRoomPlacementMode(
  snapshot = {},
  draft = {},
  nextMode,
  preservedWorldTargets = null,
  preservedWorldInstallations = null
) {
  const placements = snapshot.placements || []
  const currentMode = draft.mode || ROOM_PLACEMENT_MODE.COLOCATED
  const roomTargetId = clean(draft.roomTargetId)
  const roomInstallationId = runtimeInstallationId(snapshot, roomTargetId, draft.roomInstallationId)
  const currentWorldTargets = { ...(draft.worldTargets || {}) }
  const currentWorldInstallations = { ...(draft.worldInstallations || {}) }

  if (nextMode === currentMode) {
    return {
      draft: { ...draft, worldTargets: currentWorldTargets, worldInstallations: currentWorldInstallations },
      preservedWorldTargets,
      preservedWorldInstallations
    }
  }

  if (nextMode === ROOM_PLACEMENT_MODE.COLOCATED) {
    const entryPlacement = placements.find(placement => placement.worldRole === 'master') || placements[0]
    const entryWorldId = clean(entryPlacement?.worldId)
    const targetId = roomTargetId || clean(currentWorldTargets[entryWorldId])
    return {
      draft: {
        ...draft,
        mode: nextMode,
        roomTargetId: targetId,
        roomInstallationId: runtimeInstallationId(snapshot, targetId, roomInstallationId || currentWorldInstallations[entryWorldId]),
        worldTargets: currentWorldTargets,
        worldInstallations: currentWorldInstallations
      },
      preservedWorldTargets: { ...currentWorldTargets },
      preservedWorldInstallations: { ...currentWorldInstallations }
    }
  }

  if (nextMode === ROOM_PLACEMENT_MODE.PER_WORLD) {
    const worldTargets = {}
    const worldInstallations = {}
    for (const placement of placements) {
      const worldId = clean(placement.worldId)
      const targetId = clean(preservedWorldTargets?.[worldId] || roomTargetId || currentWorldTargets[worldId])
      worldTargets[worldId] = targetId
      worldInstallations[worldId] = runtimeInstallationId(
        snapshot,
        targetId,
        preservedWorldInstallations?.[worldId] || roomInstallationId || currentWorldInstallations[worldId]
      )
    }
    return {
      draft: { ...draft, mode: nextMode, worldTargets, worldInstallations },
      preservedWorldTargets: { ...worldTargets },
      preservedWorldInstallations: { ...worldInstallations }
    }
  }

  return {
    draft: { ...draft, worldTargets: currentWorldTargets, worldInstallations: currentWorldInstallations },
    preservedWorldTargets,
    preservedWorldInstallations
  }
}

export function resolvedRoomPlacementEndpoints(snapshot = {}, draft = {}) {
  const colocated = draft.mode === ROOM_PLACEMENT_MODE.COLOCATED
  return Object.fromEntries((snapshot.placements || []).map(placement => {
    const worldId = clean(placement.worldId)
    const fallback = placementEndpoint(snapshot, placement, placement.desiredTargetId ? 'desiredTargetId' : 'appliedTargetId')
    const targetId = clean(colocated ? draft.roomTargetId : draft.worldTargets?.[worldId]) || fallback.targetId
    const selectedInstallation = colocated ? draft.roomInstallationId : draft.worldInstallations?.[worldId]
    return [worldId, {
      targetId,
      installationId: runtimeInstallationId(snapshot, targetId, selectedInstallation || fallback.installationId)
    }]
  }))
}

export function resolvedRoomPlacementTargets(snapshot = {}, draft = {}) {
  return Object.fromEntries(Object.entries(resolvedRoomPlacementEndpoints(snapshot, draft))
    .map(([worldId, endpoint]) => [worldId, endpoint.targetId]))
}

export function roomPlacementLinkRequirements(snapshot = {}, draft = {}) {
  const endpoints = resolvedRoomPlacementEndpoints(snapshot, draft)
  const placements = snapshot.placements || []
  const masterPlacement = placements.find(placement => placement.worldRole === 'master')
  if (!masterPlacement) return { master: null, secondaries: [], distributed: false }

  const master = endpoints[clean(masterPlacement.worldId)]
  if (!master?.targetId) return { master: null, secondaries: [], distributed: false }

  const secondaries = new Map()
  for (const placement of placements) {
    const worldId = clean(placement.worldId)
    const endpoint = endpoints[worldId]
    if (!endpoint?.targetId || endpoint.targetId === master.targetId) continue
    const key = endpointKey(endpoint.targetId, endpoint.installationId)
    const current = secondaries.get(key) || {
      key,
      sourceTargetId: endpoint.targetId,
      sourceInstallationId: endpoint.installationId,
      worldIds: [],
      worldNames: []
    }
    current.worldIds.push(worldId)
    current.worldNames.push(clean(placement.worldName || worldId))
    secondaries.set(key, current)
  }

  return {
    master: {
      worldId: clean(masterPlacement.worldId),
      targetId: master.targetId,
      installationId: master.installationId
    },
    secondaries: [...secondaries.values()],
    distributed: secondaries.size > 0
  }
}

export function reconciledRoomPlacementShardLinks(snapshot = {}, draft = {}, links = draft.shardLinks || []) {
  const requirements = roomPlacementLinkRequirements(snapshot, draft)
  const selected = new Map((links || []).map(link => [
    endpointKey(link.sourceTargetId, link.sourceInstallationId),
    link
  ]))

  return requirements.secondaries.flatMap(requirement => {
    const link = selected.get(requirement.key)
    const address = clean(link?.address)
    const port = Number(link?.port) || 0
    if (!address || port < 1 || port > 65535) return []
    return [{
      sourceTargetId: requirement.sourceTargetId,
      sourceInstallationId: requirement.sourceInstallationId,
      address,
      port,
      mode: clean(link?.mode) || 'manual'
    }]
  })
}

export function hasCompleteRoomPlacementShardLinks(snapshot = {}, draft = {}) {
  const requirements = roomPlacementLinkRequirements(snapshot, draft)
  return reconciledRoomPlacementShardLinks(snapshot, draft).length === requirements.secondaries.length
}

export function roomPlacementShardLinksChanged(snapshot = {}, draft = {}) {
  return JSON.stringify(shardLinkSignature(snapshot.shardLinks)) !== JSON.stringify(shardLinkSignature(
    reconciledRoomPlacementShardLinks(snapshot, draft)
  ))
}

function shardLinkSignature(links) {
  return (links || []).map(link => ({
    sourceTargetId: clean(link.sourceTargetId),
    sourceInstallationId: clean(link.sourceInstallationId),
    address: clean(link.address).toLowerCase(),
    port: Number(link.port) || 0,
    mode: clean(link.mode) || 'manual'
  })).sort((left, right) => endpointKey(left.sourceTargetId, left.sourceInstallationId)
    .localeCompare(endpointKey(right.sourceTargetId, right.sourceInstallationId)))
}

export function roomPlacementShardLinksPending(snapshot = {}) {
  const applied = Array.isArray(snapshot.appliedShardLinks)
    ? snapshot.appliedShardLinks
    : snapshot.shardLinks
  return JSON.stringify(shardLinkSignature(snapshot.shardLinks)) !== JSON.stringify(shardLinkSignature(applied))
}

export function roomPlacementDiscoveryInput(snapshot = {}, draft = {}, manualCandidates = []) {
  const endpoints = resolvedRoomPlacementEndpoints(snapshot, draft)
  return {
    expectedRevision: snapshot.revision,
    placements: (snapshot.placements || []).map(placement => ({
      worldId: placement.worldId,
      targetId: endpoints[clean(placement.worldId)].targetId,
      installationId: endpoints[clean(placement.worldId)].installationId
    })),
    manualCandidates: (manualCandidates || []).map(candidate => ({
      address: clean(candidate.address),
      port: Number(candidate.port) || 0,
      ...(clean(candidate.name) ? { name: clean(candidate.name) } : {})
    })).filter(candidate => candidate.address)
  }
}

export function roomPlacementInput(snapshot = {}, draft = {}, allowOvercommit = false) {
  const endpoints = resolvedRoomPlacementEndpoints(snapshot, draft)
  return {
    expectedRevision: snapshot.revision,
    allowOvercommit,
    placements: (snapshot.placements || []).map(placement => ({
      worldId: placement.worldId,
      targetId: endpoints[clean(placement.worldId)].targetId,
      installationId: endpoints[clean(placement.worldId)].installationId
    })),
    shardLinks: reconciledRoomPlacementShardLinks(snapshot, draft)
  }
}

export function roomPlacementChanges(snapshot = {}, draft = {}, baseline = 'appliedTargetId') {
  const endpoints = resolvedRoomPlacementEndpoints(snapshot, draft)
  return (snapshot.placements || []).filter(placement => {
    const endpoint = endpoints[clean(placement.worldId)]
    const current = placementEndpoint(snapshot, placement, baseline)
    return endpointKey(endpoint.targetId, endpoint.installationId) !== endpointKey(current.targetId, current.installationId)
  }).map(placement => ({
    ...placement,
    targetId: endpoints[clean(placement.worldId)].targetId,
    installationId: endpoints[clean(placement.worldId)].installationId
  }))
}

export function pendingRoomPlacements(snapshot = {}) {
  return (snapshot.placements || []).filter(placement => {
    const desired = placementEndpoint(snapshot, placement, 'desiredTargetId')
    const applied = placementEndpoint(snapshot, placement, 'appliedTargetId')
    return endpointKey(desired.targetId, desired.installationId) !== endpointKey(applied.targetId, applied.installationId)
  })
}

export function roomPlacementSummary(snapshot = {}, key = 'appliedTargetId') {
  const placements = snapshot.placements || []
  const endpoints = placements.map(placement => placementEndpoint(snapshot, placement, key))
  const targetIds = [...new Set(endpoints.map(endpoint => endpoint.targetId).filter(Boolean))]
  const locations = [...new Map(endpoints
    .filter(endpoint => endpoint.targetId)
    .map(endpoint => [endpointKey(endpoint.targetId, endpoint.installationId), endpoint])).values()]
  return {
    worldCount: placements.length,
    machineCount: targetIds.length,
    endpointCount: locations.length,
    targetIds,
    locations,
    colocated: locations.length <= 1
  }
}

export function isProvisionPlacement(snapshot = {}, placement = {}) {
  const source = runtimeTarget(snapshot, placement.appliedTargetId)
  const target = runtimeTarget(snapshot, placement.desiredTargetId)
  return Boolean(
    source?.kind === 'local' &&
    target && target.kind !== 'local' &&
    placement.state === 'shard_missing'
  )
}

export function placementExecutionBlockers(snapshot = {}) {
  const blockedStates = new Set(['target_offline', 'inventory_stale', 'inventory_missing', 'conflict', 'unknown'])
  return pendingRoomPlacements(snapshot).filter(placement => blockedStates.has(placement.state))
}

export function placementRuntimeInterruptions(snapshot = {}) {
  const pending = pendingRoomPlacements(snapshot)
  const candidates = pending.some(placement => isProvisionPlacement(snapshot, placement))
    ? (snapshot.placements || [])
    : pending
  return candidates.filter(placement => placement.running)
}

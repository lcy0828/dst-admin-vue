import { compareWorldRoles, isWorldSaveWriteFailed } from './worldRuntimeStatus.mjs'

function normalizedWorldType(world = {}) {
  const explicit = String(world.type || '').trim().toLowerCase()
  if (['forest', 'cave', 'unknown'].includes(explicit)) return explicit
  if (String(world.role || '').trim().toLowerCase() === 'caves') return 'cave'
  return 'unknown'
}

function projectedWorld(world = {}) {
  return {
    ...world,
    worldName: world.name,
    type: normalizedWorldType(world),
    updateTime: world.updatedAt,
    targetId: world.placement?.appliedTargetId || world.target?.id || '',
    targetName: world.target?.name || '',
    stateObservedAt: world.stateObservedAt || null,
    stateRuntimeState: world.stateRuntimeState || world.status || 'unknown',
    stateFreshness: world.stateFreshness || 'unavailable',
    stateAgeSeconds: world.stateAgeSeconds ?? null,
    stateStale: world.stateStale ?? true
  }
}

function worldBelongsToTarget(world, targetId) {
  if (!targetId) return true
  return String(world?.placement?.appliedTargetId || world?.target?.id || '').trim() === targetId
}

export function summarizeFleetActivity(snapshot = {}, targets = snapshot.targets || []) {
  const observedTargets = new Map((snapshot.targets || []).map(target => [target.id, target]))
  const groups = new Map(targets.map(target => {
    const observed = observedTargets.get(target.id)
    return [target.id, {
      known: Boolean(target.online && target.configured && observed?.online && observed.configured &&
        observed.inventoryAvailable && !observed.inventoryStale && !observed.observationError),
      worlds: new Set(), rooms: new Set()
    }]
  }))
  for (const room of snapshot.rooms || []) {
    for (const world of room.worlds || []) {
      const group = groups.get(world.placement?.appliedTargetId || world.target?.id || '')
      if (!group) continue
      if (!['running', 'stopped'].includes(world.status)) group.known = false
      if (world.status !== 'running') continue
      group.worlds.add(JSON.stringify([room.id, world.id]))
      group.rooms.add(room.id)
    }
  }
  const allWorlds = new Set()
  const allRooms = new Set()
  let knownTargets = 0
  const byTarget = {}
  for (const [id, group] of groups) {
    byTarget[id] = { state: group.known ? 'known' : 'unknown', worlds: group.worlds.size, rooms: group.rooms.size }
    if (!group.known) continue
    knownTargets++
    for (const world of group.worlds) allWorlds.add(world)
    for (const room of group.rooms) allRooms.add(room)
  }
  return {
    byTarget,
    total: {
      state: !knownTargets ? 'unknown' : (knownTargets === groups.size ? 'known' : 'partial'),
      worlds: allWorlds.size, rooms: allRooms.size
    }
  }
}

export function selectWorkspaceRoom(rooms = [], currentRoomId = '', preferRunning = false) {
  const current = rooms.find(room => room.id === currentRoomId)
  const isRunning = room => room?.worlds?.some(world => world.status === 'running')
  if (preferRunning) {
    if (isRunning(current)) return current
    const running = rooms.find(isRunning)
    if (running) return running
  }
  return current || rooms.find(isRunning) || rooms[0] || null
}

export function projectFleetOverview(snapshot = {}, requestedTargetId = '') {
  const targetId = String(requestedTargetId || '').trim()
  const rooms = (Array.isArray(snapshot.rooms) ? snapshot.rooms : [])
    .map(room => {
      const worlds = (Array.isArray(room.worlds) ? room.worlds : [])
        .filter(world => worldBelongsToTarget(world, targetId))
        .map(projectedWorld)
        .sort(compareWorldRoles)
      return {
        ...room,
        savename: room.name,
        savepath: room.directoryName,
        updateTime: room.updatedAt,
        worlds,
        isRunning: worlds.some(world => world.status === 'running')
      }
    })
    .filter(room => room.worlds.length > 0)

  const targets = (Array.isArray(snapshot.targets) ? snapshot.targets : [])
    .filter(target => !targetId || String(target.id) === targetId)
  const worlds = rooms.flatMap(room => room.worlds)
  const roomIds = new Set(rooms.map(room => String(room.id)))
  const issues = (Array.isArray(snapshot.issues) ? snapshot.issues : []).filter(issue => (
    (!targetId || !issue.targetId || String(issue.targetId) === targetId) &&
    (!issue.roomId || roomIds.has(String(issue.roomId)))
  ))

  return {
    ...snapshot,
    targets,
    rooms,
    issues,
    summary: {
      ...(snapshot.summary || {}),
      targets: targets.length,
      onlineTargets: targets.filter(target => target.online).length,
      rooms: rooms.length,
      mixedRooms: rooms.filter(room => room.mixedPlacement).length,
      worlds: worlds.length,
      running: worlds.filter(world => world.status === 'running').length,
      stopped: worlds.filter(world => world.status === 'stopped').length,
      attention: worlds.filter(world => (
        !['running', 'stopped'].includes(world.status) || isWorldSaveWriteFailed(world)
      )).length
    }
  }
}

const KNOWN_RUNTIME_STATUSES = new Set(['stopped', 'starting', 'running', 'failed', 'stopping'])

function clean(value) {
  return String(value || '').trim()
}

function worldTargetId(world = {}) {
  return clean(world.targetId || world.placement?.appliedTargetId || world.target?.id)
}

function normalizedWorldStatus(world = {}) {
  const status = clean(world.status).toLowerCase()
  return KNOWN_RUNTIME_STATUSES.has(status) ? status : 'unknown'
}

function projectedWorld(world, targetNames) {
  const targetId = worldTargetId(world)
  const desiredTargetId = clean(world.placement?.desiredTargetId)
  return {
    ...world,
    targetId,
    targetName: clean(world.targetName || world.target?.name || targetNames.get(targetId)),
    desiredTargetName: clean(targetNames.get(desiredTargetId)),
    status: normalizedWorldStatus(world)
  }
}

export function projectRoomList(overview = {}, selectedTargetId = '') {
  const scopedTargetId = clean(selectedTargetId)
  const targetNames = new Map((overview.targets || []).map(target => [clean(target.id), clean(target.name)]))

  return (overview.rooms || []).map(room => {
    const allWorlds = (room.worlds || []).map(world => projectedWorld(world, targetNames))
    const worlds = scopedTargetId
      ? allWorlds.filter(world => world.targetId === scopedTargetId)
      : allWorlds
    const targetIds = [...new Set(worlds.map(world => world.targetId).filter(Boolean))]
    const allTargetIds = [...new Set(allWorlds.map(world => world.targetId).filter(Boolean))]
    const controlAvailable = typeof room.controlAvailable === 'boolean'
      ? room.controlAvailable
      : worlds.some(world => world.controlAvailable !== false)

    return {
      ...room,
      id: room.name || room.id,
      roomId: room.id,
      directoryName: room.directoryName || room.savepath || '',
      savepath: room.directoryName || room.savepath || '',
      updateTime: room.updatedAt || room.updateTime || '',
      worlds,
      allWorlds,
      targetIds,
      allTargetIds,
      controlAvailable,
      isRunning: worlds.some(world => world.status === 'running')
    }
  }).filter(room => room.worlds.length > 0)
}

export function roomRuntimeSummary(room = {}) {
  const worlds = Array.isArray(room.worlds) ? room.worlds : []
  const counts = {
    total: worlds.length,
    running: 0,
    stopped: 0,
    starting: 0,
    stopping: 0,
    failed: 0,
    unknown: 0
  }
  for (const world of worlds) {
    counts[normalizedWorldStatus(world)]++
  }

  const transitioning = counts.starting + counts.stopping
  const attention = counts.failed + counts.unknown
  let state = 'unavailable'
  if (transitioning > 0) state = 'transitioning'
  else if (attention > 0) state = counts.running > 0 ? 'partial' : 'attention'
  else if (counts.total > 0 && counts.running === counts.total) state = 'running'
  else if (counts.running > 0) state = 'partial'
  else if (counts.total > 0 && counts.stopped === counts.total) state = 'stopped'

  return { ...counts, transitioning, attention, state }
}

export function worldMachineName(world = {}, localLabel = 'Local machine', unknownLabel = 'Unknown machine') {
  if (clean(world.targetName)) return clean(world.targetName)
  return worldTargetId(world) === 'local' ? localLabel : unknownLabel
}

export function worldPlacementNotice(world = {}) {
  const placement = world.placement || {}
  const appliedTargetId = clean(placement.appliedTargetId)
  const desiredTargetId = clean(placement.desiredTargetId)
  const appliedInstallationId = clean(placement.appliedInstallationId)
  const desiredInstallationId = clean(placement.desiredInstallationId)
  const pending = Boolean(desiredTargetId) && (
    desiredTargetId !== appliedTargetId || desiredInstallationId !== appliedInstallationId
  )
  return {
    pending,
    state: clean(placement.state) || 'unknown',
    desiredTargetName: clean(world.desiredTargetName)
  }
}

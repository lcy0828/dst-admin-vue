export function batchTargetKey(roomId, worldId) {
  return `${String(roomId)}:${String(worldId)}`
}

export function selectedBatchRooms(rooms, selection) {
  return (rooms || [])
    .map(room => ({
      roomId: room.id,
      worldIds: Array.isArray(selection?.[room.id]) ? selection[room.id] : [],
    }))
    .filter(room => room.worldIds.length > 0)
}

export function attachBatchWorldTargets(worlds, topology) {
  const placements = new Map((topology?.placements || []).map(placement => [placement.worldId, placement]))
  const targets = new Map((topology?.targets || []).map(target => [target.id, target]))
  return (worlds || []).map(world => {
    const placement = placements.get(world.id)
    const targetId = placement?.appliedTargetId || ''
    return {
      ...world,
      runtimeTargetId: targetId,
      runtimeTargetName: targets.get(targetId)?.name || targetId,
    }
  })
}

export function unsuccessfulBatchSelection(job, rooms) {
  const unsuccessful = new Set(
    (job?.targets || [])
      .filter(target => target.status !== 'succeeded')
      .map(target => String(target.targetId || ''))
  )

  return Object.fromEntries((rooms || []).map(room => [
    room.id,
    (room.worlds || [])
      .filter(world => unsuccessful.has(batchTargetKey(room.id, world.id)))
      .map(world => world.id),
  ]))
}

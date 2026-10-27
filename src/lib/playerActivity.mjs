// Never interpolate across players, worlds, runtime instances or collection gaps.
export function activityPaths(events = []) {
  const paths = []
  // Gap timestamps describe discovery, not an exact missing-action time. For
  // affected worlds on this page, show points without inventing connections.
  const gapWorlds = new Set(events.filter(e => e.kind === 'collection.gap').map(e => e.worldId))
  let current
  for (const event of [...events].reverse()) {
    if (event.kind?.startsWith('collection.')) { current = null; continue }
    const p = event.position
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) continue
    const key = `${event.userId}/${event.worldId}/${event.producerInstanceId}`
    if (!current || current.key !== key || gapWorlds.has(event.worldId)) { current = { key, worldId: event.worldId, points: [] }; paths.push(current) }
    current.points.push({ x: p.x, z: p.z, at: event.occurredAt, kind: event.kind })
  }
  return paths
}
export function activityPlot(paths) {
  const points = paths.flatMap(path => path.points)
  if (!points.length) return []
  const xs = points.map(p => p.x), zs = points.map(p => p.z)
  const minX = Math.min(...xs), minZ = Math.min(...zs)
  const scale = Math.min(560 / Math.max(1, Math.max(...xs) - minX), 240 / Math.max(1, Math.max(...zs) - minZ))
  return paths.map(path => ({ ...path, line: path.points.map(p => `${20 + (p.x - minX) * scale},${260 - (p.z - minZ) * scale}`).join(' ') }))
}
export function activityQuery({ userId = '', worldId = '', kind = '', hours = '24', before = '', now = Date.now() } = {}) {
  return { ...(userId.trim() ? { userId: userId.trim() } : {}), ...(worldId ? { worldId } : {}), ...(kind ? { kind } : {}), from: new Date(now - Number(hours) * 3600_000).toISOString(), to: new Date(now).toISOString(), ...(before ? { before } : {}), limit: 100 }
}

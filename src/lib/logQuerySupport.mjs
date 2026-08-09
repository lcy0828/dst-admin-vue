const positiveInteger = (value, fallback) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function normalizeLogSources(items) {
  if (!Array.isArray(items)) return []
  return items.flatMap(item => {
    const id = String(item?.room_id || item?.id || item?.archive_name || '').trim()
    const name = String(item?.archive_name || item?.name || '').trim()
    if (!id || !name) return []
    const worlds = Array.isArray(item.worlds) ? item.worlds.flatMap(world => {
      if (typeof world === 'string') {
        const value = world.trim()
        return value ? [{ id: value, name: value }] : []
      }
      const worldId = String(world?.world_id || world?.id || world?.world_name || world?.name || '').trim()
      const worldName = String(world?.world_name || world?.name || '').trim()
      return worldId && worldName ? [{ id: worldId, name: worldName }] : []
    }) : []
    return [{ id, name, worlds }]
  })
}

export function buildStructuredLogFilter(params = {}, worldId = '') {
  const limit = Math.min(100, positiveInteger(params.page_size, 20))
  const page = positiveInteger(params.page, 1)
  return {
    worldId: worldId || undefined,
    type: String(params.type || '').trim() || undefined,
    query: String(params.query || '').trim() || undefined,
    limit,
    offset: (page - 1) * limit
  }
}

export function normalizeStructuredLogList(response = {}) {
  const lastRefreshedAt = response.lastRefreshedAt || null
  const snapshotState = ['uninitialized', 'ready', 'cleared'].includes(response.snapshotState)
    ? response.snapshotState
    : (lastRefreshedAt ? 'ready' : 'uninitialized')
  return {
    logs: (Array.isArray(response.items) ? response.items : []).map(item => ({
      id: item.id,
      room_id: item.roomId,
      world_id: item.worldId,
      world_name: item.worldName,
      log_type: item.type,
      content: item.content,
      raw_content: item.rawContent,
      timestamp: item.occurredAt || item.observedAt,
      rule_id: item.ruleId,
      rule_name: item.ruleName
    })),
    total: Number(response.total) || 0,
    counts: response.counts && typeof response.counts === 'object' ? response.counts : {},
    snapshot_state: snapshotState,
    snapshot_updated_at: response.snapshotUpdatedAt || lastRefreshedAt,
    last_refreshed_at: lastRefreshedAt
  }
}

export function structuredLogSnapshotKey(roomId, worldId) {
  const room = String(roomId || '').trim()
  const world = String(worldId || '').trim()
  return room && world ? `${room}:${world}` : ''
}

export function shouldBootstrapStructuredLogs({ roomId, worldId, snapshotState, lastRefreshedAt, attemptedKeys = [] } = {}) {
  const key = structuredLogSnapshotKey(roomId, worldId)
  const state = ['uninitialized', 'ready', 'cleared'].includes(snapshotState)
    ? snapshotState
    : (lastRefreshedAt ? 'ready' : 'uninitialized')
  return Boolean(key && state === 'uninitialized' && !attemptedKeys.includes(key))
}

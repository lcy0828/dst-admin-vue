export function playerHistoryTime(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.getUTCFullYear() >= 2000 ? value : null
}

export function playerWorldConfirmed(player) {
  if (typeof player?.world_confirmed === 'boolean') return player.world_confirmed
  const world = player?.field_states?.world
  if (world) return world.status !== 'unavailable' && Boolean(playerHistoryTime(world.observedAt))
  return Boolean(player?.world_name) && ['alive', 'dead', 'ghost', 'migrating'].includes(player?.gameplay_state)
}

// Keep historical world evidence available without presenting it as a current
// location. Cluster-wide online observations do not establish a shard.
export function playerWorldFields(player) {
  const confirmed = player?.worldConfirmed !== false
  const hasHistory = Boolean(playerHistoryTime(player?.fields?.world?.observedAt))
  return {
    world_id: !confirmed && player?.online ? '' : (player?.worldId || ''),
    world_name: confirmed ? (player?.worldName || '') : '',
    world_confirmed: player?.worldConfirmed,
    local_entity: player?.localEntity,
    last_world_id: hasHistory ? (player?.worldId || '') : '',
    last_world_name: hasHistory ? (player?.worldName || '') : ''
  }
}

export function playerLocationPending(player) {
  return player?.status === 'online' && !playerWorldConfirmed(player)
}

// Counts describe actual local entities, including a migrating entity still
// present on a shard. This does not make its location safe for a live action.
export function playerLocalWorldIds(player) {
  if (player?.status !== 'online' || player?.local_entity === false) return []
  if (!playerWorldConfirmed(player) && player?.local_entity !== true) return []
  if (Array.isArray(player?.observed_world_ids) && player.observed_world_ids.length) return [...new Set(player.observed_world_ids.filter(Boolean))]
  return playerWorldConfirmed(player) && player?.world_id ? [player.world_id] : []
}

export function playerLastWorld(player) {
  if (player?.last_world_name) return player.last_world_name
  return playerHistoryTime(player?.field_states?.world?.observedAt) ? (player?.world_name || '') : ''
}

export function playerLastObservation(player) {
  const seen = playerHistoryTime(player?.last_seen)
  const disconnected = playerHistoryTime(player?.last_disconnected_at)
  const connected = playerHistoryTime(player?.last_connected_at)
  if (seen && player?.last_seen_source === 'native-log') {
    if (disconnected && new Date(disconnected).getTime() === new Date(seen).getTime()) {
      return { key: 'lastDisconnectedAt', time: disconnected }
    }
    if (connected && new Date(connected).getTime() === new Date(seen).getTime()) {
      return { key: 'lastConnectedAt', time: connected }
    }
    return { key: 'lastActivityAt', time: seen }
  }
  return seen ? { key: 'lastSampledAt', time: seen } : { key: 'lastSeenUnknown', time: null }
}

// Connection events and telemetry samples describe different things.
export function playerListPresenceTime(player) {
  const connected = playerHistoryTime(player?.last_connected_at)
  const disconnected = playerHistoryTime(player?.last_disconnected_at)
  if (player?.status === 'stale') {
    const observed = playerHistoryTime(player.presence_observed_at)
    if (observed) return { key: 'presenceObservedAt', time: observed }
  } else if (player?.status === 'online') {
    if (connected) return { key: 'lastConnected', time: connected }
  } else if (disconnected && (!connected || new Date(disconnected) >= new Date(connected))) {
    return { key: 'lastDisconnected', time: disconnected }
  } else if (connected) {
    return { key: 'lastConnected', time: connected }
  }
  const sampled = playerHistoryTime(player?.last_refreshed_at)
  if (sampled) return { key: 'lastRefreshed', time: sampled }
  return { key: 'lastSeen', time: playerHistoryTime(player?.last_seen) }
}

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

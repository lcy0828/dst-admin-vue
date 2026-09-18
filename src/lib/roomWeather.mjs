import { isMasterWorld } from './worldRuntimeStatus.mjs'

export const ROOM_WEATHER_PREFERENCE = 'dst-admin-room-weather'

// Use existing runtime snapshots only. Weather decoration never requests active
// game collection, infers weather from the season, or substitutes another shard.
export function resolveRoomWeather(room, snapshots = []) {
  const master = room?.worlds?.find(isMasterWorld)
  if (!master) return null
  const snapshot = snapshots.find(item => item.worldId === master.id && (!item.roomId || item.roomId === room.id))
  const context = { roomId: room.id, roomName: room.name, worldId: master.id, worldName: master.name }
  if (!snapshot || snapshot.stale || snapshot.observationError || !['live', 'paused'].includes(snapshot.freshness)
    || !['running', 'paused'].includes(snapshot.runtimeState || master.runtimeStatus || master.status)) {
    return { ...context, available: false }
  }
  const rate = typeof snapshot.precipitationRate === 'number' && Number.isFinite(snapshot.precipitationRate)
    ? Math.max(0, Math.min(1, snapshot.precipitationRate)) : 0.45
  return {
    ...context, available: true,
    season: ['spring', 'summer', 'autumn', 'winter'].includes(snapshot.season) ? snapshot.season : '',
    phase: ['day', 'dusk', 'night'].includes(snapshot.phase) ? snapshot.phase : '',
    precipitation: snapshot.precipitation || 'none',
    effect: ['rain', 'acid_rain'].includes(snapshot.precipitation) ? 'rain'
      : snapshot.precipitation === 'snow' ? 'snow' : 'none',
    intensity: rate,
    paused: snapshot.paused === true || snapshot.freshness === 'paused'
  }
}

export function previewRoomWeather(precipitation, { season = precipitation === 'snow' ? 'winter' : 'spring', phase = 'day', intensity = 0.7, paused = false } = {}) {
  return {
    available: true, roomId: 'preview', worldId: 'preview', preview: true,
    effect: ['rain', 'acid_rain'].includes(precipitation) ? 'rain' : precipitation === 'snow' ? 'snow' : 'none',
    precipitation, intensity, paused, season, phase
  }
}

export function weatherParticleCount(effect, width, height, intensity = 0.5) {
  const density = effect === 'rain' ? 230 : 135
  const area = Math.max(0, width * height) / (1280 * 900)
  return Math.round(Math.min(width < 640 ? 100 : 380, area * density * 1.45 * Math.sqrt(Math.max(0, Math.min(1, intensity)))))
}

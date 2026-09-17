import test from 'node:test'
import assert from 'node:assert/strict'
import { previewRoomWeather, resolveRoomWeather, weatherParticleCount } from '../src/lib/roomWeather.mjs'

const room = { id: 'room', name: 'Room', worlds: [
  { id: 'caves', name: 'Master', isMaster: false, role: 'caves', status: 'running' },
  { id: 'forest', name: 'Forest', isMaster: true, status: 'running' }
] }
const live = { roomId: 'room', worldId: 'forest', runtimeState: 'running', freshness: 'live', season: 'winter', phase: 'day', precipitation: 'snow', precipitationRate: 0.6 }

test('weather follows the explicit master of the selected room, never another shard or room', () => {
  const snow = resolveRoomWeather(room, [{ ...live, worldId: 'caves', precipitation: 'rain' }, live])
  assert.equal(snow.effect, 'snow')
  assert.equal(snow.worldId, 'forest')
  assert.equal(snow.intensity, 0.6)
  assert.equal(resolveRoomWeather(room, [{ ...live, roomId: 'other' }]).available, false)
  assert.equal(resolveRoomWeather(room, [{ ...live, worldId: 'caves' }]).available, false)
  assert.equal(resolveRoomWeather({ ...room, worlds: [room.worlds[0]] }, [live]), null)
})

test('unavailable, stopped or stale data does not animate old weather', () => {
  for (const patch of [{ stale: true }, { observationError: 'offline' }, { freshness: 'delayed' }, { freshness: 'stopped' }, { runtimeState: 'stopped' }, { freshness: 'unavailable' }]) {
    assert.equal(resolveRoomWeather(room, [{ ...live, ...patch }]).available, false, JSON.stringify(patch))
  }
  assert.equal(resolveRoomWeather(room, []).available, false)
  assert.equal(resolveRoomWeather(null, [live]), null)
})

test('paused games retain their season and expose paused motion independently of capture time', () => {
  const paused = resolveRoomWeather(room, [{ ...live, freshness: 'paused', capturedAt: '2020-01-01T00:00:00Z' }])
  assert.equal(paused.available, true)
  assert.equal(paused.paused, true)
  assert.equal(paused.season, 'winter')
  assert.equal(resolveRoomWeather(room, [{ ...live, paused: true }]).paused, true)
})

test('seasons do not fabricate precipitation, and rainfall strength stays bounded', () => {
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    assert.equal(resolveRoomWeather(room, [{ ...live, season, precipitation: 'none' }]).effect, 'none')
  }
  assert.equal(resolveRoomWeather(room, [{ ...live, precipitation: 'lunar_hail' }]).effect, 'none')
  assert.equal(resolveRoomWeather(room, [{ ...live, precipitation: 'rain', precipitationRate: 2 }]).intensity, 1)
  assert.equal(resolveRoomWeather(room, [{ ...live, precipitationRate: -1 }]).intensity, 0)
  assert.equal(resolveRoomWeather(room, [{ ...live, precipitationRate: undefined }]).intensity, 0.45)
})

test('particles adapt to viewport and rainfall while staying capped on mobile and large screens', () => {
  for (const effect of ['rain', 'snow']) {
    assert(weatherParticleCount(effect, 1280, 900, 0.8) > weatherParticleCount(effect, 1280, 900, 0.1))
    assert(weatherParticleCount(effect, 7680, 4320, 1) <= 380)
    assert(weatherParticleCount(effect, 390, 5000, 1) <= 100)
    assert.equal(weatherParticleCount(effect, 0, 0), 0)
    assert.equal(weatherParticleCount(effect, 1280, 900, 0), 0)
  }
})

test('manual preview keeps season, time, precipitation and pause independent of the room', () => {
  const source = { season: 'summer', phase: 'night', intensity: 0.25, paused: true }
  const snow = previewRoomWeather('snow', source)
  assert.equal(snow.season, 'summer')
  assert.equal(snow.phase, 'night')
  assert.equal(snow.effect, 'snow')
  assert.equal(snow.intensity, 0.25)
  assert.equal(snow.paused, true)
  assert.equal(snow.preview, true)
  assert.equal(previewRoomWeather('acid_rain', source).effect, 'rain')
  assert.equal(previewRoomWeather('none', source).effect, 'none')
  assert.equal(previewRoomWeather('snow').paused, false)
})

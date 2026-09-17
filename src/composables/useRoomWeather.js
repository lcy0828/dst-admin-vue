import { computed, inject, onBeforeUnmount, provide, ref, shallowRef } from 'vue'
import { previewRoomWeather, ROOM_WEATHER_PREFERENCE } from '@/lib/roomWeather.mjs'

const roomWeatherKey = Symbol.for('dst-admin:room-weather')

export function provideRoomWeather() {
  const source = shallowRef(null)
  const enabled = ref(false)
  const preview = shallowRef(null)
  let previewTimer
  try { enabled.value = localStorage.getItem(ROOM_WEATHER_PREFERENCE) === 'true' } catch { /* Optional browser preference. */ }

  function stopPreview() {
    clearTimeout(previewTimer)
    preview.value = null
  }
  function setEnabled(value) {
    enabled.value = Boolean(value)
    if (!enabled.value) stopPreview()
    try { localStorage.setItem(ROOM_WEATHER_PREFERENCE, String(enabled.value)) } catch { /* Session preference still works. */ }
  }
  function showPreview(effect) {
    if (!['rain', 'snow'].includes(effect)) return
    stopPreview()
    preview.value = previewRoomWeather(effect)
    previewTimer = setTimeout(stopPreview, 10_000)
  }
  function startManualPreview() {
    clearTimeout(previewTimer)
    if (preview.value?.manual) return
    // Always show motion when entering manual preview, including paused rooms.
    preview.value = { ...(preview.value || previewRoomWeather('snow')), paused: false, manual: true }
  }
  function updateManualPreview(changes) {
    startManualPreview()
    const next = { ...preview.value, ...changes }
    preview.value = { ...previewRoomWeather(next.precipitation, next), manual: true }
  }
  function setSource(value) {
    if (source.value?.roomId !== value?.roomId) stopPreview()
    source.value = value
  }
  const state = {
    source, enabled, preview, setEnabled, setSource, showPreview, stopPreview, startManualPreview, updateManualPreview,
    weather: computed(() => preview.value || (enabled.value && source.value?.available ? source.value : null))
  }
  provide(roomWeatherKey, state)
  onBeforeUnmount(stopPreview)
  return state
}

export function useRoomWeather() {
  return inject(roomWeatherKey, null)
}

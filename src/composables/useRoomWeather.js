import { computed, inject, onBeforeUnmount, onMounted, provide, ref, shallowRef, watch } from 'vue'
import { previewRoomWeather, ROOM_WEATHER_PREFERENCE } from '@/lib/roomWeather.mjs'

import { worldStatesV2API } from '@/api/v2'
import { getScopedRuntimeOverview } from '@/api/v2LegacyAdapters'
import { createRoomWeatherFeed } from '@/lib/roomWeatherFeed.mjs'
import { managementScopeTargetId, MANAGEMENT_SCOPE_CHANGED_EVENT } from '@/lib/managementScope.mjs'
import { readWorkspaceSelection, ROOM_SELECTION_CHANGED_EVENT } from '@/lib/workspacePreferences.mjs'
import { useRoomRefreshInterval } from '@/composables/useDashboardRefreshIntervals'

const roomWeatherKey = Symbol.for('dst-admin:room-weather')

export function provideRoomWeather() {
  const source = shallowRef(null)
  const enabled = ref(true)
  const preview = shallowRef(null)
  const { refreshIntervalMs } = useRoomRefreshInterval()
  const visible = ref(!document.hidden)
  const targetId = ref(managementScopeTargetId())
  const roomId = ref(readWorkspaceSelection(targetId.value).roomId)
  let mounted = false
  let previewTimer
  try { enabled.value = localStorage.getItem(ROOM_WEATHER_PREFERENCE) !== 'false' } catch { /* Optional browser preference. */ }

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
    // An explicit manual selection starts from the currently displayed weather.
    // Opening the controls never calls this method.
    const current = preview.value || (source.value?.available ? source.value : previewRoomWeather('none'))
    preview.value = { ...previewRoomWeather(current.precipitation, current), manual: true }
  }
  function updateManualPreview(changes) {
    startManualPreview()
    const next = { ...preview.value, ...changes }
    preview.value = { ...previewRoomWeather(next.precipitation, next), manual: true }
  }
  function setMode(value) {
    if (value === 'manual') startManualPreview()
    else if (value === 'automatic' || value === 'off') {
      stopPreview()
      setEnabled(value === 'automatic')
    }
  }
  function setSource(value) {
    source.value = value
  }
  const feed = createRoomWeatherFeed({ loadOverview: getScopedRuntimeOverview,
    loadStates: worldStatesV2API.list, publish: setSource, interval: () => refreshIntervalMs.value })
  function syncFeed() {
    feed.configure({ targetId: targetId.value, roomId: roomId.value,
      active: mounted && visible.value && enabled.value && !preview.value })
  }
  function scopeChanged() {
    targetId.value = managementScopeTargetId()
    roomId.value = readWorkspaceSelection(targetId.value).roomId
    syncFeed()
  }
  function selectionChanged(event) {
    if ((event.detail?.targetId || '') !== targetId.value) return
    roomId.value = event.detail.roomId || ''
    syncFeed()
  }
  function visibilityChanged() { visible.value = !document.hidden }
  watch([enabled, preview, visible], syncFeed)
  onMounted(() => {
    mounted = true
    window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, scopeChanged)
    window.addEventListener(ROOM_SELECTION_CHANGED_EVENT, selectionChanged)
    document.addEventListener('visibilitychange', visibilityChanged)
    syncFeed()
  })
  const state = {
    mode: computed(() => preview.value ? 'manual' : enabled.value ? 'automatic' : 'off'),
    claimWorkspace: feed.claimWorkspace, setMode, source, enabled, preview, setEnabled, setSource, showPreview, stopPreview, startManualPreview, updateManualPreview,
    weather: computed(() => preview.value || (enabled.value && source.value?.available ? source.value : null))
  }
  provide(roomWeatherKey, state)
  onBeforeUnmount(() => {
    mounted = false
    feed.dispose()
    stopPreview()
    window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, scopeChanged)
    window.removeEventListener(ROOM_SELECTION_CHANGED_EVENT, selectionChanged)
    document.removeEventListener('visibilitychange', visibilityChanged)
  })
  return state
}

export function useRoomWeather() {
  return inject(roomWeatherKey, null)
}

export function useRoomWeatherSource() {
  const workspace = useRoomWeather()?.claimWorkspace()
  onBeforeUnmount(() => workspace?.release())
  return (room, snapshots) => workspace?.publish(room, snapshots)
}

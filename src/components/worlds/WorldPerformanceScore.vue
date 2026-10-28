<script>
import { createAsyncResourceCache } from '@/lib/asyncResourceCache.mjs'
const roomReports = new Map()
function roomCache(roomId) {
  if (!roomReports.has(roomId)) {
    if (roomReports.size >= 16) roomReports.delete(roomReports.keys().next().value)
    roomReports.set(roomId, createAsyncResourceCache({ ttlMs: 15000 }))
  }
  return roomReports.get(roomId)
}
</script>
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { performanceV2API } from '@/api/v2'
import WorldPerformanceIndicator from '@/components/worlds/WorldPerformanceIndicator.vue'
import { performanceIndicator } from '@/lib/performanceIndicator.mjs'
const props = defineProps({ roomId: { type: String, required: true }, worldId: { type: String, required: true }, running: Boolean, paused: Boolean, nativeScore: { type: Number, default: null }, nativeAvailable: Boolean })
const point = ref(null), loadState = ref('pending')
let alive = true, sequence = 0, timer
const indicator = computed(() => performanceIndicator({ running: props.running, paused: props.paused, point: point.value, loadState: loadState.value }))
const value = computed(() => indicator.value.value)
const state = computed(() => indicator.value.state)
async function read() {
  clearTimeout(timer)
  const current = ++sequence, room = props.roomId, world = props.worldId
  if (!alive || !props.running || props.paused || document.hidden) { point.value = null; return }
  try {
    const result = await roomCache(room).load(() => performanceV2API.report(room, { from: new Date(Date.now() - 600000).toISOString(), maxPoints: 120 }))
    if (!alive || current !== sequence || room !== props.roomId || world !== props.worldId) return
    const latest = result.items.filter(item => item.worldId === world).at(-1)
    const fresh = latest && Date.now() - Date.parse(latest.at) < Math.max(120000, result.resolutionSeconds * 2000)
    point.value = fresh ? latest : null
    loadState.value = latest && !fresh ? 'unavailable' : 'pending'
  } catch { if (alive && current === sequence) { point.value = null; loadState.value = 'unavailable' } }
  finally { if (alive && current === sequence && props.running && !props.paused && !document.hidden) timer = setTimeout(read, 30000) }
}
watch(() => [props.roomId, props.worldId, props.running, props.paused], () => { point.value = null; loadState.value = 'pending'; void read() })
onMounted(() => { void read(); document.addEventListener('visibilitychange', read) })
onBeforeUnmount(() => { alive = false; sequence++; clearTimeout(timer); document.removeEventListener('visibilitychange', read) })
</script>
<template>
  <WorldPerformanceIndicator
    :score="nativeScore"
    :available="nativeAvailable"
    :simulation-score="value"
    :sampling-state="state"
  />
</template>

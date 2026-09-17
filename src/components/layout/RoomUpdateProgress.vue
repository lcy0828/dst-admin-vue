<script setup>
import { computed, ref, watch } from 'vue'
import { modsV2API, roomsV2API, runtimeTargetsV2API } from '@/api/v2'
import { useSharedJobStatus } from '@/composables/useGlobalJobStatus'
import { isTaskProgressJob, taskProgress, readableTaskText } from '@/lib/taskProgress.mjs'
import { globalJobWarning } from '@/lib/globalJobs.mjs'
import { globalJobKindLabel } from '@/i18n/globalJobMessages'
import { useI18n } from 'vue-i18n'
import TaskProgressDock from './TaskProgressDock.vue'

const {
  activeJobs, recentProgressJobs, focusedJobId, dockMinimized, dockExpanded,
  connected, taskListOpen, roomLabels, rememberRoomLabel, jobLabels, closedProgressIds, closeJobProgress
} = useSharedJobStatus()
const { t } = useI18n()
const candidates = computed(() => [...activeJobs.value.filter(isTaskProgressJob), ...recentProgressJobs.value].filter(job => !closedProgressIds.value.includes(job.id)))
const selected = computed(() => candidates.value.find(job => job.id === focusedJobId.value) || candidates.value[0])
const targetLabels = ref({ local: t('servers.list.targets.local') })
const modMetadata = ref({})
const metadataRequested = new Set()
// One cached display read per Mod while the dock is mounted. Progress ticks
// never check Workshop versions or fetch community pages.
watch(() => JSON.stringify([...new Set(candidates.value.flatMap(job => [job.progressDetail?.workshopId, ...(job.progressDetail?.items || []).map(item => item.workshopId)]).filter(Boolean))]), async value => {
  const visibleIds = new Set(JSON.parse(value))
  for (const id of metadataRequested) { if (!visibleIds.has(id)) metadataRequested.delete(id) }
  modMetadata.value = Object.fromEntries(Object.entries(modMetadata.value).filter(([id]) => visibleIds.has(id)))
  const ids = [...visibleIds].filter(id => !metadataRequested.has(id))
  ids.forEach(id => metadataRequested.add(id))
  for (let start = 0; start < ids.length; start += 100) {
    try {
      const response = await modsV2API.metadata(ids.slice(start, start + 100), { cached: true })
      modMetadata.value = { ...modMetadata.value, ...response.items }
    } catch { /* Display fallback remains usable; do not retry on every tick. */ }
  }
}, { immediate: true })
const taskOptions = computed(() => candidates.value.map(job => ({
  id: job.id, label: [readableTaskText(jobLabels.value[job.id] || roomLabels.value[job.roomId] || job.targets?.[0]?.name, targetLabels.value), globalJobKindLabel(job.kind, t)].filter(Boolean).join(' · '),
  status: taskProgress(job).status
})))
const targetNames = ref([])

watch(() => activeJobs.value.filter(isTaskProgressJob).map(job => job.id), (ids, before = []) => {
  const added = ids.find(id => !before.includes(id))
  if (added && !focusedJobId.value) {
    focusedJobId.value = added
    dockMinimized.value = false
    dockExpanded.value = false
  }
}, { immediate: true })

// Resolve labels once when the selected task changes, never per progress tick.
watch(() => selected.value?.id, async (jobId, _, onCleanup) => {
  targetNames.value = []
  if (!jobId) return
  const roomId = selected.value.roomId
  let current = true
  onCleanup(() => { current = false })
  const [room, targets] = await Promise.allSettled([roomId ? roomsV2API.get(roomId) : null, runtimeTargetsV2API.list()])
  if (!current) return
  if (targets.status === 'fulfilled') {
    targetLabels.value = { ...targetLabels.value, ...Object.fromEntries((targets.value.items || []).map(target => [target.id, target.name || target.displayName || ''])) }
  }
  if (room.status === 'fulfilled' && room.value) {
    rememberRoomLabel(roomId, room.value.name)
    const ids = room.value.targetIds || []
    if (targets.status === 'fulfilled') {
      targetNames.value = (targets.value.items || []).filter(target => ids.includes(target.id))
        .map(target => target.name || target.displayName || target.id)
    }
  }
}, { immediate: true })

watch(() => [selected.value?.id, selected.value && taskProgress(selected.value).status, selected.value && globalJobWarning(selected.value).message, dockExpanded.value, dockMinimized.value], (_, __, onCleanup) => {
  if (!selected.value || taskProgress(selected.value).status !== 'succeeded' || globalJobWarning(selected.value).message || dockExpanded.value || dockMinimized.value) return
  const timer = setTimeout(() => {
    if (dockExpanded.value || dockMinimized.value) return
    const next = activeJobs.value.find(isTaskProgressJob)
    if (next) focusedJobId.value = next.id
    else dockMinimized.value = true
  }, 5_000)
  onCleanup(() => clearTimeout(timer))
}, { immediate: true })
</script>

<template>
  <TaskProgressDock
    v-if="selected"
    :job="selected"
    :display-name="jobLabels[selected.id] || ''"
    :task-options="taskOptions"
    v-model:expanded="dockExpanded"
    v-model:minimized="dockMinimized"
    :room-name="roomLabels[selected.roomId] || ''"
    :target-names="targetNames"
    :target-labels="targetLabels"
    :mod-metadata="modMetadata"
    :connected="connected"
    :other-count="Math.max(0, activeJobs.length - (selected.status === 'running' || selected.status === 'queued' ? 1 : 0))"
    @tasks="taskListOpen = true"
    @select="focusedJobId = $event"
    @close="closeJobProgress(selected.id)"
  />
</template>

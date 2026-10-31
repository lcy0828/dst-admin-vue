<script setup>
import { computed, ref, watch } from 'vue'
import { modsV2API, roomsV2API, runtimeTargetsV2API } from '@/api/v2'
import { useGameUpdate } from '@/composables/useGameUpdate'
import { useSoftwareUpdate } from '@/composables/useSoftwareUpdate'
import { softwareUpdateTask } from '@/lib/softwareUpdate.mjs'
import { gameReleaseIsTerminal } from '@/lib/gameRelease.mjs'
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
const gameUpdate = useGameUpdate()
const softwareUpdate = useSoftwareUpdate()
const softwareSeen = ref('')
watch(() => softwareUpdate.state.snapshot?.operation, operation => {
  if (operation && (['downloading', 'verifying', 'prepared', 'restarting'].includes(operation.phase) || Date.now() - Date.parse(operation.updatedAt) < 600_000)) softwareSeen.value = operation.id
}, { immediate: true })
const softwareTask = computed(() => softwareUpdateTask(softwareUpdate.state, softwareSeen.value))
const gameRecords = computed(() => gameUpdate.state.records)
const gameTask = computed(() => {
  const release = gameUpdate.pending.value || gameUpdate.state.accepted
  if (!release?.id) return null
  const jobId = release.currentJobId || release.sourceJobId || release.id
  const status = release.stage === 'recovery_required' ? 'failed' : 'running'
  return { id: jobId, kind: 'game.release', status, createdAt: release.createdAt, progressDetail: { phase: 'checking' } }
})
const candidates = computed(() => {
  const list = [softwareTask.value, ...activeJobs.value.filter(isTaskProgressJob), gameTask.value, ...recentProgressJobs.value].filter(Boolean)
  const releasesSeen = new Set()
  const unique = new Map()
  for (const item of list) {
    if (closedProgressIds.value.includes(item.id)) continue
    const release = gameRecords.value.find(record => record.id === item.id || record.sourceJobId === item.id || record.currentJobId === item.id)
    if (release && releasesSeen.has(release.id)) continue
    if (release) releasesSeen.add(release.id)
    const job = release ? { ...item, status: !gameReleaseIsTerminal(release) ? 'running' : release.stage === 'succeeded' ? 'succeeded' : release.stage === 'abandoned' ? 'canceled' : 'failed' } : item
    if (!unique.has(job.id)) unique.set(job.id, job)
  }
  return [...unique.values()]
})
const selectedRelease = computed(() => gameRecords.value.find(record => record.id === selected.value?.id || record.sourceJobId === selected.value?.id || record.currentJobId === selected.value?.id) || null)
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
const taskOptions = computed(() => candidates.value.map(job => {
  const release = gameRecords.value.find(record => [record.id, record.currentJobId, record.sourceJobId].includes(job.id))
  return {
    id: job.id, label: [readableTaskText(jobLabels.value[job.id] || roomLabels.value[job.roomId] || job.targets?.[0]?.name, targetLabels.value), globalJobKindLabel(job.kind, t)].filter(Boolean).join(' · '),
    statusLabel: release ? t(`gameReleases.stages.${release.stage}`) : job.kind === 'software.update' ? t(`softwareUpdate.phases.${job.softwarePhase}`) : '',
    status: taskProgress(job).status
  }
}))
const targetNames = ref([])

watch(() => candidates.value.filter(job => ['queued', 'running'].includes(job.status)).map(job => job.id), (ids, before = []) => {
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
    :release="selectedRelease"
    :display-name="jobLabels[selected.id] || ''"
    :task-options="taskOptions"
    v-model:expanded="dockExpanded"
    v-model:minimized="dockMinimized"
    :room-name="roomLabels[selected.roomId] || ''"
    :target-names="targetNames"
    :target-labels="targetLabels"
    :mod-metadata="modMetadata"
    :connected="selected.kind === 'software.update' ? !softwareUpdate.state.reconnecting && !softwareUpdate.state.retrying : connected"
    :cancelable="selected.kind === 'software.update' && !softwareUpdate.state.acting && ['downloading', 'verifying', 'prepared'].includes(softwareUpdate.state.snapshot?.operation?.phase)"
    :canceling="softwareUpdate.state.canceling"
    @cancel="softwareUpdate.cancel()"
    :other-count="Math.max(0, candidates.filter(item => ['queued', 'running'].includes(item.status)).length - (['running', 'queued'].includes(selected.status) ? 1 : 0))"
    @tasks="taskListOpen = true"
    @select="focusedJobId = $event"
    @close="closeJobProgress(selected.id)"
  />
</template>

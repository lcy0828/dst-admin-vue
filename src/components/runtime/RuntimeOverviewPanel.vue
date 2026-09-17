<template>
  <section class="flex min-w-0 flex-col gap-3" aria-labelledby="runtime-overview-title">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <h2 id="runtime-overview-title" class="text-base font-semibold">{{ t('distributed.diagnostics.overviewTitle') }}</h2>
        <Badge v-if="overview" variant="outline">{{ t('distributed.worldStates.total', { count: totalWorlds }) }}</Badge>
        <Badge v-if="runningWorlds > 0" variant="secondary">{{ t('distributed.diagnostics.runningCount', { count: runningWorlds }) }}</Badge>
        <Badge v-if="attentionWorlds > 0" variant="destructive">{{ t('distributed.diagnostics.attentionCount', { count: attentionWorlds }) }}</Badge>
      </div>
      <Badge :variant="streamVariant">{{ t(`distributed.runtime.stream.${streamState}`) }}</Badge>
    </div>

    <Alert v-if="error" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('distributed.runtime.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <Alert v-else-if="stateError">
      <TriangleAlert />
      <AlertTitle>{{ t('distributed.worldStates.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ stateError }}</AlertDescription>
    </Alert>

    <div v-if="loading && !overview" class="flex flex-col gap-2" :aria-label="t('distributed.runtime.loading')">
      <Skeleton v-for="index in 3" :key="index" class="h-14 w-full" />
    </div>

    <template v-else-if="overview">
      <Alert v-if="runningWorlds > 0 && !overview.remoteExecutionReady">
        <TriangleAlert />
        <AlertTitle>{{ t('distributed.runtime.notReadyTitle') }}</AlertTitle>
        <AlertDescription>{{ t('distributed.runtime.notReadyDescription') }}</AlertDescription>
      </Alert>

      <div class="overflow-x-auto rounded-lg border">
        <UiTable class="min-w-[840px]">
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('distributed.runtime.columns.world') }}</TableHead>
              <TableHead>{{ t('distributed.diagnostics.node') }}</TableHead>
              <TableHead>{{ t('distributed.runtime.columns.runtime') }}</TableHead>
              <TableHead>{{ t('distributed.diagnostics.gameState') }}</TableHead>
              <TableHead>{{ t('distributed.worldStates.columns.freshness') }}</TableHead>
              <TableHead class="text-right">{{ t('common.fields.actions') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-for="shard in mergedShards" :key="shard.worldId">
              <TableRow :aria-expanded="expandedWorldId === shard.worldId">
                <TableCell>
                  <div class="flex min-w-36 flex-col gap-0.5">
                    <span class="font-medium">{{ shard.worldName }}</span>
                    <span class="text-xs text-muted-foreground">{{ roleLabel(shard.worldRole) }}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="flex min-w-32 flex-col items-start gap-1">
                    <span>{{ shardEndpointName(shard) }}</span>
                    <span class="text-xs text-muted-foreground">
                      {{ shard.target?.online ? t('common.states.online') : t('common.states.offline') }}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge :variant="runtimeVariant(shard.runtime)">{{ runtimeLabel(shard.runtime) }}</Badge>
                </TableCell>
                <TableCell>
                  <div class="flex min-w-44 flex-col gap-0.5">
                    <span>{{ gameStatePrimary(shard.worldState) }}</span>
                    <span class="text-xs text-muted-foreground">{{ gameStateSecondary(shard.worldState) }}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <WorldDataFreshnessBadge
                    :freshness="shard.worldState?.freshness || 'unavailable'"
                    :observed-at="validObservedAt(shard.worldState?.observedAt)"
                    :age-seconds="shard.worldState?.ageSeconds"
                  />
                </TableCell>
                <TableCell>
                  <div class="flex justify-end gap-1">
                    <UiButton
                      v-if="canDiagnose(shard) && showDiagnosticsAction"
                      size="sm"
                      variant="outline"
                      @click="emit('diagnose', shard)"
                    >
                      <Stethoscope data-icon="inline-start" />
                      {{ t('distributed.diagnostics.action') }}
                    </UiButton>
                    <UiButton
                      size="sm"
                      variant="ghost"
                      :aria-expanded="expandedWorldId === shard.worldId"
                      @click="toggleDetails(shard.worldId)"
                    >
                      <Info data-icon="inline-start" />
                      {{ t('distributed.diagnostics.details') }}
                    </UiButton>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="expandedWorldId === shard.worldId" class="bg-muted/20 hover:bg-muted/20">
                <TableCell colspan="6" class="whitespace-normal">
                  <dl class="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div class="flex min-w-0 flex-col gap-1">
                      <dt class="text-xs text-muted-foreground">{{ t('distributed.diagnostics.worldIdentity') }}</dt>
                      <dd class="break-all font-mono text-xs">{{ shard.worldId }}</dd>
                    </div>
                    <div class="flex min-w-0 flex-col gap-1">
                      <dt class="text-xs text-muted-foreground">{{ t('distributed.runtime.columns.health') }}</dt>
                      <dd>{{ healthLabel(shard) }}</dd>
                    </div>
                    <div class="flex min-w-0 flex-col gap-1">
                      <dt class="text-xs text-muted-foreground">{{ t('distributed.runtime.columns.diagnostic') }}</dt>
                      <dd>{{ diagnosticLabel(shard) }}</dd>
                    </div>
                    <div class="flex min-w-0 flex-col gap-1">
                      <dt class="text-xs text-muted-foreground">{{ t('distributed.runtime.columns.observedAt') }}</dt>
                      <dd>{{ formatTime(latestObservedAt(shard)) }}</dd>
                    </div>
                  </dl>
                </TableCell>
              </TableRow>
            </template>
          </TableBody>
        </UiTable>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleAlert, Info, Stethoscope, TriangleAlert } from '@lucide/vue'
import { runtimeV2API, worldStatesV2API } from '@/api/v2'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { createRuntimeEventStreamManager } from '@/lib/runtimeEventStreams.mjs'
import { runtimeEndpointLabel } from '@/lib/roomPlacement.mjs'
import { translateWorldStateValue } from '@/i18n/worldStateMessages.js'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import WorldDataFreshnessBadge from '@/components/runtime/WorldDataFreshnessBadge.vue'

const props = defineProps({
  roomId: { type: String, default: '' },
  showDiagnosticsAction: { type: Boolean, default: false }
})
const emit = defineEmits(['diagnose'])

const { locale, t, te } = useI18n()
const overview = ref(null)
const worldStates = ref({ items: [], total: 0 })
const loading = ref(false)
const error = ref('')
const stateError = ref('')
const streamState = ref('connecting')
const expandedWorldId = ref('')
let requestSequence = 0
let refreshTimer = null

const streamManager = createRuntimeEventStreamManager({
  buildURL: runtimeV2API.eventStreamURL,
  onActivity: ({ eventName }) => {
    if (eventName !== 'runtime.cursor') scheduleRefresh()
  },
  onState: ({ overall }) => { streamState.value = overall }
})

const streamVariant = computed(() => {
  if (streamState.value === 'live') return 'secondary'
  if (streamState.value === 'unavailable' && runningWorlds.value > 0) return 'destructive'
  return 'outline'
})
const totalWorlds = computed(() => Number(overview.value?.summary?.total) || 0)
const runningWorlds = computed(() => Number(overview.value?.summary?.running) || 0)
const attentionWorlds = computed(() => {
  const summary = overview.value?.summary || {}
  return (Number(summary.degraded) || 0) + (Number(summary.unavailable) || 0)
})
const worldStateById = computed(() => new Map(
  (worldStates.value?.items || []).map(item => [String(item.worldId), item])
))
const mergedShards = computed(() => (overview.value?.shards || []).map(shard => ({
  ...shard,
  worldState: worldStateById.value.get(String(shard.worldId)) || null
})))

function shardEndpointName(shard) {
  return runtimeEndpointLabel(
    { targets: overview.value?.targets || [] },
    shard.placement?.appliedTargetId,
    shard.placement?.appliedInstallationId
  )
}

function scheduleRefresh() {
  if (refreshTimer) return
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null
    void loadOverview({ quiet: true, includeStates: false })
  }, 250)
}

async function loadOverview({ quiet = false, includeStates = true } = {}) {
  if (!props.roomId) {
    overview.value = null
    worldStates.value = { items: [], total: 0 }
    loading.value = false
    streamManager.sync('', [])
    return
  }
  const sequence = ++requestSequence
  if (!quiet) loading.value = true
  error.value = ''
  stateError.value = ''
  const [overviewResult, statesResult] = await Promise.allSettled([
    runtimeV2API.overview(props.roomId),
    includeStates ? worldStatesV2API.list(props.roomId) : Promise.resolve(worldStates.value)
  ])
  if (sequence !== requestSequence) return
  if (overviewResult.status === 'fulfilled') {
    overview.value = overviewResult.value
    streamManager.sync(props.roomId, (overviewResult.value.shards || []).map(item => item.worldId))
  } else {
    error.value = overviewResult.reason?.message || t('common.errors.unknown')
  }
  if (includeStates && statesResult.status === 'fulfilled') {
    worldStates.value = statesResult.value || { items: [], total: 0 }
  } else if (includeStates) {
    stateError.value = statesResult.reason?.message || t('common.errors.unknown')
  }
  loading.value = false
}

function roleLabel(role) {
  const key = ['master', 'caves', 'custom'].includes(role) ? role : 'custom'
  return t(`distributed.worldStates.roles.${key}`)
}

function runtimeLabel(runtime) {
  if (runtime?.state === 'running' && runtime.paused === true) return t('worldRuntime.statuses.paused')
  const state = runtime?.state
  const key = ['running', 'stopped', 'starting', 'failed', 'unknown'].includes(state) ? state : 'unknown'
  return t(`distributed.runtime.runtimeStates.${key}`)
}

function runtimeVariant(runtime) {
  if (runtime?.state === 'running' && runtime.paused === true) return 'info'
  const state = runtime?.state
  if (state === 'running') return 'secondary'
  if (state === 'failed' || state === 'unknown') return 'destructive'
  return 'outline'
}

function protocolLabel(group, value) {
  return translateWorldStateValue(t, te, group, value)
}

function gameStatePrimary(state) {
  if (!state) return t('distributed.worldStates.notObserved')
  const season = protocolLabel('seasons', state.season)
  const day = Number.isFinite(state.cycles)
    ? t('distributed.diagnostics.day', { count: state.cycles + 1 })
    : t('distributed.worldStates.notObserved')
  return `${season} · ${day}`
}

function gameStateSecondary(state) {
  if (!state) return t('distributed.diagnostics.noWorldSnapshot')
  const phase = protocolLabel('phases', state.phase)
  const temperature = Number.isFinite(state.temperature) ? `${state.temperature.toFixed(1)} °C` : '--'
  return `${phase} · ${temperature}`
}

function canDiagnose(shard) {
  return shard.runtime?.state === 'running' && Boolean(shard.target?.online)
}

function healthLabel(shard) {
  if (shard.runtime?.state === 'stopped') return t('distributed.diagnostics.stoppedRuntime')
  const value = shard.health
  if (value?.problem?.message) return value.problem.message
  if (!value?.health) return t('distributed.runtime.noHealth')
  const lastError = typeof value.health.lastError === 'string' ? value.health.lastError : value.health.lastError?.message
  return value.health.ready ? t('distributed.runtime.healthReady') : (lastError || t('distributed.runtime.healthNotReady'))
}

function diagnosticLabel(shard) {
  if (shard.runtime?.state === 'stopped') return t('distributed.diagnostics.stoppedDiagnostic')
  const value = shard.latestDiagnostic
  if (value?.problem?.message) return value.problem.message
  if (!value?.diagnostic) return t('distributed.runtime.noDiagnostic')
  return value.diagnostic.message || value.diagnostic.profile || t('distributed.runtime.diagnosticAvailable')
}

function latestObservedAt(shard) {
  return shard.worldState?.observedAt || shard.health?.observedAt || shard.latestDiagnostic?.observedAt || overview.value?.observedAt
}

function validObservedAt(value) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.getUTCFullYear() > 2000 ? value : ''
}

function formatTime(value) {
  return formatSystemDateTime(value, {
    locale: locale.value,
    fallback: '--',
    dateStyle: 'short',
    timeStyle: 'medium'
  })
}

function toggleDetails(worldId) {
  expandedWorldId.value = expandedWorldId.value === worldId ? '' : worldId
}

function handleVisibilityChange() {
  const active = document.visibilityState !== 'hidden'
  streamManager.setActive(active)
  if (active && props.roomId) void loadOverview({ quiet: Boolean(overview.value) })
}

watch(() => props.roomId, () => {
  overview.value = null
  worldStates.value = { items: [], total: 0 }
  expandedWorldId.value = ''
  streamManager.sync(props.roomId, [])
  void loadOverview()
}, { immediate: true })

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  handleVisibilityChange()
})

onBeforeUnmount(() => {
  requestSequence++
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  streamManager.close()
  if (refreshTimer) window.clearTimeout(refreshTimer)
})

defineExpose({ loadOverview })
</script>

<template>
  <section class="flex min-w-0 flex-col gap-3" aria-labelledby="runtime-overview-title">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h2 id="runtime-overview-title" class="text-base font-semibold">{{ t('distributed.runtime.title') }}</h2>
          <Badge :variant="streamVariant">{{ t(`distributed.runtime.stream.${streamState}`) }}</Badge>
        </div>
        <p class="mt-0.5 text-sm text-muted-foreground">{{ t('distributed.runtime.description') }}</p>
      </div>
      <UiButton size="sm" variant="outline" :disabled="loading || !roomId" @click="loadOverview">
        <Spinner v-if="loading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        {{ t('common.actions.refresh') }}
      </UiButton>
    </div>

    <Alert v-if="error" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('distributed.runtime.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <div v-if="loading && !overview" class="flex flex-col gap-2" :aria-label="t('distributed.runtime.loading')">
      <Skeleton v-for="index in 3" :key="index" class="h-14 w-full" />
    </div>

    <template v-else-if="overview">
      <dl class="grid overflow-hidden rounded-lg border sm:grid-cols-3 lg:grid-cols-6">
        <div v-for="metric in summaryMetrics" :key="metric.key" class="flex min-w-0 flex-col gap-1 border-b px-3 py-2 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
          <dt class="truncate text-xs text-muted-foreground">{{ metric.label }}</dt>
          <dd class="text-lg font-semibold tabular-nums">{{ metric.value }}</dd>
        </div>
      </dl>

      <Alert v-if="!overview.remoteExecutionReady">
        <TriangleAlert />
        <AlertTitle>{{ t('distributed.runtime.notReadyTitle') }}</AlertTitle>
        <AlertDescription>{{ t('distributed.runtime.notReadyDescription') }}</AlertDescription>
      </Alert>

      <div class="overflow-x-auto rounded-lg border">
        <UiTable class="min-w-[920px]">
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('distributed.runtime.columns.world') }}</TableHead>
              <TableHead>{{ t('distributed.runtime.columns.target') }}</TableHead>
              <TableHead>{{ t('distributed.runtime.columns.runtime') }}</TableHead>
              <TableHead>{{ t('distributed.runtime.columns.health') }}</TableHead>
              <TableHead>{{ t('distributed.runtime.columns.diagnostic') }}</TableHead>
              <TableHead>{{ t('distributed.runtime.columns.observedAt') }}</TableHead>
              <TableHead v-if="showDiagnosticsAction" class="text-right">{{ t('common.fields.actions') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="shard in overview.shards || []" :key="shard.worldId">
              <TableCell>
                <div class="flex min-w-44 flex-col gap-1">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="font-medium">{{ shard.worldName }}</span>
                    <Badge :variant="shardStateVariant(shard.state)">{{ stateLabel(shard.state) }}</Badge>
                  </div>
                  <span class="font-mono text-xs text-muted-foreground">{{ shard.worldId }}</span>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex min-w-44 flex-col gap-1">
                  <span>{{ shard.target?.name || shard.placement?.appliedTargetId || '--' }}</span>
                  <Badge :variant="shard.target?.online ? 'secondary' : 'destructive'">
                    {{ shard.target?.online ? t('common.states.online') : t('common.states.offline') }}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex min-w-40 flex-col gap-1">
                  <Badge :variant="runtimeVariant(shard.runtime?.state)">{{ runtimeLabel(shard.runtime?.state) }}</Badge>
                  <span v-if="shard.runtimeProblem" class="text-xs text-destructive">{{ shard.runtimeProblem.message }}</span>
                  <span v-else-if="shard.runtime?.message" class="text-xs text-muted-foreground">{{ shard.runtime.message }}</span>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex min-w-40 flex-col gap-1">
                  <Badge :variant="freshnessVariant(shard.health?.freshness)">{{ freshnessLabel(shard.health?.freshness) }}</Badge>
                  <span class="text-xs text-muted-foreground">{{ healthLabel(shard.health) }}</span>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex min-w-40 flex-col gap-1">
                  <Badge :variant="freshnessVariant(shard.latestDiagnostic?.freshness)">{{ freshnessLabel(shard.latestDiagnostic?.freshness) }}</Badge>
                  <span class="text-xs text-muted-foreground">{{ diagnosticLabel(shard.latestDiagnostic) }}</span>
                </div>
              </TableCell>
              <TableCell class="min-w-44 text-xs text-muted-foreground">{{ formatTime(latestObservedAt(shard)) }}</TableCell>
              <TableCell v-if="showDiagnosticsAction">
                <div class="flex justify-end">
                  <UiButton
                    size="sm"
                    variant="outline"
                    :disabled="shard.runtime?.state !== 'running' || !shard.target?.online"
                    @click="emit('diagnose', shard)"
                  >
                    <Stethoscope data-icon="inline-start" />
                    {{ t('distributed.diagnostics.action') }}
                  </UiButton>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </UiTable>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleAlert, RefreshCw, Stethoscope, TriangleAlert } from '@lucide/vue'
import { runtimeV2API } from '@/api/v2'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { createRuntimeEventStreamManager } from '@/lib/runtimeEventStreams.mjs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const props = defineProps({
  roomId: { type: String, default: '' },
  showDiagnosticsAction: { type: Boolean, default: false }
})
const emit = defineEmits(['diagnose'])

const { locale, t } = useI18n()
const overview = ref(null)
const loading = ref(false)
const error = ref('')
const streamState = ref('connecting')
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
  if (streamState.value === 'unavailable') return 'destructive'
  return 'outline'
})

const summaryMetrics = computed(() => {
  const summary = overview.value?.summary || {}
  return ['total', 'healthy', 'degraded', 'unavailable', 'running', 'planned'].map(key => ({
    key,
    label: t(`distributed.runtime.summary.${key}`),
    value: Number(summary[key]) || 0
  }))
})

function scheduleRefresh() {
  if (refreshTimer) return
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null
    void loadOverview({ quiet: true })
  }, 250)
}

async function loadOverview({ quiet = false } = {}) {
  if (!props.roomId) {
    overview.value = null
    streamManager.sync('', [])
    return
  }
  const sequence = ++requestSequence
  if (!quiet) loading.value = true
  error.value = ''
  try {
    const value = await runtimeV2API.overview(props.roomId)
    if (sequence !== requestSequence) return
    overview.value = value
    streamManager.sync(props.roomId, (value.shards || []).map(item => item.worldId))
  } catch (cause) {
    if (sequence !== requestSequence) return
    error.value = cause.message || t('common.errors.unknown')
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function stateLabel(state) {
  const key = ['healthy', 'degraded', 'unavailable'].includes(state) ? state : 'unavailable'
  return t(`distributed.runtime.states.${key}`)
}

function shardStateVariant(state) {
  if (state === 'healthy') return 'secondary'
  if (state === 'unavailable') return 'destructive'
  return 'outline'
}

function runtimeLabel(state) {
  const key = ['running', 'stopped', 'starting', 'failed', 'unknown'].includes(state) ? state : 'unknown'
  return t(`distributed.runtime.runtimeStates.${key}`)
}

function runtimeVariant(state) {
  if (state === 'running') return 'secondary'
  if (state === 'failed' || state === 'unknown') return 'destructive'
  return 'outline'
}

function freshnessLabel(value) {
  const key = ['live', 'stale', 'unavailable'].includes(value) ? value : 'unavailable'
  return t(`distributed.runtime.freshness.${key}`)
}

function freshnessVariant(value) {
  if (value === 'live') return 'secondary'
  if (value === 'unavailable') return 'destructive'
  return 'outline'
}

function healthLabel(value) {
  if (value?.problem?.message) return value.problem.message
  if (!value?.health) return t('distributed.runtime.noHealth')
  const lastError = typeof value.health.lastError === 'string'
    ? value.health.lastError
    : value.health.lastError?.message
  return value.health.ready ? t('distributed.runtime.healthReady') : (lastError || t('distributed.runtime.healthNotReady'))
}

function diagnosticLabel(value) {
  if (value?.problem?.message) return value.problem.message
  if (!value?.diagnostic) return t('distributed.runtime.noDiagnostic')
  return value.diagnostic.message || value.diagnostic.profile || t('distributed.runtime.diagnosticAvailable')
}

function latestObservedAt(shard) {
  return shard.health?.observedAt || shard.latestDiagnostic?.observedAt || overview.value?.observedAt
}

function formatTime(value) {
  return formatSystemDateTime(value, {
    locale: locale.value,
    dateStyle: 'short',
    timeStyle: 'medium'
  })
}

watch(() => props.roomId, () => {
  overview.value = null
  streamManager.sync(props.roomId, [])
  void loadOverview()
}, { immediate: true })

onBeforeUnmount(() => {
  requestSequence++
  streamManager.close()
  if (refreshTimer) window.clearTimeout(refreshTimer)
})
</script>

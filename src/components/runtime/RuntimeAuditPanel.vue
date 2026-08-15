<script setup>
import { computed, ref, watch } from 'vue'
import { ListTree, RefreshCw, TriangleAlert } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { runtimeV2API } from '@/api/v2'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const props = defineProps({
  roomId: { type: String, required: true },
  worlds: { type: Array, default: () => [] }
})

const { locale, t } = useI18n()
const loading = ref(false)
const error = ref(null)
const result = ref({ items: [], total: 0 })
let loadSequence = 0

const events = computed(() => Array.isArray(result.value?.items) ? result.value.items : [])
const knownEvents = new Set([
  'start_requested', 'stop_requested', 'restart_requested', 'cleanup_requested',
  'session_started', 'running', 'failed', 'stopped', 'unexpected_exit'
])
const knownSources = new Set(['api', 'automation', 'game_update', 'system_monitor', 'external'])
const knownStates = new Set(['stopped', 'starting', 'running', 'failed', 'stopping'])

function eventLabel(type) {
  return t(`runtimeAudit.history.events.${knownEvents.has(type) ? type : 'unknown'}`)
}

function eventVariant(type) {
  if (['unexpected_exit', 'failed'].includes(type)) return 'destructive'
  if (['running', 'session_started'].includes(type)) return 'default'
  return 'outline'
}

function sourceLabel(source) {
  return t(`runtimeAudit.sources.${knownSources.has(source) ? source : 'external'}`)
}

function stateLabel(state) {
  return t(`runtimeAudit.history.states.${knownStates.has(state) ? state : 'unknown'}`)
}

function transitionLabel(event) {
  if (event.previousState && event.runtimeState) {
    return `${stateLabel(event.previousState)} -> ${stateLabel(event.runtimeState)}`
  }
  if (event.runtimeState) return stateLabel(event.runtimeState)
  return '--'
}

function worldLabel(event) {
  const world = props.worlds.find(item => item.id === event.worldId)
  return world?.name || event.worldDirectory || event.worldId || '--'
}

function traceItems(event) {
  return [
    event.jobId ? { label: t('runtimeAudit.history.job'), value: event.jobId } : null,
    event.requestId ? { label: t('runtimeAudit.history.request'), value: event.requestId } : null
  ].filter(Boolean)
}

function formatTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'medium' }).format(date)
}

async function loadEvents() {
  const roomId = props.roomId
  if (!roomId) {
    result.value = { items: [], total: 0 }
    return
  }
  const sequence = ++loadSequence
  loading.value = true
  error.value = null
  try {
    const response = await runtimeV2API.lifecycleEvents(roomId, { limit: 50 })
    if (sequence !== loadSequence || props.roomId !== roomId) return
    result.value = response || { items: [], total: 0 }
  } catch (cause) {
    if (sequence !== loadSequence || props.roomId !== roomId) return
    error.value = cause
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

watch(() => props.roomId, loadEvents, { immediate: true })
defineExpose({ loadEvents })
</script>

<template>
  <Card size="sm" class="min-w-0">
    <CardHeader>
      <CardTitle>{{ t('runtimeAudit.history.title') }}</CardTitle>
      <CardDescription>{{ t('runtimeAudit.history.description') }}</CardDescription>
      <CardAction>
        <UiButton size="icon-sm" variant="outline" :disabled="loading" :aria-label="t('runtimeAudit.history.refresh')" :title="t('runtimeAudit.history.refresh')" @click="loadEvents">
          <Spinner v-if="loading" />
          <RefreshCw v-else />
        </UiButton>
      </CardAction>
    </CardHeader>
    <CardContent class="min-w-0 p-0">
      <Alert v-if="error" class="m-4" variant="destructive">
        <TriangleAlert />
        <AlertTitle>{{ t('runtimeAudit.history.loadFailed') }}</AlertTitle>
        <AlertDescription>{{ error.message }}</AlertDescription>
      </Alert>
      <div v-else-if="loading && events.length === 0" class="flex flex-col gap-2 p-4" aria-busy="true">
        <Skeleton v-for="index in 3" :key="index" class="h-10 w-full" />
      </div>
      <Empty v-else-if="events.length === 0" class="m-4">
        <EmptyHeader>
          <EmptyMedia variant="icon"><ListTree /></EmptyMedia>
          <EmptyTitle>{{ t('runtimeAudit.history.empty') }}</EmptyTitle>
          <EmptyDescription>{{ t('runtimeAudit.history.emptyDescription') }}</EmptyDescription>
        </EmptyHeader>
      </Empty>
      <template v-else>
        <div class="runtime-table-scroll hidden min-w-0 max-h-[520px] overflow-auto md:block">
          <UiTable class="min-w-[920px] table-fixed">
            <TableHeader class="bg-card sticky top-0 z-10">
              <TableRow>
                <TableHead class="w-44">{{ t('runtimeAudit.history.columns.time') }}</TableHead>
                <TableHead class="w-40">{{ t('runtimeAudit.history.columns.context') }}</TableHead>
                <TableHead class="w-48">{{ t('runtimeAudit.history.columns.lifecycle') }}</TableHead>
                <TableHead>{{ t('runtimeAudit.history.columns.reason') }}</TableHead>
                <TableHead class="w-64">{{ t('runtimeAudit.history.columns.trace') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="event in events" :key="event.id">
                <TableCell class="whitespace-nowrap tabular-nums">{{ formatTime(event.occurredAt) }}</TableCell>
                <TableCell class="whitespace-normal">
                  <div class="flex min-w-0 flex-col gap-1">
                    <strong class="truncate font-medium" :title="worldLabel(event)">{{ worldLabel(event) }}</strong>
                    <span class="text-muted-foreground truncate text-xs" :title="sourceLabel(event.source)">{{ sourceLabel(event.source) }}</span>
                  </div>
                </TableCell>
                <TableCell class="whitespace-normal">
                  <div class="flex min-w-0 flex-col items-start gap-1.5">
                    <Badge :variant="eventVariant(event.type)">{{ eventLabel(event.type) }}</Badge>
                    <span class="text-muted-foreground truncate text-xs" :title="transitionLabel(event)">{{ transitionLabel(event) }}</span>
                  </div>
                </TableCell>
                <TableCell class="whitespace-normal">
                  <p v-if="event.message" class="line-clamp-2 leading-5" :title="event.message">{{ event.message }}</p>
                  <code v-if="event.reasonCode" class="text-muted-foreground mt-1 block truncate text-xs" :title="event.reasonCode">{{ event.reasonCode }}</code>
                  <span v-if="!event.message && !event.reasonCode">--</span>
                </TableCell>
                <TableCell class="whitespace-normal">
                  <div v-if="traceItems(event).length" class="flex min-w-0 flex-col gap-1">
                    <code v-for="item in traceItems(event)" :key="item.label" class="text-muted-foreground block truncate text-xs" :title="`${item.label}: ${item.value}`">{{ item.label }}: {{ item.value }}</code>
                  </div>
                  <span v-else>--</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </UiTable>
        </div>

        <div class="max-h-[560px] divide-y overflow-y-auto md:hidden">
          <article v-for="event in events" :key="event.id" class="flex min-w-0 flex-col gap-2.5 p-4">
            <header class="flex min-w-0 items-start justify-between gap-3">
              <div class="flex min-w-0 flex-col gap-0.5">
                <strong class="truncate font-medium" :title="worldLabel(event)">{{ worldLabel(event) }}</strong>
                <time class="text-muted-foreground text-xs tabular-nums" :datetime="event.occurredAt">{{ formatTime(event.occurredAt) }}</time>
              </div>
              <Badge class="shrink-0" :variant="eventVariant(event.type)">{{ eventLabel(event.type) }}</Badge>
            </header>
            <div class="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span>{{ sourceLabel(event.source) }}</span>
              <span aria-hidden="true">·</span>
              <span>{{ transitionLabel(event) }}</span>
            </div>
            <div v-if="event.message || event.reasonCode" class="min-w-0">
              <p v-if="event.message" class="line-clamp-2 text-sm leading-5" :title="event.message">{{ event.message }}</p>
              <code v-if="event.reasonCode" class="text-muted-foreground mt-1 block truncate text-xs" :title="event.reasonCode">{{ event.reasonCode }}</code>
            </div>
            <div v-if="traceItems(event).length" class="flex min-w-0 flex-col gap-1">
              <code v-for="item in traceItems(event)" :key="item.label" class="text-muted-foreground block truncate text-xs" :title="`${item.label}: ${item.value}`">{{ item.label }}: {{ item.value }}</code>
            </div>
          </article>
        </div>
      </template>
    </CardContent>
  </Card>
</template>

<style scoped>
.runtime-table-scroll :deep([data-slot='table-container']) {
  overflow: visible;
}
</style>

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
    result.value = { items: [], total: 0 }
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

watch(() => props.roomId, loadEvents, { immediate: true })
defineExpose({ loadEvents })
</script>

<template>
  <Card>
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
    <CardContent>
      <Alert v-if="error" variant="destructive">
        <TriangleAlert />
        <AlertTitle>{{ t('runtimeAudit.history.loadFailed') }}</AlertTitle>
        <AlertDescription>{{ error.message }}</AlertDescription>
      </Alert>
      <div v-else-if="loading && events.length === 0" class="flex flex-col gap-2" aria-busy="true">
        <Skeleton v-for="index in 3" :key="index" class="h-10 w-full" />
      </div>
      <Empty v-else-if="events.length === 0">
        <EmptyHeader>
          <EmptyMedia variant="icon"><ListTree /></EmptyMedia>
          <EmptyTitle>{{ t('runtimeAudit.history.empty') }}</EmptyTitle>
          <EmptyDescription>{{ t('runtimeAudit.history.emptyDescription') }}</EmptyDescription>
        </EmptyHeader>
      </Empty>
      <UiTable v-else>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('runtimeAudit.history.columns.time') }}</TableHead>
            <TableHead>{{ t('runtimeAudit.history.columns.world') }}</TableHead>
            <TableHead>{{ t('runtimeAudit.history.columns.event') }}</TableHead>
            <TableHead>{{ t('runtimeAudit.history.columns.source') }}</TableHead>
            <TableHead>{{ t('runtimeAudit.history.columns.transition') }}</TableHead>
            <TableHead>{{ t('runtimeAudit.history.columns.reason') }}</TableHead>
            <TableHead>{{ t('runtimeAudit.history.columns.trace') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="event in events" :key="event.id">
            <TableCell class="whitespace-nowrap">{{ formatTime(event.occurredAt) }}</TableCell>
            <TableCell>{{ worldLabel(event) }}</TableCell>
            <TableCell><Badge :variant="eventVariant(event.type)">{{ eventLabel(event.type) }}</Badge></TableCell>
            <TableCell>{{ sourceLabel(event.source) }}</TableCell>
            <TableCell class="whitespace-nowrap">{{ transitionLabel(event) }}</TableCell>
            <TableCell class="max-w-80 break-words">
              <span>{{ event.message || '--' }}</span>
              <code v-if="event.reasonCode" class="block">{{ event.reasonCode }}</code>
            </TableCell>
            <TableCell>
              <div class="flex max-w-56 flex-col gap-1 break-all">
                <code v-if="event.jobId">{{ t('runtimeAudit.history.job') }}: {{ event.jobId }}</code>
                <code v-if="event.requestId">{{ t('runtimeAudit.history.request') }}: {{ event.requestId }}</code>
                <span v-if="!event.jobId && !event.requestId">--</span>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </UiTable>
    </CardContent>
  </Card>
</template>

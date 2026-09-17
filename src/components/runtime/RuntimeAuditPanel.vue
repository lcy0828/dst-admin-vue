<script setup>
import { computed, ref, watch } from 'vue'
import { ChevronDown, ChevronUp, ListTree, RefreshCw, TriangleAlert } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { runtimeV2API } from '@/api/v2'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const props = defineProps({
  roomId: { type: String, required: true },
  worlds: { type: Array, default: () => [] },
  embedded: { type: Boolean, default: false }
})

const { locale, t } = useI18n()
const loading = ref(false)
const error = ref(null)
const result = ref({ items: [], total: 0 })
const eventFilter = ref('all')
const page = ref(1)
const expandedEventId = ref('')
const pageSize = 10
let loadSequence = 0

const events = computed(() => Array.isArray(result.value?.items) ? result.value.items : [])
const filteredEvents = computed(() => {
  if (eventFilter.value === 'abnormal') {
    return events.value.filter(event => ['unexpected_exit', 'failed'].includes(event.type))
  }
  if (eventFilter.value === 'actions') {
    return events.value.filter(event => ['start_requested', 'stop_requested', 'restart_requested', 'cleanup_requested'].includes(event.type))
  }
  return events.value
})
const visibleEvents = computed(() => {
  const offset = (page.value - 1) * pageSize
  return filteredEvents.value.slice(offset, offset + pageSize)
})
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
  if (['running', 'session_started'].includes(type)) return 'secondary'
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
  const world = props.worlds.find(item => String(item.id) === String(event.worldId))
  return world?.name || event.worldDirectory || event.worldId || '--'
}

function detailItems(event) {
  return [
    event.reasonCode ? { label: t('runtimeAudit.history.reasonCode'), value: event.reasonCode } : null,
    event.jobId ? { label: t('runtimeAudit.history.job'), value: event.jobId } : null,
    event.requestId ? { label: t('runtimeAudit.history.request'), value: event.requestId } : null
  ].filter(Boolean)
}

function formatTime(value) {
  return formatSystemDateTime(value, {
    locale: locale.value,
    fallback: value ? String(value) : '--',
    dateStyle: 'medium',
    timeStyle: 'medium'
  })
}

function selectFilter(value) {
  if (!['all', 'abnormal', 'actions'].includes(value)) return
  eventFilter.value = value
  page.value = 1
  expandedEventId.value = ''
}

function toggleEventDetails(eventId) {
  expandedEventId.value = expandedEventId.value === eventId ? '' : eventId
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
    page.value = 1
    expandedEventId.value = ''
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
  <section class="flex min-w-0 flex-col gap-3" aria-labelledby="runtime-audit-title">
    <div v-if="!embedded" class="flex items-start justify-between gap-3">
      <div>
        <h2 id="runtime-audit-title" class="text-base font-semibold">{{ t('runtimeAudit.history.title') }}</h2>
        <p class="mt-0.5 text-sm text-muted-foreground">{{ t('runtimeAudit.history.description') }}</p>
      </div>
      <UiButton size="icon-sm" variant="outline" :disabled="loading" :aria-label="t('runtimeAudit.history.refresh')" :title="t('runtimeAudit.history.refresh')" @click="loadEvents">
        <Spinner v-if="loading" />
        <RefreshCw v-else />
      </UiButton>
    </div>

    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" size="sm" variant="outline" :model-value="eventFilter" @update:model-value="selectFilter">
          <ToggleGroupItem value="all">{{ t('runtimeAudit.history.filters.all') }}</ToggleGroupItem>
          <ToggleGroupItem value="abnormal">{{ t('runtimeAudit.history.filters.abnormal') }}</ToggleGroupItem>
          <ToggleGroupItem value="actions">{{ t('runtimeAudit.history.filters.actions') }}</ToggleGroupItem>
        </ToggleGroup>
        <Badge variant="outline">{{ t('runtimeAudit.history.count', { count: filteredEvents.length }) }}</Badge>
      </div>
      <UiButton v-if="embedded" size="icon-sm" variant="outline" :disabled="loading" :aria-label="t('runtimeAudit.history.refresh')" :title="t('runtimeAudit.history.refresh')" @click="loadEvents">
        <Spinner v-if="loading" />
        <RefreshCw v-else />
      </UiButton>
    </div>

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
    <Empty v-else-if="filteredEvents.length === 0" class="min-h-40">
      <EmptyHeader>
        <EmptyTitle>{{ t('runtimeAudit.history.noMatches') }}</EmptyTitle>
        <EmptyDescription>{{ t('runtimeAudit.history.noMatchesDescription') }}</EmptyDescription>
      </EmptyHeader>
    </Empty>
    <template v-else>
      <div class="runtime-table-scroll hidden min-w-0 overflow-x-auto rounded-lg border md:block">
        <UiTable class="min-w-[760px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead class="w-44">{{ t('runtimeAudit.history.columns.time') }}</TableHead>
              <TableHead class="w-40">{{ t('runtimeAudit.history.columns.context') }}</TableHead>
              <TableHead class="w-48">{{ t('runtimeAudit.history.columns.lifecycle') }}</TableHead>
              <TableHead>{{ t('runtimeAudit.history.columns.reason') }}</TableHead>
              <TableHead class="w-16"><span class="sr-only">{{ t('runtimeAudit.history.details') }}</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-for="event in visibleEvents" :key="event.id">
              <TableRow :aria-expanded="expandedEventId === event.id">
                <TableCell class="whitespace-nowrap tabular-nums">{{ formatTime(event.occurredAt) }}</TableCell>
                <TableCell class="whitespace-normal">
                  <div class="flex min-w-0 flex-col gap-1">
                    <strong class="truncate font-medium" :title="worldLabel(event)">{{ worldLabel(event) }}</strong>
                    <span class="truncate text-xs text-muted-foreground" :title="sourceLabel(event.source)">{{ sourceLabel(event.source) }}</span>
                  </div>
                </TableCell>
                <TableCell class="whitespace-normal">
                  <div class="flex min-w-0 flex-col items-start gap-1.5">
                    <Badge :variant="eventVariant(event.type)">{{ eventLabel(event.type) }}</Badge>
                    <span class="truncate text-xs text-muted-foreground" :title="transitionLabel(event)">{{ transitionLabel(event) }}</span>
                  </div>
                </TableCell>
                <TableCell class="whitespace-normal">
                  <p v-if="event.message" class="line-clamp-2 leading-5" :title="event.message">{{ event.message }}</p>
                  <span v-else>--</span>
                </TableCell>
                <TableCell>
                  <UiButton
                    v-if="detailItems(event).length"
                    size="icon-sm"
                    variant="ghost"
                    :aria-expanded="expandedEventId === event.id"
                    :aria-label="t('runtimeAudit.history.details')"
                    :title="t('runtimeAudit.history.details')"
                    @click="toggleEventDetails(event.id)"
                  >
                    <ChevronUp v-if="expandedEventId === event.id" />
                    <ChevronDown v-else />
                  </UiButton>
                </TableCell>
              </TableRow>
              <TableRow v-if="expandedEventId === event.id" class="bg-muted/20 hover:bg-muted/20">
                <TableCell colspan="5" class="whitespace-normal">
                  <dl class="grid gap-3 sm:grid-cols-3">
                    <div v-for="item in detailItems(event)" :key="item.label" class="flex min-w-0 flex-col gap-1">
                      <dt class="text-xs text-muted-foreground">{{ item.label }}</dt>
                      <dd class="break-all font-mono text-xs">{{ item.value }}</dd>
                    </div>
                  </dl>
                </TableCell>
              </TableRow>
            </template>
          </TableBody>
        </UiTable>
      </div>

      <div class="divide-y rounded-lg border md:hidden">
        <article v-for="event in visibleEvents" :key="event.id" class="flex min-w-0 flex-col gap-2.5 p-3">
          <header class="flex min-w-0 items-start justify-between gap-3">
            <div class="flex min-w-0 flex-col gap-0.5">
              <strong class="truncate font-medium" :title="worldLabel(event)">{{ worldLabel(event) }}</strong>
              <time class="text-xs tabular-nums text-muted-foreground" :datetime="event.occurredAt">{{ formatTime(event.occurredAt) }}</time>
            </div>
            <Badge class="shrink-0" :variant="eventVariant(event.type)">{{ eventLabel(event.type) }}</Badge>
          </header>
          <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{{ sourceLabel(event.source) }}</span>
            <span aria-hidden="true">·</span>
            <span>{{ transitionLabel(event) }}</span>
          </div>
          <p v-if="event.message" class="line-clamp-2 text-sm leading-5" :title="event.message">{{ event.message }}</p>
          <UiButton
            v-if="detailItems(event).length"
            size="sm"
            variant="ghost"
            class="self-start"
            :aria-expanded="expandedEventId === event.id"
            @click="toggleEventDetails(event.id)"
          >
            <ChevronUp v-if="expandedEventId === event.id" data-icon="inline-start" />
            <ChevronDown v-else data-icon="inline-start" />
            {{ t('runtimeAudit.history.details') }}
          </UiButton>
          <dl v-if="expandedEventId === event.id" class="grid gap-2 rounded-md bg-muted/40 p-3">
            <div v-for="item in detailItems(event)" :key="item.label" class="flex min-w-0 flex-col gap-1">
              <dt class="text-xs text-muted-foreground">{{ item.label }}</dt>
              <dd class="break-all font-mono text-xs">{{ item.value }}</dd>
            </div>
          </dl>
        </article>
      </div>

      <Pagination
        v-if="filteredEvents.length > pageSize"
        v-model:page="page"
        :total="filteredEvents.length"
        :items-per-page="pageSize"
        show-edges
        class="justify-end"
      >
        <PaginationContent v-slot="{ items }">
          <PaginationPrevious />
          <template v-for="(item, index) in items" :key="index">
            <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === page">{{ item.value }}</PaginationItem>
            <PaginationEllipsis v-else :index="index" />
          </template>
          <PaginationNext />
        </PaginationContent>
      </Pagination>
    </template>
  </section>
</template>

<style scoped>
.runtime-table-scroll :deep([data-slot='table-container']) {
  overflow: visible;
}
</style>

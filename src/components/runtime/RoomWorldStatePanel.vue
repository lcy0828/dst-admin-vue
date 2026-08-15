<template>
  <section class="flex min-w-0 flex-col gap-3" aria-labelledby="room-world-state-title">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h2 id="room-world-state-title" class="text-base font-semibold">{{ t('distributed.worldStates.title') }}</h2>
          <Badge v-if="states" variant="outline">{{ t('distributed.worldStates.total', { count: states.total || 0 }) }}</Badge>
        </div>
        <p class="mt-0.5 text-sm text-muted-foreground">{{ t('distributed.worldStates.description') }}</p>
      </div>
      <UiButton size="sm" variant="outline" :disabled="loading || !roomId" @click="loadStates">
        <Spinner v-if="loading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        {{ t('common.actions.refresh') }}
      </UiButton>
    </div>

    <Alert v-if="error" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('distributed.worldStates.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <div v-if="loading && !states" class="flex flex-col gap-2" :aria-label="t('common.states.loading')">
      <Skeleton v-for="index in 2" :key="index" class="h-14 w-full" />
    </div>

    <Empty v-else-if="!error && (states?.items?.length || 0) === 0">
      <EmptyHeader>
        <EmptyMedia variant="icon"><Gauge /></EmptyMedia>
        <EmptyTitle>{{ t('distributed.worldStates.emptyTitle') }}</EmptyTitle>
        <EmptyDescription>{{ t('distributed.worldStates.emptyDescription') }}</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <div v-else-if="states" class="overflow-x-auto rounded-lg border">
      <UiTable class="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('distributed.worldStates.columns.world') }}</TableHead>
            <TableHead>{{ t('distributed.worldStates.columns.runtime') }}</TableHead>
            <TableHead>{{ t('distributed.worldStates.columns.season') }}</TableHead>
            <TableHead>{{ t('distributed.worldStates.columns.phase') }}</TableHead>
            <TableHead>{{ t('distributed.worldStates.columns.temperature') }}</TableHead>
            <TableHead>{{ t('distributed.worldStates.columns.freshness') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="world in states.items" :key="world.worldId">
            <TableCell>
              <div class="flex min-w-36 flex-col gap-1">
                <span class="font-medium">{{ world.worldName }}</span>
                <span class="text-xs text-muted-foreground">{{ roleLabel(world.worldRole) }}</span>
              </div>
            </TableCell>
            <TableCell><Badge :variant="runtimeVariant(world.runtimeState)">{{ runtimeLabel(world.runtimeState) }}</Badge></TableCell>
            <TableCell>
              <div class="flex min-w-28 flex-col gap-1">
                <span>{{ protocolLabel('seasons', world.season) }}</span>
                <span class="text-xs text-muted-foreground">{{ dayLabel(world.cycles) }}</span>
              </div>
            </TableCell>
            <TableCell>{{ protocolLabel('phases', world.phase) }}</TableCell>
            <TableCell>{{ temperatureLabel(world.temperature) }}</TableCell>
            <TableCell>
              <WorldDataFreshnessBadge
                :freshness="world.freshness"
                :observed-at="validObservedAt(world.observedAt)"
                :age-seconds="world.ageSeconds"
              />
            </TableCell>
          </TableRow>
        </TableBody>
      </UiTable>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleAlert, Gauge, RefreshCw } from '@lucide/vue'
import { worldStatesV2API } from '@/api/v2'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { translateWorldStateValue } from '@/i18n/worldStateMessages.js'
import WorldDataFreshnessBadge from '@/components/runtime/WorldDataFreshnessBadge.vue'

const props = defineProps({ roomId: { type: String, default: '' } })
const { t, te } = useI18n()
const states = ref(null)
const loading = ref(false)
const error = ref('')
let requestSequence = 0

async function loadStates() {
  if (!props.roomId) {
    states.value = null
    return
  }
  const sequence = ++requestSequence
  loading.value = true
  error.value = ''
  try {
    const value = await worldStatesV2API.list(props.roomId)
    if (sequence === requestSequence) states.value = value
  } catch (cause) {
    if (sequence === requestSequence) error.value = cause.message || t('common.errors.unknown')
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function protocolLabel(group, value) {
  return translateWorldStateValue(t, te, group, value)
}

function roleLabel(role) {
  const key = ['master', 'caves', 'custom'].includes(role) ? role : 'custom'
  return t(`distributed.worldStates.roles.${key}`)
}

function runtimeLabel(state) {
  const key = ['running', 'stopped', 'starting', 'failed'].includes(state) ? state : 'unknown'
  return t(`distributed.runtime.runtimeStates.${key}`)
}

function runtimeVariant(state) {
  if (state === 'running') return 'secondary'
  if (state === 'failed') return 'destructive'
  return 'outline'
}

function dayLabel(cycles) {
  return Number.isFinite(cycles) ? t('distributed.worldStates.cycles', { count: cycles }) : t('distributed.worldStates.notObserved')
}

function temperatureLabel(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} °C` : '--'
}

function validObservedAt(value) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.getUTCFullYear() > 2000 ? value : ''
}

watch(() => props.roomId, () => {
  states.value = null
  void loadStates()
}, { immediate: true })
</script>

<template>
  <Card>
    <CardHeader>
      <div>
        <CardTitle>{{ $t('runtime.title') }}</CardTitle>
        <CardDescription>{{ $t('runtime.description') }}</CardDescription>
      </div>
      <CardAction class="runtime-actions">
        <UiButton size="sm" variant="outline" :disabled="loading || Boolean(busyKey)" @click="loadStatus">
          <Spinner v-if="loading" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          {{ $t('runtime.refresh') }}
        </UiButton>
        <UiButton size="sm" :disabled="loading || Boolean(busyKey) || managedRooms.length === 0" @click="installAll">
          <Wrench data-icon="inline-start" />
          {{ $t('runtime.installAll') }}
        </UiButton>
      </CardAction>
    </CardHeader>
    <CardContent>
      <Alert v-if="error" variant="destructive" class="mb-4">
        <TriangleAlert />
        <AlertTitle>{{ $t('runtime.loadFailed') }}</AlertTitle>
        <AlertDescription>{{ error.message }}</AlertDescription>
      </Alert>
      <Alert v-else-if="failures.length" class="mb-4">
        <TriangleAlert />
        <AlertTitle>{{ $t('runtime.loadFailed') }}</AlertTitle>
        <AlertDescription>{{ $t('runtime.partialFailed', { count: failures.length }) }}</AlertDescription>
      </Alert>

      <div v-if="loading && reports.length === 0" class="runtime-skeleton" aria-busy="true">
        <Skeleton v-for="index in 3" :key="index" class="h-12 w-full" />
      </div>
      <Empty v-else-if="!error && managedRooms.length === 0">
        <EmptyHeader>
          <EmptyMedia variant="icon"><TerminalSquare /></EmptyMedia>
          <EmptyTitle>{{ $t('runtime.noRooms') }}</EmptyTitle>
          <EmptyDescription>{{ $t('runtime.noRoomsDescription') }}</EmptyDescription>
        </EmptyHeader>
      </Empty>
      <div v-else class="table-wrap">
        <UiTable>
          <TableHeader>
            <TableRow>
              <TableHead>{{ $t('runtime.columns.room') }}</TableHead>
              <TableHead>{{ $t('runtime.columns.world') }}</TableHead>
              <TableHead>{{ $t('runtime.columns.install') }}</TableHead>
              <TableHead>{{ $t('runtime.columns.health') }}</TableHead>
              <TableHead>{{ $t('runtime.columns.version') }}</TableHead>
              <TableHead class="text-right">{{ $t('runtime.columns.actions') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="report in reports" :key="`${report.roomId}:${report.worldId}`">
              <TableCell>{{ report.roomName }}</TableCell>
              <TableCell>{{ report.worldName }}</TableCell>
              <TableCell><Badge :variant="installVariant(report.state)">{{ installLabel(report.state) }}</Badge></TableCell>
              <TableCell>
                <div class="runtime-health">
                  <Badge :variant="healthVariant(report.healthState)">{{ healthLabel(report.healthState) }}</Badge>
                  <small v-if="report.healthMessage">{{ report.healthMessage }}</small>
                </div>
              </TableCell>
              <TableCell>{{ report.version || '--' }}</TableCell>
              <TableCell>
                <div class="row-actions">
                  <UiButton v-if="report.state !== 'installed'" size="sm" variant="outline" :disabled="Boolean(busyKey)" @click="installWorld(report)">
                    <Spinner v-if="isBusy(report)" data-icon="inline-start" />
                    {{ installActionLabel(report.state) }}
                  </UiButton>
                  <UiButton v-if="report.state === 'installed' && report.processRunning && report.healthState !== 'ready'" size="sm" variant="outline" :disabled="Boolean(busyKey)" @click="activate(report)">
                    <Spinner v-if="isBusy(report)" data-icon="inline-start" />
                    {{ $t('runtime.actions.activate') }}
                  </UiButton>
                  <UiButton v-if="report.state === 'installed' && report.processRunning && report.healthState === 'ready'" size="sm" variant="outline" :disabled="Boolean(busyKey)" @click="reload(report)">
                    <Spinner v-if="isBusy(report)" data-icon="inline-start" />
                    {{ $t('runtime.actions.reload') }}
                  </UiButton>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </UiTable>
      </div>
    </CardContent>
  </Card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RefreshCw, TerminalSquare, TriangleAlert, Wrench } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { roomsV2API, runtimeV2API } from '@/api/v2'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const { t } = useI18n()
const loading = ref(false)
const error = ref(null)
const failures = ref([])
const rooms = ref([])
const reports = ref([])
const busyKey = ref('')
const managedRooms = computed(() => rooms.value.filter(room => room.managed))

const rowKey = report => `${report.roomId}:${report.worldId}`
const isBusy = report => busyKey.value === rowKey(report)
const installLabel = state => t(`runtime.installStates.${['missing', 'installed', 'outdated', 'invalid'].includes(state) ? state : 'unknown'}`)
const healthLabel = state => t(`runtime.healthStates.${['ready', 'starting', 'stopped', 'degraded', 'unavailable'].includes(state) ? state : 'unknown'}`)
const installActionLabel = state => t(`runtime.actions.${state === 'invalid' ? 'repair' : state === 'outdated' ? 'upgrade' : 'install'}`)
const installVariant = state => state === 'installed' ? 'secondary' : state === 'invalid' ? 'destructive' : 'outline'
const healthVariant = state => state === 'ready' ? 'default' : state === 'degraded' ? 'destructive' : 'outline'

async function loadStatus() {
  loading.value = true
  error.value = null
  failures.value = []
  try {
    const roomResponse = await roomsV2API.list()
    rooms.value = roomResponse.items || []
    const settled = await Promise.allSettled(managedRooms.value.map(async room => {
      const response = await runtimeV2API.status(room.id)
      return (response.items || []).map(item => ({ ...item, roomName: room.name }))
    }))
    reports.value = settled.filter(item => item.status === 'fulfilled').flatMap(item => item.value)
    failures.value = settled.filter(item => item.status === 'rejected')
    if (reports.value.length === 0 && failures.value.length > 0) throw failures.value[0].reason
  } catch (cause) {
    error.value = cause
    reports.value = []
  } finally {
    loading.value = false
  }
}

async function installAll() {
  if (busyKey.value) return
  busyKey.value = 'all'
  try {
    const settled = await Promise.allSettled(managedRooms.value.map(room => runtimeV2API.installRoom(room.id)))
    const failed = settled.filter(item => item.status === 'rejected')
    if (failed.length === settled.length && failed[0]) throw failed[0].reason
    toast.success(t('runtime.messages.roomInstallSucceeded'))
    if (failed.length) toast.warning(t('runtime.partialFailed', { count: failed.length }))
    await loadStatus()
  } catch (cause) {
    toast.error(t('runtime.messages.roomInstallFailed', { error: cause.message }))
  } finally {
    busyKey.value = ''
  }
}

async function runWorldAction(report, action, actionKey) {
  if (busyKey.value) return
  busyKey.value = rowKey(report)
  try {
    await action(report.roomId, report.worldId)
    toast.success(t('runtime.messages.actionSucceeded', { action: t(`runtime.actions.${actionKey}`) }))
    await loadStatus()
  } catch (cause) {
    toast.error(t('runtime.messages.actionFailed', { action: t(`runtime.actions.${actionKey}`), error: cause.message }))
  } finally {
    busyKey.value = ''
  }
}

const installWorld = report => runWorldAction(report, runtimeV2API.installWorld, report.state === 'invalid' ? 'repair' : report.state === 'outdated' ? 'upgrade' : 'install')
const activate = report => runWorldAction(report, runtimeV2API.activate, 'activate')
const reload = report => runWorldAction(report, runtimeV2API.reload, 'reload')

onMounted(loadStatus)
</script>

<style scoped>
.runtime-actions,
.row-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.runtime-skeleton,
.runtime-health {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.runtime-health small {
  max-width: 320px;
  color: var(--muted-foreground);
  line-height: 1.4;
}

.table-wrap {
  overflow-x: auto;
}
</style>

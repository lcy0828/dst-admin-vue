<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Activity,
  ArrowRight,
  CircleAlert,
  Cpu,
  ExternalLink,
  FolderPlus,
  Gauge,
  HardDrive,
  House,
  MemoryStick,
  PackageCheck,
  RefreshCw,
  UsersRound
} from '@lucide/vue'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  formatDateTime,
  formatDecimal,
  formatDisk,
  formatMemory,
  formatSystemUptime,
  hasMetric,
  loadPercentage,
  percentage,
  useDashboardV2
} from '@/composables/useDashboardV2'

const router = useRouter()
const { locale, t } = useI18n()
const RUNTIME_REFRESH_INTERVAL_MS = 10_000
let runtimeRefreshTimer = null

const {
  systemStatus,
  serverList,
  roomList,
  playerSummary,
  versionInfo,
  updateStatus,
  lastRefreshedAt,
  systemLoading,
  serverLoading,
  playerLoading,
  versionLoading,
  systemError,
  serverError,
  roomError,
  playerError,
  versionError,
  runningServerCount,
  totalWorldCount,
  dashboardLoading,
  isVersionOutdated,
  refreshDashboard,
  refreshSystem,
  refreshServers,
  refreshRuntimeServers,
  refreshVersion,
  resumeUpdatePolling
} = useDashboardV2()

const roomSummaries = computed(() => roomList.value.map(room => {
  const worlds = Array.isArray(room.worlds) ? room.worlds : []
  const running = worlds.filter(world => world.status === 'running').length
  const failed = worlds.filter(world => world.status === 'failed').length
  const preferredWorld = worlds.find(world => world.status === 'running') || worlds[0]
  return {
    id: String(room.id),
    name: room.name,
    running,
    failed,
    total: worlds.length,
    worldId: preferredWorld ? String(preferredWorld.id) : ''
  }
}))
const steamUpdateStatusKey = computed(() => {
  if (versionInfo.value.latest?.up_to_date === false) return 'dashboard.version.updateAvailable'
  if (versionInfo.value.latest?.up_to_date === true) return 'dashboard.version.upToDate'
  return 'dashboard.version.updateStateUnknown'
})

function roomStatusKey(room) {
  if (room.failed > 0) return 'dashboard.roomsOverview.statuses.attention'
  if (room.total > 0 && room.running === room.total) return 'dashboard.roomsOverview.statuses.running'
  if (room.running > 0) return 'dashboard.roomsOverview.statuses.partial'
  return 'dashboard.roomsOverview.statuses.stopped'
}

function roomStatusVariant(room) {
  if (room.failed > 0) return 'destructive'
  if (room.total > 0 && room.running === room.total) return 'secondary'
  return 'outline'
}

function openRoomControl(room) {
  router.push({
    path: '/servers/workspace',
    query: {
      roomId: room.id,
      ...(room.worldId ? { worldId: room.worldId } : {})
    }
  })
}

async function refreshRuntimeStatus() {
  if (document.visibilityState === 'hidden') return
  if (await refreshRuntimeServers()) lastRefreshedAt.value = new Date()
}

onMounted(async () => {
  await refreshDashboard()
  resumeUpdatePolling()
  runtimeRefreshTimer = window.setInterval(refreshRuntimeStatus, RUNTIME_REFRESH_INTERVAL_MS)
})

onBeforeUnmount(() => {
  if (runtimeRefreshTimer) window.clearInterval(runtimeRefreshTimer)
  runtimeRefreshTimer = null
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-5">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-normal">{{ t('dashboard.title') }}</h1>
        <p class="text-muted-foreground mt-1 text-sm">
          {{ t('dashboard.subtitle') }}
          <span class="mx-1.5">·</span>
          {{ t('dashboard.lastUpdated', { time: formatDateTime(lastRefreshedAt, locale) }) }}
        </p>
      </div>
      <Button variant="outline" size="sm" :disabled="dashboardLoading" @click="refreshDashboard">
        <Spinner v-if="dashboardLoading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        {{ t('dashboard.refreshAll') }}
      </Button>
    </header>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card size="sm">
        <CardHeader class="pb-2">
          <CardTitle>{{ t('dashboard.summary.runningShards') }}</CardTitle>
          <CardAction><span class="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-md"><Activity /></span></CardAction>
        </CardHeader>
        <CardContent class="flex items-end justify-between gap-3 pb-4 pt-0">
          <Skeleton v-if="serverLoading" class="h-8 w-20" />
          <strong v-else class="text-2xl font-semibold tabular-nums">{{ runningServerCount }}<span class="text-muted-foreground ml-1.5 text-sm font-normal">/ {{ serverList.length }}</span></strong>
          <Badge :variant="runningServerCount ? 'secondary' : 'outline'">{{ t(runningServerCount ? 'dashboard.summary.running' : 'dashboard.summary.notRunning') }}</Badge>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader class="pb-2">
          <CardTitle>{{ t('dashboard.summary.onlinePlayers') }}</CardTitle>
          <CardAction><span class="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-md"><UsersRound /></span></CardAction>
        </CardHeader>
        <CardContent class="flex items-end justify-between gap-3 pb-4 pt-0">
          <Skeleton v-if="playerLoading" class="h-8 w-20" />
          <strong v-else class="text-2xl font-semibold tabular-nums">{{ playerSummary.online }}<span class="text-muted-foreground ml-1.5 text-sm font-normal">{{ t('dashboard.summary.people') }}</span></strong>
          <div class="flex flex-col items-end gap-1">
            <span class="text-muted-foreground text-xs">{{ t('dashboard.summary.recordedPlayers', { count: playerSummary.total }) }}</span>
            <Badge v-if="playerSummary.staleOnline" variant="outline">{{ t('dashboard.summary.stalePlayers', { count: playerSummary.staleOnline }) }}</Badge>
          </div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader class="pb-2">
          <CardTitle>{{ t('dashboard.summary.roomsAndWorlds') }}</CardTitle>
          <CardAction><span class="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-md"><House /></span></CardAction>
        </CardHeader>
        <CardContent class="flex items-end justify-between gap-3 pb-4 pt-0">
          <Skeleton v-if="serverLoading" class="h-8 w-20" />
          <strong v-else class="text-2xl font-semibold tabular-nums">{{ roomList.length }}<span class="text-muted-foreground ml-1.5 text-sm font-normal">{{ t('dashboard.summary.roomUnit') }}</span></strong>
          <span class="text-muted-foreground text-xs">{{ t('dashboard.summary.worlds', { count: totalWorldCount }) }}</span>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader class="pb-2">
          <CardTitle>{{ t('dashboard.summary.hostLoad') }}</CardTitle>
          <CardAction><span class="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-md"><Cpu /></span></CardAction>
        </CardHeader>
        <CardContent class="flex items-end justify-between gap-3 pb-4 pt-0">
          <Skeleton v-if="systemLoading" class="h-8 w-20" />
          <strong v-else class="text-2xl font-semibold tabular-nums">{{ hasMetric(systemStatus.cpu_usage) ? `${percentage(systemStatus.cpu_usage)}%` : '--' }}</strong>
          <span class="text-muted-foreground text-xs">{{ t('dashboard.summary.memory', { value: hasMetric(systemStatus.memory_usage) ? `${percentage(systemStatus.memory_usage)}%` : '--' }) }}</span>
        </CardContent>
      </Card>
    </div>

    <Alert v-if="playerError">
      <CircleAlert />
      <AlertTitle>{{ t('dashboard.playersUnavailable') }}</AlertTitle>
      <AlertDescription>{{ playerError }}</AlertDescription>
    </Alert>

    <div class="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
      <div class="flex min-w-0 flex-col gap-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle class="flex items-center gap-2"><Activity />{{ t('dashboard.roomsOverview.title') }}</CardTitle>
            <CardDescription>{{ t('dashboard.roomsOverview.description', { count: roomSummaries.length }) }}</CardDescription>
            <CardAction>
              <Button variant="outline" size="sm" :disabled="serverLoading" @click="refreshServers">
                <Spinner v-if="serverLoading" data-icon="inline-start" />
                <RefreshCw v-else data-icon="inline-start" />{{ t('common.actions.refresh') }}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent class="pt-0">
            <Table v-if="roomSummaries.length && !serverError && !roomError">
              <TableHeader>
                <TableRow>
                  <TableHead>{{ t('dashboard.roomsOverview.columns.room') }}</TableHead>
                  <TableHead>{{ t('dashboard.roomsOverview.columns.status') }}</TableHead>
                  <TableHead>{{ t('dashboard.roomsOverview.columns.shards') }}</TableHead>
                  <TableHead class="text-right">{{ t('dashboard.roomsOverview.columns.action') }}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="room in roomSummaries" :key="room.id">
                  <TableCell class="font-medium">{{ room.name }}</TableCell>
                  <TableCell><Badge :variant="roomStatusVariant(room)">{{ t(roomStatusKey(room)) }}</Badge></TableCell>
                  <TableCell class="text-muted-foreground tabular-nums">{{ t('dashboard.roomsOverview.shardCount', { running: room.running, total: room.total }) }}</TableCell>
                  <TableCell class="text-right">
                    <Button variant="outline" size="sm" @click="openRoomControl(room)">
                      {{ t('dashboard.roomsOverview.openControl') }}
                      <ArrowRight data-icon="inline-end" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert v-else-if="serverError || roomError" variant="destructive">
              <CircleAlert /><AlertTitle>{{ t('dashboard.servers.loadFailed') }}</AlertTitle><AlertDescription>{{ serverError || roomError }}</AlertDescription>
              <AlertAction><Button size="sm" variant="outline" @click="refreshServers">{{ t('common.actions.retry') }}</Button></AlertAction>
            </Alert>

            <Empty v-else-if="!roomList.length" class="min-h-44 py-6">
              <EmptyHeader><EmptyMedia variant="icon"><FolderPlus /></EmptyMedia><EmptyTitle>{{ t('dashboard.servers.noRooms') }}</EmptyTitle><EmptyDescription>{{ t('dashboard.servers.noRoomsDescription') }}</EmptyDescription></EmptyHeader>
              <EmptyContent><Button size="sm" @click="router.push('/rooms/settings')">{{ t('dashboard.servers.createRoom') }}</Button></EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      </div>

      <aside class="flex min-w-0 flex-col gap-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle class="flex items-center gap-2"><Gauge />{{ t('dashboard.resources.title') }}</CardTitle>
            <CardDescription>{{ systemStatus.os_info || t('dashboard.summary.waitingSystem') }}</CardDescription>
            <CardAction>
              <Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon-sm" :disabled="systemLoading" :aria-label="t('dashboard.resources.refresh')" @click="refreshSystem"><Spinner v-if="systemLoading" /><RefreshCw v-else /></Button></TooltipTrigger><TooltipContent>{{ t('dashboard.resources.refresh') }}</TooltipContent></Tooltip>
            </CardAction>
          </CardHeader>
          <CardContent class="pt-0">
            <Alert v-if="systemError" variant="destructive"><CircleAlert /><AlertTitle>{{ t('dashboard.resources.unavailable') }}</AlertTitle><AlertDescription>{{ systemError }}</AlertDescription></Alert>
            <div v-else class="grid min-w-0 grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <div class="flex min-w-0 flex-col gap-2">
                <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-sm"><Cpu class="text-muted-foreground size-4" />CPU</span><strong class="tabular-nums">{{ hasMetric(systemStatus.cpu_usage) ? `${percentage(systemStatus.cpu_usage)}%` : '--' }}</strong></div>
                <Progress :model-value="percentage(systemStatus.cpu_usage)" />
                <span class="text-muted-foreground truncate text-xs" :title="`${systemStatus.cpu_model || '--'} · ${t('dashboard.resources.coresThreads', { cores: systemStatus.cpu_cores || '--', threads: systemStatus.cpu_threads || '--' })}`">{{ systemStatus.cpu_model || '--' }} · {{ t('dashboard.resources.coresThreads', { cores: systemStatus.cpu_cores || '--', threads: systemStatus.cpu_threads || '--' }) }}</span>
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-sm"><MemoryStick class="text-muted-foreground size-4" />{{ t('dashboard.resources.memory') }}</span><strong class="tabular-nums">{{ hasMetric(systemStatus.memory_usage) ? `${percentage(systemStatus.memory_usage)}%` : '--' }}</strong></div>
                <Progress :model-value="percentage(systemStatus.memory_usage)" />
                <span class="text-muted-foreground truncate text-xs" :title="t('dashboard.resources.used', { used: formatMemory(systemStatus.used_memory), total: formatMemory(systemStatus.total_memory) })">{{ t('dashboard.resources.used', { used: formatMemory(systemStatus.used_memory), total: formatMemory(systemStatus.total_memory) }) }}</span>
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-sm"><HardDrive class="text-muted-foreground size-4" />{{ t('dashboard.resources.disk') }}</span><strong class="tabular-nums">{{ hasMetric(systemStatus.disk_usage) ? `${percentage(systemStatus.disk_usage)}%` : '--' }}</strong></div>
                <Progress :model-value="percentage(systemStatus.disk_usage)" />
                <span class="text-muted-foreground truncate text-xs" :title="t('dashboard.resources.free', { free: formatDisk(systemStatus.free_disk), total: formatDisk(systemStatus.total_disk) })">{{ t('dashboard.resources.free', { free: formatDisk(systemStatus.free_disk), total: formatDisk(systemStatus.total_disk) }) }}</span>
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <div class="flex items-center justify-between"><span class="text-sm">{{ t('dashboard.resources.load') }}</span><strong class="tabular-nums">{{ formatDecimal(systemStatus.cpu_load1) }}</strong></div>
                <Progress :model-value="loadPercentage(systemStatus.cpu_load1, systemStatus.cpu_threads || systemStatus.cpu_cores)" />
                <span class="text-muted-foreground truncate text-xs" :title="t('dashboard.resources.loadWindow', { one: formatDecimal(systemStatus.cpu_load1), five: formatDecimal(systemStatus.cpu_load5), fifteen: formatDecimal(systemStatus.cpu_load15) })">{{ t('dashboard.resources.loadWindow', { one: formatDecimal(systemStatus.cpu_load1), five: formatDecimal(systemStatus.cpu_load5), fifteen: formatDecimal(systemStatus.cpu_load15) }) }}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter class="text-muted-foreground flex-wrap justify-between gap-2 text-xs"><span>{{ t('dashboard.resources.uptime', { value: formatSystemUptime(systemStatus, t) }) }}</span><span>{{ formatDateTime(systemStatus.current_time, locale) }}</span></CardFooter>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle class="flex items-center gap-2"><PackageCheck />{{ t('dashboard.version.title') }}</CardTitle>
            <CardDescription>{{ t('dashboard.version.description') }}</CardDescription>
            <CardAction><Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon-sm" :disabled="versionLoading" :aria-label="t('dashboard.version.check')" @click="refreshVersion"><Spinner v-if="versionLoading" /><RefreshCw v-else /></Button></TooltipTrigger><TooltipContent>{{ t('dashboard.version.check') }}</TooltipContent></Tooltip></CardAction>
          </CardHeader>
          <CardContent class="flex flex-col gap-3 pt-0">
            <Alert v-if="versionError" variant="destructive"><CircleAlert /><AlertTitle>{{ t('dashboard.version.loadFailed') }}</AlertTitle><AlertDescription>{{ versionError }}</AlertDescription></Alert>
            <template v-else>
              <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 flex-col gap-1">
                  <span class="text-muted-foreground text-xs">{{ t('dashboard.version.officialGame') }}</span>
                  <strong class="truncate text-xl font-semibold tabular-nums">{{ versionInfo.official?.version || '--' }}</strong>
                  <span v-if="versionInfo.official" class="text-muted-foreground text-xs">{{ t('dashboard.version.releaseMeta', { releaseId: versionInfo.official.release_id || '--', time: formatDateTime(versionInfo.official.published_at, locale) }) }}</span>
                </div>
                <div v-if="versionInfo.official" class="flex shrink-0 items-center gap-1.5">
                  <Badge :variant="versionInfo.official?.stale ? 'outline' : 'secondary'">{{ t(versionInfo.official?.stale ? 'dashboard.version.cached' : 'dashboard.version.officialSource') }}</Badge>
                  <Tooltip v-if="versionInfo.official?.update_url">
                    <TooltipTrigger as-child><Button variant="ghost" size="icon-sm" as-child><a :href="versionInfo.official.update_url" target="_blank" rel="noopener noreferrer" :aria-label="t('dashboard.version.openRelease')"><ExternalLink /></a></Button></TooltipTrigger>
                    <TooltipContent>{{ t('dashboard.version.openRelease') }}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <Alert v-if="versionInfo.official_check_error"><CircleAlert /><AlertTitle>{{ t('dashboard.version.officialCheckFailed') }}</AlertTitle><AlertDescription>{{ versionInfo.official?.stale ? t('dashboard.version.cachedDescription') : versionInfo.official_check_error }}</AlertDescription></Alert>
              <Separator />
              <div class="grid grid-cols-2 gap-4">
                <div class="flex min-w-0 flex-col gap-1">
                  <span class="text-muted-foreground text-xs">{{ t('dashboard.version.localSteamBuild') }}</span>
                  <strong class="truncate tabular-nums">{{ versionInfo.local?.version || '--' }}</strong>
                  <Badge :variant="versionInfo.installed ? 'secondary' : 'outline'" class="self-start">{{ t(versionInfo.installed ? 'dashboard.version.installed' : 'dashboard.version.notInstalled') }}</Badge>
                </div>
                <div class="flex min-w-0 flex-col gap-1">
                  <span class="text-muted-foreground text-xs">{{ t('dashboard.version.steamUpdateState') }}</span>
                  <strong>{{ t(steamUpdateStatusKey) }}</strong>
                  <span class="text-muted-foreground truncate text-xs">{{ t('dashboard.version.steamTargetBuild', { version: versionInfo.latest?.version || '--' }) }}</span>
                </div>
              </div>
              <Alert v-if="versionInfo.check_error"><CircleAlert /><AlertTitle>{{ t('dashboard.version.steamCheckFailed') }}</AlertTitle><AlertDescription>{{ versionInfo.check_error }}</AlertDescription></Alert>
              <div class="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p class="text-muted-foreground min-w-0 flex-1 truncate text-xs" :title="versionInfo.install_path">{{ versionInfo.install_path || t('dashboard.version.installPathMissing') }}</p>
                <p class="text-muted-foreground shrink-0 text-xs">{{ t('dashboard.version.checkedAt', { time: formatDateTime(versionInfo.checked_at, locale) }) }}</p>
              </div>
              <Alert v-if="versionInfo.update_method === 'steam-client'"><CircleAlert /><AlertTitle>{{ t('dashboard.version.steamManaged') }}</AlertTitle><AlertDescription>{{ t('dashboard.version.steamManagedDescription') }}</AlertDescription></Alert>
              <Alert v-else-if="versionInfo.installed && !versionInfo.update_supported"><CircleAlert /><AlertTitle>{{ t('dashboard.version.panelUnavailable') }}</AlertTitle><AlertDescription>{{ t(versionInfo.steamcmd_available ? 'dashboard.version.unsupportedInstall' : 'dashboard.version.steamcmdMissing') }}</AlertDescription></Alert>
              <div v-if="updateStatus" class="bg-muted flex flex-col gap-2 rounded-md p-3"><span class="text-sm font-medium">{{ t(updateStatus.is_completed ? 'dashboard.version.updateCompleted' : (updateStatus.is_running ? 'dashboard.version.updating' : 'dashboard.version.waiting')) }}</span><Progress v-if="hasMetric(updateStatus.progress)" :model-value="Number(updateStatus.progress)" /><p v-if="updateStatus.last_output" class="text-muted-foreground break-all text-xs">{{ updateStatus.last_output }}</p><p v-if="updateStatus.error" class="text-destructive text-xs">{{ updateStatus.error }}</p></div>
            </template>
          </CardContent>
          <CardFooter v-if="versionInfo.installed || isVersionOutdated"><Button size="sm" @click="router.push('/servers/releases')"><PackageCheck data-icon="inline-start" />{{ t('gameReleases.actions.open') }}</Button></CardFooter>
        </Card>
      </aside>
    </div>

  </div>
</template>

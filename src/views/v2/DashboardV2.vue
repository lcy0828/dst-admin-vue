<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Activity,
  ChevronRight,
  CircleAlert,
  CirclePlay,
  Cpu,
  Download,
  FolderPlus,
  Gauge,
  HardDrive,
  House,
  MemoryStick,
  PackageCheck,
  Play,
  RefreshCw,
  ScrollText,
  Settings,
  Square,
  UsersRound
} from '@lucide/vue'
import WorldLog from '@/components/WorldLog.vue'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
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
  canCleanFailedWorld,
  canConfigureWorld,
  canStartWorld,
  worldPrimaryAction,
  worldStatusLabel,
  worldStatusMessage,
  worldStatusVariant
} from '@/lib/worldRuntimeStatus.mjs'
import {
  formatDateTime,
  formatDecimal,
  formatDisk,
  formatMemory,
  formatServerUptime,
  formatSystemUptime,
  hasMetric,
  loadPercentage,
  percentage,
  useDashboardV2
} from '@/composables/useDashboardV2'

const router = useRouter()
const { locale, t } = useI18n()
const startDialogOpen = ref(false)
const selectedRoomId = ref('')
const selectedWorldIds = ref([])

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
  canUpdateGame,
  gameUpdateBusy,
  refreshDashboard,
  refreshSystem,
  refreshServers,
  refreshVersion,
  handleServerAction,
  cleanupFailedServer,
  startRoom,
  updateGame,
  resumeUpdatePolling
} = useDashboardV2()

const selectedRoom = computed(() => roomList.value.find(room => String(room.id) === selectedRoomId.value) || null)
const selectedWorlds = computed(() => (selectedRoom.value?.worlds || []).filter(world => (
  selectedWorldIds.value.includes(String(world.id)) && canStartWorld(world)
)))
const canStartRoom = computed(() => Boolean(selectedRoom.value && selectedWorlds.value.length && !serverLoading.value))

function openStartDialog() {
  const firstRoom = roomList.value[0]
  selectedRoomId.value = firstRoom ? String(firstRoom.id) : ''
  selectedWorldIds.value = (firstRoom?.worlds || []).filter(canStartWorld).map(world => String(world.id))
  startDialogOpen.value = true
}

function handleRoomSelection(value) {
  selectedRoomId.value = value
  const room = roomList.value.find(item => String(item.id) === value)
  selectedWorldIds.value = (room?.worlds || []).filter(canStartWorld).map(world => String(world.id))
}

function toggleWorld(worldId, checked) {
  const value = String(worldId)
  if (checked && !selectedWorldIds.value.includes(value)) selectedWorldIds.value.push(value)
  if (!checked) selectedWorldIds.value = selectedWorldIds.value.filter(id => id !== value)
}

async function submitStartRoom() {
  if (!canStartRoom.value) return
  const started = await startRoom(selectedRoom.value, selectedWorlds.value)
  if (started) startDialogOpen.value = false
}

function worldTypeLabel(type) {
  return t(`worldRuntime.types.${['forest', 'cave'].includes(type) ? type : 'unknown'}`)
}

onMounted(() => {
  refreshDashboard()
  resumeUpdatePolling()
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-6">
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

    <div class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>{{ t('dashboard.summary.runningShards') }}</CardTitle>
          <CardDescription>{{ t('dashboard.summary.serverProcesses') }}</CardDescription>
          <CardAction><span class="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md"><Activity /></span></CardAction>
        </CardHeader>
        <CardContent class="flex min-h-16 items-end justify-between gap-3 pt-1">
          <Skeleton v-if="serverLoading" class="h-9 w-24" />
          <strong v-else class="text-3xl font-semibold tabular-nums">{{ runningServerCount }}<span class="text-muted-foreground ml-1.5 text-sm font-normal">/ {{ serverList.length }}</span></strong>
          <Badge :variant="runningServerCount ? 'secondary' : 'outline'">{{ t(runningServerCount ? 'dashboard.summary.running' : 'dashboard.summary.notRunning') }}</Badge>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{{ t('dashboard.summary.onlinePlayers') }}</CardTitle>
          <CardDescription>{{ t('dashboard.summary.playerSummary') }}</CardDescription>
          <CardAction><span class="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md"><UsersRound /></span></CardAction>
        </CardHeader>
        <CardContent class="flex min-h-16 items-end justify-between gap-3 pt-1">
          <Skeleton v-if="playerLoading" class="h-9 w-24" />
          <strong v-else class="text-3xl font-semibold tabular-nums">{{ playerSummary.online }}<span class="text-muted-foreground ml-1.5 text-sm font-normal">{{ t('dashboard.summary.people') }}</span></strong>
          <span class="text-muted-foreground text-xs">{{ t('dashboard.summary.recordedPlayers', { count: playerSummary.total }) }}</span>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{{ t('dashboard.summary.roomsAndWorlds') }}</CardTitle>
          <CardDescription>{{ t('dashboard.summary.managedDirectories') }}</CardDescription>
          <CardAction><span class="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md"><House /></span></CardAction>
        </CardHeader>
        <CardContent class="flex min-h-16 items-end justify-between gap-3 pt-1">
          <Skeleton v-if="serverLoading" class="h-9 w-24" />
          <strong v-else class="text-3xl font-semibold tabular-nums">{{ roomList.length }}<span class="text-muted-foreground ml-1.5 text-sm font-normal">{{ t('dashboard.summary.roomUnit') }}</span></strong>
          <span class="text-muted-foreground text-xs">{{ t('dashboard.summary.worlds', { count: totalWorldCount }) }}</span>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{{ t('dashboard.summary.hostLoad') }}</CardTitle>
          <CardDescription>{{ systemStatus.os_info || t('dashboard.summary.waitingSystem') }}</CardDescription>
          <CardAction><span class="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md"><Cpu /></span></CardAction>
        </CardHeader>
        <CardContent class="flex min-h-16 items-end justify-between gap-3 pt-1">
          <Skeleton v-if="systemLoading" class="h-9 w-24" />
          <strong v-else class="text-3xl font-semibold tabular-nums">{{ hasMetric(systemStatus.cpu_usage) ? `${percentage(systemStatus.cpu_usage)}%` : '--' }}</strong>
          <span class="text-muted-foreground text-xs">{{ t('dashboard.summary.memory', { value: hasMetric(systemStatus.memory_usage) ? `${percentage(systemStatus.memory_usage)}%` : '--' }) }}</span>
        </CardContent>
      </Card>
    </div>

    <Alert v-if="playerError">
      <CircleAlert />
      <AlertTitle>{{ t('dashboard.playersUnavailable') }}</AlertTitle>
      <AlertDescription>{{ playerError }}</AlertDescription>
    </Alert>

    <div class="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
      <div class="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2"><Activity />{{ t('dashboard.servers.title') }}</CardTitle>
            <CardDescription>{{ t('dashboard.servers.description', { total: serverList.length, running: runningServerCount }) }}</CardDescription>
            <CardAction class="flex gap-1.5">
              <Button v-if="roomList.length" size="sm" @click="openStartDialog"><Play data-icon="inline-start" />{{ t('dashboard.servers.startRoom') }}</Button>
              <Button variant="outline" size="sm" :disabled="serverLoading" @click="refreshServers">
                <Spinner v-if="serverLoading" data-icon="inline-start" />
                <RefreshCw v-else data-icon="inline-start" />{{ t('common.actions.refresh') }}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent class="pt-1">
            <Table v-if="serverList.length && !serverError">
              <TableHeader>
                <TableRow>
                  <TableHead>{{ t('dashboard.servers.columns.status') }}</TableHead><TableHead>{{ t('dashboard.servers.columns.room') }}</TableHead><TableHead>{{ t('dashboard.servers.columns.world') }}</TableHead><TableHead>{{ t('dashboard.servers.columns.uptime') }}</TableHead><TableHead class="text-right">{{ t('dashboard.servers.columns.actions') }}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="server in serverList" :key="`${server.room_id}-${server.world_id}`">
                  <TableCell>
                    <Badge :variant="worldStatusVariant(server)">{{ worldStatusLabel(server, t) }}</Badge>
                    <p v-if="worldStatusMessage(server)" class="text-destructive mt-1 max-w-64 break-words text-xs">{{ worldStatusMessage(server) }}</p>
                  </TableCell>
                  <TableCell class="font-medium">{{ server.archive_name }}</TableCell>
                  <TableCell>{{ server.world_name }}</TableCell>
                  <TableCell class="text-muted-foreground">{{ formatServerUptime(server.start_time, t) }}</TableCell>
                  <TableCell>
                    <div class="flex justify-end gap-1.5">
                      <Button size="sm" :variant="worldPrimaryAction(server, t).variant" :disabled="serverLoading || worldPrimaryAction(server, t).disabled" @click="handleServerAction(server)">
                        <Spinner v-if="serverLoading" data-icon="inline-start" />
                        <Square v-else-if="worldPrimaryAction(server, t).kind === 'stop'" data-icon="inline-start" />
                        <Play v-else-if="worldPrimaryAction(server, t).kind === 'start'" data-icon="inline-start" />
                        {{ worldPrimaryAction(server, t).label }}
                      </Button>
                      <Button v-if="server.status === 'failed'" variant="outline" size="sm" :disabled="serverLoading || !canCleanFailedWorld(server)" @click="cleanupFailedServer(server)"><Square data-icon="inline-start" />{{ t('dashboard.servers.cleanupSession') }}</Button>
                      <Button variant="outline" size="sm" :disabled="!canConfigureWorld(server)" :title="!canConfigureWorld(server) ? t('dashboard.servers.configureDisabled') : ''" @click="router.push({ path: '/worlds/settings', query: { roomId: server.room_id, worldId: server.world_id } })"><Settings data-icon="inline-start" />{{ t('dashboard.servers.configure') }}</Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert v-else-if="serverError || roomError" variant="destructive">
              <CircleAlert /><AlertTitle>{{ t('dashboard.servers.loadFailed') }}</AlertTitle><AlertDescription>{{ serverError || roomError }}</AlertDescription>
              <AlertAction><Button size="sm" variant="outline" @click="refreshServers">{{ t('common.actions.retry') }}</Button></AlertAction>
            </Alert>

            <Empty v-else-if="!roomList.length" class="min-h-56 py-8">
              <EmptyHeader><EmptyMedia variant="icon"><FolderPlus /></EmptyMedia><EmptyTitle>{{ t('dashboard.servers.noRooms') }}</EmptyTitle><EmptyDescription>{{ t('dashboard.servers.noRoomsDescription') }}</EmptyDescription></EmptyHeader>
              <EmptyContent><Button size="sm" @click="router.push('/rooms/settings')">{{ t('dashboard.servers.createRoom') }}</Button></EmptyContent>
            </Empty>

            <Empty v-else class="min-h-56 py-8">
              <EmptyHeader><EmptyMedia variant="icon"><CirclePlay /></EmptyMedia><EmptyTitle>{{ t('dashboard.servers.notStarted') }}</EmptyTitle><EmptyDescription>{{ t('dashboard.servers.notStartedDescription') }}</EmptyDescription></EmptyHeader>
              <EmptyContent><Button size="sm" @click="openStartDialog">{{ t('dashboard.servers.startRoom') }}</Button></EmptyContent>
            </Empty>
          </CardContent>
          <CardFooter v-if="serverList.length" class="text-muted-foreground text-xs">{{ t('dashboard.servers.totalInstances', { count: serverList.length }) }}</CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2"><ScrollText />{{ t('dashboard.logs.title') }}</CardTitle>
            <CardDescription>{{ t('dashboard.logs.description') }}</CardDescription>
          </CardHeader>
          <CardContent v-if="roomList.length" class="h-[460px] min-h-[380px] pt-1"><WorldLog /></CardContent>
          <CardContent v-else class="pt-1">
            <Empty class="min-h-48 py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon"><ScrollText /></EmptyMedia>
                <EmptyTitle>{{ t('dashboard.logs.empty') }}</EmptyTitle>
                <EmptyDescription>{{ t('dashboard.logs.emptyDescription') }}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>

      <aside class="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2"><Gauge />{{ t('dashboard.resources.title') }}</CardTitle>
            <CardDescription>{{ systemStatus.os_info || t('dashboard.summary.waitingSystem') }}</CardDescription>
            <CardAction>
              <Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon-sm" :disabled="systemLoading" :aria-label="t('dashboard.resources.refresh')" @click="refreshSystem"><Spinner v-if="systemLoading" /><RefreshCw v-else /></Button></TooltipTrigger><TooltipContent>{{ t('dashboard.resources.refresh') }}</TooltipContent></Tooltip>
            </CardAction>
          </CardHeader>
          <CardContent class="flex flex-col gap-5 pt-1">
            <Alert v-if="systemError" variant="destructive"><CircleAlert /><AlertTitle>{{ t('dashboard.resources.unavailable') }}</AlertTitle><AlertDescription>{{ systemError }}</AlertDescription></Alert>
            <template v-else>
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-sm"><Cpu class="text-muted-foreground size-4" />CPU</span><strong class="tabular-nums">{{ hasMetric(systemStatus.cpu_usage) ? `${percentage(systemStatus.cpu_usage)}%` : '--' }}</strong></div>
                <Progress :model-value="percentage(systemStatus.cpu_usage)" class="h-2" />
                <span class="text-muted-foreground text-xs">{{ systemStatus.cpu_model || '--' }} · {{ t('dashboard.resources.coresThreads', { cores: systemStatus.cpu_cores || '--', threads: systemStatus.cpu_threads || '--' }) }}</span>
              </div>
              <Separator />
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-sm"><MemoryStick class="text-muted-foreground size-4" />{{ t('dashboard.resources.memory') }}</span><strong class="tabular-nums">{{ hasMetric(systemStatus.memory_usage) ? `${percentage(systemStatus.memory_usage)}%` : '--' }}</strong></div>
                <Progress :model-value="percentage(systemStatus.memory_usage)" class="h-2" />
                <span class="text-muted-foreground text-xs">{{ t('dashboard.resources.used', { used: formatMemory(systemStatus.used_memory), total: formatMemory(systemStatus.total_memory) }) }}</span>
              </div>
              <Separator />
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-sm"><HardDrive class="text-muted-foreground size-4" />{{ t('dashboard.resources.disk') }}</span><strong class="tabular-nums">{{ hasMetric(systemStatus.disk_usage) ? `${percentage(systemStatus.disk_usage)}%` : '--' }}</strong></div>
                <Progress :model-value="percentage(systemStatus.disk_usage)" class="h-2" />
                <span class="text-muted-foreground text-xs">{{ t('dashboard.resources.free', { free: formatDisk(systemStatus.free_disk), total: formatDisk(systemStatus.total_disk) }) }}</span>
              </div>
              <Separator />
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between"><span class="text-sm">{{ t('dashboard.resources.load') }}</span><strong class="tabular-nums">{{ formatDecimal(systemStatus.cpu_load1) }}</strong></div>
                <Progress :model-value="loadPercentage(systemStatus.cpu_load1, systemStatus.cpu_threads || systemStatus.cpu_cores)" class="h-2" />
                <span class="text-muted-foreground text-xs">{{ t('dashboard.resources.loadWindow', { one: formatDecimal(systemStatus.cpu_load1), five: formatDecimal(systemStatus.cpu_load5), fifteen: formatDecimal(systemStatus.cpu_load15) }) }}</span>
              </div>
            </template>
          </CardContent>
          <CardFooter class="text-muted-foreground justify-between gap-2 text-xs"><span>{{ t('dashboard.resources.uptime', { value: formatSystemUptime(systemStatus, t) }) }}</span><span>{{ formatDateTime(systemStatus.current_time, locale) }}</span></CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2"><PackageCheck />{{ t('dashboard.version.title') }}</CardTitle>
            <CardDescription>{{ t('dashboard.version.description') }}</CardDescription>
            <CardAction><Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon-sm" :disabled="versionLoading" :aria-label="t('dashboard.version.check')" @click="refreshVersion"><Spinner v-if="versionLoading" /><RefreshCw v-else /></Button></TooltipTrigger><TooltipContent>{{ t('dashboard.version.check') }}</TooltipContent></Tooltip></CardAction>
          </CardHeader>
          <CardContent class="flex flex-col gap-4 pt-1">
            <Alert v-if="versionError" variant="destructive"><CircleAlert /><AlertTitle>{{ t('dashboard.version.loadFailed') }}</AlertTitle><AlertDescription>{{ versionError }}</AlertDescription></Alert>
            <template v-else>
              <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <div class="flex min-w-0 flex-col gap-1"><span class="text-muted-foreground text-xs">{{ t('dashboard.version.current') }}</span><strong class="truncate tabular-nums">{{ versionInfo.local?.version || '--' }}</strong><Badge :variant="versionInfo.installed ? 'secondary' : 'outline'" class="self-start">{{ t(versionInfo.installed ? 'dashboard.version.installed' : 'dashboard.version.notInstalled') }}</Badge></div>
                <ChevronRight class="text-muted-foreground size-4" />
                <div class="flex min-w-0 flex-col gap-1"><span class="text-muted-foreground text-xs">{{ t('dashboard.version.latest') }}</span><strong class="truncate tabular-nums">{{ versionInfo.latest?.version || '--' }}</strong><Badge :variant="isVersionOutdated ? 'destructive' : 'outline'" class="self-start">{{ t(isVersionOutdated ? 'dashboard.version.updateAvailable' : 'dashboard.version.upToDate') }}</Badge></div>
              </div>
              <p class="text-muted-foreground truncate text-xs" :title="versionInfo.install_path">{{ versionInfo.install_path || t('dashboard.version.installPathMissing') }}</p>
              <Alert v-if="versionInfo.update_method === 'steam-client'"><CircleAlert /><AlertTitle>{{ t('dashboard.version.steamManaged') }}</AlertTitle><AlertDescription>{{ t('dashboard.version.steamManagedDescription') }}</AlertDescription></Alert>
              <Alert v-else-if="versionInfo.installed && !versionInfo.update_supported"><CircleAlert /><AlertTitle>{{ t('dashboard.version.panelUnavailable') }}</AlertTitle><AlertDescription>{{ t(versionInfo.steamcmd_available ? 'dashboard.version.unsupportedInstall' : 'dashboard.version.steamcmdMissing') }}</AlertDescription></Alert>
              <div v-if="updateStatus" class="bg-muted flex flex-col gap-2 rounded-md p-3"><span class="text-sm font-medium">{{ t(updateStatus.is_completed ? 'dashboard.version.updateCompleted' : (updateStatus.is_running ? 'dashboard.version.updating' : 'dashboard.version.waiting')) }}</span><Progress v-if="hasMetric(updateStatus.progress)" :model-value="Number(updateStatus.progress)" /><p v-if="updateStatus.last_output" class="text-muted-foreground break-all text-xs">{{ updateStatus.last_output }}</p><p v-if="updateStatus.error" class="text-destructive text-xs">{{ updateStatus.error }}</p></div>
            </template>
          </CardContent>
          <CardFooter v-if="canUpdateGame"><Button size="sm" :disabled="gameUpdateBusy" @click="updateGame"><Spinner v-if="gameUpdateBusy" data-icon="inline-start" /><Download v-else data-icon="inline-start" />{{ t(gameUpdateBusy ? 'dashboard.version.updateButtonBusy' : 'dashboard.version.updateButton') }}</Button></CardFooter>
        </Card>
      </aside>
    </div>

    <Dialog v-model:open="startDialogOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader><DialogTitle>{{ t('dashboard.startDialog.title') }}</DialogTitle><DialogDescription>{{ t('dashboard.startDialog.description') }}</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field><FieldLabel for="v2-room">{{ t('dashboard.startDialog.room') }}</FieldLabel><Select :model-value="selectedRoomId" @update:model-value="handleRoomSelection"><SelectTrigger id="v2-room"><SelectValue :placeholder="t('dashboard.startDialog.selectRoom')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="room in roomList" :key="room.id" :value="String(room.id)">{{ room.name }}</SelectItem></SelectGroup></SelectContent></Select></Field>
          <FieldSet><FieldLegend variant="label">{{ t('dashboard.startDialog.worlds') }}</FieldLegend><FieldGroup v-if="selectedRoom?.worlds?.length" class="gap-3"><Field v-for="world in selectedRoom.worlds" :key="world.id" orientation="horizontal" :data-disabled="!canStartWorld(world) || undefined"><Checkbox :id="`v2-world-${world.id}`" :model-value="selectedWorldIds.includes(String(world.id))" :disabled="!canStartWorld(world) || serverLoading" @update:model-value="toggleWorld(world.id, $event)" /><FieldLabel :for="`v2-world-${world.id}`" class="flex flex-1 flex-wrap items-center justify-between gap-2"><span>{{ world.name }}</span><span class="flex items-center gap-2"><Badge variant="outline">{{ worldTypeLabel(world.type) }}</Badge><Badge :variant="worldStatusVariant(world)">{{ worldStatusLabel(world, t) }}</Badge></span><span v-if="worldStatusMessage(world)" class="text-destructive basis-full text-xs">{{ worldStatusMessage(world) }}</span></FieldLabel></Field></FieldGroup><Alert v-else><CircleAlert /><AlertTitle>{{ t('dashboard.startDialog.noWorlds') }}</AlertTitle><AlertDescription>{{ t('dashboard.startDialog.noWorldsDescription') }}</AlertDescription></Alert></FieldSet>
        </FieldGroup>
        <DialogFooter><Button variant="outline" @click="startDialogOpen = false">{{ t('common.actions.cancel') }}</Button><Button :disabled="!canStartRoom" @click="submitStartRoom"><Spinner v-if="serverLoading" data-icon="inline-start" /><Play v-else data-icon="inline-start" />{{ t('dashboard.startDialog.submit') }}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

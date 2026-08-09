<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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
  formatDateTime,
  formatDecimal,
  formatDisk,
  formatMemory,
  formatServerUptime,
  hasMetric,
  loadPercentage,
  percentage,
  useDashboardV2
} from '@/composables/useDashboardV2'

const router = useRouter()
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
  startRoom,
  updateGame,
  resumeUpdatePolling
} = useDashboardV2()

const selectedRoom = computed(() => roomList.value.find(room => String(room.id) === selectedRoomId.value) || null)
const selectedWorlds = computed(() => (selectedRoom.value?.worlds || []).filter(world => selectedWorldIds.value.includes(String(world.id))))
const canStartRoom = computed(() => Boolean(selectedRoom.value && selectedWorlds.value.length && !serverLoading.value))

function openStartDialog() {
  const firstRoom = roomList.value[0]
  selectedRoomId.value = firstRoom ? String(firstRoom.id) : ''
  selectedWorldIds.value = (firstRoom?.worlds || []).map(world => String(world.id))
  startDialogOpen.value = true
}

function handleRoomSelection(value) {
  selectedRoomId.value = value
  const room = roomList.value.find(item => String(item.id) === value)
  selectedWorldIds.value = (room?.worlds || []).map(world => String(world.id))
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

function statusLabel(status) {
  if (status === 'running') return '在线'
  if (status === 'stopped') return '离线'
  return '未知'
}

function worldTypeLabel(type) {
  if (type === 'forest') return '森林'
  if (type === 'cave') return '洞穴'
  return '未知'
}

onMounted(() => {
  refreshDashboard()
  resumeUpdatePolling()
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-5">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-normal">服务总览</h1>
        <p class="text-muted-foreground mt-1 text-sm">
          专服状态、世界日志与主机资源
          <span class="mx-1">·</span>
          更新于 {{ formatDateTime(lastRefreshedAt) }}
        </p>
      </div>
      <Button variant="outline" size="sm" :disabled="dashboardLoading" @click="refreshDashboard">
        <Spinner v-if="dashboardLoading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        刷新全部
      </Button>
    </header>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle>运行分片</CardTitle>
          <CardDescription>当前专服进程</CardDescription>
          <CardAction><Activity class="text-muted-foreground size-4" /></CardAction>
        </CardHeader>
        <CardContent class="flex items-end justify-between pt-0">
          <Skeleton v-if="serverLoading" class="h-8 w-20" />
          <strong v-else class="text-2xl font-semibold tabular-nums">{{ runningServerCount }}<span class="text-muted-foreground ml-1 text-sm font-normal">/ {{ serverList.length }}</span></strong>
          <Badge :variant="runningServerCount ? 'secondary' : 'outline'">{{ runningServerCount ? '运行中' : '未运行' }}</Badge>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>在线玩家</CardTitle>
          <CardDescription>实时玩家汇总</CardDescription>
          <CardAction><UsersRound class="text-muted-foreground size-4" /></CardAction>
        </CardHeader>
        <CardContent class="flex items-end justify-between pt-0">
          <Skeleton v-if="playerLoading" class="h-8 w-20" />
          <strong v-else class="text-2xl font-semibold tabular-nums">{{ playerSummary.online }}<span class="text-muted-foreground ml-1 text-sm font-normal">人</span></strong>
          <span class="text-muted-foreground text-xs">记录 {{ playerSummary.total }} 人</span>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>房间与世界</CardTitle>
          <CardDescription>当前管理目录</CardDescription>
          <CardAction><House class="text-muted-foreground size-4" /></CardAction>
        </CardHeader>
        <CardContent class="flex items-end justify-between pt-0">
          <Skeleton v-if="serverLoading" class="h-8 w-20" />
          <strong v-else class="text-2xl font-semibold tabular-nums">{{ roomList.length }}<span class="text-muted-foreground ml-1 text-sm font-normal">个房间</span></strong>
          <span class="text-muted-foreground text-xs">{{ totalWorldCount }} 个世界</span>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>主机负载</CardTitle>
          <CardDescription>{{ systemStatus.os_info || '等待系统信息' }}</CardDescription>
          <CardAction><Cpu class="text-muted-foreground size-4" /></CardAction>
        </CardHeader>
        <CardContent class="flex items-end justify-between pt-0">
          <Skeleton v-if="systemLoading" class="h-8 w-20" />
          <strong v-else class="text-2xl font-semibold tabular-nums">{{ hasMetric(systemStatus.cpu_usage) ? `${percentage(systemStatus.cpu_usage)}%` : '--' }}</strong>
          <span class="text-muted-foreground text-xs">内存 {{ hasMetric(systemStatus.memory_usage) ? `${percentage(systemStatus.memory_usage)}%` : '--' }}</span>
        </CardContent>
      </Card>
    </div>

    <Alert v-if="playerError">
      <CircleAlert />
      <AlertTitle>部分玩家数据不可用</AlertTitle>
      <AlertDescription>{{ playerError }}</AlertDescription>
    </Alert>

    <div class="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div class="flex min-w-0 flex-col gap-5">
        <Card size="sm">
          <CardHeader>
            <CardTitle class="flex items-center gap-2"><Activity />服务器状态</CardTitle>
            <CardDescription>{{ serverList.length }} 个分片，{{ runningServerCount }} 个运行中</CardDescription>
            <CardAction class="flex gap-1.5">
              <Button v-if="roomList.length" size="sm" @click="openStartDialog"><Play data-icon="inline-start" />启动房间</Button>
              <Button variant="outline" size="sm" :disabled="serverLoading" @click="refreshServers">
                <Spinner v-if="serverLoading" data-icon="inline-start" />
                <RefreshCw v-else data-icon="inline-start" />刷新
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent class="pt-0">
            <Table v-if="serverList.length && !serverError">
              <TableHeader>
                <TableRow>
                  <TableHead>状态</TableHead><TableHead>房间</TableHead><TableHead>世界</TableHead><TableHead>运行时间</TableHead><TableHead class="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="server in serverList" :key="`${server.room_id}-${server.world_id}`">
                  <TableCell><Badge :variant="server.status === 'running' ? 'secondary' : 'outline'">{{ statusLabel(server.status) }}</Badge></TableCell>
                  <TableCell class="font-medium">{{ server.archive_name }}</TableCell>
                  <TableCell>{{ server.world_name }}</TableCell>
                  <TableCell class="text-muted-foreground">{{ formatServerUptime(server.start_time) }}</TableCell>
                  <TableCell>
                    <div class="flex justify-end gap-1.5">
                      <Button size="sm" :variant="server.status === 'running' ? 'destructive' : 'secondary'" :disabled="serverLoading" @click="handleServerAction(server)">
                        <Square v-if="server.status === 'running'" data-icon="inline-start" /><Play v-else data-icon="inline-start" />{{ server.status === 'running' ? '停止' : '启动' }}
                      </Button>
                      <Button variant="outline" size="sm" @click="router.push({ path: '/worlds/settings', query: { roomId: server.room_id, worldId: server.world_id } })"><Settings data-icon="inline-start" />配置</Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert v-else-if="serverError || roomError" variant="destructive">
              <CircleAlert /><AlertTitle>服务器数据加载失败</AlertTitle><AlertDescription>{{ serverError || roomError }}</AlertDescription>
              <AlertAction><Button size="sm" variant="outline" @click="refreshServers">重试</Button></AlertAction>
            </Alert>

            <Empty v-else-if="!roomList.length" class="min-h-40 py-6">
              <EmptyHeader><EmptyMedia variant="icon"><FolderPlus /></EmptyMedia><EmptyTitle>还没有房间</EmptyTitle><EmptyDescription>创建房间并配置世界后即可启动专服。</EmptyDescription></EmptyHeader>
              <EmptyContent><Button size="sm" @click="router.push('/rooms/settings')">创建房间</Button></EmptyContent>
            </Empty>

            <Empty v-else class="min-h-40 py-6">
              <EmptyHeader><EmptyMedia variant="icon"><CirclePlay /></EmptyMedia><EmptyTitle>服务器尚未启动</EmptyTitle><EmptyDescription>选择房间和世界分片开始运行。</EmptyDescription></EmptyHeader>
              <EmptyContent><Button size="sm" @click="openStartDialog">启动房间</Button></EmptyContent>
            </Empty>
          </CardContent>
          <CardFooter v-if="serverList.length" class="text-muted-foreground text-xs">共 {{ serverList.length }} 个服务器实例</CardFooter>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle class="flex items-center gap-2"><ScrollText />世界日志</CardTitle>
            <CardDescription>查看世界分片的实时输出与连接状态</CardDescription>
          </CardHeader>
          <CardContent class="h-[420px] min-h-[360px] pt-0"><WorldLog /></CardContent>
        </Card>
      </div>

      <aside class="flex min-w-0 flex-col gap-5">
        <Card size="sm">
          <CardHeader>
            <CardTitle class="flex items-center gap-2"><Gauge />系统资源</CardTitle>
            <CardDescription>{{ systemStatus.os_info || '等待系统信息' }}</CardDescription>
            <CardAction>
              <Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon-sm" :disabled="systemLoading" aria-label="刷新系统资源" @click="refreshSystem"><Spinner v-if="systemLoading" /><RefreshCw v-else /></Button></TooltipTrigger><TooltipContent>刷新系统资源</TooltipContent></Tooltip>
            </CardAction>
          </CardHeader>
          <CardContent class="flex flex-col gap-3 pt-0">
            <Alert v-if="systemError" variant="destructive"><CircleAlert /><AlertTitle>系统状态不可用</AlertTitle><AlertDescription>{{ systemError }}</AlertDescription></Alert>
            <template v-else>
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-sm"><Cpu class="text-muted-foreground size-4" />CPU</span><strong class="tabular-nums">{{ hasMetric(systemStatus.cpu_usage) ? `${percentage(systemStatus.cpu_usage)}%` : '--' }}</strong></div>
                <Progress :model-value="percentage(systemStatus.cpu_usage)" />
                <span class="text-muted-foreground text-xs">{{ systemStatus.cpu_model || '--' }} · {{ systemStatus.cpu_cores || '--' }} 核 / {{ systemStatus.cpu_threads || '--' }} 线程</span>
              </div>
              <Separator />
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-sm"><MemoryStick class="text-muted-foreground size-4" />内存</span><strong class="tabular-nums">{{ hasMetric(systemStatus.memory_usage) ? `${percentage(systemStatus.memory_usage)}%` : '--' }}</strong></div>
                <Progress :model-value="percentage(systemStatus.memory_usage)" />
                <span class="text-muted-foreground text-xs">已用 {{ formatMemory(systemStatus.used_memory) }} / {{ formatMemory(systemStatus.total_memory) }}</span>
              </div>
              <Separator />
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-sm"><HardDrive class="text-muted-foreground size-4" />磁盘</span><strong class="tabular-nums">{{ hasMetric(systemStatus.disk_usage) ? `${percentage(systemStatus.disk_usage)}%` : '--' }}</strong></div>
                <Progress :model-value="percentage(systemStatus.disk_usage)" />
                <span class="text-muted-foreground text-xs">空闲 {{ formatDisk(systemStatus.free_disk) }} / {{ formatDisk(systemStatus.total_disk) }}</span>
              </div>
              <Separator />
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between"><span class="text-sm">系统负载</span><strong class="tabular-nums">{{ formatDecimal(systemStatus.cpu_load1) }}</strong></div>
                <Progress :model-value="loadPercentage(systemStatus.cpu_load1, systemStatus.cpu_threads || systemStatus.cpu_cores)" />
                <span class="text-muted-foreground text-xs">1 / 5 / 15 分钟 · {{ formatDecimal(systemStatus.cpu_load1) }} / {{ formatDecimal(systemStatus.cpu_load5) }} / {{ formatDecimal(systemStatus.cpu_load15) }}</span>
              </div>
            </template>
          </CardContent>
          <CardFooter class="text-muted-foreground justify-between gap-2 text-xs"><span>运行 {{ systemStatus.uptime_formatted || '--' }}</span><span>{{ formatDateTime(systemStatus.current_time) }}</span></CardFooter>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle class="flex items-center gap-2"><PackageCheck />版本与更新</CardTitle>
            <CardDescription>游戏服务端与 Steam 版本</CardDescription>
            <CardAction><Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon-sm" :disabled="versionLoading" aria-label="检查游戏版本" @click="refreshVersion"><Spinner v-if="versionLoading" /><RefreshCw v-else /></Button></TooltipTrigger><TooltipContent>检查游戏版本</TooltipContent></Tooltip></CardAction>
          </CardHeader>
          <CardContent class="flex flex-col gap-3 pt-0">
            <Alert v-if="versionError" variant="destructive"><CircleAlert /><AlertTitle>版本读取失败</AlertTitle><AlertDescription>{{ versionError }}</AlertDescription></Alert>
            <template v-else>
              <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <div class="flex min-w-0 flex-col gap-1"><span class="text-muted-foreground text-xs">当前版本</span><strong class="truncate tabular-nums">{{ versionInfo.local?.version || '--' }}</strong><Badge :variant="versionInfo.installed ? 'secondary' : 'outline'" class="self-start">{{ versionInfo.installed ? '已安装' : '未安装' }}</Badge></div>
                <ChevronRight class="text-muted-foreground size-4" />
                <div class="flex min-w-0 flex-col gap-1"><span class="text-muted-foreground text-xs">Steam 最新</span><strong class="truncate tabular-nums">{{ versionInfo.latest?.version || '--' }}</strong><Badge :variant="isVersionOutdated ? 'destructive' : 'outline'" class="self-start">{{ isVersionOutdated ? '可更新' : '已最新' }}</Badge></div>
              </div>
              <p class="text-muted-foreground truncate text-xs" :title="versionInfo.install_path">{{ versionInfo.install_path || '未配置安装位置' }}</p>
              <Alert v-if="versionInfo.update_method === 'steam-client'"><CircleAlert /><AlertTitle>由 Steam 客户端管理</AlertTitle><AlertDescription>macOS 安装请在 Steam 中更新游戏。</AlertDescription></Alert>
              <Alert v-else-if="versionInfo.installed && !versionInfo.update_supported"><CircleAlert /><AlertTitle>面板更新不可用</AlertTitle><AlertDescription>{{ versionInfo.steamcmd_available ? '当前安装方式不支持面板更新。' : '未检测到 SteamCMD。' }}</AlertDescription></Alert>
              <div v-if="updateStatus" class="bg-muted flex flex-col gap-2 rounded-md p-3"><span class="text-sm font-medium">{{ updateStatus.is_completed ? '更新已完成' : (updateStatus.is_running ? '正在更新' : '等待更新') }}</span><Progress v-if="hasMetric(updateStatus.progress)" :model-value="Number(updateStatus.progress)" /><p v-if="updateStatus.last_output" class="text-muted-foreground break-all text-xs">{{ updateStatus.last_output }}</p><p v-if="updateStatus.error" class="text-destructive text-xs">{{ updateStatus.error }}</p></div>
            </template>
          </CardContent>
          <CardFooter v-if="canUpdateGame"><Button size="sm" :disabled="gameUpdateBusy" @click="updateGame"><Spinner v-if="gameUpdateBusy" data-icon="inline-start" /><Download v-else data-icon="inline-start" />{{ gameUpdateBusy ? '更新中' : '更新游戏' }}</Button></CardFooter>
        </Card>
      </aside>
    </div>

    <Dialog v-model:open="startDialogOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader><DialogTitle>启动房间</DialogTitle><DialogDescription>选择需要启动的房间和世界分片。</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field><FieldLabel for="v2-room">房间</FieldLabel><Select :model-value="selectedRoomId" @update:model-value="handleRoomSelection"><SelectTrigger id="v2-room"><SelectValue placeholder="选择房间" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="room in roomList" :key="room.id" :value="String(room.id)">{{ room.name }}</SelectItem></SelectGroup></SelectContent></Select></Field>
          <FieldSet><FieldLegend variant="label">世界分片</FieldLegend><FieldGroup v-if="selectedRoom?.worlds?.length" class="gap-3"><Field v-for="world in selectedRoom.worlds" :key="world.id" orientation="horizontal"><Checkbox :id="`v2-world-${world.id}`" :model-value="selectedWorldIds.includes(String(world.id))" @update:model-value="toggleWorld(world.id, $event)" /><FieldLabel :for="`v2-world-${world.id}`" class="flex flex-1 items-center justify-between"><span>{{ world.name }}</span><Badge variant="outline">{{ worldTypeLabel(world.type) }}</Badge></FieldLabel></Field></FieldGroup><Alert v-else><CircleAlert /><AlertTitle>没有可用世界</AlertTitle><AlertDescription>请先完成世界配置。</AlertDescription></Alert></FieldSet>
        </FieldGroup>
        <DialogFooter><Button variant="outline" @click="startDialogOpen = false">取消</Button><Button :disabled="!canStartRoom" @click="submitStartRoom"><Spinner v-if="serverLoading" data-icon="inline-start" /><Play v-else data-icon="inline-start" />启动所选世界</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

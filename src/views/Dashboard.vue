<template>
  <div class="dashboard-page">
    <header class="overview-header">
      <div>
        <h1>服务总览</h1>
        <p>
          专服状态、世界日志与主机资源
          <span aria-hidden="true">·</span>
          更新于 {{ formatCheckedAt(systemStatus.current_time) }}
        </p>
      </div>
      <UiButton variant="outline" size="sm" :disabled="dashboardRefreshing" @click="refreshDashboard">
        <Spinner v-if="dashboardRefreshing" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        刷新全部
      </UiButton>
    </header>

    <Card size="sm" class="overview-strip" aria-label="服务概况">
      <CardContent class="overview-metrics">
        <div class="overview-metric">
          <Activity aria-hidden="true" />
          <div>
            <span>运行分片</span>
            <strong>{{ runningServerCount }} <small>/ {{ serverList.length }}</small></strong>
          </div>
          <Badge :variant="runningServerCount > 0 ? 'secondary' : 'outline'">
            {{ runningServerCount > 0 ? '运行中' : '未运行' }}
          </Badge>
        </div>
        <div class="overview-metric">
          <UsersRound aria-hidden="true" />
          <div>
            <span>在线玩家</span>
            <strong>{{ playerSummary.online }} <small>人</small></strong>
          </div>
          <span class="metric-note">记录 {{ playerSummary.total }} 人</span>
        </div>
        <div class="overview-metric">
          <FolderPlus aria-hidden="true" />
          <div>
            <span>房间与世界</span>
            <strong>{{ roomList.length }} <small>房间</small></strong>
          </div>
          <span class="metric-note">{{ totalWorldCount }} 个分片</span>
        </div>
        <div class="overview-metric">
          <Gauge aria-hidden="true" />
          <div>
            <span>主机负载</span>
            <strong>{{ hasMetric(systemStatus.cpu_usage) ? metricPercentage(systemStatus.cpu_usage) + '%' : '--' }}</strong>
          </div>
          <span class="metric-note">内存 {{ hasMetric(systemStatus.memory_usage) ? metricPercentage(systemStatus.memory_usage) + '%' : '--' }}</span>
        </div>
      </CardContent>
    </Card>

    <div class="operations-layout">
      <main class="operations-main">
        <Card size="sm" aria-labelledby="server-monitor-title">
          <CardHeader>
            <CardTitle id="server-monitor-title" class="card-title-with-icon">
              <Activity aria-hidden="true" />
              服务器状态
            </CardTitle>
            <CardDescription>{{ serverList.length }} 个分片，{{ runningServerCount }} 个运行中</CardDescription>
            <CardAction>
              <UiButton variant="outline" size="sm" :disabled="serverLoading" @click="refreshServerData">
                <Spinner v-if="serverLoading" data-icon="inline-start" />
                <RefreshCw v-else data-icon="inline-start" />
                刷新
              </UiButton>
            </CardAction>
          </CardHeader>
          <CardContent class="server-content">
            <ShadcnTable v-if="serverList.length > 0 && !serverDataError">
              <TableHeader>
                <TableRow>
                  <TableHead>状态</TableHead>
                  <TableHead>房间</TableHead>
                  <TableHead>世界</TableHead>
                  <TableHead>启动时间</TableHead>
                  <TableHead>运行时间</TableHead>
                  <TableHead class="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="server in serverList" :key="`${server.room_id}-${server.world_id}`">
                  <TableCell>
                    <Badge :variant="server.status === 'running' ? 'secondary' : 'outline'">
                      {{ getServerStatusName(server.status) }}
                    </Badge>
                  </TableCell>
                  <TableCell class="font-medium">{{ server.archive_name }}</TableCell>
                  <TableCell>{{ server.world_name }}</TableCell>
                  <TableCell class="text-muted-foreground">{{ server.start_time || '--' }}</TableCell>
                  <TableCell class="text-muted-foreground">{{ formatServerUptime(server.start_time) }}</TableCell>
                  <TableCell>
                    <div class="server-actions">
                      <UiButton
                        size="sm"
                        :variant="server.status === 'running' ? 'destructive' : 'secondary'"
                        :disabled="serverLoading"
                        @click="handleServerAction(server)"
                      >
                        <Square v-if="server.status === 'running'" data-icon="inline-start" />
                        <Play v-else data-icon="inline-start" />
                        {{ server.status === 'running' ? '停止' : '启动' }}
                      </UiButton>
                      <UiButton size="sm" variant="outline" :disabled="serverLoading" @click="handleConfigure(server)">
                        <Settings data-icon="inline-start" />
                        配置
                      </UiButton>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </ShadcnTable>

            <Alert v-else-if="serverDataError" variant="destructive">
              <CircleAlert />
              <AlertTitle>{{ serverErrorTitle }}</AlertTitle>
              <AlertDescription>{{ serverDataError }}</AlertDescription>
              <AlertAction class="server-state-actions">
                <UiButton variant="outline" size="sm" @click="goToSystemSettings">系统设置</UiButton>
                <UiButton size="sm" @click="refreshServerData">重试</UiButton>
              </AlertAction>
            </Alert>

            <Empty v-else-if="roomList.length === 0" class="server-empty">
              <EmptyHeader>
                <EmptyMedia variant="icon"><FolderPlus /></EmptyMedia>
                <EmptyTitle>当前目标还没有房间</EmptyTitle>
                <EmptyDescription>创建房间并配置至少一个世界后，即可启动专服。</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div class="server-state-actions">
                  <UiButton variant="outline" size="sm" @click="refreshServerData">重新检查</UiButton>
                  <UiButton size="sm" @click="createRoom">创建房间</UiButton>
                </div>
              </EmptyContent>
            </Empty>

            <Empty v-else class="server-empty">
              <EmptyHeader>
                <EmptyMedia variant="icon"><CirclePlay /></EmptyMedia>
                <EmptyTitle>服务器尚未启动</EmptyTitle>
                <EmptyDescription>已识别 {{ roomList.length }} 个房间，可选择需要启动的世界分片。</EmptyDescription>
              </EmptyHeader>
              <EmptyContent><UiButton size="sm" @click="openStartRoomDialog">启动房间</UiButton></EmptyContent>
            </Empty>
          </CardContent>
          <CardFooter v-if="serverList.length > 0 && !serverDataError" class="server-footer">
            共 {{ serverList.length }} 个服务器实例，{{ runningServerCount }} 个运行中
          </CardFooter>
        </Card>

        <Card size="sm" class="world-log-card">
          <CardHeader>
            <CardTitle class="card-title-with-icon">
              <ScrollText aria-hidden="true" />
              世界日志
            </CardTitle>
            <CardDescription>查看世界分片的实时输出与连接状态</CardDescription>
          </CardHeader>
          <CardContent class="world-log-content">
            <WorldLog ref="worldLog" />
          </CardContent>
        </Card>
      </main>

      <aside class="operations-rail">
        <Card size="sm" aria-labelledby="system-resource-title">
          <CardHeader>
            <CardTitle id="system-resource-title" class="card-title-with-icon">
              <Gauge aria-hidden="true" />
              系统资源
            </CardTitle>
            <CardDescription>{{ systemStatus.os_info || '等待系统信息' }}</CardDescription>
            <CardAction>
              <Tooltip>
                <TooltipTrigger as-child>
                  <UiButton
                    variant="ghost"
                    size="icon-sm"
                    aria-label="刷新系统资源"
                    :disabled="systemLoading"
                    @click="refreshSystemStatus"
                  >
                    <Spinner v-if="systemLoading" />
                    <RefreshCw v-else />
                  </UiButton>
                </TooltipTrigger>
                <TooltipContent>刷新系统资源</TooltipContent>
              </Tooltip>
            </CardAction>
          </CardHeader>
          <CardContent class="resource-list">
            <template v-if="systemLoading">
              <div v-for="metric in 4" :key="metric" class="resource-row" aria-busy="true">
                <div class="resource-label"><Skeleton class="h-4 w-24" /><Skeleton class="h-4 w-10" /></div>
                <Skeleton class="h-2 w-full" />
                <Skeleton class="h-3 w-3/4" />
              </div>
            </template>
            <template v-else>
              <div class="resource-row">
                <div class="resource-label">
                  <span>CPU 使用率</span>
                  <strong>{{ hasMetric(systemStatus.cpu_usage) ? metricPercentage(systemStatus.cpu_usage) + '%' : '--' }}</strong>
                </div>
                <UiProgress v-if="hasMetric(systemStatus.cpu_usage)" :model-value="metricPercentage(systemStatus.cpu_usage)" />
                <span class="resource-detail">
                  {{ systemStatus.cpu_model || '--' }} · {{ displayMetric(systemStatus.cpu_cores) }} 核心 / {{ displayMetric(systemStatus.cpu_threads) }} 线程
                  <template v-if="systemStatus.cpu_mhz"> · {{ systemStatus.cpu_mhz }} MHz</template>
                </span>
              </div>
              <div class="resource-row">
                <div class="resource-label">
                  <span>内存使用率</span>
                  <strong>{{ hasMetric(systemStatus.memory_usage) ? metricPercentage(systemStatus.memory_usage) + '%' : '--' }}</strong>
                </div>
                <UiProgress v-if="hasMetric(systemStatus.memory_usage)" :model-value="metricPercentage(systemStatus.memory_usage)" />
                <span class="resource-detail">
                  总计 {{ formatMemory(systemStatus.total_memory) }} · 已用 {{ formatMemory(systemStatus.used_memory) }} · 空闲 {{ formatMemory(systemStatus.free_memory) }}
                </span>
              </div>
              <div class="resource-row">
                <div class="resource-label">
                  <span>磁盘使用率</span>
                  <strong>{{ hasMetric(systemStatus.disk_usage) ? metricPercentage(systemStatus.disk_usage) + '%' : '--' }}</strong>
                </div>
                <UiProgress v-if="hasMetric(systemStatus.disk_usage)" :model-value="metricPercentage(systemStatus.disk_usage)" />
                <span class="resource-detail">
                  总计 {{ formatDisk(systemStatus.total_disk) }} · 已用 {{ formatDisk(systemStatus.used_disk) }} · 空闲 {{ formatDisk(systemStatus.free_disk) }}
                </span>
              </div>
              <div class="resource-row">
                <div class="resource-label">
                  <span>系统负载</span>
                  <strong>{{ hasMetric(systemStatus.cpu_load1) ? formatDecimal(systemStatus.cpu_load1) : '--' }}</strong>
                </div>
                <UiProgress v-if="hasMetric(systemStatus.cpu_load1)" :model-value="loadPercentage(systemStatus.cpu_load1)" />
                <span class="resource-detail">1 / 5 / 15 分钟 · {{ formatDecimal(systemStatus.cpu_load1) }} / {{ formatDecimal(systemStatus.cpu_load5) }} / {{ formatDecimal(systemStatus.cpu_load15) }}</span>
              </div>
            </template>
          </CardContent>
          <CardFooter class="system-meta">
            <span><Cpu aria-hidden="true" />{{ displayMetric(systemStatus.cpu_cores) }} 核 / {{ displayMetric(systemStatus.cpu_threads) }} 线程</span>
            <span><Clock3 aria-hidden="true" />运行 {{ systemStatus.uptime_formatted || '--' }}</span>
          </CardFooter>
        </Card>

        <Card size="sm" aria-labelledby="version-title">
          <CardHeader>
            <CardTitle id="version-title" class="card-title-with-icon">
              <PackageCheck aria-hidden="true" />
              版本与更新
            </CardTitle>
            <CardDescription>游戏服务端与 Steam 版本</CardDescription>
            <CardAction>
              <Tooltip>
                <TooltipTrigger as-child>
                  <UiButton
                    variant="ghost"
                    size="icon-sm"
                    aria-label="检查游戏版本"
                    :disabled="versionLoading || gameUpdateBusy"
                    @click="getVersionInfo"
                  >
                    <Spinner v-if="versionLoading" />
                    <RefreshCw v-else />
                  </UiButton>
                </TooltipTrigger>
                <TooltipContent>检查游戏版本</TooltipContent>
              </Tooltip>
            </CardAction>
          </CardHeader>
          <CardContent class="version-content">
            <div v-if="versionLoading" class="inline-loading">
              <Spinner />
              <span>正在获取版本信息...</span>
            </div>
            <Alert v-else-if="versionError && !versionInfo.local" variant="destructive">
              <CircleAlert />
              <AlertTitle>版本读取失败</AlertTitle>
              <AlertDescription>{{ versionError }}</AlertDescription>
            </Alert>
            <template v-else>
              <div class="version-comparison">
                <div>
                  <span>当前版本</span>
                  <strong>{{ versionInfo.local?.version || '--' }}</strong>
                  <Badge :variant="versionInfo.installed ? 'secondary' : 'outline'">
                    {{ versionInfo.installed ? '已安装' : '未安装' }}
                  </Badge>
                </div>
                <ChevronRight aria-hidden="true" />
                <div>
                  <span>Steam 最新</span>
                  <a
                    v-if="versionInfo.latest?.update_url"
                    :href="versionInfo.latest.update_url"
                    target="_blank"
                    rel="noopener noreferrer"
                  >{{ versionInfo.latest.version }}</a>
                  <strong v-else>{{ versionInfo.latest?.version || '--' }}</strong>
                  <Badge :variant="isVersionOutdated ? 'destructive' : 'outline'">
                    {{ versionInfo.latest?.version ? (isVersionOutdated ? '可更新' : '已最新') : '待检查' }}
                  </Badge>
                </div>
              </div>
              <p class="version-path" :title="versionInfo.install_path || ''">
                {{ versionInfo.install_path || '未配置安装位置' }}
              </p>
              <div class="version-meta">
                <span v-if="versionInfo.app_id">App ID {{ versionInfo.app_id }}</span>
                <span v-if="versionInfo.checked_at">检查于 {{ formatCheckedAt(versionInfo.checked_at) }}</span>
              </div>

              <Alert v-if="!versionInfo.installed && !versionLoading" variant="destructive">
                <CircleAlert />
                <AlertTitle>未检测到 DST 安装</AlertTitle>
                <AlertDescription>请检查系统设置中的服务端目录。</AlertDescription>
              </Alert>
              <Alert v-else-if="versionInfo.update_method === 'steam-client'">
                <CircleAlert />
                <AlertTitle>由 Steam 客户端管理</AlertTitle>
                <AlertDescription>macOS 安装请在 Steam 中更新游戏。</AlertDescription>
              </Alert>
              <Alert v-else-if="versionInfo.installed && !versionInfo.update_supported">
                <CircleAlert />
                <AlertTitle>面板更新不可用</AlertTitle>
                <AlertDescription>{{ versionInfo.steamcmd_available ? '当前安装方式不支持面板更新。' : '未检测到 SteamCMD。' }}</AlertDescription>
              </Alert>
              <Alert v-if="versionInfo.check_error || (versionError && versionInfo.local)" variant="destructive">
                <CircleAlert />
                <AlertTitle>Steam 版本检查失败</AlertTitle>
                <AlertDescription>{{ versionInfo.check_error || versionError }}</AlertDescription>
              </Alert>
              <Alert v-if="isVersionOutdated">
                <Download />
                <AlertTitle>有新版本可用</AlertTitle>
                <AlertDescription>建议更新后再启动服务器。</AlertDescription>
              </Alert>
            </template>

            <div v-if="updateStatus" class="update-status">
              <div>
                <Spinner v-if="updateStatus.is_running" />
                <CircleAlert v-else />
                <span>{{ updateStatus.is_completed ? '更新已完成' : (updateStatus.is_running ? '正在更新' : '等待更新') }}</span>
              </div>
              <UiProgress
                v-if="updateStatus.is_completed || hasMetric(updateStatus.progress)"
                :model-value="Number(updateStatus.progress)"
              />
              <p v-if="updateStatus.last_output">{{ updateStatus.last_output }}</p>
              <p v-if="updateStatus.error" class="text-destructive">{{ updateStatus.error }}</p>
            </div>
          </CardContent>
          <CardFooter v-if="canUpdateGame || isVersionOutdated" class="version-footer">
            <UiButton
              v-if="canUpdateGame"
              size="sm"
              :disabled="versionLoading || gameUpdateBusy"
              @click="updateDstServer"
            >
              <Spinner v-if="gameUpdateBusy" data-icon="inline-start" />
              <Download v-else data-icon="inline-start" />
              {{ gameUpdateBusy ? '更新中' : '更新游戏' }}
            </UiButton>
            <UiButton v-if="isVersionOutdated && versionInfo.latest?.update_url" variant="outline" size="sm" @click="openUpdateLink">
              查看更新内容
            </UiButton>
          </CardFooter>
        </Card>
      </aside>
    </div>

    <section class="secondary-section" aria-labelledby="game-data-title">
      <header class="section-header">
        <div>
          <h2 id="game-data-title">游戏数据</h2>
          <p>玩家概况与近期公告</p>
        </div>
      </header>
      <div class="secondary-grid">
        <Card size="sm">
          <CardHeader>
            <CardTitle class="card-title-with-icon"><UsersRound aria-hidden="true" />玩家概况</CardTitle>
            <CardDescription>当前管理目标中的玩家与世界汇总</CardDescription>
            <CardAction>
              <UiButton
                variant="ghost"
                size="sm"
                :disabled="playerSummaryLoading || serverLoading"
                @click="refreshPlayerSummary"
              >
                <Spinner v-if="playerSummaryLoading" data-icon="inline-start" />
                <RefreshCw v-else data-icon="inline-start" />
                刷新
              </UiButton>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div v-if="playerSummaryLoading" class="player-grid" aria-busy="true">
              <Skeleton v-for="index in 4" :key="index" class="h-16 w-full" />
            </div>
            <template v-else>
              <Alert v-if="playerSummaryError" class="player-alert">
                <CircleAlert />
                <AlertTitle>{{ playerSummary.loadedRooms ? '部分玩家数据不可用' : '玩家数据不可用' }}</AlertTitle>
                <AlertDescription>{{ playerSummaryError }}</AlertDescription>
              </Alert>
              <div class="player-grid">
                <div><span>在线玩家</span><strong>{{ playerSummary.online }}</strong></div>
                <div><span>玩家记录</span><strong>{{ playerSummary.total }}</strong></div>
                <div><span>已接管房间</span><strong>{{ roomList.length }}</strong></div>
                <div><span>世界分片</span><strong>{{ totalWorldCount }}</strong></div>
              </div>
              <p class="player-footnote">已读取 {{ playerSummary.loadedRooms }} / {{ roomList.length }} 个房间</p>
            </template>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle class="card-title-with-icon"><Megaphone aria-hidden="true" />近期公告</CardTitle>
            <CardDescription>发布给玩家的运营消息</CardDescription>
            <CardAction>
              <UiButton variant="ghost" size="sm" @click="gotoAnnouncement">
                更多
                <ArrowRight data-icon="inline-end" />
              </UiButton>
            </CardAction>
          </CardHeader>
          <CardContent class="announcement-list">
            <Alert v-if="announcementsError" variant="destructive">
              <CircleAlert />
              <AlertTitle>公告读取失败</AlertTitle>
              <AlertDescription>{{ announcementsError }}</AlertDescription>
            </Alert>
            <Empty v-else-if="announcements.length === 0" class="announcement-empty">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Megaphone /></EmptyMedia>
                <EmptyTitle>暂无公告</EmptyTitle>
                <EmptyDescription>创建公告后会显示在这里。</EmptyDescription>
              </EmptyHeader>
              <EmptyContent><UiButton size="sm" @click="gotoAnnouncement">管理公告</UiButton></EmptyContent>
            </Empty>
            <template v-else>
              <article v-for="(item, index) in announcements" :key="index" class="announcement-item">
                <div class="announcement-title">
                  <Badge variant="outline">{{ item.type }}</Badge>
                  <strong>{{ item.title }}</strong>
                </div>
                <p>{{ item.content }}</p>
                <footer>
                  <span>{{ item.time }}</span>
                  <div>
                    <UiButton variant="ghost" size="sm" @click="gotoAnnouncement">
                      <ArrowRight data-icon="inline-start" />管理公告
                    </UiButton>
                  </div>
                </footer>
              </article>
            </template>
          </CardContent>
        </Card>
      </div>
    </section>

    <UiDialog v-model:open="startRoomDialogVisible">
      <DialogContent class="sm:max-w-lg" :close-on-escape-key-down="!startRoomLoading">
        <DialogHeader>
          <DialogTitle>启动房间</DialogTitle>
          <DialogDescription>选择需要启动的房间和世界分片。</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel for="dashboard-room">选择房间</FieldLabel>
            <UiSelect
              :model-value="startRoomForm.roomId"
              :disabled="startRoomLoading"
              @update:model-value="handleStartRoomSelection"
            >
              <SelectTrigger id="dashboard-room"><SelectValue placeholder="请选择房间" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="(room, index) in roomList" :key="room.id || index" :value="String(index)">
                    {{ room.name }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </UiSelect>
          </Field>

          <FieldSet>
            <FieldLegend variant="label">选择世界</FieldLegend>
            <FieldGroup v-if="currentRoomWorlds.length > 0" class="gap-3">
              <Field v-for="world in currentRoomWorlds" :key="world.name" orientation="horizontal">
                <Checkbox
                  :id="`dashboard-world-${world.id || world.name}`"
                  :model-value="startRoomForm.selectedWorlds.includes(world.name)"
                  :disabled="startRoomLoading"
                  @update:model-value="toggleSelectedWorld(world.name, $event)"
                />
                <FieldLabel :for="`dashboard-world-${world.id || world.name}`" class="world-option-label">
                  <span>{{ world.name }}</span>
                  <Badge variant="outline">{{ getWorldTypeName(world.type) }}</Badge>
                </FieldLabel>
              </Field>
              <div class="world-selection-actions">
                <UiButton variant="ghost" size="sm" :disabled="startRoomLoading" @click="selectAllWorlds">全选</UiButton>
                <UiButton variant="ghost" size="sm" :disabled="startRoomLoading" @click="unselectAllWorlds">取消全选</UiButton>
              </div>
            </FieldGroup>
            <Alert v-else-if="startRoomForm.roomId !== '' && !startRoomLoading">
              <CircleAlert />
              <AlertTitle>该房间还没有可用世界</AlertTitle>
              <AlertDescription>请先到房间管理中完成世界配置。</AlertDescription>
            </Alert>
            <div v-else-if="startRoomLoading" class="inline-loading" aria-busy="true">
              <Spinner />
              <span>正在读取世界配置...</span>
            </div>
          </FieldSet>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>服务器模式</FieldTitle>
              <FieldDescription>跟随系统设置中的运行模式。</FieldDescription>
            </FieldContent>
            <UiButton variant="outline" size="sm" @click="goToSystemSettings">查看设置</UiButton>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" :disabled="startRoomLoading" @click="startRoomDialogVisible = false">取消</UiButton>
          <UiButton :disabled="!canStartSelectedRoom" @click="startRoom">
            <Spinner v-if="startRoomLoading" data-icon="inline-start" />
            <Play v-else data-icon="inline-start" />
            启动所选世界
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import WorldLog from '@/components/WorldLog.vue';
import { playerApi, roomApi, systemApi } from '@/api/index';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog as UiDialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle
} from '@/components/ui/field';
import { Progress as UiProgress } from '@/components/ui/progress';
import {
  Select as UiSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { confirmAction } from '@/lib/feedback';
import { toast } from 'vue-sonner';
import {
  Activity,
  ArrowRight,
  ChevronRight,
  CirclePlay,
  CircleAlert,
  Clock3,
  Cpu,
  Download,
  FolderPlus,
  Gauge,
  Megaphone,
  PackageCheck,
  Play,
  RefreshCw,
  ScrollText,
  Settings,
  Square,
  UsersRound
} from '@lucide/vue';
import { formatTimeDiff } from '@/utils/dateUtils';

export default {
  name: 'DashboardView',
  components: {
    Activity,
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    ArrowRight,
    Badge,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    ChevronRight,
    Checkbox,
    CirclePlay,
    CircleAlert,
    Clock3,
    Cpu,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Download,
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    FieldTitle,
    FolderPlus,
    Gauge,
    Megaphone,
    PackageCheck,
    Play,
    RefreshCw,
    ScrollText,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Settings,
    ShadcnTable,
    Skeleton,
    Spinner,
    Square,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    UiButton,
    UiDialog,
    UiProgress,
    UiSelect,
    UsersRound,
    WorldLog
  },
  data() {
    return {
      formatTimeDiff,
      loading: false,
      serverLoading: false,
      serverList: [],
      serverListError: '',
      roomListError: '',
      announcements: [],
      announcementsError: '',
      systemLoading: false,
      systemStatus: {},

      versionInfo: {
        local: null,
        latest: null,
        installed: false,
        app_id: null,
        install_path: null,
        update_method: null,
        update_supported: false,
        steamcmd_available: false,
        check_error: null,
        checked_at: null
      },
      versionLoading: false,
      versionError: '',
      isVersionOutdated: false,
      updateStatus: null,
      updateStatusTimer: null,
      updateSessionName: null,
      updateStarting: false,
      playerSummaryLoading: false,
      playerSummaryError: '',
      playerSummary: {
        total: 0,
        online: 0,
        loadedRooms: 0,
        failedRooms: 0
      },
      // 启动房间相关
      roomList: [],
      startRoomDialogVisible: false,
      startRoomForm: {
        roomId: '',
        selectedWorlds: [], // 选中的世界列表
        serverMode: '64'
      },
      currentRoomWorlds: [], // 当前房间的世界列表
      startRoomLoading: false,
    }
  },
  computed: {
    dashboardRefreshing() {
      return this.loading || this.serverLoading || this.systemLoading || this.versionLoading;
    },
    runningServerCount() {
      return this.serverList.filter(server => server.status === 'running').length;
    },
    canUpdateGame() {
      return Boolean(
        this.versionInfo.installed &&
        this.versionInfo.update_supported &&
        this.versionInfo.local?.version
      );
    },
    gameUpdateBusy() {
      return this.updateStarting || Boolean(this.updateStatus?.is_running);
    },
    totalWorldCount() {
      return this.roomList.reduce((total, room) => total + (Array.isArray(room.worlds) ? room.worlds.length : 0), 0);
    },
    serverDataError() {
      return this.serverListError || this.roomListError;
    },
    serverErrorTitle() {
      return this.serverDataError.includes('DST 存档目录不存在')
        ? 'DST 存档目录不可用'
        : '服务器数据加载失败';
    },
    canStartSelectedRoom() {
      return !this.startRoomLoading &&
        this.startRoomForm.roomId !== '' &&
        this.currentRoomWorlds.length > 0 &&
        this.startRoomForm.selectedWorlds.length > 0;
    }
  },
  created() {
    this.refreshData();
    this.refreshSystemStatus();
    this.refreshServerData();
    this.getVersionInfo();
    this.checkOngoingUpdate();
  },

  beforeUnmount() {
    // 清除定时器
    this.stopUpdateStatusPolling();
  },
  methods: {
    getServerList() {
      return systemApi.getTmuxServers().then(res => {
        this.serverList = Array.isArray(res.data) ? res.data : [];
        this.serverListError = '';
      }).catch(err => {
        this.serverList = [];
        console.error(err);
        this.serverListError = err.message || '获取服务器状态失败';
      })
    },
    refreshServerData() {
      this.serverLoading = true;
      return Promise.allSettled([
        this.getServerList(),
        this.fetchRooms()
      ]).then(() => this.refreshPlayerSummary()).finally(() => {
        this.serverLoading = false;
      });
    },
    async refreshPlayerSummary() {
      this.playerSummaryLoading = true;
      this.playerSummaryError = '';
      this.playerSummary = { total: 0, online: 0, loadedRooms: 0, failedRooms: 0 };
      try {
        if (this.roomListError) {
          this.playerSummaryError = '房间列表读取失败，无法汇总玩家数据';
          return;
        }
        if (this.roomList.length === 0) return;

        const results = await Promise.allSettled(
          this.roomList.map(room => playerApi.getPlayerStats(room.name))
        );
        for (const result of results) {
          if (result.status === 'rejected') {
            this.playerSummary.failedRooms += 1;
            continue;
          }
          const value = result.value?.data || {};
          this.playerSummary.total += Number(value.total_count) || 0;
          this.playerSummary.online += Number(value.online_count) || 0;
          this.playerSummary.loadedRooms += 1;
        }
        if (this.playerSummary.failedRooms > 0) {
          this.playerSummaryError = `${this.playerSummary.failedRooms} 个房间的玩家数据读取失败，当前为部分汇总`;
        }
      } finally {
        this.playerSummaryLoading = false;
      }
    },
    goToSystemSettings() {
      this.startRoomDialogVisible = false;
      this.$router.push('/system');
    },
    createRoom() {
      this.$router.push('/rooms/settings');
    },
    refreshData() {
      this.loading = true;
      return systemApi.getAnnouncements()
        .then(response => {
          this.announcements = Array.isArray(response) ? response : (Array.isArray(response.data) ? response.data : []);
          this.announcementsError = '';
        })
        .catch(error => {
          this.announcements = [];
          this.announcementsError = error.message;
        })
        .finally(() => {
          this.loading = false;
        });
    },

    async handleServerAction(server) {
      const isRunning = server.status === 'running';
      const action = isRunning ? '停止' : '启动';
      try {
        await confirmAction(`确定要${action} "${server.archive_name} / ${server.world_name}" 吗？`, '服务器操作确认', {
          confirmText: `确认${action}`
        });
      } catch {
        toast.info(`已取消${action}`);
        return;
      }

      const request = { room_id: server.room_id, world_id: server.world_id };
      const operation = isRunning ? roomApi.stopRoom(request) : roomApi.startRoom(request);
      this.serverLoading = true;
      try {
        const response = await operation;
        await this.refreshServerData();
        toast.success(response.msg || `${action}完成`);
      } catch (error) {
        toast.error(`${action}失败：${error.message || '未知错误'}`);
      } finally {
        this.serverLoading = false;
      }
    },

    handleConfigure(server) {
      // 跳转到对应的世界管理编辑页面
      this.$router.push({
        path: '/worlds/settings',
        query: {
          roomName: server.archive_name,
          worldName: server.world_name,
          roomId: server.room_id,
          worldId: server.world_id,
          worldType: server.world_type
        }
      });
    },

    gotoAnnouncement() {
      this.$router.push('/announcements');
    },

    refreshSystemStatus() {
      this.systemLoading = true;

      return systemApi.getDashboardStatus()
        .then(response => {
          if (response && response.data && response.status === 200) {
            this.systemStatus = response.data;
            // 处理一些字段格式化
            if (typeof this.systemStatus.memory_usage === 'number') {
              this.systemStatus.memory_usage = parseFloat(this.systemStatus.memory_usage);
            }
            if (typeof this.systemStatus.cpu_usage === 'number') {
              this.systemStatus.cpu_usage = parseFloat(this.systemStatus.cpu_usage);
            }
            if (typeof this.systemStatus.disk_usage === 'number') {
              this.systemStatus.disk_usage = parseFloat(this.systemStatus.disk_usage);
            }

            // 确保负载值为数字类型
            if (this.systemStatus.cpu_load1) {
              this.systemStatus.cpu_load1 = parseFloat(this.systemStatus.cpu_load1);
            }
            if (this.systemStatus.cpu_load5) {
              this.systemStatus.cpu_load5 = parseFloat(this.systemStatus.cpu_load5);
            }
            if (this.systemStatus.cpu_load15) {
              this.systemStatus.cpu_load15 = parseFloat(this.systemStatus.cpu_load15);
            }

            // 确保磁盘容量为数字类型
            if (this.systemStatus.total_disk) {
              this.systemStatus.total_disk = parseFloat(this.systemStatus.total_disk);
            }
            if (this.systemStatus.used_disk) {
              this.systemStatus.used_disk = parseFloat(this.systemStatus.used_disk);
            }
            if (this.systemStatus.free_disk) {
              this.systemStatus.free_disk = parseFloat(this.systemStatus.free_disk);
            }

            // 确保内存值为数字类型
            if (this.systemStatus.total_memory) {
              this.systemStatus.total_memory = parseFloat(this.systemStatus.total_memory);
            }
            if (this.systemStatus.used_memory) {
              this.systemStatus.used_memory = parseFloat(this.systemStatus.used_memory);
            }
            if (this.systemStatus.free_memory) {
              this.systemStatus.free_memory = parseFloat(this.systemStatus.free_memory);
            }
          } else {
            toast.error('获取系统状态数据失败');
          }
        })
        .catch(error => {
          toast.error('获取系统状态数据失败: ' + (error.message || '未知错误'));
        })
        .finally(() => {
          this.systemLoading = false;
        });
    },
    async refreshDashboard() {
      await Promise.allSettled([
        this.refreshData(),
        this.refreshSystemStatus(),
        this.refreshServerData(),
        this.getVersionInfo()
      ]);
    },

    formatMemory(memory) {
      if (!this.hasMetric(memory)) return '--';
      if (memory < 1024) {
        return memory.toFixed(2) + ' MB';
      } else {
        return (memory / 1024).toFixed(2) + ' GB';
      }
    },
    formatDisk(value) {
      return this.hasMetric(value) ? `${Number(value).toFixed(2)}GB` : '--';
    },
    formatDecimal(value) {
      return this.hasMetric(value) ? Number(value).toFixed(2) : '--';
    },
    hasMetric(value) {
      return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
    },
    metricPercentage(value) {
      return Number(Math.min(100, Math.max(0, Number(value))).toFixed(1));
    },
    loadPercentage(value) {
      if (!this.hasMetric(value)) return 0;
      const capacity = Number(this.systemStatus.cpu_threads || this.systemStatus.cpu_cores);
      if (!Number.isFinite(capacity) || capacity <= 0) return 0;
      return this.metricPercentage((Number(value) / capacity) * 100);
    },
    displayMetric(value) {
      return this.hasMetric(value) ? value : '--';
    },
    formatServerUptime(startTime) {
      if (!startTime) return '--';
      const timestamp = new Date(startTime).getTime();
      if (!Number.isFinite(timestamp)) return '--';
      return formatTimeDiff(Date.now() - timestamp);
    },
    getServerStatusName(status) {
      if (status === 'running') return '在线';
      if (status === 'stopped') return '离线';
      return '未知';
    },
    async getVersionInfo() {
      this.versionLoading = true;
      this.versionError = '';
      try {
        const response = await systemApi.getGameVersion();
        if (!response?.data || response.status !== 200) {
          throw new Error(response?.msg || '服务器返回了无效的版本信息');
        }
        this.versionInfo = response.data;
        this.checkVersionOutdated();
      } catch (error) {
        console.error('获取游戏版本失败:', error);
        this.versionError = error.message || '获取游戏版本信息失败';
      } finally {
        this.versionLoading = false;
      }
    },

    checkVersionOutdated() {
      const localValue = String(this.versionInfo.local?.version || '').trim();
      const latestValue = String(this.versionInfo.latest?.version || '').trim();
      if (!this.versionInfo.installed || !localValue || !latestValue) {
        this.isVersionOutdated = false;
        return;
      }

      if (typeof this.versionInfo.latest.up_to_date === 'boolean') {
        this.isVersionOutdated = !this.versionInfo.latest.up_to_date;
        return;
      }

      const localVersion = Number(localValue);
      const latestVersion = Number(latestValue);
      this.isVersionOutdated = Number.isFinite(localVersion) &&
        Number.isFinite(latestVersion) && localVersion < latestVersion;
    },

    openUpdateLink() {
      if (this.versionInfo.latest && this.versionInfo.latest.update_url) {
        window.open(this.versionInfo.latest.update_url, '_blank');
      }
    },

    formatCheckedAt(value) {
      if (!value) return '--';
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
    },

    // 更新饥荒服务器
    async updateDstServer() {
      if (!this.versionInfo.installed) {
        toast.warning('未检测到有效的 DST 安装，请先检查服务端目录。');
        return;
      }
      if (!this.versionInfo.update_supported) {
        const message = this.versionInfo.update_method === 'steam-client'
          ? '当前游戏由 Steam 客户端管理，请在 Steam 中更新。'
          : '当前环境不支持面板更新，请检查 SteamCMD 配置。';
        toast.warning(message);
        return;
      }
      try {
        await confirmAction('确定要更新饥荒服务器吗？更新过程中服务器将无法使用。', '更新确认', {
          confirmText: '确定更新'
        });
      } catch {
        toast.info('已取消更新');
        return;
      }

      this.updateStarting = true;
      try {
        const response = await systemApi.updateDstServer({ force: true });
        if (response.status !== 200 || !response.data) {
          throw new Error(response.msg || '更新失败');
        }
        toast.success(response.msg || '更新已开始');
        this.updateSessionName = response.data.session_name;
        sessionStorage.setItem('dstUpdateSessionName', this.updateSessionName);
        this.startUpdateStatusPolling();
      } catch (error) {
        console.error('更新饥荒服务器失败:', error);
        toast.error('更新饥荒服务器失败: ' + (error.message || '未知错误'));
      } finally {
        this.updateStarting = false;
      }
    },

    // 开始轮询更新状态
    startUpdateStatusPolling() {
      // 清除可能存在的定时器
      this.stopUpdateStatusPolling();

      // 立即获取一次状态
      this.getUpdateStatus();

      // 设置定时器，每3秒轮询一次
      this.updateStatusTimer = setInterval(() => {
        this.getUpdateStatus();
      }, 3000);
    },

    // 停止轮询更新状态
    stopUpdateStatusPolling() {
      if (this.updateStatusTimer) {
        clearInterval(this.updateStatusTimer);
        this.updateStatusTimer = null;
      }
    },

    // 获取更新状态
    // 检查是否有正在进行的更新
    checkOngoingUpdate() {
      // 尝试从本地存储中获取上次更新的会话名称
      try {
        const savedSession = sessionStorage.getItem('dstUpdateSessionName');
        if (savedSession) {
          this.updateSessionName = savedSession;
          // 获取更新状态
          this.getUpdateStatus();
          // 如果更新仍在进行中，开始轮询
          if (this.updateStatus && this.updateStatus.is_running) {
            this.startUpdateStatusPolling();
          }
        }
      } catch (err) {
        console.error('检查正在进行的更新失败:', err);
      }
    },

    getUpdateStatus() {
      // 如果没有会话名称，则不进行查询
      if (!this.updateSessionName) {
        console.warn('没有更新会话名称，无法查询更新状态');
        return;
      }

      systemApi.getDstUpdateStatus(this.updateSessionName).then(res => {
        if (res.status === 200) {
          this.updateStatus = res.data;

          // 如果更新已完成或出错，停止轮询
          if (this.updateStatus && (this.updateStatus.is_completed || this.updateStatus.error)) {
            this.stopUpdateStatusPolling();
            // 清除存储的会话名称
            sessionStorage.removeItem('dstUpdateSessionName');

            // 如果更新完成，刷新版本信息
            if (this.updateStatus.is_completed && !this.updateStatus.error) {
              // 等待一下再刷新，确保服务器已完全更新
              setTimeout(() => {
                this.getVersionInfo();
              }, 3000);
            }
          }
        }
      }).catch(err => {
        console.error('获取更新状态失败:', err);
      });
    },

    // 获取房间列表
    fetchRooms() {
      return roomApi.getRoomList()
        .then(response => {
          if (response && response.status === 200) {
            this.roomList = response.data || [];
            this.roomListError = '';
          } else {
            throw new Error(response?.msg || '服务器返回了无效的房间列表');
          }
        })
        .catch(error => {
          this.roomList = [];
          this.roomListError = error.message || '获取房间列表失败';
          console.error('获取房间列表失败:', error);
          throw error;
        });
    },

    // 打开启动房间对话框
    async openStartRoomDialog() {
      // 重置表单
      this.startRoomForm = {
        roomId: '',
        selectedWorlds: [],
        serverMode: '64'
      };
      this.currentRoomWorlds = [];

      this.startRoomLoading = true;

      try {
        await this.fetchRooms();
        if (this.roomList.length === 0) {
          toast.warning('当前目标还没有房间，请先创建房间');
          return;
        }

        this.startRoomDialogVisible = true;
        this.startRoomForm.roomId = '0';
        await this.fetchRoomWorlds(0);
      } catch (error) {
        toast.error(error.message || '获取房间列表失败');
      } finally {
        this.startRoomLoading = false;
      }
    },

    handleStartRoomSelection(value) {
      this.startRoomForm.roomId = value;
      return this.fetchRoomWorlds(Number(value));
    },

    // 当选择房间变化时获取该房间的世界列表
    fetchRoomWorlds(roomIndex) {
      if (roomIndex === '' || roomIndex === null || roomIndex === undefined) {
        this.currentRoomWorlds = [];
        this.startRoomForm.selectedWorlds = [];
        return Promise.resolve();
      }

      const selectedRoom = this.roomList[roomIndex];
      if (!selectedRoom) {
        this.currentRoomWorlds = [];
        this.startRoomForm.selectedWorlds = [];
        return Promise.resolve();
      }

      this.startRoomLoading = true;

      // 直接使用房间对象中的世界列表
      if (selectedRoom.worlds && Array.isArray(selectedRoom.worlds)) {
        this.currentRoomWorlds = selectedRoom.worlds;
        this.startRoomForm.selectedWorlds = this.currentRoomWorlds
          .map(world => world.name);
        this.startRoomLoading = false;
        return Promise.resolve();
      } else {
        // 如果房间对象中没有世界列表，则调用API获取
        return roomApi.getRoomWorlds(selectedRoom.id || selectedRoom.name)
          .then(worlds => {
            this.currentRoomWorlds = worlds || [];
            this.startRoomForm.selectedWorlds = this.currentRoomWorlds
              .map(world => world.name);
          })
          .catch(error => {
            console.error('获取房间世界列表失败:', error);
            toast.error('获取房间世界列表失败');
            this.currentRoomWorlds = [];
            this.startRoomForm.selectedWorlds = [];
          })
          .finally(() => {
            this.startRoomLoading = false;
          });
      }
    },

    // 选择所有世界
    selectAllWorlds() {
      this.startRoomForm.selectedWorlds = this.currentRoomWorlds
        .map(world => world.name);
    },

    // 取消选择所有世界
    unselectAllWorlds() {
      this.startRoomForm.selectedWorlds = [];
    },

    toggleSelectedWorld(worldName, selected) {
      if (selected === true) {
        if (!this.startRoomForm.selectedWorlds.includes(worldName)) {
          this.startRoomForm.selectedWorlds.push(worldName);
        }
        return;
      }
      this.startRoomForm.selectedWorlds = this.startRoomForm.selectedWorlds
        .filter(name => name !== worldName);
    },

    // 获取世界类型的名称
    getWorldTypeName(type) {
      switch(type) {
        case 'forest': return '森林';
        case 'cave': return '洞穴';
        case 'unknown': return '未知';
        default: return '未知';
      }
    },

    // 启动房间
    async startRoom() {
      const selectedRoom = this.roomList[Number(this.startRoomForm.roomId)];
      if (!selectedRoom) {
        toast.error('无法获取房间信息，请重新选择');
        return;
      }

      if (this.startRoomForm.selectedWorlds.length === 0) {
        toast.error('请至少选择一个世界');
        return;
      }

      const worldsToStart = this.currentRoomWorlds.filter(world =>
        this.startRoomForm.selectedWorlds.includes(world.name)
      );
      if (worldsToStart.length === 0) {
        toast.error('无法获取选中世界的信息');
        return;
      }

      this.startRoomLoading = true;
      try {
        const response = await roomApi.startRoom({
          room_id: selectedRoom.id,
          world_ids: worldsToStart.map(world => world.id)
        });
        await this.refreshServerData();
        toast.success(response.msg || `房间 ${selectedRoom.name} 已启动`);
        this.startRoomDialogVisible = false;
      } catch (error) {
        toast.error(`启动房间失败: ${error.message || '未知错误'}`);
      } finally {
        this.startRoomLoading = false;
      }
    }

  },
}
</script>

<style scoped>
.dashboard-page {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
}

.overview-header {
  display: flex;
  min-height: 56px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.overview-header > div {
  min-width: 0;
}

.overview-header h1,
.section-header h2 {
  margin: 0;
  color: var(--foreground);
  letter-spacing: 0;
}

.overview-header h1 {
  font-size: 24px;
  font-weight: 700;
  line-height: 32px;
}

.overview-header p,
.section-header p {
  margin: 2px 0 0;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 20px;
}

.overview-header p span {
  margin: 0 4px;
}

.overview-strip {
  box-shadow: none;
}

.overview-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 0;
}

.overview-metric {
  display: grid;
  min-width: 0;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
}

.overview-metric + .overview-metric {
  border-left: 1px solid var(--border);
}

.overview-metric > svg {
  width: 18px;
  height: 18px;
  color: var(--primary);
}

.overview-metric > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.overview-metric span {
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 16px;
}

.overview-metric strong {
  color: var(--foreground);
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  line-height: 24px;
}

.overview-metric strong small {
  color: var(--muted-foreground);
  font-size: 11px;
  font-weight: 500;
}

.overview-metric .metric-note {
  white-space: nowrap;
}

.operations-layout {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) 360px;
  align-items: start;
  gap: 16px;
}

.operations-main,
.operations-rail {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
}

.card-title-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title-with-icon > svg {
  width: 16px;
  height: 16px;
  color: var(--primary);
}

.server-content {
  min-height: 0;
  padding-top: 0;
}

.server-content [data-slot='table-container'] {
  border: 0;
}

.server-actions,
.server-state-actions,
.world-selection-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.server-actions {
  justify-content: flex-end;
  white-space: nowrap;
}

.server-empty {
  min-height: 152px;
  padding-top: 22px;
  padding-bottom: 22px;
}

.server-footer {
  color: var(--muted-foreground);
  font-size: 12px;
}

.world-log-content {
  height: 356px;
  min-height: 320px;
  padding-top: 0;
}

.resource-list {
  display: flex;
  flex-direction: column;
  padding-top: 0;
  padding-bottom: 0;
}

.resource-row {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
  padding: 12px 0;
}

.resource-row + .resource-row {
  border-top: 1px solid var(--border);
}

.resource-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--foreground);
  font-size: 12px;
  line-height: 18px;
}

.resource-label strong {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
}

.resource-detail {
  color: var(--muted-foreground);
  font-size: 10px;
  line-height: 15px;
  overflow-wrap: anywhere;
}

.system-meta {
  justify-content: space-between;
  gap: 12px;
  color: var(--muted-foreground);
  font-size: 10px;
}

.system-meta span {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
}

.system-meta svg {
  width: 13px;
  height: 13px;
}

.version-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 0;
}

.version-comparison {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 14px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.version-comparison > div {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 3px 6px;
}

.version-comparison > div > span {
  grid-column: 1 / -1;
  color: var(--muted-foreground);
  font-size: 10px;
  line-height: 15px;
}

.version-comparison strong,
.version-comparison a {
  overflow: hidden;
  color: var(--foreground);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.version-comparison a {
  color: var(--primary);
  text-decoration: none;
}

.version-comparison a:hover {
  text-decoration: underline;
}

.version-comparison > svg {
  width: 14px;
  height: 14px;
  color: var(--muted-foreground);
}

.version-path {
  margin: 0;
  overflow: hidden;
  color: var(--muted-foreground);
  font-size: 10px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.version-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 10px;
  margin-top: -5px;
  color: var(--muted-foreground);
  font-size: 10px;
  line-height: 15px;
}

.inline-loading {
  display: flex;
  min-height: 72px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.update-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: var(--muted);
  border-radius: var(--radius-md);
}

.update-status > div {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
}

.update-status p {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--muted-foreground);
  font-size: 10px;
  line-height: 16px;
}

.version-footer {
  flex-wrap: wrap;
  gap: 8px;
}

.secondary-section {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
}

.section-header h2 {
  font-size: 16px;
  font-weight: 650;
  line-height: 22px;
}

.section-header p {
  font-size: 12px;
  line-height: 18px;
}

.secondary-grid {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.player-alert {
  margin-bottom: 12px;
}

.player-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.player-grid > div {
  display: flex;
  min-width: 0;
  min-height: 64px;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 10px 12px;
  background: var(--muted);
  border-radius: var(--radius-md);
}

.player-grid span {
  color: var(--muted-foreground);
  font-size: 10px;
}

.player-grid strong {
  color: var(--foreground);
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.player-footnote {
  margin: 10px 0 0;
  color: var(--muted-foreground);
  font-size: 10px;
}

.announcement-list {
  display: flex;
  max-height: 280px;
  flex-direction: column;
  overflow-y: auto;
}

.announcement-empty {
  min-height: 150px;
}

.announcement-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
}

.announcement-item + .announcement-item {
  border-top: 1px solid var(--border);
}

.announcement-title,
.announcement-item footer,
.announcement-item footer > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.announcement-title strong {
  min-width: 0;
  overflow: hidden;
  color: var(--foreground);
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.announcement-item p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 18px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.announcement-item footer {
  justify-content: space-between;
  color: var(--muted-foreground);
  font-size: 10px;
}

.world-option-label {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.world-selection-actions {
  justify-content: flex-end;
}

@media (max-width: 1180px) {
  .operations-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .operations-rail {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}

@media (max-width: 900px) {
  .overview-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-metric:nth-child(3) {
    border-left: 0;
    border-top: 1px solid var(--border);
  }

  .overview-metric:nth-child(4) {
    border-top: 1px solid var(--border);
  }

  .secondary-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .dashboard-page {
    gap: 12px;
  }

  .overview-header {
    min-height: 0;
    flex-direction: column;
  }

  .overview-header > button {
    width: 100%;
  }

  .operations-rail {
    display: flex;
  }

  .world-log-content {
    height: 430px;
    min-height: 360px;
  }
}

@media (max-width: 520px) {
  .overview-metrics {
    grid-template-columns: minmax(0, 1fr);
  }

  .overview-metric + .overview-metric {
    border-top: 1px solid var(--border);
    border-left: 0;
  }

  .overview-metric {
    grid-template-columns: 26px minmax(0, 1fr) auto;
    padding: 12px;
  }

  .player-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .server-actions {
    justify-content: flex-start;
  }

  .system-meta {
    align-items: flex-start;
    flex-direction: column;
  }

  .announcement-item footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

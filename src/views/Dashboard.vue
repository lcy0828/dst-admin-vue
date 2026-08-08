<template>
  <div class="dashboard-content">
    <header class="dashboard-header">
      <div class="dashboard-heading">
        <h1>服务总览</h1>
        <span>{{ formatCheckedAt(systemStatus.current_time) }}</span>
      </div>
      <div class="dashboard-summary">
        <Badge variant="outline" class="summary-badge">
          <span class="summary-status-dot" :class="{ online: runningServerCount > 0 }" aria-hidden="true"></span>
          {{ runningServerCount }} / {{ serverList.length }} 分片运行
        </Badge>
        <Badge variant="outline" class="summary-badge">
          <UsersRound />
          {{ playerSummary.online }} 人在线
        </Badge>
        <UiButton variant="outline" size="sm" :disabled="dashboardRefreshing" @click="refreshDashboard">
          <Spinner v-if="dashboardRefreshing" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          刷新全部
        </UiButton>
      </div>
    </header>

    <section class="version-strip" aria-labelledby="version-title">
      <div class="version-strip-heading">
        <span class="version-icon" aria-hidden="true"><PackageCheck /></span>
        <div>
          <span>游戏服务端</span>
          <strong id="version-title">版本与更新</strong>
        </div>
      </div>
      <div class="version-details">
        <div v-if="versionLoading" class="version-loading">
          <Spinner />
          <span>正在获取版本信息...</span>
        </div>
        <div v-else-if="versionError && !versionInfo.local" class="version-error" role="status">
          <CircleAlert />
          <span>{{ versionError }}</span>
          <UiButton variant="ghost" size="sm" @click="getVersionInfo">重试</UiButton>
        </div>
        <div v-else class="version-info">
          <div class="version-boxes">
            <div class="version-box">
              <span class="version-box-label">当前版本</span>
              <strong class="version-box-value">{{ versionInfo.local?.version || '--' }}</strong>
              <Badge :variant="versionInfo.installed ? 'secondary' : 'outline'">
                {{ versionInfo.installed ? '已安装' : '未检测到安装' }}
              </Badge>
            </div>
            <ChevronRight class="version-arrow" />
            <div class="version-box" :class="{'version-box-outdated': isVersionOutdated}">
              <span class="version-box-label">Steam 最新版本</span>
              <a
                v-if="versionInfo.latest?.update_url"
                :href="versionInfo.latest.update_url"
                target="_blank"
                rel="noopener noreferrer"
                class="version-box-value version-link"
              >
                {{ versionInfo.latest.version }}
              </a>
              <strong v-else class="version-box-value">{{ versionInfo.latest?.version || '--' }}</strong>
              <Badge :variant="isVersionOutdated ? 'destructive' : 'outline'">
                {{ versionInfo.latest?.version ? (isVersionOutdated ? '可更新' : '已是最新') : '检查中' }}
              </Badge>
            </div>
          </div>
          <div class="version-meta">
            <span>{{ versionInfo.install_path || '未配置安装位置' }}</span>
            <span v-if="versionInfo.app_id">App ID {{ versionInfo.app_id }}</span>
            <span v-if="versionInfo.checked_at">检查于 {{ formatCheckedAt(versionInfo.checked_at) }}</span>
          </div>
        </div>
      </div>
      <div class="version-actions">
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
        <UiButton
          variant="ghost"
          size="sm"
          :disabled="versionLoading || gameUpdateBusy"
          @click="getVersionInfo"
        >
          <Spinner v-if="versionLoading" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          检查版本
        </UiButton>
      </div>
      <div class="version-notices">
        <div v-if="!versionInfo.installed && !versionLoading" class="version-check-warning" role="status">
          <CircleAlert />
          <span>未检测到有效的 DST 安装，请检查系统设置中的服务端目录。</span>
        </div>
        <div v-else-if="versionInfo.update_method === 'steam-client'" class="version-managed-notice">
          <CircleAlert />
          <span>当前为 macOS Steam 客户端安装，请在 Steam 中更新游戏。</span>
        </div>
        <div v-else-if="versionInfo.installed && !versionInfo.update_supported" class="version-managed-notice">
          <CircleAlert />
          <span>{{ versionInfo.steamcmd_available ? '当前安装方式不支持面板更新。' : '未检测到 SteamCMD，面板更新不可用。' }}</span>
        </div>
        <div v-if="versionInfo.check_error || (versionError && versionInfo.local)" class="version-check-warning" role="status">
          <CircleAlert />
          <span>Steam 最新版本检查失败：{{ versionInfo.check_error || versionError }}</span>
        </div>
        <div v-if="isVersionOutdated" class="version-update-notice">
          <CircleAlert />
          <span>检测到新版本可用，请及时更新游戏服务端。</span>
          <UiButton v-if="versionInfo.latest?.update_url" size="sm" @click="openUpdateLink">查看更新内容</UiButton>
        </div>
        <div v-if="updateStatus" class="version-update-status">
          <div class="update-status-header">
            <Spinner v-if="updateStatus.is_running" />
            <CircleAlert v-else />
            <span>更新状态：{{ updateStatus.is_completed ? '已完成' : (updateStatus.is_running ? '进行中' : '尚未开始') }}</span>
          </div>
          <UiProgress
            v-if="updateStatus.is_completed || hasMetric(updateStatus.progress)"
            :model-value="Number(updateStatus.progress)"
          />
          <div v-else-if="updateStatus.is_running" class="metric-unavailable">进度：--</div>
          <div v-if="updateStatus.last_output" class="update-output">
            <div class="output-label">最新输出</div>
            <div class="output-content">{{ updateStatus.last_output }}</div>
          </div>
          <div v-if="updateStatus.error" class="update-error">
            <div class="error-label">错误信息</div>
            <div class="error-content">{{ updateStatus.error }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 服务器监控 -->
    <div class="operations-grid">
      <section class="operation-panel server-monitor" aria-labelledby="server-monitor-title">
        <div class="operation-panel-header server-header">
          <div class="panel-title">
            <Activity aria-hidden="true" />
            <div>
              <h2 id="server-monitor-title">服务器状态</h2>
              <span>{{ serverList.length }} 个分片，{{ runningServerCount }} 个运行中</span>
            </div>
          </div>
          <UiButton variant="ghost" size="sm" :disabled="serverLoading" @click="refreshServerData">
            <Spinner v-if="serverLoading" data-icon="inline-start" />
            <RefreshCw v-else data-icon="inline-start" />
            刷新
          </UiButton>
        </div>
        <div class="server-monitor-body">
          <ShadcnTable v-if="serverList.length > 0 && !serverDataError">
            <TableHeader>
              <TableRow>
                <TableHead>状态</TableHead>
                <TableHead>房间名称</TableHead>
                <TableHead>世界名称</TableHead>
                <TableHead>启动时间</TableHead>
                <TableHead>运行时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="server in serverList"
                :key="`${server.room_id}-${server.world_id}`"
                :class="{ 'server-offline': server.status === 'stopped' }"
              >
                <TableCell>
                  <Badge :variant="server.status === 'running' ? 'secondary' : 'outline'">
                    {{ getServerStatusName(server.status) }}
                  </Badge>
                </TableCell>
                <TableCell><span class="server-name-text">{{ server.archive_name }}</span></TableCell>
                <TableCell><Badge variant="outline">{{ server.world_name }}</Badge></TableCell>
                <TableCell>{{ server.start_time || '--' }}</TableCell>
                <TableCell>{{ formatServerUptime(server.start_time) }}</TableCell>
                <TableCell>
                <div class="server-row-actions">
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
                  <UiButton
                    size="sm"
                    variant="outline"
                    :disabled="serverLoading"
                    @click="handleConfigure(server)"
                  >
                    <Settings data-icon="inline-start" />
                    配置
                  </UiButton>
                </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </ShadcnTable>

          <div class="server-footer" v-if="serverList.length > 0 && !serverDataError">
            <span class="server-stats">共 {{ serverList.length }} 个服务器实例，{{ serverList.filter(s => s.status === 'running').length }} 个运行中</span>
          </div>

          <Alert v-else-if="serverDataError" class="server-error-state">
            <CircleAlert />
            <AlertTitle>{{ serverErrorTitle }}</AlertTitle>
            <AlertDescription>{{ serverDataError }}</AlertDescription>
            <AlertAction>
              <UiButton variant="outline" size="sm" @click="goToSystemSettings">系统设置</UiButton>
              <UiButton size="sm" @click="refreshServerData">重试</UiButton>
            </AlertAction>
          </Alert>

          <Empty v-else-if="roomList.length === 0">
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

          <Empty v-else>
            <EmptyHeader>
              <EmptyMedia variant="icon"><CirclePlay /></EmptyMedia>
              <EmptyTitle>服务器尚未启动</EmptyTitle>
              <EmptyDescription>已识别 {{ roomList.length }} 个房间，可选择房间和世界启动专服。</EmptyDescription>
            </EmptyHeader>
            <EmptyContent><UiButton size="sm" @click="openStartRoomDialog">启动房间</UiButton></EmptyContent>
          </Empty>
        </div>

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
                  <SelectTrigger id="dashboard-room">
                    <SelectValue placeholder="请选择房间" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem
                        v-for="(room, index) in roomList"
                        :key="room.id || index"
                        :value="String(index)"
                      >
                        {{ room.name }}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </UiSelect>
              </Field>

              <FieldSet>
                <FieldLegend variant="label">选择世界</FieldLegend>
                <FieldGroup v-if="currentRoomWorlds.length > 0" class="gap-3">
                  <Field
                    v-for="world in currentRoomWorlds"
                    :key="world.name"
                    orientation="horizontal"
                  >
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
                <div v-else-if="startRoomLoading" class="dialog-loading" aria-busy="true">
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

      </section>

      <aside class="operation-panel system-info" aria-labelledby="system-resource-title">
        <div class="operation-panel-header panel-header">
          <div class="panel-title">
            <Gauge aria-hidden="true" />
            <div>
              <h2 id="system-resource-title">系统资源</h2>
              <span>{{ systemStatus.os_info || '等待系统信息' }}</span>
            </div>
          </div>
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
        </div>
        <div class="resource-usage">
          <template v-if="systemLoading">
            <div v-for="metric in 4" :key="metric" class="resource-item" aria-busy="true">
              <Skeleton class="h-4 w-28" />
              <Skeleton class="mt-3 h-2 w-full" />
              <Skeleton class="mt-3 h-3 w-3/4" />
            </div>
          </template>
          <template v-else>
            <div class="resource-item">
              <div class="resource-label">
                <span>CPU使用率</span>
                <strong>{{ hasMetric(systemStatus.cpu_usage) ? metricPercentage(systemStatus.cpu_usage) + '%' : '--' }}</strong>
              </div>
              <UiProgress v-if="hasMetric(systemStatus.cpu_usage)" :model-value="metricPercentage(systemStatus.cpu_usage)" />
              <div v-else class="metric-unavailable">--</div>
              <div class="resource-detail">
                <span>{{ systemStatus.cpu_model || '--' }} {{ systemStatus.cpu_mhz ? '(' + systemStatus.cpu_mhz + 'MHz)' : '' }}</span>
                <span>{{ displayMetric(systemStatus.cpu_cores) }}核心 / {{ displayMetric(systemStatus.cpu_threads) }}线程</span>
              </div>
            </div>
            <div class="resource-item">
              <div class="resource-label">
                <span>内存使用率</span>
                <strong>{{ hasMetric(systemStatus.memory_usage) ? metricPercentage(systemStatus.memory_usage) + '%' : '--' }}</strong>
              </div>
              <UiProgress v-if="hasMetric(systemStatus.memory_usage)" :model-value="metricPercentage(systemStatus.memory_usage)" />
              <div v-else class="metric-unavailable">--</div>
              <div class="resource-detail">
                <span>总内存: {{ formatMemory(systemStatus.total_memory) }}</span>
                <span>已用: {{ formatMemory(systemStatus.used_memory) }}</span>
                <span>空闲: {{ formatMemory(systemStatus.free_memory) }}</span>
              </div>
            </div>
            <div class="resource-item">
              <div class="resource-label">
                <span>磁盘使用率</span>
                <strong>{{ hasMetric(systemStatus.disk_usage) ? metricPercentage(systemStatus.disk_usage) + '%' : '--' }}</strong>
              </div>
              <UiProgress v-if="hasMetric(systemStatus.disk_usage)" :model-value="metricPercentage(systemStatus.disk_usage)" />
              <div v-else class="metric-unavailable">--</div>
              <div class="resource-detail">
                <span>总容量: {{ formatDisk(systemStatus.total_disk) }}</span>
                <span>已用: {{ formatDisk(systemStatus.used_disk) }}</span>
                <span>空闲: {{ formatDisk(systemStatus.free_disk) }}</span>
              </div>
            </div>
            <div class="resource-item">
              <div class="resource-label">
                <span>系统负载</span>
                <strong>{{ hasMetric(systemStatus.cpu_load1) ? loadPercentage(systemStatus.cpu_load1) + '%' : '--' }}</strong>
              </div>
              <UiProgress v-if="hasMetric(systemStatus.cpu_load1)" :model-value="loadPercentage(systemStatus.cpu_load1)" />
              <div v-else class="metric-unavailable">--</div>
              <div class="resource-detail">
                <span>1分钟: {{ formatDecimal(systemStatus.cpu_load1) }}</span>
                <span>5分钟: {{ formatDecimal(systemStatus.cpu_load5) }}</span>
                <span>15分钟: {{ formatDecimal(systemStatus.cpu_load15) }}</span>
              </div>
            </div>
          </template>
        </div>
          <div class="system-info-footer">
            <div class="system-info-item">
              <Cpu aria-hidden="true" />
              <span>{{ systemStatus.os_info || '--' }}</span>
            </div>
            <div class="system-info-item">
              <Clock3 aria-hidden="true" />
              <span>运行时间: {{ systemStatus.uptime_formatted || '--' }}</span>
            </div>
            <div class="system-info-item">
              <RefreshCw aria-hidden="true" />
              <span>更新时间: {{ formatCheckedAt(systemStatus.current_time) }}</span>
            </div>
          </div>
      </aside>
    </div>

    <div class="section-divider">
      <div class="section-title">
        <ScrollText />
        <span>世界日志</span>
      </div>
    </div>

    <div class="world-log-wrapper log-section">
      <WorldLog ref="worldLog" class="world-log" />
    </div>

    <div class="section-divider">
      <div class="section-title">
        <ChartNoAxesCombined />
        <span>最近游戏数据</span>
      </div>
    </div>

    <div class="data-section">
      <Card class="player-stats">
        <CardHeader>
          <CardTitle>玩家实时概况</CardTitle>
          <CardDescription>汇总当前运行目标中的玩家与世界信息。</CardDescription>
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
          <div v-if="playerSummaryLoading" class="player-summary-grid" aria-busy="true">
            <Skeleton v-for="index in 4" :key="index" class="h-16 w-full" />
          </div>
          <template v-else>
            <Alert v-if="playerSummaryError" class="player-summary-alert">
              <CircleAlert />
              <AlertTitle>{{ playerSummary.loadedRooms ? '部分玩家数据不可用' : '玩家数据不可用' }}</AlertTitle>
              <AlertDescription>{{ playerSummaryError }}</AlertDescription>
            </Alert>
            <div class="player-summary-grid">
              <div class="player-summary-item">
                <span>在线玩家</span>
                <strong>{{ playerSummary.online }}</strong>
              </div>
              <div class="player-summary-item">
                <span>玩家记录</span>
                <strong>{{ playerSummary.total }}</strong>
              </div>
              <div class="player-summary-item">
                <span>已接管房间</span>
                <strong>{{ roomList.length }}</strong>
              </div>
              <div class="player-summary-item">
                <span>世界分片</span>
                <strong>{{ totalWorldCount }}</strong>
              </div>
            </div>
            <p class="player-summary-footnote">
              已读取 {{ playerSummary.loadedRooms }} / {{ roomList.length }} 个房间的实时玩家记录
            </p>
          </template>
        </CardContent>
      </Card>

      <Card class="announcement-card">
        <CardHeader>
          <CardTitle>公告管理</CardTitle>
          <CardDescription>查看并发布面向玩家的运营公告。</CardDescription>
          <CardAction>
            <UiButton variant="ghost" size="sm" @click="gotoAnnouncement">
              更多
              <ArrowRight data-icon="inline-end" />
            </UiButton>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div class="announcement-list">
            <Alert v-if="announcementsError">
              <CircleAlert />
              <AlertTitle>公告读取失败</AlertTitle>
              <AlertDescription>{{ announcementsError }}</AlertDescription>
            </Alert>
            <Empty v-else-if="announcements.length === 0">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Megaphone /></EmptyMedia>
                <EmptyTitle>暂无公告</EmptyTitle>
                <EmptyDescription>创建公告后会显示在这里。</EmptyDescription>
              </EmptyHeader>
              <EmptyContent><UiButton size="sm" @click="gotoAnnouncement">管理公告</UiButton></EmptyContent>
            </Empty>
            <div class="announcement-item" v-for="(item, index) in announcements" :key="index">
              <div class="announcement-title">
                <Badge variant="outline">{{ item.type }}</Badge>
                <span>{{ item.title }}</span>
              </div>
              <div class="announcement-body">{{ item.content }}</div>
              <div class="announcement-footer">
                <span class="announcement-time">{{ item.time }}</span>
                <div class="announcement-actions">
                  <UiButton variant="ghost" size="sm" @click="editAnnouncement(item)">
                    <Pencil data-icon="inline-start" />
                    编辑
                  </UiButton>
                  <UiButton variant="ghost" size="sm" @click="publishAnnouncement(item)">
                    <Send data-icon="inline-start" />
                    发布
                  </UiButton>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script>
import WorldLog from '@/components/WorldLog.vue';
import { playerApi, roomApi, systemApi } from '@/api/index';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  ChartNoAxesCombined,
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
  Pencil,
  Play,
  RefreshCw,
  ScrollText,
  Send,
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
    CardHeader,
    CardTitle,
    ChartNoAxesCombined,
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
    Pencil,
    Play,
    RefreshCw,
    ScrollText,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Send,
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
          this.announcements = Array.isArray(response.data) ? response.data : [];
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

    editAnnouncement(announcement) {
      this.$router.push({ path: '/announcements', query: { id: announcement.id } });
    },

    publishAnnouncement(announcement) {
      systemApi.updateAnnouncement(announcement.id, { ...announcement, published: true })
        .then(() => toast.success(`公告"${announcement.title}"已发布`))
        .catch(error => toast.error(error.message));
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
.dashboard-content {
  width: 100%;
}

.panel-header {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}



.section-divider {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  margin: 20px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.section-title i {
  margin-right: 8px;
  font-size: 20px;
  color: var(--primary-color);
}

.section-title > svg {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  margin-right: 8px;
  color: var(--primary-color);
}

.data-section {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.server-monitor, .system-info, .player-stats, .announcement-card {
  box-shadow: var(--shadow-card);
  border-radius: 4px;
}

.monitor-section {
  align-items: flex-start;
  margin-bottom: 4px;
}

.server-monitor,
.system-info {
  width: 100%;
  height: auto;
}

.server-name {
  display: flex;
  align-items: center;
}

.server-title {
  margin-left: 10px;
  font-weight: 500;
  color: var(--text-primary);
}

.server-offline {
  background-color: #f9f9f9;
  color: var(--text-secondary);
}

.server-restarting {
  background-color: #fff9ed;
}

.season-badge {
  display: inline-block;
  padding: 5px 8px;
  border-radius: 3px;
  font-size: 12px;
  color: white;
}

.season-spring {
  background-color: #4f8a5b;
}

.season-summer {
  background-color: #d99b32;
}

.season-autumn {
  background-color: #c94f4f;
}

.season-winter {
  background-color: var(--primary-color);
}

.resource-usage {
  margin-bottom: 0;
}

.resource-item {
  margin-bottom: 0;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color);
}

.resource-item:first-child {
  padding-top: 0;
}

.resource-item:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.metric-unavailable {
  height: 16px;
  line-height: 16px;
  color: #909399;
}

.mode-hint {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}

.resource-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 14px;
  color: var(--text-regular);
}

.resource-value {
  font-weight: bold;
  color: var(--text-primary);
}

.resource-detail {
  display: flex;
  justify-content: space-between;
  gap: 4px 12px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.system-events {
  border-top: 1px solid var(--border-color);
  padding-top: 15px;
  margin-top: 5px;
}

.event-header {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.event-list {
  max-height: 150px;
  overflow-y: auto;
}

.event-item {
  display: flex;
  margin-bottom: 10px;
  font-size: 13px;
}

.event-time {
  width: 45px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.event-content {
  flex: 1;
  color: var(--text-regular);
}

.player-summary-alert {
  margin-bottom: 12px;
}

.player-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.player-summary-item {
  display: flex;
  min-width: 0;
  min-height: 64px;
  flex-direction: column;
  justify-content: center;
  padding: 10px 12px;
  background: var(--surface-muted);
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.player-summary-item span {
  color: var(--text-secondary);
  font-size: 12px;
}

.player-summary-item strong {
  margin-top: 3px;
  color: var(--text-primary);
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.player-summary-footnote {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
}

.announcement-list {
  max-height: 320px;
  overflow-y: auto;
}

.announcement-item {
  padding: 15px 0;
  border-bottom: 1px solid var(--border-color);
}

.announcement-item:last-child {
  border-bottom: none;
}

.announcement-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.announcement-title span {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.announcement-body {
  font-size: 13px;
  color: var(--text-regular);
  margin-bottom: 10px;
  line-height: 1.5;
}

.announcement-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.announcement-time {
  color: var(--text-secondary);
}

.announcement-actions {
  display: flex;
  gap: 10px;
}

.log-section {
  margin-bottom: 20px;
}

.world-log-wrapper {
  height: 400px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-card);
}

.world-log {
  height: 100%;
}

.system-info-footer {
  display: flex;
  flex-direction: column;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid var(--border-color);
}

.system-info-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--text-regular);
}

.system-info-item i {
  margin-right: 8px;
  color: var(--primary-color);
}

.system-info-item > svg {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  color: var(--primary-color);
}



/* 服务器监控相关样式 */
.server-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.server-header span {
  font-size: 16px;
  font-weight: bold;
}

.server-header i {
  margin-right: 8px;
  color: var(--primary-color);
}

.server-row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.server-name-info {
  display: flex;
  align-items: center;
}

.server-name-text {
  font-weight: 500;
  margin-left: 5px;
}

.time-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-info span:first-child {
  font-weight: 500;
}

.time-info span:last-child {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 3px;
}

.server-footer {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-regular);
  font-size: 13px;
}

.server-monitor-body {
  min-height: 132px;
}

.server-stats {
  color: var(--text-secondary);
}

.empty-server,
.server-error-state {
  min-height: 132px;
  padding: 24px 0;
  text-align: center;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-server .legacy-icon,
.server-error-state .legacy-icon {
  width: 22px;
  height: 22px;
  margin: 0 0 10px;
  color: #9aa69e;
}

.empty-server strong,
.server-error-state strong {
  margin-bottom: 6px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}

.empty-server > span,
.server-error-state span {
  margin-bottom: 12px;
}

.server-error-state {
  padding-right: 20px;
  padding-left: 20px;
}

.server-error-state .legacy-icon {
  color: var(--warning-color);
}

.server-error-state span {
  max-width: 720px;
  color: var(--text-secondary);
  line-height: 20px;
  overflow-wrap: anywhere;
}

.server-state-actions {
  display: flex;
  gap: 8px;
}

.world-selection-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.dialog-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 80px;
  color: var(--text-secondary);
}

.world-option-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.version-info-row {
  margin-bottom: 16px;
}

.version-card {
  height: auto;
  box-shadow: var(--shadow-card);
  border-radius: 4px;
}

.version-content {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: start;
  gap: 10px;
  padding: 14px 16px;
}

.version-icon {
  width: 22px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0;
  font-size: 17px;
  color: var(--primary-color);
}

.version-details {
  min-width: 0;
  flex: 1;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 34px;
  margin-bottom: 0;
}

.version-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.version-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.version-info {
  margin-bottom: 0;
}

.version-boxes {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  max-width: 760px;
  margin: 10px 0 0;
  border-top: 1px solid var(--border-color);
}

.version-box {
  flex: 1 1 260px;
  padding: 10px 0 0;
  text-align: left;
  background-color: transparent;
  transition: color 0.15s ease;
}

.version-box-outdated {
  color: var(--danger-color);
}

.version-box-outdated .version-box-value {
  color: var(--danger-color);
}

.version-box-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 3px;
}

.version-box-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 3px;
}

.version-arrow {
  align-self: center;
  margin: 10px 20px 0;
  color: var(--text-secondary);
  font-size: 20px;
}

.version-box-date {
  font-size: 12px;
  color: var(--text-secondary);
}

.version-link {
  color: var(--primary-color);
  text-decoration: none;
  transition: all 0.3s;
}

.version-link:hover {
  opacity: 0.8;
}

.version-warning-icon {
  margin-left: 5px;
  color: #c94f4f;
  font-size: 16px;
}

.version-loading {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 32px;
  padding: 8px 0 0;
  color: var(--text-secondary);
}

.version-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  padding-top: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 20px;
}

.version-meta span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.version-managed-notice,
.version-check-warning,
.version-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 7px 9px;
  border-left: 2px solid var(--border-color);
  background: var(--surface-muted);
  color: var(--text-regular);
  font-size: 13px;
  line-height: 20px;
}

.version-check-warning,
.version-error {
  border-left-color: var(--warning-color);
  background: var(--surface-muted);
}

.version-error button {
  margin-left: auto;
}

.version-update-notice {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  margin-top: 8px;
  padding: 7px 9px;
  border-left: 2px solid var(--danger-color);
  background-color: var(--surface-muted);
  color: var(--danger-color);
}

.version-update-notice i {
  margin-right: 8px;
  font-size: 16px;
}

.version-update-notice button {
  margin-left: auto;
}

.version-update-status {
  margin-top: 15px;
  padding: 10px;
  background-color: var(--surface-muted);
  border-radius: 4px;
}

.update-status-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  font-weight: bold;
}

.update-status-header i {
  margin-right: 8px;
  font-size: 16px;
}

.update-output, .update-error {
  margin-top: 10px;
  font-size: 13px;
}

.output-label, .error-label {
  font-weight: bold;
  margin-bottom: 5px;
}

.output-content {
  padding: 5px;
  background-color: #f0f9eb;
  border-radius: 3px;
  word-break: break-all;
}

.error-content {
  padding: 5px;
  background-color: #fef0f0;
  border-radius: 3px;
  color: #c94f4f;
  word-break: break-all;
}

@media (max-width: 768px) {
  .dashboard-content {
    padding: 0 0 12px;
  }

  .section-divider {
    margin: 18px 0 12px;
  }

  .version-content {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 4px;
  }

  .version-icon {
    width: 36px;
    height: 36px;
    margin-right: 0;
    font-size: 18px;
  }

  .version-details {
    min-width: 0;
  }

  .version-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .version-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .version-boxes {
    align-items: stretch;
  }

  .version-arrow {
    margin: 0 6px;
  }

  .version-box-value {
    font-size: 16px;
  }

  .resource-detail {
    flex-wrap: wrap;
    gap: 4px 12px;
  }

  .version-update-notice {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 8px;
  }

  .version-update-notice button {
    margin-left: 0;
  }
}

/* Dashboard workspace hierarchy */
.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dashboard-header {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.dashboard-heading {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 12px;
}

.dashboard-heading h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 650;
  line-height: 28px;
  letter-spacing: 0;
}

.dashboard-heading span {
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.dashboard-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.summary-badge {
  min-height: 30px;
  gap: 6px;
  padding-right: 10px;
  padding-left: 10px;
  font-variant-numeric: tabular-nums;
}

.summary-badge svg {
  width: 14px;
  height: 14px;
}

.summary-status-dot {
  width: 7px;
  height: 7px;
  background: var(--muted-foreground);
  border-radius: 50%;
}

.summary-status-dot.online {
  background: var(--success-color);
}

.version-strip {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-left: 3px solid var(--primary-color);
  border-radius: 5px;
  box-shadow: none;
}

.version-strip-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.version-strip-heading > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.version-strip-heading span:not(.version-icon) {
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 15px;
}

.version-strip-heading strong {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 650;
  line-height: 19px;
}

.version-icon {
  display: inline-flex;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: var(--primary-color);
  background: var(--accent);
  border-radius: 5px;
}

.version-icon svg {
  width: 17px;
  height: 17px;
}

.version-details,
.version-info {
  min-width: 0;
}

.version-boxes {
  display: flex;
  max-width: none;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  margin: 0;
  border: 0;
}

.version-box {
  display: grid;
  flex: 0 1 auto;
  grid-template-columns: auto auto;
  align-items: center;
  gap: 2px 8px;
  min-width: 148px;
  padding: 0;
  text-align: left;
}

.version-box-label {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 14px;
}

.version-box-value {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 650;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.version-box-outdated .version-box-value,
.version-link {
  color: var(--primary-color);
}

.version-link {
  text-decoration: none;
}

.version-link:hover {
  text-decoration: underline;
  opacity: 1;
}

.version-arrow {
  flex: 0 0 14px;
  width: 14px;
  height: 14px;
  margin: 0;
  color: var(--text-secondary);
}

.version-meta {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 2px 14px;
  padding-top: 7px;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 15px;
}

.version-meta span:first-child {
  max-width: 480px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.version-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.version-loading,
.version-error {
  min-height: 42px;
  padding: 0;
}

.version-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--warning-color);
  background: transparent;
  border: 0;
}

.version-error svg,
.version-notices svg {
  flex: 0 0 15px;
  width: 15px;
  height: 15px;
}

.version-notices {
  display: flex;
  grid-column: 1 / -1;
  flex-direction: column;
  gap: 6px;
}

.version-notices:empty {
  display: none;
}

.version-managed-notice,
.version-check-warning,
.version-update-notice {
  display: flex;
  min-height: 32px;
  align-items: center;
  gap: 7px;
  margin: 0;
  padding: 6px 9px;
  color: var(--text-regular);
  background: var(--surface-muted);
  border: 0;
  border-left: 2px solid var(--info-color);
  font-size: 12px;
  line-height: 18px;
}

.version-check-warning {
  border-left-color: var(--warning-color);
}

.version-update-notice {
  color: var(--danger-color);
  border-left-color: var(--danger-color);
}

.version-update-notice button {
  margin-left: auto;
}

.version-update-status {
  margin: 0;
  padding: 10px;
  background: var(--surface-muted);
  border-radius: 4px;
}

.operations-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 0.8fr);
  align-items: start;
  gap: 16px;
}

.operation-panel {
  min-width: 0;
  overflow: hidden;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 5px;
  box-shadow: none;
}

.operation-panel-header {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.panel-title > svg {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  color: var(--primary-color);
}

.panel-title > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.panel-title h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 650;
  line-height: 20px;
}

.server-header .panel-title span,
.panel-title span {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 400;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.server-monitor,
.system-info {
  width: 100%;
  height: auto;
  margin: 0;
  border-radius: 5px;
  box-shadow: none;
}

.server-monitor-body {
  min-height: 236px;
  padding: 0 14px 12px;
  overflow-x: auto;
}

.server-footer {
  margin-top: 10px;
  padding-top: 10px;
}

.system-info .resource-usage {
  padding: 0 14px;
}

.resource-item {
  padding: 11px 0;
}

.resource-item:first-child {
  padding-top: 12px;
}

.resource-label {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 550;
}

.resource-detail {
  justify-content: flex-start;
  gap: 4px 12px;
  font-size: 10px;
  line-height: 15px;
}

.system-info-footer {
  gap: 6px;
  margin: 0 14px;
  padding: 11px 0 13px;
}

.system-info-item {
  min-width: 0;
  gap: 7px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 11px;
}

.system-info-item svg {
  flex: 0 0 14px;
  width: 14px;
  height: 14px;
  color: var(--text-secondary);
}

.section-divider {
  min-height: 34px;
  margin: 4px 0 -4px;
  padding: 0;
  border-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 650;
}

.monitor-section,
.version-info-row {
  margin: 0;
}

@media (max-width: 1180px) {
  .operations-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .system-info {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 0.4fr);
  }

  .system-info .operation-panel-header {
    grid-column: 1 / -1;
  }

  .system-info-footer {
    align-self: stretch;
    justify-content: center;
    margin-left: 0;
    padding-left: 14px;
    border-top: 0;
    border-left: 1px solid var(--border-color);
  }
}

@media (max-width: 900px) {
  .version-strip {
    grid-template-columns: 140px minmax(0, 1fr);
  }

  .version-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
    padding-top: 10px;
    border-top: 1px solid var(--border-color);
  }
}

@media (max-width: 768px) {
  .dashboard-content {
    gap: 12px;
    padding: 0;
  }

  .dashboard-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .dashboard-heading {
    width: 100%;
    justify-content: space-between;
  }

  .dashboard-summary {
    width: 100%;
    justify-content: flex-start;
  }

  .dashboard-summary > button {
    margin-left: auto;
  }

  .version-strip {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    padding: 12px;
  }

  .version-actions,
  .version-notices {
    grid-column: auto;
  }

  .version-actions {
    justify-content: flex-start;
  }

  .version-boxes {
    align-items: stretch;
  }

  .version-box {
    flex: 1 1 0;
    min-width: 0;
  }

  .version-meta span:first-child {
    max-width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .operation-panel-header {
    min-height: 54px;
    padding: 9px 12px;
  }

  .server-monitor-body {
    padding-right: 10px;
    padding-left: 10px;
  }

  .system-info {
    display: block;
  }

  .system-info-footer {
    margin-left: 14px;
    padding-left: 0;
    border-top: 1px solid var(--border-color);
    border-left: 0;
  }
}

@media (max-width: 520px) {
  .dashboard-heading span,
  .summary-badge:nth-child(2) {
    display: none;
  }

  .dashboard-summary > button {
    margin-left: 0;
  }

  .version-boxes {
    flex-wrap: wrap;
  }

  .version-box {
    flex-basis: calc(50% - 16px);
  }
}
</style>

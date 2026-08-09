<template>
  <div class="workspace-page">
    <header class="workspace-header">
      <div class="workspace-heading">
        <span class="workspace-kicker">当前管理目标</span>
        <div class="workspace-title-row">
          <h1>服务器工作台</h1>
          <Badge v-if="selectedRoom" :variant="runningWorlds.length > 0 ? 'secondary' : 'outline'">
            {{ runningWorlds.length > 0 ? '运行中' : '已停止' }}
          </Badge>
        </div>
        <p>{{ selectedRoom ? `${selectedRoom.name} · ${worlds.length} 个世界` : '尚未选择房间' }}</p>
      </div>

      <div class="workspace-toolbar">
        <UiSelect
          v-model="selectedRoomId"
          @update:model-value="handleRoomChange"
        >
          <SelectTrigger class="room-select" aria-label="选择房间"><SelectValue placeholder="选择房间" /></SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</SelectItem>
          </SelectGroup></SelectContent>
        </UiSelect>
        <Tooltip>
          <TooltipTrigger as-child>
            <UiButton
              variant="outline"
              size="icon"
              aria-label="刷新工作台"
              title="刷新工作台"
              :disabled="loading"
              @click="refreshWorkspace()"
            >
              <Spinner v-if="loading" />
              <RefreshCw v-else />
            </UiButton>
          </TooltipTrigger>
          <TooltipContent>刷新工作台</TooltipContent>
        </Tooltip>
        <UiButton
          :disabled="!selectedRoom || backupCreating"
          @click="createBackup"
        >
          <Spinner v-if="backupCreating" data-icon="inline-start" />
          <DatabaseBackup v-else data-icon="inline-start" />
          {{ backupCreating ? '正在创建' : '创建备份' }}
        </UiButton>
      </div>
    </header>

    <Alert v-if="loadError" class="workspace-alert" variant="destructive">
      <CircleAlert />
      <AlertTitle>工作台加载失败</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction>
        <UiButton size="sm" variant="outline" @click="refreshWorkspace()">重新加载</UiButton>
      </AlertAction>
    </Alert>

    <Empty v-else-if="!loading && rooms.length === 0">
      <EmptyHeader><EmptyMedia variant="icon"><ServerOff /></EmptyMedia><EmptyTitle>当前目标没有已接管的房间</EmptyTitle></EmptyHeader>
      <EmptyContent><UiButton @click="$router.push('/rooms/list')">前往房间管理</UiButton></EmptyContent>
    </Empty>

    <template v-else-if="selectedRoom">
      <section class="status-strip" aria-label="服务器概况">
        <Card>
          <CardHeader><CardTitle>世界状态</CardTitle><CardDescription>{{ runningWorlds.length }} 个分片运行中</CardDescription></CardHeader>
          <CardContent class="status-content"><strong>{{ runningWorlds.length }}<span>/ {{ worlds.length }}</span></strong></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>在线玩家</CardTitle><CardDescription>{{ contextErrors.players ? '读取失败' : `共 ${playerStats ? playerStats.total_count : '--'} 人` }}</CardDescription></CardHeader>
          <CardContent class="status-content"><strong>{{ playerStats ? playerStats.online_count : '--' }}<span>人</span></strong></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>磁盘使用</CardTitle><CardDescription>剩余 {{ formatDisk(systemStatus.free_disk) }}</CardDescription></CardHeader>
          <CardContent class="status-content"><strong>{{ formatPercent(systemStatus.disk_usage) }}</strong></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>最近备份</CardTitle><CardDescription>{{ contextErrors.backups ? '读取失败' : (latestBackup?.size_formatted || '暂无记录') }}</CardDescription></CardHeader>
          <CardContent class="status-content"><strong class="status-time">{{ latestBackup ? formatCompactTime(latestBackup.createdAt || latestBackup.create_time) : '--' }}</strong></CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>世界与分片</CardTitle>
          <CardDescription class="break-all">{{ selectedRoom.directoryName || selectedRoom.savepath || '当前房间的分片列表' }}</CardDescription>
          <CardAction><UiButton variant="ghost" @click="openRoomSettings"><Settings data-icon="inline-start" />房间设置</UiButton></CardAction>
        </CardHeader>
        <CardContent>

        <div v-if="worlds.length" class="world-grid">
          <article
            v-for="world in worlds"
            :key="world.id"
            class="world-item"
            :class="{
              selected: world.id === selectedWorldId,
              running: world.status === 'running'
            }"
            tabindex="0"
            @click="selectWorld(world)"
            @keyup.enter="selectWorld(world)"
          >
            <div class="world-main">
              <div class="world-symbol" :class="worldTone(world)">
                <component :is="worldIcon(world)" />
              </div>
              <div class="world-identity">
                <div class="world-name-row">
                  <strong>{{ world.name }}</strong>
                  <Badge :variant="world.status === 'running' ? 'secondary' : 'outline'">
                    {{ worldStatusLabel(world.status) }}
                  </Badge>
                </div>
                <span>{{ worldRoleLabel(world) }} · {{ world.directoryName || '未设置目录' }}</span>
              </div>
            </div>

            <dl class="world-facts">
              <div>
                <dt>天数</dt>
                <dd>{{ metricValue(world.day) }}</dd>
              </div>
              <div>
                <dt>季节</dt>
                <dd>{{ seasonLabel(world.season) }}</dd>
              </div>
              <div>
                <dt>控制</dt>
                <dd>{{ world.controlAvailable === false ? '不可用' : '可用' }}</dd>
              </div>
            </dl>

            <div class="world-actions" @click.stop>
              <Tooltip>
                <TooltipTrigger as-child>
                  <UiButton
                    size="icon-sm"
                    :variant="world.status === 'running' ? 'destructive' : 'secondary'"
                    :aria-label="world.status === 'running' ? '停止世界' : '启动世界'"
                    :title="world.status === 'running' ? '停止世界' : '启动世界'"
                    :disabled="world.controlAvailable === false || Boolean(worldActionId)"
                    @click="handleWorldAction(world, world.status === 'running' ? 'stop' : 'start')"
                  >
                    <Spinner v-if="worldActionId === world.id" />
                    <Square v-else-if="world.status === 'running'" />
                    <Play v-else />
                  </UiButton>
                </TooltipTrigger>
                <TooltipContent>{{ world.status === 'running' ? '停止世界' : '启动世界' }}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger as-child>
                  <UiButton
                    size="icon-sm"
                    variant="outline"
                    aria-label="重启世界"
                    title="重启世界"
                    :disabled="world.status !== 'running' || world.controlAvailable === false || Boolean(worldActionId)"
                    @click="handleWorldAction(world, 'restart')"
                  >
                    <RotateCw />
                  </UiButton>
                </TooltipTrigger>
                <TooltipContent>重启世界</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger as-child>
                  <UiButton
                    size="icon-sm"
                    variant="ghost"
                    aria-label="世界配置"
                    title="世界配置"
                    @click="openWorldSettings(world)"
                  >
                    <Settings />
                  </UiButton>
                </TooltipTrigger>
                <TooltipContent>世界配置</TooltipContent>
              </Tooltip>
            </div>
          </article>
        </div>
        <Empty v-else><EmptyHeader><EmptyMedia variant="icon"><Globe2 /></EmptyMedia><EmptyTitle>当前房间没有世界</EmptyTitle></EmptyHeader></Empty>
        </CardContent>
      </Card>

      <div class="workspace-grid">
        <Card>
          <CardHeader>
            <CardTitle>运行控制</CardTitle>
            <CardDescription>查看当前分片日志，或向选定世界发送控制台命令。</CardDescription>
          </CardHeader>
          <CardContent><Tabs v-model="activeOperation" class="operation-tabs">
            <TabsList>
              <TabsTrigger value="logs"><FileText />实时日志</TabsTrigger>
              <TabsTrigger value="console"><Terminal />控制台</TabsTrigger>
            </TabsList>
            <TabsContent value="logs">
              <world-log
                v-if="selectedWorld"
                :key="`${selectedRoomId}:${selectedWorldId}`"
                :room-id="selectedRoomId"
                :world-id="selectedWorldId"
                :archive-name="selectedRoom.name"
                :world-name="selectedWorld.name"
                title="分片日志"
                class="workspace-log"
              />
              <Empty v-else><EmptyHeader><EmptyMedia variant="icon"><Globe2 /></EmptyMedia><EmptyTitle>请选择世界</EmptyTitle></EmptyHeader></Empty>
            </TabsContent>

            <TabsContent value="console">
              <div class="console-panel">
                <div v-if="contextLoading" class="panel-loading"><Spinner /><span>正在加载控制台...</span></div>
                <div class="console-toolbar">
                  <UiSelect v-model="consoleServer">
                    <SelectTrigger class="console-select" aria-label="选择控制台目标世界"><SelectValue placeholder="选择目标世界" /></SelectTrigger>
                    <SelectContent><SelectGroup>
                      <SelectItem v-for="server in roomConsoleServers" :key="server.session_name" :value="server.session_name">{{ server.name }}</SelectItem>
                    </SelectGroup></SelectContent>
                  </UiSelect>
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child><UiButton variant="outline">常用命令<ChevronDown data-icon="inline-end" /></UiButton></DropdownMenuTrigger>
                    <DropdownMenuContent><DropdownMenuGroup>
                      <DropdownMenuItem v-for="item in commonCommands" :key="item.command" @select="applyCommonCommand(item.command)">{{ item.name }}</DropdownMenuItem>
                    </DropdownMenuGroup></DropdownMenuContent>
                  </DropdownMenu>
                  <UiButton variant="ghost" @click="$router.push('/servers/commands')"><Settings data-icon="inline-start" />命令管理</UiButton>
                </div>
                <Alert v-if="contextErrors.console" class="context-error" variant="destructive">
                  <CircleAlert /><AlertTitle>控制台不可用</AlertTitle><AlertDescription>{{ contextErrors.console }}</AlertDescription>
                </Alert>
                <UiTextarea
                  v-model="rawCommand"
                  rows="7"
                  placeholder="输入 Lua 控制台命令"
                  aria-label="Lua 控制台命令"
                />
                <div class="console-footer">
                  <span>目标：{{ selectedConsoleServer?.name || '未选择' }}</span>
                  <UiButton
                    :disabled="!consoleServer || !rawCommand.trim()"
                    @click="executeRawCommand"
                  >
                    <Spinner v-if="commandExecuting" data-icon="inline-start" />
                    <Send v-else data-icon="inline-start" />
                    执行
                  </UiButton>
                </div>
                <Alert v-if="commandResult" :variant="commandResult.success ? 'default' : 'destructive'">
                  <CircleCheck v-if="commandResult.success" />
                  <CircleAlert v-else />
                  <AlertTitle>{{ commandResult.success ? '命令已发送' : '命令执行失败' }}</AlertTitle>
                  <AlertDescription>
                    {{ commandResult.message }}
                    <span v-if="commandResult.runId">运行记录 {{ commandResult.runId }}</span>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs></CardContent>
        </Card>

        <aside class="context-rail" :aria-busy="contextLoading">
          <div v-if="contextLoading" class="panel-loading"><Spinner /><span>正在加载房间信息...</span></div>
          <Card>
            <CardHeader>
              <CardTitle>玩家</CardTitle>
              <CardDescription>{{ contextErrors.players ? '数据读取失败' : (playerStats ? `${playerStats.online_count} 人在线` : '状态不可用') }}</CardDescription>
              <CardAction><UiButton variant="ghost" size="sm" @click="openPlayers">全部<ArrowRight data-icon="inline-end" /></UiButton></CardAction>
            </CardHeader>
            <CardContent>
            <div v-if="recentPlayers.length" class="player-list">
              <UiButton
                v-for="player in recentPlayers"
                :key="`${player.room_id}:${player.user_id}`"
                variant="ghost"
                class="player-row"
                @click="openPlayers"
              >
                <span class="player-avatar"><User /></span>
                <span class="player-copy">
                  <strong>{{ player.player_name || player.user_id }}</strong>
                  <span>{{ characterLabel(player.prefab) }} · {{ player.world_name || '未知世界' }}</span>
                </span>
                <Badge :variant="player.status === 'online' ? 'default' : 'outline'">
                  {{ player.status === 'online' ? '在线' : '离线' }}
                </Badge>
              </UiButton>
            </div>
            <Alert v-else-if="contextErrors.players" variant="destructive">
              <CircleAlert />
              <AlertTitle>玩家数据读取失败</AlertTitle>
              <AlertDescription>{{ contextErrors.players }}</AlertDescription>
            </Alert>
            <Empty v-else class="rail-empty">
              <EmptyHeader><EmptyTitle>暂无玩家记录</EmptyTitle><EmptyDescription>玩家加入房间后会显示在这里。</EmptyDescription></EmptyHeader>
            </Empty>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>最近备份</CardTitle>
              <CardDescription>{{ contextErrors.backups ? '列表读取失败' : `${backups.length} 个记录` }}</CardDescription>
              <CardAction><UiButton variant="ghost" size="sm" @click="$router.push('/backups')">全部<ArrowRight data-icon="inline-end" /></UiButton></CardAction>
            </CardHeader>
            <CardContent>
            <div v-if="backups.length" class="backup-list">
              <div v-for="backup in backups.slice(0, 3)" :key="backup.id || backup.name" class="backup-row">
                <FileCheck2 />
                <span>
                  <strong>{{ backup.name }}</strong>
                  <small>{{ backup.create_time || formatCompactTime(backup.createdAt) }} · {{ backup.size_formatted || '--' }}</small>
                </span>
              </div>
            </div>
            <Alert v-else-if="contextErrors.backups" variant="destructive">
              <CircleAlert />
              <AlertTitle>备份列表读取失败</AlertTitle>
              <AlertDescription>{{ contextErrors.backups }}</AlertDescription>
            </Alert>
            <Empty v-else class="rail-empty">
              <EmptyHeader><EmptyTitle>暂无备份记录</EmptyTitle><EmptyDescription>创建房间备份后会显示在这里。</EmptyDescription></EmptyHeader>
            </Empty>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>快捷入口</CardTitle><CardDescription>打开当前房间的常用管理页面。</CardDescription></CardHeader>
            <CardContent><nav class="quick-nav" aria-label="服务器快捷入口">
            <UiButton variant="ghost" @click="openPlayers">
              <User />
              <span>玩家管理</span>
            </UiButton>
            <UiButton variant="ghost" @click="openMods">
              <PackageOpen />
              <span>模组管理</span>
            </UiButton>
            <UiButton variant="ghost" @click="openWorldState">
              <ChartNoAxesCombined />
              <span>世界状态</span>
            </UiButton>
            <UiButton variant="ghost" @click="$router.push('/logs/query')">
              <Search />
              <span>日志查询</span>
            </UiButton>
            </nav></CardContent>
          </Card>
        </aside>
      </div>
    </template>
  </div>
</template>

<script>
import WorldLog from '@/components/WorldLog.vue'
import { backupApi, commandApi, playerApi, roomApi, systemApi } from '@/api'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea as UiTextarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { confirmAction, promptText } from '@/lib/feedback'
import {
  ArrowRight, ChartNoAxesCombined, ChevronDown, CircleAlert, CircleCheck, DatabaseBackup, FileCheck2,
  FileText, Globe2, Moon, PackageOpen, Play, RefreshCw, RotateCw, Search, Send, ServerOff,
  Settings, Square, Sun, Terminal, User
} from '@lucide/vue'
import { toast } from 'vue-sonner'

const CHARACTER_NAMES = {
  wilson: '威尔逊',
  willow: '薇洛',
  wolfgang: '沃尔夫冈',
  wendy: '温蒂',
  wx78: 'WX-78',
  wickerbottom: '薇克巴顿',
  woodie: '伍迪',
  wes: '韦斯',
  waxwell: '麦斯威尔',
  wathgrithr: '薇格弗德',
  webber: '韦伯',
  winona: '薇诺娜',
  wortox: '沃拓克斯',
  wormwood: '沃姆伍德',
  warly: '沃利',
  wurt: '沃特',
  walter: '沃尔特',
  wanda: '旺达'
}

export default {
  name: 'ServerWorkspace',
  components: {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Badge,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CircleAlert,
    CircleCheck,
    ArrowRight,
    ChartNoAxesCombined,
    ChevronDown,
    DatabaseBackup,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    FileCheck2,
    FileText,
    Globe2,
    Moon,
    PackageOpen,
    Play,
    RefreshCw,
    RotateCw,
    Search,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Send,
    ServerOff,
    Settings,
    Spinner,
    Square,
    Sun,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Terminal,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    UiButton,
    UiSelect,
    UiTextarea,
    User,
    WorldLog
  },
  data() {
    return {
      loading: false,
      contextLoading: false,
      loadError: '',
      rooms: [],
      selectedRoomId: this.$route.query.roomId || '',
      selectedWorldId: this.$route.query.worldId || '',
      systemStatus: {},
      playerStats: null,
      backups: [],
      consoleServers: [],
      contextErrors: {
        players: '',
        backups: '',
        console: ''
      },
      worldActionId: '',
      backupCreating: false,
      activeOperation: 'logs',
      consoleServer: '',
      rawCommand: '',
      commandExecuting: false,
      commandResult: null,
      refreshTimer: null,
      commonCommands: [
        { name: '保存世界', command: 'c_save()' },
        { name: '查看在线玩家', command: 'c_listallplayers()' },
        { name: '查看世界天数', command: "print('当前天数: ' .. TheWorld.state.cycles + 1)" },
        { name: '查看当前季节', command: "print('当前季节: ' .. TheWorld.state.season)" },
        { name: '发送公告', command: "c_announce('请输入公告内容')" }
      ]
    }
  },
  computed: {
    selectedRoom() {
      return this.rooms.find(room => room.id === this.selectedRoomId) || null
    },
    worlds() {
      return this.selectedRoom?.worlds || []
    },
    selectedWorld() {
      return this.worlds.find(world => world.id === this.selectedWorldId) || null
    },
    runningWorlds() {
      return this.worlds.filter(world => world.status === 'running')
    },
    recentPlayers() {
      return this.playerStats?.recent_players?.slice(0, 5) || []
    },
    latestBackup() {
      return this.backups[0] || null
    },
    roomConsoleServers() {
      return this.consoleServers.filter(server => server.room_id === this.selectedRoomId)
    },
    selectedConsoleServer() {
      return this.roomConsoleServers.find(server => server.session_name === this.consoleServer) || null
    }
  },
  async created() {
    await this.refreshWorkspace()
    this.refreshTimer = window.setInterval(() => this.refreshWorkspace(true), 30000)
  },
  beforeUnmount() {
    if (this.refreshTimer) window.clearInterval(this.refreshTimer)
  },
  methods: {
    unwrapList(response) {
      if (Array.isArray(response)) return response
      return Array.isArray(response?.data) ? response.data : []
    },
    async refreshWorkspace(silent = false) {
      if (!silent) this.loading = true
      this.loadError = ''
      const previousRoomId = this.selectedRoomId
      const [roomsResult, systemResult] = await Promise.allSettled([
        roomApi.getRoomList(),
        systemApi.getDashboardStatus()
      ])

      if (roomsResult.status === 'rejected') {
        this.rooms = []
        this.loadError = roomsResult.reason?.message || '无法读取房间和世界状态'
      } else {
        this.rooms = this.unwrapList(roomsResult.value)
        this.resolveSelection()
      }

      this.systemStatus = systemResult.status === 'fulfilled'
        ? (systemResult.value?.data || {})
        : {}

      if (this.selectedRoom) {
        if (silent && previousRoomId === this.selectedRoomId) await this.refreshPlayerStats()
        else await this.refreshRoomContext()
      }
      if (!silent) this.loading = false
    },
    resolveSelection() {
      let room = this.rooms.find(item => item.id === this.selectedRoomId)
      if (!room) room = this.rooms.find(item => item.managed) || this.rooms[0]
      this.selectedRoomId = room?.id || ''

      const worlds = room?.worlds || []
      let world = worlds.find(item => item.id === this.selectedWorldId)
      if (!world) world = worlds.find(item => item.status === 'running') || worlds[0]
      this.selectedWorldId = world?.id || ''
      this.syncConsoleTarget()
      this.syncRouteContext()
    },
    async handleRoomChange() {
      this.selectedWorldId = (this.worlds.find(world => world.status === 'running') || this.worlds[0])?.id || ''
      this.syncConsoleTarget()
      this.syncRouteContext()
      await this.refreshRoomContext()
    },
    async refreshRoomContext() {
      if (!this.selectedRoom) return
      const roomId = this.selectedRoomId
      const roomName = this.selectedRoom.name
      this.contextLoading = true
      this.playerStats = null
      this.backups = []
      this.consoleServers = []
      this.consoleServer = ''
      this.contextErrors = { players: '', backups: '', console: '' }
      const [playersResult, backupsResult, consoleResult] = await Promise.allSettled([
        playerApi.getPlayerStats(roomName),
        backupApi.getBackupList(),
        commandApi.getServers()
      ])

      if (this.selectedRoomId !== roomId) return
      this.playerStats = playersResult.status === 'fulfilled'
        ? playersResult.value?.data || null
        : null
      this.contextErrors.players = playersResult.status === 'rejected'
        ? (playersResult.reason?.message || '玩家数据读取失败')
        : ''
      this.backups = backupsResult.status === 'fulfilled'
        ? [...(backupsResult.value?.data?.[roomName] || [])].sort((left, right) => {
          const leftTime = new Date(left.createdAt || left.create_time || 0).getTime()
          const rightTime = new Date(right.createdAt || right.create_time || 0).getTime()
          return rightTime - leftTime
        })
        : []
      this.contextErrors.backups = backupsResult.status === 'rejected'
        ? (backupsResult.reason?.message || '备份列表读取失败')
        : ''
      this.consoleServers = consoleResult.status === 'fulfilled' ? consoleResult.value : []
      this.contextErrors.console = consoleResult.status === 'rejected'
        ? (consoleResult.reason?.message || '控制台目标读取失败')
        : ''
      this.syncConsoleTarget()
      this.contextLoading = false
    },
    async refreshPlayerStats() {
      if (!this.selectedRoom) return
      const roomId = this.selectedRoomId
      this.contextErrors.players = ''
      try {
        const response = await playerApi.getPlayerStats(this.selectedRoom.name)
        if (this.selectedRoomId === roomId) this.playerStats = response?.data || null
      } catch (error) {
        if (this.selectedRoomId === roomId) {
          this.playerStats = null
          this.contextErrors.players = error.message || '玩家数据读取失败'
        }
      }
    },
    selectWorld(world) {
      this.selectedWorldId = world.id
      this.syncConsoleTarget()
      this.syncRouteContext()
    },
    syncConsoleTarget() {
      const matching = this.consoleServers.find(server =>
        server.room_id === this.selectedRoomId && server.world_id === this.selectedWorldId
      )
      const currentValid = this.consoleServers.some(server => server.session_name === this.consoleServer)
      if (matching) this.consoleServer = matching.session_name
      else if (!currentValid) this.consoleServer = this.roomConsoleServers[0]?.session_name || ''
    },
    syncRouteContext() {
      const roomId = this.selectedRoomId || undefined
      const worldId = this.selectedWorldId || undefined
      if (this.$route.query.roomId === roomId && this.$route.query.worldId === worldId) return
      this.$router.replace({
        path: this.$route.path,
        query: { ...this.$route.query, roomId, worldId }
      }).catch(() => {})
    },
    async handleWorldAction(world, action) {
      const label = { start: '启动', stop: '停止', restart: '重启' }[action]
      try {
        await confirmAction(`确定要${label}“${this.selectedRoom.name} / ${world.name}”吗？`, `${label}世界`, {
          confirmButtonText: `确认${label}`,
          cancelButtonText: '取消',
          type: action === 'start' ? 'info' : 'warning'
        })
      } catch {
        return
      }

      this.worldActionId = world.id
      try {
        let response
        const target = { room_id: this.selectedRoom.id, world_id: world.id }
        if (action === 'start') response = await roomApi.startRoom(target)
        if (action === 'stop') response = await roomApi.stopRoom(target)
        if (action === 'restart') response = await systemApi.restartTmuxServer({
          ...target,
          archive_name: this.selectedRoom.name,
          world_name: world.name
        })
        toast.success(response?.msg || `${label}完成`)
        await this.refreshWorkspace(true)
      } catch (error) {
        toast.error(`${label}失败：${error.message || '未知错误'}`)
      } finally {
        this.worldActionId = ''
      }
    },
    async createBackup() {
      if (!this.selectedRoom) return
      this.backupCreating = true
      try {
        const response = await backupApi.createBackup(this.selectedRoom.name)
        toast.success(response?.msg || '备份已创建')
        await this.refreshRoomContext()
      } catch (error) {
        toast.error(`创建备份失败：${error.message || '未知错误'}`)
      } finally {
        this.backupCreating = false
      }
    },
    applyCommonCommand(command) {
      this.rawCommand = command
    },
    async executeRawCommand() {
      const server = this.selectedConsoleServer
      if (!server || !this.rawCommand.trim()) return

      let confirmation
      try {
        const response = await promptText(
          `该操作会向分片发送 Lua 命令，请输入房间名“${server.room_name}”确认`,
          '执行确认',
          {
            confirmButtonText: '确认执行',
            cancelButtonText: '取消',
            inputValidator: value => value === server.room_name || '房间名不匹配'
          }
        )
        confirmation = response.value
      } catch {
        return
      }

      this.commandExecuting = true
      this.commandResult = null
      try {
        const run = await commandApi.executeRawCommand(server.session_name, this.rawCommand.trim(), confirmation)
        const success = run.status === 'sent'
        this.commandResult = {
          success,
          runId: run.id,
          message: run.message || run.errorMessage || (success ? '命令已发送到分片控制台' : '命令发送失败')
        }
        if (success) toast.success('命令已发送')
        else toast.error(this.commandResult.message)
      } catch (error) {
        this.commandResult = { success: false, message: error.message || '命令发送失败' }
        toast.error(this.commandResult.message)
      } finally {
        this.commandExecuting = false
      }
    },
    openRoomSettings() {
      this.$router.push({ path: '/rooms/settings', query: { id: this.selectedRoomId } })
    },
    openWorldSettings(world) {
      this.$router.push({
        path: '/worlds/settings',
        query: {
          roomId: this.selectedRoomId,
          roomName: this.selectedRoom.name,
          worldId: world.id,
          worldName: world.name,
          worldType: world.type
        }
      })
    },
    openWorldState() {
      this.$router.push({
        path: '/worlds/state',
        query: {
          roomId: this.selectedRoomId,
          roomName: this.selectedRoom?.name,
          worldId: this.selectedWorldId,
          worldName: this.selectedWorld?.name
        }
      })
    },
    openPlayers() {
      this.$router.push({ path: '/players/list', query: { archive: this.selectedRoom?.name } })
    },
    openMods() {
      this.$router.push({
        path: '/mods/list',
        query: { roomId: this.selectedRoomId, worldId: this.selectedWorldId || undefined }
      })
    },
    worldIcon(world) {
      return ['cave', 'caves'].includes(world.type || world.role) ? Moon : Sun
    },
    worldTone(world) {
      return ['cave', 'caves'].includes(world.type || world.role) ? 'cave' : 'forest'
    },
    worldRoleLabel(world) {
      const role = world.type || world.role
      if (['forest', 'master'].includes(role)) return '森林世界'
      if (['cave', 'caves'].includes(role)) return '洞穴世界'
      return '自定义世界'
    },
    worldStatusLabel(status) {
      return { running: '运行中', stopped: '已停止', starting: '启动中', stopping: '停止中' }[status] || '未知'
    },
    seasonLabel(season) {
      return { autumn: '秋季', winter: '冬季', spring: '春季', summer: '夏季' }[season] || season || '--'
    },
    characterLabel(prefab) {
      return CHARACTER_NAMES[prefab] || prefab || '未知角色'
    },
    metricValue(value) {
      return value === null || value === undefined || value === '' ? '--' : value
    },
    formatPercent(value) {
      return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : '--'
    },
    formatDisk(value) {
      return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)} GB` : '--'
    },
    formatCompactTime(value) {
      if (!value) return '--'
      const date = new Date(value)
      if (!Number.isFinite(date.getTime())) return String(value)
      const now = new Date()
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      }
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
    }
  }
}
</script>

<style scoped>
.workspace-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.workspace-header,
.workspace-title-row,
.workspace-toolbar,
.world-main,
.world-name-row,
.console-toolbar,
.console-footer,
.backup-row {
  display: flex;
  align-items: center;
}

.workspace-header {
  justify-content: space-between;
  gap: 20px;
}

.workspace-heading {
  min-width: 0;
}

.workspace-kicker {
  display: block;
  margin-bottom: 3px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.workspace-title-row {
  gap: 10px;
}

.workspace-title-row h1 {
  margin: 0;
  color: var(--foreground);
  font-size: 24px;
  line-height: 32px;
  font-weight: 600;
  letter-spacing: 0;
}

.workspace-heading p {
  margin: 3px 0 0;
  color: var(--muted-foreground);
  line-height: 20px;
}

.workspace-toolbar {
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.room-select {
  width: 220px;
}

.workspace-alert {
  margin: 0;
}

.status-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.status-content {
  display: flex;
  min-height: 64px;
  align-items: flex-end;
}

.status-content strong {
  color: var(--foreground);
  font-size: 30px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.status-content strong span {
  margin-left: 6px;
  color: var(--muted-foreground);
  font-size: 14px;
  font-weight: 400;
}

.status-content .status-time {
  font-size: 20px;
}

.world-grid {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
}

.world-item {
  position: relative;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(240px, 0.8fr) auto;
  align-items: center;
  gap: 16px;
  min-width: 0;
  padding: 14px 0;
  cursor: pointer;
  background: transparent;
  border-bottom: 1px solid var(--border);
  transition: background-color 180ms ease;
}

.world-item:hover,
.world-item:focus-visible {
  background: var(--muted);
  outline: none;
}

.world-item.selected {
  background: var(--accent);
}

.world-item.running::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -20px;
  width: 3px;
  content: '';
  background: var(--success-color);
}

.world-main {
  gap: 10px;
  min-width: 0;
}

.world-symbol {
  display: grid;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 4px;
}

.world-symbol.forest {
  color: var(--warning-color);
  background: color-mix(in srgb, var(--warning-color) 12%, var(--card));
}

.world-symbol.cave {
  color: var(--muted-foreground);
  background: var(--muted);
}

.world-identity {
  flex: 1;
  min-width: 0;
}

.world-name-row {
  justify-content: space-between;
  gap: 8px;
}

.world-name-row strong {
  overflow: hidden;
  color: var(--foreground);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.world-identity > span {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: var(--muted-foreground);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.world-facts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0;
}

.world-facts div {
  min-width: 0;
}

.world-facts dt {
  color: var(--muted-foreground);
  font-size: 11px;
}

.world-facts dd {
  margin: 2px 0 0;
  overflow: hidden;
  color: var(--foreground);
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.world-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  padding: 0;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  gap: 24px;
  align-items: start;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.workspace-log {
  height: 470px;
}

.console-panel {
  min-height: 440px;
}

.console-toolbar {
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.console-select {
  width: min(320px, 100%);
}

.panel-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.context-error {
  margin-bottom: 10px;
}

.button-tail-icon {
  margin-left: 5px;
}

.console-footer {
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.console-footer span {
  overflow: hidden;
  color: var(--muted-foreground);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-rail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.player-list,
.backup-list {
  border-top: 1px solid var(--border);
}

.player-row {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  width: 100%;
  min-height: 50px;
  padding: 7px 0;
  cursor: pointer;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--border);
}

.player-row:last-child {
  border-bottom: 0;
}

.player-row:hover .player-copy strong,
.player-row:focus-visible .player-copy strong {
  color: var(--primary);
}

.player-row:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.player-avatar {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: var(--foreground);
  background: var(--muted);
  border-radius: 4px;
}

.player-copy {
  min-width: 0;
}

.player-copy strong,
.player-copy span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-copy strong {
  color: var(--foreground);
  font-size: 13px;
  transition: color 180ms ease;
}

.player-copy span {
  color: var(--muted-foreground);
  font-size: 11px;
}

.backup-row {
  gap: 9px;
  min-height: 49px;
  padding: 7px 0;
  border-bottom: 1px solid var(--border);
}

.backup-row:last-child {
  border-bottom: 0;
}

.backup-row span {
  min-width: 0;
}

.backup-row strong,
.backup-row small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.backup-row strong {
  color: var(--foreground);
  font-size: 13px;
}

.backup-row small {
  margin-top: 2px;
  color: var(--muted-foreground);
}

.rail-empty {
  padding: 24px 8px;
  color: var(--muted-foreground);
  text-align: center;
}

.quick-nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
}

.quick-nav button {
  justify-content: flex-start;
}

@media (max-width: 1100px) {
  .status-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workspace-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .context-rail {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quick-nav {
    grid-column: 1 / -1;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

}

@media (max-width: 768px) {
  .workspace-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .workspace-toolbar {
    width: 100%;
    justify-content: flex-start;
  }

  .room-select {
    flex: 1 1 180px;
    width: auto;
  }

  .status-strip {
    grid-template-columns: minmax(0, 1fr);
  }

  .context-rail {
    grid-template-columns: minmax(0, 1fr);
  }

  .world-item {
    grid-template-columns: minmax(0, 1fr);
  }

  .world-facts {
    margin: 2px 0;
  }

  .world-actions {
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }

  .workspace-log {
    height: 520px;
  }

  .console-select {
    flex: 1 1 100%;
    width: 100%;
  }

  .quick-nav {
    grid-column: auto;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

}

@media (prefers-reduced-motion: reduce) {
  .world-item,
  .player-copy strong {
    transition: none;
  }
}
</style>

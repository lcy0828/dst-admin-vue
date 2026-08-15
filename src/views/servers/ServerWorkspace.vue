<template>
  <div class="workspace-page">
    <header class="workspace-header">
      <div class="workspace-heading">
        <span class="workspace-kicker">{{ $t('servers.workspace.kicker') }}</span>
        <div class="workspace-title-row">
          <h1>{{ $t('servers.workspace.title') }}</h1>
          <Badge v-if="selectedRoom" :variant="runningWorlds.length > 0 ? 'secondary' : 'outline'">
            {{ runningWorlds.length > 0 ? $t('worldRuntime.statuses.running') : $t('worldRuntime.statuses.stopped') }}
          </Badge>
        </div>
        <div v-if="selectedRoom" class="workspace-overview">
          <span class="workspace-room-summary">{{ $t('servers.workspace.roomSummary', { name: selectedRoom.name, count: worlds.length }) }}</span>
          <Separator class="overview-separator" orientation="vertical" />
          <div class="status-summary" role="list" :aria-label="$t('servers.workspace.overview.label')">
            <div class="status-metric" role="listitem">
              <span class="status-label">{{ $t('servers.workspace.overview.worldStatus') }}</span>
              <span class="status-value">{{ runningWorlds.length }}<span>/{{ worlds.length }}</span></span>
            </div>
            <Separator class="status-separator" orientation="vertical" />
            <div class="status-metric" role="listitem">
              <span class="status-label">{{ $t('servers.workspace.overview.onlinePlayers') }}</span>
              <span class="status-value">{{ playerStats ? playerStats.online_count : '--' }}<span>/{{ playerStats ? playerStats.total_count : '--' }}</span></span>
            </div>
            <Separator class="status-separator" orientation="vertical" />
            <div class="status-metric" role="listitem">
              <span class="status-label">{{ $t('servers.workspace.overview.diskUsage') }}</span>
              <span class="status-value">{{ formatPercent(systemStatus.disk_usage) }}</span>
            </div>
            <Separator class="status-separator" orientation="vertical" />
            <div class="status-metric" role="listitem">
              <span class="status-label">{{ $t('servers.workspace.backups.latest') }}</span>
              <span class="status-value">{{ latestBackup ? formatCompactTime(latestBackup.createdAt || latestBackup.create_time) : '--' }}</span>
            </div>
          </div>
        </div>
        <p v-else>{{ $t('servers.workspace.noRoomSelected') }}</p>
      </div>

      <div class="workspace-toolbar">
        <UiSelect
          v-model="selectedRoomId"
          @update:model-value="handleRoomChange"
        >
          <SelectTrigger class="room-select" :aria-label="$t('servers.workspace.roomSelect')"><SelectValue :placeholder="$t('servers.workspace.roomSelect')" /></SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</SelectItem>
          </SelectGroup></SelectContent>
        </UiSelect>
        <Tooltip>
          <TooltipTrigger as-child>
            <UiButton
              variant="outline"
              size="icon"
              :aria-label="$t('servers.workspace.refresh')"
              :title="$t('servers.workspace.refresh')"
              :disabled="loading"
              @click="refreshWorkspace()"
            >
              <Spinner v-if="loading" />
              <RefreshCw v-else />
            </UiButton>
          </TooltipTrigger>
          <TooltipContent>{{ $t('servers.workspace.refresh') }}</TooltipContent>
        </Tooltip>
        <UiButton
          :disabled="!selectedRoom || backupCreating"
          @click="createBackup"
        >
          <Spinner v-if="backupCreating" data-icon="inline-start" />
          <DatabaseBackup v-else data-icon="inline-start" />
          {{ backupCreating ? $t('servers.workspace.backups.creating') : $t('servers.workspace.backups.create') }}
        </UiButton>
      </div>
    </header>

    <Alert v-if="loadError" class="workspace-alert" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ $t('servers.workspace.feedback.loadFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ localizedError(loadError) }}</AlertDescription>
      <AlertAction>
        <UiButton size="sm" variant="outline" @click="refreshWorkspace()">{{ $t('servers.workspace.reload') }}</UiButton>
      </AlertAction>
    </Alert>

    <Empty v-else-if="!loading && rooms.length === 0">
      <EmptyHeader><EmptyMedia variant="icon"><ServerOff /></EmptyMedia><EmptyTitle>{{ $t('servers.workspace.empty.noRooms') }}</EmptyTitle></EmptyHeader>
      <EmptyContent><UiButton @click="$router.push('/rooms/list')">{{ $t('servers.workspace.empty.openRooms') }}</UiButton></EmptyContent>
    </Empty>

    <template v-else-if="selectedRoom">
      <Card size="sm" class="world-card">
        <CardHeader class="gap-0">
          <div class="world-card-heading">
            <CardTitle>{{ $t('servers.workspace.worlds.title') }}</CardTitle>
            <CardDescription class="break-all">{{ selectedRoom.directoryName || selectedRoom.savepath || $t('servers.workspace.worlds.description') }}</CardDescription>
          </div>
          <CardAction class="row-span-1 self-center"><UiButton variant="ghost" @click="openRoomSettings"><Settings data-icon="inline-start" />{{ $t('servers.workspace.worlds.roomSettings') }}</UiButton></CardAction>
        </CardHeader>
        <CardContent class="world-card-content">

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
                  <Badge :variant="worldStatusVariant(world)">
                    {{ worldStatusLabel(world) }}
                  </Badge>
                  <RuntimeExitBadge :event="world.latestExit" />
                </div>
                <span>{{ worldRoleLabel(world) }} · {{ world.directoryName || $t('servers.workspace.worlds.directoryUnset') }}</span>
                <span v-if="worldStatusMessage(world)" class="world-failure">{{ worldStatusMessage(world) }}</span>
              </div>
            </div>

            <dl class="world-facts">
              <div>
                <dt>{{ $t('servers.workspace.worlds.day') }}</dt>
                <dd>{{ metricValue(world.day) }}</dd>
              </div>
              <div>
                <dt>{{ $t('servers.workspace.worlds.season') }}</dt>
                <dd>{{ seasonLabel(world.season) }}</dd>
              </div>
              <div>
                <dt>{{ $t('servers.workspace.worlds.control') }}</dt>
                <dd>{{ world.controlAvailable === false ? $t('servers.workspace.states.unavailable') : $t('servers.workspace.states.available') }}</dd>
              </div>
              <div>
                <dt>{{ $t('servers.workspace.worlds.dataTime') }}</dt>
                <dd><WorldDataFreshnessBadge :freshness="world.stateFreshness" :observed-at="world.stateObservedAt" :age-seconds="world.stateAgeSeconds" /></dd>
              </div>
            </dl>

            <div class="world-actions" @click.stop>
              <Tooltip>
                <TooltipTrigger as-child>
                  <UiButton
                    size="icon-sm"
                    :variant="worldPrimaryAction(world).variant"
                    :aria-label="worldActionLabel(world)"
                    :title="worldActionLabel(world)"
                    :disabled="!canToggleWorld(world) || Boolean(worldActionId)"
                    @click="handleWorldAction(world, worldPrimaryAction(world).kind)"
                  >
                    <Spinner v-if="worldActionId === world.id" />
                    <Square v-else-if="worldPrimaryAction(world).kind === 'stop'" />
                    <Play v-else-if="worldPrimaryAction(world).kind === 'start'" />
                  </UiButton>
                </TooltipTrigger>
                <TooltipContent>{{ worldActionLabel(world) }}</TooltipContent>
              </Tooltip>
              <Tooltip v-if="world.status === 'failed'">
                <TooltipTrigger as-child>
                  <UiButton
                    size="icon-sm"
                    variant="outline"
                    :aria-label="$t('servers.workspace.worlds.cleanupFailedSession')"
                    :title="$t('servers.workspace.worlds.cleanupFailedSession')"
                    :disabled="!canCleanFailedWorld(world) || Boolean(worldActionId)"
                    @click="handleWorldAction(world, 'cleanup')"
                  >
                    <Square />
                  </UiButton>
                </TooltipTrigger>
                <TooltipContent>{{ $t('servers.workspace.worlds.cleanupFailedSession') }}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger as-child>
                  <UiButton
                    size="icon-sm"
                    variant="outline"
                    :aria-label="$t('servers.workspace.worlds.restart')"
                    :title="$t('servers.workspace.worlds.restart')"
                    :disabled="!canStopWorld(world) || Boolean(worldActionId)"
                    @click="handleWorldAction(world, 'restart')"
                  >
                    <RotateCw />
                  </UiButton>
                </TooltipTrigger>
                <TooltipContent>{{ $t('servers.workspace.worlds.restart') }}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger as-child>
                  <UiButton
                    size="icon-sm"
                    variant="ghost"
                    :aria-label="$t('servers.workspace.worlds.configure')"
                    :title="$t('servers.workspace.worlds.configure')"
                    :disabled="!canConfigureWorld(world)"
                    @click="openWorldSettings(world)"
                  >
                    <Settings />
                  </UiButton>
                </TooltipTrigger>
                <TooltipContent>{{ $t('servers.workspace.worlds.configure') }}</TooltipContent>
              </Tooltip>
            </div>
          </article>
        </div>
        <Empty v-else><EmptyHeader><EmptyMedia variant="icon"><Globe2 /></EmptyMedia><EmptyTitle>{{ $t('servers.workspace.empty.noWorlds') }}</EmptyTitle></EmptyHeader></Empty>
        </CardContent>
      </Card>

      <div class="workspace-grid">
        <Card size="sm">
          <CardHeader class="sr-only">
            <CardTitle>{{ $t('servers.workspace.operations.title') }}</CardTitle>
            <CardDescription>{{ $t('servers.workspace.operations.description') }}</CardDescription>
          </CardHeader>
          <CardContent class="operation-content"><Tabs v-model="activeOperation" class="operation-tabs">
            <TabsList>
              <TabsTrigger value="logs"><FileText />{{ $t('servers.workspace.operations.liveLogs') }}</TabsTrigger>
              <TabsTrigger value="console"><Terminal />{{ $t('servers.workspace.console.title') }}</TabsTrigger>
            </TabsList>
            <TabsContent value="logs">
              <world-log
                v-if="selectedWorld"
                :key="`${selectedRoomId}:${selectedWorldId}`"
                :room-id="selectedRoomId"
                :world-id="selectedWorldId"
                :archive-name="selectedRoom.name"
                :world-name="selectedWorld.name"
                :title="$t('servers.workspace.operations.shardLogs')"
                class="workspace-log"
              />
              <Empty v-else><EmptyHeader><EmptyMedia variant="icon"><Globe2 /></EmptyMedia><EmptyTitle>{{ $t('servers.workspace.empty.selectWorld') }}</EmptyTitle></EmptyHeader></Empty>
            </TabsContent>

            <TabsContent value="console">
              <div class="console-panel">
                <div v-if="contextLoading" class="panel-loading"><Spinner /><span>{{ $t('servers.workspace.console.loading') }}</span></div>
                <div class="console-toolbar">
                  <UiSelect v-model="consoleServer">
                    <SelectTrigger class="console-select" :aria-label="$t('servers.workspace.console.selectTarget')"><SelectValue :placeholder="$t('servers.workspace.console.selectWorld')" /></SelectTrigger>
                    <SelectContent><SelectGroup>
                      <SelectItem v-for="server in roomConsoleServers" :key="server.session_name" :value="server.session_name">{{ server.name }}</SelectItem>
                    </SelectGroup></SelectContent>
                  </UiSelect>
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child><UiButton variant="outline">{{ $t('servers.workspace.console.commonCommands.title') }}<ChevronDown data-icon="inline-end" /></UiButton></DropdownMenuTrigger>
                    <DropdownMenuContent><DropdownMenuGroup>
                      <DropdownMenuItem v-for="item in commonCommands" :key="item.command" @select="applyCommonCommand(item.command)">{{ $t(item.nameKey) }}</DropdownMenuItem>
                    </DropdownMenuGroup></DropdownMenuContent>
                  </DropdownMenu>
                  <UiButton variant="ghost" @click="$router.push('/servers/commands')"><Settings data-icon="inline-start" />{{ $t('servers.workspace.console.commandManager') }}</UiButton>
                </div>
                <Alert v-if="contextErrors.console" class="context-error" variant="destructive">
                  <CircleAlert /><AlertTitle>{{ $t('servers.workspace.console.unavailable') }}</AlertTitle><AlertDescription>{{ localizedError(contextErrors.console) }}</AlertDescription>
                </Alert>
                <UiTextarea
                  v-model="rawCommand"
                  rows="7"
                  :placeholder="$t('servers.workspace.console.placeholder')"
                  :aria-label="$t('servers.workspace.console.commandAria')"
                />
                <div class="console-footer">
                  <span>{{ $t('servers.workspace.console.target', { name: selectedConsoleServer?.name || $t('servers.workspace.states.notSelected') }) }}</span>
                  <UiButton
                    :disabled="commandExecuting || !consoleServer || !rawCommand.trim()"
                    @click="executeRawCommand"
                  >
                    <Spinner v-if="commandExecuting" data-icon="inline-start" />
                    <Send v-else data-icon="inline-start" />
                    {{ $t('servers.workspace.console.execute') }}
                  </UiButton>
                </div>
                <Alert v-if="commandResult" :variant="commandResult.success ? 'default' : 'destructive'">
                  <CircleCheck v-if="commandResult.success" />
                  <CircleAlert v-else />
                  <AlertTitle>{{ commandResult.success ? $t('servers.workspace.console.sent') : $t('servers.workspace.console.failed') }}</AlertTitle>
                  <AlertDescription>
                    {{ commandResult.message || $t(commandResult.success ? 'servers.workspace.console.sentDescription' : 'servers.workspace.console.sendFailed') }}
                    <span v-if="commandResult.runId">{{ $t('servers.workspace.console.runRecord', { id: commandResult.runId }) }}</span>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs></CardContent>
        </Card>

        <aside class="context-rail" :aria-busy="contextLoading">
          <Card size="sm" class="context-card">
            <CardHeader class="sr-only">
              <CardTitle>{{ $t('servers.workspace.context.title') }}</CardTitle>
              <CardDescription>{{ $t('servers.workspace.context.description') }}</CardDescription>
            </CardHeader>
            <CardContent class="context-card-content">
              <div v-if="contextLoading" class="context-loading" role="status">
                <Spinner />
                <span>{{ $t('servers.workspace.context.loading') }}</span>
              </div>

              <section class="context-section context-section-players" aria-labelledby="workspace-players-title">
                <header class="context-section-header">
                  <div class="context-section-heading">
                    <h2 id="workspace-players-title">{{ $t('servers.workspace.players.title') }}</h2>
                    <span>{{ contextErrors.players ? $t('servers.workspace.states.dataReadFailed') : (playerStats ? $t('servers.workspace.players.presenceSummary', { online: playerStats.online_count, stale: playerStats.stale_online_count || 0 }) : $t('servers.workspace.states.statusUnavailable')) }}</span>
                  </div>
                  <UiButton variant="ghost" size="xs" class="context-section-action" @click="openPlayers">
                    {{ $t('servers.workspace.actions.all') }}<ArrowRight data-icon="inline-end" />
                  </UiButton>
                </header>
                <div v-if="recentPlayers.length" class="player-list">
                  <UiButton
                    v-for="player in recentPlayers"
                    :key="`${player.room_id}:${player.user_id}`"
                    variant="ghost"
                    size="sm"
                    class="player-row"
                    @click="openPlayers"
                  >
                    <span class="player-avatar"><User /></span>
                    <span class="player-copy">
                      <strong :title="player.player_name || player.user_id">{{ player.player_name || player.user_id }}</strong>
                      <span>{{ characterLabel(player.prefab) }} · {{ player.world_name || $t('servers.workspace.players.unknownWorld') }}</span>
                    </span>
                    <Badge :variant="player.status === 'online' ? 'default' : 'outline'">
                      {{ playerStatusLabel(player.status) }}
                    </Badge>
                  </UiButton>
                </div>
                <Alert v-else-if="contextErrors.players" variant="destructive">
                  <CircleAlert />
                  <AlertTitle>{{ $t('servers.workspace.players.loadFailed') }}</AlertTitle>
                  <AlertDescription>{{ localizedError(contextErrors.players) }}</AlertDescription>
                </Alert>
                <Empty v-else class="rail-empty">
                  <EmptyHeader><EmptyTitle>{{ $t('servers.workspace.players.empty') }}</EmptyTitle><EmptyDescription>{{ $t('servers.workspace.players.emptyDescription') }}</EmptyDescription></EmptyHeader>
                </Empty>
              </section>

              <Separator class="context-separator context-separator-primary" />

              <section class="context-section context-section-backups" aria-labelledby="workspace-backups-title">
                <header class="context-section-header">
                  <div class="context-section-heading">
                    <h2 id="workspace-backups-title">{{ $t('servers.workspace.backups.latest') }}</h2>
                    <span>{{ contextErrors.backups ? $t('servers.workspace.states.listReadFailed') : $t('servers.workspace.backups.recordCount', { count: backups.length }) }}</span>
                  </div>
                  <UiButton variant="ghost" size="xs" class="context-section-action" @click="$router.push('/backups')">
                    {{ $t('servers.workspace.actions.all') }}<ArrowRight data-icon="inline-end" />
                  </UiButton>
                </header>
                <div v-if="backups.length" class="backup-list">
                  <div v-for="backup in visibleBackups" :key="backup.id || backup.name" class="backup-row">
                    <FileCheck2 />
                    <span>
                      <strong :title="backup.name">{{ backup.name }}</strong>
                      <small>{{ formatCompactTime(backup.createdAt || backup.create_time) }} · {{ backup.size_formatted || '--' }}</small>
                    </span>
                  </div>
                </div>
                <Alert v-else-if="contextErrors.backups" variant="destructive">
                  <CircleAlert />
                  <AlertTitle>{{ $t('servers.workspace.backups.loadFailed') }}</AlertTitle>
                  <AlertDescription>{{ localizedError(contextErrors.backups) }}</AlertDescription>
                </Alert>
                <Empty v-else class="rail-empty">
                  <EmptyHeader><EmptyTitle>{{ $t('servers.workspace.backups.empty') }}</EmptyTitle><EmptyDescription>{{ $t('servers.workspace.backups.emptyDescription') }}</EmptyDescription></EmptyHeader>
                </Empty>
              </section>

              <Separator class="context-separator context-separator-quick" />

              <section class="context-section context-section-quick" aria-labelledby="workspace-quick-nav-title">
                <header class="context-section-header context-section-header-plain">
                  <div class="context-section-heading"><h2 id="workspace-quick-nav-title">{{ $t('servers.workspace.quickNav.title') }}</h2></div>
                </header>
                <nav class="quick-nav" :aria-label="$t('servers.workspace.quickNav.label')">
                  <UiButton variant="ghost" size="sm" @click="openPlayers">
                    <User data-icon="inline-start" />
                    <span>{{ $t('servers.workspace.quickNav.players') }}</span>
                  </UiButton>
                  <UiButton variant="ghost" size="sm" @click="openMods">
                    <PackageOpen data-icon="inline-start" />
                    <span>{{ $t('servers.workspace.quickNav.mods') }}</span>
                  </UiButton>
                  <UiButton variant="ghost" size="sm" @click="openWorldState">
                    <ChartNoAxesCombined data-icon="inline-start" />
                    <span>{{ $t('servers.workspace.quickNav.worldState') }}</span>
                  </UiButton>
                  <UiButton variant="ghost" size="sm" @click="$router.push('/logs/query')">
                    <Search data-icon="inline-start" />
                    <span>{{ $t('servers.workspace.quickNav.logQuery') }}</span>
                  </UiButton>
                </nav>
              </section>
            </CardContent>
          </Card>
        </aside>
      </div>
      <RuntimeAuditPanel ref="runtimeAudit" :room-id="selectedRoomId" :worlds="worlds" />
    </template>
  </div>
</template>

<script>
import WorldLog from '@/components/WorldLog.vue'
import RuntimeAuditPanel from '@/components/runtime/RuntimeAuditPanel.vue'
import RuntimeExitBadge from '@/components/runtime/RuntimeExitBadge.vue'
import WorldDataFreshnessBadge from '@/components/runtime/WorldDataFreshnessBadge.vue'
import { backupApi, commandApi, playerApi, roomApi, systemApi } from '@/api'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea as UiTextarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { confirmAction, promptText } from '@/lib/feedback'
import {
  isCapacityRiskCanceled,
  restartWorldWithCapacityRisk,
  startRoomWithCapacityRisk,
} from '@/lib/startCapacityRisk'
import {
  canCleanFailedWorld,
  canConfigureWorld,
  canRequestStopWorld,
  canStartWorld,
  canStopWorld,
  worldActionRequiresConfirmation,
  worldPrimaryAction,
  worldStatusLabel,
  worldStatusMessage,
  worldStatusVariant
} from '@/lib/worldRuntimeStatus.mjs'
import { RUNTIME_TARGET_CHANGED_EVENT } from '@/utils/runtimeTarget'
import {
  ArrowRight, ChartNoAxesCombined, ChevronDown, CircleAlert, CircleCheck, DatabaseBackup, FileCheck2,
  FileText, Globe2, PackageOpen, Pickaxe, Play, RefreshCw, RotateCw, Search, Send, ServerOff,
  Settings, Square, Terminal, TreePine, User
} from '@lucide/vue'
import { toast } from 'vue-sonner'

const KNOWN_CHARACTERS = new Set([
  'wilson', 'willow', 'wolfgang', 'wendy', 'wx78', 'wickerbottom', 'woodie', 'wes',
  'waxwell', 'wathgrithr', 'webber', 'winona', 'wortox', 'wormwood', 'warly', 'wurt',
  'walter', 'wanda', 'wonkey'
])

const CONTEXT_PLAYER_LIMIT = 5
const CONTEXT_BACKUP_LIMIT = 3

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
    PackageOpen,
    Pickaxe,
    Play,
    RefreshCw,
    RotateCw,
    RuntimeAuditPanel,
    Search,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    Send,
    ServerOff,
    Settings,
    Spinner,
    Square,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Terminal,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TreePine,
    UiButton,
    UiSelect,
    UiTextarea,
    User,
    WorldLog,
    RuntimeExitBadge,
    WorldDataFreshnessBadge
  },
  data() {
    return {
      loading: false,
      contextLoading: false,
      loadError: null,
      rooms: [],
      selectedRoomId: this.$route.query.roomId || '',
      selectedWorldId: this.$route.query.worldId || '',
      systemStatus: {},
      playerStats: null,
      backups: [],
      consoleServers: [],
      contextErrors: {
        players: null,
        backups: null,
        console: null
      },
      worldActionId: '',
      backupCreating: false,
      activeOperation: 'logs',
      consoleServer: '',
      rawCommand: '',
      commandExecuting: false,
      commandResult: null,
      refreshTimer: null,
      refreshSequence: 0,
      contextSequence: 0,
      commonCommands: [
        { nameKey: 'servers.workspace.console.commonCommands.save', command: 'c_save()' },
        { nameKey: 'servers.workspace.console.commonCommands.players', command: 'c_listallplayers()' },
        { nameKey: 'servers.workspace.console.commonCommands.day', command: "print('当前天数: ' .. TheWorld.state.cycles + 1)" },
        { nameKey: 'servers.workspace.console.commonCommands.season', command: "print('当前季节: ' .. TheWorld.state.season)" },
        { nameKey: 'servers.workspace.console.commonCommands.announce', command: "c_announce('请输入公告内容')" }
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
      return this.playerStats?.recent_players?.slice(0, CONTEXT_PLAYER_LIMIT) || []
    },
    visibleBackups() {
      return this.backups.slice(0, CONTEXT_BACKUP_LIMIT)
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
  mounted() {
    window.addEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange)
  },
  beforeUnmount() {
    if (this.refreshTimer) window.clearInterval(this.refreshTimer)
    window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange)
  },
  methods: {
    handleRuntimeTargetChange() {
      this.contextSequence += 1
      this.selectedRoomId = ''
      this.selectedWorldId = ''
      this.rooms = []
      this.playerStats = null
      this.backups = []
      this.consoleServers = []
      this.consoleServer = ''
      this.commandResult = null
      this.loadError = null
      this.contextErrors = { players: null, backups: null, console: null }
      this.contextLoading = false
      this.refreshWorkspace()
    },
    unwrapList(response) {
      if (Array.isArray(response)) return response
      return Array.isArray(response?.data) ? response.data : []
    },
    async refreshWorkspace(silent = false) {
      const requestSequence = ++this.refreshSequence
      if (!silent) this.loading = true
      this.loadError = null
      const previousRoomId = this.selectedRoomId
      const [roomsResult, systemResult] = await Promise.allSettled([
        roomApi.getRoomList(),
        systemApi.getDashboardStatus()
      ])
      if (requestSequence !== this.refreshSequence) return

      if (roomsResult.status === 'rejected') {
        this.rooms = []
        this.loadError = this.errorState('servers.workspace.feedback.loadFailed', roomsResult.reason)
      } else {
        this.rooms = this.unwrapList(roomsResult.value)
        this.resolveSelection()
      }

      this.systemStatus = systemResult.status === 'fulfilled'
        ? (systemResult.value?.data || {})
        : {}

      if (this.selectedRoom) {
        if (silent && previousRoomId === this.selectedRoomId) {
          if (this.runningWorlds.length > 0) await this.refreshPlayerStats()
        } else {
          await this.refreshRoomContext()
        }
      }
      if (requestSequence === this.refreshSequence) this.loading = false
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
      const requestSequence = ++this.contextSequence
      const roomId = this.selectedRoomId
      const roomName = this.selectedRoom.name
      this.contextLoading = true
      this.playerStats = null
      this.backups = []
      this.consoleServers = []
      this.consoleServer = ''
      this.contextErrors = { players: null, backups: null, console: null }
      const [playersResult, backupsResult, consoleResult] = await Promise.allSettled([
        playerApi.getPlayerStats(roomName),
        backupApi.getBackupList(),
        commandApi.getServers()
      ])

      if (requestSequence !== this.contextSequence || this.selectedRoomId !== roomId) return
      this.playerStats = playersResult.status === 'fulfilled'
        ? playersResult.value?.data || null
        : null
      this.contextErrors.players = playersResult.status === 'rejected'
        ? this.errorState('servers.workspace.feedback.playersLoadFailed', playersResult.reason)
        : null
      this.backups = backupsResult.status === 'fulfilled'
        ? [...(backupsResult.value?.data?.[roomName] || [])].sort((left, right) => {
          const leftTime = new Date(left.createdAt || left.create_time || 0).getTime()
          const rightTime = new Date(right.createdAt || right.create_time || 0).getTime()
          return rightTime - leftTime
        })
        : []
      this.contextErrors.backups = backupsResult.status === 'rejected'
        ? this.errorState('servers.workspace.feedback.backupsLoadFailed', backupsResult.reason)
        : null
      this.consoleServers = consoleResult.status === 'fulfilled' ? consoleResult.value : []
      this.contextErrors.console = consoleResult.status === 'rejected'
        ? this.errorState('servers.workspace.feedback.consoleTargetsLoadFailed', consoleResult.reason)
        : null
      this.syncConsoleTarget()
      this.contextLoading = false
    },
    async refreshPlayerStats() {
      if (!this.selectedRoom) return
      const requestSequence = ++this.contextSequence
      const roomId = this.selectedRoomId
      this.contextErrors.players = null
      try {
        const response = await playerApi.getPlayerStats(this.selectedRoom.name)
        if (requestSequence === this.contextSequence && this.selectedRoomId === roomId) {
          this.playerStats = response?.data || null
        }
      } catch (error) {
        if (requestSequence === this.contextSequence && this.selectedRoomId === roomId) {
          this.playerStats = null
          this.contextErrors.players = this.errorState('servers.workspace.feedback.playersLoadFailed', error)
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
      if (!action ||
          (action === 'start' && !canStartWorld(world)) ||
          (action === 'cleanup' && !canCleanFailedWorld(world)) ||
          (action === 'stop' && !canRequestStopWorld(world)) ||
          (action === 'restart' && !canStopWorld(world))) {
        toast.warning(worldStatusMessage(world) || this.$t('servers.workspace.feedback.actionUnavailable'))
        return
      }
      const label = this.$t(`servers.workspace.actions.${action}`)
      const confirmationTitle = action === 'cleanup'
        ? this.$t('servers.workspace.worlds.cleanupFailedSession')
        : this.$t('servers.workspace.feedback.actionTitle', { action: label })
      if (worldActionRequiresConfirmation(action)) {
        try {
          await confirmAction(this.$t('servers.workspace.feedback.actionConfirm', {
            action: label,
            room: this.selectedRoom.name,
            world: world.name
          }), confirmationTitle, {
            confirmButtonText: action === 'cleanup'
              ? this.$t('servers.workspace.feedback.cleanupButton')
              : this.$t('servers.workspace.feedback.actionButton', { action: label }),
            cancelButtonText: this.$t('common.actions.cancel'),
            type: 'warning'
          })
        } catch {
          return
        }
      }

      this.worldActionId = world.id
      toast.info(this.$t('servers.workspace.feedback.actionSubmitted', {
        action: label,
        world: world.name
      }))
      try {
        const target = { room_id: this.selectedRoom.id, world_id: world.id }
        if (action === 'start') await startRoomWithCapacityRisk(target)
        if (action === 'stop') await roomApi.stopRoom(target)
        if (action === 'cleanup') await roomApi.cleanupRoom(target)
        if (action === 'restart') await restartWorldWithCapacityRisk({
          ...target,
          archive_name: this.selectedRoom.name,
          world_name: world.name
        })
        toast.success(this.$t('servers.workspace.feedback.actionCompleted', { action: label }))
        await this.refreshWorkspace(true)
      } catch (error) {
        if (isCapacityRiskCanceled(error)) return
        toast.error(this.$t('servers.workspace.feedback.actionFailed', {
          action: label,
          error: error.message || this.$t('common.errors.unknown')
        }))
      } finally {
        this.worldActionId = ''
        await this.$refs.runtimeAudit?.loadEvents()
      }
    },
    async createBackup() {
      if (!this.selectedRoom) return
      this.backupCreating = true
      try {
        await backupApi.createBackup(this.selectedRoom.name)
        toast.success(this.$t('servers.workspace.feedback.backupCreated'))
        await this.refreshRoomContext()
      } catch (error) {
        toast.error(this.$t('servers.workspace.feedback.backupCreateFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }))
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
          this.$t('servers.workspace.console.confirmDescription', { room: server.room_name }),
          this.$t('servers.workspace.console.confirmTitle'),
          {
            confirmButtonText: this.$t('servers.workspace.console.confirmExecute'),
            cancelButtonText: this.$t('common.actions.cancel'),
            inputValidator: value => value === server.room_name || this.$t('servers.workspace.console.roomMismatch')
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
          message: success ? '' : (run.errorMessage || run.message || '')
        }
        if (success) toast.success(this.$t('servers.workspace.console.sent'))
        else toast.error(this.commandResult.message || this.$t('servers.workspace.console.sendFailed'))
      } catch (error) {
        this.commandResult = { success: false, message: error.message || '' }
        toast.error(this.commandResult.message || this.$t('servers.workspace.console.sendFailed'))
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
      return ['cave', 'caves'].includes(world.type || world.role) ? Pickaxe : TreePine
    },
    worldTone(world) {
      return ['cave', 'caves'].includes(world.type || world.role) ? 'cave' : 'forest'
    },
    worldRoleLabel(world) {
      const rawRole = world.type || world.role
      const role = String(rawRole || '').trim().toLowerCase()
      if (['forest', 'master'].includes(role)) return this.$t('servers.workspace.worlds.roles.forest')
      if (['cave', 'caves'].includes(role)) return this.$t('servers.workspace.worlds.roles.cave')
      return rawRole || this.$t('servers.workspace.worlds.roles.custom')
    },
    worldStatusLabel(status) {
      return worldStatusLabel(status, key => this.$t(key))
    },
    worldStatusVariant(world) {
      return worldStatusVariant(world)
    },
    worldStatusMessage(world) {
      return worldStatusMessage(world)
    },
    worldPrimaryAction(world) {
      return worldPrimaryAction(world, key => this.$t(key))
    },
    canStopWorld(world) {
      return canStopWorld(world)
    },
    canCleanFailedWorld(world) {
      return canCleanFailedWorld(world)
    },
    canConfigureWorld(world) {
      return canConfigureWorld(world)
    },
    canToggleWorld(world) {
      return !this.worldPrimaryAction(world).disabled
    },
    worldActionLabel(world) {
      return this.$t('servers.workspace.worlds.actionLabel', {
        action: this.worldPrimaryAction(world).label
      })
    },
    seasonLabel(season) {
      const normalized = String(season || '').trim().toLowerCase()
      if (['autumn', 'winter', 'spring', 'summer'].includes(normalized)) {
        return this.$t(`servers.list.seasons.${normalized}`)
      }
      return season || '--'
    },
    characterLabel(prefab) {
      const normalized = String(prefab || '').trim().toLowerCase()
      if (KNOWN_CHARACTERS.has(normalized)) {
        return this.$t(`servers.workspace.players.characters.${normalized}`)
      }
      return prefab || this.$t('servers.workspace.players.unknownCharacter')
    },
    playerStatusLabel(status) {
      const normalized = String(status || '').trim().toLowerCase()
      if (normalized === 'stale') return this.$t('players.statuses.stale')
      if (['online', 'offline'].includes(normalized)) {
        return this.$t(`common.states.${normalized}`)
      }
      return status || this.$t('common.states.unknown')
    },
    errorState(key, error) {
      return { key, detail: String(error?.message || '').trim() }
    },
    localizedError(state) {
      if (!state) return ''
      const message = this.$t(state.key)
      return state.detail
        ? this.$t('servers.workspace.feedback.errorWithDetail', { message, detail: state.detail })
        : message
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
      const localeState = this.$i18n?.locale
      const locale = typeof localeState === 'string' ? localeState : (localeState?.value || 'zh-CN')
      const now = new Date()
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
      }
      return date.toLocaleDateString(locale, { month: '2-digit', day: '2-digit' })
    }
  }
}
</script>

<style scoped>
.workspace-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.workspace-overview,
.status-summary,
.status-metric,
.world-card-heading {
  display: flex;
  align-items: baseline;
}

.workspace-overview {
  gap: 10px;
  min-width: 0;
  margin-top: 3px;
  overflow: hidden;
}

.workspace-room-summary {
  flex: 0 0 auto;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 20px;
}

.overview-separator {
  height: 14px;
  align-self: center;
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

.status-summary {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  overflow-x: auto;
  scrollbar-width: none;
  white-space: nowrap;
}

.status-summary::-webkit-scrollbar {
  display: none;
}

.status-metric {
  flex: 0 0 auto;
  gap: 5px;
  padding: 0 10px;
}

.status-metric:first-child {
  padding-left: 0;
}

.status-label {
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 20px;
}

.status-value {
  color: var(--foreground);
  font-size: 13px;
  line-height: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.status-value span {
  margin-left: 2px;
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 400;
}

.status-separator {
  height: 12px;
  align-self: center;
}

.world-card-heading {
  gap: 8px;
  min-width: 0;
}

.world-card-heading > [data-slot='card-description'] {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.world-card-content {
  padding-top: 0;
  padding-bottom: 0;
}

.world-grid {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
}

.world-item {
  position: relative;
  display: grid;
  grid-template-columns: minmax(240px, 0.9fr) minmax(420px, 1.25fr) auto;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 8px 0;
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

.world-item:last-child {
  border-bottom: 0;
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
  justify-content: flex-start;
  gap: 8px;
}

.world-name-row strong {
  min-width: 0;
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

.world-identity > .world-failure {
  overflow: visible;
  color: var(--destructive);
  text-overflow: clip;
  white-space: normal;
  overflow-wrap: anywhere;
}

.world-facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(72px, 1fr));
  gap: 12px;
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
  gap: 16px;
  align-items: start;
}

.operation-content {
  padding-top: 12px;
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
  min-width: 0;
}

.context-card {
  min-width: 0;
}

.context-card-content {
  padding: 0;
}

.context-loading {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 14px;
  color: var(--muted-foreground);
  font-size: 11px;
  border-bottom: 1px solid var(--border);
}

.context-section {
  min-width: 0;
  padding: 10px 14px 9px;
}

.context-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
  margin-bottom: 3px;
}

.context-section-header-plain {
  min-height: 24px;
}

.context-section-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.context-section-heading h2 {
  margin: 0;
  color: var(--foreground);
  font-size: 13px;
  line-height: 20px;
  font-weight: 600;
  letter-spacing: 0;
}

.context-section-heading span {
  overflow: hidden;
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-section-action {
  margin-right: -6px;
}

.player-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  height: auto;
  width: 100%;
  min-height: 42px;
  padding: 5px 0;
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
  width: 28px;
  height: 28px;
  place-items: center;
  color: var(--foreground);
  background: var(--muted);
  border-radius: 4px;
}

.player-avatar svg {
  width: 14px;
  height: 14px;
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
  gap: 8px;
  min-height: 42px;
  padding: 5px 0;
  border-bottom: 1px solid var(--border);
}

.backup-row:last-child {
  border-bottom: 0;
}

.backup-row span {
  min-width: 0;
}

.backup-row > svg {
  width: 16px;
  height: 16px;
  color: var(--muted-foreground);
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
  gap: 2px;
  min-height: 58px;
  padding: 8px;
  color: var(--muted-foreground);
  text-align: center;
  background: transparent;
  border: 0;
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
  .world-item {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .world-facts {
    grid-column: 1 / -1;
    grid-row: 2;
    padding-left: 46px;
  }

  .world-actions {
    grid-column: 2;
    grid-row: 1;
  }

  .workspace-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .context-card-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
  }

  .context-loading {
    grid-column: 1 / -1;
  }

  .context-section-players {
    grid-column: 1;
  }

  .context-separator-primary {
    grid-column: 2;
    width: 1px;
    height: 100%;
  }

  .context-section-backups {
    grid-column: 3;
  }

  .context-separator-quick,
  .context-section-quick {
    grid-column: 1 / -1;
  }

  .quick-nav {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

}

@media (max-width: 768px) {
  .workspace-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .workspace-heading,
  .workspace-overview {
    width: 100%;
  }

  .workspace-toolbar {
    width: 100%;
    justify-content: flex-start;
  }

  .room-select {
    flex: 1 1 180px;
    width: auto;
  }

  .context-card-content {
    display: block;
  }

  .context-separator-primary {
    width: 100%;
    height: 1px;
  }

  .world-item {
    grid-template-columns: minmax(0, 1fr);
  }

  .world-facts {
    grid-column: auto;
    grid-row: auto;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 2px 0;
    padding-left: 46px;
  }

  .world-actions {
    grid-column: auto;
    grid-row: auto;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

}

@media (max-width: 520px) {
  .world-facts {
    padding-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .world-item,
  .player-copy strong {
    transition: none;
  }
}
</style>

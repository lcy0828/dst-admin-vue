<template>
  <div class="world-settings-page">
    <header class="page-header">
      <div>
        <h1>{{ $t('rooms.list.title') }}</h1>
      </div>
      <div class="header-actions">
        <InputGroup class="search-input">
          <InputGroupAddon><Search /></InputGroupAddon>
          <InputGroupInput v-model="searchQuery" :placeholder="$t('rooms.list.search')" />
        </InputGroup>
        <UiButton variant="outline" @click="refreshRooms(true)" :disabled="isRefreshing">
          <Spinner v-if="isRefreshing" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          {{ $t('common.actions.refresh') }}
        </UiButton>
        <UiButton variant="outline" @click="recoveryVisible = true"><ArchiveRestore data-icon="inline-start" />{{ $t('recovery.open') }}</UiButton>
        <UiButton @click="createRoom"><Plus data-icon="inline-start" />{{ $t('rooms.list.create') }}</UiButton>
      </div>
    </header>

    <Alert v-if="loadError && !loading" variant="destructive" class="settings-card">
      <CircleAlert />
      <AlertTitle>{{ $t('rooms.list.loadFailed') }}</AlertTitle>
      <AlertDescription class="error-description">
        <span>{{ loadError }}</span>
        <UiButton variant="outline" size="sm" @click="refreshRooms(true)">
          <RefreshCw data-icon="inline-start" />
          {{ $t('rooms.list.reload') }}
        </UiButton>
      </AlertDescription>
    </Alert>

    <div v-if="loading" class="room-skeleton settings-card" aria-busy="true" :aria-label="$t('rooms.list.loadingAria')">
      <Skeleton v-for="row in 6" :key="row" class="h-28 w-full" />
    </div>

    <Empty v-else-if="!loadError && filteredRooms.length === 0" class="settings-card">
      <EmptyHeader>
        <EmptyMedia variant="icon"><FolderPlus /></EmptyMedia>
        <EmptyTitle>{{ $t(searchQuery ? 'rooms.list.noMatch' : 'rooms.list.empty') }}</EmptyTitle>
        <EmptyDescription>{{ $t(searchQuery ? 'rooms.list.noMatchDescription' : 'rooms.list.emptyDescription') }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent v-if="!searchQuery">
        <UiButton @click="createRoom"><Plus data-icon="inline-start" />{{ $t('rooms.list.createNew') }}</UiButton>
      </EmptyContent>
    </Empty>

    <div v-else-if="!loadError" class="save-list">
      <Card v-for="room in filteredRooms" :key="room.roomId" class="save-item">
        <CardHeader class="room-header">
          <CardTitle class="room-title">
            <span class="truncate">{{ room.name }}</span>
            <Badge v-if="room.directoryName && room.directoryName !== room.name" variant="outline" class="room-directory">
              {{ $t('rooms.list.saveDirectory', { name: room.directoryName }) }}
            </Badge>
          </CardTitle>
          <CardDescription class="save-info">
            <span v-if="room.worlds"><LayoutGrid />{{ $t('rooms.list.worldCount', { count: room.worlds.length }) }}</span>
            <span v-if="room.targetIds.length > 1"><Server />{{ $t('rooms.list.crossMachineCount', { count: room.targetIds.length }) }}</span>
            <span v-if="room.updateTime"><Clock />{{ formatDate(room.updateTime) }}</span>
          </CardDescription>
          <CardAction><Badge :variant="roomStatusVariant(room)">{{ roomStatusLabel(room) }}</Badge></CardAction>
        </CardHeader>
        <CardContent class="save-item-content">
          <TooltipProvider>
            <div class="save-worlds" v-if="room.worlds && room.worlds.length" role="list">
              <template v-for="(world, index) in room.worlds" :key="world.id">
                <Separator v-if="index > 0" />
                <article class="world-row" role="listitem">
                  <div class="world-identity">
                    <div class="world-icon" aria-hidden="true">
                      <TreePine v-if="world.type === 'forest'" />
                      <Mountain v-else-if="world.type === 'cave'" />
                      <Globe2 v-else />
                    </div>
                    <div class="world-copy">
                      <strong class="truncate">{{ world.name }}</strong>
                      <span>{{ worldRoleLabel(world) }}</span>
                    </div>
                  </div>

                  <div class="world-machine">
                    <Server aria-hidden="true" />
                    <div>
                      <span class="truncate">{{ worldMachineLabel(world) }}</span>
                      <small>{{ $t('rooms.list.runningMachine') }}</small>
                    </div>
                  </div>

                  <div class="world-state">
                    <Badge :variant="worldStatusVariant(world)">{{ worldStatusLabel(world) }}</Badge>
                    <Tooltip v-if="worldRowMessage(world)">
                      <TooltipTrigger as-child>
                        <button type="button" class="world-message" :aria-label="worldRowMessage(world)">
                          <CircleAlert aria-hidden="true" />
                          <span class="truncate">{{ worldRowMessage(world) }}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent class="max-w-80">{{ worldRowMessage(world) }}</TooltipContent>
                    </Tooltip>
                  </div>

                  <div class="world-actions">
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <UiButton
                          :variant="getWorldPrimaryAction(world).variant"
                          size="icon-lg"
                          :disabled="getWorldPrimaryAction(world).disabled || isWorldBusy(room, world)"
                          :aria-label="getWorldPrimaryAction(world).label"
                          @click="toggleWorldStatus(room, world)"
                        >
                          <Spinner v-if="isWorldBusy(room, world) || ['starting', 'stopping'].includes(world.status)" />
                          <Square v-else-if="getWorldPrimaryAction(world).kind === 'stop'" />
                          <Play v-else />
                        </UiButton>
                      </TooltipTrigger>
                      <TooltipContent>{{ getWorldPrimaryAction(world).label }}</TooltipContent>
                    </Tooltip>

                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <UiButton variant="outline" size="icon-lg" :aria-label="$t('rooms.list.worldActions.open')">
                          <MoreHorizontal />
                        </UiButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem @select="viewWorld(room, world)">{{ $t('rooms.list.worldActions.view') }}</DropdownMenuItem>
                          <DropdownMenuItem @select="handleViewWorldLogs(room, world)">{{ $t('rooms.list.worldActions.logs') }}</DropdownMenuItem>
                          <DropdownMenuItem @select="manageWorldPlacement(room, world)"><Network />{{ $t('rooms.list.worldActions.placement') }}</DropdownMenuItem>
                          <DropdownMenuItem @select="editWorld(room, world)">{{ $t('rooms.list.worldActions.edit') }}</DropdownMenuItem>
                          <DropdownMenuItem :disabled="world.status !== 'running' || isWorldBusy(room, world)" @select="restartWorld(room, world)">{{ $t('rooms.list.worldActions.restart') }}</DropdownMenuItem>
                          <DropdownMenuItem v-if="world.status === 'failed'" :disabled="isWorldBusy(room, world)" @select="cleanupWorld(room, world)">{{ $t('rooms.list.worldActions.cleanup') }}</DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </article>
              </template>
            </div>
          </TooltipProvider>
        </CardContent>
        <CardFooter class="save-actions">
          <div class="batch-actions">
            <UiButton
              size="sm"
              :disabled="!canStartRoom(room) || isRoomBusy(room)"
              @click="startRoom(room)"
            ><Play data-icon="inline-start" />{{ $t('rooms.list.startAll') }}</UiButton>
            <UiButton
              variant="destructive"
              size="sm"
              :disabled="!canStopRoom(room) || isRoomBusy(room)"
              @click="stopRoom(room)"
            ><Square data-icon="inline-start" />{{ $t('rooms.list.stopAll') }}</UiButton>
          </div>
          <div class="room-actions">
            <UiButton variant="outline" size="sm" @click="managePlacement(room)"><Network data-icon="inline-start" />{{ $t('rooms.list.runtimeLocation') }}</UiButton>
            <UiButton variant="outline" size="sm" @click="editRoom(room)"><Pencil data-icon="inline-start" />{{ $t('rooms.list.edit') }}</UiButton>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <UiButton
                    variant="destructive"
                    size="icon-sm"
                    :disabled="roomHasActiveWorlds(room) || isRoomBusy(room)"
                    :aria-label="$t('rooms.list.delete')"
                    @click="deleteRoom(room)"
                  ><Trash2 data-icon="inline-start" /></UiButton>
                </TooltipTrigger>
                <TooltipContent>{{ $t('rooms.list.delete') }}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <UiButton variant="outline" size="icon-sm" :aria-label="$t('rooms.list.more')"><MoreHorizontal data-icon="inline-start" /></UiButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem :disabled="!room.controlAvailable" @select="handleSpecialLists(room)">{{ $t('rooms.list.specialLists') }}</DropdownMenuItem>
                  <DropdownMenuItem :disabled="!room.controlAvailable" @select="handleServerToken(room)">{{ $t('rooms.list.serverToken') }}</DropdownMenuItem>
                  <DropdownMenuItem @select="handleViewLogs(room)">{{ $t('rooms.list.viewLogs') }}</DropdownMenuItem>
                  <DropdownMenuItem :disabled="!room.controlAvailable" @select="backupRoom(room)">{{ $t('rooms.list.backup') }}</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardFooter>
      </Card>
    </div>

    <UiDialog v-model:open="specialListsVisible">
      <DialogScrollContent class="max-w-5xl">
        <DialogHeader><DialogTitle>{{ $t('rooms.list.dialogs.specialListsTitle') }}</DialogTitle><DialogDescription>{{ $t('rooms.list.dialogs.specialListsDescription') }}</DialogDescription></DialogHeader>
        <SpecialLists v-if="specialListsVisible" :savename="selectedSavename" :room-name="selectedRoomName" @close="specialListsVisible = false" />
      </DialogScrollContent>
    </UiDialog>

    <UiDialog v-model:open="serverTokenVisible">
      <DialogContent class="max-w-3xl">
        <DialogHeader><DialogTitle>{{ $t('rooms.list.dialogs.tokenTitle') }}</DialogTitle><DialogDescription>{{ $t('rooms.list.dialogs.tokenDescription') }}</DialogDescription></DialogHeader>
        <ServerToken v-if="serverTokenVisible" :savename="selectedSavename" @close="serverTokenVisible = false" />
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="logViewerVisible">
      <DialogScrollContent class="max-w-5xl">
        <DialogHeader><DialogTitle>{{ $t('rooms.list.dialogs.logsTitle') }}</DialogTitle><DialogDescription>{{ $t('rooms.list.dialogs.logsDescription', { room: selectedRoomName }) }}</DialogDescription></DialogHeader>
        <LogViewer v-if="logViewerVisible" :archiveName="selectedSavename" :title="$t('rooms.list.dialogs.logsPanelTitle', { room: selectedRoomName })" :subtitle="selectedWorldDisplay" :worlds="selectedRoomWorlds" :defaultWorld="selectedRoomWorldName" @close="logViewerVisible = false" />
      </DialogScrollContent>
    </UiDialog>

    <RecoveryDialog v-model:open="recoveryVisible" scope="room" @restored="refreshRooms(true)" />
  </div>
</template>

<script>
import {
  ArchiveRestore,
  CircleAlert,
  Clock,
  FolderPlus,
  Globe2,
  LayoutGrid,
  Mountain,
  MoreHorizontal,
  Network,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  Square,
  Trash2,
  TreePine
} from '@lucide/vue';
import { toast } from 'vue-sonner';
import { roomApi } from '../../api/index';
import { backupSetsV2API } from '@/api/v2';
import { waitForV2Job } from '@/api/v2ConfigurationAdapters';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { confirmAction } from '@/lib/feedback';
import { confirmRoomMaintenance } from '@/lib/maintenanceConfirmation';
import { formatSystemDateTime } from '@/lib/dateTime.mjs';
import { getManagementScope, MANAGEMENT_SCOPE_CHANGED_EVENT, managementScopeTargetId } from '@/lib/managementScope.mjs';
import {
  projectRoomList,
  roomRuntimeSummary,
  worldMachineName,
  worldPlacementNotice
} from '@/lib/roomListPresentation.mjs';
import { isCapacityRiskCanceled, restartWorldWithCapacityRisk, startRoomWithCapacityRisk } from '@/lib/startCapacityRisk';
import {
  worldActionRequiresConfirmation,
  worldLifecycleScope,
  worldLifecycleSelection,
  worldPrimaryAction,
  worldStatusLabel as runtimeWorldStatusLabel,
  worldStatusMessage,
  worldStatusVariant as runtimeWorldStatusVariant
} from '@/lib/worldRuntimeStatus.mjs';
import SpecialLists from './SpecialLists.vue';
import ServerToken from './ServerToken.vue';
import LogViewer from '../servers/LogViewer.vue';
import RecoveryDialog from '@/components/recovery/RecoveryDialog.vue';

export default {
  name: 'RoomList',
  components: {
    Alert,
    AlertDescription,
    AlertTitle,
    ArchiveRestore,
    Badge,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    CircleAlert,
    Clock,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogScrollContent,
    DialogTitle,
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
    FolderPlus,
    Globe2,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    LayoutGrid,
    Mountain,
    MoreHorizontal,
    Network,
    SpecialLists,
    ServerToken,
    LogViewer,
    Pencil,
    Play,
    Plus,
    RefreshCw,
    RecoveryDialog,
    Search,
    Separator,
    Server,
    Skeleton,
    Spinner,
    Square,
    Trash2,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
    TreePine,
    UiButton,
    UiDialog
  },
  data() {
    return {
      loading: false,
      loadError: '',
      searchQuery: '',
      rooms: [],
      specialListsVisible: false,
      serverTokenVisible: false,
      logViewerVisible: false,
      selectedSavename: '',
      selectedRoomName: '',
      selectedRoomWorlds: [],
      selectedRoomWorldName: '',
      selectedWorldDisplay: '',
      isRefreshing: false,
      lastRefreshTime: 0,
      recoveryVisible: false,
      managementScope: getManagementScope(),
      roomActions: {},
      worldActions: {},
      roomRequestSequence: 0
    }
  },
  computed: {
    filteredRooms() {
      let result = this.rooms;

      // 按搜索查询筛选
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(room =>
          room.name.toLowerCase().includes(query)
        );
      }

      return result;
    }
  },
  created() {
    this.refreshRooms();
  },
  mounted() {
    window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, this.handleManagementScopeChange);
  },
  beforeUnmount() {
    window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, this.handleManagementScopeChange);
  },
  methods: {
    formatDate(timestamp) {
      return formatSystemDateTime(timestamp, {
        locale: this.$i18n.locale,
        fallback: '',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: '2-digit', second: '2-digit'
      });
    },
    handleManagementScopeChange(event) {
      this.managementScope = event?.detail || getManagementScope();
      this.rooms = [];
      this.loadError = '';
      void this.refreshRooms(true, false);
    },
    refreshRooms(force = false, notify = force) {
      force = force === true;
      const now = Date.now();
      if (this.isRefreshing || (!force && now - this.lastRefreshTime < 2000)) {
        return Promise.resolve();
      }

      const sequence = ++this.roomRequestSequence;
      this.isRefreshing = true;
      this.lastRefreshTime = now;
      this.loading = true;
      this.loadError = '';

      return roomApi.getScopedRuntimeOverview(managementScopeTargetId(this.managementScope))
        .then(response => {
          if (sequence !== this.roomRequestSequence) return;
          if (response?.status !== 200 || !Array.isArray(response.data?.rooms)) {
            throw new Error(this.$t('rooms.list.feedback.listFailed'));
          }
          this.rooms = projectRoomList(response.data, managementScopeTargetId(this.managementScope));
          if (notify) toast.success(this.$t('rooms.list.feedback.refreshed'));
        })
        .catch(error => {
          if (sequence !== this.roomRequestSequence) return;
          console.error('Failed to load room data:', error);
          this.loadError = error.message || this.$t('rooms.list.feedback.serviceUnavailable');
          toast.error(this.$t('rooms.list.feedback.dataFailed', { error: this.loadError }));
        })
        .finally(() => {
          if (sequence !== this.roomRequestSequence) return;
          this.loading = false;
          this.isRefreshing = false;
        });
    },
    createRoom() {
      this.$router.push('/rooms/settings');
    },
    roomStatusLabel(room) {
      const summary = roomRuntimeSummary(room);
      return this.$t(`rooms.list.roomStates.${summary.state}`, summary);
    },
    roomStatusVariant(room) {
      return {
        running: 'success',
        partial: 'warning',
        stopped: 'outline',
        transitioning: 'warning',
        attention: 'destructive',
        unavailable: 'destructive'
      }[roomRuntimeSummary(room).state];
    },
    worldRoleLabel(world) {
      const role = ['master', 'caves'].includes(world.role) ? world.role : 'custom';
      return this.$t(`rooms.list.worldRoles.${role}`);
    },
    worldMachineLabel(world) {
      return worldMachineName(
        world,
        this.$t('rooms.list.localMachine'),
        this.$t('rooms.list.unknownMachine')
      );
    },
    worldStatusLabel(world) {
      return runtimeWorldStatusLabel(world, this.$t);
    },
    worldStatusVariant(world) {
      return runtimeWorldStatusVariant(world);
    },
    worldRowMessage(world) {
      const runtimeMessage = worldStatusMessage(world);
      if (runtimeMessage) return runtimeMessage;
      const notice = worldPlacementNotice(world);
      if (notice.pending) {
        return notice.desiredTargetName
          ? this.$t('rooms.list.placement.pendingTarget', { target: notice.desiredTargetName })
          : this.$t('rooms.list.placement.pending');
      }
      const knownStates = ['target_offline', 'inventory_stale', 'inventory_missing', 'shard_missing', 'conflict'];
      return knownStates.includes(notice.state)
        ? this.$t(`rooms.list.placement.states.${notice.state}`)
        : '';
    },
    getWorldPrimaryAction(world) {
      return worldPrimaryAction(world, this.$t);
    },
    worldActionKey(room, world) {
      return `${room.roomId}:${world.id}`;
    },
    isWorldBusy(room, world) {
      return Boolean(this.worldActions[this.worldActionKey(room, world)]);
    },
    isRoomBusy(room) {
      return Boolean(this.roomActions[room.roomId]);
    },
    setWorldBusy(room, worlds, action) {
      const next = { ...this.worldActions };
      for (const world of worlds) next[this.worldActionKey(room, world)] = action;
      this.worldActions = next;
    },
    clearWorldBusy(room, worlds) {
      const next = { ...this.worldActions };
      for (const world of worlds) delete next[this.worldActionKey(room, world)];
      this.worldActions = next;
    },
    canStartRoom(room) {
      return room.worlds.some(world => world.controlAvailable !== false && ['stopped', 'failed'].includes(world.status));
    },
    canStopRoom(room) {
      return room.worlds.some(world => world.controlAvailable !== false && ['starting', 'running'].includes(world.status));
    },
    roomHasActiveWorlds(room) {
      return room.allWorlds.some(world => ['starting', 'running', 'stopping'].includes(world.status));
    },
    editRoom(room) {
      this.$router.push({
        path: '/rooms/settings',
        query: { id: room.roomId || room.id }
      });
    },
    managePlacement(room) {
      this.$router.push({
        path: '/rooms/settings',
        query: { id: room.roomId || room.id, deployment: 'edit' }
      });
    },
    manageWorldPlacement(room, world) {
      this.$router.push({
        path: '/rooms/settings',
        query: { id: room.roomId || room.id, deployment: 'edit', worldId: world.id }
      });
    },
    async startRoom(room) {
      const selected = room.worlds.filter(world => world.controlAvailable !== false && ['stopped', 'failed'].includes(world.status));
      const scope = worldLifecycleSelection(room.allWorlds, selected, 'start');
      if (!scope.allowed) {
        toast.warning(this.dependencyFailureMessage(scope));
        return;
      }
      this.roomActions = { ...this.roomActions, [room.roomId]: 'start' };
      this.setWorldBusy(room, scope.worlds, 'start');
      try {
        this.notifyAddedDependencies(scope);
        await startRoomWithCapacityRisk({
          room_id: room.roomId,
          world_ids: scope.worlds.map(world => world.id),
          exact_world_ids: true
        });
        await this.refreshRooms(true, false);
        toast.success(this.$t('rooms.list.feedback.started', { room: room.name }));
      } catch (error) {
        if (!isCapacityRiskCanceled(error)) {
          toast.error(this.$t('rooms.list.feedback.startFailed', { error: error.message || this.$t('common.errors.unknown') }));
        }
      } finally {
        const next = { ...this.roomActions };
        delete next[room.roomId];
        this.roomActions = next;
        this.clearWorldBusy(room, scope.worlds);
      }
    },
    dependencyFailureMessage(scope) {
      return this.$t(`rooms.list.feedback.${scope?.reason === 'master-unavailable'
        ? 'dependencyMasterUnavailable'
        : 'dependencyMasterUnknown'}`);
    },
    notifyAddedDependencies(scope) {
      if (!scope.addedWorlds?.length) return;
      toast.info(this.$t('rooms.list.feedback.dependenciesIncluded', {
        worlds: scope.addedWorlds.map(world => world.name).join('、')
      }));
    },
    async confirmWorldAction(scope, actionKind, actionLabel, world, roomId) {
      if (!worldActionRequiresConfirmation(actionKind)) return {};
      const names = scope.worlds.map(item => item.name).join('、');
      try {
        return await confirmRoomMaintenance(
          roomId,
          scope.worlds.length > 1
            ? this.$t('rooms.list.feedback.worldActionDependencyConfirm', { action: actionLabel, count: scope.worlds.length, worlds: names })
            : this.$t('rooms.list.feedback.worldActionConfirm', { action: actionLabel, world: world.name }),
          this.$t('rooms.list.feedback.worldActionTitle', { action: actionLabel }),
          {
            confirmButtonText: this.$t('common.actions.confirm'),
            cancelButtonText: this.$t('common.actions.cancel'),
            type: 'warning'
          }
        );
      } catch {
        return null;
      }
    },
    async toggleWorldStatus(room, world) {
      const primary = this.getWorldPrimaryAction(world);
      if (!primary.kind || primary.disabled || this.isWorldBusy(room, world)) return;
      const sourceWorld = room.allWorlds.find(item => item.id === world.id) || world;
      const scope = worldLifecycleScope(room.allWorlds, sourceWorld, primary.kind);
      if (!scope.allowed) {
        toast.warning(this.dependencyFailureMessage(scope));
        return;
      }
      const maintenance = await this.confirmWorldAction(scope, primary.kind, primary.label, world, room.roomId);
      if (!maintenance) return;

      this.setWorldBusy(room, scope.worlds, primary.kind);
      try {
        if (primary.kind === 'start') {
          this.notifyAddedDependencies(scope);
          await startRoomWithCapacityRisk({
            room_id: room.roomId,
            world_ids: scope.worlds.map(item => item.id),
            exact_world_ids: true
          });
        } else {
          await roomApi.stopRoom({
            ...maintenance,
            room_id: room.roomId,
            world_ids: scope.worlds.map(item => item.id),
            exact_world_ids: true
          });
        }
        await this.refreshRooms(true, false);
        toast.success(this.$t('rooms.list.feedback.worldActionCompleted', { action: primary.label, world: world.name }));
      } catch (error) {
        if (!isCapacityRiskCanceled(error)) {
          toast.error(this.$t('rooms.list.feedback.worldActionFailed', {
            action: primary.label,
            error: error.message || this.$t('common.errors.unknown')
          }));
        }
      } finally {
        this.clearWorldBusy(room, scope.worlds);
      }
    },
    async restartWorld(room, world) {
      const sourceWorld = room.allWorlds.find(item => item.id === world.id) || world;
      const scope = worldLifecycleScope(room.allWorlds, sourceWorld, 'restart');
      if (!scope.allowed) {
        toast.warning(this.dependencyFailureMessage(scope));
        return;
      }
      const action = this.$t('rooms.list.worldActions.restart');
      const maintenance = await this.confirmWorldAction(scope, 'restart', action, world, room.roomId);
      if (!maintenance) return;

      this.setWorldBusy(room, scope.worlds, 'restart');
      try {
        await restartWorldWithCapacityRisk({
          ...maintenance,
          room_id: room.roomId,
          world_ids: scope.worlds.map(item => item.id),
          exact_world_ids: true
        });
        await this.refreshRooms(true, false);
        toast.success(this.$t('rooms.list.feedback.worldActionCompleted', { action, world: world.name }));
      } catch (error) {
        if (!isCapacityRiskCanceled(error)) {
          toast.error(this.$t('rooms.list.feedback.worldActionFailed', {
            action,
            error: error.message || this.$t('common.errors.unknown')
          }));
        }
      } finally {
        this.clearWorldBusy(room, scope.worlds);
      }
    },
    async cleanupWorld(room, world) {
      try {
        await confirmAction(
          this.$t('rooms.list.feedback.cleanupConfirm', { world: world.name }),
          this.$t('rooms.list.feedback.cleanupTitle'),
          { confirmButtonText: this.$t('rooms.list.worldActions.cleanup'), type: 'warning' }
        );
      } catch {
        return;
      }
      this.setWorldBusy(room, [world], 'cleanup');
      try {
        await roomApi.cleanupRoom({ room_id: room.roomId, world_id: world.id, exact_world_ids: true });
        await this.refreshRooms(true, false);
        toast.success(this.$t('rooms.list.feedback.cleanupCompleted', { world: world.name }));
      } catch (error) {
        toast.error(this.$t('rooms.list.feedback.cleanupFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      } finally {
        this.clearWorldBusy(room, [world]);
      }
    },
    viewWorld(room, world) {
      this.$router.push({
        path: '/worlds/details',
        query: { id: world.id, roomId: room.roomId, worldId: world.id }
      });
    },
    editWorld(room, world) {
      this.$router.push({
        path: '/worlds/settings',
        query: { id: world.id, roomId: room.roomId, worldId: world.id }
      });
    },
    handleViewWorldLogs(room, world) {
      this.selectedSavename = room.id;
      this.selectedRoomName = room.name;
      this.selectedRoomWorlds = room.worlds || [];
      this.selectedRoomWorldName = world.name;
      this.selectedWorldDisplay = `${world.name} (${this.$t(`rooms.start.types.${['forest', 'cave'].includes(world.type) ? world.type : 'unknown'}`)})`;
      this.logViewerVisible = true;
    },
    handleSpecialLists(room) {
      this.selectedSavename = room.id;
      this.selectedRoomName = room.name;
      this.specialListsVisible = true;
    },
    handleServerToken(room) {
      this.selectedSavename = room.id;
      this.serverTokenVisible = true;
    },
    handleViewLogs(room) {
      this.selectedSavename = room.id;
      this.selectedRoomName = room.name;
      this.selectedRoomWorlds = room.worlds || [];
      this.selectedRoomWorldName = room.worlds && room.worlds.length > 0 ? room.worlds[0].name : '';
      this.selectedWorldDisplay = room.worlds && room.worlds.length > 0
        ? `${room.worlds[0].name} (${this.$t(`rooms.start.types.${['forest', 'cave'].includes(room.worlds[0].type) ? room.worlds[0].type : 'unknown'}`)})`
        : '';
      this.logViewerVisible = true;
    },
    backupRoom(room) {
      confirmAction(this.$t('rooms.list.feedback.backupConfirm', { room: room.name }), this.$t('rooms.list.feedback.backupTitle'), {
        confirmButtonText: this.$t('common.actions.confirm'),
        cancelButtonText: this.$t('common.actions.cancel'),
        type: 'info'
      }).then(() => {
        waitForV2Job(
          backupSetsV2API.create(room.roomId || room.id),
          10 * 60 * 1000
        )
          .then(() => {
            toast.success(this.$t('rooms.list.feedback.backupCreated', { room: room.name }));
          })
          .catch(error => {
            toast.error(this.$t('rooms.list.feedback.backupFailed', { error: error.message || this.$t('common.errors.unknown') }));
          });
      }).catch(() => {
        toast.info(this.$t('rooms.list.feedback.canceled'));
      });
    },
    async deleteRoom(room) {
      if (this.roomHasActiveWorlds(room)) {
        toast.warning(this.$t('rooms.list.feedback.stopBeforeDelete'));
        return;
      }

      let confirmation;
      try {
        await confirmAction(
          this.$t('rooms.list.feedback.deletePrompt', { room: room.name }),
          this.$t('rooms.list.feedback.deleteTitle'),
          {
            confirmButtonText: this.$t('rooms.list.feedback.moveToRecovery'),
            cancelButtonText: this.$t('common.actions.cancel'),
            type: 'warning'
          }
        );
        confirmation = room.name;
      } catch {
        return;
      }

      this.loading = true;
      try {
        const response = await roomApi.deleteRoom({
          room_id: room.roomId || room.id,
          confirmation
        });
        await this.refreshRooms(true);
        const recoveryName = response?.data?.recoveryName || '';
        const message = this.$t('rooms.list.feedback.movedToRecovery', { room: room.name });
        toast.success(recoveryName ? `${message} · ${this.$t('recovery.deleteLocation', { path: recoveryName })}` : message);
      } catch (error) {
        toast.error(this.$t('rooms.list.feedback.deleteFailed', { error: error.message || this.$t('common.errors.unknown') }));
      } finally {
        this.loading = false;
      }
    },
    async stopRoom(room) {
      let maintenance = {};
      const selected = room.worlds.filter(world => world.controlAvailable !== false && ['starting', 'running'].includes(world.status));
      const scope = worldLifecycleSelection(room.allWorlds, selected, 'stop');
      if (!scope.allowed) {
        toast.warning(this.dependencyFailureMessage(scope));
        return;
      }
      const names = scope.worlds.map(world => world.name).join('、');
      try {
        maintenance = await confirmRoomMaintenance(
          room.roomId,
          this.$t('rooms.list.feedback.stopConfirm', { room: room.name, worlds: names }),
          this.$t('rooms.list.feedback.stopTitle'),
          {
            confirmButtonText: this.$t('common.actions.confirm'),
            cancelButtonText: this.$t('common.actions.cancel'),
            type: 'warning'
          }
        );
      } catch {
        return;
      }

      this.roomActions = { ...this.roomActions, [room.roomId]: 'stop' };
      this.setWorldBusy(room, scope.worlds, 'stop');
      try {
        await roomApi.stopRoom({
          ...maintenance,
          room_id: room.roomId,
          world_ids: scope.worlds.map(world => world.id),
          exact_world_ids: true
        });
        await this.refreshRooms(true, false);
        toast.success(this.$t('rooms.list.feedback.stopped', { room: room.name }));
      } catch (error) {
        toast.error(this.$t('rooms.list.feedback.stopFailed', { error: error.message || this.$t('common.errors.unknown') }));
      } finally {
        const next = { ...this.roomActions };
        delete next[room.roomId];
        this.roomActions = next;
        this.clearWorldBusy(room, scope.worlds);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.world-settings-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  min-height: 100%;
  min-width: 0;
}

.page-header,
.header-actions,
.save-info,
.save-actions {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  gap: 12px;

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }

  p {
    margin: 4px 0 0;
    color: var(--muted-foreground);
    font-size: 14px;
  }
}

.header-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.search-input {
  width: min(250px, 100%);
}

.settings-card {
  margin: 0;
}

.error-description {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.room-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 560px), 1fr));
  gap: 16px;
}

.save-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 560px), 1fr));
  gap: 16px;
}

.save-item {
  height: fit-content;
  min-width: 0;
}

.room-header {
  min-width: 0;
}

.room-title {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.room-directory {
  max-width: 100%;
  color: var(--muted-foreground);
  font-weight: 400;
}

.save-info {
  flex-wrap: wrap;
  gap: 12px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  svg {
    width: 14px;
    height: 14px;
  }
}

.save-item-content {
  flex: 1;
  min-width: 0;
  padding-top: 4px;
}

.save-worlds {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.save-worlds > [data-slot='separator'] {
  margin: 4px 0;
}

.world-row {
  display: grid;
  grid-template-columns: minmax(7rem, 1fr) minmax(7rem, 0.8fr) minmax(6.5rem, auto) 88px;
  min-width: 0;
  min-height: 64px;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.world-identity,
.world-machine,
.world-actions {
  display: flex;
  min-width: 0;
  align-items: center;
}

.world-identity {
  gap: 10px;
}

.world-icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--primary) 22%, var(--border));
  border-radius: 8px;
  background: color-mix(in srgb, var(--primary) 7%, var(--background));
  color: var(--primary);

  svg {
    width: 18px;
    height: 18px;
  }
}

.world-copy,
.world-machine > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.world-copy {
  gap: 2px;

  strong {
    line-height: 20px;
  }

  span {
    color: var(--muted-foreground);
    font-size: 12px;
    line-height: 16px;
  }
}

.world-machine {
  gap: 8px;

  > svg {
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    color: var(--muted-foreground);
  }

  span {
    line-height: 20px;
  }

  small {
    color: var(--muted-foreground);
    font-size: 11px;
    line-height: 14px;
  }
}

.world-state {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  flex-direction: column;
  gap: 4px;
}

.world-message {
  display: flex;
  max-width: 100%;
  min-width: 0;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--destructive);
  cursor: help;
  font: inherit;
  font-size: 11px;
  line-height: 16px;
  text-align: left;

  svg {
    width: 13px;
    height: 13px;
    flex: 0 0 13px;
  }
}

.world-actions {
  width: 88px;
  justify-content: flex-end;
  gap: 8px;
}

.save-actions,
.batch-actions,
.room-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.save-actions {
  min-height: 60px;
  justify-content: space-between;
  flex-wrap: wrap;
}

.batch-actions,
.room-actions {
  min-height: 32px;
}

@media (max-width: 640px) {
  .error-description {
    align-items: flex-start;
    flex-direction: column;
  }
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions {
    justify-content: stretch;
  }

  .search-input {
    width: 100%;
  }

  .header-actions > * {
    flex: 1;
  }

  .save-list,
  .room-skeleton {
    grid-template-columns: minmax(0, 1fr);
  }

  .world-row {
    grid-template-areas:
      'identity actions'
      'machine actions'
      'state actions';
    grid-template-columns: minmax(0, 1fr) 88px;
    gap: 6px 12px;
    padding: 12px 0;
  }

  .world-identity {
    grid-area: identity;
  }

  .world-machine {
    grid-area: machine;
    padding-left: 46px;
  }

  .world-state {
    grid-area: state;
    padding-left: 46px;
  }

  .world-actions {
    grid-area: actions;
    align-self: center;
  }

  .save-actions {
    align-items: stretch;
  }

  .batch-actions {
    flex: 1 1 auto;
  }

  .room-actions {
    margin-left: auto;
  }
}
</style>

<template>
  <div class="world-list-page">
    <header class="page-header">
      <div>
        <h1>{{ $t('worlds.list.title') }}</h1>
        <p>{{ $t('worlds.list.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <InputGroup class="search-input">
          <InputGroupAddon><Search /></InputGroupAddon>
          <InputGroupInput v-model="searchQuery" :placeholder="$t('worlds.list.search')" />
        </InputGroup>
        <UiButton variant="outline" @click="recoveryVisible = true"><ArchiveRestore data-icon="inline-start" />{{ $t('recovery.open') }}</UiButton>
        <UiButton @click="createWorld"><Plus data-icon="inline-start" />{{ $t('worlds.list.create') }}</UiButton>
      </div>
    </header>

    <Alert v-if="loadError" variant="destructive" class="load-error">
      <CircleAlert />
      <AlertTitle>{{ $t('worlds.list.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="refreshWorlds(true)">{{ $t('common.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <div class="world-layout">
      <aside class="sidebar-container">
        <room-categories :rooms="rooms" @category-change="handleCategoryChange" @refresh="refreshWorlds" />
      </aside>

      <Card class="world-list-card">
        <CardHeader>
          <CardTitle>{{ getCategoryTitle() }}</CardTitle>
          <CardDescription>{{ $t('worlds.list.description') }}</CardDescription>
          <CardAction class="list-actions max-sm:col-span-full max-sm:row-auto max-sm:justify-self-stretch">
            <UiSelect v-model="selectedRoom" @update:model-value="handleRoomChange">
              <SelectTrigger class="room-select"><SelectValue :placeholder="$t('worlds.list.selectRoom')" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="room in rooms" :key="room.id" :value="room.id">
                    {{ room.name }} · {{ $t('worlds.list.worldCount', { count: room.worlds ? room.worlds.length : 0 }) }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </UiSelect>
            <UiButton variant="outline" size="sm" :disabled="isRefreshing" @click="refreshWorlds">
              <Spinner v-if="isRefreshing" data-icon="inline-start" />
              <RefreshCw v-else data-icon="inline-start" />
              {{ $t('common.actions.refresh') }}
            </UiButton>
          </CardAction>
        </CardHeader>

        <CardContent>
          <Alert v-if="selectedRoom && !loading" class="filter-info">
            <Info />
            <AlertTitle>{{ $t('worlds.list.filterTitle') }}</AlertTitle>
            <AlertDescription>{{ $t('worlds.list.filterDescription', { room: getSelectedRoomName() }) }}</AlertDescription>
            <AlertAction><UiButton variant="ghost" size="sm" @click="selectedRoom = null">{{ $t('worlds.list.viewAll') }}</UiButton></AlertAction>
          </Alert>

          <div v-if="loading" class="world-skeleton" aria-busy="true" :aria-label="$t('worlds.list.loadingAria')">
            <Skeleton v-for="row in 6" :key="row" class="h-12 w-full" />
          </div>

          <div v-else-if="filteredWorlds.length > 0" class="table-wrap">
            <UiTable>
              <TableHeader>
                <TableRow>
                  <TableHead>{{ $t('worlds.list.columns.name') }}</TableHead>
                  <TableHead>{{ $t('worlds.list.columns.room') }}</TableHead>
                  <TableHead>{{ $t('worlds.list.columns.type') }}</TableHead>
                  <TableHead>{{ $t('worlds.list.columns.season') }}</TableHead>
                  <TableHead>{{ $t('worlds.list.columns.day') }}</TableHead>
                  <TableHead>{{ $t('common.fields.status') }}</TableHead>
                  <TableHead class="action-column">{{ $t('common.fields.actions') }}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="world in filteredWorlds" :key="`${world.roomId}-${world.id}`" class="world-row" @click="handleRowClick(world)">
                  <TableCell>{{ world.name }}</TableCell>
                  <TableCell>{{ world.roomName }}</TableCell>
                  <TableCell><Badge :variant="getWorldTypeTag(world.type)">{{ getWorldTypeName(world.type) }}</Badge></TableCell>
                  <TableCell>{{ world.season ?? '--' }}</TableCell>
                  <TableCell>{{ world.day ?? '--' }}</TableCell>
                  <TableCell>
                    <Badge :variant="getWorldStatusTag(world)">{{ getWorldStatusName(world) }}</Badge>
                    <p v-if="getWorldStatusMessage(world)" class="status-failure">{{ getWorldStatusMessage(world) }}</p>
                  </TableCell>
                  <TableCell class="action-column" @click.stop>
                    <div class="row-actions">
                      <UiButton
                        :variant="getWorldPrimaryAction(world).variant"
                        size="sm"
                        :disabled="getWorldPrimaryAction(world).disabled || loading"
                        @click="toggleWorldStatus(world)"
                      >
                        <Spinner v-if="loading" data-icon="inline-start" />
                        <Square v-else-if="getWorldPrimaryAction(world).kind === 'stop'" data-icon="inline-start" />
                        <Play v-else-if="getWorldPrimaryAction(world).kind === 'start'" data-icon="inline-start" />
                        {{ getWorldPrimaryAction(world).label }}
                      </UiButton>
                      <UiButton v-if="world.status === 'failed'" variant="outline" size="sm" :disabled="!canCleanFailedWorld(world) || loading" @click="cleanupFailedWorld(world)"><Square data-icon="inline-start" />{{ $t('worlds.actions.cleanupSession') }}</UiButton>
                      <UiButton variant="outline" size="sm" :disabled="!canConfigureWorld(world)" :title="!canConfigureWorld(world) ? $t('worlds.list.configureDisabled') : ''" @click="editWorld(world)">{{ $t('worlds.actions.edit') }}</UiButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger as-child><UiButton variant="ghost" size="icon-sm" :aria-label="$t('worlds.actions.openMenu')" :title="$t('worlds.actions.menuTitle')"><MoreHorizontal /></UiButton></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            <DropdownMenuItem @select="viewWorldState(world)">{{ $t('worlds.actions.viewState') }}</DropdownMenuItem>
                            <DropdownMenuItem @select="regenerateWorld(world)">{{ $t('worlds.actions.regenerate') }}</DropdownMenuItem>
                            <DropdownMenuItem @select="backupWorld(world)">{{ $t('worlds.actions.backup') }}</DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem variant="destructive" :disabled="!canDeleteWorld(world)" @select="deleteWorld(world)">{{ $t('worlds.actions.delete') }}</DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </UiTable>
          </div>

          <Empty v-else>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Globe2 /></EmptyMedia>
              <EmptyTitle>{{ $t('worlds.list.empty') }}</EmptyTitle>
              <EmptyDescription>{{ $t('worlds.list.emptyDescription') }}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </div>

    <UiDialog v-model:open="roomSelectDialogVisible" @update:open="handleRoomDialogOpenChange">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ $t('worlds.list.selectDialogTitle') }}</DialogTitle>
          <DialogDescription>{{ $t('worlds.list.selectDialogDescription') }}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel for="room-dialog-search">{{ $t('worlds.list.searchRooms') }}</FieldLabel>
            <InputGroup>
              <InputGroupAddon><Search /></InputGroupAddon>
              <InputGroupInput id="room-dialog-search" v-model="roomSearchQuery" :placeholder="$t('worlds.list.searchRooms')" />
            </InputGroup>
          </Field>
          <FieldSet>
            <FieldLegend variant="label">{{ $t('worlds.list.targetRoom') }}</FieldLegend>
            <RadioGroup v-model="tempSelectedRoom" class="room-radio-group">
              <Field v-for="room in filteredDialogRooms" :key="room.id" orientation="horizontal" class="room-radio-item">
                <RadioGroupItem :id="`target-room-${room.id}`" :value="room.id" />
                <FieldContent>
                  <FieldLabel :for="`target-room-${room.id}`">{{ room.name }}</FieldLabel>
                  <FieldDescription>{{ $t('worlds.list.worldCount', { count: room.worlds ? room.worlds.length : 0 }) }}</FieldDescription>
                </FieldContent>
                <Badge v-if="room.status === 'running'">{{ $t('worldRuntime.statuses.running') }}</Badge>
              </Field>
            </RadioGroup>
            <Empty v-if="filteredDialogRooms.length === 0">
              <EmptyHeader><EmptyTitle>{{ $t('worlds.list.noMatchingRooms') }}</EmptyTitle></EmptyHeader>
            </Empty>
          </FieldSet>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" @click="closeRoomDialog">{{ $t('common.actions.cancel') }}</UiButton>
          <UiButton @click="confirmRoomSelect" :disabled="!tempSelectedRoom">{{ $t('common.actions.confirm') }}</UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>

    <RecoveryDialog v-model:open="recoveryVisible" scope="world" :rooms="rooms" :initial-room-id="selectedRoom || ''" @restored="refreshWorlds(true)" />
  </div>
</template>

<script>
import { ArchiveRestore, CircleAlert, Globe2, Info, MoreHorizontal, Play, Plus, RefreshCw, Search, Square } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { roomApi, systemApi } from '../../api/index';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { confirmAction, promptText } from '@/lib/feedback';
import {
  canCleanFailedWorld as canCleanFailedRuntimeWorld,
  canConfigureWorld as canConfigureRuntimeWorld,
  canDeleteWorld as canDeleteRuntimeWorld,
  canStopWorld,
  worldPrimaryAction,
  worldStatusLabel,
  worldStatusMessage,
  worldStatusVariant
} from '@/lib/worldRuntimeStatus.mjs';
import RoomCategories from '../../components/worlds/RoomCategories.vue';
import RecoveryDialog from '@/components/recovery/RecoveryDialog.vue';

export default {
  name: 'WorldList',
  components: {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    ArchiveRestore,
    Badge,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CircleAlert,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Empty,
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
    Globe2,
    Info,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    MoreHorizontal,
    Play,
    Plus,
    RadioGroup,
    RadioGroupItem,
    RefreshCw,
    RecoveryDialog,
    RoomCategories,
    Search,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Spinner,
    Square,
    Skeleton,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    UiButton,
    UiDialog,
    UiSelect,
    UiTable
  },
  data() {
    return {
      loading: false,
      loadError: '',
      searchQuery: '',
      currentCategory: 'all',
      rooms: [], // 房间列表
      worlds: [],
      isRefreshing: false,
      lastRefreshTime: 0,
      selectedRoom: null,
      roomSelectDialogVisible: false,
      roomSearchQuery: '',
      tempSelectedRoom: null,
      recoveryVisible: false
    }
  },
  computed: {
    filteredWorlds() {
      let result = this.worlds;

      // 按分类筛选
      if (this.currentCategory !== 'all') {
        if (this.currentCategory === 'active') {
          result = result.filter(world => world.status === 'running');
        } else if (this.currentCategory === 'inactive') {
          result = result.filter(world => world.status !== 'running');
        } else if (this.currentCategory === 'forest') {
          result = result.filter(world => world.type === 'master' || world.type === 'forest');
        } else if (this.currentCategory === 'cave') {
          result = result.filter(world => world.type === 'cave');
        } else if (this.currentCategory === 'both') {
          const mixedRooms = new Set(this.rooms
            .filter(room => room.worlds.some(world => world.type === 'forest') &&
              room.worlds.some(world => world.type === 'cave'))
            .map(room => room.id));
          result = result.filter(world => mixedRooms.has(world.roomId));
        } else if (this.currentCategory.startsWith('custom_')) {
          result = [];
        }
      }

      // 按搜索查询筛选
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(world =>
          String(world.name || '').toLowerCase().includes(query) ||
          String(world.description || '').toLowerCase().includes(query) ||
          (world.roomName && world.roomName.toLowerCase().includes(query))
        );
      }

      // 按房间筛选
      if (this.selectedRoom) {
        result = result.filter(world => world.roomId === this.selectedRoom);
      }

      return result;
    },
    filteredDialogRooms() {
      if (!this.roomSearchQuery) {
        return this.rooms;
      }

      const query = this.roomSearchQuery.toLowerCase();
      return this.rooms.filter(room =>
        room.name.toLowerCase().includes(query)
      );
    }
  },
  methods: {
    getCategoryTitle() {
      const category = ['all', 'active', 'inactive', 'forest', 'cave', 'both'].includes(this.currentCategory)
        ? this.currentCategory
        : (this.currentCategory.startsWith('custom_') ? 'custom' : 'all');
      let title = this.$t(`worlds.categories.worldTitles.${category}`);

      // 添加房间信息
      if (this.selectedRoom) {
        title += ` - ${this.getSelectedRoomName()}`;
      }

      return title;
    },
    getWorldTypeName(type) {
      if (type === 'forest' || type === 'master') return this.$t('worlds.types.master');
      if (type === 'cave') return this.$t('worlds.types.cave');
      return this.$t('worlds.types.other');
    },
    getWorldTypeTag(type) {
      if (type === 'cave') return 'secondary';
      return 'outline';
    },
    getWorldStatusName(status) {
      return worldStatusLabel(status, this.$t);
    },
    getWorldStatusTag(status) {
      return worldStatusVariant(status);
    },
    getWorldStatusMessage(world) {
      return worldStatusMessage(world);
    },
    getWorldPrimaryAction(world) {
      return worldPrimaryAction(world, this.$t);
    },
    canCleanFailedWorld(world) {
      return canCleanFailedRuntimeWorld(world);
    },
    canConfigureWorld(world) {
      return canConfigureRuntimeWorld(world);
    },
    canDeleteWorld(world) {
      return canDeleteRuntimeWorld(world);
    },
    handleCategoryChange(category) {
      this.currentCategory = category;
      this.refreshWorlds();
    },
    getServerStatus() {
      return systemApi.getTmuxServers()
        .then(response => {
          if (response?.status === 200 && Array.isArray(response.data)) {
            const servers = response.data;

            this.worlds.forEach(world => {
              const runningServer = servers.find(server =>
                server.archive_name === world.roomName &&
                server.world_name === world.name
              );

              world.status = runningServer?.status || world.status || 'unknown';
              world.controlAvailable = runningServer?.control_available ?? world.controlAvailable;
              world.statusMessage = runningServer?.status_message || world.statusMessage || '';
            });

            this.rooms.forEach(room => {
              const runningServer = servers.find(server =>
                server.archive_name === room.name &&
                server.status === "running"
              );
              if (runningServer) {
                room.status = 'running';
              } else if (servers.some(server => server.archive_name === room.name && server.status === 'unknown')) {
                room.status = 'unknown';
              } else {
                room.status = 'stopped';
              }
            });
          }
        })
        .catch(error => {
          console.error('Failed to load server status:', error);
        });
    },
    refreshWorlds(force = false) {
      // 如果正在刷新或者距离上次刷新不足2秒，则不进行刷新
      const now = Date.now();
      if (this.isRefreshing || (!force && now - this.lastRefreshTime < 2000)) {
        return Promise.resolve();
      }

      this.isRefreshing = true;
      this.lastRefreshTime = now;
      this.loading = true;
      this.loadError = '';

      // 加载房间列表
      return roomApi.getRoomList()
        .then(response => {
          if (response && (Array.isArray(response) || response.data)) {
            const roomsData = Array.isArray(response) ? response :
                         (Array.isArray(response.data) ? response.data :
                         (response.data && Array.isArray(response.data.data) ? response.data.data : []));

            this.rooms = roomsData.map(room => ({
              id: room.id || room.name,
              name: room.name,
              status: room.isRunning ? 'running' : 'unknown',
              worlds: room.worlds || []
            }));

            // 直接从房间数据中提取世界信息
            let allWorlds = [];
            this.rooms.forEach(room => {
              if (room.worlds && Array.isArray(room.worlds)) {
                const worldsData = room.worlds.map(world => ({
                  ...world,
                  id: world.id,
                  name: world.name || world.worldName,
                  roomId: room.id,
                  roomName: room.name,
                  type: world.type || 'unknown',
                  season: world.season ?? null,
                  day: world.day ?? null,
                  status: world.status || 'unknown',
                  description: world.description || '',
                  controlAvailable: world.controlAvailable,
                  statusMessage: world.statusMessage || ''
                }));
                allWorlds = [...allWorlds, ...worldsData];
              }
            });

            this.worlds = allWorlds;

            // 获取运行状态
            return this.getServerStatus();
          } else {
            const message = this.$t('worlds.list.feedback.invalidResponse');
            toast.warning(message);
            return Promise.reject(new Error(message));
          }
        })
        .then(() => {
          if (this.worlds.length > 0) {
            toast.success(this.$t('worlds.list.feedback.refreshed'));
          } else {
            toast.warning(this.$t('worlds.list.feedback.noWorlds'));
          }
        })
        .catch(error => {
          console.error('Failed to load worlds:', error);
          this.loadError = error.message || this.$t('worlds.list.feedback.readFailed');
          toast.error(this.$t('worlds.list.feedback.loadFailed', {
            error: error.message || this.$t('common.errors.unknown')
          }));
        })
        .finally(() => {
          this.loading = false;
          this.isRefreshing = false;
        });
    },
    createWorld() {
      if (this.selectedRoom) {
        // 已选择房间，直接跳转
        const room = this.rooms.find(r => r.id === this.selectedRoom);
        if (room) {
          this.$router.push({
            path: '/worlds/settings',
            query: { roomId: room.id, roomName: room.name }
          });
        } else {
          toast.error(this.$t('worlds.list.feedback.roomInfoFailed'));
        }
      } else {
        // 未选择房间，显示选择对话框
        this.roomSelectDialogVisible = true;
      }
    },
    editWorld(world) {
      this.$router.push({
        path: '/worlds/settings',
        query: { id: world.id, roomId: world.roomId, worldId: world.id }
      });
    },
    toggleWorldStatus(world) {
      const primaryAction = worldPrimaryAction(world, this.$t);
      if (primaryAction.disabled || !primaryAction.kind) {
        toast.warning(worldStatusMessage(world) || this.$t('worlds.feedback.actionUnavailable'));
        return;
      }
      const action = primaryAction.label;
      confirmAction(this.$t('worlds.feedback.actionConfirm', { action, world: world.name }), this.$t('worlds.feedback.actionTitle', { action }), {
        confirmButtonText: this.$t('common.actions.confirm'),
        cancelButtonText: this.$t('common.actions.cancel'),
        type: 'warning'
      }).then(() => {
        this.loading = true;
        const request = {
          room_id: world.roomId,
          world_id: world.id
        };
        const operation = primaryAction.kind === 'stop'
          ? roomApi.stopRoom(request)
          : roomApi.startRoom(request);
        operation
          .then(async () => {
            await this.refreshWorlds(true);
            toast.success(this.$t('worlds.feedback.actionCompleted', { action }));
          })
          .catch(error => {
            toast.error(this.$t('worlds.feedback.actionFailed', {
              action,
              error: error.message || this.$t('common.errors.unknown')
            }));
          })
          .finally(() => {
            this.loading = false;
          });
      }).catch(() => {
        toast.info(this.$t('worlds.feedback.canceled'));
      });
    },
    async cleanupFailedWorld(world) {
      if (!canCleanFailedRuntimeWorld(world)) {
        toast.warning(worldStatusMessage(world) || this.$t('worlds.feedback.cleanupUnavailable'));
        return;
      }
      try {
        await confirmAction(this.$t('worlds.feedback.cleanupConfirm', { world: world.name }), this.$t('worlds.feedback.cleanupTitle'), {
          confirmButtonText: this.$t('worlds.feedback.cleanupButton'),
          type: 'warning'
        });
      } catch {
        return;
      }

      this.loading = true;
      try {
        await roomApi.cleanupRoom({ room_id: world.roomId, world_id: world.id });
        await this.refreshWorlds(true);
        toast.success(this.$t('worlds.feedback.cleanupSucceeded'));
      } catch (error) {
        toast.error(this.$t('worlds.feedback.cleanupFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      } finally {
        this.loading = false;
      }
    },
    handleRowClick(row) {
      // 点击行跳转到详情页
      this.$router.push({
        path: '/worlds/details',
        query: { id: row.id, roomId: row.roomId, worldId: row.id }
      });
    },
    handleMoreCommands(command, world) {
      switch (command) {
        case 'viewState':
          this.viewWorldState(world);
          break;
        case 'regenerate':
          this.regenerateWorld(world);
          break;
        case 'backup':
          this.backupWorld(world);
          break;
        case 'delete':
          this.deleteWorld(world);
          break;
      }
    },
    viewWorldState(world) {
      this.$router.push({
        path: '/worlds/state',
        query: { archive: world.roomName, world: world.name }
      });
    },
    async regenerateWorld(world) {
      if (!canStopWorld(world) && world.status === 'running') {
        toast.error(this.$t('worlds.feedback.unmanagedRegenerate'));
        return;
      }
      if (!canStopWorld(world)) {
        toast.warning(this.$t('worlds.feedback.regenerateNeedsRunning'));
        return;
      }
      let confirmation;
      try {
        const result = await promptText(
          this.$t('worlds.feedback.regeneratePrompt', { world: world.name, room: world.roomName }),
          this.$t('worlds.feedback.regenerateTitle'),
          {
            confirmButtonText: this.$t('worlds.feedback.regenerateButton'),
            cancelButtonText: this.$t('common.actions.cancel'),
            inputValidator: value => value === world.roomName || this.$t('worlds.feedback.roomNameMismatch')
          }
        );
        confirmation = result.value;
      } catch {
        return;
      }

      this.loading = true;
      try {
        await roomApi.regenerateWorld({
          room_id: world.roomId,
          world_id: world.id,
          confirmation
        });
        await this.refreshWorlds(true);
        toast.success(this.$t('worlds.feedback.regenerated'));
      } catch (error) {
        toast.error(this.$t('worlds.feedback.regenerateFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      } finally {
        this.loading = false;
      }
    },
    backupWorld(world) {
      confirmAction(this.$t('worlds.feedback.backupConfirm', { world: world.name, room: world.roomName }), this.$t('worlds.feedback.backupTitle'), {
        confirmButtonText: this.$t('common.actions.confirm'),
        cancelButtonText: this.$t('common.actions.cancel'),
        type: 'info'
      }).then(() => {
        this.loading = true;
        roomApi.backupRoom(world.roomId, `world ${world.name}`)
          .then(() => toast.success(this.$t('worlds.feedback.backupCreated')))
          .catch(error => toast.error(this.$t('worlds.feedback.backupFailed', {
            error: error.message || this.$t('common.errors.unknown')
          })))
          .finally(() => { this.loading = false; });
      }).catch(() => {
        toast.info(this.$t('worlds.feedback.canceled'));
      });
    },
    async deleteWorld(world) {
      if (!canDeleteRuntimeWorld(world)) {
        toast.warning(this.$t(world.status === 'failed' ? 'worlds.feedback.deleteNeedsCleanup' : 'worlds.feedback.deleteNeedsStop'));
        return;
      }
      let confirmation;
      try {
        const result = await promptText(
          this.$t('worlds.feedback.deletePrompt', { world: world.name, room: world.roomName }),
          this.$t('worlds.feedback.deleteTitle'),
          {
            confirmButtonText: this.$t('worlds.feedback.moveToRecovery'),
            cancelButtonText: this.$t('common.actions.cancel'),
            inputValidator: value => value === world.roomName || this.$t('worlds.feedback.roomNameMismatch')
          }
        );
        confirmation = result.value;
      } catch {
        return;
      }

      this.loading = true;
      try {
        const response = await roomApi.deleteWorld({
          room_id: world.roomId,
          world_id: world.id,
          confirmation
        });
        await this.refreshWorlds(true);
        const recoveryName = response?.data?.recoveryName || '';
        const message = this.$t('worlds.feedback.deleteSucceeded');
        toast.success(recoveryName ? `${message} · ${this.$t('recovery.deleteLocation', { path: recoveryName })}` : message);
      } catch (error) {
        toast.error(this.$t('worlds.feedback.deleteFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      } finally {
        this.loading = false;
      }
    },
    handleRoomChange(value) {
      this.selectedRoom = value;
    },
    getSelectedRoomName() {
      const room = this.rooms.find(r => r.id === this.selectedRoom);
      return room ? room.name : this.$t('worlds.list.allRooms');
    },
    confirmRoomSelect() {
      if (!this.tempSelectedRoom) {
        toast.warning(this.$t('worlds.list.feedback.selectRoom'));
        return;
      }

      // 获取选择的房间信息
      const room = this.rooms.find(r => r.id === this.tempSelectedRoom);
      if (!room) {
        toast.error(this.$t('worlds.list.feedback.roomInfoFailed'));
        return;
      }

      // 关闭对话框
      this.roomSelectDialogVisible = false;

      // 重置临时选择
      this.tempSelectedRoom = null;
      this.roomSearchQuery = '';

      // 跳转到创建世界页面
      this.$router.push({
        path: '/worlds/settings',
        query: { roomId: room.id, roomName: room.name }
      });
    },
    closeRoomDialog() {
      this.roomSelectDialogVisible = false;
      this.tempSelectedRoom = null;
      this.roomSearchQuery = '';
    },
    handleRoomDialogOpenChange(open) {
      if (!open) this.closeRoomDialog();
    }
  },
  mounted() {
    // 在页面加载时只调用一次刷新方法
    this.refreshWorlds();
  }
}
</script>

<style scoped lang="scss">
.world-list-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  min-width: 0;
}

.page-header,
.header-actions,
.list-actions,
.row-actions,
.world-skeleton {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  gap: 12px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.header-actions,
.list-actions,
.row-actions {
  gap: 8px;
}

.search-input {
  width: min(250px, 100%);
}

.world-layout {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  gap: 24px;
}

.sidebar-container,
.world-list-card {
  min-width: 0;
}

.room-select {
  width: 210px;
}

.filter-info {
  margin-bottom: 12px;
}

.world-skeleton {
  flex-direction: column;
  gap: 8px;
}

.load-error {
  margin: 0;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.world-row {
  cursor: pointer;
}

.status-failure {
  max-width: 320px;
  margin: 4px 0 0;
  color: var(--destructive);
  font-size: 12px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.action-column {
  min-width: 230px;
  text-align: right;
}

.row-actions {
  justify-content: flex-end;
}

.room-radio-group {
  max-height: 320px;
  overflow-y: auto;
}

.room-radio-item {
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

@media (max-width: 900px) {
  .world-layout {
    grid-template-columns: 1fr;
  }

  .sidebar-container {
    max-height: 260px;
    overflow-y: auto;
  }
}

@media (max-width: 640px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions,
  .list-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .search-input,
  .room-select {
    width: 100%;
  }
}
</style>

<template>
  <div class="world-settings-page">
    <header class="page-header">
      <div>
        <h1>{{ $t('rooms.list.title') }}</h1>
        <p>{{ $t('rooms.list.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <InputGroup class="search-input">
          <InputGroupAddon><Search /></InputGroupAddon>
          <InputGroupInput v-model="searchQuery" :placeholder="$t('rooms.list.search')" />
        </InputGroup>
        <UiButton variant="outline" @click="refreshRooms" :disabled="isRefreshing">
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
      <Card v-for="room in filteredRooms" :key="room.id" class="save-item">
        <CardHeader>
          <CardTitle>{{ room.name }}</CardTitle>
          <CardDescription class="save-info">
            <span v-if="room.updateTime"><Clock />{{ formatDate(room.updateTime) }}</span>
            <span v-if="room.worlds"><LayoutGrid />{{ $t('rooms.list.worldCount', { count: room.worlds.length }) }}</span>
          </CardDescription>
          <CardAction v-if="room.isRunning"><Badge>{{ $t('rooms.list.running') }}</Badge></CardAction>
        </CardHeader>
        <CardContent class="save-item-content">
              <div class="save-worlds" v-if="room.worlds && room.worlds.length">
                <div class="world-category forest" v-if="getWorldsByType(room.worlds, 'forest').length > 0">
                  <span class="world-category-title">{{ $t('rooms.list.forest') }}</span>
                  <div class="world-tags">
                    <Badge v-for="world in getWorldsByType(room.worlds, 'forest')" :key="world.name" variant="outline">{{ world.name }}</Badge>
                  </div>
                </div>
                <div class="world-category cave" v-if="getWorldsByType(room.worlds, 'cave').length > 0">
                  <span class="world-category-title">{{ $t('rooms.list.cave') }}</span>
                  <div class="world-tags">
                    <Badge v-for="world in getWorldsByType(room.worlds, 'cave')" :key="world.name" variant="secondary">{{ world.name }}</Badge>
                  </div>
                </div>
                <div class="world-category unknown" v-if="getWorldsByType(room.worlds, 'unknown').length > 0">
                  <span class="world-category-title">{{ $t('rooms.list.other') }}</span>
                  <div class="world-tags">
                    <Badge v-for="world in getWorldsByType(room.worlds, 'unknown')" :key="world.name" variant="outline">{{ world.name }}</Badge>
                  </div>
                </div>
              </div>
        </CardContent>
        <CardFooter class="save-actions">
                <UiButton
                  v-if="!room.isRunning"
                  size="sm"
                  @click="startRoom(room)"><Play data-icon="inline-start" />{{ $t('rooms.list.start') }}</UiButton>
                <UiButton
                  v-else
                  variant="destructive"
                  size="sm"
                  @click="stopRoom(room)"><Square data-icon="inline-start" />{{ $t('rooms.list.stop') }}</UiButton>
                <UiButton variant="outline" size="sm" @click="editRoom(room)"><Pencil data-icon="inline-start" />{{ $t('rooms.list.edit') }}</UiButton>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <UiButton variant="outline" size="sm">{{ $t('rooms.list.more') }}<ChevronDown data-icon="inline-end" /></UiButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem @select="handleSpecialLists(room)">{{ $t('rooms.list.specialLists') }}</DropdownMenuItem>
                <DropdownMenuItem @select="handleServerToken(room)">{{ $t('rooms.list.serverToken') }}</DropdownMenuItem>
                <DropdownMenuItem @select="handleViewLogs(room)">{{ $t('rooms.list.viewLogs') }}</DropdownMenuItem>
                <DropdownMenuItem @select="backupRoom(room)">{{ $t('rooms.list.backup') }}</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" @select="deleteRoom(room)">{{ $t('rooms.list.delete') }}</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
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

    <UiDialog v-model:open="startDialogVisible">
      <DialogScrollContent class="max-w-3xl">
        <DialogHeader><DialogTitle>{{ $t('rooms.list.dialogs.startTitle') }}</DialogTitle><DialogDescription>{{ $t('rooms.list.dialogs.startDescription') }}</DialogDescription></DialogHeader>
        <StartRoomForm v-if="startDialogVisible" :room="selectedRoom" :startForm="startForm" :loading="startLoading" @confirm="confirmStartRoom" @close="closeStartDialog" />
      </DialogScrollContent>
    </UiDialog>

    <RecoveryDialog v-model:open="recoveryVisible" scope="room" @restored="refreshRooms(true)" />
  </div>
</template>

<script>
import {
  ArchiveRestore,
  ChevronDown,
  CircleAlert,
  Clock,
  FolderPlus,
  LayoutGrid,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Square
} from '@lucide/vue';
import { toast } from 'vue-sonner';
import { roomApi, systemApi } from '../../api/index';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { confirmAction, promptText } from '@/lib/feedback';
import { formatSystemDateTime } from '@/lib/dateTime.mjs';
import { isCapacityRiskCanceled, startRoomWithCapacityRisk } from '@/lib/startCapacityRisk';
import SpecialLists from './SpecialLists.vue';
import ServerToken from './ServerToken.vue';
import LogViewer from '../servers/LogViewer.vue';
import StartRoomForm from './StartRoomForm.vue';
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
    ChevronDown,
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    FolderPlus,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    LayoutGrid,
    SpecialLists,
    ServerToken,
    LogViewer,
    StartRoomForm,
    Pencil,
    Play,
    Plus,
    RefreshCw,
    RecoveryDialog,
    Search,
    Skeleton,
    Spinner,
    Square,
    UiButton,
    UiDialog
  },
  data() {
    return {
      loading: false,
      loadError: '',
      searchQuery: '',
      rooms: [],
      serverList: [],
      specialListsVisible: false,
      serverTokenVisible: false,
      logViewerVisible: false,
      selectedSavename: '',
      selectedRoomName: '',
      selectedRoomWorlds: [],
      selectedRoomWorldName: '',
      selectedWorldDisplay: '',
      startDialogVisible: false,
      selectedRoom: null,
      startForm: {
        worldType: 'all',
        serverMode: '64'
      },
      startLoading: false,
      isRefreshing: false,
      lastRefreshTime: 0,
      recoveryVisible: false
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
    // 在created阶段加载数据
    this.refreshRooms();
  },
  mounted() {
    // 在mounted阶段只检查滚动，不再重复加载数据
    this.$nextTick(() => {
      this.checkScrollable();
    });
    // 窗口大小变化时重新检查滚动
    window.addEventListener('resize', this.checkScrollable);
  },
  beforeUnmount() {
    // 移除事件监听器
    window.removeEventListener('resize', this.checkScrollable);
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
    refreshRooms(force = false) {
      // 如果正在刷新或者距离上次刷新不足2秒，则不进行刷新
      const now = Date.now();
      if (this.isRefreshing || (!force && now - this.lastRefreshTime < 2000)) {
        return Promise.resolve();
      }

      this.isRefreshing = true;
      this.lastRefreshTime = now;
      this.loading = true;
      this.loadError = '';

      // 同时读取 v2 房间目录和真实运行状态。
      return Promise.all([
        roomApi.getRoomList(),
        systemApi.getTmuxServers()
      ])
        .then(([roomsResponse, serversResponse]) => {
          if (roomsResponse?.status === 200 && Array.isArray(roomsResponse.data)) {
            this.rooms = roomsResponse.data.map(item => ({
              id: item.name,
              roomId: item.id,
              name: item.name,
              savepath: item.savepath || '',
              worlds: (item.worlds || []).map(world => ({
                id: world.id,
                name: world.name,
                type: world.type
              })),
              updateTime: item.updateTime,
              isRunning: item.isRunning === true
            }));

            if (serversResponse?.status === 200) {
              this.serverList = serversResponse.data || [];

              this.rooms.forEach(room => {
                const runningServer = this.serverList.find(server =>
                  server.archive_name === room.name && server.status === 'running'
                );
                room.isRunning = !!runningServer;
              });
            }

            toast.success(this.$t('rooms.list.feedback.refreshed'));
            console.log('Refreshed rooms and server status at', formatSystemDateTime(new Date(), {
              locale: this.$i18n.locale,
              hour: '2-digit', minute: '2-digit', second: '2-digit'
            }));
          } else {
            throw new Error(this.$t('rooms.list.feedback.listFailed'));
          }
        })
        .catch(error => {
          console.error('Failed to load room data:', error);
          this.loadError = error.message || this.$t('rooms.list.feedback.serviceUnavailable');
          toast.error(this.$t('rooms.list.feedback.dataFailed', { error: this.loadError }));
        })
        .finally(() => {
          this.loading = false;
          this.isRefreshing = false;
          this.$nextTick(() => this.checkScrollable());
        });
    },
    createRoom() {
      this.$router.push('/rooms/settings');
    },
    editRoom(room) {
      this.$router.push({
        path: '/rooms/settings',
        query: { id: room.id }
      });
    },
    startRoom(room) {
      this.selectedRoom = room;
      this.startDialogVisible = true;
    },
    confirmStartRoom() {
      if (!this.selectedRoom) return;
      this.startLoading = true;
      const roomId = this.selectedRoom.roomId || this.selectedRoom.id;
      roomApi.getRoomWorlds(roomId)
        .then(worlds => {
          const selectedWorlds = this.startForm.worldType === 'all'
            ? worlds
            : worlds.filter(world => world.type === this.startForm.worldType);
          if (selectedWorlds.length === 0) {
            throw new Error(this.$t('rooms.list.feedback.noMatchingWorld'));
          }
          return startRoomWithCapacityRisk({
            room_id: roomId,
            world_ids: selectedWorlds.map(world => world.id)
          });
        })
        .then(async () => {
          this.startDialogVisible = false;
          await this.refreshRooms(true);
          toast.success(this.$t('rooms.list.feedback.started', { room: this.selectedRoom.name }));
        })
        .catch(error => {
          if (isCapacityRiskCanceled(error)) return;
          toast.error(this.$t('rooms.list.feedback.startFailed', { error: error.message || this.$t('common.errors.unknown') }));
        })
        .finally(() => {
          this.startLoading = false;
        });
    },
    closeStartDialog() {
      this.startDialogVisible = false;
    },
    handleDropdownCommand(command, room) {
      switch(command) {
        case 'special-lists':
          this.handleSpecialLists(room);
          break;
        case 'token':
          this.handleServerToken(room);
          break;
        case 'logs':
          this.handleViewLogs(room);
          break;
        case 'backup':
          this.backupRoom(room);
          break;
        case 'delete':
          this.deleteRoom(room);
          break;
      }
    },
    handleSpecialLists(room) {
      this.selectedSavename = room.id;
      this.specialListsVisible = true;
    },
    closeSpecialListsDialog() {
      this.specialListsVisible = false;
    },
    handleServerToken(room) {
      this.selectedSavename = room.id;
      this.serverTokenVisible = true;
    },
    closeServerTokenDialog() {
      this.serverTokenVisible = false;
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
    closeLogViewerDialog() {
      this.logViewerVisible = false;
    },
    backupRoom(room) {
      confirmAction(this.$t('rooms.list.feedback.backupConfirm', { room: room.name }), this.$t('rooms.list.feedback.backupTitle'), {
        confirmButtonText: this.$t('common.actions.confirm'),
        cancelButtonText: this.$t('common.actions.cancel'),
        type: 'info'
      }).then(() => {
        roomApi.backupRoom(room.roomId || room.id)
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
      if (room.isRunning) {
        toast.warning(this.$t('rooms.list.feedback.stopBeforeDelete'));
        return;
      }

      let confirmation;
      try {
        const result = await promptText(
          this.$t('rooms.list.feedback.deletePrompt', { room: room.name }),
          this.$t('rooms.list.feedback.deleteTitle'),
          {
            confirmButtonText: this.$t('rooms.list.feedback.moveToRecovery'),
            cancelButtonText: this.$t('common.actions.cancel'),
            inputValidator: value => value === room.name || this.$t('rooms.list.feedback.roomNameMismatch')
          }
        );
        confirmation = result.value;
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
    // 按类型获取世界列表
    getWorldsByType(worlds, type) {
      if (!worlds || !Array.isArray(worlds)) return [];
      return worlds.filter(world => {
        // 严格使用API返回的type字段
        return world.type === type;
      });
    },
    // 检查世界列表是否可滚动
    checkScrollable() {
      this.$nextTick(() => {
        const worldsElements = document.querySelectorAll('.save-worlds');
        worldsElements.forEach(el => {
          if (el.scrollHeight > el.clientHeight) {
            el.classList.add('scrollable');
          } else {
            el.classList.remove('scrollable');
          }
        });
      });
    },
    // 停止房间
    stopRoom(room) {
      confirmAction(this.$t('rooms.list.feedback.stopConfirm', { room: room.name }), this.$t('rooms.list.feedback.stopTitle'), {
        confirmButtonText: this.$t('common.actions.confirm'),
        cancelButtonText: this.$t('common.actions.cancel'),
        type: 'warning'
      }).then(() => {
        this.loading = true;
        roomApi.stopRoom(room.roomId || room.id)
          .then(async () => {
            await this.refreshRooms(true);
            toast.success(this.$t('rooms.list.feedback.stopped', { room: room.name }));
          })
          .catch(error => {
            toast.error(this.$t('rooms.list.feedback.stopFailed', { error: error.message || this.$t('common.errors.unknown') }));
          })
          .finally(() => {
            this.loading = false;
          });
      }).catch(() => {
        toast.info(this.$t('rooms.list.feedback.canceled'));
      });
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
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 16px;
}

.save-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 16px;
}

.save-item {
  min-width: 0;
}

.save-actions {
  justify-content: space-between;
  gap: 8px;
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
}

.save-worlds {
  display: flex;
  max-height: 190px;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.world-category {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.world-category-title {
  color: var(--muted-foreground);
  font-size: 12px;
}

.world-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.save-actions {
  flex-wrap: wrap;
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
}
</style>

<template>
  <div class="world-settings-page">
    <header class="page-header">
      <div>
        <h1>房间列表</h1>
        <p>管理当前运行目标中的房间、世界和访问配置。</p>
      </div>
      <div class="header-actions">
        <InputGroup class="search-input">
          <InputGroupAddon><Search /></InputGroupAddon>
          <InputGroupInput v-model="searchQuery" placeholder="搜索房间" />
        </InputGroup>
        <UiButton variant="outline" @click="refreshRooms" :disabled="isRefreshing">
          <Spinner v-if="isRefreshing" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          刷新
        </UiButton>
        <UiButton @click="createRoom"><Plus data-icon="inline-start" />创建房间</UiButton>
      </div>
    </header>

    <Alert v-if="loadError && !loading" variant="destructive" class="settings-card">
      <CircleAlert />
      <AlertTitle>房间列表加载失败</AlertTitle>
      <AlertDescription class="error-description">
        <span>{{ loadError }}</span>
        <UiButton variant="outline" size="sm" @click="refreshRooms(true)">
          <RefreshCw data-icon="inline-start" />
          重新加载
        </UiButton>
      </AlertDescription>
    </Alert>

    <div v-if="loading" class="room-skeleton settings-card" aria-busy="true" aria-label="正在加载房间列表">
      <Skeleton v-for="row in 6" :key="row" class="h-28 w-full" />
    </div>

    <Empty v-else-if="!loadError && filteredRooms.length === 0" class="settings-card">
      <EmptyHeader>
        <EmptyMedia variant="icon"><FolderPlus /></EmptyMedia>
        <EmptyTitle>{{ searchQuery ? '未找到匹配房间' : '暂无房间' }}</EmptyTitle>
        <EmptyDescription>{{ searchQuery ? '请调整搜索关键词后重试。' : '您尚未创建任何房间。' }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent v-if="!searchQuery">
        <UiButton @click="createRoom"><Plus data-icon="inline-start" />创建新房间</UiButton>
      </EmptyContent>
    </Empty>

    <div v-else-if="!loadError" class="save-list">
      <Card v-for="room in filteredRooms" :key="room.id" class="save-item">
        <CardHeader>
          <CardTitle>{{ room.name }}</CardTitle>
          <CardDescription class="save-info">
            <span v-if="room.updateTime"><Clock />{{ formatDate(room.updateTime) }}</span>
            <span v-if="room.worlds"><LayoutGrid />{{ room.worlds.length }} 个世界</span>
          </CardDescription>
          <CardAction v-if="room.isRunning"><Badge>运行中</Badge></CardAction>
        </CardHeader>
        <CardContent class="save-item-content">
              <div class="save-worlds" v-if="room.worlds && room.worlds.length">
                <div class="world-category forest" v-if="getWorldsByType(room.worlds, 'forest').length > 0">
                  <span class="world-category-title">主世界:</span>
                  <div class="world-tags">
                    <Badge v-for="world in getWorldsByType(room.worlds, 'forest')" :key="world.name" variant="outline">{{ world.name }}</Badge>
                  </div>
                </div>
                <div class="world-category cave" v-if="getWorldsByType(room.worlds, 'cave').length > 0">
                  <span class="world-category-title">洞穴:</span>
                  <div class="world-tags">
                    <Badge v-for="world in getWorldsByType(room.worlds, 'cave')" :key="world.name" variant="secondary">{{ world.name }}</Badge>
                  </div>
                </div>
                <div class="world-category unknown" v-if="getWorldsByType(room.worlds, 'unknown').length > 0">
                  <span class="world-category-title">其他:</span>
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
                  @click="startRoom(room)"><Play data-icon="inline-start" />开启</UiButton>
                <UiButton
                  v-else
                  variant="destructive"
                  size="sm"
                  @click="stopRoom(room)"><Square data-icon="inline-start" />停止</UiButton>
                <UiButton variant="outline" size="sm" @click="editRoom(room)"><Pencil data-icon="inline-start" />编辑</UiButton>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <UiButton variant="outline" size="sm">更多操作<ChevronDown data-icon="inline-end" /></UiButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem @select="handleSpecialLists(room)">特殊名单</DropdownMenuItem>
                <DropdownMenuItem @select="handleServerToken(room)">服务器令牌</DropdownMenuItem>
                <DropdownMenuItem @select="handleViewLogs(room)">查看日志</DropdownMenuItem>
                <DropdownMenuItem @select="backupRoom(room)">备份房间</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" @select="deleteRoom(room)">删除房间</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>
    </div>

    <UiDialog v-model:open="specialListsVisible">
      <DialogScrollContent class="max-w-5xl">
        <DialogHeader><DialogTitle>特殊名单管理</DialogTitle><DialogDescription>维护房间管理员、黑名单和白名单。</DialogDescription></DialogHeader>
        <SpecialLists v-if="specialListsVisible" :savename="selectedSavename" @close="specialListsVisible = false" />
      </DialogScrollContent>
    </UiDialog>

    <UiDialog v-model:open="serverTokenVisible">
      <DialogContent class="max-w-3xl">
        <DialogHeader><DialogTitle>服务器令牌管理</DialogTitle><DialogDescription>查看或更新当前房间的服务器令牌。</DialogDescription></DialogHeader>
        <ServerToken v-if="serverTokenVisible" :savename="selectedSavename" @close="serverTokenVisible = false" />
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="logViewerVisible">
      <DialogScrollContent class="max-w-5xl">
        <DialogHeader><DialogTitle>服务器日志</DialogTitle><DialogDescription>{{ selectedRoomName }} 的实时与历史日志。</DialogDescription></DialogHeader>
        <LogViewer v-if="logViewerVisible" :archiveName="selectedSavename" :title="'服务器日志 - ' + selectedRoomName" :subtitle="selectedWorldDisplay" :worlds="selectedRoomWorlds" :defaultWorld="selectedRoomWorldName" @close="logViewerVisible = false" />
      </DialogScrollContent>
    </UiDialog>

    <UiDialog v-model:open="startDialogVisible">
      <DialogScrollContent class="max-w-3xl">
        <DialogHeader><DialogTitle>启动房间</DialogTitle><DialogDescription>选择本次要启动的世界类型。</DialogDescription></DialogHeader>
        <StartRoomForm v-if="startDialogVisible" :room="selectedRoom" :startForm="startForm" :loading="startLoading" @confirm="confirmStartRoom" @close="closeStartDialog" />
      </DialogScrollContent>
    </UiDialog>
  </div>
</template>

<script>
import {
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
import { confirmAction } from '@/lib/feedback';
import SpecialLists from './SpecialLists.vue';
import ServerToken from './ServerToken.vue';
import LogViewer from '../servers/LogViewer.vue';
import StartRoomForm from './StartRoomForm.vue';

export default {
  name: 'RoomList',
  components: {
    Alert,
    AlertDescription,
    AlertTitle,
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
      lastRefreshTime: 0
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
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString();
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

            toast.success('房间列表已刷新');
            console.log('Refreshed rooms and server status at', new Date().toLocaleTimeString());
          } else {
            throw new Error('获取房间列表失败');
          }
        })
        .catch(error => {
          console.error("获取数据失败:", error);
          this.loadError = error.message || '无法连接管理服务，请检查服务状态后重试';
          toast.error('获取数据失败: ' + this.loadError);
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
            throw new Error('没有找到符合条件的真实世界');
          }
          return roomApi.startRoom({
            room_id: roomId,
            world_ids: selectedWorlds.map(world => world.id)
          });
        })
        .then(async response => {
          this.startDialogVisible = false;
          await this.refreshRooms(true);
          toast.success(response.msg || `房间 ${this.selectedRoom.name} 已启动`);
        })
        .catch(error => {
          toast.error(`启动房间失败: ${error.message || '未知错误'}`);
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
      this.selectedWorldDisplay = room.worlds && room.worlds.length > 0 ?
        `${room.worlds[0].name} (${room.worlds[0].type === 'forest' ? '森林' : (room.worlds[0].type === 'cave' ? '洞穴' : '其他')})` : '';
      this.logViewerVisible = true;
    },
    closeLogViewerDialog() {
      this.logViewerVisible = false;
    },
    backupRoom(room) {
      confirmAction(`确定要备份房间 "${room.name}" 吗?`, '备份房间', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        roomApi.backupRoom(room.roomId || room.id)
          .then(response => {
            toast.success(response.msg || `房间 ${room.name} 的备份已创建`);
          })
          .catch(error => {
            toast.error('备份房间失败: ' + (error.message || '未知错误'));
          });
      }).catch(() => {
        toast.info('已取消操作');
      });
    },
    deleteRoom(room) {
      confirmAction(`确定要删除房间 "${room.name}" 吗? 此操作不可恢复!`, '删除房间', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        roomApi.deleteRoom(room.roomId || room.id)
          .then(response => {
            toast.success(response.msg || `已删除房间 ${room.name}`);
            this.refreshRooms();
          })
          .catch(error => {
            toast.error('删除房间失败: ' + (error.message || '未知错误'));
            this.refreshRooms();
          });
      }).catch(() => {
        toast.info('已取消操作');
      });
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
      confirmAction(`确定要停止房间 "${room.name}" 吗?`, '停止房间', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        roomApi.stopRoom(room.roomId || room.id)
          .then(async response => {
            await this.refreshRooms(true);
            toast.success(response.msg || `房间 ${room.name} 已停止`);
          })
          .catch(error => {
            toast.error('停止房间失败: ' + (error.message || '未知错误'));
          })
          .finally(() => {
            this.loading = false;
          });
      }).catch(() => {
        toast.info('已取消操作');
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

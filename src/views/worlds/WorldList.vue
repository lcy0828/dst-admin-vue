<template>
  <div class="world-list-page">
    <div class="page-header">
      <h2>世界列表</h2>
      <div class="header-actions">
        <InputGroup class="search-input">
          <InputGroupAddon><Search /></InputGroupAddon>
          <InputGroupInput v-model="searchQuery" placeholder="搜索世界" />
        </InputGroup>
        <UiButton @click="createWorld"><Plus data-icon="inline-start" />创建世界</UiButton>
      </div>
    </div>

    <div class="world-layout">
      <aside class="sidebar-container">
        <room-categories :rooms="rooms" @category-change="handleCategoryChange" @refresh="refreshWorlds" />
      </aside>

      <Card class="world-list-card">
        <CardHeader class="card-header">
          <div>
            <CardTitle>{{ getCategoryTitle() }}</CardTitle>
            <CardDescription>按房间筛选并管理世界运行状态。</CardDescription>
          </div>
          <div class="list-actions">
            <UiSelect v-model="selectedRoom" @update:model-value="handleRoomChange">
              <SelectTrigger class="room-select"><SelectValue placeholder="选择房间" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="room in rooms" :key="room.id" :value="room.id">
                    {{ room.name }} · {{ room.worlds ? room.worlds.length : 0 }} 个世界
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </UiSelect>
            <UiButton variant="outline" size="sm" :disabled="isRefreshing" @click="refreshWorlds">
              <Spinner v-if="isRefreshing" data-icon="inline-start" />
              <RefreshCw v-else data-icon="inline-start" />
              刷新
            </UiButton>
          </div>
        </CardHeader>

        <CardContent>
          <Alert v-if="selectedRoom && !loading" class="filter-info">
            <Info />
            <AlertTitle>房间筛选</AlertTitle>
            <AlertDescription>当前只显示 {{ getSelectedRoomName() }} 房间的世界。</AlertDescription>
            <AlertAction><UiButton variant="ghost" size="sm" @click="selectedRoom = null">查看全部</UiButton></AlertAction>
          </Alert>

          <div v-if="loading" class="loading-state"><Spinner /><span>正在加载世界列表</span></div>

          <div v-else-if="filteredWorlds.length > 0" class="table-wrap">
            <UiTable>
              <TableHeader>
                <TableRow>
                  <TableHead>世界名称</TableHead>
                  <TableHead>所属房间</TableHead>
                  <TableHead>世界类型</TableHead>
                  <TableHead>季节</TableHead>
                  <TableHead>天数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead class="action-column">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="world in filteredWorlds" :key="`${world.roomId}-${world.id}`" class="world-row" @click="handleRowClick(world)">
                  <TableCell>{{ world.name }}</TableCell>
                  <TableCell>{{ world.roomName }}</TableCell>
                  <TableCell><Badge :variant="getWorldTypeTag(world.type)">{{ getWorldTypeName(world.type) }}</Badge></TableCell>
                  <TableCell>{{ world.season ?? '--' }}</TableCell>
                  <TableCell>{{ world.day ?? '--' }}</TableCell>
                  <TableCell><Badge :variant="getWorldStatusTag(world.status)">{{ getWorldStatusName(world.status) }}</Badge></TableCell>
                  <TableCell class="action-column" @click.stop>
                    <div class="row-actions">
                      <UiButton
                        :variant="world.status === 'running' ? 'destructive' : 'default'"
                        size="sm"
                        :disabled="world.controlAvailable === false"
                        @click="toggleWorldStatus(world)"
                      >
                        {{ world.status === 'running' ? '停止' : '启动' }}
                      </UiButton>
                      <UiButton variant="outline" size="sm" @click="editWorld(world)">编辑</UiButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger as-child><UiButton variant="ghost" size="icon-sm" aria-label="打开世界操作菜单" title="世界操作"><MoreHorizontal /></UiButton></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            <DropdownMenuItem @select="viewWorldState(world)">查看状态</DropdownMenuItem>
                            <DropdownMenuItem @select="regenerateWorld(world)">重新生成</DropdownMenuItem>
                            <DropdownMenuItem @select="backupWorld(world)">备份世界</DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem variant="destructive" @select="deleteWorld(world)">删除世界</DropdownMenuItem>
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
              <EmptyTitle>没有找到符合条件的世界</EmptyTitle>
              <EmptyDescription>调整搜索条件或选择其他房间。</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </div>

    <UiDialog v-model:open="roomSelectDialogVisible" @update:open="handleRoomDialogOpenChange">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>选择房间</DialogTitle>
          <DialogDescription>选择要创建新世界的目标房间。</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel for="room-dialog-search">搜索房间</FieldLabel>
            <InputGroup>
              <InputGroupAddon><Search /></InputGroupAddon>
              <InputGroupInput id="room-dialog-search" v-model="roomSearchQuery" placeholder="搜索房间" />
            </InputGroup>
          </Field>
          <FieldSet>
            <FieldLegend variant="label">目标房间</FieldLegend>
            <RadioGroup v-model="tempSelectedRoom" class="room-radio-group">
              <Field v-for="room in filteredDialogRooms" :key="room.id" orientation="horizontal" class="room-radio-item">
                <RadioGroupItem :id="`target-room-${room.id}`" :value="room.id" />
                <FieldContent>
                  <FieldLabel :for="`target-room-${room.id}`">{{ room.name }}</FieldLabel>
                  <FieldDescription>{{ room.worlds ? room.worlds.length : 0 }} 个世界</FieldDescription>
                </FieldContent>
                <Badge v-if="room.status === 'running'">运行中</Badge>
              </Field>
            </RadioGroup>
            <Empty v-if="filteredDialogRooms.length === 0">
              <EmptyHeader><EmptyTitle>没有找到符合条件的房间</EmptyTitle></EmptyHeader>
            </Empty>
          </FieldSet>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" @click="closeRoomDialog">取消</UiButton>
          <UiButton @click="confirmRoomSelect" :disabled="!tempSelectedRoom">确定</UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { Globe2, Info, MoreHorizontal, Plus, RefreshCw, Search } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { roomApi, systemApi } from '../../api/index';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { confirmAction } from '@/lib/feedback';
import RoomCategories from '../../components/worlds/RoomCategories.vue';

export default {
  name: 'WorldList',
  components: {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Badge,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
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
    Plus,
    RadioGroup,
    RadioGroupItem,
    RefreshCw,
    RoomCategories,
    Search,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Spinner,
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
      searchQuery: '',
      currentCategory: 'all',
      rooms: [], // 房间列表
      worlds: [],
      isRefreshing: false,
      lastRefreshTime: 0,
      selectedRoom: null,
      roomSelectDialogVisible: false,
      roomSearchQuery: '',
      tempSelectedRoom: null
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
      let title = '';
      switch(this.currentCategory) {
        case 'all':
          title = '所有世界';
          break;
        case 'active':
          title = '活跃世界';
          break;
        case 'inactive':
          title = '非活跃世界';
          break;
        case 'forest':
          title = '主世界';
          break;
        case 'cave':
          title = '洞穴世界';
          break;
        case 'both':
          title = '混合房间世界';
          break;
        default:
          if (this.currentCategory.startsWith('custom_')) {
            title = '自定义分类';
          } else {
            title = '所有世界';
          }
      }

      // 添加房间信息
      if (this.selectedRoom) {
        title += ` - ${this.getSelectedRoomName()}`;
      }

      return title;
    },
    getWorldTypeName(type) {
      if (type === 'forest' || type === 'master') return '主世界';
      if (type === 'cave') return '洞穴';
      return '其他';
    },
    getWorldTypeTag(type) {
      if (type === 'cave') return 'secondary';
      return 'outline';
    },
    getWorldStatusName(status) {
      if (status === 'running') return '运行中';
      if (status === 'stopped') return '已停止';
      return '未知';
    },
    getWorldStatusTag(status) {
      if (status === 'running') return 'default';
      return 'secondary';
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

              world.status = runningServer?.status || 'unknown';
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
          console.error("获取服务器状态失败:", error);
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
      console.log("开始获取世界列表");

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
                  description: world.description || ''
                }));
                allWorlds = [...allWorlds, ...worldsData];
              }
            });

            this.worlds = allWorlds;

            // 获取运行状态
            return this.getServerStatus();
          } else {
            toast.warning('获取房间列表数据格式异常');
            return Promise.reject(new Error('获取房间列表数据格式异常'));
          }
        })
        .then(() => {
          if (this.worlds.length > 0) {
            toast.success('世界列表已刷新');
          } else {
            toast.warning('没有找到任何世界');
          }
        })
        .catch(error => {
          console.error('获取世界列表失败:', error);
          toast.error('获取世界列表失败: ' + (error.message || '未知错误'));
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
          toast.error('获取房间信息失败');
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
      const action = world.status === 'running' ? '停止' : '启动';
      confirmAction(`确定要${action}世界 "${world.name}" 吗?`, `${action}世界`, {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        const request = {
          room_id: world.roomId,
          world_id: world.id
        };
        const operation = world.status === 'running'
          ? roomApi.stopRoom(request)
          : roomApi.startRoom(request);
        operation
          .then(async response => {
            await this.refreshWorlds(true);
            toast.success(response.msg || `${action}完成`);
          })
          .catch(error => {
            toast.error(`${action}世界失败: ${error.message || '未知错误'}`);
          })
          .finally(() => {
            this.loading = false;
          });
      }).catch(() => {
        toast.info('已取消操作');
      });
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
    regenerateWorld(world) {
      confirmAction(`确定要重新生成世界 "${world.name}" 吗？现有的世界数据将会丢失！`, '重新生成世界', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        roomApi.regenerateWorld({ room_id: world.roomId, world_id: world.id })
          .then(response => toast.success(response.msg))
          .catch(error => toast.error(error.message))
          .finally(() => { this.loading = false; });
      }).catch(() => {
        toast.info('已取消操作');
      });
    },
    backupWorld(world) {
      confirmAction(`v2 后端将备份世界 "${world.name}" 所属的整个房间 "${world.roomName}"，确定继续吗?`, '备份世界', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        this.loading = true;
        roomApi.backupRoom(world.roomId, `世界 ${world.name}`)
          .then(response => toast.success(response.msg || '房间备份已创建'))
          .catch(error => toast.error(`备份失败：${error.message}`))
          .finally(() => { this.loading = false; });
      }).catch(() => {
        toast.info('已取消操作');
      });
    },
    deleteWorld(world) {
      confirmAction(`确定要删除世界 "${world.name}" 吗？此操作不可恢复!`, '删除世界', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        roomApi.deleteWorld({ room_id: world.roomId, world_id: world.id })
          .then(response => {
            toast.success(response.msg);
            this.refreshWorlds();
          })
          .catch(error => toast.error(error.message))
          .finally(() => { this.loading = false; });
      }).catch(() => {
        toast.info('已取消操作');
      });
    },
    handleRoomChange(value) {
      this.selectedRoom = value;
    },
    getSelectedRoomName() {
      const room = this.rooms.find(r => r.id === this.selectedRoom);
      return room ? room.name : '所有房间';
    },
    confirmRoomSelect() {
      if (!this.tempSelectedRoom) {
        toast.warning('请选择一个房间');
        return;
      }

      // 获取选择的房间信息
      const room = this.rooms.find(r => r.id === this.tempSelectedRoom);
      if (!room) {
        toast.error('获取房间信息失败');
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
  width: 100%;
  min-width: 0;
}

.page-header,
.header-actions,
.card-header,
.list-actions,
.row-actions,
.loading-state {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
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
  gap: 16px;
}

.sidebar-container,
.world-list-card {
  min-width: 0;
}

.card-header {
  justify-content: space-between;
  gap: 16px;
}

.room-select {
  width: 210px;
}

.filter-info {
  margin-bottom: 12px;
}

.loading-state {
  min-height: 220px;
  justify-content: center;
  gap: 8px;
  color: var(--muted-foreground);
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.world-row {
  cursor: pointer;
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
  .page-header,
  .card-header {
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

<template>
  <div class="server-list-page">
    <header class="page-header">
      <div>
        <h1>服务器状态</h1>
        <p>监控当前运行目标中的世界分片，并执行启动或停止操作。</p>
      </div>
      <UiButton size="sm" variant="outline" :disabled="loading" @click="refreshData">
        <Spinner v-if="loading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        刷新
      </UiButton>
    </header>

    <Card class="filter-container">
      <CardHeader>
        <CardTitle>筛选范围</CardTitle>
        <CardDescription>按运行状态、房间和世界类型缩小结果。</CardDescription>
      </CardHeader>
      <CardContent class="filter-content">
        <Tabs v-model="activeTab">
          <TabsList>
            <TabsTrigger value="all">全部分片</TabsTrigger>
            <TabsTrigger value="running">运行中</TabsTrigger>
            <TabsTrigger value="stopped">已停止</TabsTrigger>
          </TabsList>
        </Tabs>

        <div class="filter-options">
          <UiSelect v-model="roomFilter"><SelectTrigger><SelectValue placeholder="按存档筛选" /></SelectTrigger><SelectContent><SelectGroup>
            <SelectItem value="all">全部存档</SelectItem><SelectItem v-for="room in roomList" :key="room.id" :value="room.id">{{ room.name }}</SelectItem>
          </SelectGroup></SelectContent></UiSelect>
          <UiSelect v-model="typeFilter"><SelectTrigger><SelectValue placeholder="按类型筛选" /></SelectTrigger><SelectContent><SelectGroup>
            <SelectItem value="all">全部类型</SelectItem><SelectItem value="forest">森林服务器</SelectItem><SelectItem value="cave">洞穴服务器</SelectItem>
          </SelectGroup></SelectContent></UiSelect>
        </div>
      </CardContent>
    </Card>

    <Card class="server-table-container">
      <CardHeader>
        <CardTitle>世界分片</CardTitle>
        <CardDescription>状态来自当前选择的本机或远程运行目标。</CardDescription>
      </CardHeader>
      <CardContent class="table-content">
        <Alert v-if="loadError" variant="destructive" class="server-feedback">
          <CircleAlert />
          <AlertTitle>服务器状态读取失败</AlertTitle>
          <AlertDescription>{{ loadError }}</AlertDescription>
          <AlertAction><UiButton size="sm" variant="outline" @click="refreshData">重新加载</UiButton></AlertAction>
        </Alert>
        <div v-if="loading && !serverList.length" class="table-skeleton" aria-busy="true" aria-label="正在读取服务器状态">
          <Skeleton v-for="row in 5" :key="row" class="h-12 w-full" />
        </div>
        <div v-else-if="filteredServerList.length" class="table-scroll">
        <ShadcnTable>
          <TableHeader><TableRow>
            <TableHead>服务器名称</TableHead><TableHead>天数</TableHead><TableHead>季节</TableHead>
            <TableHead>运行目标</TableHead><TableHead>操作</TableHead>
          </TableRow></TableHeader>
          <TableBody><TableRow v-for="server in filteredServerList" :key="server.session_name">
            <TableCell>
            <div class="server-name-container">
              <Badge :variant="server.status === 'running' ? 'default' : 'secondary'">
                {{ serverStatusLabel(server.status) }}
              </Badge>
              <Badge variant="outline">{{ getWorldTypeName(server.world_type, server.world_name) }}</Badge>
              <div>
                <div class="server-world">{{ server.world_name }}</div>
                <div class="server-room">{{ server.archive_name }}</div>
              </div>
            </div>
            </TableCell>
            <TableCell>{{ server.day ?? '-' }}</TableCell>
            <TableCell><Badge v-if="server.season" variant="secondary">{{ server.season }}</Badge><span v-else>-</span></TableCell>
            <TableCell><Badge variant="secondary">{{ runtimeTargetLabel }}</Badge></TableCell>
            <TableCell><div class="operation-buttons">
              <UiButton
                size="xs"
                :variant="server.status === 'running' ? 'destructive' : 'default'"
                :disabled="!canControlServer(server) || serverActionId === serverKey(server)"
                :title="!canControlServer(server) ? (server.status_message || '当前分片状态不可控制') : ''"
                @click="handleServerAction(server)"
              >
                <Spinner v-if="serverActionId === serverKey(server)" data-icon="inline-start" />
                <Square v-else-if="server.status === 'running'" data-icon="inline-start" />
                <Play v-else data-icon="inline-start" />
                {{ server.status === 'running' ? '停止' : '启动' }}
              </UiButton>
              <UiButton size="xs" variant="outline" @click="handleConfigure(server)">配置</UiButton>
            </div></TableCell>
          </TableRow></TableBody>
        </ShadcnTable>
        </div>
        <Empty v-else-if="!loadError">
          <EmptyHeader><EmptyMedia variant="icon"><ServerOff /></EmptyMedia><EmptyTitle>暂无服务器数据</EmptyTitle><EmptyDescription>创建房间后，可以在这里启动和监控服务器。</EmptyDescription></EmptyHeader>
          <EmptyContent class="empty-actions"><UiButton @click="navigateToRoomCreation">创建新房间</UiButton><UiButton variant="outline" @click="showStartRoomDialog">启动现有房间</UiButton></EmptyContent>
        </Empty>
      </CardContent>
    </Card>

    <UiDialog v-model:open="startRoomDialogVisible">
      <DialogScrollContent>
        <DialogHeader><DialogTitle>选择并启动房间</DialogTitle><DialogDescription>选择当前运行目标中的房间和真实世界分片。</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field><FieldLabel>选择房间</FieldLabel><UiSelect :model-value="startRoomForm.roomIndex" @update:model-value="selectStartRoom"><SelectTrigger class="w-full"><SelectValue placeholder="请选择房间" /></SelectTrigger><SelectContent><SelectGroup>
            <SelectItem v-for="(room, index) in roomList" :key="room.id" :value="String(index)">{{ room.name }}</SelectItem>
          </SelectGroup></SelectContent></UiSelect></Field>
          <FieldSet v-if="startRoomForm.roomIndex !== ''">
            <FieldLegend variant="label">选择世界</FieldLegend>
            <FieldDescription>已运行或当前目标不可控制的分片不会重复启动。</FieldDescription>
            <FieldGroup>
              <Field
                v-for="world in selectedStartRoomWorlds"
                :key="world.id"
                orientation="horizontal"
                :data-disabled="!canStartWorld(world) || undefined"
              >
                <UiCheckbox
                  :id="`server-world-${world.id}`"
                  :model-value="startRoomForm.worldIds.includes(world.id)"
                  :disabled="!canStartWorld(world) || startRoomLoading"
                  @update:model-value="toggleWorld(world.id, $event)"
                />
                <FieldLabel :for="`server-world-${world.id}`" class="font-normal">
                  {{ world.name }}
                  <Badge variant="outline">{{ getWorldTypeName(world.type, world.name) }}</Badge>
                  <Badge v-if="world.status === 'running'" variant="secondary">已运行</Badge>
                </FieldLabel>
              </Field>
            </FieldGroup>
          </FieldSet>
        </FieldGroup>
        <DialogFooter><UiButton variant="outline" :disabled="startRoomLoading" @click="startRoomDialogVisible = false">取消</UiButton><UiButton :disabled="startRoomLoading || !startRoomForm.worldIds.length" @click="handleStartRoomFrom"><Spinner v-if="startRoomLoading" data-icon="inline-start" /><Play v-else data-icon="inline-start" />启动所选分片</UiButton></DialogFooter>
      </DialogScrollContent>
    </UiDialog>
  </div>
</template>

<script>
import { CircleAlert, Play, RefreshCw, ServerOff, Square } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { systemApi, roomApi } from '@/api/index';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox as UiCheckbox } from '@/components/ui/checkbox';
import { Dialog as UiDialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { confirmAction } from '@/lib/feedback';
import { getActiveRuntimeTarget, RUNTIME_TARGET_CHANGED_EVENT } from '@/utils/runtimeTarget';

export default {
  name: 'ServerList',
  components: {
    Alert, AlertAction, AlertDescription, AlertTitle, Badge, Card, CardContent, CardDescription,
    CardHeader, CardTitle, CircleAlert, DialogDescription, DialogFooter, DialogHeader,
    DialogScrollContent, DialogTitle, Empty, EmptyContent,
    EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, Field, FieldDescription, FieldGroup,
    FieldLabel, FieldLegend, FieldSet, Play, RefreshCw, SelectContent, SelectGroup, SelectItem,
    SelectTrigger, SelectValue, ServerOff, ShadcnTable, Skeleton, Spinner, Square, TableBody,
    TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList, TabsTrigger, UiButton, UiCheckbox,
    UiDialog, UiSelect
  },
  data() {
    return {
      loading: false,
      activeTab: 'all',
      roomFilter: '',
      typeFilter: '',
      serverList: [],
      roomList: [],
      loadError: '',
      runtimeTarget: getActiveRuntimeTarget(),
      serverActionId: '',
      refreshSequence: 0,
      startRoomDialogVisible: false,
      startRoomForm: {
        roomIndex: '',
        worldIds: []
      },
      startRoomLoading: false
    };
  },
  computed: {
    filteredServerList() {
      let result = this.serverList;

      if (this.roomFilter && this.roomFilter !== 'all') {
        result = result.filter(server => server.room_id === this.roomFilter || server.archive_name === this.roomFilter);
      }

      if (this.activeTab !== 'all') result = result.filter(server => server.status === this.activeTab);

      // 根据服务器类型筛选
      if (this.typeFilter && this.typeFilter !== 'all') {
        result = result.filter(server => {
          if (server.world_type) return server.world_type === this.typeFilter;
          return (server.world_name || '').toLowerCase().includes(this.typeFilter);
        });
      }

      return result;
    },
    selectedStartRoom() {
      if (this.startRoomForm.roomIndex === '') return null;
      return this.roomList[Number(this.startRoomForm.roomIndex)] || null;
    },
    selectedStartRoomWorlds() {
      return this.selectedStartRoom?.worlds || [];
    },
    runtimeTargetLabel() {
      const name = this.runtimeTarget?.name || '本机';
      return this.runtimeTarget?.kind === 'local' ? `${name}（本机）` : `${name}（远程）`;
    }
  },
  created() {
    this.fetchData();
  },
  mounted() {
    window.addEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange);
  },
  beforeUnmount() {
    window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange);
  },
  methods: {
    async fetchData({ notify = false } = {}) {
      const requestSequence = ++this.refreshSequence;
      this.loading = true;
      this.loadError = '';
      try {
        const [serversResponse, roomsResponse] = await Promise.all([
          systemApi.getTmuxServers(),
          roomApi.getRoomList()
        ]);
        if (requestSequence !== this.refreshSequence) return;
        this.serverList = Array.isArray(serversResponse?.data) ? serversResponse.data : [];
        this.roomList = Array.isArray(roomsResponse?.data) ? roomsResponse.data : [];
        if (notify) toast.success(serversResponse?.msg || '服务器状态已刷新');
      } catch (error) {
        if (requestSequence !== this.refreshSequence) return;
        this.serverList = [];
        this.roomList = [];
        this.loadError = error.message || '无法读取当前运行目标的服务器状态';
        if (notify) toast.error(this.loadError);
      } finally {
        if (requestSequence === this.refreshSequence) this.loading = false;
      }
    },
    refreshData() {
      return this.fetchData({ notify: true });
    },
    handleRuntimeTargetChange(event) {
      this.runtimeTarget = event.detail || getActiveRuntimeTarget();
      this.roomFilter = '';
      this.startRoomDialogVisible = false;
      this.fetchData();
    },
    navigateToRoomCreation() {
      this.$router.push('/rooms/settings');
    },
    getWorldTypeName(worldType, worldName = '') {
      if (worldType === 'forest') return '森林';
      if (worldType === 'cave') return '洞穴';
      const lowerName = worldName.toLowerCase();
      if (lowerName.includes('forest')) return '森林';
      if (lowerName.includes('cave')) return '洞穴';
      return '自定义';
    },
    showStartRoomDialog() {
      this.startRoomForm = { roomIndex: '', worldIds: [] };
      this.startRoomDialogVisible = true;
    },
    selectStartRoom(roomIndex) {
      this.startRoomForm.roomIndex = roomIndex;
      const room = this.roomList[Number(roomIndex)];
      this.startRoomForm.worldIds = (room?.worlds || [])
        .filter(world => this.canStartWorld(world))
        .map(world => world.id);
    },
    canStartWorld(world) {
      return world.status === 'stopped' && world.controlAvailable !== false;
    },
    toggleWorld(worldId, checked) {
      if (checked) {
        if (!this.startRoomForm.worldIds.includes(worldId)) this.startRoomForm.worldIds.push(worldId);
        return;
      }
      this.startRoomForm.worldIds = this.startRoomForm.worldIds.filter(id => id !== worldId);
    },
    async handleStartRoomFrom() {
      if (!this.selectedStartRoom || this.startRoomForm.worldIds.length === 0) {
        toast.warning(this.startRoomForm.roomIndex === '' ? '请选择房间' : '请至少选择一个世界');
        return;
      }
      const worldIds = this.selectedStartRoomWorlds
        .filter(world => this.canStartWorld(world) && this.startRoomForm.worldIds.includes(world.id))
        .map(world => world.id);
      if (!worldIds.length) {
        toast.warning('所选世界已运行或当前目标不可控制');
        return;
      }

      this.startRoomLoading = true;
      try {
        const response = await roomApi.startRoom({
          room_id: this.selectedStartRoom.id,
          world_ids: worldIds
        });
        await this.fetchData();
        this.startRoomDialogVisible = false;
        toast.success(response?.msg || '启动完成');
      } catch (error) {
        toast.error(`启动失败：${error.message || '未知错误'}`);
      } finally {
        this.startRoomLoading = false;
      }
    },
    async handleServerAction(server) {
      if (!this.canControlServer(server)) {
        toast.warning(server.status_message || '当前分片状态不可控制');
        return;
      }
      const isRunning = server.status === 'running';
      const action = isRunning ? '停止' : '启动';
      try {
        await confirmAction(`确定要${action}“${server.archive_name} / ${server.world_name}”吗？`, `${action}服务器`, {
          confirmButtonText: `确认${action}`,
          type: isRunning ? 'warning' : 'info'
        });
      } catch {
        toast.info(`已取消${action}`);
        return;
      }

      this.serverActionId = this.serverKey(server);
      try {
        const request = { room_id: server.room_id, world_id: server.world_id };
        const response = await (isRunning ? roomApi.stopRoom(request) : roomApi.startRoom(request));
        await this.fetchData();
        toast.success(response?.msg || `${action}完成`);
      } catch (error) {
        toast.error(`${action}失败：${error.message || '未知错误'}`);
      } finally {
        this.serverActionId = '';
      }
    },
    serverKey(server) {
      return `${server.room_id}:${server.world_id}`;
    },
    canControlServer(server) {
      return server.control_available !== false && ['running', 'stopped'].includes(server.status);
    },
    serverStatusLabel(status) {
      return { running: '运行中', stopped: '已停止' }[status] || '状态未知';
    },
    handleConfigure(server) {
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
    }
  }
};
</script>

<style scoped>
.server-list-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  min-width: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.filter-container {
  margin: 0;
}

.filter-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
}

.filter-options {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.filter-options > * {
  width: 160px;
}

.server-table-container {
  min-width: 0;
  overflow: hidden;
}

.table-content {
  padding: 0;
}

.table-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
}

.server-name-container {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.server-world {
  font-weight: 600;
  word-break: break-all;
}

.server-room {
  font-size: 12px;
  color: var(--muted-foreground);
}

.operation-buttons {
  display: flex;
  gap: 6px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.empty-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 16px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 220px;
  color: var(--muted-foreground);
}

.server-feedback {
  margin: 16px;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

@media (max-width: 768px) {
  .page-header {
    align-items: flex-start;
  }

  .filter-options {
    display: grid;
    grid-template-columns: 1fr;
  }

  .filter-options > * {
    width: 100% !important;
  }

  .empty-actions {
    align-items: stretch;
    flex-direction: column;
  }
}

</style>

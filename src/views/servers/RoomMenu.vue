<template>
  <div class="room-menu-page">
    <header class="page-header">
      <h1>房间管理</h1>
      <p>管理房间、世界、权限和模组配置</p>
    </header>

    <div class="menu-grid">
      <Card
        v-for="section in roomSections"
        :key="section.path"
        class="menu-card"
        tabindex="0"
        @click="navigateTo(section.path)"
        @keydown.enter="navigateTo(section.path)"
        @keydown.space.prevent="navigateTo(section.path)"
      >
        <CardHeader>
          <CardTitle>{{ section.title }}</CardTitle>
          <CardDescription>{{ section.description }}</CardDescription>
          <CardAction><span class="card-icon"><component :is="section.icon" /></span></CardAction>
        </CardHeader>
        <CardContent class="card-features">
          <Badge v-for="feature in section.features" :key="feature" variant="secondary">{{ feature }}</Badge>
        </CardContent>
      </Card>
    </div>

    <Card class="active-rooms-card">
      <CardHeader>
        <CardTitle>房间运行状态</CardTitle>
        <CardDescription>数据来自当前运行目标，切换本机或远程 Agent 后会自动刷新。</CardDescription>
        <CardAction><UiButton size="sm" variant="outline" :disabled="loading" @click="refreshRooms({ notify: true })">
          <Spinner v-if="loading" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          刷新列表
        </UiButton></CardAction>
      </CardHeader>
      <CardContent>
        <Alert v-if="loadError" variant="destructive" class="rooms-feedback">
          <CircleAlert />
          <AlertTitle>房间数据读取失败</AlertTitle>
          <AlertDescription>{{ loadError }}</AlertDescription>
          <AlertAction><UiButton size="sm" variant="outline" @click="refreshRooms">重新加载</UiButton></AlertAction>
        </Alert>

        <div v-if="loading && !activeRooms.length" class="room-skeleton" aria-busy="true" aria-label="正在读取房间和分片状态">
          <Skeleton v-for="row in 4" :key="row" class="h-12 w-full" />
        </div>

        <div v-else-if="activeRooms.length" class="table-scroll">
          <ShadcnTable>
            <TableHeader>
              <TableRow>
                <TableHead>房间名称</TableHead>
                <TableHead>世界分片</TableHead>
                <TableHead>运行中</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="room in activeRooms" :key="room.id">
                <TableCell class="font-medium">{{ room.name }}</TableCell>
                <TableCell>{{ room.worlds.length }}</TableCell>
                <TableCell>{{ runningWorlds(room).length }} / {{ room.worlds.length }}</TableCell>
                <TableCell>{{ formatUpdatedAt(room) }}</TableCell>
                <TableCell>
                  <Badge :variant="roomStatusVariant(room)">{{ roomStatusLabel(room) }}</Badge>
                  <p v-for="world in failedWorlds(room)" :key="world.id" class="room-failure">
                    {{ world.name }}：{{ worldStatusMessage(world) || '启动失败' }}
                  </p>
                </TableCell>
                <TableCell>
                  <div class="table-actions">
                    <UiButton size="xs" variant="outline" :disabled="!canConfigureRoom(room)" :title="!canConfigureRoom(room) ? '请先停止或清理房间分片' : ''" @click="editRoom(room)">
                      <Pencil data-icon="inline-start" />编辑
                    </UiButton>
                    <UiButton
                      size="xs"
                      :disabled="!startableWorlds(room).length || roomActionId === room.id"
                      @click="startRoom(room)"
                    >
                      <Spinner v-if="roomActionId === room.id" data-icon="inline-start" />
                      <Play v-else data-icon="inline-start" />
                      启动分片
                    </UiButton>
                    <UiButton
                      v-if="failedWorlds(room).length"
                      size="xs"
                      variant="outline"
                      :disabled="!cleanableFailedWorlds(room).length || roomActionId === room.id"
                      @click="cleanupFailedWorlds(room)"
                    >
                      <Spinner v-if="roomActionId === room.id" data-icon="inline-start" />
                      <Square v-else data-icon="inline-start" />
                      清理失败会话
                    </UiButton>
                    <UiButton
                      v-if="runningWorlds(room).length"
                      size="xs"
                      variant="destructive"
                      :disabled="!stoppableWorlds(room).length || roomActionId === room.id"
                      @click="stopRoom(room)"
                    >
                      <Spinner v-if="roomActionId === room.id" data-icon="inline-start" />
                      <Square v-else data-icon="inline-start" />
                      停止
                    </UiButton>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </ShadcnTable>
        </div>

        <Empty v-else-if="!loadError">
          <EmptyHeader>
            <EmptyMedia variant="icon"><FolderPlus /></EmptyMedia>
            <EmptyTitle>暂无真实房间数据</EmptyTitle>
            <EmptyDescription>在当前运行目标中创建房间后，房间和世界分片会显示在这里。</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <UiButton @click="createNewRoom"><Plus data-icon="inline-start" />创建新房间</UiButton>
          </EmptyContent>
        </Empty>
      </CardContent>
      <CardFooter v-if="activeRooms.length" class="add-room-button">
        <UiButton @click="createNewRoom"><Plus data-icon="inline-start" />创建新房间</UiButton>
      </CardFooter>
    </Card>

    <UiDialog v-model:open="startRoomDialogVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>启动房间分片</DialogTitle>
          <DialogDescription v-if="currentRoom">选择“{{ currentRoom.name }}”中本次要启动的真实世界分片。</DialogDescription>
        </DialogHeader>
        <FieldSet v-if="currentRoom">
          <FieldLegend variant="label">世界分片</FieldLegend>
          <FieldDescription>已运行或当前目标不可控制的分片不会重复启动。</FieldDescription>
          <FieldGroup>
            <Field
              v-for="world in currentRoom.worlds"
              :key="world.id"
              orientation="horizontal"
              :data-disabled="!canStartWorld(world) || undefined"
            >
              <UiCheckbox
                :id="`room-world-${world.id}`"
                :model-value="startForm.worldIds.includes(world.id)"
                :disabled="!canStartWorld(world) || startLoading"
                @update:model-value="toggleWorld(world.id, $event)"
              />
              <FieldLabel :for="`room-world-${world.id}`" class="font-normal">
                {{ world.name }}
                <Badge variant="outline">{{ worldTypeLabel(world.type) }}</Badge>
                <Badge :variant="worldStatusVariant(world)">{{ worldStatusLabel(world) }}</Badge>
                <span v-if="worldStatusMessage(world)" class="room-failure basis-full">{{ worldStatusMessage(world) }}</span>
              </FieldLabel>
            </Field>
          </FieldGroup>
        </FieldSet>
        <DialogFooter>
          <UiButton variant="outline" :disabled="startLoading" @click="startRoomDialogVisible = false">取消</UiButton>
          <UiButton :disabled="startLoading || !startForm.worldIds.length" @click="confirmStartRoom">
            <Spinner v-if="startLoading" data-icon="inline-start" />
            <Play v-else data-icon="inline-start" />
            启动所选分片
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import {
  CircleAlert,
  FolderPlus,
  Gamepad2,
  Globe2,
  Lock,
  PackageOpen,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Square,
  Sun
} from '@lucide/vue';
import { toast } from 'vue-sonner';
import { roomApi, systemApi } from '@/api/index';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox as UiCheckbox } from '@/components/ui/checkbox';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { confirmAction } from '@/lib/feedback';
import {
  canCleanFailedWorld,
  canConfigureWorld,
  canStartWorld as canStartRuntimeWorld,
  canStopWorld,
  worldStatusLabel,
  worldStatusMessage,
  worldStatusVariant
} from '@/lib/worldRuntimeStatus.mjs';
import { RUNTIME_TARGET_CHANGED_EVENT } from '@/utils/runtimeTarget';

const ROOM_SECTIONS = [
  { path: '/rooms/settings', title: '基本设置', description: '配置房间信息和启动参数', icon: Settings, features: ['房间名称', '存档目录', '启动配置'] },
  { path: '/rooms/special-lists', title: '权限设置', description: '管理管理员、黑名单和白名单', icon: Lock, features: ['管理员', '黑名单', '白名单'] },
  { path: '/worlds/settings', title: '游戏设置', description: '调整世界规则和生成选项', icon: Gamepad2, features: ['游戏模式', '世界规则', '生成参数'] },
  { path: '/mods/list', title: '房间模组', description: '管理当前房间引用的模组和分世界配置', icon: PackageOpen, features: ['房间模组', '分世界配置', '兼容信息'] },
  { path: '/worlds/state', title: '世界状态', description: '查看季节、天数和世界运行状态', icon: Sun, features: ['季节', '天数', '状态快照'] },
  { path: '/worlds/list', title: '世界管理', description: '查看并控制真实世界分片', icon: Globe2, features: ['地表', '洞穴', '自定义分片'] }
];

export default {
  name: 'RoomMenu',
  components: {
    Alert, AlertAction, AlertDescription, AlertTitle, Badge, Card, CardAction, CardContent, CardDescription, CardFooter,
    CardHeader, CardTitle, CircleAlert, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia,
    EmptyTitle, Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet,
    FolderPlus, Pencil, Play, Plus, RefreshCw, ShadcnTable, Skeleton, Spinner, Square, TableBody,
    TableCell, TableHead, TableHeader, TableRow, UiButton, UiCheckbox, UiDialog
  },
  data() {
    return {
      roomSections: ROOM_SECTIONS,
      activeRooms: [],
      loading: false,
      loadError: '',
      currentRoom: null,
      startRoomDialogVisible: false,
      startForm: { worldIds: [] },
      startLoading: false,
      roomActionId: '',
      refreshSequence: 0
    };
  },
  created() {
    this.refreshRooms();
  },
  mounted() {
    window.addEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange);
  },
  beforeUnmount() {
    window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange);
  },
  methods: {
    navigateTo(path) {
      this.$router.push(path);
    },
    handleRuntimeTargetChange() {
      this.refreshRooms();
    },
    async refreshRooms({ notify = false } = {}) {
      const requestSequence = ++this.refreshSequence;
      this.loading = true;
      this.loadError = '';
      try {
        const [roomsResponse, serversResponse] = await Promise.all([
          roomApi.getRoomList(),
          systemApi.getTmuxServers()
        ]);
        const servers = Array.isArray(serversResponse?.data) ? serversResponse.data : [];
        const serverByWorld = new Map(
          servers.map(server => [`${server.room_id}:${server.world_id}`, server])
        );
        if (requestSequence !== this.refreshSequence) return;
        this.activeRooms = (Array.isArray(roomsResponse?.data) ? roomsResponse.data : []).map(room => ({
          ...room,
          worlds: (room.worlds || []).map(world => {
            const server = serverByWorld.get(`${room.id}:${world.id}`);
            return {
              ...world,
              status: server?.status || world.status || 'stopped',
              controlAvailable: server?.control_available ?? world.controlAvailable,
              statusMessage: server?.status_message || world.statusMessage || '',
              updatedAt: server?.update_time || world.updatedAt || world.updateTime
            };
          })
        }));
        if (notify) toast.success(roomsResponse?.msg || '房间列表已刷新');
      } catch (error) {
        if (requestSequence !== this.refreshSequence) return;
        this.activeRooms = [];
        this.loadError = error.message || '无法读取当前运行目标的房间数据';
        if (notify) toast.error(this.loadError);
      } finally {
        if (requestSequence === this.refreshSequence) this.loading = false;
      }
    },
    editRoom(room) {
      this.$router.push({ path: '/rooms/settings', query: { id: room.id } });
    },
    createNewRoom() {
      this.$router.push('/rooms/settings');
    },
    runningWorlds(room) {
      return (room.worlds || []).filter(world => world.status === 'running');
    },
    stoppableWorlds(room) {
      return (room.worlds || []).filter(world => canStopWorld(world));
    },
    startableWorlds(room) {
      return (room.worlds || []).filter(world => this.canStartWorld(world));
    },
    canStartWorld(world) {
      return canStartRuntimeWorld(world);
    },
    failedWorlds(room) {
      return (room.worlds || []).filter(world => world.status === 'failed');
    },
    cleanableFailedWorlds(room) {
      return this.failedWorlds(room).filter(world => canCleanFailedWorld(world));
    },
    canConfigureRoom(room) {
      const worlds = room.worlds || [];
      return !worlds.length || worlds.every(world => canConfigureWorld(world));
    },
    roomStatus(room) {
      const worlds = room.worlds || [];
      if (worlds.some(world => world.status === 'running')) return 'running';
      if (worlds.some(world => world.status === 'starting')) return 'starting';
      if (worlds.some(world => world.status === 'failed')) return 'failed';
      return 'stopped';
    },
    roomStatusLabel(room) {
      return worldStatusLabel(this.roomStatus(room));
    },
    roomStatusVariant(room) {
      return worldStatusVariant(this.roomStatus(room));
    },
    worldStatusLabel(world) {
      return worldStatusLabel(world);
    },
    worldStatusVariant(world) {
      return worldStatusVariant(world);
    },
    worldStatusMessage(world) {
      return worldStatusMessage(world);
    },
    startRoom(room) {
      const worlds = this.startableWorlds(room);
      if (!worlds.length) {
        toast.info('当前没有可启动的世界分片');
        return;
      }
      this.currentRoom = room;
      this.startForm.worldIds = worlds.map(world => world.id);
      this.startRoomDialogVisible = true;
    },
    toggleWorld(worldId, checked) {
      if (checked) {
        if (!this.startForm.worldIds.includes(worldId)) this.startForm.worldIds.push(worldId);
        return;
      }
      this.startForm.worldIds = this.startForm.worldIds.filter(id => id !== worldId);
    },
    async confirmStartRoom() {
      if (!this.currentRoom || !this.startForm.worldIds.length) {
        toast.warning('请至少选择一个可启动的世界分片');
        return;
      }
      const worldIds = this.startableWorlds(this.currentRoom)
        .filter(world => this.startForm.worldIds.includes(world.id))
        .map(world => world.id);
      if (!worldIds.length) {
        toast.warning('所选世界已运行或当前目标不可控制');
        return;
      }

      this.startLoading = true;
      this.roomActionId = this.currentRoom.id;
      try {
        const response = await roomApi.startRoom({
          room_id: this.currentRoom.id,
          world_ids: worldIds
        });
        await this.refreshRooms();
        this.startRoomDialogVisible = false;
        toast.success(response?.msg || '所选世界分片已启动');
      } catch (error) {
        toast.error(`启动失败：${error.message || '未知错误'}`);
      } finally {
        this.startLoading = false;
        this.roomActionId = '';
      }
    },
    async cleanupFailedWorlds(room) {
      const worlds = this.cleanableFailedWorlds(room);
      if (!worlds.length) {
        toast.warning('当前房间没有可清理的失败会话');
        return;
      }
      try {
        await confirmAction(`确定要停止并清理“${room.name}”中 ${worlds.length} 个失败会话吗？`, '清理失败会话', {
          confirmButtonText: '确认清理',
          type: 'warning'
        });
      } catch {
        return;
      }

      this.roomActionId = room.id;
      try {
        const response = await roomApi.stopRoom({
          room_id: room.id,
          world_ids: worlds.map(world => world.id)
        });
        await this.refreshRooms();
        toast.success(response?.msg || '失败会话已清理');
      } catch (error) {
        toast.error(`清理失败：${error.message || '未知错误'}`);
      } finally {
        this.roomActionId = '';
      }
    },
    async stopRoom(room) {
      const worldIds = this.stoppableWorlds(room).map(world => world.id);
      if (!worldIds.length) {
        toast.warning('当前没有可停止的运行中分片');
        return;
      }
      try {
        await confirmAction(`确定要停止“${room.name}”中正在运行的 ${worldIds.length} 个分片吗？`, '停止房间', {
          confirmButtonText: '确认停止',
          type: 'warning'
        });
      } catch {
        toast.info('已取消停止');
        return;
      }

      this.roomActionId = room.id;
      try {
        const response = await roomApi.stopRoom({ room_id: room.id, world_ids: worldIds });
        await this.refreshRooms();
        toast.success(response?.msg || '房间已停止');
      } catch (error) {
        toast.error(`停止失败：${error.message || '未知错误'}`);
      } finally {
        this.roomActionId = '';
      }
    },
    worldTypeLabel(type) {
      if (type === 'forest') return '地表';
      if (type === 'cave') return '洞穴';
      return '自定义';
    },
    formatUpdatedAt(room) {
      const timestamps = [room.updatedAt, room.updateTime, ...room.worlds.map(world => world.updatedAt)]
        .filter(Boolean)
        .map(value => new Date(value))
        .filter(value => Number.isFinite(value.getTime()));
      if (!timestamps.length) return '-';
      const latest = new Date(Math.max(...timestamps.map(value => value.getTime())));
      return latest.toLocaleString();
    }
  }
};
</script>

<style scoped>
.room-menu-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  min-width: 0;
}

.page-header {
  margin: 0;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 2px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.room-failure {
  margin-top: 4px;
  color: var(--destructive);
  font-size: 12px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.menu-card {
  min-height: 164px;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.menu-card:hover,
.menu-card:focus-visible {
  border-color: var(--ring);
  background: var(--muted);
  outline: none;
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  border-radius: var(--radius);
  background: var(--muted);
  color: var(--foreground);
}

.card-features,
.table-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.active-rooms-card {
  margin: 0;
}

.rooms-feedback {
  margin-bottom: 12px;
}

.room-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.add-room-button {
  justify-content: flex-end;
}

@media (max-width: 1000px) {
  .menu-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .menu-grid {
    grid-template-columns: 1fr;
  }

}
</style>

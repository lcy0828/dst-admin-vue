<template>
  <div class="room-menu-page">
    <div class="page-header">
      <h2>房间管理</h2>
      <p>管理游戏房间的所有设置选项</p>
    </div>

    <div class="menu-grid">
      <Card
        v-for="section in roomSections"
        :key="section.path"
        class="menu-card"
        tabindex="0"
        @click="navigateTo(section.path)"
        @keydown.enter="navigateTo(section.path)"
      >
        <CardHeader class="menu-card-header">
          <div class="card-icon"><component :is="section.icon" /></div>
          <div>
            <CardTitle>{{ section.title }}</CardTitle>
            <CardDescription>{{ section.description }}</CardDescription>
          </div>
        </CardHeader>
        <CardContent class="card-features">
          <Badge v-for="feature in section.features" :key="feature" variant="secondary">{{ feature }}</Badge>
        </CardContent>
      </Card>
    </div>

    <Card class="active-rooms-card">
      <CardHeader class="active-rooms-header">
        <div>
          <CardTitle>当前激活房间</CardTitle>
          <CardDescription>查看房间状态并执行常用操作。</CardDescription>
        </div>
        <UiButton size="sm" variant="outline" @click="refreshRooms">
          <RefreshCw data-icon="inline-start" />
          刷新列表
        </UiButton>
      </CardHeader>
      <CardContent>
        <ShadcnTable>
          <TableHeader>
            <TableRow>
              <TableHead>房间名称</TableHead><TableHead>玩家数</TableHead><TableHead>游戏模式</TableHead>
              <TableHead>风格</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="room in activeRooms" :key="room.id">
              <TableCell class="font-medium">{{ room.name }}</TableCell>
              <TableCell>{{ room.players }}</TableCell>
              <TableCell>{{ room.mode }}</TableCell>
              <TableCell><Badge variant="outline">{{ room.styleName }}</Badge></TableCell>
              <TableCell><Badge :variant="room.status === '开放' ? 'default' : 'secondary'">{{ room.status }}</Badge></TableCell>
              <TableCell>
                <div class="table-actions">
                  <UiButton size="xs" variant="ghost" @click="editRoom(room)">编辑</UiButton>
                  <UiButton size="xs" variant="ghost" @click="startRoom(room)">启动</UiButton>
                  <UiButton size="xs" variant="ghost" @click="duplicateRoom(room)">复制</UiButton>
                  <UiButton size="xs" variant="destructive" @click="deleteRoom(room)">删除</UiButton>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </ShadcnTable>
      </CardContent>
      <CardFooter class="add-room-button">
        <UiButton @click="createNewRoom"><Plus data-icon="inline-start" />创建新房间</UiButton>
      </CardFooter>
    </Card>

    <UiDialog v-model:open="startRoomDialogVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>启动房间服务器</DialogTitle>
          <DialogDescription v-if="currentRoom">配置“{{ currentRoom.name }}”的启动范围和服务端模式。</DialogDescription>
        </DialogHeader>
        <FieldGroup v-if="currentRoom">
          <FieldSet>
            <FieldLegend variant="label">启动模式</FieldLegend>
            <RadioGroup v-model="startForm.worldType" class="radio-list">
              <Field v-for="option in worldTypeOptions" :key="option.value" orientation="horizontal">
                <RadioGroupItem :id="`world-${option.value}`" :value="option.value" />
                <FieldLabel :for="`world-${option.value}`" class="font-normal">{{ option.label }}</FieldLabel>
              </Field>
            </RadioGroup>
          </FieldSet>
          <Field>
            <FieldLabel>服务器模式</FieldLabel>
            <UiSelect v-model="startForm.serverMode">
              <SelectTrigger class="w-full"><SelectValue placeholder="选择服务器模式" /></SelectTrigger>
              <SelectContent><SelectGroup>
                <SelectItem value="32">普通模式</SelectItem>
                <SelectItem value="64">专家模式</SelectItem>
              </SelectGroup></SelectContent>
            </UiSelect>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" @click="startRoomDialogVisible = false">取消</UiButton>
          <UiButton :disabled="startLoading" @click="confirmStartRoom">
            <Spinner v-if="startLoading" data-icon="inline-start" />
            <Play v-else data-icon="inline-start" />
            启动
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { Gamepad2, Globe2, Lock, PackageOpen, Play, Plus, RefreshCw, Settings, Sun } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { roomApi } from '@/api/index';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { confirmAction } from '@/lib/feedback';

const ROOM_SECTIONS = [
  { path: '/servers/room', title: '基本设置', description: '配置房间的基本信息和样式', icon: Settings, features: ['房间名称', '房间描述', '房间风格'] },
  { path: '/servers/room/permissions', title: '权限设置', description: '管理房间的访问权限和玩家权限', icon: Lock, features: ['访问控制', '玩家权限', '白名单管理'] },
  { path: '/servers/room/gameplay', title: '游戏设置', description: '调整房间的游戏规则和难度设置', icon: Gamepad2, features: ['游戏模式', '难度设置', '资源设置'] },
  { path: '/servers/room/mods', title: '模组设置', description: '管理房间使用的模组和配置', icon: PackageOpen, features: ['模组选择', '模组配置', '模组兼容性'] },
  { path: '/servers/room/seasons', title: '季节设置', description: '调整房间的季节时长和天气设置', icon: Sun, features: ['季节长度', '天气效果', '特殊事件'] },
  { path: '/servers/room/world', title: '世界设置', description: '配置世界生成和资源分布', icon: Globe2, features: ['地图大小', '资源分布', '地形设置'] }
];

export default {
  name: 'RoomMenu',
  components: {
    Badge, UiButton, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
    UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field,
    FieldGroup, FieldLabel, FieldLegend, FieldSet, Play, Plus, RadioGroup, RadioGroupItem,
    RefreshCw, UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
    Spinner, ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow
  },
  data() {
    return {
      roomSections: ROOM_SECTIONS,
      worldTypeOptions: [
        { value: 'both', label: '完整房间（主世界 + 洞穴）' },
        { value: 'forest', label: '仅主世界' },
        { value: 'cave', label: '仅洞穴' },
        { value: 'unknown', label: '仅其他世界' }
      ],
      activeRooms: [
        {
          id: 1,
          name: '饥荒联机版主世界',
          players: '12/20',
          mode: '生存模式',
          style: 'default',
          styleName: '默认风格',
          status: '开放'
        },
        {
          id: 2,
          name: '洞穴探险',
          players: '8/16',
          mode: '冒险模式',
          style: 'cave',
          styleName: '洞穴风格',
          status: '开放'
        },
        {
          id: 3,
          name: '永冬世界',
          players: '5/10',
          mode: '困难模式',
          style: 'winter',
          styleName: '冬季风格',
          status: '开放'
        },
        {
          id: 4,
          name: '测试房间',
          players: '1/8',
          mode: '创造模式',
          style: 'desert',
          styleName: '沙漠风格',
          status: '关闭'
        }
      ],
      startRoomDialogVisible: false,
      startForm: {
        worldType: 'both',
        serverMode: '32'
      },
      currentRoom: null,
      startLoading: false
    }
  },
  methods: {
    navigateTo(path) {
      this.$router.push(path);
    },
    refreshRooms() {
      toast.success('房间列表已刷新');
    },
    editRoom() {
      this.$router.push('/servers/room');
      // 可以传递房间ID作为参数，以便加载特定房间的设置
      // this.$router.push({ path: '/servers/room', query: { id: room.id } });
    },
    async duplicateRoom(room) {
      try {
        await confirmAction(`确定要复制房间 "${room.name}" 吗?`, '复制房间');
        toast.success(`已复制房间 ${room.name}`);
      } catch {
        toast.info('已取消操作');
      }
    },
    async deleteRoom(room) {
      try {
        await confirmAction(`确定要删除房间 "${room.name}" 吗? 此操作不可恢复!`, '删除房间', { destructive: true });
        toast.success(`已删除房间 ${room.name}`);
      } catch {
        toast.info('已取消操作');
      }
    },
    createNewRoom() {
      this.$router.push('/servers/room');
    },
    startRoom(room) {
      this.currentRoom = room;
      this.startRoomDialogVisible = true;
    },
    confirmStartRoom() {
      if (!this.currentRoom || !this.currentRoom.id) {
        toast.error('无法获取房间信息');
        return;
      }
      this.startLoading = true;
      const archiveName = this.currentRoom.id.toString();
      const { worldType, serverMode } = this.startForm;
      
      if (worldType === 'both') {
        // 获取所有世界列表，然后为每个世界发起请求
        roomApi.getRoomWorlds(archiveName)
          .then(worlds => {
            if (!worlds || worlds.length === 0) {
              // 如果没有找到世界，则默认启动Forest1和Caves1
              const startPromises = [
                roomApi.startRoom({
                  archive_name: archiveName,
                  world_name: "Forest1",
                  server_mode: serverMode,
                  world_type: "forest"
                }),
                roomApi.startRoom({
                  archive_name: archiveName,
                  world_name: "Caves2",
                  server_mode: serverMode,
                  world_type: "cave"
                })
              ];
              return Promise.all(startPromises);
            } else {
              // 为每个世界单独发起请求
              const startPromises = worlds.map(world => {
                // 使用API返回的type字段，对于unknown类型的世界，根据名称推断类型
                let worldType = world.type;
                // 对于unknown类型，如果需要启动，需要推断一个有效的type(forest或cave)
                if (worldType === 'unknown') {
                  worldType = world.name.toLowerCase().includes('forest') ? 'forest' : 'cave';
                }
                
                return roomApi.startRoom({
                  archive_name: archiveName,
                  world_name: world.worldName || world.name,
                  server_mode: serverMode,
                  world_type: worldType
                });
              });
              return Promise.all(startPromises);
            }
          })
          .then(() => {
            toast.success('房间启动成功');
          })
          .catch(error => {
            toast.error('启动房间失败: ' + (error.message || '未知错误'));
          })
          .finally(() => {
            this.startRoomDialogVisible = false;
            this.startLoading = false;
          });
      } else if (worldType === 'unknown') {
        // 处理特殊情况：用户选择启动unknown类型的世界
        roomApi.getRoomWorlds(archiveName)
          .then(worlds => {
            // 过滤出unknown类型的世界
            const filteredWorlds = worlds.filter(world => world.type === 'unknown');
            if (filteredWorlds.length === 0) {
              toast.warning('没有找到其他类型的世界');
              this.startLoading = false;
              this.startRoomDialogVisible = false;
              return;
            }
            
            // 为每个unknown世界启动，根据名称推断类型
            const startPromises = filteredWorlds.map(world => {
              const inferredType = world.name.toLowerCase().includes('forest') ? 'forest' : 'cave';
              return roomApi.startRoom({
                archive_name: archiveName,
                world_name: world.worldName || world.name,
                server_mode: serverMode,
                world_type: inferredType
              });
            });
            
            return Promise.all(startPromises);
          })
          .then(responses => {
            if (responses) {
              toast.success('其他类型世界启动成功');
            }
          })
          .catch(error => {
            toast.error('启动世界失败: ' + (error.message || '未知错误'));
          })
          .finally(() => {
            this.startRoomDialogVisible = false;
            this.startLoading = false;
          });
      } else {
        roomApi.getRoomWorlds(archiveName)
          .then(worlds => {
            // 严格使用API返回的type字段进行过滤
            const filteredWorlds = worlds.filter(world => world.type === worldType);
            if (filteredWorlds.length === 0) {
              const defaultWorldName = worldType === 'forest' ? 'Forest1' : 'Caves1';
              return roomApi.startRoom({
                archive_name: archiveName,
                world_name: defaultWorldName,
                server_mode: serverMode,
                world_type: worldType
              });
            } else {
              const worldToStart = filteredWorlds[0];
              return roomApi.startRoom({
                archive_name: archiveName,
                world_name: worldToStart.worldName || worldToStart.name,
                server_mode: serverMode,
                world_type: worldToStart.type
              });
            }
          })
          .then(response => {
            if (response && (response.status === 200 || (response.data && response.data.status === 200))) {
              toast.success(`${worldType === 'forest' ? '主世界' : '洞穴世界'}启动成功`);
            } else {
              toast.error(response && response.msg ? response.msg : '启动世界失败');
            }
          })
          .catch(error => {
            toast.error('启动世界失败: ' + (error.message || '未知错误'));
          })
          .finally(() => {
            this.startRoomDialogVisible = false;
            this.startLoading = false;
          });
      }
    }
  }
}
</script>

<style scoped>
.room-menu-page {
  width: 100%;
  min-width: 0;
}

.page-header {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
}

.page-header p {
  margin: 2px 0 0;
  color: var(--muted-foreground);
  font-size: 13px;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.menu-card {
  min-height: 164px;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.menu-card:hover {
  border-color: var(--ring);
  background: var(--muted);
}

.menu-card-header {
  display: flex;
  align-items: flex-start;
  flex-direction: row;
  gap: 12px;
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

.card-features {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.active-rooms-card {
  margin-top: 16px;
}

.active-rooms-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-direction: row;
  gap: 12px;
}

.add-room-button {
  justify-content: flex-end;
}

.table-actions,
.radio-list {
  display: flex;
  gap: 6px;
}

.table-actions {
  flex-wrap: wrap;
}

.radio-list {
  flex-direction: column;
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

  .active-rooms-header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>

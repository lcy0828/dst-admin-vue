<template>
  <div class="server-list-page">
    <div class="page-header">
      <div class="title-container">
        <Server />
        <span>服务器状态监控</span>
      </div>
      <UiButton size="sm" variant="outline" :disabled="loading" @click="refreshData"><RefreshCw data-icon="inline-start" />刷新</UiButton>
    </div>

    <Card class="filter-container">
      <CardContent class="filter-content">
        <Tabs v-model="activeTab" @update:model-value="handleTabChange">
          <TabsList>
            <TabsTrigger value="all">全部服务器</TabsTrigger><TabsTrigger value="local">本机服务器</TabsTrigger>
            <TabsTrigger value="docker" disabled>Docker</TabsTrigger><TabsTrigger value="remote" disabled>远程</TabsTrigger><TabsTrigger value="k8s" disabled>K8s</TabsTrigger>
          </TabsList>
        </Tabs>

        <div class="filter-options">
          <UiSelect v-model="roomFilter"><SelectTrigger><SelectValue placeholder="按存档筛选" /></SelectTrigger><SelectContent><SelectGroup>
            <SelectItem value="all">全部存档</SelectItem><SelectItem v-for="room in roomList" :key="room.id" :value="room.id">{{ room.name }}</SelectItem>
          </SelectGroup></SelectContent></UiSelect>
          <UiSelect v-model="typeFilter"><SelectTrigger><SelectValue placeholder="按类型筛选" /></SelectTrigger><SelectContent><SelectGroup>
            <SelectItem value="all">全部类型</SelectItem><SelectItem value="forest">森林服务器</SelectItem><SelectItem value="cave">洞穴服务器</SelectItem>
          </SelectGroup></SelectContent></UiSelect>
          <UiSelect v-model="statusFilter"><SelectTrigger><SelectValue placeholder="按状态筛选" /></SelectTrigger><SelectContent><SelectGroup>
            <SelectItem value="all">全部状态</SelectItem><SelectItem value="online">在线</SelectItem><SelectItem value="offline">离线</SelectItem><SelectItem value="restarting">重启中</SelectItem>
          </SelectGroup></SelectContent></UiSelect>
          <UiSelect v-model="closedTimeFilter"><SelectTrigger><SelectValue placeholder="按关闭时间筛选" /></SelectTrigger><SelectContent><SelectGroup>
            <SelectItem value="all">显示所有</SelectItem><SelectItem value="1">1 小时内关闭</SelectItem><SelectItem value="6">6 小时内关闭</SelectItem>
            <SelectItem value="12">12 小时内关闭</SelectItem><SelectItem value="24">24 小时内关闭</SelectItem><SelectItem value="72">3 天内关闭</SelectItem><SelectItem value="168">7 天内关闭</SelectItem>
          </SelectGroup></SelectContent></UiSelect>
        </div>
      </CardContent>
    </Card>

    <Card class="server-table-container">
      <CardContent class="table-content">
        <div v-if="loading" class="loading-state"><Spinner /><span>正在读取服务器状态...</span></div>
        <ShadcnTable v-else-if="filteredServerList.length">
          <TableHeader><TableRow>
            <TableHead>服务器名称</TableHead><TableHead>玩家</TableHead><TableHead>天数</TableHead><TableHead>季节</TableHead>
            <TableHead>服务器模式</TableHead><TableHead>运行时间</TableHead><TableHead>部署方式</TableHead><TableHead>操作</TableHead>
          </TableRow></TableHeader>
          <TableBody><TableRow v-for="server in filteredServerList" :key="server.session_name">
            <TableCell>
            <div class="server-name-container">
              <span class="server-status" :class="server.status === 'running' ? 'online' : 'offline'"></span>
              <Badge variant="outline">{{ getWorldTypeName(server.world_name) }}</Badge>
              <div class="server-room">{{ server.archive_name }}</div>
            </div>
            </TableCell>
            <TableCell>{{ server.players }}</TableCell><TableCell>{{ server.days }}</TableCell>
            <TableCell><Badge v-if="server.season" variant="secondary">{{ server.season }}</Badge><span v-else>-</span></TableCell>
            <TableCell><Badge v-if="server.server_mode" variant="outline">{{ getServerModeText(server.server_mode) }}</Badge><span v-else>-</span></TableCell>
            <TableCell>{{ formatTimeDiff(Date.now() - new Date(server.start_time).getTime()) }}</TableCell><TableCell><Badge variant="secondary">本地</Badge></TableCell>
            <TableCell><div class="operation-buttons">
              <UiButton size="xs" :variant="server.status === 'running' ? 'destructive' : 'default'" @click="handleServerAction(server)">{{ server.status === 'running' ? '停止' : '启动' }}</UiButton>
              <UiButton size="xs" variant="outline" @click="handleConfigure(server)">配置</UiButton>
            </div></TableCell>
          </TableRow></TableBody>
        </ShadcnTable>
        <Empty v-else>
          <EmptyHeader><EmptyMedia variant="icon"><ServerOff /></EmptyMedia><EmptyTitle>暂无服务器数据</EmptyTitle><EmptyDescription>创建房间后，可以在这里启动和监控服务器。</EmptyDescription></EmptyHeader>
          <EmptyContent class="empty-actions"><UiButton @click="navigateToRoomCreation">创建新房间</UiButton><UiButton variant="outline" @click="showStartRoomDialog">启动现有房间</UiButton></EmptyContent>
        </Empty>
      </CardContent>
    </Card>

    <UiDialog v-model:open="startRoomDialogVisible">
      <DialogContent>
        <DialogHeader><DialogTitle>选择并启动房间</DialogTitle><DialogDescription>选择房间、世界分片和服务端运行模式。</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field><FieldLabel>选择房间</FieldLabel><UiSelect v-model="startRoomForm.roomIndex"><SelectTrigger class="w-full"><SelectValue placeholder="请选择房间" /></SelectTrigger><SelectContent><SelectGroup>
            <SelectItem v-for="(room, index) in roomList" :key="room.id" :value="String(index)">{{ room.name }}</SelectItem>
          </SelectGroup></SelectContent></UiSelect></Field>
          <FieldSet v-if="startRoomForm.roomIndex !== ''">
            <FieldLegend variant="label">选择世界</FieldLegend>
            <FieldGroup>
              <Field v-for="world in roomList[Number(startRoomForm.roomIndex)].worlds" :key="world.type" orientation="horizontal">
                <UiCheckbox :id="`world-${world.type}`" :model-value="isWorldSelected(world)" @update:model-value="toggleWorld(world, $event)" />
                <FieldLabel :for="`world-${world.type}`" class="font-normal">{{ world.name }}</FieldLabel>
              </Field>
            </FieldGroup>
          </FieldSet>
          <Field><FieldLabel>服务器模式</FieldLabel><UiSelect v-model="startRoomForm.serverMode"><SelectTrigger class="w-full"><SelectValue placeholder="选择服务器模式" /></SelectTrigger><SelectContent><SelectGroup>
            <SelectItem value="32">32 位</SelectItem><SelectItem value="64">64 位</SelectItem><SelectItem value="luajit">LuaJit</SelectItem>
          </SelectGroup></SelectContent></UiSelect>
            <FieldDescription>{{ serverModeDescription }}</FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter><UiButton variant="outline" @click="startRoomDialogVisible = false">取消</UiButton><UiButton :disabled="startRoomLoading" @click="handleStartRoomFrom"><Spinner v-if="startRoomLoading" data-icon="inline-start" />启动</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { RefreshCw, Server, ServerOff } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { systemApi, roomApi } from '@/api/index';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox as UiCheckbox } from '@/components/ui/checkbox';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { confirmAction } from '@/lib/feedback';
import { formatTimeDiff } from '@/utils/dateUtils';

export default {
  name: 'ServerList',
  components: {
    Badge, Card, CardContent, DialogContent, DialogDescription, DialogFooter, DialogHeader,
    DialogTitle, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle,
    Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet, RefreshCw, SelectContent,
    SelectGroup, SelectItem, SelectTrigger, SelectValue, Server, ServerOff, ShadcnTable, Spinner,
    TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList, TabsTrigger, UiButton,
    UiCheckbox, UiDialog, UiSelect
  },
  data() {
    return {
      formatTimeDiff,
      loading: false,
      activeTab: 'all',
      roomFilter: '',
      typeFilter: '',
      statusFilter: '',
      closedTimeFilter: 'all',
      serverList: [],
      roomList: [],
      startRoomDialogVisible: false,
      startRoomForm: {
        roomIndex: '',
        worldType: [],
        serverMode: '32'
      },
      startRoomLoading: false,
      rules: {
        worldType: [
            { type: 'array', required: true, message: '请至少选择一个世界', trigger: 'change' }
          ],
      }
    };
  },
  computed: {
    filteredServerList() {
      let result = this.serverList;

      if (this.roomFilter && this.roomFilter !== 'all') {
        result = result.filter(server => server.room_id === this.roomFilter || server.archive_name === this.roomFilter);
      }

      // 根据标签页筛选
      if (this.activeTab !== 'all' && this.activeTab !== 'local') {
        // 当前只有本机服务器，所以当选择本机服务器标签时，显示所有服务器
        // 其他标签页都是未来功能，已经禁用，不会进入这个分支
        const deploymentMap = {
          'docker': 'Docker',
          'remote': '远程',
          'k8s': 'K8s'
        };
        result = result.filter(server => server.deployment === deploymentMap[this.activeTab]);
      }

      // 根据服务器类型筛选
      if (this.typeFilter && this.typeFilter !== 'all') {
        result = result.filter(server => {
          // 根据 world_name 判断服务器类型
          const worldName = server.world_name || '';
          const lowerWorldName = worldName.toLowerCase();

          if (this.typeFilter === 'forest') {
            return lowerWorldName.includes('forest');
          } else if (this.typeFilter === 'cave') {
            return lowerWorldName.includes('cave');
          }

          return false;
        });
      }

      // 根据状态筛选
      if (this.statusFilter && this.statusFilter !== 'all') {
        const statusMap = {
          'online': 'running',
          'offline': 'stopped'
        };
        result = result.filter(server => server.status === statusMap[this.statusFilter]);
      }

      // 根据关闭时间筛选
      if (this.closedTimeFilter && this.closedTimeFilter !== 'all') {
        const hours = parseInt(this.closedTimeFilter);
        if (!isNaN(hours)) {
          const now = new Date();
          const cutoffTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

          result = result.filter(server => {
            // 只对离线的服务器进行筛选
            if (server.status !== 'stopped') {
              return true;
            }

            // 提取服务器关闭时间
            const startTime = server.start_time;
            if (!startTime) {
              return true; // 如果没有开始时间，默认显示
            }

            try {
              const serverCloseTime = new Date(startTime);
              // 如果服务器关闭时间在截止时间之后，则显示
              return serverCloseTime >= cutoffTime;
            } catch (e) {
              console.error('解析服务器关闭时间出错:', e);
              return true; // 解析出错时默认显示
            }
          });
        }
      }

      return result;
    },
    serverModeDescription() {
      if (this.startRoomForm.serverMode === '64') return '64 位模式可使用更多内存，适合大型模组房间。';
      if (this.startRoomForm.serverMode === 'luajit') return 'LuaJit 模式使用 JIT 编译器，适合需要该运行时的模组。';
      return '32 位模式适合兼容性要求较高的房间。';
    }
  },
  created() {
    this.fetchData();
  },
  methods: {
    fetchData() {
      this.loading = true;
      this.serverList = [];
      return systemApi.getTmuxServers().then(res => {
        this.serverList = res.data || [];
        if (res.msg) toast.success(res.msg);
      }).catch(err => {
        console.error(err);
      }).finally(() => {
        this.loading = false;
      });
    },
    fetchRooms() {
      roomApi.getRoomList()
        .then(response => {
          this.roomList = response.data;
        })
        .catch(error => {
          console.error(error);
        });
    },
    refreshData() {
      this.fetchData();
    },
    handleTabChange() {
      // 切换标签页时调整筛选
    },
    filterServers() {
      // 根据筛选条件过滤服务器列表
    },
    navigateToRoomCreation() {
      // 跳转到房间创建页面
      this.$router.push('/rooms/settings');
    },
    navigateToRoom() {
    },
    getServerModeText(mode) {
      switch(mode) {
        case '32': return '32位';
        case '64': return '64位';
        case 'luajit': return 'LuaJit';
        default: return mode;
      }
    },

    getWorldTypeName(worldName) {
      if (!worldName) return '未知';

      const lowerName = worldName.toLowerCase();
      if (lowerName.includes('forest')) {
        return '森林';
      } else if (lowerName.includes('cave')) {
        return '洞穴';
      } else {
        return '未知';
      }
    },
    showStartRoomDialog() {
      this.startRoomDialogVisible = true;
      this.fetchRooms();
    },

    isWorldSelected(world) {
      return this.startRoomForm.worldType.some(item => item.type === world.type && item.name === world.name);
    },
    toggleWorld(world, checked) {
      if (checked) {
        if (!this.isWorldSelected(world)) this.startRoomForm.worldType.push(world);
      } else {
        this.startRoomForm.worldType = this.startRoomForm.worldType.filter(item => item.type !== world.type || item.name !== world.name);
      }
    },
    handleStartRoomFrom() {
      if (this.startRoomForm.roomIndex === '' || this.startRoomForm.worldType.length === 0) {
        toast.warning(this.startRoomForm.roomIndex === '' ? '请选择房间' : '请至少选择一个世界');
        return;
      }
          let promises = [];
          this.startRoomForm.worldType.forEach(world => {
            let params = {
              archive_name: this.roomList[Number(this.startRoomForm.roomIndex)].name,
              server_mode: this.startRoomForm.serverMode,
              world_name: world.name,
              world_type: world.type
            }
            promises.push(roomApi.startRoom(params));
          });
          Promise.all(promises).then(() => {
            toast.success('启动成功');
            this.startRoomDialogVisible = false;
            this.fetchData();
          }).catch(error => {
            console.error(error);
            toast.error(error.message || '启动失败');
          });
    },
    async handleServerAction(server) {
      if (server.status === 'running') {
        try {
          await confirmAction(`确定要停止 "${server.archive_name}" 吗？`, '停止服务器', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
          });
          this.loading = true;
          systemApi.stopTmuxServer({session_name: server.session_name}).then(res => {
            return this.fetchData().then(() => {
              toast.success(res.msg || '停止完成');
            });
          }).catch(() => {
            toast.error('停止失败!');
          }).finally(() => {
            this.loading = false;
          });
        } catch {
          toast.info('取消停止');
        }
      }
    },
    handleConfigure(server) {
      this.$router.push({
        path: '/worlds/settings',
        query: { roomName: server.archive_name, worldName: server.world_name }
      });
    }
  }
};
</script>

<style scoped>
.server-list-page {
  width: 100%;
  min-width: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.title-container {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
  color: var(--text-primary);
}

.filter-container {
  margin-bottom: 16px;
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

.server-name-container {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.server-status {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
  box-shadow: 0 0 0 3px var(--surface-muted);
}

.server-status.online {
  background-color: #4f8a5b;
}

.server-status.offline {
  background-color: #c94f4f;
}

.server-status.restarting {
  background-color: #d99b32;
}

.server-name {
  font-weight: bold;
  margin-right: 6px;
  word-break: break-all;
}

.server-type-tag {
  margin: 0;
}

.server-room {
  font-size: 12px;
  color: var(--text-secondary);
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

.server-offline {
  color: var(--text-secondary);
  font-style: italic;
}

.mode-description {
  margin-top: 6px;
  padding: 8px 10px;
  background: var(--surface-muted);
  border-left: 2px solid var(--primary-color);
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

</style>

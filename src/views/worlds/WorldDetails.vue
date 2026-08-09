<template>
  <div class="world-details-page">
    <header class="page-header">
      <div>
        <h1>世界详情</h1>
        <p>查看世界基础信息，并执行运行、备份和维护操作。</p>
      </div>
      <div class="header-actions">
        <UiButton variant="outline" @click="goBack"><ArrowLeft data-icon="inline-start" />返回列表</UiButton>
        <UiButton :disabled="!canConfigureWorld(world)" :title="!canConfigureWorld(world) ? '请先停止或清理该世界' : ''" @click="editWorld"><Pencil data-icon="inline-start" />编辑世界</UiButton>
      </div>
    </header>

    <div v-if="loading && !world.id" class="details-skeleton" aria-busy="true" aria-label="正在加载世界信息">
      <Skeleton class="h-52 w-full" />
      <Skeleton class="h-40 w-full" />
    </div>

    <Alert v-else-if="loadError" variant="destructive">
      <CircleAlert />
      <AlertTitle>世界信息加载失败</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="loadWorldData">重新加载</UiButton></AlertAction>
    </Alert>

    <div v-else-if="world.id" class="details-layout">
      <div class="main-column">
        <Alert v-if="getWorldStatusMessage(world)" :variant="world.status === 'failed' ? 'destructive' : 'default'">
          <CircleAlert />
          <AlertTitle>{{ world.status === 'failed' ? '世界启动失败' : '世界运行提示' }}</AlertTitle>
          <AlertDescription>{{ getWorldStatusMessage(world) }}</AlertDescription>
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle>世界信息</CardTitle>
            <CardDescription>{{ world.roomName ? `所属房间：${world.roomName}` : '世界基础信息' }}</CardDescription>
            <CardAction><Badge :variant="getStatusTag(world)">{{ getStatusName(world) }}</Badge></CardAction>
          </CardHeader>
          <CardContent>
            <dl class="world-info">
              <div class="info-item"><dt>世界名称</dt><dd>{{ world.name || '--' }}</dd></div>
              <div class="info-item"><dt>世界类型</dt><dd><Badge :variant="getTypeTag(world.type)">{{ getTypeName(world.type) }}</Badge></dd></div>
              <div class="info-item"><dt>当前季节</dt><dd>{{ world.season || '--' }}</dd></div>
              <div class="info-item"><dt>当前天数</dt><dd>{{ world.day ?? '--' }}</dd></div>
              <div class="info-item"><dt>描述</dt><dd class="description">{{ world.description || '--' }}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>世界统计</CardTitle><CardDescription>当前后端可以提供的世界统计。</CardDescription></CardHeader>
          <CardContent class="stats-grid">
            <div class="stat-item"><strong>{{ world.day ?? '--' }}</strong><span>总游戏天数</span></div>
            <Alert>
              <Activity />
              <AlertTitle>更多统计暂不可用</AlertTitle>
              <AlertDescription>当前后端尚未返回玩家访问次数和死亡次数。</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      <div class="side-column">
        <Card>
          <CardHeader><CardTitle>快捷操作</CardTitle><CardDescription>操作当前世界及其所属房间。</CardDescription></CardHeader>
          <CardContent class="action-list">
            <UiButton
              :variant="getWorldPrimaryAction(world).variant"
              :disabled="getWorldPrimaryAction(world).disabled || loading"
              @click="toggleWorldStatus"
            >
              <Spinner v-if="loading || isWorldStarting(world)" data-icon="inline-start" />
              <Square v-else-if="world.status === 'running'" data-icon="inline-start" />
              <Play v-else-if="getWorldPrimaryAction(world).kind === 'start'" data-icon="inline-start" />
              {{ getWorldPrimaryAction(world).label }}
            </UiButton>
            <UiButton v-if="world.status === 'failed'" variant="outline" :disabled="loading || !canCleanFailedWorld(world)" @click="cleanupFailedWorld"><Square data-icon="inline-start" />清理失败会话</UiButton>
            <UiButton variant="outline" :disabled="loading || !canStopWorld(world)" @click="regenerateWorld"><RefreshCw data-icon="inline-start" />重新生成</UiButton>
            <UiButton variant="outline" :disabled="loading" @click="backupWorld"><Archive data-icon="inline-start" />备份世界</UiButton>
            <UiButton variant="destructive" :disabled="loading || !canDeleteWorld(world)" @click="deleteWorld"><Trash2 data-icon="inline-start" />删除世界</UiButton>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>最近活动</CardTitle><CardDescription>当前世界的操作与状态变化记录。</CardDescription></CardHeader>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Activity /></EmptyMedia>
                <EmptyTitle>暂无真实活动数据</EmptyTitle>
                <EmptyDescription>后端返回活动记录后将在这里显示。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script>
import { Activity, Archive, ArrowLeft, CircleAlert, Pencil, Play, RefreshCw, Square, Trash2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { roomApi } from '../../api/index';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { confirmAction, promptText } from '@/lib/feedback';
import {
  canCleanFailedWorld as canCleanFailedRuntimeWorld,
  canConfigureWorld as canConfigureRuntimeWorld,
  canDeleteWorld as canDeleteRuntimeWorld,
  canStopWorld,
  isWorldStarting,
  worldPrimaryAction,
  worldStatusLabel,
  worldStatusMessage,
  worldStatusVariant
} from '@/lib/worldRuntimeStatus.mjs';

export default {
  name: 'WorldDetails',
  components: {
    Activity,
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Archive,
    ArrowLeft,
    Badge,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CircleAlert,
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    Pencil,
    Play,
    RefreshCw,
    Skeleton,
    Spinner,
    Square,
    Trash2,
    UiButton
  },
  data() {
    return {
      loading: false,
      loadError: '',
      roomId: null,
      worldId: null,
      world: {
        id: null,
        name: '',
        type: 'unknown',
        season: null,
        day: null,
        status: 'unknown',
        description: '',
        controlAvailable: false,
        statusMessage: ''
      }
    }
  },
  methods: {
    goBack() {
      this.$router.push('/worlds/list');
    },
    editWorld() {
      this.$router.push({
        path: '/worlds/settings',
        query: { id: this.worldId, roomId: this.roomId, worldId: this.worldId }
      });
    },
    getStatusName(status) {
      return worldStatusLabel(status);
    },
    getStatusTag(status) {
      return worldStatusVariant(status);
    },
    getWorldStatusMessage(world) {
      return worldStatusMessage(world);
    },
    getWorldPrimaryAction(world) {
      return worldPrimaryAction(world);
    },
    isWorldStarting(world) {
      return isWorldStarting(world);
    },
    canStopWorld(world) {
      return canStopWorld(world);
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
    getTypeName(type) {
      if (type === 'forest' || type === 'master') return '主世界';
      if (type === 'cave') return '洞穴';
      return '其他';
    },
    getTypeTag(type) {
      if (type === 'cave') return 'secondary';
      return 'outline';
    },
    toggleWorldStatus() {
      const primaryAction = worldPrimaryAction(this.world);
      if (primaryAction.disabled || !primaryAction.kind) {
        toast.warning(worldStatusMessage(this.world) || '当前世界状态不可操作');
        return;
      }
      const action = primaryAction.kind === 'stop' ? '停止' : (this.world.status === 'failed' ? '重试启动' : '启动');
      confirmAction(`确定要${action}世界 "${this.world.name}" 吗?`, `${action}世界`, {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.loading = true;
        const request = { room_id: this.roomId, world_id: this.worldId };
        const operation = primaryAction.kind === 'stop'
          ? roomApi.stopRoom(request)
          : roomApi.startRoom(request);
        operation
          .then(async response => {
            await this.loadWorldData();
            toast.success(response.msg || `${action}完成`);
          })
          .catch(error => toast.error(`${action}失败：${error.message}`))
          .finally(() => { this.loading = false; });
      }).catch(() => {
        toast.info('已取消操作');
      });
    },
    async cleanupFailedWorld() {
      if (!canCleanFailedRuntimeWorld(this.world)) {
        toast.warning(worldStatusMessage(this.world) || '当前世界没有可清理的失败会话');
        return;
      }
      try {
        await confirmAction(`确定要停止并清理世界“${this.world.name}”的失败会话吗？`, '清理失败会话', {
          confirmButtonText: '确认清理',
          type: 'warning'
        });
      } catch {
        return;
      }

      this.loading = true;
      try {
        const response = await roomApi.stopRoom({ room_id: this.roomId, world_id: this.worldId });
        await this.loadWorldData();
        toast.success(response?.msg || '失败会话已清理');
      } catch (error) {
        toast.error(`清理失败：${error.message || '未知错误'}`);
      } finally {
        this.loading = false;
      }
    },
    async regenerateWorld() {
      if (!canStopWorld(this.world) && this.world.status === 'running') {
        toast.error('当前房间尚未接管，无法重新生成世界');
        return;
      }
      if (!canStopWorld(this.world)) {
        toast.warning('重新生成命令需要世界正在运行，请先启动世界');
        return;
      }
      let confirmation;
      try {
        const result = await promptText(
          `重新生成会清除世界“${this.world.name}”的当前进度。请输入完整房间名“${this.world.roomName}”确认`,
          '重新生成世界',
          {
            confirmButtonText: '确认重新生成',
            cancelButtonText: '取消',
            inputValidator: value => value === this.world.roomName || '房间名不匹配'
          }
        );
        confirmation = result.value;
      } catch {
        return;
      }

      this.loading = true;
      try {
        const response = await roomApi.regenerateWorld({
          room_id: this.roomId,
          world_id: this.worldId,
          confirmation
        });
        await this.loadWorldData();
        toast.success(response.msg || '重新生成命令已发送到世界进程');
      } catch (error) {
        toast.error(`重新生成世界失败：${error.message || '未知错误'}`);
      } finally {
        this.loading = false;
      }
    },
    backupWorld() {
      confirmAction(`v2 后端将备份世界 "${this.world.name}" 所属的整个房间 "${this.world.roomName}"，确定继续吗?`, '备份世界', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        this.loading = true;
        roomApi.backupRoom(this.roomId, `世界 ${this.world.name}`)
          .then(response => toast.success(response.msg || '房间备份已创建'))
          .catch(error => toast.error(`备份失败：${error.message}`))
          .finally(() => { this.loading = false; });
      }).catch(() => {
        toast.info('已取消操作');
      });
    },
    async deleteWorld() {
      if (!canDeleteRuntimeWorld(this.world)) {
        toast.warning(this.world.status === 'failed' ? '请先清理失败会话，再删除该世界' : '删除前请先停止该世界');
        return;
      }
      let confirmation;
      try {
        const result = await promptText(
          `世界“${this.world.name}”将移入可恢复目录。请输入完整房间名“${this.world.roomName}”确认`,
          '删除世界',
          {
            confirmButtonText: '移入恢复目录',
            cancelButtonText: '取消',
            inputValidator: value => value === this.world.roomName || '房间名不匹配'
          }
        );
        confirmation = result.value;
      } catch {
        return;
      }

      this.loading = true;
      try {
        const response = await roomApi.deleteWorld({
          room_id: this.roomId,
          world_id: this.worldId,
          confirmation
        });
        toast.success(response.msg || '世界已移入可恢复目录');
        await this.$router.replace('/worlds/list');
      } catch (error) {
        toast.error(`删除世界失败：${error.message || '未知错误'}`);
      } finally {
        this.loading = false;
      }
    },
    loadWorldData() {
      if (!this.roomId || !this.worldId) return;
      this.loading = true;
      this.loadError = '';
      return Promise.all([
        roomApi.getRoomDetail(this.roomId),
        roomApi.getRoomWorlds(this.roomId)
      ])
        .then(([roomResponse, worlds]) => {
          const world = worlds.find(item => item.id === this.worldId);
          if (!world) throw new Error('未找到指定世界');
          this.world = {
            ...world,
            roomName: roomResponse.data.name,
            description: world.description || ''
          };
        })
        .catch(error => {
          this.loadError = error.message || '无法读取世界详情';
          toast.error(`获取世界详情失败：${error.message}`);
        })
        .finally(() => { this.loading = false; });
    }
  },
  created() {
    const { id, roomId, worldId } = this.$route.query;
    if (roomId && (worldId || id)) {
      this.roomId = roomId;
      this.worldId = worldId || id;
      this.loadWorldData();
    } else {
      toast.error('未指定世界ID');
      this.goBack();
    }
  }
}
</script>

<style scoped>
.world-details-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  min-width: 0;
}

.page-header,
.header-actions {
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

.header-actions {
  gap: 8px;
}

.details-skeleton {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  gap: 24px;
}

.details-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  gap: 24px;
}

.main-column,
.side-column {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 24px;
}

.world-info {
  margin: 0;
}

.info-item {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.info-item:last-child {
  border-bottom: 0;
}

.info-item dt {
  color: var(--muted-foreground);
  font-size: 13px;
}

.info-item dd {
  min-width: 0;
  margin: 0;
}

.description {
  white-space: pre-line;
}

.stats-grid {
  display: grid;
  grid-template-columns: minmax(140px, 0.5fr) minmax(0, 1.5fr);
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
  padding-right: 12px;
  border-right: 1px solid var(--border);
}

.stat-item strong {
  font-size: 20px;
}

.stat-item span {
  color: var(--muted-foreground);
  font-size: 12px;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-list > * {
  width: 100%;
}

@media (max-width: 860px) {
  .details-skeleton,
  .details-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-item {
    padding: 0 0 12px;
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .header-actions > * {
    flex: 1;
  }
}
</style>

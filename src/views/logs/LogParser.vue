<template>
  <div class="app-container">
    <header class="page-heading">
      <div><h1>运行中世界日志</h1><p>查看当前运行中的世界，并进入对应的实时日志。</p></div>
      <UiButton size="sm" variant="outline" :disabled="loading" @click="getActiveParsers(true)">
        <Spinner v-if="loading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        刷新
      </UiButton>
    </header>

    <Alert v-if="loadError" variant="destructive">
      <FileWarning />
      <AlertTitle>世界状态加载失败</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" :disabled="loading" @click="getActiveParsers(true)">重试</UiButton></AlertAction>
    </Alert>

    <div v-if="loading && activeParsers.length === 0" class="loading-state">
      <Spinner />
      <span>正在读取世界状态...</span>
    </div>
    <Empty v-else-if="!loadError && activeParsers.length === 0">
      <EmptyHeader>
        <EmptyMedia variant="icon"><FileWarning /></EmptyMedia>
        <EmptyTitle>暂无运行中的世界</EmptyTitle>
        <EmptyDescription>启动房间世界后，可在这里查看对应的实时日志。</EmptyDescription>
      </EmptyHeader>
    </Empty>
    <div v-else-if="!loadError" class="parsers-container">
          <Card v-for="parser in activeParsers" :key="parser.id" class="parser-card">
            <CardHeader class="parser-header">
              <div class="parser-title">
                <div class="type-indicator" aria-hidden="true">
                  <Sun v-if="parser.server_type === 'Forest'" />
                  <Moon v-else />
                </div>
                <div class="parser-identity">
                  <CardTitle>{{ parser.archive_name }} / {{ parser.world_name }}</CardTitle>
                  <CardDescription>{{ getServerTypeLabel(parser.server_type) }}</CardDescription>
                  <div class="parser-subtitle">
                    <Badge :variant="getStatusVariant(parser.status)">{{ getStatusLabel(parser.status) }}</Badge>
                  </div>
                </div>
              </div>
              <Badge variant="secondary">ID: {{ formatParserId(parser.id) }}</Badge>
            </CardHeader>
            <CardContent>
              <dl class="parser-info">
                <div class="info-item path-item"><dt>运行控制</dt><dd>{{ parser.control_available ? '可用' : (parser.status_message || '当前运行环境不可用') }}</dd></div>
              </dl>
            </CardContent>
            <CardFooter class="parser-actions">
              <UiButton size="sm" @click="viewLogs(parser)">
                <Eye data-icon="inline-start" />
                查看日志
              </UiButton>
              <UiButton
                variant="outline"
                size="sm"
                :disabled="parser.control_available === false || restartingParserId === parser.id"
                @click="restartWorld(parser)"
              >
                <Spinner v-if="restartingParserId === parser.id" data-icon="inline-start" />
                <RotateCw v-else data-icon="inline-start" />
                重启世界
              </UiButton>
            </CardFooter>
          </Card>
    </div>
  </div>
</template>

<script>
import { Eye, FileWarning, Moon, RefreshCw, RotateCw, Sun } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { logApi } from '@/api/index';
import { jobsV2API, roomsV2API } from '@/api/v2';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { confirmAction } from '@/lib/feedback';
import { RUNTIME_TARGET_CHANGED_EVENT } from '@/utils/runtimeTarget';

const TERMINAL_JOB_STATES = new Set(['succeeded', 'failed', 'canceled']);

export default {
  name: 'LogParser',
  components: {
    Alert, AlertAction, AlertDescription, AlertTitle, Badge, UiButton, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
    Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, Eye,
    FileWarning, Moon, RefreshCw, RotateCw, Spinner, Sun
  },
  data() {
    return {
      activeParsers: [],
      loading: false,
      loadError: '',
      restartingParserId: '',
      refreshSequence: 0
    };
  },
  created() {
    this.getActiveParsers();
  },
  mounted() {
    window.addEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange);
  },
  beforeUnmount() {
    window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, this.handleRuntimeTargetChange);
  },
  methods: {
    handleRuntimeTargetChange() {
      this.activeParsers = [];
      this.getActiveParsers();
    },
    async getActiveParsers(notify = false) {
      const requestSequence = ++this.refreshSequence;
      this.loading = true;
      this.loadError = '';
      try {
        const response = await logApi.getActiveLogParsers();
        if (requestSequence !== this.refreshSequence) return;
        if (response?.status === 200 && Array.isArray(response.data)) {
          this.activeParsers = response.data;
          if (notify) toast.success(response.msg || '运行中世界已刷新');
        } else {
          this.loadError = response?.msg || '后端没有返回有效的世界列表';
          toast.error(`获取运行中世界失败：${this.loadError}`);
          this.activeParsers = [];
        }
      } catch (error) {
        if (requestSequence !== this.refreshSequence) return;
        this.loadError = error.message || '未知错误';
        toast.error(`获取运行中世界失败：${this.loadError}`);
        this.activeParsers = [];
      } finally {
        if (requestSequence === this.refreshSequence) this.loading = false;
      }
    },
    viewLogs(parser) {
      this.$router.push({
        name: 'LogQuery',
        query: { archive: parser.archive_name, world: parser.world_name }
      });
    },
    async waitForJob(job) {
      let current = job;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        current = await jobsV2API.get(current.id);
        if (TERMINAL_JOB_STATES.has(current.status)) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (!TERMINAL_JOB_STATES.has(current.status)) throw new Error('重启任务仍在执行，请稍后刷新状态');
      if (current.status !== 'succeeded') {
        const failed = (current.targets || []).find(item => item.status === 'failed');
        throw new Error(failed?.error?.message || current.error?.message || '世界重启失败');
      }
      return current;
    },
    async restartWorld(parser) {
      if (parser.control_available === false) return;
      try {
        await confirmAction(
          `确定要重启“${parser.archive_name} / ${parser.world_name}”吗？在线玩家会暂时断开连接。`,
          '重启世界',
          { confirmButtonText: '确认重启', cancelButtonText: '取消', type: 'warning' }
        );
      } catch (error) {
        if (error === 'cancel' || error === 'close') return;
        toast.error(error.message || '无法确认重启操作');
        return;
      }
      this.restartingParserId = parser.id;
      try {
        const job = await roomsV2API.action(parser.room_id, 'restart', [parser.world_id]);
        await this.waitForJob(job);
        await this.getActiveParsers();
        toast.success(`${parser.archive_name} / ${parser.world_name} 已重新启动`);
      } catch (error) {
        toast.error(error.message || '重新启动失败');
      } finally {
        this.restartingParserId = '';
      }
    },
    getStatusVariant(status) {
      if (status === 'running') return 'default';
      if (status === 'stopped') return 'destructive';
      return 'secondary';
    },
    getStatusLabel(status) {
      return { running: '运行中', stopped: '已停止', starting: '启动中' }[status] || status || '未知状态';
    },
    getServerTypeLabel(type) {
      return { Forest: '森林世界', Caves: '洞穴世界', Cave: '洞穴世界' }[type] || type || '未知世界类型';
    },
    formatParserId(id) {
      return String(id || '-').split('_').pop();
    }
  }
};
</script>

<style scoped>
.app-container {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 24px;
}

.page-heading,
.parser-header,
.parser-title,
.parser-actions,
.loading-state {
  display: flex;
  align-items: center;
}

.page-heading,
.parser-header {
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.parser-title,
.parser-subtitle,
.parser-actions,
.loading-state {
  gap: 8px;
}

.page-heading {
  align-items: flex-start;
}

.page-heading h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
}

.page-heading p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.parsers-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
  gap: 12px;
}

.parser-card {
  min-width: 0;
}

.type-indicator {
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

.parser-subtitle {
  display: flex;
  margin-top: 6px;
}

.parser-identity {
  min-width: 0;
}

.parser-identity :deep([data-slot='card-title']) {
  overflow-wrap: anywhere;
}

.parser-info {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.info-item {
  min-width: 0;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.info-item:first-child {
  border-right: 1px solid var(--border);
}

.info-item dt {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.info-item dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.path-item {
  grid-column: 1 / -1;
  border-bottom: 0;
}

.path-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.parser-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.loading-state {
  justify-content: center;
  min-height: 180px;
  color: var(--muted-foreground);
  font-size: 13px;
}

@media (max-width: 640px) {
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .parser-actions {
    width: 100%;
  }
}
</style>

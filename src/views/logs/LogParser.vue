<template>
  <div class="app-container">
    <header class="page-heading">
      <div><h1>活跃日志解析器</h1><p>查看当前房间日志流和解析器状态。</p></div>
      <UiButton size="sm" variant="outline" :disabled="loading" @click="getActiveParsers">
        <Spinner v-if="loading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        刷新
      </UiButton>
    </header>

    <Alert v-if="loadError" variant="destructive">
      <FileWarning />
      <AlertTitle>解析器状态加载失败</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" :disabled="loading" @click="getActiveParsers">重试</UiButton></AlertAction>
    </Alert>

    <div v-if="loading && activeParsers.length === 0" class="loading-state">
      <Spinner />
      <span>正在读取解析器状态...</span>
    </div>
    <Empty v-else-if="!loadError && activeParsers.length === 0">
      <EmptyHeader>
        <EmptyMedia variant="icon"><FileWarning /></EmptyMedia>
        <EmptyTitle>暂无运行中的日志解析器</EmptyTitle>
        <EmptyDescription>启动房间后，可在这里查看对应的日志解析器。</EmptyDescription>
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
                <div class="info-item"><dt><Clock />最近活动</dt><dd>{{ formatTime(parser.last_activity) }}</dd></div>
                <div class="info-item"><dt>客户端数量</dt><dd>{{ parser.client_count == null ? '未提供' : parser.client_count }}</dd></div>
                <div class="info-item path-item"><dt><FileText />日志文件</dt><dd><code class="path-value">{{ parser.log_file || '后端未提供' }}</code></dd></div>
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
                :disabled="restartingParserId === parser.id"
                @click="restartParser(parser)"
              >
                <Spinner v-if="restartingParserId === parser.id" data-icon="inline-start" />
                <RotateCw v-else data-icon="inline-start" />
                重新启动
              </UiButton>
            </CardFooter>
          </Card>
    </div>
  </div>
</template>

<script>
import { Clock, Eye, FileText, FileWarning, Moon, RefreshCw, RotateCw, Sun } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { logApi } from '@/api/index';
import { jobsV2API, roomsV2API } from '@/api/v2';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';

const TERMINAL_JOB_STATES = new Set(['succeeded', 'failed', 'canceled']);

export default {
  name: 'LogParser',
  components: {
    Alert, AlertAction, AlertDescription, AlertTitle, Badge, UiButton, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
    Clock, Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, Eye, FileText,
    FileWarning, Moon, RefreshCw, RotateCw, Spinner, Sun
  },
  data() {
    return {
      activeParsers: [],
      loading: false,
      loadError: '',
      restartingParserId: ''
    };
  },
  created() {
    this.getActiveParsers();
  },
  methods: {
    async getActiveParsers() {
      this.loading = true;
      this.loadError = '';
      try {
        const response = await logApi.getActiveLogParsers();
        if (response && response.data) {
          if (Array.isArray(response.data)) this.activeParsers = response.data;
          else if (response.data.status === 200 && Array.isArray(response.data.data)) this.activeParsers = response.data.data;
          else {
            this.activeParsers = [];
            this.loadError = response.data.message || '后端没有返回有效的解析器列表';
          }
          if (response.data.msg) toast.success(response.data.msg);
        } else {
          this.loadError = '后端没有返回解析器数据';
          toast.error(`获取活跃解析器列表失败：${this.loadError}`);
          this.activeParsers = [];
        }
      } catch (error) {
        this.loadError = error.message || '未知错误';
        toast.error(`获取活跃解析器列表失败：${this.loadError}`);
        this.activeParsers = [];
      } finally {
        this.loading = false;
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
    async restartParser(parser) {
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
    formatTime(timestamp) {
      if (!timestamp) return '后端未提供';
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return '时间格式无效';
      return date.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
        minute: '2-digit', second: '2-digit', hour12: false
      });
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

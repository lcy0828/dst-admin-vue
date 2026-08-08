<template>
  <div class="app-container">
    <Card>
      <CardHeader class="header-container">
        <div>
          <CardTitle class="header-title">
            <Monitor />
            活跃日志解析器
          </CardTitle>
          <CardDescription>查看当前房间日志流和解析器状态。</CardDescription>
        </div>
        <UiButton size="sm" :disabled="loading" @click="getActiveParsers">
          <Spinner v-if="loading" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          刷新
        </UiButton>
      </CardHeader>
      <CardContent>
        <div v-if="loading && activeParsers.length === 0" class="loading-state">
          <Spinner />
          <span>正在读取解析器状态...</span>
        </div>
        <Empty v-else-if="activeParsers.length === 0">
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileWarning /></EmptyMedia>
            <EmptyTitle>暂无运行中的日志解析器</EmptyTitle>
            <EmptyDescription>启动房间后，可在这里查看对应的日志解析器。</EmptyDescription>
          </EmptyHeader>
        </Empty>
        <div v-else class="parsers-container">
          <Card v-for="parser in activeParsers" :key="parser.id" class="parser-card">
            <CardHeader class="parser-header">
              <div class="parser-title">
                <div class="type-indicator">
                  <Sun v-if="parser.server_type === 'Forest'" />
                  <Moon v-else />
                </div>
                <div>
                  <CardTitle>{{ parser.archive_name }} / {{ parser.world_name }}</CardTitle>
                  <div class="parser-subtitle">
                    <Badge variant="outline">{{ parser.server_type }}</Badge>
                    <Badge :variant="getStatusVariant(parser.status)">{{ parser.status }}</Badge>
                  </div>
                </div>
              </div>
              <Badge variant="secondary">ID: {{ parser.id.split('_').pop() }}</Badge>
            </CardHeader>
            <CardContent class="parser-info">
              <div class="info-item">
                <Clock />
                <span class="label">最近活动</span>
                <span class="value">{{ formatTime(parser.last_activity) }}</span>
              </div>
              <div class="info-item">
                <FileText />
                <span class="label">日志文件</span>
                <code class="value path-value">{{ parser.log_file }}</code>
              </div>
              <div class="info-statistics">
                <div class="stat-item">
                  <div class="stat-value">{{ parser.client_count == null ? '未提供' : parser.client_count }}</div>
                  <div class="stat-label">客户端数量</div>
                </div>
              </div>
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
      </CardContent>
    </Card>
  </div>
</template>

<script>
import { Clock, Eye, FileText, FileWarning, Monitor, Moon, RefreshCw, RotateCw, Sun } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { logApi } from '@/api/index';
import { jobsV2API, roomsV2API } from '@/api/v2';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';

const TERMINAL_JOB_STATES = new Set(['succeeded', 'failed', 'canceled']);

export default {
  name: 'LogParser',
  components: {
    Badge, UiButton, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
    Clock, Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, Eye, FileText,
    FileWarning, Monitor, Moon, RefreshCw, RotateCw, Spinner, Sun
  },
  data() {
    return {
      activeParsers: [],
      loading: false,
      restartingParserId: ''
    };
  },
  created() {
    this.getActiveParsers();
  },
  methods: {
    async getActiveParsers() {
      this.loading = true;
      try {
        const response = await logApi.getActiveLogParsers();
        if (response && response.data) {
          if (Array.isArray(response.data)) this.activeParsers = response.data;
          else if (response.data.status === 200 && Array.isArray(response.data.data)) this.activeParsers = response.data.data;
          else this.activeParsers = [];
          if (response.data.msg) toast.success(response.data.msg);
        } else {
          toast.error('获取活跃解析器列表失败: 无数据');
          this.activeParsers = [];
        }
      } catch (error) {
        toast.error('获取活跃解析器列表失败: ' + (error.message || '未知错误'));
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
      return date.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
        minute: '2-digit', second: '2-digit', hour12: false
      });
    },
    getStatusVariant(status) {
      if (status === 'running') return 'default';
      if (status === 'stopped') return 'destructive';
      return 'secondary';
    }
  }
};
</script>

<style scoped>
.header-container,
.parser-header,
.parser-title,
.info-item,
.parser-actions,
.loading-state {
  display: flex;
  align-items: center;
}

.header-container,
.parser-header {
  justify-content: space-between;
  flex-direction: row;
  gap: 12px;
}

.header-title,
.parser-title,
.parser-subtitle,
.info-item,
.parser-actions,
.loading-state {
  gap: 8px;
}

.parsers-container {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

.parser-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  color: var(--muted-foreground);
}

.info-item > svg {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
}

.info-item .label {
  flex: 0 0 78px;
  color: var(--foreground);
  font-weight: 500;
}

.info-item .value {
  min-width: 0;
  word-break: break-all;
}

.path-value,
.info-statistics {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
}

.path-value {
  padding: 2px 6px;
  font-size: 13px;
}

.info-statistics {
  padding: 10px 12px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
}

.stat-label,
.loading-state {
  color: var(--muted-foreground);
  font-size: 13px;
}

.parser-actions {
  justify-content: flex-end;
}

.loading-state {
  justify-content: center;
  min-height: 180px;
}

@media (max-width: 800px) {
  .parsers-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .header-container,
  .parser-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .parser-actions {
    width: 100%;
  }
}
</style>

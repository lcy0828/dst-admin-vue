<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">{{ text('execution.title') }}</h1><p class="mt-1 text-sm text-muted-foreground">{{ text('execution.subtitle') }}</p></div>
      <div class="flex flex-wrap gap-2"><UiButton size="sm" :disabled="loading" @click="fetchLogDetail"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ text('common.actions.refresh') }}</UiButton><UiButton size="sm" variant="outline" @click="goBack"><ArrowLeft data-icon="inline-start" />{{ text('common.actions.back') }}</UiButton></div>
    </header>
    <Card>
      <CardHeader><CardTitle>{{ text('execution.cardTitle') }}</CardTitle><CardDescription>{{ text('execution.cardDescription') }}</CardDescription></CardHeader>
      <CardContent>
        <div v-if="loading" class="flex flex-col gap-4">
          <Skeleton class="h-10 w-1/3" />
          <Skeleton class="h-72 w-full" />
        </div>

        <div v-else-if="logData" class="flex flex-col gap-6">
          <Alert :variant="getRunStatusVariant(logData.status)">
            <CircleCheck v-if="logData.status === 'success'" />
            <CircleX v-else-if="isTerminalFailure(logData.status)" />
            <RefreshCw v-else />
            <AlertTitle>{{ getRunStatusTitle(logData.status) }}</AlertTitle>
            <AlertDescription>
              {{ getRunStatusDescription(logData) }}
            </AlertDescription>
          </Alert>

          <section>
            <h3 class="section-title">{{ text('execution.basicInfo') }}</h3>
            <dl class="detail-grid">
              <div class="detail-item"><dt>{{ text('execution.fields.logId') }}</dt><dd>{{ logData.id }}</dd></div>
              <div class="detail-item"><dt>{{ text('execution.fields.taskId') }}</dt><dd>{{ logData.task_id }}</dd></div>
              <div class="detail-item">
                <dt>{{ text('execution.fields.taskName') }}</dt>
                <dd>
                <router-link
                  :to="`/cron/edit/${logData.task_id}`"
                  class="link-type"
                  v-if="logData.task_id">
                  {{ logData.task_name }}
                </router-link>
                <span v-else>{{ logData.task_name || text('common.values.unknownTask') }}</span>
                </dd>
              </div>
              <div class="detail-item">
                <dt>{{ text('execution.fields.status') }}</dt>
                <dd><Badge :variant="getRunStatusVariant(logData.status)">
                  {{ getRunStatusText(logData.status) }}
                </Badge></dd>
              </div>
              <div class="detail-item"><dt>{{ text('execution.fields.start') }}</dt><dd>{{ formatDate(logData.start_time || logData.created_at) }}</dd></div>
              <div class="detail-item"><dt>{{ text('execution.fields.end') }}</dt><dd>{{ formatDate(logData.end_time || logData.updated_at) }}</dd></div>
              <div class="detail-item"><dt>{{ text('execution.fields.duration') }}</dt><dd>{{ formatDuration(logData.duration) }}</dd></div>
              <div class="detail-item"><dt>{{ text('execution.fields.trigger') }}</dt><dd><Badge variant="secondary">{{ getTriggerTypeText(logData.trigger_type) }}</Badge></dd></div>
            </dl>
          </section>

          <section>
            <h3 class="section-title">{{ text('execution.output') }}</h3>
            <pre v-if="logData.output" class="code-block">{{ logData.output }}</pre>
            <Empty v-else><EmptyHeader><EmptyTitle>{{ text('execution.noOutput') }}</EmptyTitle></EmptyHeader></Empty>
          </section>

          <Alert v-if="logData.error" variant="destructive"><CircleAlert /><AlertTitle>{{ text('execution.error') }}</AlertTitle><AlertDescription><pre class="code-block error">{{ logData.error }}</pre></AlertDescription></Alert>
        </div>

        <Empty v-else>
          <EmptyHeader>
            <EmptyTitle>{{ text('execution.notFoundTitle') }}</EmptyTitle>
            <EmptyDescription>{{ text('execution.notFoundDescription') }}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><UiButton @click="fetchLogDetail">{{ text('common.actions.reload') }}</UiButton></EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  </div>
</template>

<script>
import { ArrowLeft, CircleAlert, CircleCheck, CircleX, RefreshCw } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { cronTaskApi } from '@/api/index';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  createCronTaskFailure,
  cronTaskFailureText,
  cronTaskStatusLabel,
  cronTaskText,
  cronTaskTriggerLabel,
  formatCronTaskDate,
  formatCronTaskMilliseconds
} from '@/i18n/cronTaskMessages';

export default {
  name: 'TaskExecutionResult',
  components: {
    Alert, AlertDescription, AlertTitle, ArrowLeft, Badge, Card, CardContent,
    CardDescription, CardHeader, CardTitle, CircleAlert, CircleCheck, CircleX, Empty,
    EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, RefreshCw, Skeleton, Spinner, UiButton
  },
  data() {
    return {
      loading: false,
      logId: null,
      logData: null,
      refreshInterval: null
    };
  },
  computed: {
    activeLocale() {
      const state = this.$i18n?.locale;
      return typeof state === 'string' ? state : (state?.value || 'zh-CN');
    }
  },
  created() {
    this.logId = this.$route.params.id;
    if (!this.logId) {
      toast.error(this.text('execution.feedback.missingId'));
      this.goBack();
      return;
    }

    this.fetchLogDetail();

    // 自动刷新 - 每5秒刷新一次，直到任务完成
    this.refreshInterval = setInterval(() => {
      if (this.logData && this.logData.end_time) {
        // 如果任务已完成，停止自动刷新
        clearInterval(this.refreshInterval);
      } else {
        this.fetchLogDetail();
      }
    }, 5000);
  },
  beforeUnmount() {
    // 组件销毁前清除定时器
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },
  methods: {
    fetchLogDetail() {
      this.loading = true;
      cronTaskApi.getLogDetail(this.logId)
        .then(response => {
          console.log('日志详情响应:', response);

          // 直接处理原始响应数据
          if (response && response.code === 200 && response.data) {
            console.log('使用标准响应格式');
            this.logData = response.data;
            console.log('处理后的日志详情:', this.logData);
          }
          // 处理嵌套的响应格式
          else if (response.data && response.data.code === 200 && response.data.data) {
            console.log('使用嵌套的响应结构处理数据');
            this.logData = response.data.data;
            console.log('处理后的日志详情:', this.logData);
          }
          // 兼容旧的响应格式
          else if (response.data && response.data.status === 200 && response.data.data) {
            console.log('使用旧API响应结构处理数据');
            this.logData = response.data.data;
            console.log('处理后的日志详情:', this.logData);
          } else {
            // 尝试直接解析响应数据
            try {
              console.log('尝试直接解析响应数据');
              // 如果是字符串，尝试解析为JSON
              const data = typeof response === 'string' ? JSON.parse(response) : response;

              if (data && data.code === 200 && data.data) {
                this.logData = data.data;
                console.log('成功解析数据:', this.logData);
                return;
              }
            } catch (e) {
              console.error('解析响应数据失败:', e);
            }

            console.error('响应格式不符合预期:', response);
            toast.error(this.text('execution.feedback.invalidResponse'));
          }
        })
        .catch(error => {
          console.error('获取日志详情失败:', error);
          toast.error(this.failureText('execution.feedback.loadFailed', error));
        })
        .finally(() => {
          this.loading = false;
        });
    },
    goBack() {
      // 如果是从任务列表页面进来的，就返回任务列表
      if (this.$route.query.from === 'tasks') {
        this.$router.push('/cron/tasks');
      } else {
        // 否则默认返回日志列表
        this.$router.push('/cron/logs');
      }
    },
    text(key, parameters) {
      return cronTaskText(key, this.activeLocale, parameters);
    },
    failureText(key, error) {
      return cronTaskFailureText(createCronTaskFailure(key, error), this.activeLocale);
    },
    formatDate(value) {
      return formatCronTaskDate(value, this.activeLocale);
    },
    formatDuration(duration) {
      return formatCronTaskMilliseconds(duration, this.activeLocale);
    },

    getRunStatusText(status) {
      return cronTaskStatusLabel(status, this.activeLocale);
    },
    isTerminalFailure(status) {
      return ['failed', 'canceled', 'skipped'].includes(String(status || '').toLowerCase());
    },
    getRunStatusVariant(status) {
      if (['success', 'succeeded', 'completed'].includes(String(status || '').toLowerCase())) return 'default';
      if (this.isTerminalFailure(status)) return 'destructive';
      return 'secondary';
    },
    getRunStatusTitle(status) {
      const normalized = String(status || '').toLowerCase();
      if (['success', 'succeeded', 'completed'].includes(normalized)) return this.text('execution.statusTitles.success');
      if (this.isTerminalFailure(normalized)) return this.text('execution.statusTitles.failed', { status: this.getRunStatusText(status) });
      if (normalized === 'running') return this.text('execution.statusTitles.running');
      if (['queued', 'pending'].includes(normalized)) return this.text('execution.statusTitles.queued');
      return this.getRunStatusText(status);
    },
    getRunStatusDescription(log) {
      if (['success', 'succeeded', 'completed'].includes(String(log.status || '').toLowerCase())) {
        return this.text('execution.descriptions.success', { duration: this.formatDuration(log.duration) });
      }
      if (this.isTerminalFailure(log.status)) return log.error || this.text('execution.descriptions.failed');
      return this.text('execution.descriptions.pending');
    },

    // 根据trigger_type获取触发方式的文本描述
    getTriggerTypeText(triggerType) {
      return cronTaskTriggerLabel(triggerType, this.activeLocale);
    }
  }
};
</script>

<style scoped>
.section-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}
.detail-item {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  min-height: 44px;
  border-bottom: 1px solid var(--border);
}
.detail-item:nth-child(odd) { border-right: 1px solid var(--border); }
.detail-item dt,
.detail-item dd {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 10px 12px;
}
.detail-item dt {
  background: var(--muted);
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 500;
}

.code-block {
  background-color: var(--muted);
  border: 1px solid var(--border);
  padding: 10px;
  border-radius: 4px;
  max-height: 500px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: Monaco, Menlo, Consolas, "Courier New", monospace;
  font-size: 12px;
  line-height: 1.5;
}

.code-block.error {
  color: var(--destructive);
}

.link-type {
  color: var(--primary);
  text-decoration: none;
}

.link-type:hover {
  text-decoration: underline;
}
@media (max-width: 768px) {
  .detail-grid { grid-template-columns: 1fr; }
  .detail-item:nth-child(odd) { border-right: 0; }
}
</style>

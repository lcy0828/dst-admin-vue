<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">{{ $t('cronLogs.detailPage.title') }}</h1><p class="mt-1 text-sm text-muted-foreground">{{ $t('cronLogs.detailPage.subtitle') }}</p></div>
      <div class="flex flex-wrap gap-2"><UiButton size="sm" :disabled="loading" @click="fetchLogDetail"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ $t('cronLogs.common.actions.refresh') }}</UiButton><UiButton size="sm" variant="outline" @click="goBack"><ArrowLeft data-icon="inline-start" />{{ $t('cronLogs.common.actions.back') }}</UiButton></div>
    </header>
    <Card>
      <CardHeader><CardTitle>{{ $t('cronLogs.detailPage.cardTitle') }}</CardTitle><CardDescription>{{ $t('cronLogs.detailPage.cardDescription') }}</CardDescription></CardHeader>
      <CardContent>
        <div v-if="loading" class="flex flex-col gap-4">
          <Skeleton class="h-10 w-1/3" />
          <Skeleton class="h-72 w-full" />
        </div>

        <Alert v-else-if="loadError" variant="destructive"><CircleAlert /><AlertTitle>{{ $t('cronLogs.detailPage.feedback.loadFailed') }}</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription></Alert>

        <div v-else-if="logData" class="flex flex-col gap-6">
          <section>
            <h3 class="section-title">{{ $t('cronLogs.detailPage.sections.basic') }}</h3>
            <dl class="detail-grid">
              <div class="detail-item"><dt>{{ $t('cronLogs.detailPage.fields.logId') }}</dt><dd>{{ logData.id }}</dd></div>
              <div class="detail-item"><dt>{{ $t('cronLogs.detailPage.fields.taskId') }}</dt><dd>{{ logData.task_id }}</dd></div>
              <div class="detail-item">
                <dt>{{ $t('cronLogs.detailPage.fields.task') }}</dt>
                <dd>
                <router-link
                  :to="`/cron/edit/${logData.task_id}`"
                  class="link-type"
                  v-if="logData.task_id">
                  {{ logData.task_name }}
                </router-link>
                <span v-else>{{ logData.task_name || $t('cronLogs.common.values.unknownTask') }}</span>
                </dd>
              </div>
              <div class="detail-item"><dt>{{ $t('cronLogs.detailPage.fields.type') }}</dt><dd>{{ getTaskTypeText(logData.task_type) }}</dd></div>
              <div class="detail-item">
                <dt>{{ $t('cronLogs.detailPage.fields.status') }}</dt>
                <dd><Badge :variant="getRunStatusVariant(logData.status)">
                  {{ getRunStatusText(logData.status) }}
                </Badge></dd>
              </div>
              <div class="detail-item"><dt>{{ $t('cronLogs.detailPage.fields.trigger') }}</dt><dd><Badge variant="secondary">{{ getTriggerTypeText(logData.trigger_type) }}</Badge></dd></div>
              <div class="detail-item"><dt>{{ $t('cronLogs.detailPage.fields.startedAt') }}</dt><dd>{{ formatDate(logData.start_time || logData.created_at) }}</dd></div>
              <div class="detail-item"><dt>{{ $t('cronLogs.detailPage.fields.endedAt') }}</dt><dd>{{ formatDate(logData.end_time || logData.updated_at) }}</dd></div>
              <div class="detail-item"><dt>{{ $t('cronLogs.detailPage.fields.duration') }}</dt><dd>{{ formatDuration(logData.duration) }}</dd></div>
              <div class="detail-item"><dt>{{ $t('cronLogs.detailPage.fields.executor') }}</dt><dd>{{ executorLabel(logData.executor) }}</dd></div>
              <div class="detail-item"><dt>{{ $t('cronLogs.detailPage.fields.retries') }}</dt><dd>{{ logData.retry_count || 0 }}</dd></div>
              <div class="detail-item"><dt>{{ $t('cronLogs.detailPage.fields.ip') }}</dt><dd>{{ logData.ip || $t('cronLogs.common.values.notAvailable') }}</dd></div>
            </dl>
          </section>

          <section>
            <h3 class="section-title">{{ $t('cronLogs.detailPage.sections.params') }}</h3>
            <pre v-if="logData.params" class="code-block">{{ formatParams(logData.params) }}</pre>
            <Empty v-else><EmptyHeader><EmptyTitle>{{ $t('cronLogs.detailPage.emptyParams') }}</EmptyTitle></EmptyHeader></Empty>
          </section>

          <section>
            <h3 class="section-title">{{ $t('cronLogs.detailPage.sections.output') }}</h3>
            <pre v-if="logData.output" class="code-block">{{ logData.output }}</pre>
            <Empty v-else><EmptyHeader><EmptyTitle>{{ $t('cronLogs.detailPage.emptyOutput') }}</EmptyTitle></EmptyHeader></Empty>
          </section>

          <Alert v-if="logData.error" variant="destructive"><CircleAlert /><AlertTitle>{{ $t('cronLogs.detailPage.error') }}</AlertTitle><AlertDescription><pre class="code-block error">{{ logData.error }}</pre></AlertDescription></Alert>
        </div>

        <Empty v-else>
          <EmptyHeader>
            <EmptyTitle>{{ $t('cronLogs.detailPage.missing') }}</EmptyTitle>
            <EmptyDescription>{{ $t('cronLogs.detailPage.missingDescription') }}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  </div>
</template>

<script>
import { ArrowLeft, CircleAlert, RefreshCw } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { cronTaskApi } from '@/api/index';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  createCronLogFailure,
  cronExecutorLabel,
  cronRunStatusLabel,
  cronRunStatusVariant,
  cronTaskTypeLabel,
  cronTriggerLabel,
  formatCronLogDate,
  formatCronLogDuration,
  formatCronLogFailure
} from '@/i18n/cronLogMessages';

export default {
  name: 'TaskLogDetail',
  components: {
    Alert, AlertDescription, AlertTitle, ArrowLeft, Badge, Card, CardContent,
    CardDescription, CardHeader, CardTitle, CircleAlert, Empty, EmptyDescription, EmptyHeader,
    EmptyTitle, RefreshCw, Skeleton, Spinner, UiButton
  },
  data() {
    return {
      loading: false,
      logId: null,
      logData: null,
      loadFailure: null
    };
  },
  computed: {
    loadError() {
      return formatCronLogFailure(this.loadFailure, this.$t);
    }
  },
  created() {
    this.logId = this.$route.params.id;
    if (!this.logId) {
      toast.error(this.$t('cronLogs.detailPage.feedback.missingId'));
      this.goBack();
      return;
    }

    this.fetchLogDetail();
  },
  methods: {
    fetchLogDetail() {
      this.loading = true;
      this.loadFailure = null;
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
            this.loadFailure = createCronLogFailure('cronLogs.detailPage.feedback.invalidResponse');
            toast.error(this.loadError);
          }
        })
        .catch(error => {
          console.error('获取日志详情失败:', error);
          this.loadFailure = createCronLogFailure('cronLogs.detailPage.feedback.loadFailed', error);
          toast.error(this.loadError);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    goBack() {
      // 如果是从任务详情页面进来的，就返回任务详情页面
      if (this.$route.query.from === 'task' && this.$route.query.task_id) {
        this.$router.push(`/cron/edit/${this.$route.query.task_id}`);
      } else {
        // 否则默认返回日志列表
        this.$router.push('/cron/logs');
      }
    },
    getTaskTypeText(type) {
      return cronTaskTypeLabel(type, this.$t);
    },
    getRunStatusText(status) {
      return cronRunStatusLabel(status, this.$t);
    },
    getRunStatusVariant(status) {
      return cronRunStatusVariant(status);
    },
    formatDuration(duration) {
      return formatCronLogDuration(duration, this.$i18n.locale, this.$t);
    },
    formatDate(value) {
      return formatCronLogDate(value, this.$i18n.locale);
    },
    executorLabel(value) {
      return cronExecutorLabel(value, this.$t);
    },
    formatParams(params) {
      if (!params) return '';

      try {
        // 如果是字符串，尝试解析成对象
        if (typeof params === 'string') {
          const parsedParams = JSON.parse(params);
          return JSON.stringify(parsedParams, null, 2);
        }
        // 如果已经是对象，直接格式化
        return JSON.stringify(params, null, 2);
      } catch (e) {
        // 如果无法解析为JSON，则原样返回
        return params;
      }
    },

    getTriggerTypeText(triggerType) {
      return cronTriggerLabel(triggerType, this.$t, this.logData?.is_manual === 1);
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
.detail-item:nth-child(odd) {
  border-right: 1px solid var(--border);
}
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
  padding: 15px;
  border-radius: 6px;
  font-family: Monaco, Menlo, Consolas, "Courier New", monospace;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
  margin: 0;
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

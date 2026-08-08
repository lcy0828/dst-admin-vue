<template>
  <div class="app-container">
    <Card>
      <CardHeader class="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>任务执行结果</CardTitle>
          <CardDescription>执行完成前每 5 秒自动刷新</CardDescription>
        </div>
        <div class="flex flex-wrap gap-2">
          <UiButton size="sm" @click="fetchLogDetail"><RefreshCw data-icon="inline-start" />刷新</UiButton>
          <UiButton size="sm" variant="outline" @click="goBack"><ArrowLeft data-icon="inline-start" />返回</UiButton>
        </div>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="flex flex-col gap-4">
          <Skeleton class="h-10 w-1/3" />
          <Skeleton class="h-72 w-full" />
        </div>

        <div v-else-if="logData" class="flex flex-col gap-6">
          <Alert :variant="logData.status === 1 ? 'default' : 'destructive'">
            <CircleCheck v-if="logData.status === 1" />
            <CircleX v-else />
            <AlertTitle>{{ logData.status === 1 ? '任务执行成功' : '任务执行失败' }}</AlertTitle>
            <AlertDescription>
              {{ logData.status === 1 ? `任务已成功执行，耗时 ${logData.duration} 毫秒` : '任务执行失败，请查看错误信息' }}
            </AlertDescription>
          </Alert>

          <section>
            <h3 class="section-title">基本信息</h3>
            <dl class="detail-grid">
              <div class="detail-item"><dt>日志 ID</dt><dd>{{ logData.id }}</dd></div>
              <div class="detail-item"><dt>任务 ID</dt><dd>{{ logData.task_id }}</dd></div>
              <div class="detail-item">
                <dt>任务名称</dt>
                <dd>
                <router-link
                  :to="`/cron/edit/${logData.task_id}`"
                  class="link-type"
                  v-if="logData.task_id">
                  {{ logData.task_name }}
                </router-link>
                <span v-else>{{ logData.task_name || '未知任务' }}</span>
                </dd>
              </div>
              <div class="detail-item">
                <dt>执行状态</dt>
                <dd><Badge :variant="logData.status === 1 ? 'default' : 'destructive'">
                  {{ logData.status === 1 ? '成功' : '失败' }}
                </Badge></dd>
              </div>
              <div class="detail-item"><dt>开始时间</dt><dd>{{ logData.start_time || logData.created_at }}</dd></div>
              <div class="detail-item"><dt>结束时间</dt><dd>{{ logData.end_time || logData.updated_at }}</dd></div>
              <div class="detail-item"><dt>执行耗时</dt><dd>{{ formatDuration(logData.duration) }}</dd></div>
              <div class="detail-item"><dt>触发方式</dt><dd><Badge variant="secondary">{{ getTriggerTypeText(logData.trigger_type) }}</Badge></dd></div>
            </dl>
          </section>

          <section>
            <h3 class="section-title">执行输出</h3>
            <pre v-if="logData.output" class="code-block">{{ logData.output }}</pre>
            <Empty v-else><EmptyHeader><EmptyTitle>无输出</EmptyTitle></EmptyHeader></Empty>
          </section>

          <section v-if="logData.error">
            <h3 class="section-title">错误信息</h3>
            <pre class="code-block error">{{ logData.error }}</pre>
          </section>
        </div>

        <Empty v-else>
          <EmptyHeader>
            <EmptyTitle>未找到日志详情</EmptyTitle>
            <EmptyDescription>日志可能已被清理或链接无效。</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><UiButton @click="fetchLogDetail">重新加载</UiButton></EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  </div>
</template>

<script>
import { ArrowLeft, CircleCheck, CircleX, RefreshCw } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { cronTaskApi } from '@/api/index';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

export default {
  name: 'TaskExecutionResult',
  components: {
    Alert, AlertDescription, AlertTitle, ArrowLeft, Badge, Card, CardContent,
    CardDescription, CardHeader, CardTitle, CircleCheck, CircleX, Empty, EmptyContent,
    EmptyDescription, EmptyHeader, EmptyTitle, RefreshCw, Skeleton, UiButton
  },
  data() {
    return {
      loading: false,
      logId: null,
      logData: null,
      refreshInterval: null
    };
  },
  created() {
    this.logId = this.$route.params.id;
    if (!this.logId) {
      toast.error('缺少日志 ID 参数');
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
            toast.error('获取日志详情失败：响应格式不符合预期');
          }
        })
        .catch(error => {
          console.error('获取日志详情失败:', error);
          toast.error('获取日志详情失败');
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
    formatDuration(duration) {
      if (!duration) return '-';

      // 如果duration小于1000，认为是毫秒
      if (duration < 1000) {
        return `${duration} 毫秒`;
      }

      // 否则转换为秒
      const seconds = duration / 1000;
      if (seconds < 60) {
        return `${seconds.toFixed(2)} 秒`;
      }

      // 如果超过60秒，转换为分钟和秒
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = (seconds % 60).toFixed(0);
      return `${minutes} 分 ${remainingSeconds} 秒`;
    },

    // 根据trigger_type获取触发方式的文本描述
    getTriggerTypeText(triggerType) {
      // 根据实际情况调整映射关系
      const triggerTypeMap = {
        0: '定时触发', // 0 代表定时触发
        1: '手动触发', // 1 代表手动触发
        2: '事件触发', // 2 代表事件触发
        3: '依赖触发', // 3 代表依赖触发
        4: 'API触发'    // 4 代表API触发
      };
      return triggerTypeMap[triggerType] || '未知触发';
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

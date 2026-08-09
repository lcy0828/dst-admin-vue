<template>
  <div class="app-container">
    <Card>
      <CardHeader>
        <CardTitle>任务执行日志</CardTitle><CardDescription>查询任务运行结果并清理历史记录</CardDescription><CardAction class="flex flex-wrap items-center justify-end gap-2"><automation-room-select @ready="handleAutomationRoom" @change="handleAutomationRoom" /><UiButton size="sm" variant="destructive" @click="handleClearLogs"><Trash2 data-icon="inline-start" />清理旧日志</UiButton><UiButton size="sm" variant="outline" :disabled="loading" @click="fetchData"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />刷新</UiButton><UiButton size="sm" variant="outline" @click="$router.push('/cron/tasks')"><ArrowLeft data-icon="inline-start" />返回任务列表</UiButton></CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup class="filter-grid"><Field><FieldLabel for="log-task-filter">任务</FieldLabel><UiSelect v-model="listQuery.task_id"><SelectTrigger id="log-task-filter"><SelectValue placeholder="选择任务" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem><SelectItem v-for="task in taskOptions" :key="task.id" :value="String(task.id)">{{ task.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field><Field><FieldLabel for="log-status-filter">状态</FieldLabel><UiSelect v-model="listQuery.status"><SelectTrigger id="log-status-filter"><SelectValue placeholder="执行状态" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem><SelectItem value="success">成功</SelectItem><SelectItem value="failed">失败</SelectItem></SelectGroup></SelectContent></UiSelect></Field><Field><FieldLabel for="log-start-date">开始日期</FieldLabel><UiInput id="log-start-date" v-model="listQuery.start_date" type="date" /></Field><Field><FieldLabel for="log-end-date">结束日期</FieldLabel><UiInput id="log-end-date" v-model="listQuery.end_date" type="date" /></Field><div class="flex items-end gap-2"><UiButton :disabled="loading" @click="handleSearch"><Spinner v-if="loading" data-icon="inline-start" /><Search v-else data-icon="inline-start" />搜索</UiButton><UiButton variant="outline" @click="resetQuery">重置</UiButton></div></FieldGroup>

        <Alert v-if="loadError" variant="destructive" class="mb-4"><CircleAlert /><AlertTitle>日志加载失败</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription></Alert>
        <div v-if="loading && logList.length === 0" class="flex flex-col gap-3"><Skeleton v-for="index in 6" :key="index" class="h-12 w-full" /></div>
        <Empty v-else-if="logList.length === 0"><EmptyHeader><EmptyTitle>暂无日志记录</EmptyTitle><EmptyDescription>当前筛选条件下没有执行日志。</EmptyDescription></EmptyHeader></Empty>
        <div v-else class="overflow-x-auto"><ShadcnTable><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>任务名称</TableHead><TableHead>开始时间</TableHead><TableHead>执行耗时</TableHead><TableHead>状态</TableHead><TableHead>触发方式</TableHead><TableHead class="text-right">操作</TableHead></TableRow></TableHeader><TableBody>
          <TableRow v-for="log in logList" :key="log.id"><TableCell>{{ log.id }}</TableCell><TableCell><router-link v-if="log.task_id" :to="`/cron/edit/${log.task_id}`" class="link-type">{{ log.task_name }}</router-link><span v-else>{{ log.task_name || '未知任务' }}</span></TableCell><TableCell class="whitespace-nowrap">{{ log.start_time || log.created_at }}</TableCell><TableCell>{{ log.duration ? `${log.duration} 毫秒` : '-' }}</TableCell><TableCell><Badge :variant="getRunStatusVariant(log.status)">{{ getRunStatusText(log.status) }}</Badge></TableCell><TableCell><Badge variant="secondary">{{ getTriggerTypeText(log.trigger_type) }}</Badge></TableCell><TableCell class="text-right"><UiButton size="sm" variant="outline" @click="viewLogDetail(log)"><Eye data-icon="inline-start" />查看详情</UiButton></TableCell></TableRow>
        </TableBody></ShadcnTable></div>
        <div v-if="total > 0" class="mt-4 flex flex-wrap items-center justify-between gap-3"><div class="flex items-center gap-2 text-sm text-muted-foreground"><span>每页</span><UiSelect :model-value="String(listQuery.page_size)" @update:model-value="handleSizeChange(Number($event))"><SelectTrigger class="w-24" aria-label="每页显示条数"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="size in [10, 20, 50, 100]" :key="size" :value="String(size)">{{ size }}</SelectItem></SelectGroup></SelectContent></UiSelect><span>共 {{ total }} 条</span></div><ShadcnPagination v-model:page="listQuery.page" :total="total" :items-per-page="listQuery.page_size" show-edges @update:page="handleCurrentChange"><PaginationContent v-slot="{ items }"><PaginationPrevious /><template v-for="(item, index) in items" :key="index"><PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === listQuery.page">{{ item.value }}</PaginationItem><PaginationEllipsis v-else :index="index" /></template><PaginationNext /></PaginationContent></ShadcnPagination></div>
      </CardContent>
    </Card>

    <UiDialog v-model:open="dialogVisible"><DialogScrollContent class="max-w-3xl"><DialogHeader><DialogTitle>日志详情</DialogTitle><DialogDescription>本次任务执行的完整信息</DialogDescription></DialogHeader>
      <div v-if="currentLog" class="log-detail">
        <dl class="detail-grid"><div class="detail-item"><dt>日志 ID</dt><dd>{{ currentLog.id }}</dd></div><div class="detail-item"><dt>任务 ID</dt><dd>{{ currentLog.task_id }}</dd></div><div class="detail-item"><dt>任务名称</dt><dd>{{ currentLog.task_name }}</dd></div><div class="detail-item"><dt>执行状态</dt><dd><Badge :variant="getRunStatusVariant(currentLog.status)">{{ getRunStatusText(currentLog.status) }}</Badge></dd></div><div class="detail-item"><dt>触发方式</dt><dd><Badge variant="secondary">{{ getTriggerTypeText(currentLog.trigger_type) }}</Badge></dd></div><div class="detail-item"><dt>开始时间</dt><dd>{{ currentLog.start_time || currentLog.created_at }}</dd></div><div class="detail-item"><dt>结束时间</dt><dd>{{ currentLog.end_time || currentLog.updated_at || '-' }}</dd></div><div class="detail-item"><dt>执行耗时</dt><dd>{{ currentLog.duration ? `${currentLog.duration} 毫秒` : '-' }}</dd></div><div class="detail-item"><dt>执行者</dt><dd>{{ currentLog.executor || '系统' }}</dd></div><div class="detail-item"><dt>重试次数</dt><dd>{{ currentLog.retry_count || 0 }}</dd></div></dl>

        <div class="log-output">
          <div class="log-title">执行输出：</div>
          <pre class="log-content">{{ currentLog.output || '无输出' }}</pre>
        </div>

        <Alert v-if="currentLog.error" variant="destructive" class="mt-4"><CircleAlert /><AlertTitle>错误信息</AlertTitle><AlertDescription><pre class="log-content error">{{ currentLog.error }}</pre></AlertDescription></Alert>
      </div>
      <Empty v-else><EmptyHeader><EmptyTitle>未找到日志详情</EmptyTitle></EmptyHeader></Empty>
    </DialogScrollContent></UiDialog>

    <UiDialog v-model:open="clearDialogVisible"><DialogContent><DialogHeader><DialogTitle>清理日志</DialogTitle><DialogDescription>按保留时间和任务范围删除历史日志</DialogDescription></DialogHeader><FieldGroup><Field><FieldLabel for="clear-keep-days">保留时间</FieldLabel><UiSelect :model-value="String(clearForm.keep_days)" @update:model-value="clearForm.keep_days = Number($event)"><SelectTrigger id="clear-keep-days"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="days in [7, 30, 90, 180, 365]" :key="days" :value="String(days)">保留最近 {{ days }} 天</SelectItem></SelectGroup></SelectContent></UiSelect></Field><Field><FieldLabel for="clear-task-filter">任务筛选</FieldLabel><UiSelect v-model="clearForm.task_id"><SelectTrigger id="clear-task-filter"><SelectValue placeholder="选择要清理的任务" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部任务</SelectItem><SelectItem v-for="task in taskOptions" :key="task.id" :value="String(task.id)">{{ task.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field><Field><FieldLabel for="clear-status-filter">状态筛选</FieldLabel><UiSelect v-model="clearForm.status"><SelectTrigger id="clear-status-filter"><SelectValue placeholder="选择状态" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem><SelectItem value="success">成功</SelectItem><SelectItem value="failed">失败</SelectItem></SelectGroup></SelectContent></UiSelect></Field></FieldGroup><DialogFooter><UiButton variant="outline" @click="clearDialogVisible = false">取消</UiButton><UiButton variant="destructive" :disabled="clearLoading" @click="confirmClearLogs"><Spinner v-if="clearLoading" data-icon="inline-start" />确认清理</UiButton></DialogFooter></DialogContent></UiDialog>
  </div>
</template>

<script>
import { ArrowLeft, CircleAlert, Eye, RefreshCw, Search, Trash2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { cronTaskApi } from '@/api/index';
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Pagination as ShadcnPagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { confirmAction } from '@/lib/feedback';

export default {
  name: 'TaskLogs',
  components: {
    Alert, AlertDescription, AlertTitle, ArrowLeft, AutomationRoomSelect, Badge, Card, CardAction,
    CardContent, CardDescription, CardHeader, CardTitle, CircleAlert, DialogContent,
    DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle,
    Empty, EmptyDescription, EmptyHeader, EmptyTitle, Eye, Field, FieldGroup, FieldLabel,
    PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious,
    RefreshCw, Search, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
    ShadcnPagination, ShadcnTable, Skeleton, Spinner, TableBody, TableCell, TableHead,
    TableHeader, TableRow, Trash2, UiButton, UiDialog, UiInput, UiSelect
  },
  data() {
    return {
      loading: false,
      loadError: '',
      logList: [],
      taskOptions: [],
      total: 0,
      listQuery: {
        page: 1,
        page_size: 20,  // 修改为page_size以匹配API期望的参数
        task_id: '',
        status: '',
        start_date: '',
        end_date: ''
      },
      dateRange: [],
      dialogVisible: false,
      currentLog: null,
      clearDialogVisible: false,
      clearLoading: false,
      clearForm: {
        keep_days: 30,
        task_id: '',
        status: ''
      }
    };
  },
  created() {
    // 如果URL中包含task_id参数，则预先设置
    const { task_id } = this.$route.query;
    if (task_id) {
      this.listQuery.task_id = task_id;
    }

  },
  watch: {
    dateRange(val) {
      if (val && val.length === 2) {
        this.listQuery.start_date = val[0];
        this.listQuery.end_date = val[1];
      } else {
        this.listQuery.start_date = '';
        this.listQuery.end_date = '';
      }
    }
  },
  methods: {
    handleAutomationRoom() {
      this.logList = [];
      this.taskOptions = [];
      this.total = 0;
      this.fetchTasks();
      this.fetchData();
    },
    fetchTasks() {
      cronTaskApi.getTasks()
        .then(response => {
          console.log('任务列表响应:', response);
          if (response.data && response.data.code === 200) {
            // 适配新的API响应结构
            const tasks = response.data.data.tasks || [];
            this.taskOptions = tasks.map(task => ({
              id: task.id,
              name: task.name
            }));
          } else if (response.data && response.data.status === 200) {
            // 兼容旧的API响应结构
            this.taskOptions = (response.data.data.items || []).map(task => ({
              id: task.id,
              name: task.name
            }));
          }
        })
        .catch(error => {
          console.error('获取任务列表失败:', error);
        });
    },
    fetchData() {
      this.loading = true;
      this.loadError = '';
      const query = {
        ...this.listQuery,
        task_id: this.listQuery.task_id === 'all' ? '' : this.listQuery.task_id,
        status: this.listQuery.status === 'all' ? '' : this.listQuery.status
      };
      console.log('发送日志查询参数:', query);
      cronTaskApi.getLogs(query)
        .then(response => {
          console.log('日志列表原始响应:', response);

          // 直接处理原始响应数据
          if (response && response.code === 200 && response.data && response.data.logs) {
            console.log('使用标准响应格式');
            this.logList = response.data.logs || [];
            this.total = response.data.total || 0;
            console.log('处理后的日志列表:', this.logList);
            console.log('总数:', this.total);
          }
          // 处理嵌套的响应格式
          else if (response.data && response.data.code === 200 && response.data.data && response.data.data.logs) {
            console.log('使用嵌套的响应结构处理数据');
            this.logList = response.data.data.logs || [];
            this.total = response.data.data.total || 0;
            console.log('处理后的日志列表:', this.logList);
            console.log('总数:', this.total);
          }
          // 兼容旧的响应格式
          else if (response.data && response.data.status === 200 && response.data.data && response.data.data.items) {
            console.log('使用旧API响应结构处理数据');
            this.logList = response.data.data.items || [];
            this.total = response.data.data.total || 0;
            console.log('处理后的日志列表:', this.logList);
            console.log('总数:', this.total);
          } else {
            // 尝试直接解析响应数据
            try {
              console.log('尝试直接解析响应数据');
              // 如果是字符串，尝试解析为JSON
              const data = typeof response === 'string' ? JSON.parse(response) : response;

              if (data && data.code === 200 && data.data && data.data.logs) {
                this.logList = data.data.logs;
                this.total = data.data.total || 0;
                console.log('成功解析数据:', this.logList);
                return;
              }
            } catch (e) {
              console.error('解析响应数据失败:', e);
            }

            console.error('响应格式不符合预期:', response);
            this.loadError = '获取日志列表失败：响应格式不符合预期';
            toast.error(this.loadError);
          }
        })
        .catch(error => {
          console.error('获取日志列表失败:', error);
          this.loadError = error.message || '获取日志列表失败';
          toast.error(this.loadError);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    handleSearch() {
      this.listQuery.page = 1;
      this.fetchData();
    },
    resetQuery() {
      this.dateRange = [];
      this.listQuery = {
        page: 1,
        page_size: 20,
        task_id: '',
        status: '',
        start_date: '',
        end_date: ''
      };
      this.fetchData();
    },
    handleSizeChange(val) {
      this.listQuery.page_size = val;
      this.fetchData();
    },
    handleCurrentChange(val) {
      this.listQuery.page = val;
      this.fetchData();
    },
    viewLogDetail(log) {
      this.currentLog = log;
      this.dialogVisible = true;
    },
    handleClearLogs() {
      this.clearDialogVisible = true;
    },
    confirmClearLogs() {
      confirmAction(`确定要清理 ${this.clearForm.keep_days} 天之前的日志吗？此操作不可恢复。`, '确认清理', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.clearLoading = true;
        cronTaskApi.clearLogs({
          ...this.clearForm,
          task_id: this.clearForm.task_id === 'all' ? '' : this.clearForm.task_id,
          status: this.clearForm.status === 'all' ? '' : this.clearForm.status
        })
          .then(response => {
            console.log('清理日志响应:', response);
            if (response.data && (response.data.code === 200 || response.data.status === 200)) {
              const deletedCount = response.data.data.deleted_count || response.data.data.count || 0;
              toast.success(`成功清理了 ${deletedCount} 条日志`);
              this.clearDialogVisible = false;
              this.fetchData();
            } else {
              toast.error(response.data.msg || response.data.message || '清理日志失败');
            }
          })
        .catch(error => {
          console.error('清理日志失败:', error);
          toast.error(error.message || '清理日志失败');
          })
          .finally(() => {
            this.clearLoading = false;
          });
      }).catch(() => {
        toast.info('已取消清理');
      });
    },

    getRunStatusText(status) {
      const labels = {
        success: '成功',
        succeeded: '成功',
        failed: '失败',
        canceled: '已取消',
        skipped: '已跳过',
        queued: '排队中',
        running: '执行中'
      };
      return labels[status] || (status === 1 ? '成功' : '失败');
    },

    getRunStatusVariant(status) {
      if (status === 'success' || status === 'succeeded' || status === 1) return 'default';
      if (status === 'canceled' || status === 'skipped' || status === 'queued' || status === 'running') return 'secondary';
      return 'destructive';
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

      // 兼容旧版的is_manual字段
      if (triggerType === undefined) {
        // 如果没有trigger_type字段，则使用is_manual字段
        // 注意：is_manual为1时表示手动执行，对应trigger_type为1
        return this.is_manual === 1 ? '手动触发' : '定时触发';
      }

      return triggerTypeMap[triggerType] || '未知触发';
    }
  }
};
</script>

<style scoped>
.filter-grid { display: grid; grid-template-columns: 1.25fr .8fr 1fr 1fr auto; margin-bottom: 20px; }
.log-detail {
  margin-bottom: 20px;
}
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 0; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
.detail-item { display: grid; grid-template-columns: 104px minmax(0, 1fr); min-height: 44px; border-bottom: 1px solid var(--border); }
.detail-item:nth-child(odd) { border-right: 1px solid var(--border); }
.detail-item dt, .detail-item dd { display: flex; align-items: center; margin: 0; padding: 10px 12px; }
.detail-item dt { background: var(--muted); color: var(--muted-foreground); font-size: 12px; }
.log-title {
  font-weight: 600;
  margin: 15px 0 5px 0;
}
.log-content {
  background-color: var(--muted);
  border: 1px solid var(--border);
  padding: 10px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: Monaco, Menlo, Consolas, "Courier New", monospace;
}
.log-content.error {
  color: var(--destructive);
}
.link-type {
  color: var(--primary);
  text-decoration: none;
}
.link-type:hover {
  text-decoration: underline;
}
@media (max-width: 1024px) { .filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 768px) { .filter-grid, .detail-grid { grid-template-columns: 1fr; } .detail-item:nth-child(odd) { border-right: 0; } }
</style>

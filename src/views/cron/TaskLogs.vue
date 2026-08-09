<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">{{ $t('cronLogs.list.title') }}</h1><p class="mt-1 text-sm text-muted-foreground">{{ $t('cronLogs.list.subtitle') }}</p></div>
      <div class="flex flex-wrap items-center gap-2"><automation-room-select @ready="handleAutomationRoom" @change="handleAutomationRoom" /><UiButton size="sm" variant="destructive" @click="handleClearLogs"><Trash2 data-icon="inline-start" />{{ $t('cronLogs.list.actions.clear') }}</UiButton><UiButton size="sm" variant="outline" :disabled="loading" @click="fetchData"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ $t('cronLogs.common.actions.refresh') }}</UiButton><UiButton size="sm" variant="outline" @click="$router.push('/cron/tasks')"><ArrowLeft data-icon="inline-start" />{{ $t('cronLogs.list.actions.backToTasks') }}</UiButton></div>
    </header>
    <Card>
      <CardHeader><CardTitle>{{ $t('cronLogs.list.cardTitle') }}</CardTitle><CardDescription>{{ $t('cronLogs.list.cardDescription') }}</CardDescription></CardHeader>
      <CardContent>
        <FieldGroup class="filter-grid"><Field><FieldLabel for="log-task-filter">{{ $t('cronLogs.list.filters.task') }}</FieldLabel><UiSelect v-model="listQuery.task_id"><SelectTrigger id="log-task-filter"><SelectValue :placeholder="$t('cronLogs.list.filters.selectTask')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">{{ $t('cronLogs.list.filters.all') }}</SelectItem><SelectItem v-for="task in taskOptions" :key="task.id" :value="String(task.id)">{{ task.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field><Field><FieldLabel for="log-status-filter">{{ $t('cronLogs.list.filters.status') }}</FieldLabel><UiSelect v-model="listQuery.status"><SelectTrigger id="log-status-filter"><SelectValue :placeholder="$t('cronLogs.list.filters.executionStatus')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">{{ $t('cronLogs.list.filters.all') }}</SelectItem><SelectItem value="success">{{ $t('cronLogs.common.statuses.success') }}</SelectItem><SelectItem value="failed">{{ $t('cronLogs.common.statuses.failed') }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field><Field><FieldLabel for="log-start-date">{{ $t('cronLogs.list.filters.startDate') }}</FieldLabel><UiInput id="log-start-date" v-model="listQuery.start_date" type="date" /></Field><Field><FieldLabel for="log-end-date">{{ $t('cronLogs.list.filters.endDate') }}</FieldLabel><UiInput id="log-end-date" v-model="listQuery.end_date" type="date" /></Field><div class="flex items-end gap-2"><UiButton :disabled="loading" @click="handleSearch"><Spinner v-if="loading" data-icon="inline-start" /><Search v-else data-icon="inline-start" />{{ $t('cronLogs.list.actions.search') }}</UiButton><UiButton variant="outline" @click="resetQuery">{{ $t('cronLogs.list.actions.reset') }}</UiButton></div></FieldGroup>

        <Alert v-if="loadError" variant="destructive" class="mb-4"><CircleAlert /><AlertTitle>{{ $t('cronLogs.list.loadFailed') }}</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription></Alert>
        <div v-if="loading && logList.length === 0" class="flex flex-col gap-3"><Skeleton v-for="index in 6" :key="index" class="h-12 w-full" /></div>
        <Empty v-else-if="!loadError && logList.length === 0"><EmptyHeader><EmptyTitle>{{ $t('cronLogs.list.empty') }}</EmptyTitle><EmptyDescription>{{ $t('cronLogs.list.emptyDescription') }}</EmptyDescription></EmptyHeader></Empty>
        <div v-else-if="!loadError" class="overflow-x-auto"><ShadcnTable><TableHeader><TableRow><TableHead>{{ $t('cronLogs.list.columns.id') }}</TableHead><TableHead>{{ $t('cronLogs.list.columns.task') }}</TableHead><TableHead>{{ $t('cronLogs.list.columns.startedAt') }}</TableHead><TableHead>{{ $t('cronLogs.list.columns.duration') }}</TableHead><TableHead>{{ $t('cronLogs.list.columns.status') }}</TableHead><TableHead>{{ $t('cronLogs.list.columns.trigger') }}</TableHead><TableHead class="text-right">{{ $t('cronLogs.list.columns.actions') }}</TableHead></TableRow></TableHeader><TableBody>
          <TableRow v-for="log in logList" :key="log.id"><TableCell>{{ log.id }}</TableCell><TableCell><router-link v-if="log.task_id" :to="`/cron/edit/${log.task_id}`" class="link-type">{{ log.task_name }}</router-link><span v-else>{{ log.task_name || $t('cronLogs.common.values.unknownTask') }}</span></TableCell><TableCell class="whitespace-nowrap">{{ formatDate(log.start_time || log.created_at) }}</TableCell><TableCell>{{ formatDuration(log.duration) }}</TableCell><TableCell><Badge :variant="getRunStatusVariant(log.status)">{{ getRunStatusText(log.status) }}</Badge></TableCell><TableCell><Badge variant="secondary">{{ getTriggerTypeText(log.trigger_type, log.is_manual) }}</Badge></TableCell><TableCell class="text-right"><UiButton size="sm" variant="outline" @click="viewLogDetail(log)"><Eye data-icon="inline-start" />{{ $t('cronLogs.list.actions.view') }}</UiButton></TableCell></TableRow>
        </TableBody></ShadcnTable></div>
        <div v-if="total > 0" class="mt-4 flex flex-wrap items-center justify-between gap-3"><div class="flex items-center gap-2 text-sm text-muted-foreground"><span>{{ $t('cronLogs.list.pagination.perPage') }}</span><UiSelect :model-value="String(listQuery.page_size)" @update:model-value="handleSizeChange(Number($event))"><SelectTrigger class="w-24" :aria-label="$t('cronLogs.list.pagination.pageSizeAria')"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="size in [10, 20, 50, 100]" :key="size" :value="String(size)">{{ size }}</SelectItem></SelectGroup></SelectContent></UiSelect><span>{{ $t('cronLogs.list.pagination.total', { count: total }) }}</span></div><ShadcnPagination v-model:page="listQuery.page" :total="total" :items-per-page="listQuery.page_size" show-edges @update:page="handleCurrentChange"><PaginationContent v-slot="{ items }"><PaginationPrevious /><template v-for="(item, index) in items" :key="index"><PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === listQuery.page">{{ item.value }}</PaginationItem><PaginationEllipsis v-else :index="index" /></template><PaginationNext /></PaginationContent></ShadcnPagination></div>
      </CardContent>
    </Card>

    <UiDialog v-model:open="dialogVisible"><DialogScrollContent class="max-w-3xl"><DialogHeader><DialogTitle>{{ $t('cronLogs.list.detail.title') }}</DialogTitle><DialogDescription>{{ $t('cronLogs.list.detail.description') }}</DialogDescription></DialogHeader>
      <div v-if="currentLog" class="log-detail">
        <dl class="detail-grid"><div class="detail-item"><dt>{{ $t('cronLogs.list.detail.fields.logId') }}</dt><dd>{{ currentLog.id }}</dd></div><div class="detail-item"><dt>{{ $t('cronLogs.list.detail.fields.taskId') }}</dt><dd>{{ currentLog.task_id }}</dd></div><div class="detail-item"><dt>{{ $t('cronLogs.list.detail.fields.task') }}</dt><dd>{{ currentLog.task_name }}</dd></div><div class="detail-item"><dt>{{ $t('cronLogs.list.detail.fields.status') }}</dt><dd><Badge :variant="getRunStatusVariant(currentLog.status)">{{ getRunStatusText(currentLog.status) }}</Badge></dd></div><div class="detail-item"><dt>{{ $t('cronLogs.list.detail.fields.trigger') }}</dt><dd><Badge variant="secondary">{{ getTriggerTypeText(currentLog.trigger_type, currentLog.is_manual) }}</Badge></dd></div><div class="detail-item"><dt>{{ $t('cronLogs.list.detail.fields.startedAt') }}</dt><dd>{{ formatDate(currentLog.start_time || currentLog.created_at) }}</dd></div><div class="detail-item"><dt>{{ $t('cronLogs.list.detail.fields.endedAt') }}</dt><dd>{{ formatDate(currentLog.end_time || currentLog.updated_at) }}</dd></div><div class="detail-item"><dt>{{ $t('cronLogs.list.detail.fields.duration') }}</dt><dd>{{ formatDuration(currentLog.duration) }}</dd></div><div class="detail-item"><dt>{{ $t('cronLogs.list.detail.fields.executor') }}</dt><dd>{{ executorLabel(currentLog.executor) }}</dd></div><div class="detail-item"><dt>{{ $t('cronLogs.list.detail.fields.retries') }}</dt><dd>{{ currentLog.retry_count || 0 }}</dd></div></dl>

        <div class="log-output">
          <div class="log-title">{{ $t('cronLogs.list.detail.output') }}</div>
          <pre class="log-content">{{ currentLog.output || $t('cronLogs.common.values.noOutput') }}</pre>
        </div>

        <Alert v-if="currentLog.error" variant="destructive" class="mt-4"><CircleAlert /><AlertTitle>{{ $t('cronLogs.list.detail.error') }}</AlertTitle><AlertDescription><pre class="log-content error">{{ currentLog.error }}</pre></AlertDescription></Alert>
      </div>
      <Empty v-else><EmptyHeader><EmptyTitle>{{ $t('cronLogs.list.detail.missing') }}</EmptyTitle></EmptyHeader></Empty>
    </DialogScrollContent></UiDialog>

    <UiDialog v-model:open="clearDialogVisible"><DialogContent><DialogHeader><DialogTitle>{{ $t('cronLogs.list.clear.title') }}</DialogTitle><DialogDescription>{{ $t('cronLogs.list.clear.description') }}</DialogDescription></DialogHeader><FieldGroup><Field><FieldLabel for="clear-keep-days">{{ $t('cronLogs.list.clear.keep') }}</FieldLabel><UiSelect :model-value="String(clearForm.keep_days)" @update:model-value="clearForm.keep_days = Number($event)"><SelectTrigger id="clear-keep-days"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="days in [7, 30, 90, 180, 365]" :key="days" :value="String(days)">{{ $t('cronLogs.list.clear.keepDays', { days }) }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field><Field><FieldLabel for="clear-task-filter">{{ $t('cronLogs.list.clear.task') }}</FieldLabel><UiSelect v-model="clearForm.task_id"><SelectTrigger id="clear-task-filter"><SelectValue :placeholder="$t('cronLogs.list.clear.selectTask')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">{{ $t('cronLogs.list.clear.allTasks') }}</SelectItem><SelectItem v-for="task in taskOptions" :key="task.id" :value="String(task.id)">{{ task.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field><Field><FieldLabel for="clear-status-filter">{{ $t('cronLogs.list.clear.status') }}</FieldLabel><UiSelect v-model="clearForm.status"><SelectTrigger id="clear-status-filter"><SelectValue :placeholder="$t('cronLogs.list.clear.selectStatus')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">{{ $t('cronLogs.list.filters.all') }}</SelectItem><SelectItem value="success">{{ $t('cronLogs.common.statuses.success') }}</SelectItem><SelectItem value="failed">{{ $t('cronLogs.common.statuses.failed') }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field></FieldGroup><DialogFooter><UiButton variant="outline" @click="clearDialogVisible = false">{{ $t('common.actions.cancel') }}</UiButton><UiButton variant="destructive" :disabled="clearLoading" @click="confirmClearLogs"><Spinner v-if="clearLoading" data-icon="inline-start" />{{ $t('cronLogs.list.clear.confirmButton') }}</UiButton></DialogFooter></DialogContent></UiDialog>
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Pagination as ShadcnPagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  createCronLogFailure,
  cronExecutorLabel,
  cronRunStatusLabel,
  cronRunStatusVariant,
  cronTriggerLabel,
  formatCronLogDate,
  formatCronLogDuration,
  formatCronLogFailure
} from '@/i18n/cronLogMessages';
import { confirmAction } from '@/lib/feedback';

export default {
  name: 'TaskLogs',
  components: {
    Alert, AlertDescription, AlertTitle, ArrowLeft, AutomationRoomSelect, Badge, Card,
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
      loadFailure: null,
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
  computed: {
    loadError() {
      return formatCronLogFailure(this.loadFailure, this.$t);
    }
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
      this.loadFailure = null;
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
            this.loadFailure = createCronLogFailure('cronLogs.list.feedback.invalidResponse');
            this.logList = [];
            this.total = 0;
            toast.error(this.loadError);
          }
        })
        .catch(error => {
          console.error('获取日志列表失败:', error);
          this.loadFailure = createCronLogFailure('cronLogs.list.feedback.loadFailed', error);
          this.logList = [];
          this.total = 0;
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
      confirmAction(this.$t('cronLogs.list.feedback.clearConfirm', { days: this.clearForm.keep_days }), this.$t('cronLogs.list.feedback.clearTitle'), {
        confirmButtonText: this.$t('common.actions.confirm'),
        cancelButtonText: this.$t('common.actions.cancel'),
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
              toast.success(this.$t('cronLogs.list.feedback.cleared', { count: deletedCount }));
              this.clearDialogVisible = false;
              this.fetchData();
            } else {
              toast.error(formatCronLogFailure(
                createCronLogFailure('cronLogs.list.feedback.clearFailed', response.data?.msg || response.data?.message),
                this.$t
              ));
            }
          })
        .catch(error => {
          console.error('清理日志失败:', error);
          toast.error(formatCronLogFailure(createCronLogFailure('cronLogs.list.feedback.clearFailed', error), this.$t));
          })
          .finally(() => {
            this.clearLoading = false;
          });
      }).catch(() => {
        toast.info(this.$t('cronLogs.list.feedback.clearCanceled'));
      });
    },

    getRunStatusText(status) {
      return cronRunStatusLabel(status, this.$t);
    },

    getRunStatusVariant(status) {
      return cronRunStatusVariant(status);
    },

    getTriggerTypeText(triggerType, isManual) {
      return cronTriggerLabel(triggerType, this.$t, isManual === 1);
    },
    formatDate(value) {
      return formatCronLogDate(value, this.$i18n.locale);
    },
    formatDuration(value) {
      return formatCronLogDuration(value, this.$i18n.locale, this.$t);
    },
    executorLabel(value) {
      return cronExecutorLabel(value, this.$t);
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

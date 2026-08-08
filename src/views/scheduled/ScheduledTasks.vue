<template>
  <div class="scheduled-tasks-container">
    <div class="page-header">
      <div>
        <h2 class="page-title">定时任务管理</h2>
        <p class="page-description">配置、执行并追踪服务器自动化任务</p>
      </div>
      <UiButton @click="navigateToCreate"><Plus data-icon="inline-start" />创建任务</UiButton>
    </div>

    <Card>
      <CardHeader class="flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>任务列表</CardTitle>
          <CardDescription>共 {{ totalTasks }} 个任务</CardDescription>
        </div>
        <UiButton variant="outline" size="sm" :disabled="loading" @click="refreshTasks">
          <Spinner v-if="loading" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          刷新
        </UiButton>
      </CardHeader>
      <CardContent>
        <div v-if="loading && taskList.length === 0" class="flex flex-col gap-3">
          <Skeleton v-for="index in 5" :key="index" class="h-12 w-full" />
        </div>
        <Empty v-else-if="taskList.length === 0">
          <EmptyHeader><EmptyTitle>暂无定时任务</EmptyTitle><EmptyDescription>创建第一个自动化任务以开始调度。</EmptyDescription></EmptyHeader>
          <EmptyContent><UiButton @click="navigateToCreate"><Plus data-icon="inline-start" />创建任务</UiButton></EmptyContent>
        </Empty>
        <div v-else class="overflow-x-auto">
          <ShadcnTable>
            <TableHeader><TableRow>
              <TableHead>任务名称</TableHead><TableHead>执行计划</TableHead><TableHead>目标服务器</TableHead>
              <TableHead>上次执行</TableHead><TableHead>下次执行</TableHead><TableHead>状态</TableHead><TableHead class="text-right">操作</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="task in taskList" :key="task.id" :class="task.status === '暂停' ? 'opacity-60' : ''">
                <TableCell><div class="flex min-w-44 items-center gap-2"><Badge variant="outline">{{ task.type }}</Badge><span class="font-medium">{{ task.name }}</span></div></TableCell>
                <TableCell><TooltipProvider><Tooltip><TooltipTrigger as-child><span class="inline-flex items-center gap-2 font-mono text-xs"><Clock />{{ task.schedule }}</span></TooltipTrigger><TooltipContent>{{ getScheduleDescription(task.schedule) }}</TooltipContent></Tooltip></TooltipProvider></TableCell>
                <TableCell><Badge variant="secondary">{{ task.target }}</Badge></TableCell>
                <TableCell class="whitespace-nowrap">{{ task.lastRun || '从未执行' }}</TableCell>
                <TableCell class="whitespace-nowrap">{{ task.nextRun }}</TableCell>
                <TableCell><Badge :variant="task.status === '正常' ? 'default' : 'secondary'">{{ task.status }}</Badge></TableCell>
                <TableCell><div class="flex justify-end gap-1">
                  <UiButton size="sm" variant="outline" :disabled="!canRunTask(task)" @click="runTaskNow(task)"><Play data-icon="inline-start" />执行</UiButton>
                  <UiButton size="sm" variant="ghost" @click="editTask(task)"><Pencil data-icon="inline-start" />编辑</UiButton>
                  <UiButton size="sm" variant="destructive" @click="deleteTask(task)"><Trash2 data-icon="inline-start" />删除</UiButton>
                </div></TableCell>
              </TableRow>
            </TableBody>
          </ShadcnTable>
        </div>

        <ShadcnPagination v-if="totalTasks > pageSize" v-model:page="currentPage" :total="totalTasks" :items-per-page="pageSize" show-edges class="mt-4" @update:page="handleCurrentChange">
          <PaginationContent v-slot="{ items }">
            <PaginationPrevious />
            <template v-for="(item, index) in items" :key="index">
              <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === currentPage">{{ item.value }}</PaginationItem>
              <PaginationEllipsis v-else :index="index" />
            </template>
            <PaginationNext />
          </PaginationContent>
        </ShadcnPagination>
      </CardContent>
    </Card>
  </div>
</template>

<script>
import { Clock, Pencil, Play, Plus, RefreshCw, Trash2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { cronTaskApi } from '@/api/index';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Pagination as ShadcnPagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { confirmAction } from '@/lib/feedback';

export default {
  name: 'ScheduledTasks',
  components: {
    Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Clock,
    Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle,
    PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious,
    Pencil, Play, Plus, RefreshCw, ShadcnPagination, ShadcnTable, Skeleton, Spinner, TableBody,
    TableCell, TableHead, TableHeader, TableRow, Tooltip, TooltipContent, TooltipProvider,
    TooltipTrigger, Trash2, UiButton
  },
  data() {
    return {
      loading: false,
      taskList: [],
      totalTasks: 0,
      currentPage: 1,
      pageSize: 10
    };
  },
  mounted() {
    this.fetchTasks();
  },
  methods: {
    fetchTasks() {
      this.loading = true;
      
      // 使用真实API获取任务列表
      cronTaskApi.getTasks({
        page: this.currentPage,
        limit: this.pageSize
      })
        .then(response => {
          if (response.data && response.data.status === 200) {
            const apiData = response.data.data.items || [];
            
            // 将API数据转换为组件所需的格式
            this.taskList = apiData.map(task => ({
              id: task.id,
              name: task.name,
              type: this.getTaskType(task),
              schedule: task.spec,
              target: task.type === 'function' ? '函数' : task.target || '全部服务器',
              lastRun: task.last_run || '从未执行',
              nextRun: task.next_run || '未计划',
              status: task.status === 1 ? '正常' : '暂停',
              raw: task // 保存原始数据，用于操作
            }));
            
            this.totalTasks = response.data.data.total || this.taskList.length;
          } else {
            this.taskList = [];
            this.totalTasks = 0;
            toast.error('获取任务列表失败');
          }
        })
        .catch(error => {
          this.taskList = [];
          this.totalTasks = 0;
          toast.error(error.message || '获取任务列表失败');
        })
        .finally(() => {
          this.loading = false;
        });
    },
    
    getTaskType(task) {
      // 根据任务特征确定类型
      if (task.type === 'function') {
        return '函数';
      } else if (task.type === 'shell') {
        if (task.target.includes('backup') || task.target.includes('备份')) {
          return '数据备份';
        } else if (task.target.includes('restart') || task.target.includes('重启')) {
          return '服务器维护';
        } else if (task.target.includes('clean') || task.target.includes('清理')) {
          return '系统维护';
        } else if (task.target.includes('notice') || task.target.includes('公告')) {
          return '公告通知';
        } else if (task.target.includes('mod') || task.target.includes('模组')) {
          return '模组管理';
        } else if (task.target.includes('stats') || task.target.includes('统计')) {
          return '数据分析';
        } else if (task.target.includes('event') || task.target.includes('活动')) {
          return '游戏活动';
        }
      }
      
      return task.group_name || '其他';
    },
    
    refreshTasks() {
      this.fetchTasks();
    },
    
    navigateToCreate() {
      this.$router.push('/cron/add');
    },
    
    handleCurrentChange(page) {
      this.currentPage = page;
      this.fetchTasks();
    },
    
    getScheduleDescription(schedule) {
      return schedule;
    },
    
    canRunTask(task) {
      return task.status === '正常';
    },
    
    async runTaskNow(task) {
      try {
        await confirmAction(`确定要立即执行任务“${task.name}”吗？`, '立即执行任务', { confirmButtonText: '执行' });
      } catch {
        return;
      }
        // 使用API执行任务
        if (task.raw && task.raw.id) {
          this.loading = true;
          
          cronTaskApi.runTask(task.raw.id)
            .then(response => {
              if (response.data && response.data.status === 200) {
                toast.success(`任务“${task.name}”已开始执行`);
                
                // 刷新任务列表
                this.fetchTasks();
              } else {
                toast.error(response.data.message || '执行任务失败');
              }
            })
            .catch(error => {
              console.error('执行任务失败:', error);
              toast.error('执行任务失败');
            })
            .finally(() => {
              this.loading = false;
            });
        } else {
          toast.error('任务缺少真实后端标识，无法执行');
        }
    },
    
    editTask(task) {
      if (task.raw && task.raw.id) {
        this.$router.push({
          path: '/cron/edit/' + task.raw.id
        });
      } else toast.error('任务缺少真实后端标识，无法编辑');
    },
    
    async deleteTask(task) {
      try {
        await confirmAction(`确定要删除任务“${task.name}”吗？此操作不可恢复。`, '删除任务', { confirmButtonText: '删除', type: 'warning' });
      } catch {
        return;
      }
        if (task.raw && task.raw.id) {
          // 使用API删除任务
          cronTaskApi.deleteTask(task.raw.id)
            .then(response => {
              if (response.data && response.data.status === 200) {
                toast.success(`任务“${task.name}”已删除`);
                
                // 刷新任务列表
                this.fetchTasks();
              } else {
                toast.error(response.data.message || '删除任务失败');
              }
            })
            .catch(error => {
              console.error('删除任务失败:', error);
              toast.error('删除任务失败');
            });
        } else toast.error('任务缺少真实后端标识，无法删除');
    }
  }
};
</script>

<style scoped>
.scheduled-tasks-container {
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

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--foreground);
}
.page-description {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 13px;
}
</style>

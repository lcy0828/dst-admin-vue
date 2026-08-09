<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">{{ group ? group.name : '任务组详情' }}</h1><p class="mt-1 text-sm text-muted-foreground">查看任务组配置和组内任务。</p></div>
      <div class="flex flex-wrap items-center gap-2"><automation-room-select @ready="handleAutomationRoom" @change="handleAutomationRoom" /><UiButton size="sm" @click="handleAddTask"><Plus data-icon="inline-start" />添加任务</UiButton><UiButton v-if="group" size="sm" variant="outline" @click="handleEditGroup"><Pencil data-icon="inline-start" />编辑任务组</UiButton><UiButton size="sm" variant="outline" @click="$router.push('/cron/groups')"><ArrowLeft data-icon="inline-start" />返回列表</UiButton></div>
    </header>
    <Card>
      <CardHeader><CardTitle>任务组信息</CardTitle><CardDescription>当前任务组配置及其包含的任务。</CardDescription></CardHeader>
      <CardContent>
        <div v-if="loading && !group" class="flex flex-col gap-3"><Skeleton class="h-36 w-full" /><Skeleton class="h-64 w-full" /></div>
        <div v-else-if="group" class="flex flex-col gap-6">
          <dl class="detail-grid"><div class="detail-item"><dt>组 ID</dt><dd>{{ group.id }}</dd></div><div class="detail-item"><dt>组名称</dt><dd>{{ group.name }}</dd></div><div class="detail-item"><dt>描述</dt><dd>{{ group.description || '无描述' }}</dd></div><div class="detail-item"><dt>类型</dt><dd><Badge variant="outline">{{ getTypeLabel(group.type) }}</Badge></dd></div><div class="detail-item"><dt>状态</dt><dd><Badge :variant="group.status === 1 ? 'default' : 'secondary'">{{ group.status === 1 ? '启用' : '禁用' }}</Badge></dd></div><div class="detail-item"><dt>任务数量</dt><dd>{{ group.task_count || 0 }} 个任务</dd></div></dl>
          <Separator />
          <div><h3 class="mb-3 text-sm font-semibold">任务列表</h3>
            <Empty v-if="taskList.length === 0"><EmptyHeader><EmptyTitle>该任务组下暂无任务</EmptyTitle></EmptyHeader><EmptyContent><UiButton @click="handleAddTask"><Plus data-icon="inline-start" />添加任务</UiButton></EmptyContent></Empty>
            <div v-else class="overflow-x-auto"><ShadcnTable><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>任务名称</TableHead><TableHead>Cron 表达式</TableHead><TableHead>类型</TableHead><TableHead>目标</TableHead><TableHead>状态</TableHead><TableHead class="text-right">操作</TableHead></TableRow></TableHeader><TableBody>
              <TableRow v-for="task in taskList" :key="task.id"><TableCell>{{ task.id }}</TableCell><TableCell><TooltipProvider><Tooltip><TooltipTrigger as-child><span class="font-medium">{{ task.name }}</span></TooltipTrigger><TooltipContent v-if="task.description">{{ task.description }}</TooltipContent></Tooltip></TooltipProvider></TableCell><TableCell class="font-mono text-xs">{{ task.spec }}</TableCell><TableCell><Badge variant="outline">{{ getTaskTypeLabel(task.type) }}</Badge></TableCell><TableCell><TooltipProvider><Tooltip><TooltipTrigger as-child><span class="block max-w-48 truncate">{{ truncate(task.target, 30) }}</span></TooltipTrigger><TooltipContent>{{ task.target }}</TooltipContent></Tooltip></TooltipProvider></TableCell><TableCell><Badge :variant="task.status === 1 ? 'default' : 'secondary'">{{ task.status === 1 ? '启用' : '禁用' }}</Badge></TableCell><TableCell><div class="flex justify-end gap-1"><UiButton size="sm" variant="outline" :disabled="loading" @click="handleRunNow(task)"><Spinner v-if="loading && currentTaskId === task.id" data-icon="inline-start" /><Play v-else data-icon="inline-start" />执行</UiButton><UiButton size="icon-sm" variant="ghost" title="编辑" :aria-label="`编辑任务 ${task.name}`" @click="handleEdit(task)"><Pencil /></UiButton><UiButton size="icon-sm" variant="destructive" title="删除" :aria-label="`删除任务 ${task.name}`" @click="handleDelete(task)"><Trash2 /></UiButton></div></TableCell></TableRow>
            </TableBody></ShadcnTable></div>
          </div>
        </div>
        <Empty v-else><EmptyHeader><EmptyTitle>未找到任务组</EmptyTitle><EmptyDescription>任务组可能已被删除。</EmptyDescription></EmptyHeader><EmptyContent><UiButton @click="$router.push('/cron/groups')">返回列表</UiButton></EmptyContent></Empty>
      </CardContent>
    </Card>

  </div>
</template>

<script>
import { ArrowLeft, Pencil, Play, Plus, Trash2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { cronTaskApi } from '@/api/index';
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { confirmAction } from '@/lib/feedback';

export default {
  name: 'TaskGroupDetail',
  components: {
    ArrowLeft, AutomationRoomSelect, Badge, Card, CardContent,
    CardDescription, CardHeader, CardTitle, Empty, EmptyContent, EmptyDescription,
    EmptyHeader, EmptyTitle, Pencil, Play, Plus, Separator, ShadcnTable, Skeleton, Spinner,
    TableBody, TableCell, TableHead, TableHeader, TableRow, Tooltip,
    TooltipContent, TooltipProvider, TooltipTrigger, Trash2, UiButton
  },
  data() {
    return {
      loading: false,
      groupId: null,
      group: null,
      taskList: [],
      currentTaskId: null
    };
  },
  created() {
    const { id } = this.$route.params;
    if (id) {
      this.groupId = id;
    }
  },
  methods: {
    truncate(value, length) {
      if (!value) return '';
      if (value.length <= length) return value;
      return value.substring(0, length) + '...';
    },
    handleAutomationRoom() {
      if (!this.groupId) return;
      this.fetchGroupDetail();
      this.fetchGroupTasks();
    },
    fetchGroupDetail() {
      this.loading = true;
      cronTaskApi.getGroupDetail(this.groupId)
        .then(response => {
          if (response.data && response.data.status === 200) {
            this.group = response.data.data;
          } else {
            toast.error(response.data.message || '获取任务组详情失败');
          }
        })
        .catch(error => {
          console.error('获取任务组详情失败:', error);
          toast.error('获取任务组详情失败');
        })
        .finally(() => {
          this.loading = false;
        });
    },
    fetchGroupTasks() {
      this.loading = true;
      cronTaskApi.getGroupTasks(this.groupId)
        .then(response => {
          if (response.data && response.data.status === 200) {
            this.taskList = response.data.data || [];
          } else {
            toast.error(response.data.message || '获取任务组下的任务失败');
          }
        })
        .catch(error => {
          console.error('获取任务组下的任务失败:', error);
          toast.error('获取任务组下的任务失败');
        })
        .finally(() => {
          this.loading = false;
        });
    },
    handleAddTask() {
      // 预设任务组
      this.$router.push({
        path: '/cron/add',
        query: { group_id: this.groupId }
      });
    },
    handleEditGroup() {
      this.$router.push(`/cron/group/edit/${this.groupId}`);
    },
    handleEdit(row) {
      this.$router.push(`/cron/edit/${row.id}`);
    },
    handleDelete(row) {
      confirmAction('确定要删除此任务吗？删除后不可恢复。', '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        cronTaskApi.deleteTask(row.id)
          .then(response => {
            if (response.data && response.data.status === 200) {
              toast.success('删除成功');
              this.fetchGroupTasks();
            } else {
              toast.error(response.data.message || '删除失败');
            }
          })
          .catch(error => {
            console.error('删除任务失败:', error);
            toast.error('删除任务失败');
          });
      }).catch(() => {
        toast.info('已取消删除');
      });
    },
    handleRunNow(row) {
      confirmAction('确定要立即执行此任务吗？', '确认执行', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        this.loading = true;
        this.currentTaskId = row.id;
        cronTaskApi.runTask(row.id)
          .then(response => {
            if (response.data && response.data.status === 200) {
              toast.success('任务已进入执行队列，请在执行日志中查看结果');
              this.fetchGroupTasks();
            } else {
              toast.error(response.data.message || '任务执行失败');
            }
          })
          .catch(error => {
            console.error('执行任务失败:', error);
            toast.error('执行任务失败');
          })
          .finally(() => {
            this.loading = false;
          });
      }).catch(() => {
        toast.info('已取消执行');
      });
    },
    viewTaskLogs(taskId) {
      this.$router.push({
        path: '/cron/logs',
        query: { task_id: taskId }
      });
    },
    getTypeLabel(type) {
      const types = {
        'system': '系统',
        'world': '世界',
        'custom': '自定义'
      };
      return types[type] || '未知';
    },
    getTaskTypeLabel(type) {
      return type === 'tmux_command' ? '内建命令' : '受控函数';
    }
  }
};
</script>

<style scoped>
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 0; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
.detail-item { display: grid; grid-template-columns: 112px minmax(0, 1fr); min-height: 44px; border-bottom: 1px solid var(--border); }
.detail-item:nth-child(odd) { border-right: 1px solid var(--border); }
.detail-item dt, .detail-item dd { display: flex; align-items: center; margin: 0; padding: 10px 12px; }
.detail-item dt { background: var(--muted); color: var(--muted-foreground); font-size: 12px; font-weight: 500; }
@media (max-width: 768px) { .detail-grid { grid-template-columns: 1fr; } .detail-item:nth-child(odd) { border-right: 0; } }
</style>

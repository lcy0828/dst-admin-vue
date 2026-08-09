<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">{{ group ? groupName(group) : cg('cronGroups.detail.fallbackTitle') }}</h1><p class="mt-1 text-sm text-muted-foreground">{{ cg('cronGroups.detail.subtitle') }}</p></div>
      <div class="flex flex-wrap items-center gap-2"><automation-room-select @ready="handleAutomationRoom" @change="handleAutomationRoom" /><UiButton size="sm" @click="handleAddTask"><Plus data-icon="inline-start" />{{ cg('cronGroups.actions.addTask') }}</UiButton><UiButton v-if="group" size="sm" variant="outline" @click="handleEditGroup"><Pencil data-icon="inline-start" />{{ cg('cronGroups.actions.editGroup') }}</UiButton><UiButton size="sm" variant="outline" @click="$router.push('/cron/groups')"><ArrowLeft data-icon="inline-start" />{{ cg('cronGroups.actions.backToList') }}</UiButton></div>
    </header>
    <Card>
      <CardHeader><CardTitle>{{ cg('cronGroups.detail.cardTitle') }}</CardTitle><CardDescription>{{ cg('cronGroups.detail.cardDescription') }}</CardDescription></CardHeader>
      <CardContent>
        <div v-if="loading && !group" class="flex flex-col gap-3"><Skeleton class="h-36 w-full" /><Skeleton class="h-64 w-full" /></div>
        <div v-else-if="group" class="flex flex-col gap-6">
          <dl class="detail-grid"><div class="detail-item"><dt>{{ cg('cronGroups.detail.fields.id') }}</dt><dd>{{ group.id }}</dd></div><div class="detail-item"><dt>{{ cg('cronGroups.detail.fields.name') }}</dt><dd>{{ groupName(group) }}</dd></div><div class="detail-item"><dt>{{ cg('cronGroups.detail.fields.description') }}</dt><dd>{{ groupDescription(group) }}</dd></div><div class="detail-item"><dt>{{ cg('cronGroups.detail.fields.type') }}</dt><dd><Badge variant="outline">{{ getTypeLabel(group.type) }}</Badge></dd></div><div class="detail-item"><dt>{{ cg('cronGroups.detail.fields.status') }}</dt><dd><Badge :variant="statusMeta(group.status).variant">{{ statusMeta(group.status).label }}</Badge></dd></div><div class="detail-item"><dt>{{ cg('cronGroups.detail.fields.taskCount') }}</dt><dd>{{ taskCountLabel(group.task_count) }}</dd></div></dl>
          <Separator />
          <div><h3 class="mb-3 text-sm font-semibold">{{ cg('cronGroups.detail.taskList') }}</h3>
            <Empty v-if="taskList.length === 0"><EmptyHeader><EmptyTitle>{{ cg('cronGroups.detail.emptyTasks') }}</EmptyTitle></EmptyHeader><EmptyContent><UiButton @click="handleAddTask"><Plus data-icon="inline-start" />{{ cg('cronGroups.actions.addTask') }}</UiButton></EmptyContent></Empty>
            <div v-else class="overflow-x-auto"><ShadcnTable><TableHeader><TableRow><TableHead>{{ cg('cronGroups.detail.columns.id') }}</TableHead><TableHead>{{ cg('cronGroups.detail.columns.name') }}</TableHead><TableHead>{{ cg('cronGroups.detail.columns.schedule') }}</TableHead><TableHead>{{ cg('cronGroups.detail.columns.type') }}</TableHead><TableHead>{{ cg('cronGroups.detail.columns.target') }}</TableHead><TableHead>{{ cg('cronGroups.detail.columns.status') }}</TableHead><TableHead class="text-right">{{ cg('cronGroups.detail.columns.actions') }}</TableHead></TableRow></TableHeader><TableBody>
              <TableRow v-for="task in taskList" :key="task.id"><TableCell>{{ task.id }}</TableCell><TableCell><TooltipProvider><Tooltip><TooltipTrigger as-child><span class="font-medium">{{ task.name }}</span></TooltipTrigger><TooltipContent v-if="task.description">{{ task.description }}</TooltipContent></Tooltip></TooltipProvider></TableCell><TableCell class="font-mono text-xs">{{ task.spec }}</TableCell><TableCell><Badge variant="outline">{{ getTaskTypeLabel(task.type) }}</Badge></TableCell><TableCell><TooltipProvider><Tooltip><TooltipTrigger as-child><span class="block max-w-48 truncate">{{ truncate(task.target, 30) }}</span></TooltipTrigger><TooltipContent>{{ task.target }}</TooltipContent></Tooltip></TooltipProvider></TableCell><TableCell><Badge :variant="statusMeta(task.status).variant">{{ statusMeta(task.status).label }}</Badge></TableCell><TableCell><div class="flex justify-end gap-1"><UiButton size="sm" variant="outline" :disabled="loading" @click="handleRunNow(task)"><Spinner v-if="loading && currentTaskId === task.id" data-icon="inline-start" /><Play v-else data-icon="inline-start" />{{ cg('cronGroups.actions.execute') }}</UiButton><UiButton size="icon-sm" variant="ghost" :title="cg('cronGroups.detail.editTaskTitle')" :aria-label="cg('cronGroups.detail.editTaskAria', { name: task.name })" @click="handleEdit(task)"><Pencil /></UiButton><UiButton size="icon-sm" variant="destructive" :title="cg('cronGroups.detail.deleteTaskTitle')" :aria-label="cg('cronGroups.detail.deleteTaskAria', { name: task.name })" @click="handleDelete(task)"><Trash2 /></UiButton></div></TableCell></TableRow>
            </TableBody></ShadcnTable></div>
          </div>
        </div>
        <Empty v-else><EmptyHeader><EmptyTitle>{{ cg('cronGroups.detail.notFound') }}</EmptyTitle><EmptyDescription>{{ cg('cronGroups.detail.notFoundDescription') }}</EmptyDescription></EmptyHeader><EmptyContent><UiButton @click="$router.push('/cron/groups')">{{ cg('cronGroups.actions.backToList') }}</UiButton></EmptyContent></Empty>
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
import {
  cronGroupDescriptionLabel,
  cronGroupNameLabel,
  cronGroupStatusMeta,
  cronGroupText,
  cronGroupTypeLabel,
  cronTaskTypeLabel,
  formatCronGroupError,
  formatCronGroupNumber
} from '@/i18n/cronGroupMessages';
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
    cg(key, parameters = {}) {
      return cronGroupText(this.$i18n.locale, key, parameters);
    },
    groupName(group) {
      return cronGroupNameLabel(group, this.cg);
    },
    groupDescription(group) {
      return cronGroupDescriptionLabel(group, this.cg);
    },
    getTypeLabel(type) {
      return cronGroupTypeLabel(type, this.cg);
    },
    getTaskTypeLabel(type) {
      return cronTaskTypeLabel(type, this.cg);
    },
    statusMeta(status) {
      return cronGroupStatusMeta(status, this.cg);
    },
    taskCountLabel(value) {
      return this.cg('cronGroups.list.taskCount', {
        count: formatCronGroupNumber(value || 0, this.$i18n.locale)
      });
    },
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
            toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.detail', response));
          }
        })
        .catch(error => {
          console.error('Could not load task group details:', error);
          toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.detail', error));
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
            toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.tasks', response));
          }
        })
        .catch(error => {
          console.error('Could not load tasks in the group:', error);
          toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.tasks', error));
        })
        .finally(() => {
          this.loading = false;
        });
    },
    handleAddTask() {
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
      confirmAction(this.cg('cronGroups.confirmation.deleteTask'), this.cg('cronGroups.confirmation.deleteTaskTitle'), {
        confirmButtonText: this.cg('cronGroups.actions.confirm'),
        cancelButtonText: this.cg('cronGroups.actions.cancel'),
        type: 'warning'
      }).then(() => {
        cronTaskApi.deleteTask(row.id)
          .then(response => {
            if (response.data && response.data.status === 200) {
              toast.success(this.cg('cronGroups.feedback.taskDeleted'));
              this.fetchGroupTasks();
            } else {
              toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.deleteTask', response));
            }
          })
          .catch(error => {
            console.error('Could not delete the task:', error);
            toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.deleteTask', error));
          });
      }).catch(() => {
        toast.info(this.cg('cronGroups.feedback.deleteCanceled'));
      });
    },
    handleRunNow(row) {
      confirmAction(this.cg('cronGroups.confirmation.runTask'), this.cg('cronGroups.confirmation.runTaskTitle'), {
        confirmButtonText: this.cg('cronGroups.actions.confirm'),
        cancelButtonText: this.cg('cronGroups.actions.cancel'),
        type: 'info'
      }).then(() => {
        this.loading = true;
        this.currentTaskId = row.id;
        cronTaskApi.runTask(row.id)
          .then(response => {
            if (response.data && response.data.status === 200) {
              toast.success(this.cg('cronGroups.feedback.taskQueued'));
              this.fetchGroupTasks();
            } else {
              toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.runTask', response));
            }
          })
          .catch(error => {
            console.error('Could not run the task:', error);
            toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.runTask', error));
          })
          .finally(() => {
            this.loading = false;
            this.currentTaskId = null;
          });
      }).catch(() => {
        toast.info(this.cg('cronGroups.feedback.executionCanceled'));
      });
    },
    viewTaskLogs(taskId) {
      this.$router.push({
        path: '/cron/logs',
        query: { task_id: taskId }
      });
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

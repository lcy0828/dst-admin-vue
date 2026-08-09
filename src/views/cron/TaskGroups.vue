<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">{{ cg('cronGroups.list.title') }}</h1><p class="mt-1 text-sm text-muted-foreground">{{ cg('cronGroups.list.subtitle') }}</p></div>
      <div class="flex flex-wrap items-center gap-2"><automation-room-select @ready="fetchData" @change="fetchData" />
        <UiButton size="sm" @click="$router.push('/cron/group/add')"><Plus data-icon="inline-start" />{{ cg('cronGroups.actions.addGroup') }}</UiButton>
        <UiButton size="sm" variant="outline" :disabled="loading" @click="fetchData"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ cg('cronGroups.actions.refresh') }}</UiButton>
        <UiButton size="sm" variant="outline" @click="$router.push('/cron/tasks')"><ArrowLeft data-icon="inline-start" />{{ cg('cronGroups.actions.backToTasks') }}</UiButton>
      </div>
    </header>
    <Card>
      <CardHeader><CardTitle>{{ cg('cronGroups.list.cardTitle') }}</CardTitle><CardDescription>{{ cg('cronGroups.list.cardDescription') }}</CardDescription></CardHeader>
      <CardContent>
        <div v-if="loading && groupList.length === 0" class="flex flex-col gap-3"><Skeleton v-for="index in 5" :key="index" class="h-12 w-full" /></div>
        <Empty v-else-if="groupList.length === 0"><EmptyHeader><EmptyTitle>{{ cg('cronGroups.list.emptyTitle') }}</EmptyTitle><EmptyDescription>{{ cg('cronGroups.list.emptyDescription') }}</EmptyDescription></EmptyHeader><EmptyContent><UiButton @click="$router.push('/cron/group/add')"><Plus data-icon="inline-start" />{{ cg('cronGroups.actions.addGroup') }}</UiButton></EmptyContent></Empty>
        <div v-else class="overflow-x-auto">
          <ShadcnTable>
            <TableHeader><TableRow><TableHead>{{ cg('cronGroups.list.columns.id') }}</TableHead><TableHead>{{ cg('cronGroups.list.columns.name') }}</TableHead><TableHead>{{ cg('cronGroups.list.columns.description') }}</TableHead><TableHead>{{ cg('cronGroups.list.columns.type') }}</TableHead><TableHead>{{ cg('cronGroups.list.columns.taskCount') }}</TableHead><TableHead>{{ cg('cronGroups.list.columns.status') }}</TableHead><TableHead class="text-right">{{ cg('cronGroups.list.columns.actions') }}</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="group in groupList" :key="group.id">
                <TableCell>{{ group.id }}</TableCell>
                <TableCell><router-link :to="`/cron/group/${group.id}`" class="link-type">{{ groupName(group) }}</router-link></TableCell>
                <TableCell class="max-w-64 truncate">{{ groupDescription(group) }}</TableCell>
                <TableCell><Badge variant="outline">{{ getTypeLabel(group.type) }}</Badge></TableCell>
                <TableCell><router-link :to="`/cron/group/${group.id}`"><Badge variant="secondary">{{ taskCountLabel(group.task_count) }}</Badge></router-link></TableCell>
                <TableCell><Badge :variant="statusMeta(group.status).variant">{{ statusMeta(group.status).label }}</Badge></TableCell>
                <TableCell><div class="flex min-w-max justify-end gap-1">
                  <UiButton size="icon-sm" variant="outline" :title="cg(group.status === 1 ? 'cronGroups.values.disabled' : 'cronGroups.values.enabled')" :aria-label="cg(group.status === 1 ? 'cronGroups.list.aria.disable' : 'cronGroups.list.aria.enable', { name: groupName(group) })" @click="handleToggleStatus(group)"><CircleOff v-if="group.status === 1" /><CircleCheck v-else /></UiButton>
                  <UiButton size="icon-sm" variant="ghost" :title="cg('cronGroups.actions.edit')" :aria-label="cg('cronGroups.list.aria.edit', { name: groupName(group) })" @click="handleEdit(group)"><Pencil /></UiButton>
                  <UiButton size="icon-sm" variant="ghost" :title="cg('cronGroups.actions.details')" :aria-label="cg('cronGroups.list.aria.details', { name: groupName(group) })" @click="$router.push(`/cron/group/${group.id}`)"><Eye /></UiButton>
                  <UiButton size="icon-sm" variant="ghost" :title="cg('cronGroups.actions.statistics')" :aria-label="cg('cronGroups.list.aria.statistics', { name: groupName(group) })" @click="viewGroupStats(group.id)"><ChartNoAxesColumn /></UiButton>
                  <UiButton size="icon-sm" variant="destructive" :title="cg('cronGroups.actions.delete')" :aria-label="cg('cronGroups.list.aria.delete', { name: groupName(group) })" :disabled="group.task_count > 0" @click="handleDelete(group)"><Trash2 /></UiButton>
                </div></TableCell>
              </TableRow>
            </TableBody>
          </ShadcnTable>
        </div>
      </CardContent>
    </Card>

    <UiDialog v-model:open="statsDialogVisible">
      <DialogScrollContent class="max-w-4xl">
        <DialogHeader><DialogTitle>{{ cg('cronGroups.statistics.title') }}</DialogTitle><DialogDescription>{{ cg('cronGroups.statistics.description') }}</DialogDescription></DialogHeader>
        <div v-if="statsLoading" class="flex flex-col gap-3"><Skeleton class="h-20 w-full" /><Skeleton class="h-72 w-full" /></div>
        <div v-else class="group-stats">
        <div v-if="groupStats" class="stats-overview">
          <Card><CardHeader><CardTitle>{{ cg('cronGroups.statistics.totalTasks') }}</CardTitle><CardDescription>{{ cg('cronGroups.statistics.totalTasksDescription') }}</CardDescription></CardHeader><CardContent class="pt-1"><strong class="text-2xl font-semibold tabular-nums">{{ formatNumber(groupStats.total_tasks) }}</strong></CardContent></Card>
          <Card><CardHeader><CardTitle>{{ cg('cronGroups.statistics.enabledTasks') }}</CardTitle><CardDescription>{{ cg('cronGroups.statistics.enabledTasksDescription') }}</CardDescription></CardHeader><CardContent class="pt-1"><strong class="text-2xl font-semibold tabular-nums">{{ formatNumber(groupStats.enabled_tasks) }}</strong></CardContent></Card>
          <Card><CardHeader><CardTitle>{{ cg('cronGroups.statistics.successRate') }}</CardTitle><CardDescription>{{ cg('cronGroups.statistics.successRateDescription') }}</CardDescription></CardHeader><CardContent class="pt-1"><strong class="text-2xl font-semibold tabular-nums">{{ formatPercent(groupStats.success_rate) }}</strong></CardContent></Card>
          <Card><CardHeader><CardTitle>{{ cg('cronGroups.statistics.averageDuration') }}</CardTitle><CardDescription>{{ cg('cronGroups.statistics.averageDurationDescription') }}</CardDescription></CardHeader><CardContent class="pt-1"><strong class="text-2xl font-semibold tabular-nums">{{ formatDuration(groupStats.avg_duration) }}</strong></CardContent></Card>
        </div>
        <div class="stats-charts" v-if="groupStats">
          <div id="groupExecutionChart" class="h-72 w-full"></div>
        </div>
        <Empty v-else><EmptyHeader><EmptyTitle>{{ cg('cronGroups.statistics.empty') }}</EmptyTitle></EmptyHeader></Empty>
        </div>
        <DialogFooter><UiButton variant="outline" @click="statsDialogVisible = false">{{ cg('cronGroups.actions.close') }}</UiButton><UiButton @click="$router.push('/cron/charts')">{{ cg('cronGroups.actions.moreCharts') }}</UiButton></DialogFooter>
      </DialogScrollContent>
    </UiDialog>
  </div>
</template>

<script>
import { ArrowLeft, ChartNoAxesColumn, CircleCheck, CircleOff, Eye, Pencil, Plus, RefreshCw, Trash2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { cronTaskApi } from '@/api/index';
import { echarts } from '@/lib/echarts.mjs';
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  cronGroupDescriptionLabel,
  cronGroupNameLabel,
  cronGroupStatusMeta,
  cronGroupText,
  cronGroupTypeLabel,
  formatCronGroupDate,
  formatCronGroupDuration,
  formatCronGroupError,
  formatCronGroupNumber,
  formatCronGroupPercent
} from '@/i18n/cronGroupMessages';
import { confirmAction } from '@/lib/feedback';
import { getSystemPreferences } from '@/utils/systemPreferences';

export default {
  name: 'TaskGroups',
  components: {
    ArrowLeft, AutomationRoomSelect, Badge, Card, CardContent, CardDescription,
    CardHeader, CardTitle, ChartNoAxesColumn, CircleCheck, CircleOff,
    DialogDescription, DialogFooter, DialogHeader, DialogTitle, Empty, EmptyContent,
    EmptyDescription, EmptyHeader, EmptyTitle, Eye, Pencil, Plus, RefreshCw, Skeleton,
    ShadcnTable, Spinner, TableBody, TableCell, TableHead, TableHeader, TableRow, Trash2,
    UiButton, UiDialog, DialogScrollContent
  },
  data() {
    return {
      loading: false,
      statsLoading: false,
      groupList: [],
      statsDialogVisible: false,
      groupStats: null,
      chartData: null,
      executionChart: null,
      currentGroupId: null
    };
  },
  watch: {
    '$i18n.locale'() {
      if (this.statsDialogVisible && this.chartData) {
        this.$nextTick(() => this.initGroupExecutionChart(this.chartData));
      }
    },
    statsDialogVisible(visible) {
      if (!visible) this.disposeChart();
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
    statusMeta(status) {
      return cronGroupStatusMeta(status, this.cg);
    },
    taskCountLabel(value) {
      return this.cg('cronGroups.list.taskCount', { count: this.formatNumber(value || 0) });
    },
    formatNumber(value) {
      return formatCronGroupNumber(value, this.$i18n.locale);
    },
    formatPercent(value) {
      return formatCronGroupPercent(value, this.$i18n.locale);
    },
    formatDuration(value) {
      return formatCronGroupDuration(value, this.$i18n.locale, this.cg);
    },
    disposeChart() {
      if (!this.executionChart) return;
      this.executionChart.dispose();
      this.executionChart = null;
    },
    chartColor(variable) {
      return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || getSystemPreferences().theme;
    },
    themedChartOption(option) {
      const foreground = this.chartColor('--foreground');
      const muted = this.chartColor('--muted-foreground');
      const border = this.chartColor('--border');
      const themeAxis = axis => ({
        ...axis,
        axisLabel: { color: muted, ...axis?.axisLabel },
        axisLine: { ...axis?.axisLine, lineStyle: { color: border, ...axis?.axisLine?.lineStyle } },
        splitLine: { ...axis?.splitLine, lineStyle: { color: border, ...axis?.splitLine?.lineStyle } }
      });
      return {
        ...option,
        backgroundColor: 'transparent',
        textStyle: { color: foreground, ...option.textStyle },
        title: { ...option.title, textStyle: { color: foreground, ...option.title?.textStyle } },
        legend: { ...option.legend, textStyle: { color: muted, ...option.legend?.textStyle } },
        xAxis: themeAxis(option.xAxis),
        yAxis: themeAxis(option.yAxis)
      };
    },
    fetchData() {
      this.loading = true;
      cronTaskApi.getGroups()
        .then(response => {
          let groupsData = [];
          let success = false;

          if (response && response.data) {
            if (response.data.code === 200 && Array.isArray(response.data.data)) {
              groupsData = response.data.data;
              success = true;
            } else if (response.data.code === 200 && response.data.data && Array.isArray(response.data.data.items)) {
              groupsData = response.data.data.items;
              success = true;
            } else if (response.data.status === 200 && Array.isArray(response.data.data)) {
              groupsData = response.data.data;
              success = true;
            } else if (Array.isArray(response.data)) {
              groupsData = response.data;
              success = true;
            }
          }

          if (success) {
            groupsData.forEach(group => {
              if (group.task_count === undefined && group.tasks !== undefined) {
                group.task_count = Array.isArray(group.tasks) ? group.tasks.length : 0;
              } else if (group.task_count === undefined) {
                group.task_count = 0;
              }
            });
            this.groupList = groupsData;
          } else {
            toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.list', {
              detail: response?.data?.msg || response?.data?.message || this.cg('cronGroups.errors.invalidResponse')
            }));
            this.groupList = [];
          }
        })
        .catch(error => {
          console.error('Could not load task groups:', error);
          toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.list', error));
        })
        .finally(() => {
          this.loading = false;
        });
    },
    handleEdit(row) {
      this.$router.push(`/cron/group/edit/${row.id}`);
    },
    handleDelete(row) {
      if (row.task_count > 0) {
        toast.warning(this.cg('cronGroups.feedback.groupNotEmpty'));
        return;
      }

      confirmAction(this.cg('cronGroups.confirmation.deleteGroup'), this.cg('cronGroups.confirmation.deleteGroupTitle'), {
        confirmButtonText: this.cg('cronGroups.actions.confirm'),
        cancelButtonText: this.cg('cronGroups.actions.cancel'),
        type: 'warning'
      }).then(() => {
        cronTaskApi.deleteGroup(row.id)
          .then(response => {
            if (response.data && (response.data.code === 200 || response.data.status === 200)) {
              toast.success(this.cg('cronGroups.feedback.groupDeleted'));
              this.fetchData();
            } else {
              toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.deleteGroup', response));
            }
          })
          .catch(error => {
            console.error('Could not delete the task group:', error);
            toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.deleteGroup', error));
          });
      }).catch(() => {
        toast.info(this.cg('cronGroups.feedback.deleteCanceled'));
      });
    },
    handleToggleStatus(row) {
      const disabling = row.status === 1;
      const actionApi = disabling ? cronTaskApi.disableGroup : cronTaskApi.enableGroup;
      const confirmationKey = disabling ? 'disableGroup' : 'enableGroup';
      const errorKey = disabling ? 'disableGroup' : 'enableGroup';

      confirmAction(this.cg(`cronGroups.confirmation.${confirmationKey}`), this.cg(`cronGroups.confirmation.${confirmationKey}Title`), {
        confirmButtonText: this.cg('cronGroups.actions.confirm'),
        cancelButtonText: this.cg('cronGroups.actions.cancel'),
        type: 'warning'
      }).then(() => {
        actionApi(row.id)
          .then(response => {
            if (response.data && (response.data.code === 200 || response.data.status === 200)) {
              toast.success(this.cg(disabling ? 'cronGroups.feedback.groupDisabled' : 'cronGroups.feedback.groupEnabled'));
              this.fetchData();
            } else {
              toast.error(formatCronGroupError(this.cg, `cronGroups.errors.${errorKey}`, response));
            }
          })
          .catch(error => {
            console.error(`Could not ${disabling ? 'disable' : 'enable'} the task group:`, error);
            toast.error(formatCronGroupError(this.cg, `cronGroups.errors.${errorKey}`, error));
          });
      }).catch(() => {
        toast.info(this.cg(disabling ? 'cronGroups.feedback.disableCanceled' : 'cronGroups.feedback.enableCanceled'));
      });
    },
    async viewGroupStats(groupId) {
      this.statsDialogVisible = true;
      this.statsLoading = true;
      this.currentGroupId = groupId;
      this.groupStats = null;
      this.chartData = null;
      this.disposeChart();

      try {
        const response = await cronTaskApi.getGroupStats(groupId);
        if (!response.data || (response.data.code !== 200 && response.data.status !== 200)) {
          toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.statistics', response));
          return;
        }
        this.groupStats = response.data.data;

        try {
          const chartResponse = await cronTaskApi.getGroupChart(groupId, { days: 30 });
          if (!chartResponse.data || (chartResponse.data.code !== 200 && chartResponse.data.status !== 200)) {
            toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.chart', chartResponse));
            return;
          }
          this.chartData = chartResponse.data.data || {};
          this.statsLoading = false;
          await this.$nextTick();
          this.initGroupExecutionChart(this.chartData);
        } catch (error) {
          console.error('Could not load the task group chart:', error);
          toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.chart', error));
        }
      } catch (error) {
        console.error('Could not load task group statistics:', error);
        toast.error(formatCronGroupError(this.cg, 'cronGroups.errors.statistics', error));
      } finally {
        this.statsLoading = false;
      }
    },
    initGroupExecutionChart(data) {
      const chartDom = document.getElementById('groupExecutionChart');
      if (!chartDom) return;

      this.disposeChart();
      this.executionChart = echarts.init(chartDom);

      const successLabel = this.cg('cronGroups.statistics.success');
      const failedLabel = this.cg('cronGroups.statistics.failed');
      const option = {
        title: {
          text: this.cg('cronGroups.statistics.chartTitle'),
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          data: [successLabel, failedLabel],
          bottom: 10
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: (data.dates || []).map(value => formatCronGroupDate(value, this.$i18n.locale))
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: successLabel,
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: this.chartColor('--primary')
            },
            data: data.success || []
          },
          {
            name: failedLabel,
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: this.chartColor('--destructive')
            },
            data: data.failed || []
          }
        ]
      };

      this.executionChart.setOption(this.themedChartOption(option));
    }
  },
  beforeUnmount() {
    this.disposeChart();
  }
};
</script>

<style scoped>
.task-count {
  font-size: 14px;
}
.task-count-badge {
  margin-top: 10px;
}
.link-type {
  color: var(--primary);
  text-decoration: none;
}
.link-type:hover {
  text-decoration: underline;
}
.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}
.stats-charts {
  margin-top: 20px;
}

@media (max-width: 768px) {
  .stats-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

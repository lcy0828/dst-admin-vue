<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">{{ text('charts.title') }}</h1><p class="mt-1 text-sm text-muted-foreground">{{ text('charts.subtitle') }}</p></div>
      <div class="flex flex-wrap items-center gap-2"><automation-room-select @ready="handleAutomationRoom" @change="handleAutomationRoom" /><UiButton size="sm" :disabled="loading" @click="loadAllCharts"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ text('common.actions.refreshData') }}</UiButton><UiButton size="sm" variant="outline" @click="$router.push('/cron/tasks')"><ArrowLeft data-icon="inline-start" />{{ text('common.actions.backToTasks') }}</UiButton></div>
    </header>
    <Card>
      <CardHeader><CardTitle>{{ text('charts.rangeTitle') }}</CardTitle><CardDescription>{{ text('charts.rangeDescription') }}</CardDescription></CardHeader>
      <CardContent>
        <FieldGroup class="filter-grid">
          <Field><FieldLabel for="chart-date-range">{{ text('charts.fields.range') }}</FieldLabel><UiSelect v-model="dateRange" @update:model-value="loadAllCharts"><SelectTrigger id="chart-date-range"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="7">{{ text('charts.ranges.days7') }}</SelectItem><SelectItem value="30">{{ text('charts.ranges.days30') }}</SelectItem><SelectItem value="90">{{ text('charts.ranges.days90') }}</SelectItem><SelectItem value="180">{{ text('charts.ranges.days180') }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field><FieldLabel for="chart-group">{{ text('charts.fields.group') }}</FieldLabel><UiSelect v-model="groupId" @update:model-value="handleGroupChange"><SelectTrigger id="chart-group"><SelectValue :placeholder="text('charts.fields.selectGroup')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">{{ text('common.values.all') }}</SelectItem><SelectItem v-for="group in groups" :key="group.id" :value="String(group.id)">{{ groupLabel(group.name) }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field v-if="groupId && groupId !== 'all'"><FieldLabel for="chart-task">{{ text('charts.fields.task') }}</FieldLabel><UiSelect v-model="taskId" @update:model-value="loadTaskCharts"><SelectTrigger id="chart-task"><SelectValue :placeholder="text('charts.fields.selectTask')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">{{ text('common.values.all') }}</SelectItem><SelectItem v-for="task in tasks" :key="task.id" :value="String(task.id)">{{ task.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
        </FieldGroup>
        <Alert v-if="loadError" variant="destructive"><CircleAlert /><AlertTitle>{{ text('charts.loadFailedTitle') }}</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription></Alert>
      </CardContent>
    </Card>

    <div v-if="loading" class="flex flex-col gap-4"><Skeleton class="h-36 w-full" /><Skeleton class="h-96 w-full" /></div>
    <div v-else class="flex min-w-0 flex-col gap-6">
      <div class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Card><CardHeader><CardTitle>{{ text('charts.metrics.totalTasks') }}</CardTitle><CardDescription>{{ text('charts.metrics.currentRange') }}</CardDescription></CardHeader><CardContent class="min-h-16 pt-1"><strong class="text-3xl font-semibold tabular-nums">{{ overview.total_tasks || 0 }}</strong></CardContent></Card>
        <Card><CardHeader><CardTitle>{{ text('charts.metrics.totalExecutions') }}</CardTitle><CardDescription>{{ text('charts.metrics.cumulativeRuns') }}</CardDescription></CardHeader><CardContent class="min-h-16 pt-1"><strong class="text-3xl font-semibold tabular-nums">{{ overview.total_executions || 0 }}</strong></CardContent></Card>
        <Card><CardHeader><CardTitle>{{ text('charts.metrics.successRate') }}</CardTitle><CardDescription>{{ text('charts.metrics.successShare') }}</CardDescription></CardHeader><CardContent class="min-h-16 pt-1"><strong class="text-3xl font-semibold tabular-nums">{{ overview.success_rate || 0 }}%</strong></CardContent></Card>
        <Card><CardHeader><CardTitle>{{ text('charts.metrics.averageDuration') }}</CardTitle><CardDescription>{{ text('charts.metrics.allCompleted') }}</CardDescription></CardHeader><CardContent class="min-h-16 pt-1"><strong class="text-3xl font-semibold tabular-nums">{{ text('common.units.seconds', { value: overview.avg_duration || 0 }) }}</strong></CardContent></Card>
      </div>

      <div class="grid min-w-0 gap-6 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>{{ text('charts.cards.overview') }}</CardTitle><CardDescription>{{ text('charts.cards.overviewDescription') }}</CardDescription></CardHeader><CardContent class="pt-1"><div id="overviewChart" class="chart-box"></div></CardContent></Card>
        <Card><CardHeader><CardTitle>{{ text('charts.cards.duration') }}</CardTitle><CardDescription>{{ text('charts.cards.durationDescription') }}</CardDescription></CardHeader><CardContent class="pt-1"><div id="durationChart" class="chart-box"></div></CardContent></Card>
      </div>

      <Card v-if="groupId && groupId !== 'all' && (!taskId || taskId === 'all')"><CardHeader><CardTitle>{{ text('charts.cards.group') }}</CardTitle><CardDescription>{{ text('charts.cards.groupDescription') }}</CardDescription></CardHeader><CardContent class="pt-1"><div id="groupTasksChart" class="chart-box"></div></CardContent></Card>

      <div v-if="taskId && taskId !== 'all'" class="grid min-w-0 gap-6 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>{{ text('charts.cards.task') }}</CardTitle><CardDescription>{{ text('charts.cards.taskDescription') }}</CardDescription></CardHeader><CardContent class="pt-1"><div id="taskExecutionChart" class="chart-box"></div></CardContent></Card>
        <Card><CardHeader><CardTitle>{{ text('charts.cards.taskDuration') }}</CardTitle><CardDescription>{{ text('charts.cards.taskDurationDescription') }}</CardDescription></CardHeader><CardContent class="pt-1"><div id="taskDurationChart" class="chart-box"></div></CardContent></Card>
      </div>
    </div>
  </div>
</template>

<script>
import { ArrowLeft, CircleAlert, RefreshCw } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { cronTaskApi } from '@/api/index';
import { echarts } from '@/lib/echarts.mjs';
import { LineChart, PieChart } from 'echarts/charts';

echarts.use([LineChart, PieChart]);
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  createCronTaskFailure,
  cronTaskFailureText,
  cronTaskGroupLabel,
  cronTaskText
} from '@/i18n/cronTaskMessages';
import { getSystemPreferences } from '@/utils/systemPreferences';

export default {
  name: 'TaskCharts',
  components: {
    Alert, AlertDescription, AlertTitle, ArrowLeft, AutomationRoomSelect, Card, CardContent,
    CardDescription, CardHeader, CardTitle, CircleAlert, Field, FieldGroup, FieldLabel,
    RefreshCw, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, Skeleton,
    Spinner, UiButton, UiSelect
  },
  data() {
    return {
      loading: false,
      loadFailure: null,
      dateRange: '30',
      groupId: '',
      taskId: '',
      groups: [],
      tasks: [],
      overview: {},
      charts: {
        overviewChart: null,
        durationChart: null,
        groupTasksChart: null,
        taskExecutionChart: null,
        taskDurationChart: null
      },
      chartData: {
        overviewChart: null,
        durationChart: null,
        groupTasksChart: null,
        taskExecutionChart: null,
        taskDurationChart: null
      }
    };
  },
  computed: {
    activeLocale() {
      const state = this.$i18n?.locale;
      return typeof state === 'string' ? state : (state?.value || 'zh-CN');
    },
    loadError() {
      return cronTaskFailureText(this.loadFailure, this.activeLocale);
    }
  },
  watch: {
    activeLocale() {
      this.$nextTick(this.renderChartsForLocale);
    }
  },
  mounted() {
    // 处理窗口调整大小时重新渲染图表
    window.addEventListener('resize', this.resizeCharts);
  },
  beforeUnmount() {
    // 销毁图表实例
    Object.keys(this.charts).forEach(key => {
      if (this.charts[key]) {
        this.charts[key].dispose();
        this.charts[key] = null;
      }
    });
    
    window.removeEventListener('resize', this.resizeCharts);
  },
  methods: {
    text(key, parameters) {
      return cronTaskText(key, this.activeLocale, parameters);
    },
    groupLabel(name) {
      return cronTaskGroupLabel(name, this.activeLocale);
    },
    setLoadFailure(key, error) {
      this.loadFailure = createCronTaskFailure(key, error);
      toast.error(cronTaskFailureText(this.loadFailure, this.activeLocale));
    },
    renderChartsForLocale() {
      if (this.chartData.overviewChart) this.initOverviewChart(this.chartData.overviewChart);
      if (this.chartData.durationChart) this.initDurationChart(this.chartData.durationChart);
      if (this.chartData.groupTasksChart) this.initGroupTasksChart(this.chartData.groupTasksChart);
      if (this.chartData.taskExecutionChart) this.initTaskExecutionChart(this.chartData.taskExecutionChart);
      if (this.chartData.taskDurationChart) this.initTaskDurationChart(this.chartData.taskDurationChart);
    },
    chartColor(variable) {
      const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
      return value || getSystemPreferences().theme;
    },
    themedChartOption(option) {
      const foreground = this.chartColor('--foreground');
      const muted = this.chartColor('--muted-foreground');
      const border = this.chartColor('--border');
      const themeAxis = axis => {
        if (Array.isArray(axis)) return axis.map(themeAxis);
        if (!axis) return axis;
        return {
          ...axis,
          nameTextStyle: { color: muted, ...axis.nameTextStyle },
          axisLabel: { color: muted, ...axis.axisLabel },
          axisLine: { ...axis.axisLine, lineStyle: { color: border, ...axis.axisLine?.lineStyle } },
          splitLine: { ...axis.splitLine, lineStyle: { color: border, ...axis.splitLine?.lineStyle } }
        };
      };
      return {
        ...option,
        backgroundColor: 'transparent',
        textStyle: { color: foreground, ...option.textStyle },
        title: option.title ? { ...option.title, textStyle: { color: foreground, ...option.title.textStyle } } : option.title,
        legend: option.legend ? { ...option.legend, textStyle: { color: muted, ...option.legend.textStyle } } : option.legend,
        xAxis: themeAxis(option.xAxis),
        yAxis: themeAxis(option.yAxis)
      };
    },
    handleAutomationRoom() {
      this.groups = [];
      this.tasks = [];
      this.fetchGroups();
      this.loadAllCharts();
    },
    fetchGroups() {
      cronTaskApi.getGroups()
        .then(response => {
          console.log('获取任务组列表响应:', response);
          
          // 处理各种可能的响应格式
          let groupsData = [];
          
          if (response && response.data) {
            // 处理标准格式 {code: 200, data: [...], msg: "success"}
            if (response.data.code === 200 && Array.isArray(response.data.data)) {
              groupsData = response.data.data;
            } 
            // 处理嵌套格式 {code: 200, data: {items: [...], total: 10}}
            else if (response.data.code === 200 && response.data.data && Array.isArray(response.data.data.items)) {
              groupsData = response.data.data.items;
            }
            // 处理旧API格式 {status: 200, data: [...]}
            else if (response.data.status === 200 && Array.isArray(response.data.data)) {
              groupsData = response.data.data;
            }
            // 直接返回数组的情况
            else if (Array.isArray(response.data)) {
              groupsData = response.data;
            }
          }
          
          console.log('处理后的任务组数据:', groupsData);
          this.groups = groupsData;
        })
        .catch(error => {
          console.error('获取任务组列表失败:', error);
          toast.error(cronTaskFailureText(createCronTaskFailure('charts.feedback.groupsFailed', error), this.activeLocale));
        });
    },
    fetchTasks(groupId) {
      if (!groupId) {
        this.tasks = [];
        return;
      }
      
      cronTaskApi.getGroupTasks(groupId)
        .then(response => {
          console.log('获取任务列表响应:', response);
          
          // 处理各种可能的响应格式
          let tasksData = [];
          
          if (response && response.data) {
            // 处理标准格式 {code: 200, data: [...], msg: "success"}
            if (response.data.code === 200 && Array.isArray(response.data.data)) {
              tasksData = response.data.data;
            } 
            // 处理嵌套格式 {code: 200, data: {items: [...], total: 10}}
            else if (response.data.code === 200 && response.data.data && Array.isArray(response.data.data.items)) {
              tasksData = response.data.data.items;
            }
            // 处理旧API格式 {status: 200, data: [...]}
            else if (response.data.status === 200 && Array.isArray(response.data.data)) {
              tasksData = response.data.data;
            }
            // 直接返回数组的情况
            else if (Array.isArray(response.data)) {
              tasksData = response.data;
            }
          }
          
          console.log('处理后的任务列表数据:', tasksData);
          this.tasks = tasksData;
        })
        .catch(error => {
          console.error('获取任务列表失败:', error);
          toast.error(cronTaskFailureText(createCronTaskFailure('charts.feedback.tasksFailed', error), this.activeLocale));
        });
    },
    handleGroupChange(value) {
      this.taskId = '';
      if (value && value !== 'all') {
        this.fetchTasks(value);
        this.loadGroupCharts();
      } else {
        this.tasks = [];
        this.loadAllCharts();
      }
    },
    loadAllCharts() {
      this.loading = true;
      this.loadFailure = null;
      
      // 先清除任务特定图表
      this.taskId = '';
      this.groupId = '';
      
      // 获取概览数据
      cronTaskApi.getOverviewChart({ days: this.dateRange })
        .then(response => {
          console.log('获取概览数据响应:', response);
          if (response.data && (response.data.code === 200 || response.data.status === 200)) {
            this.overview = response.data.data.stats || {};
            
            this.$nextTick(() => {
              this.initOverviewChart(response.data.data);
              this.initDurationChart(response.data.data);
            });
          } else {
            this.setLoadFailure('charts.feedback.overviewFailed', response.data?.msg || response.data?.message);
          }
        })
        .catch(error => {
          console.error('获取概览数据失败:', error);
          this.setLoadFailure('charts.feedback.overviewFailed', error);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    loadGroupCharts() {
      if (!this.groupId) return;
      
      this.loading = true;
      this.loadFailure = null;
      
      cronTaskApi.getGroupChart(this.groupId, { days: this.dateRange })
        .then(response => {
          console.log('获取任务组图表数据响应:', response);
          if (response.data && (response.data.code === 200 || response.data.status === 200)) {
            this.$nextTick(() => {
              this.initGroupTasksChart(response.data.data);
            });
          } else {
            this.setLoadFailure('charts.feedback.groupChartFailed', response.data?.msg || response.data?.message);
          }
        })
        .catch(error => {
          console.error('获取任务组图表失败:', error);
          this.setLoadFailure('charts.feedback.groupChartFailed', error);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    loadTaskCharts() {
      if (!this.taskId || this.taskId === 'all') return;
      
      this.loading = true;
      this.loadFailure = null;
      
      // 获取任务执行图表
      cronTaskApi.getTaskChart(this.taskId, { days: this.dateRange })
        .then(response => {
          console.log('获取任务执行图表数据响应:', response);
          if (response.data && (response.data.code === 200 || response.data.status === 200)) {
            this.$nextTick(() => {
              this.initTaskExecutionChart(response.data.data);
            });
          } else {
            this.setLoadFailure('charts.feedback.taskChartFailed', response.data?.msg || response.data?.message);
          }
        })
        .catch(error => {
          console.error('获取任务执行图表失败:', error);
          this.setLoadFailure('charts.feedback.taskChartFailed', error);
        });
      
      // 获取任务执行时长图表
      cronTaskApi.getTaskDurationChart(this.taskId, { days: this.dateRange })
        .then(response => {
          console.log('获取任务执行时长图表数据响应:', response);
          if (response.data && (response.data.code === 200 || response.data.status === 200)) {
            this.$nextTick(() => {
              this.initTaskDurationChart(response.data.data);
            });
          } else {
            this.setLoadFailure('charts.feedback.durationChartFailed', response.data?.msg || response.data?.message);
          }
        })
        .catch(error => {
          console.error('获取任务执行时长图表失败:', error);
          this.setLoadFailure('charts.feedback.durationChartFailed', error);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    initOverviewChart(data) {
      this.chartData.overviewChart = data;
      const chartDom = document.getElementById('overviewChart');
      if (!chartDom) return;
      
      if (this.charts.overviewChart) {
        this.charts.overviewChart.dispose();
      }
      
      this.charts.overviewChart = echarts.init(chartDom);
      
      const option = {
        title: {
          text: this.text('charts.graph.overviewTitle'),
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          data: [this.text('charts.graph.success'), this.text('charts.graph.failed')],
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
          data: data.dates || []
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: this.text('charts.graph.success'),
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: this.chartColor('--primary')
            },
            data: data.success || []
          },
          {
            name: this.text('charts.graph.failed'),
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: this.chartColor('--destructive')
            },
            data: data.failed || []
          }
        ]
      };
      
      this.charts.overviewChart.setOption(this.themedChartOption(option));
    },
    initDurationChart(data) {
      this.chartData.durationChart = data;
      const chartDom = document.getElementById('durationChart');
      if (!chartDom) return;
      
      if (this.charts.durationChart) {
        this.charts.durationChart.dispose();
      }
      
      this.charts.durationChart = echarts.init(chartDom);
      
      const option = {
        title: {
          text: this.text('charts.graph.averageDurationTitle'),
          left: 'center'
        },
        tooltip: {
          trigger: 'axis'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '10%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: data.dates || []
        },
        yAxis: {
          type: 'value',
          name: this.text('common.units.secondsAxis')
        },
        series: [
          {
            data: data.durations || [],
            type: 'line',
            name: this.text('charts.graph.averageDuration'),
            smooth: true,
            areaStyle: {},
            itemStyle: {
              color: this.chartColor('--chart-1')
            }
          }
        ]
      };
      
      this.charts.durationChart.setOption(this.themedChartOption(option));
    },
    initGroupTasksChart(data) {
      this.chartData.groupTasksChart = data;
      const chartDom = document.getElementById('groupTasksChart');
      if (!chartDom) return;
      
      if (this.charts.groupTasksChart) {
        this.charts.groupTasksChart.dispose();
      }
      
      this.charts.groupTasksChart = echarts.init(chartDom);
      
      const option = {
        title: {
          text: this.text('charts.graph.groupTitle'),
          left: 'center'
        },
        tooltip: {
          trigger: 'item'
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          type: 'scroll',
          height: 250
        },
        series: [
          {
            name: this.text('charts.graph.executions'),
            type: 'pie',
            radius: '60%',
            center: ['60%', '50%'],
            data: data.tasks_data || [],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            label: {
              formatter: '{b}: {c} ({d}%)'
            }
          }
        ]
      };
      
      this.charts.groupTasksChart.setOption(this.themedChartOption(option));
    },
    initTaskExecutionChart(data) {
      this.chartData.taskExecutionChart = data;
      const chartDom = document.getElementById('taskExecutionChart');
      if (!chartDom) return;
      
      if (this.charts.taskExecutionChart) {
        this.charts.taskExecutionChart.dispose();
      }
      
      this.charts.taskExecutionChart = echarts.init(chartDom);
      
      const option = {
        title: {
          text: this.text('charts.graph.taskTitle'),
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          data: [this.text('charts.graph.success'), this.text('charts.graph.failed')],
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
          data: data.dates || []
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: this.text('charts.graph.success'),
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: this.chartColor('--primary')
            },
            data: data.success || []
          },
          {
            name: this.text('charts.graph.failed'),
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: this.chartColor('--destructive')
            },
            data: data.failed || []
          }
        ]
      };
      
      this.charts.taskExecutionChart.setOption(this.themedChartOption(option));
    },
    initTaskDurationChart(data) {
      this.chartData.taskDurationChart = data;
      const chartDom = document.getElementById('taskDurationChart');
      if (!chartDom) return;
      
      if (this.charts.taskDurationChart) {
        this.charts.taskDurationChart.dispose();
      }
      
      this.charts.taskDurationChart = echarts.init(chartDom);
      
      const option = {
        title: {
          text: this.text('charts.graph.taskDurationTitle'),
          left: 'center'
        },
        tooltip: {
          trigger: 'axis'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '10%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: data.dates || []
        },
        yAxis: {
          type: 'value',
          name: this.text('common.units.secondsAxis')
        },
        series: [
          {
            data: data.durations || [],
            type: 'line',
            name: this.text('charts.graph.duration'),
            smooth: true,
            areaStyle: {},
            itemStyle: {
              color: this.chartColor('--chart-1')
            }
          }
        ]
      };
      
      this.charts.taskDurationChart.setOption(this.themedChartOption(option));
    },
    resizeCharts() {
      Object.keys(this.charts).forEach(key => {
        if (this.charts[key]) {
          this.charts[key].resize();
        }
      });
    }
  }
};
</script>

<style scoped>
.filter-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.chart-box {
  width: 100%;
  height: 400px;
}

@media (max-width: 768px) {
  .filter-grid { grid-template-columns: 1fr; }
  .chart-box {
    height: 320px;
  }
}
</style>

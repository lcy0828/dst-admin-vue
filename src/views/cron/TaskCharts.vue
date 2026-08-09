<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">任务统计图表</h1><p class="mt-1 text-sm text-muted-foreground">分析执行次数、成功率和耗时趋势。</p></div>
      <div class="flex flex-wrap items-center gap-2"><automation-room-select @ready="handleAutomationRoom" @change="handleAutomationRoom" /><UiButton size="sm" :disabled="loading" @click="loadAllCharts"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />刷新数据</UiButton><UiButton size="sm" variant="outline" @click="$router.push('/cron/tasks')"><ArrowLeft data-icon="inline-start" />返回任务列表</UiButton></div>
    </header>
    <Card>
      <CardHeader><CardTitle>统计范围</CardTitle><CardDescription>选择日期、任务组和具体任务。</CardDescription></CardHeader>
      <CardContent>
        <FieldGroup class="filter-grid">
          <Field><FieldLabel for="chart-date-range">时间范围</FieldLabel><UiSelect v-model="dateRange" @update:model-value="loadAllCharts"><SelectTrigger id="chart-date-range"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="7">最近 7 天</SelectItem><SelectItem value="30">最近 30 天</SelectItem><SelectItem value="90">最近 90 天</SelectItem><SelectItem value="180">最近 180 天</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field><FieldLabel for="chart-group">任务组</FieldLabel><UiSelect v-model="groupId" @update:model-value="handleGroupChange"><SelectTrigger id="chart-group"><SelectValue placeholder="选择任务组" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem><SelectItem v-for="group in groups" :key="group.id" :value="String(group.id)">{{ group.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field v-if="groupId && groupId !== 'all'"><FieldLabel for="chart-task">任务</FieldLabel><UiSelect v-model="taskId" @update:model-value="loadTaskCharts"><SelectTrigger id="chart-task"><SelectValue placeholder="选择任务" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem><SelectItem v-for="task in tasks" :key="task.id" :value="String(task.id)">{{ task.name }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
        </FieldGroup>
        <Alert v-if="loadError" variant="destructive"><CircleAlert /><AlertTitle>统计数据加载失败</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription></Alert>
      </CardContent>
    </Card>

    <div v-if="loading" class="flex flex-col gap-4"><Skeleton class="h-36 w-full" /><Skeleton class="h-96 w-full" /></div>
    <div v-else class="flex min-w-0 flex-col gap-6">
      <div class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Card><CardHeader><CardTitle>总任务数</CardTitle><CardDescription>当前统计范围</CardDescription></CardHeader><CardContent class="min-h-16 pt-1"><strong class="text-3xl font-semibold tabular-nums">{{ overview.total_tasks || 0 }}</strong></CardContent></Card>
        <Card><CardHeader><CardTitle>总执行次数</CardTitle><CardDescription>累计调度记录</CardDescription></CardHeader><CardContent class="min-h-16 pt-1"><strong class="text-3xl font-semibold tabular-nums">{{ overview.total_executions || 0 }}</strong></CardContent></Card>
        <Card><CardHeader><CardTitle>成功率</CardTitle><CardDescription>成功执行占比</CardDescription></CardHeader><CardContent class="min-h-16 pt-1"><strong class="text-3xl font-semibold tabular-nums">{{ overview.success_rate || 0 }}%</strong></CardContent></Card>
        <Card><CardHeader><CardTitle>平均执行时长</CardTitle><CardDescription>全部已完成任务</CardDescription></CardHeader><CardContent class="min-h-16 pt-1"><strong class="text-3xl font-semibold tabular-nums">{{ overview.avg_duration || 0 }}<span class="ml-1.5 text-sm font-normal text-muted-foreground">秒</span></strong></CardContent></Card>
      </div>

      <div class="grid min-w-0 gap-6 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>执行概览</CardTitle><CardDescription>成功与失败次数分布</CardDescription></CardHeader><CardContent class="pt-1"><div id="overviewChart" class="chart-box"></div></CardContent></Card>
        <Card><CardHeader><CardTitle>耗时趋势</CardTitle><CardDescription>统计范围内的执行耗时变化</CardDescription></CardHeader><CardContent class="pt-1"><div id="durationChart" class="chart-box"></div></CardContent></Card>
      </div>

      <Card v-if="groupId && groupId !== 'all' && (!taskId || taskId === 'all')"><CardHeader><CardTitle>任务组执行统计</CardTitle><CardDescription>组内任务执行情况对比</CardDescription></CardHeader><CardContent class="pt-1"><div id="groupTasksChart" class="chart-box"></div></CardContent></Card>

      <div v-if="taskId && taskId !== 'all'" class="grid min-w-0 gap-6 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>任务执行统计</CardTitle><CardDescription>所选任务的成功与失败情况</CardDescription></CardHeader><CardContent class="pt-1"><div id="taskExecutionChart" class="chart-box"></div></CardContent></Card>
        <Card><CardHeader><CardTitle>任务耗时统计</CardTitle><CardDescription>所选任务的执行耗时变化</CardDescription></CardHeader><CardContent class="pt-1"><div id="taskDurationChart" class="chart-box"></div></CardContent></Card>
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
      loadError: '',
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
      }
    };
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
          toast.error('获取任务组列表失败');
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
          toast.error('获取任务列表失败');
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
      this.loadError = '';
      
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
            this.loadError = response.data?.msg || response.data?.message || '获取概览数据失败';
            toast.error(this.loadError);
          }
        })
        .catch(error => {
          console.error('获取概览数据失败:', error);
          this.loadError = error.message || '获取概览数据失败';
          toast.error(this.loadError);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    loadGroupCharts() {
      if (!this.groupId) return;
      
      this.loading = true;
      this.loadError = '';
      
      cronTaskApi.getGroupChart(this.groupId, { days: this.dateRange })
        .then(response => {
          console.log('获取任务组图表数据响应:', response);
          if (response.data && (response.data.code === 200 || response.data.status === 200)) {
            this.$nextTick(() => {
              this.initGroupTasksChart(response.data.data);
            });
          } else {
            this.loadError = response.data?.msg || response.data?.message || '获取任务组图表失败';
            toast.error(this.loadError);
          }
        })
        .catch(error => {
          console.error('获取任务组图表失败:', error);
          this.loadError = error.message || '获取任务组图表失败';
          toast.error(this.loadError);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    loadTaskCharts() {
      if (!this.taskId || this.taskId === 'all') return;
      
      this.loading = true;
      this.loadError = '';
      
      // 获取任务执行图表
      cronTaskApi.getTaskChart(this.taskId, { days: this.dateRange })
        .then(response => {
          console.log('获取任务执行图表数据响应:', response);
          if (response.data && (response.data.code === 200 || response.data.status === 200)) {
            this.$nextTick(() => {
              this.initTaskExecutionChart(response.data.data);
            });
          } else {
            this.loadError = response.data?.msg || response.data?.message || '获取任务执行图表失败';
            toast.error(this.loadError);
          }
        })
        .catch(error => {
          console.error('获取任务执行图表失败:', error);
          this.loadError = error.message || '获取任务执行图表失败';
          toast.error(this.loadError);
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
            this.loadError = response.data?.msg || response.data?.message || '获取任务执行时长图表失败';
            toast.error(this.loadError);
          }
        })
        .catch(error => {
          console.error('获取任务执行时长图表失败:', error);
          this.loadError = error.message || '获取任务执行时长图表失败';
          toast.error(this.loadError);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    initOverviewChart(data) {
      const chartDom = document.getElementById('overviewChart');
      if (!chartDom) return;
      
      if (this.charts.overviewChart) {
        this.charts.overviewChart.dispose();
      }
      
      this.charts.overviewChart = echarts.init(chartDom);
      
      const option = {
        title: {
          text: '任务执行成功/失败统计',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          data: ['成功', '失败'],
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
            name: '成功',
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: this.chartColor('--primary')
            },
            data: data.success || []
          },
          {
            name: '失败',
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
      const chartDom = document.getElementById('durationChart');
      if (!chartDom) return;
      
      if (this.charts.durationChart) {
        this.charts.durationChart.dispose();
      }
      
      this.charts.durationChart = echarts.init(chartDom);
      
      const option = {
        title: {
          text: '任务平均执行时长统计',
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
          name: '执行时长(秒)'
        },
        series: [
          {
            data: data.durations || [],
            type: 'line',
            name: '平均执行时长',
            smooth: true,
            areaStyle: {},
            itemStyle: {
              color: getSystemPreferences().theme
            }
          }
        ]
      };
      
      this.charts.durationChart.setOption(this.themedChartOption(option));
    },
    initGroupTasksChart(data) {
      const chartDom = document.getElementById('groupTasksChart');
      if (!chartDom) return;
      
      if (this.charts.groupTasksChart) {
        this.charts.groupTasksChart.dispose();
      }
      
      this.charts.groupTasksChart = echarts.init(chartDom);
      
      const option = {
        title: {
          text: '任务组内各任务执行情况',
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
            name: '执行次数',
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
      const chartDom = document.getElementById('taskExecutionChart');
      if (!chartDom) return;
      
      if (this.charts.taskExecutionChart) {
        this.charts.taskExecutionChart.dispose();
      }
      
      this.charts.taskExecutionChart = echarts.init(chartDom);
      
      const option = {
        title: {
          text: '任务执行成功/失败情况',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          data: ['成功', '失败'],
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
            name: '成功',
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: this.chartColor('--primary')
            },
            data: data.success || []
          },
          {
            name: '失败',
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
      const chartDom = document.getElementById('taskDurationChart');
      if (!chartDom) return;
      
      if (this.charts.taskDurationChart) {
        this.charts.taskDurationChart.dispose();
      }
      
      this.charts.taskDurationChart = echarts.init(chartDom);
      
      const option = {
        title: {
          text: '任务执行时长统计',
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
          name: '执行时长(秒)'
        },
        series: [
          {
            data: data.durations || [],
            type: 'line',
            name: '执行时长',
            smooth: true,
            areaStyle: {},
            itemStyle: {
              color: getSystemPreferences().theme
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

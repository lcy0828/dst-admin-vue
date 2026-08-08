<template>
  <div class="app-container">
    <el-card class="box-card" shadow="never">
      <template v-slot:header>
<div  class="clearfix">
        <span>任务统计图表</span>
        <el-button-group style="float: right">
          <el-button type="primary" icon="el-icon-refresh" @click="loadAllCharts">刷新数据</el-button>
          <el-button type="info" icon="el-icon-back" @click="$router.push('/cron/tasks')">返回任务列表</el-button>
        </el-button-group>
        <automation-room-select @ready="handleAutomationRoom" @change="handleAutomationRoom" />
      </div>
</template>
      
      <el-form :inline="true" class="filter-form">
        <el-form-item label="时间范围">
          <el-select v-model="dateRange" @change="loadAllCharts">
            <el-option label="最近7天" value="7"></el-option>
            <el-option label="最近30天" value="30"></el-option>
            <el-option label="最近90天" value="90"></el-option>
            <el-option label="最近180天" value="180"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="任务组">
          <el-select v-model="groupId" placeholder="选择任务组" clearable @change="handleGroupChange">
            <el-option label="全部" value=""></el-option>
            <el-option
              v-for="group in groups"
              :key="group.id"
              :label="group.name"
              :value="group.id">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="任务" v-if="groupId">
          <el-select v-model="taskId" placeholder="选择任务" clearable @change="loadTaskCharts">
            <el-option label="全部" value=""></el-option>
            <el-option
              v-for="task in tasks"
              :key="task.id"
              :label="task.name"
              :value="task.id">
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      
      <div v-loading="loading">
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-title">总任务数</div>
            <div class="stat-value">{{ overview.total_tasks || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">总执行次数</div>
            <div class="stat-value">{{ overview.total_executions || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">成功率</div>
            <div class="stat-value">{{ overview.success_rate || 0 }}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">平均执行时长</div>
            <div class="stat-value">{{ overview.avg_duration || 0 }}秒</div>
          </div>
        </div>
        
        <div class="chart-container">
          <div id="overviewChart" class="chart-box"></div>
          <div id="durationChart" class="chart-box"></div>
        </div>
        
        <div v-if="groupId && !taskId" class="chart-container">
          <h3 class="chart-title">任务组执行统计</h3>
          <div id="groupTasksChart" class="chart-box"></div>
        </div>
        
        <div v-if="taskId" class="chart-container">
          <h3 class="chart-title">任务执行统计</h3>
          <div id="taskExecutionChart" class="chart-box"></div>
          <div id="taskDurationChart" class="chart-box"></div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { cronTaskApi } from '@/api/index';
import * as echarts from 'echarts';
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue';

export default {
  name: 'TaskCharts',
  components: { AutomationRoomSelect },
  data() {
    return {
      loading: false,
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
          this.$message.error('获取任务组列表失败');
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
          this.$message.error('获取任务列表失败');
        });
    },
    handleGroupChange(value) {
      this.taskId = '';
      if (value) {
        this.fetchTasks(value);
        this.loadGroupCharts();
      } else {
        this.tasks = [];
        this.loadAllCharts();
      }
    },
    loadAllCharts() {
      this.loading = true;
      
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
            this.$message.error(response.data?.msg || response.data?.message || '获取概览数据失败');
          }
        })
        .catch(error => {
          console.error('获取概览数据失败:', error);
          this.$message.error('获取概览数据失败');
        })
        .finally(() => {
          this.loading = false;
        });
    },
    loadGroupCharts() {
      if (!this.groupId) return;
      
      this.loading = true;
      
      cronTaskApi.getGroupChart(this.groupId, { days: this.dateRange })
        .then(response => {
          console.log('获取任务组图表数据响应:', response);
          if (response.data && (response.data.code === 200 || response.data.status === 200)) {
            this.$nextTick(() => {
              this.initGroupTasksChart(response.data.data);
            });
          } else {
            this.$message.error(response.data?.msg || response.data?.message || '获取任务组图表失败');
          }
        })
        .catch(error => {
          console.error('获取任务组图表失败:', error);
          this.$message.error('获取任务组图表失败');
        })
        .finally(() => {
          this.loading = false;
        });
    },
    loadTaskCharts() {
      if (!this.taskId) return;
      
      this.loading = true;
      
      // 获取任务执行图表
      cronTaskApi.getTaskChart(this.taskId, { days: this.dateRange })
        .then(response => {
          console.log('获取任务执行图表数据响应:', response);
          if (response.data && (response.data.code === 200 || response.data.status === 200)) {
            this.$nextTick(() => {
              this.initTaskExecutionChart(response.data.data);
            });
          } else {
            this.$message.error(response.data?.msg || response.data?.message || '获取任务执行图表失败');
          }
        })
        .catch(error => {
          console.error('获取任务执行图表失败:', error);
          this.$message.error('获取任务执行图表失败');
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
            this.$message.error(response.data?.msg || response.data?.message || '获取任务执行时长图表失败');
          }
        })
        .catch(error => {
          console.error('获取任务执行时长图表失败:', error);
          this.$message.error('获取任务执行时长图表失败');
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
              color: '#4f8a5b'
            },
            data: data.success || []
          },
          {
            name: '失败',
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: '#c94f4f'
            },
            data: data.failed || []
          }
        ]
      };
      
      this.charts.overviewChart.setOption(option);
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
              color: '#d97932'
            }
          }
        ]
      };
      
      this.charts.durationChart.setOption(option);
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
      
      this.charts.groupTasksChart.setOption(option);
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
              color: '#4f8a5b'
            },
            data: data.success || []
          },
          {
            name: '失败',
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: '#c94f4f'
            },
            data: data.failed || []
          }
        ]
      };
      
      this.charts.taskExecutionChart.setOption(option);
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
              color: '#d97932'
            }
          }
        ]
      };
      
      this.charts.taskDurationChart.setOption(option);
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
.filter-form {
  margin-bottom: 20px;
}
.stats-cards {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.stat-card {
  flex: 1;
  min-width: 200px;
  margin: 0 10px 10px 0;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  text-align: center;
}
.stat-title {
  font-size: 14px;
  color: #536159;
  margin-bottom: 10px;
}
.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #d97932;
}
.chart-container {
  margin-top: 30px;
  margin-bottom: 30px;
}
.chart-title {
  font-size: 16px;
  margin-bottom: 15px;
  padding-left: 10px;
  border-left: 4px solid #d97932;
}
.chart-box {
  width: 100%;
  height: 400px;
  margin-bottom: 20px;
}
</style>

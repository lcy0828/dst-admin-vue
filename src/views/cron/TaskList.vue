<template>
  <div class="app-container">
    <el-card class="box-card" shadow="never">
      <div slot="header" class="clearfix">
        <span>定时任务管理</span>
        <el-button-group style="float: right">
          <el-button type="primary" icon="el-icon-plus" @click="handleAddTask">添加任务</el-button>
          <el-button type="success" icon="el-icon-folder-add" @click="$router.push('/cron/group/add')">添加任务组</el-button>
          <el-button type="info" icon="el-icon-folder" @click="$router.push('/cron/groups')">任务组管理</el-button>
          <el-button type="warning" icon="el-icon-document" @click="$router.push('/cron/logs')">执行日志</el-button>
          <el-button type="danger" icon="el-icon-pie-chart" @click="$router.push('/cron/charts')">统计图表</el-button>
          <el-button type="primary" icon="el-icon-upload2" @click="$router.push('/cron/import-export')">导入导出</el-button>
        </el-button-group>
      </div>
      
      <el-alert
        v-if="fetchError"
        title="获取任务组列表失败"
        type="error"
        description="无法加载任务组数据，这可能会影响任务显示。"
        show-icon
        :closable="true"
        @close="fetchError = false"
        style="margin-bottom: 15px;">
        <el-button type="primary" size="small" @click="retryFetch" style="margin-left: 15px;">重试</el-button>
      </el-alert>
      
      <div class="filter-container">
        <el-form :inline="true" :model="listQuery" class="filter-form">
          <el-form-item label="任务组">
            <el-select v-model="listQuery.group_id" placeholder="选择任务组" clearable style="width: 200px">
              <el-option label="全部" value=""></el-option>
              <el-option
                v-for="group in groupList"
                :key="group.id"
                :label="group.name"
                :value="group.id">
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="任务类型">
            <el-select v-model="listQuery.type" placeholder="选择类型" clearable style="width: 150px">
              <el-option label="全部" value=""></el-option>
              <el-option label="函数" value="function"></el-option>
              <el-option label="Shell命令" value="shell"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="listQuery.status" placeholder="选择状态" clearable style="width: 120px">
              <el-option label="全部" value=""></el-option>
              <el-option label="启用" :value="1"></el-option>
              <el-option label="禁用" :value="0"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input v-model="listQuery.keyword" placeholder="搜索任务名称或描述" style="width: 220px"></el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="el-icon-search" @click="fetchData">搜索</el-button>
            <el-button type="info" icon="el-icon-refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table v-loading="loading" :data="taskList" style="width: 100%;" border>
        <el-table-column prop="id" label="ID" width="60" align="center"></el-table-column>
        <el-table-column prop="name" label="任务名称" min-width="120">
          <template slot-scope="scope">
            <el-tooltip v-if="scope.row.description" :content="scope.row.description" placement="top" effect="light">
              <span>{{ scope.row.name }}</span>
            </el-tooltip>
            <span v-else>{{ scope.row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="group_name" label="所属任务组" min-width="120">
          <template slot-scope="scope">
            <el-tag size="medium" @click="$router.push(`/cron/group/${scope.row.group_id}`)" style="cursor: pointer">
              {{ scope.row.group_name || '未分组' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="spec" label="Cron表达式" min-width="120"></el-table-column>
        <el-table-column prop="type" label="类型" width="100">
          <template slot-scope="scope">
            <el-tag :type="scope.row.type === 'function' ? 'primary' : 'success'">
              {{ scope.row.type === 'function' ? '函数' : 'Shell命令' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target" label="目标" min-width="150">
          <template slot-scope="scope">
            <el-tooltip :content="scope.row.target" placement="top" effect="light">
              <span>{{ scope.row.target | truncate(30) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="dependencies" label="依赖任务" min-width="120">
          <template slot-scope="scope">
            <span v-if="!scope.row.dependencies || scope.row.dependencies.length === 0">无</span>
            <div v-else>
              <p style="margin: 0; color: #999; font-size: 10px;">(原始值: {{ JSON.stringify(scope.row.dependencies) }})</p>
              <el-tag 
                v-for="dep in scope.row.dependencies" 
                :key="dep.id" 
                size="small" 
                type="info" 
                style="margin-right: 5px; margin-bottom: 3px;">
                {{ dep.name || dep.id || dep }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="超时/重试" width="100" align="center">
          <template slot-scope="scope">
            <el-tooltip content="任务超时时间(秒)/重试次数" placement="top" effect="light">
              <span>{{ scope.row.timeout || '-' }} / {{ scope.row.retry_times || '0' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="next_run" label="下次执行" min-width="120">
          <template slot-scope="scope">
            <span>{{ scope.row.next_run || '未计划' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" align="center">
          <template slot-scope="scope">
            <el-button-group>
              <el-button 
                size="mini" 
                type="success"
                @click="handleRunNow(scope.row)"
                icon="el-icon-video-play">
                执行
              </el-button>
              <el-button 
                size="mini" 
                :type="scope.row.status === 1 ? 'warning' : 'success'"
                @click="handleToggleStatus(scope.row)"
                :icon="scope.row.status === 1 ? 'el-icon-close' : 'el-icon-check'">
                {{ scope.row.status === 1 ? '禁用' : '启用' }}
              </el-button>
              <el-button 
                size="mini" 
                type="primary"
                @click="handleEdit(scope.row)"
                icon="el-icon-edit">
                编辑
              </el-button>
              <el-button 
                size="mini" 
                type="danger"
                @click="handleDelete(scope.row)"
                icon="el-icon-delete">
                删除
              </el-button>
            </el-button-group>
            <div style="margin-top: 5px;">
              <el-button 
                size="mini" 
                type="info"
                @click="viewTaskLogs(scope.row.id)"
                icon="el-icon-document">
                日志
              </el-button>
              <el-button 
                size="mini" 
                type="warning"
                @click="viewTaskStats(scope.row.id)"
                icon="el-icon-data-line">
                统计
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <el-pagination
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="listQuery.page"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="listQuery.limit"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        style="margin-top: 15px; text-align: right;">
      </el-pagination>
    </el-card>
    
    <el-dialog title="执行结果" :visible.sync="dialogVisible" width="60%">
      <div v-if="taskResult" class="task-result">
        <p><strong>执行状态：</strong> {{ taskResult.success ? '成功' : '失败' }}</p>
        <p><strong>执行时间：</strong> {{ taskResult.timestamp }}</p>
        <p v-if="taskResult.duration != null"><strong>执行耗时：</strong> {{ taskResult.duration }} 秒</p>
        <div class="result-output">
          <strong>输出结果：</strong>
          <pre>{{ taskResult.output }}</pre>
        </div>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="viewTaskLogs(currentTaskId)">查看完整日志</el-button>
      </div>
    </el-dialog>
    
    <el-dialog title="任务统计" :visible.sync="statsDialogVisible" width="70%">
      <div v-loading="statsLoading" class="task-stats">
        <div v-if="taskStats" class="stats-overview">
          <div class="stats-card success-rate">
            <div class="stats-title">成功率</div>
            <div class="stats-value">{{ taskStats.success_rate }}%</div>
          </div>
          <div class="stats-card avg-duration">
            <div class="stats-title">平均耗时</div>
            <div class="stats-value">{{ taskStats.avg_duration }}秒</div>
          </div>
          <div class="stats-card total-runs">
            <div class="stats-title">总执行次数</div>
            <div class="stats-value">{{ taskStats.total_runs }}</div>
          </div>
          <div class="stats-card last-run">
            <div class="stats-title">最近执行</div>
            <div class="stats-value">{{ taskStats.last_run || '无' }}</div>
          </div>
        </div>
        <div class="stats-charts">
          <div id="executionChart" style="width: 100%; height: 300px;"></div>
          <div id="durationChart" style="width: 100%; height: 300px;"></div>
        </div>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="statsDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="$router.push('/cron/charts')">查看更多图表</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { cronTaskApi } from '@/api/index';
import echarts from 'echarts';

export default {
  name: 'TaskList',
  filters: {
    truncate(value, length) {
      if (!value) return '';
      if (value.length <= length) return value;
      return value.substring(0, length) + '...';
    }
  },
  data() {
    return {
      loading: false,
      statsLoading: false,
      taskList: [],
      groupList: [],
      total: 0,
      listQuery: {
        page: 1,
        limit: 20,
        group_id: '',
        type: '',
        status: '',
        keyword: ''
      },
      dialogVisible: false,
      taskResult: null,
      currentTaskId: null,
      statsDialogVisible: false,
      taskStats: null,
      executionChart: null,
      durationChart: null,
      fetchError: false
    };
  },
  created() {
    // 先获取任务组，然后再获取任务列表
    this.fetchGroups();
    
    // 延迟一点点时间再获取任务列表，确保已经获取到了任务组数据
    setTimeout(() => {
      this.fetchData();
    }, 100);
  },
  methods: {
    fetchData() {
      this.loading = true;
      console.log('开始获取任务列表, 查询参数:', this.listQuery);
      cronTaskApi.getTasks(this.listQuery)
        .then(response => {
          console.log('获取任务列表响应:', response);
          
          // 处理各种可能的响应格式
          let tasksData = [];
          let success = false;
          
          if (response && response.data) {
            // 处理标准格式 {code: 200, data: [...], msg: "success"}
            if (response.data.code === 200 && Array.isArray(response.data.data)) {
              tasksData = response.data.data;
              success = true;
            } 
            // 处理嵌套格式 {code: 200, data: {items: [...], total: 10}}
            else if (response.data.code === 200 && response.data.data && Array.isArray(response.data.data.items)) {
              tasksData = response.data.data.items;
              success = true;
              this.total = response.data.data.total || tasksData.length;
            }
            // 处理旧API格式 {status: 200, data: [...]}
            else if (response.data.status === 200 && Array.isArray(response.data.data)) {
              tasksData = response.data.data;
              success = true;
            }
            // 直接返回数组的情况
            else if (Array.isArray(response.data)) {
              tasksData = response.data;
              success = true;
            }
          }
          
          if (success) {
            console.log('原始任务数据:', tasksData);
            
            // 遍历任务列表，处理数据
            tasksData.forEach(task => {
              // 处理dependencies
              try {
                if (typeof task.dependencies === 'string') {
                  if (task.dependencies) {
                    try {
                      const parsedDeps = JSON.parse(task.dependencies);
                      task.dependencies = Array.isArray(parsedDeps) ? parsedDeps : [];
                    } catch (e) {
                      console.warn(`解析任务 ${task.id} 的dependencies失败:`, e);
                      task.dependencies = [];
                    }
                  } else {
                    task.dependencies = [];
                  }
                } else if (!task.dependencies) {
                  task.dependencies = [];
                }
              } catch (e) {
                console.error('处理dependencies时发生错误:', e);
                task.dependencies = [];
              }
              
              // 给任务添加group_name属性
              task.group_name = task.group_id === 0 ? '未分组' : 
                this.groupList.find(g => g.id === task.group_id)?.name || '未知';
              
              // 如果下次执行时间是无效值或不存在，设置为空
              if (!task.next_run_time || task.next_run_time === '0001-01-01T00:00:00Z') {
                task.next_run = '';
              } else {
                task.next_run = task.next_run_time;
              }
            });
            
            console.log('处理后的任务数据:', tasksData);
            this.taskList = tasksData;
            this.total = this.total || tasksData.length;
          } else {
            console.error('无法识别的响应格式:', response);
            this.$message.error('获取任务列表失败: 无法识别的响应格式');
            this.taskList = [];
            this.total = 0;
            this.fetchError = true;
          }
        })
        .catch(error => {
          console.error('获取任务列表失败:', error);
          this.$message.error('获取任务列表失败: ' + (error.message || '未知错误'));
          this.taskList = [];
          this.total = 0;
          this.fetchError = true;
        })
        .finally(() => {
          this.loading = false;
        });
    },
    fetchGroups() {
      console.log('开始获取任务组列表');
      cronTaskApi.getGroups()
        .then(response => {
          console.log('获取任务组列表响应:', response);
          
          // 处理各种可能的响应格式
          let groupsData = [];
          let success = false;
          
          if (response && response.data) {
            // 处理标准格式 {code: 200, data: [...], msg: "success"}
            if (response.data.code === 200 && Array.isArray(response.data.data)) {
              groupsData = response.data.data;
              success = true;
            } 
            // 处理嵌套格式 {code: 200, data: {items: [...], total: 10}}
            else if (response.data.code === 200 && response.data.data && Array.isArray(response.data.data.items)) {
              groupsData = response.data.data.items;
              success = true;
            }
            // 处理旧API格式 {status: 200, data: [...]}
            else if (response.data.status === 200 && Array.isArray(response.data.data)) {
              groupsData = response.data.data;
              success = true;
            }
            // 直接返回数组的情况
            else if (Array.isArray(response.data)) {
              groupsData = response.data;
              success = true;
            }
          }
          
          if (success) {
            console.log('原始任务组数据:', groupsData);
            
            // 遍历任务组并处理数据
            groupsData.forEach(group => {
              // 确保task_count属性存在
              if (group.task_count === undefined && group.tasks !== undefined) {
                group.task_count = Array.isArray(group.tasks) ? group.tasks.length : 0;
              } else if (group.task_count === undefined) {
                group.task_count = 0;
              }
            });
            
            console.log('处理后的任务组数据:', groupsData);
            this.groupList = groupsData;
          } else {
            console.error('无法识别的响应格式:', response);
            this.$message.error(response.data?.msg || response.data?.message || '获取任务组列表失败: 无法识别的响应格式');
            this.groupList = [];
          }
        })
        .catch(error => {
          console.error('获取任务组列表失败:', error);
          this.$message.error('获取任务组列表失败: ' + (error.message || '未知错误'));
          this.groupList = [];
          this.fetchError = true;
        });
    },
    handleSizeChange(val) {
      this.listQuery.limit = val;
      this.fetchData();
    },
    handleCurrentChange(val) {
      this.listQuery.page = val;
      this.fetchData();
    },
    resetQuery() {
      this.listQuery = {
        page: 1,
        limit: 20,
        group_id: '',
        type: '',
        status: '',
        keyword: ''
      };
      this.fetchData();
    },
    handleAddTask() {
      this.$router.push('/cron/add');
    },
    handleEdit(row) {
      this.$router.push(`/cron/edit/${row.id}`);
    },
    handleDelete(row) {
      this.$confirm('确定要删除此任务吗？删除后不可恢复', '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        cronTaskApi.deleteTask(row.id)
          .then(response => {
            if (response.data && response.data.code === 200) {
              this.$message.success('删除成功');
              this.fetchData();
            } else {
              this.$message.error(response.data.msg || '删除失败');
            }
          })
          .catch(error => {
            console.error('删除任务失败:', error);
            this.$message.error('删除任务失败');
          });
      }).catch(() => {
        this.$message.info('已取消删除');
      });
    },
    handleToggleStatus(row) {
      const action = row.status === 1 ? '禁用' : '启用';
      const actionApi = row.status === 1 ? cronTaskApi.disableTask : cronTaskApi.enableTask;
      
      this.$confirm(`确定要${action}此任务吗？`, `确认${action}`, {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        actionApi(row.id)
          .then(response => {
            console.log(`${action}任务响应:`, response);
            if (response.data && (response.data.code === 200 || response.data.status === 200)) {
              this.$message.success(`${action}成功`);
              this.fetchData();
            } else {
              this.$message.error(response.data.msg || response.data.message || `${action}失败`);
            }
          })
          .catch(error => {
            console.error(`${action}任务失败:`, error);
            this.$message.error(`${action}任务失败`);
          });
      }).catch(() => {
        this.$message.info(`已取消${action}`);
      });
    },
    handleRunNow(row) {
      this.$confirm('确定要立即执行此任务吗？', '确认执行', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        this.loading = true;
        this.currentTaskId = row.id;
        cronTaskApi.runTask(row.id)
          .then(response => {
            console.log('立即执行任务响应:', response);
            if (response.data && (response.data.code === 200 || response.data.status === 200)) {
              this.$message.success('任务执行成功');
              this.taskResult = response.data.data;
              this.dialogVisible = true;
            } else {
              this.$message.error(response.data.msg || response.data.message || '任务执行失败');
            }
          })
          .catch(error => {
            console.error('执行任务失败:', error);
            this.$message.error('执行任务失败');
          })
          .finally(() => {
            this.loading = false;
          });
      }).catch(() => {
        this.$message.info('已取消执行');
      });
    },
    viewTaskLogs(taskId) {
      this.$router.push({
        path: '/cron/logs',
        query: { task_id: taskId }
      });
    },
    viewTaskStats(taskId) {
      this.statsDialogVisible = true;
      this.statsLoading = true;
      this.currentTaskId = taskId;
      
      // 获取任务统计数据
      cronTaskApi.getTaskStats(taskId)
        .then(response => {
          console.log('获取任务统计数据响应:', response);
          if (response.data && (response.data.code === 200 || response.data.status === 200)) {
            this.taskStats = response.data.data;
            
            // 获取执行状态图表数据
            cronTaskApi.getTaskChart(taskId, { days: 30 })
              .then(chartResponse => {
                console.log('获取任务图表数据响应:', chartResponse);
                if (chartResponse.data && (chartResponse.data.code === 200 || chartResponse.data.status === 200)) {
                  this.$nextTick(() => {
                    this.initExecutionChart(chartResponse.data.data);
                  });
                }
              });
            
            // 获取执行时长图表数据
            cronTaskApi.getTaskDurationChart(taskId, { days: 30 })
              .then(durationResponse => {
                console.log('获取任务时长图表数据响应:', durationResponse);
                if (durationResponse.data && (durationResponse.data.code === 200 || durationResponse.data.status === 200)) {
                  this.$nextTick(() => {
                    this.initDurationChart(durationResponse.data.data);
                  });
                }
              });
          } else {
            this.$message.error(response.data.msg || response.data.message || '获取任务统计失败');
          }
        })
        .catch(error => {
          console.error('获取任务统计失败:', error);
          this.$message.error('获取任务统计失败');
        })
        .finally(() => {
          this.statsLoading = false;
        });
    },
    initExecutionChart(data) {
      const chartDom = document.getElementById('executionChart');
      if (!chartDom) return;
      
      this.executionChart = echarts.init(chartDom);
      
      const option = {
        title: {
          text: '任务执行成功/失败统计（近30天）',
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
              color: '#67C23A'
            },
            data: data.success || []
          },
          {
            name: '失败',
            type: 'bar',
            stack: 'total',
            itemStyle: {
              color: '#F56C6C'
            },
            data: data.failed || []
          }
        ]
      };
      
      this.executionChart.setOption(option);
    },
    initDurationChart(data) {
      const chartDom = document.getElementById('durationChart');
      if (!chartDom) return;
      
      this.durationChart = echarts.init(chartDom);
      
      const option = {
        title: {
          text: '任务执行时长统计（近30天）',
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
              color: '#409EFF'
            }
          }
        ]
      };
      
      this.durationChart.setOption(option);
    },
    retryFetch() {
      this.fetchError = false;
      this.fetchGroups();
      
      // 先获取任务组，然后获取任务列表
      setTimeout(() => {
        this.fetchData();
      }, 200);
    }
  },
  beforeDestroy() {
    if (this.executionChart) {
      this.executionChart.dispose();
    }
    if (this.durationChart) {
      this.durationChart.dispose();
    }
  }
};
</script>

<style scoped>
.filter-container {
  margin-bottom: 20px;
}
.filter-form {
  margin-top: 15px;
}
.task-result {
  padding: 10px;
}
.result-output {
  margin-top: 10px;
}
.result-output pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.stats-overview {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.stats-card {
  flex: 1;
  min-width: 180px;
  margin: 0 10px 10px 0;
  padding: 15px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  text-align: center;
}
.stats-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 10px;
}
.stats-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}
.success-rate {
  border-left: 4px solid #67C23A;
}
.avg-duration {
  border-left: 4px solid #409EFF;
}
.total-runs {
  border-left: 4px solid #E6A23C;
}
.last-run {
  border-left: 4px solid #909399;
}
.stats-charts {
  margin-top: 20px;
}
</style> 
<template>
  <div class="app-container">
    <el-card class="box-card" shadow="never">
      <template v-slot:header>
<div  class="clearfix">
        <span>任务组管理</span>
        <el-button-group style="float: right">
          <el-button type="primary" icon="el-icon-plus" @click="$router.push('/cron/group/add')">添加任务组</el-button>
          <el-button type="success" icon="el-icon-refresh" @click="fetchData">刷新</el-button>
          <el-button type="info" icon="el-icon-back" @click="$router.push('/cron/tasks')">返回任务列表</el-button>
        </el-button-group>
        <automation-room-select @ready="fetchData" @change="fetchData" />
      </div>
</template>
      
      <el-table v-loading="loading" :data="groupList" style="width: 100%;" border>
        <el-table-column prop="id" label="ID" width="60" align="center"></el-table-column>
        <el-table-column prop="name" label="组名称" min-width="150">
          <template v-slot="scope">
            <router-link :to="`/cron/group/${scope.row.id}`" class="link-type">
              {{ scope.row.name }}
            </router-link>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200">
          <template v-slot="scope">
            <span>{{ scope.row.description || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100">
          <template v-slot="scope">
            <el-tag :type="getTypeTag(scope.row.type)">
              {{ getTypeLabel(scope.row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="任务数量" width="120" align="center">
          <template v-slot="scope">
            <el-tooltip :content="`点击查看${scope.row.name}下的任务`" placement="top" effect="light">
              <router-link :to="`/cron/group/${scope.row.id}`" class="link-type">
                <el-badge :value="scope.row.task_count || 0" class="task-count-badge" :hidden="!scope.row.task_count">
                  <span class="task-count">{{ scope.row.task_count || 0 }} 个任务</span>
                </el-badge>
              </router-link>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template v-slot="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" align="center">
          <template v-slot="scope">
            <el-button-group>
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
                icon="el-icon-delete"
                :disabled="scope.row.task_count > 0">
                删除
              </el-button>
            </el-button-group>
            <div style="margin-top: 5px;">
              <el-button 
                size="mini" 
                type="info"
                @click="$router.push(`/cron/group/${scope.row.id}`)"
                icon="el-icon-view">
                查看详情
              </el-button>
              <el-button 
                size="mini" 
                type="warning"
                @click="viewGroupStats(scope.row.id)"
                icon="el-icon-data-line">
                统计数据
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <el-dialog title="任务组统计" v-model="statsDialogVisible" width="70%">
      <div v-loading="statsLoading" class="group-stats">
        <div v-if="groupStats" class="stats-overview">
          <div class="stats-card total-tasks">
            <div class="stats-title">总任务数</div>
            <div class="stats-value">{{ groupStats.total_tasks }}</div>
          </div>
          <div class="stats-card enabled-tasks">
            <div class="stats-title">启用任务数</div>
            <div class="stats-value">{{ groupStats.enabled_tasks }}</div>
          </div>
          <div class="stats-card success-rate">
            <div class="stats-title">成功率</div>
            <div class="stats-value">{{ groupStats.success_rate }}%</div>
          </div>
          <div class="stats-card avg-duration">
            <div class="stats-title">平均耗时</div>
            <div class="stats-value">{{ groupStats.avg_duration }}秒</div>
          </div>
        </div>
        <div class="stats-charts" v-if="groupStats">
          <div id="groupExecutionChart" style="width: 100%; height: 300px;"></div>
        </div>
      </div>
      <template v-slot:footer>
<div  class="dialog-footer">
        <el-button @click="statsDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="$router.push('/cron/charts')">查看更多图表</el-button>
      </div>
</template>
    </el-dialog>
  </div>
</template>

<script>
import { cronTaskApi } from '@/api/index';
import * as echarts from 'echarts';
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue';

export default {
  name: 'TaskGroups',
  components: { AutomationRoomSelect },
  data() {
    return {
      loading: false,
      statsLoading: false,
      groupList: [],
      statsDialogVisible: false,
      groupStats: null,
      executionChart: null,
      currentGroupId: null
    };
  },
  methods: {
    fetchData() {
      this.loading = true;
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
          this.$message.error('获取任务组列表失败');
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
        this.$message.warning('该任务组下还有任务，无法删除');
        return;
      }
      
      this.$confirm('确定要删除此任务组吗？删除后不可恢复', '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        cronTaskApi.deleteGroup(row.id)
          .then(response => {
            console.log('删除任务组响应:', response);
            if (response.data && (response.data.code === 200 || response.data.status === 200)) {
              this.$message.success('删除成功');
              this.fetchData();
            } else {
              this.$message.error(response.data?.msg || response.data?.message || '删除失败');
            }
          })
          .catch(error => {
            console.error('删除任务组失败:', error);
            this.$message.error('删除任务组失败');
          });
      }).catch(() => {
        this.$message.info('已取消删除');
      });
    },
    handleToggleStatus(row) {
      const action = row.status === 1 ? '禁用' : '启用';
      const actionApi = row.status === 1 ? cronTaskApi.disableGroup : cronTaskApi.enableGroup;
      
      this.$confirm(`确定要${action}此任务组吗？${action}后组内所有任务将被${action}`, `确认${action}`, {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        actionApi(row.id)
          .then(response => {
            console.log(`${action}任务组响应:`, response);
            if (response.data && (response.data.code === 200 || response.data.status === 200)) {
              this.$message.success(`${action}成功`);
              this.fetchData();
            } else {
              this.$message.error(response.data?.msg || response.data?.message || `${action}失败`);
            }
          })
          .catch(error => {
            console.error(`${action}任务组失败:`, error);
            this.$message.error(`${action}任务组失败`);
          });
      }).catch(() => {
        this.$message.info(`已取消${action}`);
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
    getTypeTag(type) {
      const tags = {
        'system': 'danger',
        'world': 'primary',
        'custom': 'success'
      };
      return tags[type] || 'info';
    },
    viewGroupStats(groupId) {
      this.statsDialogVisible = true;
      this.statsLoading = true;
      this.currentGroupId = groupId;
      
      // 获取任务组统计数据
      cronTaskApi.getGroupStats(groupId)
        .then(response => {
          console.log('获取任务组统计数据响应:', response);
          if (response.data && (response.data.code === 200 || response.data.status === 200)) {
            this.groupStats = response.data.data;
            
            // 获取任务组执行图表数据
            cronTaskApi.getGroupChart(groupId, { days: 30 })
              .then(chartResponse => {
                console.log('获取任务组图表数据响应:', chartResponse);
                if (chartResponse.data && (chartResponse.data.code === 200 || chartResponse.data.status === 200)) {
                  this.$nextTick(() => {
                    this.initGroupExecutionChart(chartResponse.data.data);
                  });
                }
              });
          } else {
            this.$message.error(response.data?.msg || response.data?.message || '获取任务组统计失败');
          }
        })
        .catch(error => {
          console.error('获取任务组统计失败:', error);
          this.$message.error('获取任务组统计失败');
        })
        .finally(() => {
          this.statsLoading = false;
        });
    },
    initGroupExecutionChart(data) {
      const chartDom = document.getElementById('groupExecutionChart');
      if (!chartDom) return;
      
      this.executionChart = echarts.init(chartDom);
      
      const option = {
        title: {
          text: '任务组执行情况统计（近30天）',
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
      
      this.executionChart.setOption(option);
    }
  },
  beforeUnmount() {
    if (this.executionChart) {
      this.executionChart.dispose();
    }
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
  color: var(--primary-color);
  text-decoration: none;
}
.link-type:hover {
  text-decoration: underline;
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
  color: var(--text-regular);
  margin-bottom: 10px;
}
.stats-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary);
}
.total-tasks {
  border-left: 4px solid var(--primary-color);
}
.enabled-tasks {
  border-left: 4px solid #4f8a5b;
}
.success-rate {
  border-left: 4px solid #d99b32;
}
.avg-duration {
  border-left: 4px solid var(--text-secondary);
}
.stats-charts {
  margin-top: 20px;
}
</style>

<template>
  <div class="scheduled-tasks-container">
    <div class="page-header">
      <h2 class="page-title">定时任务管理</h2>
      <div class="page-actions">
        <el-button type="primary" @click="navigateToCreate">
          <component :is="'el-icon-plus'" class="legacy-icon" /> 创建任务
        </el-button>
      </div>
    </div>
    
    <el-card shadow="hover" class="task-list-card">
      <template v-slot:header>
<div  class="clearfix">
        <span>任务列表</span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="refreshTasks">
          <component :is="'el-icon-refresh'" class="legacy-icon" /> 刷新
        </el-button>
      </div>
</template>
      
      <el-table 
        :data="taskList" 
        v-loading="loading"
        style="width: 100%"
        :row-class-name="getRowClassName">
        <el-table-column prop="name" label="任务名称" min-width="180">
          <template v-slot="scope">
            <div class="task-name">
              <el-tag 
                :type="getTaskTypeTag(scope.row.type)" 
                size="mini" 
                effect="plain">
                {{ scope.row.type }}
              </el-tag>
              <span class="task-title">{{ scope.row.name }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="schedule" label="执行计划" min-width="180">
          <template v-slot="scope">
            <el-tooltip :content="getScheduleDescription(scope.row.schedule)" placement="top">
              <div class="task-schedule">
                <component :is="'el-icon-time'" class="legacy-icon" />
                <span>{{ scope.row.schedule }}</span>
              </div>
            </el-tooltip>
          </template>
        </el-table-column>
        
        <el-table-column prop="target" label="目标服务器" min-width="150">
          <template v-slot="scope">
            <el-tag size="mini" type="info">{{ scope.row.target }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="lastRun" label="上次执行" min-width="150">
          <template v-slot="scope">
            <span>{{ scope.row.lastRun || '从未执行' }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="nextRun" label="下次执行" min-width="150">
          <template v-slot="scope">
            <span>{{ scope.row.nextRun }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" width="100">
          <template v-slot="scope">
            <el-tag 
              :type="getStatusType(scope.row.status)" 
              effect="dark" 
              size="mini">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="220">
          <template v-slot="scope">
            <el-button 
              size="mini" 
              type="primary" 
              plain
              @click="runTaskNow(scope.row)"
              :disabled="!canRunTask(scope.row)">
              执行
            </el-button>
            <el-button 
              size="mini" 
              type="info" 
              plain
              @click="editTask(scope.row)">
              编辑
            </el-button>
            <el-button 
              size="mini" 
              type="danger" 
              plain
              @click="deleteTask(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-container" v-if="totalTasks > 0">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="totalTasks"
          :page-size="pageSize"
          v-model:current-page="currentPage"
          @current-change="handleCurrentChange">
        </el-pagination>
      </div>
    </el-card>
  </div>
</template>

<script>
import { cronTaskApi } from '@/api/index';

export default {
  name: 'ScheduledTasks',
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
            this.$message.error('获取任务列表失败');
          }
        })
        .catch(error => {
          this.taskList = [];
          this.totalTasks = 0;
          this.$message.error(error.message || '获取任务列表失败');
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
    
    getRowClassName({row}) {
      if (row.status === '暂停') {
        return 'task-paused';
      }
      return '';
    },
    
    getTaskTypeTag(type) {
      const typeMap = {
        '服务器维护': 'primary',
        '游戏活动': 'success',
        '数据备份': 'info',
        '系统维护': 'warning',
        '公告通知': 'success',
        '模组管理': 'info',
        '数据分析': 'primary'
      };
      
      return typeMap[type] || '';
    },
    
    getStatusType(status) {
      switch (status) {
        case '正常': return 'success';
        case '暂停': return 'info';
        case '失败': return 'danger';
        case '待执行': return 'warning';
        default: return '';
      }
    },
    
    getScheduleDescription(schedule) {
      return schedule;
    },
    
    canRunTask(task) {
      return task.status === '正常';
    },
    
    runTaskNow(task) {
      this.$confirm(`确定要立即执行任务"${task.name}"吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 使用API执行任务
        if (task.raw && task.raw.id) {
          this.loading = true;
          
          cronTaskApi.runTask(task.raw.id)
            .then(response => {
              if (response.data && response.data.status === 200) {
                this.$message({
                  type: 'success',
                  message: `任务"${task.name}"已开始执行`
                });
                
                // 刷新任务列表
                this.fetchTasks();
              } else {
                this.$message.error(response.data.message || '执行任务失败');
              }
            })
            .catch(error => {
              console.error('执行任务失败:', error);
              this.$message.error('执行任务失败');
            })
            .finally(() => {
              this.loading = false;
            });
        } else {
          this.$message.error('任务缺少真实后端标识，无法执行');
        }
      }).catch(() => {});
    },
    
    editTask(task) {
      if (task.raw && task.raw.id) {
        this.$router.push({
          path: '/cron/edit/' + task.raw.id
        });
      } else this.$message.error('任务缺少真实后端标识，无法编辑');
    },
    
    deleteTask(task) {
      this.$confirm(`确定要删除任务"${task.name}"吗？此操作不可恢复！`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'danger'
      }).then(() => {
        if (task.raw && task.raw.id) {
          // 使用API删除任务
          cronTaskApi.deleteTask(task.raw.id)
            .then(response => {
              if (response.data && response.data.status === 200) {
                this.$message({
                  type: 'success',
                  message: `任务"${task.name}"已删除`
                });
                
                // 刷新任务列表
                this.fetchTasks();
              } else {
                this.$message.error(response.data.message || '删除任务失败');
              }
            })
            .catch(error => {
              console.error('删除任务失败:', error);
              this.$message.error('删除任务失败');
            });
        } else this.$message.error('任务缺少真实后端标识，无法删除');
      }).catch(() => {});
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
  border-bottom: 1px solid var(--border-color);
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.task-list-card {
  margin-bottom: 0;
  border-radius: 4px;
  box-shadow: none;
}

.task-name {
  display: flex;
  align-items: center;
}

.task-title {
  margin-left: 10px;
  font-weight: 500;
}

.task-schedule {
  display: flex;
  align-items: center;
}

.task-schedule i {
  margin-right: 5px;
  color: var(--text-secondary);
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.task-paused {
  background-color: var(--surface-muted);
  color: var(--text-secondary);
}

:deep(.el-table .cell) {
  white-space: nowrap;
}
</style>

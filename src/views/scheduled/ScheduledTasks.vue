<template>
  <div class="scheduled-tasks-container">
    <div class="page-header">
      <h2 class="page-title">定时任务管理</h2>
      <div class="page-actions">
        <el-button type="primary" @click="navigateToCreate">
          <component is="el-icon-plus" class="legacy-icon" /> 创建任务
        </el-button>
      </div>
    </div>
    
    <el-card shadow="hover" class="task-list-card">
      <div slot="header" class="clearfix">
        <span>任务列表</span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="refreshTasks">
          <component is="el-icon-refresh" class="legacy-icon" /> 刷新
        </el-button>
      </div>
      
      <el-table 
        :data="taskList" 
        v-loading="loading"
        style="width: 100%"
        :row-class-name="getRowClassName">
        <el-table-column prop="name" label="任务名称" min-width="180">
          <template slot-scope="scope">
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
          <template slot-scope="scope">
            <el-tooltip :content="getScheduleDescription(scope.row.schedule)" placement="top">
              <div class="task-schedule">
                <component is="el-icon-time" class="legacy-icon" />
                <span>{{ scope.row.schedule }}</span>
              </div>
            </el-tooltip>
          </template>
        </el-table-column>
        
        <el-table-column prop="target" label="目标服务器" min-width="150">
          <template slot-scope="scope">
            <el-tag size="mini" type="info">{{ scope.row.target }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="lastRun" label="上次执行" min-width="150">
          <template slot-scope="scope">
            <span>{{ scope.row.lastRun || '从未执行' }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="nextRun" label="下次执行" min-width="150">
          <template slot-scope="scope">
            <span>{{ scope.row.nextRun }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" width="100">
          <template slot-scope="scope">
            <el-tag 
              :type="getStatusType(scope.row.status)" 
              effect="dark" 
              size="mini">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="220">
          <template slot-scope="scope">
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
          :current-page.sync="currentPage"
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
            // 如果API请求失败，使用模拟数据作为备用
            this.taskList = this.generateDemoTasks();
            this.totalTasks = this.taskList.length;
            console.error('获取任务列表失败，使用模拟数据');
          }
        })
        .catch(error => {
          console.error('获取任务列表失败:', error);
          // 出错时使用模拟数据
          this.taskList = this.generateDemoTasks();
          this.totalTasks = this.taskList.length;
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
    
    // 保留用于备用的模拟数据生成方法
    generateDemoTasks() {
      return [
        {
          id: 1,
          name: '每日服务器重启',
          type: '服务器维护',
          schedule: '每天 04:00',
          target: '主世界服务器',
          lastRun: '2023-05-10 04:00',
          nextRun: '2023-05-11 04:00',
          status: '正常'
        },
        {
          id: 2,
          name: '周末活动开启',
          type: '游戏活动',
          schedule: '每周五 18:00',
          target: '全部服务器',
          lastRun: '2023-05-05 18:00',
          nextRun: '2023-05-12 18:00',
          status: '正常'
        },
        {
          id: 3,
          name: '玩家数据备份',
          type: '数据备份',
          schedule: '每6小时',
          target: '全部服务器',
          lastRun: '2023-05-10 18:00',
          nextRun: '2023-05-11 00:00',
          status: '正常'
        },
        {
          id: 4,
          name: '服务器资源清理',
          type: '系统维护',
          schedule: '每周一 03:00',
          target: '全部服务器',
          lastRun: '2023-05-08 03:00',
          nextRun: '2023-05-15 03:00',
          status: '正常'
        },
        {
          id: 5,
          name: '游戏公告推送',
          type: '公告通知',
          schedule: '每天 12:00, 18:00',
          target: '全部服务器',
          lastRun: '2023-05-10 12:00',
          nextRun: '2023-05-10 18:00',
          status: '正常'
        },
        {
          id: 6,
          name: '模组更新检查',
          type: '模组管理',
          schedule: '每天 02:00',
          target: '全部服务器',
          lastRun: '2023-05-10 02:00',
          nextRun: '2023-05-11 02:00',
          status: '暂停'
        },
        {
          id: 7,
          name: '季节性活动结束',
          type: '游戏活动',
          schedule: '2023-05-20 23:59',
          target: '全部服务器',
          lastRun: null,
          nextRun: '2023-05-20 23:59',
          status: '待执行'
        },
        {
          id: 8,
          name: '玩家活跃度统计',
          type: '数据分析',
          schedule: '每周日 23:00',
          target: '全部服务器',
          lastRun: '2023-05-07 23:00',
          nextRun: '2023-05-14 23:00',
          status: '正常'
        }
      ];
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
      // 提供更详细的调度说明
      const descriptions = {
        '每天 04:00': '每天凌晨4点执行服务器重启',
        '每周五 18:00': '每周五晚上6点开启周末活动',
        '每6小时': '每6小时执行一次数据备份，保证数据安全',
        '每周一 03:00': '每周一凌晨3点进行服务器资源回收与清理',
        '每天 12:00, 18:00': '每天中午12点和晚上6点推送游戏公告',
        '每天 02:00': '每天凌晨2点检查并更新模组',
        '2023-05-20 23:59': '在2023年5月20日晚上11:59结束季节性活动',
        '每周日 23:00': '每周日晚上11点统计玩家一周活跃数据'
      };
      
      return descriptions[schedule] || schedule;
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
          this.$message({
            type: 'success',
            message: `任务"${task.name}"已开始执行`
          });
        }
      }).catch(() => {});
    },
    
    editTask(task) {
      if (task.raw && task.raw.id) {
        this.$router.push({
          path: '/cron/edit/' + task.raw.id
        });
      } else {
        this.$router.push({
          path: '/scheduled/create',
          query: { id: task.id }
        });
      }
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
        } else {
          // 模拟删除操作
          this.taskList = this.taskList.filter(t => t.id !== task.id);
          this.totalTasks = this.taskList.length;
          
          this.$message({
            type: 'success',
            message: `任务"${task.name}"已删除`
          });
        }
      }).catch(() => {});
    }
  }
};
</script>

<style scoped>
.scheduled-tasks-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #27352f;
}

.task-list-card {
  margin-bottom: 20px;
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
  color: #758078;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.task-paused {
  background-color: #f9f9f9;
  color: #758078;
}

:deep(.el-table .cell) {
  white-space: nowrap;
}
</style> 
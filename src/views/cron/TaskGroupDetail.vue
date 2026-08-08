<template>
  <div class="app-container">
    <el-card class="box-card" shadow="never">
      <template v-slot:header>
<div  class="clearfix">
        <span v-if="group">{{ group.name }} - 任务组详情</span>
        <span v-else>任务组详情</span>
        <el-button-group style="float: right">
          <el-button type="primary" icon="el-icon-plus" @click="handleAddTask">添加任务</el-button>
          <el-button type="success" icon="el-icon-edit" @click="handleEditGroup" v-if="group">编辑任务组</el-button>
          <el-button type="info" icon="el-icon-back" @click="$router.push('/cron/groups')">返回列表</el-button>
        </el-button-group>
        <automation-room-select @ready="handleAutomationRoom" @change="handleAutomationRoom" />
      </div>
</template>
      
      <div v-loading="loading">
        <div class="group-info" v-if="group">
          <el-descriptions border :column="2">
            <el-descriptions-item label="组ID">{{ group.id }}</el-descriptions-item>
            <el-descriptions-item label="组名称">{{ group.name }}</el-descriptions-item>
            <el-descriptions-item label="描述">{{ group.description || '无描述' }}</el-descriptions-item>
            <el-descriptions-item label="类型">
              <el-tag :type="getTypeTag(group.type)">{{ getTypeLabel(group.type) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="group.status === 1 ? 'success' : 'info'">
                {{ group.status === 1 ? '启用' : '禁用' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="任务数量">{{ group.task_count || 0 }} 个任务</el-descriptions-item>
          </el-descriptions>
          
          <el-divider content-position="left">任务列表</el-divider>
          
          <el-table :data="taskList" style="width: 100%;" border>
            <el-table-column prop="id" label="ID" width="60" align="center"></el-table-column>
            <el-table-column prop="name" label="任务名称" min-width="120">
              <template v-slot="scope">
                <el-tooltip v-if="scope.row.description" :content="scope.row.description" placement="top" effect="light">
                  <span>{{ scope.row.name }}</span>
                </el-tooltip>
                <span v-else>{{ scope.row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="spec" label="Cron表达式" min-width="120"></el-table-column>
            <el-table-column prop="type" label="类型" width="100">
              <template v-slot="scope">
                <el-tag :type="scope.row.type === 'function' ? 'primary' : 'success'">
                  {{ scope.row.type === 'function' ? '函数' : 'Shell命令' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="target" label="目标" min-width="150">
              <template v-slot="scope">
                <el-tooltip :content="scope.row.target" placement="top" effect="light">
                  <span>{{ truncate(scope.row.target, 30) }}</span>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80">
              <template v-slot="scope">
                <el-tag :type="scope.row.status === 1 ? 'success' : 'info'">
                  {{ scope.row.status === 1 ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220" align="center">
              <template v-slot="scope">
                <el-button 
                  size="mini" 
                  type="success"
                  @click="handleRunNow(scope.row)"
                  icon="el-icon-video-play">
                  执行
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
              </template>
            </el-table-column>
          </el-table>
          
          <div v-if="taskList.length === 0" class="empty-data">
            <el-empty description="该任务组下暂无任务">
              <el-button type="primary" @click="handleAddTask">添加任务</el-button>
            </el-empty>
          </div>
        </div>
        
        <div v-else class="empty-data">
          <el-empty description="未找到任务组">
            <el-button type="primary" @click="$router.push('/cron/groups')">返回列表</el-button>
          </el-empty>
        </div>
      </div>
    </el-card>
    
    <el-dialog title="执行结果" v-model="dialogVisible" width="60%">
      <div v-if="taskResult" class="task-result">
        <p><strong>执行状态：</strong> {{ taskResult.success ? '成功' : '失败' }}</p>
        <p><strong>执行时间：</strong> {{ taskResult.timestamp }}</p>
        <p v-if="taskResult.duration != null"><strong>执行耗时：</strong> {{ taskResult.duration }} 秒</p>
        <div class="result-output">
          <strong>输出结果：</strong>
          <pre>{{ taskResult.output }}</pre>
        </div>
      </div>
      <template v-slot:footer>
<div  class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="viewTaskLogs(currentTaskId)">查看完整日志</el-button>
      </div>
</template>
    </el-dialog>
  </div>
</template>

<script>
import { cronTaskApi } from '@/api/index';
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue';

export default {
  name: 'TaskGroupDetail',
  components: { AutomationRoomSelect },
  data() {
    return {
      loading: false,
      groupId: null,
      group: null,
      taskList: [],
      dialogVisible: false,
      taskResult: null,
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
            this.$message.error(response.data.message || '获取任务组详情失败');
          }
        })
        .catch(error => {
          console.error('获取任务组详情失败:', error);
          this.$message.error('获取任务组详情失败');
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
            this.$message.error(response.data.message || '获取任务组下的任务失败');
          }
        })
        .catch(error => {
          console.error('获取任务组下的任务失败:', error);
          this.$message.error('获取任务组下的任务失败');
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
      this.$confirm('确定要删除此任务吗？删除后不可恢复', '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        cronTaskApi.deleteTask(row.id)
          .then(response => {
            if (response.data && response.data.status === 200) {
              this.$message.success('删除成功');
              this.fetchGroupTasks();
            } else {
              this.$message.error(response.data.message || '删除失败');
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
            if (response.data && response.data.status === 200) {
              this.$message.success('任务执行成功');
              this.taskResult = response.data.data;
              this.dialogVisible = true;
            } else {
              this.$message.error(response.data.message || '任务执行失败');
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
    }
  }
};
</script>

<style scoped>
.group-info {
  margin-bottom: 20px;
}
.empty-data {
  padding: 40px 0;
  text-align: center;
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
</style>

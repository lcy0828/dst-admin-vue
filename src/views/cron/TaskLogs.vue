<template>
  <div class="app-container">
    <el-card class="box-card" shadow="never">
      <div slot="header" class="clearfix">
        <span>任务执行日志</span>
        <el-button-group style="float: right">
          <el-button type="danger" icon="el-icon-delete" @click="handleClearLogs">清理旧日志</el-button>
          <el-button type="primary" icon="el-icon-refresh" @click="fetchData">刷新</el-button>
          <el-button type="info" icon="el-icon-back" @click="$router.push('/cron/tasks')">返回任务列表</el-button>
        </el-button-group>
      </div>
      
      <div class="filter-container">
        <el-form :inline="true" :model="listQuery" class="filter-form">
          <el-form-item label="任务">
            <el-select v-model="listQuery.task_id" placeholder="选择任务" clearable filterable style="width: 200px">
              <el-option label="全部" value=""></el-option>
              <el-option
                v-for="task in taskOptions"
                :key="task.id"
                :label="task.name"
                :value="task.id">
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="listQuery.status" placeholder="执行状态" clearable style="width: 150px">
              <el-option label="全部" value=""></el-option>
              <el-option label="成功" value="success"></el-option>
              <el-option label="失败" value="failed"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="yyyy-MM-dd"
              style="width: 300px;">
            </el-date-picker>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜索</el-button>
            <el-button type="info" icon="el-icon-refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table v-loading="loading" :data="logList" style="width: 100%;" border>
        <el-table-column prop="id" label="ID" width="60" align="center"></el-table-column>
        <el-table-column prop="task_name" label="任务名称" min-width="120">
          <template slot-scope="scope">
            <router-link
              :to="`/cron/edit/${scope.row.task_id}`"
              class="link-type"
              v-if="scope.row.task_id">
              {{ scope.row.task_name }}
            </router-link>
            <span v-else>{{ scope.row.task_name || '未知任务' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="执行时间" width="170" align="center">
          <template slot-scope="scope">
            {{ scope.row.created_at }}
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="执行耗时" width="100" align="center">
          <template slot-scope="scope">
            {{ scope.row.duration ? scope.row.duration + ' 秒' : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 'success' ? 'success' : 'danger'">
              {{ scope.row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="执行类型" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.is_manual === 1 ? 'warning' : 'info'">
              {{ scope.row.is_manual === 1 ? '手动' : '自动' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template slot-scope="scope">
            <el-button 
              size="mini" 
              type="primary" 
              @click="viewLogDetail(scope.row)" 
              icon="el-icon-view">
              查看详情
            </el-button>
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
    
    <el-dialog title="日志详情" :visible.sync="dialogVisible" width="70%">
      <div v-if="currentLog" class="log-detail">
        <el-descriptions border :column="2">
          <el-descriptions-item label="任务ID">{{ currentLog.task_id }}</el-descriptions-item>
          <el-descriptions-item label="任务名称">{{ currentLog.task_name }}</el-descriptions-item>
          <el-descriptions-item label="执行状态">
            <el-tag :type="currentLog.status === 'success' ? 'success' : 'danger'">
              {{ currentLog.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="执行方式">
            <el-tag :type="currentLog.is_manual === 1 ? 'warning' : 'info'">
              {{ currentLog.is_manual === 1 ? '手动执行' : '自动执行' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ currentLog.created_at }}</el-descriptions-item>
          <el-descriptions-item label="执行耗时">{{ currentLog.duration ? currentLog.duration + ' 秒' : '-' }}</el-descriptions-item>
          <el-descriptions-item label="执行者">{{ currentLog.executor || '系统' }}</el-descriptions-item>
          <el-descriptions-item label="重试次数">{{ currentLog.retry_count || 0 }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="log-output">
          <div class="log-title">执行输出：</div>
          <pre class="log-content">{{ currentLog.output || '无输出' }}</pre>
        </div>
        
        <div v-if="currentLog.error" class="log-error">
          <div class="log-title">错误信息：</div>
          <pre class="log-content error">{{ currentLog.error }}</pre>
        </div>
      </div>
      <div v-else class="empty-data">
        <el-empty description="未找到日志详情"></el-empty>
      </div>
    </el-dialog>
    
    <el-dialog title="清理日志" :visible.sync="clearDialogVisible" width="500px">
      <el-form :model="clearForm" label-width="120px">
        <el-form-item label="保留时间">
          <el-select v-model="clearForm.keep_days" style="width: 100%">
            <el-option label="保留最近7天" :value="7"></el-option>
            <el-option label="保留最近30天" :value="30"></el-option>
            <el-option label="保留最近90天" :value="90"></el-option>
            <el-option label="保留最近180天" :value="180"></el-option>
            <el-option label="保留最近365天" :value="365"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="任务筛选">
          <el-select v-model="clearForm.task_id" placeholder="选择要清理的任务" clearable style="width: 100%">
            <el-option label="全部任务" value=""></el-option>
            <el-option
              v-for="task in taskOptions"
              :key="task.id"
              :label="task.name"
              :value="task.id">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态筛选">
          <el-select v-model="clearForm.status" placeholder="选择状态" clearable style="width: 100%">
            <el-option label="全部" value=""></el-option>
            <el-option label="成功" value="success"></el-option>
            <el-option label="失败" value="failed"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="clearDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmClearLogs" :loading="clearLoading">确认清理</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { cronTaskApi } from '@/api/index';

export default {
  name: 'TaskLogs',
  data() {
    return {
      loading: false,
      logList: [],
      taskOptions: [],
      total: 0,
      listQuery: {
        page: 1,
        limit: 20,
        task_id: '',
        status: '',
        start_date: '',
        end_date: ''
      },
      dateRange: [],
      dialogVisible: false,
      currentLog: null,
      clearDialogVisible: false,
      clearLoading: false,
      clearForm: {
        keep_days: 30,
        task_id: '',
        status: ''
      }
    };
  },
  created() {
    // 如果URL中包含task_id参数，则预先设置
    const { task_id } = this.$route.query;
    if (task_id) {
      this.listQuery.task_id = task_id;
    }
    
    this.fetchTasks();
    this.fetchData();
  },
  watch: {
    dateRange(val) {
      if (val && val.length === 2) {
        this.listQuery.start_date = val[0];
        this.listQuery.end_date = val[1];
      } else {
        this.listQuery.start_date = '';
        this.listQuery.end_date = '';
      }
    }
  },
  methods: {
    fetchTasks() {
      cronTaskApi.getTasks()
        .then(response => {
          if (response.data && response.data.status === 200) {
            this.taskOptions = (response.data.data.items || []).map(task => ({
              id: task.id,
              name: task.name
            }));
          }
        })
        .catch(error => {
          console.error('获取任务列表失败:', error);
        });
    },
    fetchData() {
      this.loading = true;
      cronTaskApi.getLogs(this.listQuery)
        .then(response => {
          if (response.data && response.data.status === 200) {
            this.logList = response.data.data.items || [];
            this.total = response.data.data.total || 0;
          } else {
            this.$message.error(response.data.message || '获取日志列表失败');
          }
        })
        .catch(error => {
          console.error('获取日志列表失败:', error);
          this.$message.error('获取日志列表失败');
        })
        .finally(() => {
          this.loading = false;
        });
    },
    handleSearch() {
      this.listQuery.page = 1;
      this.fetchData();
    },
    resetQuery() {
      this.dateRange = [];
      this.listQuery = {
        page: 1,
        limit: 20,
        task_id: '',
        status: '',
        start_date: '',
        end_date: ''
      };
      this.fetchData();
    },
    handleSizeChange(val) {
      this.listQuery.limit = val;
      this.fetchData();
    },
    handleCurrentChange(val) {
      this.listQuery.page = val;
      this.fetchData();
    },
    viewLogDetail(log) {
      this.currentLog = log;
      this.dialogVisible = true;
    },
    handleClearLogs() {
      this.clearDialogVisible = true;
    },
    confirmClearLogs() {
      this.$confirm(`确定要清理${this.clearForm.keep_days}天之前的日志吗？此操作不可恢复`, '确认清理', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.clearLoading = true;
        cronTaskApi.clearLogs(this.clearForm)
          .then(response => {
            if (response.data && response.data.status === 200) {
              this.$message.success(`成功清理了 ${response.data.data.deleted_count || 0} 条日志`);
              this.clearDialogVisible = false;
              this.fetchData();
            } else {
              this.$message.error(response.data.message || '清理日志失败');
            }
          })
          .catch(error => {
            console.error('清理日志失败:', error);
            this.$message.error('清理日志失败');
          })
          .finally(() => {
            this.clearLoading = false;
          });
      }).catch(() => {
        this.$message.info('已取消清理');
      });
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
.empty-data {
  padding: 40px 0;
  text-align: center;
}
.log-detail {
  margin-bottom: 20px;
}
.log-title {
  font-weight: bold;
  margin: 15px 0 5px 0;
}
.log-content {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: Monaco, Menlo, Consolas, "Courier New", monospace;
}
.log-content.error {
  background-color: #fee;
  color: #d33;
}
.link-type {
  color: #409EFF;
  text-decoration: none;
}
.link-type:hover {
  text-decoration: underline;
}
</style> 
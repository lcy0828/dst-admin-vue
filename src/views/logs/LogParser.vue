<template>
  <div class="app-container">
    <el-card class="box-card">
      <div slot="header" class="clearfix">
        <div class="header-container">
          <div class="header-title">
            <i class="el-icon-monitor"></i>
            <span>活跃日志解析器</span>
          </div>
          <el-button type="primary" size="small" icon="el-icon-refresh" @click="getActiveParsers">刷新</el-button>
        </div>
      </div>
      
      <div v-loading="loading">
        <div v-if="!activeParsers || activeParsers.length === 0" class="empty-data">
          <i class="el-icon-warning-outline"></i>
          <p>暂无运行中的日志解析器</p>
        </div>
        <div v-else class="parsers-container">
          <el-row :gutter="20">
            <el-col :xs="24" :sm="24" :md="12" v-for="parser in activeParsers" :key="parser.id">
              <el-card shadow="hover" class="parser-card" :class="{'forest-card': parser.server_type === 'Forest', 'caves-card': parser.server_type === 'Caves'}">
                <div class="parser-header">
                  <div class="parser-title">
                    <div class="type-indicator" :class="{'forest-indicator': parser.server_type === 'Forest', 'caves-indicator': parser.server_type === 'Caves'}">
                      <i :class="parser.server_type === 'Forest' ? 'el-icon-sunny' : 'el-icon-moon'"></i>
                    </div>
                    <div>
                      <h3>{{ parser.archive_name }} / {{ parser.world_name }}</h3>
                      <div class="parser-subtitle">
                        <el-tag :type="getServerTypeTag(parser.server_type)" size="small">{{ parser.server_type }}</el-tag>
                        <el-tag :type="getStatusTag(parser.status)" size="small" effect="dark">{{ parser.status }}</el-tag>
                      </div>
                    </div>
                  </div>
                  <div class="parser-id">ID: {{ parser.id.split('_').pop() }}</div>
                </div>
                
                <div class="parser-info">
                  <div class="info-item">
                    <i class="el-icon-refresh"></i>
                    <span class="label">最近活动:</span>
                    <span class="value">{{ formatTime(parser.last_activity) }}</span>
                  </div>
                  <div class="info-item">
                    <i class="el-icon-document"></i>
                    <span class="label">日志文件:</span>
                    <span class="value path-value">{{ parser.log_file }}</span>
                  </div>
                  <div class="info-statistics">
                    <div class="stat-item">
                      <div class="stat-value">{{ parser.client_count }}</div>
                      <div class="stat-label">客户端数量</div>
                    </div>
                  </div>
                </div>
                
                <div class="parser-actions">
                  <el-button type="primary" size="small" icon="el-icon-view">查看日志</el-button>
                  <el-button type="info" size="small" icon="el-icon-refresh">重新启动</el-button>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { logApi } from '@/api/index';
import { formatDate } from '@/utils/date';

export default {
  name: 'LogParser',
  data() {
    return {
      activeParsers: [],
      loading: false
    };
  },
  created() {
    this.getActiveParsers();
  },
  methods: {
    getActiveParsers() {
      this.loading = true;
      logApi.getActiveLogParsers().then(response => {
        console.log('获取解析器响应:', response);
        if (response && response.data) {
          if (Array.isArray(response.data)) {
            this.activeParsers = response.data;
          } 
          else if (response.data.status === 200 && Array.isArray(response.data.data)) {
            this.activeParsers = response.data.data;
          }
          else {
            this.activeParsers = [];
          }
          if (response.data.msg) {
            this.$message.success(response.data.msg);
          }
        } else {
          this.$message.error('获取活跃解析器列表失败: 无数据');
          this.activeParsers = [];
        }
        this.loading = false;
      }).catch(error => {
        console.error('获取活跃解析器列表失败:', error);
        this.$message.error('获取活跃解析器列表失败: ' + (error.message || '未知错误'));
        this.activeParsers = [];
        this.loading = false;
      });
    },
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    },
    getServerTypeTag(type) {
      switch (type) {
        case 'Forest':
          return 'success';
        case 'Caves':
          return 'warning';
        default:
          return 'info';
      }
    },
    getStatusTag(status) {
      switch (status) {
        case 'running':
          return 'success';
        case 'stopped':
          return 'danger';
        case 'paused':
          return 'warning';
        default:
          return 'info';
      }
    }
  }
};
</script>

<style scoped>
.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
}

.header-title i {
  margin-right: 8px;
  font-size: 22px;
  color: #409EFF;
}

.empty-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  padding: 80px 0;
  font-size: 16px;
}

.empty-data i {
  font-size: 50px;
  margin-bottom: 15px;
  color: #c0c4cc;
}

.parsers-container {
  margin-top: 20px;
}

.parser-card {
  margin-bottom: 20px;
  border-radius: 12px;
  transition: all 0.3s;
  overflow: hidden;
  border: none;
}

.parser-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.forest-card {
  border-left: 4px solid #67c23a;
}

.caves-card {
  border-left: 4px solid #e6a23c;
}

.parser-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.parser-title {
  display: flex;
  align-items: center;
  gap: 15px;
}

.type-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.forest-indicator {
  background-color: #67c23a;
}

.caves-indicator {
  background-color: #e6a23c;
}

.type-indicator i {
  font-size: 22px;
}

.parser-title h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #303133;
}

.parser-subtitle {
  display: flex;
  gap: 10px;
}

.parser-id {
  color: #909399;
  font-size: 13px;
}

.parser-info {
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 6px 0;
  color: #606266;
}

.info-item i {
  margin-right: 8px;
  font-size: 16px;
  color: #409EFF;
}

.info-item .label {
  width: 90px;
  font-weight: bold;
}

.info-item .value {
  flex: 1;
  word-break: break-all;
}

.path-value {
  color: #606266;
  font-family: monospace;
  font-size: 13px;
  background-color: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.info-statistics {
  display: flex;
  justify-content: space-around;
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 15px;
  margin-top: 15px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 22px;
  font-weight: bold;
  color: #409EFF;
}

.stat-label {
  font-size: 13px;
  color: #606266;
  margin-top: 5px;
}

.parser-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
}
</style> 
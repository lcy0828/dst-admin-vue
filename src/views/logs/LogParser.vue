<template>
  <div class="app-container">
    <el-card class="box-card">
      <template v-slot:header>
<div  class="clearfix">
        <div class="header-container">
          <div class="header-title">
            <component :is="'el-icon-monitor'" class="legacy-icon" />
            <span>活跃日志解析器</span>
          </div>
          <el-button type="primary" size="small" icon="el-icon-refresh" @click="getActiveParsers">刷新</el-button>
        </div>
      </div>
</template>

      <div v-loading="loading">
        <div v-if="!activeParsers || activeParsers.length === 0" class="empty-data">
          <component :is="'el-icon-warning-outline'" class="legacy-icon" />
          <p>暂无运行中的日志解析器</p>
        </div>
        <div v-else class="parsers-container">
          <el-row :gutter="20">
            <el-col :xs="24" :sm="24" :md="12" v-for="parser in activeParsers" :key="parser.id">
              <el-card shadow="hover" class="parser-card" :class="{'forest-card': parser.server_type === 'Forest', 'caves-card': parser.server_type === 'Caves'}">
                <div class="parser-header">
                  <div class="parser-title">
                    <div class="type-indicator" :class="{'forest-indicator': parser.server_type === 'Forest', 'caves-indicator': parser.server_type === 'Caves'}">
                      <component :is="parser.server_type === 'Forest' ? 'el-icon-sunny' : 'el-icon-moon'" class="legacy-icon" />
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
                    <component :is="'el-icon-refresh'" class="legacy-icon" />
                    <span class="label">最近活动:</span>
                    <span class="value">{{ formatTime(parser.last_activity) }}</span>
                  </div>
                  <div class="info-item">
                    <component :is="'el-icon-document'" class="legacy-icon" />
                    <span class="label">日志文件:</span>
                    <span class="value path-value">{{ parser.log_file }}</span>
                  </div>
                  <div class="info-statistics">
                    <div class="stat-item">
                      <div class="stat-value">{{ parser.client_count == null ? '未提供' : parser.client_count }}</div>
                      <div class="stat-label">客户端数量</div>
                    </div>
                  </div>
                </div>

                <div class="parser-actions">
                  <el-button type="primary" size="small" icon="el-icon-view" @click="viewLogs(parser)">查看日志</el-button>
                  <el-button
                    type="info"
                    size="small"
                    icon="el-icon-refresh"
                    :loading="restartingParserId === parser.id"
                    @click="restartParser(parser)"
                  >重新启动</el-button>
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
import { jobsV2API, roomsV2API } from '@/api/v2';

const TERMINAL_JOB_STATES = new Set(['succeeded', 'failed', 'canceled']);

export default {
  name: 'LogParser',
  data() {
    return {
      activeParsers: [],
      loading: false,
      restartingParserId: ''
    };
  },
  created() {
    this.getActiveParsers();
  },
  methods: {
    async getActiveParsers() {
      this.loading = true;
      try {
        const response = await logApi.getActiveLogParsers();
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
      } catch (error) {
        this.$message.error('获取活跃解析器列表失败: ' + (error.message || '未知错误'));
        this.activeParsers = [];
      } finally {
        this.loading = false;
      }
    },
    viewLogs(parser) {
      this.$router.push({
        name: 'LogQuery',
        query: { archive: parser.archive_name, world: parser.world_name }
      });
    },
    async waitForJob(job) {
      let current = job;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        current = await jobsV2API.get(current.id);
        if (TERMINAL_JOB_STATES.has(current.status)) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (!TERMINAL_JOB_STATES.has(current.status)) throw new Error('重启任务仍在执行，请稍后刷新状态');
      if (current.status !== 'succeeded') {
        const failed = (current.targets || []).find(item => item.status === 'failed');
        throw new Error(failed?.error?.message || current.error?.message || '世界重启失败');
      }
      return current;
    },
    async restartParser(parser) {
      this.restartingParserId = parser.id;
      try {
        const job = await roomsV2API.action(parser.room_id, 'restart', [parser.world_id]);
        await this.waitForJob(job);
        await this.getActiveParsers();
        this.$message.success(`${parser.archive_name} / ${parser.world_name} 已重新启动`);
      } catch (error) {
        this.$message.error(error.message || '重新启动失败');
      } finally {
        this.restartingParserId = '';
      }
    },
    formatTime(timestamp) {
      if (!timestamp) return '后端未提供';
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
  gap: 12px;
}

.header-title {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
}

.header-title .legacy-icon {
  margin-right: 8px;
  font-size: 18px;
  color: var(--primary-color);
}

.empty-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  padding: 48px 16px;
  font-size: 14px;
}

.empty-data .legacy-icon {
  font-size: 30px;
  margin-bottom: 10px;
  color: var(--text-secondary);
}

.parsers-container {
  margin-top: 16px;
}

.parser-card {
  margin-bottom: 16px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: none;
  transition: border-color 0.15s ease;
  overflow: hidden;
}

.parser-card:hover {
  transform: none;
  border-color: var(--el-color-primary-light-5);
  box-shadow: none;
}

.forest-card {
  border-left: 4px solid #4f8a5b;
}

.caves-card {
  border-left: 4px solid #d99b32;
}

.parser-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.parser-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.type-indicator {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.forest-indicator {
  background-color: #4f8a5b;
}

.caves-indicator {
  background-color: #d99b32;
}

.type-indicator .legacy-icon {
  font-size: 18px;
}

.parser-title h3 {
  margin: 0 0 5px;
  font-size: 15px;
  color: var(--text-primary);
}

.parser-subtitle {
  display: flex;
  gap: 10px;
}

.parser-id {
  color: var(--text-secondary);
  font-size: 13px;
}

.parser-info {
  margin-bottom: 14px;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 6px 0;
  color: var(--text-regular);
}

.info-item i {
  margin-right: 8px;
  font-size: 16px;
  color: var(--primary-color);
}

.info-item .label {
  width: 90px;
  font-weight: 500;
}

.info-item .value {
  flex: 1;
  word-break: break-all;
}

.path-value {
  color: var(--text-regular);
  font-family: monospace;
  font-size: 13px;
  background-color: var(--surface-muted);
  padding: 2px 6px;
  border-radius: 4px;
}

.info-statistics {
  display: flex;
  justify-content: flex-start;
  background-color: var(--surface-muted);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  padding: 10px 12px;
  margin-top: 10px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--primary-color);
}

.stat-label {
  font-size: 13px;
  color: var(--text-regular);
  margin-top: 5px;
}

.parser-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
}

@media (max-width: 640px) {
  .header-container,
  .parser-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-container :deep(.el-button),
  .parser-actions :deep(.el-button) {
    margin: 0;
  }

  .parser-actions {
    width: 100%;
  }
}
</style>

<template>
  <div class="agent-list-container">
    <el-card class="main-card" shadow="hover">
      <template #header>
        <div class="clearfix">
        <span class="card-title">
          <component :is="'el-icon-connection'" class="legacy-icon" /> Agent管理中心
        </span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="refreshData">
          <component :is="'el-icon-refresh'" class="legacy-icon" /> 刷新
        </el-button>
        </div>
      </template>

      <div class="agent-list-header">
        <div class="stat-cards">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-value">{{ connectedAgents }}</div>
            <div class="stat-label">在线Agent</div>
          </el-card>
          <el-card class="stat-card" shadow="hover">
            <div class="stat-value">{{ totalAgents }}</div>
            <div class="stat-label">总Agent数</div>
          </el-card>
          <el-card class="stat-card" shadow="hover">
            <div class="stat-value">{{ uniqueOsCount }}</div>
            <div class="stat-label">操作系统</div>
          </el-card>
        </div>
      </div>

      <div v-loading="loading" class="agent-list-content">
        <template v-if="agentList.length > 0">
          <el-row :gutter="20">
            <el-col :span="24" v-for="agent in agentList" :key="agent.id">
              <el-card class="agent-card" :class="{ 'agent-connected': agent.connected }" shadow="hover">
                <div class="agent-card-header">
                  <div class="agent-name">
                    <el-tag :type="agent.connected ? 'success' : 'danger'" size="small" effect="dark">
                      {{ agent.connected ? '在线' : '离线' }}
                    </el-tag>
                    <span class="hostname">{{ agent.hostname }}</span>
                  </div>
                  <div class="agent-actions">
                    <el-button type="primary" size="mini" icon="el-icon-view" @click="showAgentDetails(agent)">详情</el-button>
                    <el-button type="success" size="mini" icon="el-icon-edit" @click="navigateToCommand(agent.id)">执行命令</el-button>
                    <el-button type="danger" size="mini" icon="el-icon-delete" :disabled="agent.connected" @click="forgetAgent(agent)">移除</el-button>
                  </div>
                </div>

                <el-divider></el-divider>

                <div class="agent-info-grid">
                  <div class="info-item">
                    <div class="info-label">UUID</div>
                    <div class="info-value uuid-value">{{ agent.agent_uuid }}</div>
                  </div>

                  <div class="info-item">
                    <div class="info-label">系统</div>
                    <div class="info-value">
                      <component :is="getOsIcon(agent.os)" class="legacy-icon system-icon" />
                      {{ agent.os }} ({{ agent.arch }})
                    </div>
                  </div>

                  <div class="info-item">
                    <div class="info-label">IP地址</div>
                    <div class="info-value">
                      <el-tooltip effect="dark" placement="top" v-for="(ip, idx) in agent.ip_addresses" :key="idx">
                        <template #content>
                          <div>{{ ip }}</div>
                        </template>
                        <el-tag size="mini" style="margin-right: 5px; margin-bottom: 5px">{{ ip }}</el-tag>
                      </el-tooltip>
                    </div>
                  </div>

                  <div class="info-item">
                    <div class="info-label">CPU</div>
                    <div class="info-value">{{ agent.cpu_count }} 核心</div>
                  </div>

                  <div class="info-item">
                    <div class="info-label">内存</div>
                    <div class="info-value">
                      {{ formatBytes(agent.memory ? agent.memory.allocated : 0) }} /
                      {{ formatBytes(agent.memory ? agent.memory.system : 0) }}
                    </div>
                  </div>

                  <div class="info-item">
                    <div class="info-label">运行时间</div>
                    <div class="info-value">{{ formatUptime(agent.uptime_seconds) }}</div>
                  </div>

                  <div class="info-item">
                    <div class="info-label">用户</div>
                    <div class="info-value">{{ agent.user ? agent.user.name : 'N/A' }}</div>
                  </div>

                  <div class="info-item">
                    <div class="info-label">路径</div>
                    <div class="info-value dir-path">{{ agent.current_dir }}</div>
                  </div>

                  <div class="info-item">
                    <div class="info-label">最后心跳</div>
                    <div class="info-value">{{ formatTime(agent.last_heartbeat) }}</div>
                  </div>
                </div>

                <div class="resource-monitor" v-if="agent.connected">
                  <el-progress
                    :text-inside="true"
                    :stroke-width="16"
                    :percentage="calculateMemoryUsage(agent)"
                    :color="getProgressColor"
                    class="progress-item">
                    内存使用
                  </el-progress>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </template>

        <div v-else-if="!loading" class="empty-agents">
          <component :is="'el-icon-connection'" class="legacy-icon empty-icon" />
          <div class="empty-text">暂无Agent连接</div>
          <el-button type="primary" @click="navigateToSecurity">添加Agent</el-button>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" title="Agent详情" width="680px">
      <el-descriptions v-if="selectedAgent" :column="2" border>
        <el-descriptions-item label="UUID" :span="2">{{ selectedAgent.agent_uuid }}</el-descriptions-item>
        <el-descriptions-item label="主机名">{{ selectedAgent.hostname || 'N/A' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ selectedAgent.connected ? '在线' : '离线' }}</el-descriptions-item>
        <el-descriptions-item label="系统">{{ selectedAgent.os || 'N/A' }} ({{ selectedAgent.arch || 'N/A' }})</el-descriptions-item>
        <el-descriptions-item label="版本">{{ selectedAgent.version || 'N/A' }}</el-descriptions-item>
        <el-descriptions-item label="最后心跳">{{ formatTime(selectedAgent.last_heartbeat) }}</el-descriptions-item>
        <el-descriptions-item label="运行时间">{{ formatUptime(selectedAgent.uptime_seconds) }}</el-descriptions-item>
        <el-descriptions-item label="IP地址" :span="2">{{ (selectedAgent.ip_addresses || []).join(', ') || 'N/A' }}</el-descriptions-item>
        <el-descriptions-item label="能力" :span="2">{{ (selectedAgent.capabilities || []).join(', ') || 'N/A' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script>
import { agentApi } from '@/api/index';

export default {
  name: 'AgentList',
  data() {
    return {
      loading: false,
      agentData: {},
      agentList: [],
      detailVisible: false,
      selectedAgent: null
    };
  },
  computed: {
    totalAgents() {
      return this.agentList.length;
    },
    connectedAgents() {
      return this.agentList.filter(agent => agent.connected).length;
    },
    uniqueOsCount() {
      const osSet = new Set(this.agentList.map(agent => agent.os));
      return osSet.size;
    }
  },
  created() {
    this.fetchAgentList();
  },
  methods: {
    async fetchAgentList() {
      this.loading = true;
      try {
        const response = await agentApi.getAgentList();
        this.agentData = response.data || [];
        this.agentList = Array.isArray(this.agentData) ? this.agentData : Object.values(this.agentData);
      } catch (error) {
        this.agentList = [];
        this.$message.error('获取Agent列表失败: ' + (error.message || '未知错误'));
      } finally {
        this.loading = false;
      }
    },
    refreshData() {
      this.fetchAgentList();
    },
    navigateToSecurity() {
      this.$router.push('/agents/security');
    },
    navigateToCommand(id) {
      this.$router.push({ path: '/agents/command', query: { id } });
    },
    showAgentDetails(agent) {
      this.selectedAgent = agent;
      this.detailVisible = true;
    },
    async forgetAgent(agent) {
      try {
        await this.$confirm(`确定移除离线 Agent “${agent.hostname || agent.id}” 的历史记录吗？`, '移除Agent', {
          confirmButtonText: '移除',
          cancelButtonText: '取消',
          type: 'warning'
        });
        await agentApi.forgetAgent(agent.id);
        this.$message.success('Agent 记录已移除');
        await this.fetchAgentList();
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
          this.$message.error('移除 Agent 失败: ' + (error.message || '未知错误'));
        }
      }
    },
    getOsIcon(os) {
      if (!os) return 'el-icon-monitor';

      const osLower = os.toLowerCase();
      if (osLower.includes('mac') || osLower.includes('darwin')) return 'el-icon-apple';

      return 'el-icon-monitor';
    },
    formatBytes(bytes) {
      if (bytes === 0 || !bytes) return '0 B';

      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    formatUptime(seconds) {
      if (!seconds) return 'N/A';

      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (days > 0) {
        return `${days}天 ${hours}小时`;
      } else if (hours > 0) {
        return `${hours}小时 ${minutes}分钟`;
      } else {
        return `${minutes}分钟`;
      }
    },
    formatTime(timestamp) {
      if (!timestamp) return 'N/A';

      const numeric = typeof timestamp === 'string' && /^\d+$/.test(timestamp) ? Number(timestamp) : timestamp;
      const date = typeof numeric === 'number'
        ? new Date(numeric < 1000000000000 ? numeric * 1000 : numeric)
        : new Date(numeric);
      return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
    },
    calculateMemoryUsage(agent) {
      if (!agent.memory || !agent.memory.allocated || !agent.memory.system) {
        return 0;
      }

      return Math.round((agent.memory.allocated / agent.memory.system) * 100);
    },
    getProgressColor(percentage) {
      if (percentage < 70) return '#4f8a5b';
      if (percentage < 90) return '#d99b32';
      return '#c94f4f';
    }
  }
};
</script>

<style scoped>
.agent-list-container {
  padding: 20px;
  background-color: #f8f9fc;
  min-height: calc(100vh - 120px);
}

.main-card {
  border: none;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  background-color: #fff;
  margin-bottom: 20px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.agent-list-header {
  margin-bottom: 20px;
}

.stat-cards {
  display: flex;
  gap: 15px;
}

.stat-card {
  flex: 1;
  text-align: center;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--surface-muted) 0%, #eef2f7 100%);
  border: none;
  cursor: default;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-3px);
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.agent-card {
  margin-bottom: 20px;
  border-radius: 10px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.agent-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.09);
}

.agent-connected {
  border-left: 4px solid #4f8a5b;
}

.agent-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.agent-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hostname {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.agent-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.info-value {
  font-size: 14px;
  color: var(--text-regular);
  word-break: break-all;
}

.uuid-value {
  font-family: monospace;
  color: var(--primary-color);
  font-size: 12px;
}

.dir-path {
  font-family: monospace;
  font-size: 12px;
}

.resource-monitor {
  margin-top: 20px;
}

.progress-item {
  margin-bottom: 10px;
}

.empty-agents {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.empty-icon {
  font-size: 100px;
  color: var(--text-secondary);
  margin-bottom: 20px;
  opacity: 0.7;
}

.empty-text {
  color: var(--text-secondary);
  font-size: 16px;
  margin-bottom: 20px;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .agent-info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stat-cards {
    flex-direction: column;
  }

  .agent-info-grid {
    grid-template-columns: 1fr;
  }

  .agent-card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .agent-actions {
    margin-top: 10px;
  }
}
</style>

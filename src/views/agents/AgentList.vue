<template>
  <div class="agent-list-container">
    <el-card class="main-card" shadow="hover">
      <div slot="header" class="clearfix">
        <span class="card-title">
          <i class="el-icon-connection"></i> Agent管理中心
        </span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="refreshData">
          <i class="el-icon-refresh"></i> 刷新
        </el-button>
      </div>
      
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
            <el-col :span="24" v-for="(agent, agentId) in agentList" :key="agentId">
              <el-card class="agent-card" :class="{ 'agent-connected': agent.connected }" shadow="hover">
                <div class="agent-card-header">
                  <div class="agent-name">
                    <el-tag :type="agent.connected ? 'success' : 'danger'" size="small" effect="dark">
                      {{ agent.connected ? '在线' : '离线' }}
                    </el-tag>
                    <span class="hostname">{{ agent.hostname }}</span>
                  </div>
                  <div class="agent-actions">
                    <el-button type="primary" size="mini" icon="el-icon-view">详情</el-button>
                    <el-button type="success" size="mini" icon="el-icon-edit" @click="navigateToCommand(agent.id)">执行命令</el-button>
                    <el-button type="danger" size="mini" icon="el-icon-delete">移除</el-button>
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
                      <i class="system-icon" :class="getOsIcon(agent.os)"></i>
                      {{ agent.os }} ({{ agent.arch }})
                    </div>
                  </div>
                  
                  <div class="info-item">
                    <div class="info-label">IP地址</div>
                    <div class="info-value">
                      <el-tooltip effect="dark" placement="top" v-for="(ip, idx) in agent.ip_addresses" :key="idx">
                        <div slot="content">{{ ip }}</div>
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
          <i class="el-icon-connection empty-icon"></i>
          <div class="empty-text">暂无Agent连接</div>
          <el-button type="primary" @click="navigateToSecurity">添加Agent</el-button>
        </div>
      </div>
    </el-card>
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
      agentList: []
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
    fetchAgentList() {
      this.loading = true;
      console.log('开始获取Agent列表...');
      
      agentApi.getAgentList()
        .then(response => {
          console.log('Agent列表原始响应:', response);
          // 检查数据是否存在
          if (response) {
            console.log('响应详情:', {
              'response.code': response.code,
              'response.msg': response.msg,
              'response.data 类型': typeof response.data,
              'response.data 是否存在': !!response.data,
            });
            
            if (response.code === 200 && response.data) {
              this.agentData = response.data;
              console.log('提取的Agent数据:', this.agentData);
              this.processAgentData();
            } else {
              this.$message.error(response.msg || '获取Agent列表失败');
            }
          } else {
            this.$message.error('获取Agent列表失败：响应为空');
          }
        })
        .catch(error => {
          console.error('获取Agent列表失败:', error);
          this.$message.error('获取Agent列表失败: ' + (error.message || '未知错误'));
        })
        .finally(() => {
          this.loading = false;
        });
    },
    processAgentData() {
      // 将对象转换为数组
      console.log('处理Agent数据，原始数据:', this.agentData);
      
      // 检查数据结构
      if (typeof this.agentData === 'object' && !Array.isArray(this.agentData)) {
        this.agentList = Object.values(this.agentData);
        console.log('转换为数组后的Agent列表:', this.agentList);
        console.log('Agent数量:', this.agentList.length);
      } else if (Array.isArray(this.agentData)) {
        this.agentList = this.agentData;
        console.log('数据已是数组格式, Agent数量:', this.agentList.length);
      } else {
        console.error('无法处理的Agent数据格式:', typeof this.agentData);
        this.agentList = [];
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
    getOsIcon(os) {
      if (!os) return 'el-icon-monitor';
      
      const osLower = os.toLowerCase();
      if (osLower.includes('linux')) return 'fab fa-linux';
      if (osLower.includes('windows')) return 'fab fa-windows';
      if (osLower.includes('mac') || osLower.includes('darwin')) return 'fab fa-apple';
      
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
      
      // 将时间戳转换为本地时间
      const date = new Date(timestamp * 1000);
      return date.toLocaleString();
    },
    calculateMemoryUsage(agent) {
      if (!agent.memory || !agent.memory.allocated || !agent.memory.system) {
        return 0;
      }
      
      return Math.round((agent.memory.allocated / agent.memory.system) * 100);
    },
    getProgressColor(percentage) {
      if (percentage < 70) return '#67c23a';
      if (percentage < 90) return '#e6a23c';
      return '#f56c6c';
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
  color: #303133;
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
  background: linear-gradient(135deg, #f5f7fa 0%, #eef2f7 100%);
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
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
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
  border-left: 4px solid #67c23a;
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
  color: #303133;
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
  color: #909399;
  margin-bottom: 4px;
}

.info-value {
  font-size: 14px;
  color: #606266;
  word-break: break-all;
}

.uuid-value {
  font-family: monospace;
  color: #409EFF;
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
  color: #909399;
  margin-bottom: 20px;
  opacity: 0.7;
}

.empty-text {
  color: #909399;
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
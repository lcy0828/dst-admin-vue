<template>
  <div class="agent-list-container">
    <section class="main-panel">
        <div class="page-header agent-page-header">
        <span class="card-title">
          <component :is="'el-icon-connection'" class="legacy-icon" /> Agent管理中心
        </span>
        <el-button icon="el-icon-refresh" @click="refreshData">
          刷新
        </el-button>
        </div>

      <div class="agent-list-header">
        <div class="stat-cards">
          <div class="stat-card">
            <div class="stat-value">{{ connectedAgents }}</div>
            <div class="stat-label">在线Agent</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ totalAgents }}</div>
            <div class="stat-label">总Agent数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ uniqueOsCount }}</div>
            <div class="stat-label">操作系统</div>
          </div>
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
                    <el-button size="small" icon="el-icon-view" @click="showAgentDetails(agent)">详情</el-button>
                    <el-button
                      :type="runtimeFor(agent).configured ? '' : 'primary'"
                      size="small"
                      icon="el-icon-setting"
                      @click="openRuntimeConfig(agent)"
                    >
                      {{ runtimeFor(agent).configured ? '运行时配置' : '配置远程运行时' }}
                    </el-button>
                    <el-button size="small" icon="el-icon-edit" @click="navigateToCommand(agent.id)">执行命令</el-button>
                    <el-button type="danger" size="small" icon="el-icon-delete" :disabled="agent.connected" @click="forgetAgent(agent)">移除</el-button>
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
    </section>

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

    <el-dialog v-model="runtimeVisible" title="远程运行时配置" width="720px" :close-on-click-modal="false">
      <div v-if="runtimeAgent" class="runtime-scope">
        <div>
          <strong>{{ runtimeAgent.hostname }}</strong>
          <span>{{ runtimeAgent.os }} {{ runtimeAgent.arch }}</span>
        </div>
        <el-tag effect="plain">配置作用域：仅此 Agent</el-tag>
      </div>
      <el-form
        ref="runtimeForm"
        :model="runtimeForm"
        :rules="runtimeRules"
        label-position="top"
        class="runtime-form"
      >
        <div class="runtime-form-grid">
          <el-form-item label="显示名称" prop="displayName">
            <el-input v-model="runtimeForm.displayName" maxlength="100" />
          </el-form-item>
          <el-form-item label="服务端模式" prop="serverMode">
            <el-radio-group v-model="runtimeForm.serverMode">
              <el-radio-button label="64">64 位</el-radio-button>
              <el-radio-button label="32">32 位</el-radio-button>
              <el-radio-button label="luajit">LuaJIT</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </div>
        <el-form-item label="DST 存档路径" prop="savePath">
          <el-input v-model="runtimeForm.savePath" :placeholder="pathPlaceholder('save')" />
        </el-form-item>
        <el-form-item label="DST 服务端路径" prop="serverPath">
          <el-input v-model="runtimeForm.serverPath" :placeholder="pathPlaceholder('server')" />
        </el-form-item>
        <el-form-item label="备份路径" prop="backupPath">
          <el-input v-model="runtimeForm.backupPath" :placeholder="pathPlaceholder('backup')" />
        </el-form-item>
        <el-collapse v-model="runtimeAdvanced" class="runtime-advanced">
          <el-collapse-item title="模组与兼容运行时" name="advanced">
            <el-form-item label="UGC 路径" prop="ugcPath">
              <el-input v-model="runtimeForm.ugcPath" />
            </el-form-item>
            <el-form-item label="SteamCMD 路径" prop="steamcmdPath">
              <el-input v-model="runtimeForm.steamcmdPath" />
            </el-form-item>
            <el-form-item label="Workshop 内容路径" prop="workshopContentPath">
              <el-input v-model="runtimeForm.workshopContentPath" />
            </el-form-item>
            <div class="runtime-form-grid">
              <el-form-item label="Lua 命令" prop="luaBinary">
                <el-input v-model="runtimeForm.luaBinary" placeholder="lua" />
              </el-form-item>
              <el-form-item label="Lua fallback 路径" prop="luaFallbackPath">
                <el-input v-model="runtimeForm.luaFallbackPath" />
              </el-form-item>
            </div>
          </el-collapse-item>
        </el-collapse>
      </el-form>
      <template #footer>
        <div class="runtime-dialog-footer">
          <el-button v-if="runtimeConfigured" type="danger" plain @click="removeRuntimeConfig">移除配置</el-button>
          <span class="runtime-footer-spacer"></span>
          <el-button @click="runtimeVisible = false">取消</el-button>
          <el-button type="primary" :loading="runtimeSaving" @click="saveRuntimeConfig">保存配置</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { agentApi } from '@/api/index';
import { runtimeTargetsV2API } from '@/api/v2';
import { announceRuntimeTargetsUpdated } from '@/utils/runtimeTarget';

const emptyRuntimeConfig = agent => ({
  displayName: agent?.hostname || '',
  savePath: '',
  backupPath: '',
  serverPath: '',
  ugcPath: '',
  steamcmdPath: '',
  workshopContentPath: '',
  luaBinary: 'lua',
  luaFallbackPath: '',
  serverMode: '64'
});

const editableRuntimeConfig = (agent, config = {}) => {
  const defaults = emptyRuntimeConfig(agent);
  return Object.fromEntries(
    Object.keys(defaults).map(key => [key, config[key] ?? defaults[key]])
  );
};

export default {
  name: 'AgentList',
  data() {
    return {
      loading: false,
      agentData: {},
      agentList: [],
      detailVisible: false,
      selectedAgent: null,
      runtimeByAgent: {},
      runtimeVisible: false,
      runtimeSaving: false,
      runtimeConfigured: false,
      runtimeAgent: null,
      runtimeAdvanced: [],
      runtimeForm: emptyRuntimeConfig(),
      runtimeRules: {
        displayName: [{ required: true, message: '请输入显示名称', trigger: 'blur' }],
        savePath: [{ required: true, message: '请输入远程存档路径', trigger: 'blur' }],
        serverPath: [{ required: true, message: '请输入远程服务端路径', trigger: 'blur' }]
      }
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
        await this.fetchRuntimeTargets();
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
    async fetchRuntimeTargets() {
      try {
        const value = await runtimeTargetsV2API.list();
        this.runtimeByAgent = Object.fromEntries(
          (value.items || []).filter(item => item.kind === 'agent').map(item => [item.agentId, item])
        );
      } catch {
        this.runtimeByAgent = {};
      }
    },
    runtimeFor(agent) {
      return this.runtimeByAgent[agent.id] || { configured: false, status: 'configuration_required', config: {} };
    },
    openRuntimeConfig(agent) {
      const target = this.runtimeFor(agent);
      this.runtimeAgent = agent;
      this.runtimeConfigured = target.configured;
      this.runtimeAdvanced = [];
      this.runtimeForm = editableRuntimeConfig(agent, target.config);
      this.runtimeVisible = true;
      this.$nextTick(() => this.$refs.runtimeForm?.clearValidate());
    },
    async saveRuntimeConfig() {
      const valid = await this.$refs.runtimeForm.validate().catch(() => false);
      if (!valid || !this.runtimeAgent) return;
      this.runtimeSaving = true;
      try {
        await runtimeTargetsV2API.save(this.runtimeAgent.id, this.runtimeForm);
        this.$message.success('远程运行时配置已保存');
        this.runtimeVisible = false;
        await this.fetchRuntimeTargets();
        announceRuntimeTargetsUpdated();
      } catch (error) {
        this.$message.error(error.message || '保存远程运行时配置失败');
      } finally {
        this.runtimeSaving = false;
      }
    },
    async removeRuntimeConfig() {
      if (!this.runtimeAgent) return;
      try {
        await this.$confirm(`确定移除 “${this.runtimeAgent.hostname}” 的远程运行时配置吗？`, '移除运行时配置', {
          confirmButtonText: '移除',
          cancelButtonText: '取消',
          type: 'warning'
        });
        await runtimeTargetsV2API.remove(this.runtimeAgent.id);
        this.runtimeVisible = false;
        await this.fetchRuntimeTargets();
        announceRuntimeTargetsUpdated();
        this.$message.success('远程运行时配置已移除');
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
          this.$message.error(error.message || '移除远程运行时配置失败');
        }
      }
    },
    pathPlaceholder(kind) {
      const windows = String(this.runtimeAgent?.os || '').toLowerCase() === 'windows';
      if (windows) {
        return {
          save: 'C:\\Users\\Administrator\\Klei\\DoNotStarveTogether',
          server: 'C:\\dst-server',
          backup: 'D:\\dst-backups'
        }[kind];
      }
      return {
        save: '/srv/dst/DoNotStarveTogether',
        server: '/srv/dst/server',
        backup: '/srv/dst/backups'
      }[kind];
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
  width: 100%;
  min-height: 100%;
}

.main-panel {
  width: 100%;
}

.agent-page-header {
  align-items: center;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.agent-list-header {
  margin-bottom: 16px;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  padding: 14px 16px;
  text-align: left;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-color);
  cursor: default;
}

.stat-value {
  font-size: 22px;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.agent-card {
  margin-bottom: 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-card);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.agent-card:hover {
  border-color: var(--el-color-primary-light-7);
  box-shadow: var(--shadow-card-hover);
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
  gap: 14px 20px;
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
  padding: 32px 0;
}

.empty-icon {
  font-size: 64px;
  color: var(--text-secondary);
  margin-bottom: 20px;
  opacity: 0.7;
}

.empty-text {
  color: var(--text-secondary);
  font-size: 16px;
  margin-bottom: 20px;
}

.runtime-scope {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-color);
}

.runtime-scope > div {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 10px;
}

.runtime-scope strong {
  overflow: hidden;
  color: var(--text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.runtime-scope span {
  color: var(--text-secondary);
  font-size: 12px;
}

.runtime-form {
  margin-top: 16px;
}

.runtime-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.runtime-advanced {
  margin-top: 4px;
  border-top-color: var(--border-color);
  border-bottom-color: var(--border-color);
}

.runtime-dialog-footer {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
}

.runtime-footer-spacer {
  flex: 1;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .agent-info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stat-cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .stat-card {
    padding: 10px;
    text-align: center;
  }

  .stat-value {
    font-size: 19px;
  }

  .stat-label {
    font-size: 12px;
  }

  .agent-info-grid {
    grid-template-columns: 1fr;
  }

  .agent-card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .agent-actions {
    display: flex;
    width: 100%;
    margin-top: 12px;
    gap: 8px;
    flex-wrap: wrap;
  }

  .agent-actions :deep(.el-button) {
    flex: 1 1 auto;
    margin: 0;
  }

  :deep(.el-descriptions__body) {
    overflow-x: auto;
  }

  .runtime-scope {
    align-items: flex-start;
    flex-direction: column;
  }

  .runtime-form-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .runtime-dialog-footer {
    flex-wrap: wrap;
  }

  .runtime-footer-spacer {
    display: none;
  }
}
</style>

<template>
  <div class="agent-security-container">
    <el-card class="main-card" shadow="hover">
      <template #header>
        <div class="clearfix">
        <span class="card-title">
          <component :is="'el-icon-lock'" class="legacy-icon" /> Agent安全设置
        </span>
        </div>
      </template>
      
      <div v-loading="loading" class="security-content">
        <div class="section-title">
          <component :is="'el-icon-key'" class="legacy-icon" /> API密钥管理
        </div>
        
        <div class="api-key-box">
          <div class="key-display">
            <span class="key-label">当前密钥</span>
            <div class="key-value-wrapper">
              <span v-if="!showKey" class="key-value-masked">••••••••••••••••••••••••••••••••</span>
              <span v-else class="key-value">{{ apiKey || '未配置' }}</span>
              <el-button 
                type="text" 
                :icon="showKey ? 'el-icon-view' : 'el-icon-hide'" 
                :disabled="!apiKey"
                @click="toggleKeyVisibility" 
                class="key-toggle">
                {{ showKey ? '隐藏' : '显示' }}
              </el-button>
            </div>
          </div>
          
          <div class="key-actions">
            <el-tooltip content="复制密钥" placement="top">
              <el-button 
                type="primary" 
                icon="el-icon-document-copy" 
                :disabled="!keyRevealed"
                circle 
                @click="copyKey">
              </el-button>
            </el-tooltip>
            <el-tooltip content="生成新密钥 (注意: 将会使现有密钥失效!)" placement="top">
              <el-button 
                type="warning" 
                icon="el-icon-refresh" 
                :disabled="!securityAvailable"
                circle 
                @click="confirmGenerateNewKey">
              </el-button>
            </el-tooltip>
          </div>
        </div>
        
        <el-divider content-position="center">安装指南</el-divider>
        
        <div class="installation-guide">
          <div class="section-subtitle">快速安装 <span class="beta-badge">Beta</span></div>
          
          <el-tabs v-model="activeInstallTab" type="card">
            <el-tab-pane label="Linux" name="linux">
              <div class="code-block">
                <pre><code>go build -o dst-admin-agent ./agent/cmd/agent
./dst-admin-agent -server "wss://your-domain/agent" -key "{{ apiKey }}"</code></pre>
                <el-button 
                  type="text" 
                  icon="el-icon-document-copy" 
                  :disabled="!keyRevealed"
                  class="copy-btn"
                  @click="copyInstallCommand('linux')">
                  复制
                </el-button>
              </div>
            </el-tab-pane>
            <el-tab-pane label="Windows" name="windows">
              <div class="code-block">
                <pre><code>go build -o dst-admin-agent.exe ./agent/cmd/agent
.\dst-admin-agent.exe -server "wss://your-domain/agent" -key "{{ apiKey }}"</code></pre>
                <el-button 
                  type="text" 
                  icon="el-icon-document-copy" 
                  :disabled="!keyRevealed"
                  class="copy-btn"
                  @click="copyInstallCommand('windows')">
                  复制
                </el-button>
              </div>
            </el-tab-pane>
            <el-tab-pane label="Docker" name="docker">
              <div class="code-block">
                <pre><code>当前仓库没有发布可验证的 Agent Docker 镜像。</code></pre>
                <el-button 
                  type="text" 
                  icon="el-icon-document-copy" 
                  disabled
                  class="copy-btn"
                  @click="copyInstallCommand('docker')">
                  复制
                </el-button>
              </div>
            </el-tab-pane>
          </el-tabs>
          
          <div class="section-subtitle">手动安装</div>
          <ol class="manual-steps">
            <li>
              <div class="step-title">下载Agent安装文件</div>
              <div class="step-content">
                从 <a href="https://github.com/lcy0828/dst-admin-go" target="_blank" rel="noopener noreferrer">项目仓库</a> 构建适合您系统的 Agent 二进制文件。
              </div>
            </li>
            <li>
              <div class="step-title">配置Agent</div>
              <div class="step-content">
                创建配置文件 <code>conf/app.conf</code>，并添加以下内容：
                <div class="code-block">
                  <pre><code>[agent]
SECURITY_KEY = {{ apiKey }}
SERVER_URL = wss://your-domain/agent</code></pre>
                  <el-button 
                    type="text" 
                    icon="el-icon-document-copy" 
                    :disabled="!keyRevealed"
                    class="copy-btn"
                    @click="copyConfigYaml()">
                    复制
                  </el-button>
                </div>
              </div>
            </li>
            <li>
              <div class="step-title">运行Agent</div>
              <div class="step-content">
                <div class="code-block linux-cmd">
                  <pre><code>./dst-admin-agent -server "wss://your-domain/agent" -keyfile ./conf/app.conf</code></pre>
                  <el-button 
                    type="text" 
                    icon="el-icon-document-copy" 
                    :disabled="!keyRevealed"
                    class="copy-btn"
                    @click="copyRunCommand()">
                    复制
                  </el-button>
                </div>
              </div>
            </li>
            <li>
              <div class="step-title">设置为系统服务 (可选)</div>
              <div class="step-content">
                为确保Agent在系统重启后自动运行，您可以将其设置为系统服务。
                <el-link type="primary" icon="el-icon-document" href="#" target="_blank">查看详细指南</el-link>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { agentApi } from '@/api/index';

export default {
  name: 'AgentSecurity',
  data() {
    return {
      loading: false,
      apiKey: '',
      keyRevealed: false,
      securityAvailable: false,
      showKey: false,
      activeInstallTab: 'linux'
    };
  },
  created() {
    this.fetchApiKey();
  },
  methods: {
    async fetchApiKey() {
      this.loading = true;
      try {
        const response = await agentApi.getSecurityKey();
        this.apiKey = response.data?.key || '';
        this.keyRevealed = false;
        this.securityAvailable = response.data?.available === true;
        this.showKey = false;
      } catch (error) {
        this.apiKey = '';
        this.keyRevealed = false;
        this.securityAvailable = false;
        this.$message.error('获取API密钥失败: ' + (error.message || '未知错误'));
      } finally {
        this.loading = false;
      }
    },
    toggleKeyVisibility() {
      this.showKey = !this.showKey;
    },
    copyKey() {
      if (!this.keyRevealed) {
        this.$message.warning('现有密钥只提供掩码；轮换后可复制一次新密钥');
        return;
      }
      this.copyToClipboard(this.apiKey);
      this.$message.success('API密钥已复制到剪贴板');
    },
    confirmGenerateNewKey() {
      this.$confirm('生成新密钥将使现有密钥失效，所有使用旧密钥的Agent需要更新配置。确定要继续吗?', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.generateNewKey();
      }).catch(() => {});
    },
    async generateNewKey() {
      this.loading = true;
      try {
        const response = await agentApi.generateNewKey();
        this.apiKey = response.data.key;
        this.keyRevealed = true;
        this.showKey = true;
        this.$message.success(response.message || '新密钥已生成，请立即保存');
      } catch (error) {
        this.$message.error('生成新密钥失败: ' + (error.message || '未知错误'));
      } finally {
        this.loading = false;
      }
    },
    copyInstallCommand(type) {
      if (!this.keyRevealed) return;
      let command = '';
      switch (type) {
        case 'linux':
          command = `go build -o dst-admin-agent ./agent/cmd/agent\n./dst-admin-agent -server "wss://your-domain/agent" -key "${this.apiKey}"`;
          break;
        case 'windows':
          command = `go build -o dst-admin-agent.exe ./agent/cmd/agent\n.\\dst-admin-agent.exe -server "wss://your-domain/agent" -key "${this.apiKey}"`;
          break;
        default:
          return;
      }
      this.copyToClipboard(command);
      this.$message.success('安装命令已复制到剪贴板');
    },
    copyConfigYaml() {
      if (!this.keyRevealed) return;
      const config = `[agent]\nSECURITY_KEY = ${this.apiKey}\nSERVER_URL = wss://your-domain/agent`;
      this.copyToClipboard(config);
      this.$message.success('配置内容已复制到剪贴板');
    },
    copyRunCommand() {
      if (!this.keyRevealed) return;
      const command = './dst-admin-agent -server "wss://your-domain/agent" -keyfile ./conf/app.conf';
      this.copyToClipboard(command);
      this.$message.success('运行命令已复制到剪贴板');
    },
    copyToClipboard(text) {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  }
};
</script>

<style scoped>
.agent-security-container {
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
  color: #27352f;
}

.security-content {
  padding: 10px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #27352f;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-subtitle {
  font-size: 16px;
  font-weight: 600;
  color: #27352f;
  margin: 20px 0 15px;
  display: flex;
  align-items: center;
}

.beta-badge {
  background-color: #d97932;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 8px;
}

.api-key-box {
  background: linear-gradient(135deg, #f1f4ed 0%, #eef2f7 100%);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.key-display {
  flex: 1;
  min-width: 300px;
}

.key-label {
  display: block;
  font-size: 13px;
  color: #758078;
  margin-bottom: 8px;
}

.key-value-wrapper {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 4px;
  border: 1px solid #d4ddd3;
  padding: 8px 12px;
}

.key-value, .key-value-masked {
  font-family: monospace;
  flex: 1;
  word-break: break-all;
}

.key-value {
  color: #d97932;
}

.key-value-masked {
  color: #536159;
  letter-spacing: 2px;
}

.key-toggle {
  margin-left: 10px;
}

.key-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.code-block {
  background-color: #282c34;
  border-radius: 6px;
  padding: 15px;
  position: relative;
  margin: 15px 0;
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
  white-space: pre-wrap;
}

.code-block code {
  color: #abb2bf;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  font-size: 14px;
  line-height: 1.5;
}

.copy-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  color: #abb2bf;
}

.copy-btn:hover {
  color: #fff;
}

.manual-steps {
  counter-reset: step-counter;
  list-style-type: none;
  padding-left: 0;
}

.manual-steps li {
  counter-increment: step-counter;
  margin-bottom: 25px;
  position: relative;
  padding-left: 35px;
}

.manual-steps li::before {
  content: counter(step-counter);
  position: absolute;
  left: 0;
  top: 0;
  background-color: #d97932;
  color: white;
  font-weight: bold;
  border-radius: 50%;
  width: 25px;
  height: 25px;
  line-height: 25px;
  text-align: center;
}

.step-title {
  font-weight: 600;
  margin-bottom: 5px;
  color: #27352f;
}

.step-content {
  color: #536159;
}

.linux-cmd code {
  color: #c3e88d;
}

@media (max-width: 768px) {
  .api-key-box {
    flex-direction: column;
  }
  
  .key-actions {
    margin-top: 15px;
    width: 100%;
    justify-content: center;
  }
}
</style>

<style>
/* 全局自定义 Element UI 标签页样式 */
.agent-security-container .el-tabs__item {
  height: 40px;
  line-height: 40px;
}

.agent-security-container .el-tabs__item.is-active {
  color: #d97932;
  font-weight: 600;
}

.agent-security-container .el-tabs__nav-wrap::after {
  height: 1px;
  background-color: #d4ddd3;
}
</style>

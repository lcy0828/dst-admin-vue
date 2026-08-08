<template>
  <div class="agent-security-container">
    <el-card class="main-card" shadow="hover">
      <div slot="header" class="clearfix">
        <span class="card-title">
          <component is="el-icon-lock" class="legacy-icon" /> Agent安全设置
        </span>
      </div>
      
      <div v-loading="loading" class="security-content">
        <div class="section-title">
          <component is="el-icon-key" class="legacy-icon" /> API密钥管理
        </div>
        
        <div class="api-key-box">
          <div class="key-display">
            <span class="key-label">当前密钥</span>
            <div class="key-value-wrapper">
              <span v-if="!showKey" class="key-value-masked">••••••••••••••••••••••••••••••••</span>
              <span v-else class="key-value">{{ apiKey }}</span>
              <el-button 
                type="text" 
                :icon="showKey ? 'el-icon-view' : 'el-icon-hide'" 
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
                :disabled="!apiKey"
                circle 
                @click="copyKey">
              </el-button>
            </el-tooltip>
            <el-tooltip content="生成新密钥 (注意: 将会使现有密钥失效!)" placement="top">
              <el-button 
                type="warning" 
                icon="el-icon-refresh" 
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
                <pre><code>wget -O agent-install.sh https://example.com/agent-install.sh
chmod +x agent-install.sh
sudo API_KEY="{{ apiKey }}" ./agent-install.sh</code></pre>
                <el-button 
                  type="text" 
                  icon="el-icon-document-copy" 
                  class="copy-btn"
                  @click="copyInstallCommand('linux')">
                  复制
                </el-button>
              </div>
            </el-tab-pane>
            <el-tab-pane label="Windows" name="windows">
              <div class="code-block">
                <pre><code>powershell -Command "Invoke-WebRequest -Uri 'https://example.com/agent-install.ps1' -OutFile 'agent-install.ps1'"
powershell -ExecutionPolicy Bypass -Command ".\agent-install.ps1 -ApiKey '{{ apiKey }}'"</code></pre>
                <el-button 
                  type="text" 
                  icon="el-icon-document-copy" 
                  class="copy-btn"
                  @click="copyInstallCommand('windows')">
                  复制
                </el-button>
              </div>
            </el-tab-pane>
            <el-tab-pane label="Docker" name="docker">
              <div class="code-block">
                <pre><code>docker run -d --name dst-admin-agent \
--restart always \
-e API_KEY="{{ apiKey }}" \
-e SERVER_URL="http://your-server-address:8000" \
dst-admin/agent:latest</code></pre>
                <el-button 
                  type="text" 
                  icon="el-icon-document-copy" 
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
                从 <a href="https://github.com/yourusername/dst-admin-agent/releases" target="_blank">GitHub Releases</a> 页面下载适合您系统的二进制文件。
              </div>
            </li>
            <li>
              <div class="step-title">配置Agent</div>
              <div class="step-content">
                创建配置文件 <code>config.yaml</code>，并添加以下内容：
                <div class="code-block">
                  <pre><code>api_key: "{{ apiKey }}"
server_url: "http://your-server-address:8000"
log_level: "info"</code></pre>
                  <el-button 
                    type="text" 
                    icon="el-icon-document-copy" 
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
                  <pre><code>./dst-admin-agent --config config.yaml</code></pre>
                  <el-button 
                    type="text" 
                    icon="el-icon-document-copy" 
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
      showKey: false,
      activeInstallTab: 'linux',
      debugMode: process.env.NODE_ENV === 'development'
    };
  },
  created() {
    this.fetchApiKey();
    
    // 开发环境下添加全局访问点以便调试
    if (this.debugMode) {
      window.agentSecurityComponent = this;
      console.info('开发模式: 可通过window.agentSecurityComponent访问组件实例');
    }
  },
  methods: {
    fetchApiKey() {
      this.loading = true;
      agentApi.getSecurityKey()
        .then(response => {
          console.log('安全密钥响应:', response);
          console.log('响应类型:', typeof response);
          console.log('响应JSON:', JSON.stringify(response));
          console.log('响应键:', Object.keys(response));
          
          // 尝试从各种可能的响应格式中提取key
          let key = null;
          
          // 标准数据结构 {code: 200, data: {key: '...'}, msg: '...'}
          if (response && response.code === 200 && response.data && response.data.key) {
            key = response.data.key;
          } 
          // 直接数据结构 {key: '...'}
          else if (response && response.key) {
            key = response.key;
          }
          // 调试模式尝试其他可能的结构
          else if (this.debugMode) {
            // 尝试使用调试工具提取
            key = this.debugExtractKey(response);
          }
          
          if (key) {
            this.apiKey = key;
            console.log('设置的密钥值:', this.apiKey);
          } else {
            this.$message.error('无法识别API密钥格式');
            console.error('无法识别的API密钥格式:', response);
          }
        })
        .catch(error => {
          console.error('获取API密钥失败:', error);
          this.$message.error('获取API密钥失败: ' + (error.message || '未知错误'));
          
          // 开发环境下尝试从错误对象中提取可能的密钥
          if (this.debugMode && error && error.response) {
            const possibleKey = this.debugExtractKey(error.response.data);
            if (possibleKey) {
              console.info('从错误响应中提取到可能的密钥:', possibleKey);
              this.apiKey = possibleKey;
            }
          }
        })
        .finally(() => {
          this.loading = false;
        });
    },
    toggleKeyVisibility() {
      this.showKey = !this.showKey;
    },
    copyKey() {
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
    generateNewKey() {
      this.loading = true;
      agentApi.generateNewKey()
        .then(response => {
          console.log('生成新密钥响应:', response);
          console.log('响应JSON:', JSON.stringify(response));
          
          if (response && (response.success || response.code === 200)) {
            this.$message.success(response.message || response.msg || '新密钥生成成功');
            // 重新获取最新的密钥
            this.fetchApiKey();
          } else {
            this.$message.error(response.msg || '生成新密钥失败');
          }
        })
        .catch(error => {
          console.error('生成新密钥失败:', error);
          this.$message.error('生成新密钥失败: ' + (error.message || '未知错误'));
        })
        .finally(() => {
          this.loading = false;
        });
    },
    copyInstallCommand(type) {
      let command = '';
      switch (type) {
        case 'linux':
          command = `wget -O agent-install.sh https://example.com/agent-install.sh\nchmod +x agent-install.sh\nsudo API_KEY="${this.apiKey}" ./agent-install.sh`;
          break;
        case 'windows':
          command = `powershell -Command "Invoke-WebRequest -Uri 'https://example.com/agent-install.ps1' -OutFile 'agent-install.ps1'"\npowershell -ExecutionPolicy Bypass -Command ".\\agent-install.ps1 -ApiKey '${this.apiKey}'"`;
          break;
        case 'docker':
          command = `docker run -d --name dst-admin-agent \\\n--restart always \\\n-e API_KEY="${this.apiKey}" \\\n-e SERVER_URL="http://your-server-address:8000" \\\ndst-admin/agent:latest`;
          break;
      }
      this.copyToClipboard(command);
      this.$message.success('安装命令已复制到剪贴板');
    },
    copyConfigYaml() {
      const config = `api_key: "${this.apiKey}"\nserver_url: "http://your-server-address:8000"\nlog_level: "info"`;
      this.copyToClipboard(config);
      this.$message.success('配置内容已复制到剪贴板');
    },
    copyRunCommand() {
      const command = `./dst-admin-agent --config config.yaml`;
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
    },
    
    // 调试辅助方法
    debugExtractKey(response) {
      if (!this.debugMode) return;
      
      try {
        console.group('密钥提取调试');
        console.log('原始响应:', response);
        
        if (typeof response === 'string') {
          try {
            response = JSON.parse(response);
            console.log('解析后的JSON:', response);
          } catch(e) {
            console.error('无法解析JSON字符串:', e);
          }
        }
        
        if (response && response.data && response.data.key) {
          console.log('找到密钥:', response.data.key);
          return response.data.key;
        } else if (response && response.key) {
          console.log('找到直接密钥:', response.key);
          return response.key;
        }
        
        console.warn('无法找到密钥');
        console.groupEnd();
        return null;
      } catch(e) {
        console.error('调试提取过程出错:', e);
        console.groupEnd();
        return null;
      }
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
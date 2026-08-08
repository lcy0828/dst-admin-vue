<template>
  <div class="agent-security-container">
    <Card class="main-card">
      <CardHeader>
        <CardTitle class="card-title"><LockKeyhole />Agent 安全设置</CardTitle>
        <CardDescription>管理 Agent 连接密钥和安装配置。</CardDescription>
      </CardHeader>
      <CardContent class="security-content">
        <div v-if="loading" class="loading-state"><Spinner /><span>正在读取安全配置...</span></div>
        <div class="section-title">
          <KeyRound /> API 密钥管理
        </div>
        
        <div class="api-key-box">
          <div class="key-display">
            <span class="key-label">当前密钥</span>
            <div class="key-value-wrapper">
              <span v-if="!showKey" class="key-value-masked">••••••••••••••••••••••••••••••••</span>
              <span v-else class="key-value">{{ apiKey || '未配置' }}</span>
              <UiButton
                variant="ghost"
                size="sm"
                :disabled="!apiKey"
                @click="toggleKeyVisibility" 
                class="key-toggle">
                <EyeOff v-if="showKey" data-icon="inline-start" />
                <Eye v-else data-icon="inline-start" />
                {{ showKey ? '隐藏' : '显示' }}
              </UiButton>
            </div>
          </div>
          
          <div class="key-actions">
            <Tooltip><TooltipTrigger as-child><UiButton size="icon" :disabled="!keyRevealed" aria-label="复制密钥" @click="copyKey"><Copy /></UiButton></TooltipTrigger><TooltipContent>复制密钥</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger as-child><UiButton variant="outline" size="icon" :disabled="!securityAvailable" aria-label="生成新密钥" @click="confirmGenerateNewKey"><RefreshCw /></UiButton></TooltipTrigger><TooltipContent>生成新密钥，现有密钥将失效</TooltipContent></Tooltip>
          </div>
        </div>

        <Separator />
        
        <div class="installation-guide">
          <div class="section-subtitle">快速安装 <Badge variant="secondary">Beta</Badge></div>

          <Tabs v-model="activeInstallTab">
            <TabsList><TabsTrigger value="linux">Linux</TabsTrigger><TabsTrigger value="windows">Windows</TabsTrigger><TabsTrigger value="docker">Docker</TabsTrigger></TabsList>
            <TabsContent value="linux">
              <div class="code-block">
                <pre><code>go build -o dst-admin-agent ./agent/cmd/agent
./dst-admin-agent -server "wss://your-domain/agent" -key "{{ apiKey }}"</code></pre>
                <UiButton
                  variant="ghost"
                  size="sm"
                  :disabled="!keyRevealed"
                  class="copy-btn"
                  @click="copyInstallCommand('linux')">
                  <Copy data-icon="inline-start" />
                  复制
                </UiButton>
              </div>
            </TabsContent>
            <TabsContent value="windows">
              <div class="code-block">
                <pre><code>go build -o dst-admin-agent.exe ./agent/cmd/agent
.\dst-admin-agent.exe -server "wss://your-domain/agent" -key "{{ apiKey }}"</code></pre>
                <UiButton
                  variant="ghost"
                  size="sm"
                  :disabled="!keyRevealed"
                  class="copy-btn"
                  @click="copyInstallCommand('windows')">
                  <Copy data-icon="inline-start" />
                  复制
                </UiButton>
              </div>
            </TabsContent>
            <TabsContent value="docker">
              <div class="code-block">
                <pre><code>当前仓库没有发布可验证的 Agent Docker 镜像。</code></pre>
                <UiButton
                  variant="ghost"
                  size="sm"
                  disabled
                  class="copy-btn"
                  @click="copyInstallCommand('docker')">
                  <Copy data-icon="inline-start" />
                  复制
                </UiButton>
              </div>
            </TabsContent>
          </Tabs>
          
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
                  <UiButton
                    variant="ghost"
                    size="sm"
                    :disabled="!keyRevealed"
                    class="copy-btn"
                    @click="copyConfigYaml()">
                    <Copy data-icon="inline-start" />
                    复制
                  </UiButton>
                </div>
              </div>
            </li>
            <li>
              <div class="step-title">运行Agent</div>
              <div class="step-content">
                <div class="code-block linux-cmd">
                  <pre><code>./dst-admin-agent -server "wss://your-domain/agent" -keyfile ./conf/app.conf</code></pre>
                  <UiButton
                    variant="ghost"
                    size="sm"
                    :disabled="!keyRevealed"
                    class="copy-btn"
                    @click="copyRunCommand()">
                    <Copy data-icon="inline-start" />
                    复制
                  </UiButton>
                </div>
              </div>
            </li>
            <li>
              <div class="step-title">设置为系统服务 (可选)</div>
              <div class="step-content">
                为确保Agent在系统重启后自动运行，您可以将其设置为系统服务。
                <a class="guide-link" href="#" target="_blank"><FileText />查看详细指南</a>
              </div>
            </li>
          </ol>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script>
import { Copy, Eye, EyeOff, FileText, KeyRound, LockKeyhole, RefreshCw } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { agentApi } from '@/api/index';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { confirmAction } from '@/lib/feedback';

export default {
  name: 'AgentSecurity',
  components: {
    Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Copy, Eye, EyeOff,
    FileText, KeyRound, LockKeyhole, RefreshCw, Separator, Spinner, Tabs, TabsContent,
    TabsList, TabsTrigger, Tooltip, TooltipContent, TooltipTrigger, UiButton
  },
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
        toast.error('获取API密钥失败: ' + (error.message || '未知错误'));
      } finally {
        this.loading = false;
      }
    },
    toggleKeyVisibility() {
      this.showKey = !this.showKey;
    },
    copyKey() {
      if (!this.keyRevealed) {
        toast.warning('现有密钥只提供掩码；轮换后可复制一次新密钥');
        return;
      }
      this.copyToClipboard(this.apiKey);
      toast.success('API密钥已复制到剪贴板');
    },
    async confirmGenerateNewKey() {
      try {
        await confirmAction('生成新密钥将使现有密钥失效，所有使用旧密钥的 Agent 需要更新配置。确定要继续吗?', '生成新密钥', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
        });
        this.generateNewKey();
      } catch {
        // 用户取消轮换。
      }
    },
    async generateNewKey() {
      this.loading = true;
      try {
        const response = await agentApi.generateNewKey();
        this.apiKey = response.data.key;
        this.keyRevealed = true;
        this.showKey = true;
        toast.success(response.message || '新密钥已生成，请立即保存');
      } catch (error) {
        toast.error('生成新密钥失败: ' + (error.message || '未知错误'));
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
      toast.success('安装命令已复制到剪贴板');
    },
    copyConfigYaml() {
      if (!this.keyRevealed) return;
      const config = `[agent]\nSECURITY_KEY = ${this.apiKey}\nSERVER_URL = wss://your-domain/agent`;
      this.copyToClipboard(config);
      toast.success('配置内容已复制到剪贴板');
    },
    copyRunCommand() {
      if (!this.keyRevealed) return;
      const command = './dst-admin-agent -server "wss://your-domain/agent" -keyfile ./conf/app.conf';
      this.copyToClipboard(command);
      toast.success('运行命令已复制到剪贴板');
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
  width: 100%;
  min-width: 0;
}

.main-card {
  margin-bottom: 0;
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: none;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.security-content {
  padding: 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-subtitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 20px 0 10px;
  display: flex;
  align-items: center;
}

.beta-badge {
  background-color: var(--primary-color);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: 8px;
}

.api-key-box {
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px;
  background: var(--surface-muted);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: none;
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
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.key-value-wrapper {
  display: flex;
  align-items: center;
  background-color: var(--surface-color);
  border-radius: 4px;
  border: 1px solid var(--border);
  padding: 8px 12px;
}

.key-value, .key-value-masked {
  font-family: monospace;
  flex: 1;
  word-break: break-all;
}

.key-value {
  color: var(--primary-color);
}

.key-value-masked {
  color: var(--text-regular);
  letter-spacing: 2px;
}

.key-toggle {
  margin-left: 10px;
}

.key-actions {
  display: flex;
  gap: 8px;
  margin-top: 0;
}

.code-block {
  background-color: #282c34;
  border-radius: 4px;
  padding: 14px;
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

.loading-state,
.guide-link {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-state {
  justify-content: center;
  min-height: 120px;
  color: var(--muted-foreground);
}

.guide-link {
  width: fit-content;
  margin-top: 8px;
  color: var(--primary);
  text-decoration: none;
}

.guide-link > svg {
  width: 16px;
  height: 16px;
}

.manual-steps {
  counter-reset: step-counter;
  list-style-type: none;
  padding-left: 0;
}

.manual-steps li {
  counter-increment: step-counter;
  margin-bottom: 18px;
  position: relative;
  padding-left: 35px;
}

.manual-steps li::before {
  content: counter(step-counter);
  position: absolute;
  left: 0;
  top: 0;
  background-color: var(--primary-color);
  color: white;
  font-weight: 600;
  border-radius: 3px;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
}

.step-title {
  font-weight: 600;
  margin-bottom: 5px;
  color: var(--text-primary);
}

.step-content {
  color: var(--text-regular);
}

.linux-cmd code {
  color: #c3e88d;
}

@media (max-width: 768px) {
  .api-key-box {
    flex-direction: column;
    align-items: stretch;
  }

  .key-display {
    width: 100%;
    min-width: 0;
  }
  
  .key-actions {
    margin-top: 0;
    width: 100%;
    justify-content: flex-end;
  }
}
</style>

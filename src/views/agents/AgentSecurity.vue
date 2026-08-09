<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex min-w-0 flex-col gap-1"><h1 class="flex items-center gap-2 text-xl font-semibold"><LockKeyhole />Agent 安全设置</h1><p class="text-sm text-muted-foreground">管理 Agent 连接密钥和安装配置。</p></header>

    <Alert v-if="loadError" variant="destructive"><CircleAlert /><AlertTitle>安全配置加载失败</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="fetchApiKey">重试</UiButton></AlertAction></Alert>

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2"><KeyRound />API 密钥</CardTitle>
        <CardDescription>Agent 使用此密钥建立经过验证的连接。现有密钥不会再次显示明文。</CardDescription>
      </CardHeader>
      <CardContent>
        <Skeleton v-if="loading && !apiKey" class="h-16 w-full" />
        <FieldGroup v-else>
          <Field><FieldLabel for="agent-api-key">当前密钥</FieldLabel><InputGroup><InputGroupInput id="agent-api-key" :model-value="showKey ? (apiKey || '未配置') : '••••••••••••••••••••••••••••••••'" readonly /><InputGroupAddon align="inline-end"><UiButton variant="ghost" size="sm" :disabled="!apiKey" @click="toggleKeyVisibility"><EyeOff v-if="showKey" data-icon="inline-start" /><Eye v-else data-icon="inline-start" />{{ showKey ? '隐藏' : '显示' }}</UiButton></InputGroupAddon></InputGroup><FieldDescription v-if="!keyRevealed">出于安全考虑，服务端仅返回现有密钥的掩码。</FieldDescription></Field>
          <Alert v-if="!securityAvailable"><CircleAlert /><AlertTitle>密钥管理不可用</AlertTitle><AlertDescription>当前后端未开放密钥轮换能力。</AlertDescription></Alert>
        </FieldGroup>
      </CardContent>
      <CardFooter class="flex flex-wrap justify-end gap-2"><UiButton variant="outline" :disabled="!keyRevealed" @click="copyKey"><Copy data-icon="inline-start" />复制密钥</UiButton><UiButton :disabled="!securityAvailable || loading" @click="confirmGenerateNewKey"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />生成新密钥</UiButton></CardFooter>
    </Card>

    <Card>
      <CardHeader><CardTitle>安装 Agent</CardTitle><CardDescription>根据节点环境选择安装命令或手动配置。</CardDescription><CardAction><Badge variant="secondary">Beta</Badge></CardAction></CardHeader>
      <CardContent class="flex flex-col gap-6">
        <div>

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
        </div>

          <Separator />
          <div class="flex flex-col gap-3"><h3 class="text-sm font-medium">手动安装</h3>
          <ol class="manual-steps">
            <li>
              <Badge variant="outline">1</Badge><div class="step-content"><div class="step-title">下载 Agent 安装文件</div>
                从 <a href="https://github.com/lcy0828/dst-admin-go" target="_blank" rel="noopener noreferrer">项目仓库</a> 构建适合您系统的 Agent 二进制文件。
              </div>
            </li>
            <li>
              <Badge variant="outline">2</Badge><div class="step-content"><div class="step-title">配置 Agent</div>
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
              <Badge variant="outline">3</Badge><div class="step-content"><div class="step-title">运行 Agent</div>
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
              <Badge variant="outline">4</Badge><div class="step-content"><div class="step-title">设置为系统服务（可选）</div>
                为确保 Agent 在系统重启后自动运行，可以将其注册为系统服务。
              </div>
            </li>
          </ol>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script>
import { CircleAlert, Copy, Eye, EyeOff, KeyRound, LockKeyhole, RefreshCw } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { agentApi } from '@/api/index';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { confirmAction } from '@/lib/feedback';

export default {
  name: 'AgentSecurity',
  components: {
    Alert, AlertAction, AlertDescription, AlertTitle, Badge, Card, CardAction, CardContent,
    CardDescription, CardFooter, CardHeader, CardTitle, CircleAlert, Copy, Eye, EyeOff, Field,
    FieldDescription, FieldGroup, FieldLabel, InputGroup, InputGroupAddon, InputGroupInput,
    KeyRound, LockKeyhole, RefreshCw, Separator, Skeleton, Spinner, Tabs, TabsContent, TabsList,
    TabsTrigger, UiButton
  },
  data() {
    return {
      loading: false,
      loadError: '',
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
      this.loadError = '';
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
        this.loadError = error.message || '未知错误';
        toast.error('获取API密钥失败: ' + this.loadError);
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
.code-block {
  position: relative;
  margin: 12px 0;
  padding: 14px;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
}

.code-block pre {
  margin: 0;
  padding-right: 72px;
  white-space: pre-wrap;
  word-break: break-word;
}

.code-block code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
}

.manual-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.manual-steps li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 10px;
}

.step-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.step-content {
  min-width: 0;
  color: var(--muted-foreground);
}
</style>

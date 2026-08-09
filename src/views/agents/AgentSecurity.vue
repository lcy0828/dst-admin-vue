<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="min-w-0"><h1 class="text-2xl font-semibold tracking-normal">{{ $t('agents.security.title') }}</h1><p class="mt-1 text-sm text-muted-foreground">{{ $t('agents.security.subtitle') }}</p></header>

    <Alert v-if="loadError" variant="destructive"><CircleAlert /><AlertTitle>{{ $t('agents.security.feedback.loadFailedTitle') }}</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="fetchApiKey">{{ $t('common.actions.retry') }}</UiButton></AlertAction></Alert>

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2"><KeyRound />{{ $t('agents.security.key.title') }}</CardTitle>
        <CardDescription>{{ $t('agents.security.key.description') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <Skeleton v-if="loading && !apiKey" class="h-16 w-full" />
        <FieldGroup v-else>
          <Field><FieldLabel for="agent-api-key">{{ $t('agents.security.key.current') }}</FieldLabel><InputGroup><InputGroupInput id="agent-api-key" :model-value="securityConfigured ? (showKey ? apiKey : '••••••••••••••••••••••••••••••••') : $t('common.states.unconfigured')" readonly /><InputGroupAddon align="inline-end"><UiButton variant="ghost" size="sm" :disabled="!securityConfigured" @click="toggleKeyVisibility"><EyeOff v-if="showKey" data-icon="inline-start" /><Eye v-else data-icon="inline-start" />{{ showKey ? $t('agents.security.actions.hide') : $t('agents.security.actions.show') }}</UiButton></InputGroupAddon></InputGroup><FieldDescription v-if="securityConfigured && !keyRevealed">{{ $t('agents.security.key.maskedDescription') }}</FieldDescription></Field>
          <Alert v-if="!securityAvailable"><CircleAlert /><AlertTitle>{{ $t('agents.security.key.unavailableTitle') }}</AlertTitle><AlertDescription>{{ $t('agents.security.key.unavailableDescription') }}</AlertDescription></Alert>
        </FieldGroup>
      </CardContent>
      <CardFooter class="flex flex-wrap justify-end gap-2"><UiButton variant="outline" :disabled="!keyRevealed" @click="copyKey"><Copy data-icon="inline-start" />{{ $t('agents.security.actions.copyKey') }}</UiButton><UiButton :disabled="!securityAvailable || loading" @click="confirmGenerateNewKey"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ $t('agents.security.actions.generateKey') }}</UiButton></CardFooter>
    </Card>

    <Card>
      <CardHeader><CardTitle>{{ $t('agents.security.install.title') }}</CardTitle><CardDescription>{{ $t('agents.security.install.description') }}</CardDescription><CardAction><Badge variant="secondary">Beta</Badge></CardAction></CardHeader>
      <CardContent class="flex flex-col gap-6">
        <div>

          <Tabs v-model="activeInstallTab">
            <TabsList><TabsTrigger value="linux">Linux</TabsTrigger><TabsTrigger value="windows">Windows</TabsTrigger><TabsTrigger value="docker">Docker</TabsTrigger></TabsList>
            <TabsContent value="linux">
              <div class="code-block">
                <pre><code>go build -o dst-admin-agent ./agent/cmd/agent
./dst-admin-agent -server "{{ installServerURL }}" -key "{{ apiKey }}"</code></pre>
                <UiButton
                  variant="ghost"
                  size="sm"
                  :disabled="!keyRevealed"
                  class="copy-btn"
                  @click="copyInstallCommand('linux')">
                  <Copy data-icon="inline-start" />
                  {{ $t('common.actions.copy') }}
                </UiButton>
              </div>
            </TabsContent>
            <TabsContent value="windows">
              <div class="code-block">
                <pre><code>go build -o dst-admin-agent.exe ./agent/cmd/agent
.\dst-admin-agent.exe -server "{{ installServerURL }}" -key "{{ apiKey }}"</code></pre>
                <UiButton
                  variant="ghost"
                  size="sm"
                  :disabled="!keyRevealed"
                  class="copy-btn"
                  @click="copyInstallCommand('windows')">
                  <Copy data-icon="inline-start" />
                  {{ $t('common.actions.copy') }}
                </UiButton>
              </div>
            </TabsContent>
            <TabsContent value="docker">
              <div class="code-block">
                <pre><code>{{ $t('agents.security.install.dockerUnavailable') }}</code></pre>
                <UiButton
                  variant="ghost"
                  size="sm"
                  disabled
                  class="copy-btn"
                  @click="copyInstallCommand('docker')">
                  <Copy data-icon="inline-start" />
                  {{ $t('common.actions.copy') }}
                </UiButton>
              </div>
            </TabsContent>
          </Tabs>
        </div>

          <Separator />
          <div class="flex flex-col gap-3"><h3 class="text-sm font-medium">{{ $t('agents.security.manual.title') }}</h3>
          <ol class="manual-steps">
            <li>
              <Badge variant="outline">1</Badge><div class="step-content"><div class="step-title">{{ $t('agents.security.manual.downloadTitle') }}</div>
                {{ $t('agents.security.manual.buildFrom') }} <a href="https://github.com/lcy0828/dst-admin-go" target="_blank" rel="noopener noreferrer">{{ $t('agents.security.manual.repository') }}</a> {{ $t('agents.security.manual.buildForSystem') }}
              </div>
            </li>
            <li>
              <Badge variant="outline">2</Badge><div class="step-content"><div class="step-title">{{ $t('agents.security.manual.configureTitle') }}</div>
                {{ $t('agents.security.manual.configureDescription') }} <code>conf/app.conf</code>：
                <div class="code-block">
                  <pre><code>[agent]
SECURITY_KEY = {{ apiKey }}
SERVER_URL = {{ installServerURL }}</code></pre>
                  <UiButton
                    variant="ghost"
                    size="sm"
                    :disabled="!keyRevealed"
                    class="copy-btn"
                    @click="copyConfigYaml()">
                    <Copy data-icon="inline-start" />
                    {{ $t('common.actions.copy') }}
                  </UiButton>
                </div>
              </div>
            </li>
            <li>
              <Badge variant="outline">3</Badge><div class="step-content"><div class="step-title">{{ $t('agents.security.manual.runTitle') }}</div>
                <div class="code-block linux-cmd">
                  <pre><code>./dst-admin-agent</code></pre>
                  <UiButton
                    variant="ghost"
                    size="sm"
                    :disabled="!keyRevealed"
                    class="copy-btn"
                    @click="copyRunCommand()">
                    <Copy data-icon="inline-start" />
                    {{ $t('common.actions.copy') }}
                  </UiButton>
                </div>
              </div>
            </li>
            <li>
              <Badge variant="outline">4</Badge><div class="step-content"><div class="step-title">{{ $t('agents.security.manual.serviceTitle') }}</div>
                {{ $t('agents.security.manual.serviceDescription') }}
              </div>
            </li>
          </ol>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script>
import { CircleAlert, Copy, Eye, EyeOff, KeyRound, RefreshCw } from '@lucide/vue';
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
    KeyRound, RefreshCw, Separator, Skeleton, Spinner, Tabs, TabsContent, TabsList,
    TabsTrigger, UiButton
  },
  data() {
    return {
      loading: false,
      loadFailure: null,
      apiKey: '',
      keyRevealed: false,
      securityConfigured: false,
      securityAvailable: false,
      showKey: false,
      activeInstallTab: 'linux'
    };
  },
  created() {
    this.fetchApiKey();
  },
  computed: {
    loadError() {
      if (!this.loadFailure) return '';
      const message = this.$t(this.loadFailure.key);
      return this.loadFailure.detail
        ? this.$t('agents.security.feedback.errorWithDetail', { message, detail: this.loadFailure.detail })
        : message;
    },
    installServerURL() {
      const configured = String(import.meta.env.VITE_AGENT_SERVER_URL || '').trim();
      if (configured) return configured;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.hostname}:8081/agent`;
    }
  },
  methods: {
    async fetchApiKey() {
      this.loading = true;
      this.loadFailure = null;
      try {
        const response = await agentApi.getSecurityKey();
        this.apiKey = response.data?.key || '';
        this.keyRevealed = false;
        this.securityConfigured = response.data?.configured === true;
        this.securityAvailable = response.data?.available === true;
        this.showKey = false;
      } catch (error) {
        this.apiKey = '';
        this.keyRevealed = false;
        this.securityConfigured = false;
        this.securityAvailable = false;
        this.loadFailure = {
          key: 'agents.security.feedback.loadFailed',
          detail: String(error.message || '').trim()
        };
        toast.error(this.loadError);
      } finally {
        this.loading = false;
      }
    },
    toggleKeyVisibility() {
      this.showKey = !this.showKey;
    },
    async copyKey() {
      if (!this.keyRevealed) {
        toast.warning(this.$t('agents.security.feedback.maskedNotCopyable'));
        return;
      }
      try {
        await this.copyToClipboard(this.apiKey);
        toast.success(this.$t('agents.security.feedback.keyCopied'));
      } catch (error) {
        toast.error(this.$t('agents.security.feedback.copyKeyFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      }
    },
    async confirmGenerateNewKey() {
      try {
        await confirmAction(this.$t('agents.security.feedback.rotateConfirm'), this.$t('agents.security.feedback.rotateTitle'), {
          confirmButtonText: this.$t('common.actions.confirm'),
          cancelButtonText: this.$t('common.actions.cancel'),
          type: 'warning'
        });
        await this.generateNewKey();
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
          toast.error(this.$t('agents.security.feedback.rotateConfirmFailed', {
            error: error.message || this.$t('common.errors.unknown')
          }));
        }
      }
    },
    async generateNewKey() {
      this.loading = true;
      try {
        const response = await agentApi.generateNewKey();
        this.apiKey = response.data.key;
        this.keyRevealed = true;
        this.securityConfigured = true;
        this.showKey = true;
        try {
          const refreshed = await agentApi.getSecurityKey();
          this.securityConfigured = refreshed.data?.configured === true;
          this.securityAvailable = refreshed.data?.available === true;
        } catch (error) {
          toast.warning(this.$t('agents.security.feedback.statusRefreshFailed', {
            error: error.message || this.$t('common.errors.unknown')
          }));
        }
        toast.success(this.$t('agents.security.feedback.keyGenerated'));
      } catch (error) {
        toast.error(this.$t('agents.security.feedback.generateFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      } finally {
        this.loading = false;
      }
    },
    async copyInstallCommand(type) {
      if (!this.keyRevealed) return;
      let command = '';
      switch (type) {
        case 'linux':
          command = `go build -o dst-admin-agent ./agent/cmd/agent\n./dst-admin-agent -server "${this.installServerURL}" -key "${this.apiKey}"`;
          break;
        case 'windows':
          command = `go build -o dst-admin-agent.exe ./agent/cmd/agent\n.\\dst-admin-agent.exe -server "${this.installServerURL}" -key "${this.apiKey}"`;
          break;
        default:
          return;
      }
      try {
        await this.copyToClipboard(command);
        toast.success(this.$t('agents.security.feedback.installCopied'));
      } catch (error) {
        toast.error(this.$t('agents.security.feedback.copyInstallFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      }
    },
    async copyConfigYaml() {
      if (!this.keyRevealed) return;
      const config = `[agent]\nSECURITY_KEY = ${this.apiKey}\nSERVER_URL = ${this.installServerURL}`;
      try {
        await this.copyToClipboard(config);
        toast.success(this.$t('agents.security.feedback.configCopied'));
      } catch (error) {
        toast.error(this.$t('agents.security.feedback.copyConfigFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      }
    },
    async copyRunCommand() {
      if (!this.keyRevealed) return;
      try {
        await this.copyToClipboard('./dst-admin-agent');
        toast.success(this.$t('agents.security.feedback.runCopied'));
      } catch (error) {
        toast.error(this.$t('agents.security.feedback.copyRunFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      }
    },
    async copyToClipboard(text) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(el);
      if (!copied) throw new Error(this.$t('agents.security.feedback.clipboardDenied'));
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

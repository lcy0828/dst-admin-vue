<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex min-w-0 flex-col gap-1">
        <h1 class="flex items-center gap-2 text-xl font-semibold"><Network />Agent 管理中心</h1>
        <p class="text-sm text-muted-foreground">管理远程节点、运行时配置与资源状态。</p>
      </div>
      <UiButton variant="outline" :disabled="loading" @click="refreshData"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />刷新</UiButton>
    </header>

    <Alert v-if="loadError" variant="destructive"><CircleAlert /><AlertTitle>Agent 列表加载失败</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="refreshData">重试</UiButton></AlertAction></Alert>

    <div class="grid gap-3 sm:grid-cols-3">
      <Card size="sm"><CardHeader><CardDescription>在线 Agent</CardDescription><CardTitle>{{ connectedAgents }}</CardTitle></CardHeader></Card>
      <Card size="sm"><CardHeader><CardDescription>Agent 总数</CardDescription><CardTitle>{{ totalAgents }}</CardTitle></CardHeader></Card>
      <Card size="sm"><CardHeader><CardDescription>操作系统</CardDescription><CardTitle>{{ uniqueOsCount }}</CardTitle></CardHeader></Card>
    </div>

    <div v-if="loading" class="flex flex-col gap-3" aria-label="正在读取 Agent 状态">
      <Skeleton v-for="index in 3" :key="index" class="h-52 w-full" />
    </div>
    <div v-else-if="agentList.length > 0" class="flex flex-col gap-3">
              <Card v-for="agent in agentList" :key="agent.id">
                <CardHeader>
                  <CardTitle class="flex flex-wrap items-center gap-2"><Badge :variant="agent.connected ? 'default' : 'destructive'">{{ agent.connected ? '在线' : '离线' }}</Badge>{{ agent.hostname }}</CardTitle>
                  <CardDescription class="break-all">{{ agent.agent_uuid }}</CardDescription>
                  <CardAction class="flex flex-wrap justify-end gap-2">
                    <UiButton size="sm" variant="outline" @click="showAgentDetails(agent)"><Eye data-icon="inline-start" />详情</UiButton>
                    <UiButton :variant="runtimeFor(agent).configured ? 'outline' : 'default'" size="sm" @click="openRuntimeConfig(agent)"><Settings data-icon="inline-start" />
                      {{ runtimeFor(agent).configured ? '运行时配置' : '配置远程运行时' }}
                    </UiButton>
                    <UiButton size="sm" variant="outline" @click="navigateToCommand(agent.id)"><Terminal data-icon="inline-start" />执行命令</UiButton>
                    <UiButton variant="destructive" size="sm" :disabled="agent.connected" @click="forgetAgent(agent)"><Trash2 data-icon="inline-start" />移除</UiButton>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div class="agent-info-grid">
                  <div class="info-item">
                    <div class="info-label">系统</div>
                    <div class="info-value">
                      <component :is="getOsIcon(agent.os)" class="system-icon" />
                      {{ agent.os }} ({{ agent.arch }})
                    </div>
                  </div>

                  <div class="info-item">
                    <div class="info-label">IP地址</div>
                    <div class="info-value ip-list">
                      <Tooltip v-for="(ip, idx) in agent.ip_addresses" :key="idx"><TooltipTrigger as-child><Badge variant="outline">{{ ip }}</Badge></TooltipTrigger><TooltipContent>{{ ip }}</TooltipContent></Tooltip>
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
                </CardContent>
                <CardFooter v-if="agent.connected" class="flex-col items-stretch gap-2">
                  <div v-if="agent.connected" class="resource-monitor">
                    <div class="progress-label"><span>内存使用</span><span>{{ calculateMemoryUsage(agent) }}%</span></div>
                    <UiProgress :model-value="calculateMemoryUsage(agent)" :aria-label="`${agent.hostname} 内存使用率`" />
                  </div>
                </CardFooter>
              </Card>
    </div>

    <Empty v-else><EmptyHeader><EmptyMedia variant="icon"><Network /></EmptyMedia><EmptyTitle>暂无 Agent 连接</EmptyTitle><EmptyDescription>配置安全密钥并启动 Agent 后，节点会显示在这里。</EmptyDescription></EmptyHeader><EmptyContent><UiButton @click="navigateToSecurity">添加 Agent</UiButton></EmptyContent></Empty>

    <UiDialog v-model:open="detailVisible"><DialogContent class="detail-dialog"><DialogHeader><DialogTitle>Agent 详情</DialogTitle><DialogDescription>节点身份、系统与连接信息。</DialogDescription></DialogHeader>
      <dl v-if="selectedAgent" class="detail-grid">
        <div class="detail-wide"><dt>UUID</dt><dd>{{ selectedAgent.agent_uuid }}</dd></div><div><dt>主机名</dt><dd>{{ selectedAgent.hostname || 'N/A' }}</dd></div>
        <div><dt>状态</dt><dd>{{ selectedAgent.connected ? '在线' : '离线' }}</dd></div><div><dt>系统</dt><dd>{{ selectedAgent.os || 'N/A' }} ({{ selectedAgent.arch || 'N/A' }})</dd></div>
        <div><dt>版本</dt><dd>{{ selectedAgent.version || 'N/A' }}</dd></div><div><dt>最后心跳</dt><dd>{{ formatTime(selectedAgent.last_heartbeat) }}</dd></div>
        <div><dt>运行时间</dt><dd>{{ formatUptime(selectedAgent.uptime_seconds) }}</dd></div><div class="detail-wide"><dt>IP 地址</dt><dd>{{ (selectedAgent.ip_addresses || []).join(', ') || 'N/A' }}</dd></div>
        <div class="detail-wide"><dt>能力</dt><dd>{{ (selectedAgent.capabilities || []).join(', ') || 'N/A' }}</dd></div>
      </dl>
    </DialogContent></UiDialog>

    <UiDialog v-model:open="runtimeVisible"><DialogContent class="runtime-dialog"><DialogHeader><DialogTitle>远程运行时配置</DialogTitle><DialogDescription>配置此 Agent 的 DST 路径和兼容运行时。</DialogDescription></DialogHeader>
      <div v-if="runtimeAgent" class="runtime-scope">
        <div>
          <strong>{{ runtimeAgent.hostname }}</strong>
          <span>{{ runtimeAgent.os }} {{ runtimeAgent.arch }}</span>
        </div>
        <Badge variant="outline">配置作用域：仅此 Agent</Badge>
      </div>
      <FieldGroup class="runtime-form">
        <div class="runtime-form-grid">
          <Field :data-invalid="Boolean(runtimeErrors.displayName)"><FieldLabel for="runtime-name">显示名称</FieldLabel><UiInput id="runtime-name" v-model="runtimeForm.displayName" maxlength="100" :aria-invalid="Boolean(runtimeErrors.displayName)" /><FieldError v-if="runtimeErrors.displayName">{{ runtimeErrors.displayName }}</FieldError></Field>
          <Field><FieldLabel>服务端模式</FieldLabel><ToggleGroup v-model="runtimeForm.serverMode" type="single"><ToggleGroupItem value="64">64 位</ToggleGroupItem><ToggleGroupItem value="32">32 位</ToggleGroupItem><ToggleGroupItem value="luajit">LuaJIT</ToggleGroupItem></ToggleGroup></Field>
        </div>
        <Field :data-invalid="Boolean(runtimeErrors.savePath)"><FieldLabel for="runtime-save">DST 存档路径</FieldLabel><UiInput id="runtime-save" v-model="runtimeForm.savePath" :placeholder="pathPlaceholder('save')" :aria-invalid="Boolean(runtimeErrors.savePath)" /><FieldError v-if="runtimeErrors.savePath">{{ runtimeErrors.savePath }}</FieldError></Field>
        <Field :data-invalid="Boolean(runtimeErrors.serverPath)"><FieldLabel for="runtime-server">DST 服务端路径</FieldLabel><UiInput id="runtime-server" v-model="runtimeForm.serverPath" :placeholder="pathPlaceholder('server')" :aria-invalid="Boolean(runtimeErrors.serverPath)" /><FieldError v-if="runtimeErrors.serverPath">{{ runtimeErrors.serverPath }}</FieldError></Field>
        <Field><FieldLabel for="runtime-backup">备份路径</FieldLabel><UiInput id="runtime-backup" v-model="runtimeForm.backupPath" :placeholder="pathPlaceholder('backup')" /></Field>
        <Accordion type="single" collapsible class="runtime-advanced"><AccordionItem value="advanced"><AccordionTrigger>模组与兼容运行时</AccordionTrigger><AccordionContent><FieldGroup>
            <Field><FieldLabel for="runtime-ugc">UGC 路径</FieldLabel><UiInput id="runtime-ugc" v-model="runtimeForm.ugcPath" /></Field>
            <Field><FieldLabel for="runtime-steamcmd">SteamCMD 路径</FieldLabel><UiInput id="runtime-steamcmd" v-model="runtimeForm.steamcmdPath" /></Field>
            <Field><FieldLabel for="runtime-workshop">Workshop 内容路径</FieldLabel><UiInput id="runtime-workshop" v-model="runtimeForm.workshopContentPath" /></Field>
            <div class="runtime-form-grid">
              <Field><FieldLabel for="runtime-lua">Lua 命令</FieldLabel><UiInput id="runtime-lua" v-model="runtimeForm.luaBinary" placeholder="lua" /></Field>
              <Field><FieldLabel for="runtime-lua-fallback">Lua fallback 路径</FieldLabel><UiInput id="runtime-lua-fallback" v-model="runtimeForm.luaFallbackPath" /></Field>
            </div>
        </FieldGroup></AccordionContent></AccordionItem></Accordion>
      </FieldGroup>
      <DialogFooter class="runtime-dialog-footer">
          <UiButton v-if="runtimeConfigured" variant="destructive" @click="removeRuntimeConfig">移除配置</UiButton>
          <span class="runtime-footer-spacer"></span>
          <UiButton variant="outline" @click="runtimeVisible = false">取消</UiButton>
          <UiButton :disabled="runtimeSaving" @click="saveRuntimeConfig"><Spinner v-if="runtimeSaving" data-icon="inline-start" />保存配置</UiButton>
      </DialogFooter>
    </DialogContent></UiDialog>
  </div>
</template>

<script>
import { Apple, CircleAlert, Eye, Monitor, Network, RefreshCw, Settings, Terminal, Trash2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { agentApi } from '@/api/index';
import { runtimeTargetsV2API } from '@/api/v2';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Progress as UiProgress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { confirmAction } from '@/lib/feedback';
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
  components: {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger, Alert, AlertAction, AlertDescription,
    AlertTitle, Badge, Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
    DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Empty, EmptyContent,
    EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, Eye, Field, FieldError, FieldGroup,
    FieldLabel, CircleAlert, Network, RefreshCw, Settings, Skeleton, Spinner, Terminal, ToggleGroup, ToggleGroupItem,
    Tooltip, TooltipContent, TooltipTrigger, Trash2, UiButton, UiDialog, UiInput, UiProgress
  },
  data() {
    return {
      loading: false,
      loadError: '',
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
      runtimeErrors: {},
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
      this.loadError = '';
      try {
        const response = await agentApi.getAgentList();
        this.agentData = response.data || [];
        this.agentList = Array.isArray(this.agentData) ? this.agentData : Object.values(this.agentData);
        await this.fetchRuntimeTargets();
      } catch (error) {
        this.agentList = [];
        this.loadError = error.message || '未知错误';
        toast.error('获取Agent列表失败: ' + this.loadError);
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
      this.runtimeErrors = {};
      this.runtimeForm = editableRuntimeConfig(agent, target.config);
      this.runtimeVisible = true;
    },
    async saveRuntimeConfig() {
      const errors = {};
      if (!this.runtimeForm.displayName.trim()) errors.displayName = '请输入显示名称';
      if (!this.runtimeForm.savePath.trim()) errors.savePath = '请输入远程存档路径';
      if (!this.runtimeForm.serverPath.trim()) errors.serverPath = '请输入远程服务端路径';
      this.runtimeErrors = errors;
      if (Object.keys(errors).length > 0 || !this.runtimeAgent) {
        if (Object.keys(errors).length > 0) toast.warning('请完成必填的运行时配置');
        return;
      }
      this.runtimeSaving = true;
      try {
        await runtimeTargetsV2API.save(this.runtimeAgent.id, this.runtimeForm);
        toast.success('远程运行时配置已保存');
        this.runtimeVisible = false;
        await this.fetchRuntimeTargets();
        announceRuntimeTargetsUpdated();
      } catch (error) {
        toast.error(error.message || '保存远程运行时配置失败');
      } finally {
        this.runtimeSaving = false;
      }
    },
    async removeRuntimeConfig() {
      if (!this.runtimeAgent) return;
      try {
        await confirmAction(`确定移除 “${this.runtimeAgent.hostname}” 的远程运行时配置吗？`, '移除运行时配置', {
          confirmButtonText: '移除',
          cancelButtonText: '取消',
          type: 'warning'
        });
        await runtimeTargetsV2API.remove(this.runtimeAgent.id);
        this.runtimeVisible = false;
        await this.fetchRuntimeTargets();
        announceRuntimeTargetsUpdated();
        toast.success('远程运行时配置已移除');
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
          toast.error(error.message || '移除远程运行时配置失败');
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
        await confirmAction(`确定移除离线 Agent “${agent.hostname || agent.id}” 的历史记录吗？`, '移除 Agent', {
          confirmButtonText: '移除',
          cancelButtonText: '取消',
          type: 'warning'
        });
        await agentApi.forgetAgent(agent.id);
        toast.success('Agent 记录已移除');
        await this.fetchAgentList();
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
          toast.error('移除 Agent 失败: ' + (error.message || '未知错误'));
        }
      }
    },
    getOsIcon(os) {
      if (!os) return Monitor;

      const osLower = os.toLowerCase();
      if (osLower.includes('mac') || osLower.includes('darwin')) return Apple;

      return Monitor;
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
    }
  }
};
</script>

<style scoped>
.progress-label {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  color: var(--muted-foreground);
  font-size: 12px;
}

.agent-info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 12px;
  color: var(--muted-foreground);
  margin-bottom: 4px;
}

.info-value {
  font-size: 14px;
  word-break: break-all;
}

.dir-path {
  font-family: monospace;
  font-size: 12px;
}

.resource-monitor {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.runtime-scope {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.runtime-scope > div {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 10px;
}

.runtime-scope strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.runtime-scope span {
  color: var(--muted-foreground);
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

.detail-dialog,
.runtime-dialog {
  max-width: 720px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--border);
  border-left: 1px solid var(--border);
}

.detail-grid > div {
  min-width: 0;
  padding: 10px 12px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.detail-grid dt {
  color: var(--muted-foreground);
  font-size: 12px;
}

.detail-grid dd {
  margin: 3px 0 0;
  word-break: break-all;
}

.detail-wide {
  grid-column: 1 / -1;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .agent-info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .agent-info-grid {
    grid-template-columns: 1fr;
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

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-wide {
    grid-column: auto;
  }
}
</style>

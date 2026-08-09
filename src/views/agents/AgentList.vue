<template>
  <div class="flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-normal">{{ $t('agents.list.title') }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ $t('agents.list.subtitle') }}</p>
      </div>
      <UiButton variant="outline" :disabled="loading" @click="refreshData"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ $t('common.actions.refresh') }}</UiButton>
    </header>

    <Alert v-if="loadError" variant="destructive"><CircleAlert /><AlertTitle>{{ $t('agents.list.feedback.loadFailedTitle') }}</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="refreshData">{{ $t('common.actions.retry') }}</UiButton></AlertAction></Alert>
    <Alert v-if="runtimeLoadError" variant="destructive"><CircleAlert /><AlertTitle>{{ $t('agents.list.feedback.runtimeLoadFailedTitle') }}</AlertTitle><AlertDescription>{{ runtimeLoadError }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="fetchRuntimeTargets">{{ $t('common.actions.retry') }}</UiButton></AlertAction></Alert>

    <div class="grid gap-4 sm:grid-cols-3">
      <Card><CardHeader><CardTitle>{{ $t('agents.list.metrics.online') }}</CardTitle><CardDescription>{{ $t('agents.list.metrics.onlineDescription') }}</CardDescription><CardAction><span class="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground"><Network /></span></CardAction></CardHeader><CardContent class="min-h-16 pt-1"><strong class="text-3xl font-semibold tabular-nums">{{ connectedAgents }}</strong></CardContent></Card>
      <Card><CardHeader><CardTitle>{{ $t('agents.list.metrics.total') }}</CardTitle><CardDescription>{{ $t('agents.list.metrics.totalDescription') }}</CardDescription><CardAction><span class="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground"><Monitor /></span></CardAction></CardHeader><CardContent class="min-h-16 pt-1"><strong class="text-3xl font-semibold tabular-nums">{{ totalAgents }}</strong></CardContent></Card>
      <Card><CardHeader><CardTitle>{{ $t('agents.list.metrics.operatingSystems') }}</CardTitle><CardDescription>{{ $t('agents.list.metrics.operatingSystemsDescription') }}</CardDescription><CardAction><span class="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground"><Apple /></span></CardAction></CardHeader><CardContent class="min-h-16 pt-1"><strong class="text-3xl font-semibold tabular-nums">{{ uniqueOsCount }}</strong></CardContent></Card>
    </div>

    <div v-if="loading" class="flex flex-col gap-3" :aria-label="$t('agents.list.loadingAria')">
      <Skeleton v-for="index in 3" :key="index" class="h-52 w-full" />
    </div>
    <div v-else-if="agentList.length > 0" class="flex flex-col gap-3">
              <Card v-for="agent in agentList" :key="agent.id">
                <CardHeader>
                  <CardTitle class="flex flex-wrap items-center gap-2"><Badge :variant="agent.connected ? 'default' : 'destructive'">{{ agent.connected ? $t('common.states.online') : $t('common.states.offline') }}</Badge>{{ agent.hostname }}</CardTitle>
                  <CardDescription class="break-all">{{ agent.agent_uuid }}</CardDescription>
                  <CardAction class="flex flex-wrap justify-end gap-2">
                    <UiButton size="sm" variant="outline" @click="showAgentDetails(agent)"><Eye data-icon="inline-start" />{{ $t('agents.list.actions.details') }}</UiButton>
                    <UiButton :variant="runtimeFor(agent).configured ? 'outline' : 'default'" size="sm" :disabled="Boolean(runtimeLoadError)" @click="openRuntimeConfig(agent)"><Settings data-icon="inline-start" />
                      {{ runtimeFor(agent).configured ? $t('agents.list.actions.runtimeConfig') : $t('agents.list.actions.configureRuntime') }}
                    </UiButton>
                    <UiButton size="sm" variant="outline" :disabled="!agent.connected" @click="navigateToCommand(agent.id)"><Terminal data-icon="inline-start" />{{ $t('agents.list.actions.executeCommand') }}</UiButton>
                    <UiButton variant="destructive" size="sm" :disabled="agent.connected" @click="forgetAgent(agent)"><Trash2 data-icon="inline-start" />{{ $t('agents.list.actions.remove') }}</UiButton>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div class="agent-info-grid">
                  <div class="info-item">
                    <div class="info-label">{{ $t('agents.list.fields.system') }}</div>
                    <div class="info-value">
                      <component :is="getOsIcon(agent.os)" class="system-icon" />
                      {{ agent.os }} ({{ agent.arch }})
                    </div>
                  </div>

                  <div class="info-item">
                    <div class="info-label">{{ $t('agents.list.fields.ipAddress') }}</div>
                    <div class="info-value ip-list">
                      <Tooltip v-for="(ip, idx) in agent.ip_addresses" :key="idx"><TooltipTrigger as-child><Badge variant="outline">{{ ip }}</Badge></TooltipTrigger><TooltipContent>{{ ip }}</TooltipContent></Tooltip>
                    </div>
                  </div>

                  <div class="info-item">
                    <div class="info-label">CPU</div>
                    <div class="info-value">{{ $t('agents.list.fields.cpuCores', { count: agent.cpu_count }) }}</div>
                  </div>

                  <div class="info-item">
                    <div class="info-label">{{ $t('agents.list.fields.memory') }}</div>
                    <div class="info-value">
                      {{ formatBytes(agent.memory ? agent.memory.allocated : 0) }} /
                      {{ formatBytes(agent.memory ? agent.memory.system : 0) }}
                    </div>
                  </div>

                  <div class="info-item">
                    <div class="info-label">{{ $t('agents.list.fields.uptime') }}</div>
                    <div class="info-value">{{ formatUptime(agent.uptime_seconds) }}</div>
                  </div>

                  <div class="info-item">
                    <div class="info-label">{{ $t('agents.list.fields.user') }}</div>
                    <div class="info-value">{{ agent.user ? agent.user.name : $t('agents.list.values.notAvailable') }}</div>
                  </div>

                  <div class="info-item">
                    <div class="info-label">{{ $t('agents.list.fields.path') }}</div>
                    <div class="info-value dir-path">{{ agent.current_dir }}</div>
                  </div>

                  <div class="info-item">
                    <div class="info-label">{{ $t('agents.list.fields.lastHeartbeat') }}</div>
                    <div class="info-value">{{ formatTime(agent.last_heartbeat) }}</div>
                  </div>
                  </div>
                </CardContent>
                <CardFooter v-if="agent.connected" class="flex-col items-stretch gap-2">
                  <div v-if="agent.connected" class="resource-monitor">
                    <div class="progress-label"><span>{{ $t('agents.list.fields.memoryUsage') }}</span><span>{{ calculateMemoryUsage(agent) }}%</span></div>
                    <UiProgress :model-value="calculateMemoryUsage(agent)" :aria-label="$t('agents.list.fields.memoryUsageAria', { name: agent.hostname })" />
                  </div>
                </CardFooter>
              </Card>
    </div>

    <Empty v-else><EmptyHeader><EmptyMedia variant="icon"><Network /></EmptyMedia><EmptyTitle>{{ $t('agents.list.empty.title') }}</EmptyTitle><EmptyDescription>{{ $t('agents.list.empty.description') }}</EmptyDescription></EmptyHeader><EmptyContent><UiButton @click="navigateToSecurity">{{ $t('agents.list.empty.add') }}</UiButton></EmptyContent></Empty>

    <UiDialog v-model:open="detailVisible"><DialogContent class="detail-dialog"><DialogHeader><DialogTitle>{{ $t('agents.list.details.title') }}</DialogTitle><DialogDescription>{{ $t('agents.list.details.description') }}</DialogDescription></DialogHeader>
      <dl v-if="selectedAgent" class="detail-grid">
        <div class="detail-wide"><dt>UUID</dt><dd>{{ selectedAgent.agent_uuid }}</dd></div><div><dt>{{ $t('agents.list.details.hostname') }}</dt><dd>{{ selectedAgent.hostname || $t('agents.list.values.notAvailable') }}</dd></div>
        <div><dt>{{ $t('common.fields.status') }}</dt><dd>{{ selectedAgent.connected ? $t('common.states.online') : $t('common.states.offline') }}</dd></div><div><dt>{{ $t('agents.list.fields.system') }}</dt><dd>{{ selectedAgent.os || $t('agents.list.values.notAvailable') }} ({{ selectedAgent.arch || $t('agents.list.values.notAvailable') }})</dd></div>
        <div><dt>{{ $t('agents.list.details.version') }}</dt><dd>{{ selectedAgent.version || $t('agents.list.values.notAvailable') }}</dd></div><div><dt>{{ $t('agents.list.fields.lastHeartbeat') }}</dt><dd>{{ formatTime(selectedAgent.last_heartbeat) }}</dd></div>
        <div><dt>{{ $t('agents.list.fields.uptime') }}</dt><dd>{{ formatUptime(selectedAgent.uptime_seconds) }}</dd></div><div class="detail-wide"><dt>{{ $t('agents.list.fields.ipAddress') }}</dt><dd>{{ (selectedAgent.ip_addresses || []).join(', ') || $t('agents.list.values.notAvailable') }}</dd></div>
        <div class="detail-wide"><dt>{{ $t('agents.list.details.capabilities') }}</dt><dd>{{ (selectedAgent.capabilities || []).join(', ') || $t('agents.list.values.notAvailable') }}</dd></div>
      </dl>
    </DialogContent></UiDialog>

    <UiDialog v-model:open="runtimeVisible"><DialogContent class="runtime-dialog"><DialogHeader><DialogTitle>{{ $t('agents.list.runtime.title') }}</DialogTitle><DialogDescription>{{ $t('agents.list.runtime.description') }}</DialogDescription></DialogHeader>
      <div v-if="runtimeAgent" class="runtime-scope">
        <div>
          <strong>{{ runtimeAgent.hostname }}</strong>
          <span>{{ runtimeAgent.os }} {{ runtimeAgent.arch }}</span>
        </div>
        <Badge variant="outline">{{ $t('agents.list.runtime.scope') }}</Badge>
      </div>
      <FieldGroup class="runtime-form">
        <div class="runtime-form-grid">
          <Field :data-invalid="Boolean(runtimeErrors.displayName)"><FieldLabel for="runtime-name">{{ $t('agents.list.runtime.displayName') }}</FieldLabel><UiInput id="runtime-name" v-model="runtimeForm.displayName" maxlength="100" :aria-invalid="Boolean(runtimeErrors.displayName)" /><FieldError v-if="runtimeErrors.displayName">{{ $t(runtimeErrors.displayName) }}</FieldError></Field>
          <Field><FieldLabel>{{ $t('agents.list.runtime.serverMode') }}</FieldLabel><ToggleGroup v-model="runtimeForm.serverMode" type="single"><ToggleGroupItem value="64">{{ $t('agents.list.runtime.mode64') }}</ToggleGroupItem><ToggleGroupItem value="32">{{ $t('agents.list.runtime.mode32') }}</ToggleGroupItem><ToggleGroupItem value="luajit">LuaJIT</ToggleGroupItem></ToggleGroup></Field>
        </div>
        <Field :data-invalid="Boolean(runtimeErrors.savePath)"><FieldLabel for="runtime-save">{{ $t('agents.list.runtime.savePath') }}</FieldLabel><UiInput id="runtime-save" v-model="runtimeForm.savePath" :placeholder="pathPlaceholder('save')" :aria-invalid="Boolean(runtimeErrors.savePath)" /><FieldError v-if="runtimeErrors.savePath">{{ $t(runtimeErrors.savePath) }}</FieldError></Field>
        <Field :data-invalid="Boolean(runtimeErrors.serverPath)"><FieldLabel for="runtime-server">{{ $t('agents.list.runtime.serverPath') }}</FieldLabel><UiInput id="runtime-server" v-model="runtimeForm.serverPath" :placeholder="pathPlaceholder('server')" :aria-invalid="Boolean(runtimeErrors.serverPath)" /><FieldError v-if="runtimeErrors.serverPath">{{ $t(runtimeErrors.serverPath) }}</FieldError></Field>
        <Field><FieldLabel for="runtime-backup">{{ $t('agents.list.runtime.backupPath') }}</FieldLabel><UiInput id="runtime-backup" v-model="runtimeForm.backupPath" :placeholder="pathPlaceholder('backup')" /></Field>
        <Accordion type="single" collapsible class="runtime-advanced"><AccordionItem value="advanced"><AccordionTrigger>{{ $t('agents.list.runtime.advanced') }}</AccordionTrigger><AccordionContent><FieldGroup>
            <Field><FieldLabel for="runtime-ugc">{{ $t('agents.list.runtime.ugcPath') }}</FieldLabel><UiInput id="runtime-ugc" v-model="runtimeForm.ugcPath" /></Field>
            <Field><FieldLabel for="runtime-steamcmd">{{ $t('agents.list.runtime.steamcmdPath') }}</FieldLabel><UiInput id="runtime-steamcmd" v-model="runtimeForm.steamcmdPath" /></Field>
            <Field><FieldLabel for="runtime-workshop">{{ $t('agents.list.runtime.workshopPath') }}</FieldLabel><UiInput id="runtime-workshop" v-model="runtimeForm.workshopContentPath" /></Field>
            <div class="runtime-form-grid">
              <Field><FieldLabel for="runtime-lua">{{ $t('agents.list.runtime.luaCommand') }}</FieldLabel><UiInput id="runtime-lua" v-model="runtimeForm.luaBinary" placeholder="lua" /></Field>
              <Field><FieldLabel for="runtime-lua-fallback">{{ $t('agents.list.runtime.luaFallbackPath') }}</FieldLabel><UiInput id="runtime-lua-fallback" v-model="runtimeForm.luaFallbackPath" /></Field>
            </div>
        </FieldGroup></AccordionContent></AccordionItem></Accordion>
      </FieldGroup>
      <DialogFooter class="runtime-dialog-footer">
          <UiButton v-if="runtimeConfigured" variant="destructive" @click="removeRuntimeConfig">{{ $t('agents.list.runtime.removeConfig') }}</UiButton>
          <span class="runtime-footer-spacer"></span>
          <UiButton variant="outline" @click="runtimeVisible = false">{{ $t('common.actions.cancel') }}</UiButton>
          <UiButton :disabled="runtimeSaving" @click="saveRuntimeConfig"><Spinner v-if="runtimeSaving" data-icon="inline-start" />{{ $t('agents.list.runtime.saveConfig') }}</UiButton>
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
      loadFailure: null,
      runtimeLoadFailure: null,
      agentData: {},
      agentList: [],
      detailVisible: false,
      selectedAgent: null,
      runtimeByAgent: {},
      runtimeVisible: false,
      runtimeSaving: false,
      runtimeConfigured: false,
      runtimeAgent: null,
      runtimeForm: emptyRuntimeConfig(),
      runtimeErrors: {}
    };
  },
  computed: {
    loadError() {
      return this.localizedFailure(this.loadFailure);
    },
    runtimeLoadError() {
      return this.localizedFailure(this.runtimeLoadFailure);
    },
    totalAgents() {
      return this.agentList.length;
    },
    connectedAgents() {
      return this.agentList.filter(agent => agent.connected).length;
    },
    uniqueOsCount() {
      const osSet = new Set(this.agentList.map(agent => agent.os).filter(Boolean));
      return osSet.size;
    }
  },
  created() {
    this.fetchAgentList();
  },
  methods: {
    async fetchAgentList() {
      this.loading = true;
      this.loadFailure = null;
      try {
        const response = await agentApi.getAgentList();
        this.agentData = response.data || [];
        this.agentList = Array.isArray(this.agentData) ? this.agentData : Object.values(this.agentData);
        await this.fetchRuntimeTargets();
      } catch (error) {
        this.agentList = [];
        this.loadFailure = this.failureState('agents.list.feedback.loadFailed', error);
        toast.error(this.loadError);
      } finally {
        this.loading = false;
      }
    },
    refreshData() {
      this.fetchAgentList();
    },
    async fetchRuntimeTargets() {
      this.runtimeLoadFailure = null;
      try {
        const value = await runtimeTargetsV2API.list();
        this.runtimeByAgent = Object.fromEntries(
          (value.items || []).filter(item => item.kind === 'agent').map(item => [item.agentId, item])
        );
        return true;
      } catch (error) {
        this.runtimeByAgent = {};
        this.runtimeLoadFailure = this.failureState('agents.list.feedback.runtimeLoadFailed', error);
        return false;
      }
    },
    runtimeFor(agent) {
      return this.runtimeByAgent[agent.id] || { configured: false, status: 'configuration_required', config: {} };
    },
    openRuntimeConfig(agent) {
      const target = this.runtimeFor(agent);
      this.runtimeAgent = agent;
      this.runtimeConfigured = target.configured;
      this.runtimeErrors = {};
      this.runtimeForm = editableRuntimeConfig(agent, target.config);
      this.runtimeVisible = true;
    },
    async saveRuntimeConfig() {
      const errors = {};
      if (!this.runtimeForm.displayName.trim()) errors.displayName = 'agents.list.validation.displayName';
      if (!this.runtimeForm.savePath.trim()) errors.savePath = 'agents.list.validation.savePath';
      if (!this.runtimeForm.serverPath.trim()) errors.serverPath = 'agents.list.validation.serverPath';
      this.runtimeErrors = errors;
      if (Object.keys(errors).length > 0 || !this.runtimeAgent) {
        if (Object.keys(errors).length > 0) toast.warning(this.$t('agents.list.validation.required'));
        return;
      }
      this.runtimeSaving = true;
      try {
        await runtimeTargetsV2API.save(this.runtimeAgent.id, this.runtimeForm);
        this.runtimeVisible = false;
        const refreshed = await this.fetchRuntimeTargets();
        announceRuntimeTargetsUpdated();
        if (refreshed) toast.success(this.$t('agents.list.feedback.runtimeSaved'));
        else toast.warning(this.$t('agents.list.feedback.runtimeSavedRefreshFailed'));
      } catch (error) {
        toast.error(this.$t('agents.list.feedback.runtimeSaveFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      } finally {
        this.runtimeSaving = false;
      }
    },
    async removeRuntimeConfig() {
      if (!this.runtimeAgent) return;
      try {
        await confirmAction(this.$t('agents.list.feedback.runtimeRemoveConfirm', {
          name: this.runtimeAgent.hostname
        }), this.$t('agents.list.feedback.runtimeRemoveTitle'), {
          confirmButtonText: this.$t('agents.list.actions.remove'),
          cancelButtonText: this.$t('common.actions.cancel'),
          type: 'warning'
        });
        await runtimeTargetsV2API.remove(this.runtimeAgent.id);
        this.runtimeVisible = false;
        const refreshed = await this.fetchRuntimeTargets();
        announceRuntimeTargetsUpdated();
        if (refreshed) toast.success(this.$t('agents.list.feedback.runtimeRemoved'));
        else toast.warning(this.$t('agents.list.feedback.runtimeRemovedRefreshFailed'));
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
          toast.error(this.$t('agents.list.feedback.runtimeRemoveFailed', {
            error: error.message || this.$t('common.errors.unknown')
          }));
        }
      }
    },
    pathPlaceholder(kind) {
      const platform = String(this.runtimeAgent?.os || '').toLowerCase();
      const windows = platform === 'windows';
      if (windows) {
        return {
          save: 'C:\\Users\\Administrator\\Klei\\DoNotStarveTogether',
          server: 'C:\\dst-server',
          backup: 'D:\\dst-backups'
        }[kind];
      }
      if (platform === 'darwin' || platform === 'macos') {
        return {
          save: '/Users/yourname/Documents/Klei/DoNotStarveTogether',
          server: "/Users/yourname/Library/Application Support/Steam/steamapps/common/Don't Starve Together Dedicated Server",
          backup: '/Users/yourname/dst-backups'
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
        await confirmAction(this.$t('agents.list.feedback.agentRemoveConfirm', {
          name: agent.hostname || agent.id
        }), this.$t('agents.list.feedback.agentRemoveTitle'), {
          confirmButtonText: this.$t('agents.list.actions.remove'),
          cancelButtonText: this.$t('common.actions.cancel'),
          type: 'warning'
        });
        await agentApi.forgetAgent(agent.id);
        toast.success(this.$t('agents.list.feedback.agentRemoved'));
        await this.fetchAgentList();
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
          toast.error(this.$t('agents.list.feedback.agentRemoveFailed', {
            error: error.message || this.$t('common.errors.unknown')
          }));
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
      if (!seconds) return this.$t('agents.list.values.notAvailable');

      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (days > 0) {
        return this.$t('agents.list.duration.daysHours', { days, hours });
      } else if (hours > 0) {
        return this.$t('agents.list.duration.hoursMinutes', { hours, minutes });
      } else {
        return this.$t('agents.list.duration.minutes', { minutes });
      }
    },
    formatTime(timestamp) {
      if (!timestamp) return this.$t('agents.list.values.notAvailable');

      const numeric = typeof timestamp === 'string' && /^\d+$/.test(timestamp) ? Number(timestamp) : timestamp;
      const date = typeof numeric === 'number'
        ? new Date(numeric < 1000000000000 ? numeric * 1000 : numeric)
        : new Date(numeric);
      const localeState = this.$i18n?.locale;
      const locale = typeof localeState === 'string' ? localeState : (localeState?.value || 'zh-CN');
      return Number.isNaN(date.getTime())
        ? this.$t('agents.list.values.notAvailable')
        : date.toLocaleString(locale);
    },
    failureState(key, error) {
      return { key, detail: String(error?.message || '').trim() };
    },
    localizedFailure(failure) {
      if (!failure) return '';
      const message = this.$t(failure.key);
      return failure.detail
        ? this.$t('agents.list.feedback.errorWithDetail', { message, detail: failure.detail })
        : message;
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

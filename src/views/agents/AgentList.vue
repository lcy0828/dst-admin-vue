<template>
  <div class="flex min-w-0 flex-col gap-5">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-normal">{{ $t('agents.list.title') }}</h1>
        <p v-if="totalMachines > 1" class="mt-2 text-sm text-muted-foreground">
          {{ $t('machines.summary', { count: totalMachines }) }}
          <span v-if="totalMachines > onlineMachines"> · {{ $t('machines.disconnectedSummary', { count: totalMachines - onlineMachines }) }}</span>
        </p>
      </div>
      <UiButton @click="navigateToSecurity"><Plus data-icon="inline-start" />{{ $t('machines.add') }}</UiButton>
    </header>
    <Alert v-if="loadError" variant="destructive"><CircleAlert /><AlertTitle>{{ $t('agents.list.feedback.loadFailedTitle') }}</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="refreshData">{{ $t('common.actions.retry') }}</UiButton></AlertAction></Alert>
    <Alert v-if="runtimeLoadError" variant="destructive"><CircleAlert /><AlertTitle>{{ $t('agents.list.feedback.runtimeLoadFailedTitle') }}</AlertTitle><AlertDescription>{{ runtimeLoadError }}</AlertDescription><AlertAction><UiButton size="sm" variant="outline" @click="fetchRuntimeTargets">{{ $t('common.actions.retry') }}</UiButton></AlertAction></Alert>
    <div v-if="loading && totalMachines === 0" class="flex flex-col gap-2" :aria-label="$t('agents.list.loadingAria')"><Skeleton v-for="index in 3" :key="index" class="h-20 w-full" /></div>
    <MachineManagementPanel
      v-else-if="totalMachines > 0"
      ref="machinePanel"
      :targets="machineTargets"
      :agents="agentList"
      :local-status="localSystemStatus"
      :refresh-key="agentRequestSequence"
      :unavailable="Boolean(loadError || runtimeLoadError)"
      @rename="openRename"
      @configure="openRuntimeConfig"
      @upgrade="upgradeAgent"
      @command="navigateToCommand"
      @forget="forgetAgent"
      @target-updated="updateMachineTarget"
      @software-updated="fetchAgentList"
    />
    <Empty v-else><EmptyHeader><EmptyMedia variant="icon"><Network /></EmptyMedia><EmptyTitle>{{ $t('agents.list.empty.title') }}</EmptyTitle><EmptyDescription>{{ $t('agents.list.empty.description') }}</EmptyDescription></EmptyHeader><EmptyContent><UiButton @click="navigateToSecurity">{{ $t('machines.add') }}</UiButton></EmptyContent></Empty>
    <footer class="flex flex-wrap items-center justify-between gap-2">
      <UiButton variant="ghost" size="sm" @click="configurationOpen = true"><Settings data-icon="inline-start" />{{ $t('machines.settings') }}</UiButton>
      <UiButton variant="ghost" size="sm" :disabled="loading" @click="refreshData"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ $t('common.actions.refresh') }}</UiButton>
    </footer>
    <UiDialog v-if="configurationOpen" v-model:open="configurationOpen">
      <DialogScrollContent class="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{{ $t('machines.settings') }}</DialogTitle><DialogDescription>{{ $t('agents.list.configuration.title') }}</DialogDescription></DialogHeader>
        <FleetProfilePanel v-if="configurationOpen" @changed="refreshData" />
        <UiButton class="self-start" variant="outline" @click="openReleaseManager"><PackageOpen data-icon="inline-start" />{{ $t('agents.list.updates.manage') }}</UiButton>
        <details><summary class="cursor-pointer text-sm text-muted-foreground">{{ $t('agents.list.capacity.policyTitle') }}</summary><p class="mt-3 text-sm text-muted-foreground">{{ $t('agents.list.capacity.policyDescription') }}</p></details>
        <Collapsible><CollapsibleTrigger as-child><UiButton variant="ghost">{{ $t('agents.list.configuration.experimental') }}<ChevronDown data-icon="inline-end" /></UiButton></CollapsibleTrigger><CollapsibleContent><KubernetesProviderPanel :heading-level="2" /></CollapsibleContent></Collapsible>
      </DialogScrollContent>
    </UiDialog>

  <UiDialog v-if="releaseVisible" v-model:open="releaseVisible">
    <DialogContent class="sm:max-w-2xl">
    <DialogHeader>
      <DialogTitle>{{ $t('agents.list.updates.title') }}</DialogTitle>
      <DialogDescription>{{ $t('agents.list.updates.description') }}</DialogDescription>
    </DialogHeader>
    <FieldGroup class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-end">
      <Field :data-invalid="Boolean(releaseErrors.file)">
        <FieldLabel for="agent-release-file">{{ $t('agents.list.updates.file') }}</FieldLabel>
        <UiInput :key="releaseInputKey" id="agent-release-file" type="file" :aria-invalid="Boolean(releaseErrors.file)" @change="selectReleaseFile" />
        <FieldDescription>{{ $t('agents.list.updates.fileDescription', { size: formatBytes(releaseMaxUploadBytes) }) }}</FieldDescription>
        <FieldError v-if="releaseErrors.file">{{ $t(releaseErrors.file) }}</FieldError>
      </Field>
      <Field :data-invalid="Boolean(releaseErrors.version)">
      <FieldLabel for="agent-release-version">{{ $t('agents.list.updates.version') }}</FieldLabel>
      <UiInput id="agent-release-version" v-model="releaseForm.version" maxlength="64" placeholder="2.10.0" />
      <FieldError v-if="releaseErrors.version">{{ $t(releaseErrors.version) }}</FieldError>
      </Field>
      <UiButton class="w-full sm:w-auto" :disabled="releaseUploading" @click="uploadRelease">
      <Spinner v-if="releaseUploading" data-icon="inline-start" />
      <Upload v-else data-icon="inline-start" />
      {{ $t('agents.list.updates.upload') }}
        </UiButton>
      </FieldGroup>
      <UiProgress v-if="releaseUploading" :model-value="releaseUploadProgress" :aria-label="$t('agents.list.updates.uploadProgress')" />

    <div class="min-h-28 overflow-hidden rounded-md border">
      <div v-if="releaseLoading" class="flex min-h-28 items-center justify-center"><Spinner /></div>
      <Empty v-else-if="releaseList.length === 0" class="min-h-28 py-4">
      <EmptyHeader><EmptyMedia variant="icon"><PackageOpen /></EmptyMedia><EmptyTitle>{{ $t('agents.list.updates.emptyTitle') }}</EmptyTitle></EmptyHeader>
      </Empty>
      <div v-else class="divide-y">
      <div v-for="release in releaseList" :key="release.id" class="flex min-h-16 items-center gap-3 px-3 py-2">
        <PackageOpen class="size-4 shrink-0 text-muted-foreground" />
        <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-1.5"><strong>v{{ release.version }}</strong><Badge variant="outline">{{ platformLabel(release) }}</Badge></div>
        <div class="mt-1 truncate text-xs text-muted-foreground">{{ release.fileName }} · {{ formatBytes(release.size) }} · {{ formatTime(release.uploadedAt) }}</div>
        </div>
        <Tooltip><TooltipTrigger as-child><UiButton size="icon-sm" variant="ghost" :aria-label="$t('agents.list.updates.delete')" @click="deleteRelease(release)"><Trash2 /></UiButton></TooltipTrigger><TooltipContent>{{ $t('agents.list.updates.delete') }}</TooltipContent></Tooltip>
      </div>
      </div>
    </div>
    </DialogContent>
  </UiDialog>

    <UiDialog v-if="renameVisible" v-model:open="renameVisible">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ $t('agents.list.rename.title') }}</DialogTitle>
          <DialogDescription>{{ $t('agents.list.rename.description') }}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field :data-invalid="Boolean(renameError)">
            <FieldLabel for="machine-display-name">{{ $t('agents.list.rename.displayName') }}</FieldLabel>
            <UiInput id="machine-display-name" v-model="renameForm.displayName" maxlength="100" :aria-invalid="Boolean(renameError)" @keyup.enter="saveMachineName" />
            <FieldDescription v-if="renameTarget?.hostname">{{ $t('agents.list.rename.hostname', { hostname: renameTarget.hostname }) }}</FieldDescription>
            <FieldError v-if="renameError">{{ $t(renameError) }}</FieldError>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" @click="renameVisible = false">{{ $t('common.actions.cancel') }}</UiButton>
          <UiButton :disabled="renameSaving" @click="saveMachineName">
            <Spinner v-if="renameSaving" data-icon="inline-start" />
            {{ $t('common.actions.save') }}
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-if="runtimeVisible" v-model:open="runtimeVisible">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{{ $t('agents.list.runtime.title') }}</DialogTitle><DialogDescription>{{ $t('agents.list.runtime.description') }}</DialogDescription></DialogHeader>
        <div v-if="runtimeAgent" class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-baseline gap-2"><strong class="truncate">{{ runtimeAgent.hostname }}</strong><span class="text-xs text-muted-foreground">{{ runtimeAgent.os }} {{ runtimeAgent.arch }}</span></div>
          <Badge variant="outline">{{ $t('agents.list.runtime.scope') }}</Badge>
        </div>
        <Alert v-if="runtimeRegistrySupported && runtimeInstallations.length === 0" variant="destructive">
          <CircleAlert />
          <AlertTitle>{{ $t('agents.list.runtime.noInstallationsTitle') }}</AlertTitle>
          <AlertDescription>{{ $t('agents.list.runtime.noInstallationsDescription') }}</AlertDescription>
        </Alert>
        <Alert v-else-if="!runtimeRegistrySupported">
          <TriangleAlert />
          <AlertTitle>{{ $t('agents.list.runtime.legacyTitle') }}</AlertTitle>
          <AlertDescription>{{ $t('agents.list.runtime.legacyDescription') }}</AlertDescription>
        </Alert>
        <Alert v-else-if="runtimeConfigured && !selectedRuntimeInstallation" variant="destructive">
          <CircleAlert />
          <AlertTitle>{{ $t('agents.list.runtime.staleInstallationTitle') }}</AlertTitle>
          <AlertDescription>{{ $t('agents.list.runtime.staleInstallationDescription') }}</AlertDescription>
        </Alert>
        <Alert v-else-if="runtimeConfigured && runtimeConfigurationSource === 'discovered'">
          <CircleCheck />
          <AlertTitle>{{ $t('agents.list.runtime.discoveredTitle') }}</AlertTitle>
          <AlertDescription>{{ $t('agents.list.runtime.discoveredDescription') }}</AlertDescription>
        </Alert>
        <FieldGroup class="grid gap-4 sm:grid-cols-2">
          <Field class="sm:col-span-2" :data-invalid="Boolean(runtimeErrors.installationId)">
            <FieldLabel for="runtime-installation">{{ $t('agents.list.runtime.installation') }}</FieldLabel>
            <UiSelect
              v-if="runtimeRegistrySupported"
              :model-value="runtimeForm.installationId"
              :disabled="runtimeInstallations.length === 0"
              @update:model-value="selectRuntimeInstallation"
            >
              <SelectTrigger id="runtime-installation" class="w-full" :aria-invalid="Boolean(runtimeErrors.installationId)">
                <SelectValue :placeholder="$t('agents.list.runtime.installationPlaceholder')" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="installation in runtimeInstallations" :key="installation.id" :value="installation.id">
                    {{ installation.id }} · {{ installationDriverLabel(installation.driver) }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </UiSelect>
            <UiInput v-else id="runtime-installation" v-model="runtimeForm.installationId" maxlength="64" :aria-invalid="Boolean(runtimeErrors.installationId)" />
            <FieldDescription>{{ runtimeRegistrySupported ? $t('agents.list.runtime.trustedInstallationDescription') : $t('agents.list.runtime.manualInstallationDescription') }}</FieldDescription>
            <FieldError v-if="runtimeErrors.installationId">{{ $t(runtimeErrors.installationId) }}</FieldError>
          </Field>
          <div v-if="selectedRuntimePerformance" class="sm:col-span-2 border-y py-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-sm font-medium">{{ $t('agents.list.runtime.performance.label') }}</span>
              <Badge :variant="performanceVariant(selectedRuntimePerformance)">{{ performanceStatusLabel(selectedRuntimePerformance) }}</Badge>
            </div>
            <p class="mt-1.5 text-sm text-muted-foreground">{{ performanceSummary(selectedRuntimePerformance) }}</p>
            <p v-if="performanceVersionText(selectedRuntimePerformance)" class="mt-1.5 font-mono text-xs text-muted-foreground">{{ performanceVersionText(selectedRuntimePerformance) }}</p>
            <p v-if="performanceIssueText(selectedRuntimePerformance)" class="mt-1.5 text-xs text-destructive">{{ performanceIssueText(selectedRuntimePerformance) }}</p>
          </div>
          <Field :data-invalid="Boolean(runtimeErrors.displayName)"><FieldLabel for="runtime-name">{{ $t('agents.list.runtime.displayName') }}</FieldLabel><UiInput id="runtime-name" v-model="runtimeForm.displayName" maxlength="100" :aria-invalid="Boolean(runtimeErrors.displayName)" /><FieldError v-if="runtimeErrors.displayName">{{ $t(runtimeErrors.displayName) }}</FieldError></Field>
          <Field :data-disabled="runtimeRegistrySupported || undefined"><FieldLabel>{{ $t('agents.list.runtime.serverMode') }}</FieldLabel><ToggleGroup v-model="runtimeForm.serverMode" type="single" :disabled="runtimeRegistrySupported"><ToggleGroupItem value="64">{{ $t('agents.list.runtime.mode64') }}</ToggleGroupItem><ToggleGroupItem value="32">{{ $t('agents.list.runtime.mode32') }}</ToggleGroupItem></ToggleGroup><FieldDescription>{{ $t('agents.list.runtime.serverModeDescription') }}</FieldDescription></Field>
          <Field class="sm:col-span-2" :data-disabled="runtimeRegistrySupported || undefined" :data-invalid="Boolean(runtimeErrors.savePath)"><FieldLabel for="runtime-save">{{ $t('agents.list.runtime.savePath') }}</FieldLabel><UiInput id="runtime-save" v-model="runtimeForm.savePath" :placeholder="pathPlaceholder('save')" :disabled="runtimeRegistrySupported" :aria-invalid="Boolean(runtimeErrors.savePath)" /><FieldError v-if="runtimeErrors.savePath">{{ $t(runtimeErrors.savePath) }}</FieldError></Field>
          <Field class="sm:col-span-2" :data-disabled="runtimeRegistrySupported || undefined" :data-invalid="Boolean(runtimeErrors.serverPath)"><FieldLabel for="runtime-server">{{ $t('agents.list.runtime.serverPath') }}</FieldLabel><UiInput id="runtime-server" v-model="runtimeForm.serverPath" :placeholder="pathPlaceholder('server')" :disabled="runtimeRegistrySupported" :aria-invalid="Boolean(runtimeErrors.serverPath)" /><FieldError v-if="runtimeErrors.serverPath">{{ $t(runtimeErrors.serverPath) }}</FieldError></Field>
          <Field class="sm:col-span-2"><FieldLabel for="runtime-backup">{{ $t('agents.list.runtime.backupPath') }}</FieldLabel><UiInput id="runtime-backup" v-model="runtimeForm.backupPath" :placeholder="pathPlaceholder('backup')" /></Field>
          <Accordion type="single" collapsible class="sm:col-span-2"><AccordionItem value="advanced"><AccordionTrigger>{{ $t('agents.list.runtime.advanced') }}</AccordionTrigger><AccordionContent><FieldGroup>
            <Field :data-disabled="runtimeRegistrySupported || undefined"><FieldLabel for="runtime-ugc">{{ $t('agents.list.runtime.ugcPath') }}</FieldLabel><UiInput id="runtime-ugc" v-model="runtimeForm.ugcPath" :disabled="runtimeRegistrySupported" /></Field>
            <Field :data-disabled="runtimeRegistrySupported || undefined"><FieldLabel for="runtime-steamcmd">{{ $t('agents.list.runtime.steamcmdPath') }}</FieldLabel><UiInput id="runtime-steamcmd" v-model="runtimeForm.steamcmdPath" :disabled="runtimeRegistrySupported" /></Field>
            <Field :data-disabled="runtimeRegistrySupported || undefined"><FieldLabel for="runtime-workshop">{{ $t('agents.list.runtime.workshopPath') }}</FieldLabel><UiInput id="runtime-workshop" v-model="runtimeForm.workshopContentPath" :disabled="runtimeRegistrySupported" /></Field>
            <Field><FieldLabel for="runtime-lua">{{ $t('agents.list.runtime.luaCommand') }}</FieldLabel><UiInput id="runtime-lua" v-model="runtimeForm.luaBinary" placeholder="lua" /></Field>
            <Field><FieldLabel for="runtime-lua-fallback">{{ $t('agents.list.runtime.luaFallbackPath') }}</FieldLabel><UiInput id="runtime-lua-fallback" v-model="runtimeForm.luaFallbackPath" /></Field>
          </FieldGroup></AccordionContent></AccordionItem></Accordion>
        </FieldGroup>
        <DialogFooter class="flex-wrap sm:justify-end">
          <UiButton v-if="runtimeConfigured" class="sm:mr-auto" variant="destructive" @click="removeRuntimeConfig">{{ $t('agents.list.runtime.removeConfig') }}</UiButton>
          <UiButton variant="outline" @click="runtimeVisible = false">{{ $t('common.actions.cancel') }}</UiButton>
          <UiButton :disabled="runtimeSaving || (runtimeRegistrySupported && runtimeInstallations.length === 0)" @click="saveRuntimeConfig"><Spinner v-if="runtimeSaving" data-icon="inline-start" />{{ $t('agents.list.runtime.saveConfig') }}</UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { ChevronDown, CircleAlert, CircleCheck, Network, PackageOpen, RefreshCw, Settings, Trash2, TriangleAlert, Upload } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { agentApi } from '@/api/index';
import { bindAgentRuntimeInstallation } from '@/api/agentApiSupport.mjs';
import { agentsV2API, runtimeTargetsV2API, systemV2API } from '@/api/v2';
import { waitForV2Job } from '@/api/v2ConfigurationAdapters';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus } from '@lucide/vue';
import FleetProfilePanel from '@/components/agents/FleetProfilePanel.vue';
import KubernetesProviderPanel from '@/components/runtime/KubernetesProviderPanel.vue';
import MachineManagementPanel from '@/components/agents/MachineManagementPanel.vue';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Dialog as UiDialog, DialogScrollContent, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Progress as UiProgress } from '@/components/ui/progress';

import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { confirmAction } from '@/lib/feedback';
import { formatSystemDateTime } from '@/lib/dateTime.mjs';
import {
  getManagementScope,
  MANAGEMENT_SCOPE_CHANGED_EVENT,
  MANAGEMENT_SCOPE_TARGET
} from '@/lib/managementScope.mjs';
import { announceRuntimeTargetsUpdated } from '@/utils/runtimeTarget';

const INVENTORY_CAPABILITY = 'runtime.inventory.read';

const emptyRuntimeConfig = agent => ({
  installationId: 'default',
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
  return Object.fromEntries(Object.keys(defaults).map(key => [key, config[key] ?? defaults[key]]));
};

export default {
  name: 'AgentList',
  components: {
    Collapsible, CollapsibleContent, CollapsibleTrigger, Plus,
    Accordion, AccordionContent, AccordionItem, AccordionTrigger, Alert, AlertAction, AlertDescription,
    AlertTitle, Badge, ChevronDown, CircleAlert, CircleCheck, DialogScrollContent, DialogContent,
    DialogDescription, DialogFooter, DialogHeader, DialogTitle, Empty, EmptyContent, EmptyDescription,
    EmptyHeader, EmptyMedia, EmptyTitle, Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FleetProfilePanel,
    KubernetesProviderPanel, Network, PackageOpen, RefreshCw, MachineManagementPanel, Settings, Skeleton, Spinner,
    SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
    ToggleGroup, ToggleGroupItem, Tooltip, TooltipContent, TooltipTrigger, Trash2, TriangleAlert, UiButton,
    UiDialog, UiInput, UiProgress, UiSelect, Upload
  },
  data() {
    return {
      loading: false,
      loadFailure: null,
      runtimeLoadFailure: null,
      agentData: {},
      agentList: [],
      inventories: {},
      inventoryFailures: {},
      inventoryLoading: {},
      inventoryRefreshing: {},
      runtimeTargetList: [],
      runtimeByAgent: {},
      localSystemStatus: {},
      renameVisible: false,
      renameSaving: false,
      renameTarget: null,
      renameForm: { displayName: '' },
      renameError: '',
      runtimeVisible: false,
      runtimeSaving: false,
      runtimeConfigured: false,
      runtimeAgent: null,
      runtimeForm: emptyRuntimeConfig(),
      runtimeErrors: {},
    releaseVisible: false,
    releaseLoading: false,
      releaseUploading: false,
      releaseUploadProgress: 0,
      releaseList: [],
      releaseMaxUploadBytes: 128 * 1024 * 1024,
    releaseForm: { version: '', file: null },
    releaseErrors: {},
    releaseInputKey: 0,
    upgradingAgents: {},
      configurationOpen: false,
      managementScope: getManagementScope(),
      agentRequestSequence: 0,
      runtimeRequestSequence: 0,
      inventoryRequestSequences: {}
    };
  },
  computed: {
    machineTargets() {
      const known = new Set(this.runtimeTargetList.map(target => target.agentId));
      return [...this.runtimeTargetList, ...this.agentList.filter(agent => !known.has(agent.id)).map(agent => ({
        id: `agent:${agent.id}`, agentId: agent.id, kind: 'agent', name: agent.display_name || agent.hostname,
        hostname: agent.hostname, online: agent.connected, ipAddresses: agent.ip_addresses,
        capabilities: agent.capabilities, os: agent.os, arch: agent.arch, configured: false
      }))];
    },
    loadError() {
      return this.localizedFailure(this.loadFailure);
    },
    runtimeLoadError() {
      return this.localizedFailure(this.runtimeLoadFailure);
    },
    localRuntimeTarget() {
      return this.runtimeTargetList.find(target => target.kind === 'local') || null;
    },
    totalMachines() {
      return this.agentList.length + (this.localRuntimeTarget ? 1 : 0);
    },
    onlineMachines() {
      return this.agentList.filter(agent => agent.connected).length + (this.localRuntimeTarget?.online ? 1 : 0);
    },

    runtimeInstallations() {
      return Array.isArray(this.runtimeAgent?.installations) ? this.runtimeAgent.installations : [];
    },
    runtimeRegistrySupported() {
      return Boolean(this.runtimeAgent?.installation_registry_supported);
    },
    selectedRuntimeInstallation() {
      return this.runtimeInstallations.find(installation => installation.id === this.runtimeForm.installationId) || null;
    },
    selectedRuntimePerformance() {
      return this.selectedRuntimeInstallation?.performance || null;
    },
    runtimeConfigurationSource() {
      if (!this.runtimeAgent) return '';
      return this.runtimeFor(this.runtimeAgent).config?.source || '';
    }
  },
  created() {
    this.fetchAgentList();
  },
  mounted() {
    window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, this.handleManagementScopeChange);
  },
  beforeUnmount() {
    this.agentRequestSequence += 1;
    this.runtimeRequestSequence += 1;
    window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, this.handleManagementScopeChange);
  },
  methods: {
    updateMachineTarget(updated) {
      this.runtimeRequestSequence += 1;
      this.runtimeTargetList = this.runtimeTargetList.map(target => target.id === updated.id ? updated : target);
      if (updated.kind === 'agent' && updated.agentId) this.runtimeByAgent[updated.agentId] = updated;
    },
    async fetchAgentList() {
      const sequence = ++this.agentRequestSequence;
      this.loading = true;
      this.loadFailure = null;
      try {
        const response = await agentApi.getAgentList();
        if (sequence !== this.agentRequestSequence) return false;
        this.agentData = response.data || [];
        this.agentList = Array.isArray(this.agentData) ? this.agentData : Object.values(this.agentData);
        await this.fetchRuntimeTargets();
        if (sequence !== this.agentRequestSequence) return false;
        await this.fetchLocalSystemStatus();
        if (sequence !== this.agentRequestSequence) return false;
        // Machine observations are supplied by the shared infrastructure snapshot.
        return sequence === this.agentRequestSequence;
      } catch (error) {
        if (sequence !== this.agentRequestSequence) return false;
        this.loadFailure = this.failureState('agents.list.feedback.loadFailed', error);
        toast.error(this.loadError);
        return false;
      } finally {
        if (sequence === this.agentRequestSequence) this.loading = false;
      }
    },
    refreshData() {
      return this.fetchAgentList();
    },
  agentUpdate(agent) {
    return agent?.update || { mode: 'migration', supported: false, updateAvailable: false };
  },
  canUpgradeAgent(agent) {
    const update = this.agentUpdate(agent);
    return Boolean(agent?.connected && update.supported && update.updateAvailable && update.release?.id);
  },
  agentUpdateHint(agent) {
    const update = this.agentUpdate(agent);
    if (!agent?.connected) return this.$t('agents.list.updates.hints.offline');
    if (update.mode === 'container') return this.$t('agents.list.updates.hints.container');
    if (update.mode === 'migration') return this.$t('agents.list.updates.hints.migration');
    if (update.mode === 'unsupported') return this.$t('agents.list.updates.hints.unsupported');
    if (!update.release) return this.$t('agents.list.updates.hints.noPackage', { platform: this.platformLabel(agent) });
    if (!update.updateAvailable) return this.$t('agents.list.updates.hints.current');
    return this.$t('agents.list.updates.hints.ready', { version: update.latestVersion });
  },
  async openReleaseManager() {
    this.releaseVisible = true;
    await this.fetchReleases();
  },
  async fetchReleases() {
    this.releaseLoading = true;
    try {
      const value = await agentsV2API.releases();
      this.releaseList = Array.isArray(value.items) ? value.items : [];
      this.releaseMaxUploadBytes = Number(value.maxUploadBytes) || this.releaseMaxUploadBytes;
    return true;
    } catch (error) {
    toast.error(this.$t('agents.list.updates.feedback.loadFailed', { error: error?.message || this.$t('common.errors.unknown') }));
    return false;
    } finally {
    this.releaseLoading = false;
    }
  },
    selectReleaseFile(event) {
      this.releaseForm.file = event?.target?.files?.[0] || null;
      if (this.releaseForm.file) {
      const errors = { ...this.releaseErrors };
      if (this.releaseForm.file.size > this.releaseMaxUploadBytes) errors.file = 'agents.list.updates.validation.fileTooLarge';
      else delete errors.file;
      this.releaseErrors = errors;
      }
  },
  async uploadRelease() {
    const errors = {};
      const version = String(this.releaseForm.version || '').trim().replace(/^v/, '');
      if (!this.releaseForm.file) errors.file = 'agents.list.updates.validation.file';
      else if (this.releaseForm.file.size > this.releaseMaxUploadBytes) errors.file = 'agents.list.updates.validation.fileTooLarge';
    if (!/^[0-9][0-9A-Za-z._+-]{0,63}$/.test(version)) errors.version = 'agents.list.updates.validation.version';
    this.releaseErrors = errors;
      if (Object.keys(errors).length > 0 || this.releaseUploading) return;
      this.releaseUploading = true;
      this.releaseUploadProgress = 0;
      try {
      const release = await agentsV2API.uploadRelease(this.releaseForm.file, version, event => {
        if (event?.total > 0) this.releaseUploadProgress = Math.min(100, Math.round(event.loaded * 100 / event.total));
      });
    this.releaseForm = { version: '', file: null };
    this.releaseInputKey += 1;
    await Promise.all([this.fetchReleases(), this.fetchAgentList()]);
    toast.success(this.$t('agents.list.updates.feedback.uploaded', { version: release.version, platform: this.platformLabel(release) }));
    } catch (error) {
    toast.error(this.$t('agents.list.updates.feedback.uploadFailed', { error: error?.message || this.$t('common.errors.unknown') }));
      } finally {
      this.releaseUploading = false;
      this.releaseUploadProgress = 0;
      }
  },
  async deleteRelease(release) {
    try {
    await confirmAction(
      this.$t('agents.list.updates.feedback.deleteConfirm', { version: release.version, platform: this.platformLabel(release) }),
      this.$t('agents.list.updates.feedback.deleteTitle'),
      { confirmButtonText: this.$t('agents.list.updates.delete'), cancelButtonText: this.$t('common.actions.cancel'), type: 'warning' }
    );
    await agentsV2API.deleteRelease(release.id);
    await Promise.all([this.fetchReleases(), this.fetchAgentList()]);
    toast.success(this.$t('agents.list.updates.feedback.deleted'));
    } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      toast.error(this.$t('agents.list.updates.feedback.deleteFailed', { error: error?.message || this.$t('common.errors.unknown') }));
    }
    }
  },
  async upgradeAgent(agent) {
    if (!this.canUpgradeAgent(agent) || this.upgradingAgents[agent.id]) return;
    const update = this.agentUpdate(agent);
    try {
    await confirmAction(
      this.$t('agents.list.updates.feedback.upgradeConfirm', { name: this.machineName(agent), current: agent.version, version: update.latestVersion }),
      this.$t('agents.list.updates.feedback.upgradeTitle'),
      { confirmButtonText: this.$t('agents.list.updates.upgrade'), cancelButtonText: this.$t('common.actions.cancel') }
    );
    this.upgradingAgents[agent.id] = true;
    const job = await agentsV2API.upgrade(agent.id, update.release.id);
    await waitForV2Job(job, 480000);
    await this.fetchAgentList();
    toast.success(this.$t('agents.list.updates.feedback.upgraded', { name: this.machineName(agent), version: update.latestVersion }));
    } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      toast.error(this.$t('agents.list.updates.feedback.upgradeFailed', { error: error?.message || this.$t('common.errors.unknown') }));
    }
    } finally {
    delete this.upgradingAgents[agent.id];
    }
  },
  platformLabel(value) {
    const os = String(value?.os || '').toLowerCase();
    const platform = os === 'darwin' || os === 'macos' ? 'macOS' : os === 'linux' ? 'Linux' : os === 'windows' ? 'Windows' : (os || this.$t('agents.list.values.notAvailable'));
    return `${platform} / ${value?.arch || this.$t('agents.list.values.notAvailable')}`;
  },
    async fetchRuntimeTargets() {
      const sequence = ++this.runtimeRequestSequence;
      this.runtimeLoadFailure = null;
      try {
        const value = await runtimeTargetsV2API.list();
        if (sequence !== this.runtimeRequestSequence) return false;
        this.runtimeTargetList = Array.isArray(value.items) ? value.items : [];
        this.runtimeByAgent = Object.fromEntries(
          this.runtimeTargetList.filter(item => item.kind === 'agent').map(item => [item.agentId, item])
        );
        this.revealManagementTarget(false);
        return true;
      } catch (error) {
        if (sequence !== this.runtimeRequestSequence) return false;
        this.runtimeLoadFailure = this.failureState('agents.list.feedback.runtimeLoadFailed', error);
        return false;
      }
    },
    async fetchLocalSystemStatus() {
      const sequence = this.agentRequestSequence;
      if (!this.localRuntimeTarget) {
        this.localSystemStatus = {};
        return true;
      }
      try {
        const status = await systemV2API.status();
        if (sequence !== this.agentRequestSequence) return false;
        this.localSystemStatus = status;
        return true;
      } catch {
        if (sequence !== this.agentRequestSequence) return false;
        this.localSystemStatus = { ...this.localSystemStatus, stale: true };
        return false;
      }
    },

    async fetchInventory(agent) {
      if (!this.runtimeFor(agent).configured || this.isOldAgent(agent)) return false;
      const sequence = (this.inventoryRequestSequences[agent.id] || 0) + 1;
      this.inventoryRequestSequences[agent.id] = sequence;
      this.inventoryLoading[agent.id] = true;
      this.inventoryFailures[agent.id] = '';
      try {
        const inventory = await agentsV2API.inventory(agent.id);
        if (sequence !== this.inventoryRequestSequences[agent.id]) return false;
        this.inventories[agent.id] = inventory;
        return true;
      } catch (error) {
        if (sequence !== this.inventoryRequestSequences[agent.id]) return false;
        if (error?.status === 404) {
          delete this.inventories[agent.id];
          return true;
        } else {
          this.inventoryFailures[agent.id] = error?.message || this.$t('common.errors.unknown');
        }
        return false;
      } finally {
        if (sequence === this.inventoryRequestSequences[agent.id]) this.inventoryLoading[agent.id] = false;
      }
    },
    async refreshInventory(agent, options = {}) {
      if (!this.canRefreshInventory(agent) || this.inventoryRefreshing[agent.id]) return;
      this.inventoryRefreshing[agent.id] = true;
      try {
        const job = await agentsV2API.refreshInventory(agent.id);
        await waitForV2Job(job, 45000);
        const refreshed = await this.fetchInventory(agent);
        if (refreshed && options.announceSuccess !== false) toast.success(this.$t('agents.list.feedback.inventoryRefreshed', { name: agent.hostname }));
        else if (!refreshed) toast.warning(this.$t('agents.list.feedback.inventoryRefreshedLoadFailed', { name: agent.hostname }));
      } catch (error) {
        toast.error(this.$t('agents.list.feedback.inventoryRefreshFailed', {
          error: error?.message || this.$t('common.errors.unknown')
        }));
      } finally {
        this.inventoryRefreshing[agent.id] = false;
      }
    },
    runtimeFor(agent) {
      return this.runtimeByAgent[agent.id] || { configured: false, status: 'configuration_required', config: {} };
    },

    handleManagementScopeChange(event) {
      this.managementScope = event?.detail || getManagementScope();
      this.revealManagementTarget(true);
    },
    revealManagementTarget(smooth) {
      if (this.managementScope.kind !== MANAGEMENT_SCOPE_TARGET || !this.managementScope.targetId) return;
      this.$nextTick(() => {
        const row = Array.from(this.$el?.querySelectorAll?.('[data-machine-target-id]') || [])
          .find(element => element.dataset.machineTargetId === this.managementScope.targetId);
        row?.scrollIntoView?.({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest' });
      });
    },

    machineName(agent) {
      return this.runtimeFor(agent).name || agent.display_name || agent.hostname || this.$t('agents.list.values.unknownNode');
    },

    openRename(target) {
      if (!target?.id) return;
      this.renameTarget = target;
      this.renameForm = { displayName: target.name || target.hostname || '' };
      this.renameError = '';
      this.renameVisible = true;
    },
    async saveMachineName() {
      if (!this.renameTarget || this.renameSaving) return;
      const displayName = this.renameForm.displayName.trim();
      const containsControlCharacter = Array.from(displayName).some(character => {
        const codePoint = character.codePointAt(0);
        return codePoint < 32 || (codePoint >= 127 && codePoint <= 159);
      });
      if (!displayName || Array.from(displayName).length > 100 || containsControlCharacter) {
        this.renameError = 'agents.list.rename.validation';
        return;
      }
      this.renameError = '';
      this.renameSaving = true;
      try {
        const updated = await runtimeTargetsV2API.rename(this.renameTarget.id, displayName);
        this.updateMachineTarget(updated);
        this.renameVisible = false;
        announceRuntimeTargetsUpdated();
        toast.success(this.$t('agents.list.rename.saved', { name: displayName }));
      } catch (error) {
        toast.error(this.$t('agents.list.rename.saveFailed', {
          error: error?.message || this.$t('common.errors.unknown')
        }));
      } finally {
        this.renameSaving = false;
      }
    },

    isOldAgent(agent) {
      return !(agent.capabilities || []).includes(INVENTORY_CAPABILITY);
    },
    canRefreshInventory(agent) {
      return agent.connected && this.runtimeFor(agent).configured && !this.isOldAgent(agent);
    },

    performanceVariant(performance) {
      if (performance?.status === 'incompatible') return 'destructive';
      if (performance?.status === 'ready') return 'secondary';
      return 'outline';
    },
    performanceStatusLabel(performance) {
      const status = ['not_installed', 'detected_unverified', 'incompatible', 'ready'].includes(performance?.status)
        ? performance.status
        : 'not_reported';
      return `LuaJIT · ${this.$t(`agents.list.runtime.performance.statuses.${status}`)}`;
    },
    performanceSummary(performance) {
      const status = ['not_installed', 'detected_unverified', 'incompatible', 'ready'].includes(performance?.status)
        ? performance.status
        : 'not_reported';
      return this.$t(`agents.list.runtime.performance.summaries.${status}`);
    },
    performanceVersionText(performance) {
      if (!performance?.packageVersion && !performance?.gameVersion && !performance?.signatureVersion) return '';
      return this.$t('agents.list.runtime.performance.versions', {
        package: performance.packageVersion || this.$t('agents.list.values.notAvailable'),
        game: performance.gameVersion || this.$t('agents.list.values.notAvailable'),
        signature: performance.signatureVersion || this.$t('agents.list.values.notAvailable')
      });
    },
    performanceIssueText(performance) {
      const known = new Set([
        'server_architecture_unsupported', 'architecture_unsupported', 'platform_not_verified', 'installation_incomplete',
        'injector_wrapper_invalid', 'signature_unreadable', 'game_version_unknown', 'signature_version_mismatch',
        'package_version_unknown', 'binary_hash_unavailable', 'plugin_layout_unverified', 'injector_marker_invalid'
      ]);
      return (performance?.issues || []).map(issue => this.$t(`agents.list.runtime.performance.issues.${known.has(issue) ? issue : 'unknown'}`)).join(' · ');
    },

    openRuntimeConfig(agent) {
      const target = this.runtimeFor(agent);
      this.runtimeAgent = agent;
      this.runtimeConfigured = target.configured;
      this.runtimeErrors = {};
      let form = editableRuntimeConfig(agent, target.config);
      if (agent.installation_registry_supported) {
        let installation = (agent.installations || []).find(item => item.id === form.installationId);
        if (!installation && !target.configured) installation = (agent.installations || [])[0];
        form = installation ? bindAgentRuntimeInstallation(form, installation) : { ...form, installationId: '' };
      }
      this.runtimeForm = form;
      this.runtimeVisible = true;
    },
    selectRuntimeInstallation(installationId) {
      const installation = this.runtimeInstallations.find(item => item.id === installationId);
      if (!installation) {
        this.runtimeForm.installationId = '';
        return;
      }
      this.runtimeForm = bindAgentRuntimeInstallation(this.runtimeForm, installation);
      const remainingErrors = { ...this.runtimeErrors };
      delete remainingErrors.installationId;
      this.runtimeErrors = remainingErrors;
    },
    installationDriverLabel(driver) {
      const key = driver === 'container' ? 'container' : 'native';
      return this.$t(`agents.list.runtime.drivers.${key}`);
    },
    async saveRuntimeConfig() {
      const errors = {};
      if (!this.runtimeForm.installationId.trim() || (this.runtimeRegistrySupported && !this.selectedRuntimeInstallation)) errors.installationId = 'agents.list.validation.installationId';
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
        const configuredAgent = this.runtimeAgent;
        await runtimeTargetsV2API.save(configuredAgent.id, this.runtimeForm);
        this.runtimeVisible = false;
        const refreshed = await this.fetchRuntimeTargets();
        announceRuntimeTargetsUpdated();
        if (refreshed) {
          toast.success(this.$t('agents.list.feedback.runtimeSaved'));
          void this.refreshInventory(configuredAgent, { announceSuccess: false }).then(() => this.$refs.machinePanel?.refresh());
        }
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
      if (platform === 'windows') {
        return { save: 'C:\\Users\\Administrator\\Klei\\DoNotStarveTogether', server: 'C:\\dst-server', backup: 'D:\\dst-backups' }[kind];
      }
      if (platform === 'darwin' || platform === 'macos') {
        return {
          save: '/Users/yourname/Documents/Klei/DoNotStarveTogether',
          server: "/Users/yourname/Library/Application Support/Steam/steamapps/common/Don't Starve Together Dedicated Server",
          backup: '/Users/yourname/dst-backups'
        }[kind];
      }
      return { save: '/opt/dst/saves', server: '/opt/dst/server', backup: '/opt/dst/backups' }[kind];
    },
    navigateToSecurity() {
      this.$router.push('/agents/security');
    },

    navigateToCommand(id) {
      this.$router.push({ path: '/agents/command', query: { id } });
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

    formatBytes(bytes) {
      const value = Number(bytes) || 0;
      if (value <= 0) return '0 B';
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const index = Math.min(sizes.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
      return `${parseFloat((value / Math.pow(1024, index)).toFixed(2))} ${sizes[index]}`;
    },

    formatTime(timestamp) {
      if (!timestamp) return this.$t('agents.list.values.notAvailable');
      const numeric = typeof timestamp === 'string' && /^\d+$/.test(timestamp) ? Number(timestamp) : timestamp;
      const date = typeof numeric === 'number' ? new Date(numeric < 1000000000000 ? numeric * 1000 : numeric) : new Date(numeric);
      const localeState = this.$i18n?.locale;
      const locale = typeof localeState === 'string' ? localeState : (localeState?.value || 'zh-CN');
      return formatSystemDateTime(date, {
        locale,
        fallback: this.$t('agents.list.values.notAvailable')
      });
    },
    failureState(key, error) {
      return { key, detail: String(error?.message || '').trim() };
    },
    localizedFailure(failure) {
      if (!failure) return '';
      const message = this.$t(failure.key);
      return failure.detail ? this.$t('agents.list.feedback.errorWithDetail', { message, detail: failure.detail }) : message;
    }
  }
};
</script>

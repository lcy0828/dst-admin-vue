<template>
  <div class="flex min-w-0 flex-col gap-5">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-normal">{{ $t('agents.list.title') }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ $t('agents.list.subtitle') }}</p>
        <div class="mt-3 flex flex-wrap gap-2" :aria-label="$t('agents.list.metrics.summaryAria')">
          <Badge variant="outline">{{ $t('agents.list.metrics.onlineSummary', { online: connectedAgents, total: totalAgents }) }}</Badge>
          <Badge variant="outline">{{ $t('agents.list.metrics.shardSummary', { count: runningShardsTotal }) }}</Badge>
          <Badge :variant="capacityAlerts > 0 ? 'destructive' : 'secondary'">{{ $t('agents.list.metrics.capacitySummary', { count: capacityAlerts }) }}</Badge>
        </div>
      </div>
      <UiButton variant="outline" :disabled="loading" @click="refreshData">
        <Spinner v-if="loading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        {{ $t('common.actions.refresh') }}
      </UiButton>
    </header>

    <Alert>
      <Cpu />
      <AlertTitle>{{ $t('agents.list.capacity.policyTitle') }}</AlertTitle>
      <AlertDescription>{{ $t('agents.list.capacity.policyDescription') }}</AlertDescription>
    </Alert>

    <KubernetesProviderPanel :heading-level="2" />

    <Alert v-if="loadError" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ $t('agents.list.feedback.loadFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="refreshData">{{ $t('common.actions.retry') }}</UiButton></AlertAction>
    </Alert>
    <Alert v-if="runtimeLoadError" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ $t('agents.list.feedback.runtimeLoadFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ runtimeLoadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="fetchRuntimeTargets">{{ $t('common.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <div v-if="loading && agentList.length === 0" class="flex flex-col gap-2" :aria-label="$t('agents.list.loadingAria')">
      <Skeleton v-for="index in 4" :key="index" class="h-14 w-full" />
    </div>

    <div v-else-if="agentList.length > 0" class="overflow-hidden rounded-lg border">
      <UiTable class="min-w-[1040px]">
        <TableHeader>
          <TableRow>
            <TableHead class="w-10"><span class="sr-only">{{ $t('agents.list.fields.topology') }}</span></TableHead>
            <TableHead>{{ $t('agents.list.fields.node') }}</TableHead>
            <TableHead>{{ $t('agents.list.fields.worldCapacity') }}</TableHead>
            <TableHead>{{ $t('agents.list.fields.cpu') }}</TableHead>
            <TableHead>{{ $t('agents.list.fields.memory') }}</TableHead>
            <TableHead>{{ $t('agents.list.fields.observedAt') }}</TableHead>
            <TableHead class="text-right">{{ $t('agents.list.fields.actions') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-for="agent in agentList" :key="agent.id">
            <TableRow :aria-expanded="isExpanded(agent)">
              <TableCell>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <UiButton
                      size="icon-sm"
                      variant="ghost"
                      :aria-label="isExpanded(agent) ? $t('agents.list.actions.collapseTopology') : $t('agents.list.actions.expandTopology')"
                      @click="toggleExpanded(agent)"
                    >
                      <ChevronDown v-if="isExpanded(agent)" />
                      <ChevronRight v-else />
                    </UiButton>
                  </TooltipTrigger>
                  <TooltipContent>{{ isExpanded(agent) ? $t('agents.list.actions.collapseTopology') : $t('agents.list.actions.expandTopology') }}</TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell>
                <div class="flex min-w-52 items-start gap-2.5">
                  <component :is="getOsIcon(agent.os)" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class="max-w-48 truncate font-medium">{{ agent.hostname || $t('agents.list.values.unknownNode') }}</span>
                      <Badge :variant="agent.connected ? 'secondary' : 'destructive'">{{ agent.connected ? $t('common.states.online') : $t('common.states.offline') }}</Badge>
                      <Badge v-if="isOldAgent(agent)" variant="destructive">{{ $t('agents.list.inventory.upgradeRequired') }}</Badge>
                    </div>
                    <div class="mt-1 max-w-64 truncate font-mono text-xs text-muted-foreground">{{ agent.agent_uuid }}</div>
                    <div class="mt-1 text-xs text-muted-foreground">{{ agent.os || $t('agents.list.values.notAvailable') }} / {{ agent.arch || $t('agents.list.values.notAvailable') }} / v{{ agent.version || $t('agents.list.values.notAvailable') }}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex min-w-44 flex-col gap-1.5">
                  <div class="flex items-center justify-between gap-3">
                    <span class="font-medium tabular-nums">{{ capacityForAgent(agent).runningShards }} / {{ capacityLimit(agent) }}</span>
                    <Badge :variant="capacityVariant(agent)">{{ capacityStateLabel(agent) }}</Badge>
                  </div>
                  <UiProgress
                    :model-value="capacityProgress(agent)"
                    :aria-label="$t('agents.list.capacity.progressAria', { name: agent.hostname })"
                  />
                  <span class="text-xs text-muted-foreground">{{ capacityMessage(agent) }}</span>
                </div>
              </TableCell>
              <TableCell>
                <div class="min-w-32">
                  <div class="font-medium tabular-nums">{{ $t('agents.list.fields.physicalCores', { count: cpuForAgent(agent).physical }) }}</div>
                  <div class="mt-1 text-xs text-muted-foreground">
                    {{ $t('agents.list.fields.logicalProcessors', { count: cpuForAgent(agent).logical }) }}
                    <span v-if="cpuForAgent(agent).estimated"> / {{ $t('agents.list.values.estimated') }}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex min-w-36 flex-col gap-1.5">
                  <div class="flex justify-between gap-2 text-xs tabular-nums">
                    <span>{{ formatBytes(memoryForAgent(agent).used) }}</span>
                    <span class="text-muted-foreground">{{ formatBytes(memoryForAgent(agent).total) }}</span>
                  </div>
                  <UiProgress
                    :model-value="memoryUsage(agent)"
                    :aria-label="$t('agents.list.fields.memoryUsageAria', { name: agent.hostname })"
                  />
                  <span class="text-xs text-muted-foreground">{{ $t('agents.list.fields.memoryAvailable', { value: formatBytes(memoryForAgent(agent).available) }) }}</span>
                </div>
              </TableCell>
              <TableCell>
                <div class="min-w-40">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <Badge :variant="freshnessVariant(agent)">{{ freshnessLabel(agent) }}</Badge>
                    <span v-if="inventoryLoading[agent.id]" class="text-xs text-muted-foreground">{{ $t('agents.list.inventory.loading') }}</span>
                  </div>
                  <div class="mt-1.5 text-xs text-muted-foreground">{{ formatTime(observedAt(agent)) }}</div>
                  <div v-if="staleReason(agent)" class="mt-1 text-xs text-muted-foreground">{{ staleReasonLabel(agent) }}</div>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex min-w-48 justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <span>
                        <UiButton
                          size="icon-sm"
                          variant="ghost"
                          :disabled="!canRefreshInventory(agent) || inventoryRefreshing[agent.id]"
                          :aria-label="$t('agents.list.actions.refreshInventory')"
                          @click="refreshInventory(agent)"
                        >
                          <Spinner v-if="inventoryRefreshing[agent.id]" />
                          <RefreshCw v-else />
                        </UiButton>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{{ inventoryActionHint(agent) }}</TooltipContent>
                  </Tooltip>
                  <Tooltip><TooltipTrigger as-child><UiButton size="icon-sm" variant="ghost" :aria-label="$t('agents.list.actions.details')" @click="showAgentDetails(agent)"><Eye /></UiButton></TooltipTrigger><TooltipContent>{{ $t('agents.list.actions.details') }}</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger as-child><UiButton size="icon-sm" :variant="runtimeFor(agent).configured ? 'ghost' : 'outline'" :disabled="Boolean(runtimeLoadError)" :aria-label="runtimeFor(agent).configured ? $t('agents.list.actions.runtimeConfig') : $t('agents.list.actions.configureRuntime')" @click="openRuntimeConfig(agent)"><Settings /></UiButton></TooltipTrigger><TooltipContent>{{ runtimeFor(agent).configured ? $t('agents.list.actions.runtimeConfig') : $t('agents.list.actions.configureRuntime') }}</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger as-child><span><UiButton size="icon-sm" variant="ghost" :disabled="!agent.connected" :aria-label="$t('agents.list.actions.executeCommand')" @click="navigateToCommand(agent.id)"><Terminal /></UiButton></span></TooltipTrigger><TooltipContent>{{ $t('agents.list.actions.executeCommand') }}</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger as-child><span><UiButton size="icon-sm" variant="ghost" :disabled="agent.connected" :aria-label="$t('agents.list.actions.remove')" @click="forgetAgent(agent)"><Trash2 /></UiButton></span></TooltipTrigger><TooltipContent>{{ $t('agents.list.actions.remove') }}</TooltipContent></Tooltip>
                </div>
              </TableCell>
            </TableRow>

            <TableRow v-if="isExpanded(agent)" class="hover:bg-transparent">
              <TableCell colspan="7" class="bg-muted/20 p-4 whitespace-normal">
                <div class="flex min-w-0 flex-col gap-4">
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 class="font-medium">{{ $t('agents.list.topology.title', { name: agent.hostname }) }}</h2>
                      <p class="text-xs text-muted-foreground">{{ $t('agents.list.topology.description') }}</p>
                    </div>
                    <Badge :variant="runtimeFor(agent).configured ? 'outline' : 'destructive'">{{ runtimeFor(agent).configured ? $t('agents.list.inventory.configured') : $t('agents.list.inventory.notConfigured') }}</Badge>
                  </div>

                  <Alert v-if="isOldAgent(agent)" variant="destructive">
                    <TriangleAlert />
                    <AlertTitle>{{ $t('agents.list.inventory.oldAgentTitle') }}</AlertTitle>
                    <AlertDescription>{{ $t('agents.list.inventory.oldAgentDescription') }}</AlertDescription>
                  </Alert>
                  <Alert v-else-if="inventoryFailure(agent)" variant="destructive">
                    <CircleAlert />
                    <AlertTitle>{{ $t('agents.list.inventory.loadFailedTitle') }}</AlertTitle>
                    <AlertDescription>{{ inventoryFailure(agent) }}</AlertDescription>
                  </Alert>
                  <Alert v-else-if="!runtimeFor(agent).configured">
                    <Settings />
                    <AlertTitle>{{ $t('agents.list.inventory.notConfiguredTitle') }}</AlertTitle>
                    <AlertDescription>{{ $t('agents.list.inventory.notConfiguredDescription') }}</AlertDescription>
                    <AlertAction><UiButton size="sm" variant="outline" @click="openRuntimeConfig(agent)">{{ $t('agents.list.actions.configureRuntime') }}</UiButton></AlertAction>
                  </Alert>
                  <Alert v-else-if="!inventoryFor(agent)">
                    <Clock3 />
                    <AlertTitle>{{ $t('agents.list.inventory.waitingTitle') }}</AlertTitle>
                    <AlertDescription>{{ $t('agents.list.inventory.waitingDescription') }}</AlertDescription>
                  </Alert>

                  <template v-if="inventoryFor(agent)">
                    <dl class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div><dt class="text-xs text-muted-foreground">{{ $t('agents.list.fields.installation') }}</dt><dd class="mt-1 font-medium">{{ installationFor(agent).display_name || $t('agents.list.values.notAvailable') }}</dd></div>
                      <div><dt class="text-xs text-muted-foreground">{{ $t('agents.list.fields.savePath') }}</dt><dd class="mt-1 break-all font-mono text-xs">{{ installationFor(agent).save_path || $t('agents.list.values.notAvailable') }} <Badge :variant="installationFor(agent).save_path_ok ? 'secondary' : 'destructive'">{{ installationFor(agent).save_path_ok ? $t('agents.list.values.available') : $t('agents.list.values.missing') }}</Badge></dd></div>
                      <div><dt class="text-xs text-muted-foreground">{{ $t('agents.list.fields.serverPath') }}</dt><dd class="mt-1 break-all font-mono text-xs">{{ installationFor(agent).server_path || $t('agents.list.values.notAvailable') }} <Badge :variant="installationFor(agent).server_path_ok ? 'secondary' : 'destructive'">{{ installationFor(agent).server_path_ok ? $t('agents.list.values.available') : $t('agents.list.values.missing') }}</Badge></dd></div>
                      <div><dt class="text-xs text-muted-foreground">{{ $t('agents.list.fields.inventoryReceivedAt') }}</dt><dd class="mt-1">{{ formatTime(inventoryFor(agent).receivedAt) }}</dd></div>
                    </dl>

                    <Alert v-for="(warning, index) in inventoryWarnings(agent)" :key="index">
                      <TriangleAlert />
                      <AlertTitle>{{ $t('agents.list.inventory.warningTitle') }}</AlertTitle>
                      <AlertDescription>{{ warning }}</AlertDescription>
                    </Alert>

                    <Empty v-if="inventoryRooms(agent).length === 0">
                      <EmptyHeader><EmptyMedia variant="icon"><Layers3 /></EmptyMedia><EmptyTitle>{{ $t('agents.list.topology.emptyTitle') }}</EmptyTitle><EmptyDescription>{{ $t('agents.list.topology.emptyDescription') }}</EmptyDescription></EmptyHeader>
                    </Empty>

                    <div v-else class="flex flex-col gap-5">
                      <section v-for="(room, roomIndex) in inventoryRooms(agent)" :key="room.directory" class="flex min-w-0 flex-col gap-2">
                        <Separator v-if="roomIndex > 0" />
                        <div class="flex flex-wrap items-center gap-2">
                          <Server class="size-4 text-muted-foreground" />
                          <h3 class="font-medium">{{ room.name || room.directory }}</h3>
                          <Badge variant="outline">{{ room.directory }}</Badge>
                          <span class="text-xs text-muted-foreground">{{ $t('agents.list.fields.masterPort', { port: room.master_port || $t('agents.list.values.notAvailable') }) }}</span>
                          <Badge :variant="room.cluster_key_set ? 'secondary' : 'destructive'">{{ room.cluster_key_set ? $t('agents.list.values.clusterKeyReady') : $t('agents.list.values.clusterKeyMissing') }}</Badge>
                        </div>
                        <div class="overflow-hidden rounded-md border bg-background">
                          <UiTable class="min-w-[760px]">
                            <TableHeader><TableRow><TableHead>{{ $t('agents.list.fields.shard') }}</TableHead><TableHead>{{ $t('agents.list.fields.role') }}</TableHead><TableHead>{{ $t('agents.list.fields.ports') }}</TableHead><TableHead>{{ $t('agents.list.fields.process') }}</TableHead><TableHead>{{ $t('agents.list.fields.processResources') }}</TableHead></TableRow></TableHeader>
                            <TableBody>
                              <TableRow v-for="shard in room.shards" :key="shard.directory">
                                <TableCell><div class="font-medium">{{ shard.name || shard.directory }}</div><div class="mt-1 font-mono text-xs text-muted-foreground">{{ shard.directory }}<span v-if="shard.id"> / ID {{ shard.id }}</span></div></TableCell>
                                <TableCell><Badge variant="outline">{{ roleLabel(shard.role) }}</Badge></TableCell>
                                <TableCell class="text-xs">{{ portText(shard) }}</TableCell>
                                <TableCell><template v-if="processFor(agent, room, shard)"><Badge variant="secondary">{{ $t('agents.list.values.running') }}</Badge><span class="ml-2 font-mono text-xs">PID {{ processFor(agent, room, shard).pid }}</span></template><Badge v-else variant="outline">{{ $t('agents.list.values.stopped') }}</Badge></TableCell>
                                <TableCell class="text-xs tabular-nums">{{ processResourceText(processFor(agent, room, shard)) }}</TableCell>
                              </TableRow>
                            </TableBody>
                          </UiTable>
                        </div>
                      </section>
                    </div>
                  </template>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </UiTable>
    </div>

    <Empty v-else>
      <EmptyHeader><EmptyMedia variant="icon"><Network /></EmptyMedia><EmptyTitle>{{ $t('agents.list.empty.title') }}</EmptyTitle><EmptyDescription>{{ $t('agents.list.empty.description') }}</EmptyDescription></EmptyHeader>
      <EmptyContent><UiButton @click="navigateToSecurity">{{ $t('agents.list.empty.add') }}</UiButton></EmptyContent>
    </Empty>

    <UiDialog v-model:open="detailVisible">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{{ $t('agents.list.details.title') }}</DialogTitle><DialogDescription>{{ $t('agents.list.details.description') }}</DialogDescription></DialogHeader>
        <dl v-if="selectedAgent" class="grid overflow-hidden rounded-md border sm:grid-cols-2">
          <div class="border-b p-3 sm:col-span-2"><dt class="text-xs text-muted-foreground">UUID</dt><dd class="mt-1 break-all font-mono text-xs">{{ selectedAgent.agent_uuid }}</dd></div>
          <div class="border-b p-3 sm:border-r"><dt class="text-xs text-muted-foreground">{{ $t('agents.list.details.hostname') }}</dt><dd class="mt-1">{{ selectedAgent.hostname || $t('agents.list.values.notAvailable') }}</dd></div>
          <div class="border-b p-3"><dt class="text-xs text-muted-foreground">{{ $t('common.fields.status') }}</dt><dd class="mt-1">{{ selectedAgent.connected ? $t('common.states.online') : $t('common.states.offline') }}</dd></div>
          <div class="border-b p-3 sm:border-r"><dt class="text-xs text-muted-foreground">{{ $t('agents.list.fields.system') }}</dt><dd class="mt-1">{{ selectedAgent.os || $t('agents.list.values.notAvailable') }} / {{ selectedAgent.arch || $t('agents.list.values.notAvailable') }}</dd></div>
          <div class="border-b p-3"><dt class="text-xs text-muted-foreground">{{ $t('agents.list.details.version') }}</dt><dd class="mt-1">{{ selectedAgent.version || $t('agents.list.values.notAvailable') }}</dd></div>
          <div class="border-b p-3 sm:border-r"><dt class="text-xs text-muted-foreground">{{ $t('agents.list.fields.lastHeartbeat') }}</dt><dd class="mt-1">{{ formatTime(selectedAgent.last_heartbeat) }}</dd></div>
          <div class="border-b p-3"><dt class="text-xs text-muted-foreground">{{ $t('agents.list.fields.uptime') }}</dt><dd class="mt-1">{{ formatUptime(selectedAgent.uptime_seconds) }}</dd></div>
          <div class="border-b p-3 sm:col-span-2"><dt class="text-xs text-muted-foreground">{{ $t('agents.list.fields.ipAddress') }}</dt><dd class="mt-1 break-all">{{ (selectedAgent.ip_addresses || []).join(', ') || $t('agents.list.values.notAvailable') }}</dd></div>
          <div class="p-3 sm:col-span-2"><dt class="text-xs text-muted-foreground">{{ $t('agents.list.details.capabilities') }}</dt><dd class="mt-1 break-all text-xs">{{ (selectedAgent.capabilities || []).join(', ') || $t('agents.list.values.notAvailable') }}</dd></div>
        </dl>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="runtimeVisible">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{{ $t('agents.list.runtime.title') }}</DialogTitle><DialogDescription>{{ $t('agents.list.runtime.description') }}</DialogDescription></DialogHeader>
        <div v-if="runtimeAgent" class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-baseline gap-2"><strong class="truncate">{{ runtimeAgent.hostname }}</strong><span class="text-xs text-muted-foreground">{{ runtimeAgent.os }} {{ runtimeAgent.arch }}</span></div>
          <Badge variant="outline">{{ $t('agents.list.runtime.scope') }}</Badge>
        </div>
        <FieldGroup class="grid gap-4 sm:grid-cols-2">
          <Field :data-invalid="Boolean(runtimeErrors.displayName)"><FieldLabel for="runtime-name">{{ $t('agents.list.runtime.displayName') }}</FieldLabel><UiInput id="runtime-name" v-model="runtimeForm.displayName" maxlength="100" :aria-invalid="Boolean(runtimeErrors.displayName)" /><FieldError v-if="runtimeErrors.displayName">{{ $t(runtimeErrors.displayName) }}</FieldError></Field>
          <Field><FieldLabel>{{ $t('agents.list.runtime.serverMode') }}</FieldLabel><ToggleGroup v-model="runtimeForm.serverMode" type="single"><ToggleGroupItem value="64">{{ $t('agents.list.runtime.mode64') }}</ToggleGroupItem><ToggleGroupItem value="32">{{ $t('agents.list.runtime.mode32') }}</ToggleGroupItem><ToggleGroupItem value="luajit">LuaJIT</ToggleGroupItem></ToggleGroup></Field>
          <Field class="sm:col-span-2" :data-invalid="Boolean(runtimeErrors.savePath)"><FieldLabel for="runtime-save">{{ $t('agents.list.runtime.savePath') }}</FieldLabel><UiInput id="runtime-save" v-model="runtimeForm.savePath" :placeholder="pathPlaceholder('save')" :aria-invalid="Boolean(runtimeErrors.savePath)" /><FieldError v-if="runtimeErrors.savePath">{{ $t(runtimeErrors.savePath) }}</FieldError></Field>
          <Field class="sm:col-span-2" :data-invalid="Boolean(runtimeErrors.serverPath)"><FieldLabel for="runtime-server">{{ $t('agents.list.runtime.serverPath') }}</FieldLabel><UiInput id="runtime-server" v-model="runtimeForm.serverPath" :placeholder="pathPlaceholder('server')" :aria-invalid="Boolean(runtimeErrors.serverPath)" /><FieldError v-if="runtimeErrors.serverPath">{{ $t(runtimeErrors.serverPath) }}</FieldError></Field>
          <Field class="sm:col-span-2"><FieldLabel for="runtime-backup">{{ $t('agents.list.runtime.backupPath') }}</FieldLabel><UiInput id="runtime-backup" v-model="runtimeForm.backupPath" :placeholder="pathPlaceholder('backup')" /></Field>
          <Accordion type="single" collapsible class="sm:col-span-2"><AccordionItem value="advanced"><AccordionTrigger>{{ $t('agents.list.runtime.advanced') }}</AccordionTrigger><AccordionContent><FieldGroup>
            <Field><FieldLabel for="runtime-ugc">{{ $t('agents.list.runtime.ugcPath') }}</FieldLabel><UiInput id="runtime-ugc" v-model="runtimeForm.ugcPath" /></Field>
            <Field><FieldLabel for="runtime-steamcmd">{{ $t('agents.list.runtime.steamcmdPath') }}</FieldLabel><UiInput id="runtime-steamcmd" v-model="runtimeForm.steamcmdPath" /></Field>
            <Field><FieldLabel for="runtime-workshop">{{ $t('agents.list.runtime.workshopPath') }}</FieldLabel><UiInput id="runtime-workshop" v-model="runtimeForm.workshopContentPath" /></Field>
            <Field><FieldLabel for="runtime-lua">{{ $t('agents.list.runtime.luaCommand') }}</FieldLabel><UiInput id="runtime-lua" v-model="runtimeForm.luaBinary" placeholder="lua" /></Field>
            <Field><FieldLabel for="runtime-lua-fallback">{{ $t('agents.list.runtime.luaFallbackPath') }}</FieldLabel><UiInput id="runtime-lua-fallback" v-model="runtimeForm.luaFallbackPath" /></Field>
          </FieldGroup></AccordionContent></AccordionItem></Accordion>
        </FieldGroup>
        <DialogFooter class="flex-wrap sm:justify-end">
          <UiButton v-if="runtimeConfigured" class="sm:mr-auto" variant="destructive" @click="removeRuntimeConfig">{{ $t('agents.list.runtime.removeConfig') }}</UiButton>
          <UiButton variant="outline" @click="runtimeVisible = false">{{ $t('common.actions.cancel') }}</UiButton>
          <UiButton :disabled="runtimeSaving" @click="saveRuntimeConfig"><Spinner v-if="runtimeSaving" data-icon="inline-start" />{{ $t('agents.list.runtime.saveConfig') }}</UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import {
  Apple, ChevronDown, ChevronRight, CircleAlert, Clock3, Cpu, Eye, Layers3, Monitor,
  Network, RefreshCw, Server, Settings, Terminal, Trash2, TriangleAlert
} from '@lucide/vue';
import { toast } from 'vue-sonner';
import { agentApi } from '@/api/index';
import { agentsV2API, runtimeTargetsV2API } from '@/api/v2';
import { waitForV2Job } from '@/api/v2ConfigurationAdapters';
import KubernetesProviderPanel from '@/components/runtime/KubernetesProviderPanel.vue';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Progress as UiProgress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { confirmAction } from '@/lib/feedback';
import { announceRuntimeTargetsUpdated } from '@/utils/runtimeTarget';

const INVENTORY_CAPABILITY = 'runtime.inventory.read';

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
  return Object.fromEntries(Object.keys(defaults).map(key => [key, config[key] ?? defaults[key]]));
};

export default {
  name: 'AgentList',
  components: {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger, Alert, AlertAction, AlertDescription,
    AlertTitle, Apple, Badge, ChevronDown, ChevronRight, CircleAlert, Clock3, Cpu, DialogContent,
    DialogDescription, DialogFooter, DialogHeader, DialogTitle, Empty, EmptyContent, EmptyDescription,
    EmptyHeader, EmptyMedia, EmptyTitle, Eye, Field, FieldError, FieldGroup, FieldLabel, Layers3,
    KubernetesProviderPanel, Monitor, Network, RefreshCw, Separator, Server, Settings, Skeleton, Spinner, UiTable, TableBody,
    TableCell, TableHead, TableHeader, TableRow, Terminal, ToggleGroup, ToggleGroupItem, Tooltip,
    TooltipContent, TooltipTrigger, Trash2, TriangleAlert, UiButton, UiDialog, UiInput, UiProgress
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
      expandedAgents: {},
      detailVisible: false,
      selectedAgent: null,
      runtimeByAgent: {},
      runtimeVisible: false,
      runtimeSaving: false,
      runtimeConfigured: false,
      runtimeAgent: null,
      runtimeForm: emptyRuntimeConfig(),
      runtimeErrors: {},
      agentRequestSequence: 0,
      runtimeRequestSequence: 0,
      inventoryRequestSequences: {}
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
    runningShardsTotal() {
      return this.agentList.reduce((total, agent) => total + this.capacityForAgent(agent).runningShards, 0);
    },
    capacityAlerts() {
      return this.agentList.filter(agent => ['full', 'overcommitted'].includes(this.capacityForAgent(agent).state)).length;
    }
  },
  created() {
    this.fetchAgentList();
  },
  methods: {
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
        await this.fetchInventories();
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
    async fetchRuntimeTargets() {
      const sequence = ++this.runtimeRequestSequence;
      this.runtimeLoadFailure = null;
      try {
        const value = await runtimeTargetsV2API.list();
        if (sequence !== this.runtimeRequestSequence) return false;
        this.runtimeByAgent = Object.fromEntries(
          (value.items || []).filter(item => item.kind === 'agent').map(item => [item.agentId, item])
        );
        return true;
      } catch (error) {
        if (sequence !== this.runtimeRequestSequence) return false;
        this.runtimeLoadFailure = this.failureState('agents.list.feedback.runtimeLoadFailed', error);
        return false;
      }
    },
    async fetchInventories() {
      await Promise.all(this.agentList.map(agent => {
        if (!this.runtimeFor(agent).configured || this.isOldAgent(agent)) return Promise.resolve();
        return this.fetchInventory(agent);
      }));
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
    async refreshInventory(agent) {
      if (!this.canRefreshInventory(agent) || this.inventoryRefreshing[agent.id]) return;
      this.inventoryRefreshing[agent.id] = true;
      try {
        const job = await agentsV2API.refreshInventory(agent.id);
        await waitForV2Job(job, 45000);
        const refreshed = await this.fetchInventory(agent);
        if (refreshed) toast.success(this.$t('agents.list.feedback.inventoryRefreshed', { name: agent.hostname }));
        else toast.warning(this.$t('agents.list.feedback.inventoryRefreshedLoadFailed', { name: agent.hostname }));
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
    inventoryFor(agent) {
      return this.inventories[agent.id] || null;
    },
    inventoryFailure(agent) {
      return this.inventoryFailures[agent.id] || '';
    },
    isOldAgent(agent) {
      return !(agent.capabilities || []).includes(INVENTORY_CAPABILITY);
    },
    canRefreshInventory(agent) {
      return agent.connected && this.runtimeFor(agent).configured && !this.isOldAgent(agent);
    },
    inventoryActionHint(agent) {
      if (!agent.connected) return this.$t('agents.list.inventory.agentOffline');
      if (!this.runtimeFor(agent).configured) return this.$t('agents.list.inventory.configureFirst');
      if (this.isOldAgent(agent)) return this.$t('agents.list.inventory.upgradeFirst');
      return this.$t('agents.list.actions.refreshInventory');
    },
    capacityForAgent(agent) {
      const capacity = this.inventoryFor(agent)?.capacity || agent.capacity || {};
      return {
        state: capacity.state || 'unknown',
        physicalCores: Number(capacity.physicalCores) || 0,
        logicalProcessors: Number(capacity.logicalProcessors) || 0,
        physicalCoreEstimated: Boolean(capacity.physicalCoreEstimated),
        reservedPhysicalCores: Number(capacity.reservedPhysicalCores) || 0,
        recommendedShardLimit: Number(capacity.recommendedShardLimit) || 0,
        runningShards: Number(capacity.runningShards ?? agent.running_shard_count) || 0,
        availableSlots: Number(capacity.availableSlots) || 0
      };
    },
    capacityLimit(agent) {
      return this.capacityForAgent(agent).recommendedShardLimit || this.$t('agents.list.values.unknown');
    },
    capacityVariant(agent) {
      const state = this.capacityForAgent(agent).state;
      if (state === 'overcommitted') return 'destructive';
      if (state === 'full') return 'secondary';
      return 'outline';
    },
    capacityStateLabel(agent) {
      const state = this.capacityForAgent(agent).state;
      return this.$t(`agents.list.capacity.states.${['available', 'full', 'overcommitted'].includes(state) ? state : 'unknown'}`);
    },
    capacityMessage(agent) {
      const capacity = this.capacityForAgent(agent);
      if (!capacity.recommendedShardLimit || capacity.state === 'unknown') return this.$t('agents.list.capacity.unknown');
      return this.$t(`agents.list.capacity.${capacity.state}`, {
        running: capacity.runningShards,
        limit: capacity.recommendedShardLimit,
        available: capacity.availableSlots,
        reserved: capacity.reservedPhysicalCores
      });
    },
    capacityProgress(agent) {
      const capacity = this.capacityForAgent(agent);
      if (!capacity.recommendedShardLimit) return 0;
      return Math.min(100, Math.round((capacity.runningShards / capacity.recommendedShardLimit) * 100));
    },
    cpuForAgent(agent) {
      const cpu = this.inventoryFor(agent)?.inventory?.cpu;
      if (cpu) {
        return {
          physical: Number(cpu.physical_cores) || 0,
          logical: Number(cpu.logical_processors) || 0,
          estimated: Boolean(cpu.physical_core_estimated)
        };
      }
      const capacity = this.capacityForAgent(agent);
      return {
        physical: capacity.physicalCores || Number(agent.physical_cores) || 0,
        logical: capacity.logicalProcessors || Number(agent.logical_processors) || Number(agent.cpu_count) || 0,
        estimated: capacity.physicalCoreEstimated || Boolean(agent.physical_core_estimated)
      };
    },
    memoryForAgent(agent) {
      const memory = this.inventoryFor(agent)?.inventory?.memory;
      if (memory) {
        return {
          used: Number(memory.used_bytes) || 0,
          total: Number(memory.total_bytes) || 0,
          available: Number(memory.available_bytes) || 0
        };
      }
      return {
        used: Number(agent.memory?.allocated) || 0,
        total: Number(agent.memory?.system) || 0,
        available: Number(agent.memory?.available) || 0
      };
    },
    memoryUsage(agent) {
      const memory = this.memoryForAgent(agent);
      return memory.total > 0 ? Math.min(100, Math.round((memory.used / memory.total) * 100)) : 0;
    },
    observedAt(agent) {
      return this.inventoryFor(agent)?.observedAt || agent.metrics_observed_at || agent.last_report_at;
    },
    staleReason(agent) {
      return this.inventoryFor(agent)?.staleReason || agent.stale_reason || '';
    },
    staleReasonLabel(agent) {
      const reason = this.staleReason(agent);
      const known = ['agent_offline', 'clock_skew', 'report_expired', 'report_missing'];
      return this.$t(`agents.list.inventory.staleReasons.${known.includes(reason) ? reason : 'unknown'}`);
    },
    freshnessVariant(agent) {
      if (this.isOldAgent(agent) || !this.runtimeFor(agent).configured) return 'outline';
      if (this.inventoryFor(agent)?.stale || agent.metrics_stale) return 'destructive';
      return this.inventoryFor(agent) ? 'secondary' : 'outline';
    },
    freshnessLabel(agent) {
      if (this.isOldAgent(agent)) return this.$t('agents.list.inventory.upgradeRequired');
      if (!this.runtimeFor(agent).configured) return this.$t('agents.list.inventory.notConfigured');
      if (this.inventoryFor(agent)?.stale || agent.metrics_stale) return this.$t('agents.list.inventory.stale');
      return this.inventoryFor(agent) ? this.$t('agents.list.inventory.current') : this.$t('agents.list.inventory.waiting');
    },
    isExpanded(agent) {
      return Boolean(this.expandedAgents[agent.id]);
    },
    toggleExpanded(agent) {
      this.expandedAgents[agent.id] = !this.expandedAgents[agent.id];
    },
    installationFor(agent) {
      return this.inventoryFor(agent)?.inventory?.installation || {};
    },
    inventoryRooms(agent) {
      return this.inventoryFor(agent)?.inventory?.rooms || [];
    },
    inventoryWarnings(agent) {
      return this.inventoryFor(agent)?.inventory?.warnings || [];
    },
    processFor(agent, room, shard) {
      const processes = this.inventoryFor(agent)?.inventory?.processes || [];
      const roomNames = new Set([room.directory, room.name].filter(Boolean));
      const shardNames = new Set([shard.directory, shard.name].filter(Boolean));
      return processes.find(process => roomNames.has(process.cluster) && shardNames.has(process.shard)) || null;
    },
    roleLabel(role) {
      const normalized = ['master', 'secondary'].includes(role) ? role : 'unknown';
      return this.$t(`agents.list.topology.roles.${normalized}`);
    },
    portText(shard) {
      const ports = [];
      if (shard.server_port) ports.push(this.$t('agents.list.topology.serverPort', { port: shard.server_port }));
      if (shard.master_server_port) ports.push(this.$t('agents.list.topology.masterServerPort', { port: shard.master_server_port }));
      if (shard.authentication_port) ports.push(this.$t('agents.list.topology.authenticationPort', { port: shard.authentication_port }));
      return ports.join(' / ') || this.$t('agents.list.values.notAvailable');
    },
    processResourceText(process) {
      if (!process) return this.$t('agents.list.values.notAvailable');
      return this.$t('agents.list.topology.processResources', {
        cpu: Number(process.cpu_percent || 0).toFixed(1),
        memory: this.formatBytes(process.rss_bytes)
      });
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
      return { save: '/srv/dst/DoNotStarveTogether', server: '/srv/dst/server', backup: '/srv/dst/backups' }[kind];
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
      if (String(os || '').toLowerCase().match(/mac|darwin/)) return Apple;
      return Monitor;
    },
    formatBytes(bytes) {
      const value = Number(bytes) || 0;
      if (value <= 0) return '0 B';
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const index = Math.min(sizes.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
      return `${parseFloat((value / Math.pow(1024, index)).toFixed(2))} ${sizes[index]}`;
    },
    formatUptime(seconds) {
      if (!seconds) return this.$t('agents.list.values.notAvailable');
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (days > 0) return this.$t('agents.list.duration.daysHours', { days, hours });
      if (hours > 0) return this.$t('agents.list.duration.hoursMinutes', { hours, minutes });
      return this.$t('agents.list.duration.minutes', { minutes });
    },
    formatTime(timestamp) {
      if (!timestamp) return this.$t('agents.list.values.notAvailable');
      const numeric = typeof timestamp === 'string' && /^\d+$/.test(timestamp) ? Number(timestamp) : timestamp;
      const date = typeof numeric === 'number' ? new Date(numeric < 1000000000000 ? numeric * 1000 : numeric) : new Date(numeric);
      const localeState = this.$i18n?.locale;
      const locale = typeof localeState === 'string' ? localeState : (localeState?.value || 'zh-CN');
      return Number.isNaN(date.getTime()) ? this.$t('agents.list.values.notAvailable') : date.toLocaleString(locale);
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

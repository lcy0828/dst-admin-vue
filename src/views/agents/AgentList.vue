<template>
  <div class="flex min-w-0 flex-col gap-5">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-normal">{{ $t('agents.list.title') }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ $t('agents.list.subtitle') }}</p>
        <div class="mt-3 flex flex-wrap gap-2" :aria-label="$t('agents.list.metrics.summaryAria')">
          <Badge variant="outline">{{ $t('agents.list.metrics.onlineSummary', { online: onlineMachines, total: totalMachines }) }}</Badge>
          <Badge variant="outline">{{ $t('agents.list.metrics.shardSummary', { count: runningShardsTotal }) }}</Badge>
          <Badge :variant="capacityAlerts > 0 ? 'destructive' : 'secondary'">{{ $t('agents.list.metrics.capacitySummary', { count: capacityAlerts }) }}</Badge>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
    <UiButton variant="outline" @click="navigateToSecurity"><Plus data-icon="inline-start" />{{ $t('agents.list.empty.add') }}</UiButton>
    <UiButton variant="outline" @click="openReleaseManager">
      <PackageOpen data-icon="inline-start" />
      {{ $t('agents.list.updates.manage') }}
    </UiButton>
        <UiButton variant="outline" @click="navigateToTopology">
          <Network data-icon="inline-start" />
          {{ $t('agents.list.actions.assignWorlds') }}
        </UiButton>
        <UiButton variant="outline" :disabled="loading" @click="refreshData">
          <Spinner v-if="loading" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          {{ $t('common.actions.refresh') }}
        </UiButton>
      </div>
    </header>

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

    <Alert v-if="unconfiguredOnlineAgents.length">
      <CircleAlert />
      <AlertTitle>{{ $t('agents.list.onboarding.title', { count: unconfiguredOnlineAgents.length }) }}</AlertTitle>
      <AlertDescription>{{ $t('agents.list.onboarding.description') }}</AlertDescription>
      <AlertAction v-if="unconfiguredOnlineAgents.length === 1">
        <UiButton size="sm" variant="outline" @click="openRuntimeConfig(unconfiguredOnlineAgents[0])">
          <Settings data-icon="inline-start" />
          {{ $t('agents.list.actions.configureRuntime') }}
        </UiButton>
      </AlertAction>
    </Alert>

    <div v-if="loading && totalMachines === 0" class="flex flex-col gap-2" :aria-label="$t('agents.list.loadingAria')">
      <Skeleton v-for="index in 4" :key="index" class="h-14 w-full" />
    </div>

    <div v-else-if="totalMachines > 0" class="overflow-x-auto rounded-lg border">
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
          <TableRow
            v-if="localRuntimeTarget"
            :data-state="isCurrentManagementTarget(localRuntimeTarget.id) ? 'selected' : undefined"
            :data-machine-target-id="localRuntimeTarget.id"
          >
            <TableCell><span class="block size-8" aria-hidden="true" /></TableCell>
            <TableCell>
              <div class="flex min-w-52 items-start gap-2.5">
                <Monitor class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="max-w-48 truncate font-medium">{{ localRuntimeTarget.name }}</span>
                    <Badge variant="secondary">{{ $t('common.states.online') }}</Badge>
                    <Badge variant="outline">{{ $t('agents.list.roles.currentController') }}</Badge>
                    <Badge v-if="isCurrentManagementTarget(localRuntimeTarget.id)">{{ $t('app.remote.current') }}</Badge>
                  </div>
                  <div class="mt-1 max-w-64 truncate text-xs text-muted-foreground">{{ localRuntimeTarget.hostname || $t('agents.list.values.notAvailable') }}</div>
                  <div class="mt-1 text-xs text-muted-foreground">{{ localRuntimeTarget.os }} / {{ localRuntimeTarget.arch }}</div>
                  <Badge v-if="localRuntimeTarget.performance" class="mt-1.5" :variant="performanceVariant(localRuntimeTarget.performance)">{{ performanceStatusLabel(localRuntimeTarget.performance) }}</Badge>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex min-w-44 flex-col gap-1.5">
                <div class="flex items-center justify-between gap-3">
                  <span class="font-medium">{{ localRuntimeTarget.config?.displayName || $t('agents.list.values.defaultRuntime') }}</span>
                  <Badge :variant="localRuntimeTarget.configured ? 'outline' : 'destructive'">{{ localRuntimeTarget.configured ? $t('agents.list.inventory.configured') : $t('agents.list.inventory.notConfigured') }}</Badge>
                </div>
                <span class="text-xs text-muted-foreground">{{ localCPU.physical > 0 ? $t('agents.list.capacity.localRecommendation', { count: localCapacityLimit }) : $t('agents.list.capacity.unknown') }}</span>
              </div>
            </TableCell>
            <TableCell>
              <div class="min-w-32">
                <div class="font-medium tabular-nums">{{ $t('agents.list.fields.physicalCores', { count: localCPU.physical }) }}</div>
                <div class="mt-1 text-xs text-muted-foreground">{{ $t('agents.list.fields.logicalProcessors', { count: localCPU.logical }) }}</div>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex min-w-36 flex-col gap-1.5">
                <div class="flex justify-between gap-2 text-xs tabular-nums">
                  <span>{{ formatBytes(localMemory.used) }}</span>
                  <span class="text-muted-foreground">{{ formatBytes(localMemory.total) }}</span>
                </div>
                <UiProgress :model-value="localMemory.usage" :aria-label="$t('agents.list.fields.memoryUsageAria', { name: localRuntimeTarget.name })" />
                <span class="text-xs text-muted-foreground">{{ $t('agents.list.fields.memoryAvailable', { value: formatBytes(localMemory.available) }) }}</span>
              </div>
            </TableCell>
            <TableCell>
              <div class="min-w-40">
                <Badge :variant="localSystemStatus.observedAt ? 'secondary' : 'outline'">{{ localSystemStatus.observedAt ? $t('agents.list.inventory.current') : $t('agents.list.inventory.waiting') }}</Badge>
                <div class="mt-1.5 text-xs text-muted-foreground">{{ formatTime(localSystemStatus.observedAt) }}</div>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex min-w-48 justify-end gap-1">
                <Tooltip><TooltipTrigger as-child><UiButton size="icon-sm" variant="ghost" :aria-label="$t('agents.list.actions.rename')" @click="openRename(localRuntimeTarget)"><Pencil /></UiButton></TooltipTrigger><TooltipContent>{{ $t('agents.list.actions.rename') }}</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger as-child><UiButton size="icon-sm" variant="ghost" :aria-label="$t('agents.list.actions.systemSettings')" @click="navigateToSystemSettings"><Settings /></UiButton></TooltipTrigger><TooltipContent>{{ $t('agents.list.actions.systemSettings') }}</TooltipContent></Tooltip>
              </div>
            </TableCell>
          </TableRow>
          <template v-for="agent in agentList" :key="agent.id">
            <TableRow
              :aria-expanded="isExpanded(agent)"
              :data-state="isCurrentManagementTarget(runtimeFor(agent).id) ? 'selected' : undefined"
              :data-machine-target-id="runtimeFor(agent).id"
            >
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
                      <span class="max-w-48 truncate font-medium">{{ machineName(agent) }}</span>
                      <Badge :variant="agent.connected ? 'secondary' : 'destructive'">{{ agent.connected ? $t('common.states.online') : $t('common.states.offline') }}</Badge>
                      <Badge variant="outline">{{ machineRoleLabel(agent) }}</Badge>
                      <Badge :variant="runtimeStateVariant(agent)">{{ runtimeStateLabel(agent) }}</Badge>
                      <Badge v-if="isOldAgent(agent)" variant="destructive">{{ $t('agents.list.inventory.upgradeRequired') }}</Badge>
                      <Badge v-if="isCurrentManagementTarget(runtimeFor(agent).id)">{{ $t('app.remote.current') }}</Badge>
                    </div>
                    <div class="mt-1 max-w-64 truncate text-xs text-muted-foreground">{{ agent.hostname || $t('agents.list.values.notAvailable') }}</div>
                    <div class="mt-1 max-w-64 truncate font-mono text-xs text-muted-foreground">{{ agent.agent_uuid }}</div>
          <div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{{ agent.os || $t('agents.list.values.notAvailable') }} / {{ agent.arch || $t('agents.list.values.notAvailable') }} / v{{ agent.version || $t('agents.list.values.notAvailable') }}</span>
            <Badge v-if="agentUpdate(agent).updateAvailable" variant="secondary">{{ $t('agents.list.updates.available', { version: agentUpdate(agent).latestVersion }) }}</Badge>
          </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div v-if="!runtimeFor(agent).configured" class="flex min-w-44 flex-col gap-1.5">
                  <span class="font-medium">{{ runtimeRequirementTitle(agent) }}</span>
                  <span class="text-xs text-muted-foreground">{{ runtimeRequirementSummary(agent) }}</span>
                </div>
                <div v-else class="flex min-w-44 flex-col gap-1.5">
                  <div class="flex items-center justify-between gap-3">
                    <span class="font-medium tabular-nums">{{ capacityForAgent(agent).runningShards }} / {{ capacityLimit(agent) }}</span>
                    <Badge :variant="capacityVariant(agent)">{{ capacityStateLabel(agent) }}</Badge>
                  </div>
                  <UiProgress
                    :model-value="capacityProgress(agent)"
                    :aria-label="$t('agents.list.capacity.progressAria', { name: agent.hostname })"
                  />
                  <span class="text-xs text-muted-foreground">{{ capacityMessage(agent) }}</span>
                  <Badge v-if="runtimeFor(agent).performance" class="w-fit" :variant="performanceVariant(runtimeFor(agent).performance)">{{ performanceStatusLabel(runtimeFor(agent).performance) }}</Badge>
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
                  <Tooltip><TooltipTrigger as-child><span><UiButton size="icon-sm" variant="ghost" :disabled="Boolean(runtimeLoadError)" :aria-label="$t('agents.list.actions.rename')" @click="openRename(runtimeFor(agent))"><Pencil /></UiButton></span></TooltipTrigger><TooltipContent>{{ $t('agents.list.actions.rename') }}</TooltipContent></Tooltip>
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
          <Tooltip>
          <TooltipTrigger as-child>
            <span>
            <UiButton
              size="icon-sm"
              :variant="canUpgradeAgent(agent) ? 'outline' : 'ghost'"
              :disabled="!canUpgradeAgent(agent) || Boolean(upgradingAgents[agent.id])"
              :aria-label="$t('agents.list.updates.upgrade')"
              @click="upgradeAgent(agent)"
            >
              <Spinner v-if="upgradingAgents[agent.id]" />
              <ArrowUpCircle v-else />
            </UiButton>
            </span>
          </TooltipTrigger>
          <TooltipContent>{{ agentUpdateHint(agent) }}</TooltipContent>
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
                      <h2 class="font-medium">{{ $t('agents.list.topology.title', { name: machineName(agent) }) }}</h2>
                      <p class="text-xs text-muted-foreground">{{ $t('agents.list.topology.description') }}</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                      <Badge :variant="runtimeFor(agent).configured ? 'outline' : 'destructive'">{{ runtimeFor(agent).configured ? $t('agents.list.inventory.configured') : $t('agents.list.inventory.notConfigured') }}</Badge>
                      <Badge v-if="runtimeFor(agent).configured" variant="secondary">{{ runtimeSourceLabel(agent) }}</Badge>
                    </div>
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
                    <AlertTitle>{{ runtimeRequirementTitle(agent) }}</AlertTitle>
                    <AlertDescription>{{ runtimeRequirementDescription(agent) }}</AlertDescription>
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

    <RuntimeInfrastructurePanel
      v-if="totalMachines > 0"
      network-only
      :show-kubernetes="false"
      :show-preflight="false"
      :show-room-resources="false"
    />

    <Collapsible v-model:open="configurationOpen" class="rounded-lg border p-4">
      <CollapsibleTrigger as-child><UiButton variant="ghost" class="w-full justify-between"><span>{{ $t('agents.list.configuration.title') }}</span><ChevronDown data-icon="inline-end" /></UiButton></CollapsibleTrigger>
      <CollapsibleContent class="pt-4"><FleetProfilePanel /></CollapsibleContent>
    </Collapsible>
    <Collapsible class="rounded-lg border p-4">
      <CollapsibleTrigger as-child><UiButton variant="ghost" class="w-full justify-between"><span>{{ $t('agents.list.capacity.policyTitle') }}</span><ChevronDown data-icon="inline-end" /></UiButton></CollapsibleTrigger>
      <CollapsibleContent class="pt-4"><p class="text-sm text-muted-foreground">{{ $t('agents.list.capacity.policyDescription') }}</p></CollapsibleContent>
    </Collapsible>
    <Collapsible class="rounded-lg border p-4">
      <CollapsibleTrigger as-child><UiButton variant="ghost" class="w-full justify-between"><span>{{ $t('agents.list.configuration.experimental') }}</span><ChevronDown data-icon="inline-end" /></UiButton></CollapsibleTrigger>
      <CollapsibleContent class="pt-4"><KubernetesProviderPanel :heading-level="2" /></CollapsibleContent>
    </Collapsible>

  <UiDialog v-model:open="releaseVisible">
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

    <UiDialog v-model:open="renameVisible">
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
import {
  Apple, ArrowUpCircle, ChevronDown, ChevronRight, CircleAlert, CircleCheck, Clock3, Cpu, Eye, Layers3, Monitor,
  Network, PackageOpen, Pencil, RefreshCw, Server, Settings, Terminal, Trash2, TriangleAlert, Upload
} from '@lucide/vue';
import { toast } from 'vue-sonner';
import { agentApi } from '@/api/index';
import { bindAgentRuntimeInstallation } from '@/api/agentApiSupport.mjs';
import { agentsV2API, runtimeTargetsV2API, systemV2API } from '@/api/v2';
import { waitForV2Job } from '@/api/v2ConfigurationAdapters';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus } from '@lucide/vue';
import FleetProfilePanel from '@/components/agents/FleetProfilePanel.vue';
import KubernetesProviderPanel from '@/components/runtime/KubernetesProviderPanel.vue';
import RuntimeInfrastructurePanel from '@/components/runtime/RuntimeInfrastructurePanel.vue';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Progress as UiProgress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    AlertTitle, Apple, ArrowUpCircle, Badge, ChevronDown, ChevronRight, CircleAlert, CircleCheck, Clock3, Cpu, DialogContent,
    DialogDescription, DialogFooter, DialogHeader, DialogTitle, Empty, EmptyContent, EmptyDescription,
    EmptyHeader, EmptyMedia, EmptyTitle, Eye, Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FleetProfilePanel,
    Layers3, KubernetesProviderPanel, Monitor, Network, PackageOpen, Pencil, RefreshCw, RuntimeInfrastructurePanel, Separator, Server, Settings, Skeleton, Spinner, UiTable, TableBody,
    SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, TableCell, TableHead, TableHeader, TableRow,
    Terminal, ToggleGroup, ToggleGroupItem, Tooltip, TooltipContent, TooltipTrigger, Trash2, TriangleAlert, UiButton,
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
      expandedAgents: {},
      detailVisible: false,
      selectedAgent: null,
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
    localCPU() {
      const cpu = this.localSystemStatus.cpu || {};
      return {
        physical: Number(cpu.cores) || 0,
        logical: Number(cpu.threads) || 0
      };
    },
    localCapacityLimit() {
      const cores = this.localCPU.physical || this.localCPU.logical;
      return Math.max(0, cores > 2 ? cores - 1 : cores);
    },
    localMemory() {
      const memory = this.localSystemStatus.memory || {};
      return {
        used: Number(memory.usedBytes) || 0,
        total: Number(memory.totalBytes) || 0,
        available: Number(memory.availableBytes) || 0,
        usage: Number(memory.usage) || 0
      };
    },
    runningShardsTotal() {
      return this.agentList.reduce((total, agent) => total + this.capacityForAgent(agent).runningShards, 0);
    },
    capacityAlerts() {
      return this.agentList.filter(agent => ['full', 'overcommitted'].includes(this.capacityForAgent(agent).state)).length;
    },
    unconfiguredOnlineAgents() {
      if (this.runtimeLoadError) return [];
      return this.agentList.filter(agent => agent.connected && !this.runtimeFor(agent).configured);
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
    window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, this.handleManagementScopeChange);
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
        await this.fetchLocalSystemStatus();
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
      if (!this.localRuntimeTarget) {
        this.localSystemStatus = {};
        return true;
      }
      try {
        this.localSystemStatus = await systemV2API.status();
        return true;
      } catch {
        this.localSystemStatus = {};
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
    isCurrentManagementTarget(targetId) {
      return this.managementScope.kind === MANAGEMENT_SCOPE_TARGET &&
        Boolean(targetId) && this.managementScope.targetId === targetId;
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
    runtimeSourceLabel(agent) {
      return this.$t(this.runtimeFor(agent).config?.source === 'discovered'
        ? 'agents.list.inventory.sources.discovered'
        : 'agents.list.inventory.sources.manual');
    },
    runtimeStateLabel(agent) {
      if (this.runtimeFor(agent).configured) return this.runtimeSourceLabel(agent);
      if (agent.installation_registry_supported && (agent.installations || []).length > 1) {
        return this.$t('agents.list.inventory.chooseInstallation');
      }
      if (agent.installation_registry_supported && (agent.installations || []).length === 0) {
        return this.$t('agents.list.inventory.noInstallation');
      }
      return this.$t('agents.list.inventory.notConfigured');
    },
    runtimeStateVariant(agent) {
      if (this.runtimeFor(agent).configured) return this.runtimeFor(agent).config?.source === 'discovered' ? 'secondary' : 'outline';
      return 'outline';
    },
    runtimeRequirementTitle(agent) {
      if (agent.installation_registry_supported && (agent.installations || []).length > 1) {
        return this.$t('agents.list.inventory.chooseInstallationTitle');
      }
      if (agent.installation_registry_supported && (agent.installations || []).length === 0) {
        return this.$t('agents.list.inventory.noInstallationTitle');
      }
      return this.$t('agents.list.inventory.notConfiguredTitle');
    },
    runtimeRequirementDescription(agent) {
      if (agent.installation_registry_supported && (agent.installations || []).length > 1) {
        return this.$t('agents.list.inventory.chooseInstallationDescription', { count: agent.installations.length });
      }
      if (agent.installation_registry_supported && (agent.installations || []).length === 0) {
        return this.$t('agents.list.inventory.noInstallationDescription');
      }
      return this.$t('agents.list.inventory.notConfiguredDescription');
    },
    runtimeRequirementSummary(agent) {
      if (agent.installation_registry_supported && (agent.installations || []).length > 1) {
        return this.$t('agents.list.inventory.chooseInstallationSummary', { count: agent.installations.length });
      }
      if (agent.installation_registry_supported && (agent.installations || []).length === 0) {
        return this.$t('agents.list.inventory.noInstallationSummary');
      }
      return this.$t('agents.list.inventory.notConfiguredSummary');
    },
    machineName(agent) {
      return this.runtimeFor(agent).name || agent.display_name || agent.hostname || this.$t('agents.list.values.unknownNode');
    },
    machineRoleLabel(agent) {
      if (agent.deployment_profile === 'container' && this.runtimeFor(agent).configured) {
        return this.$t('agents.list.roles.managedAllInOne');
      }
      return this.$t('agents.list.roles.agentNode');
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
        this.runtimeTargetList = this.runtimeTargetList.map(target => target.id === updated.id ? updated : target);
        if (updated.kind === 'agent' && updated.agentId) this.runtimeByAgent[updated.agentId] = updated;
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
          void this.refreshInventory(configuredAgent, { announceSuccess: false });
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
    navigateToSystemSettings() {
      this.$router.push('/system/settings');
    },
    navigateToTopology() {
      this.$router.push('/rooms/topology');
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

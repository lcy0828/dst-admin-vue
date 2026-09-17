<template>
  <div class="page-container">
    <header class="page-heading" :class="{ 'page-heading-embedded': embedded }">
      <div v-if="!embedded"><h1>{{ $t('mods.installed.title') }}</h1></div>
      <div class="header-actions">
        <UiButton size="sm" variant="outline" @click="refreshModList" :disabled="loading || !selectedRoomId"><RefreshCw data-icon="inline-start" />{{ $t('mods.actions.refresh') }}</UiButton>
        <UiButton v-if="selectedRoomId" size="sm" variant="outline" @click="openModUpdateDialog"><SunMedium data-icon="inline-start" />{{ modUpdateButtonLabel }}</UiButton>
        <DropdownMenu v-if="selectedRoomId || availableRoomCopySources.length > 0">
          <DropdownMenuTrigger as-child>
            <UiButton size="icon-sm" variant="outline" :aria-label="$t('mods.actions.more')" :title="$t('mods.actions.more')"><MoreHorizontal /></UiButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem v-if="selectedRoomId" @select="publicationDialogVisible = true"><Network />{{ $t('mods.publication.actions.open') }}</DropdownMenuItem>
              <DropdownMenuItem v-if="availableRoomCopySources.length > 0" :disabled="loading || !selectedRoomId" @select="openRoomCopyDialog"><Copy />{{ $t('mods.installed.roomCopy.action') }}</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <UiButton size="sm" @click="goToSearch"><Plus data-icon="inline-start" />{{ $t('mods.actions.add') }}</UiButton>
      </div>
    </header>

    <section class="filter-panel" :aria-label="$t('mods.installed.filters.title')">
      <FieldGroup class="filter-form">
        <RoomScopeSelect :model-value="selectedRoomId" :rooms="roomOptions" :loading="loadingRooms" @update:model-value="handleRoomChange" />
        <Field class="filter-status">
          <FieldLabel class="sr-only">{{ $t('mods.installed.filters.status') }}</FieldLabel>
          <ToggleGroup v-model="filterForm.status" type="single" variant="outline" size="sm" class="status-filter">
            <ToggleGroupItem value="all">{{ $t('mods.installed.filters.statuses.all') }}</ToggleGroupItem>
            <ToggleGroupItem value="allEnabled">{{ $t('mods.installed.filters.statuses.allEnabled') }}</ToggleGroupItem>
            <ToggleGroupItem value="partial">{{ $t('mods.installed.filters.statuses.partial') }}</ToggleGroupItem>
            <ToggleGroupItem value="machineOnly">{{ $t('mods.installed.filters.statuses.machineOnly') }}</ToggleGroupItem>
            <ToggleGroupItem value="disabled">{{ $t('mods.installed.filters.statuses.disabled') }}</ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Field class="filter-sort">
          <FieldLabel class="sr-only" for="installed-mod-sort">{{ $t('mods.installed.filters.sort') }}</FieldLabel>
          <UiSelect v-model="filterForm.sortBy">
            <SelectTrigger id="installed-mod-sort"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="enabled">{{ $t('mods.installed.filters.sorts.enabled') }}</SelectItem><SelectItem value="update_status">{{ $t('mods.installed.filters.sorts.updateStatus') }}</SelectItem><SelectItem value="update_time">{{ $t('mods.installed.filters.sorts.updatedAt') }}</SelectItem><SelectItem value="name">{{ $t('mods.installed.filters.sorts.name') }}</SelectItem><SelectItem value="author">{{ $t('mods.installed.filters.sorts.author') }}</SelectItem><SelectItem value="subscribers">{{ $t('mods.installed.filters.sorts.subscribers') }}</SelectItem><SelectItem value="rating">{{ $t('mods.installed.filters.sorts.rating') }}</SelectItem>
            </SelectGroup></SelectContent>
          </UiSelect>
        </Field>
        <Field class="filter-search">
          <FieldLabel class="sr-only" for="installed-mod-search">{{ $t('mods.installed.filters.keyword') }}</FieldLabel>
          <InputGroup><InputGroupAddon><Search /></InputGroupAddon><InputGroupInput id="installed-mod-search" v-model="filterForm.keyword" :placeholder="$t('mods.installed.filters.keywordPlaceholder')" /></InputGroup>
        </Field>
        <UiButton size="icon-sm" variant="ghost" :disabled="!filterChanged" :aria-label="$t('mods.actions.reset')" :title="$t('mods.actions.reset')" @click="resetFilter"><RefreshCw /></UiButton>
      </FieldGroup>
      <FieldDescription v-if="selectedRoomId && selectedRoomWorlds.length === 0">{{ $t('mods.installed.feedback.noWorlds') }}</FieldDescription>
    </section>

    <Alert v-if="loadError" variant="destructive">
      <TriangleAlert />
      <AlertTitle>{{ $t('mods.installed.loadFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="retryLoad">{{ $t('mods.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <Alert v-if="metadataWarning && !loadError" role="status">
      <Info />
      <AlertTitle>{{ $t('mods.metadata.notice') }}</AlertTitle>
      <AlertDescription>
        <p>{{ metadataWarning }}</p>
        <p>{{ $t('mods.metadata.localFactsAvailable') }}</p>
        <UiButton v-if="incompleteMetadataIds.length" type="button" variant="outline" size="sm" class="mt-2 w-fit" :disabled="metadataLoading" @click="retryModMetadata">
          <Spinner v-if="metadataLoading" aria-hidden="true" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          {{ $t(metadataLoading ? 'mods.metadata.retrying' : 'mods.metadata.retry') }}
        </UiButton>
      </AlertDescription>
    </Alert>

    <div v-if="loading" class="loading-state"><Spinner /><span>{{ $t('mods.installed.loading') }}</span></div>

    <div v-else-if="!loadError && filteredMods.length > 0" class="mod-list">
      <section v-for="mod in filteredMods" :key="mod.id" class="mod-list-item" :data-expanded="isModExpanded(mod) || undefined">
        <header class="mod-summary" :aria-busy="isModBusy(mod)">
          <div class="mod-image"><ImageIcon /><img v-if="mod.image || defaultIcon" :src="modThumbnailUrl(mod.image || defaultIcon, 96)" :alt="mod.name" loading="lazy" @error="handleImageError" /></div>
          <div class="mod-heading-content">
            <div class="mod-title-row">
              <strong class="truncate" :title="mod.name">{{ mod.name }}</strong>
              <span class="mod-id">Workshop {{ mod.modid }}</span>
            </div>
            <span class="mod-author">{{ mod.author || $t('mods.values.unknownAuthor') }}</span>
            <span v-if="modVersionLabel(mod)" class="mod-runtime-version">{{ modVersionLabel(mod) }}</span>
          </div>
          <div class="mod-coverage" aria-live="polite">
            <UiButton v-if="modActionState[mod.modid]?.jobId" variant="outline" size="sm" @click="jobStatus?.showJobProgress(modActionState[mod.modid].jobId)">{{ $t('globalJobs.viewProgress') }}</UiButton>
            <Badge v-else-if="isModBusy(mod)" variant="warning">{{ modActionProgress(mod) }}%</Badge>
            <Badge v-if="modActionRate(mod)" variant="outline" class="tabular-nums">{{ modActionRate(mod) }}</Badge>
            <Badge v-if="mod.machineOnly" variant="outline">{{ machineCoverageSummary(mod) }}</Badge>
            <Badge v-if="mod.machineOnly" variant="secondary">{{ $t('mods.installed.operational.machineOnly') }}</Badge>
            <template v-else>
              <Badge variant="outline">{{ roomWorldSummary(mod) }}</Badge>
              <Badge :variant="modOperationalStatusVariant(mod)">{{ modOperationalStatusLabel(mod) }}</Badge>
            </template>
            <Badge v-if="mod.updateAvailable" variant="warning">{{ $t('mods.values.health.updateAvailable') }}</Badge>
          </div>
          <div class="mod-summary-actions">
            <UiButton v-if="mod.machineOnly" class="mod-add-room-button" size="sm" variant="outline" :disabled="isModBusy(mod)" @click="addModToRoomDefault(mod)">
              <Spinner v-if="isModBusy(mod)" data-icon="inline-start" />
              <Plus v-else data-icon="inline-start" />
              <span>{{ $t('mods.installed.actions.addToRoom') }}</span>
            </UiButton>
            <Tooltip>
              <TooltipTrigger as-child><UiButton class="mod-summary-icon" size="icon-sm" variant="ghost" :aria-label="$t('mods.actions.details')" @click="showModDetails(mod)"><FileCode2 /></UiButton></TooltipTrigger>
              <TooltipContent>{{ $t('mods.actions.details') }}</TooltipContent>
            </Tooltip>
            <DropdownMenu v-if="!mod.machineOnly">
              <DropdownMenuTrigger as-child><UiButton class="mod-summary-icon" variant="ghost" size="icon-sm" :aria-label="$t('mods.installed.aria.openMenu', { name: mod.name })"><MoreHorizontal /></UiButton></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem v-if="['pending', 'corrupt'].includes(modOperationalStatus(mod))" :disabled="isModBusy(mod)" @select="updateMod(mod, true)"><Download />{{ $t('mods.installed.operational.downloadOnMachines') }}</DropdownMenuItem>
                  <DropdownMenuItem v-else-if="mod.updateAvailable" :disabled="isModBusy(mod)" @select="updateMod(mod)">{{ $t('mods.actions.updateMod') }}</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator v-if="mod.updateAvailable || ['pending', 'corrupt'].includes(modOperationalStatus(mod))" />
                <DropdownMenuGroup>
                  <DropdownMenuItem :disabled="isModBusy(mod) || roomModStatus(mod) === 'allEnabled'" @select="toggleRoomModStatus(mod, true)"><CirclePlay />{{ $t('mods.actions.enableInRoom') }}</DropdownMenuItem>
                  <DropdownMenuItem :disabled="isModBusy(mod) || roomModStatus(mod) === 'disabled'" @select="toggleRoomModStatus(mod, false)"><CirclePause />{{ $t('mods.actions.disableInRoom') }}</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <UiButton
              class="mod-expand-button"
              size="icon"
              variant="outline"
              :aria-label="$t(isModExpanded(mod) ? 'mods.installed.aria.collapse' : 'mods.installed.aria.expand', { name: mod.name })"
              :aria-expanded="isModExpanded(mod)"
              @click="toggleModExpanded(mod)"
            ><ChevronDown /></UiButton>
          </div>
          <UiProgress
            v-if="isModBusy(mod) && !modActionState[mod.modid]?.jobId"
            class="mod-summary-progress"
            :model-value="modActionProgress(mod)"
            :aria-label="$t('mods.installed.aria.operationProgress', { name: mod.name, value: modActionProgress(mod) })"
          />
        </header>

        <div v-if="isModExpanded(mod)" class="mod-details">
          <Alert v-if="hasMixedConfiguration(mod)">
            <TriangleAlert />
            <AlertTitle>{{ $t('mods.installed.worldMatrix.mixedTitle') }}</AlertTitle>
            <AlertDescription>{{ $t('mods.installed.worldMatrix.mixedDescription') }}</AlertDescription>
          </Alert>
          <Alert v-if="requiresAllClients(mod) && hasPartialWorldCoverage(mod)" class="coverage-alert">
            <TriangleAlert />
            <AlertTitle>{{ $t('mods.installed.consistency.title') }}</AlertTitle>
            <AlertDescription>{{ $t('mods.installed.consistency.description') }}</AlertDescription>
          </Alert>

          <div class="world-matrix">
            <div class="matrix-heading">
              <div class="matrix-heading-copy">
                <strong>{{ $t('mods.installed.worldMatrix.title') }}</strong>
                <span>{{ $t('mods.installed.worldMatrix.description') }}</span>
              </div>
              <div class="matrix-config-actions">
                <label class="matrix-config-mode">
                  <span>{{ $t('mods.installed.worldMatrix.separateConfig') }}</span>
                  <UiSwitch
                    :model-value="usesSeparateWorldConfig(mod)"
                    :disabled="isModBusy(mod)"
                    :aria-label="$t('mods.installed.aria.separateWorldConfig', { mod: mod.name })"
                    @update:model-value="value => setSeparateWorldConfig(mod, value)"
                  />
                </label>
                <UiButton v-if="!usesSeparateWorldConfig(mod)" size="sm" variant="outline" :disabled="isModBusy(mod)" @click="openRoomConfigDialog(mod)">
                  <Settings2 data-icon="inline-start" />{{ $t('mods.installed.worldMatrix.configureTogether') }}
                </UiButton>
              </div>
            </div>
            <template v-for="(world, worldIndex) in selectedRoomWorlds" :key="world.id">
              <Separator v-if="worldIndex > 0" />
              <div class="world-row">
                <div class="world-identity">
                  <Server />
                  <div>
                    <strong>{{ world.name }}</strong>
                    <span>{{ world.appliedTargetName || $t('mods.installed.worldMatrix.unassigned') }}</span>
                  </div>
                </div>
                <div class="world-controls">
                  <Badge :variant="worldStateBadgeVariant(mod, world)">{{ worldStateLabel(mod, world) }}</Badge>
                  <template v-if="isConfiguredInWorld(mod, world)">
                    <UiSwitch
                      :model-value="isEnabledInWorld(mod, world)"
                      :disabled="isModBusy(mod)"
                      :aria-label="$t('mods.installed.aria.toggleWorld', { mod: mod.name, world: world.name })"
                      @update:model-value="value => toggleModStatus(mod, world, value)"
                    />
                    <Tooltip v-if="usesSeparateWorldConfig(mod)">
                      <TooltipTrigger as-child><UiButton size="icon-sm" variant="ghost" :disabled="isModBusy(mod)" :aria-label="$t('mods.installed.aria.configureWorld', { mod: mod.name, world: world.name })" @click="openConfigDialog(mod, world)"><Settings2 /></UiButton></TooltipTrigger>
                      <TooltipContent>{{ $t('mods.actions.configure') }}</TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child><UiButton variant="ghost" size="icon-sm" :disabled="isModBusy(mod)" :aria-label="$t('mods.installed.aria.openWorldMenu', { world: world.name })"><MoreHorizontal /></UiButton></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup><DropdownMenuItem @select="getModConfigFile(world)"><FileCode2 />{{ $t('mods.actions.getConfigFile') }}</DropdownMenuItem></DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </template>
                  <UiButton v-else size="sm" variant="outline" :disabled="isModBusy(mod)" @click="addModToWorld(mod, world)"><Plus data-icon="inline-start" />{{ $t('mods.actions.addToWorld') }}</UiButton>
                </div>
              </div>
            </template>
          </div>
        </div>
      </section>
    </div>

    <Empty v-else-if="!loadError">
      <EmptyHeader><EmptyMedia variant="icon"><PackageOpen /></EmptyMedia><EmptyTitle>{{ $t(selectedRoomId ? 'mods.installed.empty.noMods' : 'mods.installed.empty.noRooms') }}</EmptyTitle><EmptyDescription>{{ $t(selectedRoomId ? 'mods.installed.empty.noModsDescription' : 'mods.installed.empty.noRoomsDescription') }}</EmptyDescription></EmptyHeader>
      <EmptyContent v-if="selectedRoomId"><UiButton @click="goToSearch"><Plus data-icon="inline-start" />{{ $t('mods.actions.add') }}</UiButton></EmptyContent>
    </Empty>

    <mod-config-dialog v-model="configDialogVisible" :mod-id="currentModId" :mod-info="currentModInfo" :room-id="selectedRoomId" :world-id="selectedWorldId" :world-name="currentWorld?.name || ''" :target-id="currentWorld?.appliedTargetId || ''" :target-name="currentWorld?.appliedTargetName || ''" :expected-topology-revision="currentWorld?.topologyRevision || ''" :configuration-scope="configScope" :world-ids="configWorldIds" :expected-revisions="configExpectedRevisions" :is-new-mod="false" @config-updated="handleConfigUpdated" />

    <UiDialog v-model:open="sharedSourceDialogVisible">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ $t('mods.installed.worldMatrix.chooseSource') }}</DialogTitle>
          <DialogDescription>{{ $t('mods.installed.worldMatrix.sourceWarning') }}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel for="mod-shared-source">{{ $t('mods.installed.worldMatrix.sourceWorld') }}</FieldLabel>
            <UiSelect v-model="sharedSourceWorldId">
              <SelectTrigger id="mod-shared-source"><SelectValue :placeholder="$t('mods.installed.worldMatrix.chooseSource')" /></SelectTrigger>
              <SelectContent><SelectGroup>
                <SelectItem v-for="world in sharedSourceWorlds" :key="world.id" :value="world.id">{{ world.name }}</SelectItem>
              </SelectGroup></SelectContent>
            </UiSelect>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" @click="sharedSourceDialogVisible = false">{{ $t('mods.actions.cancel') }}</UiButton>
          <UiButton :disabled="!sharedSourceWorldId" @click="confirmSharedSource"><Settings2 data-icon="inline-start" />{{ $t('mods.installed.worldMatrix.reviewShared') }}</UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="modUpdateDialogVisible">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{{ $t('mods.autoUpdate.title') }}</DialogTitle>
          <DialogDescription>{{ $t('mods.autoUpdate.description') }}</DialogDescription>
        </DialogHeader>

        <div v-if="modUpdateLoading" class="loading-state"><Spinner /><span>{{ $t('mods.autoUpdate.loading') }}</span></div>
        <FieldGroup v-else>
          <Alert v-if="modUpdateState && modUpdateState.status !== 'idle'" :variant="modUpdateState.status === 'blocked' || modUpdateState.status === 'rolled_back' ? 'destructive' : 'default'">
            <TriangleAlert v-if="modUpdateState.status === 'blocked' || modUpdateState.status === 'rolled_back'" />
            <SunMedium v-else />
            <AlertTitle>{{ modUpdateStatusLabel(modUpdateState.status) }}</AlertTitle>
            <AlertDescription>{{ modUpdateStatusDescription }}</AlertDescription>
          </Alert>

          <FieldSet>
            <FieldLegend>{{ $t('mods.autoUpdate.mode.title') }}</FieldLegend>
            <FieldDescription>{{ $t('mods.autoUpdate.mode.description') }}</FieldDescription>
            <ToggleGroup v-model="modUpdateMode" type="single" variant="outline" class="mod-update-modes">
              <ToggleGroupItem value="manual">{{ $t('mods.autoUpdate.mode.manual') }}</ToggleGroupItem>
              <ToggleGroupItem value="notify">{{ $t('mods.autoUpdate.mode.notify') }}</ToggleGroupItem>
              <ToggleGroupItem value="auto">{{ $t('mods.autoUpdate.mode.auto') }}</ToggleGroupItem>
            </ToggleGroup>
            <FieldDescription>{{ $t(`mods.autoUpdate.mode.${modUpdateMode}Description`) }}</FieldDescription>
          </FieldSet>

          <template v-if="modUpdateMode !== 'manual'">
            <FieldGroup class="mod-update-options">
              <Field>
                <FieldLabel for="mod-update-interval">{{ $t('mods.autoUpdate.fields.interval') }}</FieldLabel>
                <UiSelect v-model="modUpdateDraft.checkIntervalMinutes">
                  <SelectTrigger id="mod-update-interval"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem :value="5">{{ $t('mods.autoUpdate.intervals.minutes', { count: 5 }) }}</SelectItem>
                    <SelectItem :value="15">{{ $t('mods.autoUpdate.intervals.minutes', { count: 15 }) }}</SelectItem>
                    <SelectItem :value="30">{{ $t('mods.autoUpdate.intervals.minutes', { count: 30 }) }}</SelectItem>
                    <SelectItem :value="60">{{ $t('mods.autoUpdate.intervals.hours', { count: 1 }) }}</SelectItem>
                    <SelectItem :value="180">{{ $t('mods.autoUpdate.intervals.hours', { count: 3 }) }}</SelectItem>
                    <SelectItem :value="360">{{ $t('mods.autoUpdate.intervals.hours', { count: 6 }) }}</SelectItem>
                  </SelectGroup></SelectContent>
                </UiSelect>
              </Field>
              <Field v-if="modUpdateMode === 'auto'">
                <FieldLabel for="mod-update-grace">{{ $t('mods.autoUpdate.fields.grace') }}</FieldLabel>
                <UiSelect v-model="modUpdateDraft.emptyGraceSeconds">
                  <SelectTrigger id="mod-update-grace"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem :value="30">{{ $t('mods.autoUpdate.intervals.seconds', { count: 30 }) }}</SelectItem>
                    <SelectItem :value="60">{{ $t('mods.autoUpdate.intervals.minutes', { count: 1 }) }}</SelectItem>
                    <SelectItem :value="120">{{ $t('mods.autoUpdate.intervals.minutes', { count: 2 }) }}</SelectItem>
                    <SelectItem :value="300">{{ $t('mods.autoUpdate.intervals.minutes', { count: 5 }) }}</SelectItem>
                  </SelectGroup></SelectContent>
                </UiSelect>
              </Field>
            </FieldGroup>
            <Field v-if="modUpdateMode === 'auto'" orientation="horizontal">
              <div class="mod-update-field-copy"><FieldLabel for="mod-update-announcement">{{ $t('mods.autoUpdate.fields.announcement') }}</FieldLabel><FieldDescription>{{ $t('mods.autoUpdate.fields.announcementDescription') }}</FieldDescription></div>
              <UiSwitch id="mod-update-announcement" v-model="modUpdateDraft.gameAnnouncement" />
            </Field>
            <Alert v-if="modUpdateMode === 'auto'">
              <ShieldCheck />
              <AlertTitle>{{ $t('mods.autoUpdate.safety.title') }}</AlertTitle>
              <AlertDescription>{{ $t('mods.autoUpdate.safety.description') }}</AlertDescription>
            </Alert>
          </template>
        </FieldGroup>

        <DialogFooter>
          <UiButton variant="outline" :disabled="modUpdateLoading || modUpdateChecking" @click="checkModUpdatesNow"><Spinner v-if="modUpdateChecking" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ $t('mods.autoUpdate.actions.checkNow') }}</UiButton>
          <UiButton variant="outline" @click="modUpdateDialogVisible = false">{{ $t('mods.actions.cancel') }}</UiButton>
          <UiButton :disabled="modUpdateLoading || modUpdateSaving" @click="saveModUpdatePolicy"><Spinner v-if="modUpdateSaving" data-icon="inline-start" /><ShieldCheck v-else data-icon="inline-start" />{{ $t('mods.autoUpdate.actions.save') }}</UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="publicationDialogVisible">
      <DialogContent class="max-h-[85vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{{ $t('mods.publication.title') }}</DialogTitle>
          <DialogDescription>{{ $t('mods.publication.description') }}</DialogDescription>
        </DialogHeader>
        <RoomModPublicationPanel :room-id="selectedRoomId" :worlds="selectedRoomWorlds" :mods="modsList" @published="handlePublicationPublished" />
      </DialogContent>
    </UiDialog>

    <ModDetailsDialog v-model:open="detailsDialogVisible" :mod="currentModInfo" :loading="detailsLoading" :actions="false" />

    <UiDialog v-model:open="copyDialogVisible">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ $t('mods.installed.copy.title') }}</DialogTitle><DialogDescription>{{ $t('mods.installed.copy.description', { source: copySourceWorld?.name || '' }) }}</DialogDescription></DialogHeader>
        <FieldSet>
          <FieldLegend>{{ $t('mods.installed.copy.targets') }}</FieldLegend>
          <FieldDescription>{{ $t('mods.installed.copy.targetsDescription') }}</FieldDescription>
          <FieldGroup>
            <Field v-for="world in availableCopyTargets" :key="world.id" orientation="horizontal">
              <FieldLabel :for="`copy-mod-config-${world.id}`">{{ world.name }}</FieldLabel>
              <UiCheckbox :id="`copy-mod-config-${world.id}`" :model-value="copyTargetWorldIds.includes(world.id)" @update:model-value="value => toggleCopyTarget(world.id, value)" />
            </Field>
          </FieldGroup>
        </FieldSet>
        <DialogFooter><UiButton variant="outline" @click="copyDialogVisible = false">{{ $t('mods.actions.cancel') }}</UiButton><UiButton :disabled="copying || copyTargetWorldIds.length === 0" @click="copyConfiguration"><Spinner v-if="copying" data-icon="inline-start" /><Copy v-else data-icon="inline-start" />{{ $t('mods.actions.copyConfiguration') }}</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="roomCopyDialogVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ $t('mods.installed.roomCopy.title') }}</DialogTitle>
          <DialogDescription>{{ $t('mods.installed.roomCopy.description', { room: currentRoom?.name || '' }) }}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel for="mod-copy-source-room">{{ $t('rooms.copy.sourceRoom') }}</FieldLabel>
            <UiSelect v-model="roomCopySourceRoomId" :disabled="loadingRoomCopySource || copyingRoomMods" @update:model-value="loadRoomCopySource">
              <SelectTrigger id="mod-copy-source-room"><SelectValue :placeholder="$t('rooms.copy.sourcePlaceholder')" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="room in availableRoomCopySources" :key="room.id" :value="room.id">{{ room.name }}</SelectItem></SelectGroup></SelectContent>
            </UiSelect>
          </Field>

          <div v-if="loadingRoomCopySource" class="loading-state"><Spinner /><span>{{ $t('mods.installed.roomCopy.loading') }}</span></div>
          <template v-else-if="roomCopySourceLoaded">
            <FieldSet>
              <FieldLegend>{{ $t('mods.installed.roomCopy.worldMappings') }}</FieldLegend>
              <FieldDescription>{{ $t('mods.installed.roomCopy.worldMappingsDescription') }}</FieldDescription>
              <div class="copy-world-mappings">
                <div v-for="match in roomCopyWorldMatches" :key="match.source.id" class="copy-world-mapping">
                  <span>{{ match.source.name }}</span>
                  <span aria-hidden="true">→</span>
                  <Badge :variant="match.target ? 'secondary' : 'destructive'">{{ match.target?.name || $t('mods.installed.roomCopy.noMatch') }}</Badge>
                </div>
              </div>
            </FieldSet>

            <Alert>
              <Copy />
              <AlertTitle>{{ $t('mods.installed.roomCopy.summary', { mods: roomCopySourceMods.length, assignments: roomCopyAssignmentCount }) }}</AlertTitle>
              <AlertDescription>{{ $t('mods.installed.roomCopy.mergeDescription') }}</AlertDescription>
            </Alert>

            <div v-if="copyingRoomMods" class="copy-progress" aria-live="polite">
              <UiProgress :model-value="roomCopyProgressPercent" />
              <span>{{ $t('mods.installed.roomCopy.progress', { completed: roomCopyCompleted, total: roomCopyAssignmentCount, item: roomCopyCurrentItem }) }}</span>
            </div>
          </template>
        </FieldGroup>

        <DialogFooter>
          <UiButton variant="outline" :disabled="copyingRoomMods" @click="roomCopyDialogVisible = false">{{ $t('mods.actions.cancel') }}</UiButton>
          <UiButton :disabled="copyingRoomMods || loadingRoomCopySource || !roomCopySourceLoaded || roomCopyAssignmentCount === 0" @click="copyModsFromRoom">
            <Spinner v-if="copyingRoomMods" data-icon="inline-start" />
            <Copy v-else data-icon="inline-start" />
            {{ $t('mods.installed.roomCopy.confirm') }}
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="configFileDialogVisible">
      <DialogContent class="max-w-4xl">
        <DialogHeader><DialogTitle>{{ $t('mods.installed.configFile.title') }}</DialogTitle><DialogDescription>{{ configFileWorldName }} · modoverrides.lua</DialogDescription></DialogHeader>
        <div v-if="loadingConfig" class="loading-state"><Spinner /><span>{{ $t('mods.installed.configFile.loading') }}</span></div>
        <pre v-else class="lua-code">{{ configFileContent }}</pre>
        <DialogFooter><UiButton variant="outline" @click="configFileDialogVisible = false">{{ $t('mods.actions.close') }}</UiButton><UiButton @click="downloadConfigFile"><Download data-icon="inline-start" />{{ $t('mods.actions.downloadConfigFile') }}</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import RoomScopeSelect from '@/components/layout/RoomScopeSelect.vue'
import { ChevronDown, CirclePause, CirclePlay, Copy, Download, FileCode2, ImageIcon, Info, MoreHorizontal, Network, PackageOpen, Plus, RefreshCw, Search, Server, Settings2, ShieldCheck, SunMedium, TriangleAlert } from '@lucide/vue';
import { toast } from 'vue-sonner';
import ModConfigDialog from './ModConfigDialog.vue';
import ModDetailsDialog from './ModDetailsDialog.vue';
import RoomModPublicationPanel from '@/components/mods/RoomModPublicationPanel.vue';
import { modApi } from '@/api';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Checkbox as UiCheckbox } from '@/components/ui/checkbox';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Progress as UiProgress } from '@/components/ui/progress';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { createModFailure, formatModDate, formatModFailure } from '@/i18n/modMessages';
import { emitGlobalJobSubmitted, formatJobRate, globalJobTransfer } from '@/lib/globalJobs.mjs';
import { useSharedJobStatus } from '@/composables/useGlobalJobStatus';
import { modThumbnailUrl } from '@/lib/modImages.mjs';
import { roomModOperationalStatus, roomModStatusVariant, roomModFileStatusLabel } from '@/lib/roomModOverview.mjs';
import { sortRoomModCatalog } from '@/lib/roomModCatalog.mjs';
import { enrichModMetadata } from '@/lib/modMetadata.mjs';
import { composeModConfigurationPatch, composeModWorldConfigured, composeModWorldEnabled, sameModConfigurationOverrides } from '@/lib/modWorldState.mjs';
import { matchRoomWorlds } from '@/lib/roomCopy.mjs';

export default {
  name: 'ModList',
  setup() { return { jobStatus: useSharedJobStatus() }; },
  props: {
    embedded: { type: Boolean, default: false }
  },
  emits: ['browse-workshop'],
  components: {
    RoomScopeSelect,
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Badge,
    UiProgress,
    ChevronDown,
    CirclePause,
    CirclePlay,
    Copy,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Download,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    FileCode2,
    ImageIcon,
    Info,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    ModConfigDialog,
    ModDetailsDialog,
    MoreHorizontal,
    Network,
    PackageOpen,
    Plus,
    RefreshCw,
    RoomModPublicationPanel,
    Search,
    Server,
    Separator,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Settings2,
    ShieldCheck,
    Spinner,
    SunMedium,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TriangleAlert,
    ToggleGroup,
    ToggleGroupItem,
    UiButton,
    UiCheckbox,
    UiDialog,
    UiSelect,
    UiSwitch
  },
  data() {
    return {
      // 模组列表
      modsList: [],
      // 加载状态
      loading: false,
      loadFailure: null,
      loadingRooms: false,
      contextRequestId: 0,
      catalogRequestId: 0,
      metadataWarning: '',
      incompleteMetadataIds: [],
      metadataLoading: false,
      metadataRequestId: 0,
      roomOptions: [],
      selectedRoomId: '',
      selectedRoomWorlds: [],
      selectedWorldId: '',
      publicationDialogVisible: false,
      modUpdateDialogVisible: false,
      modUpdateLoading: false,
      modUpdateSaving: false,
      modUpdateChecking: false,
      modUpdateOverview: null,
      modUpdateMode: 'manual',
      modUpdateDraft: {
        checkIntervalMinutes: 5,
        emptyGraceSeconds: 60,
        gameAnnouncement: true
      },
      // 筛选
      filterForm: {
        status: 'all',
        sortBy: 'enabled',
        keyword: ''
      },
      // 配置对话框
      configDialogVisible: false,
      configScope: 'world',
      configWorldIds: [],
      configExpectedRevisions: {},
      currentModId: null,
      currentModInfo: null,
      // 详情对话框
      detailsDialogVisible: false,
      detailsLoading: false,
      detailsRequestId: 0,
      // 配置复制
      copyDialogVisible: false,
      copying: false,
      copySourceWorldId: '',
      copyTargetWorldIds: [],
      roomCopyDialogVisible: false,
      roomCopySourceRoomId: '',
      roomCopySourceWorlds: [],
      roomCopySourceMods: [],
      roomCopySourceLoaded: false,
      loadingRoomCopySource: false,
      copyingRoomMods: false,
      roomCopyCompleted: 0,
      roomCopyCurrentItem: '',
      // 默认图标
      defaultIcon: '',
      // 配置文件查看相关
      configFileDialogVisible: false,
      configFileContent: '',
      configFileWorldName: '',
      loadingConfig: false,
      modActionState: {},
      expandedModIds: {},
      sharedSourceDialogVisible: false,
      sharedSourceMod: null,
      sharedSourceWorldId: '',
      sharedModeAfterSave: null
    };
  },
  computed: {
    sharedSourceWorlds() {
      return this.selectedRoomWorlds.filter(world => this.isConfiguredInWorld(this.sharedSourceMod, world));
    },
    loadError() {
      return this.localizedFailure(this.loadFailure);
    },
    currentRoom() {
      return this.roomOptions.find(room => room.id === this.selectedRoomId) || null;
    },
    modUpdateState() {
      return this.modUpdateOverview?.state || null;
    },
    modUpdateButtonLabel() {
      const status = this.modUpdateState?.status;
      if (status && status !== 'idle') return this.modUpdateStatusLabel(status);
      return this.$t('mods.autoUpdate.actions.open');
    },
    modUpdateStatusDescription() {
      const state = this.modUpdateState;
      if (!state) return '';
      if (state.errorMessage) return state.errorMessage;
      if (state.status === 'waiting_for_players') return this.$t('mods.autoUpdate.status.waitingPlayersDescription', { count: state.onlinePlayers || 0 });
      if (state.availableModIds?.length) return this.$t('mods.autoUpdate.status.availableDescription', { count: state.availableModIds.length });
      return this.$t(`mods.autoUpdate.status.${state.status}Description`);
    },
    currentWorld() {
      return this.selectedRoomWorlds.find(world => world.id === this.selectedWorldId) || null;
    },
    copySourceWorld() {
      return this.selectedRoomWorlds.find(world => world.id === this.copySourceWorldId) || null;
    },
    availableCopyTargets() {
      return this.currentModInfo && this.copySourceWorld
        ? this.copyTargets(this.currentModInfo, this.copySourceWorld)
        : [];
    },
    availableRoomCopySources() {
      return this.roomOptions.filter(room => room.id !== this.selectedRoomId);
    },
    roomCopyWorldMatches() {
      return matchRoomWorlds(this.roomCopySourceWorlds, this.selectedRoomWorlds);
    },
    roomCopyAssignmentCount() {
      const matchedSourceIds = new Set(this.roomCopyWorldMatches.filter(match => match.target).map(match => match.source.id));
      return this.roomCopySourceMods.reduce((count, mod) => count + (mod.configuredWorlds || []).filter(id => matchedSourceIds.has(id)).length, 0);
    },
    roomCopyProgressPercent() {
      if (this.roomCopyAssignmentCount === 0) return 0;
      return Math.round((this.roomCopyCompleted / this.roomCopyAssignmentCount) * 100);
    },
    filterChanged() {
      return this.filterForm.status !== 'all'
        || this.filterForm.sortBy !== 'enabled'
        || Boolean(this.filterForm.keyword.trim());
    },
    // 筛选后的模组列表
    filteredMods() {
      let result = [...this.modsList];
      if (this.filterForm.status && this.filterForm.status !== 'all') {
        result = result.filter(mod => this.roomModStatus(mod) === this.filterForm.status);
      }
      if (this.filterForm.keyword) {
        const keyword = this.filterForm.keyword.toLowerCase();
        result = result.filter(mod => 
          (mod.name || '').toLowerCase().includes(keyword) ||
          (mod.author || '').toLowerCase().includes(keyword) ||
          String(mod.modid || mod.id || '').includes(keyword) ||
          (mod.description && mod.description.toLowerCase().includes(keyword))
        );
      }
      return sortRoomModCatalog(result, this.filterForm.sortBy, this.selectedRoomWorlds.map(world => world.id));
    }
  },
  async created() {
    await this.initializeContext();
  },
  beforeUnmount() {
    this.contextRequestId += 1;
    this.catalogRequestId += 1;
  },
  watch: {
    '$route.query.roomId'(roomId) {
      if (roomId && roomId !== this.selectedRoomId) this.handleRoomChange(roomId);
    },
    '$route.query.worldId'(worldId) {
      if (this.selectedRoomWorlds.some(world => world.id === worldId)) this.selectedWorldId = worldId;
    }
  },
  methods: {
    modThumbnailUrl,
    handleImageError(event) {
      event.currentTarget.hidden = true;
    },
    async initializeContext() {
      const requestId = ++this.contextRequestId;
      this.loadingRooms = true;
      this.loadFailure = null;
      try {
        const context = await modApi.getContext({
          roomId: this.$route.query.roomId || '',
          preferRememberedRoom: true,
          worldId: this.$route.query.worldId || ''
        });
        if (requestId !== this.contextRequestId) return;
        this.roomOptions = context.rooms;
        this.selectedRoomId = context.room?.id || '';
        this.selectedRoomWorlds = context.worlds;
        this.selectedWorldId = this.preferredWorldId(context.worlds, context.world?.id);
        if (this.selectedRoomId) {
          await this.syncRouteContext();
          if (requestId !== this.contextRequestId) return;
          await Promise.all([this.fetchModsList(), this.loadModUpdateOverview(true)]);
        }
      } catch (error) {
        if (requestId !== this.contextRequestId) return;
        this.loadFailure = this.failure('mods.errors.context', error);
        toast.error(this.loadError);
      } finally {
        if (requestId === this.contextRequestId) this.loadingRooms = false;
      }
    },

    async handleRoomChange(roomId) {
      const requestId = ++this.contextRequestId;
      this.catalogRequestId += 1;
      this.selectedRoomId = roomId;
      this.metadataWarning = '';
      this.incompleteMetadataIds = [];
      this.selectedRoomWorlds = [];
      this.modsList = [];
      this.loadingRooms = true;
      this.configDialogVisible = false;
      this.publicationDialogVisible = false;
      this.modUpdateDialogVisible = false;
      this.modUpdateOverview = null;
      this.expandedModIds = {};
      this.sharedSourceDialogVisible = false;
      this.sharedSourceMod = null;
      this.sharedModeAfterSave = null;
      this.loadFailure = null;
      try {
        const context = await modApi.getContext({ roomId });
        if (requestId !== this.contextRequestId) return;
        this.selectedRoomId = context.room?.id || '';
        this.selectedRoomWorlds = context.worlds;
        this.selectedWorldId = this.preferredWorldId(context.worlds, context.world?.id);
        await this.syncRouteContext();
        if (requestId !== this.contextRequestId) return;
        await Promise.all([this.fetchModsList(), this.loadModUpdateOverview(true)]);
      } catch (error) {
        if (requestId !== this.contextRequestId) return;
        this.loadFailure = this.failure('mods.errors.roomSwitch', error);
        toast.error(this.loadError);
      } finally {
        if (requestId === this.contextRequestId) this.loadingRooms = false;
      }
    },

    async handleWorldChange(worldId) {
      if (!worldId || worldId === this.selectedWorldId) return;
      this.selectedWorldId = worldId;
      await this.syncRouteContext();
    },

    preferredWorldId(worlds, requestedId = '') {
      if (requestedId && worlds.some(world => world.id === requestedId)) return requestedId;
      const master = worlds.find(world => world.isMaster || world.is_master);
      return master?.id || worlds[0]?.id || '';
    },

    async syncRouteContext() {
      await this.$router.replace({
        path: this.$route.path,
        query: {
          ...this.$route.query,
          roomId: this.selectedRoomId || undefined,
          worldId: this.selectedWorldId || undefined
        }
      });
    },

    // 获取模组列表
    async fetchModsList(silent = false) {
      const requestId = ++this.catalogRequestId;
      const roomId = this.selectedRoomId;
      this.metadataWarning = '';
      this.incompleteMetadataIds = [];
      if (!this.selectedRoomId) {
        this.modsList = [];
        return;
      }
      if (!silent) this.loading = true;
      this.loadFailure = null;
      try {
        const items = await modApi.getRoomModCatalog({ roomId, worlds: this.selectedRoomWorlds });
        if (requestId !== this.catalogRequestId || roomId !== this.selectedRoomId) return;
        this.modsList = items;
        void this.loadModMetadata(roomId, requestId);
      } catch (error) {
        if (requestId !== this.catalogRequestId || roomId !== this.selectedRoomId) return;
        this.modsList = [];
        this.loadFailure = this.failure('mods.errors.list', error);
        toast.error(this.loadError);
      } finally {
        if (requestId === this.catalogRequestId) this.loading = false;
      }
    },

    async loadModMetadata(roomId, requestId, items = this.modsList, retry = false) {
      if (!items.length) return;
      const metadataRequestId = ++this.metadataRequestId;
      this.metadataLoading = true;
      try {
        const result = await modApi.getModMetadata(items);
        if (requestId !== this.catalogRequestId || roomId !== this.selectedRoomId || metadataRequestId !== this.metadataRequestId) return;
        this.modsList = enrichModMetadata(this.modsList, result.metadata);
        this.metadataWarning = result.warning;
        this.incompleteMetadataIds = result.incompleteModIds || [];
        if (retry) {
          if (this.incompleteMetadataIds.length) toast.info(this.$t('mods.metadata.retryIncomplete', { count: this.incompleteMetadataIds.length }));
          else toast.success(this.$t('mods.metadata.retryCompleted'));
        }
      } catch (error) {
        if (requestId !== this.catalogRequestId || roomId !== this.selectedRoomId || metadataRequestId !== this.metadataRequestId) return;
        this.incompleteMetadataIds = items.map(item => String(item.modid || item.id));
        this.metadataWarning = error?.message || String(error);
        if (retry) toast.info(this.$t('mods.metadata.retryIncomplete', { count: this.incompleteMetadataIds.length }));
      } finally {
        if (metadataRequestId === this.metadataRequestId) this.metadataLoading = false;
      }
    },

    async retryModMetadata() {
      if (this.metadataLoading || !this.selectedRoomId) return;
      const ids = new Set(this.incompleteMetadataIds);
      await this.loadModMetadata(this.selectedRoomId, this.catalogRequestId, this.modsList.filter(item => ids.has(String(item.modid || item.id))), true);
    },

    isModBusy(mod) {
      return Boolean(this.modActionState[mod?.modid]);
    },

    modActionProgress(mod) {
      return this.clampProgress(this.modActionState[mod?.modid]?.progress);
    },

    modActionRate(mod) {
      const transfer = globalJobTransfer(this.modActionState[mod?.modid]);
      return formatJobRate(transfer?.bytesPerSecond);
    },

    isModExpanded(mod) {
      return Boolean(this.expandedModIds[mod?.modid || mod?.id]);
    },

    toggleModExpanded(mod) {
      const id = mod?.modid || mod?.id;
      if (!id) return;
      this.expandedModIds = { ...this.expandedModIds, [id]: !this.expandedModIds[id] };
    },

    modOperationalStatus(mod) {
      const enabled = this.roomModStatus(mod) !== 'disabled';
      return roomModOperationalStatus({
        ...mod,
        configured: true,
        enabled,
        health: enabled && mod?.health === 'disabled' ? '' : mod?.health
      });
    },

    modOperationalStatusLabel(mod) {
      const status = this.modOperationalStatus(mod);
      if (['pending', 'corrupt', 'unavailable'].includes(status)) {
        const targets = this.selectedRoomWorlds.map(world => ({ id: world.appliedTargetId, name: world.appliedTargetName }));
        const label = roomModFileStatusLabel(mod, targets, this.$t);
        if (label) return label;
      }
      if (status === 'ready' && Number(mod?.runtimeTotalTargets) > 1) {
        return this.$t('mods.installed.operational.readyTargets', {
          ready: mod.runtimeReadyTargets,
          total: mod.runtimeTotalTargets
        });
      }
      if (status === 'pending') {
        return this.$t('mods.installed.operational.pendingTargets', { count: mod?.runtimePendingTargets || 1 });
      }
      if (status === 'unavailable') {
        if (!Number(mod?.runtimeTotalTargets)) return this.$t('mods.installed.operational.noTarget');
        return this.$t('mods.installed.operational.unavailableTargets', { count: mod?.runtimeUnavailableTargets || 1 });
      }
      return this.$t(`mods.installed.operational.${status}`);
    },

    modOperationalStatusVariant(mod) {
      return roomModStatusVariant(this.modOperationalStatus(mod));
    },

    modVersionLabel(mod) {
      const current = String(mod?.currentVersion || mod?.runtimeVersion || '').trim();
      const latest = String(mod?.latestVersion || '').trim();
      if (mod?.runtimeVersionStatus === 'mixed') {
        return this.$t('mods.installed.versions.mixed', { latest: latest || '--' });
      }
      if (mod?.runtimeVersionStatus === 'unknown') {
        return this.$t('mods.installed.versions.unknown', { latest: latest || '--' });
      }
      if (current && latest && current !== latest) {
        return this.$t('mods.installed.versions.transition', { current, latest });
      }
      if (current) return this.$t('mods.installed.versions.current', { version: current });
      if (latest) return this.$t('mods.installed.versions.latest', { version: latest });
      return mod?.version ? this.$t('mods.installed.versions.current', { version: mod.version }) : '';
    },


    isConfiguredInWorld(mod, world) {
      return Boolean(world?.id && mod?.configuredWorlds?.includes(world.id));
    },

    isEnabledInWorld(mod, world) {
      return Boolean(world?.id && mod?.enabledWorlds?.includes(world.id));
    },

    usesSeparateWorldConfig(mod) {
      return mod?.roomProfile?.configurationMode === 'separate';
    },

    hasMixedConfiguration(mod) {
      return Boolean(mod?.roomProfile?.configurationMixed);
    },

    async setSeparateWorldConfig(mod, value) {
      if (!value && mod?.roomProfile?.configurationMixed) {
        this.chooseSharedSource(mod);
        return;
      }
      await this.saveConfigurationMode(mod, value);
    },

    async saveConfigurationMode(mod, separate, roomId = this.selectedRoomId) {
      const modId = mod?.modid || mod?.id;
      if (!modId || this.isModBusy(mod)) return;
      this.setModBusy(mod, true);
      try {
        await modApi.setConfigurationMode(roomId, modId, separate ? 'separate' : 'shared');
        if (roomId !== this.selectedRoomId) return;
        for (const item of [...this.modsList, this.currentModInfo].filter(Boolean)) {
          if ((item.modid || item.id) === modId) {
            item.roomProfile = { ...item.roomProfile, configurationMode: separate ? 'separate' : 'shared' };
          }
        }
      } catch (error) {
        toast.error(this.$t('mods.installed.worldMatrix.modeSaveFailed', { error: error?.message || String(error) }));
      } finally {
        this.setModBusy(mod, false);
      }
    },

    chooseSharedSource(mod) {
      this.sharedSourceMod = mod;
      this.sharedSourceWorldId = '';
      this.sharedSourceDialogVisible = true;
    },

    confirmSharedSource() {
      if (!this.sharedSourceWorldId || !this.sharedSourceMod) return;
      const mod = this.sharedSourceMod;
      this.sharedModeAfterSave = { roomId: this.selectedRoomId, modId: mod.modid || mod.id };
      this.sharedSourceDialogVisible = false;
      this.openRoomConfigDialog(mod, this.sharedSourceWorldId);
    },

    worldStateLabel(mod, world) {
      if (!this.isConfiguredInWorld(mod, world)) return this.$t('mods.installed.worldState.notConfigured');
      return this.$t(this.isEnabledInWorld(mod, world) ? 'mods.values.enabled' : 'mods.values.disabled');
    },

    worldStateBadgeVariant(mod, world) {
      if (!this.isConfiguredInWorld(mod, world)) return 'outline';
      return this.isEnabledInWorld(mod, world) ? 'default' : 'secondary';
    },

    roomModStatus(mod) {
      if (mod?.machineOnly) return 'machineOnly';
      const worlds = this.selectedRoomWorlds;
      if (worlds.length === 0) return 'disabled';
      const enabledCount = worlds.filter(world => this.isEnabledInWorld(mod, world)).length;
      const configuredCount = worlds.filter(world => this.isConfiguredInWorld(mod, world)).length;
      if (configuredCount === worlds.length && enabledCount === worlds.length) return 'allEnabled';
      if (enabledCount === 0) return 'disabled';
      return 'partial';
    },

    roomWorldSummary(mod) {
      const enabledCount = this.selectedRoomWorlds.filter(world => this.isEnabledInWorld(mod, world)).length;
      return this.$t('mods.installed.worldMatrix.summary', {
        enabled: enabledCount,
        total: this.selectedRoomWorlds.length
      });
    },

    machineCoverageSummary(mod) {
      const total = Number(mod?.runtimeTotalTargets) || 0;
      if (!total) return this.$t('mods.installed.operational.noTarget');
      return this.$t('mods.installed.operational.machineCoverage', {
        ready: Number(mod?.runtimeReadyTargets) || 0,
        total
      });
    },

    requiresAllClients(mod) {
      return (mod?.tags || []).some(tag => String(tag).trim().toLowerCase() === 'all_clients_require_mod');
    },

    hasPartialWorldCoverage(mod) {
      if (this.selectedRoomWorlds.length < 2) return false;
      const enabledCount = this.selectedRoomWorlds.filter(world => this.isEnabledInWorld(mod, world)).length;
      return enabledCount > 0 && enabledCount < this.selectedRoomWorlds.length;
    },

    copyTargets(mod, sourceWorld) {
      return this.selectedRoomWorlds.filter(world =>
        world.id !== sourceWorld?.id && this.isConfiguredInWorld(mod, world)
      );
    },

    setModBusy(mod, busy) {
      if (!mod?.modid) return;
      const next = { ...this.modActionState };
      if (busy) {
        next[mod.modid] = { progress: Math.max(1, Number(next[mod.modid]?.progress) || 0), transfer: null };
      } else {
        delete next[mod.modid];
      }
      this.modActionState = next;
    },

    setModActionProgress(mod, progress) {
      if (!mod?.modid) return;
      const current = this.modActionProgress(mod);
      this.modActionState = {
        ...this.modActionState,
        [mod.modid]: {
          ...this.modActionState[mod.modid],
          progress: Math.max(current, this.clampProgress(progress))
        }
      };
    },

    setModJobProgress(mod, job, start = 1, end = 99) {
      if (!mod?.modid) return;
      const progress = this.clampProgress(job?.progress);
      const mappedProgress = Math.round(start + (progress * (end - start) / 100));
      this.modActionState = {
        ...this.modActionState,
        [mod.modid]: {
          ...this.modActionState[mod.modid],
          progress: Math.max(this.modActionProgress(mod), this.clampProgress(mappedProgress)),
          transfer: job?.transfer || null
        }
      };
    },

    trackModTask(mod, job) {
      if (job?.id && this.modActionState[mod.modid]?.jobId !== job.id) {
        emitGlobalJobSubmitted({ ...job, displayName: mod.name });
        this.modActionState = { ...this.modActionState, [mod.modid]: { ...this.modActionState[mod.modid], jobId: job.id } };
      }
      this.setModJobProgress(mod, job);
    },

    clampProgress(value) {
      const progress = Number(value);
      if (!Number.isFinite(progress)) return 0;
      return Math.max(0, Math.min(100, Math.round(progress)));
    },

    applyModWorldEnabled(modId, roomId, worldId, enabled) {
      if (this.selectedRoomId !== roomId) return;
      this.modsList = this.modsList.map(item =>
        (item.modid || item.id) === modId
          ? composeModWorldEnabled(item, worldId, enabled)
          : item
      );
      if ((this.currentModInfo?.modid || this.currentModInfo?.id) === modId) {
        this.currentModInfo = composeModWorldEnabled(this.currentModInfo, worldId, enabled);
      }
    },

    applyModWorldConfigured(modId, roomId, worldId, configured, enabled = false) {
      if (this.selectedRoomId !== roomId) return;
      this.modsList = this.modsList.map(item =>
        (item.modid || item.id) === modId
          ? composeModWorldConfigured(item, worldId, configured, enabled)
          : item
      );
      if ((this.currentModInfo?.modid || this.currentModInfo?.id) === modId) {
        this.currentModInfo = composeModWorldConfigured(this.currentModInfo, worldId, configured, enabled);
      }
    },

    applyModWorldRevisions(modId, roomId, revisions = {}) {
      if (this.selectedRoomId !== roomId || !Object.keys(revisions).length) return;
      this.catalogRequestId += 1;
      this.loading = false;
      const update = item => ({
        ...item,
        worldRevisions: { ...(item.worldRevisions || {}), ...revisions }
      });
      this.modsList = this.modsList.map(update);
      if (this.currentModInfo) this.currentModInfo = update(this.currentModInfo);
    },

    async modWorldRevisions(mod, worlds) {
      const revisions = { ...(mod.worldRevisions || {}) };
      const missing = worlds.filter(world => !revisions[world.id]);
      await Promise.all(missing.map(async world => {
        const file = await modApi.getAllModConfigFile({ roomId: this.selectedRoomId, worldId: world.id });
        revisions[world.id] = file?.file?.revision || '';
      }));
      return Object.fromEntries(worlds.map(world => [world.id, revisions[world.id]]));
    },

    failure(key, error) {
      return createModFailure(key, error);
    },

    localizedFailure(failure) {
      return formatModFailure(this.$t, failure);
    },

    formatDate(value, fallback = '--') {
      if (!value) return fallback;
      return formatModDate(value, this.$i18n.locale);
    },

    // 应用筛选
    applyFilter() {
      // 已通过计算属性实现
    },

    // 重置筛选
    resetFilter() {
      this.filterForm = {
        status: 'all',
        sortBy: 'enabled',
        keyword: ''
      };
    },
    
    // 刷新模组列表
    refreshModList() {
      this.fetchModsList();
    },

    modUpdateStatusLabel(status) {
      return this.$t(`mods.autoUpdate.status.${status || 'idle'}`);
    },

    applyModUpdateOverview(value) {
      this.modUpdateOverview = value;
      const policy = value?.policy || {};
      this.modUpdateMode = !policy.autoCheck
        ? 'manual'
        : policy.autoPrepare && policy.applyWhenEmpty ? 'auto' : 'notify';
      this.modUpdateDraft = {
        checkIntervalMinutes: Number(policy.checkIntervalMinutes) || 5,
        emptyGraceSeconds: Number(policy.emptyGraceSeconds) || 60,
        gameAnnouncement: policy.gameAnnouncement !== false
      };
    },

    async loadModUpdateOverview(silent = false) {
      if (!this.selectedRoomId) return;
      const roomId = this.selectedRoomId;
      const requestId = this.contextRequestId;
      if (!silent) this.modUpdateLoading = true;
      try {
        const value = await modApi.getModUpdateOverview(roomId);
        if (requestId === this.contextRequestId && roomId === this.selectedRoomId) this.applyModUpdateOverview(value);
      } catch (error) {
        if (!silent && requestId === this.contextRequestId) toast.error(this.$t('mods.autoUpdate.feedback.loadFailed', { error: error?.message || String(error) }));
      } finally {
        if (!silent && requestId === this.contextRequestId) this.modUpdateLoading = false;
      }
    },

    openModUpdateDialog() {
      this.modUpdateDialogVisible = true;
      this.loadModUpdateOverview();
    },

    async saveModUpdatePolicy() {
      if (!this.selectedRoomId) return;
      this.modUpdateSaving = true;
      try {
        const automatic = this.modUpdateMode === 'auto';
        const notify = this.modUpdateMode === 'notify';
        const value = await modApi.saveModUpdatePolicy(this.selectedRoomId, {
          autoCheck: automatic || notify,
          autoPrepare: automatic,
          applyWhenEmpty: automatic,
          restartWithPlayers: false,
          gameAnnouncement: automatic && this.modUpdateDraft.gameAnnouncement,
          emptyGraceSeconds: Number(this.modUpdateDraft.emptyGraceSeconds),
          checkIntervalMinutes: Number(this.modUpdateDraft.checkIntervalMinutes),
          expectedRevision: this.modUpdateOverview?.policy?.revision || ''
        });
        this.applyModUpdateOverview(value);
        toast.success(this.$t('mods.autoUpdate.feedback.saved'));
      } catch (error) {
        toast.error(this.$t('mods.autoUpdate.feedback.saveFailed', { error: error?.message || String(error) }));
      } finally {
        this.modUpdateSaving = false;
      }
    },

    async checkModUpdatesNow() {
      if (!this.selectedRoomId) return;
      this.modUpdateChecking = true;
      try {
        await modApi.checkModUpdatesNow(this.selectedRoomId);
        if (this.modUpdateOverview?.state) this.modUpdateOverview.state.status = 'checking';
        toast.success(this.$t('mods.autoUpdate.feedback.checkStarted'));
      } catch (error) {
        toast.error(this.$t('mods.autoUpdate.feedback.checkFailed', { error: error?.message || String(error) }));
      } finally {
        this.modUpdateChecking = false;
      }
    },

    async handlePublicationPublished() {
      await this.fetchModsList(true);
    },

    retryLoad() {
      if (this.selectedRoomId) this.fetchModsList();
      else this.initializeContext();
    },
    
    selectWorldContext(world) {
      if (!world?.id) return;
      this.selectedWorldId = world.id;
      this.syncRouteContext();
    },

    openConfigDialog(mod, world) {
      this.sharedModeAfterSave = null;
      if (!world?.id) {
        toast.warning(this.$t('mods.installed.feedback.selectConfigWorld'));
        return;
      }
      this.selectWorldContext(world);
      this.detailsRequestId += 1;
      this.detailsLoading = false;
      this.currentModId = mod.modid || mod.id;
      this.currentModInfo = mod;
      this.configScope = 'world';
      this.configWorldIds = [world.id];
      this.configExpectedRevisions = {};
      this.configDialogVisible = true;
      this.$nextTick(() => {
        this.detailsDialogVisible = false;
      });
    },

    async openRoomConfigDialog(mod, sourceWorldId = '') {
      const roomId = this.selectedRoomId;
      const contextRequestId = this.contextRequestId;
      if (!sourceWorldId) this.sharedModeAfterSave = null;
      if (!sourceWorldId && mod?.roomProfile?.configurationMixed) {
        this.chooseSharedSource(mod);
        return;
      }
      const worlds = this.selectedRoomWorlds.filter(world => this.isConfiguredInWorld(mod, world));
      if (!worlds.length) {
        toast.warning(this.$t('mods.installed.feedback.selectConfiguredWorld'));
        return;
      }
      const sourceWorld = sourceWorldId
        ? worlds.find(world => world.id === sourceWorldId)
        : worlds.find(world => world.id === this.selectedWorldId) || worlds[0];
      if (!sourceWorld) return;
      const requestId = ++this.detailsRequestId;
      try {
        const expectedRevisions = await this.modWorldRevisions(mod, worlds);
        if (roomId !== this.selectedRoomId || contextRequestId !== this.contextRequestId || requestId !== this.detailsRequestId) return;
        this.selectWorldContext(sourceWorld);
        this.detailsLoading = false;
        this.currentModId = mod.modid || mod.id;
        this.currentModInfo = mod;
        this.configScope = 'room';
        this.configWorldIds = worlds.map(world => world.id);
        this.configExpectedRevisions = expectedRevisions;
        this.configDialogVisible = true;
        this.$nextTick(() => {
          this.detailsDialogVisible = false;
        });
      } catch (error) {
        if (roomId !== this.selectedRoomId || requestId !== this.detailsRequestId) return;
        toast.error(this.localizedFailure(this.failure('mods.errors.config', error)));
      }
    },

    // 配置更新回调
    handleConfigUpdated({ roomId, modId, revisions = {} }) {
      this.applyModWorldRevisions(modId, roomId, revisions);
      if (roomId === this.selectedRoomId && modId === this.currentModId) {
        this.configExpectedRevisions = { ...this.configExpectedRevisions, ...revisions };
        const mod = this.modsList.find(item => (item.modid || item.id) === modId);
        if (this.configScope === 'room' && mod) {
          mod.roomProfile = { ...mod.roomProfile, configurationMixed: false };
          if (this.sharedModeAfterSave?.roomId === roomId && this.sharedModeAfterSave?.modId === modId) {
            this.sharedModeAfterSave = null;
            this.saveConfigurationMode(mod, false, roomId);
          }
        } else if (mod?.roomProfile) {
          this.fetchModsList(true);
        }
      }
    },
    
    // 切换模组状态
    async addModToWorld(mod, world) {
      if (this.isModBusy(mod) || !world?.id || this.isConfiguredInWorld(mod, world)) return;
      const roomId = this.selectedRoomId;
      this.setModBusy(mod, true);
      try {
        this.setModActionProgress(mod, 3);
        await modApi.addModToRoom({
          roomId,
          id: mod.modid || mod.id,
          worldIds: [world.id],
          targetIds: [world.appliedTargetId],
          enabled: true,
          includeDependencies: true,
          waitForJob: this.jobStatus?.waitForJob,
          onProgress: job => this.trackModTask(mod, job)
        });
        this.setModActionProgress(mod, 100);
        this.applyModWorldConfigured(mod.modid || mod.id, roomId, world.id, true, true);
        toast.success(this.$t('mods.installed.feedback.addedToWorld', { name: mod.name, world: world.name }));
        this.fetchModsList(true);
      } catch (error) {
        toast.error(this.localizedFailure(this.failure('mods.errors.addToRoom', error)));
      } finally {
        this.setModBusy(mod, false);
      }
    },

    async addModToRoomDefault(mod) {
      if (this.isModBusy(mod) || this.selectedRoomWorlds.length === 0) return;
      const roomId = this.selectedRoomId;
      const worlds = [...this.selectedRoomWorlds];
      this.setModBusy(mod, true);
      try {
        this.setModActionProgress(mod, 3);
        await modApi.addModToRoom({
          roomId,
          id: mod.modid || mod.id,
          worldIds: worlds.map(world => world.id),
          targetIds: [...new Set(worlds.map(world => world.appliedTargetId).filter(Boolean))],
          enabled: true,
          includeDependencies: true,
          waitForJob: this.jobStatus?.waitForJob,
          onProgress: job => this.trackModTask(mod, job)
        });
        this.setModActionProgress(mod, 100);
        for (const world of worlds) this.applyModWorldConfigured(mod.modid || mod.id, roomId, world.id, true, true);
        toast.success(this.$t('mods.installed.feedback.addedToRoom', { name: mod.name }));
        this.fetchModsList(true);
      } catch (error) {
        toast.error(this.localizedFailure(this.failure('mods.errors.addToRoom', error)));
      } finally {
        this.setModBusy(mod, false);
      }
    },

    async toggleModStatus(mod, world, status) {
      if (this.isModBusy(mod)) return;
      if (!this.isConfiguredInWorld(mod, world)) {
        toast.warning(this.$t('mods.installed.feedback.selectConfiguredWorld'));
        return;
      }
      const roomId = this.selectedRoomId;
      const worldId = world.id;
      const previousStatus = this.isEnabledInWorld(mod, world);
      if (status === previousStatus) return;

      this.setModBusy(mod, true);
      this.applyModWorldEnabled(mod.modid, roomId, worldId, status);
      try {
        const expectedRevisions = await this.modWorldRevisions(mod, [world]);
        const result = await modApi.toggleMod({
          roomId,
          modid: mod.modid,
          worldIds: [worldId],
          enabled: status,
          expectedRevision: expectedRevisions[worldId]
        });
        this.applyModWorldRevisions(mod.modid, roomId, result?.revisions || { [worldId]: result?.revision });
        this.setModActionProgress(mod, 100);
        toast.success(this.$t(status ? 'mods.installed.feedback.enabledInWorld' : 'mods.installed.feedback.disabledInWorld', { name: mod.name, world: world.name }));
      } catch (err) {
        this.applyModWorldEnabled(mod.modid, roomId, worldId, previousStatus);
        console.error(err);
        toast.error(this.localizedFailure(this.failure(status ? 'mods.errors.toggleEnable' : 'mods.errors.toggleDisable', err)));
      } finally {
        this.setModBusy(mod, false);
      }
    },

    async toggleRoomModStatus(mod, status) {
      if (this.isModBusy(mod)) return;
      const worlds = this.selectedRoomWorlds.filter(world => this.isConfiguredInWorld(mod, world));
      if (!worlds.length) return;
      const roomId = this.selectedRoomId;
      const previous = Object.fromEntries(worlds.map(world => [world.id, this.isEnabledInWorld(mod, world)]));
      if (worlds.every(world => previous[world.id] === status)) return;

      this.setModBusy(mod, true);
      for (const world of worlds) this.applyModWorldEnabled(mod.modid, roomId, world.id, status);
      try {
        const expectedRevisions = await this.modWorldRevisions(mod, worlds);
        const result = await modApi.toggleMod({
          roomId,
          modid: mod.modid,
          worldIds: worlds.map(world => world.id),
          enabled: status,
          expectedRevisions
        });
        this.applyModWorldRevisions(mod.modid, roomId, result?.revisions || {});
        this.setModActionProgress(mod, 100);
        toast.success(this.$t(status ? 'mods.installed.feedback.enabledInRoom' : 'mods.installed.feedback.disabledInRoom', { name: mod.name }));
      } catch (error) {
        for (const world of worlds) this.applyModWorldEnabled(mod.modid, roomId, world.id, previous[world.id]);
        toast.error(this.localizedFailure(this.failure(status ? 'mods.errors.toggleEnable' : 'mods.errors.toggleDisable', error)));
      } finally {
        this.setModBusy(mod, false);
      }
    },

    openCopyDialog(mod, sourceWorld) {
      const targets = this.copyTargets(mod, sourceWorld);
      if (targets.length === 0) {
        toast.info(this.$t('mods.installed.copy.noTargets'));
        return;
      }
      this.currentModInfo = mod;
      this.copySourceWorldId = sourceWorld.id;
      this.copyTargetWorldIds = targets.map(world => world.id);
      this.copyDialogVisible = true;
    },

    openRoomCopyDialog() {
      if (this.availableRoomCopySources.length === 0) {
        toast.info(this.$t('rooms.copy.noSourceRooms'));
        return;
      }
      this.roomCopySourceRoomId = this.availableRoomCopySources[0].id;
      this.roomCopySourceLoaded = false;
      this.roomCopyDialogVisible = true;
      this.loadRoomCopySource(this.roomCopySourceRoomId);
    },

    async loadRoomCopySource(roomId) {
      this.roomCopySourceLoaded = false;
      this.loadingRoomCopySource = true;
      try {
        const [worlds, mods] = await Promise.all([
          modApi.getRoomWorlds(roomId),
          modApi.getRoomModFacts({ roomId })
        ]);
        this.roomCopySourceWorlds = worlds;
        this.roomCopySourceMods = mods;
        this.roomCopySourceLoaded = true;
      } catch (error) {
        toast.error(this.$t('mods.installed.roomCopy.loadFailed', { error: this.localizedFailure(this.failure('mods.errors.context', error)) }));
      } finally {
        this.loadingRoomCopySource = false;
      }
    },

    async copyModsFromRoom() {
      if (this.copyingRoomMods || !this.roomCopySourceLoaded || this.roomCopyAssignmentCount === 0) return;
      this.copyingRoomMods = true;
      this.roomCopyCompleted = 0;
      this.roomCopyCurrentItem = '';
      const failures = [];
      const targetRoomId = this.selectedRoomId;
      const topology = await modApi.getRoomTopology(targetRoomId).catch(() => null);
      const targetMods = new Map(this.modsList.map(mod => [String(mod.modid || mod.id), mod]));

      try {
        for (const sourceMod of this.roomCopySourceMods) {
          const modId = String(sourceMod.modid || sourceMod.id);
          for (const match of this.roomCopyWorldMatches) {
            if (!match.target || !(sourceMod.configuredWorlds || []).includes(match.source.id)) continue;
            const sourceEnabled = (sourceMod.enabledWorlds || []).includes(match.source.id);
            this.roomCopyCurrentItem = `${sourceMod.name} · ${match.target.name}`;
            try {
              let targetMod = targetMods.get(modId);
              let targetConfigured = Boolean(targetMod?.configuredWorlds?.includes(match.target.id));
              if (!targetConfigured) {
                await modApi.addModToRoom({
                  roomId: targetRoomId,
                  id: modId,
                  worldIds: [match.target.id],
                  targetIds: [match.target.appliedTargetId],
                  enabled: sourceEnabled,
                  includeDependencies: true
                });
                targetMod = composeModWorldConfigured(targetMod || { modid: modId }, match.target.id, true, sourceEnabled);
                targetMods.set(modId, targetMod);
                targetConfigured = true;
              }

              const [sourceConfig, targetConfig] = await Promise.all([
                modApi.getModCustomConfig({ roomId: this.roomCopySourceRoomId, worldId: match.source.id, modid: modId }),
                modApi.getModCustomConfig({ roomId: targetRoomId, worldId: match.target.id, modid: modId })
              ]);
              const sourceInfo = sourceConfig?.modinfo || {};
              const targetInfo = targetConfig?.modinfo || {};
              const sourceOverrides = sourceInfo.overridden_configuration_options || {};
              const targetOverrides = targetInfo.overridden_configuration_options || {};
              const enabledChanged = Boolean(targetInfo.enabled) !== sourceEnabled;
              const configurationChanged = !sameModConfigurationOverrides(sourceOverrides, targetOverrides);

              if (configurationChanged) {
                await modApi.saveModConfigurationForWorld({
                  roomId: targetRoomId,
                  worldId: match.target.id,
                  modid: modId,
                  targetId: match.target.appliedTargetId || '',
                  expectedTopologyRevision: topology?.revision || topology?.topologyRevision || '',
                  expectedRevision: targetInfo.revision,
                  enabled: sourceEnabled,
                  configuration_options: composeModConfigurationPatch(sourceOverrides, targetOverrides)
                });
              } else if (enabledChanged && targetConfigured) {
                await modApi.toggleMod({
                  roomId: targetRoomId,
                  modid: modId,
                  worldIds: [match.target.id],
                  targetIds: [match.target.appliedTargetId],
                  enabled: sourceEnabled
                });
              }
            } catch (error) {
              failures.push(`${sourceMod.name} · ${match.target.name}: ${this.localizedFailure(this.failure('mods.errors.copyConfiguration', error))}`);
            } finally {
              this.roomCopyCompleted += 1;
            }
          }
        }

        await this.fetchModsList(true);
        if (failures.length === 0) {
          this.roomCopyDialogVisible = false;
          toast.success(this.$t('mods.installed.roomCopy.success', { count: this.roomCopyCompleted }));
        } else {
          toast.warning(this.$t('mods.installed.roomCopy.partial', { completed: this.roomCopyCompleted - failures.length, failed: failures.length, error: failures[0] }));
        }
      } finally {
        this.copyingRoomMods = false;
        this.roomCopyCurrentItem = '';
      }
    },

    toggleCopyTarget(worldId, checked) {
      this.copyTargetWorldIds = checked
        ? [...new Set([...this.copyTargetWorldIds, worldId])]
        : this.copyTargetWorldIds.filter(id => id !== worldId);
    },

    async copyConfiguration() {
      if (this.copying || !this.currentModInfo || !this.copySourceWorld) return;
      const modId = this.currentModInfo.modid || this.currentModInfo.id;
      const targetWorlds = this.availableCopyTargets.filter(world => this.copyTargetWorldIds.includes(world.id));
      if (targetWorlds.length === 0) return;

      this.copying = true;
      let copiedCount = 0;
      try {
        const [source, topology] = await Promise.all([
          modApi.getModCustomConfig({ roomId: this.selectedRoomId, worldId: this.copySourceWorld.id, modid: modId }),
          modApi.getRoomTopology(this.selectedRoomId).catch(() => null)
        ]);
        const sourceInfo = source?.modinfo || {};
        const sourceOverrides = sourceInfo.overridden_configuration_options || {};
        for (const world of targetWorlds) {
          const target = await modApi.getModCustomConfig({ roomId: this.selectedRoomId, worldId: world.id, modid: modId });
          const targetInfo = target?.modinfo || {};
          const targetOverrides = targetInfo.overridden_configuration_options || {};
          if (sameModConfigurationOverrides(sourceOverrides, targetOverrides)) continue;
          await modApi.saveModConfigurationForWorld({
            roomId: this.selectedRoomId,
            worldId: world.id,
            modid: modId,
            targetId: world.appliedTargetId || '',
            expectedTopologyRevision: topology?.revision || topology?.topologyRevision || '',
            expectedRevision: targetInfo.revision,
            enabled: targetInfo.enabled !== false,
            configuration_options: composeModConfigurationPatch(sourceOverrides, targetOverrides)
          });
          copiedCount += 1;
        }
        this.copyDialogVisible = false;
        toast[copiedCount > 0 ? 'success' : 'info'](this.$t(
          copiedCount > 0 ? 'mods.installed.feedback.configurationCopied' : 'mods.installed.feedback.configurationAlreadySame',
          { source: this.copySourceWorld.name, count: copiedCount }
        ));
      } catch (error) {
        const message = this.localizedFailure(this.failure('mods.errors.copyConfiguration', error));
        toast.error(copiedCount > 0
          ? this.$t('mods.installed.feedback.configurationPartiallyCopied', { count: copiedCount, error: message })
          : message);
      } finally {
        this.copying = false;
      }
    },

    // 显示模组详情
    async showModDetails(mod) {
      const requestId = ++this.detailsRequestId;
      this.currentModInfo = mod;
      this.detailsDialogVisible = true;
      this.detailsLoading = true;
      try {
        const details = await modApi.getModDetails(mod);
        if (requestId === this.detailsRequestId) {
          this.currentModInfo = details;
          this.modsList = this.modsList.map(item => (item.modid || item.id) === (mod.modid || mod.id)
            ? { ...item, name: details.name?.trim() || item.name, author: details.author?.trim() || item.author }
            : item);
        }
      } catch (error) {
        if (requestId === this.detailsRequestId) {
          toast.error(this.localizedFailure(this.failure('mods.errors.details', error)));
        }
      } finally {
        if (requestId === this.detailsRequestId) this.detailsLoading = false;
      }
    },

    // 更新模组
    async updateMod(mod, missingOnly = false) {
      if (this.isModBusy(mod)) return;
      this.setModBusy(mod, true);
      try {
        await modApi.updateMod({
          roomId: this.selectedRoomId,
          modid: mod.modid,
          runtimeVersions: mod.runtimeVersions,
          missingOnly,
          waitForJob: this.jobStatus?.waitForJob,
          onSubmitted: (job, target) => {
            emitGlobalJobSubmitted({ ...job, displayName: `${mod.name} · ${target.targetId}` });
            this.modActionState = { ...this.modActionState, [mod.modid]: { ...this.modActionState[mod.modid], jobId: job.id } };
          },
          onProgress: job => this.setModJobProgress(mod, job)
        });
        this.setModActionProgress(mod, 100);
        toast.success(this.$t('mods.installed.feedback.updated', { name: mod.name }));
        this.fetchModsList(true);
      } catch (error) {
        toast.error(this.localizedFailure(this.failure('mods.errors.update', error)));
      } finally {
        this.setModBusy(mod, false);
      }
    },

    // 导航到搜索页面
    goToSearch() {
      if (this.embedded) {
        this.$emit('browse-workshop');
        return;
      }
      this.$router.push('/mods');
    },

    // 获取配置文件
    getModConfigFile(world) {
      if (!world?.id) {
        toast.warning(this.$t('mods.installed.feedback.selectViewWorld'));
        return;
      }
      this.selectWorldContext(world);
      this.configFileWorldName = world.name;
      this.loadingConfig = true;
      modApi.getAllModConfigFile({
        roomId: this.selectedRoomId,
        worldId: world.id
      })
        .then(res => {
          if (res && res.file?.exists) {
            // 保存配置文件内容并显示对话框
            this.configFileContent = res.modinfo;
            this.configFileDialogVisible = true;
          } else {
            toast.warning(this.$t('mods.installed.feedback.configFileMissing'));
          }
        })
        .catch(err => {
          console.error('获取配置文件失败:', err);
          toast.error(this.localizedFailure(this.failure('mods.errors.configFile', err)));
        })
        .finally(() => {
          this.loadingConfig = false;
        });
    },
    
    // 下载配置文件
    downloadConfigFile() {
      if (!this.configFileContent) {
        toast.error(this.$t('mods.installed.feedback.noDownloadContent'));
        return;
      }
      
      // 创建一个可下载的 Lua 文件
      const blob = new Blob([this.configFileContent], { type: 'text/plain' });
      
      // 创建临时下载链接
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      const worldName = (this.configFileWorldName || 'world').replace(/[^a-zA-Z0-9_-]+/g, '-');
      link.download = `${worldName}-modoverrides.lua`;
      
      // 点击下载
      document.body.appendChild(link);
      link.click();
      
      // 清理
      window.URL.revokeObjectURL(link.href);
      document.body.removeChild(link);
      
      toast.success(this.$t('mods.installed.feedback.configFileDownloaded'));
    }
  }
};
</script>

<style scoped>
.page-container {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-heading,
.header-actions,
.mod-title-row,
.mod-actions,
.loading-state,
.mod-meta span {
  display: flex;
  align-items: center;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-heading-embedded {
  justify-content: flex-end;
}

.page-heading h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
}

.page-heading p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.header-actions,
.mod-actions {
  min-width: 0;
  gap: 8px;
}

.header-actions {
  flex-wrap: wrap;
}

.filter-panel {
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
}

.filter-form {
  display: grid;
  grid-template-columns: auto minmax(150px, 180px) minmax(180px, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.filter-form > [data-slot='field'] {
  min-width: 0;
}

.status-filter {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.status-filter > * {
  min-width: 0;
  white-space: nowrap;
}

.loading-state {
  min-height: 260px;
  justify-content: center;
  gap: 8px;
  color: var(--muted-foreground);
}

.mod-list {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
}

.mod-list-item {
  min-width: 0;
}

.mod-list-item + .mod-list-item {
  border-top: 1px solid var(--border);
}

.mod-summary {
  position: relative;
  display: grid;
  min-height: 72px;
  grid-template-columns: 48px minmax(220px, 1fr) minmax(280px, 360px) auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
}

.mod-summary-progress {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  border-radius: 0;
  pointer-events: none;
}

.mod-summary:hover {
  background: color-mix(in srgb, var(--muted) 45%, transparent);
}

.mod-image {
  position: relative;
  display: flex;
  width: 48px;
  flex: none;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  aspect-ratio: 1;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
  color: var(--muted-foreground);
}

.mod-image > svg {
  width: 22px;
  height: 22px;
}

.mod-image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.mod-heading-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.mod-title-row {
  min-width: 0;
  gap: 8px;
}

.mod-title-row strong {
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
}

.mod-id,
.mod-author,
.mod-runtime-version,
.matrix-heading span {
  color: var(--muted-foreground);
  font-size: 12px;
}

.mod-id {
  flex: none;
}

.mod-coverage,
.mod-summary-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.mod-summary-actions {
  flex-wrap: nowrap;
}

.mod-coverage > * {
  min-width: 98px;
  justify-content: center;
  white-space: nowrap;
}

.mod-summary-icon,
.mod-expand-button {
  width: 36px;
  height: 36px;
}

.mod-add-room-button {
  width: 112px;
  justify-content: center;
}

.mod-expand-button > svg {
  transition: transform 180ms ease;
}

.mod-list-item[data-expanded] .mod-expand-button > svg {
  transform: rotate(180deg);
}

.mod-details {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  padding: 10px 14px 14px;
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--muted) 18%, transparent);
}

.coverage-alert {
  align-items: flex-start;
}

.world-matrix {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
}

.matrix-heading,
.world-row,
.world-identity,
.world-controls {
  display: flex;
  align-items: center;
}

.matrix-heading {
  min-height: 38px;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 10px;
  background: color-mix(in srgb, var(--muted) 72%, var(--background));
}

.matrix-heading-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.matrix-config-actions,
.matrix-config-mode {
  display: flex;
  align-items: center;
}

.matrix-config-actions {
  flex: none;
  gap: 10px;
}

.matrix-config-mode {
  gap: 7px;
  cursor: pointer;
  white-space: nowrap;
}

.matrix-heading strong,
.world-identity strong {
  font-size: 13px;
  font-weight: 600;
}

.world-identity span {
  color: var(--muted-foreground);
  font-size: 12px;
}

.world-row {
  min-height: 50px;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 10px;
}

.world-identity {
  min-width: 0;
  gap: 8px;
}

.world-identity > svg {
  flex: none;
  color: var(--muted-foreground);
}

.world-identity > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.world-identity strong,
.world-identity span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.world-controls {
  flex: none;
  gap: 6px;
}

.lua-code {
  max-height: 60vh;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
  color: var(--foreground);
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}

.copy-world-mappings,
.copy-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.copy-world-mapping {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.copy-world-mapping > :last-child {
  justify-self: end;
}

.copy-progress span {
  color: var(--muted-foreground);
  font-size: 12px;
}

.mod-update-modes {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.mod-update-modes > * {
  min-width: 0;
  min-height: 40px;
  white-space: normal;
}

.mod-update-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.mod-update-field-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

@media (max-width: 1080px) {
  .filter-form {
    grid-template-columns: minmax(320px, 1fr) minmax(150px, 180px);
  }

  .filter-search {
    grid-column: 1 / -2;
  }

  .mod-summary {
    grid-template-columns: 48px minmax(0, 1fr) auto;
  }

  .mod-coverage {
    grid-column: 2;
  }

  .mod-summary-actions {
    grid-column: 3;
    grid-row: 1 / span 2;
  }

}

@media (max-width: 760px) {
  .page-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-form {
    grid-template-columns: 1fr;
  }

  .filter-search {
    grid-column: auto;
  }

  .status-filter {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mod-summary {
    grid-template-columns: 44px minmax(0, 1fr) auto;
    gap: 8px;
    padding: 10px;
  }

  .mod-image {
    width: 44px;
  }

  .mod-id {
    display: none;
  }

  .mod-coverage {
    grid-column: 1 / -1;
  }

  .mod-summary-actions {
    grid-column: 3;
    grid-row: 1;
  }

  .mod-summary-actions .mod-summary-icon {
    display: none;
  }

  .mod-add-room-button {
    width: 36px;
    padding-inline: 0;
  }

  .mod-add-room-button span {
    display: none;
  }

  .mod-details {
    padding: 10px;
  }

  .world-row {
    align-items: stretch;
    flex-direction: column;
  }

  .matrix-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .matrix-config-actions {
    justify-content: space-between;
  }

  .world-controls {
    justify-content: flex-end;
  }

  .mod-update-modes,
  .mod-update-options {
    grid-template-columns: 1fr;
  }
}

</style>

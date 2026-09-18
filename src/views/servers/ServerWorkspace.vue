<template>
  <div class="workspace-page" :class="{ embedded }">
    <header class="workspace-header">
      <div class="workspace-heading">
        <span v-if="!embedded" class="workspace-kicker">{{ $t('servers.workspace.kicker') }}</span>
        <div class="workspace-title-row">
          <component :is="embedded ? 'h2' : 'h1'" class="workspace-title">
            {{ $t(embedded ? 'servers.workspace.dashboardTitle' : 'servers.workspace.title') }}
          </component>
          <Badge v-if="selectedRoom" :variant="roomStatusVariant">
            {{ roomStatusLabel }}
          </Badge>
        </div>
        <div v-if="selectedRoom" class="workspace-overview">
          <span class="workspace-room-summary">{{ $t('servers.workspace.roomSummary', { name: selectedRoom.name, count: worlds.length }) }}</span>
          <Badge
            v-if="selectedRoom.directoryName"
            class="workspace-directory"
            variant="outline"
            :title="$t('servers.workspace.roomDirectory', { name: selectedRoom.directoryName })"
          >
            {{ selectedRoom.directoryName }}
          </Badge>
          <Separator class="overview-separator" orientation="vertical" />
          <div class="status-summary" role="list" :aria-label="$t('servers.workspace.overview.label')">
            <div class="status-metric" role="listitem">
              <span class="status-label">{{ $t('servers.workspace.overview.worldStatus') }}</span>
              <span class="status-value">{{ runningWorlds.length }}<span>/{{ worlds.length }}</span></span>
            </div>
            <Separator class="status-separator" orientation="vertical" />
            <div class="status-metric" role="listitem">
              <span class="status-label">{{ $t('servers.workspace.overview.onlinePlayers') }}</span>
              <span class="status-value">{{ playerStats ? playerStats.online_count : '--' }}<span>/{{ playerStats ? playerStats.total_count : '--' }}</span></span>
            </div>
            <Separator class="status-separator" orientation="vertical" />
            <div class="status-metric" role="listitem">
              <span class="status-label">{{ $t('servers.workspace.overview.attentionWorlds') }}</span>
              <span class="status-value">{{ $t('servers.workspace.overview.attentionCount', { count: attentionWorldCount }) }}</span>
            </div>
            <Separator class="status-separator" orientation="vertical" />
            <div class="status-metric" role="listitem">
              <span class="status-label">{{ $t('servers.workspace.backups.latest') }}</span>
              <span class="status-value">{{ latestBackup ? formatBackupTime(latestBackup.createdAt || latestBackup.create_time) : '--' }}</span>
            </div>
          </div>
        </div>
        <div v-else-if="initialLoading" class="mt-2 flex h-5 items-center" aria-hidden="true">
          <Skeleton class="h-4 w-52" />
        </div>
        <p v-else>{{ $t('servers.workspace.noRoomSelected') }}</p>
      </div>

      <div class="workspace-toolbar">
        <RoomScopeSelect v-model="selectedRoomId" :rooms="rooms" :loading="initialLoading" @update:model-value="handleRoomChange" />
        <RoomRefreshIntervalSelect />
        <Tooltip>
          <TooltipTrigger as-child>
            <UiButton
              variant="outline"
              size="icon"
              :aria-label="$t('servers.workspace.refresh')"
              :title="$t('servers.workspace.refresh')"
              :disabled="loading"
              @click="manualRefreshWorkspace"
            >
              <Spinner v-if="loading" />
              <RefreshCw v-else />
            </UiButton>
          </TooltipTrigger>
          <TooltipContent>{{ $t('servers.workspace.refresh') }}</TooltipContent>
        </Tooltip>
        <UiButton
          :disabled="!selectedRoom || !roomControlAvailable || backupCreating"
          @click="createBackup"
        >
          <Spinner v-if="backupCreating" data-icon="inline-start" />
          <DatabaseBackup v-else data-icon="inline-start" />
          {{ backupCreating ? $t('servers.workspace.backups.creating') : $t('servers.workspace.backups.create') }}
        </UiButton>
      </div>
    </header>

    <Alert v-if="loadError" class="workspace-alert" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ $t('servers.workspace.feedback.loadFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ localizedError(loadError) }}</AlertDescription>
      <AlertAction>
        <UiButton size="sm" variant="outline" @click="manualRefreshWorkspace">{{ $t('servers.workspace.reload') }}</UiButton>
      </AlertAction>
    </Alert>

    <section
      v-if="initialLoading"
      class="flex flex-col gap-3"
      role="status"
      aria-live="polite"
      :aria-label="$t('servers.workspace.loading')"
    >
      <span class="sr-only">{{ $t('servers.workspace.loading') }}</span>
      <Card size="sm">
        <CardHeader>
          <div class="flex min-w-0 flex-col gap-2">
            <Skeleton class="h-5 w-24" />
            <Skeleton class="h-4 w-48 max-w-full" />
          </div>
          <CardAction class="flex items-center gap-2">
            <Skeleton class="h-8 w-20" />
            <Skeleton class="h-8 w-20" />
          </CardAction>
        </CardHeader>
        <CardContent class="flex flex-col pb-0 pt-0">
          <div v-for="index in 2" :key="index" class="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t py-3">
            <Skeleton class="size-9" />
            <div class="flex min-w-0 flex-col gap-2">
              <Skeleton class="h-4 w-32 max-w-full" />
              <Skeleton class="h-3 w-56 max-w-full" />
            </div>
            <Skeleton class="h-8 w-24" />
          </div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <Skeleton class="h-5 w-28" />
        </CardHeader>
        <CardContent class="flex flex-col gap-3 pt-0">
          <div class="grid grid-cols-4 gap-2">
            <Skeleton v-for="index in 4" :key="index" class="h-8 w-full" />
          </div>
          <Skeleton class="h-28 w-full" />
        </CardContent>
      </Card>
    </section>

    <Empty v-else-if="!loadError && rooms.length === 0">
      <EmptyHeader><EmptyMedia variant="icon"><ServerOff /></EmptyMedia><EmptyTitle>{{ $t('servers.workspace.empty.noRooms') }}</EmptyTitle></EmptyHeader>
      <EmptyContent><UiButton @click="$router.push('/rooms/list')">{{ $t('servers.workspace.empty.openRooms') }}</UiButton></EmptyContent>
    </Empty>

    <template v-else-if="selectedRoom">
      <Card size="sm" class="world-card">
        <CardHeader class="world-card-header gap-0">
          <div class="world-card-heading">
            <CardTitle>{{ $t('servers.workspace.worlds.title') }}</CardTitle>
          </div>
          <CardAction class="world-card-actions row-span-1 flex flex-wrap items-center justify-end gap-2 self-center">
            <Popover>
              <PopoverTrigger as-child>
                <UiButton type="button" size="sm" variant="ghost">
                  <Shapes data-icon="inline-start" />
                  {{ $t('servers.workspace.worlds.legend.open') }}
                </UiButton>
              </PopoverTrigger>
              <PopoverContent align="end" class="world-legend-popover">
                <PopoverHeader>
                  <PopoverTitle>{{ $t('servers.workspace.worlds.legend.title') }}</PopoverTitle>
                  <PopoverDescription>{{ $t('servers.workspace.worlds.legend.description') }}</PopoverDescription>
                </PopoverHeader>
                <template v-for="(group, groupIndex) in worldLegendGroups" :key="group.key">
                  <Separator v-if="groupIndex > 0" />
                  <section class="world-legend-group">
                    <h4>{{ group.label }}</h4>
                    <div class="world-legend-items" role="list">
                      <div v-for="item in group.items" :key="item.key" class="world-legend-item" role="listitem">
                        <span class="world-legend-icon" :class="item.tone" aria-hidden="true">
                          <component :is="item.icon" />
                        </span>
                        <span>{{ item.label }}</span>
                      </div>
                    </div>
                  </section>
                </template>
              </PopoverContent>
            </Popover>
            <UiButton
              type="button"
              size="sm"
              variant="outline"
              :disabled="roomStartWorlds.length === 0 || roomActionsBusy"
              @click="handleRoomAction('start')"
            >
              <Spinner v-if="roomActionKind === 'start'" data-icon="inline-start" />
              <Play v-else data-icon="inline-start" />
              {{ $t('servers.workspace.worlds.startAll') }}
            </UiButton>
            <UiButton
              type="button"
              size="sm"
              variant="destructive"
              :disabled="roomStopWorlds.length === 0 || roomActionsBusy"
              @click="handleRoomAction('stop')"
            >
              <Spinner v-if="roomActionKind === 'stop'" data-icon="inline-start" />
              <Square v-else data-icon="inline-start" />
              {{ $t('servers.workspace.worlds.stopAll') }}
            </UiButton>
            <RoomTopologyDialog
              :room="selectedRoom"
              :topology="roomTopology"
              :infrastructure="runtimeInfrastructure"
              :connection="roomConnection"
              :world-ports="roomWorldPorts"
              :refreshing="topologyDialogRefreshing"
              :error-message="topologyDialogError"
              @refresh="refreshTopologyDialog"
            />
            <Popover :open="connectionPopoverOpen" @update:open="handleConnectionPopoverOpen">
              <PopoverTrigger as-child>
                <UiButton type="button" size="sm" variant="outline">
                  <Cable data-icon="inline-start" />
                  {{ $t('servers.workspace.worlds.connection.trigger') }}
                  <span v-if="roomTopology && runtimeInfrastructure" class="connection-trigger-endpoint">
                    {{ roomConnection.ready ? roomConnection.endpoint : $t('servers.workspace.worlds.connection.unavailable') }}
                  </span>
                  <ChevronDown data-icon="inline-end" />
                </UiButton>
              </PopoverTrigger>
              <PopoverContent align="end" class="world-connection-popover max-h-[var(--reka-popover-content-available-height)] overflow-y-auto">
                <PopoverHeader>
                  <PopoverTitle>{{ $t('servers.workspace.worlds.connection.title') }}</PopoverTitle>
                  <PopoverDescription>{{ $t('servers.workspace.worlds.connection.description') }}</PopoverDescription>
                </PopoverHeader>

                <div v-if="topologyDialogRefreshing" class="flex items-center gap-2 py-4" role="status">
                  <Spinner />
                  {{ $t('common.states.loading') }}
                </div>
                <Alert v-else-if="topologyDialogError" variant="destructive">
                  <CircleAlert />
                  <AlertDescription>{{ topologyDialogError }}</AlertDescription>
                  <AlertAction>
                    <UiButton size="icon-sm" variant="outline" :aria-label="$t('common.actions.retry')" :title="$t('common.actions.retry')" @click="refreshTopologyDialog">
                      <RefreshCw />
                    </UiButton>
                  </AlertAction>
                </Alert>
                <template v-else>
                <form class="connection-editor" @submit.prevent="saveConnectionAddress">
                  <Field v-if="roomConnection.lanAddresses?.length">
                    <FieldLabel>{{ $t('servers.workspace.worlds.connection.lanAddress') }}</FieldLabel>
                    <UiSelect :model-value="selectedLanConnectionAddress" @update:model-value="selectLanConnectionAddress">
                      <SelectTrigger class="connection-lan-select" :aria-label="$t('servers.workspace.worlds.connection.lanAddress')">
                        <SelectValue :placeholder="$t('servers.workspace.worlds.connection.lanPlaceholder')" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem v-for="address in roomConnection.lanAddresses" :key="address" :value="address">
                            {{ address }}
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </UiSelect>
                    <FieldDescription>{{ $t('servers.workspace.worlds.connection.lanDescription', { machine: worldMachineName(roomConnection.world || {}) }) }}</FieldDescription>
                  </Field>
                  <Field :data-invalid="Boolean(connectionAddressError)">
                    <FieldLabel for="workspace-advertise-address">
                      {{ $t('servers.workspace.worlds.connection.advertisedAddress') }}
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon><Globe2 /></InputGroupAddon>
                      <InputGroupInput
                        id="workspace-advertise-address"
                        v-model="connectionAddressDraft"
                        autocomplete="off"
                        spellcheck="false"
                        :disabled="!roomConnection.profile || connectionAddressSaving"
                        :placeholder="$t('servers.workspace.worlds.connection.addressPlaceholder')"
                        :aria-invalid="Boolean(connectionAddressError)"
                        @input="connectionAddressError = ''"
                      />
                      <InputGroupAddon align="inline-end" class="connection-port-addon">
                        :{{ roomConnection.port || '--' }}
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldDescription>
                      {{ $t('servers.workspace.worlds.connection.addressDescription', { machine: worldMachineName(roomConnection.world || {}) }) }}
                    </FieldDescription>
                    <FieldError v-if="connectionAddressError">{{ connectionAddressError }}</FieldError>
                  </Field>
                  <div class="connection-editor-actions">
                    <UiButton
                      type="button"
                      size="sm"
                      variant="outline"
                      :disabled="!roomConnection.profile || connectionAddressDetecting || connectionAddressSaving"
                      @click="detectConnectionAddress"
                    >
                      <Spinner v-if="connectionAddressDetecting" data-icon="inline-start" />
                      <LocateFixed v-else data-icon="inline-start" />
                      {{ $t(connectionAddressDetecting ? 'servers.workspace.worlds.connection.detecting' : 'servers.workspace.worlds.connection.detect') }}
                    </UiButton>
                    <UiButton type="submit" size="sm" :disabled="!canSaveConnectionAddress">
                      <Spinner v-if="connectionAddressSaving" data-icon="inline-start" />
                      <Save v-else data-icon="inline-start" />
                      {{ $t(connectionAddressSaving ? 'servers.workspace.worlds.connection.saving' : 'servers.workspace.worlds.connection.save') }}
                    </UiButton>
                  </div>
                </form>

                <Separator />

                <div v-if="roomConnection.ready" class="connection-details">
                  <div class="connection-value-row">
                    <div class="connection-value-copy">
                      <span>{{ $t('servers.workspace.worlds.connection.address') }}</span>
                      <strong>{{ roomConnection.endpoint }}</strong>
                    </div>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <UiButton
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          :aria-label="$t('servers.workspace.worlds.connection.copyAddress')"
                          @click="copyConnectionValue(roomConnection.endpoint, 'address')"
                        >
                          <Copy />
                        </UiButton>
                      </TooltipTrigger>
                      <TooltipContent>{{ $t('servers.workspace.worlds.connection.copyAddress') }}</TooltipContent>
                    </Tooltip>
                  </div>
                  <div class="connection-value-row">
                    <div class="connection-value-copy">
                      <span>{{ $t('servers.workspace.worlds.connection.directCode') }}</span>
                      <code>{{ roomDirectConnectCode }}</code>
                    </div>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <UiButton
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          :aria-label="$t('servers.workspace.worlds.connection.copyCode')"
                          @click="copyConnectionValue(roomDirectConnectCode, 'code')"
                        >
                          <Copy />
                        </UiButton>
                      </TooltipTrigger>
                      <TooltipContent>{{ $t('servers.workspace.worlds.connection.copyCode') }}</TooltipContent>
                    </Tooltip>
                  </div>
                  <p class="connection-source-hint">{{ roomConnectionSourceLabel }}</p>
                  <p v-if="selectedRoom.passwordProtected" class="connection-password-hint">
                    {{ $t('servers.workspace.worlds.connection.passwordRequired') }}
                  </p>
                </div>
                <p v-else class="connection-source-hint">{{ roomConnectionSourceLabel }}</p>

                <Separator />
                <section class="connection-ports">
                  <h4>{{ $t('servers.workspace.worlds.connection.worldPorts') }}</h4>
                  <div class="connection-port-list">
                    <div v-for="item in roomWorldPorts" :key="item.id" class="connection-port-row">
                      <span>{{ item.name }}</span>
                      <span>
                        <strong>{{ item.port || '--' }}</strong>
                        <Badge variant="outline">{{ $t('servers.workspace.worlds.connection.udp') }}</Badge>
                      </span>
                    </div>
                  </div>
                </section>
                </template>
              </PopoverContent>
            </Popover>
            <UiButton type="button" size="sm" variant="ghost" :disabled="!configurationAvailable || Boolean(roomActionKind)" @click="openRoomSettings">
              <Settings data-icon="inline-start" />
              {{ $t('servers.workspace.worlds.roomSettings') }}
            </UiButton>
            <UiButton type="button" size="sm" variant="ghost" @click="openWorldPlacement">
              <Network data-icon="inline-start" />
              {{ $t('servers.workspace.worlds.placement') }}
            </UiButton>
          </CardAction>
        </CardHeader>
        <CardContent class="world-card-content">

        <div v-if="worlds.length" class="world-grid">
          <article
            v-for="world in worlds"
            :key="world.id"
            class="world-item"
            :class="{
              selected: world.id === selectedWorldId,
              running: world.status === 'running'
            }"
            tabindex="0"
            @click="selectWorld(world)"
            @keyup.enter="selectWorld(world)"
          >
            <div class="world-main">
              <div class="world-symbol" :class="worldTone(world)">
                <component :is="worldIcon(world)" aria-hidden="true" />
              </div>
              <div class="world-identity">
                <div class="world-name-row">
                  <strong>{{ world.name }}</strong>
                  <Badge :variant="worldStatusVariant(world)">
                    {{ worldStatusLabel(world) }}
                  </Badge>
                  <WorldPerformanceIndicator
                    :score="worldStateFor(world)?.hostPerformance"
                    :available="worldPerformanceAvailable(world)"
                  />
                  <RuntimeExitBadge :event="world.latestExit" />
                </div>
                <span>{{ worldRoleLabel(world) }} · {{ world.directoryName || $t('servers.workspace.worlds.directoryUnset') }}</span>
                <span class="world-machine" :title="worldMachineName(world)">
                  <Server aria-hidden="true" />
                  {{ $t('servers.workspace.worlds.machine', { name: worldMachineName(world) }) }}
                </span>
                <span
                  v-if="worldStatusMessage(world)"
                  class="world-status-message"
                  :class="{ 'world-failure': world.status === 'failed' || worldSaveWriteFailed(world) }"
                >{{ worldStatusMessage(world) }}</span>
                <span
                  v-if="worldRuntimeDiagnostic(world)"
                  class="world-runtime-diagnostic"
                  :class="`is-${worldRuntimeDiagnostic(world).tone}`"
                >
                  <Spinner v-if="worldRuntimeDiagnostic(world).tone === 'refreshing'" aria-hidden="true" />
                  <RefreshCw v-else-if="worldRuntimeDiagnostic(world).tone === 'deferred'" aria-hidden="true" />
                  <CircleAlert v-else aria-hidden="true" />
                  {{ worldRuntimeDiagnostic(world).message }}
                </span>
              </div>
            </div>

            <dl class="world-facts">
              <div>
                <dt>{{ $t('servers.workspace.worlds.players') }}</dt>
                <dd>{{ worldOnlinePlayerLabel(world) }}</dd>
              </div>
              <WorldStateQuickControl
                kind="day"
                :label="$t('servers.workspace.worlds.day')"
                :value="worldDayLabel(world)"
                :icon="CalendarDays"
                :snapshot="worldStateFor(world)"
                :disabled="!canControlWorldState(world)"
                :pending-key="worldStateActionPendingKey(world.id)"
                @execute="executeWorldStateAction(world, $event)"
              />
              <WorldStateQuickControl
                kind="season"
                :label="$t('servers.workspace.worlds.season')"
                :value="worldSeasonLabel(world)"
                :icon="worldSeasonIcon(world)"
                :progress="worldSeasonProgress(world)"
                :snapshot="worldStateFor(world)"
                :disabled="!canControlWorldState(world)"
                :pending-key="worldStateActionPendingKey(world.id)"
                @execute="executeWorldStateAction(world, $event)"
              />
              <WorldStateQuickControl
                kind="phase"
                :label="$t('servers.workspace.worlds.phase')"
                :value="worldPhaseLabel(world)"
                :icon="worldPhaseIcon(world)"
                :progress="worldPhaseProgress(world)"
                :snapshot="worldStateFor(world)"
                :disabled="!canControlWorldState(world)"
                :pending-key="worldStateActionPendingKey(world.id)"
                @execute="executeWorldStateAction(world, $event)"
              />
              <WorldStateQuickControl
                kind="weather"
                :label="$t('servers.workspace.worlds.weather')"
                :value="worldWeatherLabel(world)"
                :icon="Thermometer"
                :snapshot="worldStateFor(world)"
                :disabled="!canControlWorldState(world)"
                :pending-key="worldStateActionPendingKey(world.id)"
                @execute="executeWorldStateAction(world, $event)"
              />
              <div>
                <dt>{{ worldCycleTitle(world) }}</dt>
                <dd>{{ worldCycleLabel(world) }}</dd>
              </div>
              <div>
                <dt>{{ $t('servers.workspace.worlds.dataTime') }}</dt>
                <dd>
                  <WorldDataFreshnessBadge
                    :freshness="worldStateFor(world)?.freshness || world.stateFreshness"
                    :observed-at="worldObservedAt(world)"
                    :age-seconds="worldStateAgeSeconds(world)"
                  />
                </dd>
              </div>
            </dl>

            <div class="world-actions" @click.stop>
              <Tooltip>
                <TooltipTrigger as-child>
                  <UiButton
                    size="icon-sm"
                    :variant="worldPrimaryAction(world).variant"
                    :aria-label="worldActionLabel(world)"
                    :title="worldActionLabel(world)"
                    :disabled="!canToggleWorld(world) || isWorldActionPending(world.id) || isWorldStateActionPending(world.id) || isRollbackPending(world.id) || Boolean(roomActionKind)"
                    @click="handleWorldAction(world, worldPrimaryAction(world).kind)"
                  >
                    <Spinner v-if="isWorldActionPending(world.id)" />
                    <Square v-else-if="worldPrimaryAction(world).kind === 'stop'" />
                    <Play v-else-if="worldPrimaryAction(world).kind === 'start'" />
                  </UiButton>
                </TooltipTrigger>
                <TooltipContent>{{ worldActionLabel(world) }}</TooltipContent>
              </Tooltip>
              <Tooltip v-if="world.status === 'failed'">
                <TooltipTrigger as-child>
                  <UiButton
                    size="icon-sm"
                    variant="outline"
                    :aria-label="$t('servers.workspace.worlds.cleanupFailedSession')"
                    :title="$t('servers.workspace.worlds.cleanupFailedSession')"
                    :disabled="!canCleanFailedWorld(world) || isWorldActionPending(world.id) || isWorldStateActionPending(world.id) || isRollbackPending(world.id) || Boolean(roomActionKind)"
                    @click="handleWorldAction(world, 'cleanup')"
                  >
                    <Square />
                  </UiButton>
                </TooltipTrigger>
                <TooltipContent>{{ $t('servers.workspace.worlds.cleanupFailedSession') }}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger as-child>
                  <UiButton
                    size="icon-sm"
                    variant="outline"
                    :aria-label="$t('servers.workspace.worlds.restart')"
                    :title="$t('servers.workspace.worlds.restart')"
                    :disabled="!canStopWorld(world) || isWorldActionPending(world.id) || isWorldStateActionPending(world.id) || isRollbackPending(world.id) || Boolean(roomActionKind)"
                    @click="handleWorldAction(world, 'restart')"
                  >
                    <RotateCw />
                  </UiButton>
                </TooltipTrigger>
                <TooltipContent>{{ $t('servers.workspace.worlds.restart') }}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger as-child>
                  <UiButton
                    size="icon-sm"
                    variant="outline"
                    :aria-label="$t('servers.workspace.worlds.rollback')"
                    :title="$t('servers.workspace.worlds.rollback')"
                    :disabled="!canStopWorld(world) || isWorldActionPending(world.id) || isWorldStateActionPending(world.id) || isRollbackPending(world.id) || Boolean(roomActionKind)"
                    @click="openRollbackDialog(world)"
                  >
                    <Spinner v-if="isRollbackPending(world.id)" />
                    <History v-else />
                  </UiButton>
                </TooltipTrigger>
                <TooltipContent>{{ $t('servers.workspace.worlds.rollback') }}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger as-child>
                  <UiButton
                    size="icon-sm"
                    variant="ghost"
                    :aria-label="$t('servers.workspace.worlds.configure')"
                    :title="$t('servers.workspace.worlds.configure')"
                    :disabled="!canConfigureWorld(world) || isWorldActionPending(world.id) || isWorldStateActionPending(world.id) || isRollbackPending(world.id) || Boolean(roomActionKind)"
                    @click="openWorldSettings(world)"
                  >
                    <Settings />
                  </UiButton>
                </TooltipTrigger>
                <TooltipContent>{{ $t('servers.workspace.worlds.configure') }}</TooltipContent>
              </Tooltip>
            </div>
          </article>
        </div>
        <Empty v-else><EmptyHeader><EmptyMedia variant="icon"><Globe2 /></EmptyMedia><EmptyTitle>{{ $t('servers.workspace.empty.noWorlds') }}</EmptyTitle></EmptyHeader></Empty>
        </CardContent>
      </Card>

    </template>

    <RoomModOverview
      v-if="roomModOverviewId"
      v-show="Boolean(selectedRoom)"
      ref="roomModOverview"
      :room-id="roomModOverviewId"
      :room-name="selectedRoom?.name || ''"
      :world-count="worlds.length"
      :runtime-targets="worlds.map(world => worldRuntimeTarget(world)).filter(Boolean)"
      :online-players="playerStats?.online_count || 0"
      @updated="handleModsUpdated"
    />

    <template v-if="selectedRoom">
      <Card size="sm">
          <CardHeader class="sr-only">
            <CardTitle>{{ $t('servers.workspace.operations.title') }}</CardTitle>
          </CardHeader>
          <CardContent class="operation-content"><Tabs v-model="activeOperation" class="operation-tabs">
            <TabsList class="operation-tabs-list">
              <TabsTrigger value="players"><UsersRound />{{ $t('servers.workspace.players.title') }}</TabsTrigger>
              <TabsTrigger value="logs"><FileText />{{ $t('servers.workspace.operations.liveLogs') }}</TabsTrigger>
              <TabsTrigger value="chat"><MessagesSquare />{{ $t('servers.workspace.operations.chatLogs') }}</TabsTrigger>
              <TabsTrigger value="console"><Terminal />{{ $t('servers.workspace.console.title') }}</TabsTrigger>
            </TabsList>
            <TabsContent value="players">
              <section class="players-panel" aria-labelledby="workspace-players-title">
                <header class="players-panel-header">
                  <div class="players-panel-heading">
                    <h2 id="workspace-players-title">{{ $t('servers.workspace.players.title') }}</h2>
                    <span>{{ contextErrors.players ? $t('servers.workspace.states.dataReadFailed') : (playerStats ? $t('servers.workspace.players.presenceSummary', { total: playerStats.total_count, online: playerStats.online_count, stale: playerStats.stale_online_count || 0 }) : $t('servers.workspace.states.statusUnavailable')) }}</span>
                  </div>
                  <div class="players-panel-actions">
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <UiButton
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          :disabled="playersRefreshing || !selectedRoom"
                          :aria-label="$t(playersRefreshing ? 'servers.workspace.players.refreshing' : 'servers.workspace.players.refresh')"
                          :title="$t(playersRefreshing ? 'servers.workspace.players.refreshing' : 'servers.workspace.players.refresh')"
                          @click="refreshPlayerStates"
                        >
                          <Spinner v-if="playersRefreshing" />
                          <RefreshCw v-else />
                        </UiButton>
                      </TooltipTrigger>
                      <TooltipContent>{{ $t(playersRefreshing ? 'servers.workspace.players.refreshing' : 'servers.workspace.players.refresh') }}</TooltipContent>
                    </Tooltip>
                    <UiButton variant="ghost" size="xs" class="players-panel-action" @click="openPlayers">
                      {{ $t('servers.workspace.actions.all') }}<ArrowRight data-icon="inline-end" />
                    </UiButton>
                  </div>
                </header>
                <div v-if="recentPlayerRows.length" class="player-list players-list-expanded">
                  <div
                    v-for="row in recentPlayerRows"
                    :key="`${row.player.room_id}:${row.player.user_id}`"
                    class="player-row"
                  >
                    <Tooltip v-if="playerAvatarActionAvailable(row.player)">
                      <TooltipTrigger as-child>
                        <UiButton
                          type="button"
                          variant="ghost"
                          size="icon-lg"
                          class="player-avatar-action"
                          :disabled="isPlayerActionPending(row.player.user_id)"
                          :aria-label="playerAvatarActionLabel(row.player)"
                          @click="handlePlayerAvatarAction(row.player)"
                        >
                          <CharacterAvatar :prefab="row.player.prefab" :name="row.player.player_name" :player="row.player" size="lg" />
                          <span v-if="isPlayerActionPending(row.player.user_id)" class="player-avatar-state is-pending" aria-hidden="true">
                            <Spinner />
                          </span>
                          <span v-else-if="playerIsGhost(row.player)" class="player-avatar-state" aria-hidden="true">
                            <HeartPulse />
                          </span>
                        </UiButton>
                      </TooltipTrigger>
                      <TooltipContent>{{ playerAvatarActionLabel(row.player) }}</TooltipContent>
                    </Tooltip>
                    <CharacterAvatar v-else :prefab="row.player.prefab" :name="row.player.player_name" :player="row.player" size="lg" />
                    <div class="player-copy">
                      <div class="player-heading-line">
                        <strong :title="row.player.player_name || row.player.user_id">{{ row.player.player_name || row.player.user_id }}</strong>
                        <Badge v-if="row.player.player_age != null" variant="secondary" :title="$t('players.sorting.daysHint')">
                          {{ $t('players.sorting.playDays', { count: row.player.player_age }) }}
                        </Badge>
                        <Badge
                          v-if="row.vitals.length"
                          :variant="playerVitalsAreLive(row.player, row.vitals) ? 'success' : 'outline'"
                          class="player-vitals-state"
                        >
                          {{ playerVitalsLabel(row.player, row.vitals) }}
                        </Badge>
                        <Badge :variant="playerPresence(row.player).variant">
                          {{ playerPresence(row.player).label }}
                        </Badge>
                        <span class="player-observation" :title="playerObservationLabel(row.player)">{{ playerObservationLabel(row.player) }}</span>
                      </div>
                      <div class="player-context-line">
                        <span class="player-context">{{ playerContextLabel(row.player) }}</span>
                        <PlayerNetworkIndicator
                          :score="row.player.net_score"
                          :available="playerNetworkAvailable(row.player)"
                        />
                      </div>
                      <div
                        v-if="row.vitals.length"
                        class="player-vitals"
                      >
                        <PlayerVitalQuickControl
                          v-for="metric in row.vitals"
                          :key="metric.key"
                          :kind="metric.key"
                          :label="metric.label"
                          :value="metric.value"
                          :icon="metric.icon"
                          :tooltip="playerMetricControlLabel(row.player, metric)"
                          :historical="!metric.live"
                          :pending="playerActionPendingKey(row.player.user_id) === `stat-${metric.key}`"
                          :disabled="!canControlPlayerVital(row.player, metric)"
                          @execute="executePlayerVitalAction(row.player, $event)"
                        />
                      </div>
                    </div>
                    <div class="player-row-actions">
                      <PlayerActionMenu
                        :player="row.player"
                        :workbench-request="playerWorkbenchTargetId === row.player.user_id ? playerWorkbenchRequest : 0"
                        :requested-workbench-section="playerWorkbenchTargetId === row.player.user_id ? playerWorkbenchSection : ''"
                        @updated="refreshPlayerAfterAction(row.player, $event)"
                        @player-state-refreshed="handleCollectedPlayerState"
                        @world-state-refreshed="applyWorldStateSnapshot"
                      />
                    </div>
                  </div>
                </div>
                <Alert v-else-if="contextErrors.players" variant="destructive">
                  <CircleAlert />
                  <AlertTitle>{{ $t('servers.workspace.players.loadFailed') }}</AlertTitle>
                  <AlertDescription>{{ localizedError(contextErrors.players) }}</AlertDescription>
                </Alert>
                <Empty v-else class="players-empty">
                  <EmptyHeader><EmptyTitle>{{ $t('servers.workspace.players.empty') }}</EmptyTitle><EmptyDescription>{{ $t('servers.workspace.players.emptyDescription') }}</EmptyDescription></EmptyHeader>
                </Empty>
                <div v-if="(playerStats?.recent_players?.length || 0) > 5" class="flex flex-wrap items-center gap-2">
                  <UiButton v-if="playerDisplayLimit !== 'all' && playerStats.recent_players.length > recentPlayers.length" variant="ghost" size="sm" @click="playerDisplayLimit += 20">
                    {{ $t('servers.workspace.players.showMore', { shown: recentPlayers.length, total: playerStats.total_count }) }}
                  </UiButton>
                  <UiButton v-if="playerDisplayLimit !== 'all'" variant="ghost" size="sm" @click="playerDisplayLimit = 'all'">{{ $t('servers.workspace.players.expandAll') }}</UiButton>
                  <UiButton v-if="playerDisplayLimit === 'all' || playerDisplayLimit > 5" variant="ghost" size="sm" @click="collapsePlayers">{{ $t('servers.workspace.players.collapseList') }}</UiButton>
                </div>
              </section>
            </TabsContent>
            <TabsContent value="logs">
              <world-log
                v-if="activeOperation === 'logs' && selectedWorld"
                :key="`${selectedRoomId}:${selectedWorldId}`"
                :room-id="selectedRoomId"
                :world-id="selectedWorldId"
                :archive-name="selectedRoom.name"
                :world-name="selectedWorld.name"
                :title="$t('servers.workspace.operations.shardLogs')"
                class="workspace-log"
              />
              <Empty v-else><EmptyHeader><EmptyMedia variant="icon"><Globe2 /></EmptyMedia><EmptyTitle>{{ $t('servers.workspace.empty.selectWorld') }}</EmptyTitle></EmptyHeader></Empty>
            </TabsContent>

            <TabsContent value="chat">
              <RoomChatPanel
                v-if="activeOperation === 'chat'"
                :key="selectedRoomId"
                :room-id="selectedRoomId"
                :worlds="worlds"
              />
            </TabsContent>

            <TabsContent value="console">
              <div class="console-panel">
                <div v-if="contextLoading" class="panel-loading"><Spinner /><span>{{ $t('servers.workspace.console.loading') }}</span></div>
                <div class="console-toolbar">
                  <UiSelect v-model="consoleServer">
                    <SelectTrigger class="console-select" :aria-label="$t('servers.workspace.console.selectTarget')"><SelectValue :placeholder="$t('servers.workspace.console.selectWorld')" /></SelectTrigger>
                    <SelectContent><SelectGroup>
                      <SelectItem v-for="server in roomConsoleServers" :key="server.session_name" :value="server.session_name">{{ server.name }}</SelectItem>
                    </SelectGroup></SelectContent>
                  </UiSelect>
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child><UiButton variant="outline">{{ $t('servers.workspace.console.commonCommands.title') }}<ChevronDown data-icon="inline-end" /></UiButton></DropdownMenuTrigger>
                    <DropdownMenuContent><DropdownMenuGroup>
                      <DropdownMenuItem v-for="item in commonCommands" :key="item.command" @select="applyCommonCommand(item.command)">{{ $t(item.nameKey) }}</DropdownMenuItem>
                    </DropdownMenuGroup></DropdownMenuContent>
                  </DropdownMenu>
                  <UiButton variant="ghost" @click="$router.push('/servers/commands')"><Settings data-icon="inline-start" />{{ $t('servers.workspace.console.commandManager') }}</UiButton>
                </div>
                <Alert v-if="contextErrors.console" class="context-error" variant="destructive">
                  <CircleAlert /><AlertTitle>{{ $t('servers.workspace.console.unavailable') }}</AlertTitle><AlertDescription>{{ localizedError(contextErrors.console) }}</AlertDescription>
                </Alert>
                <UiTextarea
                  v-model="rawCommand"
                  rows="7"
                  :placeholder="$t('servers.workspace.console.placeholder')"
                  :aria-label="$t('servers.workspace.console.commandAria')"
                />
                <div class="console-footer">
                  <span>{{ $t('servers.workspace.console.target', { name: selectedConsoleServer?.name || $t('servers.workspace.states.notSelected') }) }}</span>
                  <UiButton
                    :disabled="commandExecuting || !consoleServer || !rawCommand.trim()"
                    @click="executeRawCommand"
                  >
                    <Spinner v-if="commandExecuting" data-icon="inline-start" />
                    <Send v-else data-icon="inline-start" />
                    {{ $t('servers.workspace.console.execute') }}
                  </UiButton>
                </div>
                <Alert v-if="commandResult" :variant="commandResult.success ? 'default' : 'destructive'">
                  <CircleCheck v-if="commandResult.success" />
                  <CircleAlert v-else />
                  <AlertTitle>{{ commandResult.success ? $t('servers.workspace.console.sent') : $t('servers.workspace.console.failed') }}</AlertTitle>
                  <AlertDescription>
                    {{ commandResult.message || $t(commandResult.success ? 'servers.workspace.console.sentDescription' : 'servers.workspace.console.sendFailed') }}
                    <span v-if="commandResult.runId">{{ $t('servers.workspace.console.runRecord', { id: commandResult.runId }) }}</span>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs></CardContent>
      </Card>
    </template>

    <UiDialog v-model:open="rollbackDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ $t('servers.workspace.rollback.title') }}</DialogTitle>
          <DialogDescription>{{ $t('servers.workspace.rollback.description', { room: selectedRoom?.name || '', world: rollbackWorld?.name || '' }) }}</DialogDescription>
        </DialogHeader>
        <div v-if="rollbackConfigurationLoading" class="flex items-center gap-2 py-4" role="status">
          <Spinner />
          {{ $t('common.states.loading') }}
        </div>
        <Alert v-else-if="rollbackConfigurationError" variant="destructive">
          <CircleAlert />
          <AlertDescription>{{ rollbackConfigurationError }}</AlertDescription>
          <AlertAction>
            <UiButton size="icon-sm" variant="outline" :aria-label="$t('common.actions.retry')" :title="$t('common.actions.retry')" @click="loadRollbackConfiguration">
              <RefreshCw />
            </UiButton>
          </AlertAction>
        </Alert>
        <Field v-else>
          <div class="rollback-field-heading">
            <FieldLabel for="rollback-days-slider">{{ $t('servers.workspace.rollback.days') }}</FieldLabel>
            <output for="rollback-days-slider" class="rollback-current">
              {{ $t('servers.workspace.rollback.selected', { count: rollbackDays }) }}
            </output>
          </div>
          <div class="rollback-control-row">
            <div class="rollback-slider-column">
              <Slider
                id="rollback-days-slider"
                :model-value="[rollbackDays]"
                :min="1"
                :max="roomMaxSnapshots"
                :step="1"
                :disabled="roomMaxSnapshots <= 1"
                :aria-label="$t('servers.workspace.rollback.days')"
                aria-describedby="rollback-days-hint"
                @update:model-value="selectRollbackDays"
              />
              <div class="rollback-range" aria-hidden="true"><span>1</span><span>{{ roomMaxSnapshots }}</span></div>
            </div>
            <InputGroup class="rollback-number-input">
              <InputGroupInput
                id="rollback-custom-days"
                :model-value="String(rollbackDays)"
                type="number"
                min="1"
                :max="roomMaxSnapshots"
                step="1"
                :aria-label="$t('servers.workspace.rollback.custom')"
                aria-describedby="rollback-days-hint"
                @update:model-value="selectRollbackDays"
              />
              <InputGroupAddon align="inline-end">/ {{ roomMaxSnapshots }}</InputGroupAddon>
            </InputGroup>
          </div>
          <FieldDescription id="rollback-days-hint">{{ $t('servers.workspace.rollback.hint', { count: roomMaxSnapshots }) }}</FieldDescription>
        </Field>
        <DialogFooter>
          <UiButton variant="outline" :disabled="rollbackExecuting" @click="rollbackDialogOpen = false">{{ $t('common.actions.cancel') }}</UiButton>
          <UiButton :disabled="rollbackExecuting || !rollbackWorld || !rollbackDaysValid" @click="executeRollback">
            <Spinner v-if="rollbackExecuting" data-icon="inline-start" />
            <History v-else data-icon="inline-start" />
            {{ $t('servers.workspace.rollback.confirm', { count: rollbackDays }) }}
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>

  </div>
</template>

<script>
import RoomScopeSelect from '@/components/layout/RoomScopeSelect.vue'
import { defineAsyncComponent } from 'vue'
import RuntimeExitBadge from '@/components/runtime/RuntimeExitBadge.vue'
import WorldDataFreshnessBadge from '@/components/runtime/WorldDataFreshnessBadge.vue'
import WorldStateQuickControl from '@/components/worlds/WorldStateQuickControl.vue'
import WorldPerformanceIndicator from '@/components/worlds/WorldPerformanceIndicator.vue'
import RoomRefreshIntervalSelect from '@/components/layout/RoomRefreshIntervalSelect.vue'
import CharacterAvatar from '@/components/players/CharacterAvatar.vue'
import { playerHistoryTime, playerLastObservation, playerWorldConfirmed } from '@/lib/playerHistoryPresentation.mjs'
import PlayerActionMenu from '@/components/players/PlayerActionMenu.vue'
import PlayerNetworkIndicator from '@/components/players/PlayerNetworkIndicator.vue'
import PlayerVitalQuickControl from '@/components/players/PlayerVitalQuickControl.vue'
import RoomTopologyDialog from '@/components/rooms/RoomTopologyDialog.vue'
import RoomModOverview from '@/components/mods/RoomModOverview.vue'
import { commandApi, playerApi, roomApi } from '@/api'
import { backupSetsV2API, configurationV2API, topologyV2API, worldStatesV2API } from '@/api/v2'
import { waitForV2Job } from '@/api/v2ConfigurationAdapters'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea as UiTextarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useRoomRefreshInterval } from '@/composables/useDashboardRefreshIntervals'
import { useRoomWeatherSource } from '@/composables/useRoomWeather'
import { useRuntimeObservation } from '@/composables/useRuntimeObservation'
import { confirmAction } from '@/lib/feedback'
import { confirmRoomMaintenance } from '@/lib/maintenanceConfirmation'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { sortPlayers } from '@/lib/playerSorting.mjs'
import { emitGlobalJobSubmitted } from '@/lib/globalJobs.mjs'
import {
  formatPlayerTemperature,
  formatPlayerPercentage,
  formatPlayerVital,
  isKnownPlayerMetric,
  isLivePlayerMetric,
  isPlayerOnline,
  normalizePlayerGameplayState,
  normalizePlayerStatus,
  playerCharacterDisplayLabel,
  playerPresenceMeta
} from '@/i18n/playerMessages.js'
import { translateWorldStateValue } from '@/i18n/worldStateMessages.js'
import { buildDirectConnectCode, egressProbeRegion, formatConnectionEndpoint, resolveRoomConnection, worldListenPort } from '@/lib/serverConnection.mjs'
import {
  isCapacityRiskCanceled,
  restartWorldWithCapacityRisk,
  startRoomWithCapacityRisk,
} from '@/lib/startCapacityRisk'
import {
  canCleanFailedWorld,
  canConfigureWorld,
  canRequestStopWorld,
  canStartWorld,
  canStopWorld,
  isWorldSaveWriteFailed,
  worldActionRequiresConfirmation,
  worldLifecycleScope,
  worldPrimaryAction,
  worldStatusLabel,
  worldStatusMessage,
  worldStatusVariant
} from '@/lib/worldRuntimeStatus.mjs'
import {
  getManagementScope,
  MANAGEMENT_SCOPE_CHANGED_EVENT,
  managementScopeTargetId
} from '@/lib/managementScope.mjs'
import { RUNTIME_OBSERVATION_UPDATED_EVENT } from '@/lib/runtimeObservationStreams.mjs'
import { selectWorkspaceRoom } from '@/lib/fleetOverview.mjs'
import { readRoomView, readWorkspaceSelection, rememberWorkspaceView } from '@/lib/workspacePreferences.mjs'
import {
  ArrowRight, Brain, Cable, CalendarDays, ChevronDown, CircleAlert, CircleCheck, Copy, DatabaseBackup, Droplets, FileText, Globe2, HeartPulse, History, Leaf,
  LocateFixed, MessagesSquare, Moon, Mountain, Network, Play, RefreshCw, RotateCw, Save, Send, Server, ServerOff, Settings, Shapes,
  Snowflake, Sprout, Square, Sun, Sunset, Terminal, Thermometer, Trees, UsersRound, Utensils
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'

const CONTEXT_PLAYER_LIMIT = 5
const ROOM_ACTION_UI_MAX_AGE_MS = Object.freeze({
  start: 90_000,
  stop: 5 * 60_000
})
const WorldLog = defineAsyncComponent(() => import('@/components/WorldLog.vue'))
const RoomChatPanel = defineAsyncComponent(() => import('@/components/RoomChatPanel.vue'))

export default {
  name: 'ServerWorkspace',
  props: {
    embedded: { type: Boolean, default: false }
  },
  setup() {
	const { refreshIntervalMs } = useRoomRefreshInterval()
	const { locale: activeLocale } = useI18n()
	const { state: runtimeObservationState } = useRuntimeObservation()
	const publishRoomWeather = useRoomWeatherSource()
	return { activeLocale, refreshIntervalMs, runtimeObservationState, CalendarDays, Thermometer,
    publishRoomWeather }
  },
  components: {
    RoomScopeSelect,
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Badge,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CharacterAvatar,
    Cable,
    CalendarDays,
    CircleAlert,
    CircleCheck,
    Copy,
    ArrowRight,
    ChevronDown,
    DatabaseBackup,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
    FileText,
    Globe2,
    HeartPulse,
    History,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    Leaf,
    LocateFixed,
    MessagesSquare,
    Moon,
    Mountain,
    Network,
    PlayerActionMenu,
    PlayerVitalQuickControl,
    RoomTopologyDialog,
    RoomModOverview,
    Play,
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
    RefreshCw,
    RotateCw,
    Save,
    RoomRefreshIntervalSelect,
    RoomChatPanel,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    Send,
    Server,
    ServerOff,
    Settings,
    Shapes,
    Skeleton,
    Snowflake,
    Spinner,
    Sprout,
    Square,
    Sun,
    Sunset,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Terminal,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    Slider,
    Trees,
    UiButton,
    UiDialog,
    UiSelect,
    UiTextarea,
    UsersRound,
    WorldLog,
    RuntimeExitBadge,
    PlayerNetworkIndicator,
    WorldDataFreshnessBadge,
    WorldPerformanceIndicator,
    WorldStateQuickControl
  },
  data() {
    const preferred = readWorkspaceSelection(managementScopeTargetId(), this.$route.query)
    return {
      loading: true,
      contextLoading: false,
      loadError: null,
      managementScope: getManagementScope(),
      rooms: [],
      selectedRoomId: preferred.roomId,
      selectedWorldId: preferred.worldId,
      preferRunningRoom: !preferred.roomId,
      playerStats: null,
      playerDisplayLimit: preferred.playerDisplayLimit,
      worldStateSnapshots: [],
      roomTopology: null,
      runtimeInfrastructure: null,
      topologyDialogRefreshing: false,
      topologyDialogError: '',
      topologyDialogSequence: 0,
      backups: [],
      consoleServers: [],
      contextErrors: {
        players: null,
        console: null,
        worldStates: null
      },
      pendingWorldActions: [],
      pendingWorldStateActions: [],
      pendingPlayerActions: [],
      playersRefreshing: false,
      playerRefreshInFlight: false,
      pendingRoomActions: [],
      roomActionSequence: 0,
      playerSnapshotStale: false,
      playerWorkbenchRequest: 0,
      playerWorkbenchTargetId: '',
      playerWorkbenchSection: 'player',
      backupCreating: false,
      rollbackDialogOpen: false,
      rollbackWorldId: '',
      rollbackDays: 1,
      roomMaxSnapshots: null,
      rollbackConfigurationLoading: false,
      rollbackConfigurationError: '',
      rollbackConfigurationSequence: 0,
      rollbackExecuting: false,
      activeOperation: preferred.activeOperation,
      consoleServer: '',
      rawCommand: '',
      commandExecuting: false,
      commandResult: null,
      connectionPopoverOpen: false,
      connectionAddressDraft: '',
      connectionAddressError: '',
      connectionAddressDetecting: false,
      connectionAddressSaving: false,
      detectedConnectionAddress: '',
      connectionProbeKey: '',
      connectionProbeSequence: 0,
      refreshTimer: null,
      workspaceDisposed: false,
      refreshInFlightCount: 0,
      runtimeRefreshPending: false,
      refreshSequence: 0,
      contextSequence: 0,
      worldStateSequence: 0,
      worldStateRefreshInFlight: false,
      commonCommands: [
        { nameKey: 'servers.workspace.console.commonCommands.save', command: 'c_save()' },
        { nameKey: 'servers.workspace.console.commonCommands.players', command: 'c_listallplayers()' },
        { nameKey: 'servers.workspace.console.commonCommands.day', command: "print('当前天数: ' .. TheWorld.state.cycles + 1)" },
        { nameKey: 'servers.workspace.console.commonCommands.season', command: "print('当前季节: ' .. TheWorld.state.season)" },
        { nameKey: 'servers.workspace.console.commonCommands.announce', command: "c_announce('请输入公告内容')" }
      ]
    }
  },
  computed: {
    roomWeatherSource() {
      return { room: this.selectedRoom, snapshots: this.worldStateSnapshots, pending: this.initialLoading || this.contextLoading }
    },
    initialLoading() {
      return this.loading && this.rooms.length === 0 && !this.loadError
    },
    selectedRoom() {
      return this.rooms.find(room => room.id === this.selectedRoomId) || null
    },
    roomModOverviewId() {
      if (this.selectedRoom) return this.selectedRoom.id
      // A room-specific page reload can read Mods while its overview is loading.
      return this.initialLoading && !this.preferRunningRoom ? this.selectedRoomId : ''
    },
    worlds() {
      return this.selectedRoom?.worlds || []
    },
    selectedWorld() {
      return this.worlds.find(world => world.id === this.selectedWorldId) || null
    },
    rollbackWorld() {
      return this.worlds.find(world => world.id === this.rollbackWorldId) || null
    },
    rollbackDaysValid() {
      return !this.rollbackConfigurationLoading && !this.rollbackConfigurationError &&
        Number.isInteger(this.roomMaxSnapshots) && Number.isInteger(this.rollbackDays) &&
        this.rollbackDays >= 1 && this.rollbackDays <= this.roomMaxSnapshots
    },
    runningWorlds() {
      return this.worlds.filter(world => world.status === 'running')
    },
    saveFailureWorlds() {
      return this.worlds.filter(isWorldSaveWriteFailed)
    },
    roomControlAvailable() {
      return Boolean(this.selectedRoom) && this.worlds.length > 0 && this.worlds.every(world => world.controlAvailable)
    },
    roomStatusLabel() {
      if (!this.roomControlAvailable) return this.$t('servers.workspace.states.unavailable')
      if (this.saveFailureWorlds.length > 0) return this.$t('worldRuntime.statuses.saveFailed')
      return this.$t(this.runningWorlds.length > 0 ? 'worldRuntime.statuses.running' : 'worldRuntime.statuses.stopped')
    },
    roomStatusVariant() {
      if (!this.roomControlAvailable) return 'outline'
      if (this.saveFailureWorlds.length > 0) return 'destructive'
      return this.runningWorlds.length > 0 ? 'secondary' : 'outline'
    },
    attentionWorldCount() {
      return this.worlds.filter(world => !['running', 'stopped'].includes(world.status) || isWorldSaveWriteFailed(world)).length
    },
    roomStartWorlds() {
      return this.worlds.filter(world => canStartWorld(world))
    },
    roomStopWorlds() {
      return this.worlds.filter(world => canRequestStopWorld(world))
    },
    roomActionKind() {
      return this.pendingRoomActions.find(action => action.roomId === this.selectedRoomId)?.kind || ''
    },
    roomActionsBusy() {
      return this.rollbackExecuting || Boolean(this.roomActionKind) ||
        this.pendingWorldActions.some(action => action.roomId === this.selectedRoomId) ||
        this.pendingWorldStateActions.some(action => action.roomId === this.selectedRoomId)
    },
    roomConnection() {
      return resolveRoomConnection({
        room: this.selectedRoom,
        topology: this.roomTopology,
        infrastructure: this.runtimeInfrastructure,
        browserHostname: typeof window === 'undefined' ? '' : window.location.hostname,
        detectedAddress: this.detectedConnectionAddress,
        draftAddress: this.connectionPopoverOpen ? this.connectionAddressDraft : ''
      })
    },
    selectedLanConnectionAddress() {
      const address = this.normalizedConnectionAddressDraft()
      return this.roomConnection.lanAddresses?.includes(address) ? address : undefined
    },
    roomDirectConnectCode() {
      if (!this.roomConnection.ready) return ''
      const password = this.selectedRoom?.passwordProtected
        ? this.$t('servers.workspace.worlds.connection.passwordPlaceholder')
        : ''
      return buildDirectConnectCode(this.roomConnection.address, this.roomConnection.port, password)
    },
    roomConnectionSourceLabel() {
      return this.$t(`servers.workspace.worlds.connection.sources.${this.roomConnection.addressSource}`)
    },
    canSaveConnectionAddress() {
      const profile = this.roomConnection.profile
      const address = this.normalizedConnectionAddressDraft()
      return Boolean(profile?.id) && Boolean(address) && !this.connectionAddressDetecting && !this.connectionAddressSaving &&
        address !== String(profile.advertiseAddress || '').trim()
    },
    roomWorldPorts() {
      return this.worlds.map(world => ({
        id: world.id,
        name: world.name,
        port: worldListenPort({
          roomId: this.selectedRoomId,
          world,
          topology: this.roomTopology,
          infrastructure: this.runtimeInfrastructure
        })
      }))
    },
    recentPlayers() {
      const players = sortPlayers(this.playerStats?.recent_players || [])
      return this.playerDisplayLimit === 'all' ? players : players.slice(0, this.playerDisplayLimit)
    },
    recentPlayerRows() {
      return this.recentPlayers.map(player => ({
        player,
        vitals: this.playerVitals(player)
      }))
    },
    latestBackup() {
      return this.backups[0] || null
    },
    configurationAvailable() {
      return Array.isArray(this.selectedRoom?.targetIds) && this.selectedRoom.targetIds.includes('local')
    },
    roomConsoleServers() {
      const visibleWorldIds = new Set(this.worlds.map(world => String(world.id)))
      return this.consoleServers.filter(server => (
        server.room_id === this.selectedRoomId && visibleWorldIds.has(String(server.world_id))
      ))
    },
    selectedConsoleServer() {
      return this.roomConsoleServers.find(server => server.session_name === this.consoleServer) || null
    },
    worldLegendGroups() {
      return [
        {
          key: 'realms',
          label: this.$t('servers.workspace.worlds.legend.realms'),
          items: [
            { key: 'forest', label: this.$t('servers.workspace.worlds.roles.forest'), icon: Trees, tone: 'forest' },
            { key: 'cave', label: this.$t('servers.workspace.worlds.roles.cave'), icon: Mountain, tone: 'cave' },
            { key: 'unknown', label: this.$t('servers.workspace.worlds.roles.unknown'), icon: Shapes, tone: 'custom' }
          ]
        },
        {
          key: 'seasons',
          label: this.$t('servers.workspace.worlds.legend.seasons'),
          items: [
            { key: 'autumn', label: this.$t('servers.list.seasons.autumn'), icon: Leaf },
            { key: 'winter', label: this.$t('servers.list.seasons.winter'), icon: Snowflake },
            { key: 'spring', label: this.$t('servers.list.seasons.spring'), icon: Sprout },
            { key: 'summer', label: this.$t('servers.list.seasons.summer'), icon: Sun }
          ]
        },
        {
          key: 'phases',
          label: this.$t('servers.workspace.worlds.legend.phases'),
          items: [
            { key: 'day', label: this.$t('worldState.values.phases.day'), icon: Sun },
            { key: 'dusk', label: this.$t('worldState.values.phases.dusk'), icon: Sunset },
            { key: 'night', label: this.$t('worldState.values.phases.night'), icon: Moon }
          ]
        }
      ]
    }
  },
  watch: {
    roomWeatherSource: { immediate: true, handler(value) { if (!value.pending) this.publishRoomWeather(value.room, value.snapshots) } },
    activeOperation() { this.rememberRoomView() },
    playerDisplayLimit() { this.rememberRoomView() },
    '$route.query'(query) {
      if (query.targetId != null && query.targetId !== managementScopeTargetId(this.managementScope)) return
      if (query.roomId && query.roomId !== this.selectedRoomId) {
        if (!this.rooms.some(room => room.id === query.roomId)) return
        this.selectedRoomId = query.roomId
        void this.handleRoomChange()
      } else if (this.worlds.some(world => world.id === query.worldId)) {
        this.selectedWorldId = query.worldId
        this.syncConsoleTarget()
        this.rememberRoomView()
      }
    },
    refreshIntervalMs() {
      if (this.workspaceDisposed) return
      this.refreshPollingWorkspace()
      this.startRefreshTimer()
    },
    activeLocale() {
      if (this.roomConnection.profile?.advertiseAddress) return
      this.detectedConnectionAddress = ''
      this.connectionProbeKey = ''
      if (this.connectionPopoverOpen) this.detectDefaultConnectionAddress()
    }
  },
  async created() {
    await this.refreshWorkspace()
    if (!this.workspaceDisposed) this.startRefreshTimer()
  },
  mounted() {
    window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, this.handleManagementScopeChange)
    window.addEventListener(RUNTIME_OBSERVATION_UPDATED_EVENT, this.handleRuntimeObservationUpdate)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  },
  beforeUnmount() {
    this.workspaceDisposed = true
    this.refreshSequence += 1
    this.contextSequence += 1
    this.worldStateSequence += 1
    this.connectionProbeSequence += 1
    this.topologyDialogSequence += 1
    this.rollbackConfigurationSequence += 1
    this.stopRefreshTimer()
    window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, this.handleManagementScopeChange)
    window.removeEventListener(RUNTIME_OBSERVATION_UPDATED_EVENT, this.handleRuntimeObservationUpdate)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
  },
  methods: {
    async manualRefreshWorkspace() {
      if (this.loading || this.workspaceDisposed) return
      await Promise.all([
        this.$refs.roomModOverview?.refresh({ silent: true }),
        this.refreshWorkspace()
      ])
    },
    stopRefreshTimer() {
      if (this.refreshTimer) window.clearInterval(this.refreshTimer)
      this.refreshTimer = null
    },
    startRefreshTimer() {
      this.stopRefreshTimer()
      if (this.workspaceDisposed || document.visibilityState === 'hidden') return
      this.refreshTimer = window.setInterval(() => this.refreshPollingWorkspace(), this.refreshIntervalMs)
    },
    async refreshPollingWorkspace() {
      if (this.workspaceDisposed || document.visibilityState === 'hidden') return false
      if (this.contextLoading || this.refreshInFlightCount > 0) return false
      if (this.runtimeObservationState === 'live' &&
          !this.worlds.some(world => ['starting', 'stopping', 'unknown'].includes(world.status))) {
        if (this.runningWorlds.length === 0) return false
        await Promise.all([this.refreshPlayerStats(), this.refreshWorldStates()])
        return true
      }
      return this.refreshWorkspace(true)
    },
    handleVisibilityChange() {
      if (this.workspaceDisposed) return
      if (document.visibilityState === 'hidden') {
        this.stopRefreshTimer()
        return
      }
      this.refreshWorkspace(true)
      this.startRefreshTimer()
    },
    handleRuntimeObservationUpdate() {
      if (this.workspaceDisposed || document.visibilityState === 'hidden') return
      void this.refreshWorkspace(true)
    },
    async handleModsUpdated() {
      await this.refreshWorkspace()
    },
    handleManagementScopeChange(event) {
      const previousTargetId = managementScopeTargetId(this.managementScope)
      this.managementScope = event?.detail || getManagementScope()
      if (previousTargetId === managementScopeTargetId(this.managementScope)) return
      this.refreshSequence += 1
      this.contextSequence += 1
      this.worldStateSequence += 1
      const targetId = managementScopeTargetId(this.managementScope)
      const preferred = readWorkspaceSelection(targetId, this.$route.query.targetId === targetId ? this.$route.query : {})
      this.selectedRoomId = preferred.roomId
      this.selectedWorldId = preferred.worldId
      this.playerDisplayLimit = preferred.playerDisplayLimit
      this.activeOperation = preferred.activeOperation
      this.preferRunningRoom = !preferred.roomId
      this.rooms = []
      this.playerStats = null
      this.playerSnapshotStale = false
      this.pendingPlayerActions = []
      this.playerWorkbenchTargetId = ''
      this.worldStateSnapshots = []
      this.roomTopology = null
      this.runtimeInfrastructure = null
      this.detectedConnectionAddress = ''
      this.connectionProbeKey = ''
      this.connectionProbeSequence += 1
      this.topologyDialogSequence += 1
      this.topologyDialogRefreshing = false
      this.backups = []
      this.consoleServers = []
      this.consoleServer = ''
      this.commandResult = null
      this.rollbackDialogOpen = false
      this.rollbackWorldId = ''
      this.rollbackConfigurationSequence += 1
      this.roomMaxSnapshots = null
      this.connectionPopoverOpen = false
      this.rollbackExecuting = false
      this.loadError = null
      this.contextErrors = { players: null, console: null, worldStates: null }
      this.contextLoading = false
      this.loading = true
      void this.refreshWorkspace()
    },
    unwrapList(response) {
      if (Array.isArray(response)) return response
      return Array.isArray(response?.data) ? response.data : []
    },
    async refreshWorkspace(silent = false, { refreshWorldStates = true, refreshPlayers = true } = {}) {
      this.pruneStaleRoomActions(Date.now(), true)
      if (this.workspaceDisposed) return false
      if (silent && this.refreshInFlightCount > 0) {
        this.runtimeRefreshPending = true
        return false
      }

      this.runtimeRefreshPending = false
      const requestSequence = ++this.refreshSequence
      this.refreshInFlightCount += 1
      if (!silent) this.loading = true
      this.loadError = null
      const previousRoomId = this.selectedRoomId
      try {
        const scopeTargetId = managementScopeTargetId(this.managementScope)
        const [roomsResult] = await Promise.allSettled([roomApi.getScopedRuntimeOverview(scopeTargetId)])
        if (requestSequence !== this.refreshSequence) return false

        if (roomsResult.status === 'rejected') {
          this.loadError = this.errorState('servers.workspace.feedback.loadFailed', roomsResult.reason)
        } else {
          this.rooms = Array.isArray(roomsResult.value?.data?.rooms) ? roomsResult.value.data.rooms : []
          this.resolveSelection()
        }

        if (this.selectedRoom) {
          if (silent && previousRoomId === this.selectedRoomId) {
            const liveRefreshes = []
            if (refreshWorldStates) liveRefreshes.push(this.refreshWorldStates())
            if (refreshPlayers && this.runningWorlds.length > 0) liveRefreshes.push(this.refreshPlayerStats())
            await Promise.all(liveRefreshes)
          } else {
            if (previousRoomId !== this.selectedRoomId) {
              this.playerStats = null
              this.playerSnapshotStale = false
              this.pendingPlayerActions = []
              this.playerWorkbenchTargetId = ''
            }
            await this.refreshRoomContext()
          }
        } else {
          this.clearRoomContext()
        }
        return true
      } finally {
        this.refreshInFlightCount = Math.max(0, this.refreshInFlightCount - 1)
        if (requestSequence === this.refreshSequence) this.loading = false
        if (this.refreshInFlightCount === 0 && this.runtimeRefreshPending &&
            !this.workspaceDisposed && document.visibilityState !== 'hidden') {
          this.runtimeRefreshPending = false
          void this.refreshWorkspace(true)
        }
      }
    },
    resolveSelection() {
      const roomId = this.rooms.some(room => room.id === this.selectedRoomId)
        ? this.selectedRoomId : readWorkspaceSelection(managementScopeTargetId(this.managementScope)).roomId
      const room = selectWorkspaceRoom(this.rooms, roomId, this.preferRunningRoom)
      this.preferRunningRoom = false
      const changed = room?.id !== this.selectedRoomId
      this.selectedRoomId = room?.id || ''
      if (changed) this.restoreRoomView()

      const worlds = room?.worlds || []
      let world = worlds.find(item => item.id === this.selectedWorldId)
      if (!world) world = worlds.find(item => item.status === 'running') || worlds[0]
      this.selectedWorldId = world?.id || ''
      this.syncConsoleTarget()
      this.syncRouteContext()
    },
    restoreRoomView() {
      const preferred = readRoomView(this.selectedRoomId)
      this.playerDisplayLimit = preferred.playerDisplayLimit
      this.activeOperation = preferred.activeOperation
      this.selectedWorldId = preferred.worldId
    },
    rememberRoomView() {
      if (!this.selectedRoom) return
      rememberWorkspaceView(managementScopeTargetId(this.managementScope), this.selectedRoomId, {
        worldId: this.selectedWorldId,
        activeOperation: this.activeOperation,
        playerDisplayLimit: this.playerDisplayLimit
      })
    },
    collapsePlayers() {
      this.playerDisplayLimit = CONTEXT_PLAYER_LIMIT
    },
    async handleRoomChange() {
      this.rollbackDialogOpen = false
      this.rollbackWorldId = ''
      this.rollbackConfigurationSequence += 1
      this.connectionPopoverOpen = false
      this.playerStats = null
      this.playerSnapshotStale = false
      this.pendingPlayerActions = []
      this.playerWorkbenchTargetId = ''
      this.restoreRoomView()
      const requestedWorldId = this.$route.query.roomId === this.selectedRoomId ? this.$route.query.worldId : ''
      this.selectedWorldId = (this.worlds.find(world => world.id === requestedWorldId) ||
        this.worlds.find(world => world.id === this.selectedWorldId) ||
        this.worlds.find(world => world.status === 'running') || this.worlds[0])?.id || ''
      this.syncConsoleTarget()
      this.syncRouteContext()
      if (this.selectedRoom) await this.refreshRoomContext()
      else this.clearRoomContext()
    },
    clearRoomContext() {
      this.contextSequence += 1
      this.worldStateSequence += 1
      this.topologyDialogSequence += 1
      this.topologyDialogRefreshing = false
      this.topologyDialogError = ''
      this.rollbackConfigurationSequence += 1
      this.rollbackDialogOpen = false
      this.connectionPopoverOpen = false
      this.playerStats = null
      this.worldStateSnapshots = []
      this.roomTopology = null
      this.runtimeInfrastructure = null
      this.backups = []
      this.consoleServers = []
      this.consoleServer = ''
      this.contextErrors = { players: null, console: null, worldStates: null }
      this.contextLoading = false
    },
    async refreshRoomContext() {
      if (!this.selectedRoom) return
      this.topologyDialogSequence += 1
      this.topologyDialogRefreshing = false
      const requestSequence = ++this.contextSequence
      const roomId = this.selectedRoomId
      const roomName = this.selectedRoom.name
      this.contextLoading = true
      this.topologyDialogError = ''
      this.worldStateSnapshots = []
      this.roomTopology = null
      this.runtimeInfrastructure = null
      this.detectedConnectionAddress = ''
      this.connectionProbeKey = ''
      this.connectionProbeSequence += 1
      this.backups = []
      this.consoleServers = []
      this.consoleServer = ''
      this.contextErrors = { players: null, console: null, worldStates: null }
      const worldStateRequestSequence = ++this.worldStateSequence
      const playersCompletion = playerApi.getPlayerStats(roomName, this.playerScopeWorldIds(), roomId).then(
        response => {
          if (requestSequence !== this.contextSequence || this.selectedRoomId !== roomId) return
          this.playerStats = response?.data || null
          this.playerSnapshotStale = false
          this.contextErrors.players = null
        },
        error => {
          if (requestSequence !== this.contextSequence || this.selectedRoomId !== roomId) return
          this.playerSnapshotStale = Boolean(this.playerStats)
          this.contextErrors.players = this.errorState('servers.workspace.feedback.playersLoadFailed', error)
        }
      )
      const [backupsResult, consoleResult, worldStatesResult] = await Promise.allSettled([
        backupSetsV2API.list(roomId),
        Promise.resolve(this.consoleTargetsForSelectedRoom()),
        worldStatesV2API.list(roomId)
      ])

      if (requestSequence !== this.contextSequence || this.selectedRoomId !== roomId) return
      this.backups = backupsResult.status === 'fulfilled'
        ? [...(backupsResult.value?.items || [])].sort((left, right) => {
          const leftTime = new Date(left.createdAt || left.create_time || 0).getTime()
          const rightTime = new Date(right.createdAt || right.create_time || 0).getTime()
          return rightTime - leftTime
        })
        : []
      this.consoleServers = consoleResult.status === 'fulfilled' ? consoleResult.value : []
      this.contextErrors.console = consoleResult.status === 'rejected'
        ? this.errorState('servers.workspace.feedback.consoleTargetsLoadFailed', consoleResult.reason)
        : null
      if (worldStateRequestSequence === this.worldStateSequence) {
        this.worldStateSnapshots = worldStatesResult.status === 'fulfilled'
          ? worldStatesResult.value?.items || []
          : []
        this.contextErrors.worldStates = worldStatesResult.status === 'rejected'
          ? this.errorState('servers.workspace.feedback.worldStatesLoadFailed', worldStatesResult.reason)
          : null
      }
      this.syncConsoleTarget()
      this.contextLoading = false
      await playersCompletion
    },
    async refreshTopologyDialog() {
      if (!this.selectedRoom || this.topologyDialogRefreshing) return
      const roomId = this.selectedRoomId
      const sequence = ++this.topologyDialogSequence
      this.topologyDialogRefreshing = true
      this.topologyDialogError = ''
      this.roomTopology = null
      this.runtimeInfrastructure = null
      this.detectedConnectionAddress = ''
      this.connectionProbeKey = ''
      this.connectionProbeSequence += 1
      try {
        const [topologyResult, infrastructureResult] = await Promise.allSettled([
          topologyV2API.get(roomId),
          topologyV2API.infrastructure()
        ])
        if (sequence !== this.topologyDialogSequence || this.selectedRoomId !== roomId) return
        if (topologyResult.status === 'fulfilled') this.roomTopology = topologyResult.value
        if (infrastructureResult.status === 'fulfilled') this.runtimeInfrastructure = infrastructureResult.value
        const failures = [topologyResult, infrastructureResult]
          .filter(result => result.status === 'rejected')
          .map(result => result.reason?.message || this.$t('common.errors.unknown'))
        if (failures.length) this.topologyDialogError = failures.join(' / ')
        if (this.connectionPopoverOpen && !failures.length) {
          this.connectionAddressDraft = String(this.roomConnection.profile?.advertiseAddress || '').trim()
          this.detectDefaultConnectionAddress()
        }
      } finally {
        if (sequence === this.topologyDialogSequence && this.selectedRoomId === roomId) this.topologyDialogRefreshing = false
      }
    },
    consoleTargetsForSelectedRoom() {
      const room = this.selectedRoom
      if (!room) return []
      return this.worlds.map(world => ({
        id: `${room.id}::${world.id}`,
        session_name: `${room.id}::${world.id}`,
        room_id: room.id,
        world_id: world.id,
        archive_name: room.name,
        room_name: room.name,
        world_name: world.name,
        name: `${room.name} - ${world.name}`
      }))
    },
    playerScopeWorldIds() {
      if (!managementScopeTargetId(this.managementScope)) return []
      return this.worlds.map(world => world.id)
    },
    async reloadPlayerStats({ preserveExisting = false, collected = false, reportFailure = true } = {}) {
      if (!this.selectedRoom) return
      const requestSequence = ++this.contextSequence
      const roomId = this.selectedRoomId
      if (reportFailure) this.contextErrors.players = null
      try {
        const response = await playerApi.getPlayerStats(this.selectedRoom.name, this.playerScopeWorldIds(), roomId)
        if (requestSequence === this.contextSequence && this.selectedRoomId === roomId) {
          this.playerStats = response?.data || null
          if (collected) this.playerSnapshotStale = false
          this.contextErrors.players = null
        }
        return response
      } catch (error) {
        if (reportFailure && requestSequence === this.contextSequence && this.selectedRoomId === roomId) {
          if (!preserveExisting) this.playerStats = null
          this.playerSnapshotStale = preserveExisting && Boolean(this.playerStats)
          this.contextErrors.players = this.errorState('servers.workspace.feedback.playersLoadFailed', error)
        }
        throw error
      }
    },
    async refreshPlayerStats() {
      if (this.playerRefreshInFlight) return
      this.playerRefreshInFlight = true
      try {
        await this.reloadPlayerStats()
      } catch {
        // The workspace keeps the localized error state populated by reloadPlayerStats.
      } finally {
        this.playerRefreshInFlight = false
      }
    },
    async refreshPlayerStates() {
      const room = this.selectedRoom
      if (!room || this.playersRefreshing) return

      this.playersRefreshing = true
      this.contextErrors.players = null
      try {
        const response = await playerApi.updatePlayerInfo({
          archive_name: room.name,
          world_ids: this.playerScopeWorldIds()
        })
        if (this.selectedRoomId !== room.id) return

        await this.reloadPlayerStats({ preserveExisting: true, collected: true })
        if (this.selectedRoomId !== room.id) return

        const failures = response?.data?.failures || []
        if (failures.length > 0) {
          toast.warning(this.$t('servers.workspace.players.refreshPartial', { count: failures.length }))
        } else {
          toast.success(this.$t('servers.workspace.players.refreshSucceeded'))
        }
      } catch (error) {
        if (this.selectedRoomId === room.id && this.playerStats) this.playerSnapshotStale = true
        toast.error(this.$t('servers.workspace.players.refreshFailed', {
          error: error?.message || this.$t('common.errors.unknown')
        }))
      } finally {
        this.playersRefreshing = false
      }
    },
    playerControlWorld(player) {
      return this.worlds.find(world => world.id === player?.world_id)
        || this.worlds.find(world => world.name === player?.world_name)
        || null
    },
    playerCanUseLiveActions(player) {
      return this.playerIsOnline(player) && !player?.presence_conflict
    },
    playerIsGhost(player) {
      return normalizePlayerGameplayState(player?.gameplay_state) === 'ghost'
    },
    playerAvatarActionAvailable(player) {
      const world = this.playerControlWorld(player)
      return this.playerCanUseLiveActions(player) && Boolean(world && canStopWorld(world))
    },
    playerAvatarActionLabel(player) {
      const playerName = player?.player_name || player?.user_id || this.$t('players.values.unknownPlayer')
      if (!this.playerAvatarActionAvailable(player)) {
        return this.$t('servers.workspace.players.quickActions.avatarUnavailable', { player: playerName })
      }
      return this.$t(this.playerIsGhost(player)
        ? 'servers.workspace.players.quickActions.avatarResurrect'
        : 'servers.workspace.players.quickActions.avatarWorkbench', { player: playerName })
    },
    playerMetricControlLabel(player, metric) {
      if (this.isPlayerActionPending(player?.user_id)) {
        return this.$t('servers.workspace.players.quickActions.pending')
      }
      const gameplayState = normalizePlayerGameplayState(player?.gameplay_state)
      if (gameplayState === 'ghost') {
        return this.$t('servers.workspace.players.quickActions.ghostMetric', { label: metric.label })
      }
      if (gameplayState === 'dead') {
        return this.$t('servers.workspace.players.quickActions.deadMetric', { label: metric.label })
      }
      if (!this.canControlPlayerVital(player, metric)) return this.playerMetricLabel(metric)
      return this.$t('servers.workspace.players.quickActions.adjustMetric', {
        label: metric.label,
        value: metric.value
      })
    },
    openPlayerWorkbench(player, section = 'player') {
      if (!this.playerAvatarActionAvailable(player) || this.playerIsGhost(player)) return
      this.playerWorkbenchTargetId = player.user_id
      this.playerWorkbenchSection = section
      this.playerWorkbenchRequest += 1
    },
    handlePlayerAvatarAction(player) {
      if (!this.playerAvatarActionAvailable(player) || this.isPlayerActionPending(player.user_id)) return
      if (this.playerIsGhost(player)) {
        this.resurrectPlayerFromAvatar(player)
        return
      }
      this.openPlayerWorkbench(player, 'player')
    },
    playerActionPendingKey(playerId, roomId = this.selectedRoomId) {
      return this.pendingPlayerActions.find(action => (
        action.roomId === roomId && action.playerId === playerId
      ))?.key || ''
    },
    isPlayerActionPending(playerId, roomId = this.selectedRoomId) {
      return Boolean(this.playerActionPendingKey(playerId, roomId))
    },
    setPlayerActionPending(roomId, playerId, key, pending) {
      if (pending) {
        if (!this.isPlayerActionPending(playerId, roomId)) {
          this.pendingPlayerActions = [...this.pendingPlayerActions, { roomId, playerId, key }]
        }
        return
      }
      this.pendingPlayerActions = this.pendingPlayerActions.filter(action => (
        action.roomId !== roomId || action.playerId !== playerId
      ))
    },
    async collectPlayerState(player) {
      const room = this.selectedRoom
      const world = this.playerControlWorld(player)
      if (!room || room.id !== player?.room_id || !world) {
        throw new Error(this.$t('servers.workspace.players.quickActions.targetUnavailable'))
      }
      await playerApi.updatePlayerInfo({
        archive_name: room.name,
        world_name: world.name
      })
      if (this.selectedRoomId !== room.id) return null
      // The caller reports a failure for this player. A failed action refresh
      // must not invalidate the snapshots of everyone else in the room.
      return this.reloadPlayerStats({ preserveExisting: true, collected: true, reportFailure: false })
    },
    async refreshPlayerAfterAction(player) {
      if (player?.room_id && player.room_id !== this.selectedRoomId) return
      const world = this.playerControlWorld(player)
      try {
        if (world && canStopWorld(world)) await this.collectPlayerState(player)
        else await this.reloadPlayerStats({ preserveExisting: true, reportFailure: false })
      } catch (error) {
        toast.warning(this.$t('servers.workspace.players.quickActions.actionRefreshFailed', {
          player: player?.player_name || player?.user_id,
          error: error?.message || this.$t('common.errors.unknown')
        }))
      }
    },
    async handleCollectedPlayerState(event) {
      if (event?.roomId && event.roomId !== this.selectedRoomId) return
      try {
        await this.reloadPlayerStats({ preserveExisting: true, collected: true, reportFailure: false })
      } catch (error) {
        toast.warning(this.$t('servers.workspace.players.quickActions.reloadFailed', {
          error: error?.message || this.$t('common.errors.unknown')
        }))
      }
    },
    async resurrectPlayerFromAvatar(player) {
      const room = this.selectedRoom
      if (!room || !this.playerIsGhost(player) || this.isPlayerActionPending(player.user_id)) return
      this.setPlayerActionPending(room.id, player.user_id, 'resurrect', true)
      try {
        await playerApi.resurrectPlayer(player, null, player.user_id)
        try {
          await this.collectPlayerState(player)
          toast.success(this.$t('players.feedback.resurrectSucceeded', {
            player: player.player_name || player.user_id
          }))
        } catch (error) {
          toast.warning(this.$t('servers.workspace.players.quickActions.actionRefreshFailed', {
            player: player.player_name || player.user_id,
            error: error?.message || this.$t('common.errors.unknown')
          }))
        }
      } catch (error) {
        toast.error(this.$t('players.feedback.resurrectFailed', {
          error: error?.message || this.$t('common.errors.unknown')
        }))
      } finally {
        this.setPlayerActionPending(room.id, player.user_id, 'resurrect', false)
      }
    },
    canControlPlayerVital(player, metric) {
      const gameplayState = normalizePlayerGameplayState(player?.gameplay_state)
      const world = this.playerControlWorld(player)
      return this.playerCanUseLiveActions(player) &&
        metric?.live &&
        !['dead', 'ghost'].includes(gameplayState) &&
        Boolean(world && canStopWorld(world)) &&
        !this.roomActionsBusy &&
        !this.isPlayerActionPending(player.user_id)
    },
    async executePlayerVitalAction(player, action) {
      const room = this.selectedRoom
      const world = this.playerControlWorld(player)
      const metric = this.playerVitals(player).find(item => item.key === action?.stat)
      const minimum = action?.stat === 'temperature' ? -20 : 0
      const maximum = action?.stat === 'temperature' ? 90 : 100
      const value = Number(action?.value)
      if (!room || !world || !action?.actionKey || !metric || !this.canControlPlayerVital(player, metric) ||
          !Number.isFinite(value) || value < minimum || value > maximum) {
        toast.warning(this.$t('servers.workspace.players.quickActions.unavailable'))
        return
      }

      const valueLabel = action.unit === '%' ? `${value}%` : `${value} °C`
      const actionLabel = this.$t('servers.workspace.players.quickActions.actions.set', {
        label: metric.label,
        value: valueLabel
      })
      this.setPlayerActionPending(room.id, player.user_id, action.actionKey, true)
      try {
        await commandApi.executeCommand(
          `${room.id}::${world.id}`,
          'set_player_stat',
          { player_id: player.user_id, stat: action.stat, value },
          room.name
        )
        try {
          await this.collectPlayerState(player)
          toast.success(this.$t('servers.workspace.players.quickActions.succeeded', {
            action: actionLabel,
            player: player.player_name || player.user_id
          }))
        } catch (error) {
          toast.warning(this.$t('servers.workspace.players.quickActions.refreshFailed', {
            action: actionLabel,
            player: player.player_name || player.user_id,
            error: error?.message || this.$t('common.errors.unknown')
          }))
        }
      } catch (error) {
        toast.error(this.$t('servers.workspace.players.quickActions.failed', {
          action: actionLabel,
          error: error?.message || this.$t('common.errors.unknown')
        }))
      } finally {
        this.setPlayerActionPending(room.id, player.user_id, action.actionKey, false)
      }
    },
    async refreshWorldStates() {
      if (!this.selectedRoom || this.worldStateRefreshInFlight) return
      this.worldStateRefreshInFlight = true
      const requestSequence = ++this.worldStateSequence
      const roomId = this.selectedRoomId
      this.contextErrors.worldStates = null
      try {
        const response = await worldStatesV2API.list(roomId)
        if (requestSequence === this.worldStateSequence && this.selectedRoomId === roomId) {
          this.worldStateSnapshots = response?.items || []
          for (const snapshot of this.worldStateSnapshots) {
            const world = this.worlds.find(item => item.id === snapshot.worldId)
            if (world && world.status === snapshot.runtimeState) world.paused = snapshot.paused
          }
          const runtimeChanged = this.worldStateSnapshots.some(snapshot => {
            const world = this.worlds.find(item => item.id === snapshot.worldId)
            return world && world.controlAvailable !== false && snapshot.runtimeState &&
              (world.status !== snapshot.runtimeState || (world.statusCode || '') !== (snapshot.runtimeCode || ''))
          })
          if (runtimeChanged && !this.workspaceDisposed && document.visibilityState !== 'hidden') {
            void this.refreshWorkspace(true, { refreshWorldStates: false, refreshPlayers: false })
          }
        }
      } catch (error) {
        if (requestSequence === this.worldStateSequence && this.selectedRoomId === roomId) {
          this.contextErrors.worldStates = this.errorState('servers.workspace.feedback.worldStatesLoadFailed', error)
        }
      } finally {
        this.worldStateRefreshInFlight = false
      }
    },
    applyWorldStateSnapshot(snapshot) {
      if (!snapshot?.worldId || (snapshot.roomId && snapshot.roomId !== this.selectedRoomId)) return false
      this.worldStateSequence += 1
      const items = [...this.worldStateSnapshots]
      const index = items.findIndex(item => item.worldId === snapshot.worldId)
      if (index >= 0) items.splice(index, 1, snapshot)
      else items.push(snapshot)
      this.worldStateSnapshots = items
      this.contextErrors.worldStates = null
      return true
    },
    selectWorld(world) {
      this.selectedWorldId = world.id
      this.syncConsoleTarget()
      this.syncRouteContext()
    },
    syncConsoleTarget() {
      const matching = this.consoleServers.find(server =>
        server.room_id === this.selectedRoomId && server.world_id === this.selectedWorldId
      )
      const currentValid = this.consoleServers.some(server => server.session_name === this.consoleServer)
      if (matching) this.consoleServer = matching.session_name
      else if (!currentValid) this.consoleServer = this.roomConsoleServers[0]?.session_name || ''
    },
    syncRouteContext() {
      this.rememberRoomView()
      const roomId = this.selectedRoomId || undefined
      const worldId = this.selectedWorldId || undefined
      const targetId = managementScopeTargetId(this.managementScope)
      if (this.$route.query.roomId === roomId && this.$route.query.worldId === worldId &&
          this.$route.query.targetId === targetId) return
      this.$router.replace({
        path: this.$route.path,
        query: { ...this.$route.query, roomId, worldId, targetId }
      }).catch(() => {})
    },
    isWorldActionPending(worldId, roomId = this.selectedRoomId) {
      return this.pendingWorldActions.some(pending => pending.roomId === roomId && pending.worldId === worldId)
    },
    setWorldActionPending(roomId, worldId, pending) {
      if (pending) {
        if (!this.isWorldActionPending(worldId, roomId)) {
          this.pendingWorldActions = [...this.pendingWorldActions, { roomId, worldId }]
        }
        return
      }
      this.pendingWorldActions = this.pendingWorldActions.filter(action =>
        action.roomId !== roomId || action.worldId !== worldId
      )
    },
    worldStateActionPendingKey(worldId, roomId = this.selectedRoomId) {
      return this.pendingWorldStateActions.find(action => action.roomId === roomId && action.worldId === worldId)?.key || ''
    },
    isWorldStateActionPending(worldId, roomId = this.selectedRoomId) {
      return Boolean(this.worldStateActionPendingKey(worldId, roomId))
    },
    setWorldStateActionPending(roomId, worldId, key, pending) {
      if (pending) {
        if (!this.isWorldStateActionPending(worldId, roomId)) {
          this.pendingWorldStateActions = [...this.pendingWorldStateActions, { roomId, worldId, key }]
        }
        return
      }
      this.pendingWorldStateActions = this.pendingWorldStateActions.filter(action =>
        action.roomId !== roomId || action.worldId !== worldId
      )
    },
    canControlWorldState(world) {
      return canStopWorld(world) &&
        !this.isWorldActionPending(world.id) &&
        !this.isWorldStateActionPending(world.id) &&
        !this.isRollbackPending(world.id) &&
        !this.roomActionKind
    },
    async executeWorldStateAction(world, action) {
      const room = this.selectedRoom
      if (!room || !world || !action?.commandId || !action?.actionKey || !this.canControlWorldState(world)) {
        toast.warning(worldStatusMessage(world) || this.$t('servers.workspace.worlds.quickActions.unavailable'))
        return
      }

      const label = this.$t(action.labelKey, action.labelParams || {})
      this.setWorldStateActionPending(room.id, world.id, action.actionKey, true)
      try {
        await commandApi.executeCommand(
          `${room.id}::${world.id}`,
          action.commandId,
          action.arguments || {},
          room.name
        )
        let refreshError = null
        try {
          const refreshed = await worldStatesV2API.refreshWorld(room.id, world.id)
          if (!refreshed?.snapshot?.worldId) {
            throw new Error(this.$t('servers.workspace.worlds.quickActions.refreshMissing'))
          }
          if (this.selectedRoomId === room.id) this.applyWorldStateSnapshot(refreshed.snapshot)
        } catch (error) {
          refreshError = error
        }
        if (refreshError) {
          toast.warning(this.$t('servers.workspace.worlds.quickActions.refreshFailed', {
            action: label,
            world: world.name,
            error: refreshError?.message || this.$t('common.errors.unknown')
          }))
        } else {
          toast.success(this.$t('servers.workspace.worlds.quickActions.succeeded', {
            action: label,
            world: world.name
          }))
        }
      } catch (error) {
        toast.error(this.$t('servers.workspace.worlds.quickActions.failed', {
          action: label,
          error: error?.message || this.$t('common.errors.unknown')
        }))
      } finally {
        this.setWorldStateActionPending(room.id, world.id, action.actionKey, false)
      }
    },
    isRollbackPending(worldId) {
      return this.rollbackExecuting && this.rollbackWorldId === worldId
    },
    selectRollbackDays(value) {
      const days = Number(Array.isArray(value) ? value[0] : value)
      if (!Number.isFinite(days)) return
      this.rollbackDays = Math.min(this.roomMaxSnapshots, Math.max(1, Math.round(days)))
    },
    openRollbackDialog(world) {
      if (!world || !canStopWorld(world) || this.roomActionsBusy || this.isWorldActionPending(world.id)) {
        toast.warning(worldStatusMessage(world) || this.$t('servers.workspace.feedback.actionUnavailable'))
        return
      }
      this.rollbackWorldId = world.id
      this.rollbackDays = 1
      this.rollbackDialogOpen = true
      void this.loadRollbackConfiguration()
    },
    async loadRollbackConfiguration() {
      if (!this.selectedRoom || !this.rollbackDialogOpen) return
      const roomId = this.selectedRoomId
      const sequence = ++this.rollbackConfigurationSequence
      this.rollbackConfigurationLoading = true
      this.rollbackConfigurationError = ''
      this.roomMaxSnapshots = null
      try {
        const result = await configurationV2API.room(roomId)
        if (sequence !== this.rollbackConfigurationSequence || this.selectedRoomId !== roomId || !this.rollbackDialogOpen) return
        const maxSnapshots = Number(result?.values?.maxSnapshots ?? 10)
        if (!Number.isInteger(maxSnapshots) || maxSnapshots < 1) throw new Error(this.$t('servers.workspace.rollback.invalidLimit'))
        this.roomMaxSnapshots = maxSnapshots
        this.selectRollbackDays(this.rollbackDays)
      } catch (error) {
        if (sequence !== this.rollbackConfigurationSequence || this.selectedRoomId !== roomId || !this.rollbackDialogOpen) return
        this.rollbackConfigurationError = this.$t('servers.workspace.rollback.loadFailed', { error: error?.message || this.$t('common.errors.unknown') })
      } finally {
        if (sequence === this.rollbackConfigurationSequence) this.rollbackConfigurationLoading = false
      }
    },
    async executeRollback() {
      const room = this.selectedRoom
      const world = this.rollbackWorld
      if (!room || !world || this.rollbackExecuting || !this.rollbackDaysValid || !canStopWorld(world)) return

      this.rollbackExecuting = true
      try {
        await commandApi.executeCommand(
          `${room.id}::${world.id}`,
          'rollback',
          { days: Number(this.rollbackDays) },
          room.name
        )
        this.rollbackDialogOpen = false
        toast.success(this.$t('servers.workspace.feedback.rollbackSubmitted', {
          world: world.name,
          count: this.rollbackDays
        }))
        await this.refreshWorkspace(true)
      } catch (error) {
        toast.error(this.$t('servers.workspace.feedback.rollbackFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }))
      } finally {
        this.rollbackExecuting = false
      }
    },
    isRoomActionPending(roomId = this.selectedRoomId) {
      return this.pendingRoomActions.some(pending => pending.roomId === roomId)
    },
    pruneStaleRoomActions(now = Date.now(), notify = false) {
      const previousCount = this.pendingRoomActions.length
      this.pendingRoomActions = this.pendingRoomActions.filter(action => {
        const startedAt = Number(action.startedAt)
        const maxAge = ROOM_ACTION_UI_MAX_AGE_MS[action.kind] || ROOM_ACTION_UI_MAX_AGE_MS.start
        return Number.isFinite(startedAt) && now - startedAt < maxAge
      })
      if (notify && this.pendingRoomActions.length < previousCount) {
        toast.warning(this.$t('servers.workspace.feedback.roomActionLocalStateRecovered'))
      }
    },
    setRoomActionPending(roomId, kind, pending, token = null) {
      if (pending) {
        this.roomActionSequence = Number(this.roomActionSequence || 0) + 1
        const nextToken = this.roomActionSequence
        this.pendingRoomActions = [
          ...this.pendingRoomActions.filter(action => action.roomId !== roomId),
          { roomId, kind, token: nextToken, startedAt: Date.now() }
        ]
        return nextToken
      }
      this.pendingRoomActions = this.pendingRoomActions.filter(action => (
        action.roomId !== roomId || (token !== null && action.token !== token)
      ))
      return null
    },
    async handleRoomAction(action) {
      this.pruneStaleRoomActions()
      if (!this.selectedRoom || !['start', 'stop'].includes(action) || this.roomActionsBusy) return

      const roomId = this.selectedRoom.id
      const roomName = this.selectedRoom.name
      const worlds = action === 'start' ? [...this.roomStartWorlds] : [...this.roomStopWorlds]
      if (worlds.length === 0) {
        toast.warning(this.$t('servers.workspace.feedback.roomActionUnavailable'))
        return
      }

      const label = this.$t(`servers.workspace.actions.${action}`)
      let requestStarted = false
      let requestCanceled = false
      let operationToastId = null
      let operationError = null
      let submittedJob = null
      const actionToken = this.setRoomActionPending(roomId, action, true)
      let maintenance = {}
      try {
        if (action === 'stop') {
          try {
            maintenance = await confirmRoomMaintenance(roomId, this.$t('servers.workspace.feedback.roomActionConfirm', {
              action: label,
              room: roomName,
              count: worlds.length
            }), this.$t('servers.workspace.feedback.roomActionTitle', { action: label }), {
              confirmButtonText: this.$t('servers.workspace.feedback.roomActionButton', { action: label }),
              cancelButtonText: this.$t('common.actions.cancel'),
              type: 'warning'
            })
          } catch {
            return
          }
        }

        operationToastId = toast.loading(this.$t('servers.workspace.feedback.roomActionSubmitted', {
          action: label,
          count: worlds.length
        }))
        const target = {
          room_id: roomId,
          world_ids: worlds.map(world => world.id),
          exact_world_ids: Boolean(managementScopeTargetId(this.managementScope))
        }
        requestStarted = true
        if (action === 'start') {
          const response = await startRoomWithCapacityRisk({ ...target, wait_for_completion: false })
          submittedJob = response?.data || null
          emitGlobalJobSubmitted(submittedJob)
        }
        if (action === 'stop') await roomApi.stopRoom({ ...target, ...maintenance })
      } catch (error) {
        if (isCapacityRiskCanceled(error)) {
          requestCanceled = true
          return
        }
        operationError = this.$t('servers.workspace.feedback.roomActionFailed', {
          action: label,
          error: error.message || this.$t('common.errors.unknown')
        })
      } finally {
        if (requestStarted && !requestCanceled) {
          if (operationToastId) {
            toast.loading(this.$t('servers.workspace.feedback.roomActionRefreshing', { action: label }), {
              id: operationToastId
            })
          }
          await this.refreshWorkspace(true)
        }
        if (operationToastId) {
          if (requestCanceled) toast.dismiss(operationToastId)
          else if (operationError) toast.error(operationError, { id: operationToastId })
          else toast.success(this.$t(submittedJob
            ? 'servers.workspace.feedback.roomActionAccepted'
            : 'servers.workspace.feedback.roomActionCompleted', { action: label }), {
            id: operationToastId
          })
        }
        this.setRoomActionPending(roomId, action, false, actionToken)
      }
    },
    async handleWorldAction(world, action) {
      const roomId = this.selectedRoom?.id
      if (!action ||
          !roomId ||
          this.isRoomActionPending(roomId) ||
          this.isWorldActionPending(world.id, roomId) ||
          this.isWorldStateActionPending(world.id, roomId) ||
          (action === 'start' && !canStartWorld(world)) ||
          (action === 'cleanup' && !canCleanFailedWorld(world)) ||
          (action === 'stop' && !canRequestStopWorld(world)) ||
          (action === 'restart' && !canStopWorld(world))) {
        toast.warning(worldStatusMessage(world) || this.$t('servers.workspace.feedback.actionUnavailable'))
        return
      }
      const roomName = this.selectedRoom.name
      const label = this.$t(`servers.workspace.actions.${action}`)
      const scope = worldLifecycleScope(this.worlds, world, action)
      if (!scope.allowed) {
        await this.refreshWorkspace(true)
        toast.warning(this.$t(`servers.workspace.feedback.${scope.reason === 'master-unavailable'
          ? 'dependencyMasterUnavailable'
          : 'dependencyMasterUnknown'}`))
        return
      }
      const affectedWorlds = scope.worlds
      const affectedWorldNames = affectedWorlds.map(item => item.name).join('、')
      const confirmationTitle = action === 'cleanup'
        ? this.$t('servers.workspace.worlds.cleanupFailedSession')
        : this.$t('servers.workspace.feedback.actionTitle', { action: label })
      let maintenance = {}
      affectedWorlds.forEach(item => this.setWorldActionPending(roomId, item.id, true))
      let requestStarted = false
      let requestCanceled = false
      let operationToastId = null
      let operationError = null
      let submittedJob = null
      try {
        if (worldActionRequiresConfirmation(action)) {
          try {
            const confirmation = affectedWorlds.length > 1
              ? this.$t('servers.workspace.feedback.actionDependencyConfirm', {
                action: label,
                room: roomName,
                count: affectedWorlds.length,
                worlds: affectedWorldNames
              })
              : this.$t('servers.workspace.feedback.actionConfirm', {
                action: label,
                room: roomName,
                world: world.name
              })
            const confirm = action === 'stop' || action === 'restart'
              ? (...args) => confirmRoomMaintenance(roomId, ...args)
              : confirmAction
            maintenance = await confirm(confirmation, confirmationTitle, {
              confirmButtonText: action === 'cleanup'
                ? this.$t('servers.workspace.feedback.cleanupButton')
                : this.$t('servers.workspace.feedback.actionButton', { action: label }),
              cancelButtonText: this.$t('common.actions.cancel'),
              type: 'warning'
            })
          } catch {
            return
          }
        }

        operationToastId = toast.loading(affectedWorlds.length > 1
          ? this.$t('servers.workspace.feedback.actionScopeSubmitted', {
            action: label,
            count: affectedWorlds.length,
            worlds: affectedWorldNames
          })
          : this.$t('servers.workspace.feedback.actionSubmitted', {
            action: label,
            world: world.name
          }))
        const target = {
          room_id: roomId,
          world_ids: affectedWorlds.map(item => item.id),
          exact_world_ids: Boolean(managementScopeTargetId(this.managementScope))
        }
        requestStarted = true
        if (action === 'start') {
          const response = await startRoomWithCapacityRisk({ ...target, wait_for_completion: false })
          submittedJob = response?.data || null
          emitGlobalJobSubmitted(submittedJob)
        }
        if (action === 'stop') await roomApi.stopRoom({ ...target, ...maintenance })
        if (action === 'cleanup') await roomApi.cleanupRoom(target)
        if (action === 'restart') await restartWorldWithCapacityRisk({
          ...target,
          ...maintenance,
          archive_name: roomName
        })
      } catch (error) {
        if (isCapacityRiskCanceled(error)) {
          requestCanceled = true
          return
        }
        operationError = this.$t('servers.workspace.feedback.actionFailed', {
          action: label,
          error: error.message || this.$t('common.errors.unknown')
        })
      } finally {
        if (requestStarted && !requestCanceled) {
          if (operationToastId) {
            toast.loading(this.$t('servers.workspace.feedback.actionRefreshing', {
              action: label,
              worlds: affectedWorldNames
            }), { id: operationToastId })
          }
          await this.refreshWorkspace(true)
        }
        if (operationToastId) {
          if (requestCanceled) toast.dismiss(operationToastId)
          else if (operationError) toast.error(operationError, { id: operationToastId })
          else toast.success(this.$t(submittedJob
            ? 'servers.workspace.feedback.actionAccepted'
            : 'servers.workspace.feedback.actionCompleted', { action: label }), {
            id: operationToastId
          })
        }
        affectedWorlds.forEach(item => this.setWorldActionPending(roomId, item.id, false))
      }
    },
    async createBackup() {
      if (!this.selectedRoom || !this.roomControlAvailable) return
      this.backupCreating = true
      try {
        await waitForV2Job(
          await backupSetsV2API.create(this.selectedRoom.id),
          10 * 60 * 1000
        )
        toast.success(this.$t('servers.workspace.feedback.backupCreated'))
        await this.refreshRoomContext()
      } catch (error) {
        toast.error(this.$t('servers.workspace.feedback.backupCreateFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }))
      } finally {
        this.backupCreating = false
      }
    },
    applyCommonCommand(command) {
      this.rawCommand = command
    },
    async executeRawCommand() {
      const server = this.selectedConsoleServer
      if (!server || !this.rawCommand.trim()) return

      let confirmation
      try {
        await confirmAction(
          this.$t('servers.workspace.console.confirmDescription', { room: server.room_name }),
          this.$t('servers.workspace.console.confirmTitle'),
          {
            confirmButtonText: this.$t('servers.workspace.console.confirmExecute'),
            cancelButtonText: this.$t('common.actions.cancel'),
            type: 'warning'
          }
        )
        confirmation = server.room_name
      } catch {
        return
      }

      this.commandExecuting = true
      this.commandResult = null
      try {
        const run = await commandApi.executeRawCommand(server.session_name, this.rawCommand.trim(), confirmation)
        const success = run.status === 'succeeded'
        this.commandResult = {
          success,
          runId: run.id,
          message: success ? '' : (run.errorMessage || run.message || '')
        }
        if (success) toast.success(this.$t('servers.workspace.console.sent'))
        else toast.error(this.commandResult.message || this.$t('servers.workspace.console.sendFailed'))
      } catch (error) {
        this.commandResult = { success: false, message: error.detail || error.message || '' }
        toast.error(this.commandResult.message || this.$t('servers.workspace.console.sendFailed'))
      } finally {
        this.commandExecuting = false
      }
    },
    openRoomSettings() {
      this.$router.push({ path: '/rooms/settings', query: { id: this.selectedRoomId } })
    },
    openWorldPlacement() {
      this.$router.push({ path: '/rooms/settings', query: { id: this.selectedRoomId, deployment: 'edit' } })
    },
    handleConnectionPopoverOpen(open) {
      this.connectionPopoverOpen = open
      if (!open) return
      this.connectionAddressDraft = ''
      this.connectionAddressError = ''
      void this.refreshTopologyDialog()
    },
    normalizedConnectionAddressDraft() {
      return String(this.connectionAddressDraft || '').trim().replace(/^\[([^\]]+)\]$/, '$1')
    },
    selectLanConnectionAddress(address) {
      if (!address) return
      this.connectionAddressDraft = String(address)
      this.connectionAddressError = ''
    },
    async detectConnectionAddress() {
      await this.probeConnectionAddress({ force: true, notify: true })
    },
    detectDefaultConnectionAddress() {
      const profile = this.roomConnection.profile
      if (!profile?.id || String(profile.advertiseAddress || '').trim()) return
      void this.probeConnectionAddress()
    },
    async probeConnectionAddress({ force = false, notify = false } = {}) {
      const profileId = this.roomConnection.profile?.id
      const region = egressProbeRegion(this.activeLocale)
      const probeKey = `${this.selectedRoomId}:${profileId}:${region}`
      if (!profileId || (!force && this.connectionProbeKey === probeKey)) return
      const sequence = ++this.connectionProbeSequence
      this.connectionProbeKey = probeKey
      this.connectionAddressDetecting = true
      if (notify) this.connectionAddressError = ''
      try {
        const result = await topologyV2API.detectNetworkProfileEgress(profileId, region)
        const address = String(result?.address || '').trim()
        if (!address) throw new Error(this.$t('servers.workspace.worlds.connection.detectEmpty'))
        if (sequence !== this.connectionProbeSequence || probeKey !== this.connectionProbeKey) return
        this.detectedConnectionAddress = address
        if (this.connectionPopoverOpen || notify) this.connectionAddressDraft = address
        if (notify) toast.success(this.$t('servers.workspace.worlds.connection.detected', { address }))
      } catch (error) {
        if (sequence !== this.connectionProbeSequence || probeKey !== this.connectionProbeKey) return
        this.connectionAddressError = this.$t('servers.workspace.worlds.connection.detectFailed', { error: error?.message || this.$t('common.errors.unknown') })
        if (notify) toast.error(this.connectionAddressError)
      } finally {
        if (sequence === this.connectionProbeSequence) this.connectionAddressDetecting = false
      }
    },
    async saveConnectionAddress() {
      const profile = this.roomConnection.profile
      const address = this.normalizedConnectionAddressDraft()
      if (!profile?.id || !address || this.connectionAddressSaving) return
      const roomId = this.selectedRoomId
      this.connectionAddressSaving = true
      this.connectionAddressError = ''
      try {
        await topologyV2API.updateNetworkProfile(profile.id, {
          name: profile.name,
          bindAddress: profile.bindAddress || '0.0.0.0',
          advertiseAddress: address
        })
        const infrastructure = await topologyV2API.infrastructure()
        if (this.selectedRoomId === roomId) this.runtimeInfrastructure = infrastructure
        this.connectionAddressDraft = address
        this.detectedConnectionAddress = ''
        toast.success(this.$t('servers.workspace.worlds.connection.saved', {
          endpoint: formatConnectionEndpoint(address, this.roomConnection.port) || address
        }))
      } catch (error) {
        this.connectionAddressError = this.$t('servers.workspace.worlds.connection.saveFailed', {
          error: error?.message || this.$t('common.errors.unknown')
        })
        toast.error(this.connectionAddressError)
      } finally {
        this.connectionAddressSaving = false
      }
    },
    async copyConnectionValue(value, kind) {
      if (!value) return
      try {
        await this.writeClipboard(value)
        toast.success(this.$t(`servers.workspace.worlds.connection.copied.${kind}`))
      } catch (error) {
        toast.error(this.$t('servers.workspace.worlds.connection.copyFailed', {
          error: error?.message || this.$t('common.errors.unknown')
        }))
      }
    },
    async writeClipboard(value) {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(value)
        return
      }
      const textArea = document.createElement('textarea')
      textArea.value = value
      textArea.setAttribute('readonly', '')
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      let copied = false
      try {
        copied = document.execCommand('copy')
      } finally {
        document.body.removeChild(textArea)
      }
      if (!copied) throw new Error(this.$t('servers.workspace.worlds.connection.clipboardDenied'))
    },
    worldPlacement(world) {
      return world?.placement ||
        (this.roomTopology?.placements || []).find(placement => String(placement.worldId) === String(world.id)) || null
    },
    worldRuntimeTarget(world) {
      const targetId = this.worldPlacement(world)?.appliedTargetId
      return world?.target || (this.roomTopology?.targets || []).find(target => target.id === targetId) || null
    },
    worldMachineName(world) {
      const placement = this.worldPlacement(world)
      return this.worldRuntimeTarget(world)?.name
        || placement?.appliedTargetId
        || this.$t('servers.workspace.states.notSelected')
    },
    openWorldSettings(world) {
      this.$router.push({
        path: '/worlds/settings',
        query: {
          roomId: this.selectedRoomId,
          roomName: this.selectedRoom.name,
          worldId: world.id,
          worldName: world.name,
          worldType: world.type
        }
      })
    },
    openPlayers() {
      this.$router.push({ path: '/players/list', query: { archive: this.selectedRoom?.name } })
    },
    worldIcon(world) {
      return { forest: Trees, cave: Mountain }[this.worldType(world)] || Shapes
    },
    worldTone(world) {
      return this.worldType(world) === 'unknown' ? 'custom' : this.worldType(world)
    },
    worldType(world) {
      const type = String(world?.type || '').trim().toLowerCase()
      return ['forest', 'cave'].includes(type) ? type : 'unknown'
    },
    worldIsMaster(world) {
      if (typeof world?.isMaster === 'boolean') return world.isMaster
      return String(world?.role || '').trim().toLowerCase() === 'master'
    },
    worldRoleLabel(world) {
      const type = this.$t(`servers.workspace.worlds.roles.${this.worldType(world)}`)
      const role = this.$t(`servers.workspace.worlds.roles.${this.worldIsMaster(world) ? 'master' : 'secondary'}`)
      return `${type} · ${role}`
    },
    worldStatusLabel(status) {
      return worldStatusLabel(status, key => this.$t(key))
    },
    worldStatusVariant(world) {
      return worldStatusVariant(world)
    },
    worldStatusMessage(world) {
      return worldStatusMessage(world)
    },
    worldSaveWriteFailed(world) {
      return isWorldSaveWriteFailed(world)
    },
    worldPrimaryAction(world) {
      return worldPrimaryAction(world, key => this.$t(key))
    },
    canStopWorld(world) {
      return canStopWorld(world)
    },
    canCleanFailedWorld(world) {
      return canCleanFailedWorld(world)
    },
    canConfigureWorld(world) {
      return this.configurationAvailable && canConfigureWorld(world)
    },
    canToggleWorld(world) {
      return !this.worldPrimaryAction(world).disabled
    },
    worldActionLabel(world) {
      return this.$t('servers.workspace.worlds.actionLabel', {
        action: this.worldPrimaryAction(world).label
      })
    },
    seasonLabel(season) {
      const normalized = String(season || '').trim().toLowerCase()
      if (['autumn', 'winter', 'spring', 'summer'].includes(normalized)) {
        return this.$t(`servers.list.seasons.${normalized}`)
      }
      return season || '--'
    },
    worldStateFor(world) {
      return this.worldStateSnapshots.find(snapshot => snapshot.worldId === world.id)
        || this.worldStateSnapshots.find(snapshot => snapshot.worldName === world.name)
        || null
    },
    worldDayLabel(world) {
      const snapshot = this.worldStateFor(world)
      const cycles = snapshot?.cycles
      if (Number.isFinite(cycles)) {
        return this.$t('servers.workspace.worlds.dayValue', { count: cycles + 1 })
      }
      return snapshot ? '--' : this.metricValue(world.day)
    },
    worldOnlinePlayerLabel(world) {
      const counts = this.playerStats?.online_by_world
      if (!counts) return '--'
      return this.$t('servers.workspace.worlds.onlinePlayerCount', { count: counts[world.id] || 0 })
    },
    worldPerformanceAvailable(world) {
      const snapshot = this.worldStateFor(world)
      return world?.status === 'running' && snapshot?.freshness === 'live'
    },
    worldSeasonLabel(world) {
      const snapshot = this.worldStateFor(world)
      return this.seasonLabel(snapshot ? snapshot.season : world.season)
    },
    worldSeasonIcon(world) {
      const snapshot = this.worldStateFor(world)
      const season = String((snapshot ? snapshot.season : world.season) || '').trim().toLowerCase()
      return {
        autumn: Leaf,
        winter: Snowflake,
        spring: Sprout,
        summer: Sun
      }[season] || null
    },
    worldSeasonProgress(world) {
      return this.progressValue(this.worldStateFor(world)?.seasonProgress)
    },
    worldPhaseLabel(world) {
      return this.protocolLabel('phases', this.worldStateFor(world)?.phase)
    },
    worldPhaseIcon(world) {
      const phase = String(this.worldStateFor(world)?.phase || '').trim().toLowerCase()
      return {
        day: Sun,
        dusk: Sunset,
        night: Moon
      }[phase] || null
    },
    worldPhaseProgress(world) {
      return this.progressValue(this.worldStateFor(world)?.phaseProgress)
    },
    worldWeatherLabel(world) {
      const snapshot = this.worldStateFor(world)
      if (!snapshot) return '--'
      const parts = []
      if (snapshot.precipitation) parts.push(this.protocolLabel('weather', snapshot.precipitation))
      if (Number.isFinite(snapshot.temperature)) {
        parts.push(this.$t('servers.workspace.worlds.temperatureValue', { value: snapshot.temperature.toFixed(1) }))
      }
      return parts.join(' · ') || '--'
    },
    worldCycleTitle(world) {
      return this.worldType(world) === 'cave'
        ? this.$t('servers.workspace.worlds.nightmare')
        : this.$t('servers.workspace.worlds.moon')
    },
    worldCycleLabel(world) {
      const snapshot = this.worldStateFor(world)
      if (!snapshot) return '--'
      if (this.worldType(world) === 'cave') {
        return this.protocolLabel('nightmare', snapshot.nightmarePhase)
      }
      return this.protocolLabel('moon', snapshot.moonPhase)
    },
    worldObservedAt(world) {
      const snapshot = this.worldStateFor(world)
      const candidates = [snapshot ? snapshot.observedAt : world.stateObservedAt]
      return candidates.find(value => {
        const observedAt = new Date(value)
        return Number.isFinite(observedAt.getTime()) && observedAt.getUTCFullYear() > 2000
      }) || ''
    },
    worldStateAgeSeconds(world) {
      const snapshot = this.worldStateFor(world)
      return this.worldObservedAt(world) === snapshot?.observedAt
        ? snapshot.ageSeconds ?? null
        : world.stateAgeSeconds ?? null
    },
    worldRuntimeDiagnostic(world) {
      const snapshot = this.worldStateFor(world)
      if (!snapshot) return null
      if (snapshot.observationState === 'pending') {
        return {
          tone: 'deferred',
          message: this.$t('servers.workspace.worlds.observationPending')
        }
      }
      if (snapshot.observationState === 'deferred' || snapshot.observationCode === 'ROOM_OPERATION_IN_PROGRESS') {
        return {
          tone: 'deferred',
          message: this.$t('servers.workspace.worlds.observationDeferred')
        }
      }
      if (snapshot.freshness === 'live') return null
      if (snapshot.runtimeMessage && (snapshot.runtimeCode || ['failed', 'unknown'].includes(snapshot.runtimeState))) {
        return {
          tone: 'failed',
          message: this.$t('servers.workspace.worlds.runtimeDiagnostic', { message: snapshot.runtimeMessage })
        }
      }
      if (snapshot.observationError) {
        return {
          tone: 'failed',
          message: this.$t('servers.workspace.worlds.observationDiagnostic', { message: snapshot.observationError })
        }
      }
      return null
    },
    protocolLabel(group, value) {
      if (value === null || value === undefined || value === '') return '--'
      return translateWorldStateValue(
        key => this.$t(key),
        key => this.$te(key),
        group,
        value
      )
    },
    progressValue(value) {
      if (!Number.isFinite(value)) return null
      return Math.round(Math.max(0, Math.min(1, value)) * 100)
    },
    playerPresence(player) {
      return playerPresenceMeta(player, this.$t)
    },
    playerIsOnline(player) {
      return isPlayerOnline(player?.status)
    },
    playerContextLabel(player) {
      const status = normalizePlayerStatus(player?.status)
      const character = playerCharacterDisplayLabel(player, this.$t)
      const parameters = {
        character,
        world: player?.world_name || this.$t('servers.workspace.players.unknownWorld')
      }
      if (!playerWorldConfirmed(player)) return this.$t('servers.workspace.players.worldUnconfirmed', parameters)
      if (player?.field_states?.world?.source === 'native-log') return this.$t('servers.workspace.players.lastConnectedWorld', parameters)
      if (player?.field_states?.world?.status === 'stale') return this.$t('servers.workspace.players.lastKnownWorld', parameters)
      if (status === 'online') return this.$t('servers.workspace.players.currentWorld', parameters)
      if (status === 'stale') return this.$t('servers.workspace.players.lastKnownWorld', parameters)
      return this.$t('servers.workspace.players.lastWorld', parameters)
    },
    playerNetworkAvailable(player) {
      return !this.playerSnapshotStale && isLivePlayerMetric(player, 'netScore', player?.net_score)
    },
    playerObservationLabel(player) {
      const observation = playerLastObservation(player)
      return this.$t(`servers.workspace.players.${observation.key}`, { time: this.formatCompactTime(observation.time) })
    },
    playerVitals(player) {
      const localeState = this.$i18n?.locale
      const locale = typeof localeState === 'string' ? localeState : (localeState?.value || 'zh-CN')
      const fieldStateTime = field => player?.field_states?.[field]?.observedAt
        || player?.field_states?.[field]?.observed_at
        || null
      const vitals = [
        { key: 'health', field: 'health', maxField: 'healthMax', percentField: 'healthPercent', current: player?.health, maximum: player?.health_max, percentage: player?.health_percent, icon: HeartPulse },
        { key: 'hunger', field: 'hunger', maxField: 'hungerMax', percentField: 'hungerPercent', current: player?.hunger, maximum: player?.hunger_max, percentage: player?.hunger_percent, icon: Utensils },
        { key: 'sanity', field: 'sanity', maxField: 'sanityMax', percentField: 'sanityPercent', current: player?.sanity, maximum: player?.sanity_max, percentage: player?.sanity_percent, icon: Brain }
      ].map(metric => {
        const absoluteKnown = isKnownPlayerMetric(player, metric.field, metric.current)
          && isKnownPlayerMetric(player, metric.maxField, metric.maximum)
        const fallbackKnown = isKnownPlayerMetric(player, metric.percentField, metric.percentage)
        if (!absoluteKnown && !fallbackKnown) return null
        const observedFields = absoluteKnown ? [metric.field, metric.maxField] : [metric.percentField]
        return {
          key: metric.key,
          icon: metric.icon,
          label: this.$t(`servers.workspace.players.metrics.${metric.key}`),
          value: formatPlayerVital(metric.current, metric.maximum, metric.percentage, locale),
          live: !this.playerSnapshotStale && (absoluteKnown
            ? isLivePlayerMetric(player, metric.field, metric.current) && isLivePlayerMetric(player, metric.maxField, metric.maximum)
            : isLivePlayerMetric(player, metric.percentField, metric.percentage)),
          observedAt: observedFields.map(fieldStateTime).find(Boolean) || null
        }
      }).filter(Boolean)
      if (isKnownPlayerMetric(player, 'moisture', player?.moisture)) {
        vitals.push({
          key: 'moisture',
          icon: Droplets,
          label: this.$t('servers.workspace.players.metrics.moisture'),
          value: formatPlayerPercentage(player.moisture),
          live: !this.playerSnapshotStale && isLivePlayerMetric(player, 'moisture', player.moisture),
          observedAt: fieldStateTime('moisture')
        })
      }
      if (isKnownPlayerMetric(player, 'temperature', player?.temperature)) {
        vitals.push({
          key: 'temperature',
          icon: Thermometer,
          label: this.$t('servers.workspace.players.metrics.temperature'),
          value: formatPlayerTemperature(player.temperature, locale),
          live: !this.playerSnapshotStale && isLivePlayerMetric(player, 'temperature', player.temperature),
          observedAt: fieldStateTime('temperature')
        })
      }
      return vitals
    },
    playerVitalsAreLive(player, metrics) {
      return this.playerIsOnline(player) && metrics.every(metric => metric.live)
    },
    playerVitalsObservedAt(metrics) {
      return metrics.reduce((latest, metric) => {
        if (!metric.observedAt) return latest
        const timestamp = new Date(metric.observedAt).getTime()
        if (!Number.isFinite(timestamp)) return latest
        return !latest || timestamp > latest.timestamp
          ? { value: metric.observedAt, timestamp }
          : latest
      }, null)?.value || null
    },
    playerVitalsLabel(player, metrics) {
      if (this.playerVitalsAreLive(player, metrics)) {
        return this.$t('servers.workspace.players.liveMetrics')
      }
      const observedAt = this.playerVitalsObservedAt(metrics)
      if (!observedAt) {
        return this.$t('servers.workspace.players.sampledMetrics')
      }
      return this.$t('servers.workspace.players.sampledMetricsAt', {
        time: this.formatCompactTime(observedAt)
      })
    },
    playerMetricLabel(metric) {
      if (metric.live) return this.$t('servers.workspace.players.metricValue', metric)
      if (!metric.observedAt) {
        return this.$t('servers.workspace.players.historicalMetricValue', metric)
      }
      return this.$t('servers.workspace.players.historicalMetricValueAt', {
        ...metric,
        time: this.formatCompactTime(metric.observedAt)
      })
    },
    errorState(key, error) {
      return { key, detail: String(error?.message || '').trim() }
    },
    localizedError(state) {
      if (!state) return ''
      const message = this.$t(state.key)
      return state.detail
        ? this.$t('servers.workspace.feedback.errorWithDetail', { message, detail: state.detail })
        : message
    },
    metricValue(value) {
      return value === null || value === undefined || value === '' ? '--' : value
    },
    formatCompactTime(value) {
      if (!playerHistoryTime(value)) return '--'
      const date = new Date(value)
      if (!Number.isFinite(date.getTime())) return String(value)
      const localeState = this.$i18n?.locale
      const locale = typeof localeState === 'string' ? localeState : (localeState?.value || 'zh-CN')
      const dayOptions = { locale, year: 'numeric', month: '2-digit', day: '2-digit' }
      if (formatSystemDateTime(date, dayOptions) === formatSystemDateTime(new Date(), dayOptions)) {
        return formatSystemDateTime(date, { locale, hour: '2-digit', minute: '2-digit' })
      }
      return formatSystemDateTime(date, { locale, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    },
    formatBackupTime(value) {
      if (!value) return '--'
      const date = new Date(value)
      if (!Number.isFinite(date.getTime())) return String(value)
      const localeState = this.$i18n?.locale
      const locale = typeof localeState === 'string' ? localeState : (localeState?.value || 'zh-CN')
      return formatSystemDateTime(date, {
        locale,
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
}
</script>

<style scoped>
.workspace-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.workspace-header,
.workspace-title-row,
.workspace-toolbar,
.world-main,
.world-name-row,
.console-toolbar,
.console-footer {
  display: flex;
  align-items: center;
}

.workspace-header {
  justify-content: space-between;
  gap: 20px;
}

.workspace-heading {
  min-width: 0;
}

.workspace-kicker {
  display: block;
  margin-bottom: 3px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.workspace-title-row {
  gap: 10px;
}

.workspace-title {
  margin: 0;
  color: var(--foreground);
  font-size: 24px;
  line-height: 32px;
  font-weight: 600;
  letter-spacing: 0;
}

.workspace-heading p {
  margin: 3px 0 0;
  color: var(--muted-foreground);
  line-height: 20px;
}

.workspace-overview,
.status-summary,
.status-metric,
.world-card-heading {
  display: flex;
  align-items: baseline;
}

.workspace-overview {
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin-top: 3px;
  overflow: hidden;
}

.workspace-room-summary {
  flex: 0 0 auto;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 20px;
}

.workspace-directory {
  max-width: 160px;
  font-family: var(--font-mono);
}

.overview-separator {
  height: 14px;
  align-self: center;
}

.workspace-toolbar {
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.room-select {
  width: 220px;
}

.workspace-alert {
  margin: 0;
}

.status-summary {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  overflow-x: auto;
  scrollbar-width: none;
  white-space: nowrap;
}

.status-summary::-webkit-scrollbar {
  display: none;
}

.status-metric {
  flex: 0 0 auto;
  gap: 5px;
  padding: 0 10px;
}

.status-metric:first-child {
  padding-left: 0;
}

.status-label {
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 20px;
}

.status-value {
  color: var(--foreground);
  font-size: 13px;
  line-height: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.status-value span {
  margin-left: 2px;
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 400;
}

.status-separator {
  height: 12px;
  align-self: center;
}

.world-card-heading {
  min-width: 0;
}

.world-identity > .world-machine {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
}

.world-machine svg {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}

.world-card-header {
  padding-block: 10px;
}

.world-card-content {
  padding-top: 0;
  padding-bottom: 0;
}

.world-grid {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
}

.world-item {
  position: relative;
  display: grid;
  grid-template-columns: minmax(180px, 240px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 8px 0;
  cursor: pointer;
  background: transparent;
  border-bottom: 1px solid var(--border);
  transition: background-color 180ms ease;
}

.world-item:hover,
.world-item:focus-visible {
  background: var(--muted);
  outline: none;
}

.world-item.selected {
  background: var(--accent);
}

.world-item:last-child {
  border-bottom: 0;
}

.world-item.running::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -20px;
  width: 3px;
  content: '';
  background: var(--success-color);
}

.world-main {
  gap: 10px;
  min-width: 0;
}

.world-symbol {
  display: grid;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 4px;
  background: var(--muted);
}

.world-symbol.forest {
  color: var(--foreground);
}

.world-symbol.cave {
  color: var(--muted-foreground);
}

.world-symbol.custom {
  color: var(--muted-foreground);
}

.world-symbol svg {
  width: 19px;
  height: 19px;
  stroke-width: 1.8;
}

.world-legend-popover {
  width: 320px;
}

.world-connection-popover {
  width: 380px;
}

.connection-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.connection-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.connection-lan-select {
  width: 100%;
}

.connection-port-addon {
  color: var(--foreground);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.connection-details,
.connection-ports,
.connection-port-list {
  display: flex;
  flex-direction: column;
}

.connection-details {
  gap: 6px;
}

.connection-value-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  background: var(--muted);
  border-radius: var(--radius-sm);
}

.connection-value-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.connection-value-copy > span,
.connection-source-hint,
.connection-password-hint,
.connection-ports h4 {
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 16px;
}

.connection-value-copy strong,
.connection-value-copy code {
  color: var(--foreground);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  overflow-wrap: anywhere;
}

.connection-value-copy code {
  font-family: var(--font-mono);
  font-weight: 500;
}

.connection-source-hint,
.connection-password-hint,
.connection-ports h4 {
  margin: 0;
}

.connection-ports,
.connection-port-list {
  gap: 6px;
}

.connection-port-row,
.connection-port-row > span:last-child {
  display: flex;
  align-items: center;
}

.connection-port-row {
  min-height: 24px;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
}

.connection-port-row > span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.connection-port-row > span:last-child {
  flex: 0 0 auto;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}

.world-legend-group {
  display: grid;
  gap: 8px;
}

.world-legend-group h4 {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 11px;
  font-weight: 500;
}

.world-legend-items {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
}

.world-legend-item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  font-size: 12px;
}

.world-legend-item > span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.world-legend-icon {
  display: grid;
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  place-items: center;
  color: var(--muted-foreground);
  background: var(--muted);
  border-radius: 4px;
}

.world-legend-icon.forest {
  color: var(--foreground);
}

.world-legend-icon.custom {
  color: var(--muted-foreground);
}

.world-legend-icon svg {
  width: 16px;
  height: 16px;
  stroke-width: 1.8;
}

.world-identity {
  flex: 1;
  min-width: 0;
}

.world-name-row {
  justify-content: flex-start;
  gap: 8px;
}

.world-name-row strong {
  min-width: 0;
  overflow: hidden;
  color: var(--foreground);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.world-identity > span {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: var(--muted-foreground);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.world-identity > .world-status-message {
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  overflow-wrap: anywhere;
}

.world-identity > .world-failure {
  color: var(--destructive);
}

.world-identity > .world-runtime-diagnostic {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  overflow: visible;
  color: var(--destructive);
  text-overflow: clip;
  white-space: normal;
  overflow-wrap: anywhere;
}

.world-identity > .world-runtime-diagnostic.is-deferred {
  color: var(--warning-foreground);
}

.world-identity > .world-runtime-diagnostic.is-refreshing {
  color: var(--primary);
}

.world-runtime-diagnostic svg {
  width: 13px;
  height: 13px;
  flex: 0 0 auto;
  margin-top: 1px;
}

.world-facts {
  display: grid;
  grid-template-columns:
    minmax(70px, 0.7fr)
    minmax(76px, 0.75fr)
    minmax(86px, 0.9fr)
    minmax(86px, 0.9fr)
    minmax(130px, 1.35fr)
    minmax(86px, 0.9fr)
    minmax(120px, 1.2fr);
  gap: 8px;
  margin: 0;
  padding-left: 14px;
  border-left: 1px solid var(--border);
}

.world-facts div {
  min-width: 0;
}

.world-facts dt {
  color: var(--muted-foreground);
  font-size: 11px;
}

.world-facts dd {
  margin: 2px 0 0;
  overflow: hidden;
  color: var(--foreground);
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.world-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  padding: 0;
}

.rollback-field-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rollback-current,
.rollback-range {
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

.rollback-current {
  font-size: 13px;
}

.rollback-control-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  align-items: start;
  gap: 14px;
}

.rollback-slider-column {
  display: grid;
  gap: 7px;
  padding-top: 16px;
}

.rollback-range {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.rollback-number-input {
  width: 132px;
}

.operation-content {
  padding-top: 12px;
}

.operation-tabs-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: 32px;
  height: auto;
  width: 100%;
  overflow: hidden;
}

.operation-tabs-list :deep([data-slot='tabs-trigger']) {
  min-width: 0;
}

.players-panel {
  min-height: 220px;
  padding-top: 12px;
}

.players-list-expanded {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.players-empty {
  min-height: 180px;
  border: 0;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.workspace-log {
  height: 470px;
}

.console-panel {
  min-height: 440px;
}

.console-toolbar {
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.console-select {
  width: min(320px, 100%);
}

.panel-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.context-error {
  margin-bottom: 10px;
}

.button-tail-icon {
  margin-left: 5px;
}

.console-footer {
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.console-footer span {
  overflow: hidden;
  color: var(--muted-foreground);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.players-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
  margin-bottom: 3px;
}

.players-panel-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.players-panel-heading h2 {
  margin: 0;
  color: var(--foreground);
  font-size: 13px;
  line-height: 20px;
  font-weight: 600;
  letter-spacing: 0;
}

.players-panel-heading span {
  overflow: hidden;
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.players-panel-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}

.players-panel-action {
  margin-right: -6px;
}

.player-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  height: auto;
  width: 100%;
  min-height: 72px;
  padding: 10px 12px;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.player-avatar-action {
  position: relative;
  padding: 0;
  border-radius: 999px;
}

.player-avatar-state {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: grid;
  width: 17px;
  height: 17px;
  place-items: center;
  color: var(--destructive-foreground);
  background: var(--destructive);
  border: 2px solid var(--background);
  border-radius: 999px;
}

.player-avatar-state.is-pending {
  color: var(--foreground);
  background: var(--background);
}

.player-avatar-state > svg {
  width: 10px;
  height: 10px;
}

.player-copy {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) auto;
  gap: 4px 16px;
  min-width: 0;
  padding-top: 1px;
}

.player-heading-line {
  display: flex;
  grid-column: 1 / -1;
  flex-wrap: wrap;
  min-width: 0;
  min-height: 20px;
  align-items: center;
  gap: 6px;
}

.player-heading-line > strong,
.player-context,
.player-observation {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-heading-line > strong {
  min-width: 0;
  max-width: min(100%, 20rem);
  color: var(--foreground);
  font-size: 13px;
}

.player-context-line {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
}

.player-context-line .player-context {
  min-width: 0;
}

.player-context,
.player-observation {
  color: var(--foreground);
  font-size: 12px;
  opacity: 0.72;
}

.player-vitals {
  display: flex;
  align-items: center;
  min-width: 0;
  flex-wrap: wrap;
  gap: 3px 6px;
  margin-top: 1px;
}

.player-vitals-state {
  flex: 0 0 auto;
  white-space: nowrap;
}

.player-row-actions {
  display: flex;
  min-height: 32px;
  flex: none;
  align-items: center;
  gap: 4px;
}

.player-metric {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--foreground);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.player-metric > svg {
  width: 13px;
  height: 13px;
  color: var(--muted-foreground);
}

.player-metric:focus-visible {
  border-radius: var(--radius-sm);
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.player-observation {
  margin-top: 1px;
}

@media (max-width: 900px) {
  .player-copy {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 1100px) {
  .connection-trigger-endpoint {
    display: none;
  }

  .world-item {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .world-facts {
    grid-column: 1 / -1;
    grid-row: 2;
    padding-left: 46px;
    border-left: 0;
  }

  .world-actions {
    grid-column: 2;
    grid-row: 1;
  }

}

@media (max-width: 768px) {
  .workspace-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .workspace-heading,
  .workspace-overview {
    width: 100%;
  }

  .workspace-toolbar {
    width: 100%;
    justify-content: flex-start;
  }

  .room-select {
    flex: 1 1 180px;
    width: auto;
  }

  .world-card-heading {
    grid-column: 1 / -1;
  }

  .world-card-actions {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-self: stretch;
    width: 100%;
    margin-top: 4px;
  }

  .world-card-actions :deep([data-slot='button']) {
    flex: 1 1 auto;
  }

  .world-item {
    grid-template-columns: minmax(0, 1fr);
  }

  .world-facts {
    grid-column: auto;
    grid-row: auto;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 2px 0;
    padding-left: 46px;
  }

  .world-actions {
    grid-column: auto;
    grid-row: auto;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }

  .workspace-log {
    height: 520px;
  }

  .console-select {
    flex: 1 1 100%;
    width: 100%;
  }

  .players-list-expanded {
    grid-template-columns: minmax(0, 1fr);
  }

}

@media (max-width: 520px) {
  .rollback-control-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }

  .rollback-number-input {
    width: 100%;
  }

  .operation-tabs-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .world-facts {
    padding-left: 0;
  }

  .player-row {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .player-row-actions {
    grid-column: 2;
    justify-content: flex-end;
  }

}

@media (prefers-reduced-motion: reduce) {
  .world-item {
    transition: none;
  }
}
</style>

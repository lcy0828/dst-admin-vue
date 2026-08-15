<template>
  <div class="player-list-page">
    <div class="page-header">
      <div class="title-container"><h1>{{ $t('players.list.title') }}</h1><p>{{ $t('players.list.subtitle') }}</p></div>
      <div class="action-buttons">
        <UiButton size="sm" variant="outline" @click="refreshPlayerData" :disabled="loading || refreshing"><Spinner v-if="refreshing" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ $t('players.actions.refresh') }}</UiButton>
        <UiButton size="sm" variant="outline" @click="showUpdateDialog"><Upload data-icon="inline-start" />{{ $t('players.actions.manualUpdate') }}</UiButton>
        <UiButton size="sm" variant="outline" @click="showSessionSelect"><Globe2 data-icon="inline-start" />{{ $t('players.actions.defaultTaskWorld') }}</UiButton>
        <UiButton size="sm" @click="showScheduleDialog"><Clock3 data-icon="inline-start" />{{ $t('players.actions.addSchedule') }}</UiButton>
        <Badge v-if="activeSessionName">{{ $t('players.list.taskWorld', { world: activeSessionLabel }) }}</Badge>
      </div>
    </div>

    <Card class="filter-card">
      <CardHeader><div><CardTitle>{{ $t('players.list.filterTitle') }}</CardTitle><CardDescription>{{ $t('players.list.filterDescription') }}</CardDescription></div></CardHeader>
      <CardContent>
        <FieldGroup class="filter-form">
          <Field>
            <FieldLabel for="player-archive-filter">{{ $t('players.fields.archive') }}</FieldLabel>
            <NativeSelect id="player-archive-filter" v-model="filterForm.archive_name" @change="handleFilter">
              <NativeSelectOption value="">{{ $t('players.list.allArchives') }}</NativeSelectOption>
              <NativeSelectOption v-for="archive in archiveOptions" :key="archive.value" :value="archive.value">{{ archive.label }}</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel for="player-status-filter">{{ $t('players.fields.status') }}</FieldLabel>
            <NativeSelect id="player-status-filter" v-model="filterForm.status" @change="handleFilter">
              <NativeSelectOption value="">{{ $t('players.list.allStatuses') }}</NativeSelectOption><NativeSelectOption value="online">{{ $t('players.statuses.online') }}</NativeSelectOption><NativeSelectOption value="offline">{{ $t('players.statuses.offline') }}</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel for="player-character-filter">{{ $t('players.fields.character') }}</FieldLabel>
            <NativeSelect id="player-character-filter" v-model="filterForm.prefab" @change="handleFilter">
              <NativeSelectOption value="">{{ $t('players.list.allCharacters') }}</NativeSelectOption>
              <NativeSelectOption v-for="character in characterOptions" :key="character.value" :value="character.value">{{ character.label }}</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel for="player-keyword-filter">{{ $t('players.fields.keyword') }}</FieldLabel>
            <InputGroup><InputGroupAddon><Search /></InputGroupAddon><InputGroupInput id="player-keyword-filter" v-model="filterForm.keyword" :placeholder="$t('players.list.searchPlaceholder')" @keyup.enter="handleFilter" /></InputGroup>
          </Field>
          <div class="filter-actions"><UiButton @click="handleFilter"><Search data-icon="inline-start" />{{ $t('players.actions.search') }}</UiButton><UiButton variant="outline" @click="resetFilter">{{ $t('players.actions.reset') }}</UiButton></div>
        </FieldGroup>
      </CardContent>
    </Card>

    <RuntimeStatusPanel />

    <Card class="table-card">
      <CardHeader class="table-operations">
        <div><CardTitle>{{ $t('players.list.title') }}</CardTitle><CardDescription>{{ $t('players.list.total', { count: pagination.total }) }}</CardDescription></div>
        <CardAction><UiButton size="sm" @click="exportPlayerData" :disabled="loading || Boolean(loadError)"><Download data-icon="inline-start" />{{ $t('players.actions.export') }}</UiButton></CardAction>
      </CardHeader>
      <CardContent>
        <Alert v-if="loadError" variant="destructive" class="mb-4">
          <TriangleAlert />
          <AlertTitle>{{ $t('players.list.loadFailedTitle') }}</AlertTitle>
          <AlertDescription>{{ loadErrorText }}</AlertDescription>
          <AlertAction><UiButton size="sm" variant="outline" :disabled="loading" @click="fetchPlayerList">{{ $t('players.actions.retry') }}</UiButton></AlertAction>
        </Alert>
        <Alert v-else-if="partialFailures.length > 0" class="mb-4">
          <TriangleAlert />
          <AlertTitle>{{ $t('players.list.partialTitle') }}</AlertTitle>
          <AlertDescription>{{ partialFailureText }}</AlertDescription>
          <AlertAction><UiButton size="sm" variant="outline" :disabled="loading" @click="fetchPlayerList">{{ $t('players.actions.retry') }}</UiButton></AlertAction>
        </Alert>
        <div v-if="loading" class="loading-state"><Spinner /><span>{{ $t('players.list.loading') }}</span></div>
        <div v-else-if="!loadError && playerList.length > 0" class="table-wrap">
          <UiTable>
            <TableHeader>
              <TableRow>
                <TableHead><SortButton label="ID" field="id" :active-field="sortParams.prop" :order="sortParams.order" @sort="toggleSort" /></TableHead>
                <TableHead><SortButton :label="$t('players.fields.roomAndWorld')" field="archive_name" :active-field="sortParams.prop" :order="sortParams.order" @sort="toggleSort" /></TableHead>
                <TableHead>{{ $t('players.fields.playerName') }}</TableHead>
                <TableHead>KU ID</TableHead>
                <TableHead>{{ $t('players.fields.character') }}</TableHead>
                <TableHead><SortButton :label="$t('players.fields.days')" field="player_age" :active-field="sortParams.prop" :order="sortParams.order" @sort="toggleSort" /></TableHead>
                <TableHead><SortButton :label="$t('players.fields.status')" field="status" :active-field="sortParams.prop" :order="sortParams.order" @sort="toggleSort" /></TableHead>
                <TableHead>{{ $t('players.fields.network') }}</TableHead>
                <TableHead>Steam ID</TableHead>
                <TableHead><SortButton :label="$t('players.fields.firstSeen')" field="first_seen" :active-field="sortParams.prop" :order="sortParams.order" @sort="toggleSort" /></TableHead>
                <TableHead><SortButton :label="$t('players.fields.lastSeen')" field="last_seen" :active-field="sortParams.prop" :order="sortParams.order" @sort="toggleSort" /></TableHead>
                <TableHead class="action-column">{{ $t('players.fields.action') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="player in playerList" :key="`${player.room_id}:${player.id}`">
                <TableCell>{{ player.id }}</TableCell>
                <TableCell>
                  <div class="flex min-w-36 flex-col gap-1">
                    <span>{{ player.archive_name }}</span>
                    <div class="flex flex-wrap items-center gap-1">
                      <span class="text-xs text-muted-foreground">{{ player.world_name || $t('players.values.unknownWorld') }}</span>
                      <TooltipProvider v-if="player.presence_conflict">
                        <Tooltip>
                          <TooltipTrigger as-child>
                            <Badge variant="destructive"><TriangleAlert />{{ $t('players.list.presenceConflict') }}</Badge>
                          </TooltipTrigger>
                          <TooltipContent>{{ $t('players.list.presenceConflictDescription', { worlds: player.observed_world_ids.join(', ') }) }}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="player-name-cell"><span class="truncate">{{ player.player_name }}</span><Crown v-if="player.is_admin" :title="$t('players.list.administrator')" /><UserRoundCheck v-if="player.is_friend" :title="$t('players.list.friend')" /></div>
                </TableCell>
                <TableCell class="mono-cell">{{ player.user_id }}</TableCell>
                <TableCell><Badge variant="outline">{{ getCharacterName(player.prefab) }}</Badge></TableCell>
                <TableCell>{{ player.player_age }}</TableCell>
                <TableCell><div class="flex min-w-28 flex-col gap-1"><Badge :variant="getPlayerStatusMeta(player.status).variant">{{ getPlayerStatusMeta(player.status).label }}</Badge><span class="text-xs text-muted-foreground">{{ formatDate(player.last_refreshed_at) }}</span></div></TableCell>
                <TableCell><Badge v-if="isPlayerOnline(player.status)" :variant="getNetworkBadgeVariant(player.net_score)">{{ getNetworkQuality(player.net_score) }}</Badge><span v-else>-</span></TableCell>
                <TableCell>
                  <div class="steam-actions"><UiButton variant="ghost" size="sm" @click="copySteamID(player.net_id)">{{ formatSteamID(player.net_id) }}</UiButton><UiButton variant="ghost" size="icon-xs" :title="$t('players.actions.viewOnSteam')" :aria-label="$t('players.actions.viewPlayerOnSteam')" @click="openSteamProfile(player.net_id)"><ExternalLink /></UiButton></div>
                </TableCell>
                <TableCell>{{ formatDate(player.first_seen) }}</TableCell>
                <TableCell>{{ formatDate(player.last_seen) }}</TableCell>
                <TableCell class="action-column">
                  <div class="row-actions">
                    <UiButton variant="ghost" size="sm" @click="viewPlayerDetail(player)">{{ $t('players.actions.details') }}</UiButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child><UiButton variant="ghost" size="icon-sm" :aria-label="$t('players.actions.openPlayerMenu')" :title="$t('players.actions.playerActions')"><MoreHorizontal /></UiButton></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem :disabled="!isPlayerOnline(player.status)" @select="toggleGodMode(player)">{{ $t('players.operations.godMode') }}</DropdownMenuItem>
                          <DropdownMenuItem :disabled="!isPlayerOnline(player.status)" @select="toggleCreativeMode(player)">{{ $t('players.operations.creativeMode') }}</DropdownMenuItem>
                          <DropdownMenuItem :disabled="!isPlayerOnline(player.status)" @select="resurrectPlayer(player)">{{ $t('players.operations.resurrect') }}</DropdownMenuItem>
                          <DropdownMenuItem :disabled="!isPlayerOnline(player.status)" @select="changeCharacter(player)">{{ $t('players.operations.changeCharacter') }}</DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem variant="destructive" :disabled="!isPlayerOnline(player.status)" @select="kickPlayer(player)">{{ $t('players.operations.kick') }}</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" @select="banPlayer(player)">{{ $t('players.operations.ban') }}</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" :disabled="!isPlayerOnline(player.status)" @select="killPlayer(player)">{{ $t('players.operations.kill') }}</DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </UiTable>
        </div>
        <Empty v-else-if="!loadError"><EmptyHeader><EmptyMedia variant="icon"><Users /></EmptyMedia><EmptyTitle>{{ $t('players.list.emptyTitle') }}</EmptyTitle><EmptyDescription>{{ $t('players.list.emptyDescription') }}</EmptyDescription></EmptyHeader></Empty>

      </CardContent>
      <CardFooter v-if="!loading && !loadError && pagination.total > 0" class="pagination-bar">
        <div class="page-size-control">
          <span>{{ $t('players.list.perPage') }}</span>
          <NativeSelect id="player-page-size" :aria-label="$t('players.list.perPageAria')" :model-value="String(pagination.page_size)" @update:model-value="value => handleSizeChange(Number(value))">
            <NativeSelectOption value="10">10</NativeSelectOption><NativeSelectOption value="20">20</NativeSelectOption><NativeSelectOption value="50">50</NativeSelectOption><NativeSelectOption value="100">100</NativeSelectOption>
          </NativeSelect>
        </div>
        <Pagination :page="pagination.page" :total="pagination.total" :items-per-page="pagination.page_size" show-edges @update:page="handleCurrentChange">
          <PaginationContent v-slot="{ items }">
            <PaginationPrevious />
            <template v-for="(item, index) in items" :key="index">
              <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === pagination.page">{{ item.value }}</PaginationItem>
              <PaginationEllipsis v-else :index="index" />
            </template>
            <PaginationNext />
          </PaginationContent>
        </Pagination>
      </CardFooter>
    </Card>

    <Sheet v-model:open="playerDetailVisible">
      <SheetContent side="right" class="player-detail-sheet">
        <SheetHeader><SheetTitle>{{ $t('players.detail.title') }}</SheetTitle><SheetDescription>{{ $t('players.detail.description') }}</SheetDescription></SheetHeader>
        <ScrollArea class="player-detail-scroll">
          <div v-if="currentPlayer" class="player-detail">
            <div class="player-detail-heading">
              <Avatar size="lg"><AvatarFallback>{{ getPlayerInitials(currentPlayer) }}</AvatarFallback></Avatar>
              <div><div class="detail-player-name"><strong>{{ currentPlayer.player_name || currentPlayer.user_id }}</strong><Badge :variant="getPlayerStatusMeta(currentPlayer.status).variant">{{ getPlayerStatusMeta(currentPlayer.status).label }}</Badge></div><span>{{ getCharacterName(currentPlayer.prefab) }} · {{ currentPlayer.archive_name }} / {{ currentPlayer.world_name || $t('players.values.unknownWorld') }}</span></div>
            </div>
            <Alert v-if="currentPlayer.presence_conflict" variant="destructive">
              <TriangleAlert />
              <AlertTitle>{{ $t('players.detail.presenceConflictTitle') }}</AlertTitle>
              <AlertDescription>{{ $t('players.detail.presenceConflictDescription', { worlds: currentPlayer.observed_world_ids.join(', ') }) }}</AlertDescription>
            </Alert>
            <dl class="player-description-grid">
              <div><dt>{{ $t('players.fields.playerId') }}</dt><dd>{{ currentPlayer.id }}</dd></div><div><dt>KU ID</dt><dd>{{ currentPlayer.user_id }}</dd></div>
              <div><dt>{{ $t('players.fields.playerName') }}</dt><dd>{{ currentPlayer.player_name }}</dd></div><div><dt>{{ $t('players.fields.archive') }}</dt><dd>{{ currentPlayer.archive_name }}</dd></div>
              <div><dt>{{ $t('players.fields.character') }}</dt><dd>{{ getCharacterName(currentPlayer.prefab) }}</dd></div><div><dt>{{ $t('players.fields.days') }}</dt><dd>{{ currentPlayer.player_age }}</dd></div>
              <div><dt>{{ $t('players.fields.statusChanged') }}</dt><dd>{{ formatDate(currentPlayer.status_change) }}</dd></div><div><dt>Steam ID</dt><dd><UiButton variant="link" size="sm" @click="copySteamID(currentPlayer.net_id)">{{ currentPlayer.net_id }}</UiButton></dd></div>
              <div><dt>{{ $t('players.fields.network') }}</dt><dd>{{ isPlayerOnline(currentPlayer.status) ? getNetworkQuality(currentPlayer.net_score) : '-' }}</dd></div>
              <div><dt>{{ $t('players.fields.firstSeen') }}</dt><dd>{{ formatDate(currentPlayer.first_seen) }}</dd></div><div><dt>{{ $t('players.fields.lastSeen') }}</dt><dd>{{ formatDate(currentPlayer.last_seen) }}</dd></div>
              <div><dt>{{ $t('players.fields.createdAt') }}</dt><dd>{{ formatDate(currentPlayer.created_at) }}</dd></div><div><dt>{{ $t('players.fields.lastRefreshed') }}</dt><dd>{{ formatDate(currentPlayer.last_refreshed_at) }}</dd></div>
            </dl>
            <Separator />
            <section><h3>{{ $t('players.detail.gameActions') }}</h3><div class="detail-action-grid">
              <UiButton size="sm" variant="outline" :disabled="!isPlayerOnline(currentPlayer.status)" @click="toggleGodMode(currentPlayer)">{{ $t('players.operations.godMode') }}</UiButton><UiButton size="sm" variant="outline" :disabled="!isPlayerOnline(currentPlayer.status)" @click="toggleCreativeMode(currentPlayer)">{{ $t('players.operations.creativeMode') }}</UiButton><UiButton size="sm" variant="outline" :disabled="!isPlayerOnline(currentPlayer.status)" @click="resurrectPlayer(currentPlayer)">{{ $t('players.operations.resurrect') }}</UiButton><UiButton size="sm" variant="outline" :disabled="!isPlayerOnline(currentPlayer.status)" @click="changeCharacter(currentPlayer)">{{ $t('players.operations.changeCharacter') }}</UiButton>
            </div></section>
            <section><h3>{{ $t('players.detail.dangerousActions') }}</h3><div class="detail-action-grid">
              <UiButton variant="destructive" size="sm" :disabled="!isPlayerOnline(currentPlayer.status)" @click="kickPlayer(currentPlayer)">{{ $t('players.operations.kickShort') }}</UiButton><UiButton variant="destructive" size="sm" @click="banPlayer(currentPlayer)">{{ $t('players.operations.banShort') }}</UiButton><UiButton variant="destructive" size="sm" :disabled="!isPlayerOnline(currentPlayer.status)" @click="killPlayer(currentPlayer)">{{ $t('players.operations.killShort') }}</UiButton>
            </div></section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>

    <UiDialog v-model:open="banDialogVisible">
      <DialogContent><DialogHeader><DialogTitle>{{ $t('players.dialogs.ban.title') }}</DialogTitle><DialogDescription>{{ currentPlayer?.player_name || '' }}</DialogDescription></DialogHeader>
        <FieldGroup><Field :data-invalid="Boolean(banFormError)"><FieldLabel for="ban-reason">{{ $t('players.fields.banReason') }}</FieldLabel><UiTextarea id="ban-reason" v-model="banForm.reason" rows="3" :placeholder="$t('players.dialogs.ban.reasonPlaceholder')" :aria-invalid="Boolean(banFormError)" /><FieldError v-if="banFormError">{{ banFormErrorText }}</FieldError></Field>
          <Field><FieldLabel for="ban-duration">{{ $t('players.fields.banDuration') }}</FieldLabel><UiSelect v-model="banForm.duration"><SelectTrigger id="ban-duration"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="duration in banDurations" :key="duration.value" :value="duration.value">{{ duration.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field :data-invalid="Boolean(banConfirmationError)"><FieldLabel for="ban-confirmation">{{ $t('players.fields.fullRoomName') }}</FieldLabel><UiInput id="ban-confirmation" v-model="banForm.confirmation" :placeholder="currentPlayer?.archive_name ? $t('players.dialogs.ban.roomPlaceholderNamed', { room: currentPlayer.archive_name }) : $t('players.dialogs.ban.roomPlaceholder')" :aria-invalid="Boolean(banConfirmationError)" /><FieldDescription>{{ $t('players.dialogs.ban.description') }}</FieldDescription><FieldError v-if="banConfirmationError">{{ banConfirmationErrorText }}</FieldError></Field></FieldGroup>
        <DialogFooter><UiButton variant="outline" @click="banDialogVisible = false">{{ $t('players.actions.cancel') }}</UiButton><UiButton variant="destructive" @click="confirmBanPlayer" :disabled="banning"><Spinner v-if="banning" data-icon="inline-start" />{{ $t('players.actions.confirmBan') }}</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="godModeDialogVisible">
      <DialogContent><DialogHeader><DialogTitle>{{ $t('players.dialogs.godMode.title') }}</DialogTitle><DialogDescription>{{ $t('players.dialogs.godMode.player', { player: currentPlayer?.player_name || '' }) }}</DialogDescription></DialogHeader>
        <Field orientation="horizontal"><FieldContent><FieldLabel for="god-mode-enabled">{{ $t('players.operations.godMode') }}</FieldLabel><FieldDescription>{{ $t(godModeForm.enabled ? 'players.values.enabled' : 'players.values.disabled') }}</FieldDescription></FieldContent><UiSwitch id="god-mode-enabled" v-model="godModeForm.enabled" /></Field>
        <DialogFooter><UiButton variant="outline" @click="godModeDialogVisible = false">{{ $t('players.actions.cancel') }}</UiButton><UiButton @click="confirmGodMode" :disabled="settingGodMode"><Spinner v-if="settingGodMode" data-icon="inline-start" />{{ $t('players.actions.confirm') }}</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="creativeModeDialogVisible">
      <DialogContent><DialogHeader><DialogTitle>{{ $t('players.dialogs.creativeMode.title') }}</DialogTitle><DialogDescription>{{ $t('players.dialogs.creativeMode.player', { player: currentPlayer?.player_name || '' }) }}</DialogDescription></DialogHeader>
        <Field orientation="horizontal"><FieldContent><FieldLabel for="creative-mode-enabled">{{ $t('players.operations.creativeMode') }}</FieldLabel><FieldDescription>{{ $t(creativeModeForm.enabled ? 'players.values.enabled' : 'players.values.disabled') }}</FieldDescription></FieldContent><UiSwitch id="creative-mode-enabled" v-model="creativeModeForm.enabled" /></Field>
        <DialogFooter><UiButton variant="outline" @click="creativeModeDialogVisible = false">{{ $t('players.actions.cancel') }}</UiButton><UiButton @click="confirmCreativeMode" :disabled="settingCreativeMode"><Spinner v-if="settingCreativeMode" data-icon="inline-start" />{{ $t('players.actions.confirm') }}</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="sessionSelectDialogVisible">
      <DialogContent><DialogHeader><DialogTitle>{{ $t('players.dialogs.session.title') }}</DialogTitle><DialogDescription>{{ $t('players.dialogs.session.description') }}</DialogDescription></DialogHeader>
        <FieldGroup><Field><FieldLabel for="player-session">{{ $t('players.fields.gameWorld') }}</FieldLabel><UiSelect v-model="selectedSessionName"><SelectTrigger id="player-session"><SelectValue :placeholder="$t('players.dialogs.session.placeholder')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="session in sessionList" :key="session.key" :value="session.key">{{ session.name }} · {{ getWorldState(session.state) }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field></FieldGroup>
        <Alert v-if="sessionList.length === 0" variant="destructive"><TriangleAlert /><AlertTitle>{{ $t('players.dialogs.session.empty') }}</AlertTitle></Alert>
        <DialogFooter><UiButton variant="outline" @click="sessionSelectDialogVisible = false">{{ $t('players.actions.cancel') }}</UiButton><UiButton @click="confirmSessionSelect">{{ $t('players.actions.confirm') }}</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="updateDialogVisible">
      <DialogContent><DialogHeader><DialogTitle>{{ $t('players.dialogs.update.title') }}</DialogTitle><DialogDescription>{{ $t('players.dialogs.update.description') }}</DialogDescription></DialogHeader>
        <FieldGroup><Field><FieldLabel for="update-archive">{{ $t('players.fields.archive') }}</FieldLabel><UiSelect v-model="updateForm.archive_name" @update:model-value="onArchiveChange"><SelectTrigger id="update-archive"><SelectValue :placeholder="$t('players.dialogs.update.archivePlaceholder')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="archive in archiveOptions" :key="archive.value" :value="archive.value">{{ archive.label }}</SelectItem></SelectGroup></SelectContent></UiSelect></Field>
          <Field><FieldLabel for="update-world">{{ $t('players.fields.world') }}</FieldLabel><NativeSelect id="update-world" v-model="updateForm.world_name"><NativeSelectOption value="">{{ $t('players.dialogs.update.allWorlds') }}</NativeSelectOption><NativeSelectOption v-for="world in worldOptions" :key="world.value" :value="world.value">{{ world.label }}</NativeSelectOption></NativeSelect><FieldDescription>{{ $t('players.dialogs.update.allWorldsDescription') }}</FieldDescription></Field></FieldGroup>
        <DialogFooter><UiButton variant="outline" @click="updateDialogVisible = false">{{ $t('players.actions.cancel') }}</UiButton><UiButton @click="confirmUpdate" :disabled="updating || !updateForm.archive_name"><Spinner v-if="updating" data-icon="inline-start" />{{ $t('players.actions.startUpdate') }}</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="characterDialogVisible">
      <DialogContent><DialogHeader><DialogTitle>{{ $t('players.dialogs.character.title') }}</DialogTitle><DialogDescription>{{ $t('players.dialogs.character.description', { player: currentPlayer?.player_name || '', character: currentPlayer ? getCharacterName(currentPlayer.prefab) : '' }) }}</DialogDescription></DialogHeader>
        <Alert variant="destructive"><TriangleAlert /><AlertTitle>{{ $t('players.dialogs.character.warningTitle') }}</AlertTitle><AlertDescription>{{ $t('players.dialogs.character.warningDescription') }}</AlertDescription></Alert>
        <DialogFooter><UiButton variant="outline" @click="characterDialogVisible = false">{{ $t('players.actions.cancel') }}</UiButton><UiButton @click="confirmChangeCharacter" :disabled="changingCharacter"><Spinner v-if="changingCharacter" data-icon="inline-start" />{{ $t('players.actions.confirmReselect') }}</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="scheduleDialogVisible">
      <DialogContent class="max-w-2xl"><DialogHeader><DialogTitle>{{ $t('players.dialogs.schedule.title') }}</DialogTitle><DialogDescription>{{ $t('players.dialogs.schedule.description') }}</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field :data-invalid="Boolean(scheduleErrors.name)"><FieldLabel for="schedule-name">{{ $t('players.fields.taskName') }}</FieldLabel><UiInput id="schedule-name" v-model="scheduleForm.name" :aria-invalid="Boolean(scheduleErrors.name)" /><FieldError v-if="scheduleErrors.name">{{ scheduleErrorText(scheduleErrors.name) }}</FieldError></Field>
          <Field :data-invalid="Boolean(scheduleErrors.session_name)"><FieldLabel for="schedule-session">{{ $t('players.fields.gameWorld') }}</FieldLabel><UiSelect v-model="scheduleForm.session_name"><SelectTrigger id="schedule-session" :aria-invalid="Boolean(scheduleErrors.session_name)"><SelectValue :placeholder="$t('players.dialogs.schedule.worldPlaceholder')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="session in sessionList" :key="session.key" :value="session.key">{{ session.name }} · {{ getWorldState(session.state) }}</SelectItem></SelectGroup></SelectContent></UiSelect><FieldError v-if="scheduleErrors.session_name">{{ scheduleErrorText(scheduleErrors.session_name) }}</FieldError></Field>
          <Field :data-invalid="Boolean(scheduleErrors.spec)"><FieldLabel for="schedule-spec">{{ $t('players.fields.schedule') }}</FieldLabel><UiInput id="schedule-spec" v-model="scheduleForm.spec" :placeholder="$t('players.dialogs.schedule.specPlaceholder')" :aria-invalid="Boolean(scheduleErrors.spec)" /><FieldDescription>{{ $t('players.dialogs.schedule.specDescription') }}</FieldDescription><FieldError v-if="scheduleErrors.spec">{{ scheduleErrorText(scheduleErrors.spec) }}</FieldError></Field>
          <Field><FieldLabel for="schedule-description">{{ $t('players.fields.taskDescription') }}</FieldLabel><UiTextarea id="schedule-description" v-model="scheduleForm.description" rows="2" /></Field>
        </FieldGroup>
        <DialogFooter><UiButton variant="outline" @click="scheduleDialogVisible = false">{{ $t('players.actions.cancel') }}</UiButton><UiButton @click="confirmAddSchedule" :disabled="addingSchedule"><Spinner v-if="addingSchedule" data-icon="inline-start" />{{ $t('players.actions.confirmAdd') }}</UiButton></DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import { Clock3, Crown, Download, ExternalLink, Globe2, MoreHorizontal, RefreshCw, Search, TriangleAlert, Upload, UserRoundCheck, Users } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { playerApi } from '@/api/playerApi';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea as UiTextarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  formatPlayerDate,
  isPlayerOnline,
  PLAYER_BAN_DURATION_IDS,
  PLAYER_CHARACTER_IDS,
  playerBanDurationLabel,
  playerCharacterLabel,
  playerErrorDetail,
  playerNetworkLabel,
  playerStatusMeta,
  playerWorldStateLabel
} from '@/i18n/playerMessages.js';
import { promptText } from '@/lib/feedback';
import SortButton from './SortButton.vue';
import RuntimeStatusPanel from '@/components/runtime/RuntimeStatusPanel.vue';

export default {
  name: 'PlayerList',
  components: {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Avatar,
    AvatarFallback,
    Badge,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Clock3,
    Crown,
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
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    ExternalLink,
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    Globe2,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    MoreHorizontal,
    NativeSelect,
    NativeSelectOption,
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
    RefreshCw,
    RuntimeStatusPanel,
    ScrollArea,
    Search,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SortButton,
    Spinner,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TriangleAlert,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
    UiButton,
    UiDialog,
    UiInput,
    UiSelect,
    UiSwitch,
    UiTable,
    UiTextarea,
    Upload,
    UserRoundCheck,
    Users
  },
  data() {
    return {
      // 玩家列表数据
      playerList: [],
      loading: false,
      loadError: null,
      partialFailures: [],

      // 分页参数
      pagination: {
        page: 1,
        page_size: 10,
        total: 0
      },

      // 筛选表单
      filterForm: {
        archive_name: this.$route.query.archive || '',
        status: '',
        prefab: '',
        keyword: ''
      },

      // 存档选项
      archiveOptions: [],

      // 排序参数
      sortParams: {
        prop: 'last_seen',
        order: 'descending'
      },

      // 玩家详情
      playerDetailVisible: false,
      currentPlayer: null,



      // 封禁
      banDialogVisible: false,
      banForm: {
        reason: '',
        duration: '1d',
        confirmation: ''
      },
      banFormError: '',
      banConfirmationError: '',
      banning: false,

      // 会话列表
      sessionList: [],
      updateDialogVisible: false,
      updateForm: {
        archive_name: '',
        world_name: ''
      },
      worldOptions: [],
      updating: false,
      refreshing: false,

      // 无敌模式
      godModeDialogVisible: false,
      godModeForm: {
        enabled: true
      },
      settingGodMode: false,

      // 制作模式
      creativeModeDialogVisible: false,
      creativeModeForm: {
        enabled: true
      },
      settingCreativeMode: false,

      // 重选人物
      characterDialogVisible: false,
      changingCharacter: false,

      // 定时更新任务
      scheduleDialogVisible: false,
      addingSchedule: false,
      scheduleForm: {
        name: '',
        description: '',
        session_name: '',
        spec: '0 */3 * * * *' // 默认每3分钟执行一次
      },
      scheduleErrors: {},

      // 会话选择
      selectedSessionName: '',
      sessionSelectDialogVisible: false
    };
  },
  created() {
    this.fetchArchives();
    this.fetchSessions();
    this.fetchPlayerList();
  },

  computed: {
    characterOptions() {
      return PLAYER_CHARACTER_IDS.map(value => ({
        value,
        label: playerCharacterLabel(value, this.$t)
      }));
    },

    banDurations() {
      return PLAYER_BAN_DURATION_IDS.map(value => ({
        value,
        label: playerBanDurationLabel(value, this.$t)
      }));
    },

    loadErrorText() {
      return this.loadError ? playerErrorDetail(this.loadError, this.$t) : '';
    },

    banFormErrorText() {
      return this.banFormError ? this.$t(`players.validation.${this.banFormError}`) : '';
    },

    banConfirmationErrorText() {
      return this.banConfirmationError ? this.$t(`players.validation.${this.banConfirmationError}`) : '';
    },

    // 获取默认的会话名称（Forest1）
    defaultSessionName() {
      if (this.sessionList && this.sessionList.length > 0) {
        // 优先使用包含Forest并且序号为1的会话
        const forestSession = this.sessionList.find(session =>
          session.name.includes('Forest') && session.name.endsWith('1'));

        if (forestSession) {
          return forestSession.key;
        }

        // 如果没有找到Forest1，则使用第一个包含Forest的会话
        const anyForestSession = this.sessionList.find(session => session.name.includes('Forest'));
        if (anyForestSession) {
          return anyForestSession.key;
        }

        // 如果没有包含Forest的会话，使用第一个会话
        return this.sessionList[0].key;
      }
      return '';
    },

    // 当前选中的会话名称
    activeSessionName() {
      return this.selectedSessionName || this.defaultSessionName;
    },

    activeSessionLabel() {
      const session = this.sessionList.find(item => item.key === this.activeSessionName);
      return session ? session.name : '';
    },

    partialFailureText() {
      return this.$t('players.list.partialDescription', {
        count: this.partialFailures.length,
        rooms: this.partialFailures.map(failure => failure.room_name).join(', ')
      });
    }
  },
  methods: {
    isPlayerOnline,

    getPlayerStatusMeta(status) {
      return playerStatusMeta(status, this.$t);
    },

    getWorldState(status) {
      return playerWorldStateLabel(status, this.$t);
    },

    errorDetail(error) {
      return playerErrorDetail(error, this.$t);
    },

    scheduleErrorText(key) {
      return key ? this.$t(`players.validation.${key}`) : '';
    },

    handlePlayerCommand(command) {
      if (!command?.player) return;
      const actions = {
        god: this.toggleGodMode,
        creative: this.toggleCreativeMode,
        resurrect: this.resurrectPlayer,
        character: this.changeCharacter,
        kick: this.kickPlayer,
        ban: this.banPlayer,
        kill: this.killPlayer
      };
      actions[command.action]?.call(this, command.player);
    },
    // 获取玩家列表
    fetchPlayerList() {
      this.loading = true;
      this.loadError = null;

      const params = {
        page: this.pagination.page,
        page_size: this.pagination.page_size,
        ...this.filterForm
      };

      // 添加排序参数
      if (this.sortParams.prop && this.sortParams.order) {
        params.sort_by = this.sortParams.prop;
        params.sort_order = this.sortParams.order === 'ascending' ? 'asc' : 'desc';
      }

      return playerApi.getAllPlayers(params)
        .then(response => {
          this.playerList = response.data || [];
          this.pagination.total = response.total || 0;
          this.partialFailures = response.failures || [];
        })
        .catch(error => {
          console.error('获取玩家列表失败:', error);
          this.loadError = error;
          this.playerList = [];
          this.pagination.total = 0;
          this.partialFailures = [];
          toast.error(this.$t('players.feedback.listLoadFailed', { error: this.loadErrorText }));
        })
        .finally(() => {
          this.loading = false;
        });
    },

    // 刷新数据
    refreshData() {
      return this.fetchPlayerList();
    },

    async refreshPlayerData() {
      if (this.refreshing) return;
      this.refreshing = true;
      try {
        const response = await playerApi.updatePlayerInfo({ archive_name: this.filterForm.archive_name || '' });
        await this.fetchPlayerList();
        const failures = response?.data?.failures || [];
        if (failures.length > 0) {
          toast.warning(this.$t('players.feedback.updatePartial', { count: failures.length }));
        } else {
          toast.success(this.$t('players.feedback.updateSucceeded'));
        }
      } catch (error) {
        console.error('刷新玩家列表失败:', error);
        toast.error(this.$t('players.feedback.updateFailed', { error: this.errorDetail(error) }));
      } finally {
        this.refreshing = false;
      }
    },

    // 处理筛选
    handleFilter() {
      this.pagination.page = 1;
      this.fetchPlayerList();
    },

    // 重置筛选
    resetFilter() {
      this.filterForm = {
        archive_name: '',
        status: '',
        prefab: '',
        keyword: ''
      };
      this.handleFilter();
    },

    toggleSort(field) {
      const isCurrentField = this.sortParams.prop === field;
      this.sortParams.prop = field;
      this.sortParams.order = isCurrentField && this.sortParams.order === 'ascending'
        ? 'descending'
        : 'ascending';
      this.fetchPlayerList();
    },

    // 处理页码变化
    handleCurrentChange(page) {
      this.pagination.page = page;
      this.fetchPlayerList();
    },

    // 处理每页数量变化
    handleSizeChange(size) {
      this.pagination.page_size = size;
      this.pagination.page = 1;
      this.fetchPlayerList();
    },

    // 查看玩家详情
    viewPlayerDetail(player) {
      this.currentPlayer = { ...player };
      this.playerDetailVisible = true;
    },

    async confirmPlayerAction(player, title, description) {
      const result = await promptText(
        this.$t('players.confirmations.appendKuId', { description, id: player.user_id }),
        title,
        {
          confirmButtonText: this.$t('players.actions.confirmAction'),
          cancelButtonText: this.$t('players.actions.cancel'),
          inputPlaceholder: player.user_id,
          inputValidator: value => value === player.user_id || this.$t('players.validation.kuIdMismatch')
        }
      );
      return result.value;
    },

    // 踢出玩家
    async kickPlayer(player) {
      let confirmation;
      try {
        confirmation = await this.confirmPlayerAction(
          player,
          this.$t('players.confirmations.kickTitle'),
          this.$t('players.confirmations.kickDescription', { player: player.player_name })
        );
      } catch {
        return;
      }

      const loadingId = toast.loading(this.$t('players.feedback.kickLoading'));
      try {
        await playerApi.kickPlayer(player, null, confirmation);
        toast.success(this.$t('players.feedback.kickSucceeded', { player: player.player_name }));
        this.playerDetailVisible = false;
        await this.refreshData();
      } catch (error) {
        console.error('踢出玩家失败:', error);
        toast.error(this.$t('players.feedback.kickFailed', { error: this.errorDetail(error) }));
      } finally {
        toast.dismiss(loadingId);
      }
    },

    // 封禁玩家
    banPlayer(player) {
      this.currentPlayer = player;
      this.banForm = {
        reason: '',
        duration: '1d',
        confirmation: ''
      };
      this.banFormError = '';
      this.banConfirmationError = '';
      this.banDialogVisible = true;
    },

    // 确认封禁玩家
    confirmBanPlayer() {
      const reason = this.banForm.reason.trim();
      this.banFormError = reason ? '' : 'banReasonRequired';
      this.banConfirmationError = this.banForm.confirmation === this.currentPlayer.archive_name
        ? ''
        : 'banRoomMismatch';
      if (this.banFormError || this.banConfirmationError) return;

      this.banning = true;

      const banData = {
        reason,
        duration: this.banForm.duration,
        confirmation: this.banForm.confirmation
      };

      playerApi.banPlayer(this.currentPlayer, banData)
        .then(() => {
          toast.success(this.$t('players.feedback.banSucceeded', { player: this.currentPlayer.player_name }));
          this.banDialogVisible = false;
          this.playerDetailVisible = false;
          this.refreshData();
        })
        .catch(error => {
          console.error('封禁玩家失败:', error);
          toast.error(this.$t('players.feedback.banFailed', { error: this.errorDetail(error) }));
        })
        .finally(() => {
          this.banning = false;
        });
    },



    // 重选人物
    changeCharacter(player) {
      this.currentPlayer = player;
      this.characterDialogVisible = true;
    },

    // 确认重选人物
    async confirmChangeCharacter() {
      let confirmation;
      try {
        confirmation = await this.confirmPlayerAction(
          this.currentPlayer,
          this.$t('players.confirmations.characterTitle'),
          this.$t('players.confirmations.characterDescription', { player: this.currentPlayer.player_name })
        );
      } catch {
        return;
      }

      this.changingCharacter = true;
      try {
        const response = await playerApi.changeCharacter(this.currentPlayer, null, confirmation);
        if (!response || response.status !== 200) throw new Error(response?.msg || this.$t('players.feedback.commandFailed'));
        toast.success(this.$t('players.feedback.characterSucceeded', { player: this.currentPlayer.player_name }));
        this.characterDialogVisible = false;
        this.playerDetailVisible = false;
        this.refreshData();
      } catch (error) {
        console.error('重选人物失败:', error);
        toast.error(this.$t('players.feedback.characterFailed', { error: this.errorDetail(error) }));
      } finally {
        this.changingCharacter = false;
      }
    },

    // 显示定时更新对话框
    showScheduleDialog() {
      const sessionKey = this.activeSessionName;
      if (!sessionKey) {
        toast.warning(this.$t('players.feedback.noScheduleWorld'));
        return;
      }
      const sessionName = this.activeSessionLabel;
      this.scheduleForm = {
        name: `player_refresh_${sessionName}`,
        description: `Scheduled player refresh for ${sessionName}`,
        session_name: sessionKey,
        spec: '0 */3 * * * *' // 默认每3分钟执行一次
      };
      this.scheduleErrors = {};
      this.scheduleDialogVisible = true;
    },

    validateScheduleForm() {
      const errors = {};
      const name = this.scheduleForm.name.trim();
      const spec = this.scheduleForm.spec.trim();
      const cronFields = spec.split(/\s+/).filter(Boolean);

      if (!name) errors.name = 'taskNameRequired';
      else if (name.length < 2 || name.length > 50) errors.name = 'taskNameLength';
      if (!this.scheduleForm.session_name) errors.session_name = 'worldRequired';
      if (!spec) errors.spec = 'cronRequired';
      else if (cronFields.length !== 5 && !(cronFields.length === 6 && cronFields[0] === '0')) {
        errors.spec = 'cronInvalid';
      }

      this.scheduleErrors = errors;
      return Object.keys(errors).length === 0;
    },

    // 确认添加定时任务
    confirmAddSchedule() {
      if (!this.validateScheduleForm()) {
        toast.warning(this.$t('players.validation.formIncomplete'));
        return;
      }

      this.addingSchedule = true;
      const taskData = {
        name: this.scheduleForm.name.trim(),
        description: this.scheduleForm.description.trim(),
        spec: this.scheduleForm.spec.trim(),
        session_name: this.scheduleForm.session_name
      };

      playerApi.addRefreshSchedule(taskData)
        .then(response => {
          if (!response || response.status !== 200) {
            throw new Error(response?.msg || response?.message || this.$t('players.feedback.addFailed'));
          }
          toast.success(this.$t('players.feedback.scheduleSucceeded'));
          this.scheduleDialogVisible = false;
        })
        .catch(error => {
          console.error('添加定时任务失败:', error);
          toast.error(this.$t('players.feedback.scheduleFailed', { error: this.errorDetail(error) }));
        })
        .finally(() => {
          this.addingSchedule = false;
        });
    },

    // 导出玩家数据
    exportPlayerData() {
      const loadingId = toast.loading(this.$t('players.feedback.exportLoading'));
      const params = {
        ...this.filterForm,
        sort_by: this.sortParams.prop,
        sort_order: this.sortParams.order === 'ascending' ? 'asc' : 'desc'
      };
      playerApi.exportPlayers(params)
        .then(players => {
          const columns = [
            [this.$t('players.export.columns.archive'), 'archive_name'],
            [this.$t('players.export.columns.world'), 'world_name'],
            ['KU ID', 'user_id'],
            [this.$t('players.export.columns.playerName'), 'player_name'],
            [this.$t('players.export.columns.character'), 'prefab'],
            [this.$t('players.export.columns.days'), 'player_age'],
            [this.$t('players.export.columns.status'), 'status'],
            ['Steam ID', 'net_id'],
            [this.$t('players.export.columns.firstSeen'), 'first_seen'],
            [this.$t('players.export.columns.lastSeen'), 'last_seen']
          ];
          const escapeCell = value => {
            let text = value === null || value === undefined ? '' : String(value);
            if (/^[=+\-@]/.test(text)) text = `'${text}`;
            return `"${text.replace(/"/g, '""')}"`;
          };
          const rows = [
            columns.map(column => escapeCell(column[0])).join(','),
            ...players.map(player => columns.map(column => escapeCell(player[column[1]])).join(','))
          ];
          const blob = new Blob([`\ufeff${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = this.$t('players.export.fileName', { date: new Date().toISOString().slice(0, 10) });
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success(this.$t('players.feedback.exportSucceeded', { count: players.length }));
        })
        .catch(error => {
          console.error('导出玩家数据失败:', error);
          toast.error(this.$t('players.feedback.exportFailed', { error: this.errorDetail(error) }));
        })
        .finally(() => toast.dismiss(loadingId));
    },

    // 格式化日期
    formatDate(dateString) {
      return formatPlayerDate(dateString, this.$i18n.locale);
    },

    // 获取角色名称
    getCharacterName(prefab) {
      return playerCharacterLabel(prefab, this.$t);
    },

    // 获取网络质量文本
    getNetworkQuality(netScore) {
      return playerNetworkLabel(netScore, this.$t);
    },

    getNetworkBadgeVariant(netScore) {
      if (netScore === 0) return 'default';
      if (netScore === 1) return 'secondary';
      if (netScore === 2) return 'destructive';
      return 'outline';
    },

    getPlayerInitials(player) {
      const name = (player?.player_name || player?.user_id || '?').trim();
      return Array.from(name).slice(0, 2).join('').toUpperCase();
    },

    // 从会话名称中提取世界名称
    extractWorldName(sessionName) {
      if (!sessionName) return '';

      // 移除前缀 'dstserver_'
      let worldName = sessionName.replace(/^dstserver_/, '');

      // 如果有存档名称，移除存档名称和下划线
      if (this.updateForm && this.updateForm.archive_name) {
        const archivePrefix = this.updateForm.archive_name + '_';
        worldName = worldName.replace(new RegExp('^' + archivePrefix), '');
      }

      return worldName;
    },

    // 生成世界名称选项
    generateWorldOptions() {
      if (!this.sessionList || this.sessionList.length === 0 || !this.updateForm.archive_name) {
        return [];
      }
      return this.sessionList
        .filter(session => session.room_id === this.updateForm.archive_name)
        .map(session => ({
          label: session.world_name,
          value: session.world_id
        }));
    },

    // 格式化 Steam ID
    formatSteamID(steamID) {
      if (!steamID) return '-';
      // 只显示前后几位，中间用省略号
      if (steamID.length > 8) {
        return steamID.substring(0, 4) + '...' + steamID.substring(steamID.length - 4);
      }
      return steamID;
    },

    // 复制 Steam ID
    async copySteamID(steamID) {
      if (!steamID) return;

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(steamID);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = steamID;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          if (!successful) throw new Error(this.$t('players.feedback.copyDenied'));
        }
        toast.success(this.$t('players.feedback.steamCopied'));
      } catch (err) {
        toast.error(this.$t('players.feedback.copyFailed', { error: this.errorDetail(err) }));
      }
    },

    // 打开 Steam 个人资料页面
    openSteamProfile(steamID) {
      if (!steamID) return;
      const url = `https://steamcommunity.com/profiles/${steamID}`;
      window.open(url, '_blank');
    },

    // 获取存档列表
    fetchArchives() {
      playerApi.getArchives()
        .then(response => {
          if (response.data && Array.isArray(response.data)) {
            this.archiveOptions = response.data.map(archive => ({
              label: archive.name || archive.archive_name || archive,
              value: archive.id || archive.name || archive.archive_name || archive
            }));
          }
        })
        .catch(error => {
          console.error('获取存档列表失败:', error);
          this.archiveOptions = [];
          toast.error(this.$t('players.feedback.archivesLoadFailed', { error: this.errorDetail(error) }));
        });
    },

    // 获取会话列表
    fetchSessions() {
      playerApi.getSessions()
        .then(response => {
          if (response.data && Array.isArray(response.data)) {
            this.sessionList = response.data;
            // 如果有运行中的会话，默认选择第一个
            if (this.sessionList.length > 0) {
              this.updateForm.session_name = this.sessionList[0].name;
              // 设置默认选中的会话
              this.selectedSessionName = this.defaultSessionName;
            }
          }
        })
        .catch(error => {
          console.error('获取会话列表失败:', error);
          this.sessionList = [];
          toast.error(this.$t('players.feedback.worldsLoadFailed', { error: this.errorDetail(error) }));
        });
    },

    // 显示会话选择对话框
    showSessionSelect() {
      // 如果还没有选择会话，则默认选择Forest1
      if (!this.selectedSessionName && this.defaultSessionName) {
        this.selectedSessionName = this.defaultSessionName;
      }
      this.sessionSelectDialogVisible = true;
    },

    // 确认选择会话
    confirmSessionSelect() {
      if (!this.selectedSessionName) {
        toast.warning(this.$t('players.feedback.worldRequired'));
        return;
      }

      toast.success(this.$t('players.feedback.taskWorldSet', { world: this.activeSessionLabel }));
      this.sessionSelectDialogVisible = false;
    },

    // 处理下拉菜单命令
    handleCommand(command, player) {
      this.currentPlayer = { ...player };
      switch (command) {
        case 'kick':
          this.kickPlayer(player);
          break;
        case 'ban':
          this.banPlayer(player);
          break;
        case 'kill':
          this.killPlayer(player);
          break;
        case 'godMode':
          this.toggleGodMode(player);
          break;
        case 'creativeMode':
          this.toggleCreativeMode(player);
          break;
        case 'resurrect':
          this.resurrectPlayer(player);
          break;
        case 'message':
          this.sendMessage();
          break;
        default:
          break;
      }
    },

    // 杀死玩家
    async killPlayer(player) {
      let confirmation;
      try {
        confirmation = await this.confirmPlayerAction(
          player,
          this.$t('players.confirmations.killTitle'),
          this.$t('players.confirmations.killDescription', { player: player.player_name })
        );
      } catch {
        return;
      }

      const loadingId = toast.loading(this.$t('players.feedback.actionLoading'));
      try {
        const response = await playerApi.killPlayer(player, null, confirmation);
        if (!response || response.status !== 200) throw new Error(response?.msg || this.$t('players.feedback.commandFailed'));
        toast.success(this.$t('players.feedback.killSucceeded', { player: player.player_name }));
        this.playerDetailVisible = false;
        this.refreshData();
      } catch (error) {
        console.error('杀死玩家失败:', error);
        toast.error(this.$t('players.feedback.killFailed', { error: this.errorDetail(error) }));
      } finally {
        toast.dismiss(loadingId);
      }
    },

    // 切换无敌模式
    toggleGodMode(player) {
      this.currentPlayer = player;
      this.godModeForm.enabled = true; // 默认开启
      this.godModeDialogVisible = true;
    },

    // 确认设置无敌模式
    async confirmGodMode() {
      this.settingGodMode = true;

      try {
        const response = await playerApi.setGodMode(
          this.currentPlayer,
          this.godModeForm.enabled,
          null
        );
        if (!response || response.status !== 200) throw new Error(response?.msg || this.$t('players.feedback.commandFailed'));
        const status = this.$t(this.godModeForm.enabled ? 'players.values.enabled' : 'players.values.disabled');
        await this.refreshData();
        toast.success(this.$t('players.feedback.godModeSucceeded', { status, player: this.currentPlayer.player_name }));
        this.godModeDialogVisible = false;
      } catch (error) {
        console.error('设置无敌模式失败:', error);
        toast.error(this.$t('players.feedback.godModeFailed', { error: this.errorDetail(error) }));
      } finally {
        this.settingGodMode = false;
      }
    },

    // 切换制作模式
    toggleCreativeMode(player) {
      this.currentPlayer = player;
      this.creativeModeForm.enabled = true; // 默认开启
      this.creativeModeDialogVisible = true;
    },

    // 确认设置制作模式
    async confirmCreativeMode() {
      this.settingCreativeMode = true;

      try {
        const response = await playerApi.setCreativeMode(
          this.currentPlayer,
          this.creativeModeForm.enabled,
          null
        );
        if (!response || response.status !== 200) throw new Error(response?.msg || this.$t('players.feedback.commandFailed'));
        const status = this.$t(this.creativeModeForm.enabled ? 'players.values.enabled' : 'players.values.disabled');
        await this.refreshData();
        toast.success(this.$t('players.feedback.creativeModeSucceeded', { status, player: this.currentPlayer.player_name }));
        this.creativeModeDialogVisible = false;
      } catch (error) {
        console.error('设置制作模式失败:', error);
        toast.error(this.$t('players.feedback.creativeModeFailed', { error: this.errorDetail(error) }));
      } finally {
        this.settingCreativeMode = false;
      }
    },

    // 复活玩家
    async resurrectPlayer(player) {
      let confirmation;
      try {
        confirmation = await this.confirmPlayerAction(
          player,
          this.$t('players.confirmations.resurrectTitle'),
          this.$t('players.confirmations.resurrectDescription', { player: player.player_name })
        );
      } catch {
        return;
      }

      const loadingId = toast.loading(this.$t('players.feedback.actionLoading'));
      try {
        const response = await playerApi.resurrectPlayer(player, null, confirmation);
        if (!response || response.status !== 200) throw new Error(response?.msg || this.$t('players.feedback.commandFailed'));
        toast.success(this.$t('players.feedback.resurrectSucceeded', { player: player.player_name }));
        this.refreshData();
      } catch (error) {
        console.error('复活玩家失败:', error);
        toast.error(this.$t('players.feedback.resurrectFailed', { error: this.errorDetail(error) }));
      } finally {
        toast.dismiss(loadingId);
      }
    },

    // 手动更新玩家列表
    showUpdateDialog() {
      // 初始化表单数据
      this.updateForm = {
        archive_name: this.archiveOptions.length > 0 ? this.archiveOptions[0].value : '',
        world_name: ''
      };

      // 生成世界名称选项
      this.$nextTick(() => {
        this.worldOptions = this.generateWorldOptions();
      });

      this.updateDialogVisible = true;
    },

    // 存档变更时更新世界选项
    onArchiveChange() {
      // 重置世界名称
      this.updateForm.world_name = '';

      // 重新生成世界选项
      this.$nextTick(() => {
        this.worldOptions = this.generateWorldOptions();
      });
    },

    // 确认更新玩家列表
    confirmUpdate() {
      if (!this.updateForm.archive_name) {
        toast.warning(this.$t('players.validation.archiveRequired'));
        return;
      }

      this.updating = true;

      // 准备请求参数
      const updateParams = {
        archive_name: this.updateForm.archive_name,
        world_name: this.updateForm.world_name || ''
      };

      playerApi.updatePlayerInfo(updateParams)
        .then(response => {
          const failures = response?.data?.failures || [];
          if (failures.length > 0) {
            toast.warning(this.$t('players.feedback.updatePartial', { count: failures.length }));
          } else {
            toast.success(this.$t('players.feedback.updateSucceeded'));
          }
          this.updateDialogVisible = false;
          this.refreshData();
        })
        .catch(error => {
          console.error('更新玩家列表失败:', error);
          toast.error(this.$t('players.feedback.updateFailed', { error: this.errorDetail(error) }));
        })
        .finally(() => {
          this.updating = false;
        });
    }
  }
};
</script>

<style scoped>
.player-list-page {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.title-container {
  min-width: 0;
  white-space: nowrap;
}

.title-container h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
}

.title-container p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
  white-space: normal;
}

.filter-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  align-items: flex-end;
  gap: 12px;
}

.filter-actions,
.action-buttons,
.row-actions,
.steam-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.filter-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.table-operations {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.action-buttons {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  gap: 8px;
  color: var(--muted-foreground);
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.table-wrap :deep(table) {
  min-width: 1280px;
}

.action-column {
  position: sticky;
  right: 0;
  min-width: 108px;
  background: var(--card);
  text-align: right;
}

.player-name-cell {
  display: flex;
  max-width: 180px;
  align-items: center;
  gap: 6px;
}

.player-name-cell > svg {
  flex: none;
  color: var(--muted-foreground);
}

.mono-cell {
  max-width: 180px;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--muted-foreground);
  font-size: 13px;
}

.page-size-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-size-control :deep([data-slot='native-select-wrapper']) {
  width: 76px;
}

.player-detail-sheet {
  width: min(94vw, 560px);
  max-width: 560px;
}

.player-detail-scroll {
  min-height: 0;
  flex: 1;
  padding-right: 12px;
}

.player-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 2px 0 24px;
}

.player-detail-heading,
.detail-player-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.player-detail-heading > div {
  min-width: 0;
}

.detail-player-name strong {
  overflow-wrap: anywhere;
  font-size: 16px;
}

.player-detail-heading > div > span {
  display: block;
  margin-top: 4px;
  color: var(--muted-foreground);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.player-description-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.player-description-grid > div {
  min-width: 0;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.player-description-grid > div:nth-child(odd) {
  border-right: 1px solid var(--border);
}

.player-description-grid > div:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.player-description-grid dt {
  margin-bottom: 3px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.player-description-grid dd {
  min-width: 0;
  overflow-wrap: anywhere;
}

.player-detail section h3 {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
}

.detail-action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

@media (max-width: 720px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .action-buttons {
    justify-content: flex-start;
  }

  .action-buttons > :deep(button) {
    flex: 1 1 calc(50% - 4px);
  }

  .action-buttons > :deep([data-slot='badge']) {
    width: 100%;
    white-space: normal;
  }

  .filter-form {
    grid-template-columns: minmax(0, 1fr);
  }

  .filter-actions {
    grid-column: 1 / -1;
  }

  .table-operations {
    align-items: stretch;
    flex-direction: column;
    flex-wrap: wrap;
  }

  .pagination-bar {
    justify-content: flex-start;
    overflow-x: auto;
  }

  .player-description-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .player-description-grid > div,
  .player-description-grid > div:nth-child(odd),
  .player-description-grid > div:nth-last-child(-n + 2) {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .player-description-grid > div:last-child {
    border-bottom: 0;
  }

  .detail-action-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <div class="world-settings-container" :class="{ 'has-fixed-footer': showWorldSettingsFooter }">
    <section class="settings-surface">
      <header class="page-header">
        <div>
          <h1>{{ roomName ? $t('worlds.settingsPage.titleWithRoom', { room: roomName }) : $t('worlds.settingsPage.title') }}</h1>
        </div>
        <div class="header-actions">
          <UiButton
            v-if="currentWorld || showPageSkeleton"
            variant="outline"
            size="sm"
            :disabled="!currentWorld || loading || loadingRooms"
            @click="openWorldMods(currentWorld)"
          >
            <Package data-icon="inline-start" />
            {{ $t('worlds.settingsPage.manageMods') }}
          </UiButton>
          <UiButton variant="outline" size="sm" @click="requestReloadSettings" :disabled="loading || loadingRooms">
            <Spinner v-if="loading || loadingRooms" data-icon="inline-start" />
            <RefreshCw v-else data-icon="inline-start" />
            {{ $t('worlds.settingsPage.refresh') }}
          </UiButton>
          <UiButton size="sm" :disabled="!roomId || loading || loadingRooms || roomHasRunningWorld" :title="roomHasRunningWorld ? $t('worlds.settingsPage.stopAllWorlds') : $t('worlds.settingsPage.addWorld')" @click="showAddWorldDialog"><Plus data-icon="inline-start" />{{ $t('worlds.settingsPage.addWorld') }}</UiButton>
        </div>
      </header>

      <RoomScopeSelect :model-value="roomId || ''" :rooms="roomOptions" :loading="loadingRooms" :disabled="loading" @update:model-value="requestRoomChange" />

      <Alert v-if="roomOptionsError" variant="destructive" class="load-error">
        <TriangleAlert />
        <AlertTitle>{{ $t('worlds.settingsPage.roomDirectoryFailed') }}</AlertTitle>
        <AlertDescription>{{ roomOptionsError }}</AlertDescription>
        <AlertAction><UiButton size="sm" variant="outline" :disabled="loadingRooms" @click="retryRoomOptions">{{ $t('common.actions.retry') }}</UiButton></AlertAction>
      </Alert>

      <Alert v-if="loadError" :variant="activeWorldHasBaseline ? 'default' : 'destructive'" class="load-error">
        <TriangleAlert />
        <AlertTitle>{{ $t('worlds.settingsPage.loadFailed') }}</AlertTitle>
        <AlertDescription>{{ loadError }}</AlertDescription>
        <AlertAction><UiButton size="sm" variant="outline" @click="requestReloadSettings">{{ $t('common.actions.retry') }}</UiButton></AlertAction>
      </Alert>

      <Alert v-if="activeConfigurationSync && activeConfigurationSync.status !== 'synced'" class="load-error">
        <RefreshCw />
        <AlertTitle>{{ $t(`worlds.settingsPage.sync.${activeConfigurationSync.status}.title`) }}</AlertTitle>
        <AlertDescription>{{ $t(`worlds.settingsPage.sync.${activeConfigurationSync.status}.description`) }}</AlertDescription>
        <AlertAction class="max-sm:col-span-full max-sm:col-start-1 max-sm:row-auto max-sm:justify-start max-sm:pt-1">
          <UiButton size="sm" variant="outline" :disabled="loading" @click="requestReloadSettings">{{ $t('common.actions.refresh') }}</UiButton>
        </AlertAction>
      </Alert>

      <div v-if="showPageSkeleton" class="world-page-skeleton" aria-busy="true">
        <div class="world-tabs-skeleton-bar">
          <Skeleton class="world-tab-skeleton" />
          <Skeleton class="world-tab-skeleton" />
        </div>
        <Card size="sm" class="world-settings-card">
          <CardHeader>
            <Skeleton class="world-heading-skeleton" />
          </CardHeader>
          <CardContent>
            <div class="skeleton-stack">
              <Skeleton v-for="index in 8" :key="index" class="skeleton-row" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs v-else-if="roomId && originalSettings && visibleWorlds.length > 0" :model-value="activeTab" orientation="horizontal" class="world-tabs" @update:model-value="requestWorldTab">
        <div class="world-tabs-toolbar">
          <TabsList class="world-tab-list" :aria-label="$t('worlds.settingsPage.worldListAria')">
            <TabsTrigger v-for="world in visibleWorlds" :key="world.name" :value="world.name">
              {{ world.name }}{{ ['forest', 'cave'].includes(world.type) ? ` · ${worldTypeLabel(world.type)}` : '' }}
            </TabsTrigger>
          </TabsList>
          <UiButton
            v-if="currentWorld && !currentWorld.fallback"
            variant="destructive"
            size="icon-sm"
            :disabled="currentWorld.status === 'running'"
            :aria-label="$t('worlds.settingsPage.deleteCurrent')"
            :title="currentWorld.status === 'running' ? $t('worlds.settingsPage.stopCurrent') : $t('worlds.settingsPage.deleteCurrent')"
            @click="confirmDeleteWorld(currentWorld)"
          >
            <Trash2 />
          </UiButton>
        </div>

        <TabsContent v-for="world in visibleWorlds" :key="world.name" :value="world.name">
          <Card size="sm" class="world-settings-card">
            <CardHeader>
              <CardTitle class="world-heading">
                <Sun v-if="world.type === 'forest'" />
                <Moon v-else />
                {{ $t('worlds.settingsPage.worldHeading', { name: world.name, type: worldTypeLabel(world.type) }) }}
              </CardTitle>
              <CardAction class="world-card-actions">
                <ToggleGroup
                  :model-value="editorMode"
                  type="single"
                  variant="outline"
                  size="sm"
                  :aria-label="$t('worlds.settingsPage.sourceEditor.modes.aria')"
                  @update:model-value="handleEditorModeChange"
                >
                  <ToggleGroupItem value="visual" :disabled="sourceModeSwitching">
                    <SlidersHorizontal />{{ $t('worlds.settingsPage.sourceEditor.modes.visual') }}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="source" :disabled="sourceModeSwitching">
                    <FileCode2 />{{ $t('worlds.settingsPage.sourceEditor.modes.source') }}
                  </ToggleGroupItem>
                </ToggleGroup>
                <Badge :variant="world.type === 'forest' ? 'outline' : 'secondary'">{{ worldTypeLabel(world.type) }}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div v-if="editorMode === 'source'" class="world-source-workspace">
                <div class="source-editor-toolbar">
                  <div class="source-file-tabs-group">
                    <ToggleGroup
                      :model-value="sourceFileTab"
                      type="single"
                      variant="outline"
                      size="sm"
                      :aria-label="$t('worlds.settingsPage.sourceEditor.files.aria')"
                      @update:model-value="handleSourceFileTabChange"
                    >
                      <ToggleGroupItem value="leveldataoverride">
                        <FileCode2 />{{ $t('worlds.settingsPage.sourceEditor.files.leveldataoverride') }}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="server-ini">
                        <ServerCog />{{ $t('worlds.settingsPage.sourceEditor.files.serverIni') }}
                      </ToggleGroupItem>
                    </ToggleGroup>
                    <div class="section-statuses source-statuses-inline">
                      <Badge v-if="configurationSourceLabel" variant="outline" class="runtime-source-badge">{{ configurationSourceLabel }}</Badge>
                      <Badge variant="outline" class="effect-badge">{{ currentEffectLabel }}</Badge>
                    </div>
                  </div>
                  <div class="source-editor-actions">
                    <input
                      :ref="el => { if (world.name === activeTab) sourceFileInputEl = el }"
                      type="file"
                      class="sr-only"
                      :accept="sourceFileTab === 'server-ini' ? '.ini,.txt' : '.lua,.txt'"
                      @change="handleSourceFileInputChange"
                    />
                    <UiButton size="sm" variant="outline" :disabled="configurationReadOnly || sourceBusy" @click="pasteIntoSourceEditor">
                      <ClipboardPaste data-icon="inline-start" />{{ $t('worlds.settingsPage.sourceEditor.toolbar.paste') }}
                    </UiButton>
                    <UiButton size="sm" variant="outline" :disabled="configurationReadOnly || sourceBusy" @click="triggerSourceFileImport">
                      <Upload data-icon="inline-start" />{{ $t('worlds.settingsPage.sourceEditor.toolbar.importFile') }}
                    </UiButton>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <UiButton size="sm" variant="outline" :disabled="configurationReadOnly || sourceBusy" @click="formatCurrentSource">
                          <WandSparkles data-icon="inline-start" />{{ $t('worlds.settingsPage.sourceEditor.toolbar.format') }}
                        </UiButton>
                      </TooltipTrigger>
                      <TooltipContent>{{ $t('worlds.settingsPage.sourceEditor.toolbar.formatHint') }}</TooltipContent>
                    </Tooltip>
                    <UiButton size="sm" variant="outline" :disabled="sourceBusy" @click="validateCurrentSourceDraft({ silentSuccess: false })">
                      <Spinner v-if="sourceValidating" data-icon="inline-start" />
                      <Check v-else data-icon="inline-start" />
                      {{ $t('worlds.settingsPage.sourceEditor.toolbar.validate') }}
                    </UiButton>
                    <UiButton size="sm" variant="ghost" :disabled="loadingSourceFiles" @click="copyCurrentSource">
                      <Copy data-icon="inline-start" />{{ $t('worlds.settingsPage.sourceEditor.toolbar.copy') }}
                    </UiButton>
                    <UiButton size="sm" variant="ghost" :disabled="loadingSourceFiles" @click="downloadCurrentSource">
                      <Download data-icon="inline-start" />{{ $t('worlds.settingsPage.sourceEditor.toolbar.download') }}
                    </UiButton>
                  </div>
                </div>

                <Alert v-if="hasKleiHeaderNotice || hasBareTableNotice" role="status">
                  <Info />
                  <AlertTitle>{{ $t('worlds.settingsPage.sourceEditor.notices.kleiHeaderTitle') }}</AlertTitle>
                  <AlertDescription>
                    <span v-if="hasKleiHeaderNotice">{{ $t('worlds.settingsPage.sourceEditor.notices.kleiHeaderDescription') }}</span>
                    <span v-if="hasBareTableNotice">{{ hasKleiHeaderNotice ? ' ' : '' }}{{ $t('worlds.settingsPage.sourceEditor.notices.bareTableDescription') }}</span>
                  </AlertDescription>
                </Alert>

                <Alert v-if="sourceError && sourceError.isLocationMismatch" variant="destructive">
                  <TriangleAlert />
                  <AlertTitle>{{ $t('worlds.settingsPage.sourceEditor.errors.locationMismatchTitle') }}</AlertTitle>
                  <AlertDescription>
                    {{ $t('worlds.settingsPage.sourceEditor.errors.locationMismatchDescription', {
                      expected: worldTypeLabel(sourceError.expectedWorldType || world.type),
                      actual: worldTypeLabel(sourceError.actualWorldType),
                      rawActual: sourceError.actualWorldType
                    }) }}
                  </AlertDescription>
                  <AlertAction v-if="matchingMismatchWorld">
                    <UiButton size="sm" variant="outline" @click="switchToMatchingWorldAndPaste(matchingMismatchWorld)">
                      {{ $t('worlds.settingsPage.sourceEditor.errors.switchAndApply', { world: matchingMismatchWorld.name }) }}
                    </UiButton>
                  </AlertAction>
                </Alert>

                <Alert v-else-if="sourceError" variant="destructive">
                  <TriangleAlert />
                  <AlertTitle>{{ $t('worlds.settingsPage.sourceEditor.errors.syntaxTitle') }}</AlertTitle>
                  <AlertDescription>
                    <p v-if="sourceErrorLocationLabel" class="source-error-location">{{ sourceErrorLocationLabel }}</p>
                    <p>{{ sourceErrorMessage }}</p>
                  </AlertDescription>
                </Alert>

                <div v-if="loadingSourceFiles && !sourceFilesLoadedForCurrentWorld" class="skeleton-stack">
                  <Skeleton v-for="index in 8" :key="index" class="skeleton-row" />
                </div>
                <AsyncConfigCodeEditor
                  v-else
                  :model-value="activeSourceContent"
                  :language="sourceFileTab === 'server-ini' ? 'ini' : 'lua'"
                  :read-only="configurationReadOnly"
                  :error-line="activeSourceErrorLine"
                  :error-column="activeSourceErrorColumn"
                  :placeholder="activeSourcePlaceholder"
                  :aria-label="sourceFileTab === 'server-ini' ? 'server.ini' : 'leveldataoverride.lua'"
                  @update:model-value="handleSourceEditorInput"
                  @import-file="importSourceFile"
                />
                <p v-if="sourceFileTab === 'leveldataoverride' && !configurationReadOnly" class="source-editor-hint">
                  {{ $t('worlds.settingsPage.sourceEditor.notices.commentsPreserved') }}
                </p>
              </div>

              <Tabs v-else v-model="worldSectionTab" orientation="horizontal" class="world-section-tabs">
                <div class="section-tabs-toolbar">
                  <TabsList variant="line" class="section-tab-list" :aria-label="$t('worlds.settingsPage.sectionAria')">
                    <TabsTrigger value="worldgen"><Sparkles />{{ $t('worlds.settingsPage.sections.worldgen') }}</TabsTrigger>
                    <TabsTrigger value="worldsettings"><SlidersHorizontal />{{ $t('worlds.settingsPage.sections.rules') }}</TabsTrigger>
                    <TabsTrigger value="server-ini"><ServerCog />{{ $t('worlds.settingsPage.sections.serverIni') }}</TabsTrigger>
                  </TabsList>
                  <div class="section-statuses">
                    <Badge v-if="configurationSourceLabel" variant="outline" class="runtime-source-badge">{{ configurationSourceLabel }}</Badge>
                    <Badge variant="outline" class="effect-badge">{{ currentEffectLabel }}</Badge>
                  </div>
                </div>

                <TabsContent value="worldgen">
                  <div v-if="loading && !getSettingsForWorld(world)" class="skeleton-stack">
                    <Skeleton v-for="index in 8" :key="index" class="skeleton-row" />
                  </div>
                  <world-settings-panel
                    v-else-if="getSettingsForWorld(world)"
                    :settings="getSettingsForWorld(world)"
                    :original-settings="originalSettings && originalSettings[world.type]"
                    :world-type="world.type"
                    :search-text="searchText"
                    show-group="WORLDGEN_GROUP"
                    :read-only="configurationReadOnly"
                    @setting-change="handleSettingChange"
                    @search-input="searchText = $event"
                  />
                  <Empty v-else>
                    <EmptyHeader><EmptyTitle>{{ $t('worlds.settingsPage.noWorldgen', { type: worldTypeLabel(world.type) }) }}</EmptyTitle></EmptyHeader>
                  </Empty>
                </TabsContent>

                <TabsContent value="worldsettings">
                  <div v-if="loading && !getSettingsForWorld(world)" class="skeleton-stack">
                    <Skeleton v-for="index in 8" :key="index" class="skeleton-row" />
                  </div>
                  <world-settings-panel
                    v-else-if="getSettingsForWorld(world)"
                    :settings="getSettingsForWorld(world)"
                    :original-settings="originalSettings && originalSettings[world.type]"
                    :world-type="world.type"
                    :search-text="searchText"
                    show-group="WORLDSETTINGS_GROUP"
                    :read-only="configurationReadOnly"
                    @setting-change="handleSettingChange"
                    @search-input="searchText = $event"
                  />
                  <Empty v-else>
                    <EmptyHeader><EmptyTitle>{{ $t('worlds.settingsPage.noRules', { type: worldTypeLabel(world.type) }) }}</EmptyTitle></EmptyHeader>
                  </Empty>
                </TabsContent>

                <TabsContent value="server-ini">
                  <div v-if="(loading || loadingServerIni) && !serverIni" class="skeleton-stack">
                    <Skeleton v-for="index in 6" :key="index" class="skeleton-row" />
                  </div>
                  <FieldGroup v-else-if="serverIni" class="server-ini-grid">
                    <Field>
                      <FieldLabel for="world-server-port">{{ $t('worlds.settingsPage.serverIni.serverPort') }}</FieldLabel>
                      <UiInput id="world-server-port" v-model.number="serverIni.network.server_port" type="number" min="1024" max="65535" :disabled="configurationReadOnly" @change="serverIniChanged = true" />
                    </Field>
                    <Field orientation="horizontal">
                      <FieldContent><FieldLabel for="world-is-master">{{ $t('worlds.settingsPage.serverIni.masterWorld') }}</FieldLabel><FieldDescription>{{ $t('worlds.settingsPage.serverIni.masterWorldDescription') }}</FieldDescription></FieldContent>
                      <Badge :variant="serverIni.shard.is_master ? 'default' : 'outline'">{{ $t(serverIni.shard.is_master ? 'worlds.roles.master' : 'worlds.roles.secondary') }}</Badge>
                    </Field>
                    <Field>
                      <FieldLabel for="world-shard-name">{{ $t('worlds.settingsPage.serverIni.worldName') }}</FieldLabel>
                      <UiInput id="world-shard-name" v-model="serverIni.shard.name" :disabled="configurationReadOnly" @input="serverIniChanged = true" />
                    </Field>
                    <Field :data-invalid="serverShardIdInvalid || undefined">
                      <FieldLabel for="world-shard-id">{{ $t('worlds.settingsPage.serverIni.worldId') }}</FieldLabel>
                      <UiInput id="world-shard-id" v-model.number="serverIni.shard.id" type="number" :min="serverShardIdMinimum" max="999" step="1" :aria-invalid="serverShardIdInvalid || undefined" :disabled="configurationReadOnly" @change="serverIniChanged = true" />
                      <FieldDescription>{{ $t(serverIni.shard.is_master ? 'worlds.settingsPage.serverIni.masterIdDescription' : 'worlds.settingsPage.serverIni.secondaryIdDescription') }}</FieldDescription>
                      <FieldError v-if="serverShardIdInvalid">{{ $t('worlds.settingsPage.feedback.invalidShardId', { min: serverShardIdMinimum }) }}</FieldError>
                    </Field>
                    <Field orientation="horizontal">
                      <FieldContent><FieldLabel for="world-encode-path">{{ $t('worlds.settingsPage.serverIni.encodePath') }}</FieldLabel><FieldDescription>{{ $t('worlds.settingsPage.serverIni.encodePathDescription') }}</FieldDescription></FieldContent>
                      <UiSwitch id="world-encode-path" v-model="serverIni.account.encode_user_path" :disabled="configurationReadOnly" @update:model-value="serverIniChanged = true" />
                    </Field>
                    <Field>
                      <FieldLabel for="world-master-port">{{ $t('worlds.settingsPage.serverIni.masterPort') }}</FieldLabel>
                      <UiInput id="world-master-port" v-model.number="serverIni.steam.master_server_port" type="number" min="1024" max="65535" :disabled="configurationReadOnly" @change="serverIniChanged = true" />
                    </Field>
                    <Field>
                      <FieldLabel for="world-auth-port">{{ $t('worlds.settingsPage.serverIni.authPort') }}</FieldLabel>
                      <UiInput id="world-auth-port" v-model.number="serverIni.steam.authentication_port" type="number" min="1024" max="65535" :disabled="configurationReadOnly" @change="serverIniChanged = true" />
                    </Field>
                    <div class="form-actions">
                      <UiButton @click="saveServerIni" :disabled="configurationReadOnly || savingServerIni || (!serverIniChanged && !(sourceBackedSave && isSourceServerIniModified))">
                        <Spinner v-if="savingServerIni" data-icon="inline-start" />{{ $t('worlds.settingsPage.serverIni.save') }}
                      </UiButton>
                      <UiButton variant="outline" @click="resetServerIni" :disabled="!serverIniChanged && !(sourceBackedSave && isSourceServerIniModified)">{{ $t('common.actions.reset') }}</UiButton>
                    </div>
                  </FieldGroup>
                  <Empty v-else>
                    <EmptyHeader><EmptyTitle>{{ $t('worlds.settingsPage.serverIni.empty') }}</EmptyTitle></EmptyHeader>
                  </Empty>
                </TabsContent>

              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Empty v-else-if="roomId && visibleWorlds.length === 0 && !loadError && !roomOptionsError">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Globe2 /></EmptyMedia>
          <EmptyTitle>{{ $t('worlds.settingsPage.noWorlds') }}</EmptyTitle>
          <EmptyDescription>{{ $t('worlds.settingsPage.noWorldsDescription') }}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><UiButton @click="showAddWorldDialog"><Plus data-icon="inline-start" />{{ $t('worlds.settingsPage.addWorld') }}</UiButton></EmptyContent>
      </Empty>

      <Empty v-else-if="!roomId && !roomOptionsError && !loadError">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Globe2 /></EmptyMedia>
          <EmptyTitle>{{ $t(roomOptions.length ? 'worlds.settingsPage.chooseRoom' : 'worlds.settingsPage.noRooms') }}</EmptyTitle>
          <EmptyDescription>{{ $t(roomOptions.length ? 'worlds.settingsPage.chooseRoomDescription' : 'worlds.settingsPage.noRoomsDescription') }}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <UiButton v-if="roomOptions.length" @click="requestRoomChange(roomOptions[0].id)">{{ $t('worlds.settingsPage.selectFirstRoom') }}</UiButton>
          <UiButton v-else @click="$router.push('/rooms/settings')">{{ $t('rooms.list.create') }}</UiButton>
        </EmptyContent>
      </Empty>

    </section>

    <div v-if="showWorldSettingsFooter" id="settings-fixed-footer">
      <settings-footer
        :has-changes="footerHasChanges"
        :loading="loading || (loadingSourceFiles && !sourceFilesLoadedForCurrentWorld)"
        :save-loading="saveLoading"
        :changed-items="getFooterChangedItems()"
        :read-only="configurationReadOnly"
        @save="saveSettings"
        @reset="resetSettings"
      />
    </div>

    <UiDialog v-model:open="addWorldDialogVisible">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ $t('worlds.settingsPage.addDialog.title') }}</DialogTitle><DialogDescription>{{ $t('worlds.settingsPage.addDialog.description') }}</DialogDescription></DialogHeader>
        <Alert v-if="roomHasRunningWorld" variant="destructive"><TriangleAlert /><AlertTitle>{{ $t('worlds.settingsPage.addDialog.stopTitle') }}</AlertTitle><AlertDescription>{{ $t('worlds.settingsPage.addDialog.stopDescription') }}</AlertDescription></Alert>
        <FieldGroup>
          <Field><FieldLabel for="new-world-name">{{ $t('worlds.settingsPage.addDialog.name') }}</FieldLabel><UiInput id="new-world-name" v-model="newWorld.name" :placeholder="$t('worlds.settingsPage.addDialog.namePlaceholder')" /></Field>
          <Field>
            <FieldLabel>{{ $t('worlds.settingsPage.addDialog.type') }}</FieldLabel>
            <UiSelect v-model="newWorld.type" @update:model-value="handleWorldTypeChange">
              <SelectTrigger><SelectValue :placeholder="$t('worlds.settingsPage.addDialog.typePlaceholder')" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="forest">{{ worldTypeLabel('forest') }}</SelectItem><SelectItem value="cave">{{ worldTypeLabel('cave') }}</SelectItem></SelectGroup></SelectContent>
            </UiSelect>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" @click="addWorldDialogVisible = false">{{ $t('common.actions.cancel') }}</UiButton>
          <UiButton @click="addWorld" :disabled="addWorldLoading || roomHasRunningWorld">
            <Spinner v-if="addWorldLoading" data-icon="inline-start" />{{ $t('worlds.settingsPage.addDialog.create') }}
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>

    <UiDialog v-model:open="deleteWorldDialogVisible">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ $t('worlds.settingsPage.deleteDialog.title') }}</DialogTitle>
          <DialogDescription>{{ $t('worlds.settingsPage.deleteDialog.description', { world: worldToDelete ? worldToDelete.name : '' }) }}</DialogDescription>
        </DialogHeader>
        <Alert variant="destructive"><TriangleAlert /><AlertTitle>{{ $t('worlds.settingsPage.deleteDialog.confirmTitle') }}</AlertTitle><AlertDescription>{{ $t('worlds.settingsPage.deleteDialog.confirmDescription') }}</AlertDescription></Alert>
        <DialogFooter>
          <UiButton variant="outline" @click="deleteWorldDialogVisible = false">{{ $t('common.actions.cancel') }}</UiButton>
          <UiButton variant="destructive" @click="deleteWorld" :disabled="deleteWorldLoading || worldToDelete?.status === 'running'">
            <Spinner v-if="deleteWorldLoading" data-icon="inline-start" />{{ $t('worlds.settingsPage.deleteDialog.delete') }}
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </UiDialog>
  </div>
</template>

<script>
import RoomScopeSelect from '@/components/layout/RoomScopeSelect.vue'
import AsyncConfigCodeEditor from '@/components/editor/AsyncConfigCodeEditor'
import {
  extractConfigEditorError,
  findMatchingWorldForLocation,
  legacyIniFromServerConfig,
  serverConfigFromLegacyIni
} from '@/lib/configEditorSupport.mjs';
import { preferredRoomId } from '@/lib/pageScope.mjs';
import { Check, ClipboardPaste, Copy, Download, FileCode2, Globe2, Info, Moon, Package, Plus, RefreshCw, ServerCog, SlidersHorizontal, Sparkles, Sun, Trash2, TriangleAlert, Upload, WandSparkles } from '@lucide/vue';
import { toast } from 'vue-sonner';
import WorldSettingsPanel from '@/components/worlds/WorldSettingsPanel.vue';
import SettingsFooter from '@/components/worlds/SettingsFooter.vue';
import api from '@/api';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input as UiInput } from '@/components/ui/input';
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { confirmAction } from '@/lib/feedback';
import { applyWorldSettingsLabels, worldSettingsCatalogPath } from '@/lib/worldSettingsLocale.mjs';
import { compareWorldRoles } from '@/lib/worldRuntimeStatus.mjs';

export default {
  inject: { machineScopeGuard: { from: 'machine-scope-guard', default: null } },
  name: 'WorldSettings',
  components: {
    RoomScopeSelect,
    AsyncConfigCodeEditor,
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    Badge,
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
    Check,
    ClipboardPaste,
    Copy,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Download,
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    Field,
    FieldContent,
    FieldError,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FileCode2,
    Globe2,
    Info,
    Moon,
    Package,
    Plus,
    RefreshCw,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    ServerCog,
    SettingsFooter,
    SlidersHorizontal,
    Skeleton,
    Sparkles,
    Spinner,
    Sun,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    ToggleGroup,
    ToggleGroupItem,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    Trash2,
    TriangleAlert,
    UiButton,
    UiDialog,
    UiInput,
    UiSelect,
    UiSwitch,
    Upload,
    WandSparkles,
    WorldSettingsPanel
  },
  data() {
    return {
      activeTab: 'forest',
      worldSectionTab: 'worldgen',
      editorMode: 'visual',
      sourceFileTab: 'leveldataoverride',
      loadingSourceFiles: false,
      sourceModeSwitching: false,
      sourceValidating: false,
      sourceFormatting: false,
      sourceFilesWorldName: '',
      sourceFilesRevision: '',
      sourceBaselineLeveldata: '',
      sourceBaselineServerIni: '',
      sourceDraftLeveldata: '',
      sourceDraftServerIni: '',
      sourcePreviewChanges: [],
      sourceNotices: [],
      sourceError: null,
      sourceBackedSave: false,
      sourceSyncedOverrides: null,
      pendingTransferredLua: null,
      sourceFileInputEl: null,
      sourceValidateTimer: null,
      sourceLoadEpoch: 0,
      forestSettings: null,
      caveSettings: null,
      originalSettings: null,
      loading: true,
      initializingPage: true,
      switchingRoom: false,
      disposed: false,
      loadError: '',
      saveLoading: false,
      searchText: '',
      hasChanges: false,
      descriptionCache: {},
      itemOptionsCache: {},
      changedItemsCache: null,
      checkChangesTimer: null,
      loadedSelects: {},  // 用于跟踪哪些select已经加载了选项
      categoryPathCache: {}, // 用于缓存设置项路径
      defaultValueCache: {}, // 用于缓存默认值
      virtualScrollState: {}, // 虚拟滚动状态
      renderQueue: [], // 渲染队列
      scrollContainer: null,
      debouncedScrollHandler: null,
      windowSize: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      // 添加房间相关数据
      roomId: null,
      roomName: null,
      roomOptions: [],
      selectedRoomId: '',
      loadingRooms: true,
      roomOptionsError: '',
      roomWorlds: [],
      hasForestWorld: false,
      hasCaveWorld: false,
      worldOverrides: {}, // 存储每个世界的自定义配置
      worldOriginalSettings: {}, // 存储各世界从服务器加载后的真实基线
      worldConfigurationMeta: {},
      worldLoadErrors: {},
      loadedWorldConfigs: {}, // 用于跟踪已加载的世界配置
      initializingWorlds: false,
      initialWorldId: '',
      previousActiveTab: '',
      configurationLoadEpoch: 0,
      // 新增世界相关
      addWorldDialogVisible: false,
      newWorld: {
        name: '',
        type: 'forest'
      },
      addWorldLoading: false,
      // 删除世界相关
      deleteWorldDialogVisible: false,
      worldToDelete: null,
      deleteWorldLoading: false,
      // 基础配置相关
      serverIni: null,
      serverIniOriginal: null,
      loadingServerIni: false,
      savingServerIni: false,
      serverIniChanged: false,
      pendingWorldSettings: null,
      pendingWorldType: null,
      isNewWorldConfig: false,
      settingsLocaleEpoch: 0,
      // 世界类型变更处理
      handleWorldTypeChange: () => {}
    }
  },
  created() {
    // 从URL参数中获取房间ID和名称
    const { roomId, id, roomName, worldId } = this.$route.query;
    this.roomId = roomId || id || null;
    this.roomName = roomName || '';
    this.initialWorldId = String(worldId || '');
    this.initializePage();
    
    // 添加防抖的全局点击事件处理
    this.debouncedGlobalClick = this.debounce(this.handleGlobalClick, 50);
    document.addEventListener('click', this.debouncedGlobalClick);
    
    // 添加窗口大小变化监听
    this.debouncedResize = this.debounce(this.handleResize, 150);
    window.addEventListener('resize', this.debouncedResize);
  },
  beforeUnmount() {
    this.disposed = true;
    this.configurationLoadEpoch += 1;
    this.sourceLoadEpoch += 1;
    if (this.machineScopeGuard?.check === this.confirmMachineScopeChange) this.machineScopeGuard.check = async () => true;
    // 清理事件监听器
    document.removeEventListener('click', this.debouncedGlobalClick);
    window.removeEventListener('resize', this.debouncedResize);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    if (this.scrollContainer && this.debouncedScrollHandler) {
      this.scrollContainer.removeEventListener('scroll', this.debouncedScrollHandler);
    }
    
    // 清理所有定时器
    if (this.checkChangesTimer) {
      clearTimeout(this.checkChangesTimer);
    }
    if (this.sourceValidateTimer) {
      clearTimeout(this.sourceValidateTimer);
    }
    if (this._closeDropdownTimer) {
      clearTimeout(this._closeDropdownTimer);
    }
    if (this._renderTimer) {
      clearTimeout(this._renderTimer);
    }
    
    // 清空缓存减少内存占用
    this.descriptionCache = null;
    this.itemOptionsCache = null;
    this.changedItemsCache = null;
    this.categoryPathCache = null;
    this.defaultValueCache = null;
    this.loadedSelects = null;
  },
  watch: {
    '$i18n.locale'(locale) {
      this.updateWorldSettingsLocale(locale);
    },
    '$route.query'(query) {
      if (this.disposed || this.initializingPage || this.switchingRoom || this.initializingWorlds) return;
      const nextRoomId = String(query?.roomId || query?.id || '');
      const nextWorldId = String(query?.worldId || '');
      if (nextRoomId && nextRoomId !== String(this.roomId || '')) {
        if (this.roomOptions.some(room => room.id === nextRoomId)) {
          this.initialWorldId = nextWorldId;
          this.requestRoomChange(nextRoomId, { preserveQueryWorldId: Boolean(nextWorldId) });
        }
        return;
      }
      if (nextWorldId) {
        const matchedWorld = this.sortedRoomWorlds.find(world =>
          [String(world.id || ''), String(world.name || ''), String(world.directoryName || '')].includes(nextWorldId)
        );
        if (matchedWorld && matchedWorld.name !== this.activeTab) {
          this.requestWorldTab(matchedWorld.name);
        }
      }
    },
    activeTab(newTab) {
      if (this.initializingWorlds) return;
      // 切换标签页时，清空变更缓存和跨世界 server.ini / 源码临时状态
      this.changedItemsCache = null;
      this.hasChanges = false;
      this.serverIni = null;
      this.serverIniOriginal = null;
      this.serverIniChanged = false;
      this.resetWorldSourceState({ preserveMode: true, preserveTransferred: true });
      
      // 加载当前选中世界的配置
      const currentWorld = this.roomWorlds.find(world => world.name === newTab);
      if (currentWorld && this.roomName) {
        // 如果世界类型是未知的，弹出对话框让用户选择
        if (currentWorld.type === 'unknown' || !currentWorld.type) {
          confirmAction(this.$t('worlds.settingsPage.feedback.unknownType'), this.$t('worlds.settingsPage.feedback.selectType'), {
            confirmButtonText: this.$t('worlds.settingsPage.feedback.forestWorld'),
            cancelButtonText: this.$t('worlds.settingsPage.feedback.caveWorld'),
            type: 'warning',
            center: true,
            distinguishCancelAndClose: true,
            closeOnClickModal: false
          }).then(() => {
            // 用户选择了森林世界
            currentWorld.type = 'forest';
            // 更新世界类型标志
            this.hasForestWorld = true;
            // 加载该世界的配置
            this.loadWorldConfig(currentWorld);
          }).catch(action => {
            if (action === 'cancel') {
              // 用户选择了洞穴世界
              currentWorld.type = 'cave';
              // 更新世界类型标志
              this.hasCaveWorld = true;
              // 加载该世界的配置
              this.loadWorldConfig(currentWorld);
            } else {
              // 用户关闭了对话框，回到先前的标签页
              const previousTab = this.previousActiveTab;
              this.$nextTick(() => {
                if (previousTab) this.activeTab = previousTab;
              });
            }
          });
          return;
        }

        const cachedBaseline = this.worldOriginalSettings[currentWorld.name];
        if (cachedBaseline) {
          const targetSettings = currentWorld.type === 'cave' ? this.caveSettings : this.forestSettings;
          this.applySettingsValues(targetSettings, cachedBaseline);
        }

        this.previousActiveTab = newTab;
        this.syncWorldRoute(currentWorld);
        
        // 每次切换标签页都重新加载该世界的配置
        this.loading = true;
        const loading = this.loadWorldConfiguration(this.roomName, currentWorld.name);
        const loadEpoch = this.configurationLoadEpoch;
        loading
          .finally(() => {
            if (this.disposed || loadEpoch !== this.configurationLoadEpoch) return;
            // 更新已加载配置标记
            if (!this.loadedWorldConfigs) {
              this.loadedWorldConfigs = {};
            }
            this.loadedWorldConfigs[`${this.roomName}_${currentWorld.name}`] = true;
            this.loading = false;
          });
      }
      
      // 重新检查变更
      this.debouncedCheckChanges();
      
      // 重新初始化视图
      this.$nextTick(() => {
        this.optimizeInitialRendering();
        this.setupScrollListeners();
      });
    },
    searchText() {
      // 搜索文本变化时，重置虚拟滚动状态
      this.virtualScrollState = {};
      
      // 重新初始化视图
      this.$nextTick(() => {
        this.optimizeInitialRendering();
      });
    }
  },
  mounted() {
    if (this.machineScopeGuard) this.machineScopeGuard.check = this.confirmMachineScopeChange;
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    // 优化页面初始渲染
    this.$nextTick(() => {
      window.requestAnimationFrame(() => {
        this.optimizeInitialRendering();
        this.setupScrollListeners();
      });
    });
  },
  updated() {
    // 在组件更新后，确保select组件显示正确的值
    this.$nextTick(() => {
      this.updateVisibleSelectLabels();
    });
  },
  computed: {
    serverShardIdMinimum() {
      return this.serverIni?.shard?.is_master ? 0 : 1;
    },
    serverShardIdInvalid() {
      const raw = this.serverIni?.shard?.id;
      const id = Number(raw);
      return raw == null || String(raw).trim() === '' || !Number.isInteger(id) || id < this.serverShardIdMinimum || id > 999;
    },
    // 当前活动设置
    activeSettings() {
      // 检查当前选中的标签页对应的世界类型
      const selectedWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      if (selectedWorld) {
        // 明确处理未知类型，避免默认为洞穴类型
        if (selectedWorld.type === 'unknown' || !selectedWorld.type) {
          return this.forestSettings; // 暂时返回森林设置，等待用户选择
        }
        return selectedWorld.type === 'forest' ? this.forestSettings : this.caveSettings;
      }
      // 如果没找到世界或使用默认标签页，则按照标签名确定
      return this.activeTab === 'forest' ? this.forestSettings : this.caveSettings;
    },
    
    // 过滤后的森林设置
    filteredForestSettings() {
      if (!this.forestSettings || !this.searchText) return this.forestSettings;
      return this.filterSettings(this.forestSettings);
    },
    
    // 过滤后的洞穴设置
    filteredCaveSettings() {
      if (!this.caveSettings || !this.searchText) return this.caveSettings;
      return this.filterSettings(this.caveSettings);
    },
    
    // 计算当前显示的设置
    currentFilteredSettings() {
      // 检查当前选中的标签页对应的世界类型
      const selectedWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      if (selectedWorld) {
        // 明确处理未知类型，避免默认为洞穴类型
        if (selectedWorld.type === 'unknown' || !selectedWorld.type) {
          return this.filteredForestSettings; // 暂时返回森林设置，等待用户选择
        }
        return selectedWorld.type === 'forest' ? this.filteredForestSettings : this.filteredCaveSettings;
      }
      // 如果没找到世界或使用默认标签页，则按照标签名确定
      return this.activeTab === 'forest' ? this.filteredForestSettings : this.filteredCaveSettings;
    },
    
    currentWorld() {
      return this.visibleWorlds.find(world => world.name === this.activeTab) || this.visibleWorlds[0] || null;
    },

    activeWorldHasBaseline() {
      return Boolean(this.currentWorld && this.worldOriginalSettings[this.currentWorld.name]);
    },

    activeConfigurationSync() {
      return this.currentWorld ? this.worldConfigurationMeta[this.currentWorld.name]?.sync || null : null;
    },

    configurationReadOnly() {
      return Boolean(this.activeConfigurationSync?.readOnly);
    },

    configurationSourceLabel() {
      const sync = this.activeConfigurationSync;
      if (!sync || sync.source !== 'runtime-disk') return '';
      const target = [sync.targetId, sync.installationId].filter(Boolean).join(' / ');
      return this.$t('worlds.settingsPage.runtimeSource', { target: target || this.$t('worlds.settingsPage.runtimeSourceCurrent') });
    },

    currentEffectLabel() {
      if (this.editorMode === 'source') {
        if (this.sourceFileTab === 'server-ini') {
          return this.$t('worlds.settingsPage.effects.restart');
        }
        return this.$t(this.worldSectionTab === 'worldgen'
          ? 'worlds.settingsPage.effects.regeneration'
          : 'worlds.settingsPage.effects.restart');
      }
      return this.$t(this.worldSectionTab === 'worldgen'
        ? 'worlds.settingsPage.effects.regeneration'
        : 'worlds.settingsPage.effects.restart');
    },

    sourceFilesLoadedForCurrentWorld() {
      return Boolean(this.currentWorld && this.sourceFilesWorldName === this.currentWorld.name && this.sourceFilesRevision);
    },

    isSourceLeveldataModified() {
      return Boolean(this.sourceFilesLoadedForCurrentWorld && this.sourceDraftLeveldata !== this.sourceBaselineLeveldata);
    },

    isSourceServerIniModified() {
      return Boolean(this.sourceFilesLoadedForCurrentWorld && this.sourceDraftServerIni !== this.sourceBaselineServerIni);
    },

    hasSourceChanges() {
      return Boolean(this.isSourceLeveldataModified || this.isSourceServerIniModified);
    },

    footerHasChanges() {
      if (this.editorMode === 'source') {
        return Boolean(this.hasSourceChanges || this.hasChanges || this.serverIniChanged);
      }
      return Boolean(this.hasChanges || (this.sourceBackedSave && (this.hasSourceChanges || this.serverIniChanged)));
    },

    sourceBusy() {
      return Boolean(
        this.loading
        || this.loadingSourceFiles
        || this.saveLoading
        || this.sourceModeSwitching
        || this.sourceValidating
        || this.sourceFormatting
      );
    },

    activeSourceContent() {
      return this.sourceFileTab === 'server-ini' ? this.sourceDraftServerIni : this.sourceDraftLeveldata;
    },

    activeSourcePlaceholder() {
      return this.$t(this.sourceFileTab === 'server-ini'
        ? 'worlds.settingsPage.sourceEditor.placeholders.serverIni'
        : 'worlds.settingsPage.sourceEditor.placeholders.leveldataoverride');
    },

    activeSourceErrorMatchesTab() {
      if (!this.sourceError) return false;
      if (this.sourceError.file === 'server.ini') return this.sourceFileTab === 'server-ini';
      if (this.sourceError.file === 'leveldataoverride.lua') return this.sourceFileTab === 'leveldataoverride';
      return true;
    },

    activeSourceErrorLine() {
      return this.activeSourceErrorMatchesTab ? (Number(this.sourceError?.line) || 0) : 0;
    },

    activeSourceErrorColumn() {
      return this.activeSourceErrorMatchesTab ? (Number(this.sourceError?.column) || 0) : 0;
    },

    hasKleiHeaderNotice() {
      return this.sourceFileTab === 'leveldataoverride' && Array.isArray(this.sourceNotices) && this.sourceNotices.includes('stripped_klei_header');
    },

    hasBareTableNotice() {
      return this.sourceFileTab === 'leveldataoverride' && Array.isArray(this.sourceNotices) && this.sourceNotices.includes('wrapped_bare_table');
    },

    matchingMismatchWorld() {
      if (!this.sourceError?.isLocationMismatch) return null;
      return findMatchingWorldForLocation(this.visibleWorlds, this.sourceError.actualWorldType, this.currentWorld?.name);
    },

    sourceErrorLocationLabel() {
      if (!this.sourceError || !this.sourceError.line) return '';
      const file = this.sourceError.file || (this.sourceFileTab === 'server-ini' ? 'server.ini' : 'leveldataoverride.lua');
      if (this.sourceError.column) {
        return this.$t('worlds.settingsPage.sourceEditor.errors.syntaxLocation', {
          file,
          line: this.sourceError.line,
          column: this.sourceError.column
        });
      }
      return this.$t('worlds.settingsPage.sourceEditor.errors.syntaxLineOnly', {
        file,
        line: this.sourceError.line
      });
    },

    sourceErrorMessage() {
      if (!this.sourceError) return '';
      if (this.sourceError.isTooLarge) {
        return this.$t('worlds.settingsPage.sourceEditor.errors.tooLarge');
      }
      if (this.sourceError.isRevisionConflict) {
        return this.$t('worlds.settingsPage.feedback.revisionConflict');
      }
      return this.sourceError.rawMessage || this.$t('common.errors.unknown');
    },

    showPageSkeleton() {
      return Boolean(
        this.initializingPage
        || this.switchingRoom
        || (!this.originalSettings && this.loading)
        || (this.loadingRooms && (!this.roomId || this.visibleWorlds.length === 0))
        || (this.roomId && this.visibleWorlds.length === 0 && this.loading)
      );
    },

    showWorldSettingsFooter() {
      return Boolean(
        !this.showPageSkeleton
        && (this.activeWorldHasBaseline || this.sourceFilesLoadedForCurrentWorld)
        && (
          this.editorMode === 'source'
          || ['worldgen', 'worldsettings'].includes(this.worldSectionTab)
          || (this.sourceBackedSave && (this.isSourceLeveldataModified || this.hasChanges))
        )
      );
    },

    roomHasRunningWorld() {
      return this.roomWorlds.some(world => world.status === 'running');
    },

    visibleWorlds() {
      return this.roomWorlds.length > 0 ? this.sortedRoomWorlds : [];
    },

    sortedRoomWorlds() {
      return this.roomWorlds.slice().sort((a, b) => {
        const roleOrder = compareWorldRoles(a, b);
        if (roleOrder !== 0) return roleOrder;

        // 从名称中提取数字部分
        const numA = parseInt(a.name.replace(/[^\d]/g, '') || '0', 10);
        const numB = parseInt(b.name.replace(/[^\d]/g, '') || '0', 10);
        
        // 如果数字部分相同，按名称排序
        if (numA === numB) {
          return a.name.localeCompare(b.name);
        }
        
        // 按数字部分排序
        return numA - numB;
      });
    }
  },
  methods: {
    async confirmMachineScopeChange() {
      if (this.saveLoading || this.savingServerIni || this.sourceModeSwitching) return false;
      if (!(await this.confirmDiscardWorldChanges())) return false;
      this.hasChanges = false;
      this.serverIniChanged = false;
      this.resetWorldSourceDraftsToBaseline();
      return true;
    },
    handleBeforeUnload(event) {
      if (!this.hasChanges && !this.serverIniChanged && !this.hasSourceChanges) return;
      event.preventDefault();
      event.returnValue = '';
    },
    async confirmDiscardWorldChanges() {
      if (!this.hasChanges && !this.serverIniChanged && !this.hasSourceChanges) return true;
      try {
        await confirmAction(this.$t('worlds.settingsPage.leave.description'), this.$t('worlds.settingsPage.leave.title'), {
          confirmButtonText: this.$t('worlds.settingsPage.leave.discard'),
          cancelButtonText: this.$t('worlds.settingsPage.leave.continue'),
          type: 'warning'
        });
        return true;
      } catch {
        return false;
      }
    },
    async initializePage() {
      this.initializingPage = true;
      this.loading = true;
      try {
        const [catalogResult, roomsResult] = await Promise.allSettled([
          this.fetchWorldSettings({ manageLoading: false }),
          this.fetchRoomOptions({ syncRoute: false })
        ]);
        if (this.disposed) return;
        if (catalogResult.status === 'fulfilled' && roomsResult.status === 'fulfilled' && roomsResult.value) {
          if (this.roomId) {
            await this.loadRoomWorlds({ prefetchedRooms: this.roomOptions });
          }
        } else if (roomsResult.status === 'fulfilled' && roomsResult.value && this.roomId) {
          const selectedRoom = this.roomOptions.find(r => r.id === this.roomId || r.name === this.roomName);
          if (selectedRoom && Array.isArray(selectedRoom.worlds)) {
            this.roomWorlds = selectedRoom.worlds;
          }
          this.syncWorldRoute(this.sortedRoomWorlds[0] || null);
        }
      } finally {
        if (!this.disposed) {
          this.initializingPage = false;
          this.loading = false;
        }
      }
    },
    resetRoomWorldState() {
      this.configurationLoadEpoch += 1;
      this.roomWorlds = [];
      this.hasForestWorld = false;
      this.hasCaveWorld = false;
      this.worldOverrides = {};
      this.worldOriginalSettings = {};
      this.worldConfigurationMeta = {};
      this.worldLoadErrors = {};
      this.loadedWorldConfigs = {};
      this.activeTab = '';
      this.previousActiveTab = '';
      this.serverIni = null;
      this.serverIniOriginal = null;
      this.loadingServerIni = false;
      this.serverIniChanged = false;
      this.hasChanges = false;
      this.changedItemsCache = null;
      this.loadError = '';
      this.resetWorldSourceState({ preserveMode: false, preserveTransferred: false });
    },
    async requestWorldTab(tab) {
      if (!tab || tab === this.activeTab) return;
      if (!(await this.confirmDiscardWorldChanges())) {
        this.syncWorldRoute(this.currentWorld);
        return;
      }
      this.previousActiveTab = this.activeTab;
      this.activeTab = tab;
    },
    async requestRoomChange(roomId, options = {}) {
      if (!roomId || roomId === this.roomId) return;
      if (!(await this.confirmDiscardWorldChanges())) {
        this.selectedRoomId = this.roomId || '';
        this.syncWorldRoute(this.currentWorld);
        return;
      }
      await this.handleRoomChange(roomId, options);
    },
    async requestReloadSettings() {
      if (await this.confirmDiscardWorldChanges()) await this.reloadSettings();
    },
    syncWorldRoute(targetWorld) {
      if (!this.roomId) return Promise.resolve();
      const world = targetWorld || { id: undefined };
      const nextRoute = {
        path: this.$route.path,
        query: { ...this.$route.query, roomId: this.roomId, worldId: world.id }
      };
      delete nextRoute.query.id;
      delete nextRoute.query.roomName;
      if (!world.id) delete nextRoute.query.worldId;
      const currentQuery = this.$route.query || {};
      const sameRoom = String(currentQuery.roomId || '') === String(this.roomId);
      const sameWorld = String(currentQuery.worldId || '') === String(world.id || '');
      const hasLegacyKeys = 'id' in currentQuery || 'roomName' in currentQuery || (!world.id && 'worldId' in currentQuery);
      if (sameRoom && sameWorld && !hasLegacyKeys) return Promise.resolve();
      return this.$router.replace(nextRoute).catch(() => {});
    },
    worldTypeLabel(type) {
      if (type === 'forest') return this.$t('worldRuntime.types.forest');
      if (type === 'cave') return this.$t('worldRuntime.types.cave');
      return this.$t('worldRuntime.types.unknown');
    },
    async fetchRoomOptions({ syncRoute = true } = {}) {
      this.loadingRooms = true;
      this.roomOptionsError = '';
      try {
        const response = await api.worldApi.getWorldList();
        if (this.disposed) return false;
        this.roomOptions = Array.isArray(response.data) ? response.data : [];
        const wanted = preferredRoomId(this.roomOptions, this.roomId || this.roomName || undefined);
        const selected = this.roomOptions.find(room => room.id === wanted);
        const query = { ...this.$route.query };
        const hasLegacyRoomQuery = ['id', 'roomName'].some(key => key in query);
        delete query.id;
        delete query.roomName;
        if (selected) {
          this.roomId = selected.id;
          this.roomName = selected.name;
          this.selectedRoomId = selected.id;
          if (syncRoute && (hasLegacyRoomQuery || query.roomId !== selected.id)) {
            query.roomId = selected.id;
            await this.$router.replace({ path: this.$route.path, query });
          }
        } else {
          this.roomId = null;
          this.roomName = '';
          this.selectedRoomId = '';
          this.resetRoomWorldState();
          if (hasLegacyRoomQuery || 'roomId' in query || 'worldId' in query) {
            delete query.roomId;
            delete query.worldId;
            await this.$router.replace({ path: this.$route.path, query });
          }
        }
        return true;
      } catch (error) {
        if (this.disposed) return false;
        this.roomOptions = [];
        this.selectedRoomId = '';
        this.roomOptionsError = error.message || this.$t('worlds.settingsPage.feedback.roomDirectoryReadFailed');
        return false;
      } finally {
        if (!this.disposed) {
          this.loadingRooms = false;
        }
      }
    },
    async retryRoomOptions() {
      this.switchingRoom = true;
      this.loading = true;
      try {
        const loaded = await this.fetchRoomOptions({ syncRoute: false });
        if (loaded && this.roomId) {
          await this.loadRoomWorlds({ prefetchedRooms: this.roomOptions });
        }
      } finally {
        if (!this.disposed) {
          this.switchingRoom = false;
          this.loading = false;
        }
      }
    },
    async handleRoomChange(roomId, { preserveQueryWorldId = false } = {}) {
      const room = this.roomOptions.find(item => item.id === roomId);
      if (!room) return;
      this.switchingRoom = true;
      this.loading = true;
      this.roomId = room.id;
      this.roomName = room.name;
      this.selectedRoomId = room.id;
      this.resetRoomWorldState();
      try {
        await this.loadRoomWorlds({
          ignoreRouteWorld: !preserveQueryWorldId
        });
      } finally {
        if (!this.disposed) {
          this.switchingRoom = false;
        }
      }
    },
    getSettingsForWorld(world) {
      if (!this.worldOriginalSettings[world.name]) return null;
      return world.type === 'cave' ? this.filteredCaveSettings : this.filteredForestSettings;
    },
    openWorldMods(world) {
      this.$router.push({
        path: '/mods',
        query: {
          tab: 'room',
          roomId: this.roomId || this.$route.query.roomId || undefined,
          worldId: world?.id || undefined
        }
      });
    },
    
    // 加载房间世界列表
    loadRoomWorlds(options = {}) {
      if (!this.roomId) return Promise.resolve(null);
      const normalized = Array.isArray(options)
        ? { prefetchedRooms: options, ignoreRouteWorld: false }
        : (options || {});
      const { prefetchedRooms = null, ignoreRouteWorld = false } = normalized;

      this.loading = true;
      this.loadError = '';

      const roomListPromise = Array.isArray(prefetchedRooms)
        ? Promise.resolve({ data: prefetchedRooms })
        : api.worldApi.getWorldList();

      return roomListPromise
        .then(response => {
          if (this.disposed) return null;
          const rooms = Array.isArray(response?.data) ? response.data : [];
          if (!Array.isArray(prefetchedRooms) && rooms.length > 0) {
            this.roomOptions = rooms;
          }
          const room = rooms.find(r => r.id === this.roomId || r.name === this.roomName);
          if (!room || !Array.isArray(room.worlds)) {
            throw new Error(this.$t('worlds.settingsPage.feedback.roomWorldsInvalid'));
          }
          this.roomId = room.id;
          this.roomName = room.name;
          this.selectedRoomId = room.id;
          this.roomWorlds = room.worlds;
          this.hasForestWorld = this.roomWorlds.some(world => world.type === 'forest');
          this.hasCaveWorld = this.roomWorlds.some(world => world.type === 'cave');
          if (this.roomWorlds.length === 0) {
            this.activeTab = 'forest';
            this.syncWorldRoute(null);
            return null;
          }

          const requestedWorldId = ignoreRouteWorld
            ? String(this.initialWorldId || '')
            : String(this.$route.query.worldId || this.initialWorldId || '');
          const firstWorld = this.sortedRoomWorlds.find(world =>
            Boolean(requestedWorldId) && [String(world.id || ''), String(world.name || ''), String(world.directoryName || '')].includes(requestedWorldId)
          ) || this.sortedRoomWorlds[0];
          this.initialWorldId = '';
          this.initializingWorlds = true;
          this.activeTab = firstWorld.name;
          this.previousActiveTab = firstWorld.name;
          this.syncWorldRoute(firstWorld);
          return this.$nextTick()
            .then(() => {
              this.initializingWorlds = false;
              if (this.disposed) return null;
              return this.loadWorldConfiguration(this.roomName, firstWorld.name);
            });
        })
        .catch(error => {
          if (this.disposed) return null;
          this.syncWorldRoute(null);
          this.loadError = error.message || this.$t('worlds.settingsPage.feedback.roomWorldsReadFailed');
          toast.error(this.$t('worlds.settingsPage.feedback.roomWorldsLoadFailed', {
            error: error.message || this.$t('common.errors.unknown')
          }));
          return null;
        })
        .finally(() => {
          this.initializingWorlds = false;
          if (!this.disposed && !this.initializingPage) {
            this.loading = false;
          }
        });
    },
    
    // 加载世界的自定义配置
    loadWorldOverrides(savename, worldname) {
      if (!savename || !worldname) return Promise.resolve();
      
      // 确定世界类型
      const world = this.roomWorlds.find(item => item.name === worldname);
      const worldType = world?.type === 'cave' ? 'cave' : 'forest';

      return api.worldApi.getWorldOverrides(savename, worldname)
      .then(response => {
        const worldOverridesData = response.data || {};
        this.applyWorldOverrides(worldOverridesData, worldType, worldname);
        if (!this.loadedWorldConfigs) {
          this.loadedWorldConfigs = {};
          }
        this.loadedWorldConfigs[`${savename}_${worldname}`] = true;
        return worldOverridesData;
      })
      .catch(error => {
        this.worldLoadErrors = { ...this.worldLoadErrors, [worldname]: error.message || String(error) };
        this.loadError = error.message || this.$t('worlds.settingsPage.feedback.overridesLoadFailed', { world: worldname });
        toast.error(this.$t('worlds.settingsPage.feedback.overridesLoadError', {
          world: worldname,
          error: error.message || this.$t('common.errors.unknown')
        }));
        return null;
      });
    },

    loadWorldConfiguration(savename, worldname) {
      if (!savename || !worldname) return Promise.resolve(null);
      const loadEpoch = ++this.configurationLoadEpoch;
      const world = this.roomWorlds.find(item => item.name === worldname);
      const worldType = world?.type === 'cave' ? 'cave' : 'forest';
      this.loadingServerIni = true;

      return api.worldApi.getWorldConfiguration(savename, worldname, {
        roomId: this.roomId, worldId: world?.id
      })
        .then(async response => {
          if (loadEpoch !== this.configurationLoadEpoch || this.roomName !== savename || this.activeTab !== worldname) return null;
          const configuration = response.data || {};
          this.applyWorldOverrides(configuration.overrides || {}, worldType, worldname);
          this.serverIni = configuration.serverIni || null;
          this.serverIniOriginal = this.serverIni ? JSON.parse(JSON.stringify(this.serverIni)) : null;
          this.serverIniChanged = false;
          this.worldConfigurationMeta = {
            ...this.worldConfigurationMeta,
            [worldname]: {
              revision: configuration.revision || '',
              modifiedAt: configuration.modifiedAt || '',
              sync: configuration.sync || null
            }
          };
          if (this.sourceBackedSave) {
            this.sourceBackedSave = false;
            this.sourceSyncedOverrides = null;
          }
          if (this.sourceError) {
            this.sourceError = null;
          }
          if (this.sourceNotices?.length) {
            this.sourceNotices = [];
          }
          const errors = { ...this.worldLoadErrors };
          delete errors[worldname];
          this.worldLoadErrors = errors;
          this.loadError = '';
          this.loadedWorldConfigs[`${savename}_${worldname}`] = true;
          if (this.editorMode === 'source' && typeof this.loadActiveWorldSourceFiles === 'function') {
            await this.loadActiveWorldSourceFiles(world);
          } else if (this.sourceFilesWorldName === worldname) {
            this.sourceFilesRevision = '';
          }
          return configuration;
        })
        .catch(error => {
          if (loadEpoch !== this.configurationLoadEpoch || this.roomName !== savename || this.activeTab !== worldname) return null;
          const message = error.message || this.$t('worlds.settingsPage.feedback.overridesLoadFailed', { world: worldname });
          this.worldLoadErrors = { ...this.worldLoadErrors, [worldname]: message };
          this.loadError = message;
          if (!this.worldOriginalSettings[worldname]) {
            this.serverIni = null;
            this.serverIniOriginal = null;
          }
          toast.error(this.$t('worlds.settingsPage.feedback.overridesLoadError', {
            world: worldname,
            error: message
          }));
          return null;
        })
        .finally(() => {
          if (loadEpoch === this.configurationLoadEpoch) this.loadingServerIni = false;
        });
    },
    
    // 应用世界自定义配置到设置中
    applyWorldOverrides(overridesData, worldType, worldname) {
      if (!overridesData || !worldType) {
        return;
      }
      
      // 存储每个世界的覆盖配置，以便保存时使用
      if (!this.worldOverrides) {
        this.worldOverrides = {};
      }
      
      this.worldOverrides[worldname] = {
        type: worldType,
        data: JSON.parse(JSON.stringify(overridesData)) // 创建深拷贝
      };
      
      const defaults = this.originalSettings?.[worldType];
      if (!defaults) return;
      const settingsKey = worldType === 'forest' ? 'forestSettings' : 'caveSettings';
      this[settingsKey] = JSON.parse(JSON.stringify(defaults));
      const baseSettings = this[settingsKey];
      if (!baseSettings) {
        return;
      }
      
      // 遍历所有设置项，应用自定义配置
      this.traverseSettings(baseSettings, (item, itemKey) => {
        if (Object.prototype.hasOwnProperty.call(overridesData, itemKey)) {
          const oldValue = item.value;
          const newValue = overridesData[itemKey];
          
          // 只在值不同时更新
          if (oldValue !== newValue) {
            item.value = newValue;
          }
        }
      });
      this.worldOriginalSettings[worldname] = JSON.parse(JSON.stringify(baseSettings));
      this.hasChanges = false;
      this.changedItemsCache = null;
    },
    
    // 处理窗口大小变化
    handleResize() {
      this.windowSize = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      // 重新优化可视区域内的组件
      this.$nextTick(() => {
        this.optimizeInitialRendering();
      });
    },
    
    // 处理设置变更
    handleSettingChange({ item, value }) {
      if (this.configurationReadOnly) return;
      // 只在值真正变化时才处理
      if (item.value === value) return;
      
      // 更新值
      item.value = value;
      
      // 使用防抖优化变更检查
      this.debouncedCheckChanges();
      
      // 清除变更缓存
      this.changedItemsCache = null;
    },
    debouncedCheckChanges() {
      if (this.checkChangesTimer) {
        clearTimeout(this.checkChangesTimer);
      }
      this.checkChangesTimer = setTimeout(() => {
        this.checkChanges();
      }, 200);
    },
    fetchWorldSettings({ manageLoading = true } = {}) {
      if (manageLoading) {
        this.loading = true;
      }
      this.loadError = '';
      // 使用Promise优化数据加载
      return fetch(worldSettingsCatalogPath(this.$i18n.locale))
        .then(response => {
          if (!response.ok) {
            throw new Error(this.$t('worlds.settingsPage.feedback.definitionResponseFailed'));
          }
          return response.json();
        })
        .then(data => {
          if (this.disposed) return data;
          this.forestSettings = data.forest || {};
          this.caveSettings = data.cave || {};
          this.originalSettings = JSON.parse(JSON.stringify(data));
          this.hasChanges = false;
          
          // 预先构建缓存
          this.buildCaches();
          
          // 数据加载后更新UI
          this.$nextTick(() => {
            if (!this.disposed) this.prerenderAllSelects();
          });
          
          return data; // 返回数据以便链式调用
        })
        .catch(error => {
          if (this.disposed) return Promise.reject(error);
          this.loadError = error.message || this.$t('worlds.settingsPage.feedback.definitionReadFailed');
          toast.error(this.$t('worlds.settingsPage.feedback.definitionLoadFailed'));
          return Promise.reject(error);
        })
        .finally(() => {
          if (manageLoading && !this.disposed) {
            this.loading = false;
          }
        });
    },
    async updateWorldSettingsLocale(locale) {
      if (!this.originalSettings) return;
      const epoch = ++this.settingsLocaleEpoch;
      try {
        const response = await fetch(worldSettingsCatalogPath(locale));
        if (!response.ok) throw new Error(this.$t('worlds.settingsPage.feedback.definitionResponseFailed'));
        const catalog = await response.json();
        if (epoch !== this.settingsLocaleEpoch) return;

        applyWorldSettingsLabels(this.forestSettings, catalog.forest);
        applyWorldSettingsLabels(this.caveSettings, catalog.cave);
        applyWorldSettingsLabels(this.originalSettings.forest, catalog.forest);
        applyWorldSettingsLabels(this.originalSettings.cave, catalog.cave);
        for (const [worldName, settings] of Object.entries(this.worldOriginalSettings)) {
          const worldType = this.roomWorlds.find(world => world.name === worldName)?.type === 'cave' ? 'cave' : 'forest';
          applyWorldSettingsLabels(settings, catalog[worldType]);
        }
        this.descriptionCache = {};
        this.itemOptionsCache = {};
        this.changedItemsCache = null;
      } catch (error) {
        if (epoch !== this.settingsLocaleEpoch) return;
        toast.error(this.$t('worlds.settingsPage.feedback.localeLoadFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      }
    },
    async reloadSettings() {
      const needsCatalog = !this.originalSettings;
      this.initialWorldId = String(this.currentWorld?.id || this.activeTab || this.$route.query.worldId || '');
      if (needsCatalog) {
        this.initializingPage = true;
      }
      this.loading = true;
      this.loadError = '';
      try {
        if (needsCatalog) {
          await this.fetchWorldSettings({ manageLoading: false });
        }
        const loaded = await this.fetchRoomOptions({ syncRoute: false });
        if (loaded && this.roomId) {
          await this.loadRoomWorlds({ prefetchedRooms: this.roomOptions });
        }
      } catch {
        // Errors are already surfaced via loadError / roomOptionsError.
      } finally {
        if (!this.disposed) {
          this.initializingPage = false;
          this.loading = false;
        }
      }
    },
    getItemOptions(categoryDesc, itemDesc) {
      // 优化缓存键计算，减少序列化复杂对象的开销
      const cacheKey = JSON.stringify({ 
        categoryDesc: categoryDesc ? Object.keys(categoryDesc).join(',') : '', 
        itemDesc: itemDesc ? Object.keys(itemDesc).join(',') : '' 
      });
      
      if (this.itemOptionsCache[cacheKey]) {
        return this.itemOptionsCache[cacheKey];
      }
      
      const result = itemDesc || categoryDesc || {};
      this.itemOptionsCache[cacheKey] = result;
      return result;
    },
    checkChanges() {
      this.changedItemsCache = null;
      this.hasChanges = this.getChangedItems().length > 0;
    },
    async saveSettings() {
      if (this.saveLoading) return;
      if (this.configurationReadOnly) {
        toast.error(this.$t('worlds.settingsPage.feedback.readOnly'));
        return;
      }
      const currentWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      
      if (!currentWorld) {
        toast.error(this.$t('worlds.settingsPage.feedback.saveWorldMissing'));
        return;
      }

      const roomId = this.roomId;
      const roomName = this.roomName;
      const startedAt = performance.now();
      let appliedAt = null;
      this.saveLoading = true;
      try {
        if ((this.editorMode === 'source' || this.sourceBackedSave) && !currentWorld.isTemp && typeof this.saveSourceBackedSettings === 'function') {
          appliedAt = await this.saveSourceBackedSettings(currentWorld, roomId, roomName);
          return;
        }
        const changedSettings = this.prepareChangedSettings();
        const worldType = currentWorld.type === 'forest' ? 'forest' : 'cave';

        if (currentWorld.isTemp) {
          this.newWorld = { name: '', type: worldType };
          this.addWorldDialogVisible = true;
          this.pendingWorldSettings = changedSettings;
          this.pendingWorldType = worldType;
          return;
        }

        const response = await api.worldApi[worldType === 'forest' ? 'forestWorld' : 'caveWorld']({
          roomId,
          worldId: currentWorld.id,
          savename: roomName,
          worldname: currentWorld.name,
          expectedRevision: this.worldConfigurationMeta[currentWorld.name]?.revision || '',
          overrides: changedSettings[worldType]
        });
        appliedAt = performance.now();
        if (response.status === 200) {
          toast.success(this.$t('worlds.settingsPage.feedback.settingsSaved', {
            world: currentWorld.name
          }));
          if (this.roomId === roomId && this.activeTab === currentWorld.name) {
            await this.loadWorldConfiguration(roomName, currentWorld.name);
            this.buildCaches();
          }
        }
      } catch (error) {
        toast.error(this.$t('worlds.settingsPage.feedback.settingsSaveFailed', {
          world: currentWorld.name,
          error: this.configurationSaveError(error)
        }));
      } finally {
        this.saveLoading = false;
        if (!currentWorld.isTemp) {
          await this.$nextTick();
          const finishedAt = performance.now();
          console.info('[WorldConfigurationSave]', {
            roomId, worldId: currentWorld.id,
            totalMs: Math.round(finishedAt - startedAt),
            saveMs: appliedAt === null ? null : Math.round(appliedAt - startedAt),
            reloadMs: appliedAt === null ? null : Math.round(finishedAt - appliedAt)
          });
        }
      }
    },
    prepareChangedSettings() {
      const currentWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      if (!currentWorld) return {};
      
      const worldType = currentWorld.type === 'forest' ? 'forest' : 'cave';
      const result = {};
      result[worldType] = {};
      
      // 获取当前世界类型的所有设置项
      const activeSettings = worldType === 'forest' ? this.forestSettings : this.caveSettings;
      
      // 遍历所有设置项，收集所有参数值
      this.traverseSettings(activeSettings, (item, itemKey) => {
        // 将所有参数都添加到结果中
        result[worldType][itemKey] = item.value;
      });
      
      return result;
    },
    resetSettings() {
      const currentWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      if (!currentWorld) return;
      const worldType = currentWorld.type === 'forest' ? 'forest' : 'cave';
      const baseline = this.worldOriginalSettings[currentWorld.name];
      if (!baseline && !this.sourceFilesLoadedForCurrentWorld) return;

      if (baseline) {
        if (worldType === 'forest') {
          this.applySettingsValues(this.forestSettings, baseline);
        } else {
          this.applySettingsValues(this.caveSettings, baseline);
        }
      }
      if ((this.editorMode === 'source' || this.sourceBackedSave) && this.serverIniOriginal) {
        this.resetServerIni();
      }
      this.resetWorldSourceDraftsToBaseline();
      toast.info(this.$t('worlds.settingsPage.feedback.settingsReset', {
        type: this.worldTypeLabel(worldType)
      }));
      
      // 清除变更状态和缓存
      this.hasChanges = false;
      this.changedItemsCache = null;
    },
    applySettingsValues(target, source) {
      if (!target || !source) return;
      
      // 只遍历需要的部分
      this.traverseSettings(source, (sourceItem, itemKey, path) => {
        const category = this.getCategoryByPath(target, path);
        if (category && category.items && category.items[itemKey]) {
          // 直接设置值，避免深度克隆
          category.items[itemKey].value = sourceItem.value;
        }
      });
    },
    extractEssentialSettings(settings) {
      const result = {};
      
      // 遍历设置，提取值不是默认的项目
      this.traverseSettings(settings, (item, itemKey, path) => {
        // 获取路径
        const parts = path.split('.');
        if (parts.length < 2) return;
        
        const groupKey = parts[0];
        const categoryKey = parts[1];
        
        // 确保目标对象结构存在
        if (!result[groupKey]) {
          result[groupKey] = {};
        }
        if (!result[groupKey][categoryKey]) {
          result[groupKey][categoryKey] = { 
            items: {},
            // 复制其他必要属性
            text: settings[groupKey][categoryKey].text,
            order: settings[groupKey][categoryKey].order
          };
        }
        
        // 只保存值
        result[groupKey][categoryKey].items[itemKey] = {
          value: item.value,
          text: item.text
        };
      });
      
      return result;
    },
    getChangedItems() {
      if (this.changedItemsCache !== null) {
        return this.changedItemsCache;
      }
      
      const changedItems = [];
      const currentWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      if (!currentWorld) return [];
      
      // 根据世界类型确定使用的设置
      const worldType = currentWorld.type === 'forest' ? 'forest' : 'cave';
      const activeSettings = worldType === 'forest' ? this.forestSettings : this.caveSettings;
      const baseline = this.worldOriginalSettings[currentWorld.name];

      if (!activeSettings || !baseline) return [];
      
      // 遍历活动设置，找出与默认值不同的项
      this.traverseSettings(activeSettings, (item, itemKey, path) => {
        const originalItem = this.findItemInSettings(baseline, itemKey);
        const defaultValue = originalItem?.value;
        
        // 如果当前值与默认值不同，则添加到变更列表
        if (defaultValue !== undefined && defaultValue !== item.value) {
          // 获取描述性文本
          const category = this.getCategoryByPath(activeSettings, path);
          const options = this.getItemOptions(category.desc, item.desc);
          
          changedItems.push({
            key: itemKey,
            text: item.text,
            oldValue: defaultValue,
            oldValueText: options[defaultValue] || defaultValue,
            newValue: item.value,
            newValueText: options[item.value] || item.value
          });
        }
      });
      
      this.changedItemsCache = changedItems;
      return changedItems;
    },
    prerenderAllSelects() {
      // 使用 requestIdleCallback 或 setTimeout 错开渲染，避免主线程阻塞
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          this.loadedSelects = {};
          this.prerenderCommonSelects();
        });
      } else {
        setTimeout(() => {
          this.loadedSelects = {};
          this.prerenderCommonSelects();
        }, 100);
      }
    },
    
    prerenderCommonSelects() {
      // 预加载常用选择器
      const commonKeys = ['world_size', 'autumn', 'winter', 'spring', 'summer', 
                          'day', 'season_start', 'touchstone', 'regrowth', 
                          'spiders', 'hounds', 'bearger', 'deerclops'];
      
      commonKeys.forEach(key => {
        if (this.loadedSelects) this.loadedSelects[key] = true;
      });
      
      // 延迟加载其他选择器
      if (this._renderTimer) {
        clearTimeout(this._renderTimer);
      }
      
      this._renderTimer = setTimeout(() => {
        // 加载当前标签页中可见的选择器
        const visibleItems = document.querySelectorAll('.setting-item');
        visibleItems.forEach(item => {
          // 从自定义属性或ID中提取键名
          const key = item.getAttribute('data-key') || item.id;
          if (key) {
            if (this.loadedSelects) this.loadedSelects[key] = true;
          }
        });
      }, 500);
    },
    isElementInViewport(el) {
      const rect = el.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
    },
    getCategoryByPath(settings, path) {
      if (!path) return null;
      
      // 使用简单的路径分解而不是split
      const parts = path.split('.');
      if (parts.length < 2) return null;
      
      const groupKey = parts[0];
      const categoryKey = parts[1];
      
      // 直接访问对象，避免额外的操作
      return settings[groupKey] && settings[groupKey][categoryKey] ? settings[groupKey][categoryKey] : null;
    },
    filterSettings(settings) {
      if (!settings || !this.searchText) return settings;
      
      const result = JSON.parse(JSON.stringify(settings));
      const searchLower = this.searchText.toLowerCase();
      
      for (const groupKey in result) {
        const group = result[groupKey];
        for (const categoryKey in group) {
          const category = group[categoryKey];
          if (category.items) {
            // 过滤每个分类中的项目
            const filteredItems = {};
            let hasMatchingItems = false;
            
            for (const itemKey in category.items) {
              const item = category.items[itemKey];
              if (item.text && item.text.toLowerCase().includes(searchLower)) {
                filteredItems[itemKey] = item;
                hasMatchingItems = true;
              }
            }
            
            // 如果没有匹配项，则清空分类
            if (!hasMatchingItems) {
              category.items = {};
            } else {
              category.items = filteredItems;
            }
          }
        }
      }
      
      return result;
    },
    preloadRelatedOptions(currentItemKey) {
      // 预加载同一分类下的其他选项
      const currentPath = this.categoryPathCache[`${this.activeTab}_${currentItemKey}`];
      if (!currentPath) return;
      
      const category = this.getCategoryByPath(this.activeSettings, currentPath);
      if (!category || !category.items) return;
      
      // 找到同一分类下的其他项目（最多5个）
      const keys = Object.keys(category.items).slice(0, 5);
      keys.forEach(key => {
        if (key !== currentItemKey) {
          if (this.loadedSelects) this.loadedSelects[key] = true;
        }
      });
    },
    debounce(fn, delay) {
      let timer = null;
      return function(...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          fn.apply(this, args);
        }, delay);
      };
    },
    handleGlobalClick() {
      // Reka Select 自行管理浮层关闭行为。
    },
    buildCaches() {
      // 清空旧缓存
      this.descriptionCache = {};
      this.itemOptionsCache = {};
      this.categoryPathCache = {};
      this.defaultValueCache = {};
      
      // 构建路径缓存和默认值缓存
      if (this.forestSettings) {
        this.buildSettingCache(this.forestSettings, 'forest');
      }
      if (this.caveSettings) {
        this.buildSettingCache(this.caveSettings, 'cave');
      }
    },
    buildSettingCache(settings, worldType) {
      // 为所有设置项构建缓存
      this.traverseSettings(settings, (item, itemKey, path) => {
        // 缓存路径以便快速查找
        this.categoryPathCache[`${worldType}_${itemKey}`] = path;
        
        // 缓存默认值以便快速比较变更
        if (this.originalSettings && this.originalSettings[worldType]) {
          const defaultItem = this.findItemInSettings(this.originalSettings[worldType], itemKey);
          if (defaultItem) {
            this.defaultValueCache[`${worldType}_${itemKey}`] = defaultItem.value;
          }
        }
      });
    },
    findItemInSettings(settings, targetKey) {
      let foundItem = null;
      this.traverseSettings(settings, (item, itemKey) => {
        if (itemKey === targetKey) {
          foundItem = item;
        }
      }, '', () => foundItem !== null); // 找到后立即停止遍历
      return foundItem;
    },
    traverseSettings(settings, callback, basePath = '', shouldStop = () => false) {
      const visitedItems = new Set();
      
      for (const groupKey in settings) {
        const group = settings[groupKey];
        const groupPath = basePath ? `${basePath}.${groupKey}` : groupKey;
        
        for (const categoryKey in group) {
          const category = group[categoryKey];
          const categoryPath = `${groupPath}.${categoryKey}`;
          
          if (category && category.items) {
            for (const itemKey in category.items) {
              // 避免重复处理同一个item
              const itemFullPath = `${categoryPath}.items.${itemKey}`;
              if (visitedItems.has(itemFullPath)) continue;
              
              visitedItems.add(itemFullPath);
              callback(category.items[itemKey], itemKey, categoryPath);
              
              // 如果条件满足，提前结束遍历
              if (shouldStop()) return;
            }
          }
        }
      }
    },
    optimizeInitialRendering() {
      // 优先处理可见区域内的元素
      this.optimizeVisibleSelectComponents();
      
      // 设置渲染延迟，避免页面卡顿
      setTimeout(() => {
        this.updateVisibleSelectLabels();
      }, 100);
    },
    
    optimizeVisibleSelectComponents() {
      // Reka Select 不需要额外的 DOM 渲染补丁。
    },
    
    updateVisibleSelectLabels() {
      // SelectValue 根据 modelValue 自动更新标签。
    },
    
    // 添加滚动事件监听，优化滚动时的性能
    setupScrollListeners() {
      // 使用被动事件监听器提高滚动性能
      const scrollContainer = document.querySelector('.settings-wrapper');
      if (scrollContainer) {
        // 防抖处理滚动事件
        const debouncedScrollHandler = this.debounce(() => {
          this.updateScrollItems();
        }, 100);
        
        scrollContainer.addEventListener('scroll', debouncedScrollHandler, { passive: true });
        this.scrollContainer = scrollContainer;
        this.debouncedScrollHandler = debouncedScrollHandler;
      }
    },
    updateScrollItems() {
      // 滚动时只更新可见区域内的选择器
      this.updateVisibleSelectLabels();
    },
    applyCurrentWorldConfig(currentWorld) {
      if (!currentWorld || !this.worldOverrides[currentWorld.name]) {
        return;
      }
      
      // 获取当前世界的覆盖配置
      const worldOverride = this.worldOverrides[currentWorld.name];
      
      // 重新应用配置到当前视图
      if (worldOverride && worldOverride.data) {
        const worldType = currentWorld.type === 'forest' ? 'forest' : 'cave';
        const settings = worldType === 'forest' ? this.forestSettings : this.caveSettings;
        
        if (settings) {
          // 遍历所有设置，应用保存的配置
          this.traverseSettings(settings, (item, itemKey) => {
            // 如果存在覆盖配置，则应用
            if (Object.prototype.hasOwnProperty.call(worldOverride.data, itemKey)) {
              item.value = worldOverride.data[itemKey];
            }
          });
        }
      }
    },
    // 显示新增世界对话框
    showAddWorldDialog() {
      if (!this.roomId) {
        toast.warning(this.$t('worlds.settingsPage.feedback.selectRoomFirst'));
        return;
      }
      if (this.roomHasRunningWorld) {
        toast.warning(this.$t('worlds.settingsPage.feedback.stopBeforeCreate'));
        return;
      }
      // 获取所有世界
      const allWorlds = this.roomWorlds;
      
      // 找出最大编号 (森林和洞穴共用一个编号系统)
      let maxNumber = 0;
      
      // 提取所有世界的编号
      allWorlds.forEach(world => {
        // 检查Forest格式
        let match = world.name.match(/Forest(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1]);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
        
        // 检查Caves格式
        match = world.name.match(/Caves?(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1]);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      });
      
      // 生成默认世界名称，使用最大编号+1
      const nextNumber = maxNumber + 1;
      const defaultForestName = `Forest${nextNumber}`;
      const defaultCaveName = `Caves${nextNumber}`;
      
      // 设置默认世界类型和名称
      this.newWorld = {
        name: defaultForestName,
        type: 'forest'  // 默认为森林类型
      };
      
      // 添加名称变更处理器
      this.handleWorldTypeChange = (type) => {
        if (type === 'forest') {
          this.newWorld.name = defaultForestName;
        } else {
          this.newWorld.name = defaultCaveName;
        }
      };
      
      // 显示选择对话框
      this.addWorldDialogVisible = true;
      this.isNewWorldConfig = true;  // 标记为新世界配置模式
    },
    
    // 添加新世界
    addWorld() {
      if (this.roomHasRunningWorld) {
        toast.warning(this.$t('worlds.settingsPage.feedback.stopBeforeCreate'));
        return;
      }
      if (!this.newWorld.name) {
        toast.warning(this.$t('worlds.settingsPage.feedback.worldNameRequired'));
        return;
      }

      this.addWorldLoading = true;

      // 使用originalSettings中的原始默认值，而不是可能已修改过的值
      const worldType = this.newWorld.type;
      const overrides = {};
      
      if (this.originalSettings && this.originalSettings[worldType]) {
        // 从原始设置中提取所有设置项的值
        this.traverseSettings(this.originalSettings[worldType], (item, itemKey) => {
          overrides[itemKey] = item.value;
        });
      } else {
        // 如果没有原始设置，则使用当前设置（这种情况不应该出现，但作为后备）
        const defaultSettings = worldType === 'forest' ? this.forestSettings : this.caveSettings;
        this.traverseSettings(defaultSettings, (item, itemKey) => {
          overrides[itemKey] = item.value;
        });
      }

      // 调用API创建世界
      api.worldApi[worldType === 'forest' ? 'forestWorld' : 'caveWorld']({
        savename: this.roomName,
        worldname: this.newWorld.name,
        overrides: overrides
      })
        .then(response => {
          if (response.status === 200) {
            toast.success(this.$t('worlds.settingsPage.feedback.worldCreated', {
              type: this.worldTypeLabel(worldType),
              world: this.newWorld.name
            }));
            this.addWorldDialogVisible = false;
            const createdWorldName = this.newWorld.name;
            this.fetchRoomWorlds().then(() => {
              this.activeTab = createdWorldName;
            });
          } else {
            toast.error(this.$t('worlds.settingsPage.feedback.createFailed'));
          }
        })
        .catch(error => {
          toast.error(this.$t('worlds.settingsPage.feedback.createError', {
            error: error.message || this.$t('common.errors.unknown')
          }));
        })
        .finally(() => {
          this.addWorldLoading = false;
        });
    },
    
    // 显示删除世界确认对话框
    confirmDeleteWorld(world) {
      if (world?.status === 'running') {
        toast.warning(this.$t('worlds.settingsPage.feedback.stopBeforeDelete'));
        return;
      }
      this.worldToDelete = world;
      this.deleteWorldDialogVisible = true;
    },
    
    // 删除世界
    deleteWorld() {
      if (!this.worldToDelete) {
        toast.warning(this.$t('worlds.settingsPage.feedback.deleteWorldMissing'));
        return;
      }
      if (this.worldToDelete.status === 'running') {
        toast.warning(this.$t('worlds.settingsPage.feedback.stopBeforeDelete'));
        return;
      }
      
      this.deleteWorldLoading = true;
      // 调用API删除世界
      api.worldApi.deleteWorld({
        savename: this.roomName,
        worldname: this.worldToDelete.name,
        confirmation: this.roomName
      })
        .then(response => {
          if (response.status === 200) {
            toast.success(this.$t('worlds.settingsPage.feedback.worldDeleted', {
              world: this.worldToDelete.name
            }));
            this.deleteWorldDialogVisible = false;
            
            // 刷新世界列表
            this.fetchRoomWorlds();
          } else {
            toast.error(this.$t('worlds.settingsPage.feedback.deleteFailed'));
          }
        })
        .catch(error => {
          toast.error(this.$t('worlds.settingsPage.feedback.deleteError', {
            error: error.message || this.$t('common.errors.unknown')
          }));
        })
        .finally(() => {
          this.deleteWorldLoading = false;
        });
    },
    
    // 刷新房间世界列表
    fetchRoomWorlds() {
      return new Promise((resolve, reject) => {
        api.worldApi.getWorldList()
          .then(response => {
            if (response.status === 200) {
            // 查找指定的房间
              const room = response.data.find(r => r.id === this.roomId || r.name === this.roomName);
              if (room && Array.isArray(room.worlds)) {
                this.roomId = room.id;
                this.roomName = room.name;
                this.roomWorlds = room.worlds;
                
                // 检查是否有森林和洞穴世界
                this.hasForestWorld = this.roomWorlds.some(world => 
                  world.type === 'forest' || world.name.toLowerCase().includes('forest'));
                
                this.hasCaveWorld = this.roomWorlds.some(world => 
                  world.type === 'cave' || world.name.toLowerCase().includes('cave'));
                
                // 如果当前选中的标签页已被删除，则选择第一个世界
                if (this.roomWorlds.length > 0) {
                  if (!this.roomWorlds.some(world => world.name === this.activeTab)) {
                    this.activeTab = this.sortedRoomWorlds[0].name;
                  }
                } else {
                  this.resetRoomWorldState();
                  this.syncWorldRoute(null);
                }
                resolve();
              } else {
                reject(new Error(this.$t('worlds.settingsPage.feedback.roomNotFound')));
              }
            } else {
              reject(new Error(this.$t('worlds.settingsPage.feedback.worldListReadFailed')));
            }
          })
          .catch(error => {
            reject(error);
          });
      });
    },
    // 获取服务器基础配置
    fetchServerIni(savename, worldname) {
      if (!savename || !worldname) return;
      
      this.loadingServerIni = true;
      this.serverIni = null;
      this.serverIniOriginal = null;
      this.serverIniChanged = false;
      
      return api.worldApi.getServerIni(savename, worldname)
        .then(response => {
          if (response.status === 200 && response.data) {
            this.serverIni = response.data;
            // 深拷贝保存原始配置用于重置
            this.serverIniOriginal = JSON.parse(JSON.stringify(response.data));
          }
        })
        .catch(error => {
          this.serverIni = null;
          this.serverIniOriginal = null;
          toast.error(this.$t('worlds.settingsPage.feedback.serverIniLoadFailed', {
            error: error.message || this.$t('common.errors.unknown')
          }));
        })
        .finally(() => {
          this.loadingServerIni = false;
        });
    },
    
    // 保存服务器基础配置
    saveServerIni() {
      if (!this.serverIni) return;
      if (this.configurationReadOnly) {
        toast.error(this.$t('worlds.settingsPage.feedback.readOnly'));
        return;
      }
      
      const currentWorld = this.roomWorlds.find(world => world.name === this.activeTab);
      if (!currentWorld) {
        toast.error(this.$t('worlds.settingsPage.feedback.currentWorldMissing'));
        return;
      }
      
      if (this.serverShardIdInvalid) {
        toast.error(this.$t('worlds.settingsPage.feedback.invalidShardId', { min: this.serverShardIdMinimum }));
        return;
      }
      
      this.savingServerIni = true;
      const useSourceBackedIni = Boolean(this.sourceBackedSave && this.isSourceServerIniModified);
      const preservedLuaDraft = this.isSourceLeveldataModified ? this.sourceDraftLeveldata : null;
      const preservedSyncedOverrides = this.sourceSyncedOverrides ? { ...this.sourceSyncedOverrides } : null;
      const preservedVisualOverrides = (this.hasChanges || preservedLuaDraft !== null)
        ? this.extractCurrentVisualOverrides(currentWorld)
        : null;

      const savePromise = useSourceBackedIni
        ? api.worldApi.applyWorldFiles({
          roomId: this.roomId,
          worldId: currentWorld.id,
          savename: this.roomName,
          worldname: currentWorld.name,
          expectedRevision: this.sourceFilesRevision || this.worldConfigurationMeta[currentWorld.name]?.revision || '',
          serverIni: this.sourceDraftServerIni,
          ...(this.serverIniChanged ? { server: this.buildServerPayloadFromIni(this.serverIni) } : {})
        })
        : api.worldApi.saveServerIni({
          roomId: this.roomId,
          worldId: currentWorld.id,
          savename: this.roomName,
          worldname: currentWorld.name,
          expectedRevision: this.worldConfigurationMeta[currentWorld.name]?.revision || '',
          config: this.serverIni
        });

      return savePromise
        .then(async response => {
          if (response.status === 200) {
            toast.success(this.$t('worlds.settingsPage.feedback.serverIniSaved'));
            await this.loadWorldConfiguration(this.roomName, currentWorld.name);
            if (this.activeTab === currentWorld.name && (preservedLuaDraft !== null || preservedVisualOverrides !== null)) {
              if (preservedLuaDraft !== null) {
                const reloaded = await this.loadActiveWorldSourceFiles(currentWorld);
                if (reloaded) {
                  this.sourceDraftLeveldata = preservedLuaDraft;
                  this.sourceBackedSave = true;
                  this.sourceSyncedOverrides = preservedSyncedOverrides;
                }
              }
              if (preservedVisualOverrides !== null) {
                this.applyParsedOverridesToVisualDraft(preservedVisualOverrides, currentWorld);
              }
            }
          }
        })
        .catch(error => {
          toast.error(this.$t('worlds.settingsPage.feedback.serverIniSaveFailed', {
            error: this.configurationSaveError(error)
          }));
        })
        .finally(() => {
          this.savingServerIni = false;
        });
    },
    
    // 重置服务器基础配置
    resetServerIni() {
      if (this.serverIniOriginal) {
        this.serverIni = JSON.parse(JSON.stringify(this.serverIniOriginal));
        this.serverIniChanged = false;
      }
      if (this.sourceFilesLoadedForCurrentWorld && this.isSourceServerIniModified) {
        this.sourceDraftServerIni = this.sourceBaselineServerIni;
        if (!this.isSourceLeveldataModified) {
          this.sourceBackedSave = false;
          this.sourceSyncedOverrides = null;
        }
      }
    },

    configurationSaveError(error) {
      if (error?.code === 'CONFIG_REVISION_CONFLICT' || error?.context?.targetErrorCode === 'CONFIG_REVISION_CONFLICT') {
        return this.$t('worlds.settingsPage.feedback.revisionConflict');
      }
      const parsed = typeof this.parseSourceEditorError === 'function' ? this.parseSourceEditorError(error) : null;
      if (parsed?.isTooLarge) {
        return this.$t('worlds.settingsPage.sourceEditor.errors.tooLarge');
      }
      if (parsed?.rawMessage) {
        return parsed.rawMessage;
      }
      return error?.message || this.$t('common.errors.unknown');
    },
    
    // 加载指定世界的配置（处理用户选择世界类型后）
    loadWorldConfig(world) {
      if (!world || !this.roomName) return;
      
      // 标记为加载中
      this.loading = true;
      
      // 添加到已加载配置
      const worldKey = `${this.roomName}_${world.name}`;
      if (!this.loadedWorldConfigs) {
        this.loadedWorldConfigs = {};
      }
      
      // 加载世界配置
      const loading = this.loadWorldConfiguration(this.roomName, world.name);
      const loadEpoch = this.configurationLoadEpoch;
      loading
        .finally(() => {
          if (loadEpoch !== this.configurationLoadEpoch) return;
          this.loadedWorldConfigs[worldKey] = true;
          this.loading = false;
          
          // 向服务器更新世界类型
          this.updateWorldType(world);
        });
    },
    
    // 更新世界类型
    updateWorldType(world) {
      if (!world || !this.roomName) return;
      
      const worldType = world.type; // 'forest' 或 'cave'
      
      // 先加载默认配置
      this.loading = true;
      
      // 使用原始设置，而不是可能已修改过的值
      let overrides = {};
      if (this.originalSettings && this.originalSettings[worldType]) {
        // 从原始设置中提取所有值
        this.traverseSettings(this.originalSettings[worldType], (item, itemKey) => {
          overrides[itemKey] = item.value;
        });
      } else {
        // 如果没有原始设置，则使用extractAllSettings方法（这种情况不应该出现，但作为后备）
        overrides = this.extractAllSettings(worldType);
      }

      let params = {
        savename: this.roomName,
        worldname: world.name,
        overrides: overrides
      };

      let apiMethod = worldType === 'forest' ? api.worldApi.forestWorld : api.worldApi.caveWorld;
      apiMethod(params).then(response => {
        if (response.status === 200) {
          toast.success(this.$t('worlds.settingsPage.feedback.worldTypeUpdated'));
        }
      }).catch(error => {
        toast.error(this.$t('worlds.settingsPage.feedback.worldTypeUpdateFailed', {
          error: error.message || this.$t('common.errors.unknown')
        }));
      }).finally(() => {
        this.loading = false;
      });
    },
    
    // 提取所有设置项的值
    extractAllSettings(worldType) {
      const settings = worldType === 'forest' ? this.forestSettings : this.caveSettings;
      const result = {};
      
      if (!settings) {
        console.error(`World settings are not loaded for type: ${worldType}`);
        return result;
      }
      
      // 遍历所有设置项，收集所有参数值
      this.traverseSettings(settings, (item, itemKey) => {
        // 将所有参数都添加到结果中
        result[itemKey] = item.value;
      });
      
      return result;
    },

    resetWorldSourceState({ preserveMode = false, preserveTransferred = false } = {}) {
      this.sourceLoadEpoch += 1;
      if (this.sourceValidateTimer) {
        clearTimeout(this.sourceValidateTimer);
        this.sourceValidateTimer = null;
      }
      if (!preserveMode) {
        this.editorMode = 'visual';
        this.sourceFileTab = 'leveldataoverride';
      }
      this.loadingSourceFiles = false;
      this.sourceModeSwitching = false;
      this.sourceValidating = false;
      this.sourceFormatting = false;
      this.sourceFilesWorldName = '';
      this.sourceFilesRevision = '';
      this.sourceBaselineLeveldata = '';
      this.sourceBaselineServerIni = '';
      this.sourceDraftLeveldata = '';
      this.sourceDraftServerIni = '';
      this.sourcePreviewChanges = [];
      this.sourceNotices = [];
      this.sourceError = null;
      this.sourceBackedSave = false;
      this.sourceSyncedOverrides = null;
      if (!preserveTransferred) {
        this.pendingTransferredLua = null;
      }
    },

    resetWorldSourceDraftsToBaseline() {
      if (this.sourceValidateTimer) {
        clearTimeout(this.sourceValidateTimer);
        this.sourceValidateTimer = null;
      }
      if (this.sourceFilesLoadedForCurrentWorld) {
        this.sourceDraftLeveldata = this.sourceBaselineLeveldata;
        this.sourceDraftServerIni = this.sourceBaselineServerIni;
      }
      this.sourcePreviewChanges = [];
      this.sourceNotices = [];
      this.sourceError = null;
      this.sourceBackedSave = false;
      this.sourceSyncedOverrides = null;
    },

    async loadActiveWorldSourceFiles(targetWorld = this.currentWorld) {
      if (!targetWorld || !this.roomName || targetWorld.isTemp) return null;
      const epoch = ++this.sourceLoadEpoch;
      this.loadingSourceFiles = true;
      try {
        const response = await api.worldApi.getWorldFiles(this.roomName, targetWorld.name, {
          roomId: this.roomId,
          worldId: targetWorld.id
        });
        if (this.disposed || epoch !== this.sourceLoadEpoch || this.activeTab !== targetWorld.name) return null;
        const files = response?.data || {};
        this.sourceFilesWorldName = targetWorld.name;
        this.sourceFilesRevision = files.revision || '';
        this.sourceBaselineLeveldata = String(files.leveldataoverride || '');
        this.sourceBaselineServerIni = String(files.serverIni || '');
        this.sourceDraftLeveldata = this.sourceBaselineLeveldata;
        this.sourceDraftServerIni = this.sourceBaselineServerIni;
        this.sourcePreviewChanges = [];
        this.sourceNotices = [];
        this.sourceError = null;
        this.worldConfigurationMeta = {
          ...this.worldConfigurationMeta,
          [targetWorld.name]: {
            revision: files.revision || this.worldConfigurationMeta[targetWorld.name]?.revision || '',
            modifiedAt: files.modifiedAt || this.worldConfigurationMeta[targetWorld.name]?.modifiedAt || '',
            sync: files.sync || this.worldConfigurationMeta[targetWorld.name]?.sync || null
          }
        };
        if (this.pendingTransferredLua && this.pendingTransferredLua.worldName === targetWorld.name) {
          const transferred = this.pendingTransferredLua;
          this.pendingTransferredLua = null;
          this.sourceFileTab = 'leveldataoverride';
          this.sourceDraftLeveldata = transferred.content;
          toast.success(this.$t('worlds.settingsPage.sourceEditor.feedback.switchedToMatchingWorld', {
            world: targetWorld.name
          }));
          await this.validateCurrentSourceDraft({ silentSuccess: true });
        }
        return files;
      } catch (error) {
        if (!this.disposed && epoch === this.sourceLoadEpoch) {
          toast.error(this.$t('worlds.settingsPage.sourceEditor.errors.filesLoadFailed', {
            error: error?.rawMessage || error?.message || this.$t('common.errors.unknown')
          }));
        }
        return null;
      } finally {
        if (!this.disposed && epoch === this.sourceLoadEpoch) {
          this.loadingSourceFiles = false;
        }
      }
    },

    async handleEditorModeChange(nextMode) {
      if (!nextMode || nextMode === this.editorMode || this.sourceModeSwitching) return;
      const currentWorld = this.currentWorld;
      if (!currentWorld) return;

      if (nextMode === 'source') {
        this.sourceModeSwitching = true;
        try {
          this.sourceFileTab = this.worldSectionTab === 'server-ini' ? 'server-ini' : 'leveldataoverride';
          if (!this.sourceFilesLoadedForCurrentWorld) {
            const loaded = await this.loadActiveWorldSourceFiles(currentWorld);
            if (!loaded) return;
          }
          const visualPatch = this.computeVisualPatchSinceSourceSync(currentWorld);
          const hasVisualIniEdits = Boolean(this.serverIniChanged && this.serverIni);
          if (Object.keys(visualPatch).length > 0 || hasVisualIniEdits) {
            const response = await api.worldApi.previewWorldFiles({
              roomId: this.roomId,
              worldId: currentWorld.id,
              savename: this.roomName,
              worldname: currentWorld.name,
              expectedRevision: this.sourceFilesRevision || this.worldConfigurationMeta[currentWorld.name]?.revision || '',
              ...(this.isSourceLeveldataModified ? { leveldataoverride: this.sourceDraftLeveldata } : {}),
              ...(this.isSourceServerIniModified ? { serverIni: this.sourceDraftServerIni } : {}),
              ...(Object.keys(visualPatch).length > 0 ? { overridePatch: visualPatch } : {}),
              ...(hasVisualIniEdits ? { server: this.buildServerPayloadFromIni(this.serverIni) } : {}),
              allowEmptyChanges: true
            });
            const preview = response?.data || {};
            this.sourceDraftLeveldata = String(preview.leveldataoverride ?? this.sourceDraftLeveldata);
            this.sourceDraftServerIni = String(preview.serverIni ?? this.sourceDraftServerIni);
            this.sourcePreviewChanges = Array.isArray(preview.changes) ? preview.changes : [];
            this.sourceNotices = Array.isArray(preview.notices) ? preview.notices : [];
            this.sourceError = null;
            this.sourceSyncedOverrides = this.extractCurrentVisualOverrides(currentWorld);
          }
          this.editorMode = 'source';
        } catch (error) {
          const parsed = this.parseSourceEditorError(error);
          toast.error(parsed?.rawMessage || error?.message || this.$t('common.errors.unknown'));
        } finally {
          this.sourceModeSwitching = false;
        }
        return;
      }

      if (nextMode === 'visual') {
        this.sourceModeSwitching = true;
        try {
          if (this.sourceFileTab === 'server-ini') {
            this.worldSectionTab = 'server-ini';
          } else if (this.worldSectionTab === 'server-ini') {
            this.worldSectionTab = 'worldgen';
          }
          if (!this.hasSourceChanges) {
            if (
              this.sourceFilesLoadedForCurrentWorld
              && (this.hasChanges || this.serverIniChanged || this.sourceBackedSave || this.sourceSyncedOverrides)
            ) {
              const baseline = this.worldOriginalSettings[currentWorld.name];
              if (baseline) {
                const targetSettings = currentWorld.type === 'cave' ? this.caveSettings : this.forestSettings;
                this.applySettingsValues(targetSettings, baseline);
              }
              if (this.serverIniOriginal) {
                this.resetServerIni();
              }
              this.sourceBackedSave = false;
              this.sourceSyncedOverrides = null;
              this.hasChanges = false;
              this.changedItemsCache = null;
            }
            this.sourceError = null;
            this.sourceNotices = [];
            this.sourcePreviewChanges = [];
            this.editorMode = 'visual';
            return;
          }
          const response = await api.worldApi.previewWorldFiles({
            roomId: this.roomId,
            worldId: currentWorld.id,
            savename: this.roomName,
            worldname: currentWorld.name,
            expectedRevision: this.sourceFilesRevision || this.worldConfigurationMeta[currentWorld.name]?.revision || '',
            ...(this.isSourceLeveldataModified ? { leveldataoverride: this.sourceDraftLeveldata } : {}),
            ...(this.isSourceServerIniModified ? { serverIni: this.sourceDraftServerIni } : {}),
            allowEmptyChanges: true
          });
          const preview = response?.data || {};
          this.sourceError = null;
          this.sourceNotices = Array.isArray(preview.notices) ? preview.notices : [];
          this.sourcePreviewChanges = Array.isArray(preview.changes) ? preview.changes : [];
          this.sourceDraftLeveldata = String(preview.leveldataoverride ?? this.sourceDraftLeveldata);
          this.sourceDraftServerIni = String(preview.serverIni ?? this.sourceDraftServerIni);
          this.applyParsedOverridesToVisualDraft(preview.overrides || {}, currentWorld);
          if (preview.server) {
            this.applyParsedServerToIniState(preview.server);
          }
          this.sourceSyncedOverrides = this.extractCurrentVisualOverrides(currentWorld);
          this.sourceBackedSave = true;
          this.editorMode = 'visual';
        } catch (error) {
          this.sourceError = this.parseSourceEditorError(error);
          if (this.sourceError?.file === 'server.ini') {
            this.sourceFileTab = 'server-ini';
          } else if (this.sourceError?.file === 'leveldataoverride.lua') {
            this.sourceFileTab = 'leveldataoverride';
          }
          toast.error(this.$t('worlds.settingsPage.sourceEditor.errors.cannotSwitchVisual'));
        } finally {
          this.sourceModeSwitching = false;
        }
      }
    },

    handleSourceFileTabChange(nextTab) {
      if (!nextTab || nextTab === this.sourceFileTab) return;
      this.sourceFileTab = nextTab;
    },

    handleSourceEditorInput(nextValue) {
      if (this.configurationReadOnly) return;
      const previous = this.activeSourceContent;
      const value = String(nextValue ?? '');
      if (value === previous) return;

      if (this.sourceFileTab === 'server-ini') {
        this.sourceDraftServerIni = value;
      } else {
        this.sourceDraftLeveldata = value;
      }
      this.sourcePreviewChanges = [];
      if (this.sourceError) {
        this.sourceError = null;
      }

      const looksLikePaste = Math.abs(value.length - previous.length) > 32 || value.trimStart().startsWith('KLEI');
      if (looksLikePaste) {
        if (this.sourceValidateTimer) clearTimeout(this.sourceValidateTimer);
        this.sourceValidateTimer = setTimeout(() => {
          this.sourceValidateTimer = null;
          if (!this.disposed && this.editorMode === 'source') {
            void this.validateCurrentSourceDraft({ silentSuccess: true });
          }
        }, 400);
      }
    },

    applySourceEditorContent(content) {
      if (this.sourceValidateTimer) {
        clearTimeout(this.sourceValidateTimer);
        this.sourceValidateTimer = null;
      }
      const normalized = String(content ?? '');
      if (this.sourceFileTab === 'server-ini') {
        this.sourceDraftServerIni = normalized;
      } else {
        this.sourceDraftLeveldata = normalized;
      }
      this.sourcePreviewChanges = [];
      this.sourceError = null;
    },

    async pasteIntoSourceEditor() {
      if (this.configurationReadOnly || this.sourceBusy) return;
      const clipboard = window?.navigator?.clipboard;
      if (!clipboard || typeof clipboard.readText !== 'function') {
        toast.warning(this.$t('worlds.settingsPage.sourceEditor.feedback.clipboardDenied'));
        return;
      }
      try {
        const text = await clipboard.readText();
        if (!text || !text.trim()) {
          toast.warning(this.$t('worlds.settingsPage.sourceEditor.feedback.clipboardEmpty'));
          return;
        }
        this.applySourceEditorContent(text);
        toast.success(this.$t('worlds.settingsPage.sourceEditor.feedback.pasted'));
        await this.validateCurrentSourceDraft({ silentSuccess: true });
      } catch {
        toast.warning(this.$t('worlds.settingsPage.sourceEditor.feedback.clipboardDenied'));
      }
    },

    triggerSourceFileImport() {
      if (this.configurationReadOnly || this.sourceBusy) return;
      if (this.sourceFileInputEl && typeof this.sourceFileInputEl.click === 'function') {
        this.sourceFileInputEl.value = '';
        this.sourceFileInputEl.click();
      }
    },

    async handleSourceFileInputChange(event) {
      const file = event?.target?.files?.[0];
      if (!file) return;
      await this.importSourceFile(file);
    },

    async importSourceFile(file) {
      if (!file || this.configurationReadOnly) return;
      if (file.size > 256 * 1024) {
        this.sourceError = {
          code: 'CONFIGURATION_FILE_TOO_LARGE',
          file: this.sourceFileTab === 'server-ini' ? 'server.ini' : 'leveldataoverride.lua',
          line: 0,
          column: 0,
          isTooLarge: true,
          rawMessage: this.$t('worlds.settingsPage.sourceEditor.errors.tooLarge')
        };
        return;
      }
      try {
        const fileName = String(file.name || '').toLowerCase();
        if (fileName.endsWith('.ini') && this.sourceFileTab !== 'server-ini') {
          this.sourceFileTab = 'server-ini';
        } else if (fileName.endsWith('.lua') && this.sourceFileTab !== 'leveldataoverride') {
          this.sourceFileTab = 'leveldataoverride';
        }
        const text = typeof file.text === 'function' ? await file.text() : await this.readTextFileFallback(file);
        this.applySourceEditorContent(text);
        toast.success(this.$t('worlds.settingsPage.sourceEditor.feedback.imported', { name: file.name || '' }));
        await this.validateCurrentSourceDraft({ silentSuccess: true });
      } catch (error) {
        toast.error(this.$t('worlds.settingsPage.sourceEditor.feedback.importFailed', {
          error: error?.message || this.$t('common.errors.unknown')
        }));
      }
    },

    readTextFileFallback(file) {
      return new Promise((resolve, reject) => {
        const Reader = window?.FileReader;
        if (!Reader) {
          reject(new Error('FileReader unavailable'));
          return;
        }
        const reader = new Reader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('File read failed'));
        reader.readAsText(file, 'utf-8');
      });
    },

    async formatCurrentSource() {
      if (this.configurationReadOnly || this.sourceBusy) return;
      const currentWorld = this.currentWorld;
      if (!currentWorld) return;
      this.sourceFormatting = true;
      try {
        if (!this.sourceFilesLoadedForCurrentWorld) {
          const loaded = await this.loadActiveWorldSourceFiles(currentWorld);
          if (!loaded) return;
        }
        const response = await api.worldApi.previewWorldFiles({
          roomId: this.roomId,
          worldId: currentWorld.id,
          savename: this.roomName,
          worldname: currentWorld.name,
          expectedRevision: this.sourceFilesRevision || this.worldConfigurationMeta[currentWorld.name]?.revision || '',
          ...(this.sourceFileTab === 'server-ini'
            ? { serverIni: this.sourceDraftServerIni }
            : { leveldataoverride: this.sourceDraftLeveldata }),
          format: true,
          allowEmptyChanges: true
        });
        const preview = response?.data || {};
        this.sourceError = null;
        this.sourceNotices = Array.isArray(preview.notices) ? preview.notices : [];
        this.sourcePreviewChanges = Array.isArray(preview.changes) ? preview.changes : [];
        if (this.sourceFileTab === 'server-ini') {
          this.sourceDraftServerIni = String(preview.serverIni ?? this.sourceDraftServerIni);
        } else {
          this.sourceDraftLeveldata = String(preview.leveldataoverride ?? this.sourceDraftLeveldata);
        }
        toast.success(this.$t('worlds.settingsPage.sourceEditor.feedback.formatted'));
      } catch (error) {
        this.sourceError = this.parseSourceEditorError(error);
      } finally {
        this.sourceFormatting = false;
      }
    },

    async validateCurrentSourceDraft({ silentSuccess = false } = {}) {
      const currentWorld = this.currentWorld;
      if (!currentWorld || currentWorld.isTemp) return null;
      this.sourceValidating = true;
      try {
        if (!this.sourceFilesLoadedForCurrentWorld) {
          const loaded = await this.loadActiveWorldSourceFiles(currentWorld);
          if (!loaded) return null;
        }
        const sendLua = this.sourceFileTab === 'leveldataoverride' || this.isSourceLeveldataModified;
        const sendIni = this.sourceFileTab === 'server-ini' || this.isSourceServerIniModified;
        const response = await api.worldApi.previewWorldFiles({
          roomId: this.roomId,
          worldId: currentWorld.id,
          savename: this.roomName,
          worldname: currentWorld.name,
          expectedRevision: this.sourceFilesRevision || this.worldConfigurationMeta[currentWorld.name]?.revision || '',
          ...(sendLua ? { leveldataoverride: this.sourceDraftLeveldata } : {}),
          ...(sendIni ? { serverIni: this.sourceDraftServerIni } : {}),
          allowEmptyChanges: true
        });
        const preview = response?.data || {};
        this.sourceError = null;
        this.sourceNotices = Array.isArray(preview.notices) ? preview.notices : [];
        this.sourcePreviewChanges = Array.isArray(preview.changes) ? preview.changes : [];
        if (sendLua && Array.isArray(preview.notices) && (preview.notices.includes('stripped_klei_header') || preview.notices.includes('wrapped_bare_table'))) {
          this.sourceDraftLeveldata = String(preview.leveldataoverride ?? this.sourceDraftLeveldata);
        }
        if (!silentSuccess) {
          toast.success(this.$t('worlds.settingsPage.sourceEditor.feedback.validated', {
            count: this.sourcePreviewChanges.length
          }));
        }
        return preview;
      } catch (error) {
        this.sourceError = this.parseSourceEditorError(error);
        if (this.sourceError?.file === 'server.ini') {
          this.sourceFileTab = 'server-ini';
        } else if (this.sourceError?.file === 'leveldataoverride.lua') {
          this.sourceFileTab = 'leveldataoverride';
        }
        return null;
      } finally {
        this.sourceValidating = false;
      }
    },

    async saveSourceBackedSettings(currentWorld, roomId, roomName) {
      if (this.sourceValidateTimer) {
        clearTimeout(this.sourceValidateTimer);
        this.sourceValidateTimer = null;
      }
      if (!this.sourceFilesLoadedForCurrentWorld) {
        const loaded = await this.loadActiveWorldSourceFiles(currentWorld);
        if (!loaded) throw new Error(this.$t('worlds.settingsPage.feedback.saveWorldMissing'));
      }
      const payload = {
        roomId,
        worldId: currentWorld.id,
        savename: roomName,
        worldname: currentWorld.name,
        expectedRevision: this.sourceFilesRevision || this.worldConfigurationMeta[currentWorld.name]?.revision || ''
      };

      if (this.editorMode === 'source') {
        if (this.isSourceLeveldataModified) {
          payload.leveldataoverride = this.sourceDraftLeveldata;
        } else if (this.hasChanges) {
          const patch = this.computeVisualPatchSinceSourceSync(currentWorld);
          if (Object.keys(patch).length > 0) payload.overridePatch = patch;
        }
        if (this.isSourceServerIniModified) {
          payload.serverIni = this.sourceDraftServerIni;
        } else if (this.serverIniChanged && this.serverIni) {
          payload.server = this.buildServerPayloadFromIni(this.serverIni);
        }
      } else {
        const visualPatch = this.computeVisualPatchSinceSourceSync(currentWorld);
        if (this.isSourceLeveldataModified) {
          payload.leveldataoverride = this.sourceDraftLeveldata;
        }
        if (Object.keys(visualPatch).length > 0) {
          payload.overridePatch = visualPatch;
        }
        if (this.isSourceServerIniModified) {
          payload.serverIni = this.sourceDraftServerIni;
        }
        if (this.serverIniChanged && this.serverIni) {
          payload.server = this.buildServerPayloadFromIni(this.serverIni);
        }
      }

      let response;
      try {
        response = await api.worldApi.applyWorldFiles(payload);
      } catch (error) {
        this.sourceError = this.parseSourceEditorError(error);
        if (this.editorMode === 'source') {
          if (this.sourceError?.file === 'server.ini') {
            this.sourceFileTab = 'server-ini';
          } else if (this.sourceError?.file === 'leveldataoverride.lua') {
            this.sourceFileTab = 'leveldataoverride';
          }
        }
        throw error;
      }

      const appliedAt = performance.now();
      if (response?.status === 200) {
        toast.success(this.$t('worlds.settingsPage.feedback.settingsSaved', {
          world: currentWorld.name
        }));
        if (this.roomId === roomId && this.activeTab === currentWorld.name) {
          this.sourceBackedSave = false;
          this.sourceSyncedOverrides = null;
          await this.loadWorldConfiguration(roomName, currentWorld.name);
          this.buildCaches();
        }
      }
      return appliedAt;
    },

    async copyCurrentSource() {
      const text = this.activeSourceContent || '';
      const clipboard = window?.navigator?.clipboard;
      if (!clipboard || typeof clipboard.writeText !== 'function') {
        toast.error(this.$t('worlds.settingsPage.sourceEditor.feedback.copyFailed'));
        return;
      }
      try {
        await clipboard.writeText(text);
        toast.success(this.$t('worlds.settingsPage.sourceEditor.feedback.copied'));
      } catch {
        toast.error(this.$t('worlds.settingsPage.sourceEditor.feedback.copyFailed'));
      }
    },

    downloadCurrentSource() {
      const fileName = this.sourceFileTab === 'server-ini' ? 'server.ini' : 'leveldataoverride.lua';
      const content = this.activeSourceContent || '';
      const BlobCtor = window?.Blob || (typeof Blob !== 'undefined' ? Blob : null);
      const urlApi = window?.URL || (typeof URL !== 'undefined' ? URL : null);
      if (!BlobCtor || !urlApi || typeof document?.createElement !== 'function') return;

      const blob = new BlobCtor([content], { type: 'text/plain;charset=utf-8' });
      const href = urlApi.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `${this.currentWorld?.name || 'world'}-${fileName}`;
      document.body?.appendChild(link);
      link.click();
      link.remove?.();
      urlApi.revokeObjectURL(href);
      toast.success(this.$t('worlds.settingsPage.sourceEditor.feedback.downloaded', { name: fileName }));
    },

    switchToMatchingWorldAndPaste(targetWorld) {
      if (!targetWorld || !targetWorld.name) return;
      const contentToTransfer = this.sourceDraftLeveldata;
      const baseline = this.currentWorld ? this.worldOriginalSettings[this.currentWorld.name] : null;
      if (baseline && this.currentWorld) {
        const targetSettings = this.currentWorld.type === 'cave' ? this.caveSettings : this.forestSettings;
        this.applySettingsValues(targetSettings, baseline);
      }
      if (this.serverIniOriginal) {
        this.resetServerIni();
      }
      this.resetWorldSourceDraftsToBaseline();
      this.hasChanges = false;
      this.changedItemsCache = null;

      this.pendingTransferredLua = {
        worldName: targetWorld.name,
        content: contentToTransfer
      };
      this.editorMode = 'source';
      this.sourceFileTab = 'leveldataoverride';
      this.previousActiveTab = this.activeTab;
      this.activeTab = targetWorld.name;
    },

    extractCurrentVisualOverrides(world = this.currentWorld) {
      if (!world) return {};
      const worldType = world.type === 'cave' ? 'cave' : 'forest';
      const activeSettings = worldType === 'cave' ? this.caveSettings : this.forestSettings;
      const values = {};
      if (!activeSettings) return values;
      this.traverseSettings(activeSettings, (item, itemKey) => {
        values[itemKey] = item.value;
      });
      return values;
    },

    computeVisualPatchSinceSourceSync(world = this.currentWorld) {
      if (!world) return {};
      const currentValues = this.extractCurrentVisualOverrides(world);
      if (this.sourceSyncedOverrides && typeof this.sourceSyncedOverrides === 'object') {
        const patch = {};
        for (const [key, value] of Object.entries(currentValues)) {
          if (this.sourceSyncedOverrides[key] !== value) {
            patch[key] = value;
          }
        }
        return patch;
      }
      const changed = this.getChangedItems();
      const patch = {};
      for (const item of changed) {
        patch[item.key] = item.newValue;
      }
      return patch;
    },

    applyParsedOverridesToVisualDraft(overridesData, world = this.currentWorld) {
      if (!world || !overridesData) return;
      const worldType = world.type === 'cave' ? 'cave' : 'forest';
      const settingsKey = worldType === 'cave' ? 'caveSettings' : 'forestSettings';
      const defaults = this.originalSettings?.[worldType] || this.worldOriginalSettings[world.name];
      if (!defaults) return;
      const nextSettings = JSON.parse(JSON.stringify(defaults));
      this.traverseSettings(nextSettings, (item, itemKey) => {
        if (Object.prototype.hasOwnProperty.call(overridesData, itemKey)) {
          item.value = overridesData[itemKey];
        }
      });
      this[settingsKey] = nextSettings;
      this.checkChanges();
    },

    buildServerPayloadFromIni(config = {}) {
      return serverConfigFromLegacyIni(config);
    },

    applyParsedServerToIniState(server) {
      if (!server) return;
      const nextIni = legacyIniFromServerConfig(server);
      this.serverIni = nextIni;
      this.serverIniChanged = Boolean(
        this.serverIniOriginal && JSON.stringify(nextIni) !== JSON.stringify(this.serverIniOriginal)
      );
    },

    getFooterChangedItems() {
      const visualItems = this.getChangedItems();
      if (this.editorMode !== 'source') {
        if (visualItems.length > 0 || !this.sourceBackedSave || !this.hasSourceChanges) {
          return visualItems;
        }
      }
      if (Array.isArray(this.sourcePreviewChanges) && this.sourcePreviewChanges.length > 0) {
        return this.sourcePreviewChanges.map(change => {
          const field = change?.path || change?.field || '';
          return {
            key: field,
            text: this.describeSourceChangeField(field, change?.label),
            oldValue: change.before,
            oldValueText: this.formatSourceChangeValue(field, change.before),
            newValue: change.after,
            newValueText: this.formatSourceChangeValue(field, change.after)
          };
        });
      }
      const fallback = [];
      if (this.isSourceLeveldataModified) {
        fallback.push({
          key: 'leveldataoverride.lua',
          text: this.$t('worlds.settingsPage.sourceEditor.feedback.sourceChangedItem', { file: 'leveldataoverride.lua' }),
          oldValueText: this.$t('worlds.settingsPage.sourceEditor.feedback.sourceBaselineValue'),
          newValueText: this.$t('worlds.settingsPage.sourceEditor.feedback.sourceModifiedValue')
        });
      }
      if (this.isSourceServerIniModified) {
        fallback.push({
          key: 'server.ini',
          text: this.$t('worlds.settingsPage.sourceEditor.feedback.sourceChangedItem', { file: 'server.ini' }),
          oldValueText: this.$t('worlds.settingsPage.sourceEditor.feedback.sourceBaselineValue'),
          newValueText: this.$t('worlds.settingsPage.sourceEditor.feedback.sourceModifiedValue')
        });
      }
      return fallback.length > 0 ? fallback : visualItems;
    },

    describeSourceChangeField(field, fallbackLabel = '') {
      const raw = String(field || '');
      if (raw.startsWith('overrides.')) {
        const itemKey = raw.slice('overrides.'.length);
        const found = this.activeSettings ? this.findItemInSettings(this.activeSettings, itemKey) : null;
        return found?.text || fallbackLabel || itemKey;
      }
      const serverLabels = {
        'server.serverPort': 'worlds.settingsPage.serverIni.serverPort',
        'server.isMaster': 'worlds.settingsPage.serverIni.masterWorld',
        'server.shardName': 'worlds.settingsPage.serverIni.worldName',
        'server.shardId': 'worlds.settingsPage.serverIni.worldId',
        'server.encodeUserPath': 'worlds.settingsPage.serverIni.encodePath',
        'server.masterServerPort': 'worlds.settingsPage.serverIni.masterPort',
        'server.authenticationPort': 'worlds.settingsPage.serverIni.authPort'
      };
      return serverLabels[raw] ? this.$t(serverLabels[raw]) : (fallbackLabel || raw);
    },

    formatSourceChangeValue(field, value) {
      if (value === undefined || value === null || value === '') return '—';
      const raw = String(field || '');
      if (raw.startsWith('overrides.') && this.activeSettings) {
        const itemKey = raw.slice('overrides.'.length);
        const worldType = this.currentWorld?.type === 'cave' ? 'cave' : 'forest';
        const path = this.categoryPathCache?.[`${worldType}_${itemKey}`];
        const category = path ? this.getCategoryByPath(this.activeSettings, path) : null;
        const item = category?.items?.[itemKey];
        if (category && item) {
          const options = this.getItemOptions(category.desc, item.desc);
          if (options && options[value]) return options[value];
        }
      }
      return String(value);
    },

    parseSourceEditorError(error) {
      return extractConfigEditorError(error);
    }
  },
  async beforeRouteLeave() {
    if (this.saveLoading || this.savingServerIni) return true;
    return this.confirmDiscardWorldChanges();
  }
}
</script>

<style scoped>
.world-settings-container {
  width: 100%;
  min-width: 0;
}

.world-settings-container.has-fixed-footer {
  padding-bottom: 88px;
}

.settings-surface {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.page-header,
.header-actions,
.world-tabs-toolbar,
.world-heading,
.form-actions {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  gap: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.header-actions,
.form-actions {
  gap: 8px;
}

.load-error {
  margin: 0;
}

.room-picker-card :deep([data-slot='card-header']),
.world-settings-card > :deep([data-slot='card-header']) {
  border-bottom: 1px solid var(--border);
}

.room-picker-card :deep([data-slot='field']) {
  max-width: 560px;
}

.world-tabs,
.world-section-tabs {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.world-tabs-toolbar {
  min-width: 0;
  justify-content: space-between;
  gap: 8px;
}

.world-card-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.world-source-workspace {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.source-editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.source-file-tabs-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  min-width: 0;
}

.source-statuses-inline {
  padding-bottom: 0;
}

.source-editor-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.source-editor-hint {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 12px;
}

.source-error-location {
  margin: 0 0 2px;
  font-weight: 600;
}

.section-tabs-toolbar {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border);
}

.section-statuses {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 8px;
}

.runtime-source-badge {
  min-width: 0;
  max-width: min(420px, 45vw);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.effect-badge {
  flex: none;
}

.world-tab-list {
  min-width: 0;
  flex: 1;
  max-width: 100%;
  justify-content: flex-start;
  overflow-x: auto;
  scrollbar-width: thin;
}

.world-tab-list :deep([data-slot='tabs-trigger']) {
  min-width: max-content;
  flex: none;
  padding-right: 12px;
  padding-left: 12px;
}

.section-tab-list {
  width: max-content;
  min-width: 0;
  flex: 1;
  height: auto;
  max-width: none;
  justify-content: flex-start;
  padding: 0 0 8px;
  overflow: visible;
  border-bottom: 0;
}

.section-tab-list :deep([data-slot='tabs-trigger']) {
  min-height: 32px;
  flex: none;
  padding-right: 12px;
  padding-left: 12px;
}

.world-heading {
  gap: 10px;
}

.world-heading > svg {
  width: 24px;
  height: 24px;
  flex: none;
  color: var(--primary);
}

.world-page-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.world-tabs-skeleton-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.world-tab-skeleton {
  width: 128px;
  height: 36px;
  border-radius: var(--radius);
}

.world-heading-skeleton {
  width: 220px;
  height: 24px;
}

.skeleton-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-row {
  height: 36px;
  width: 100%;
}

.server-ini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 24px;
}

.server-ini-grid :deep([data-slot='field'][data-orientation='horizontal']) {
  min-height: 72px;
  padding: 12px 14px;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.form-actions {
  grid-column: 1 / -1;
  justify-content: flex-end;
}

#settings-fixed-footer {
  position: fixed;
  right: 0;
  bottom: 0;
  left: var(--sidebar-width, 216px);
  display: flex;
  align-items: center;
  padding: 8px 20px;
  border-top: 1px solid var(--border);
  background: var(--background);
  box-shadow: 0 -3px 14px color-mix(in srgb, var(--foreground) 10%, transparent);
  z-index: 9;
}

:global([data-slot='sidebar-wrapper']:has([data-slot='sidebar'][data-state='collapsed'])) #settings-fixed-footer {
  left: var(--sidebar-width-icon, 3rem);
}

@media (max-width: 767px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .world-tabs-toolbar {
    align-items: flex-start;
  }

  .world-card-actions {
    justify-content: flex-start;
  }

  .source-editor-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .section-tabs-toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 4px;
  }

  .section-statuses {
    justify-content: flex-start;
  }

  .runtime-source-badge {
    max-width: 100%;
  }

  .world-tab-list {
    min-width: 0;
  }

  .server-ini-grid {
    grid-template-columns: 1fr;
  }

  #settings-fixed-footer {
    left: 0;
    padding: 8px 12px;
  }

  .world-settings-container.has-fixed-footer {
    padding-bottom: 128px;
  }
}
</style>

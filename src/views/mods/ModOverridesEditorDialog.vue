<template>
  <UiDialog :open="open" @update:open="handleDialogOpenChange">
    <DialogContent class="sm:max-w-5xl modoverrides-dialog-content">
      <DialogHeader>
        <DialogTitle>{{ $t('mods.installed.configFile.title') }}</DialogTitle>
        <DialogDescription>{{ $t('mods.installed.configFile.description') }}</DialogDescription>
      </DialogHeader>

      <div class="modoverrides-workspace">
        <div class="modoverrides-scope-bar">
          <div v-if="worlds.length > 1" class="scope-group">
            <span class="scope-label">{{ $t('mods.installed.configFile.scope.label') }}</span>
            <ToggleGroup
              :model-value="scope"
              type="single"
              variant="outline"
              size="sm"
              :aria-label="$t('mods.installed.configFile.scope.label')"
              @update:model-value="handleScopeChange"
            >
              <ToggleGroupItem value="room" :disabled="busy">
                <Globe2 />{{ $t('mods.installed.configFile.scope.room') }}
              </ToggleGroupItem>
              <ToggleGroupItem value="world" :disabled="busy">
                <Server />{{ $t('mods.installed.configFile.scope.world', { world: activeWorldName }) }}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div v-if="worlds.length > 1" class="shard-select-group">
            <label for="modoverrides-world-select" class="scope-label">{{ $t('mods.installed.configFile.scope.switchWorld') }}</label>
            <UiSelect :model-value="activeWorldId" :disabled="busy" @update:model-value="handleWorldSelect">
              <SelectTrigger id="modoverrides-world-select" class="shard-select-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="world in worlds" :key="world.id" :value="world.id">
                    {{ world.name }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </UiSelect>
          </div>
          <Badge v-else-if="activeWorldName" variant="outline">{{ activeWorldName }} · modoverrides.lua</Badge>
        </div>

        <p v-if="worlds.length > 1" class="scope-hint">
          {{ scope === 'room'
            ? $t('mods.installed.configFile.scope.roomHint', { count: worlds.length })
            : $t('mods.installed.configFile.scope.worldHint', { world: activeWorldName }) }}
        </p>

        <div class="modoverrides-toolbar">
          <div class="toolbar-primary-actions">
            <input
              ref="fileInputEl"
              type="file"
              class="sr-only"
              accept=".lua,.txt"
              @change="handleFileInputChange"
            />
            <UiButton size="sm" variant="outline" :disabled="busy" @click="pasteFromClipboard">
              <ClipboardPaste data-icon="inline-start" />{{ $t('mods.installed.configFile.toolbar.paste') }}
            </UiButton>
            <UiButton size="sm" variant="outline" :disabled="busy" @click="triggerFileImport">
              <Upload data-icon="inline-start" />{{ $t('mods.installed.configFile.toolbar.importFile') }}
            </UiButton>
            <Tooltip>
              <TooltipTrigger as-child>
                <UiButton size="sm" variant="outline" :disabled="busy" @click="formatContent">
                  <Spinner v-if="formatting" data-icon="inline-start" />
                  <WandSparkles v-else data-icon="inline-start" />
                  {{ $t('mods.installed.configFile.toolbar.format') }}
                </UiButton>
              </TooltipTrigger>
              <TooltipContent>{{ $t('mods.installed.configFile.toolbar.formatHint') }}</TooltipContent>
            </Tooltip>
          </div>

          <div class="toolbar-secondary-actions">
            <UiButton size="sm" variant="ghost" :disabled="loading || saving" @click="reloadFromDisk">
              <RefreshCw data-icon="inline-start" />{{ $t('mods.installed.configFile.cta.reload') }}
            </UiButton>
            <UiButton size="sm" variant="ghost" :disabled="loading" @click="copyContent">
              <Copy data-icon="inline-start" />{{ $t('mods.installed.configFile.toolbar.copy') }}
            </UiButton>
            <UiButton size="sm" variant="ghost" :disabled="loading" @click="downloadContent">
              <Download data-icon="inline-start" />{{ $t('mods.installed.configFile.toolbar.download') }}
            </UiButton>
          </div>
        </div>

        <Alert v-if="loadError" variant="destructive">
          <TriangleAlert />
          <AlertTitle>{{ $t('mods.errors.configFile') }}</AlertTitle>
          <AlertDescription>{{ loadError }}</AlertDescription>
          <AlertAction>
            <UiButton size="sm" variant="outline" @click="loadWorldFile(activeWorldId, { force: true })">
              {{ $t('mods.actions.retry') }}
            </UiButton>
          </AlertAction>
        </Alert>

        <Alert v-if="!loading && !loadError && !isDirty && (!fileExists || diskConfigIsEmpty)" role="status">
          <Info />
          <AlertDescription>
            {{ $t(fileExists ? 'mods.installed.configFile.emptyTableNotice' : 'mods.installed.configFile.emptyNotice', { world: activeWorldName }) }}
          </AlertDescription>
        </Alert>

        <Alert v-if="previewSummary.hasKleiHeaderNotice || previewSummary.hasBareTableNotice" role="status">
          <Info />
          <AlertDescription>
            <span v-if="previewSummary.hasKleiHeaderNotice">{{ $t('mods.installed.configFile.notices.kleiHeader') }}</span>
            <span v-if="previewSummary.hasBareTableNotice">{{ previewSummary.hasKleiHeaderNotice ? ' ' : '' }}{{ $t('mods.installed.configFile.notices.bareTable') }}</span>
          </AlertDescription>
        </Alert>

        <Alert v-if="editorError" variant="destructive">
          <TriangleAlert />
          <AlertTitle>{{ $t('mods.installed.configFile.errors.syntaxTitle') }}</AlertTitle>
          <AlertDescription>
            <p v-if="errorLocationLabel" class="error-location">{{ errorLocationLabel }}</p>
            <p>{{ errorDisplayMessage }}</p>
          </AlertDescription>
          <AlertAction v-if="editorError.isRevisionConflict || editorError.isTopologyChanged">
            <UiButton size="sm" variant="outline" @click="reloadFromDisk">
              {{ $t('mods.installed.configFile.cta.reload') }}
            </UiButton>
          </AlertAction>
        </Alert>

        <div v-if="loading" class="editor-skeleton-stack" :aria-label="$t('mods.installed.configFile.loading')">
          <Skeleton v-for="idx in 8" :key="idx" class="editor-skeleton-row" />
        </div>
        <AsyncConfigCodeEditor
          v-else
          :model-value="draftContent"
          language="lua"
          :read-only="saving"
          :error-line="editorError?.line || 0"
          :error-column="editorError?.column || 0"
          :placeholder="$t('mods.installed.configFile.placeholder')"
          aria-label="modoverrides.lua"
          @update:model-value="handleEditorInput"
          @import-file="importLuaFile"
        />

        <div v-if="!loading && !loadError" class="modoverrides-status-stack" aria-live="polite">
          <div class="preview-summary-bar">
            <div class="preview-summary-left">
              <template v-if="previewing">
                <Spinner class="size-3.5" />
                <span class="preview-hint">{{ $t('mods.installed.configFile.preview.checking') }}</span>
              </template>
              <template v-else-if="!editorError && previewData">
                <template v-if="previewSummary.totalChanges === 0">
                  <Check class="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span class="preview-hint">{{ $t('mods.installed.configFile.preview.noChanges') }}</span>
                </template>
                <template v-else>
                  <span class="preview-summary-title">{{ $t('mods.installed.configFile.preview.summaryTitle') }}</span>
                  <Badge v-if="previewSummary.added > 0" variant="secondary">
                    {{ $t('mods.installed.configFile.preview.added', { count: previewSummary.added }) }}
                  </Badge>
                  <Badge v-if="previewSummary.removed > 0" variant="outline">
                    {{ $t('mods.installed.configFile.preview.removed', { count: previewSummary.removed }) }}
                  </Badge>
                  <Badge v-if="previewSummary.enabledChanged > 0" variant="outline">
                    {{ $t('mods.installed.configFile.preview.enabledChanged', { count: previewSummary.enabledChanged }) }}
                  </Badge>
                  <Badge v-if="previewSummary.optionsChanged > 0" variant="outline">
                    {{ $t('mods.installed.configFile.preview.optionsChanged', { count: previewSummary.optionsChanged }) }}
                  </Badge>
                </template>
              </template>
            </div>
            <span class="preview-hint">{{ $t('mods.installed.configFile.notices.commentsPreserved') }}</span>
          </div>

          <div v-if="!editorError && previewSummary.changes.length > 0" class="preview-change-chips">
            <Badge
              v-for="item in previewSummary.changes.slice(0, 8)"
              :key="item.modId"
              variant="outline"
              class="change-chip"
            >
              <span class="truncate max-w-[180px]">{{ item.name || item.modId }}</span>
              <span class="change-chip-action">{{ changeActionLabel(item.action) }}</span>
            </Badge>
            <Badge v-if="previewSummary.changes.length > 8" variant="ghost">
              +{{ previewSummary.changes.length - 8 }}
            </Badge>
          </div>

          <Alert v-if="!editorError && previewSummary.missingWorkshopCount > 0">
            <Download />
            <AlertTitle>
              {{ $t('mods.installed.configFile.preview.missingWorkshopTitle', { count: previewSummary.missingWorkshopCount }) }}
            </AlertTitle>
            <AlertDescription>
              <p>{{ $t('mods.installed.configFile.preview.missingWorkshopDescription') }}</p>
              <div class="missing-id-badges">
                <Badge v-for="modId in previewSummary.missingWorkshopIds.slice(0, 8)" :key="modId" variant="secondary">
                  {{ missingModDisplayName(modId) }}
                </Badge>
                <Badge v-if="previewSummary.missingWorkshopIds.length > 8" variant="outline">
                  +{{ previewSummary.missingWorkshopIds.length - 8 }}
                </Badge>
              </div>
            </AlertDescription>
          </Alert>

          <Alert v-if="!editorError && previewSummary.missingLocalCount > 0" variant="destructive">
            <TriangleAlert />
            <AlertTitle>
              {{ $t('mods.installed.configFile.preview.missingLocalTitle', { count: previewSummary.missingLocalCount }) }}
            </AlertTitle>
            <AlertDescription>
              {{ $t('mods.installed.configFile.preview.missingLocalDescription', {
                ids: previewSummary.missingLocalModIds.join(', ')
              }) }}
            </AlertDescription>
          </Alert>

          <div v-if="savingWithDownload" class="download-progress-bar">
            <UiProgress :model-value="saveProgress" />
          </div>
        </div>
      </div>

      <DialogFooter class="modoverrides-footer">
        <UiButton variant="outline" :disabled="saving" @click="requestClose">
          {{ $t('mods.actions.cancel') }}
        </UiButton>

        <template v-if="previewSummary.missingWorkshopCount > 0 && !editorError">
          <UiButton
            variant="outline"
            :disabled="!canSaveFileOnly"
            @click="applyConfig({ downloadMissing: false })"
          >
            <Spinner v-if="saving && !savingWithDownload" data-icon="inline-start" />
            {{ $t('mods.installed.configFile.cta.saveFileOnly') }}
          </UiButton>
          <UiButton
            :disabled="!canDownloadAndSave"
            @click="applyConfig({ downloadMissing: true })"
          >
            <Spinner v-if="savingWithDownload" data-icon="inline-start" />
            <Download v-else data-icon="inline-start" />
            {{ savingWithDownload
              ? $t('mods.installed.configFile.cta.downloadingAndSaving', { progress: saveProgress })
              : $t('mods.installed.configFile.cta.saveAndDownload', { count: previewSummary.missingWorkshopCount }) }}
          </UiButton>
        </template>

        <UiButton
          v-else
          :disabled="!canSaveFileOnly"
          @click="applyConfig({ downloadMissing: false })"
        >
          <Spinner v-if="saving" data-icon="inline-start" />
          <Check v-else data-icon="inline-start" />
          {{ saving ? $t('mods.installed.configFile.cta.saving') : $t('mods.installed.configFile.cta.save') }}
        </UiButton>
      </DialogFooter>
    </DialogContent>
  </UiDialog>
</template>

<script>
import { Check, ClipboardPaste, Copy, Download, Globe2, Info, RefreshCw, Server, TriangleAlert, Upload, WandSparkles } from '@lucide/vue'
import { toast } from 'vue-sonner'
import AsyncConfigCodeEditor from '@/components/editor/AsyncConfigCodeEditor'
import { modApi } from '@/api'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress as UiProgress } from '@/components/ui/progress'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSharedJobStatus } from '@/composables/useGlobalJobStatus'
import { confirmAction } from '@/lib/feedback'
import { emitGlobalJobSubmitted } from '@/lib/globalJobs.mjs'
import {
  defaultModOverridesScope,
  extractConfigEditorError,
  resolveModOverridesWorldIds,
  summarizeModOverridesPreview
} from '@/lib/configEditorSupport.mjs'

export default {
  name: 'ModOverridesEditorDialog',
  components: {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
    AsyncConfigCodeEditor,
    Badge,
    Check,
    ClipboardPaste,
    Copy,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Download,
    Globe2,
    Info,
    RefreshCw,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Server,
    Skeleton,
    Spinner,
    ToggleGroup,
    ToggleGroupItem,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TriangleAlert,
    UiButton,
    UiDialog,
    UiProgress,
    UiSelect,
    Upload,
    WandSparkles
  },
  props: {
    open: {
      type: Boolean,
      default: false
    },
    roomId: {
      type: String,
      default: ''
    },
    worlds: {
      type: Array,
      default: () => []
    },
    initialWorldId: {
      type: String,
      default: ''
    },
    initialScope: {
      type: String,
      default: ''
    }
  },
  emits: ['update:open', 'applied'],
  setup() {
    return {
      jobStatus: useSharedJobStatus()
    }
  },
  data() {
    return {
      scope: 'room',
      activeWorldId: '',
      loading: false,
      loadError: '',
      fileExists: true,
      baselineContent: '',
      draftContent: '',
      expectedRevision: '',
      expectedRevisions: {},
      expectedTopologyRevision: '',
      previewing: false,
      formatting: false,
      saving: false,
      savingWithDownload: false,
      saveProgress: 0,
      previewData: null,
      editorError: null,
      previewTimer: null,
      loadEpoch: 0,
      previewEpoch: 0
    }
  },
  computed: {
    activeWorld() {
      return this.worlds.find(world => world.id === this.activeWorldId) || this.worlds[0] || null
    },
    activeWorldName() {
      return this.activeWorld?.name || ''
    },
    targetWorldIds() {
      return resolveModOverridesWorldIds(this.scope, this.activeWorldId, this.worlds)
    },
    isDirty() {
      return !this.loading && this.draftContent !== this.baselineContent
    },
    diskConfigIsEmpty() {
      return /^\s*return\s*\{\s*\}\s*;?\s*$/.test(this.baselineContent)
    },
    busy() {
      return Boolean(this.loading || this.formatting || this.saving)
    },
    previewSummary() {
      return summarizeModOverridesPreview(this.previewData)
    },
    hasDivergentTargetRevisions() {
      const nextRevision = String(this.previewData?.nextRevision || '').trim()
      if (!nextRevision) return false
      return this.targetWorldIds.some(
        wid => this.expectedRevisions[wid] !== undefined && this.expectedRevisions[wid] !== nextRevision
      )
    },
    canSaveFileOnly() {
      return Boolean(
        !this.busy
        && !this.loadError
        && !this.editorError
        && this.activeWorldId
        && (
          this.isDirty
          || this.previewSummary.totalChanges > 0
          || this.hasDivergentTargetRevisions
          || !this.fileExists
        )
      )
    },
    canDownloadAndSave() {
      return Boolean(
        !this.busy
        && !this.loadError
        && !this.editorError
        && this.activeWorldId
        && this.previewSummary.missingWorkshopCount > 0
      )
    },
    errorLocationLabel() {
      if (!this.editorError?.line) return ''
      if (this.editorError.column) {
        return this.$t('mods.installed.configFile.errors.syntaxLocation', {
          line: this.editorError.line,
          column: this.editorError.column
        })
      }
      return this.$t('mods.installed.configFile.errors.syntaxLineOnly', {
        line: this.editorError.line
      })
    },
    errorDisplayMessage() {
      if (!this.editorError) return ''
      if (this.editorError.isTooLarge) {
        return this.$t('mods.installed.configFile.errors.tooLarge')
      }
      if (this.editorError.isRevisionConflict) {
        return this.$t('mods.installed.configFile.errors.revisionConflict')
      }
      if (this.editorError.isTopologyChanged) {
        return this.$t('mods.installed.configFile.errors.topologyChanged')
      }
      return this.editorError.rawMessage || this.$t('common.errors.unknown')
    }
  },
  watch: {
    open: {
      immediate: true,
      handler(isOpen) {
        if (isOpen) {
          this.initializeDialog()
        } else {
          this.clearTimers()
        }
      }
    }
  },
  beforeUnmount() {
    this.loadEpoch += 1
    this.previewEpoch += 1
    this.clearTimers()
  },
  methods: {
    clearTimers() {
      if (this.previewTimer) {
        clearTimeout(this.previewTimer)
        this.previewTimer = null
      }
    },

    initializeDialog() {
      this.clearTimers()
      this.scope = this.initialScope || defaultModOverridesScope(this.worlds)
      if (this.worlds.length <= 1) {
        this.scope = 'world'
      }
      const preferredWorld = this.worlds.find(world => world.id === this.initialWorldId)
        || this.worlds.find(world => world.isMaster || world.is_master)
        || this.worlds[0]
      this.activeWorldId = preferredWorld?.id || ''
      this.previewData = null
      this.editorError = null
      this.loadError = ''
      if (this.roomId && this.activeWorldId) {
        void this.loadWorldFile(this.activeWorldId, { force: true })
      }
    },

    async loadWorldFile(worldId, { force = false } = {}) {
      if (!this.roomId || !worldId) return
      if (!force && this.loading) return
      this.clearTimers()
      const epoch = ++this.loadEpoch
      this.loading = true
      this.loadError = ''
      this.editorError = null
      this.previewData = null
      try {
        const response = await modApi.getAllModConfigFile({
          roomId: this.roomId,
          worldId
        })
        if (epoch !== this.loadEpoch) return
        const file = response?.file || {}
        this.fileExists = Boolean(file.exists)
        const initialContent = file.content ? String(file.content) : 'return {\n}\n'
        this.baselineContent = initialContent
        this.draftContent = initialContent
        this.expectedRevision = String(file.revision || '')
        if (file.worldRevisions && typeof file.worldRevisions === 'object') {
          this.expectedRevisions = { ...file.worldRevisions }
        } else {
          this.expectedRevisions = worldId && file.revision ? { [worldId]: String(file.revision) } : {}
        }
        this.expectedTopologyRevision = String(file.topologyRevision || '')
        await this.runPreview({ normalizeIntoEditor: false })
      } catch (error) {
        if (epoch !== this.loadEpoch) return
        this.loadError = error?.rawMessage || error?.message || this.$t('mods.errors.configFile')
      } finally {
        if (epoch === this.loadEpoch) {
          this.loading = false
        }
      }
    },

    async reloadFromDisk() {
      if (this.isDirty && !(await this.confirmDiscardChanges())) return
      await this.loadWorldFile(this.activeWorldId, { force: true })
    },

    handleScopeChange(nextScope) {
      if (!nextScope || nextScope === this.scope || this.busy) return
      this.scope = nextScope
      void this.runPreview({ normalizeIntoEditor: false })
    },

    async handleWorldSelect(nextWorldId) {
      if (!nextWorldId || nextWorldId === this.activeWorldId || this.busy) return
      if (this.isDirty && !(await this.confirmDiscardChanges())) return
      this.activeWorldId = nextWorldId
      await this.loadWorldFile(nextWorldId, { force: true })
    },

    handleEditorInput(nextValue) {
      if (this.saving) return
      const value = String(nextValue ?? '')
      if (value === this.draftContent) return
      const previous = this.draftContent
      this.draftContent = value
      if (this.editorError) {
        this.editorError = null
      }
      const looksLikePaste = Math.abs(value.length - previous.length) > 32 || value.trimStart().startsWith('KLEI')
      this.schedulePreview({ normalizeIntoEditor: looksLikePaste })
    },

    schedulePreview({ normalizeIntoEditor = false } = {}) {
      this.clearTimers()
      this.previewTimer = setTimeout(() => {
        this.previewTimer = null
        void this.runPreview({ normalizeIntoEditor })
      }, 400)
    },

    buildScopedExpectedRevisions(worldIds = this.targetWorldIds) {
      const scoped = {}
      for (const wid of worldIds) {
        if (this.expectedRevisions[wid] !== undefined && this.expectedRevisions[wid] !== '') {
          scoped[wid] = this.expectedRevisions[wid]
        }
      }
      return scoped
    },

    mergeMissingBaselineRevisions(preview) {
      if (!preview) return
      if (!this.expectedRevision && preview.revision) {
        this.expectedRevision = String(preview.revision)
      }
      if (!this.expectedTopologyRevision && preview.topologyRevision) {
        this.expectedTopologyRevision = String(preview.topologyRevision)
      }
      if (preview.worldRevisions && typeof preview.worldRevisions === 'object') {
        let updated = null
        for (const [wid, rev] of Object.entries(preview.worldRevisions)) {
          if (!this.expectedRevisions[wid] && rev) {
            if (!updated) updated = { ...this.expectedRevisions }
            updated[wid] = String(rev)
          }
        }
        if (updated) {
          this.expectedRevisions = updated
        }
      }
    },

    async runPreview({ normalizeIntoEditor = false } = {}) {
      if (!this.roomId || !this.activeWorldId) return null
      const epoch = ++this.previewEpoch
      this.previewing = true
      try {
        const targetIds = this.targetWorldIds
        const scopedExpectedRevisions = this.buildScopedExpectedRevisions(targetIds)
        const preview = await modApi.previewModConfigFile({
          roomId: this.roomId,
          worldId: this.activeWorldId,
          worldIds: targetIds,
          content: this.draftContent,
          expectedRevision: scopedExpectedRevisions[this.activeWorldId] || this.expectedRevision || '',
          expectedRevisions: scopedExpectedRevisions,
          expectedTopologyRevision: this.expectedTopologyRevision || ''
        })
        if (epoch !== this.previewEpoch) return null
        this.previewData = preview
        this.editorError = null
        this.mergeMissingBaselineRevisions(preview)
        if (
          normalizeIntoEditor
          && Array.isArray(preview?.notices)
          && (preview.notices.includes('stripped_klei_header') || preview.notices.includes('wrapped_bare_table'))
          && preview.normalizedContent
        ) {
          this.draftContent = String(preview.normalizedContent)
        }
        return preview
      } catch (error) {
        if (epoch !== this.previewEpoch) return null
        this.editorError = extractConfigEditorError(error)
        return null
      } finally {
        if (epoch === this.previewEpoch) {
          this.previewing = false
        }
      }
    },

    async pasteFromClipboard() {
      if (this.busy) return
      const clipboard = window?.navigator?.clipboard
      if (!clipboard || typeof clipboard.readText !== 'function') {
        toast.warning(this.$t('mods.installed.configFile.feedback.clipboardDenied'))
        return
      }
      try {
        const text = await clipboard.readText()
        if (!text || !text.trim()) {
          toast.warning(this.$t('mods.installed.configFile.feedback.clipboardEmpty'))
          return
        }
        this.clearTimers()
        this.draftContent = String(text)
        this.editorError = null
        toast.success(this.$t('mods.installed.configFile.feedback.pasted'))
        await this.runPreview({ normalizeIntoEditor: true })
      } catch {
        toast.warning(this.$t('mods.installed.configFile.feedback.clipboardDenied'))
      }
    },

    triggerFileImport() {
      if (this.busy) return
      const input = this.$refs.fileInputEl
      if (input && typeof input.click === 'function') {
        input.value = ''
        input.click()
      }
    },

    async handleFileInputChange(event) {
      const file = event?.target?.files?.[0]
      if (!file) return
      await this.importLuaFile(file)
    },

    async importLuaFile(file) {
      if (!file || this.saving) return
      if (file.size > 4 * 1024 * 1024) {
        this.editorError = {
          code: 'CONFIGURATION_FILE_TOO_LARGE',
          file: 'modoverrides.lua',
          line: 0,
          column: 0,
          isTooLarge: true,
          rawMessage: this.$t('mods.installed.configFile.errors.tooLarge')
        }
        return
      }
      try {
        const text = typeof file.text === 'function' ? await file.text() : await this.readTextFallback(file)
        this.clearTimers()
        this.draftContent = String(text)
        this.editorError = null
        toast.success(this.$t('mods.installed.configFile.feedback.imported', { name: file.name || 'modoverrides.lua' }))
        await this.runPreview({ normalizeIntoEditor: true })
      } catch (error) {
        toast.error(this.$t('mods.installed.configFile.feedback.importFailed', {
          error: error?.message || this.$t('common.errors.unknown')
        }))
      }
    },

    readTextFallback(file) {
      return new Promise((resolve, reject) => {
        const Reader = window?.FileReader
        if (!Reader) {
          reject(new Error('FileReader unavailable'))
          return
        }
        const reader = new Reader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error || new Error('File read failed'))
        reader.readAsText(file, 'utf-8')
      })
    },

    async formatContent() {
      if (this.busy || !this.roomId || !this.activeWorldId) return
      this.clearTimers()
      this.formatting = true
      try {
        const targetIds = this.targetWorldIds
        const scopedExpectedRevisions = this.buildScopedExpectedRevisions(targetIds)
        const preview = await modApi.previewModConfigFile({
          roomId: this.roomId,
          worldId: this.activeWorldId,
          worldIds: targetIds,
          content: this.draftContent,
          expectedRevision: scopedExpectedRevisions[this.activeWorldId] || this.expectedRevision || '',
          expectedRevisions: scopedExpectedRevisions,
          expectedTopologyRevision: this.expectedTopologyRevision || '',
          format: true
        })
        this.previewData = preview
        this.editorError = null
        if (preview?.normalizedContent) {
          this.draftContent = String(preview.normalizedContent)
        }
        this.mergeMissingBaselineRevisions(preview)
        toast.success(this.$t('mods.installed.configFile.feedback.formatted'))
      } catch (error) {
        this.editorError = extractConfigEditorError(error)
      } finally {
        this.formatting = false
      }
    },

    async copyContent() {
      const clipboard = window?.navigator?.clipboard
      if (!clipboard || typeof clipboard.writeText !== 'function') {
        toast.error(this.$t('mods.installed.configFile.feedback.copyFailed'))
        return
      }
      try {
        await clipboard.writeText(this.draftContent || '')
        toast.success(this.$t('mods.installed.configFile.feedback.copied'))
      } catch {
        toast.error(this.$t('mods.installed.configFile.feedback.copyFailed'))
      }
    },

    downloadContent() {
      const BlobCtor = window?.Blob || (typeof Blob !== 'undefined' ? Blob : null)
      const urlApi = window?.URL || (typeof URL !== 'undefined' ? URL : null)
      if (!BlobCtor || !urlApi || typeof document?.createElement !== 'function') return

      const blob = new BlobCtor([this.draftContent || ''], { type: 'text/plain;charset=utf-8' })
      const href = urlApi.createObjectURL(blob)
      const link = document.createElement('a')
      const safeName = (this.activeWorldName || 'world').replace(/[^a-zA-Z0-9_-]+/g, '-')
      link.href = href
      link.download = `${safeName}-modoverrides.lua`
      document.body?.appendChild(link)
      link.click()
      link.remove?.()
      urlApi.revokeObjectURL(href)
      toast.success(this.$t('mods.installed.feedback.configFileDownloaded'))
    },

    async applyConfig({ downloadMissing = false } = {}) {
      if (this.saving || !this.roomId || !this.activeWorldId) return
      const hadPendingPreview = Boolean(this.previewTimer)
      this.clearTimers()

      const targetIds = this.targetWorldIds
      const missingRevisionForTarget = targetIds.some(wid => !this.expectedRevisions[wid])
      if (hadPendingPreview || Object.keys(this.expectedRevisions).length === 0 || missingRevisionForTarget) {
        const refreshed = await this.runPreview({ normalizeIntoEditor: false })
        if (!refreshed) return
      }
      const scopedExpectedRevisions = this.buildScopedExpectedRevisions(targetIds)

      this.saving = true
      this.savingWithDownload = Boolean(downloadMissing)
      this.saveProgress = downloadMissing ? 5 : 0
      try {
        const outcome = await modApi.applyModConfigFile({
          roomId: this.roomId,
          worldId: this.activeWorldId,
          worldIds: targetIds,
          content: this.draftContent,
          expectedRevision: scopedExpectedRevisions[this.activeWorldId] || this.expectedRevision,
          expectedRevisions: scopedExpectedRevisions,
          expectedTopologyRevision: this.expectedTopologyRevision,
          downloadMissing,
          waitForJob: this.jobStatus?.waitForJob,
          onSubmitted: job => {
            emitGlobalJobSubmitted(job)
          },
          onProgress: job => {
            const pct = Number(job?.progress) || 0
            if (pct > 0) {
              this.saveProgress = Math.max(this.saveProgress, Math.min(99, Math.round(pct)))
            }
          }
        })

        this.saveProgress = 100
        this.baselineContent = this.draftContent
        this.fileExists = true

        if (outcome.mode === 'job') {
          toast.success(this.$t('mods.installed.configFile.feedback.downloadedAndSaved'))
        } else if (this.scope === 'room' && targetIds.length > 1) {
          toast.success(this.$t('mods.installed.configFile.feedback.savedRoom', { count: targetIds.length }))
        } else {
          toast.success(this.$t('mods.installed.configFile.feedback.savedWorld', { world: this.activeWorldName }))
        }

        this.$emit('applied', {
          roomId: this.roomId,
          worldIds: targetIds,
          mode: outcome.mode,
          revisions: outcome.result?.revisions || {}
        })
        this.$emit('update:open', false)
      } catch (error) {
        const parsed = extractConfigEditorError(error)
        this.editorError = parsed
        toast.error(parsed?.rawMessage || error?.message || this.$t('mods.errors.applyConfigFile'))
      } finally {
        this.saving = false
        this.savingWithDownload = false
        this.saveProgress = 0
      }
    },

    changeActionLabel(action) {
      const key = `mods.installed.configFile.preview.actionLabels.${action}`
      return this.$te(key) ? this.$t(key) : action
    },

    missingModDisplayName(modId) {
      const match = this.previewSummary.changes.find(item => item.modId === modId || item.modId === `workshop-${modId}`)
      if (match?.name) return `${match.name} (${modId})`
      return `workshop-${modId}`
    },

    async confirmDiscardChanges() {
      if (!this.isDirty) return true
      try {
        await confirmAction(
          this.$t('mods.installed.configFile.feedback.discardConfirmDescription'),
          this.$t('mods.installed.configFile.feedback.discardConfirmTitle'),
          { type: 'warning' }
        )
        return true
      } catch {
        return false
      }
    },

    async handleDialogOpenChange(nextOpen) {
      if (nextOpen) {
        this.$emit('update:open', true)
        return
      }
      await this.requestClose()
    },

    async requestClose() {
      if (this.saving) return
      if (this.isDirty && !(await this.confirmDiscardChanges())) return
      this.$emit('update:open', false)
    }
  }
}
</script>

<style scoped>
.modoverrides-dialog-content {
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modoverrides-workspace {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  overflow-y: auto;
  padding-right: 2px;
}

.modoverrides-scope-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.scope-group,
.shard-select-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.scope-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted-foreground);
}

.shard-select-trigger {
  min-width: 140px;
  height: 32px;
}

.scope-hint {
  margin: -4px 0 0;
  font-size: 12px;
  color: var(--muted-foreground);
}

.modoverrides-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.toolbar-primary-actions,
.toolbar-secondary-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.editor-skeleton-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.editor-skeleton-row {
  height: 32px;
  width: 100%;
}

.modoverrides-status-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-summary-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.preview-summary-title {
  font-size: 12px;
  font-weight: 500;
}

.preview-hint {
  font-size: 12px;
  color: var(--muted-foreground);
}

.preview-change-chips,
.missing-id-badges {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.missing-id-badges {
  margin-top: 6px;
}

.change-chip {
  gap: 6px;
}

.change-chip-action {
  color: var(--muted-foreground);
  font-size: 11px;
}

.error-location {
  margin: 0 0 2px;
  font-weight: 600;
}

.download-progress-bar {
  padding-top: 2px;
}

.modoverrides-footer {
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 640px) {
  .modoverrides-scope-bar,
  .modoverrides-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>

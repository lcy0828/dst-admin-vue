<template>
  <AlertDialog :open="isAlertDialogOpen" @update:open="handleConfirmOpen">
    <AlertDialogContent :class="cn(isCapacityRisk && 'sm:max-w-xl')">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ isCapacityRisk ? t('capacityRisk.title') : activeRequest?.title }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ isCapacityRisk ? t('capacityRisk.description') : activeRequest?.message }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div v-if="isMaintenance" class="flex flex-col gap-2" role="status" aria-live="polite">
        <p class="font-medium">{{ maintenancePresenceLabel }}</p>
        <p class="text-sm text-muted-foreground">{{ maintenancePolicyLabel }}</p>
        <p v-if="activeRequest?.options?.allowImmediate !== false" class="text-sm text-muted-foreground">
          {{ t('feedback.maintenance.immediateHint') }}
        </p>
      </div>
      <template v-if="isCapacityRisk">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('capacityRisk.node') }}</TableHead>
              <TableHead class="text-right">{{ t('capacityRisk.current') }}</TableHead>
              <TableHead class="text-right">{{ t('capacityRisk.starting') }}</TableHead>
              <TableHead class="text-right">{{ t('capacityRisk.projected') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="target in capacityTargets" :key="target.targetId">
              <TableCell>
                <div class="flex min-w-0 flex-col gap-1">
                  <span class="truncate font-medium">{{ target.targetName || target.targetId }}</span>
                  <Badge :variant="capacityBadgeVariant(target)" class="w-fit">
                    {{ capacityStatusLabel(target) }}
                  </Badge>
                </div>
              </TableCell>
              <TableCell class="text-right tabular-nums">
                {{ t('capacityRisk.shards', { count: target.currentRunningShards || 0 }) }}
              </TableCell>
              <TableCell class="text-right tabular-nums">
                {{ t('capacityRisk.addedShards', { count: target.startingShards || 0 }) }}
              </TableCell>
              <TableCell class="text-right font-medium tabular-nums">
                {{ projectedCapacityLabel(target) }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Alert>
          <Cpu />
          <AlertTitle>{{ t('capacityRisk.policyTitle') }}</AlertTitle>
          <AlertDescription>
            {{ t('capacityRisk.policyFallback') }}
          </AlertDescription>
        </Alert>
      </template>
      <AlertDialogFooter>
        <AlertDialogCancel @click="cancelRequest">
          {{ isCapacityRisk ? t('capacityRisk.cancel') : activeRequest?.options?.cancelButtonText || t('common.actions.cancel') }}
        </AlertDialogCancel>
        <Button
          v-if="isMaintenance && activeRequest?.options?.allowImmediate !== false && (maintenanceLoading || maintenancePreview?.onlinePlayers !== 0) && maintenancePreview?.policy?.enabled !== false"
          type="button"
          variant="outline"
          @click="confirmImmediate"
        >
          {{ t('feedback.maintenance.immediate') }}
        </Button>
        <Button
          type="button"
          :variant="isDestructive ? 'destructive' : 'default'"
          :disabled="isMaintenance && maintenanceLoading"
          @click="confirmRequest"
        >
          {{ isCapacityRisk ? t('capacityRisk.confirm') : isMaintenance && maintenanceWillWait ? t('feedback.maintenance.notifyFirst') : activeRequest?.options?.confirmButtonText || t('common.actions.confirm') }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <Dialog :open="activeRequest?.kind === 'prompt'" @update:open="handlePromptOpen">
    <DialogContent :show-close-button="false">
      <DialogHeader>
        <DialogTitle>{{ activeRequest?.title }}</DialogTitle>
        <DialogDescription>{{ activeRequest?.message }}</DialogDescription>
      </DialogHeader>
      <Field :data-invalid="Boolean(promptError)">
        <FieldLabel for="global-feedback-prompt" class="sr-only">{{ t('common.feedback.input') }}</FieldLabel>
        <Input
          id="global-feedback-prompt"
          ref="promptInput"
          v-model="promptValue"
          :placeholder="activeRequest?.options?.inputPlaceholder || ''"
          :aria-invalid="Boolean(promptError)"
          @keyup.enter="confirmPrompt"
        />
        <FieldError v-if="promptError">{{ promptError }}</FieldError>
      </Field>
      <DialogFooter>
        <Button variant="outline" @click="cancelRequest">
          {{ activeRequest?.options?.cancelButtonText || t('common.actions.cancel') }}
        </Button>
        <Button @click="confirmPrompt">
          {{ activeRequest?.options?.confirmButtonText || t('common.actions.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog :open="activeRequest?.kind === 'runtime-mode'" @update:open="handleRuntimeModeOpen">
    <DialogContent :show-close-button="false" class="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{{ t('runtimeMode.title') }}</DialogTitle>
        <DialogDescription>{{ t('runtimeMode.description') }}</DialogDescription>
      </DialogHeader>

      <ToggleGroup
        type="single"
        orientation="vertical"
        variant="outline"
        :model-value="runtimeEngineValue"
        class="w-full"
        :spacing="2"
        @update:model-value="selectRuntimeEngine"
      >
        <ToggleGroupItem
          v-for="engine in runtimeEngineOptions"
          :key="engine"
          :value="engine"
          class="h-auto w-full justify-start whitespace-normal p-3 text-left"
        >
          <span class="flex min-w-0 flex-1 flex-col items-start gap-1">
            <span class="flex w-full flex-wrap items-center gap-2">
              <span class="font-medium">{{ t(`runtimeMode.engines.${engine}.name`) }}</span>
              <Badge :variant="runtimeEngineBadgeVariant(engine)">
                {{ runtimeEngineBadgeLabel(engine) }}
              </Badge>
              <Badge v-if="engine === 'luajit' && runtimeVersionValue" variant="secondary">
                V{{ runtimeVersionValue }}
              </Badge>
            </span>
            <span class="text-sm font-normal text-muted-foreground">
              {{ t(`runtimeMode.engines.${engine}.description`) }}
            </span>
            <span
              v-if="engine === 'luajit' && !canUseLuaJIT"
              class="text-sm font-normal text-destructive"
            >
              {{ runtimeSelectionUnavailableReason() }}
            </span>
          </span>
        </ToggleGroupItem>
      </ToggleGroup>

      <FieldSet v-if="runtimeEngineValue === 'luajit'">
        <FieldLegend>{{ t('runtimeMode.version.title') }}</FieldLegend>
        <FieldDescription>{{ t('runtimeMode.version.description') }}</FieldDescription>
        <FieldGroup>
          <Field :data-invalid="!canUseLuaJIT || undefined">
            <span class="flex flex-wrap items-center justify-between gap-2">
              <FieldLabel for="runtime-package-version">{{ t('runtimeMode.version.label') }}</FieldLabel>
              <Badge :variant="runtimeVersionBadgeVariant">{{ runtimeVersionBadgeLabel }}</Badge>
            </span>
            <Select :model-value="runtimeVersionValue" @update:model-value="selectRuntimeVersion">
              <SelectTrigger id="runtime-package-version" class="w-full" :aria-invalid="!canUseLuaJIT">
                <SelectValue :placeholder="t('runtimeMode.version.placeholder')" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{{ t('runtimeMode.version.group') }}</SelectLabel>
                  <SelectItem v-for="option in runtimeVersionOptions" :key="option.id" :value="option.version">
                    {{ runtimeVersionOptionLabel(option) }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>{{ runtimeVersionSummary }}</FieldDescription>
            <FieldError v-if="!canUseLuaJIT">{{ runtimeSelectionUnavailableReason() }}</FieldError>
          </Field>
        </FieldGroup>
      </FieldSet>

      <Collapsible
        v-if="runtimeEngineValue === 'luajit'"
        v-model:open="runtimeAdvancedOpen"
        class="rounded-md border"
      >
        <CollapsibleTrigger as-child>
          <Button type="button" variant="ghost" class="w-full justify-between px-3">
            <Settings2 data-icon="inline-start" />
            <span class="flex-1 text-left">{{ t('runtimeMode.advanced.title') }}</span>
            <ChevronDown
              data-icon="inline-end"
              :class="cn('transition-transform duration-200', runtimeAdvancedOpen && 'rotate-180')"
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <FieldSet class="px-3 pb-3">
            <FieldLegend class="sr-only">{{ t('runtimeMode.advanced.title') }}</FieldLegend>
            <FieldDescription>{{ t('runtimeMode.advanced.description') }}</FieldDescription>
            <FieldGroup class="mt-3 gap-4">
              <Field orientation="horizontal" :data-disabled="runtimeGenerationalGCToggleDisabled || undefined">
                <FieldContent>
                  <span class="flex flex-wrap items-center gap-2">
                    <FieldLabel for="runtime-generational-gc">
                      {{ t('runtimeMode.advanced.generationalGC.name') }}
                    </FieldLabel>
                    <Badge variant="outline">{{ t('runtimeMode.advanced.generationalGC.badge') }}</Badge>
                  </span>
                  <FieldDescription>
                    {{ t('runtimeMode.advanced.generationalGC.description') }}
                    <span v-if="!isRuntimeModeSupported('arena-gc')" class="text-destructive">
                      {{ t('runtimeMode.advanced.unavailable') }}
                    </span>
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id="runtime-generational-gc"
                  :model-value="runtimeGenerationalGCEnabled"
                  :disabled="runtimeGenerationalGCToggleDisabled"
                  @update:model-value="updateRuntimeGenerationalGC"
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </CollapsibleContent>
      </Collapsible>

      <Alert>
        <FlaskConical />
        <AlertTitle>{{ t('runtimeMode.experimentalTitle') }}</AlertTitle>
        <AlertDescription>{{ t('runtimeMode.experimentalDescription') }}</AlertDescription>
      </Alert>

      <DialogFooter>
        <Button v-if="!canUseLuaJIT" variant="outline" @click="openLuaJITInstaller">{{ t('luajitInstaller.open') }}</Button>
        <Button variant="outline" @click="cancelRequest">
          {{ t('runtimeMode.cancel') }}
        </Button>
        <Button :disabled="!isSelectedRuntimeModeSupported" @click="confirmRuntimeMode">
          {{ t('runtimeMode.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { useRouter } from 'vue-router'
const luajitInstallerRouter = useRouter()
function openLuaJITInstaller() { cancelRequest(); luajitInstallerRouter.push({ name: 'GameReleases', hash: '#luajit' }) }
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, Cpu, FlaskConical, Settings2 } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { capacityRiskLimit, capacityRiskTargets } from '@/lib/capacityRisk.mjs'
import { registerFeedbackHost } from '@/lib/feedback'
import {
  firstSupportedLuaJITMode,
  luaJITPackageOptions,
  LUAJIT_RUNTIME_MODES,
  normalizeRuntimePackageVersion,
  preferredRuntimePackageVersion,
  runtimeModeFromSelection,
  runtimePackageVersionReady,
  runtimeSelectionFromMode,
} from '@/lib/runtimeModeSelection.mjs'
import { cn } from '@/lib/utils'

const { t, te } = useI18n()
const activeRequest = ref(null)
const requestQueue = []
const promptValue = ref('')
const promptError = ref('')
const promptInput = ref(null)
const runtimeEngineValue = ref('game')
const runtimeVersionValue = ref('')
const runtimeGenerationalGCEnabled = ref(false)
const runtimeAdvancedOpen = ref(false)
const runtimeEngineOptions = ['game', 'luajit']
const isCapacityRisk = computed(() => activeRequest.value?.kind === 'capacity-risk')
const isMaintenance = computed(() => activeRequest.value?.kind === 'maintenance')
const isAlertDialogOpen = computed(() => ['confirm', 'capacity-risk', 'maintenance'].includes(activeRequest.value?.kind))
const maintenancePreview = ref(null)
const maintenanceLoading = ref(false)
let maintenanceAbort = null
const maintenanceWillWait = computed(() => maintenancePreview.value?.policy?.enabled === true && maintenancePreview.value?.onlinePlayers !== 0)
const maintenancePresenceLabel = computed(() => {
  if (maintenanceLoading.value) return t('feedback.maintenance.checking')
  const count = maintenancePreview.value?.onlinePlayers
  if (!Number.isInteger(count)) return t('feedback.maintenance.unknown')
  return t(count === 0 ? 'feedback.maintenance.empty' : 'feedback.maintenance.online', { count })
})
const maintenancePolicyLabel = computed(() => {
  if (maintenanceLoading.value) return t('feedback.maintenance.checkingHint')
  const preview = maintenancePreview.value
  if (preview?.policy?.enabled === false) return t('feedback.maintenance.disabled')
  if (preview?.onlinePlayers === 0) return t('feedback.maintenance.emptyHint')
  if (preview?.policy) return t(Number.isInteger(preview.onlinePlayers) ? 'feedback.maintenance.countdown' : 'feedback.maintenance.unknownCountdown', { seconds: preview.policy.countdownSeconds })
  return t('feedback.maintenance.unavailableHint')
})
const capacityPreview = computed(() => activeRequest.value?.options?.preview || null)
const capacityTargets = computed(() => capacityRiskTargets(capacityPreview.value))
const runtimeModeAvailability = computed(() => activeRequest.value?.options?.availability || {})
const supportedRuntimeModes = computed(() => {
  const modes = Array.isArray(runtimeModeAvailability.value.modes)
    ? runtimeModeAvailability.value.modes
    : []
  return new Set(['game', ...modes])
})
const supportedLuaJITModes = computed(() => LUAJIT_RUNTIME_MODES.filter(mode => supportedRuntimeModes.value.has(mode)))
const runtimeVersionOptions = computed(() => luaJITPackageOptions(runtimeModeAvailability.value))
const selectedRuntimeVersionOption = computed(() => runtimeVersionOptions.value.find(option => option.version === runtimeVersionValue.value) || null)
const canUseLuaJIT = computed(() => supportedLuaJITModes.value.length > 0
  && runtimePackageVersionReady(runtimeModeAvailability.value, runtimeVersionValue.value))
const runtimeModeValue = computed(() => runtimeModeFromSelection({
  engine: runtimeEngineValue.value,
  generationalGCEnabled: runtimeGenerationalGCEnabled.value,
}))
const isSelectedRuntimeModeSupported = computed(() => runtimeEngineValue.value === 'game'
  ? isRuntimeModeSupported(runtimeModeValue.value)
  : canUseLuaJIT.value && isRuntimeModeSupported(runtimeModeValue.value))
const runtimeGenerationalGCToggleDisabled = computed(() => {
  if (!canUseLuaJIT.value) return true
  if (!runtimeGenerationalGCEnabled.value) return !isRuntimeModeSupported('arena-gc')
  return !isRuntimeModeSupported('luajit')
})
const installedRuntimeVersions = computed(() => {
  const versions = [...new Set((runtimeModeAvailability.value.targets || [])
    .map(target => normalizeRuntimePackageVersion(target?.packageVersion))
    .filter(Boolean))]
  return versions
})
const runtimeVersionBadgeVariant = computed(() => canUseLuaJIT.value ? 'secondary' : 'destructive')
const runtimeVersionBadgeLabel = computed(() => canUseLuaJIT.value
  ? t('runtimeMode.version.ready')
  : installedRuntimeVersions.value.includes(runtimeVersionValue.value)
    ? t('runtimeMode.incompatible')
    : t('runtimeMode.version.notInstalled'))
const runtimeVersionSummary = computed(() => {
  const installed = installedRuntimeVersions.value
  if (installed.length === 0) return t('runtimeMode.version.noneInstalled')
  if (installed.length === 1) return t('runtimeMode.version.installed', { version: installed[0] })
  return t('runtimeMode.version.mixedInstalled', { versions: installed.join(' / ') })
})

const isDestructive = computed(() => {
  const options = activeRequest.value?.options || {}
  return options.danger === true || options.type === 'error' || options.type === 'warning'
})

function capacityBadgeVariant(target) {
  if (target?.capacity?.state === 'overcommitted') return 'destructive'
  if (['available', 'full'].includes(target?.capacity?.state)) return 'secondary'
  return 'outline'
}

function capacityStatusLabel(target) {
  const state = ['available', 'full', 'overcommitted'].includes(target?.capacity?.state)
    ? target.capacity.state
    : 'unknown'
  return t(`capacityRisk.${state}`)
}

function projectedCapacityLabel(target) {
  const projected = Number(target?.projectedRunningShards) || 0
  const limit = capacityRiskLimit(target)
  return limit === null
    ? t('capacityRisk.unknownLimit', { projected })
    : t('capacityRisk.projectedLimit', { projected, limit })
}

function runtimeEngineBadgeVariant(engine) {
  if (engine === 'luajit' && !canUseLuaJIT.value) return 'destructive'
  if (engine === 'game') return 'secondary'
  return 'outline'
}

function runtimeEngineBadgeLabel(engine) {
  return engine === 'luajit' && !canUseLuaJIT.value
    ? t('runtimeMode.incompatible')
    : t(`runtimeMode.engines.${engine}.badge`)
}

function isRuntimeModeSupported(mode) {
  return supportedRuntimeModes.value.has(mode)
}

function runtimeModeTargetReason(target, mode) {
  const supported = Array.isArray(target?.supportedModes) ? target.supportedModes : []
  if (supported.includes(mode)) return ''

  const issues = Array.isArray(target?.issues) ? target.issues : []
  const issue = issues.find(value => te(`runtimeMode.issues.${value}`))
  if (issue) return t(`runtimeMode.issues.${issue}`)

  if (target?.compatibilityStatus === 'ready') return t('runtimeMode.reasons.modeUnavailable')
  const reasonCode = String(target?.reasonCode || '')
  if (reasonCode && te(`runtimeMode.reasons.${reasonCode}`)) {
    return t(`runtimeMode.reasons.${reasonCode}`)
  }
  return String(target?.reason || '').trim() || t('runtimeMode.reasons.unknown')
}

function runtimeEngineUnavailableReason() {
  const targets = Array.isArray(runtimeModeAvailability.value.targets)
    ? runtimeModeAvailability.value.targets
    : []
  const failures = targets.filter(target => {
    const modes = Array.isArray(target?.supportedModes) ? target.supportedModes : []
    return !LUAJIT_RUNTIME_MODES.some(mode => modes.includes(mode))
  })
  if (failures.length === 0) return t('runtimeMode.reasons.noCommonLuaJITMode')
  return failures.map(target => t('runtimeMode.incompatibleTarget', {
    target: target?.targetName || target?.targetId || t('runtimeMode.unknownTarget'),
    reason: runtimeModeTargetReason(target, 'luajit'),
  })).join('；')
}

function runtimeSelectionUnavailableReason() {
  const option = selectedRuntimeVersionOption.value
  if (!option) return t('runtimeMode.reasons.noVersionSelected')

  const targets = Array.isArray(runtimeModeAvailability.value.targets)
    ? runtimeModeAvailability.value.targets
    : []
  const unsupportedPlatforms = targets.filter(target => !option.platforms.includes(String(target?.os || '').toLowerCase()))
  if (unsupportedPlatforms.length > 0) {
    return unsupportedPlatforms.map(target => t('runtimeMode.incompatibleTarget', {
      target: target?.targetName || target?.targetId || t('runtimeMode.unknownTarget'),
      reason: t('runtimeMode.reasons.versionPlatformUnsupported', { version: option.version }),
    })).join('；')
  }

  const versionMismatches = targets.filter(target => normalizeRuntimePackageVersion(target?.packageVersion) !== option.version)
  if (versionMismatches.length > 0) {
    return versionMismatches.map(target => {
      const installed = normalizeRuntimePackageVersion(target?.packageVersion)
      return t('runtimeMode.incompatibleTarget', {
        target: target?.targetName || target?.targetId || t('runtimeMode.unknownTarget'),
        reason: installed
          ? t('runtimeMode.reasons.versionMismatch', { selected: option.version, installed })
          : t('runtimeMode.reasons.versionNotInstalled', { version: option.version }),
      })
    }).join('；')
  }
  return runtimeEngineUnavailableReason()
}

function runtimeVersionOptionLabel(option) {
  const channel = t(`runtimeMode.version.${['preview', 'upstream'].includes(option.channel) ? option.channel : 'installedChannel'}`)
  return `V${option.version} · ${channel}`
}

function applyRuntimeSelection(mode) {
  const selection = runtimeSelectionFromMode(mode)
  runtimeEngineValue.value = selection.engine
  runtimeGenerationalGCEnabled.value = selection.generationalGCEnabled
}

function selectRuntimeEngine(engine) {
  if (!runtimeEngineOptions.includes(engine)) return
  if (engine === 'game') {
    runtimeEngineValue.value = 'game'
    runtimeAdvancedOpen.value = false
    return
  }
  runtimeEngineValue.value = 'luajit'
  if (!canUseLuaJIT.value) return

  const preferred = runtimeModeFromSelection({
    engine,
    generationalGCEnabled: runtimeGenerationalGCEnabled.value,
  })
  const mode = firstSupportedLuaJITMode(supportedLuaJITModes.value, preferred)
  if (mode) applyRuntimeSelection(mode)
}

function selectRuntimeVersion(version) {
  const normalized = normalizeRuntimePackageVersion(version)
  if (!runtimeVersionOptions.value.some(option => option.version === normalized)) return
  runtimeVersionValue.value = normalized
  if (!runtimePackageVersionReady(runtimeModeAvailability.value, normalized)) return

  const preferred = runtimeModeFromSelection({
    engine: 'luajit',
    generationalGCEnabled: runtimeGenerationalGCEnabled.value,
  })
  const mode = firstSupportedLuaJITMode(supportedLuaJITModes.value, preferred)
  if (mode) applyRuntimeSelection(mode)
}

function updateRuntimeGenerationalGC(enabled) {
  if (enabled) {
    if (!isRuntimeModeSupported('arena-gc')) return
    runtimeGenerationalGCEnabled.value = true
    return
  }

  const mode = firstSupportedLuaJITMode(supportedLuaJITModes.value, 'luajit')
  if (!mode) return
  applyRuntimeSelection(mode)
}

function showNextRequest() {
  if (activeRequest.value || requestQueue.length === 0) return

  activeRequest.value = requestQueue.shift()
  promptValue.value = String(activeRequest.value.options?.inputValue ?? '')
  promptError.value = ''

  if (activeRequest.value.kind === 'maintenance') {
    maintenancePreview.value = null
    maintenanceLoading.value = true
    maintenanceAbort = new AbortController()
    const request = activeRequest.value
    const signal = maintenanceAbort.signal
    Promise.resolve().then(() => request.options.loadPreview(signal))
      .then(value => { if (activeRequest.value === request) maintenancePreview.value = value })
      .catch(() => { /* An unavailable count stays unknown, never zero. */ })
      .finally(() => { if (activeRequest.value === request) maintenanceLoading.value = false })
  }

  if (activeRequest.value.kind === 'runtime-mode') {
    runtimeVersionValue.value = preferredRuntimePackageVersion(runtimeModeAvailability.value)
    const preferred = activeRequest.value.options?.availability?.defaultMode || 'game'
    const mode = isRuntimeModeSupported(preferred)
      ? preferred
      : LUAJIT_RUNTIME_MODES.includes(preferred)
        ? firstSupportedLuaJITMode(supportedLuaJITModes.value, preferred) || 'game'
        : 'game'
    applyRuntimeSelection(mode)
    runtimeAdvancedOpen.value = false
  }

  if (activeRequest.value.kind === 'prompt') {
    nextTick(() => promptInput.value?.$el?.focus?.() || promptInput.value?.focus?.())
  }
}

function enqueueRequest(request) {
  requestQueue.push(request)
  showNextRequest()
}

function finishRequest(callback) {
  const request = activeRequest.value
  if (!request) return

  maintenanceAbort?.abort()
  maintenanceAbort = null

  activeRequest.value = null
  callback(request)
  nextTick(showNextRequest)
}

function cancelRequest() {
  finishRequest(request => request.reject('cancel'))
}

function confirmRequest() {
  if (isMaintenance.value && maintenanceLoading.value) return
  finishRequest(request => request.resolve(request.kind === 'maintenance' ? { immediate: false } : 'confirm'))
}

function confirmImmediate() {
  finishRequest(request => request.resolve({ immediate: true }))
}

function validatePrompt() {
  const options = activeRequest.value?.options || {}
  const value = promptValue.value

  if (options.inputPattern && !options.inputPattern.test(value)) {
    promptError.value = options.inputErrorMessage || t('common.feedback.invalidInput')
    return false
  }

  if (typeof options.inputValidator === 'function') {
    const result = options.inputValidator(value)
    if (result !== true && result !== undefined) {
      promptError.value = typeof result === 'string'
        ? result
        : options.inputErrorMessage || t('common.feedback.invalidInput')
      return false
    }
  }

  promptError.value = ''
  return true
}

function confirmPrompt() {
  if (!validatePrompt()) return

  finishRequest(request => request.resolve({
    action: 'confirm',
    value: promptValue.value,
  }))
}

function confirmRuntimeMode() {
  if (!isSelectedRuntimeModeSupported.value) return
  finishRequest(request => request.resolve({
    action: 'confirm',
    value: runtimeModeValue.value,
    version: runtimeEngineValue.value === 'game' ? 'game' : runtimeVersionValue.value,
  }))
}

function handleConfirmOpen(open) {
  if (!open && ['confirm', 'capacity-risk', 'maintenance'].includes(activeRequest.value?.kind)) cancelRequest()
}

function handlePromptOpen(open) {
  if (!open && activeRequest.value?.kind === 'prompt') cancelRequest()
}

function handleRuntimeModeOpen(open) {
  if (!open && activeRequest.value?.kind === 'runtime-mode') cancelRequest()
}

let unregister

onMounted(() => {
  unregister = registerFeedbackHost(enqueueRequest)
})

onBeforeUnmount(() => {
  maintenanceAbort?.abort()
  unregister?.()
})
</script>

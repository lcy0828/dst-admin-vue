<script setup>
import { useGameUpdate } from '@/composables/useGameUpdate'
import GameReleaseProgress from '@/components/runtime/GameReleaseProgress.vue'
import GameInstallationManager from '@/components/GameInstallationManager.vue'
import LuaJITInstaller from '@/components/LuaJITInstaller.vue'
import { useRoute } from 'vue-router'
import { nextTick, computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import {
  ChevronDown,
  CircleAlert,
  RefreshCw,
  RotateCw,
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { gameReleasesV2API, jobsV2API } from '@/api/v2'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { CardFooter } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  gameReleaseCanRetry,
  gameReleaseCanFinish,
  gameReleaseFindByJob,
  gameReleaseRecoveryRequest,
  gameReleaseWriteState,
  gameReleaseIsTerminal,
  gameReleaseJobFailed,
  gameReleaseJobIsTerminal,
  gameReleaseResultRows,
  gameReleaseShardState,
  gameReleaseStageKey,
  gameReleaseStageVariant,
} from '@/lib/gameRelease.mjs'
import {
  filterManagementTargets,
  getManagementScope,
  MANAGEMENT_SCOPE_CHANGED_EVENT,
  MANAGEMENT_SCOPE_TARGET,
  managementScopeRequest,
} from '@/lib/managementScope.mjs'

const route = useRoute()
const update = useGameUpdate()
const overview = update.state
const installationGeneration = ref(0)
const installationsRef = ref(null)
const ACTIVE_RELEASE_KEY = 'dstGameReleaseActivity'
const { locale, t } = useI18n()
const desiredVersion = ref('')
const policy = reactive({ cleanCache: false, restartRunning: true, loadConfirmation: 'logs', timeoutSeconds: 300 })
const releases = ref([])
const selectedRelease = ref(null)
const activeJob = ref(null)
const trackedRelease = ref(null)
const loading = ref(false)
const retrying = ref(false)
const recoveryConfirmOpen = ref(false)
const recoveryPlan = ref(null)
const recoveryReleaseId = ref('')
const recoveryRepair = ref(false)
const detailsLoading = ref(false)
const loadError = ref('')
const taskError = ref('')
const advancedOpen = ref(false)
const managementScope = ref(getManagementScope())
let pollTimer = 0
let requestSequence = 0
let historyLoadingSequence = 0
let detailsRequestSequence = 0
let pollGeneration = 0
let pollReadFailures = 0
let pollConfirmationMisses = 0
let disposed = false

const scopeLabel = computed(() => managementScope.value.targetName || t('app.remote.allTargets'))
const scopedReleases = computed(() => {
  if (managementScope.value.kind !== MANAGEMENT_SCOPE_TARGET) return releases.value
  return releases.value.filter(release => (release?.plan?.installations || [])
    .some(item => item.targetId === managementScope.value.targetId))
})
const selectedReleaseInstallations = computed(() => filterManagementTargets(
  gameReleaseResultRows(selectedRelease.value).installations,
  item => item?.targetId,
  managementScope.value
))
const selectedReleaseShards = computed(() => filterManagementTargets(
  gameReleaseResultRows(selectedRelease.value).shards,
  item => item?.targetId,
  managementScope.value
))
const finishConfirmOpen = ref(false)
const canFinishSelectedRelease = computed(() => canRetrySelectedRelease.value && gameReleaseCanFinish(selectedRelease.value))
const canRetrySelectedRelease = computed(() => {
  if (!gameReleaseCanRetry(selectedRelease.value)) return false
  if (managementScope.value.kind !== MANAGEMENT_SCOPE_TARGET) return true
  const installations = selectedRelease.value?.plan?.installations || []
  return installations.length > 0 && installations.every(item => item.targetId === managementScope.value.targetId)
})
const latestOfficialVersionLabel = computed(() => overview.report?.officialRelease?.version || '--')
const officialReleaseId = computed(() => overview.report?.officialRelease?.releaseId || '')
const planStateKey = computed(() => update.active.value ? 'existing' : update.availability.value)
const canPreview = computed(() => !overview.submitting && !activeJobRunning.value && Number(policy.timeoutSeconds) >= 30 && Number(policy.timeoutSeconds) <= 900)
const activeJobRunning = computed(() => Boolean(activeJob.value && (
  !gameReleaseJobIsTerminal(activeJob.value) || trackedRelease.value && !gameReleaseIsTerminal(trackedRelease.value)
)))
watch(() => overview.accepted, job => {
  if (job?.id && job.id !== activeJob.value?.id) startPolling(job)
})
watch(() => update.pending.value, release => {
  if (release?.stage === 'recovery_required' && !selectedRelease.value) selectedRelease.value = release
  else if (release?.sourceJobId && !activeJobRunning.value) startPolling({ id: release.sourceJobId, status: 'running' }, release.id)
})

onMounted(async () => {
  window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, handleManagementScopeChange)
  void update.ensureOverview()
  await Promise.all([loadHistory({ discover: false }), update.refreshPending()])
  if (disposed) return
  if (!showMaintenanceJob(route.query.maintenanceJob) && !resumePolling()) followRunningRelease()
})

onBeforeUnmount(() => {
  disposed = true
  requestSequence += 1
  detailsRequestSequence += 1
  stopPolling()
  window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, handleManagementScopeChange)
})

watch(() => route.query.maintenanceJob, id => showMaintenanceJob(id))

function showMaintenanceJob(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) return false
  startPolling({ id, kind: 'game.release', status: 'queued' })
  nextTick(() => document.getElementById('game-release-activity')?.scrollIntoView({ block: 'start' }))
  return true
}

function releaseRequest() {
  const requested = desiredVersion.value.trim()
  return {
    ...(requested ? { desiredVersion: requested } : {}),
    ...managementScopeRequest(managementScope.value),
    policy: {
      cleanCache: policy.cleanCache,
      restartRunning: policy.restartRunning,
      loadConfirmation: policy.loadConfirmation,
      timeoutSeconds: Number(policy.timeoutSeconds)
    }
  }
}

function handleInstallationChanged() {
  installationGeneration.value += 1
  void update.ensureOverview({ fresh: true })
}

function handleManagementScopeChange(event) {
  stopPolling()
  detailsRequestSequence += 1
  activeJob.value = null
  trackedRelease.value = null
  managementScope.value = event?.detail || getManagementScope()
  selectedRelease.value = null
  taskError.value = ''
  followRunningRelease()
}

function selectLoadConfirmation(value) {
  if (value === 'logs' || value === 'none') policy.loadConfirmation = value
}

function stageLabel(stage) {
  return t(`gameReleases.stages.${gameReleaseStageKey(stage)}`)
}

function jobLabel(status) {
  const normalized = ['queued', 'running', 'succeeded', 'failed', 'canceled'].includes(String(status || '').toLowerCase())
    ? String(status).toLowerCase()
    : 'unknown'
  return t(`gameReleases.job.${normalized}`)
}

function formatDate(value) {
  return formatSystemDateTime(value, {
    locale: locale.value,
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

function targetName(target) {
  if (target?.targetId === 'local') return t('gameReleases.values.local')
  return target?.targetName || t('gameReleases.values.unknownTarget')
}

function shardName(shard) {
  return `${shard.roomName || shard.roomDirectory || t('gameReleases.values.unknownRoom')} / ${shard.worldName || shard.worldDirectory || t('gameReleases.values.unknownWorld')}`
}

function shardEvidence(shard) {
  if (!shard.wasRunning || selectedRelease.value?.plan?.policy?.restartRunning === false) return t('gameReleases.progress.noLoadNeeded')
  if (shard.loadConfirmedAt) return t(selectedRelease.value?.plan?.policy?.loadConfirmation === 'none' ? 'gameReleases.progress.processConfirmed' : 'gameReleases.progress.logConfirmed')
  return t('gameReleases.values.noEvidence')
}

function releaseError(job) {
  const target = (job?.targets || []).find(item => item?.error?.message)
  return target?.error?.message || job?.error?.message || job?.message || t('common.errors.unknown')
}

async function loadHistory(options = {}) {
  const sequence = ++requestSequence
  if (!options.quiet) {
    historyLoadingSequence = sequence
    loading.value = true
  }
  try {
    const response = await gameReleasesV2API.list({ limit: 50, offset: 0 })
    if (sequence !== requestSequence) return releases.value
    releases.value = Array.isArray(response?.items) ? response.items : []
    const selected = releases.value.find(item => item.id === selectedRelease.value?.id)
    if (selected) selectedRelease.value = selected
    loadError.value = ''
    if (!options.quiet && options.discover !== false && !activeJobRunning.value) followRunningRelease()
    return releases.value
  } catch (error) {
    if (sequence === requestSequence) loadError.value = error.message || t('common.errors.unknown')
    if (!options.quiet) toast.error(t('gameReleases.feedback.historyFailed', { error: error.message || t('common.errors.unknown') }))
    return releases.value
  } finally {
    if (!options.quiet && historyLoadingSequence === sequence) loading.value = false
  }
}

function openConfirmation() {
  if (canPreview.value) void update.openUpdate(releaseRequest())
}

async function openDetails(release) {
  if (!release?.id) return
  const sequence = ++detailsRequestSequence
  detailsLoading.value = true
  try {
    const value = await update.readRelease(release.id)
    if (sequence === detailsRequestSequence) {
      selectedRelease.value = value
      if (!gameReleaseIsTerminal(value) && value.sourceJobId) {
        startPolling({ id: value.sourceJobId, status: 'running' }, value.id)
      }
    }
  } catch (error) {
    if (sequence !== detailsRequestSequence) return
    toast.error(t('gameReleases.feedback.detailsFailed', { error: error.message || t('common.errors.unknown') }))
  } finally {
    if (sequence === detailsRequestSequence) detailsLoading.value = false
  }
}

async function retryRelease(confirmed = false, repair = false) {
  const release = selectedRelease.value
  if (!gameReleaseCanRetry(release) || activeJobRunning.value) return
  retrying.value = true
  taskError.value = ''
  try {
    if ((release.nextAction === 'preview_and_retry' || repair) && !confirmed) {
      const fresh = await gameReleasesV2API.preview(gameReleaseRecoveryRequest(release, { validateUnknown: repair }))
      if (selectedRelease.value?.id !== release.id) return
      if (!fresh?.ready) throw new Error((fresh?.blockers || []).map(item => item.message).join('；') || t('gameReleases.plan.blocked'))
      recoveryRepair.value = repair
      recoveryPlan.value = fresh
      recoveryReleaseId.value = release.id
      recoveryConfirmOpen.value = true
      return
    }
    if (confirmed && recoveryReleaseId.value !== release.id) return
    const hash = confirmed ? recoveryPlan.value?.planHash : ''
    if (confirmed && !hash) throw new Error(t('gameReleases.plan.blocked'))
    const job = await gameReleasesV2API.retry(release.id, hash ? { planHash: hash, confirmation: hash, ...(recoveryRepair.value ? { validateUnknown: true } : {}) } : {})
    if (!job?.id) throw new Error(t('gameReleases.feedback.invalidJobResponse'))
    recoveryConfirmOpen.value = false
    toast.success(t('gameReleases.feedback.retrySubmitted'))
    startPolling(job, release.id)
  } catch (error) {
    taskError.value = error.message || t('common.errors.unknown')
    toast.error(t('gameReleases.feedback.retryFailed', { error: taskError.value }))
  } finally {
    retrying.value = false
  }
}

async function finishRelease() {
  const release = selectedRelease.value
  if (!canFinishSelectedRelease.value || activeJobRunning.value || retrying.value) return
  retrying.value = true
  try {
    const hash = release.plan.planHash
    const job = await gameReleasesV2API.retry(release.id, { finishWithoutRestart: true, planHash: hash, confirmation: hash })
    if (!job?.id) throw new Error(t('gameReleases.feedback.invalidJobResponse'))
    finishConfirmOpen.value = false
    startPolling(job, release.id)
  } catch (error) {
    toast.error(t('gameReleases.feedback.retryFailed', { error: error.message || t('common.errors.unknown') }))
  } finally {
    retrying.value = false
  }
}

function startPolling(job, releaseId = '') {
  if (disposed || !job?.id) return
  stopPolling()
  const generation = ++pollGeneration
  pollReadFailures = 0
  pollConfirmationMisses = 0
  activeJob.value = job
  trackedRelease.value = releaseId ? releases.value.find(item => item.id === releaseId) || null : null
  if (trackedRelease.value) selectedRelease.value = trackedRelease.value
  persistActivity({ jobId: job.id, releaseId })
  void pollActivity(job.id, releaseId, generation)
}

function resumePolling() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(ACTIVE_RELEASE_KEY) || '{}')
    if (saved.jobId) {
      if (saved.releaseId && !scopedReleases.value.some(item => item.id === saved.releaseId)) return false
      startPolling({ id: saved.jobId, status: 'queued' }, saved.releaseId || '')
      return true
    }
  } catch {
    persistActivity(null)
  }
  return false
}

function persistActivity(value) {
  try {
    if (value) sessionStorage.setItem(ACTIVE_RELEASE_KEY, JSON.stringify(value))
    else sessionStorage.removeItem(ACTIVE_RELEASE_KEY)
  } catch { /* Tracking still works when browser storage is unavailable. */ }
}

function followRunningRelease() {
  if (disposed || activeJobRunning.value) return
  const release = scopedReleases.value.find(item => item.sourceJobId && !gameReleaseIsTerminal(item))
  if (release) startPolling({ id: release.sourceJobId, status: 'running' }, release.id)
}

function stopPolling() {
  if (pollTimer) window.clearTimeout(pollTimer)
  pollTimer = 0
  pollGeneration += 1
}

function schedulePoll(jobId, releaseId, generation) {
  if (generation !== pollGeneration) return
  if (pollTimer) window.clearTimeout(pollTimer)
  pollTimer = window.setTimeout(() => pollActivity(jobId, releaseId, generation), 1500)
}

async function pollActivity(jobId, releaseId = '', generation = pollGeneration) {
  if (generation !== pollGeneration) return
  if (pollTimer) window.clearTimeout(pollTimer)
  pollTimer = 0
  try {
    const [jobResult, historyResult] = await Promise.allSettled([
      jobsV2API.controlPlaneGet(jobId),
      loadHistory({ quiet: true })
    ])
    if (generation !== pollGeneration) return
    if (jobResult.status === 'fulfilled') activeJob.value = jobResult.value
    const history = historyResult.status === 'fulfilled' ? historyResult.value : releases.value
    const associatedId = releaseId || gameReleaseFindByJob(history, jobId)?.id
    let associatedRelease = null
    if (associatedId) {
      associatedRelease = await update.readRelease(associatedId)
      if (generation !== pollGeneration) return
      trackedRelease.value = associatedRelease
      update.rememberRelease(associatedRelease)
      if (!selectedRelease.value || selectedRelease.value.id === associatedId) selectedRelease.value = associatedRelease
      releases.value = releases.value.map(item => item.id === associatedId ? associatedRelease : item)
    }
    if (jobResult.status === 'rejected' && !associatedRelease) throw jobResult.reason

    pollReadFailures = 0
    taskError.value = ''
    const releaseDone = associatedRelease && gameReleaseIsTerminal(associatedRelease)
    const jobDone = gameReleaseJobIsTerminal(activeJob.value)
    if (jobDone && (releaseDone || !associatedRelease && gameReleaseJobFailed(activeJob.value))) {
      persistActivity(null)
      await installationsRef.value?.refresh()
      if (generation !== pollGeneration) return
      installationGeneration.value += 1
      await Promise.all([update.ensureOverview({ fresh: true }), update.refreshPending()])
      if (associatedRelease?.errorMessage || !associatedRelease && gameReleaseJobFailed(activeJob.value)) {
        taskError.value = associatedRelease?.errorMessage || releaseError(activeJob.value)
        toast.error(t('gameReleases.feedback.taskFailed', { error: taskError.value }))
      }
      return
    }
    if (jobDone && !associatedRelease) {
      pollConfirmationMisses += 1
      if (pollConfirmationMisses >= 10) {
        persistActivity(null)
        taskError.value = t('gameReleases.feedback.completionUnconfirmed')
        return
      }
    } else {
      pollConfirmationMisses = 0
    }
  } catch (error) {
    if (generation !== pollGeneration) return
    pollReadFailures += 1
    taskError.value = error.message || t('common.errors.unknown')
    if (pollReadFailures >= 5) {
      persistActivity(null)
      return
    }
  }
  schedulePoll(jobId, trackedRelease.value?.id || releaseId, generation)
}
</script>

<template>
  <div class="game-releases-page flex min-w-0 flex-col gap-4">
    <header class="min-w-0">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-2xl font-semibold tracking-normal">{{ t('gameReleases.title') }}</h1>
          <Badge variant="secondary">{{ scopeLabel }}</Badge>
        </div>
      </div>
    </header>

    <Alert v-if="taskError" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('gameReleases.feedback.operationFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ taskError }}</AlertDescription>
    </Alert>

    <section v-if="activeJob" id="game-release-activity" class="flex scroll-mt-6 flex-col gap-2">
      <GameReleaseProgress v-if="trackedRelease" :release="trackedRelease" />
      <Alert v-else>
        <AlertTitle>{{ t('gameReleases.job.title') }} · {{ jobLabel(activeJob.status) }}</AlertTitle>
        <AlertDescription class="flex items-center gap-2"><Spinner v-if="activeJobRunning" />{{ t('gameReleases.progress.awaitingRecord') }}</AlertDescription>
      </Alert>
      <UiButton variant="ghost" size="sm" class="self-start" @click="startPolling(activeJob, trackedRelease?.id || '')"><RefreshCw data-icon="inline-start" />{{ t('gameReleases.progress.refresh') }}</UiButton>
    </section>

    <div class="game-installation-grid grid min-w-0 items-start gap-4 xl:grid-cols-3">
      <div class="min-w-0 xl:col-span-2">
        <GameInstallationManager ref="installationsRef" maintenance-menu :disabled="activeJobRunning || overview.submitting" @changed="handleInstallationChanged">
          <template #footer="{ items, busy }">
            <CardFooter v-if="items.some(item => item.installed)" class="min-w-0 flex-col items-stretch gap-3">
              <div class="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <div class="flex flex-col gap-1" role="status" aria-live="polite">
                  <div class="flex flex-wrap items-center gap-2">
                    <Badge :variant="update.availability.value === 'available' ? 'default' : 'secondary'">{{ t(`gameReleases.workflow.availability.${planStateKey}`) }}</Badge>
                    <span v-if="overview.loading" class="flex items-center gap-1 text-xs text-muted-foreground"><Spinner />{{ t('gameReleases.actions.checking') }}</span>
                  </div>
                  <span class="text-xs text-muted-foreground">{{ t('gameReleases.simple.latestOfficialVersion') }}: {{ latestOfficialVersionLabel }}<template v-if="officialReleaseId"> · R{{ officialReleaseId }}</template></span>
                  <span v-if="overview.checkedAt" class="text-xs text-muted-foreground">{{ t('gameReleases.workflow.checkedAt', { time: formatDate(overview.checkedAt) }) }}</span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <UiButton variant="outline" size="sm" :disabled="overview.loading || busy" @click="update.ensureOverview({ fresh: true })"><Spinner v-if="overview.loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ t('gameReleases.actions.check') }}</UiButton>
                  <UiButton v-if="update.active.value" size="sm" @click="showMaintenanceJob(update.active.value.sourceJobId || update.active.value.id)">{{ t(update.active.value.stage === 'recovery_required' ? 'gameReleases.workflow.recovery' : 'gameReleases.workflow.progress') }}</UiButton>
                  <UiButton v-else size="sm" :disabled="!canPreview || busy" @click="openConfirmation">{{ t('gameReleases.workflow.update') }}</UiButton>
                </div>
              </div>
              <p class="text-xs text-muted-foreground">{{ t('gameReleases.workflow.availabilityHint') }}</p>
              <Alert v-if="overview.versionError || overview.installationsError"><CircleAlert /><AlertTitle>{{ t('gameReleases.workflow.cachedTitle') }}</AlertTitle><AlertDescription>{{ overview.versionError || overview.installationsError }}</AlertDescription></Alert>

              <Collapsible v-model:open="advancedOpen">
                <CollapsibleTrigger as-child>
                  <UiButton variant="ghost" size="sm" class="group">
                    <span>{{ t('gameReleases.advanced.title') }}</span>
                    <ChevronDown data-icon="inline-end" class="transition-transform group-data-[state=open]:rotate-180" />
                  </UiButton>
                </CollapsibleTrigger>
                <CollapsibleContent class="pt-4">
                  <FieldGroup>
                    <div class="grid gap-4 lg:grid-cols-2">
                      <Field>
                        <FieldLabel for="release-desired-version">{{ t('gameReleases.form.desiredVersion') }}</FieldLabel>
                        <Input id="release-desired-version" v-model="desiredVersion" inputmode="numeric" :placeholder="t('gameReleases.form.desiredPlaceholder')" />
                        <FieldDescription>{{ t('gameReleases.form.desiredDescription') }}</FieldDescription>
                      </Field>
                      <Field :data-invalid="Number(policy.timeoutSeconds) < 30 || Number(policy.timeoutSeconds) > 900 || undefined">
                        <FieldLabel for="release-timeout">{{ t('gameReleases.form.timeout') }}</FieldLabel>
                        <Input id="release-timeout" v-model.number="policy.timeoutSeconds" type="number" min="30" max="900" aria-describedby="release-timeout-description" :aria-invalid="Number(policy.timeoutSeconds) < 30 || Number(policy.timeoutSeconds) > 900" />
                        <FieldDescription id="release-timeout-description">{{ t('gameReleases.form.timeoutDescription') }}</FieldDescription>
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel>{{ t('gameReleases.form.loadConfirmation') }}</FieldLabel>
                      <ToggleGroup :model-value="policy.loadConfirmation" type="single" variant="outline" class="justify-start" @update:model-value="selectLoadConfirmation">
                        <ToggleGroupItem value="logs">{{ t('gameReleases.form.loadLogs') }}</ToggleGroupItem>
                        <ToggleGroupItem value="none">{{ t('gameReleases.form.loadNone') }}</ToggleGroupItem>
                      </ToggleGroup>
                      <FieldDescription>{{ t(`gameReleases.form.loadDescriptions.${policy.loadConfirmation}`) }}</FieldDescription>
                    </Field>
                    <div class="grid gap-4 lg:grid-cols-2">
                      <Field orientation="horizontal">
                        <FieldContent><FieldLabel for="release-clean-cache">{{ t('gameReleases.form.cleanCache') }}</FieldLabel><FieldDescription>{{ t('gameReleases.form.cleanCacheDescription') }}</FieldDescription></FieldContent>
                        <Switch id="release-clean-cache" v-model="policy.cleanCache" />
                      </Field>
                      <Field orientation="horizontal">
                        <FieldContent><FieldLabel for="release-restart">{{ t('gameReleases.form.restartRunning') }}</FieldLabel><FieldDescription>{{ t('gameReleases.form.restartRunningDescription') }}</FieldDescription></FieldContent>
                        <Switch id="release-restart" v-model="policy.restartRunning" />
                      </Field>
                    </div>
                  </FieldGroup>
                </CollapsibleContent>
              </Collapsible>
            </CardFooter>
          </template>
        </GameInstallationManager>
      </div>
      <LuaJITInstaller :key="installationGeneration" />
    </div>

    <section class="flex min-w-0 flex-col gap-3" aria-labelledby="release-history-title">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 id="release-history-title" class="text-base font-semibold">{{ t('gameReleases.history.title') }}</h2></div>
        <UiButton variant="outline" size="sm" :disabled="loading" @click="loadHistory">
          <Spinner v-if="loading" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          {{ t('gameReleases.actions.refresh') }}
        </UiButton>
      </div>
      <Alert v-if="loadError" variant="destructive"><CircleAlert /><AlertTitle>{{ t('gameReleases.history.title') }}</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription></Alert>
      <div v-if="loading && !scopedReleases.length" class="flex flex-col gap-2" :aria-label="t('gameReleases.history.loading')"><Skeleton v-for="index in 4" :key="index" class="h-12 w-full" /></div>
      <Empty v-else-if="!scopedReleases.length && !loadError" class="py-4"><EmptyHeader><EmptyTitle>{{ t('gameReleases.history.emptyTitle') }}</EmptyTitle></EmptyHeader></Empty>
      <div v-else class="overflow-x-auto rounded-lg border">
        <Table class="min-w-[600px]">
          <TableHeader><TableRow><TableHead>{{ t('gameReleases.columns.release') }}</TableHead><TableHead>{{ t('gameReleases.columns.status') }}</TableHead><TableHead>{{ t('gameReleases.columns.createdAt') }}</TableHead><TableHead class="text-right">{{ t('common.fields.actions') }}</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow v-for="release in scopedReleases" :key="release.id">
              <TableCell class="max-w-56"><span class="block truncate" :title="release.id">{{ t('gameReleases.progress.historyTask') }}</span></TableCell><TableCell><Badge :variant="gameReleaseStageVariant(release.stage)">{{ stageLabel(release.stage) }}</Badge></TableCell><TableCell>{{ formatDate(release.createdAt) }}</TableCell><TableCell class="text-right"><UiButton variant="ghost" size="sm" :disabled="detailsLoading" @click="openDetails(release)">{{ t('gameReleases.actions.view') }}</UiButton></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>

    <section v-if="selectedRelease" class="flex min-w-0 flex-col gap-3" aria-labelledby="release-details-title">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div><div class="flex flex-wrap items-center gap-2"><h2 id="release-details-title" class="text-base font-semibold">{{ t('gameReleases.details.title') }}</h2><Badge :variant="gameReleaseStageVariant(selectedRelease.stage)">{{ stageLabel(selectedRelease.stage) }}</Badge></div><p class="mt-0.5 text-sm text-muted-foreground">{{ formatDate(selectedRelease.createdAt) }}</p></div>
        <UiButton v-if="canRetrySelectedRelease" variant="outline" :disabled="retrying || activeJobRunning" @click="retryRelease(false)"><Spinner v-if="retrying" data-icon="inline-start" /><RotateCw v-else data-icon="inline-start" />{{ t(selectedRelease.nextAction === 'preview_and_retry' ? 'gameReleases.recovery.recheck' : 'gameReleases.actions.retry') }}</UiButton>
        <UiButton v-if="canFinishSelectedRelease" variant="outline" :disabled="retrying || activeJobRunning" @click="finishConfirmOpen = true">{{ t('gameReleases.recovery.finish') }}</UiButton>
        <UiButton v-if="canRetrySelectedRelease && selectedRelease.nextAction === 'inspect_release'" variant="outline" :disabled="retrying || activeJobRunning" @click="retryRelease(false, true)">{{ t('gameReleases.recovery.repair') }}</UiButton>
      </div>
      <GameReleaseProgress v-if="selectedRelease.id !== trackedRelease?.id" :release="selectedRelease" />
      <Alert v-if="selectedRelease.modDiagnosticsWarning"><AlertTitle>{{ t('modDiagnostics.baselineWarning') }}</AlertTitle><AlertDescription>{{ t('modDiagnostics.baselineWarningHint') }}</AlertDescription></Alert>
      <Alert v-if="selectedRelease.nextAction"><CircleAlert /><AlertTitle>{{ t('gameReleases.recovery.title') }}</AlertTitle><AlertDescription>{{ t(`gameReleases.recovery.${['retry_release', 'preview_and_retry', 'inspect_release'].includes(selectedRelease.nextAction) ? selectedRelease.nextAction : 'retry_release'}`) }}</AlertDescription></Alert>
      <Separator />
      <div>
        <h3 class="mb-2 text-sm font-semibold">{{ t('gameReleases.details.installationResults') }}</h3>
        <div class="overflow-x-auto rounded-lg border">
          <Table class="min-w-[760px]">
            <TableHeader><TableRow><TableHead>{{ t('gameReleases.columns.target') }}</TableHead><TableHead>{{ t('gameReleases.columns.installation') }}</TableHead><TableHead>{{ t('gameReleases.columns.beforeAfter') }}</TableHead><TableHead>{{ t('gameReleases.columns.stage') }}</TableHead><TableHead>{{ t('gameReleases.columns.updatedAt') }}</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="result in selectedReleaseInstallations" :key="`${result.targetId}:${result.installationId}`">
                <TableCell :title="result.targetId">{{ targetName(result) }}</TableCell>
                <TableCell>{{ result.installationId === 'default' ? t('gameReleases.values.defaultInstallation') : result.installationId }}</TableCell>
                <TableCell class="tabular-nums"><div>{{ result.beforeVersion || '--' }} → {{ result.afterVersion || '--' }}</div><span v-if="result.expectedVersion" class="text-xs text-muted-foreground">{{ t('gameReleases.recovery.expected', { version: result.expectedVersion }) }}</span></TableCell>
                <TableCell><div class="flex flex-col gap-1"><Badge :variant="gameReleaseStageVariant(result.stage)" class="self-start">{{ stageLabel(result.stage) }}</Badge><span class="text-xs text-muted-foreground">{{ t(`gameReleases.writeStates.${gameReleaseWriteState(result.writeState)}`) }}</span><span v-if="result.warningMessage" class="text-xs text-warning-foreground">{{ result.warningMessage }}</span><span v-if="result.errorMessage" class="text-xs text-destructive">{{ result.errorMessage }}</span></div></TableCell>
                <TableCell>{{ formatDate(result.updatedAt) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <div>
        <h3 class="mb-2 text-sm font-semibold">{{ t('gameReleases.details.shardResults') }}</h3>
        <div class="overflow-x-auto rounded-lg border">
          <Table class="min-w-[760px]">
            <TableHeader><TableRow><TableHead>{{ t('gameReleases.columns.rooms') }}</TableHead><TableHead>{{ t('gameReleases.columns.target') }}</TableHead><TableHead>{{ t('gameReleases.columns.stage') }}</TableHead><TableHead>{{ t('gameReleases.columns.evidence') }}</TableHead><TableHead>{{ t('gameReleases.columns.updatedAt') }}</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="shard in selectedReleaseShards" :key="`${shard.roomId}:${shard.worldId}`">
                <TableCell><div class="flex flex-col gap-1"><span>{{ shardName(shard) }}</span><Badge variant="outline" class="self-start">{{ t(shard.isMaster ? 'gameReleases.values.master' : 'gameReleases.values.secondary') }}</Badge></div></TableCell>
                <TableCell :title="shard.targetId">{{ targetName(shard) }}</TableCell>
                <TableCell><div class="flex flex-col gap-1"><Badge :variant="shard.errorMessage ? 'destructive' : shard.runtimeState === 'running' && shard.stage === 'succeeded' ? 'success' : 'outline'" class="self-start">{{ t(`gameReleases.progress.shardStates.${gameReleaseShardState(shard, selectedRelease)}`) }}</Badge><span v-if="shard.warningCode === 'RUNTIME_FALLBACK_GAME'" class="text-xs text-warning-foreground">{{ t('gameReleases.recovery.runtimeFallback') }}</span><span v-if="shard.errorMessage" class="text-xs text-destructive">{{ shard.errorMessage }}</span></div></TableCell>
                <TableCell class="max-w-80 break-words text-xs" :title="shard.loadMarker || undefined">{{ shardEvidence(shard) }}<span v-if="shard.loadConfirmedAt" class="mt-1 block text-muted-foreground">{{ formatDate(shard.loadConfirmedAt) }}</span></TableCell>
                <TableCell>{{ formatDate(shard.updatedAt) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <Collapsible>
        <CollapsibleTrigger as-child><UiButton variant="ghost" size="sm" class="group">{{ t('gameReleases.progress.inspectIds') }}<ChevronDown data-icon="inline-end" class="transition-transform group-data-[state=open]:rotate-180" /></UiButton></CollapsibleTrigger>
        <CollapsibleContent class="flex flex-col gap-1 pt-2 text-xs text-muted-foreground"><span class="break-all">{{ t('gameReleases.job.title') }}: {{ selectedRelease.sourceJobId || '—' }}</span><span class="break-all">{{ t('gameReleases.columns.release') }}: {{ selectedRelease.id }}</span><span v-if="selectedRelease.errorCode">{{ selectedRelease.errorCode }}</span></CollapsibleContent>
      </Collapsible>
    </section>

    <Dialog v-model:open="finishConfirmOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader><DialogTitle>{{ t('gameReleases.recovery.finish') }}</DialogTitle><DialogDescription>{{ t('gameReleases.recovery.finishDescription') }}</DialogDescription></DialogHeader>
        <DialogFooter><UiButton variant="outline" @click="finishConfirmOpen = false">{{ t('common.actions.cancel') }}</UiButton><UiButton :disabled="retrying" @click="finishRelease"><Spinner v-if="retrying" data-icon="inline-start" />{{ t('gameReleases.recovery.finish') }}</UiButton></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog v-model:open="recoveryConfirmOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader><DialogTitle>{{ t(recoveryRepair ? 'gameReleases.recovery.repair' : 'gameReleases.recovery.recheck') }}</DialogTitle><DialogDescription>{{ t(recoveryRepair ? 'gameReleases.recovery.repairDescription' : 'gameReleases.recovery.confirmDescription') }}</DialogDescription></DialogHeader>
        <div v-for="target in recoveryPlan?.installations || []" :key="`${target.targetId}:${target.installationId}`" class="flex items-center justify-between gap-3"><span>{{ target.targetName }} / {{ target.installationId }}</span><Badge variant="outline">{{ target.currentVersion }} → {{ target.desiredVersion }}</Badge></div>
        <DialogFooter><UiButton variant="outline" @click="recoveryConfirmOpen = false">{{ t('common.actions.cancel') }}</UiButton><UiButton :disabled="retrying" @click="retryRelease(true)"><Spinner v-if="retrying" data-icon="inline-start" />{{ t(recoveryRepair ? 'gameReleases.recovery.repair' : 'gameReleases.recovery.continue') }}</UiButton></DialogFooter>
      </DialogContent>
    </Dialog>

  </div>
</template>

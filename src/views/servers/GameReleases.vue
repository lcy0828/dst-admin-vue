<script setup>
import ModPreflightReports from '@/components/runtime/ModPreflightReports.vue'
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
  PackageCheck,
  RefreshCw,
  RotateCw,
  ScanSearch,
  ShieldCheck,
  TriangleAlert
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { gameReleasesV2API, gameV2API, jobsV2API, runtimeObservationsV2API } from '@/api/v2'
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
  gameReleaseBlockerKey,
  gameReleaseCanRetry,
  gameReleaseFindByJob,
  gameReleaseRecoveryRequest,
  gameReleaseWriteState,
  gameReleaseApplicationKey,
  gameReleaseInstallationStatus,
  gameReleaseIsTerminal,
  gameReleaseJobFailed,
  gameReleaseJobIsTerminal,
  gameReleaseResultRows,
  gameReleaseShardState,
  gameReleaseNodeCount,
  gameReleasePlatformKey,
  gameReleaseStageKey,
  gameReleaseStageVariant,
  gameReleaseVersionChannels
} from '@/lib/gameRelease.mjs'
import {
  filterManagementTargets,
  getManagementScope,
  MANAGEMENT_SCOPE_CHANGED_EVENT,
  MANAGEMENT_SCOPE_TARGET,
  managementScopeRequest,
  managementScopeTargetId
} from '@/lib/managementScope.mjs'

const route = useRoute()
const installationGeneration = ref(0)
const installationsRef = ref(null)
const ACTIVE_RELEASE_KEY = 'dstGameReleaseActivity'
const { locale, t } = useI18n()
const desiredVersion = ref('')
const policy = reactive({ cleanCache: false, restartRunning: true, loadConfirmation: 'logs', timeoutSeconds: 300 })
const plan = ref(null)
const releases = ref([])
const selectedRelease = ref(null)
const activeJob = ref(null)
const trackedRelease = ref(null)
const loading = ref(false)
const previewing = ref(false)
const publishing = ref(false)
const retrying = ref(false)
const recoveryConfirmOpen = ref(false)
const recoveryPlan = ref(null)
const recoveryReleaseId = ref('')
const recoveryRepair = ref(false)
const detailsLoading = ref(false)
const loadError = ref('')
const taskError = ref('')
const confirmOpen = ref(false)
const advancedOpen = ref(false)
const technicalOpen = ref(false)
const versionReport = ref(null)
const officialVersionError = ref('')
const managementScope = ref(getManagementScope())
let pollTimer = 0
let requestSequence = 0
let historyLoadingSequence = 0
let previewRequestSequence = 0
let detailsRequestSequence = 0
let pollGeneration = 0
let pollReadFailures = 0
let pollConfirmationMisses = 0
let disposed = false

const planInstallations = computed(() => plan.value?.installations || [])
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
const canRetrySelectedRelease = computed(() => {
  if (!gameReleaseCanRetry(selectedRelease.value)) return false
  if (managementScope.value.kind !== MANAGEMENT_SCOPE_TARGET) return true
  const installations = selectedRelease.value?.plan?.installations || []
  return installations.length > 0 && installations.every(item => item.targetId === managementScope.value.targetId)
})
const planBlockers = computed(() => plan.value?.blockers || [])
const affectedNodeCount = computed(() => gameReleaseNodeCount(planInstallations.value))
const runningShardCount = computed(() => planInstallations.value.reduce((sum, item) => sum + Number(item.runningShards || 0), 0))
const planVersionChannels = computed(() => gameReleaseVersionChannels(planInstallations.value))
const planVersionChannelsLabel = computed(() => planVersionChannels.value
  .map(versionChannelLabel)
  .join(t('gameReleases.nodes.channelSeparator')))
const affectedShardCount = computed(() => planInstallations.value.reduce((total, item) => total + (item.shards || []).length, 0))
const latestOfficialVersionLabel = computed(() => versionReport.value?.officialRelease?.version || '--')
const officialReleaseId = computed(() => versionReport.value?.officialRelease?.releaseId || '')
const officialReleaseStale = computed(() => (
  versionReport.value?.officialRelease?.stale === true ||
  Boolean(officialVersionError.value && versionReport.value?.officialRelease)
))
const planStateKey = computed(() => {
  if (!plan.value?.ready) return 'blocked'
  return plan.value?.updateRequired ? 'updateRequired' : 'upToDate'
})
const steamClientManagedOnly = computed(() => (
  planInstallations.value.length > 0 && planInstallations.value.every(item => item.updateMethod === 'steam-client')
))
const activeJobRunning = computed(() => Boolean(activeJob.value && (
  !gameReleaseJobIsTerminal(activeJob.value) || trackedRelease.value && !gameReleaseIsTerminal(trackedRelease.value)
)))
const canPreview = computed(() => !previewing.value && !publishing.value && !activeJobRunning.value && Number(policy.timeoutSeconds) >= 30 && Number(policy.timeoutSeconds) <= 900)
const canPublish = computed(() => Boolean(plan.value?.ready && plan.value?.updateRequired && plan.value?.planHash) && !publishing.value && !activeJobRunning.value)

watch([desiredVersion, () => policy.cleanCache, () => policy.restartRunning, () => policy.loadConfirmation, () => policy.timeoutSeconds], () => {
  previewRequestSequence += 1
  previewing.value = false
  plan.value = null
})

onMounted(async () => {
  window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, handleManagementScopeChange)
  await loadHistory({ discover: false })
  if (disposed) return
  if (!showMaintenanceJob(route.query.maintenanceJob) && !resumePolling()) followRunningRelease()
})

onBeforeUnmount(() => {
  disposed = true
  requestSequence += 1
  detailsRequestSequence += 1
  previewRequestSequence += 1
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
  previewRequestSequence += 1
  previewing.value = false
  plan.value = null
  confirmOpen.value = false
}

function handleManagementScopeChange(event) {
  stopPolling()
  detailsRequestSequence += 1
  activeJob.value = null
  trackedRelease.value = null
  managementScope.value = event?.detail || getManagementScope()
  previewRequestSequence += 1
  previewing.value = false
  plan.value = null
  selectedRelease.value = null
  confirmOpen.value = false
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

function blockerLabel(blocker) {
  const key = gameReleaseBlockerKey(blocker?.code)
  const label = t(`gameReleases.blockers.${key}`)
  const detail = blocker?.message?.trim()
  return detail ? (key === 'unknown' || detail === label ? detail : `${label}: ${detail}`) : label
}

function blockerTargetLabel(blocker) {
  if (!blocker?.targetId) return ''
  const target = planInstallations.value.find(item => (
    item.targetId === blocker.targetId && (!blocker.installationId || item.installationId === blocker.installationId)
  ))
  return target ? targetName(target) : blocker.targetId
}

function formatBytes(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value < 0) return '--'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let current = value
  let unit = 0
  while (current >= 1024 && unit < units.length - 1) {
    current /= 1024
    unit += 1
  }
  return `${new Intl.NumberFormat(locale.value, { maximumFractionDigits: unit === 0 ? 0 : 1 }).format(current)} ${units[unit]}`
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

function updateMethodLabel(target) {
  if (target?.updateMethod === 'steam-client') return t('gameReleases.values.steamClient')
  if (target?.updateMethod === 'steamcmd') return t('gameReleases.values.steamcmd')
  return t('gameReleases.values.unknownUpdateMethod')
}

function platformLabel(target) {
  return t(`gameReleases.values.platforms.${gameReleasePlatformKey(target?.os)}`)
}

function applicationLabel(target) {
  return t(`gameReleases.values.applications.${gameReleaseApplicationKey(target?.appId)}`)
}

function versionChannelLabel(target) {
  const platforms = Array.isArray(target?.platformKeys) && target.platformKeys.length
    ? target.platformKeys.map(key => t(`gameReleases.values.platforms.${key}`)).join(' / ')
    : platformLabel(target)
  return [platforms, applicationLabel(target), target?.appId ? `App ${target.appId}` : ''].filter(Boolean).join(' · ')
}

function targetMetadata(target) {
  return [
    target?.installationId || '--',
    versionChannelLabel(target),
    updateMethodLabel(target),
    target?.online ? t('gameReleases.values.online') : t('gameReleases.values.offline')
  ].filter(Boolean).join(' · ')
}

function targetGameMetadata(target) {
  return [
    platformLabel(target),
    target?.online ? t('gameReleases.values.online') : t('gameReleases.values.offline')
  ].join(' · ')
}

function targetSteamVersions(target) {
  return `${target?.steamBuild || target?.currentVersion || '--'} → ${target?.desiredVersion || '--'}`
}

function targetGameStatus(target) {
  const status = gameReleaseInstallationStatus(target)
  return status.key === 'steamManaged' ? { key: 'upToDate', variant: 'secondary' } : status
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

async function loadOfficialVersion() {
  officialVersionError.value = ''
  try {
    const value = await gameV2API.version({ fresh: true, lightweight: true })
    versionReport.value = value
    if (!value?.officialRelease) {
      officialVersionError.value = value?.officialCheckError || t('gameReleases.feedback.officialVersionUnavailable')
    }
  } catch (error) {
    officialVersionError.value = error?.message || t('gameReleases.feedback.officialVersionUnavailable')
  }
}

async function previewRelease(options = {}) {
  if (!canPreview.value) return
  const sequence = ++previewRequestSequence
  const request = releaseRequest()
  previewing.value = true
  taskError.value = ''
  plan.value = null
  try {
    const [, value] = await Promise.all([
      loadOfficialVersion(),
      runtimeObservationsV2API.refresh({ targetId: managementScopeTargetId(managementScope.value) })
        .then(() => gameReleasesV2API.preview(request))
    ])
    if (sequence !== previewRequestSequence) return
    plan.value = value
    if (!options.quiet) toast.success(t('gameReleases.feedback.previewReady'))
  } catch (error) {
    if (sequence !== previewRequestSequence) return
    taskError.value = error.message || t('common.errors.unknown')
    if (!options.quiet) toast.error(t('gameReleases.feedback.previewFailed', { error: taskError.value }))
  } finally {
    if (sequence === previewRequestSequence) previewing.value = false
  }
}

function openConfirmation() {
  if (canPublish.value) confirmOpen.value = true
}

async function publishRelease() {
  if (!canPublish.value) return
  publishing.value = true
  taskError.value = ''
  try {
    const job = await gameReleasesV2API.create({
      ...releaseRequest(),
      planHash: plan.value.planHash,
      confirmation: plan.value.planHash
    })
    if (!job?.id) throw new Error(t('gameReleases.feedback.invalidJobResponse'))
    confirmOpen.value = false
    toast.success(t('gameReleases.feedback.submitted'))
    startPolling(job)
  } catch (error) {
    taskError.value = error.message || t('common.errors.unknown')
    toast.error(t('gameReleases.feedback.submitFailed', { error: taskError.value }))
  } finally {
    publishing.value = false
  }
}

async function openDetails(release) {
  if (!release?.id) return
  const sequence = ++detailsRequestSequence
  detailsLoading.value = true
  try {
    const value = await gameReleasesV2API.get(release.id)
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
      associatedRelease = await gameReleasesV2API.get(associatedId)
      if (generation !== pollGeneration) return
      trackedRelease.value = associatedRelease
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
      await previewRelease({ quiet: true })
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
        <GameInstallationManager ref="installationsRef" maintenance-menu :disabled="activeJobRunning || publishing || previewing" @changed="handleInstallationChanged">
          <template #footer="{ items, busy }">
            <CardFooter v-if="items.some(item => item.installed)" class="min-w-0 flex-col items-stretch gap-3">
              <div class="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <div class="flex min-w-0 flex-wrap items-center gap-2" role="status" aria-live="polite">
                  <Badge v-if="plan" :variant="!plan.ready ? 'destructive' : plan.updateRequired ? 'warning' : 'success'">{{ t(`gameReleases.plan.${planStateKey}`) }}</Badge>
                  <span v-else class="text-sm text-muted-foreground">{{ t('gameReleases.simple.notChecked') }}</span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <UiButton :variant="plan ? 'outline' : 'default'" :disabled="!canPreview || busy" @click="previewRelease">
                    <Spinner v-if="previewing" data-icon="inline-start" />
                    <ScanSearch v-else data-icon="inline-start" />
                    {{ t(previewing ? 'gameReleases.actions.checking' : 'gameReleases.actions.check') }}
                  </UiButton>
                  <UiButton v-if="plan?.updateRequired" :disabled="!canPublish || busy" @click="openConfirmation"><PackageCheck data-icon="inline-start" />{{ t('gameReleases.actions.publish') }}</UiButton>
                </div>
              </div>
              <p class="text-xs text-muted-foreground">{{ t('gameReleases.simple.description') }}</p>

              <div v-if="previewing && !plan" class="flex flex-col gap-2" :aria-label="t('gameReleases.actions.checking')">
                <Skeleton v-for="index in 3" :key="index" class="h-10 w-full" />
              </div>

              <template v-else-if="plan">
                <div class="grid gap-x-5 gap-y-3 rounded-md bg-muted/30 px-4 py-3 sm:grid-cols-2">
                  <div class="flex min-w-0 flex-col gap-0.5"><span class="text-xs text-muted-foreground">{{ t('gameReleases.simple.latestOfficialVersion') }}</span><div class="flex min-w-0 flex-wrap items-center gap-1.5"><strong class="truncate text-lg font-semibold tabular-nums" :title="latestOfficialVersionLabel">{{ latestOfficialVersionLabel }}</strong><Badge v-if="officialReleaseId" variant="outline">R{{ officialReleaseId }}</Badge><Badge v-if="officialReleaseStale" variant="outline" :title="versionReport?.officialCheckError || officialVersionError">{{ t('gameReleases.simple.cached') }}</Badge></div></div>
                  <div class="flex min-w-0 flex-col gap-1">
                    <span class="text-xs text-muted-foreground">{{ t(plan.updateRequired ? 'gameReleases.simple.affectedScope' : 'gameReleases.simple.checkedScope') }}</span>
                    <span class="text-sm font-medium">{{ t('gameReleases.simple.scopeSummary', { rooms: plan.affectedRoomIds?.length || 0, worlds: affectedShardCount }) }}</span>
                    <span class="text-xs text-muted-foreground">{{ t('gameReleases.simple.runningSummary', { count: runningShardCount }) }}</span>
                  </div>
                </div>

                <Alert v-if="officialVersionError">
                  <CircleAlert />
                  <AlertTitle>{{ t('gameReleases.simple.officialVersionUnavailable') }}</AlertTitle>
                  <AlertDescription>{{ officialVersionError }}</AlertDescription>
                </Alert>

                <p v-if="!planInstallations.length" class="text-sm text-muted-foreground">{{ t('gameReleases.nodes.empty') }}</p>
                <section v-else-if="planInstallations.length > 1" class="flex min-w-0 flex-col gap-2" :aria-label="t('gameReleases.nodes.title')">
                  <div class="flex items-center justify-between gap-3">
                    <h3 class="text-sm font-semibold">{{ t('gameReleases.nodes.title') }}</h3>
                    <Badge variant="outline">{{ t('gameReleases.nodes.count', { nodes: affectedNodeCount, installations: planInstallations.length }) }}</Badge>
                  </div>
                  <div class="overflow-x-auto rounded-lg border">
                    <Table class="min-w-[640px]">
                      <TableHeader><TableRow><TableHead>{{ t('gameReleases.columns.target') }}</TableHead><TableHead>{{ t('gameReleases.columns.gameVersion') }}</TableHead><TableHead>{{ t('gameReleases.columns.shards') }}</TableHead><TableHead>{{ t('gameReleases.columns.status') }}</TableHead></TableRow></TableHeader>
                      <TableBody>
                        <TableRow v-for="target in planInstallations" :key="`${target.targetId}:${target.installationId}`">
                          <TableCell><div class="flex min-w-0 flex-col gap-1"><span class="font-medium">{{ targetName(target) }}</span><span class="text-xs text-muted-foreground">{{ targetGameMetadata(target) }}</span></div></TableCell>
                          <TableCell class="font-medium tabular-nums">{{ target.gameVersion || '--' }}</TableCell>
                          <TableCell>{{ t('gameReleases.values.runningShards', { running: target.runningShards || 0, total: target.shards?.length || 0 }) }}</TableCell>
                          <TableCell><Badge :variant="targetGameStatus(target).variant">{{ t(`gameReleases.values.${targetGameStatus(target).key}`) }}</Badge></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </section>

                <ModPreflightReports :reports="plan?.modDiagnostics || []" />

                <Alert v-if="planBlockers.length" variant="destructive">
                  <TriangleAlert />
                  <AlertTitle>{{ t('gameReleases.plan.blockerTitle') }}</AlertTitle>
                  <AlertDescription class="flex flex-col gap-1">
                    <span>{{ t('gameReleases.plan.blockerDescription') }}</span>
                    <span v-for="(blocker, index) in planBlockers" :key="`${blocker.code}:${blocker.targetId}:${blocker.worldId}:${index}`">{{ blockerLabel(blocker) }}<template v-if="blocker.targetId"> · {{ blockerTargetLabel(blocker) }}</template><template v-if="blocker.worldId"> / {{ blocker.worldId }}</template></span>
                  </AlertDescription>
                </Alert>

                <Alert v-else-if="plan.updateRequired">
                  <ShieldCheck />
                  <AlertTitle>{{ t('gameReleases.notice.title') }}</AlertTitle>
                  <AlertDescription>{{ t('gameReleases.notice.description') }}</AlertDescription>
                </Alert>
                <p v-else-if="steamClientManagedOnly" class="text-sm text-muted-foreground">{{ t('gameReleases.plan.steamManagedDescription') }}</p>

                <Collapsible v-model:open="technicalOpen">
                  <CollapsibleTrigger as-child>
                    <UiButton variant="ghost" size="sm" class="group">
                      <span>{{ t('gameReleases.technical.title') }}</span>
                      <ChevronDown data-icon="inline-end" class="transition-transform group-data-[state=open]:rotate-180" />
                    </UiButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent class="flex min-w-0 flex-col gap-3 pt-3">
                    <Alert v-if="planVersionChannels.length > 1">
                      <CircleAlert />
                      <AlertTitle>{{ t('gameReleases.nodes.channelTitle') }}</AlertTitle>
                      <AlertDescription>{{ t('gameReleases.nodes.channelDescription', { channels: planVersionChannelsLabel }) }}</AlertDescription>
                    </Alert>
                    <div v-if="planInstallations.length" class="overflow-x-auto rounded-lg border">
                      <Table class="min-w-[900px]">
                        <TableHeader><TableRow><TableHead>{{ t('gameReleases.columns.target') }}</TableHead><TableHead>{{ t('gameReleases.columns.channel') }}</TableHead><TableHead>{{ t('gameReleases.columns.steamVersions') }}</TableHead><TableHead>{{ t('gameReleases.columns.disk') }}</TableHead><TableHead>{{ t('gameReleases.columns.updateMethod') }}</TableHead></TableRow></TableHeader>
                        <TableBody>
                          <TableRow v-for="target in planInstallations" :key="`technical:${target.targetId}:${target.installationId}`">
                            <TableCell><div class="flex min-w-0 flex-col gap-1"><span class="font-medium">{{ targetName(target) }}</span><span class="font-mono text-xs text-muted-foreground">{{ target.installationId || '--' }}</span></div></TableCell>
                            <TableCell class="text-xs" :title="targetMetadata(target)">{{ versionChannelLabel(target) }}</TableCell>
                            <TableCell class="tabular-nums">{{ targetSteamVersions(target) }}</TableCell>
                            <TableCell class="tabular-nums">{{ formatBytes(target.availableBytes) }} / {{ formatBytes(target.requiredBytes) }}</TableCell>
                            <TableCell>{{ updateMethodLabel(target) }}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    <div class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      <span class="min-w-0 truncate" :title="plan.topologyRevision">{{ t('gameReleases.plan.topology') }}: {{ plan.topologyRevision }}</span>
                      <span class="min-w-0 truncate" :title="plan.planHash">{{ t('gameReleases.plan.planHash') }}: {{ plan.planHash }}</span>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </template>

              <Separator />

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
                <TableCell><div class="flex flex-col gap-1"><Badge :variant="gameReleaseStageVariant(result.stage)" class="self-start">{{ stageLabel(result.stage) }}</Badge><span class="text-xs text-muted-foreground">{{ t(`gameReleases.writeStates.${gameReleaseWriteState(result.writeState)}`) }}</span><span v-if="result.errorMessage" class="text-xs text-destructive">{{ result.errorMessage }}</span></div></TableCell>
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
                <TableCell><div class="flex flex-col gap-1"><Badge :variant="shard.errorMessage ? 'destructive' : shard.runtimeState === 'running' && shard.stage === 'succeeded' ? 'success' : 'outline'" class="self-start">{{ t(`gameReleases.progress.shardStates.${gameReleaseShardState(shard, selectedRelease)}`) }}</Badge><span v-if="shard.errorMessage" class="text-xs text-destructive">{{ shard.errorMessage }}</span></div></TableCell>
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

    <Dialog v-model:open="recoveryConfirmOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader><DialogTitle>{{ t(recoveryRepair ? 'gameReleases.recovery.repair' : 'gameReleases.recovery.recheck') }}</DialogTitle><DialogDescription>{{ t(recoveryRepair ? 'gameReleases.recovery.repairDescription' : 'gameReleases.recovery.confirmDescription') }}</DialogDescription></DialogHeader>
        <div v-for="target in recoveryPlan?.installations || []" :key="`${target.targetId}:${target.installationId}`" class="flex items-center justify-between gap-3"><span>{{ target.targetName }} / {{ target.installationId }}</span><Badge variant="outline">{{ target.currentVersion }} → {{ target.desiredVersion }}</Badge></div>
        <DialogFooter><UiButton variant="outline" @click="recoveryConfirmOpen = false">{{ t('common.actions.cancel') }}</UiButton><UiButton :disabled="retrying" @click="retryRelease(true)"><Spinner v-if="retrying" data-icon="inline-start" />{{ t(recoveryRepair ? 'gameReleases.recovery.repair' : 'gameReleases.recovery.continue') }}</UiButton></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog v-model:open="confirmOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader><DialogTitle>{{ t('gameReleases.confirm.title') }}</DialogTitle><DialogDescription>{{ t('gameReleases.confirm.description') }}</DialogDescription></DialogHeader>
        <Alert variant="destructive"><TriangleAlert /><AlertTitle>{{ t('gameReleases.confirm.warningTitle') }}</AlertTitle><AlertDescription>{{ t('gameReleases.confirm.warningDescription', { rooms: plan?.affectedRoomIds?.length || 0, shards: affectedShardCount }) }}</AlertDescription></Alert>
        <DialogFooter><UiButton variant="outline" @click="confirmOpen = false">{{ t('common.actions.cancel') }}</UiButton><UiButton :disabled="publishing" @click="publishRelease"><Spinner v-if="publishing" data-icon="inline-start" /><PackageCheck v-else data-icon="inline-start" />{{ t('gameReleases.confirm.submit') }}</UiButton></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

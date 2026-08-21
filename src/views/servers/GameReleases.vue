<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  PackageCheck,
  RefreshCw,
  RotateCw,
  ScanSearch,
  ServerCog,
  ShieldCheck,
  TriangleAlert
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { gameReleasesV2API, jobsV2API } from '@/api/v2'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
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
  gameReleaseIsTerminal,
  gameReleaseJobFailed,
  gameReleaseJobIsTerminal,
  gameReleaseJobProgress,
  gameReleaseStageKey,
  gameReleaseStageVariant
} from '@/lib/gameRelease.mjs'

const ACTIVE_RELEASE_KEY = 'dstGameReleaseActivity'
const { locale, t } = useI18n()
const desiredVersion = ref('')
const policy = reactive({ cleanCache: false, restartRunning: true, loadConfirmation: 'logs', timeoutSeconds: 300 })
const plan = ref(null)
const releases = ref([])
const selectedRelease = ref(null)
const activeJob = ref(null)
const loading = ref(false)
const previewing = ref(false)
const publishing = ref(false)
const retrying = ref(false)
const detailsLoading = ref(false)
const loadError = ref('')
const taskError = ref('')
const confirmOpen = ref(false)
const advancedOpen = ref(false)
const technicalOpen = ref(false)
let pollTimer = 0
let requestSequence = 0
let historyLoadingSequence = 0
let previewRequestSequence = 0
let detailsRequestSequence = 0
let pollGeneration = 0
let pollReadFailures = 0
let pollConfirmationMisses = 0

const planInstallations = computed(() => plan.value?.installations || [])
const planBlockers = computed(() => plan.value?.blockers || [])
const affectedShardCount = computed(() => planInstallations.value.reduce((total, item) => total + (item.shards || []).length, 0))
const currentVersionLabel = computed(() => {
  const versions = [...new Set(planInstallations.value.map(item => item.currentVersion).filter(Boolean))]
  if (!versions.length) return '--'
  if (versions.length === 1) return versions[0]
  return t('gameReleases.simple.mixedVersions', { count: versions.length })
})
const activeProgress = computed(() => gameReleaseJobProgress(activeJob.value))
const activeJobRunning = computed(() => Boolean(activeJob.value && !gameReleaseJobIsTerminal(activeJob.value)))
const canPreview = computed(() => !previewing.value && !publishing.value && !activeJobRunning.value && Number(policy.timeoutSeconds) >= 30 && Number(policy.timeoutSeconds) <= 900)
const canPublish = computed(() => Boolean(plan.value?.ready && plan.value?.updateRequired && plan.value?.planHash) && !publishing.value && !activeJobRunning.value)

watch([desiredVersion, () => policy.cleanCache, () => policy.restartRunning, () => policy.loadConfirmation, () => policy.timeoutSeconds], () => {
  previewRequestSequence += 1
  previewing.value = false
  plan.value = null
})

onMounted(async () => {
  await loadHistory()
  resumePolling()
})

onBeforeUnmount(stopPolling)

function releaseRequest() {
  const requested = desiredVersion.value.trim()
  return {
    ...(requested ? { desiredVersion: requested } : {}),
    policy: {
      cleanCache: policy.cleanCache,
      restartRunning: policy.restartRunning,
      loadConfirmation: policy.loadConfirmation,
      timeoutSeconds: Number(policy.timeoutSeconds)
    }
  }
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
  return key === 'unknown' && blocker?.message ? blocker.message : t(`gameReleases.blockers.${key}`)
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
  return target?.targetName || (target?.targetId === 'local' ? t('gameReleases.values.local') : target?.targetId) || '--'
}

function targetStatus(target) {
  if ((target?.blockers || []).length) return { key: 'blocked', variant: 'destructive' }
  if (target?.upToDate) return { key: 'upToDate', variant: 'secondary' }
  return { key: 'ready', variant: 'outline' }
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
    loadError.value = ''
    return releases.value
  } catch (error) {
    if (sequence === requestSequence) loadError.value = error.message || t('common.errors.unknown')
    if (!options.quiet) toast.error(t('gameReleases.feedback.historyFailed', { error: error.message || t('common.errors.unknown') }))
    return releases.value
  } finally {
    if (!options.quiet && historyLoadingSequence === sequence) loading.value = false
  }
}

async function previewRelease() {
  if (!canPreview.value) return
  const sequence = ++previewRequestSequence
  const request = releaseRequest()
  previewing.value = true
  taskError.value = ''
  try {
    const value = await gameReleasesV2API.preview(request)
    if (sequence !== previewRequestSequence) return
    plan.value = value
    toast.success(t('gameReleases.feedback.previewReady'))
  } catch (error) {
    if (sequence !== previewRequestSequence) return
    taskError.value = error.message || t('common.errors.unknown')
    toast.error(t('gameReleases.feedback.previewFailed', { error: taskError.value }))
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
    if (sequence === detailsRequestSequence) selectedRelease.value = value
  } catch (error) {
    if (sequence !== detailsRequestSequence) return
    toast.error(t('gameReleases.feedback.detailsFailed', { error: error.message || t('common.errors.unknown') }))
  } finally {
    if (sequence === detailsRequestSequence) detailsLoading.value = false
  }
}

async function retryRelease() {
  if (!gameReleaseCanRetry(selectedRelease.value)) return
  retrying.value = true
  taskError.value = ''
  try {
    const job = await gameReleasesV2API.retry(selectedRelease.value.id)
    if (!job?.id) throw new Error(t('gameReleases.feedback.invalidJobResponse'))
    toast.success(t('gameReleases.feedback.retrySubmitted'))
    startPolling(job, selectedRelease.value.id)
  } catch (error) {
    taskError.value = error.message || t('common.errors.unknown')
    toast.error(t('gameReleases.feedback.retryFailed', { error: taskError.value }))
  } finally {
    retrying.value = false
  }
}

function startPolling(job, releaseId = '') {
  if (!job?.id) return
  stopPolling()
  const generation = ++pollGeneration
  pollReadFailures = 0
  pollConfirmationMisses = 0
  activeJob.value = job
  sessionStorage.setItem(ACTIVE_RELEASE_KEY, JSON.stringify({ jobId: job.id, releaseId }))
  void pollActivity(job.id, releaseId, generation)
}

function resumePolling() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(ACTIVE_RELEASE_KEY) || '{}')
    if (saved.jobId) {
      const generation = ++pollGeneration
      pollReadFailures = 0
      pollConfirmationMisses = 0
      void pollActivity(saved.jobId, saved.releaseId || '', generation)
    }
  } catch {
    sessionStorage.removeItem(ACTIVE_RELEASE_KEY)
  }
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
    const job = await jobsV2API.get(jobId)
    if (generation !== pollGeneration) return
    activeJob.value = job
    const history = await loadHistory({ quiet: true })
    if (generation !== pollGeneration) return
    const associated = releaseId
      ? history.find(item => item.id === releaseId)
      : gameReleaseFindByJob(history, jobId)
    let associatedRelease = null
    if (associated?.id) {
      associatedRelease = await gameReleasesV2API.get(associated.id)
      if (generation !== pollGeneration) return
      selectedRelease.value = associatedRelease
    }

    pollReadFailures = 0
    taskError.value = ''
    const releaseDone = associatedRelease && gameReleaseIsTerminal(associatedRelease)
    const jobDone = gameReleaseJobIsTerminal(activeJob.value)
    if (jobDone && (releaseDone || gameReleaseJobFailed(activeJob.value))) {
      sessionStorage.removeItem(ACTIVE_RELEASE_KEY)
      if (gameReleaseJobFailed(activeJob.value)) {
        taskError.value = releaseError(activeJob.value)
        toast.error(t('gameReleases.feedback.taskFailed', { error: taskError.value }))
      }
      return
    }
    if (jobDone) {
      pollConfirmationMisses += 1
      if (pollConfirmationMisses >= 10) {
        sessionStorage.removeItem(ACTIVE_RELEASE_KEY)
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
      sessionStorage.removeItem(ACTIVE_RELEASE_KEY)
      return
    }
  }
  schedulePoll(jobId, releaseId, generation)
}
</script>

<template>
  <div class="flex min-w-0 flex-col gap-5">
    <header class="min-w-0">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-2xl font-semibold tracking-normal">{{ t('gameReleases.title') }}</h1>
          <Badge variant="outline">Steam build</Badge>
        </div>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('gameReleases.subtitle') }}</p>
      </div>
    </header>

    <Alert v-if="taskError" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('gameReleases.job.failed') }}</AlertTitle>
      <AlertDescription>{{ taskError }}</AlertDescription>
    </Alert>

    <Card size="sm">
      <CardHeader class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <CardTitle>{{ t('gameReleases.simple.title') }}</CardTitle>
          <CardDescription class="mt-1.5">{{ t('gameReleases.simple.description') }}</CardDescription>
        </div>
        <UiButton class="shrink-0" :disabled="!canPreview" @click="previewRelease">
          <Spinner v-if="previewing" data-icon="inline-start" />
          <ScanSearch v-else data-icon="inline-start" />
          {{ t(previewing ? 'gameReleases.actions.checking' : 'gameReleases.actions.check') }}
        </UiButton>
      </CardHeader>
      <CardContent class="flex min-w-0 flex-col gap-4 pt-0">
        <Alert v-if="!plan">
          <ScanSearch />
          <AlertTitle>{{ t('gameReleases.simple.notChecked') }}</AlertTitle>
          <AlertDescription>{{ t('gameReleases.simple.notCheckedDescription') }}</AlertDescription>
        </Alert>

        <template v-else>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-base font-semibold">{{ t('gameReleases.simple.resultTitle') }}</h2>
                <Badge :variant="plan.ready ? 'secondary' : 'destructive'">{{ t(plan.ready ? 'gameReleases.plan.ready' : 'gameReleases.plan.blocked') }}</Badge>
                <Badge variant="outline">{{ t(plan.updateRequired ? 'gameReleases.plan.updateRequired' : 'gameReleases.plan.upToDate') }}</Badge>
              </div>
              <p class="mt-0.5 text-sm text-muted-foreground">{{ t('gameReleases.simple.resultDescription') }}</p>
            </div>
            <UiButton v-if="plan.updateRequired" :disabled="!canPublish" @click="openConfirmation">
              <PackageCheck data-icon="inline-start" />{{ t('gameReleases.actions.publish') }}
            </UiButton>
          </div>

          <div class="grid grid-cols-2 gap-x-5 gap-y-3 rounded-lg border px-4 py-3 lg:grid-cols-4">
            <div class="flex min-w-0 flex-col gap-0.5"><span class="text-xs text-muted-foreground">{{ t('gameReleases.simple.currentVersion') }}</span><strong class="truncate text-lg font-semibold tabular-nums" :title="currentVersionLabel">{{ currentVersionLabel }}</strong></div>
            <div class="flex min-w-0 flex-col gap-0.5"><span class="text-xs text-muted-foreground">{{ t('gameReleases.simple.latestVersion') }}</span><strong class="truncate text-lg font-semibold tabular-nums">{{ plan.desiredVersion || '--' }}</strong></div>
            <div class="flex min-w-0 flex-col gap-0.5"><span class="text-xs text-muted-foreground">{{ t('gameReleases.simple.affectedNodes') }}</span><strong class="text-lg font-semibold tabular-nums">{{ planInstallations.length }}</strong></div>
            <div class="flex min-w-0 flex-col gap-0.5"><span class="text-xs text-muted-foreground">{{ t('gameReleases.simple.affectedRoomsAndWorlds') }}</span><strong class="text-lg font-semibold tabular-nums">{{ plan.affectedRoomIds?.length || 0 }}<span class="ml-1 text-xs font-normal text-muted-foreground">/ {{ affectedShardCount }}</span></strong></div>
          </div>

          <Alert v-if="planBlockers.length" variant="destructive">
            <TriangleAlert />
            <AlertTitle>{{ t('gameReleases.plan.blockerTitle') }}</AlertTitle>
            <AlertDescription class="flex flex-col gap-1">
              <span>{{ t('gameReleases.plan.blockerDescription') }}</span>
              <span v-for="(blocker, index) in planBlockers" :key="`${blocker.code}:${blocker.targetId}:${blocker.worldId}:${index}`">{{ blockerLabel(blocker) }}<template v-if="blocker.targetId"> · {{ blocker.targetId }}</template><template v-if="blocker.worldId"> / {{ blocker.worldId }}</template></span>
            </AlertDescription>
          </Alert>

          <Alert v-else-if="!plan.updateRequired">
            <CircleCheck />
            <AlertTitle>{{ t('gameReleases.plan.noUpdateTitle') }}</AlertTitle>
            <AlertDescription>{{ t('gameReleases.plan.noUpdateDescription') }}</AlertDescription>
          </Alert>

          <Alert v-else>
            <ShieldCheck />
            <AlertTitle>{{ t('gameReleases.notice.title') }}</AlertTitle>
            <AlertDescription>{{ t('gameReleases.notice.description') }}</AlertDescription>
          </Alert>

          <Collapsible v-model:open="technicalOpen">
            <CollapsibleTrigger as-child>
              <UiButton variant="ghost" class="group w-full justify-between">
                <span class="text-left"><span class="block">{{ t('gameReleases.technical.title') }}</span><span class="block text-xs font-normal text-muted-foreground">{{ t('gameReleases.technical.description') }}</span></span>
                <ChevronDown data-icon="inline-end" class="transition-transform group-data-[state=open]:rotate-180" />
              </UiButton>
            </CollapsibleTrigger>
            <CollapsibleContent class="flex min-w-0 flex-col gap-3 pt-3">
              <div class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span class="min-w-0 truncate" :title="plan.topologyRevision">{{ t('gameReleases.plan.topology') }}: {{ plan.topologyRevision }}</span>
                <span class="min-w-0 truncate" :title="plan.planHash">{{ t('gameReleases.plan.planHash') }}: {{ plan.planHash }}</span>
              </div>
              <div class="overflow-x-auto rounded-lg border">
                <Table class="min-w-[900px]">
                  <TableHeader><TableRow><TableHead>{{ t('gameReleases.columns.target') }}</TableHead><TableHead>{{ t('gameReleases.columns.installation') }}</TableHead><TableHead>{{ t('gameReleases.columns.versions') }}</TableHead><TableHead>{{ t('gameReleases.columns.disk') }}</TableHead><TableHead>{{ t('gameReleases.columns.shards') }}</TableHead><TableHead>{{ t('gameReleases.columns.status') }}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow v-for="target in planInstallations" :key="`${target.targetId}:${target.installationId}`">
                      <TableCell><div class="flex min-w-0 flex-col gap-1"><span class="font-medium">{{ targetName(target) }}</span><span class="text-xs text-muted-foreground">{{ target.online ? t('gameReleases.values.online') : t('gameReleases.values.offline') }}</span></div></TableCell>
                      <TableCell class="font-mono text-xs">{{ target.installationId }}</TableCell>
                      <TableCell class="tabular-nums">{{ target.currentVersion || '--' }} → {{ target.desiredVersion || plan.desiredVersion }}</TableCell>
                      <TableCell class="tabular-nums">{{ formatBytes(target.availableBytes) }} / {{ formatBytes(target.requiredBytes) }}</TableCell>
                      <TableCell>{{ t('gameReleases.values.runningShards', { running: target.runningShards || 0, total: target.shards?.length || 0 }) }}</TableCell>
                      <TableCell><Badge :variant="targetStatus(target).variant">{{ t(`gameReleases.values.${targetStatus(target).key}`) }}</Badge></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </template>

        <Separator />

        <Collapsible v-model:open="advancedOpen">
          <CollapsibleTrigger as-child>
            <UiButton variant="ghost" class="group w-full justify-between">
              <span class="text-left"><span class="block">{{ t('gameReleases.advanced.title') }}</span><span class="block text-xs font-normal text-muted-foreground">{{ t('gameReleases.advanced.description') }}</span></span>
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
      </CardContent>
    </Card>

    <Alert v-if="activeJob">
      <ServerCog />
      <AlertTitle>{{ t('gameReleases.job.title') }} · {{ jobLabel(activeJob.status) }}</AlertTitle>
      <AlertDescription class="flex flex-col gap-2">
        <Progress v-if="activeProgress !== null" :model-value="activeProgress" />
        <span>{{ activeJob.message || activeJob.id }}</span>
      </AlertDescription>
    </Alert>

    <section class="flex min-w-0 flex-col gap-3" aria-labelledby="release-history-title">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 id="release-history-title" class="text-base font-semibold">{{ t('gameReleases.history.title') }}</h2><p class="mt-0.5 text-sm text-muted-foreground">{{ t('gameReleases.history.description') }}</p></div>
        <UiButton variant="outline" size="sm" :disabled="loading" @click="loadHistory">
          <Spinner v-if="loading" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          {{ t('gameReleases.actions.refresh') }}
        </UiButton>
      </div>
      <Alert v-if="loadError" variant="destructive"><CircleAlert /><AlertTitle>{{ t('gameReleases.history.title') }}</AlertTitle><AlertDescription>{{ loadError }}</AlertDescription></Alert>
      <div v-if="loading && !releases.length" class="flex flex-col gap-2" :aria-label="t('gameReleases.history.loading')"><Skeleton v-for="index in 4" :key="index" class="h-12 w-full" /></div>
      <Empty v-else-if="!releases.length && !loadError"><EmptyHeader><EmptyMedia variant="icon"><PackageCheck /></EmptyMedia><EmptyTitle>{{ t('gameReleases.history.emptyTitle') }}</EmptyTitle><EmptyDescription>{{ t('gameReleases.history.emptyDescription') }}</EmptyDescription></EmptyHeader></Empty>
      <div v-else class="overflow-x-auto rounded-lg border">
        <Table class="min-w-[760px]">
          <TableHeader><TableRow><TableHead>{{ t('gameReleases.columns.release') }}</TableHead><TableHead>{{ t('gameReleases.plan.targetVersion') }}</TableHead><TableHead>{{ t('gameReleases.columns.status') }}</TableHead><TableHead>{{ t('gameReleases.columns.createdAt') }}</TableHead><TableHead class="text-right">{{ t('common.fields.actions') }}</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow v-for="release in releases" :key="release.id">
              <TableCell class="font-mono text-xs">{{ release.id }}</TableCell><TableCell class="tabular-nums">{{ release.plan?.desiredVersion || '--' }}</TableCell><TableCell><Badge :variant="gameReleaseStageVariant(release.stage)">{{ stageLabel(release.stage) }}</Badge></TableCell><TableCell>{{ formatDate(release.createdAt) }}</TableCell><TableCell class="text-right"><UiButton variant="ghost" size="sm" :disabled="detailsLoading" @click="openDetails(release)">{{ t('gameReleases.actions.view') }}</UiButton></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>

    <section v-if="selectedRelease" class="flex min-w-0 flex-col gap-3" aria-labelledby="release-details-title">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div><div class="flex flex-wrap items-center gap-2"><h2 id="release-details-title" class="text-base font-semibold">{{ t('gameReleases.details.title') }}</h2><Badge :variant="gameReleaseStageVariant(selectedRelease.stage)">{{ stageLabel(selectedRelease.stage) }}</Badge></div><p class="mt-0.5 text-sm text-muted-foreground">{{ t('gameReleases.details.description', { id: selectedRelease.id }) }}</p></div>
        <UiButton v-if="gameReleaseCanRetry(selectedRelease)" variant="outline" :disabled="retrying" @click="retryRelease"><Spinner v-if="retrying" data-icon="inline-start" /><RotateCw v-else data-icon="inline-start" />{{ t('gameReleases.actions.retry') }}</UiButton>
      </div>
      <Alert v-if="selectedRelease.errorMessage" variant="destructive"><CircleAlert /><AlertTitle>{{ selectedRelease.errorCode || stageLabel(selectedRelease.stage) }}</AlertTitle><AlertDescription>{{ selectedRelease.errorMessage }}</AlertDescription></Alert>
      <div v-if="selectedRelease.protectionBackupIds?.length" class="flex flex-wrap items-center gap-2"><span class="text-sm font-medium">{{ t('gameReleases.details.backups') }}</span><Badge v-for="backupId in selectedRelease.protectionBackupIds" :key="backupId" variant="outline" class="font-mono">{{ backupId }}</Badge></div>
      <Separator />
      <div><h3 class="mb-2 text-sm font-semibold">{{ t('gameReleases.details.installationResults') }}</h3><div class="overflow-x-auto rounded-lg border"><Table class="min-w-[760px]"><TableHeader><TableRow><TableHead>{{ t('gameReleases.columns.target') }}</TableHead><TableHead>{{ t('gameReleases.columns.installation') }}</TableHead><TableHead>{{ t('gameReleases.columns.beforeAfter') }}</TableHead><TableHead>{{ t('gameReleases.columns.stage') }}</TableHead><TableHead>{{ t('gameReleases.columns.updatedAt') }}</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="result in selectedRelease.installations || []" :key="`${result.targetId}:${result.installationId}`"><TableCell>{{ result.targetId }}</TableCell><TableCell class="font-mono text-xs">{{ result.installationId }}</TableCell><TableCell class="tabular-nums">{{ result.beforeVersion || '--' }} → {{ result.afterVersion || '--' }}</TableCell><TableCell><div class="flex flex-col gap-1"><Badge :variant="gameReleaseStageVariant(result.stage)" class="self-start">{{ stageLabel(result.stage) }}</Badge><span v-if="result.errorMessage" class="text-xs text-destructive">{{ result.errorMessage }}</span></div></TableCell><TableCell>{{ formatDate(result.updatedAt) }}</TableCell></TableRow></TableBody></Table></div></div>
      <div><h3 class="mb-2 text-sm font-semibold">{{ t('gameReleases.details.shardResults') }}</h3><div class="overflow-x-auto rounded-lg border"><Table class="min-w-[900px]"><TableHeader><TableRow><TableHead>{{ t('gameReleases.columns.rooms') }}</TableHead><TableHead>{{ t('gameReleases.columns.target') }}</TableHead><TableHead>{{ t('gameReleases.columns.stage') }}</TableHead><TableHead>{{ t('gameReleases.columns.evidence') }}</TableHead><TableHead>{{ t('gameReleases.columns.updatedAt') }}</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="shard in selectedRelease.shards || []" :key="`${shard.roomId}:${shard.worldId}`"><TableCell><div class="flex flex-col gap-1"><span>{{ shard.roomId }} / {{ shard.worldId }}</span><Badge variant="outline" class="self-start">{{ t(shard.isMaster ? 'gameReleases.values.master' : 'gameReleases.values.secondary') }}</Badge></div></TableCell><TableCell>{{ shard.targetId }}</TableCell><TableCell><div class="flex flex-col gap-1"><Badge :variant="gameReleaseStageVariant(shard.stage)" class="self-start">{{ stageLabel(shard.stage) }}</Badge><span v-if="shard.errorMessage" class="text-xs text-destructive">{{ shard.errorMessage }}</span></div></TableCell><TableCell class="max-w-80 break-words text-xs">{{ shard.loadMarker || t('gameReleases.values.noEvidence') }}<span v-if="shard.loadConfirmedAt" class="mt-1 block text-muted-foreground">{{ formatDate(shard.loadConfirmedAt) }}</span></TableCell><TableCell>{{ formatDate(shard.updatedAt) }}</TableCell></TableRow></TableBody></Table></div></div>
    </section>

    <Dialog v-model:open="confirmOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader><DialogTitle>{{ t('gameReleases.confirm.title') }}</DialogTitle><DialogDescription>{{ t('gameReleases.confirm.description') }}</DialogDescription></DialogHeader>
        <Alert variant="destructive"><TriangleAlert /><AlertTitle>{{ t('gameReleases.confirm.warningTitle') }}</AlertTitle><AlertDescription>{{ t('gameReleases.confirm.warningDescription', { rooms: plan?.affectedRoomIds?.length || 0, shards: affectedShardCount }) }}</AlertDescription></Alert>
        <div class="flex flex-col gap-1 text-xs text-muted-foreground"><span>{{ t('gameReleases.plan.targetVersion') }}: {{ plan?.desiredVersion }}</span><span class="break-all">{{ t('gameReleases.plan.planHash') }}: {{ plan?.planHash }}</span></div>
        <DialogFooter><UiButton variant="outline" @click="confirmOpen = false">{{ t('common.actions.cancel') }}</UiButton><UiButton :disabled="publishing" @click="publishRelease"><Spinner v-if="publishing" data-icon="inline-start" /><PackageCheck v-else data-icon="inline-start" />{{ t('gameReleases.confirm.submit') }}</UiButton></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

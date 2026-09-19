<template>
  <UiDialog v-model:open="dialogOpen">
    <DialogTrigger as-child>
      <UiButton type="button" variant="outline" class="room-mod-trigger" :disabled="!roomId" :title="triggerStatus?.label || overviewDescription">
        <span class="relative inline-flex" aria-hidden="true">
          <Spinner v-if="loading || checking || applying || activeUpdateJob" data-icon="inline-start" />
          <PackageOpen v-else data-icon="inline-start" />
          <span v-if="triggerStatus?.variant === 'destructive'" class="absolute -right-1 -top-1 size-1.5 rounded-full bg-destructive" />
          <span v-else-if="triggerStatus?.variant === 'warning'" class="absolute -right-1 -top-1 size-1.5 rounded-full bg-warning-foreground" />
        </span>
        {{ t('servers.workspace.mods.title') }}
        <span class="min-w-[2ch] text-right tabular-nums">{{ rows.length || (!loading && !loadError) ? rows.length : '–' }}</span>
        <span v-if="triggerStatus" class="sr-only">{{ triggerStatus.label }}</span>
      </UiButton>
    </DialogTrigger>
    <DialogContent class="room-mod-dialog flex w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-3xl max-sm:h-[calc(100dvh-2rem)]" @open-auto-focus="focusDetails">
      <DialogHeader class="pr-6">
        <DialogTitle ref="dialogTitle" tabindex="-1" class="outline-none">{{ t('servers.workspace.mods.dialogTitle', { room: roomName }) }}</DialogTitle>
        <DialogDescription>{{ dialogDescription }}</DialogDescription>
      </DialogHeader>
      <div class="room-mod-dialog-summary">
        <Badge v-if="updateCount" variant="warning">{{ t('servers.workspace.mods.updateCount', { count: updateCount }) }}</Badge>
        <Badge v-if="attentionCount" variant="destructive">{{ t('servers.workspace.mods.attentionCount', { count: attentionCount }) }}</Badge>
        <Badge v-if="prepareCount" variant="secondary">{{ t('servers.workspace.mods.prepareCount', { count: prepareCount }) }}</Badge>
        <span class="text-xs text-muted-foreground">{{ updateKnown ? t('servers.workspace.mods.checkedAt', { time: lastCheckedLabel }) : t('servers.workspace.mods.notChecked') }}</span>
      </div>
      <ScrollArea class="room-mod-scroll">
        <div class="room-mod-content">
          <div v-if="loading" class="flex flex-col gap-3" role="status" :aria-label="t('servers.workspace.mods.loading')">
            <Skeleton v-for="index in 4" :key="index" class="h-14 w-full" />
          </div>
          <Alert v-if="loadError" variant="destructive">
            <CircleAlert />
            <AlertTitle>{{ t('servers.workspace.mods.loadFailed') }}</AlertTitle>
            <AlertDescription>{{ loadError }}</AlertDescription>
            <AlertAction><UiButton size="sm" variant="outline" :disabled="loading" @click="refresh()">{{ t('common.actions.retry') }}</UiButton></AlertAction>
          </Alert>
          <Alert v-if="updateError && !loadError" :variant="updateActionFailed ? 'destructive' : 'default'" role="status">
            <CircleAlert />
            <AlertTitle>{{ t(updateActionFailed ? 'mods.autoUpdate.status.blocked' : updateFileProblem ? 'mods.autoUpdate.filesUnavailable' : 'mods.autoUpdate.checkUnavailable') }}</AlertTitle>
            <AlertDescription>
              <p>{{ updateError }}</p>
              <p v-if="updateKnown">{{ t('servers.workspace.mods.checkedAt', { time: lastCheckedLabel }) }}</p>
              <Collapsible :key="updateErrorDetail" v-slot="{ open }" class="w-full min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <UiButton type="button" variant="outline" size="sm" :disabled="busy || !roomId" @click="checkUpdates">
                    <Spinner v-if="checking" data-icon="inline-start" />
                    <RefreshCw v-else data-icon="inline-start" />
                    {{ t(checking ? 'servers.workspace.mods.checking' : 'servers.workspace.mods.check') }}
                  </UiButton>
                  <CollapsibleTrigger v-if="updateErrorDetail" as-child>
                    <UiButton type="button" variant="ghost" size="sm">
                      {{ t(open ? 'mods.autoUpdate.errors.hideDetails' : 'mods.autoUpdate.errors.showDetails') }}
                    </UiButton>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <pre class="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all text-xs">{{ updateErrorDetail }}</pre>
                </CollapsibleContent>
              </Collapsible>
            </AlertDescription>
          </Alert>
          <Alert v-if="metadataWarning && !loadError" role="status">
            <Info />
            <AlertTitle>{{ t('mods.metadata.notice') }}</AlertTitle>
            <AlertDescription>
              <p>{{ metadataWarning }}</p>
              <p>{{ t('mods.metadata.localFactsAvailable') }}</p>
              <UiButton v-if="incompleteMetadataIds.length" type="button" variant="outline" size="sm" class="mt-2 w-fit" :disabled="metadataLoading" @click="retryMetadata">
                <Spinner v-if="metadataLoading" aria-hidden="true" data-icon="inline-start" />
                <RefreshCw v-else data-icon="inline-start" />
                {{ t(metadataLoading ? 'mods.metadata.retrying' : 'mods.metadata.retry') }}
              </UiButton>
            </AlertDescription>
          </Alert>
          <div v-if="rows.length" class="room-mod-list">
            <article v-for="mod in rows" :key="mod.id" class="room-mod-dialog-row">
              <div class="room-mod-image">
                <Package v-if="!mod.image || brokenImages.has(mod.id)" aria-hidden="true" />
                <img v-else :src="modThumbnailUrl(mod.image, 80)" :alt="mod.name" loading="lazy" @error="markImageBroken(mod.id)" />
              </div>
              <div class="room-mod-copy">
                <strong :title="mod.name">{{ mod.name }}</strong>
                <span>{{ modDetailMeta(mod) }}</span>
              </div>
              <div class="room-mod-badges">
                <Badge :variant="statusVariant(mod.status)">{{ statusLabel(mod.status, mod) }}</Badge>
                <Badge v-if="mod.updateAvailable" variant="warning">{{ t('servers.workspace.mods.status.update_available') }}</Badge>
              </div>
            </article>
          </div>
          <Empty v-else-if="!loading && !loadError">
            <EmptyHeader>
              <EmptyMedia variant="icon"><PackageOpen /></EmptyMedia>
              <EmptyTitle>{{ t('servers.workspace.mods.empty') }}</EmptyTitle>
            </EmptyHeader>
            <EmptyContent><UiButton variant="outline" @click="openModManagement">{{ t('servers.workspace.mods.manage') }}</UiButton></EmptyContent>
          </Empty>
        </div>
      </ScrollArea>
      <DialogFooter class="room-mod-footer">
        <UiButton type="button" variant="outline" :disabled="busy || !roomId" @click="checkUpdates">
          <Spinner v-if="checking" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          {{ t(checking ? 'servers.workspace.mods.checking' : 'servers.workspace.mods.check') }}
        </UiButton>
        <UiButton type="button" variant="outline" @click="openModManagement">
          <Settings2 data-icon="inline-start" />
          {{ t('servers.workspace.mods.manage') }}
        </UiButton>
        <UiButton
          v-if="updateCount || activeUpdateJob"
          type="button"
          :disabled="busy && !activeUpdateJob"
          @click="activeUpdateJob ? viewUpdateProgress() : confirmApplyUpdates()"
        >
          <Spinner v-if="applying" data-icon="inline-start" />
          <RotateCw v-else data-icon="inline-start" />
          {{ t(activeUpdateJob ? 'globalJobs.viewProgress' : applying ? 'servers.workspace.mods.updating' : 'servers.workspace.mods.updateAndRestart') }}
        </UiButton>
      </DialogFooter>

    </DialogContent>
  </UiDialog>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import modApi from '@/api/modApi'
import { waitForV2Job } from '@/api/v2ConfigurationAdapters'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { confirmRoomMaintenance } from '@/lib/maintenanceConfirmation'
import { emitGlobalJobSubmitted } from '@/lib/globalJobs.mjs'
import { useSharedJobStatus } from '@/composables/useGlobalJobStatus'
import { taskProgress } from '@/lib/taskProgress.mjs'
import { modThumbnailUrl } from '@/lib/modImages.mjs'
import { enrichModMetadata } from '@/lib/modMetadata.mjs'
import { buildRoomModOverview, retainRoomModPresentation, roomModAttentionCount, roomModPrepareCount, roomModUpdateErrorKey, roomModFileStatusLabel, roomModStatusVariant as statusVariant } from '@/lib/roomModOverview.mjs'
import { CircleAlert, Info, Package, PackageOpen, RefreshCw, RotateCw, Settings2 } from '@lucide/vue'
import { toast } from 'vue-sonner'

const props = defineProps({
  roomId: { type: String, required: true },
  roomName: { type: String, default: '' },
  worldCount: { type: Number, default: 0 },
  runtimeTargets: { type: Array, default: () => [] },
  onlinePlayers: { type: Number, default: 0 }
})

const emit = defineEmits(['updated'])
const { t, locale } = useI18n()
const router = useRouter()
const jobStatus = useSharedJobStatus()
const activeUpdateJob = computed(() => jobStatus?.activeJobs.value.find(job => job.kind === 'mod.update.activate' && job.roomId === props.roomId))
watch(() => [props.roomId, props.roomName], ([id, name]) => jobStatus?.rememberRoomLabel(id, name), { immediate: true })
function viewUpdateProgress() {
  dialogOpen.value = false
  jobStatus?.showJobProgress(activeUpdateJob.value?.id)
}
const mods = ref([])
const updateOverview = ref(null)
const loading = ref(false)
const factsLoaded = ref(false)
const checking = ref(false)
const applying = ref(false)
const dialogOpen = ref(false)
const dialogTitle = ref(null)
function focusDetails(event) {
  event.preventDefault()
  dialogTitle.value?.$el?.focus()
}
const loadError = ref('')
const metadataWarning = ref('')
const incompleteMetadataIds = ref([])
const metadataLoading = ref(false)
let metadataSequence = 0
let metadataLoadedSequence = -1
const updateStateUnavailable = ref(false)
const brokenImages = ref(new Set())
let loadSequence = 0

const rows = computed(() => buildRoomModOverview(mods.value, updateOverview.value))
const updateCount = computed(() => rows.value.filter(mod => mod.updateAvailable).length)
const attentionCount = computed(() => roomModAttentionCount(rows.value))
const prepareCount = computed(() => roomModPrepareCount(rows.value))
const updateKnown = computed(() => Boolean(updateOverview.value?.state?.lastCheckedAt))
const updateErrorDetail = computed(() => updateOverview.value?.state?.errorMessage || '')
const updateActionFailed = computed(() => ['MOD_RUNTIME_UPDATE_FAILED', 'MOD_WORLD_RESTART_FAILED'].includes(updateOverview.value?.state?.errorCode))
const updateFileProblem = computed(() => roomModUpdateErrorKey(updateOverview.value?.state) === 'mods.autoUpdate.errors.localFilesUnavailable')
const updateError = computed(() => {
  if (updateStateUnavailable.value) return t('servers.workspace.mods.updateUnavailableDescription')
  const key = roomModUpdateErrorKey(updateOverview.value?.state)
  return key ? t(key) : ''
})
const busy = computed(() => loading.value || checking.value || applying.value || Boolean(activeUpdateJob.value))
const triggerStatus = computed(() => {
  if (activeUpdateJob.value || applying.value) return { variant: 'secondary', label: t('servers.workspace.mods.updating') }
  if (checking.value) return { variant: 'secondary', label: t('servers.workspace.mods.checking') }
  if (loadError.value || updateActionFailed.value) return { variant: 'destructive', label: t('servers.workspace.mods.needsAttention') }
  if (attentionCount.value) return { variant: 'destructive', label: t('servers.workspace.mods.attentionCount', { count: attentionCount.value }) }
  if (prepareCount.value) return { variant: 'warning', label: t('servers.workspace.mods.prepareCount', { count: prepareCount.value }) }
  if (updateCount.value) return { variant: 'warning', label: t('servers.workspace.mods.updateCount', { count: updateCount.value }) }
  if (updateError.value) return { variant: 'warning', label: t('servers.workspace.mods.statusUnavailable') }
  return null
})
const lastCheckedLabel = computed(() => formatDateTime(updateOverview.value?.state?.lastCheckedAt))
const overviewDescription = computed(() => {
  if (!rows.value.length && loading.value) return t('servers.workspace.mods.loading')
  if (!rows.value.length && loadError.value) return t('servers.workspace.mods.loadFailed')
  if (!rows.value.length) return t('servers.workspace.mods.emptyDescription')
  if (updateCount.value) return t('servers.workspace.mods.updateDescription', { count: updateCount.value })
  if (attentionCount.value) return t('servers.workspace.mods.attentionDescription', { count: attentionCount.value })
  if (prepareCount.value) return t('servers.workspace.mods.prepareDescription', { count: prepareCount.value })
  if (updateError.value) return t('servers.workspace.mods.updateUnavailableDescription')
  if (updateKnown.value) return t('servers.workspace.mods.checkedAt', { time: lastCheckedLabel.value })
  return t('servers.workspace.mods.notChecked')
})
const dialogDescription = computed(() => t('servers.workspace.mods.dialogDescription', {
  count: rows.value.length,
  worlds: props.worldCount
}))

watch(() => props.roomId, () => {
  dialogOpen.value = false
  updateOverview.value = null
  mods.value = []
  factsLoaded.value = false
  loading.value = false
  metadataWarning.value = ''
  incompleteMetadataIds.value = []
  brokenImages.value = new Set()
  updateStateUnavailable.value = false
  void refresh()
}, { immediate: true })

watch(dialogOpen, open => {
  if (open && !loading.value && metadataLoadedSequence !== loadSequence) {
    void loadMetadata(props.roomId, loadSequence)
  }
})

// Use the existing task stream once at the download/restart boundary. World
// log updates within that phase do not need another Mod read.
watch([
  () => props.roomId,
  () => activeUpdateJob.value?.id,
  () => activeUpdateJob.value ? taskProgress(activeUpdateJob.value).phase : ''
], ([roomId, jobId, phase], [previousRoomId, previousJobId]) => {
  if (roomId !== previousRoomId) return
  if (phase === 'restarting' || (!jobId && previousJobId && !applying.value)) {
    void refresh({ silent: true })
  }
})

onBeforeUnmount(() => { loadSequence += 1 })

async function refresh({ silent = false } = {}) {
  const roomId = props.roomId
  if (!roomId) return
  const sequence = ++loadSequence
  metadataSequence += 1
  metadataLoading.value = false
  metadataLoadedSequence = -1
  if (!silent || !factsLoaded.value) loading.value = true
  loadError.value = ''
  const updatesCompletion = modApi.getModUpdateOverview(roomId).then(
    overview => {
      if (sequence !== loadSequence || roomId !== props.roomId) return
      updateOverview.value = overview || null
      updateStateUnavailable.value = false
    },
    () => {
      if (sequence !== loadSequence || roomId !== props.roomId) return
      updateStateUnavailable.value = true
    }
  )
  try {
    const items = await modApi.getRoomModFacts({ roomId })
    if (sequence !== loadSequence || roomId !== props.roomId) return
    mods.value = retainRoomModPresentation(items || [], mods.value)
    factsLoaded.value = true
    if (!mods.value.length) {
      metadataWarning.value = ''
      incompleteMetadataIds.value = []
    }
    if (dialogOpen.value) void loadMetadata(roomId, sequence)
  } catch (error) {
    if (sequence !== loadSequence || roomId !== props.roomId) return
    loadError.value = error?.message || t('common.errors.unknown')
  } finally {
    if (sequence === loadSequence && roomId === props.roomId) loading.value = false
  }
  await updatesCompletion
}

async function loadMetadata(roomId, sequence, items = mods.value, retry = false) {
  if (!dialogOpen.value || !items.length || metadataLoading.value) return
  const request = ++metadataSequence
  metadataLoading.value = true
  try {
    const result = await modApi.getModMetadata(items)
    if (sequence !== loadSequence || roomId !== props.roomId || request !== metadataSequence) return
    mods.value = enrichModMetadata(mods.value, result.metadata)
    metadataLoadedSequence = sequence
    metadataWarning.value = result.warning
    incompleteMetadataIds.value = result.incompleteModIds || []
    if (retry) {
      if (incompleteMetadataIds.value.length) toast.info(t('mods.metadata.retryIncomplete', { count: incompleteMetadataIds.value.length }))
      else toast.success(t('mods.metadata.retryCompleted'))
    }
  } catch (error) {
    if (sequence !== loadSequence || roomId !== props.roomId || request !== metadataSequence) return
    incompleteMetadataIds.value = items.map(item => String(item.modid || item.id))
    metadataWarning.value = error?.message || t('common.errors.unknown')
    if (retry) toast.info(t('mods.metadata.retryIncomplete', { count: incompleteMetadataIds.value.length }))
  } finally {
    if (request === metadataSequence) metadataLoading.value = false
  }
}

async function retryMetadata() {
  if (metadataLoading.value || !props.roomId) return
  const ids = new Set(incompleteMetadataIds.value)
  await loadMetadata(props.roomId, loadSequence, mods.value.filter(item => ids.has(String(item.modid || item.id))), true)
}

async function checkUpdates() {
  if (!props.roomId || busy.value) return
  checking.value = true
  try {
    const job = await modApi.checkModUpdatesNow(props.roomId)
    emitGlobalJobSubmitted(job)
    await waitForV2Job(job, 10 * 60 * 1000)
    await refresh({ silent: true })
    toast.success(t('servers.workspace.mods.checkCompleted'))
  } catch (error) {
    toast.error(t(roomModUpdateErrorKey({ errorCode: 'MOD_UPDATE_CHECK_FAILED', errorMessage: error?.message || 'check failed' })))
    await refresh({ silent: true })
  } finally {
    checking.value = false
  }
}

async function confirmApplyUpdates() {
  if (activeUpdateJob.value) return viewUpdateProgress()
  if (!props.roomId || !updateCount.value || busy.value) return
  try {
    await confirmRoomMaintenance(
      props.roomId,
      t('servers.workspace.mods.confirmDescription', {
        count: updateCount.value,
        worlds: props.worldCount,
        players: props.onlinePlayers
      }),
      t('servers.workspace.mods.confirmTitle'),
      {
        confirmButtonText: t('servers.workspace.mods.confirmAction'),
        cancelButtonText: t('common.actions.cancel'),
        type: 'warning',
        allowImmediate: false,
      }
    )
  } catch {
    return
  }
  await applyUpdates()
}

async function applyUpdates() {
  const roomId = props.roomId
  applying.value = true
  try {
    const job = await modApi.applyModUpdatesNow(roomId)
    emitGlobalJobSubmitted(job)
    await (jobStatus?.waitForJob || waitForV2Job)(job, 20 * 60 * 1000)
    if (roomId !== props.roomId) return
    await refresh({ silent: true })
    emit('updated')
    toast.success(t('servers.workspace.mods.updateCompleted'))
  } catch (error) {
    if (roomId !== props.roomId) return
    await refresh({ silent: true })
    toast.error(t('servers.workspace.mods.updateFailed', { error: error?.message || t('common.errors.unknown') }))
  } finally {
    applying.value = false
  }
}

function markImageBroken(id) {
  brokenImages.value = new Set([...brokenImages.value, id])
}

function statusLabel(status, mod = null) {
  if (['pending', 'corrupt', 'unavailable'].includes(status)) {
    const label = roomModFileStatusLabel(mod, props.runtimeTargets, t)
    if (label) return label
  }
  const known = [
    'ready', 'pending', 'unavailable', 'corrupt', 'enabled', 'disabled'
  ]
  if (status === 'ready' && Number(mod?.runtimeTotalTargets) > 1) {
    return t('servers.workspace.mods.status.ready_targets', {
      ready: mod.runtimeReadyTargets,
      total: mod.runtimeTotalTargets
    })
  }
  if (status === 'pending') {
    return t('servers.workspace.mods.status.pending_targets', { count: mod?.runtimePendingTargets || 1 })
  }
  if (status === 'unavailable') {
    if (!Number(mod?.runtimeTotalTargets)) return t('servers.workspace.mods.status.no_target')
    return t('servers.workspace.mods.status.unavailable_targets', { count: mod?.runtimeUnavailableTargets || 1 })
  }
  return t(`servers.workspace.mods.status.${known.includes(status) ? status : 'unknown'}`)
}

function modMeta(mod) {
  const current = String(mod.currentVersion || mod.runtimeVersion || '').trim()
  const latest = String(mod.latestVersion || '').trim()
  if (mod.runtimeVersionStatus === 'mixed') {
    return t('servers.workspace.mods.versions.mixed', { latest: latest || '--' })
  }
  if (mod.runtimeVersionStatus === 'unknown') {
    return t('servers.workspace.mods.versions.unknown', { latest: latest || '--' })
  }
  if (current && latest && current !== latest) {
    return t('servers.workspace.mods.versions.transition', { current, latest })
  }
  if (current) return t('servers.workspace.mods.versions.current', { version: current })
  if (latest) return t('servers.workspace.mods.versions.latest', { version: latest })
  if (mod.version) return t('servers.workspace.mods.version', { version: mod.version })
  return `Workshop ${mod.id}`
}

function modDetailMeta(mod) {
  const factKey = {
    enabled: 'enabled',
    ready: 'ready',
    pending: 'pending',
    unavailable: 'unavailable',
    disabled: 'disabled'
  }[mod.status]
  return factKey
    ? `${modMeta(mod)} · ${t(`servers.workspace.mods.facts.${factKey}`)}`
    : modMeta(mod)
}

function formatDateTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '--'
  return new Intl.DateTimeFormat(locale.value, {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).format(date)
}

function openModManagement() {
  dialogOpen.value = false
  router.push({ path: '/mods', query: { tab: 'room', roomId: props.roomId } })
}

defineExpose({ refresh })
</script>

<style scoped>
.room-mod-trigger {
  max-width: 100%;
}

.room-mod-dialog-summary,
.room-mod-badges {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.room-mod-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.room-mod-scroll {
  height: min(56dvh, 480px);
  min-height: 0;
  flex: 1 1 auto;
  margin-right: -8px;
  padding-right: 8px;
}

.room-mod-dialog-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 64px;
  align-items: center;
  gap: 9px;
  padding: 8px 2px;
  border-bottom: 1px solid var(--border);
}

.room-mod-image {
  display: grid;
  width: 40px;
  height: 40px;
  overflow: hidden;
  place-items: center;
  color: var(--muted-foreground);
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.room-mod-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.room-mod-image > svg {
  width: 18px;
  height: 18px;
}

.room-mod-copy {
  min-width: 0;
}

.room-mod-copy strong,
.room-mod-copy span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-mod-copy span {
  margin-top: 3px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.room-mod-footer {
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .room-mod-scroll {
    height: auto;
  }

  .room-mod-dialog-row {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .room-mod-dialog-row > .room-mod-badges {
    grid-column: 2;
  }
}
</style>

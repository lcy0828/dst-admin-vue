<template>
  <Card size="sm" class="room-mod-overview">
    <CardHeader class="room-mod-header">
      <div class="min-w-0">
        <div class="room-mod-title-row">
          <CardTitle class="room-mod-title">
            <PackageOpen aria-hidden="true" />
            {{ t('servers.workspace.mods.title') }}
          </CardTitle>
          <Badge v-if="rows.length || (!loading && !loadError)" variant="outline">{{ t('servers.workspace.mods.count', { count: rows.length }) }}</Badge>
          <Badge v-if="updateCount" variant="warning">
            {{ t('servers.workspace.mods.updateCount', { count: updateCount }) }}
          </Badge>
          <Badge v-else-if="rows.length && updateKnown && !updateError" variant="success">
            {{ t('servers.workspace.mods.current') }}
          </Badge>
        </div>
        <CardDescription>{{ overviewDescription }}</CardDescription>
      </div>
      <CardAction class="room-mod-actions">
        <UiButton v-if="prepareCount || attentionCount" type="button" size="sm" variant="outline" @click="openModManagement">
          <Settings2 data-icon="inline-start" />{{ t('servers.workspace.mods.manage') }}
        </UiButton>
        <UiButton
          v-if="rows.length"
          type="button"
          size="sm"
          variant="ghost"
          @click="dialogOpen = true"
        >
          {{ t('servers.workspace.mods.viewAll') }}
          <ArrowRight data-icon="inline-end" />
        </UiButton>
        <UiButton
          type="button"
          size="icon-sm"
          variant="outline"
          :disabled="busy || !roomId"
          :aria-label="t(checking ? 'servers.workspace.mods.checking' : 'servers.workspace.mods.check')"
          :title="t(checking ? 'servers.workspace.mods.checking' : 'servers.workspace.mods.check')"
          @click="checkUpdates"
        >
          <Spinner v-if="checking" />
          <RefreshCw v-else />
        </UiButton>
        <UiButton
          v-if="updateCount || activeUpdateJob"
          type="button"
          size="sm"
          :disabled="busy && !activeUpdateJob"
          @click="activeUpdateJob ? viewUpdateProgress() : confirmApplyUpdates()"
        >
          <Spinner v-if="applying" data-icon="inline-start" />
          <RotateCw v-else data-icon="inline-start" />
          {{ t(activeUpdateJob ? 'globalJobs.viewProgress' : applying ? 'servers.workspace.mods.updating' : 'servers.workspace.mods.updateAndRestart') }}
        </UiButton>
      </CardAction>
    </CardHeader>

    <CardContent class="room-mod-content">
      <div v-if="loading" class="room-mod-grid" role="status" :aria-label="t('servers.workspace.mods.loading')">
        <div v-for="index in 4" :key="index" class="room-mod-row">
          <Skeleton class="room-mod-image" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton class="h-3.5 w-32 max-w-full" />
            <Skeleton class="h-3 w-20" />
          </div>
          <Skeleton class="h-5 w-16" />
        </div>
      </div>
      <Alert v-else-if="loadError && !rows.length" variant="destructive">
        <CircleAlert />
        <AlertTitle>{{ t('servers.workspace.mods.loadFailed') }}</AlertTitle>
        <AlertDescription>{{ loadError }}</AlertDescription>
      </Alert>
      <div v-else-if="visibleRows.length" class="room-mod-grid">
        <article v-for="mod in visibleRows" :key="mod.id" class="room-mod-row">
          <div class="room-mod-image">
            <Package v-if="!mod.image || brokenImages.has(mod.id)" aria-hidden="true" />
            <img
              v-else
              :src="modThumbnailUrl(mod.image, 68)"
              :alt="mod.name"
              loading="lazy"
              @error="markImageBroken(mod.id)"
            />
          </div>
          <div class="room-mod-copy">
            <strong :title="mod.name">{{ mod.name }}</strong>
            <span>{{ modMeta(mod) }}</span>
          </div>
          <div class="room-mod-badges">
            <Badge :variant="statusVariant(mod.status)">{{ statusLabel(mod.status, mod) }}</Badge>
            <Badge v-if="mod.updateAvailable" variant="warning">{{ t('servers.workspace.mods.status.update_available') }}</Badge>
          </div>
        </article>
      </div>
      <div v-else class="room-mod-empty">
        <PackageOpen aria-hidden="true" />
        <span>{{ t('servers.workspace.mods.empty') }}</span>
      </div>
      <p v-if="loadError && rows.length" class="room-mod-inline-error">
        <CircleAlert aria-hidden="true" />{{ loadError }}
      </p>
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
    </CardContent>

    <UiDialog v-model:open="dialogOpen">
      <DialogContent class="room-mod-dialog">
        <DialogHeader>
          <DialogTitle>{{ t('servers.workspace.mods.dialogTitle', { room: roomName }) }}</DialogTitle>
          <DialogDescription>{{ dialogDescription }}</DialogDescription>
        </DialogHeader>
        <div class="room-mod-dialog-summary">
          <Badge variant="outline">{{ t('servers.workspace.mods.count', { count: rows.length }) }}</Badge>
          <Badge v-if="updateCount" variant="warning">{{ t('servers.workspace.mods.updateCount', { count: updateCount }) }}</Badge>
          <Badge v-if="attentionCount" variant="destructive">{{ t('servers.workspace.mods.attentionCount', { count: attentionCount }) }}</Badge>
          <Badge v-else-if="prepareCount" variant="secondary">{{ t('servers.workspace.mods.prepareCount', { count: prepareCount }) }}</Badge>
        </div>
        <ScrollArea class="room-mod-scroll">
          <div class="room-mod-list">
            <article v-for="mod in rows" :key="mod.id" class="room-mod-dialog-row">
              <div class="room-mod-image is-dialog">
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
        </ScrollArea>
        <DialogFooter>
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
  </Card>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import modApi from '@/api/modApi'
import { waitForV2Job } from '@/api/v2ConfigurationAdapters'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { confirmRoomMaintenance } from '@/lib/maintenanceConfirmation'
import { emitGlobalJobSubmitted } from '@/lib/globalJobs.mjs'
import { useSharedJobStatus } from '@/composables/useGlobalJobStatus'
import { taskProgress } from '@/lib/taskProgress.mjs'
import { modThumbnailUrl } from '@/lib/modImages.mjs'
import { enrichModMetadata } from '@/lib/modMetadata.mjs'
import { buildRoomModOverview, roomModAttentionCount, roomModPrepareCount, roomModUpdateErrorKey, roomModFileStatusLabel, roomModStatusVariant as statusVariant } from '@/lib/roomModOverview.mjs'
import { ArrowRight, CircleAlert, Info, Package, PackageOpen, RefreshCw, RotateCw, Settings2 } from '@lucide/vue'
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
const checking = ref(false)
const applying = ref(false)
const dialogOpen = ref(false)
const loadError = ref('')
const metadataWarning = ref('')
const incompleteMetadataIds = ref([])
const metadataLoading = ref(false)
let metadataSequence = 0
const updateStateUnavailable = ref(false)
const brokenImages = ref(new Set())
let loadSequence = 0

const rows = computed(() => buildRoomModOverview(mods.value, updateOverview.value))
const visibleRows = computed(() => rows.value.slice(0, 4))
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
  brokenImages.value = new Set()
  updateStateUnavailable.value = false
  void refresh()
}, { immediate: true })

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
  if (!silent || !mods.value.length) loading.value = true
  loadError.value = ''
  metadataWarning.value = ''
  incompleteMetadataIds.value = []
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
    mods.value = items || []
    void loadMetadata(roomId, sequence)
  } catch (error) {
    if (sequence !== loadSequence || roomId !== props.roomId) return
    loadError.value = error?.message || t('common.errors.unknown')
  } finally {
    if (sequence === loadSequence && roomId === props.roomId) loading.value = false
  }
  await updatesCompletion
}

async function loadMetadata(roomId, sequence, items = mods.value, retry = false) {
  if (!items.length) return
  const request = ++metadataSequence
  metadataLoading.value = true
  try {
    const result = await modApi.getModMetadata(items)
    if (sequence !== loadSequence || roomId !== props.roomId || request !== metadataSequence) return
    mods.value = enrichModMetadata(mods.value, result.metadata)
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
.room-mod-header {
  align-items: center;
}

.room-mod-title-row,
.room-mod-title,
.room-mod-actions,
.room-mod-badges,
.room-mod-dialog-summary {
  display: flex;
  align-items: center;
}

.room-mod-title-row {
  min-width: 0;
  flex-wrap: wrap;
  gap: 6px;
}

.room-mod-title {
  gap: 7px;
}

.room-mod-title > svg {
  width: 16px;
  height: 16px;
  color: var(--muted-foreground);
}

.room-mod-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.room-mod-badges {
  min-width: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.room-mod-content {
  padding-top: 0;
}

.room-mod-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--border);
}

.room-mod-row,
.room-mod-dialog-row {
  display: grid;
  min-width: 0;
  align-items: center;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  gap: 9px;
}

.room-mod-row {
  min-height: 54px;
  padding: 8px 10px 8px 0;
  border-bottom: 1px solid var(--border);
}

.room-mod-row:nth-child(odd) {
  padding-right: 14px;
  border-right: 1px solid var(--border);
}

.room-mod-row:nth-child(even) {
  padding-left: 14px;
}

.room-mod-image {
  display: grid;
  width: 36px;
  height: 36px;
  overflow: hidden;
  place-items: center;
  color: var(--muted-foreground);
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 4px;
}

.room-mod-image.is-dialog {
  width: 40px;
  height: 40px;
}

.room-mod-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.room-mod-image > svg {
  width: 17px;
  height: 17px;
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

.room-mod-copy strong {
  color: var(--foreground);
  font-size: 13px;
  line-height: 18px;
}

.room-mod-copy span {
  margin-top: 1px;
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 16px;
}

.room-mod-empty {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--muted-foreground);
  border-top: 1px solid var(--border);
}

.room-mod-empty > svg {
  width: 17px;
  height: 17px;
}

.room-mod-inline-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0 0;
  color: var(--destructive);
  font-size: 12px;
}

.room-mod-inline-error > svg {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}

.room-mod-dialog {
  width: min(720px, calc(100vw - 32px));
  max-width: 720px;
  overflow: hidden;
}

.room-mod-dialog-summary {
  flex-wrap: wrap;
  gap: 6px;
}

.room-mod-scroll {
  height: min(58vh, 520px);
  min-height: 220px;
  margin-right: -8px;
  padding-right: 8px;
}

.room-mod-list {
  border-top: 1px solid var(--border);
}

.room-mod-dialog-row {
  min-height: 58px;
  padding: 8px 2px;
  border-bottom: 1px solid var(--border);
}

@media (max-width: 760px) {
  .room-mod-header {
    grid-template-columns: minmax(0, 1fr);
  }

  .room-mod-actions {
    grid-column: 1;
    grid-row: auto;
    justify-self: stretch;
    justify-content: flex-start;
    margin-top: 4px;
  }

  .room-mod-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .room-mod-row:nth-child(odd),
  .room-mod-row:nth-child(even) {
    padding-right: 0;
    padding-left: 0;
    border-right: 0;
  }
}

@media (max-width: 480px) {
  .room-mod-dialog-row {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .room-mod-dialog-row > .room-mod-badges {
    grid-column: 2;
    justify-content: flex-start;
  }
}
</style>

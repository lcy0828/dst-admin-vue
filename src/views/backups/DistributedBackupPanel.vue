<template>
  <section class="flex min-w-0 flex-col gap-4" aria-labelledby="backup-catalog-title">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h2 id="backup-catalog-title" class="text-base font-semibold">{{ t(categoryMessage('title')) }}</h2>
        <p class="mt-0.5 text-sm text-muted-foreground">{{ t(categoryMessage('description')) }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UiButton v-if="!isSystemCategory" :disabled="!selectedRoomId || loading || operationRunning" @click="openCreateDialog">
          <DatabaseBackup data-icon="inline-start" />
          {{ t('backups.actions.create') }}
        </UiButton>
        <UiButton variant="outline" :disabled="!selectedRoomId || loading" @click="loadSets">
          <Spinner v-if="loading" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          {{ t('common.actions.refresh') }}
        </UiButton>
      </div>
    </div>

    <RoomScopeSelect v-model="selectedRoomId" :rooms="rooms" :loading="loadingRooms" :disabled="operationRunning" />

    <Alert v-if="error" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('distributed.backups.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <Alert v-if="partialLoadError">
      <CircleAlert />
      <AlertTitle>{{ t('backups.catalog.partialLoadTitle') }}</AlertTitle>
      <AlertDescription>{{ partialLoadError }}</AlertDescription>
    </Alert>

    <Alert v-if="operationsError">
      <CircleAlert />
      <AlertTitle>{{ t('distributed.backups.operationsLoadFailed') }}</AlertTitle>
      <AlertDescription>{{ operationsError }}</AlertDescription>
    </Alert>

    <Alert v-if="recoveryOperations.length" variant="destructive">
      <TriangleAlert />
      <AlertTitle>{{ t('distributed.backups.recoveryRequiredTitle', { count: recoveryOperations.length }) }}</AlertTitle>
      <AlertDescription>{{ t('distributed.backups.recoveryRequiredDescription') }}</AlertDescription>
    </Alert>

    <div v-if="loading && visibleBackupItems.length === 0" class="flex flex-col gap-2" :aria-label="t('distributed.backups.loading')">
      <Skeleton v-for="index in 4" :key="index" class="h-12 w-full" />
    </div>

    <Empty v-else-if="!loading && visibleBackupItems.length === 0">
      <EmptyHeader>
        <EmptyMedia variant="icon"><ShieldCheck v-if="isSystemCategory" /><DatabaseBackup v-else /></EmptyMedia>
        <EmptyTitle>{{ t(categoryMessage('emptyTitle')) }}</EmptyTitle>
        <EmptyDescription>{{ t(categoryMessage('emptyDescription')) }}</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <div v-else class="overflow-x-auto rounded-lg border">
      <UiTable class="min-w-[1040px]">
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('distributed.backups.columns.name') }}</TableHead>
            <TableHead>{{ t('backups.catalog.columns.source') }}</TableHead>
            <TableHead>{{ t('distributed.backups.columns.status') }}</TableHead>
            <TableHead>{{ t('backups.catalog.columns.worlds') }}</TableHead>
            <TableHead>{{ t('distributed.backups.columns.size') }}</TableHead>
            <TableHead>{{ t('distributed.backups.columns.createdAt') }}</TableHead>
            <TableHead class="text-right">{{ t('common.fields.actions') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="backupSet in visibleBackupItems" :key="`${backupSet.source}-${backupSet.id}`">
            <TableCell>
              <div class="flex min-w-56 flex-col gap-1">
                <span class="font-medium">{{ backupSet.name }}</span>
                <span class="text-xs text-muted-foreground">{{ backupSet.source === 'legacy' ? t('backups.catalog.historyRecord') : t('backups.catalog.completeRoom') }}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{{ backupSourceLabel(backupSet.kind) }}</Badge>
            </TableCell>
            <TableCell>
              <div class="flex min-w-32 flex-col items-start gap-1">
                <Badge :variant="setStatusVariant(backupSet.status)">{{ setStatusLabel(backupSet.status) }}</Badge>
                <Badge v-if="backupSet.source !== 'legacy'" :variant="backupSet.restorable ? 'secondary' : 'destructive'">{{ contentKindLabel(backupSet) }}</Badge>
                <Badge v-if="backupSet.source !== 'legacy' && latestOperation(backupSet.id)" :variant="operationStatusVariant(latestOperation(backupSet.id).status)">
                  {{ operationStatusLabel(latestOperation(backupSet.id).status) }}
                </Badge>
                <span v-if="backupSet.failure" class="text-xs text-destructive">{{ backupSet.failure }}</span>
                <span v-if="backupSet.validationError" class="max-w-64 text-xs text-destructive">{{ backupSet.validationError }}</span>
                <span v-if="latestOperation(backupSet.id)?.failure" class="max-w-64 text-xs text-destructive">{{ latestOperation(backupSet.id).failure }}</span>
                <UiButton v-if="latestOperation(backupSet.id)?.status === 'recovery_required'" size="xs" variant="outline" :disabled="operationRunning" @click="recoverOperation(latestOperation(backupSet.id))">
                  <Spinner v-if="recoveringOperationId === latestOperation(backupSet.id).id" data-icon="inline-start" />
                  <History v-else data-icon="inline-start" />
                  {{ t('distributed.backups.retryRecovery') }}
                </UiButton>
              </div>
            </TableCell>
            <TableCell>{{ backupSet.source === 'legacy' ? t('backups.catalog.completeRoom') : t('backups.catalog.worldCount', { verified: verifiedParts(backupSet), total: backupSet.parts?.length || 0 }) }}</TableCell>
            <TableCell>{{ formatBytes(backupSet.size) }}</TableCell>
            <TableCell class="min-w-44 text-xs text-muted-foreground">{{ formatTime(backupSet.createdAt) }}</TableCell>
            <TableCell>
              <div class="flex justify-end gap-1">
                <UiButton v-if="backupSet.source !== 'legacy'" size="sm" variant="outline" @click="openDetails(backupSet)">
                  <Eye data-icon="inline-start" />
                  {{ t('distributed.backups.details') }}
                </UiButton>
                <UiButton size="sm" :disabled="backupSet.status !== 'verified' || !backupSet.restorable || operationRunning" :title="!backupSet.restorable ? t('distributed.backups.notRestorable') : undefined" @click="openRestoreDialog(backupSet)">
                  <History data-icon="inline-start" />
                  {{ t('distributed.backups.restore') }}
                </UiButton>
                <UiButton v-if="backupSet.source === 'legacy'" size="icon-sm" variant="outline" :title="t('backups.actions.download')" :disabled="downloadingBackupId === backupSet.id" @click="downloadLegacyBackup(backupSet)">
                  <Spinner v-if="downloadingBackupId === backupSet.id" data-icon="inline-start" />
                  <Download v-else data-icon="inline-start" />
                  <span class="sr-only">{{ t('backups.actions.download') }}</span>
                </UiButton>
                <UiButton v-if="backupSet.source === 'legacy'" size="icon-sm" variant="destructive" :title="t('backups.actions.delete')" :disabled="operationRunning" @click="deleteLegacyBackup(backupSet)">
                  <Trash2 data-icon="inline-start" />
                  <span class="sr-only">{{ t('backups.actions.delete') }}</span>
                </UiButton>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </UiTable>
    </div>

    <Dialog v-model:open="createDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('distributed.backups.createDialog.title') }}</DialogTitle>
          <DialogDescription>{{ t('distributed.backups.createDialog.description') }}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>{{ t('distributed.backups.createDialog.mode') }}</FieldLabel>
            <ToggleGroup type="single" :model-value="backupMode" variant="outline" class="grid w-full grid-cols-1 sm:grid-cols-2" @update:model-value="setBackupMode">
              <ToggleGroupItem value="hot-consistent" class="w-full">
                <Flame data-icon="inline-start" />
                {{ t('distributed.backups.createDialog.modeOptions.hot') }}
              </ToggleGroupItem>
              <ToggleGroupItem value="cold-consistent" class="w-full">
                <Snowflake data-icon="inline-start" />
                {{ t('distributed.backups.createDialog.modeOptions.cold') }}
              </ToggleGroupItem>
            </ToggleGroup>
            <FieldDescription>{{ t(`distributed.backups.createDialog.modeDescriptions.${backupModeKey}`) }}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel for="distributed-backup-name">{{ t('distributed.backups.createDialog.name') }}</FieldLabel>
            <UiInput id="distributed-backup-name" v-model="backupName" maxlength="128" :placeholder="t('distributed.backups.createDialog.namePlaceholder')" />
            <FieldDescription>{{ t('distributed.backups.createDialog.nameDescription') }}</FieldDescription>
          </Field>
        </FieldGroup>
        <Alert>
          <TriangleAlert v-if="backupMode === 'cold-consistent'" />
          <Flame v-else />
          <AlertTitle>{{ t(`distributed.backups.createDialog.requirementTitles.${backupModeKey}`) }}</AlertTitle>
          <AlertDescription>{{ t(`distributed.backups.createDialog.requirementDescriptions.${backupModeKey}`) }}</AlertDescription>
        </Alert>
        <DialogFooter>
          <UiButton variant="outline" :disabled="operationRunning" @click="createDialogOpen = false">{{ t('common.actions.cancel') }}</UiButton>
          <UiButton :disabled="operationRunning" @click="createSet">
            <Spinner v-if="operationRunning" data-icon="inline-start" />
            {{ t(`distributed.backups.createDialog.confirm.${backupModeKey}`) }}
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="detailsDialogOpen">
      <DialogScrollContent class="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{{ selectedSet?.name || t('distributed.backups.detailsDialog.title') }}</DialogTitle>
          <DialogDescription>{{ t('distributed.backups.detailsDialog.description') }}</DialogDescription>
        </DialogHeader>
        <div v-if="detailsLoading" class="flex flex-col gap-2">
          <Skeleton v-for="index in 4" :key="index" class="h-12 w-full" />
        </div>
        <template v-else-if="selectedSet">
          <Alert v-if="!selectedSet.restorable" variant="destructive">
            <TriangleAlert />
            <AlertTitle>{{ t('distributed.backups.notRestorableTitle') }}</AlertTitle>
            <AlertDescription>{{ selectedSet.validationError || t('distributed.backups.notRestorable') }}</AlertDescription>
          </Alert>
          <Alert v-if="selectedOperation" :variant="selectedOperation.status === 'recovery_required' || selectedOperation.status === 'failed' ? 'destructive' : 'default'">
            <History />
            <AlertTitle>{{ t('distributed.backups.operationSummary', { kind: operationKindLabel(selectedOperation.kind), status: operationStatusLabel(selectedOperation.status) }) }}</AlertTitle>
            <AlertDescription>{{ selectedOperation.failure || t('distributed.backups.operationUpdatedAt', { time: formatTime(selectedOperation.updatedAt) }) }}</AlertDescription>
          </Alert>
          <dl class="grid gap-3 text-sm sm:grid-cols-3">
            <div><dt class="text-muted-foreground">{{ t('distributed.backups.columns.mode') }}</dt><dd class="mt-1 font-medium">{{ backupModeLabel(selectedSet.mode) }}</dd></div>
            <div><dt class="text-muted-foreground">{{ t('distributed.backups.detailsDialog.manifest') }}</dt><dd class="mt-1 font-medium">v{{ selectedSet.manifestVersion }}</dd></div>
            <div><dt class="text-muted-foreground">{{ t('distributed.backups.columns.size') }}</dt><dd class="mt-1 font-medium">{{ formatBytes(selectedSet.size) }}</dd></div>
            <div><dt class="text-muted-foreground">{{ t('distributed.backups.detailsDialog.files') }}</dt><dd class="mt-1 font-medium">{{ selectedSet.fileCount }}</dd></div>
            <div><dt class="text-muted-foreground">{{ t('distributed.backups.detailsDialog.contentKind') }}</dt><dd class="mt-1"><Badge :variant="selectedSet.restorable ? 'secondary' : 'destructive'">{{ contentKindLabel(selectedSet) }}</Badge></dd></div>
            <div class="sm:col-span-3"><dt class="text-muted-foreground">{{ t('distributed.backups.detailsDialog.topologyRevision') }}</dt><dd class="mt-1 break-all font-mono text-xs">{{ selectedSet.topologyRevision }}</dd></div>
            <div v-if="selectedSet.mode === 'hot-consistent'" class="sm:col-span-2"><dt class="text-muted-foreground">{{ t('distributed.backups.detailsDialog.barrierId') }}</dt><dd class="mt-1 break-all font-mono text-xs">{{ selectedSet.barrierId || '--' }}</dd></div>
            <div v-if="selectedSet.mode === 'hot-consistent'"><dt class="text-muted-foreground">{{ t('distributed.backups.detailsDialog.snapshot') }}</dt><dd class="mt-1 font-medium tabular-nums">{{ selectedSet.snapshot ?? '--' }}</dd></div>
            <div v-if="selectedOperation"><dt class="text-muted-foreground">{{ t('distributed.backups.operationPhase') }}</dt><dd class="mt-1 font-medium">{{ operationPhaseLabel(selectedOperation.phase) }}</dd></div>
            <div v-if="selectedOperation?.protectionSetId" class="sm:col-span-2"><dt class="text-muted-foreground">{{ t('distributed.backups.protectionSet') }}</dt><dd class="mt-1 break-all font-mono text-xs">{{ selectedOperation.protectionSetId }}</dd></div>
          </dl>
          <div class="overflow-x-auto rounded-lg border">
            <UiTable class="min-w-[980px]">
              <TableHeader><TableRow><TableHead>{{ t('distributed.backups.partColumns.world') }}</TableHead><TableHead>{{ t('distributed.backups.partColumns.target') }}</TableHead><TableHead>{{ t('distributed.backups.partColumns.status') }}</TableHead><TableHead>{{ t('distributed.backups.partColumns.barrier') }}</TableHead><TableHead>{{ t('distributed.backups.columns.size') }}</TableHead><TableHead>SHA-256</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow v-for="part in selectedSet.parts || []" :key="part.id">
                  <TableCell>
                    <div class="flex min-w-56 flex-col items-start gap-1">
                      <span class="font-medium">{{ part.worldName }}</span>
                      <span class="text-xs text-muted-foreground">{{ part.shard }}</span>
                      <template v-if="part.restorable">
                        <span class="font-mono text-xs text-muted-foreground">{{ t('distributed.backups.saveEvidence.session', { value: part.sessionId }) }}</span>
                        <span class="font-mono text-xs text-muted-foreground">{{ t('distributed.backups.saveEvidence.latestSnapshot', { value: part.latestSnapshot }) }}</span>
                        <Badge variant="outline">{{ part.hasShardIndex ? t('distributed.backups.saveEvidence.shardIndexPresent') : t('distributed.backups.saveEvidence.shardIndexMissing') }}</Badge>
                      </template>
                      <span v-else class="text-xs text-destructive">{{ part.validationError || t('distributed.backups.notRestorable') }}</span>
                    </div>
                  </TableCell>
                  <TableCell>{{ part.targetId }}</TableCell>
                  <TableCell><Badge :variant="partStatusVariant(part.status)">{{ partStatusLabel(part.status) }}</Badge></TableCell>
                  <TableCell>
                    <div v-if="selectedSet.mode === 'hot-consistent'" class="flex min-w-64 flex-col gap-1 text-xs">
                      <span>{{ t('distributed.backups.detailsDialog.snapshotTransition', { before: part.snapshotBefore ?? '--', after: part.snapshotAfter ?? '--' }) }}</span>
                      <span class="font-mono text-muted-foreground">{{ part.barrierSessionId || '--' }} · {{ part.barrierInstanceId || '--' }}</span>
                      <span class="text-muted-foreground">{{ formatTime(part.barrierCompletedAt) }}</span>
                    </div>
                    <span v-else class="text-muted-foreground">--</span>
                  </TableCell>
                  <TableCell>{{ formatBytes(part.size) }}</TableCell>
                  <TableCell class="max-w-56 truncate font-mono text-xs" :title="part.sha256">{{ part.sha256 || '--' }}</TableCell>
                </TableRow>
              </TableBody>
            </UiTable>
          </div>
        </template>
        <DialogFooter><UiButton variant="outline" @click="detailsDialogOpen = false">{{ t('common.actions.close') }}</UiButton></DialogFooter>
      </DialogScrollContent>
    </Dialog>

    <Dialog v-model:open="restoreDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('distributed.backups.restoreDialog.title') }}</DialogTitle>
          <DialogDescription>{{ t('distributed.backups.restoreDialog.description') }}</DialogDescription>
        </DialogHeader>
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>{{ t('distributed.backups.restoreDialog.overwriteTitle') }}</AlertTitle>
          <AlertDescription>{{ t('distributed.backups.restoreDialog.overwriteDescription') }}</AlertDescription>
        </Alert>
        <DialogFooter>
          <UiButton variant="outline" :disabled="operationRunning" @click="restoreDialogOpen = false">{{ t('common.actions.cancel') }}</UiButton>
          <UiButton variant="destructive" :disabled="operationRunning" @click="restoreSet">
            <Spinner v-if="operationRunning" data-icon="inline-start" />
            {{ t('distributed.backups.restoreDialog.confirm') }}
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>

<script setup>
import RoomScopeSelect from '@/components/layout/RoomScopeSelect.vue'
import { preferredRoomId } from '@/lib/pageScope.mjs'
import { useRoute } from 'vue-router'
const roomRoute = useRoute()
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleAlert, DatabaseBackup, Download, Eye, Flame, History, RefreshCw, ShieldCheck, Snowflake, Trash2, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { backupsV2API, backupSetsV2API, roomsV2API } from '@/api/v2'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { confirmAction } from '@/lib/feedback'
import { waitForV2Job } from '@/api/v2ConfigurationAdapters'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input as UiInput } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const { locale, t } = useI18n()
const props = defineProps({
  category: {
    type: String,
    default: 'saves',
    validator: value => ['saves', 'system'].includes(value)
  }
})
const rooms = ref([])
const selectedRoomId = ref('')
const sets = ref([])
const legacyBackups = ref([])
const operations = ref([])
const selectedSet = ref(null)
const loadingRooms = ref(false)
const loading = ref(false)
const detailsLoading = ref(false)
const operationRunning = ref(false)
const error = ref('')
const partialLoadError = ref('')
const operationsError = ref('')
const downloadingBackupId = ref('')
const createDialogOpen = ref(false)
const detailsDialogOpen = ref(false)
const restoreDialogOpen = ref(false)
const backupName = ref('')
const backupMode = ref('hot-consistent')
const recoveringOperationId = ref('')
let requestSequence = 0
let roomRequestSequence = 0
let detailsRequestSequence = 0
let loadedSetsRoomId = ''

const recoveryOperations = computed(() => operations.value.filter(operation => operation.status === 'recovery_required'))
const backupModeKey = computed(() => backupMode.value === 'hot-consistent' ? 'hot' : 'cold')
const selectedOperation = computed(() => selectedSet.value ? latestOperation(selectedSet.value.id) : null)
const selectedRoom = computed(() => rooms.value.find(room => String(room.id) === selectedRoomId.value) || null)
const isSystemCategory = computed(() => props.category === 'system')
const backupItems = computed(() => [
  ...sets.value.map(item => ({ ...item, source: 'set' })),
  ...legacyBackups.value.map(item => ({
    ...item,
    source: 'legacy',
    roomName: selectedRoom.value?.name || '',
    restorable: item.status === 'verified'
  }))
].sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()))
const visibleBackupItems = computed(() => backupItems.value.filter(item => (
  isSystemCategory.value ? backupCategory(item.kind) === 'system' : backupCategory(item.kind) === 'saves'
)))

function backupCategory(kind) {
  return String(kind || '').trim().toLowerCase() === 'protection' ? 'system' : 'saves'
}

function backupSourceLabel(kind) {
  const normalized = String(kind || '').trim().toLowerCase()
  const known = ['manual', 'snapshot', 'protection', 'upload', 'imported', 'import']
  return t(`backups.catalog.sources.${known.includes(normalized) ? normalized : 'other'}`)
}

function categoryMessage(name) {
  return `backups.catalog.categories.${isSystemCategory.value ? 'system' : 'saves'}.${name}`
}

async function loadRooms() {
  const sequence = ++roomRequestSequence
  loadingRooms.value = true
  error.value = ''
  try {
    const response = await roomsV2API.controlPlaneList()
    if (sequence !== roomRequestSequence) return false
    rooms.value = response.items || []
    if (!rooms.value.some(room => String(room.id) === selectedRoomId.value)) {
      selectedRoomId.value = preferredRoomId(rooms.value, roomRoute.query.roomId)
    }
    return true
  } catch (cause) {
    if (sequence !== roomRequestSequence) return false
    error.value = cause.message || t('common.errors.unknown')
    return false
  } finally {
    if (sequence === roomRequestSequence) loadingRooms.value = false
  }
}

async function loadSets() {
  if (!selectedRoomId.value) {
    requestSequence += 1
    sets.value = []
    legacyBackups.value = []
    operations.value = []
    partialLoadError.value = ''
    operationsError.value = ''
    loading.value = false
    loadedSetsRoomId = ''
    return { setsLoaded: true, operationsLoaded: true }
  }
  const roomId = selectedRoomId.value
  if (loadedSetsRoomId !== roomId) {
    sets.value = []
    legacyBackups.value = []
    operations.value = []
    selectedSet.value = null
  }
  const sequence = ++requestSequence
  loading.value = true
  error.value = ''
  partialLoadError.value = ''
  operationsError.value = ''
  try {
    const [setsResult, legacyResult, operationsResult] = await Promise.allSettled([
      backupSetsV2API.list(roomId),
      backupsV2API.list(roomId),
      backupSetsV2API.operations(roomId)
    ])
    if (sequence !== requestSequence) return

    const setsLoaded = setsResult.status === 'fulfilled'
    const legacyLoaded = legacyResult.status === 'fulfilled'
    sets.value = setsLoaded ? (setsResult.value.items || []) : []
    legacyBackups.value = legacyLoaded ? (legacyResult.value.items || []) : []
    loadedSetsRoomId = roomId

    const catalogFailures = [setsResult, legacyResult]
      .filter(result => result.status === 'rejected')
      .map(result => result.reason?.message || t('common.errors.unknown'))
    if (!setsLoaded && !legacyLoaded) error.value = catalogFailures.join('; ')
    else partialLoadError.value = catalogFailures.join('; ')

    if (operationsResult.status === 'fulfilled') {
      operations.value = operationsResult.value.items || []
    } else {
      operationsError.value = operationsResult.reason?.message || t('common.errors.unknown')
    }
    return { setsLoaded, catalogLoaded: setsLoaded || legacyLoaded, operationsLoaded: operationsResult.status === 'fulfilled' }
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function openCreateDialog() {
  backupName.value = ''
  backupMode.value = 'hot-consistent'
  createDialogOpen.value = true
}

function setBackupMode(value) {
  if (value === 'cold-consistent' || value === 'hot-consistent') backupMode.value = value
}

async function createSet() {
  if (!selectedRoomId.value || operationRunning.value) return
  operationRunning.value = true
  try {
    const job = await backupSetsV2API.create(selectedRoomId.value, backupName.value.trim(), backupMode.value)
    await waitForV2Job(job, 10 * 60 * 1000)
    createDialogOpen.value = false
    const refreshed = await loadSets()
    if (refreshed?.setsLoaded) toast.success(t('distributed.backups.feedback.created'))
    else toast.warning(t('distributed.backups.feedback.createdRefreshFailed'))
  } catch (cause) {
    toast.error(t('distributed.backups.feedback.createFailed', { error: createBackupError(cause) }))
  } finally {
    operationRunning.value = false
  }
}

function createBackupError(cause) {
  const code = cause?.context?.targetErrorCode
  if (code === 'BACKUP_HOT_UNAVAILABLE' || code === 'BACKUP_SNAPSHOT_BARRIER_FAILED') {
    return t('distributed.backups.errors.hotUnavailable')
  }
  return cause?.message || t('common.errors.unknown')
}

async function openDetails(backupSet) {
  const sequence = ++detailsRequestSequence
  selectedSet.value = backupSet
  detailsDialogOpen.value = true
  detailsLoading.value = true
  try {
    const value = await backupSetsV2API.get(backupSet.id)
    if (sequence === detailsRequestSequence) selectedSet.value = value
  } catch (cause) {
    if (sequence !== detailsRequestSequence) return
    toast.error(t('distributed.backups.feedback.detailsFailed', { error: cause.message || t('common.errors.unknown') }))
  } finally {
    if (sequence === detailsRequestSequence) detailsLoading.value = false
  }
}

function openRestoreDialog(backupSet) {
  if (!backupSet?.restorable) {
    toast.error(backupSet?.validationError || t('distributed.backups.notRestorable'))
    return
  }
  selectedSet.value = backupSet
  restoreDialogOpen.value = true
}

async function restoreSet() {
  if (!selectedSet.value || operationRunning.value) return
  const confirmation = selectedSet.value.roomName
  operationRunning.value = true
  try {
    const job = selectedSet.value.source === 'legacy'
      ? await backupsV2API.restore(selectedSet.value.id, confirmation)
      : await backupSetsV2API.restore(selectedSet.value.id, confirmation)
    await waitForV2Job(job, 15 * 60 * 1000)
    restoreDialogOpen.value = false
    const refreshedState = await loadSets()
    const operation = selectedSet.value.source === 'legacy' ? null : latestOperation(selectedSet.value.id)
    if (selectedSet.value.source === 'legacy') toast.success(t('distributed.backups.feedback.restored'))
    else if (!refreshedState?.setsLoaded || !refreshedState.operationsLoaded || !operation) toast.warning(t('distributed.backups.feedback.operationStateUnknown'))
    else if (operation.status === 'recovery_required') toast.warning(t('distributed.backups.feedback.recoveryPending'))
    else toast.success(t('distributed.backups.feedback.restored'))
  } catch (cause) {
    toast.error(t('distributed.backups.feedback.restoreFailed', { error: cause.message || t('common.errors.unknown') }))
  } finally {
    operationRunning.value = false
  }
}

async function downloadLegacyBackup(backup) {
  if (!backup?.id || downloadingBackupId.value) return
  downloadingBackupId.value = backup.id
  let objectURL = ''
  try {
    const blob = await backupsV2API.downloadBlob(backup.id)
    objectURL = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectURL
    link.download = `${backup.name}.zip`
    document.body.appendChild(link)
    link.click()
    link.remove()
    toast.success(t('backups.feedback.downloading', { name: backup.name }))
  } catch (cause) {
    toast.error(t('backups.feedback.downloadFailed', { error: cause.message || t('common.errors.unknown') }))
  } finally {
    if (objectURL) URL.revokeObjectURL(objectURL)
    downloadingBackupId.value = ''
  }
}

async function deleteLegacyBackup(backup) {
  if (operationRunning.value) return
  try {
    await confirmAction(
      t('backups.feedback.deleteConfirm', { name: backup.name }),
      t('backups.feedback.deleteTitle'),
      {
        confirmButtonText: t('backups.feedback.deleteButton'),
        cancelButtonText: t('common.actions.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }
  operationRunning.value = true
  try {
    await backupsV2API.delete(backup.id, backup.name)
    await loadSets()
    toast.success(t('backups.feedback.deleted'))
  } catch (cause) {
    toast.error(t('backups.feedback.deleteFailed', { error: cause.message || t('common.errors.unknown') }))
  } finally {
    operationRunning.value = false
  }
}

async function recoverOperation(operation) {
  if (!operation?.id || operationRunning.value) return
  operationRunning.value = true
  recoveringOperationId.value = operation.id
  try {
    const job = await backupSetsV2API.recoverOperation(operation.id)
    await waitForV2Job(job, 15 * 60 * 1000)
    const refreshedState = await loadSets()
    const refreshed = operations.value.find(item => item.id === operation.id)
    if (!refreshedState?.setsLoaded || !refreshedState.operationsLoaded || !refreshed) toast.warning(t('distributed.backups.feedback.operationStateUnknown'))
    else if (refreshed.status === 'recovery_required') toast.warning(t('distributed.backups.feedback.recoveryPending'))
    else toast.success(t('distributed.backups.feedback.recovered'))
  } catch (cause) {
    await loadSets()
    toast.error(t('distributed.backups.feedback.recoverFailed', { error: cause.message || t('common.errors.unknown') }))
  } finally {
    operationRunning.value = false
    recoveringOperationId.value = ''
  }
}

function latestOperation(setID) {
  return operations.value.find(operation => operation.setId === setID) || null
}

function operationStatusLabel(value) {
  const known = ['running', 'succeeded', 'rolled_back', 'recovery_required', 'failed']
  return t(`distributed.backups.operationStatuses.${known.includes(value) ? value : 'unknown'}`)
}

function operationKindLabel(value) {
  const known = ['create', 'restore']
  return t(`distributed.backups.operationKinds.${known.includes(value) ? value : 'unknown'}`)
}

function operationStatusVariant(value) {
  if (value === 'succeeded') return 'secondary'
  if (value === 'failed' || value === 'recovery_required') return 'destructive'
  return 'outline'
}

function operationPhaseLabel(value) {
  const known = ['planned', 'barrier_preparing', 'barrier_committing', 'barrier_waiting', 'stopping', 'staging', 'protecting', 'preparing', 'prepared', 'publishing', 'published', 'completing', 'completed', 'failed', 'rolled_back', 'recovered']
  return t(`distributed.backups.operationPhases.${known.includes(value) ? value : 'unknown'}`)
}

function backupModeLabel(value) {
  return t(`distributed.backups.modes.${value === 'hot-consistent' ? 'hot' : 'cold'}`)
}

function contentKindLabel(value) {
  const kind = value?.restorable ? 'gameSave' : value?.contentKind === 'configuration-only' ? 'configurationOnly' : 'unknown'
  return t(`distributed.backups.contentKinds.${kind}`)
}

function setStatusLabel(value) {
  const known = ['creating', 'verified', 'partial', 'failed', 'corrupt']
  return t(`distributed.backups.statuses.${known.includes(value) ? value : 'unknown'}`)
}

function setStatusVariant(value) {
  if (value === 'verified') return 'secondary'
  if (value === 'failed' || value === 'corrupt') return 'destructive'
  return 'outline'
}

function partStatusLabel(value) {
  const known = ['pending', 'staging', 'verified', 'failed']
  return t(`distributed.backups.partStatuses.${known.includes(value) ? value : 'unknown'}`)
}

function partStatusVariant(value) {
  if (value === 'verified') return 'secondary'
  if (value === 'failed') return 'destructive'
  return 'outline'
}

function verifiedParts(backupSet) {
  return (backupSet.parts || []).filter(part => part.status === 'verified').length
}

function formatBytes(value) {
  const bytes = Number(value) || 0
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let amount = bytes
  let index = -1
  do {
    amount /= 1024
    index++
  } while (amount >= 1024 && index < units.length - 1)
  return `${amount.toFixed(amount >= 10 ? 1 : 2)} ${units[index]}`
}

function formatTime(value) {
  return formatSystemDateTime(value, {
    locale: locale.value,
    dateStyle: 'short',
    timeStyle: 'medium'
  })
}

watch(selectedRoomId, () => { void loadSets() })

onMounted(async () => {
  await loadRooms()
})
</script>

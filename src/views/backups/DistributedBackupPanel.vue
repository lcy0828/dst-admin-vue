<template>
  <section class="flex min-w-0 flex-col gap-4" aria-labelledby="distributed-backup-title">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h2 id="distributed-backup-title" class="text-base font-semibold">{{ t('distributed.backups.title') }}</h2>
        <p class="mt-0.5 text-sm text-muted-foreground">{{ t('distributed.backups.description') }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UiButton :disabled="!selectedRoomId || loading || operationRunning" @click="openCreateDialog">
          <DatabaseBackup data-icon="inline-start" />
          {{ t('distributed.backups.create') }}
        </UiButton>
        <UiButton variant="outline" :disabled="!selectedRoomId || loading" @click="loadSets">
          <Spinner v-if="loading" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          {{ t('common.actions.refresh') }}
        </UiButton>
      </div>
    </div>

    <FieldGroup class="max-w-sm">
      <Field>
        <FieldLabel for="distributed-backup-room">{{ t('distributed.backups.room') }}</FieldLabel>
        <UiSelect v-model="selectedRoomId" :disabled="loadingRooms || operationRunning">
          <SelectTrigger id="distributed-backup-room">
            <SelectValue :placeholder="t('distributed.backups.selectRoom')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem v-for="room in rooms" :key="room.id" :value="String(room.id)">{{ room.name }}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </UiSelect>
      </Field>
    </FieldGroup>

    <Alert>
      <Snowflake />
      <AlertTitle>{{ t('distributed.backups.coldTitle') }}</AlertTitle>
      <AlertDescription>{{ t('distributed.backups.coldDescription') }}</AlertDescription>
    </Alert>

    <Alert v-if="error" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('distributed.backups.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
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

    <div v-if="loading && sets.length === 0" class="flex flex-col gap-2" :aria-label="t('distributed.backups.loading')">
      <Skeleton v-for="index in 4" :key="index" class="h-12 w-full" />
    </div>

    <Empty v-else-if="!loading && sets.length === 0">
      <EmptyHeader>
        <EmptyMedia variant="icon"><DatabaseBackup /></EmptyMedia>
        <EmptyTitle>{{ t('distributed.backups.emptyTitle') }}</EmptyTitle>
        <EmptyDescription>{{ t('distributed.backups.emptyDescription') }}</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <div v-else class="overflow-x-auto rounded-lg border">
      <UiTable class="min-w-[980px]">
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('distributed.backups.columns.name') }}</TableHead>
            <TableHead>{{ t('distributed.backups.columns.status') }}</TableHead>
            <TableHead>{{ t('distributed.backups.columns.parts') }}</TableHead>
            <TableHead>{{ t('distributed.backups.columns.size') }}</TableHead>
            <TableHead>{{ t('distributed.backups.columns.running') }}</TableHead>
            <TableHead>{{ t('distributed.backups.columns.createdAt') }}</TableHead>
            <TableHead class="text-right">{{ t('common.fields.actions') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="backupSet in sets" :key="backupSet.id">
            <TableCell>
              <div class="flex min-w-56 flex-col gap-1">
                <span class="font-medium">{{ backupSet.name }}</span>
                <span class="font-mono text-xs text-muted-foreground">{{ backupSet.id }}</span>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex min-w-32 flex-col items-start gap-1">
                <Badge :variant="setStatusVariant(backupSet.status)">{{ setStatusLabel(backupSet.status) }}</Badge>
                <Badge v-if="latestOperation(backupSet.id)" :variant="operationStatusVariant(latestOperation(backupSet.id).status)">
                  {{ operationStatusLabel(latestOperation(backupSet.id).status) }}
                </Badge>
                <span v-if="backupSet.failure" class="text-xs text-destructive">{{ backupSet.failure }}</span>
                <span v-if="latestOperation(backupSet.id)?.failure" class="max-w-64 text-xs text-destructive">{{ latestOperation(backupSet.id).failure }}</span>
                <UiButton v-if="latestOperation(backupSet.id)?.status === 'recovery_required'" size="xs" variant="outline" :disabled="operationRunning" @click="recoverOperation(latestOperation(backupSet.id))">
                  <Spinner v-if="recoveringOperationId === latestOperation(backupSet.id).id" data-icon="inline-start" />
                  <History v-else data-icon="inline-start" />
                  {{ t('distributed.backups.retryRecovery') }}
                </UiButton>
              </div>
            </TableCell>
            <TableCell>{{ t('distributed.backups.partCount', { verified: verifiedParts(backupSet), total: backupSet.parts?.length || 0 }) }}</TableCell>
            <TableCell>{{ formatBytes(backupSet.size) }}</TableCell>
            <TableCell>{{ backupSet.originalRunningWorlds?.length || 0 }}</TableCell>
            <TableCell class="min-w-44 text-xs text-muted-foreground">{{ formatTime(backupSet.createdAt) }}</TableCell>
            <TableCell>
              <div class="flex justify-end gap-1">
                <UiButton size="sm" variant="outline" @click="openDetails(backupSet)">
                  <Eye data-icon="inline-start" />
                  {{ t('distributed.backups.details') }}
                </UiButton>
                <UiButton size="sm" :disabled="backupSet.status !== 'verified' || operationRunning" @click="openRestoreDialog(backupSet)">
                  <History data-icon="inline-start" />
                  {{ t('distributed.backups.restore') }}
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
        <Alert>
          <TriangleAlert />
          <AlertTitle>{{ t('distributed.backups.createDialog.interruptionTitle') }}</AlertTitle>
          <AlertDescription>{{ t('distributed.backups.createDialog.interruptionDescription') }}</AlertDescription>
        </Alert>
        <FieldGroup>
          <Field>
            <FieldLabel for="distributed-backup-name">{{ t('distributed.backups.createDialog.name') }}</FieldLabel>
            <UiInput id="distributed-backup-name" v-model="backupName" maxlength="128" :placeholder="t('distributed.backups.createDialog.namePlaceholder')" />
            <FieldDescription>{{ t('distributed.backups.createDialog.nameDescription') }}</FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" :disabled="operationRunning" @click="createDialogOpen = false">{{ t('common.actions.cancel') }}</UiButton>
          <UiButton :disabled="operationRunning" @click="createSet">
            <Spinner v-if="operationRunning" data-icon="inline-start" />
            {{ t('distributed.backups.createDialog.confirm') }}
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
          <Alert v-if="selectedOperation" :variant="selectedOperation.status === 'recovery_required' || selectedOperation.status === 'failed' ? 'destructive' : 'default'">
            <History />
            <AlertTitle>{{ t('distributed.backups.operationSummary', { kind: operationKindLabel(selectedOperation.kind), status: operationStatusLabel(selectedOperation.status) }) }}</AlertTitle>
            <AlertDescription>{{ selectedOperation.failure || t('distributed.backups.operationUpdatedAt', { time: formatTime(selectedOperation.updatedAt) }) }}</AlertDescription>
          </Alert>
          <dl class="grid gap-3 text-sm sm:grid-cols-3">
            <div><dt class="text-muted-foreground">{{ t('distributed.backups.detailsDialog.manifest') }}</dt><dd class="mt-1 font-medium">v{{ selectedSet.manifestVersion }}</dd></div>
            <div><dt class="text-muted-foreground">{{ t('distributed.backups.columns.size') }}</dt><dd class="mt-1 font-medium">{{ formatBytes(selectedSet.size) }}</dd></div>
            <div><dt class="text-muted-foreground">{{ t('distributed.backups.detailsDialog.files') }}</dt><dd class="mt-1 font-medium">{{ selectedSet.fileCount }}</dd></div>
            <div class="sm:col-span-3"><dt class="text-muted-foreground">{{ t('distributed.backups.detailsDialog.topologyRevision') }}</dt><dd class="mt-1 break-all font-mono text-xs">{{ selectedSet.topologyRevision }}</dd></div>
            <div v-if="selectedOperation"><dt class="text-muted-foreground">{{ t('distributed.backups.operationPhase') }}</dt><dd class="mt-1 font-medium">{{ operationPhaseLabel(selectedOperation.phase) }}</dd></div>
            <div v-if="selectedOperation?.protectionSetId" class="sm:col-span-2"><dt class="text-muted-foreground">{{ t('distributed.backups.protectionSet') }}</dt><dd class="mt-1 break-all font-mono text-xs">{{ selectedOperation.protectionSetId }}</dd></div>
          </dl>
          <div class="overflow-x-auto rounded-lg border">
            <UiTable class="min-w-[720px]">
              <TableHeader><TableRow><TableHead>{{ t('distributed.backups.partColumns.world') }}</TableHead><TableHead>{{ t('distributed.backups.partColumns.target') }}</TableHead><TableHead>{{ t('distributed.backups.partColumns.status') }}</TableHead><TableHead>{{ t('distributed.backups.columns.size') }}</TableHead><TableHead>SHA-256</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow v-for="part in selectedSet.parts || []" :key="part.id">
                  <TableCell><div class="flex min-w-40 flex-col gap-1"><span class="font-medium">{{ part.worldName }}</span><span class="text-xs text-muted-foreground">{{ part.shard }}</span></div></TableCell>
                  <TableCell>{{ part.targetId }}</TableCell>
                  <TableCell><Badge :variant="partStatusVariant(part.status)">{{ partStatusLabel(part.status) }}</Badge></TableCell>
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
        <FieldGroup>
          <Field :data-invalid="Boolean(restoreConfirmation) && restoreConfirmation !== selectedSet?.roomName">
            <FieldLabel for="distributed-backup-confirmation">{{ t('distributed.backups.restoreDialog.confirmation') }}</FieldLabel>
            <UiInput id="distributed-backup-confirmation" v-model="restoreConfirmation" autocomplete="off" :placeholder="selectedSet?.roomName || ''" :aria-invalid="Boolean(restoreConfirmation) && restoreConfirmation !== selectedSet?.roomName" />
            <FieldDescription>{{ t('distributed.backups.restoreDialog.confirmationDescription', { room: selectedSet?.roomName || '--' }) }}</FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" :disabled="operationRunning" @click="restoreDialogOpen = false">{{ t('common.actions.cancel') }}</UiButton>
          <UiButton variant="destructive" :disabled="operationRunning || restoreConfirmation !== selectedSet?.roomName" @click="restoreSet">
            <Spinner v-if="operationRunning" data-icon="inline-start" />
            {{ t('distributed.backups.restoreDialog.confirm') }}
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleAlert, DatabaseBackup, Eye, History, RefreshCw, Snowflake, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { backupSetsV2API, roomsV2API } from '@/api/v2'
import { waitForV2Job } from '@/api/v2ConfigurationAdapters'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input as UiInput } from '@/components/ui/input'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const { locale, t } = useI18n()
const rooms = ref([])
const selectedRoomId = ref('')
const sets = ref([])
const operations = ref([])
const selectedSet = ref(null)
const loadingRooms = ref(false)
const loading = ref(false)
const detailsLoading = ref(false)
const operationRunning = ref(false)
const error = ref('')
const operationsError = ref('')
const createDialogOpen = ref(false)
const detailsDialogOpen = ref(false)
const restoreDialogOpen = ref(false)
const backupName = ref('')
const restoreConfirmation = ref('')
const recoveringOperationId = ref('')
let requestSequence = 0

const recoveryOperations = computed(() => operations.value.filter(operation => operation.status === 'recovery_required'))
const selectedOperation = computed(() => selectedSet.value ? latestOperation(selectedSet.value.id) : null)

async function loadRooms() {
  loadingRooms.value = true
  error.value = ''
  try {
    const response = await roomsV2API.controlPlaneList()
    rooms.value = (response.items || []).filter(room => room.managed)
    if (!rooms.value.some(room => String(room.id) === selectedRoomId.value)) {
      selectedRoomId.value = rooms.value[0] ? String(rooms.value[0].id) : ''
    }
  } catch (cause) {
    rooms.value = []
    selectedRoomId.value = ''
    error.value = cause.message || t('common.errors.unknown')
  } finally {
    loadingRooms.value = false
  }
}

async function loadSets() {
  if (!selectedRoomId.value) {
    sets.value = []
    operations.value = []
    operationsError.value = ''
    return
  }
  const sequence = ++requestSequence
  loading.value = true
  error.value = ''
  operationsError.value = ''
  try {
    const [setsResult, operationsResult] = await Promise.allSettled([
      backupSetsV2API.list(selectedRoomId.value),
      backupSetsV2API.operations(selectedRoomId.value)
    ])
    if (sequence !== requestSequence) return
    if (setsResult.status === 'rejected') throw setsResult.reason
    sets.value = setsResult.value.items || []
    if (operationsResult.status === 'fulfilled') {
      operations.value = operationsResult.value.items || []
    } else {
      operations.value = []
      operationsError.value = operationsResult.reason?.message || t('common.errors.unknown')
    }
  } catch (cause) {
    if (sequence !== requestSequence) return
    sets.value = []
    operations.value = []
    error.value = cause.message || t('common.errors.unknown')
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function openCreateDialog() {
  backupName.value = ''
  createDialogOpen.value = true
}

async function createSet() {
  if (!selectedRoomId.value || operationRunning.value) return
  operationRunning.value = true
  try {
    const job = await backupSetsV2API.create(selectedRoomId.value, backupName.value.trim())
    await waitForV2Job(job, 10 * 60 * 1000)
    createDialogOpen.value = false
    await loadSets()
    toast.success(t('distributed.backups.feedback.created'))
  } catch (cause) {
    toast.error(t('distributed.backups.feedback.createFailed', { error: cause.message || t('common.errors.unknown') }))
  } finally {
    operationRunning.value = false
  }
}

async function openDetails(backupSet) {
  selectedSet.value = backupSet
  detailsDialogOpen.value = true
  detailsLoading.value = true
  try {
    selectedSet.value = await backupSetsV2API.get(backupSet.id)
  } catch (cause) {
    toast.error(t('distributed.backups.feedback.detailsFailed', { error: cause.message || t('common.errors.unknown') }))
  } finally {
    detailsLoading.value = false
  }
}

function openRestoreDialog(backupSet) {
  selectedSet.value = backupSet
  restoreConfirmation.value = ''
  restoreDialogOpen.value = true
}

async function restoreSet() {
  if (!selectedSet.value || restoreConfirmation.value !== selectedSet.value.roomName || operationRunning.value) return
  operationRunning.value = true
  try {
    const job = await backupSetsV2API.restore(selectedSet.value.id, restoreConfirmation.value)
    await waitForV2Job(job, 15 * 60 * 1000)
    restoreDialogOpen.value = false
    await loadSets()
    const operation = latestOperation(selectedSet.value.id)
    if (operationsError.value || !operation) toast.warning(t('distributed.backups.feedback.operationStateUnknown'))
    else if (operation.status === 'recovery_required') toast.warning(t('distributed.backups.feedback.recoveryPending'))
    else toast.success(t('distributed.backups.feedback.restored'))
  } catch (cause) {
    toast.error(t('distributed.backups.feedback.restoreFailed', { error: cause.message || t('common.errors.unknown') }))
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
    await loadSets()
    const refreshed = operations.value.find(item => item.id === operation.id)
    if (operationsError.value || !refreshed) toast.warning(t('distributed.backups.feedback.operationStateUnknown'))
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
  const known = ['planned', 'stopping', 'staging', 'protecting', 'preparing', 'prepared', 'publishing', 'published', 'completing', 'completed', 'failed', 'rolled_back', 'recovered']
  return t(`distributed.backups.operationPhases.${known.includes(value) ? value : 'unknown'}`)
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
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '--'
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'short', timeStyle: 'medium' }).format(parsed)
}

watch(selectedRoomId, () => { void loadSets() })

onMounted(async () => {
  await loadRooms()
})
</script>

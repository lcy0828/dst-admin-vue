<template>
  <div class="flex min-w-0 flex-col gap-5">
    <header class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-2xl font-semibold tracking-normal">{{ t('topology.title') }}</h1>
          <Badge variant="outline">{{ t('topology.planningBadge') }}</Badge>
        </div>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('topology.subtitle') }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UiButton variant="outline" :disabled="loading || !selectedRoomId" @click="loadTopology">
          <Spinner v-if="loading" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          {{ t('common.actions.refresh') }}
        </UiButton>
        <UiButton variant="outline" :disabled="!canSubmit || previewing" @click="previewPlan">
          <Spinner v-if="previewing" data-icon="inline-start" />
          <ScanSearch v-else data-icon="inline-start" />
          {{ previewing ? t('topology.actions.previewing') : t('topology.actions.preview') }}
        </UiButton>
        <UiButton :disabled="!canSubmit || saving" @click="savePlan">
          <Spinner v-if="saving" data-icon="inline-start" />
          <Save v-else data-icon="inline-start" />
          {{ saving ? t('topology.actions.saving') : t('topology.actions.save') }}
        </UiButton>
      </div>
    </header>

    <FieldGroup class="max-w-sm">
      <Field>
        <FieldLabel for="topology-room">{{ t('topology.room') }}</FieldLabel>
        <UiSelect :model-value="selectedRoomId" :disabled="loadingRooms" @update:model-value="selectRoom">
          <SelectTrigger id="topology-room">
            <SelectValue :placeholder="loadingRooms ? t('topology.loadingRooms') : t('topology.selectRoom')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem v-for="room in rooms" :key="room.id" :value="String(room.id)">
                {{ room.name }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </UiSelect>
      </Field>
    </FieldGroup>

    <Alert>
      <Cpu />
      <AlertTitle>{{ t('topology.policy.title') }}</AlertTitle>
      <AlertDescription>{{ t('topology.policy.description') }}</AlertDescription>
    </Alert>

    <Alert v-if="roomsError" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('topology.feedback.roomsFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ roomsError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="loadRooms">{{ t('common.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <template v-if="loading">
      <div class="flex flex-col gap-2" :aria-label="t('topology.loading')">
        <Skeleton v-for="index in 5" :key="index" class="h-14 w-full" />
      </div>
    </template>

    <Empty v-else-if="!loadingRooms && rooms.length === 0 && !roomsError">
      <EmptyHeader>
        <EmptyMedia variant="icon"><Network /></EmptyMedia>
        <EmptyTitle>{{ t('topology.empty.title') }}</EmptyTitle>
        <EmptyDescription>{{ t('topology.empty.description') }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <UiButton variant="outline" @click="router.push('/rooms/list')">{{ t('navigation.roomList') }}</UiButton>
      </EmptyContent>
    </Empty>

    <Alert v-else-if="topologyError" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('topology.feedback.topologyFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ topologyError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="loadTopology">{{ t('common.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <template v-else-if="displaySnapshot">
      <Alert>
        <Info />
        <AlertTitle>{{ t('topology.planning.title') }}</AlertTitle>
        <AlertDescription>{{ t('topology.planning.description') }}</AlertDescription>
      </Alert>

      <section class="flex min-w-0 flex-col gap-3" aria-labelledby="topology-capacity-title">
        <div>
          <h2 id="topology-capacity-title" class="text-base font-semibold">{{ t('topology.capacity.title') }}</h2>
          <p class="mt-0.5 text-sm text-muted-foreground">{{ t('topology.capacity.description') }}</p>
        </div>
        <div class="overflow-hidden rounded-lg border">
          <UiTable class="min-w-[1080px]">
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('topology.capacity.columns.target') }}</TableHead>
                <TableHead>{{ t('topology.capacity.columns.status') }}</TableHead>
                <TableHead class="text-right">{{ t('topology.capacity.columns.observed') }}</TableHead>
                <TableHead class="text-right">{{ t('topology.capacity.columns.unmanaged') }}</TableHead>
                <TableHead class="text-right">{{ t('topology.capacity.columns.planned') }}</TableHead>
                <TableHead class="text-right">{{ t('topology.capacity.columns.projected') }}</TableHead>
                <TableHead>{{ t('topology.capacity.columns.budget') }}</TableHead>
                <TableHead>{{ t('topology.capacity.columns.observedAt') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="target in displaySnapshot.targets" :key="target.id">
                <TableCell>
                  <div class="min-w-48">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class="font-medium">{{ target.name || target.id }}</span>
                      <Badge v-if="target.kind === 'local'" variant="outline">{{ t('topology.target.local') }}</Badge>
                    </div>
                    <div class="mt-1 font-mono text-xs text-muted-foreground">{{ target.id }}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="flex min-w-32 flex-col items-start gap-1.5">
                    <Badge :variant="target.online ? 'secondary' : 'destructive'">{{ target.online ? t('topology.target.online') : t('topology.target.offline') }}</Badge>
                    <Badge :variant="freshnessVariant(target)">{{ freshnessLabel(target) }}</Badge>
                  </div>
                </TableCell>
                <TableCell class="text-right font-medium tabular-nums">{{ target.observedRunningShards }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ target.unmanagedRunningShards }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ target.plannedShards }}</TableCell>
                <TableCell class="text-right font-medium tabular-nums">{{ target.projectedShards }}</TableCell>
                <TableCell>
                  <div class="flex min-w-56 flex-col gap-1">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class="font-medium tabular-nums">{{ capacityValue(target) }}</span>
                      <Badge :variant="capacityVariant(target.projectedCapacity?.state)">{{ capacityStateLabel(target.projectedCapacity?.state) }}</Badge>
                    </div>
                    <span class="text-xs text-muted-foreground">{{ physicalCoreLabel(target) }} · {{ t('topology.capacity.logical', { count: target.projectedCapacity?.logicalProcessors || 0 }) }}</span>
                    <span class="text-xs text-muted-foreground">{{ t('topology.capacity.reserve', { count: target.projectedCapacity?.reservedPhysicalCores || 1 }) }}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="min-w-40 text-xs text-muted-foreground">{{ formatTime(target.observedAt) }}</div>
                </TableCell>
              </TableRow>
            </TableBody>
          </UiTable>
        </div>
      </section>

      <section class="flex min-w-0 flex-col gap-3" aria-labelledby="topology-placement-title">
        <div>
          <h2 id="topology-placement-title" class="text-base font-semibold">{{ t('topology.placements.title') }}</h2>
          <p class="mt-0.5 text-sm text-muted-foreground">{{ t('topology.placements.description') }}</p>
        </div>
        <div class="overflow-hidden rounded-lg border">
          <UiTable class="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('topology.placements.columns.world') }}</TableHead>
                <TableHead>{{ t('topology.placements.columns.role') }}</TableHead>
                <TableHead>{{ t('topology.placements.columns.desired') }}</TableHead>
                <TableHead>{{ t('topology.placements.columns.applied') }}</TableHead>
                <TableHead>{{ t('topology.placements.columns.state') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="placement in displaySnapshot.placements" :key="placement.worldId">
                <TableCell>
                  <div class="min-w-44 font-medium">{{ placement.worldName }}</div>
                  <div class="mt-1 font-mono text-xs text-muted-foreground">{{ placement.worldId }}</div>
                </TableCell>
                <TableCell><Badge variant="outline">{{ roleLabel(placement.worldRole) }}</Badge></TableCell>
                <TableCell>
                  <UiSelect v-model="draftPlacements[placement.worldId]" @update:model-value="clearPreview">
                    <SelectTrigger class="w-64"><SelectValue :placeholder="t('topology.placements.selectTarget')" /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem v-for="target in configuredTargets" :key="target.id" :value="target.id">
                          {{ targetOptionLabel(target) }}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </UiSelect>
                </TableCell>
                <TableCell>
                  <div class="min-w-44">{{ targetName(placement.appliedTargetId) }}</div>
                  <div class="mt-1 font-mono text-xs text-muted-foreground">{{ placement.appliedTargetId }}</div>
                </TableCell>
                <TableCell><Badge :variant="placementVariant(placement.state)">{{ placementStateLabel(placement.state) }}</Badge></TableCell>
              </TableRow>
            </TableBody>
          </UiTable>
        </div>
      </section>

      <section class="flex min-w-0 flex-col gap-3" aria-labelledby="topology-issues-title">
        <div>
          <h2 id="topology-issues-title" class="text-base font-semibold">{{ t('topology.issues.title') }}</h2>
          <p class="mt-0.5 text-sm text-muted-foreground">{{ t('topology.issues.description') }}</p>
        </div>
        <div v-if="displaySnapshot.issues.length" class="flex flex-col gap-2">
          <Alert v-for="(issue, index) in displaySnapshot.issues" :key="`${issue.code}:${issue.targetId || ''}:${issue.worldId || ''}:${index}`" :variant="issue.severity === 'error' ? 'destructive' : 'default'">
            <CircleAlert v-if="issue.severity === 'error'" />
            <TriangleAlert v-else-if="issue.severity === 'warning'" />
            <Info v-else />
            <AlertTitle><Badge :variant="issue.severity === 'error' ? 'destructive' : 'outline'">{{ issue.code }}</Badge></AlertTitle>
            <AlertDescription>{{ issue.message }}</AlertDescription>
          </Alert>
        </div>
        <Empty v-else>
          <EmptyHeader>
            <EmptyMedia variant="icon"><CircleCheck /></EmptyMedia>
            <EmptyTitle>{{ t('topology.issues.emptyTitle') }}</EmptyTitle>
            <EmptyDescription>{{ t('topology.issues.emptyDescription') }}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    </template>

    <AlertDialog v-model:open="overcommitOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('topology.overcommit.title') }}</AlertDialogTitle>
          <AlertDialogDescription>{{ t('topology.overcommit.description') }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="saving">{{ t('topology.overcommit.cancel') }}</AlertDialogCancel>
          <AlertDialogAction :disabled="saving" @click="confirmOvercommit">
            <Spinner v-if="saving" data-icon="inline-start" />
            {{ t('topology.overcommit.confirm') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { CircleAlert, CircleCheck, Cpu, Info, Network, RefreshCw, Save, ScanSearch, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { topologyV2API } from '@/api/v2'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const { locale, t } = useI18n()
const route = useRoute()
const router = useRouter()

const rooms = ref([])
const selectedRoomId = ref('')
const topology = ref(null)
const preview = ref(null)
const draftPlacements = ref({})
const roomsError = ref('')
const topologyError = ref('')
const loadingRooms = ref(false)
const loading = ref(false)
const previewing = ref(false)
const saving = ref(false)
const overcommitOpen = ref(false)
let requestSequence = 0

const displaySnapshot = computed(() => preview.value || topology.value)
const configuredTargets = computed(() => (topology.value?.targets || []).filter(target => target.configured))
const isDirty = computed(() => {
  if (!topology.value) return false
  return topology.value.placements.some(placement => draftPlacements.value[placement.worldId] !== placement.desiredTargetId)
})
const completeDraft = computed(() => {
  if (!topology.value?.placements?.length) return false
  return topology.value.placements.every(placement => Boolean(draftPlacements.value[placement.worldId]))
})
const canSubmit = computed(() => isDirty.value && completeDraft.value && !loading.value && !saving.value)

function setTopology(value) {
  topology.value = value
  preview.value = null
  draftPlacements.value = Object.fromEntries((value?.placements || []).map(placement => [placement.worldId, placement.desiredTargetId]))
}

function placementInput(allowOvercommit = false) {
  return {
    expectedRevision: topology.value.revision,
    allowOvercommit,
    placements: topology.value.placements.map(placement => ({
      worldId: placement.worldId,
      targetId: draftPlacements.value[placement.worldId]
    }))
  }
}

function selectRoom(value) {
  const next = String(value || '')
  if (next === selectedRoomId.value) return
  selectedRoomId.value = next
  void router.replace({ query: { ...route.query, roomId: next || undefined } })
  void loadTopology()
}

async function loadRooms() {
  loadingRooms.value = true
  roomsError.value = ''
  try {
    const response = await topologyV2API.rooms()
    rooms.value = (response.items || []).filter(room => room.managed)
    const queryRoomId = String(route.query.roomId || '')
    const selected = rooms.value.find(room => String(room.id) === queryRoomId) || rooms.value[0]
    selectedRoomId.value = selected ? String(selected.id) : ''
    if (selectedRoomId.value) {
      void router.replace({ query: { ...route.query, roomId: selectedRoomId.value } })
      await loadTopology()
    } else {
      setTopology(null)
    }
  } catch (error) {
    rooms.value = []
    selectedRoomId.value = ''
    setTopology(null)
    roomsError.value = error.message || t('common.errors.unknown')
  } finally {
    loadingRooms.value = false
  }
}

async function loadTopology() {
  if (!selectedRoomId.value) return
  const sequence = ++requestSequence
  loading.value = true
  topologyError.value = ''
  try {
    const value = await topologyV2API.get(selectedRoomId.value)
    if (sequence !== requestSequence) return
    setTopology(value)
  } catch (error) {
    if (sequence !== requestSequence) return
    setTopology(null)
    topologyError.value = error.message || t('common.errors.unknown')
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function clearPreview() {
  preview.value = null
}

async function previewPlan({ quiet = false } = {}) {
  if (!canSubmit.value) return null
  previewing.value = true
  topologyError.value = ''
  try {
    const value = await topologyV2API.preview(selectedRoomId.value, placementInput(false))
    preview.value = value
    if (!quiet) toast.success(t('topology.feedback.previewReady'))
    return value
  } catch (error) {
    topologyError.value = t('topology.feedback.previewFailed', { error: error.message || t('common.errors.unknown') })
    if (!quiet) toast.error(topologyError.value)
    return null
  } finally {
    previewing.value = false
  }
}

async function savePlan() {
  const value = await previewPlan({ quiet: true })
  if (!value) return
  if (value.requiresOvercommitConfirmation) {
    overcommitOpen.value = true
    return
  }
  await persistPlan(false)
}

async function confirmOvercommit() {
  overcommitOpen.value = false
  await persistPlan(true)
}

async function persistPlan(allowOvercommit) {
  if (!topology.value || saving.value) return
  saving.value = true
  topologyError.value = ''
  try {
    const value = await topologyV2API.update(selectedRoomId.value, placementInput(allowOvercommit))
    setTopology(value)
    toast.success(t('topology.feedback.saved'))
  } catch (error) {
    if (error.code === 'TOPOLOGY_REVISION_CONFLICT') {
      toast.warning(t('topology.feedback.revisionChanged'))
      await loadTopology()
      return
    }
    topologyError.value = t('topology.feedback.saveFailed', { error: error.message || t('common.errors.unknown') })
    toast.error(topologyError.value)
  } finally {
    saving.value = false
  }
}

function targetName(targetId) {
  return (displaySnapshot.value?.targets || []).find(target => target.id === targetId)?.name || targetId
}

function targetOptionLabel(target) {
  if (target.online) return target.name
  return `${target.name} (${t('topology.placements.offlineSuffix')})`
}

function freshnessLabel(target) {
  if (!target.inventoryAvailable) return t('topology.target.inventoryMissing')
  if (target.inventoryStale) return t('topology.target.inventoryStale')
  return t('topology.target.inventoryCurrent')
}

function freshnessVariant(target) {
  if (!target.inventoryAvailable || target.inventoryStale) return 'outline'
  return 'secondary'
}

function capacityValue(target) {
  const projected = target.projectedShards || 0
  const limit = target.projectedCapacity?.recommendedShardLimit || 0
  return limit
    ? t('topology.capacity.projectedValue', { projected, limit })
    : t('topology.capacity.unknownLimit', { projected })
}

function physicalCoreLabel(target) {
  const capacity = target.projectedCapacity || {}
  return capacity.physicalCoreEstimated
    ? t('topology.capacity.physicalEstimated', { count: capacity.physicalCores || 0 })
    : t('topology.capacity.physical', { count: capacity.physicalCores || 0 })
}

function capacityStateLabel(state) {
  return t(`topology.capacity.states.${state || 'unknown'}`)
}

function capacityVariant(state) {
  if (state === 'overcommitted') return 'destructive'
  if (state === 'available') return 'secondary'
  return 'outline'
}

function placementStateLabel(state) {
  const key = ['aligned', 'planned', 'target_offline', 'inventory_stale', 'inventory_missing', 'shard_missing', 'conflict'].includes(state)
    ? state
    : 'unknown'
  return t(`topology.placements.states.${key}`)
}

function placementVariant(state) {
  if (state === 'conflict' || state === 'target_offline') return 'destructive'
  if (state === 'aligned') return 'secondary'
  return 'outline'
}

function roleLabel(role) {
  const key = ['master', 'caves', 'custom'].includes(role) ? role : 'unknown'
  return t(`topology.placements.roles.${key}`)
}

function formatTime(value) {
  if (!value) return t('topology.time.unavailable')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t('topology.time.unavailable')
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'short', timeStyle: 'medium' }).format(date)
}

onMounted(loadRooms)
</script>

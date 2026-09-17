<template>
  <div class="flex min-w-0 flex-col gap-5">
    <header class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-normal">{{ t('topology.title') }}</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UiButton variant="outline" :disabled="loading || !selectedRoomId" @click="loadTopology">
          <Spinner v-if="loading" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          {{ t('common.actions.refresh') }}
        </UiButton>
      </div>
    </header>

    <RoomScopeSelect :model-value="selectedRoomId" :rooms="rooms" :loading="loadingRooms" @update:model-value="selectRoom" />

    <Alert v-if="roomsError" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('topology.feedback.roomsFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ roomsError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="loadRooms">{{ t('common.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <Alert v-if="topologyError" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('topology.feedback.topologyFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ topologyError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="loadTopology">{{ t('common.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <template v-if="loading && !displaySnapshot">
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

    <template v-else-if="displaySnapshot">
      <Alert v-if="resourceConflicts.length" variant="destructive">
        <CircleAlert />
        <AlertTitle>{{ t('topology.risks.conflictTitle', { count: resourceConflicts.length }) }}</AlertTitle>
        <AlertDescription>{{ t('topology.risks.conflictDescription') }}</AlertDescription>
        <AlertAction>
          <UiButton size="sm" variant="outline" @click="advancedOpen = true">{{ t('topology.advanced.viewDetails') }}</UiButton>
        </AlertAction>
      </Alert>

      <Alert v-else-if="resourceAdvisories.length">
        <TriangleAlert />
        <AlertTitle>{{ t('topology.risks.overlapTitle', { count: resourceAdvisoryPorts.length }) }}</AlertTitle>
        <AlertDescription>{{ t('topology.risks.overlapDescription') }}</AlertDescription>
        <AlertAction>
          <UiButton size="sm" variant="outline" @click="advancedOpen = true">{{ t('topology.advanced.viewDetails') }}</UiButton>
        </AlertAction>
      </Alert>

      <Alert v-else-if="infrastructureError" variant="destructive">
        <CircleAlert />
        <AlertTitle>{{ t('topology.risks.checkFailedTitle') }}</AlertTitle>
        <AlertDescription>{{ infrastructureError }}</AlertDescription>
      </Alert>

      <Alert v-else-if="displaySnapshot.issues.length" :variant="hasBlockingTopologyIssue ? 'destructive' : 'default'">
        <CircleAlert v-if="hasBlockingTopologyIssue" />
        <TriangleAlert v-else />
        <AlertTitle>{{ t('topology.risks.issueTitle', { count: displaySnapshot.issues.length }) }}</AlertTitle>
        <AlertDescription>{{ displaySnapshot.issues[0]?.message }}</AlertDescription>
        <AlertAction>
          <UiButton size="sm" variant="outline" @click="advancedOpen = true">{{ t('topology.advanced.viewDetails') }}</UiButton>
        </AlertAction>
      </Alert>

      <RoomPlacementCard
        :room-id="selectedRoomId"
        :room-name="selectedRoom?.name || ''"
        @updated="loadTopology"
      />

      <section class="flex min-w-0 flex-col gap-3" aria-labelledby="topology-placement-title">
        <div>
          <h2 id="topology-placement-title" class="text-base font-semibold">{{ t('topology.placements.title') }}</h2>
          <p class="mt-0.5 text-sm text-muted-foreground">{{ t('topology.placements.simpleDescription') }}</p>
        </div>
        <div class="overflow-x-auto rounded-lg border">
          <UiTable class="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('topology.placements.columns.world') }}</TableHead>
                <TableHead>{{ t('topology.placements.columns.applied') }}</TableHead>
                <TableHead>{{ t('topology.placements.columns.desired') }}</TableHead>
                <TableHead>{{ t('topology.placements.columns.state') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="placement in displaySnapshot.placements" :key="placement.worldId">
                <TableCell>
                  <div class="flex min-w-36 flex-wrap items-center gap-2">
                    <span class="font-medium">{{ placement.worldName }}</span>
                    <Badge variant="outline">{{ roleLabel(placement.worldRole) }}</Badge>
                  </div>
                </TableCell>
                <TableCell><span class="font-medium">{{ endpointName(placement.appliedTargetId, placement.appliedInstallationId) }}</span></TableCell>
                <TableCell><span class="font-medium">{{ endpointName(placement.desiredTargetId, placement.desiredInstallationId) }}</span></TableCell>
                <TableCell><Badge :variant="placementVariant(placement.state)">{{ placementStateLabel(placement.state) }}</Badge></TableCell>
              </TableRow>
            </TableBody>
          </UiTable>
        </div>
      </section>

      <div class="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
        <span class="text-sm font-medium">{{ t('topology.capacity.compactTitle') }}</span>
        <Badge
          v-for="target in displaySnapshot.targets"
          :key="target.id"
          :variant="capacityVariant(target.projectedCapacity?.state)"
        >
          {{ target.name || target.id }} · {{ capacityValue(target) }}
        </Badge>
        <span class="text-xs text-muted-foreground">{{ t('topology.capacity.compactHint') }}</span>
      </div>

      <Collapsible v-model:open="advancedOpen" class="rounded-lg border">
        <CollapsibleTrigger as-child>
          <UiButton variant="ghost" class="h-auto w-full justify-between rounded-lg px-4 py-3">
            <span class="flex min-w-0 items-center gap-2 text-left">
              <Settings data-icon="inline-start" />
              <span>
                <span class="block font-medium">{{ t('topology.advanced.title') }}</span>
                <span class="block text-xs font-normal text-muted-foreground">{{ t('topology.advanced.description') }}</span>
              </span>
            </span>
            <ChevronDown data-icon="inline-end" :class="cn({ 'rotate-180': advancedOpen })" />
          </UiButton>
        </CollapsibleTrigger>
        <CollapsibleContent class="flex min-w-0 flex-col gap-5 border-t p-4">
          <div class="flex flex-wrap gap-2">
            <UiButton variant="outline" :disabled="loadingRooms || rooms.length === 0" @click="openBatchDialog">
              <ListChecks data-icon="inline-start" />
              {{ t('topology.batch.open') }}
            </UiButton>
            <UiButton variant="outline" @click="router.push({ path: '/rooms/diagnostics', query: { roomId: selectedRoomId } })">
              <Activity data-icon="inline-start" />
              {{ t('topology.advanced.openDiagnostics') }}
            </UiButton>
          </div>

          <Alert>
            <Cpu />
            <AlertTitle>{{ t('topology.policy.title') }}</AlertTitle>
            <AlertDescription>{{ t('topology.policy.description') }}</AlertDescription>
          </Alert>

          <section class="flex min-w-0 flex-col gap-3" aria-labelledby="topology-capacity-title">
            <div>
              <h2 id="topology-capacity-title" class="text-base font-semibold">{{ t('topology.capacity.title') }}</h2>
              <p class="mt-0.5 text-sm text-muted-foreground">{{ t('topology.capacity.description') }}</p>
            </div>
            <div class="overflow-x-auto rounded-lg border">
              <UiTable class="min-w-[760px]">
                <TableHeader><TableRow>
                  <TableHead>{{ t('topology.capacity.columns.target') }}</TableHead>
                  <TableHead>{{ t('topology.capacity.columns.status') }}</TableHead>
                  <TableHead class="text-right">{{ t('topology.capacity.columns.observed') }}</TableHead>
                  <TableHead class="text-right">{{ t('topology.capacity.columns.projected') }}</TableHead>
                  <TableHead>{{ t('topology.capacity.columns.budget') }}</TableHead>
                </TableRow></TableHeader>
                <TableBody><TableRow v-for="target in displaySnapshot.targets" :key="target.id">
                  <TableCell><div class="font-medium">{{ target.name || target.id }}</div><div class="mt-1 font-mono text-xs text-muted-foreground">{{ target.id }}</div></TableCell>
                  <TableCell><div class="flex flex-wrap gap-1.5"><Badge :variant="target.online ? 'secondary' : 'destructive'">{{ target.online ? t('topology.target.online') : t('topology.target.offline') }}</Badge><Badge :variant="freshnessVariant(target)">{{ freshnessLabel(target) }}</Badge></div></TableCell>
                  <TableCell class="text-right tabular-nums">{{ target.observedRunningShards }}</TableCell>
                  <TableCell class="text-right font-medium tabular-nums">{{ target.projectedShards }}</TableCell>
                  <TableCell><div class="flex min-w-48 flex-col gap-1"><span>{{ capacityValue(target) }} · {{ capacityStateLabel(target.projectedCapacity?.state) }}</span><span class="text-xs text-muted-foreground">{{ physicalCoreLabel(target) }}</span></div></TableCell>
                </TableRow></TableBody>
              </UiTable>
            </div>
          </section>

          <RuntimeInfrastructurePanel
            :room-id="selectedRoomId"
            :topology-snapshot="topology"
            :show-kubernetes="false"
            :show-preflight="false"
            :show-environment-overview="false"
          />

          <section v-if="latestProvisionOperation || provisionOperationsError" class="flex min-w-0 flex-col gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-base font-semibold">{{ t('topology.provision.operationTitle') }}</h2>
              <Badge v-if="latestProvisionOperation" :variant="provisionStatusVariant(latestProvisionOperation.status)">{{ provisionStatusLabel(latestProvisionOperation.status) }}</Badge>
              <Badge v-if="latestProvisionOperation" variant="outline">{{ provisionPhaseLabel(latestProvisionOperation.phase) }}</Badge>
            </div>
            <Alert v-if="provisionOperationsError" variant="destructive"><CircleAlert /><AlertTitle>{{ t('topology.provision.operationsLoadFailedTitle') }}</AlertTitle><AlertDescription>{{ provisionOperationsError }}</AlertDescription></Alert>
            <Alert v-else-if="latestProvisionOperation?.failure" variant="destructive"><TriangleAlert /><AlertTitle>{{ t('topology.provision.operationFailure') }}</AlertTitle><AlertDescription>{{ latestProvisionOperation.failure }}</AlertDescription></Alert>
            <div v-if="latestProvisionOperation" class="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>{{ t('topology.provision.operationDescription', { time: formatTime(latestProvisionOperation.updatedAt) }) }}</span>
              <UiButton v-if="latestProvisionOperation.status === 'recovery_required'" size="sm" variant="outline" :disabled="Boolean(recoveringProvisionId)" @click="recoverProvision(latestProvisionOperation)"><Spinner v-if="recoveringProvisionId === latestProvisionOperation.id" data-icon="inline-start" /><History v-else data-icon="inline-start" />{{ t('topology.provision.recover') }}</UiButton>
            </div>
            <div v-if="latestProvisionOperation?.steps?.length" class="overflow-x-auto rounded-lg border">
              <UiTable class="min-w-[720px]">
                <TableHeader><TableRow><TableHead>{{ t('topology.provision.columns.world') }}</TableHead><TableHead>{{ t('topology.provision.columns.target') }}</TableHead><TableHead>{{ t('topology.provision.columns.phase') }}</TableHead><TableHead>{{ t('topology.provision.columns.size') }}</TableHead></TableRow></TableHeader>
                <TableBody><TableRow v-for="step in latestProvisionOperation.steps" :key="step.id">
                  <TableCell><span class="font-medium">{{ step.worldName }}</span></TableCell>
                  <TableCell>{{ endpointName(step.targetId, step.installationId) }}</TableCell>
                  <TableCell><div class="flex min-w-32 flex-col items-start gap-1"><Badge :variant="provisionStepVariant(step.phase)">{{ provisionStepLabel(step.phase) }}</Badge><span v-if="step.failure" class="text-xs text-destructive">{{ step.failure }}</span></div></TableCell>
                  <TableCell class="tabular-nums">{{ formatBytes(step.size) }}</TableCell>
                </TableRow></TableBody>
              </UiTable>
            </div>
          </section>

          <section v-if="resourceConflicts.length || resourceAdvisories.length || displaySnapshot.issues.length" class="flex min-w-0 flex-col gap-3" aria-labelledby="topology-issues-title">
            <div><h2 id="topology-issues-title" class="text-base font-semibold">{{ t('topology.issues.title') }}</h2><p class="mt-0.5 text-sm text-muted-foreground">{{ t('topology.issues.description') }}</p></div>
            <Alert v-for="(conflict, index) in resourceConflicts" :key="`resource:${conflict.code}:${index}`" variant="destructive"><CircleAlert /><AlertTitle>{{ conflict.code }}</AlertTitle><AlertDescription>{{ conflict.message }}</AlertDescription></Alert>
            <Alert v-if="resourceAdvisories.length">
              <TriangleAlert />
              <AlertTitle>{{ t('topology.risks.overlapTitle', { count: resourceAdvisoryPorts.length }) }}</AlertTitle>
              <AlertDescription class="flex flex-col gap-1">
                <span>{{ t('topology.risks.overlapDescription') }}</span>
                <span v-if="resourceAdvisoryPorts.length" class="font-mono text-xs">{{ t('topology.risks.overlapPorts', { ports: resourceAdvisoryPorts.join(', ') }) }}</span>
              </AlertDescription>
            </Alert>
            <Alert v-for="(issue, index) in displaySnapshot.issues" :key="`${issue.code}:${index}`" :variant="issue.severity === 'error' ? 'destructive' : 'default'"><CircleAlert v-if="issue.severity === 'error'" /><TriangleAlert v-else /><AlertTitle>{{ issue.code }}</AlertTitle><AlertDescription>{{ issue.message }}</AlertDescription></Alert>
          </section>
        </CollapsibleContent>
      </Collapsible>
    </template>

    <Dialog :open="batchOpen" @update:open="handleBatchOpenChange">
      <DialogScrollContent class="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{{ batchResult ? t('topology.batch.resultTitle') : t('topology.batch.title') }}</DialogTitle>
          <DialogDescription>
            {{ batchResult ? t('topology.batch.resultDescription') : t('topology.batch.description') }}
          </DialogDescription>
        </DialogHeader>

        <template v-if="batchResult">
          <Alert :variant="batchResult.outcome === 'none' ? 'destructive' : 'default'">
            <CircleCheck v-if="batchResult.outcome === 'full'" />
            <TriangleAlert v-else />
            <AlertTitle>{{ batchResultTitle }}</AlertTitle>
            <AlertDescription>{{ t('topology.batch.resultSummary', { succeeded: batchSucceeded, failed: batchFailed }) }}</AlertDescription>
          </Alert>
          <div class="overflow-hidden rounded-md border">
            <UiTable>
              <TableHeader>
                <TableRow>
                  <TableHead>{{ t('topology.batch.columns.target') }}</TableHead>
                  <TableHead>{{ t('topology.batch.columns.status') }}</TableHead>
                  <TableHead>{{ t('topology.batch.columns.message') }}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="target in batchResult.targets || []" :key="target.targetId">
                  <TableCell class="font-medium">{{ target.name }}</TableCell>
                  <TableCell><Badge :variant="batchTargetVariant(target.status)">{{ batchTargetStatus(target.status) }}</Badge></TableCell>
                  <TableCell class="max-w-sm text-sm text-muted-foreground">{{ target.error?.message || target.message || '--' }}</TableCell>
                </TableRow>
              </TableBody>
            </UiTable>
          </div>
        </template>

        <template v-else>
          <FieldGroup>
            <Field>
              <FieldLabel>{{ t('topology.batch.action') }}</FieldLabel>
              <ToggleGroup type="single" :model-value="batchAction" variant="outline" @update:model-value="setBatchAction">
                <ToggleGroupItem value="start"><Play data-icon="inline-start" />{{ t('topology.batch.actions.start') }}</ToggleGroupItem>
                <ToggleGroupItem value="stop"><Square data-icon="inline-start" />{{ t('topology.batch.actions.stop') }}</ToggleGroupItem>
                <ToggleGroupItem value="restart"><RotateCw data-icon="inline-start" />{{ t('topology.batch.actions.restart') }}</ToggleGroupItem>
                <ToggleGroupItem value="save"><Save data-icon="inline-start" />{{ t('topology.batch.actions.save') }}</ToggleGroupItem>
              </ToggleGroup>
              <FieldDescription>{{ t(`topology.batch.actionDescriptions.${batchAction}`) }}</FieldDescription>
            </Field>

            <div v-if="batchLoadingRooms" class="flex flex-col gap-2" :aria-label="t('topology.batch.loading')">
              <Skeleton v-for="index in 4" :key="index" class="h-24 w-full" />
            </div>

            <FieldSet v-for="room in batchRooms" v-else :key="room.id">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <FieldLegend>{{ room.name }}</FieldLegend>
                  <FieldDescription>{{ t('topology.batch.roomSummary', { selected: selectedBatchWorlds(room).length, eligible: eligibleBatchWorlds(room).length }) }}</FieldDescription>
                </div>
                <UiButton variant="ghost" size="sm" :disabled="eligibleBatchWorlds(room).length === 0 || batchSubmitting" @click="toggleBatchRoom(room)">
                  {{ isBatchRoomSelected(room) ? t('topology.batch.clearRoom') : t('topology.batch.selectRoom') }}
                </UiButton>
              </div>
              <Alert v-if="room.loadError" variant="destructive">
                <CircleAlert />
                <AlertTitle>{{ t('topology.batch.worldsFailed') }}</AlertTitle>
                <AlertDescription>{{ room.loadError }}</AlertDescription>
              </Alert>
              <FieldGroup v-else class="grid gap-2 sm:grid-cols-2">
                <Field
                  v-for="world in room.worlds"
                  :key="world.id"
                  orientation="horizontal"
                  :data-disabled="!isBatchWorldEligible(world) || undefined"
                >
                  <Checkbox
                    :id="`batch-${room.id}-${world.id}`"
                    :model-value="selectedBatchWorlds(room).includes(world.id)"
                    :disabled="!isBatchWorldEligible(world) || batchSubmitting"
                    @update:model-value="toggleBatchWorld(room.id, world.id, $event)"
                  />
                  <FieldContent>
                    <FieldLabel :for="`batch-${room.id}-${world.id}`" class="min-w-0 font-normal">
                      <span class="truncate">{{ world.name }}</span>
                      <Badge :variant="worldStatusVariant(world)">{{ worldStatusLabel(world, t) }}</Badge>
                    </FieldLabel>
                    <FieldDescription>{{ t('topology.batch.runtimeTarget', { name: world.runtimeTargetName || '--' }) }}</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>
            </FieldSet>
          </FieldGroup>

          <Alert>
            <Cpu />
            <AlertTitle>{{ t('topology.batch.capacityTitle') }}</AlertTitle>
            <AlertDescription>{{ t('topology.batch.capacityDescription') }}</AlertDescription>
          </Alert>
        </template>

        <DialogFooter>
          <template v-if="batchResult">
            <UiButton variant="outline" :disabled="batchRetrying" @click="handleBatchOpenChange(false)">{{ t('common.actions.close') }}</UiButton>
            <UiButton :disabled="batchRetrying || batchFailed === 0" @click="retryUnsuccessfulBatchTargets">
              <Spinner v-if="batchRetrying" data-icon="inline-start" />
              <RotateCw v-else data-icon="inline-start" />
              {{ t('topology.batch.retryFailed', { count: batchFailed }) }}
            </UiButton>
          </template>
          <template v-else>
            <UiButton variant="outline" :disabled="batchSubmitting || batchLoadingRooms" @click="handleBatchOpenChange(false)">{{ t('common.actions.cancel') }}</UiButton>
            <UiButton :disabled="batchSubmitting || batchLoadingRooms || selectedBatchWorldCount === 0" @click="submitBatchAction">
              <Spinner v-if="batchSubmitting" data-icon="inline-start" />
              <component :is="batchActionIcon" v-else data-icon="inline-start" />
              {{ batchSubmitting ? t('topology.batch.submitting') : t('topology.batch.submit', { rooms: selectedBatchRoomCount, worlds: selectedBatchWorldCount }) }}
            </UiButton>
          </template>
        </DialogFooter>
      </DialogScrollContent>
    </Dialog>

  </div>
</template>

<script setup>
import RoomScopeSelect from '@/components/layout/RoomScopeSelect.vue'
import { preferredRoomId } from '@/lib/pageScope.mjs'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Activity, ChevronDown, CircleAlert, CircleCheck, Cpu, History, ListChecks, Network, Play, RefreshCw, RotateCw, Save, Settings, Square, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { runtimeObservationsV2API, topologyV2API } from '@/api/v2'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { runtimeEndpointLabel } from '@/lib/roomPlacement.mjs'
import { cn } from '@/lib/utils'
import { waitForV2Job } from '@/api/v2ConfigurationAdapters'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle
} from '@/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import RoomPlacementCard from '@/components/rooms/RoomPlacementCard.vue'
import RuntimeInfrastructurePanel from '@/components/runtime/RuntimeInfrastructurePanel.vue'
import { executeWithCapacityConfirmation, isCapacityRiskCanceled } from '@/lib/startCapacityRisk'
import { attachBatchWorldTargets, selectedBatchRooms, unsuccessfulBatchSelection } from '@/lib/batchRoomActions.mjs'
import {
  canRequestStopWorld,
  canStartWorld,
  canStopWorld,
  worldStatusLabel,
  worldStatusVariant
} from '@/lib/worldRuntimeStatus.mjs'
import { RUNTIME_OBSERVATION_UPDATED_EVENT } from '@/lib/runtimeObservationStreams.mjs'
import { useRuntimeObservation } from '@/composables/useRuntimeObservation'

const { locale, t } = useI18n()
const route = useRoute()
const router = useRouter()
useRuntimeObservation()

const rooms = ref([])
const selectedRoomId = ref('')
const topology = ref(null)
const infrastructureSnapshot = ref(null)
const roomsError = ref('')
const topologyError = ref('')
const infrastructureError = ref('')
const loadingRooms = ref(false)
const loading = ref(false)
const provisionOperations = ref([])
const provisionOperationsError = ref('')
const recoveringProvisionId = ref('')
const batchOpen = ref(false)
const batchLoadingRooms = ref(false)
const batchSubmitting = ref(false)
const batchRetrying = ref(false)
const batchAction = ref('start')
const batchRooms = ref([])
const batchSelection = ref({})
const batchResult = ref(null)
const advancedOpen = ref(false)
let requestSequence = 0
let roomRequestSequence = 0

const displaySnapshot = computed(() => topology.value)
const resourceConflicts = computed(() => infrastructureSnapshot.value?.preflight?.conflicts || [])
const resourceAdvisories = computed(() => infrastructureSnapshot.value?.preflight?.advisories || [])
const resourceAdvisoryPorts = computed(() => [...new Set(resourceAdvisories.value.map(item => Number(item.port)).filter(Boolean))].sort((left, right) => left - right))
const hasBlockingTopologyIssue = computed(() => (displaySnapshot.value?.issues || []).some(issue => issue.severity === 'error'))
const selectedRoom = computed(() => rooms.value.find(room => String(room.id) === selectedRoomId.value))
const latestProvisionOperation = computed(() => provisionOperations.value[0] || null)
const selectedBatchRoomCount = computed(() => batchRooms.value.filter(room => selectedBatchWorlds(room).length > 0).length)
const selectedBatchWorldCount = computed(() => batchRooms.value.reduce((count, room) => count + selectedBatchWorlds(room).length, 0))
const batchActionIcon = computed(() => ({ start: Play, stop: Square, restart: RotateCw, save: Save }[batchAction.value] || Play))
const batchSucceeded = computed(() => (batchResult.value?.targets || []).filter(target => target.status === 'succeeded').length)
const batchFailed = computed(() => (batchResult.value?.targets || []).filter(target => target.status !== 'succeeded').length)
const batchResultTitle = computed(() => {
  const outcome = ['full', 'partial', 'none'].includes(batchResult.value?.outcome) ? batchResult.value.outcome : 'none'
  return t(`topology.batch.outcomes.${outcome}`)
})

function setTopology(value) {
  topology.value = value
}

function selectRoom(value) {
  const next = String(value || '')
  if (next === selectedRoomId.value) return
  selectedRoomId.value = next
  void router.replace({ query: { ...route.query, roomId: next || undefined } })
  void loadTopology()
}

async function loadRooms() {
  const sequence = ++roomRequestSequence
  loadingRooms.value = true
  roomsError.value = ''
  try {
    const response = await topologyV2API.rooms()
    if (sequence !== roomRequestSequence) return false
    rooms.value = response.items || []
    selectedRoomId.value = preferredRoomId(rooms.value, route.query.roomId)
    if (selectedRoomId.value) {
      void router.replace({ query: { ...route.query, roomId: selectedRoomId.value } })
      await loadTopology()
    } else {
      setTopology(null)
      infrastructureSnapshot.value = null
      infrastructureError.value = ''
      provisionOperations.value = []
      provisionOperationsError.value = ''
    }
    return true
  } catch (error) {
    if (sequence !== roomRequestSequence) return false
    roomsError.value = error.message || t('common.errors.unknown')
    return false
  } finally {
    if (sequence === roomRequestSequence) loadingRooms.value = false
  }
}

async function loadTopology({ refreshRuntime = true } = {}) {
  if (!selectedRoomId.value) return
  const roomId = selectedRoomId.value
  const sequence = ++requestSequence
  loading.value = true
  topologyError.value = ''
  infrastructureError.value = ''
  provisionOperationsError.value = ''
  try {
    if (refreshRuntime) {
      await runtimeObservationsV2API.refresh({ roomId })
    }
    const [topologyResult, operationsResult, infrastructureResult] = await Promise.allSettled([
      topologyV2API.get(roomId),
      topologyV2API.provisionOperations(roomId),
      topologyV2API.infrastructure()
    ])
    if (sequence !== requestSequence) return
    if (operationsResult.status === 'fulfilled') {
      provisionOperations.value = operationsResult.value.items || []
    } else {
      provisionOperationsError.value = operationsResult.reason?.message || t('common.errors.unknown')
    }
    if (infrastructureResult.status === 'fulfilled') {
      infrastructureSnapshot.value = infrastructureResult.value
      infrastructureError.value = ''
    } else {
      infrastructureSnapshot.value = null
      infrastructureError.value = infrastructureResult.reason?.message || t('common.errors.unknown')
    }
    if (topologyResult.status === 'rejected') throw topologyResult.reason
    setTopology(topologyResult.value)
    return true
  } catch (error) {
    if (sequence !== requestSequence) return
    setTopology(null)
    infrastructureSnapshot.value = null
    topologyError.value = error.message || t('common.errors.unknown')
    return false
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

async function recoverProvision(operation) {
  if (!operation?.id || recoveringProvisionId.value) return
  recoveringProvisionId.value = operation.id
  try {
    const submitted = await topologyV2API.recoverProvisionOperation(operation.id)
    await waitForV2Job(submitted, 10 * 60 * 1000)
    const refreshed = await loadTopology()
    if (refreshed) toast.success(t('topology.provision.recovered'))
    else toast.warning(t('topology.provision.completedRefreshFailed'))
  } catch (error) {
    await loadTopology()
    toast.error(t('topology.provision.recoverFailed', { error: error.message || t('common.errors.unknown') }))
  } finally {
    recoveringProvisionId.value = ''
  }
}

function endpointName(targetId, installationId) {
  return runtimeEndpointLabel(displaySnapshot.value || {}, targetId, installationId)
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

function provisionStatusLabel(status) {
  const key = ['running', 'succeeded', 'rolled_back', 'recovery_required', 'failed'].includes(status) ? status : 'unknown'
  return t(`topology.provision.statuses.${key}`)
}

function provisionStatusVariant(status) {
  if (status === 'succeeded') return 'secondary'
  if (status === 'failed' || status === 'recovery_required') return 'destructive'
  return 'outline'
}

function provisionPhaseLabel(phase) {
  const key = ['planned', 'uploading', 'commit_decided', 'topology_committed', 'completed', 'rolled_back'].includes(phase) ? phase : 'unknown'
  return t(`topology.provision.phases.${key}`)
}

function provisionStepLabel(phase) {
  const key = ['not_started', 'planned', 'uploading', 'published', 'existing', 'completed', 'rolled_back'].includes(phase) ? phase : 'unknown'
  return t(`topology.provision.stepPhases.${key}`)
}

function provisionStepVariant(phase) {
  if (phase === 'completed' || phase === 'existing') return 'secondary'
  return 'outline'
}

function roleLabel(role) {
  const key = ['master', 'caves', 'custom'].includes(role) ? role : 'unknown'
  return t(`topology.placements.roles.${key}`)
}

function formatTime(value) {
  return formatSystemDateTime(value, {
    locale: locale.value,
    fallback: t('topology.time.unavailable'),
    dateStyle: 'short',
    timeStyle: 'medium'
  })
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

async function openBatchDialog() {
  batchOpen.value = true
  batchResult.value = null
  batchAction.value = 'start'
  batchSelection.value = {}
  await loadBatchWorlds()
}

async function loadBatchWorlds() {
  batchLoadingRooms.value = true
  try {
    const results = await Promise.allSettled(rooms.value.map(room => Promise.all([
      topologyV2API.worlds(room.id),
      topologyV2API.get(room.id),
    ])))
    batchRooms.value = rooms.value.map((room, index) => {
      const result = results[index]
      if (result.status === 'fulfilled') {
        const [worldsResponse, topologyResponse] = result.value
        return {
          ...room,
          worlds: attachBatchWorldTargets(worldsResponse.items, topologyResponse),
          loadError: '',
        }
      }
      return { ...room, worlds: [], loadError: result.reason?.message || t('common.errors.unknown') }
    })
  } finally {
    batchLoadingRooms.value = false
  }
}

function handleBatchOpenChange(open) {
  if (!open && (batchSubmitting.value || batchRetrying.value)) return
  batchOpen.value = open
  if (!open) {
    batchResult.value = null
    batchRooms.value = []
    batchSelection.value = {}
  }
}

function isBatchWorldEligible(world) {
  if (batchAction.value === 'start') return canStartWorld(world)
  if (batchAction.value === 'stop') return canRequestStopWorld(world)
  if (batchAction.value === 'restart') return canStopWorld(world)
  return batchAction.value === 'save' && world?.status === 'running'
}

function eligibleBatchWorlds(room) {
  return (room.worlds || []).filter(isBatchWorldEligible)
}

function selectedBatchWorlds(room) {
  return Array.isArray(batchSelection.value[room.id]) ? batchSelection.value[room.id] : []
}

function isBatchRoomSelected(room) {
  const eligible = eligibleBatchWorlds(room)
  const selected = selectedBatchWorlds(room)
  return eligible.length > 0 && eligible.every(world => selected.includes(world.id))
}

function setBatchAction(value) {
  if (!value || value === batchAction.value) return
  batchAction.value = value
  const next = {}
  for (const room of batchRooms.value) {
    const eligible = new Set(eligibleBatchWorlds(room).map(world => world.id))
    next[room.id] = selectedBatchWorlds(room).filter(worldID => eligible.has(worldID))
  }
  batchSelection.value = next
}

function toggleBatchRoom(room) {
  batchSelection.value = {
    ...batchSelection.value,
    [room.id]: isBatchRoomSelected(room) ? [] : eligibleBatchWorlds(room).map(world => world.id)
  }
}

function toggleBatchWorld(roomID, worldID, checked) {
  const selected = Array.isArray(batchSelection.value[roomID]) ? batchSelection.value[roomID] : []
  batchSelection.value = {
    ...batchSelection.value,
    [roomID]: checked
      ? Array.from(new Set([...selected, worldID]))
      : selected.filter(id => id !== worldID)
  }
}

async function submitBatchAction() {
  const selectedRooms = selectedBatchRooms(batchRooms.value, batchSelection.value)
  if (selectedRooms.length === 0 || batchSubmitting.value) return
  batchSubmitting.value = true
  try {
    const submitted = await executeWithCapacityConfirmation(allowCapacityRisk => (
      topologyV2API.batchAction(batchAction.value, selectedRooms, allowCapacityRisk)
    ))
    batchResult.value = await waitForV2Job(submitted, 3 * 60 * 1000, undefined, { allowFailure: true })
    if (batchResult.value.outcome === 'full') {
      toast.success(t('topology.batch.feedback.completed'))
    } else {
      toast.warning(t('topology.batch.feedback.partial'))
    }
    if (selectedRoomId.value) await loadTopology()
  } catch (error) {
    if (isCapacityRiskCanceled(error)) return
    toast.error(t('topology.batch.feedback.failed', { error: error.message || t('common.errors.unknown') }))
  } finally {
    batchSubmitting.value = false
  }
}

async function retryUnsuccessfulBatchTargets() {
  if (!batchResult.value || batchRetrying.value) return
  const previousResult = batchResult.value
  batchRetrying.value = true
  toast.info(t('topology.batch.feedback.retrying'))
  try {
    await loadBatchWorlds()
    const retrySelection = unsuccessfulBatchSelection(previousResult, batchRooms.value)
    for (const room of batchRooms.value) {
      const eligible = new Set(eligibleBatchWorlds(room).map(world => world.id))
      retrySelection[room.id] = (retrySelection[room.id] || []).filter(worldId => eligible.has(worldId))
    }
    batchSelection.value = retrySelection
    batchResult.value = null
    if (selectedBatchWorldCount.value === 0) {
      toast.warning(t('topology.batch.noRetryableTargets'))
      return
    }
    await submitBatchAction()
  } finally {
    batchRetrying.value = false
  }
}

function batchTargetVariant(status) {
  if (status === 'succeeded') return 'secondary'
  if (status === 'failed') return 'destructive'
  return 'outline'
}

function batchTargetStatus(status) {
  const key = ['succeeded', 'failed', 'canceled'].includes(status) ? status : 'unknown'
  return t(`topology.batch.statuses.${key}`)
}

function handleRuntimeObservationUpdate() {
  if (document.visibilityState === 'hidden' || !selectedRoomId.value || loading.value) return
  void loadTopology({ refreshRuntime: false })
}

onMounted(() => {
  window.addEventListener(RUNTIME_OBSERVATION_UPDATED_EVENT, handleRuntimeObservationUpdate)
  void loadRooms()
})
onBeforeUnmount(() => window.removeEventListener(RUNTIME_OBSERVATION_UPDATED_EVENT, handleRuntimeObservationUpdate))
</script>

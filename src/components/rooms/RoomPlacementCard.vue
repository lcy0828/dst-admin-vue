<template>
  <Card size="sm">
    <CardHeader>
      <CardTitle class="flex items-center gap-2"><Network />{{ t('topology.roomPlacement.title') }}</CardTitle>
      <CardDescription>{{ t('topology.roomPlacement.description') }}</CardDescription>
      <CardAction class="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger as-child>
            <UiButton size="icon-sm" variant="ghost" :disabled="loading || applying" :aria-label="t('common.actions.refresh')" @click="loadTopology">
              <Spinner v-if="loading" />
              <RefreshCw v-else />
            </UiButton>
          </TooltipTrigger>
          <TooltipContent>{{ t('common.actions.refresh') }}</TooltipContent>
        </Tooltip>
        <UiButton size="sm" variant="outline" :disabled="loading || !topology" @click="openEditor()">
          <Settings2 data-icon="inline-start" />
          {{ t('topology.roomPlacement.actions.change') }}
        </UiButton>
      </CardAction>
    </CardHeader>
    <CardContent>
      <Skeleton v-if="loading && !topology" class="h-16 w-full" />
      <Alert v-else-if="loadError" variant="destructive">
        <CircleAlert />
        <AlertTitle>{{ t('topology.roomPlacement.feedback.loadFailedTitle') }}</AlertTitle>
        <AlertDescription>{{ loadError }}</AlertDescription>
        <AlertAction><UiButton size="sm" variant="outline" @click="loadTopology">{{ t('common.actions.retry') }}</UiButton></AlertAction>
      </Alert>
      <div v-else-if="topology" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="truncate font-medium">{{ appliedSummaryLabel }}</span>
            <Badge :variant="summaryVariant">{{ summaryStateLabel }}</Badge>
          </div>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ t('topology.roomPlacement.summary.worlds', { count: appliedSummary.worldCount }) }}
          </p>
        </div>
        <div class="flex flex-wrap gap-1.5 sm:justify-end">
          <Badge
            v-for="location in appliedSummary.locations"
            :key="`${location.targetId}:${location.installationId}`"
            variant="outline"
          >
            {{ endpointName(location.targetId, location.installationId) }}
          </Badge>
        </div>
      </div>
    </CardContent>
  </Card>

  <Dialog v-model:open="dialogOpen">
    <DialogScrollContent class="max-w-3xl">
      <DialogHeader>
        <DialogTitle>{{ t('topology.roomPlacement.dialog.title') }}</DialogTitle>
        <DialogDescription>{{ t('topology.roomPlacement.dialog.description') }}</DialogDescription>
      </DialogHeader>

      <FieldGroup>
        <Alert v-if="operationError" variant="destructive">
          <CircleAlert />
          <AlertTitle>{{ t('topology.roomPlacement.feedback.applyFailedTitle') }}</AlertTitle>
          <AlertDescription class="flex flex-col gap-1">
            <span>{{ operationError }}</span>
            <span v-for="conflict in operationConflicts" :key="`${conflict.code}-${conflict.targetId}-${conflict.worldId}-${conflict.port}`">
              {{ conflict.message }}
            </span>
          </AlertDescription>
        </Alert>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel for="room-placement-distributed">{{ t('topology.roomPlacement.mode.advancedLabel') }}</FieldLabel>
            <FieldDescription>{{ modeDescription }}</FieldDescription>
          </FieldContent>
          <UiSwitch
            id="room-placement-distributed"
            :model-value="draft.mode === ROOM_PLACEMENT_MODE.PER_WORLD"
            :disabled="applying"
            @update:model-value="togglePerWorldMode"
          />
        </Field>

        <Separator />

        <div class="min-h-56">
          <Field v-if="draft.mode === ROOM_PLACEMENT_MODE.COLOCATED">
            <FieldLabel>{{ t('topology.roomPlacement.target.roomLabel') }}</FieldLabel>
            <FieldDescription>{{ t('topology.roomPlacement.target.roomDescription') }}</FieldDescription>
            <RuntimeEndpointPicker
              :target-id="draft.roomTargetId"
              :installation-id="draft.roomInstallationId"
              :targets="configuredTargets"
              :label="t('topology.roomPlacement.target.roomLabel')"
              :description="t('topology.roomPlacement.target.roomDescription')"
              :placeholder="t('topology.roomPlacement.target.placeholder')"
              :search-placeholder="t('topology.roomPlacement.target.search')"
              :empty-label="t(configuredTargets.length ? 'topology.roomPlacement.target.noMatch' : 'topology.roomPlacement.target.empty')"
              :online-label="t('topology.target.online')"
              :offline-label="t('topology.target.offline')"
              :capacity-template="t('topology.roomPlacement.target.capacity', { projected: '{projected}', limit: '{limit}' })"
              :capacity-unknown="t('topology.roomPlacement.target.capacityUnknown')"
              :installation-label="t('topology.roomPlacement.installation.label')"
              :installation-placeholder="t('topology.roomPlacement.installation.placeholder')"
              :default-suffix="t('topology.roomPlacement.installation.defaultSuffix')"
              :disabled="applying"
              @update:target-id="setRoomTarget"
              @update:installation-id="setRoomInstallation"
            />
            <div class="mt-3 flex flex-wrap gap-1.5">
              <Badge v-for="placement in topology.placements" :key="placement.worldId" variant="outline">
                {{ placement.worldName }} · {{ roleLabel(placement.worldRole) }}
              </Badge>
            </div>
          </Field>

          <FieldSet v-else>
            <FieldLegend variant="label">{{ t('topology.roomPlacement.worlds.title') }}</FieldLegend>
            <FieldDescription>{{ t('topology.roomPlacement.worlds.description') }}</FieldDescription>
            <FieldGroup class="gap-3">
              <Field
                v-for="placement in topology.placements"
                :id="worldPlacementFieldId(placement.worldId)"
                :key="placement.worldId"
                orientation="responsive"
                class="rounded-lg border p-3 data-[focused=true]:border-primary data-[focused=true]:bg-primary/5"
                :data-focused="String(placement.worldId) === focusedWorldId ? 'true' : undefined"
              >
                <FieldContent>
                  <FieldLabel>{{ placement.worldName }}</FieldLabel>
                  <FieldDescription>
                    {{ roleLabel(placement.worldRole) }} · {{ t('topology.roomPlacement.worlds.current', { target: endpointName(placement.appliedTargetId, placement.appliedInstallationId) }) }}
                  </FieldDescription>
                </FieldContent>
                <RuntimeEndpointPicker
                  class="w-full sm:w-[30rem]"
                  :target-id="draft.worldTargets[String(placement.worldId)]"
                  :installation-id="draft.worldInstallations[String(placement.worldId)]"
                  :targets="configuredTargets"
                  :label="t('topology.roomPlacement.worlds.targetLabel', { world: placement.worldName })"
                  :description="t('topology.roomPlacement.worlds.current', { target: endpointName(placement.appliedTargetId, placement.appliedInstallationId) })"
                  :placeholder="t('topology.roomPlacement.target.placeholder')"
                  :search-placeholder="t('topology.roomPlacement.target.search')"
                  :empty-label="t(configuredTargets.length ? 'topology.roomPlacement.target.noMatch' : 'topology.roomPlacement.target.empty')"
                  :online-label="t('topology.target.online')"
                  :offline-label="t('topology.target.offline')"
                  :capacity-template="t('topology.roomPlacement.target.capacity', { projected: '{projected}', limit: '{limit}' })"
                  :capacity-unknown="t('topology.roomPlacement.target.capacityUnknown')"
                  :installation-label="t('topology.roomPlacement.installation.label')"
                  :installation-placeholder="t('topology.roomPlacement.installation.placeholder')"
                  :default-suffix="t('topology.roomPlacement.installation.defaultSuffix')"
                  :disabled="applying"
                  @update:target-id="value => setWorldTarget(placement.worldId, value)"
                  @update:installation-id="value => setWorldInstallation(placement.worldId, value)"
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </div>

        <ShardLinkSelector
          v-if="linkRequirements.distributed"
          :discovery="shardLinkDiscovery"
          :selected-links="draft.shardLinks"
          :manual-candidates="manualShardLinkCandidates"
          :loading="discoveringShardLinks"
          :error="shardLinkDiscoveryError"
          :disabled="applying || reviewing"
          @discover="discoverShardLinks"
          @select="selectShardLink"
          @add-manual="addManualShardLinkCandidate"
          @remove-manual="removeManualShardLinkCandidate"
        />

        <Alert v-if="draftExecutionChanges.length">
          <MoveRight />
          <AlertTitle>{{ t('topology.roomPlacement.review.changeTitle', { count: draftExecutionChanges.length }) }}</AlertTitle>
          <AlertDescription class="flex flex-col gap-1">
            <span v-for="placement in draftExecutionChanges" :key="placement.worldId">
              {{ placement.worldName }}：{{ endpointName(placement.appliedTargetId, placement.appliedInstallationId) }} → {{ endpointName(placement.targetId, placement.installationId) }}
            </span>
          </AlertDescription>
        </Alert>
        <Alert v-else-if="shardLinksDirty">
          <Network />
          <AlertTitle>{{ t('topology.roomPlacement.review.routeChangeTitle') }}</AlertTitle>
          <AlertDescription>{{ t('topology.roomPlacement.review.routeChangeDescription') }}</AlertDescription>
        </Alert>
        <Alert v-else-if="isDirty">
          <CircleAlert />
          <AlertTitle>{{ t('topology.roomPlacement.review.cancelTitle') }}</AlertTitle>
          <AlertDescription>{{ t('topology.roomPlacement.review.cancelDescription') }}</AlertDescription>
        </Alert>
        <Alert v-else>
          <CircleCheck />
          <AlertTitle>{{ t('topology.roomPlacement.review.noChangeTitle') }}</AlertTitle>
          <AlertDescription>{{ t('topology.roomPlacement.review.noChangeDescription') }}</AlertDescription>
        </Alert>

        <Alert v-if="reviewReady">
          <TriangleAlert />
          <AlertTitle>{{ t('topology.roomPlacement.review.confirmTitle') }}</AlertTitle>
          <AlertDescription>{{ reviewDescription }}</AlertDescription>
        </Alert>

        <Alert v-if="reviewReady && runningDraftExecutionChanges.length">
          <Power />
          <AlertTitle>{{ t('topology.roomPlacement.review.runtimeTitle', { count: runningDraftExecutionChanges.length }) }}</AlertTitle>
          <AlertDescription>{{ t('topology.roomPlacement.review.runtimeDescription') }}</AlertDescription>
        </Alert>

        <Alert v-if="previewIssues.length" :variant="previewHasBlocker ? 'destructive' : 'default'">
          <CircleAlert />
          <AlertTitle>{{ t('topology.roomPlacement.review.issueTitle', { count: previewIssues.length }) }}</AlertTitle>
          <AlertDescription class="flex flex-col gap-1">
            <span v-for="issue in previewIssues" :key="`${issue.code}-${issue.worldId}-${issue.targetId}`">{{ issue.message }}</span>
          </AlertDescription>
        </Alert>

        <Alert v-if="operationState === 'paused'">
          <Clock3 />
          <AlertTitle>{{ t('topology.roomPlacement.execution.pausedTitle') }}</AlertTitle>
          <AlertDescription>{{ t('topology.roomPlacement.execution.pausedDescription', { count: executionBlockers.length }) }}</AlertDescription>
        </Alert>

        <Alert v-if="operationState === 'completed'">
          <CircleCheck />
          <AlertTitle>{{ t('topology.roomPlacement.execution.completedTitle') }}</AlertTitle>
          <AlertDescription>{{ t('topology.roomPlacement.execution.completedDescription') }}</AlertDescription>
        </Alert>

        <div v-if="applying" class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-3 text-sm">
            <span>{{ operationLabel }}</span>
            <span class="tabular-nums text-muted-foreground">{{ operationProgress.completed }} / {{ operationProgress.total }}</span>
          </div>
          <Progress :model-value="operationPercent" />
        </div>
      </FieldGroup>

      <DialogFooter>
        <UiButton variant="outline" :disabled="applying || loading" @click="refreshEditor">
          <RefreshCw data-icon="inline-start" />{{ t('common.actions.refresh') }}
        </UiButton>
        <UiButton :disabled="!canSubmit" @click="reviewReady ? applyPlacementPlan() : reviewPlacementPlan()">
          <Spinner v-if="applying || reviewing" data-icon="inline-start" />
          <CheckCheck v-else-if="reviewReady" data-icon="inline-start" />
          <ScanSearch v-else data-icon="inline-start" />
          {{ primaryActionLabel }}
        </UiButton>
      </DialogFooter>
    </DialogScrollContent>
  </Dialog>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import {
  CheckCheck,
  CircleAlert,
  CircleCheck,
  Clock3,
  MoveRight,
  Network,
  Power,
  RefreshCw,
  ScanSearch,
  Settings2,
  TriangleAlert
} from '@lucide/vue'
import { topologyV2API } from '@/api/v2'
import { waitForV2Job } from '@/api/v2ConfigurationAdapters'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch as UiSwitch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import RuntimeEndpointPicker from './RuntimeEndpointPicker.vue'
import ShardLinkSelector from './ShardLinkSelector.vue'
import {
  ROOM_PLACEMENT_MODE,
  createRoomPlacementDraft,
  hasCompleteRoomPlacementShardLinks,
  isProvisionPlacement,
  pendingRoomPlacements,
  placementExecutionBlockers,
  placementRuntimeInterruptions,
  roomPlacementDiscoveryInput,
  roomPlacementChanges,
  roomPlacementInput,
  roomPlacementLinkRequirements,
  roomPlacementShardLinksChanged,
  roomPlacementShardLinksPending,
  roomPlacementSummary,
  runtimeEndpointLabel,
  runtimeInstallationId,
  shardLinkCandidateKey,
  shardLinkCandidateMode,
  shardLinkEndpointKey,
  switchRoomPlacementMode
} from '@/lib/roomPlacement.mjs'

const props = defineProps({
  roomId: { type: [String, Number], required: true },
  roomName: { type: String, default: '' },
  autoOpen: { type: Boolean, default: false },
  focusWorldId: { type: String, default: '' }
})

const emit = defineEmits(['updated'])
const { t } = useI18n()

const topology = ref(null)
const managedRoomName = ref('')
const loading = ref(false)
const loadError = ref('')
const dialogOpen = ref(false)
const focusedWorldId = ref('')
const reviewing = ref(false)
const applying = ref(false)
const reviewReady = ref(false)
const reviewSnapshot = ref(null)
const operationError = ref('')
const operationConflicts = ref([])
const operationState = ref('idle')
const operationLabel = ref('')
const operationProgress = reactive({ completed: 0, total: 0 })
const shardLinkDiscovery = ref(null)
const shardLinkDiscoveryError = ref('')
const discoveringShardLinks = ref(false)
const manualShardLinkCandidates = ref([])
const draft = reactive({
  mode: ROOM_PLACEMENT_MODE.COLOCATED,
  roomTargetId: '',
  roomInstallationId: '',
  worldTargets: {},
  worldInstallations: {},
  shardLinks: []
})
let requestSequence = 0
let shardLinkRequestSequence = 0
let shardLinkDiscoveryTimer = null
let lastShardLinkDiscoverySignature = ''
let autoOpenConsumed = false
let preservedWorldTargets = null
let preservedWorldInstallations = null

const configuredTargets = computed(() => (topology.value?.targets || []).filter(target => target.configured))
const appliedSummary = computed(() => roomPlacementSummary(topology.value || {}))
const pendingPlacements = computed(() => pendingRoomPlacements(topology.value || {}))
const pendingShardLinks = computed(() => roomPlacementShardLinksPending(topology.value || {}))
const executionBlockers = computed(() => placementExecutionBlockers(topology.value || {}))
const draftPlanChanges = computed(() => roomPlacementChanges(topology.value || {}, draft, 'desiredTargetId'))
const draftExecutionChanges = computed(() => roomPlacementChanges(topology.value || {}, draft, 'appliedTargetId'))
const runningDraftExecutionChanges = computed(() => placementRuntimeInterruptions(reviewSnapshot.value || topology.value || {}))
const shardLinksDirty = computed(() => roomPlacementShardLinksChanged(topology.value || {}, draft))
const isDirty = computed(() => draftPlanChanges.value.length > 0 || shardLinksDirty.value)
const linkRequirements = computed(() => roomPlacementLinkRequirements(topology.value || {}, draft))
const shardLinkDiscoverySignature = computed(() => JSON.stringify(roomPlacementDiscoveryInput(
  topology.value || {}, draft, manualShardLinkCandidates.value
)))
const shardLinkDiscoveryCurrent = computed(() => !linkRequirements.value.distributed || (
  lastShardLinkDiscoverySignature === shardLinkDiscoverySignature.value &&
  !shardLinkDiscoveryError.value
))
const hasCompleteDraft = computed(() => {
  const input = roomPlacementInput(topology.value || {}, draft)
  return input.placements.length > 0 &&
    input.placements.every(placement => Boolean(placement.targetId)) &&
    hasCompleteRoomPlacementShardLinks(topology.value || {}, draft)
})
const previewIssues = computed(() => (reviewSnapshot.value?.issues || []).filter(issue => issue.severity !== 'info'))
const previewHasBlocker = computed(() => previewIssues.value.some(issue => issue.severity === 'error'))
const operationPercent = computed(() => operationProgress.total > 0
  ? Math.round((operationProgress.completed / operationProgress.total) * 100)
  : 0)
const roomNameForConfirmation = computed(() => props.roomName.trim() || managedRoomName.value || String(props.roomId))
const modeDescription = computed(() => t(draft.mode === ROOM_PLACEMENT_MODE.COLOCATED
  ? 'topology.roomPlacement.mode.colocatedDescription'
  : 'topology.roomPlacement.mode.perWorldDescription'))
const appliedSummaryLabel = computed(() => {
  if (appliedSummary.value.endpointCount === 1) {
    const location = appliedSummary.value.locations[0]
    return endpointName(location.targetId, location.installationId)
  }
  if (appliedSummary.value.machineCount === 1) {
    return t('topology.roomPlacement.summary.installations', { count: appliedSummary.value.endpointCount })
  }
  return t('topology.roomPlacement.summary.distributed', { count: appliedSummary.value.machineCount })
})
const summaryVariant = computed(() => {
  if ((topology.value?.issues || []).some(issue => issue.severity === 'error')) return 'destructive'
  if (pendingPlacements.value.length || pendingShardLinks.value) return 'warning'
  return 'success'
})
const summaryStateLabel = computed(() => {
  if ((topology.value?.issues || []).some(issue => issue.severity === 'error')) return t('topology.roomPlacement.summary.conflict')
  if (pendingPlacements.value.length) return t('topology.roomPlacement.summary.pending', { count: pendingPlacements.value.length })
  if (pendingShardLinks.value) return t('topology.roomPlacement.summary.routePending')
  return t('topology.roomPlacement.summary.ready')
})
const reviewDescription = computed(() => {
  if (reviewSnapshot.value?.requiresOvercommitConfirmation) return t('topology.roomPlacement.review.overcommitDescription')
  if (draftExecutionChanges.value.length) return t('topology.roomPlacement.review.confirmDescription', { count: draftExecutionChanges.value.length })
  return t('topology.roomPlacement.review.saveOnlyDescription')
})
const canSubmit = computed(() => {
  if (applying.value || reviewing.value || discoveringShardLinks.value || !topology.value || !hasCompleteDraft.value || !shardLinkDiscoveryCurrent.value) return false
  if (reviewReady.value) return !previewHasBlocker.value
  return isDirty.value || pendingPlacements.value.length > 0 || pendingShardLinks.value
})
const primaryActionLabel = computed(() => {
  if (applying.value) return t('topology.roomPlacement.actions.applying')
  if (reviewing.value) return t('topology.roomPlacement.actions.reviewing')
  if (reviewReady.value) return t('topology.roomPlacement.actions.confirm')
  return t('topology.roomPlacement.actions.review')
})

watch(() => props.roomId, async () => {
  autoOpenConsumed = false
  await loadTopology()
  maybeAutoOpen()
})

watch(() => props.autoOpen, () => maybeAutoOpen())

watch(() => props.focusWorldId, (value, previous) => {
  if (value === previous) return
  autoOpenConsumed = false
  maybeAutoOpen()
})

watch(dialogOpen, open => {
  if (open) {
    queueShardLinkDiscovery()
    return
  }
  if (shardLinkDiscoveryTimer) clearTimeout(shardLinkDiscoveryTimer)
  shardLinkDiscoveryTimer = null
  shardLinkRequestSequence += 1
})

onMounted(async () => {
  await loadTopology()
  maybeAutoOpen()
})

function maybeAutoOpen() {
  if (!props.autoOpen || autoOpenConsumed || !topology.value) return
  autoOpenConsumed = true
  openEditor(props.focusWorldId)
}

function applyDraft(next) {
  draft.mode = next.mode
  draft.roomTargetId = next.roomTargetId
  draft.roomInstallationId = next.roomInstallationId
  draft.worldTargets = { ...next.worldTargets }
  draft.worldInstallations = { ...next.worldInstallations }
  draft.shardLinks = [...(next.shardLinks || [])]
  preservedWorldTargets = next.mode === ROOM_PLACEMENT_MODE.PER_WORLD
    ? { ...next.worldTargets }
    : null
  preservedWorldInstallations = next.mode === ROOM_PLACEMENT_MODE.PER_WORLD
    ? { ...next.worldInstallations }
    : null
}

function resetEditorState() {
  if (topology.value) {
    applyDraft(createRoomPlacementDraft(topology.value))
    manualShardLinkCandidates.value = (topology.value.shardLinks || []).map(link => ({
      address: link.address,
      port: link.port,
      name: t('topology.roomPlacement.shardLinks.savedCandidate')
    }))
  }
  shardLinkDiscovery.value = null
  shardLinkDiscoveryError.value = ''
  lastShardLinkDiscoverySignature = ''
  reviewReady.value = false
  reviewSnapshot.value = null
  operationError.value = ''
  operationConflicts.value = []
  operationState.value = 'idle'
  operationLabel.value = ''
  operationProgress.completed = 0
  operationProgress.total = 0
}

async function loadTopology() {
  const sequence = ++requestSequence
  loading.value = true
  loadError.value = ''
  try {
    const [snapshot, rooms] = await Promise.all([
      topologyV2API.get(props.roomId),
      topologyV2API.rooms().catch(() => ({ items: [] }))
    ])
    if (sequence !== requestSequence) return false
    topology.value = snapshot
    managedRoomName.value = (rooms.items || []).find(room => String(room.id) === String(props.roomId))?.name || ''
    if (!dialogOpen.value || !isDirty.value) resetEditorState()
    return true
  } catch (error) {
    if (sequence !== requestSequence) return false
    loadError.value = error.message || t('common.errors.unknown')
    return false
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function openEditor(worldId = '') {
  resetEditorState()
  focusedWorldId.value = topology.value?.placements?.some(placement => String(placement.worldId) === String(worldId))
    ? String(worldId)
    : ''
  if (focusedWorldId.value) changeMode(ROOM_PLACEMENT_MODE.PER_WORLD)
  dialogOpen.value = true
  queueShardLinkDiscovery()
  if (focusedWorldId.value) {
    nextTick(() => document.getElementById(worldPlacementFieldId(focusedWorldId.value))?.scrollIntoView({ block: 'nearest' }))
  }
}

function worldPlacementFieldId(worldId) {
  return `room-placement-world-${String(worldId).replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function clearReview() {
  reviewReady.value = false
  reviewSnapshot.value = null
  operationError.value = ''
  operationConflicts.value = []
  operationState.value = 'idle'
}

function changeMode(value) {
  if (!value) return
  const next = switchRoomPlacementMode(
    topology.value || {}, draft, value, preservedWorldTargets, preservedWorldInstallations
  )
  draft.mode = next.draft.mode
  draft.roomTargetId = next.draft.roomTargetId
  draft.roomInstallationId = next.draft.roomInstallationId
  draft.worldTargets = { ...next.draft.worldTargets }
  draft.worldInstallations = { ...next.draft.worldInstallations }
  preservedWorldTargets = next.preservedWorldTargets
  preservedWorldInstallations = next.preservedWorldInstallations
  clearReview()
  queueShardLinkDiscovery()
}

function togglePerWorldMode(enabled) {
  changeMode(enabled ? ROOM_PLACEMENT_MODE.PER_WORLD : ROOM_PLACEMENT_MODE.COLOCATED)
}

function setRoomTarget(value) {
  draft.roomTargetId = value
  draft.roomInstallationId = runtimeInstallationId(topology.value || {}, value)
  clearReview()
  queueShardLinkDiscovery()
}

function setRoomInstallation(value) {
  draft.roomInstallationId = value
  clearReview()
  queueShardLinkDiscovery()
}

function setWorldTarget(worldId, value) {
  draft.worldTargets = { ...draft.worldTargets, [String(worldId)]: value }
  draft.worldInstallations = {
    ...draft.worldInstallations,
    [String(worldId)]: runtimeInstallationId(topology.value || {}, value)
  }
  preservedWorldTargets = { ...draft.worldTargets }
  preservedWorldInstallations = { ...draft.worldInstallations }
  clearReview()
  queueShardLinkDiscovery()
}

function setWorldInstallation(worldId, value) {
  draft.worldInstallations = { ...draft.worldInstallations, [String(worldId)]: value }
  preservedWorldTargets = { ...draft.worldTargets }
  preservedWorldInstallations = { ...draft.worldInstallations }
  clearReview()
  queueShardLinkDiscovery()
}

function queueShardLinkDiscovery(delay = 250) {
  if (!dialogOpen.value || !topology.value) return
  if (shardLinkDiscoveryTimer) clearTimeout(shardLinkDiscoveryTimer)
  shardLinkDiscoveryTimer = setTimeout(() => {
    shardLinkDiscoveryTimer = null
    discoverShardLinks()
  }, delay)
}

async function discoverShardLinks() {
  if (!topology.value) return false
  if (!linkRequirements.value.distributed) {
    draft.shardLinks = []
    shardLinkDiscovery.value = null
    shardLinkDiscoveryError.value = ''
    lastShardLinkDiscoverySignature = shardLinkDiscoverySignature.value
    return true
  }

  const sequence = ++shardLinkRequestSequence
  const signature = shardLinkDiscoverySignature.value
  discoveringShardLinks.value = true
  shardLinkDiscoveryError.value = ''
  try {
    const result = await topologyV2API.discoverShardLinks(
      props.roomId,
      roomPlacementDiscoveryInput(topology.value, draft, manualShardLinkCandidates.value)
    )
    if (sequence !== shardLinkRequestSequence || signature !== shardLinkDiscoverySignature.value) return false
    shardLinkDiscovery.value = result
    lastShardLinkDiscoverySignature = signature
    applyShardLinkDiscoverySelections(result)
    return true
  } catch (error) {
    if (sequence !== shardLinkRequestSequence) return false
    shardLinkDiscovery.value = null
    lastShardLinkDiscoverySignature = ''
    shardLinkDiscoveryError.value = t('topology.roomPlacement.shardLinks.probeFailed', {
      error: error.message || t('common.errors.unknown')
    })
    return false
  } finally {
    if (sequence === shardLinkRequestSequence) discoveringShardLinks.value = false
  }
}

function applyShardLinkDiscoverySelections(result) {
  const current = new Map(draft.shardLinks.map(link => [
    shardLinkEndpointKey(link.sourceTargetId, link.sourceInstallationId),
    link
  ]))
  const selected = []
  for (const link of result.links || []) {
    const sourceKey = shardLinkEndpointKey(link.sourceTargetId, link.sourceInstallationId)
    const existing = current.get(sourceKey)
    const selectable = (link.candidates || []).filter(candidate => candidate.status !== 'unreachable')
    const existingCandidate = existing && selectable.find(candidate => (
      shardLinkCandidateKey(candidate.address, candidate.port) === shardLinkCandidateKey(existing.address, existing.port)
    ))
    const autoCandidate = link.autoSelected || (selectable.length === 1 ? selectable[0] : null)
    const candidate = existingCandidate || autoCandidate
    if (!candidate) continue
    selected.push(shardLinkInput(link, candidate))
  }
  draft.shardLinks = selected
}

function shardLinkInput(link, candidate) {
  return {
    sourceTargetId: link.sourceTargetId,
    sourceInstallationId: link.sourceInstallationId || '',
    address: candidate.address,
    port: Number(candidate.port),
    mode: shardLinkCandidateMode(candidate)
  }
}

function selectShardLink({ link, candidate }) {
  const sourceKey = shardLinkEndpointKey(link.sourceTargetId, link.sourceInstallationId)
  draft.shardLinks = [
    ...draft.shardLinks.filter(item => shardLinkEndpointKey(item.sourceTargetId, item.sourceInstallationId) !== sourceKey),
    shardLinkInput(link, candidate)
  ]
  clearReview()
}

function addManualShardLinkCandidate(candidate) {
  const key = shardLinkCandidateKey(candidate.address, candidate.port)
  if (!manualShardLinkCandidates.value.some(item => shardLinkCandidateKey(item.address, item.port) === key)) {
    manualShardLinkCandidates.value = [...manualShardLinkCandidates.value, candidate]
  }
  clearReview()
  queueShardLinkDiscovery(0)
}

function removeManualShardLinkCandidate(candidate) {
  const key = shardLinkCandidateKey(candidate.address, candidate.port)
  manualShardLinkCandidates.value = manualShardLinkCandidates.value.filter(item => shardLinkCandidateKey(item.address, item.port) !== key)
  clearReview()
  queueShardLinkDiscovery(0)
}

async function refreshEditor() {
  const loaded = await loadTopology()
  if (loadError.value) toast.error(t('topology.roomPlacement.feedback.loadFailed', { error: loadError.value }))
  if (loaded) queueShardLinkDiscovery(0)
}

async function reviewPlacementPlan() {
  if (!canSubmit.value) return
  reviewing.value = true
  operationError.value = ''
  operationConflicts.value = []
  try {
    const preview = await topologyV2API.preview(props.roomId, roomPlacementInput(topology.value, draft, false))
    reviewSnapshot.value = preview
    if (preview.issues?.some(issue => issue.severity === 'error')) {
      toast.error(t('topology.roomPlacement.feedback.blocked'))
      return
    }
    reviewReady.value = true
  } catch (error) {
    operationConflicts.value = resourcePreflightConflicts(error)
    operationError.value = t('topology.roomPlacement.feedback.previewFailed', { error: error.message || t('common.errors.unknown') })
    toast.error(operationError.value)
  } finally {
    reviewing.value = false
  }
}

async function applyPlacementPlan() {
  if (!canSubmit.value || !reviewReady.value) return
  applying.value = true
  operationError.value = ''
  operationConflicts.value = []
  operationState.value = 'running'
  try {
    let snapshot = topology.value
    if (isDirty.value) {
      operationLabel.value = t('topology.roomPlacement.execution.saving')
      snapshot = await topologyV2API.update(props.roomId, roomPlacementInput(
        topology.value,
        draft,
        Boolean(reviewSnapshot.value?.requiresOvercommitConfirmation)
      ))
      topology.value = snapshot
    }

    snapshot = await executePendingPlacements(snapshot)
    topology.value = snapshot
    applyDraft(createRoomPlacementDraft(snapshot))
    reviewReady.value = false
    reviewSnapshot.value = null

    if (pendingRoomPlacements(snapshot).length || roomPlacementShardLinksPending(snapshot)) {
      operationState.value = 'paused'
      toast.warning(t('topology.roomPlacement.feedback.planSaved'))
    } else {
      operationState.value = 'completed'
      toast.success(t('topology.roomPlacement.feedback.completed'))
    }
    emit('updated', snapshot)
  } catch (error) {
    const conflicts = resourcePreflightConflicts(error)
    const message = t('topology.roomPlacement.feedback.applyFailed', { error: error.message || t('common.errors.unknown') })
    operationState.value = 'failed'
    await loadTopology()
    operationError.value = message
    operationConflicts.value = conflicts
    operationState.value = 'failed'
    toast.error(message)
  } finally {
    applying.value = false
  }
}

function resourcePreflightConflicts(error) {
  const conflicts = error?.details?.preflight?.conflicts
  return Array.isArray(conflicts) ? conflicts.filter(item => item?.message) : []
}

async function executePendingPlacements(initialSnapshot) {
  let snapshot = initialSnapshot
  const initialPending = pendingRoomPlacements(snapshot)
  operationProgress.total = initialPending.length + (roomPlacementShardLinksPending(snapshot) ? 1 : 0)
  operationProgress.completed = 0
  let iterations = 0

  while (pendingRoomPlacements(snapshot).length && iterations <= initialPending.length + 1) {
    iterations += 1
    const pending = pendingRoomPlacements(snapshot)
    const blockers = placementExecutionBlockers(snapshot)
    if (blockers.length) return snapshot

    const migration = pending.find(placement => !isProvisionPlacement(snapshot, placement))
    const beforeApplied = pending.map(placement => (
      `${placement.worldId}:${placement.appliedTargetId}:${placement.appliedInstallationId || ''}`
    )).sort().join('|')
    if (migration) {
      operationLabel.value = t('topology.roomPlacement.execution.migrating', { world: migration.worldName })
      const submitted = await topologyV2API.applyPlacement(props.roomId, {
        worldId: migration.worldId,
        expectedRevision: snapshot.revision,
        confirmation: roomNameForConfirmation.value
      })
      await waitForV2Job(submitted, 10 * 60 * 1000)
      operationProgress.completed += 1
    } else {
      operationLabel.value = t('topology.roomPlacement.execution.provisioning', { count: pending.length })
      const submitted = await topologyV2API.provision(props.roomId, {
        expectedRevision: snapshot.revision,
        confirmation: roomNameForConfirmation.value
      })
      await waitForV2Job(submitted, 10 * 60 * 1000)
      operationProgress.completed += pending.length
    }
    snapshot = await topologyV2API.get(props.roomId)
    const afterPending = pendingRoomPlacements(snapshot)
    const afterApplied = afterPending.map(placement => (
      `${placement.worldId}:${placement.appliedTargetId}:${placement.appliedInstallationId || ''}`
    )).sort().join('|')
    if (afterPending.length && afterPending.length >= pending.length && afterApplied === beforeApplied) {
      throw new Error(t('topology.roomPlacement.execution.notAdvanced'))
    }
  }
  if (!pendingRoomPlacements(snapshot).length && roomPlacementShardLinksPending(snapshot)) {
    operationLabel.value = t('topology.roomPlacement.execution.routing')
    snapshot = await topologyV2API.applyShardLinks(props.roomId, { expectedRevision: snapshot.revision })
    operationProgress.completed += 1
  }

  return snapshot
}

function endpointName(targetId, installationId) {
  return runtimeEndpointLabel(topology.value || {}, targetId, installationId)
}

function roleLabel(role) {
  const key = ['master', 'caves', 'custom'].includes(role) ? role : 'unknown'
  return t(`topology.placements.roles.${key}`)
}
</script>

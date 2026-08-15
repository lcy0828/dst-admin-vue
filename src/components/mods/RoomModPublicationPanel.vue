<template>
  <Card>
    <CardHeader class="gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div class="min-w-0">
        <CardTitle>{{ t('mods.publication.title') }}</CardTitle>
        <CardDescription>{{ t('mods.publication.description') }}</CardDescription>
      </div>
      <CardAction class="flex flex-wrap gap-2 sm:justify-end">
        <UiButton size="sm" variant="outline" :disabled="!canPreview" @click="previewPublication">
          <Spinner v-if="previewing" data-icon="inline-start" />
          <ScanSearch v-else data-icon="inline-start" />
          {{ t('mods.publication.actions.preview') }}
        </UiButton>
        <UiButton size="sm" :disabled="!canPublish" @click="publishPlan">
          <Spinner v-if="publishing" data-icon="inline-start" />
          <Send v-else data-icon="inline-start" />
          {{ t('mods.publication.actions.publish') }}
        </UiButton>
      </CardAction>
    </CardHeader>

    <CardContent class="flex flex-col gap-4">
      <Alert v-if="availability === 'unavailable'">
        <CircleAlert />
        <AlertTitle>{{ t('mods.publication.unavailable.title') }}</AlertTitle>
        <AlertDescription>{{ t('mods.publication.unavailable.description') }}</AlertDescription>
      </Alert>

      <Alert v-else-if="errorMessage" variant="destructive">
        <TriangleAlert />
        <AlertTitle>{{ t('mods.publication.loadFailedTitle') }}</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
        <AlertAction>
          <UiButton size="sm" variant="outline" @click="loadPublicationState">
            {{ t('mods.actions.retry') }}
          </UiButton>
        </AlertAction>
      </Alert>

      <div v-if="loading" class="flex flex-col gap-3">
        <Skeleton class="h-5 w-48" />
        <Skeleton class="h-16 w-full" />
      </div>

      <template v-else-if="availability !== 'unavailable'">
        <FieldGroup>
          <Field>
            <FieldLabel>{{ t('mods.publication.activation.field') }}</FieldLabel>
            <ToggleGroup type="single" variant="outline" :model-value="activationMode" @update:model-value="setActivationMode">
              <ToggleGroupItem value="manual" class="flex-1">{{ t('mods.publication.activation.manual') }}</ToggleGroupItem>
              <ToggleGroupItem value="restart" class="flex-1">{{ t('mods.publication.activation.restart') }}</ToggleGroupItem>
            </ToggleGroup>
            <FieldDescription>{{ t(`mods.publication.activation.descriptions.${activationMode}`) }}</FieldDescription>
          </Field>
        </FieldGroup>

        <Alert v-if="activationMode === 'restart'">
          <RotateCw />
          <AlertTitle>{{ t('mods.publication.activation.restartTitle') }}</AlertTitle>
          <AlertDescription>{{ t('mods.publication.activation.restartDescription') }}</AlertDescription>
        </Alert>

        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {{ t('mods.publication.fields.topologyRevision') }}:
            {{ displayedRevision || t('mods.publication.values.unavailable') }}
          </Badge>
          <Badge v-if="plan" :variant="plan.ready ? 'default' : 'destructive'">
            {{ t(plan.ready ? 'mods.publication.values.ready' : 'mods.publication.values.blocked') }}
          </Badge>
          <Badge v-if="planWarnings.length" variant="outline">
            {{ t('mods.publication.summary.warnings', { count: planWarnings.length }) }}
          </Badge>
          <Badge v-if="planBlockers.length" variant="destructive">
            {{ t('mods.publication.summary.blockers', { count: planBlockers.length }) }}
          </Badge>
        </div>

        <Alert v-for="(blocker, index) in planBlockers" :key="`blocker:${blocker.code || index}`" variant="destructive">
          <TriangleAlert />
          <AlertTitle>{{ blockerLabel(blocker) }}</AlertTitle>
          <AlertDescription>{{ blocker.message || blocker.code }}</AlertDescription>
        </Alert>

        <Alert v-for="(warning, index) in planWarnings" :key="`warning:${warning.code || index}`">
          <CircleAlert />
          <AlertTitle>{{ t('mods.publication.values.warning') }}</AlertTitle>
          <AlertDescription>{{ warning.message || warning.code || warning }}</AlertDescription>
        </Alert>

        <div v-if="planTargets.length" class="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('mods.publication.fields.target') }}</TableHead>
                <TableHead>{{ t('mods.publication.fields.worlds') }}</TableHead>
                <TableHead>{{ t('mods.publication.fields.mods') }}</TableHead>
                <TableHead>{{ t('mods.publication.fields.requiredBytes') }}</TableHead>
                <TableHead>{{ t('mods.publication.fields.status') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="target in planTargets" :key="targetKey(target)">
                <TableCell>
                  <div class="flex min-w-40 flex-col gap-1">
                    <span class="font-medium">{{ publicationTargetName(target) }}</span>
                    <span class="font-mono text-xs text-muted-foreground">{{ target.targetId || '--' }}</span>
                  </div>
                </TableCell>
                <TableCell>{{ targetWorldNames(target) }}</TableCell>
                <TableCell>{{ (target.mods || target.modIds || []).length }}</TableCell>
                <TableCell>{{ formatBytes(target.requiredBytes) }}</TableCell>
                <TableCell>
                  <Badge :variant="target.online === false || (target.blockers || []).length ? 'destructive' : 'secondary'">
                    {{ t(target.online === false ? 'mods.publication.values.offline' : (target.blockers || []).length ? 'mods.publication.values.blocked' : 'mods.publication.values.ready') }}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <Separator v-if="plan || latestPublication" />

        <div v-if="latestPublication" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <p class="font-medium">{{ t('mods.publication.latest.title') }}</p>
            <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge :variant="publicationStatusVariant(latestPublication.status)">
                {{ statusLabel(latestPublication.status) }}
              </Badge>
              <span>{{ outcomeLabel(latestPublication.outcome) }}</span>
              <span>{{ formatTime(latestPublication.updatedAt || latestPublication.createdAt) }}</span>
            </div>
          </div>
          <UiButton size="sm" variant="outline" @click="openStatus(latestPublication)">
            <ListTree data-icon="inline-start" />
            {{ t('mods.publication.actions.viewStatus') }}
          </UiButton>
        </div>

        <Empty v-else-if="!plan" class="py-4">
          <EmptyDescription>{{ t('mods.publication.latest.empty') }}</EmptyDescription>
        </Empty>
      </template>
    </CardContent>
  </Card>

  <Dialog v-model:open="statusDialogOpen">
    <DialogContent class="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>{{ t('mods.publication.statusDialog.title') }}</DialogTitle>
        <DialogDescription>
          {{ t('mods.publication.statusDialog.description', { id: selectedPublication?.id || '--' }) }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="selectedPublication" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <Badge :variant="publicationStatusVariant(selectedPublication.status)">
            {{ statusLabel(selectedPublication.status) }}
          </Badge>
          <Badge variant="outline">{{ outcomeLabel(selectedPublication.outcome) }}</Badge>
          <Badge :variant="publicationActivationStatusVariant(selectedPublication.activation?.status)">
            {{ t('mods.publication.activation.badge', { status: activationStatusLabel(selectedPublication.activation?.status) }) }}
          </Badge>
          <span class="text-sm text-muted-foreground">
            {{ t('mods.publication.fields.topologyRevision') }}:
            {{ selectedPublication.plan?.topologyRevision || '--' }}
          </span>
        </div>

        <Progress :model-value="publicationProgress(selectedPublication)" :aria-label="t('mods.publication.fields.progress')" />

        <Alert v-if="selectedPublication.errorMessage" variant="destructive">
          <TriangleAlert />
          <AlertTitle>{{ selectedPublication.errorCode || t('mods.publication.states.failed') }}</AlertTitle>
          <AlertDescription>{{ selectedPublication.errorMessage }}</AlertDescription>
        </Alert>

        <Alert v-if="selectedPublication.activation?.errorMessage" variant="destructive">
          <TriangleAlert />
          <AlertTitle>{{ selectedPublication.activation.errorCode || t('mods.publication.activation.failedTitle') }}</AlertTitle>
          <AlertDescription>{{ selectedPublication.activation.errorMessage }}</AlertDescription>
        </Alert>

        <Alert v-else-if="selectedPublication.restartRequired">
          <CircleAlert />
          <AlertTitle>{{ t('mods.publication.activation.requiredTitle') }}</AlertTitle>
          <AlertDescription>{{ t('mods.publication.activation.requiredDescription') }}</AlertDescription>
          <AlertAction>
            <UiButton size="sm" :disabled="!canActivateSelected || activating" @click="activateSelected">
              <Spinner v-if="activating" data-icon="inline-start" />
              <RotateCw v-else data-icon="inline-start" />
              {{ t('mods.publication.actions.activate') }}
            </UiButton>
          </AlertAction>
        </Alert>

        <div class="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('mods.publication.fields.target') }}</TableHead>
                <TableHead>{{ t('mods.publication.fields.worlds') }}</TableHead>
                <TableHead>{{ t('mods.publication.fields.phase') }}</TableHead>
                <TableHead>{{ t('mods.publication.fields.status') }}</TableHead>
                <TableHead>{{ t('mods.publication.fields.progress') }}</TableHead>
                <TableHead>{{ t('mods.publication.fields.message') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="target in selectedPublication.targets || []" :key="targetKey(target)">
                <TableCell>{{ publicationTargetName(target) }}</TableCell>
                <TableCell>{{ resultWorldNames(target) }}</TableCell>
                <TableCell>{{ phaseLabel(publicationTargetPhase(target)) }}</TableCell>
                <TableCell><Badge :variant="publicationStatusVariant(target.status)">{{ statusLabel(target.status) }}</Badge></TableCell>
                <TableCell class="min-w-32">
                  <div class="flex items-center gap-2">
                    <Progress :model-value="publicationProgress(target)" :aria-label="`${publicationTargetName(target)} ${t('mods.publication.fields.progress')}`" />
                    <span class="text-xs text-muted-foreground">{{ publicationProgress(target) }}%</span>
                  </div>
                </TableCell>
                <TableCell>{{ target.errorMessage || target.error?.message || statusLabel(target.status) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div v-if="selectedPublication.activation?.shards?.length" class="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('mods.publication.activation.columns.world') }}</TableHead>
                <TableHead>{{ t('mods.publication.activation.columns.target') }}</TableHead>
                <TableHead>{{ t('mods.publication.activation.columns.status') }}</TableHead>
                <TableHead>{{ t('mods.publication.activation.columns.runtime') }}</TableHead>
                <TableHead>{{ t('mods.publication.activation.columns.evidence') }}</TableHead>
                <TableHead>{{ t('mods.publication.activation.columns.observedAt') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="shard in selectedPublication.activation.shards" :key="`${shard.roomId}:${shard.worldId}`">
                <TableCell class="font-medium">{{ activationWorldName(shard) }}</TableCell>
                <TableCell>{{ shard.targetId || '--' }}</TableCell>
                <TableCell><Badge :variant="publicationActivationStatusVariant(shard.status)">{{ activationStatusLabel(shard.status) }}</Badge></TableCell>
                <TableCell>{{ shard.runtimeState || '--' }}</TableCell>
                <TableCell>{{ shard.loadMarker || shard.errorMessage || '--' }}</TableCell>
                <TableCell>{{ formatTime(shard.loadConfirmedAt || shard.updatedAt) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <DialogFooter>
        <UiButton variant="outline" @click="statusDialogOpen = false">{{ t('mods.actions.close') }}</UiButton>
        <UiButton v-if="canRetrySelected" :disabled="retrying" @click="retryFailed">
          <Spinner v-if="retrying" data-icon="inline-start" />
          <RotateCw v-else data-icon="inline-start" />
          {{ t('mods.publication.actions.retryFailed') }}
        </UiButton>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleAlert, ListTree, RotateCw, ScanSearch, Send, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { modApi } from '@/api'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription } from '@/components/ui/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  isModPublicationUnavailable,
  publicationActivationStatusKey,
  publicationActivationStatusVariant,
  publicationBlockerKey,
  publicationCanActivate,
  publicationNeedsPolling,
  publicationOutcomeKey,
  publicationPhaseKey,
  publicationProgress,
  publicationStatusKey,
  publicationStatusVariant,
  publicationTargetPhase,
  publicationTargetName,
  publicationTargetWorlds
} from '@/lib/modPublication.mjs'

const props = defineProps({
  roomId: { type: String, default: '' },
  worlds: { type: Array, default: () => [] },
  mods: { type: Array, default: () => [] }
})

const emit = defineEmits(['published'])
const { locale, t } = useI18n()

const availability = ref('unknown')
const loading = ref(false)
const previewing = ref(false)
const publishing = ref(false)
const retrying = ref(false)
const activating = ref(false)
const activationMode = ref('manual')
const errorMessage = ref('')
const topology = ref(null)
const plan = ref(null)
const publications = ref([])
const selectedPublication = ref(null)
const statusDialogOpen = ref(false)
let pollTimer = 0
let requestSequence = 0

const latestPublication = computed(() => publications.value[0] || null)
const planTargets = computed(() => plan.value?.targets || [])
const planWarnings = computed(() => plan.value?.warnings || [])
const planBlockers = computed(() => plan.value?.blockers || [])
const displayedRevision = computed(() => plan.value?.topologyRevision || topology.value?.revision || topology.value?.topologyRevision || latestPublication.value?.plan?.topologyRevision || '')
const canPreview = computed(() => availability.value !== 'unavailable' && Boolean(props.roomId) && props.worlds.length > 0 && !loading.value && !previewing.value && !publishing.value)
const canPublish = computed(() => Boolean(plan.value?.ready && plan.value?.planHash) && !publishing.value && !previewing.value)
const canRetrySelected = computed(() => ['failed', 'recovery_required', 'rolled_back'].includes(String(selectedPublication.value?.status || '').toLowerCase()))
const canActivateSelected = computed(() => publicationCanActivate(selectedPublication.value))

watch(() => props.roomId, () => {
  plan.value = null
  selectedPublication.value = null
  statusDialogOpen.value = false
  stopPolling()
  loadPublicationState()
}, { immediate: true })

onBeforeUnmount(stopPolling)

function normalizePlan(value) {
  return value?.plan || value || null
}

function normalizePublication(value) {
  return value?.publication || value || null
}

function publicationInput() {
  const revision = topology.value?.revision || topology.value?.topologyRevision || ''
  return {
    roomId: props.roomId,
    action: 'reconcile',
    modIds: props.mods.map(mod => mod.modid || mod.id).filter(Boolean),
    worldIds: props.worlds.map(world => world.id).filter(Boolean),
    includeDependencies: true,
    activation: activationMode.value === 'restart'
      ? { mode: 'restart', loadConfirmation: 'logs', timeoutSeconds: 300 }
      : { mode: 'manual', loadConfirmation: 'none', timeoutSeconds: 300 },
    ...(revision ? { expectedTopologyRevision: revision } : {})
  }
}

function setActivationMode(value) {
  if (!['manual', 'restart'].includes(value) || value === activationMode.value) return
  activationMode.value = value
  plan.value = null
}

async function loadPublicationState() {
  const sequence = ++requestSequence
  if (!props.roomId) {
    availability.value = 'unknown'
    publications.value = []
    topology.value = null
    return
  }
  loading.value = true
  errorMessage.value = ''
  const [listResult, topologyResult] = await Promise.allSettled([
    modApi.listModPublications({ roomId: props.roomId, limit: 10 }),
    modApi.getRoomTopology(props.roomId)
  ])
  if (sequence !== requestSequence) return
  if (topologyResult.status === 'fulfilled') topology.value = topologyResult.value
  if (listResult.status === 'fulfilled') {
    availability.value = 'available'
    const value = listResult.value
    publications.value = Array.isArray(value) ? value : value.items || value.publications || []
  } else if (isModPublicationUnavailable(listResult.reason)) {
    availability.value = 'unavailable'
    publications.value = []
  } else {
    availability.value = 'available'
    errorMessage.value = listResult.reason?.message || t('mods.publication.errors.unknown')
  }
  loading.value = false
}

async function previewPublication() {
  if (!canPreview.value) return null
  previewing.value = true
  errorMessage.value = ''
  try {
    plan.value = normalizePlan(await modApi.previewModPublication(publicationInput()))
    availability.value = 'available'
    toast.success(t('mods.publication.feedback.previewReady'))
    return plan.value
  } catch (error) {
    if (isModPublicationUnavailable(error)) {
      availability.value = 'unavailable'
      return null
    }
    errorMessage.value = error.message || t('mods.publication.errors.unknown')
    toast.error(t('mods.publication.feedback.previewFailed', { error: errorMessage.value }))
    return null
  } finally {
    previewing.value = false
  }
}

async function publishPlan() {
  if (!canPublish.value) return
  publishing.value = true
  errorMessage.value = ''
  try {
    const publication = normalizePublication(await modApi.createModPublication({
      ...publicationInput(),
      planHash: plan.value.planHash,
      expectedTopologyRevision: plan.value.topologyRevision || displayedRevision.value,
      confirmation: plan.value.planHash
    }))
    if (publication) {
      selectedPublication.value = publication
      publications.value = [publication, ...publications.value.filter(item => item.id !== publication.id)]
      statusDialogOpen.value = true
      startPolling(publication)
    }
    plan.value = null
    emit('published', publication)
    toast.success(t('mods.publication.feedback.submitted'))
  } catch (error) {
    errorMessage.value = error.message || t('mods.publication.errors.unknown')
    toast.error(t('mods.publication.feedback.publishFailed', { error: errorMessage.value }))
  } finally {
    publishing.value = false
  }
}

function openStatus(publication) {
  selectedPublication.value = publication
  statusDialogOpen.value = true
  startPolling(publication)
}

function startPolling(publication) {
  stopPolling()
  if (!publication?.id || !publicationNeedsPolling(publication)) return
  pollTimer = window.setTimeout(refreshSelectedPublication, 1500)
}

function stopPolling() {
  if (pollTimer) window.clearTimeout(pollTimer)
  pollTimer = 0
}

async function refreshSelectedPublication() {
  const publicationId = selectedPublication.value?.id
  if (!publicationId) return
  try {
    const publication = normalizePublication(await modApi.getModPublication(publicationId))
    selectedPublication.value = publication
    publications.value = [publication, ...publications.value.filter(item => item.id !== publication.id)]
    startPolling(publication)
  } catch (error) {
    errorMessage.value = error.message || t('mods.publication.errors.unknown')
  }
}

async function retryFailed() {
  if (!selectedPublication.value?.id || retrying.value) return
  retrying.value = true
  try {
    const publication = normalizePublication(await modApi.retryModPublication(selectedPublication.value.id))
    selectedPublication.value = publication
    publications.value = [publication, ...publications.value.filter(item => item.id !== publication.id)]
    startPolling(publication)
    toast.success(t('mods.publication.feedback.retrySubmitted'))
  } catch (error) {
    toast.error(t('mods.publication.feedback.retryFailed', { error: error.message || t('mods.publication.errors.unknown') }))
  } finally {
    retrying.value = false
  }
}

async function activateSelected() {
  if (!canActivateSelected.value || activating.value) return
  activating.value = true
  try {
    const publication = normalizePublication(await modApi.activateModPublication(selectedPublication.value.id))
    selectedPublication.value = publication
    publications.value = [publication, ...publications.value.filter(item => item.id !== publication.id)]
    startPolling(publication)
    toast.success(t('mods.publication.feedback.activationSubmitted'))
  } catch (error) {
    toast.error(t('mods.publication.feedback.activationFailed', { error: error.message || t('mods.publication.errors.unknown') }))
  } finally {
    activating.value = false
  }
}

function statusLabel(status) {
  return t(`mods.publication.states.${publicationStatusKey(status)}`)
}

function phaseLabel(phase) {
  return t(`mods.publication.phases.${publicationPhaseKey(phase)}`)
}

function outcomeLabel(outcome) {
  return t(`mods.publication.outcomes.${publicationOutcomeKey(outcome)}`)
}

function activationStatusLabel(status) {
  return t(`mods.publication.activation.statuses.${publicationActivationStatusKey(status)}`)
}

function activationWorldName(shard) {
  const world = props.worlds.find(item => item.id === shard.worldId)
  return world?.name || world?.displayName || world?.directoryName || shard.worldId || '--'
}

function blockerLabel(blocker) {
  const key = publicationBlockerKey(blocker?.code)
  return key === 'unknown' && blocker?.code
    ? blocker.code
    : t(`mods.publication.blockers.${key}`)
}

function targetKey(target) {
  return `${target.targetId || target.nodeId || 'target'}:${target.installationId || ''}`
}

function targetWorldNames(target) {
  return publicationTargetWorlds(target).join(', ') || '--'
}

function resultWorldNames(target) {
  const planTarget = (selectedPublication.value?.plan?.targets || []).find(item => item.targetId === target.targetId && (!target.installationId || item.installationId === target.installationId))
  return targetWorldNames(planTarget || target)
}

function formatBytes(value) {
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes <= 0) return '--'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / (1024 ** index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function formatTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'short', timeStyle: 'medium' }).format(date)
}
</script>

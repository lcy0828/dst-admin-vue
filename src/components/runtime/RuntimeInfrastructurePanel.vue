<template>
  <section class="flex min-w-0 flex-col gap-3" aria-labelledby="runtime-infrastructure-title">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 id="runtime-infrastructure-title" class="text-base font-semibold">{{ t('distributed.infrastructure.title') }}</h2>
        <p class="mt-0.5 text-sm text-muted-foreground">{{ t('distributed.infrastructure.description') }}</p>
      </div>
      <UiButton size="sm" variant="outline" :disabled="loading" @click="loadInfrastructure">
        <Spinner v-if="loading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        {{ t('common.actions.refresh') }}
      </UiButton>
    </div>

    <Alert v-if="error" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('distributed.infrastructure.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <KubernetesProviderPanel :heading-level="3" />

    <div v-if="loading && !snapshot" class="flex flex-col gap-2" :aria-label="t('distributed.infrastructure.loading')">
      <Skeleton v-for="index in 3" :key="index" class="h-14 w-full" />
    </div>

    <template v-else-if="snapshot">
      <Alert v-if="!snapshot.preflight?.ready" variant="destructive">
        <TriangleAlert />
        <AlertTitle>{{ t('distributed.infrastructure.conflictTitle') }}</AlertTitle>
        <AlertDescription>{{ t('distributed.infrastructure.conflictDescription', { count: snapshot.preflight?.conflicts?.length || 0 }) }}</AlertDescription>
      </Alert>

      <div class="overflow-x-auto rounded-lg border">
        <UiTable class="min-w-[940px]">
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('distributed.infrastructure.columns.provider') }}</TableHead>
              <TableHead>{{ t('distributed.infrastructure.columns.environment') }}</TableHead>
              <TableHead>{{ t('distributed.infrastructure.columns.network') }}</TableHead>
              <TableHead>{{ t('distributed.infrastructure.columns.cpu') }}</TableHead>
              <TableHead>{{ t('distributed.infrastructure.columns.observedAt') }}</TableHead>
              <TableHead class="text-right">{{ t('common.fields.actions') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="environment in snapshot.environments || []" :key="environment.id">
              <TableCell>
                <div class="flex min-w-44 flex-col gap-1">
                  <span class="font-medium">{{ providerFor(environment)?.displayName || environment.targetId }}</span>
                  <div class="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{{ providerKindLabel(providerFor(environment)?.kind) }}</Badge>
                    <Badge :variant="providerFor(environment)?.online ? 'secondary' : 'destructive'">
                      {{ providerFor(environment)?.online ? t('common.states.online') : t('common.states.offline') }}
                    </Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex min-w-48 flex-col gap-1">
                  <span>{{ environmentKindLabel(environment.kind) }} · {{ environment.driver }}</span>
                  <span class="font-mono text-xs text-muted-foreground">{{ environment.id }}</span>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex min-w-52 flex-col gap-1">
                  <span>{{ networkFor(environment)?.name || '--' }}</span>
                  <span class="text-xs text-muted-foreground">{{ networkFor(environment)?.bindAddress || '--' }} → {{ networkFor(environment)?.advertiseAddress || '--' }}</span>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex min-w-44 flex-col gap-1">
                  <span>{{ t('distributed.infrastructure.cpuSummary', { physical: environment.cpu?.physical_cores || 0, logical: environment.cpu?.logical_processors || 0 }) }}</span>
                  <span class="text-xs text-muted-foreground">{{ environment.cpu?.topology_available ? t('distributed.infrastructure.cpuTopologyReady') : t('distributed.infrastructure.cpuTopologyMissing') }}</span>
                </div>
              </TableCell>
              <TableCell class="min-w-44 text-xs text-muted-foreground">{{ formatTime(environment.observedAt) }}</TableCell>
              <TableCell>
                <div class="flex justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <UiButton size="icon-sm" variant="ghost" :disabled="!networkFor(environment)" :aria-label="t('distributed.infrastructure.editNetwork')" @click="openNetworkDialog(environment)">
                        <Network />
                      </UiButton>
                    </TooltipTrigger>
                    <TooltipContent>{{ t('distributed.infrastructure.editNetwork') }}</TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </UiTable>
      </div>

      <div class="flex min-w-0 flex-col gap-2">
        <div>
          <h3 class="text-sm font-semibold">{{ t('distributed.infrastructure.roomResourcesTitle') }}</h3>
          <p class="mt-0.5 text-sm text-muted-foreground">{{ t('distributed.infrastructure.roomResourcesDescription') }}</p>
        </div>
        <div class="overflow-x-auto rounded-lg border">
          <UiTable class="min-w-[840px]">
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('distributed.infrastructure.columns.world') }}</TableHead>
                <TableHead>{{ t('distributed.infrastructure.columns.environment') }}</TableHead>
                <TableHead>{{ t('distributed.infrastructure.columns.ports') }}</TableHead>
                <TableHead>{{ t('distributed.infrastructure.columns.cpuPolicy') }}</TableHead>
                <TableHead class="text-right">{{ t('common.fields.actions') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="placement in topologySnapshot?.placements || []" :key="placement.worldId">
                <TableCell>
                  <div class="flex min-w-44 flex-col gap-1">
                    <span class="font-medium">{{ placement.worldName }}</span>
                    <span class="font-mono text-xs text-muted-foreground">{{ placement.worldId }}</span>
                  </div>
                </TableCell>
                <TableCell>{{ environmentForTarget(placement.appliedTargetId)?.id || '--' }}</TableCell>
                <TableCell>
                  <div class="flex min-w-64 flex-wrap gap-1.5">
                    <Badge v-for="reservation in reservationsFor(placement.worldId)" :key="reservation.id" variant="outline">
                      {{ portPurposeLabel(reservation.purpose) }} {{ reservation.port }}/{{ reservation.protocol }}
                    </Badge>
                    <span v-if="reservationsFor(placement.worldId).length === 0" class="text-sm text-muted-foreground">--</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="flex min-w-44 flex-col gap-1">
                    <Badge variant="outline">{{ cpuPolicyLabel(allocationFor(placement.worldId)?.policy) }}</Badge>
                    <span class="text-xs text-muted-foreground">{{ cpuSelectionLabel(allocationFor(placement.worldId)) }}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="flex justify-end">
                    <UiButton size="sm" variant="outline" :disabled="!environmentForTarget(placement.appliedTargetId)" @click="openCPUDialog(placement)">
                      <Cpu data-icon="inline-start" />
                      {{ t('distributed.infrastructure.configureCPU') }}
                    </UiButton>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </UiTable>
        </div>
      </div>
    </template>

    <Dialog v-model:open="networkDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('distributed.infrastructure.networkDialog.title') }}</DialogTitle>
          <DialogDescription>{{ t('distributed.infrastructure.networkDialog.description') }}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field :data-invalid="Boolean(networkErrors.name)">
            <FieldLabel for="network-profile-name">{{ t('distributed.infrastructure.networkDialog.name') }}</FieldLabel>
            <UiInput id="network-profile-name" v-model="networkForm.name" :aria-invalid="Boolean(networkErrors.name)" />
            <FieldError v-if="networkErrors.name">{{ networkErrors.name }}</FieldError>
          </Field>
          <Field :data-invalid="Boolean(networkErrors.bindAddress)">
            <FieldLabel for="network-bind-address">{{ t('distributed.infrastructure.networkDialog.bindAddress') }}</FieldLabel>
            <UiInput id="network-bind-address" v-model="networkForm.bindAddress" :aria-invalid="Boolean(networkErrors.bindAddress)" />
            <FieldDescription>{{ t('distributed.infrastructure.networkDialog.bindDescription') }}</FieldDescription>
            <FieldError v-if="networkErrors.bindAddress">{{ networkErrors.bindAddress }}</FieldError>
          </Field>
          <Field :data-invalid="Boolean(networkErrors.advertiseAddress)">
            <FieldLabel for="network-advertise-address">{{ t('distributed.infrastructure.networkDialog.advertiseAddress') }}</FieldLabel>
            <UiInput id="network-advertise-address" v-model="networkForm.advertiseAddress" :aria-invalid="Boolean(networkErrors.advertiseAddress)" />
            <FieldDescription>{{ t('distributed.infrastructure.networkDialog.advertiseDescription') }}</FieldDescription>
            <FieldError v-if="networkErrors.advertiseAddress">{{ networkErrors.advertiseAddress }}</FieldError>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <UiButton variant="outline" :disabled="savingNetwork" @click="networkDialogOpen = false">{{ t('common.actions.cancel') }}</UiButton>
          <UiButton :disabled="savingNetwork" @click="saveNetwork">
            <Spinner v-if="savingNetwork" data-icon="inline-start" />
            {{ t('common.actions.save') }}
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="cpuDialogOpen">
      <DialogScrollContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{{ t('distributed.infrastructure.cpuDialog.title', { world: selectedPlacement?.worldName || '--' }) }}</DialogTitle>
          <DialogDescription>{{ t('distributed.infrastructure.cpuDialog.description') }}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>{{ t('distributed.infrastructure.cpuDialog.policy') }}</FieldLabel>
            <ToggleGroup type="single" :model-value="cpuForm.policy" variant="outline" @update:model-value="setCPUPolicy">
              <ToggleGroupItem value="none">{{ t('distributed.infrastructure.cpuPolicies.none') }}</ToggleGroupItem>
              <ToggleGroupItem value="shared">{{ t('distributed.infrastructure.cpuPolicies.shared') }}</ToggleGroupItem>
              <ToggleGroupItem value="exclusive" :disabled="!cpuExclusiveSupported">{{ t('distributed.infrastructure.cpuPolicies.exclusive') }}</ToggleGroupItem>
            </ToggleGroup>
            <FieldDescription>{{ t(`distributed.infrastructure.cpuPolicyDescriptions.${cpuForm.policy}`) }}</FieldDescription>
          </Field>

          <FieldSet v-if="cpuForm.policy !== 'none'">
            <FieldLegend>{{ t('distributed.infrastructure.cpuDialog.logicalCPUs') }}</FieldLegend>
            <FieldDescription>{{ t('distributed.infrastructure.cpuDialog.logicalCPUDescription') }}</FieldDescription>
            <Alert v-if="!cpuEnvironment?.cpu?.topology_available">
              <TriangleAlert />
              <AlertTitle>{{ t('distributed.infrastructure.cpuDialog.topologyMissingTitle') }}</AlertTitle>
              <AlertDescription>{{ t('distributed.infrastructure.cpuDialog.topologyMissingDescription') }}</AlertDescription>
            </Alert>
            <FieldGroup v-if="cpuChoices.length" class="grid gap-2 sm:grid-cols-2">
              <Field v-for="thread in cpuChoices" :key="thread.logical_id" orientation="horizontal">
                <Checkbox :id="`logical-cpu-${thread.logical_id}`" :model-value="cpuForm.logicalCpuIds.includes(thread.logical_id)" @update:model-value="toggleLogicalCPU(thread.logical_id, $event)" />
                <FieldContent>
                  <FieldLabel :for="`logical-cpu-${thread.logical_id}`" class="font-normal">CPU {{ thread.logical_id }}</FieldLabel>
                  <FieldDescription v-if="thread.package_id || thread.core_id">{{ t('distributed.infrastructure.cpuDialog.coreIdentity', { package: thread.package_id, core: thread.core_id }) }}</FieldDescription>
                  <FieldDescription v-else>{{ t('distributed.infrastructure.cpuDialog.logicalCPUOnly') }}</FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>
          </FieldSet>

          <Field v-if="cpuForm.policy === 'exclusive'" orientation="horizontal">
            <Checkbox id="allow-smt-risk" v-model="cpuForm.allowSmtSiblingRisk" />
            <FieldContent>
              <FieldLabel for="allow-smt-risk">{{ t('distributed.infrastructure.cpuDialog.allowSMTRisk') }}</FieldLabel>
              <FieldDescription>{{ t('distributed.infrastructure.cpuDialog.allowSMTRiskDescription') }}</FieldDescription>
            </FieldContent>
          </Field>
        </FieldGroup>
        <Alert v-if="cpuError" variant="destructive">
          <CircleAlert />
          <AlertTitle>{{ t('distributed.infrastructure.cpuDialog.invalidTitle') }}</AlertTitle>
          <AlertDescription>{{ cpuError }}</AlertDescription>
        </Alert>
        <DialogFooter>
          <UiButton variant="outline" :disabled="savingCPU" @click="cpuDialogOpen = false">{{ t('common.actions.cancel') }}</UiButton>
          <UiButton :disabled="savingCPU || !cpuFormValid" @click="saveCPU">
            <Spinner v-if="savingCPU" data-icon="inline-start" />
            {{ t('common.actions.save') }}
          </UiButton>
        </DialogFooter>
      </DialogScrollContent>
    </Dialog>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleAlert, Cpu, Network, RefreshCw, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { topologyV2API } from '@/api/v2'
import KubernetesProviderPanel from '@/components/runtime/KubernetesProviderPanel.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input as UiInput } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const props = defineProps({
  roomId: { type: String, default: '' },
  topologySnapshot: { type: Object, default: null }
})

const { locale, t } = useI18n()
const snapshot = ref(null)
const loading = ref(false)
const error = ref('')
const networkDialogOpen = ref(false)
const savingNetwork = ref(false)
const selectedProfile = ref(null)
const networkForm = ref({ name: '', bindAddress: '', advertiseAddress: '' })
const networkErrors = ref({})
const cpuDialogOpen = ref(false)
const savingCPU = ref(false)
const selectedPlacement = ref(null)
const cpuError = ref('')
const cpuForm = ref({ environmentId: '', policy: 'none', logicalCpuIds: [], allowSmtSiblingRisk: false })
let requestSequence = 0

const cpuEnvironment = computed(() => (snapshot.value?.environments || []).find(item => item.id === cpuForm.value.environmentId))
const cpuProvider = computed(() => cpuEnvironment.value ? providerFor(cpuEnvironment.value) : null)
const cpuExclusiveSupported = computed(() => Boolean(cpuEnvironment.value?.cpu?.topology_available) && cpuProvider.value?.os !== 'darwin')
const cpuChoices = computed(() => {
  const threads = [...(cpuEnvironment.value?.cpu?.threads || [])]
  if (threads.length) return threads.sort((left, right) => left.logical_id - right.logical_id)
  return Array.from({ length: Number(cpuEnvironment.value?.cpu?.logical_processors) || 0 }, (_, logicalId) => ({
    logical_id: logicalId,
    package_id: '',
    core_id: ''
  }))
})
const cpuFormValid = computed(() => {
  if (cpuForm.value.policy === 'none') return true
  if (cpuChoices.value.length === 0 || cpuForm.value.logicalCpuIds.length === 0) return false
  return cpuForm.value.policy !== 'exclusive' || cpuExclusiveSupported.value
})

async function loadInfrastructure() {
  const sequence = ++requestSequence
  loading.value = true
  error.value = ''
  try {
    const value = await topologyV2API.infrastructure()
    if (sequence !== requestSequence) return
    snapshot.value = value
  } catch (cause) {
    if (sequence !== requestSequence) return
    error.value = cause.message || t('common.errors.unknown')
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function providerFor(environment) {
  return (snapshot.value?.providers || []).find(item => item.id === environment.providerId)
}

function networkFor(environment) {
  return (snapshot.value?.networkProfiles || []).find(item => item.id === environment.networkProfileId)
}

function environmentForTarget(targetId) {
  return (snapshot.value?.environments || []).find(item => item.targetId === targetId)
}

function allocationFor(worldId) {
  return (snapshot.value?.cpuAllocations || []).find(item => item.roomId === props.roomId && item.worldId === worldId)
}

function reservationsFor(worldId) {
  return (snapshot.value?.portReservations || []).filter(item => item.roomId === props.roomId && item.worldId === worldId && item.managed)
}

function providerKindLabel(value) {
  return t(`distributed.infrastructure.providerKinds.${value === 'agent' ? 'agent' : 'local'}`)
}

function environmentKindLabel(value) {
  return t(`distributed.infrastructure.environmentKinds.${value === 'container' ? 'container' : 'native'}`)
}

function portPurposeLabel(value) {
  const known = ['dst_server', 'cluster_master', 'steam_authentication', 'steam_master_server']
  return t(`distributed.infrastructure.portPurposes.${known.includes(value) ? value : 'unknown'}`)
}

function cpuPolicyLabel(value) {
  const key = ['none', 'shared', 'exclusive'].includes(value) ? value : 'none'
  return t(`distributed.infrastructure.cpuPolicies.${key}`)
}

function cpuSelectionLabel(allocation) {
  if (!allocation?.logicalCpuIds?.length) return t('distributed.infrastructure.cpuUnbound')
  return t('distributed.infrastructure.logicalCPUSelection', { cpus: allocation.logicalCpuIds.join(', ') })
}

function openNetworkDialog(environment) {
  const profile = networkFor(environment)
  if (!profile) return
  selectedProfile.value = profile
  networkForm.value = {
    name: profile.name || '',
    bindAddress: profile.bindAddress || '',
    advertiseAddress: profile.advertiseAddress || ''
  }
  networkErrors.value = {}
  networkDialogOpen.value = true
}

function validateNetwork() {
  const fields = {}
  if (!networkForm.value.name.trim()) fields.name = t('distributed.infrastructure.networkDialog.required')
  networkErrors.value = fields
  return Object.keys(fields).length === 0
}

async function saveNetwork() {
  if (!selectedProfile.value || !validateNetwork()) return
  savingNetwork.value = true
  try {
    await topologyV2API.updateNetworkProfile(selectedProfile.value.id, {
      name: networkForm.value.name.trim(),
      bindAddress: networkForm.value.bindAddress.trim(),
      advertiseAddress: networkForm.value.advertiseAddress.trim()
    })
    await loadInfrastructure()
    networkDialogOpen.value = false
    toast.success(t('distributed.infrastructure.networkDialog.saved'))
  } catch (cause) {
    const fields = cause.details?.fields
    if (fields) networkErrors.value = fields
    toast.error(cause.message || t('common.errors.unknown'))
  } finally {
    savingNetwork.value = false
  }
}

function openCPUDialog(placement) {
  const environment = environmentForTarget(placement.appliedTargetId)
  if (!environment) return
  const allocation = allocationFor(placement.worldId)
  selectedPlacement.value = placement
  cpuForm.value = {
    environmentId: environment.id,
    policy: allocation?.policy || 'none',
    logicalCpuIds: [...(allocation?.logicalCpuIds || [])],
    allowSmtSiblingRisk: Boolean(allocation?.allowSmtSiblingRisk)
  }
  cpuError.value = ''
  cpuDialogOpen.value = true
}

function setCPUPolicy(value) {
  if (!value) return
  if (value === 'exclusive' && !cpuExclusiveSupported.value) return
  cpuForm.value.policy = value
  cpuError.value = ''
  if (value === 'none') {
    cpuForm.value.logicalCpuIds = []
    cpuForm.value.allowSmtSiblingRisk = false
  }
}

function toggleLogicalCPU(logicalId, checked) {
  const values = new Set(cpuForm.value.logicalCpuIds)
  if (checked) values.add(logicalId)
  else values.delete(logicalId)
  cpuForm.value.logicalCpuIds = [...values].sort((left, right) => left - right)
  cpuError.value = ''
}

async function saveCPU() {
  if (!selectedPlacement.value || !cpuFormValid.value) return
  savingCPU.value = true
  cpuError.value = ''
  try {
    await topologyV2API.updateCPUAllocation({
      roomId: props.roomId,
      worldId: selectedPlacement.value.worldId,
      environmentId: cpuForm.value.environmentId,
      policy: cpuForm.value.policy,
      logicalCpuIds: cpuForm.value.logicalCpuIds,
      allowSmtSiblingRisk: cpuForm.value.allowSmtSiblingRisk
    })
    await loadInfrastructure()
    cpuDialogOpen.value = false
    toast.success(t('distributed.infrastructure.cpuDialog.saved'))
  } catch (cause) {
    cpuError.value = cause.details?.fields
      ? Object.values(cause.details.fields).join('；')
      : (cause.message || t('common.errors.unknown'))
  } finally {
    savingCPU.value = false
  }
}

function formatTime(value) {
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '--'
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'short', timeStyle: 'medium' }).format(parsed)
}

watch(() => props.roomId, () => { void loadInfrastructure() }, { immediate: true })
</script>

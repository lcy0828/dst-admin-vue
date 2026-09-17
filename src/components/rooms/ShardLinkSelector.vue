<template>
  <FieldSet>
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <FieldLegend variant="label">{{ t('topology.roomPlacement.shardLinks.title') }}</FieldLegend>
        <FieldDescription>{{ t('topology.roomPlacement.shardLinks.description') }}</FieldDescription>
      </div>
      <UiButton size="sm" variant="outline" :disabled="disabled || loading" @click="emit('discover')">
        <Spinner v-if="loading" data-icon="inline-start" />
        <Radar v-else data-icon="inline-start" />
        {{ t(loading ? 'topology.roomPlacement.shardLinks.probing' : 'topology.roomPlacement.shardLinks.probe') }}
      </UiButton>
    </div>

    <Alert v-if="error" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('topology.roomPlacement.shardLinks.probeFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <Alert v-else-if="discovery?.activeProbeUnavailableReason">
      <CircleAlert />
      <AlertTitle>{{ t('topology.roomPlacement.shardLinks.deferredTitle') }}</AlertTitle>
      <AlertDescription>
        {{ t('topology.roomPlacement.shardLinks.deferredDescription', { reason: discovery.activeProbeUnavailableReason }) }}
      </AlertDescription>
    </Alert>

    <div v-if="loading && !discovery" class="flex flex-col gap-2">
      <Skeleton class="h-16 w-full" />
      <Skeleton class="h-16 w-full" />
    </div>

    <FieldGroup v-else-if="discovery?.links?.length" class="gap-4">
      <FieldSet v-for="link in discovery.links" :key="sourceKey(link)" class="gap-2">
        <FieldLegend variant="label">
          {{ t('topology.roomPlacement.shardLinks.routeTitle', {
            source: link.sourceTargetName || link.sourceTargetId,
            master: discovery.masterTargetName || discovery.masterTargetId
          }) }}
        </FieldLegend>
        <FieldDescription>
          {{ t('topology.roomPlacement.shardLinks.routeDescription', { port: discovery.masterPort }) }}
        </FieldDescription>

        <Alert v-if="!link.candidates?.length" class="py-2.5">
          <Network />
          <AlertTitle>{{ t('topology.roomPlacement.shardLinks.noCandidateTitle') }}</AlertTitle>
          <AlertDescription>{{ t('topology.roomPlacement.shardLinks.noCandidateDescription') }}</AlertDescription>
        </Alert>

        <RadioGroup
          v-else
          :model-value="selectedCandidateKey(link)"
          :disabled="disabled"
          @update:model-value="value => selectCandidate(link, value)"
        >
          <FieldLabel
            v-for="candidate in link.candidates"
            :key="candidateKey(candidate)"
            :data-disabled="candidate.status === 'unreachable' ? '' : undefined"
            :for="candidateId(link, candidate)"
          >
            <Field orientation="horizontal" :data-disabled="candidate.status === 'unreachable' ? '' : undefined" class="items-start">
              <RadioGroupItem
                :id="candidateId(link, candidate)"
                :value="candidateKey(candidate)"
                :disabled="disabled || candidate.status === 'unreachable'"
              />
              <FieldContent>
                <div class="flex flex-wrap items-center gap-2">
                  <code>{{ formatEndpoint(candidate.address, candidate.port) }}</code>
                  <Badge variant="outline">{{ kindLabel(candidate.kind) }}</Badge>
                  <Badge :variant="statusVariant(candidate.status)">{{ statusLabel(candidate) }}</Badge>
                </div>
                <FieldDescription v-if="candidate.error">{{ candidate.error }}</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
        </RadioGroup>

        <FieldError v-if="link.candidates?.length && !selectedCandidateKey(link)">
          {{ t('topology.roomPlacement.shardLinks.selectionRequired') }}
        </FieldError>
      </FieldSet>
    </FieldGroup>

    <Alert v-else-if="discovery && !loading">
      <Network />
      <AlertTitle>{{ t('topology.roomPlacement.shardLinks.noRouteTitle') }}</AlertTitle>
      <AlertDescription>{{ t('topology.roomPlacement.shardLinks.noRouteDescription') }}</AlertDescription>
    </Alert>

    <Separator />

    <FieldSet>
      <FieldLegend variant="label">{{ t('topology.roomPlacement.shardLinks.manualTitle') }}</FieldLegend>
      <FieldDescription>{{ t('topology.roomPlacement.shardLinks.manualDescription') }}</FieldDescription>
      <FieldGroup class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
        <Field :data-invalid="manualAddressInvalid ? '' : undefined">
          <FieldLabel for="shard-link-manual-address">{{ t('topology.roomPlacement.shardLinks.address') }}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="shard-link-manual-address"
              v-model="manualAddress"
              :aria-invalid="manualAddressInvalid || undefined"
              :placeholder="t('topology.roomPlacement.shardLinks.addressPlaceholder')"
              :disabled="disabled || loading"
              @keydown.enter.prevent="addManualCandidate"
            />
          </InputGroup>
        </Field>
        <Field :data-invalid="manualPortInvalid ? '' : undefined">
          <FieldLabel for="shard-link-manual-port">{{ t('topology.roomPlacement.shardLinks.port') }}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="shard-link-manual-port"
              v-model="manualPort"
              type="number"
              min="1"
              max="65535"
              inputmode="numeric"
              :aria-invalid="manualPortInvalid || undefined"
              :disabled="disabled || loading"
              @keydown.enter.prevent="addManualCandidate"
            />
          </InputGroup>
        </Field>
        <UiButton variant="outline" :disabled="disabled || loading || !canAddManual" @click="addManualCandidate">
          <Plus data-icon="inline-start" />
          {{ t('topology.roomPlacement.shardLinks.addAndProbe') }}
        </UiButton>
      </FieldGroup>

      <div v-if="manualCandidates.length" class="flex flex-wrap gap-2">
        <div v-for="candidate in manualCandidates" :key="candidateKey(candidate)" class="flex items-center gap-1">
          <Badge variant="secondary">{{ formatEndpoint(candidate.address, candidate.port || discovery?.masterPort) }}</Badge>
          <UiButton
            size="icon-xs"
            variant="ghost"
            :disabled="disabled || loading"
            :aria-label="t('topology.roomPlacement.shardLinks.removeManual')"
            @click="emit('remove-manual', candidate)"
          >
            <X />
          </UiButton>
        </div>
      </div>
    </FieldSet>
  </FieldSet>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleAlert, Network, Plus, Radar, X } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { shardLinkCandidateKey, shardLinkEndpointKey } from '@/lib/roomPlacement.mjs'

const props = defineProps({
  discovery: { type: Object, default: null },
  selectedLinks: { type: Array, default: () => [] },
  manualCandidates: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['discover', 'select', 'add-manual', 'remove-manual'])
const { t } = useI18n()
const manualAddress = ref('')
const manualPort = ref('')

watch(() => props.discovery?.masterPort, value => {
  if (!manualPort.value && Number(value) > 0) manualPort.value = String(value)
}, { immediate: true })

const parsedManualPort = computed(() => Number(manualPort.value))
const manualAddressInvalid = computed(() => manualAddress.value.trim().length > 0 && /[\s/\\]/.test(manualAddress.value.trim()))
const manualPortInvalid = computed(() => manualPort.value !== '' && (
  !Number.isInteger(parsedManualPort.value) || parsedManualPort.value < 1 || parsedManualPort.value > 65535
))
const canAddManual = computed(() => manualAddress.value.trim().length > 0 &&
  Number.isInteger(parsedManualPort.value) && parsedManualPort.value >= 1 && parsedManualPort.value <= 65535 &&
  props.manualCandidates.length < 16 && !manualAddressInvalid.value)

function sourceKey(link) {
  return shardLinkEndpointKey(link?.sourceTargetId, link?.sourceInstallationId)
}

function candidateKey(candidate) {
  return shardLinkCandidateKey(candidate?.address, candidate?.port)
}

function selectedCandidateKey(link) {
  const selected = props.selectedLinks.find(item => sourceKey(item) === sourceKey(link))
  return selected ? shardLinkCandidateKey(selected.address, selected.port) : ''
}

function selectCandidate(link, value) {
  const candidate = (link.candidates || []).find(item => candidateKey(item) === value)
  if (candidate) emit('select', { link, candidate })
}

function candidateId(link, candidate) {
  const source = sourceKey(link).replace(/[^a-zA-Z0-9_-]/g, '-')
  const endpoint = candidateKey(candidate).replace(/[^a-zA-Z0-9_-]/g, '-')
  return `shard-link-${source}-${endpoint}`
}

function formatEndpoint(address, port) {
  const value = String(address || '').trim()
  const host = value.includes(':') && !value.startsWith('[') ? `[${value}]` : value
  return `${host}:${Number(port) || '--'}`
}

function statusVariant(status) {
  if (status === 'reachable') return 'success'
  if (status === 'unreachable') return 'destructive'
  return 'warning'
}

function statusLabel(candidate) {
  if (candidate.status === 'reachable' && Number.isFinite(Number(candidate.latencyMillis))) {
    return t('topology.roomPlacement.shardLinks.status.reachableLatency', { latency: Number(candidate.latencyMillis) })
  }
  const status = ['reachable', 'unreachable', 'unverified', 'pending'].includes(candidate.status)
    ? candidate.status
    : 'unverified'
  return t(`topology.roomPlacement.shardLinks.status.${status}`)
}

function kindLabel(kind) {
  const value = ['lan', 'overlay', 'configured', 'manual', 'public', 'interface'].includes(kind) ? kind : 'interface'
  return t(`topology.roomPlacement.shardLinks.kind.${value}`)
}

function addManualCandidate() {
  if (!canAddManual.value) return
  emit('add-manual', { address: manualAddress.value.trim(), port: parsedManualPort.value || 0 })
  manualAddress.value = ''
}
</script>

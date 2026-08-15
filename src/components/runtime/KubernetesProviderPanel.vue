<template>
  <section class="flex min-w-0 flex-col gap-3" aria-labelledby="kubernetes-provider-title">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <component :is="headingTag" id="kubernetes-provider-title" class="text-sm font-semibold">
            {{ t('distributed.kubernetes.title') }}
          </component>
          <Badge variant="outline">{{ t('distributed.kubernetes.experimental') }}</Badge>
          <Badge v-if="state" :variant="statusVariant">{{ statusLabel }}</Badge>
        </div>
        <p class="mt-0.5 text-sm text-muted-foreground">{{ t('distributed.kubernetes.description') }}</p>
      </div>
      <Tooltip>
        <TooltipTrigger as-child>
          <UiButton
            size="icon-sm"
            variant="ghost"
            :disabled="loading"
            :aria-label="t('common.actions.refresh')"
            @click="loadStatus"
          >
            <Spinner v-if="loading" />
            <RefreshCw v-else data-icon />
          </UiButton>
        </TooltipTrigger>
        <TooltipContent>{{ t('common.actions.refresh') }}</TooltipContent>
      </Tooltip>
    </div>

    <Skeleton v-if="loading && !state" class="h-20 w-full" />

    <Alert v-else-if="error" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('distributed.kubernetes.loadFailed') }}</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <Alert v-else-if="state?.status === 'disabled'">
      <FlaskConical />
      <AlertTitle>{{ t('distributed.kubernetes.disabled.title') }}</AlertTitle>
      <AlertDescription class="flex flex-col gap-2">
        <span>{{ t('distributed.kubernetes.disabled.description') }}</span>
        <code class="w-fit max-w-full break-all rounded-sm bg-muted px-1.5 py-0.5 text-xs text-foreground">DST_ADMIN_KUBERNETES_EXPERIMENTAL_ENABLED</code>
      </AlertDescription>
    </Alert>

    <Alert v-else-if="state?.status === 'configuration_required'">
      <Settings2 />
      <AlertTitle>{{ t('distributed.kubernetes.configuration.title') }}</AlertTitle>
      <AlertDescription class="flex flex-col gap-2">
        <span>{{ state.errorMessage || t('distributed.kubernetes.configuration.description') }}</span>
        <div class="flex flex-wrap items-center gap-2">
          <Badge v-if="state.errorCode" variant="outline" class="font-mono">{{ state.errorCode }}</Badge>
          <code class="max-w-full break-all rounded-sm bg-muted px-1.5 py-0.5 text-xs text-foreground">DST_ADMIN_KUBERNETES_PROVIDER_CONFIG</code>
        </div>
      </AlertDescription>
    </Alert>

    <template v-else-if="state?.status === 'available' && state.provider">
      <Alert>
        <ShieldCheck />
        <AlertTitle>{{ t('distributed.kubernetes.readOnly.title') }}</AlertTitle>
        <AlertDescription>{{ t('distributed.kubernetes.readOnly.description') }}</AlertDescription>
      </Alert>

      <div class="overflow-x-auto rounded-lg border">
        <UiTable class="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('distributed.kubernetes.provider.provider') }}</TableHead>
              <TableHead>{{ t('distributed.kubernetes.provider.namespace') }}</TableHead>
              <TableHead>{{ t('distributed.kubernetes.provider.image') }}</TableHead>
              <TableHead>{{ t('distributed.kubernetes.provider.profiles') }}</TableHead>
              <TableHead>{{ t('distributed.kubernetes.provider.freshness') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell class="font-medium">{{ state.provider.id }}</TableCell>
              <TableCell class="font-mono text-xs">{{ state.provider.namespace }}</TableCell>
              <TableCell class="max-w-72 truncate font-mono text-xs" :title="state.provider.runtimeImage">{{ state.provider.runtimeImage }}</TableCell>
              <TableCell>
                <div class="flex max-w-56 flex-col gap-1">
                  <span>{{ t('distributed.kubernetes.provider.profileCount', { storage: storageProfiles.length, compute: computeProfiles.length }) }}</span>
                  <span class="truncate font-mono text-xs text-muted-foreground" :title="profileNames">{{ profileNames }}</span>
                </div>
              </TableCell>
              <TableCell>{{ t('distributed.kubernetes.provider.freshnessValue', { seconds: state.provider.maximumObservationSeconds }) }}</TableCell>
            </TableRow>
          </TableBody>
        </UiTable>
      </div>

      <div class="grid gap-3 xl:grid-cols-2">
        <section class="min-w-0" aria-labelledby="kubernetes-features-title">
          <h4 id="kubernetes-features-title" class="mb-2 text-sm font-medium">{{ t('distributed.kubernetes.features.title') }}</h4>
          <div class="overflow-hidden rounded-lg border">
            <UiTable>
              <TableHeader><TableRow><TableHead>{{ t('distributed.kubernetes.columns.capability') }}</TableHead><TableHead class="text-right">{{ t('distributed.kubernetes.columns.state') }}</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow v-for="feature in state.features" :key="feature.id">
                  <TableCell class="whitespace-normal">{{ featureLabel(feature.id) }}</TableCell>
                  <TableCell class="text-right">
                    <Tooltip v-if="feature.code">
                      <TooltipTrigger as-child>
                        <Badge :variant="feature.available ? 'secondary' : 'outline'">
                          <CircleCheck v-if="feature.available" data-icon="inline-start" />
                          <CircleX v-else data-icon="inline-start" />
                          {{ feature.available ? t('distributed.kubernetes.available') : t('distributed.kubernetes.unavailable') }}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent class="font-mono">{{ feature.code }}</TooltipContent>
                    </Tooltip>
                    <Badge v-else :variant="feature.available ? 'secondary' : 'outline'">
                      <CircleCheck v-if="feature.available" data-icon="inline-start" />
                      <CircleX v-else data-icon="inline-start" />
                      {{ feature.available ? t('distributed.kubernetes.available') : t('distributed.kubernetes.unavailable') }}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </UiTable>
          </div>
        </section>

        <section class="min-w-0" aria-labelledby="kubernetes-gates-title">
          <h4 id="kubernetes-gates-title" class="mb-2 text-sm font-medium">{{ t('distributed.kubernetes.gates.title') }}</h4>
          <div class="overflow-hidden rounded-lg border">
            <UiTable>
              <TableHeader><TableRow><TableHead>{{ t('distributed.kubernetes.columns.gate') }}</TableHead><TableHead class="text-right">{{ t('distributed.kubernetes.columns.state') }}</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow v-for="gate in state.safetyGates" :key="gate.id">
                  <TableCell class="whitespace-normal">{{ gateLabel(gate.id) }}</TableCell>
                  <TableCell class="text-right">
                    <Badge :variant="gate.satisfied ? 'secondary' : 'destructive'">
                      <CircleCheck v-if="gate.satisfied" data-icon="inline-start" />
                      <CircleX v-else data-icon="inline-start" />
                      {{ gate.satisfied ? t('distributed.kubernetes.verified') : t('distributed.kubernetes.unverified') }}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </UiTable>
          </div>
        </section>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleAlert, CircleCheck, CircleX, FlaskConical, RefreshCw, Settings2, ShieldCheck } from '@lucide/vue'
import { kubernetesRuntimeV2API } from '@/api/v2'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const props = defineProps({
  headingLevel: { type: Number, default: 2 }
})

const { t } = useI18n()
const state = ref(null)
const error = ref('')
const loading = ref(false)
let requestSequence = 0

const headingTag = computed(() => {
  const level = Number.isFinite(props.headingLevel) ? props.headingLevel : 2
  return `h${Math.min(6, Math.max(2, level))}`
})
const statusVariant = computed(() => state.value?.status === 'available' ? 'secondary' : 'outline')
const statusLabel = computed(() => t(`distributed.kubernetes.status.${state.value?.status || 'disabled'}`))
const storageProfiles = computed(() => state.value?.provider?.storageProfiles || [])
const computeProfiles = computed(() => state.value?.provider?.computeProfiles || [])
const profileNames = computed(() => [...storageProfiles.value, ...computeProfiles.value].map(profile => profile.id).join(', ') || '--')

function featureLabel(id) {
  const known = ['observe', 'preflight', 'typed_plan', 'apply', 'lifecycle', 'console', 'mods', 'backup_restore']
  return t(`distributed.kubernetes.features.${known.includes(id) ? id : 'unknown'}`)
}

function gateLabel(id) {
  const known = ['lease_fencing_admission', 'lease_aware_supervisor', 'pod_uid_ownership', 'pvc_uid_ownership', 'network_policy', 'secondary_master_dns', 'published_udp', 'exclusive_cpu']
  return t(`distributed.kubernetes.gates.${known.includes(id) ? id : 'unknown'}`)
}

async function loadStatus() {
  const sequence = ++requestSequence
  loading.value = true
  error.value = ''
  try {
    const value = await kubernetesRuntimeV2API.status()
    if (sequence === requestSequence) state.value = value
  } catch (failure) {
    if (sequence === requestSequence) error.value = failure?.message || t('common.errors.unknown')
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

onMounted(loadStatus)
</script>

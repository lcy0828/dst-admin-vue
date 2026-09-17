<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Check, ChevronDown, Network, Search, Server, Settings } from '@lucide/vue'
import { fleetOverviewV2API, runtimeTargetsV2API } from '@/api/v2'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { runtimeTargetMeta, runtimeTargetName } from '@/lib/runtimeTargetPresentation.mjs'
import { summarizeFleetActivity } from '@/lib/fleetOverview.mjs'
import {
  getManagementScope,
  MANAGEMENT_SCOPE_CHANGED_EVENT,
  MANAGEMENT_SCOPE_TARGET,
  setManagementScope
} from '@/lib/managementScope.mjs'
import { RUNTIME_TARGETS_UPDATED_EVENT } from '@/utils/runtimeTarget'
import { toast } from 'vue-sonner'

const router = useRouter()
const scopeGuard = inject('machine-scope-guard', null)
const { t } = useI18n()
const open = ref(false)
const loading = ref(false)
const query = ref('')
const targets = ref([])
const scope = ref(getManagementScope())
const activity = ref(null)
const activityLoading = ref(false)
const activityError = ref('')
let disposed = false

const activitySummary = computed(() => summarizeFleetActivity(activity.value || {}, targets.value))

const selectedTarget = computed(() => (
  scope.value.kind === MANAGEMENT_SCOPE_TARGET
    ? targets.value.find(target => target.id === scope.value.targetId) || null
    : null
))
const hasMultipleTargets = computed(() => targets.value.length > 1)
const currentLabel = computed(() => (
  selectedTarget.value ? targetName(selectedTarget.value) : (scope.value.targetName || t('app.remote.allTargets'))
))
const filteredTargets = computed(() => {
  const normalized = query.value.trim().toLocaleLowerCase()
  if (!normalized) return targets.value
  return targets.value.filter(target => [
    target.id,
    targetName(target),
    targetMeta(target),
    t(`app.remote.states.${targetState(target).key}`)
  ]
    .some(value => String(value || '').toLocaleLowerCase().includes(normalized)))
})

function targetName(target) {
  return runtimeTargetName(target, t)
}

function targetMeta(target) {
  return runtimeTargetMeta(target, t)
}

function targetState(target) {
  if (!target.configured || target.status === 'configuration_required') {
    return { key: 'setupRequired', variant: 'outline' }
  }
  return target.online
    ? { key: 'online', variant: 'success' }
    : { key: 'offline', variant: 'destructive' }
}

function activityLabel(targetId = '') {
  if (activityLoading.value) return t('app.remote.activityLoading')
  const value = targetId ? activitySummary.value.byTarget[targetId] : activitySummary.value.total
  if (!value || value.state === 'unknown') return t('app.remote.activityUnknown')
  return t(value.state === 'partial' ? 'app.remote.activityPartial' : 'app.remote.activityCounts', value)
}

async function loadActivity() {
  if (activityLoading.value) return
  activityLoading.value = true
  activity.value = null
  activityError.value = ''
  try {
    const value = await fleetOverviewV2API.get('', { detail: 'inventory' })
    if (!disposed) activity.value = value
  } catch (error) {
    if (!disposed) activityError.value = error?.message || t('common.errors.unknown')
  } finally {
    activityLoading.value = false
  }
}

function syncScope(event) {
  scope.value = event?.detail || getManagementScope()
}

async function selectAll() {
  if (scope.value.kind === MANAGEMENT_SCOPE_TARGET && scopeGuard && !(await scopeGuard.check())) return
  scope.value = setManagementScope({ kind: 'all' })
  handleOpen(false)
}

function applyTargetScope(target) {
  scope.value = setManagementScope({
    kind: MANAGEMENT_SCOPE_TARGET,
    targetId: target.id,
    targetName: targetName(target),
    targetKind: target.kind,
    agentId: target.agentId,
    online: target.online,
    configured: target.configured
  })
}

async function selectTarget(target) {
  if (scope.value.targetId !== target.id && scopeGuard && !(await scopeGuard.check())) return
  applyTargetScope(target)
  handleOpen(false)
}

function openMachineManagement() {
  handleOpen(false)
  router.push('/agents/list')
}

async function loadTargets() {
  if (loading.value) return
  loading.value = true
  try {
    const value = await runtimeTargetsV2API.list()
    if (disposed) return
    targets.value = Array.isArray(value?.items) ? value.items : []
    if (targets.value.length === 1) {
      applyTargetScope(targets.value[0])
    } else if (scope.value.kind === MANAGEMENT_SCOPE_TARGET) {
      const target = targets.value.find(item => item.id === scope.value.targetId)
      scope.value = target
        ? setManagementScope({
            kind: MANAGEMENT_SCOPE_TARGET,
            targetId: target.id,
            targetName: targetName(target),
            targetKind: target.kind,
            agentId: target.agentId,
            online: target.online,
            configured: target.configured
          })
        : setManagementScope({ kind: 'all' })
    }
  } catch (error) {
    toast.error(t('app.remote.loadFailedDetail', { error: error?.message || t('common.errors.unknown') }))
  } finally {
    loading.value = false
  }
}

function handleOpen(next) {
  open.value = next
  if (next) {
    query.value = ''
    void loadTargets()
    void loadActivity()
  }
}

onMounted(() => {
  window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, syncScope)
  window.addEventListener(RUNTIME_TARGETS_UPDATED_EVENT, loadTargets)
  void loadTargets()
})

onBeforeUnmount(() => {
  disposed = true
  window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, syncScope)
  window.removeEventListener(RUNTIME_TARGETS_UPDATED_EVENT, loadTargets)
})
</script>

<template>
  <Popover :open="open" @update:open="handleOpen">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        class="w-32 shrink-0 justify-between px-2 sm:w-44 sm:px-3 2xl:w-52"
        :aria-label="t('app.remote.currentScope', { name: currentLabel })"
        :title="t('app.remote.currentScope', { name: currentLabel })"
      >
        <Spinner v-if="loading" data-icon="inline-start" />
        <Server v-else-if="selectedTarget" data-icon="inline-start" />
        <Network v-else data-icon="inline-start" />
        <span class="min-w-0 flex-1 truncate text-left">{{ currentLabel }}</span>
        <Badge
          v-if="selectedTarget"
          class="hidden 2xl:inline-flex"
          :variant="targetState(selectedTarget).variant"
        >
          {{ t(`app.remote.states.${targetState(selectedTarget).key}`) }}
        </Badge>
        <ChevronDown data-icon="inline-end" />
      </Button>
    </PopoverTrigger>

    <PopoverContent align="start" :side-offset="8" class="w-[min(22rem,calc(100vw-2rem))] gap-3 p-3">
      <PopoverHeader>
        <PopoverTitle>{{ t('app.remote.scopeTitle') }}</PopoverTitle>
      </PopoverHeader>

      <InputGroup v-if="hasMultipleTargets">
        <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
        <InputGroupInput v-model="query" :placeholder="t('app.remote.searchTargets')" :aria-label="t('app.remote.searchTargets')" />
      </InputGroup>

      <ScrollArea class="pr-3 [&_[data-slot=scroll-area-viewport]]:max-h-[min(22rem,calc(100dvh-14rem))]" :aria-busy="activityLoading">
        <div class="flex flex-col gap-1">
          <template v-if="hasMultipleTargets">
            <Button
              :variant="scope.kind !== MANAGEMENT_SCOPE_TARGET ? 'secondary' : 'ghost'"
              class="h-auto w-full justify-start px-2 py-2 text-left"
              :aria-pressed="scope.kind !== MANAGEMENT_SCOPE_TARGET"
              @click="selectAll"
            >
              <Check v-if="scope.kind !== MANAGEMENT_SCOPE_TARGET" data-icon="inline-start" />
              <Network v-else data-icon="inline-start" />
              <span class="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                <span class="font-medium">{{ t('app.remote.allTargets') }}</span>
                <span class="text-muted-foreground whitespace-normal text-xs font-normal" :title="activityError || undefined">{{ activityLabel() }}</span>
              </span>
            </Button>

            <Separator />
          </template>

          <Button
            v-for="target in filteredTargets"
            :key="target.id"
            :variant="scope.targetId === target.id ? 'secondary' : 'ghost'"
            class="h-auto w-full justify-start px-2 py-2 text-left"
            :aria-pressed="scope.targetId === target.id"
            @click="selectTarget(target)"
          >
            <Check v-if="scope.targetId === target.id" data-icon="inline-start" />
            <Server v-else data-icon="inline-start" />
            <span class="flex min-w-0 flex-1 flex-col items-start gap-0.5">
              <span class="max-w-full truncate font-medium">{{ targetName(target) }}</span>
              <span class="text-muted-foreground max-w-full whitespace-normal text-xs font-normal" :title="activityError || undefined">{{ activityLabel(target.id) }}</span>
            </span>
            <Badge :variant="targetState(target).variant">{{ t(`app.remote.states.${targetState(target).key}`) }}</Badge>
          </Button>

          <Empty v-if="!loading && filteredTargets.length === 0" class="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Search /></EmptyMedia>
              <EmptyTitle>{{ t('app.remote.noTargetMatches') }}</EmptyTitle>
              <EmptyDescription>{{ t('app.remote.noTargetMatchesDescription') }}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </ScrollArea>

      <Separator />
      <Button variant="ghost" size="sm" class="w-full justify-start" @click="openMachineManagement">
        <Settings data-icon="inline-start" />
        {{ t('app.remote.manageTargets') }}
      </Button>
    </PopoverContent>
  </Popover>
</template>

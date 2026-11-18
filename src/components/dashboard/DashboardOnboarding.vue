<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import {
  ArrowRight,
  Check,
  CircleAlert,
  FolderPlus,
  PackageOpen,
  Play,
  RefreshCw,
  ServerCog,
  Settings2
} from '@lucide/vue'
import { authAPI } from '@/api/v2'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useFleetDisclosure } from '@/composables/useFleetDisclosure'
import {
  dashboardOnboardingState,
  normalizePackaging,
  requiredSetupBlockers
} from '@/lib/dashboardOnboarding.mjs'

const props = defineProps({
  capabilities: { type: Object, default: () => ({}) },
  readiness: { type: Object, default: () => ({ checks: [] }) },
  onboardingSession: { type: Object, default: null },
  installed: { type: Boolean, default: false },
  installing: { type: Boolean, default: false },
  canInstall: { type: Boolean, default: false },
  rooms: { type: Array, default: () => [] },
  runningShards: { type: Number, default: 0 },
  cpuCores: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['install', 'refresh'])
const router = useRouter()
const { t } = useI18n()
const { showFleetControls } = useFleetDisclosure()
const completing = ref(false)

const packaging = computed(() => normalizePackaging(props.capabilities?.deployment?.packaging))
const localExecutorEnabled = computed(() => props.capabilities?.deployment?.localExecutorEnabled !== false)
const roomCount = computed(() => props.rooms.length)
const worldCount = computed(() => props.rooms.reduce(
  (total, room) => total + (Array.isArray(room.worlds) ? room.worlds.length : 0),
  0
))
const state = computed(() => dashboardOnboardingState({
  localExecutorEnabled: localExecutorEnabled.value,
  installed: props.installed,
  roomCount: roomCount.value,
  firstStartCompleted: props.readiness?.onboarding?.firstStartCompleted === true
}))
const blockers = computed(() => {
  if (!localExecutorEnabled.value) return []
  const checks = requiredSetupBlockers(props.readiness?.checks, { installed: props.installed })
  if (
    packaging.value === 'container' &&
    props.capabilities?.tools?.docker &&
    props.capabilities.tools.docker.available !== true
  ) {
    return [...checks, { id: 'docker', required: true, status: 'fail' }]
  }
  return checks
})
const visible = computed(() => state.value.visible)
const firstRoom = computed(() => props.rooms[0] || null)

function stepDescriptionKey(step) {
  if (step.id === 'game') {
    if (step.complete) return 'dashboard.onboarding.steps.game.done'
    if (props.installing) return 'dashboard.onboarding.steps.game.installing'
    return props.canInstall ? 'dashboard.onboarding.steps.game.ready' : 'dashboard.onboarding.steps.game.unavailable'
  }
  if (step.id === 'room') {
    return step.complete ? 'dashboard.onboarding.steps.room.done' : 'dashboard.onboarding.steps.room.ready'
  }
  return step.complete ? 'dashboard.onboarding.steps.start.done' : 'dashboard.onboarding.steps.start.ready'
}

function stepDescriptionParams(step) {
  if (step.id === 'room') return { rooms: roomCount.value, worlds: worldCount.value }
  if (step.id === 'start') return { count: props.runningShards }
  return {}
}

function checkLabel(check) {
  const known = new Set(['savePath', 'backupPath', 'tmux', 'serverExecutable', 'diskSpace', 'docker'])
  return t(`dashboard.onboarding.checks.${known.has(check.id) ? check.id : 'unknown'}`)
}

function openRoomCreation() {
  router.push('/rooms/settings')
}

function openRoomControl() {
  const room = firstRoom.value
  if (!room) return
  const world = Array.isArray(room.worlds) ? room.worlds[0] : null
  router.replace({
    path: '/dashboard',
    query: {
      roomId: String(room.id),
      ...(world?.id ? { worldId: String(world.id) } : {})
    }
  }).finally(() => {
    document.getElementById('room-operations')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

async function openWizard() {
  const targetStep = state.value.nextWizardStep || 'review'
  if (props.onboardingSession?.required && ['deployment', 'environment', 'game', 'room', 'review'].includes(targetStep)) {
    try {
      await authAPI.saveOnboarding(targetStep)
    } catch {
      // Navigate to the setup wizard even if saving the suggested step fails.
    }
  }
  await router.push({ path: '/setup', query: { step: targetStep } })
}

async function markOnboardingComplete() {
  if (completing.value) return
  completing.value = true
  try {
    await authAPI.saveOnboarding('complete')
  } catch (error) {
    toast.error(error?.message || t('setup.saveFailed'))
  } finally {
    completing.value = false
  }
}
</script>

<template>
  <Card v-if="visible" size="sm">
    <CardHeader>
      <CardTitle>{{ t('dashboard.onboarding.title') }}</CardTitle>
      <CardDescription>{{ t('dashboard.onboarding.checklistDescription') }}</CardDescription>
      <CardAction class="flex flex-wrap items-center gap-2">
        <Badge v-if="showFleetControls" variant="outline">{{ t(`dashboard.onboarding.packaging.${packaging}`) }}</Badge>
        <Button v-if="state.nextWizardStep" size="sm" variant="outline" @click="openWizard">
          {{ t('dashboard.onboarding.openWizard') }}
          <ArrowRight data-icon="inline-end" />
        </Button>
        <Button
          v-if="onboardingSession?.required"
          size="sm"
          variant="ghost"
          :disabled="completing"
          @click="markOnboardingComplete"
        >
          <Spinner v-if="completing" data-icon="inline-start" />
          <Check v-else data-icon="inline-start" />
          {{ t('dashboard.onboarding.completeOnboarding') }}
        </Button>
      </CardAction>
    </CardHeader>

    <CardContent class="flex flex-col gap-4 pt-0">
      <template v-if="loading && !capabilities?.deployment">
        <Skeleton class="h-2 w-full" />
        <div class="flex flex-col gap-2.5">
          <Skeleton v-for="index in 2" :key="index" class="h-14 w-full" />
        </div>
      </template>

      <template v-else-if="state.mode === 'remote'">
        <Alert>
          <ServerCog />
          <AlertTitle>{{ t('dashboard.onboarding.remote.title') }}</AlertTitle>
          <AlertDescription>{{ t('dashboard.onboarding.remote.description') }}</AlertDescription>
          <AlertAction>
            <Button size="sm" @click="router.push('/agents/list')">
              {{ t('dashboard.onboarding.remote.action') }}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </AlertAction>
        </Alert>
      </template>

      <template v-else>
        <div class="flex items-center gap-3">
          <Progress :model-value="state.progress" class="flex-1" />
          <span class="text-muted-foreground shrink-0 text-xs tabular-nums">
            {{ t('dashboard.onboarding.progress', { completed: state.completedCount, total: state.steps.length }) }}
          </span>
        </div>

        <ol class="flex flex-col gap-2.5">
          <li
            v-for="(step, index) in state.incompleteSteps"
            :key="step.id"
            class="flex flex-col gap-2.5 rounded-lg border bg-background/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            :aria-current="step.current ? 'step' : undefined"
          >
            <div class="flex min-w-0 items-start gap-3">
              <Badge :variant="step.current ? 'secondary' : 'outline'" class="size-7 shrink-0 justify-center p-0">
                <span>{{ index + 1 }}</span>
              </Badge>
              <div class="flex min-w-0 flex-col gap-0.5">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-medium">{{ t(`dashboard.onboarding.steps.${step.id}.title`) }}</span>
                  <Badge v-if="step.current" variant="secondary">{{ t('dashboard.onboarding.current') }}</Badge>
                </div>
                <p class="text-muted-foreground text-xs">
                  {{ t(stepDescriptionKey(step), stepDescriptionParams(step)) }}
                </p>
              </div>
            </div>

            <Button
              v-if="step.id === 'game'"
              size="sm"
              class="self-start sm:shrink-0 sm:self-center"
              :variant="step.current ? 'default' : 'outline'"
              :disabled="!canInstall || installing || blockers.length > 0"
              @click="emit('install')"
            >
              <Spinner v-if="installing" data-icon="inline-start" />
              <PackageOpen v-else data-icon="inline-start" />
              {{ t(installing ? 'dashboard.version.installButtonBusy' : 'dashboard.version.installButton') }}
            </Button>
            <Button
              v-else-if="step.id === 'room'"
              size="sm"
              class="self-start sm:shrink-0 sm:self-center"
              :variant="step.current ? 'default' : 'outline'"
              :disabled="blockers.length > 0"
              @click="openRoomCreation"
            >
              <FolderPlus data-icon="inline-start" />
              {{ t('dashboard.onboarding.steps.room.action') }}
            </Button>
            <Button
              v-else-if="step.id === 'start'"
              size="sm"
              class="self-start sm:shrink-0 sm:self-center"
              :variant="step.current ? 'default' : 'outline'"
              :disabled="!firstRoom || blockers.length > 0"
              @click="openRoomControl"
            >
              <Play data-icon="inline-start" />
              {{ t('dashboard.onboarding.steps.start.action') }}
            </Button>
          </li>
        </ol>
      </template>

      <Alert v-if="blockers.length" variant="destructive">
        <CircleAlert />
        <AlertTitle>{{ t('dashboard.onboarding.blocked.title') }}</AlertTitle>
        <AlertDescription>{{ t('dashboard.onboarding.blocked.description', { checks: blockers.map(checkLabel).join(t('dashboard.onboarding.blocked.separator')) }) }}</AlertDescription>
        <AlertAction>
          <Button size="sm" variant="outline" @click="router.push('/system/settings')">
            <Settings2 data-icon="inline-start" />
            {{ t('dashboard.onboarding.blocked.action') }}
          </Button>
        </AlertAction>
      </Alert>

      <Alert v-else-if="error">
        <CircleAlert />
        <AlertTitle>{{ t('dashboard.onboarding.loadFailed') }}</AlertTitle>
        <AlertDescription>{{ error }}</AlertDescription>
        <AlertAction>
          <Button size="sm" variant="outline" @click="emit('refresh')">
            <RefreshCw data-icon="inline-start" />
            {{ t('common.actions.retry') }}
          </Button>
        </AlertAction>
      </Alert>
    </CardContent>
  </Card>
</template>

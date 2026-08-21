<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  dashboardOnboardingState,
  normalizePackaging,
  requiredSetupBlockers
} from '@/lib/dashboardOnboarding.mjs'

const props = defineProps({
  capabilities: { type: Object, default: () => ({}) },
  readiness: { type: Object, default: () => ({ checks: [] }) },
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
  runningShards: props.runningShards
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
const visible = computed(() => state.value.visible || blockers.value.length > 0)
const compactHost = computed(() => Number(props.cpuCores) > 0 && Number(props.cpuCores) <= 2)
const deploymentDescriptionKey = computed(() => {
  if (packaging.value === 'all_in_one' && compactHost.value) return 'dashboard.onboarding.deployments.all_in_oneCompact'
  return `dashboard.onboarding.deployments.${packaging.value}`
})
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
  router.push({
    path: '/servers/workspace',
    query: {
      roomId: String(room.id),
      ...(world?.id ? { worldId: String(world.id) } : {})
    }
  })
}
</script>

<template>
  <Card v-if="visible" size="sm">
    <CardHeader>
      <CardTitle>{{ t('dashboard.onboarding.title') }}</CardTitle>
      <CardDescription>{{ t(deploymentDescriptionKey) }}</CardDescription>
      <CardAction>
        <Badge variant="outline">{{ t(`dashboard.onboarding.packaging.${packaging}`) }}</Badge>
      </CardAction>
    </CardHeader>

    <CardContent class="flex flex-col gap-4 pt-0">
      <template v-if="loading && !capabilities?.deployment">
        <Skeleton class="h-2 w-full" />
        <div class="grid gap-3 md:grid-cols-3">
          <Skeleton v-for="index in 3" :key="index" class="h-20 w-full" />
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

        <ol class="grid gap-4 md:grid-cols-3">
          <li
            v-for="(step, index) in state.steps"
            :key="step.id"
            class="flex min-w-0 items-start gap-3"
            :aria-current="step.current ? 'step' : undefined"
          >
            <Badge :variant="step.complete ? 'secondary' : 'outline'" class="size-7 shrink-0 justify-center p-0">
              <Check v-if="step.complete" />
              <span v-else>{{ index + 1 }}</span>
            </Badge>
            <div class="flex min-w-0 flex-1 flex-col gap-2">
              <div class="flex min-w-0 flex-col gap-0.5">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-medium">{{ t(`dashboard.onboarding.steps.${step.id}.title`) }}</span>
                  <Badge v-if="step.current" variant="secondary">{{ t('dashboard.onboarding.current') }}</Badge>
                </div>
                <p class="text-muted-foreground text-xs">
                  {{ t(stepDescriptionKey(step), stepDescriptionParams(step)) }}
                </p>
              </div>

              <Button
                v-if="step.current && step.id === 'game'"
                size="sm"
                class="self-start"
                :disabled="!canInstall || installing || blockers.length > 0"
                @click="emit('install')"
              >
                <Spinner v-if="installing" data-icon="inline-start" />
                <PackageOpen v-else data-icon="inline-start" />
                {{ t(installing ? 'dashboard.version.installButtonBusy' : 'dashboard.version.installButton') }}
              </Button>
              <Button v-else-if="step.current && step.id === 'room'" size="sm" class="self-start" :disabled="blockers.length > 0" @click="openRoomCreation">
                <FolderPlus data-icon="inline-start" />
                {{ t('dashboard.onboarding.steps.room.action') }}
              </Button>
              <Button v-else-if="step.current && step.id === 'start'" size="sm" class="self-start" :disabled="blockers.length > 0" @click="openRoomControl">
                <Play data-icon="inline-start" />
                {{ t('dashboard.onboarding.steps.start.action') }}
              </Button>
            </div>
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

<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ArrowRight,
  CircleAlert,
  PackageOpen,
  PackageCheck,
  RefreshCw
} from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import DashboardOnboarding from '@/components/dashboard/DashboardOnboarding.vue'
import ServerWorkspace from '@/views/servers/ServerWorkspace.vue'
import { useRoomRefreshInterval } from '@/composables/useDashboardRefreshIntervals'
import { useDashboardV2 } from '@/composables/useDashboardV2'

const router = useRouter()
const { t } = useI18n()
const { refreshIntervalMs } = useRoomRefreshInterval()
let runtimeRefreshTimer = null

const {
  systemStatus,
  roomList,
  versionInfo,
  capabilities,
  setupReadiness,
  onboardingResolved,
  serverLoading,
  versionLoading,
  guidanceLoading,
  versionError,
  guidanceError,
  runningServerCount,
  canInstallGame,
  canUpdateGame,
  gameUpdateBusy,
  isVersionOutdated,
  refreshDashboard,
  refreshRuntimeServers,
  refreshVersion,
  refreshGuidance,
  updateGame,
  resumeUpdatePolling
} = useDashboardV2()

const gameUpdateState = computed(() => {
  if (gameUpdateBusy.value) {
    return { key: versionInfo.value.installed ? 'updating' : 'installing', variant: 'secondary' }
  }
  if (versionError.value) {
    return { key: 'loadFailed', variant: 'destructive' }
  }
  if (!versionInfo.value.installed) {
    return { key: 'installRequired', variant: 'outline' }
  }
  if (versionInfo.value.latest?.up_to_date === false) {
    return { key: 'updateAvailable', variant: 'default' }
  }
  if (versionInfo.value.latest?.up_to_date === true) {
    return { key: 'upToDate', variant: 'secondary' }
  }
  return { key: 'updateStateUnknown', variant: 'outline' }
})

const currentGameVersion = computed(() => versionInfo.value.local?.version || '--')
const latestGameVersion = computed(() => versionInfo.value.latest?.version || '--')

async function refreshRuntimeStatus() {
  if (document.visibilityState === 'hidden') return
  await refreshRuntimeServers()
}

function stopRuntimeRefreshTimer() {
  if (runtimeRefreshTimer) window.clearInterval(runtimeRefreshTimer)
  runtimeRefreshTimer = null
}

function startRuntimeRefreshTimer() {
  stopRuntimeRefreshTimer()
  if (document.visibilityState === 'hidden') return
  runtimeRefreshTimer = window.setInterval(refreshRuntimeStatus, refreshIntervalMs.value)
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    stopRuntimeRefreshTimer()
    return
  }
  refreshRuntimeStatus()
  startRuntimeRefreshTimer()
}

const stopRefreshIntervalWatch = watch(refreshIntervalMs, () => {
  refreshRuntimeStatus()
  startRuntimeRefreshTimer()
})

onMounted(async () => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  await refreshDashboard()
  resumeUpdatePolling()
  startRuntimeRefreshTimer()
})

onBeforeUnmount(() => {
  stopRuntimeRefreshTimer()
  stopRefreshIntervalWatch()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-5">
    <DashboardOnboarding
      v-if="onboardingResolved"
      :capabilities="capabilities"
      :readiness="setupReadiness"
      :installed="versionInfo.installed"
      :installing="gameUpdateBusy"
      :can-install="canInstallGame"
      :rooms="roomList"
      :running-shards="runningServerCount"
      :cpu-cores="Number(systemStatus.cpu_cores) || 0"
      :loading="guidanceLoading || versionLoading || serverLoading"
      :error="guidanceError"
      @install="updateGame"
      @refresh="refreshGuidance"
    />

    <Alert :variant="versionError ? 'destructive' : 'default'">
      <CircleAlert v-if="versionError" />
      <PackageCheck v-else />
      <AlertTitle class="flex flex-wrap items-center gap-2">
        <span>{{ t('dashboard.version.simpleTitle') }}</span>
        <Badge :variant="gameUpdateState.variant">{{ t(`dashboard.version.${gameUpdateState.key}`) }}</Badge>
      </AlertTitle>
      <AlertDescription class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <span>{{ t('dashboard.version.currentVersion') }} <strong class="text-foreground font-medium">{{ currentGameVersion }}</strong></span>
          <ArrowRight class="size-3.5 shrink-0" aria-hidden="true" />
          <span>{{ t('dashboard.version.latestVersion') }} <strong class="text-foreground font-medium">{{ latestGameVersion }}</strong></span>
          <span v-if="versionError" class="break-all">{{ versionError }}</span>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-sm" :disabled="versionLoading" :aria-label="t('dashboard.version.check')" @click="refreshVersion">
                <Spinner v-if="versionLoading" />
                <RefreshCw v-else />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{{ t('dashboard.version.check') }}</TooltipContent>
          </Tooltip>
          <Button v-if="canInstallGame" size="sm" :disabled="gameUpdateBusy" @click="updateGame">
            <Spinner v-if="gameUpdateBusy" data-icon="inline-start" />
            <PackageOpen v-else data-icon="inline-start" />
            {{ t(gameUpdateBusy ? 'dashboard.version.installButtonBusy' : 'dashboard.version.installButton') }}
          </Button>
          <Button v-else-if="isVersionOutdated && canUpdateGame" size="sm" :disabled="gameUpdateBusy" @click="updateGame">
            <Spinner v-if="gameUpdateBusy" data-icon="inline-start" />
            <PackageCheck v-else data-icon="inline-start" />
            {{ t(gameUpdateBusy ? 'dashboard.version.updateButtonBusy' : 'dashboard.version.updateButton') }}
          </Button>
          <Button v-else-if="isVersionOutdated" size="sm" variant="ghost" @click="router.push('/servers/releases')">
            {{ t('dashboard.version.openUpdateHelp') }}
          </Button>
        </div>
      </AlertDescription>
    </Alert>

    <ServerWorkspace id="room-operations" embedded />

  </div>
</template>

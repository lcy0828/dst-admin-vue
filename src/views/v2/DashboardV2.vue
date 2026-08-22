<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue'
import DashboardOnboarding from '@/components/dashboard/DashboardOnboarding.vue'
import ServerWorkspace from '@/views/servers/ServerWorkspace.vue'
import { useRoomRefreshInterval } from '@/composables/useDashboardRefreshIntervals'
import { useDashboardV2 } from '@/composables/useDashboardV2'

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
  guidanceError,
  runningServerCount,
  canInstallGame,
  gameUpdateBusy,
  refreshDashboard,
  refreshRuntimeServers,
  refreshGuidance,
  updateGame
} = useDashboardV2()

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

    <ServerWorkspace id="room-operations" embedded />

  </div>
</template>

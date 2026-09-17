<script setup>
import { onMounted } from 'vue'
import DashboardOnboarding from '@/components/dashboard/DashboardOnboarding.vue'
import ServerWorkspace from '@/views/servers/ServerWorkspace.vue'
import { useDashboardV2 } from '@/composables/useDashboardV2'

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
  refreshGuidance,
  updateGame
} = useDashboardV2()

onMounted(refreshDashboard)
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

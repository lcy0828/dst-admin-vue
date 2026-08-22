<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  CircleAlert,
  Cpu,
  Gauge,
  HardDrive,
  MemoryStick,
  PackageOpen,
  PackageCheck,
  RefreshCw
} from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import DashboardOnboarding from '@/components/dashboard/DashboardOnboarding.vue'
import ServerWorkspace from '@/views/servers/ServerWorkspace.vue'
import {
  formatDateTime,
  formatDecimal,
  formatDisk,
  formatMemory,
  formatSystemUptime,
  hasMetric,
  loadPercentage,
  percentage,
  useDashboardV2
} from '@/composables/useDashboardV2'

const router = useRouter()
const { locale, t } = useI18n()
const RUNTIME_REFRESH_INTERVAL_MS = 10_000
let runtimeRefreshTimer = null

const {
  systemStatus,
  roomList,
  versionInfo,
  capabilities,
  setupReadiness,
  updateStatus,
  systemLoading,
  serverLoading,
  versionLoading,
  guidanceLoading,
  systemError,
  versionError,
  guidanceError,
  runningServerCount,
  canInstallGame,
  canUpdateGame,
  gameUpdateBusy,
  isVersionOutdated,
  refreshDashboard,
  refreshSystem,
  refreshRuntimeServers,
  refreshVersion,
  refreshGuidance,
  updateGame,
  resumeUpdatePolling
} = useDashboardV2()

const gameUpdateState = computed(() => {
  if (!versionInfo.value.installed) {
    return { key: 'installRequired', descriptionKey: 'installRequiredDescription', variant: 'outline' }
  }
  if (versionInfo.value.latest?.up_to_date === false) {
    return {
      key: 'updateAvailable',
      descriptionKey: canUpdateGame.value ? 'updateAvailableDescription' : 'externalUpdateDescription',
      variant: 'default'
    }
  }
  if (versionInfo.value.latest?.up_to_date === true) {
    return { key: 'upToDate', descriptionKey: 'upToDateDescription', variant: 'secondary' }
  }
  return { key: 'updateStateUnknown', descriptionKey: 'updateStateUnknownDescription', variant: 'outline' }
})

async function refreshRuntimeStatus() {
  if (document.visibilityState === 'hidden') return
  await refreshRuntimeServers()
}

onMounted(async () => {
  await refreshDashboard()
  resumeUpdatePolling()
  runtimeRefreshTimer = window.setInterval(refreshRuntimeStatus, RUNTIME_REFRESH_INTERVAL_MS)
})

onBeforeUnmount(() => {
  if (runtimeRefreshTimer) window.clearInterval(runtimeRefreshTimer)
  runtimeRefreshTimer = null
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-5">
    <DashboardOnboarding
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

    <div class="grid min-w-0 items-start gap-4 lg:grid-cols-2">
      <Card size="sm">
          <CardHeader>
            <CardTitle class="flex items-center gap-2"><Gauge />{{ t('dashboard.resources.title') }}</CardTitle>
            <CardDescription>{{ systemStatus.os_info || t('dashboard.summary.waitingSystem') }}</CardDescription>
            <CardAction>
              <Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon-sm" :disabled="systemLoading" :aria-label="t('dashboard.resources.refresh')" @click="refreshSystem"><Spinner v-if="systemLoading" /><RefreshCw v-else /></Button></TooltipTrigger><TooltipContent>{{ t('dashboard.resources.refresh') }}</TooltipContent></Tooltip>
            </CardAction>
          </CardHeader>
          <CardContent class="pt-0">
            <Alert v-if="systemError" variant="destructive"><CircleAlert /><AlertTitle>{{ t('dashboard.resources.unavailable') }}</AlertTitle><AlertDescription>{{ systemError }}</AlertDescription></Alert>
            <div v-else class="grid min-w-0 grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <div class="flex min-w-0 flex-col gap-2">
                <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-sm"><Cpu class="text-muted-foreground size-4" />CPU</span><strong class="tabular-nums">{{ hasMetric(systemStatus.cpu_usage) ? `${percentage(systemStatus.cpu_usage)}%` : '--' }}</strong></div>
                <Progress :model-value="percentage(systemStatus.cpu_usage)" />
                <span class="text-muted-foreground truncate text-xs" :title="`${systemStatus.cpu_model || '--'} · ${t('dashboard.resources.coresThreads', { cores: systemStatus.cpu_cores || '--', threads: systemStatus.cpu_threads || '--' })}`">{{ systemStatus.cpu_model || '--' }} · {{ t('dashboard.resources.coresThreads', { cores: systemStatus.cpu_cores || '--', threads: systemStatus.cpu_threads || '--' }) }}</span>
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-sm"><MemoryStick class="text-muted-foreground size-4" />{{ t('dashboard.resources.memory') }}</span><strong class="tabular-nums">{{ hasMetric(systemStatus.memory_usage) ? `${percentage(systemStatus.memory_usage)}%` : '--' }}</strong></div>
                <Progress :model-value="percentage(systemStatus.memory_usage)" />
                <span class="text-muted-foreground truncate text-xs" :title="t('dashboard.resources.used', { used: formatMemory(systemStatus.used_memory), total: formatMemory(systemStatus.total_memory) })">{{ t('dashboard.resources.used', { used: formatMemory(systemStatus.used_memory), total: formatMemory(systemStatus.total_memory) }) }}</span>
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-sm"><HardDrive class="text-muted-foreground size-4" />{{ t('dashboard.resources.disk') }}</span><strong class="tabular-nums">{{ hasMetric(systemStatus.disk_usage) ? `${percentage(systemStatus.disk_usage)}%` : '--' }}</strong></div>
                <Progress :model-value="percentage(systemStatus.disk_usage)" />
                <span class="text-muted-foreground truncate text-xs" :title="t('dashboard.resources.free', { free: formatDisk(systemStatus.free_disk), total: formatDisk(systemStatus.total_disk) })">{{ t('dashboard.resources.free', { free: formatDisk(systemStatus.free_disk), total: formatDisk(systemStatus.total_disk) }) }}</span>
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <div class="flex items-center justify-between"><span class="text-sm">{{ t('dashboard.resources.load') }}</span><strong class="tabular-nums">{{ formatDecimal(systemStatus.cpu_load1) }}</strong></div>
                <Progress :model-value="loadPercentage(systemStatus.cpu_load1, systemStatus.cpu_threads || systemStatus.cpu_cores)" />
                <span class="text-muted-foreground truncate text-xs" :title="t('dashboard.resources.loadWindow', { one: formatDecimal(systemStatus.cpu_load1), five: formatDecimal(systemStatus.cpu_load5), fifteen: formatDecimal(systemStatus.cpu_load15) })">{{ t('dashboard.resources.loadWindow', { one: formatDecimal(systemStatus.cpu_load1), five: formatDecimal(systemStatus.cpu_load5), fifteen: formatDecimal(systemStatus.cpu_load15) }) }}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter class="text-muted-foreground flex-wrap justify-between gap-2 text-xs"><span>{{ t('dashboard.resources.uptime', { value: formatSystemUptime(systemStatus, t) }) }}</span><span>{{ formatDateTime(systemStatus.current_time, locale) }}</span></CardFooter>
      </Card>

      <Card size="sm">
          <CardHeader>
            <CardTitle class="flex items-center gap-2"><PackageCheck />{{ t('dashboard.version.simpleTitle') }}</CardTitle>
            <CardDescription>{{ t('dashboard.version.simpleDescription') }}</CardDescription>
            <CardAction><Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon-sm" :disabled="versionLoading" :aria-label="t('dashboard.version.check')" @click="refreshVersion"><Spinner v-if="versionLoading" /><RefreshCw v-else /></Button></TooltipTrigger><TooltipContent>{{ t('dashboard.version.check') }}</TooltipContent></Tooltip></CardAction>
          </CardHeader>
          <CardContent class="flex flex-col gap-3 pt-0">
            <Alert v-if="versionError" variant="destructive"><CircleAlert /><AlertTitle>{{ t('dashboard.version.loadFailed') }}</AlertTitle><AlertDescription>{{ versionError }}</AlertDescription></Alert>
            <template v-else>
              <div class="flex min-w-0 items-start justify-between gap-4">
                <div class="flex min-w-0 flex-col gap-1">
                  <strong class="text-base font-semibold">{{ t(`dashboard.version.${gameUpdateState.key}`) }}</strong>
                  <p class="text-muted-foreground text-sm">{{ t(`dashboard.version.${gameUpdateState.descriptionKey}`) }}</p>
                </div>
                <Badge class="shrink-0" :variant="gameUpdateState.variant">{{ t(`dashboard.version.${gameUpdateState.key}`) }}</Badge>
              </div>
              <div v-if="updateStatus" class="bg-muted flex flex-col gap-2 rounded-md p-3"><span class="text-sm font-medium">{{ t(updateStatus.is_completed ? 'dashboard.version.updateCompleted' : (updateStatus.is_running ? (versionInfo.installed ? 'dashboard.version.updating' : 'dashboard.version.installing') : 'dashboard.version.waiting')) }}</span><Progress v-if="hasMetric(updateStatus.progress)" :model-value="Number(updateStatus.progress)" /><p v-if="updateStatus.last_output" class="text-muted-foreground break-all text-xs">{{ updateStatus.last_output }}</p><p v-if="updateStatus.error" class="text-destructive text-xs">{{ updateStatus.error }}</p></div>
            </template>
          </CardContent>
          <CardFooter v-if="canInstallGame || isVersionOutdated">
            <Button v-if="canInstallGame" size="sm" :disabled="gameUpdateBusy" @click="updateGame"><Spinner v-if="gameUpdateBusy" data-icon="inline-start" /><PackageOpen v-else data-icon="inline-start" />{{ t(gameUpdateBusy ? 'dashboard.version.installButtonBusy' : 'dashboard.version.installButton') }}</Button>
            <Button v-else-if="isVersionOutdated && canUpdateGame" size="sm" :disabled="gameUpdateBusy" @click="updateGame"><Spinner v-if="gameUpdateBusy" data-icon="inline-start" /><PackageCheck v-else data-icon="inline-start" />{{ t(gameUpdateBusy ? 'dashboard.version.updateButtonBusy' : 'dashboard.version.updateButton') }}</Button>
            <Button v-else size="sm" variant="outline" @click="router.push('/servers/releases')"><PackageCheck data-icon="inline-start" />{{ t('dashboard.version.openUpdateHelp') }}</Button>
          </CardFooter>
      </Card>
    </div>

  </div>
</template>

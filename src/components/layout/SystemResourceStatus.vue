<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Activity, CircleAlert, Cpu, HardDrive, MemoryStick, RefreshCw } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSystemResourceStatus } from '@/composables/useSystemResourceStatus'
import {
  formatDecimal,
  formatDisk,
  formatMemory,
  formatResourceDateTime,
  formatSystemUptime,
  hasMetric,
  loadPercentage,
  percentage
} from '@/lib/systemResourceMetrics.mjs'
import { cn } from '@/lib/utils'

const { locale, t } = useI18n()
const {
  status,
  loading,
  error,
  lastUpdatedAt,
  refreshSystemResourceStatus,
  startSystemResourcePolling,
  stopSystemResourcePolling
} = useSystemResourceStatus()

const hasStatus = computed(() => Object.keys(status.value || {}).length > 0)
const loadCapacity = computed(() => status.value.cpu_threads || status.value.cpu_cores)

function formatPercent(value) {
  return hasMetric(value) ? `${percentage(value)}%` : '--'
}

function usageClass(value) {
  return cn('tabular-nums font-semibold', hasMetric(value) && percentage(value) >= 90 && 'text-destructive')
}

function sampledAt() {
  return formatResourceDateTime(status.value.current_time || lastUpdatedAt.value, locale.value)
}

onMounted(startSystemResourcePolling)
onBeforeUnmount(stopSystemResourcePolling)
</script>

<template>
  <div class="flex min-w-0 shrink-0 items-center">
    <Popover>
      <PopoverTrigger as-child>
        <Button
          variant="ghost"
          size="sm"
          class="max-w-full gap-3 px-2"
          :aria-label="t('dashboard.resources.viewDetails')"
        >
          <span class="flex items-center gap-1">
            <Cpu class="text-muted-foreground" />
            <span class="hidden 2xl:inline">CPU</span>
            <strong :class="usageClass(status.cpu_usage)">{{ formatPercent(status.cpu_usage) }}</strong>
          </span>
          <span class="flex items-center gap-1">
            <MemoryStick class="text-muted-foreground" />
            <span class="hidden 2xl:inline">{{ t('dashboard.resources.memory') }}</span>
            <strong :class="usageClass(status.memory_usage)">{{ formatPercent(status.memory_usage) }}</strong>
          </span>
          <span class="hidden items-center gap-1 sm:flex">
            <HardDrive class="text-muted-foreground" />
            <span class="hidden 2xl:inline">{{ t('dashboard.resources.disk') }}</span>
            <strong :class="usageClass(status.disk_usage)">{{ formatPercent(status.disk_usage) }}</strong>
          </span>
          <span class="hidden items-center gap-1 xl:flex">
            <Activity class="text-muted-foreground" />
            <span class="hidden 2xl:inline">{{ t('dashboard.resources.loadShort') }}</span>
            <strong class="tabular-nums font-semibold">{{ formatDecimal(status.cpu_load1) }}</strong>
          </span>
          <CircleAlert v-if="error" class="text-destructive" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" :side-offset="8" class="relative w-[min(24rem,calc(100vw-2rem))] gap-3 p-3">
        <PopoverHeader class="pr-8">
          <PopoverTitle>{{ t('dashboard.resources.title') }}</PopoverTitle>
          <PopoverDescription>{{ status.os_info || t('dashboard.summary.waitingSystem') }}</PopoverDescription>
        </PopoverHeader>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              class="absolute right-2 top-2"
              :disabled="loading"
              :aria-label="t('dashboard.resources.refresh')"
              @click="refreshSystemResourceStatus"
            >
              <Spinner v-if="loading" />
              <RefreshCw v-else />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ t('dashboard.resources.refresh') }}</TooltipContent>
        </Tooltip>

        <Alert v-if="error && !hasStatus" variant="destructive">
          <CircleAlert />
          <AlertTitle>{{ t('dashboard.resources.unavailable') }}</AlertTitle>
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>

        <template v-else>
          <p v-if="error" class="text-destructive text-xs">{{ t('dashboard.resources.refreshFailed') }}</p>
          <div class="grid min-w-0 grid-cols-2 gap-x-4 gap-y-4">
            <div class="flex min-w-0 flex-col gap-2">
              <div class="flex items-center justify-between gap-2 text-sm">
                <span class="flex items-center gap-1.5"><Cpu class="text-muted-foreground size-4" />CPU</span>
                <strong :class="usageClass(status.cpu_usage)">{{ formatPercent(status.cpu_usage) }}</strong>
              </div>
              <Progress :model-value="percentage(status.cpu_usage)" />
              <span class="text-muted-foreground truncate text-xs" :title="`${status.cpu_model || '--'} · ${t('dashboard.resources.coresThreads', { cores: status.cpu_cores || '--', threads: status.cpu_threads || '--' })}`">
                {{ status.cpu_model || '--' }} · {{ t('dashboard.resources.coresThreads', { cores: status.cpu_cores || '--', threads: status.cpu_threads || '--' }) }}
              </span>
            </div>

            <div class="flex min-w-0 flex-col gap-2">
              <div class="flex items-center justify-between gap-2 text-sm">
                <span class="flex items-center gap-1.5"><MemoryStick class="text-muted-foreground size-4" />{{ t('dashboard.resources.memory') }}</span>
                <strong :class="usageClass(status.memory_usage)">{{ formatPercent(status.memory_usage) }}</strong>
              </div>
              <Progress :model-value="percentage(status.memory_usage)" />
              <span class="text-muted-foreground truncate text-xs" :title="t('dashboard.resources.used', { used: formatMemory(status.used_memory), total: formatMemory(status.total_memory) })">
                {{ t('dashboard.resources.used', { used: formatMemory(status.used_memory), total: formatMemory(status.total_memory) }) }}
              </span>
            </div>

            <div class="flex min-w-0 flex-col gap-2">
              <div class="flex items-center justify-between gap-2 text-sm">
                <span class="flex items-center gap-1.5"><HardDrive class="text-muted-foreground size-4" />{{ t('dashboard.resources.disk') }}</span>
                <strong :class="usageClass(status.disk_usage)">{{ formatPercent(status.disk_usage) }}</strong>
              </div>
              <Progress :model-value="percentage(status.disk_usage)" />
              <span class="text-muted-foreground truncate text-xs" :title="t('dashboard.resources.free', { free: formatDisk(status.free_disk), total: formatDisk(status.total_disk) })">
                {{ t('dashboard.resources.free', { free: formatDisk(status.free_disk), total: formatDisk(status.total_disk) }) }}
              </span>
            </div>

            <div class="flex min-w-0 flex-col gap-2">
              <div class="flex items-center justify-between gap-2 text-sm">
                <span class="flex items-center gap-1.5"><Activity class="text-muted-foreground size-4" />{{ t('dashboard.resources.load') }}</span>
                <strong class="tabular-nums font-semibold">{{ formatDecimal(status.cpu_load1) }}</strong>
              </div>
              <Progress :model-value="loadPercentage(status.cpu_load1, loadCapacity)" />
              <span class="text-muted-foreground truncate text-xs" :title="t('dashboard.resources.loadWindow', { one: formatDecimal(status.cpu_load1), five: formatDecimal(status.cpu_load5), fifteen: formatDecimal(status.cpu_load15) })">
                {{ t('dashboard.resources.loadWindow', { one: formatDecimal(status.cpu_load1), five: formatDecimal(status.cpu_load5), fifteen: formatDecimal(status.cpu_load15) }) }}
              </span>
            </div>
          </div>

          <Separator />
          <div class="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>{{ t('dashboard.resources.uptime', { value: formatSystemUptime(status, t) }) }}</span>
            <span>{{ t('dashboard.resources.sampledAt', { time: sampledAt() }) }}</span>
          </div>
        </template>
      </PopoverContent>
    </Popover>
  </div>
</template>

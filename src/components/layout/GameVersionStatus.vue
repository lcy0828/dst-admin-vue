<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowRight, CircleAlert, PackageCheck, PackageOpen, RefreshCw } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useDashboardV2 } from '@/composables/useDashboardV2'

const router = useRouter()
const { t } = useI18n()
const initialLoadPending = ref(true)

const {
  versionInfo,
  versionLoading,
  versionError,
  canInstallGame,
  canUpdateGame,
  gameUpdateBusy,
  isVersionOutdated,
  refreshVersion,
  updateGame,
  resumeUpdatePolling
} = useDashboardV2()

const currentVersion = computed(() => versionInfo.value.local?.version || '--')
const latestVersion = computed(() => versionInfo.value.latest?.version || '--')
const versionPending = computed(() => initialLoadPending.value || versionLoading.value)
const gameUpdateState = computed(() => {
  if (versionPending.value) return { key: 'checking', variant: 'outline' }
  if (gameUpdateBusy.value) {
    return { key: versionInfo.value.installed ? 'updating' : 'installing', variant: 'secondary' }
  }
  if (versionError.value) return { key: 'loadFailed', variant: 'destructive' }
  if (!versionInfo.value.installed) return { key: 'installRequired', variant: 'outline' }
  if (versionInfo.value.latest?.up_to_date === false) return { key: 'updateAvailable', variant: 'default' }
  if (versionInfo.value.latest?.up_to_date === true) return { key: 'upToDate', variant: 'secondary' }
  return { key: 'updateStateUnknown', variant: 'outline' }
})
const triggerLabel = computed(() => [
  t('dashboard.version.simpleTitle'),
  `${t('dashboard.version.currentVersion')} ${currentVersion.value}`,
  `${t('dashboard.version.latestVersion')} ${latestVersion.value}`,
  t(`dashboard.version.${gameUpdateState.value.key}`)
].join(' · '))

async function loadVersion() {
  try {
    await refreshVersion()
  } finally {
    initialLoadPending.value = false
  }
}

onMounted(() => {
  loadVersion()
  resumeUpdatePolling()
})
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="ghost"
        size="sm"
        class="max-w-full px-2"
        :aria-label="triggerLabel"
        :title="triggerLabel"
      >
        <Spinner v-if="versionPending" data-icon="inline-start" />
        <CircleAlert v-else-if="versionError" data-icon="inline-start" />
        <PackageOpen v-else-if="!versionInfo.installed || isVersionOutdated" data-icon="inline-start" />
        <PackageCheck v-else data-icon="inline-start" />
        <span class="hidden min-w-0 items-center gap-1.5 xl:flex">
          <span class="text-muted-foreground hidden 2xl:inline">{{ t('dashboard.version.currentVersion') }}</span>
          <strong class="tabular-nums">{{ currentVersion }}</strong>
          <ArrowRight aria-hidden="true" />
          <span class="text-muted-foreground hidden 2xl:inline">{{ t('dashboard.version.latestVersion') }}</span>
          <strong class="tabular-nums">{{ latestVersion }}</strong>
        </span>
        <Badge class="hidden 2xl:inline-flex" :variant="gameUpdateState.variant">
          {{ t(`dashboard.version.${gameUpdateState.key}`) }}
        </Badge>
      </Button>
    </PopoverTrigger>

    <PopoverContent align="end" :side-offset="8" class="w-[min(22rem,calc(100vw-2rem))] gap-3 p-3">
      <PopoverHeader>
        <div class="flex items-center justify-between gap-3">
          <PopoverTitle>{{ t('dashboard.version.simpleTitle') }}</PopoverTitle>
          <Badge :variant="gameUpdateState.variant">{{ t(`dashboard.version.${gameUpdateState.key}`) }}</Badge>
        </div>
        <PopoverDescription class="sr-only">{{ triggerLabel }}</PopoverDescription>
      </PopoverHeader>

      <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="text-muted-foreground text-xs">{{ t('dashboard.version.currentVersion') }}</span>
          <strong class="truncate tabular-nums" :title="currentVersion">{{ currentVersion }}</strong>
        </div>
        <ArrowRight class="text-muted-foreground" aria-hidden="true" />
        <div class="flex min-w-0 flex-col gap-1 text-right">
          <span class="text-muted-foreground text-xs">{{ t('dashboard.version.latestVersion') }}</span>
          <strong class="truncate tabular-nums" :title="latestVersion">{{ latestVersion }}</strong>
        </div>
      </div>

      <Alert v-if="versionError" variant="destructive">
        <CircleAlert />
        <AlertTitle>{{ t('dashboard.version.loadFailed') }}</AlertTitle>
        <AlertDescription class="break-all">{{ versionError }}</AlertDescription>
      </Alert>

      <div class="flex items-center justify-end gap-2">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon-sm" :disabled="versionPending" :aria-label="t('dashboard.version.check')" @click="loadVersion">
              <Spinner v-if="versionPending" />
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
        <Button v-else-if="isVersionOutdated" size="sm" variant="outline" @click="router.push('/servers/releases')">
          {{ t('dashboard.version.openUpdateHelp') }}
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</template>

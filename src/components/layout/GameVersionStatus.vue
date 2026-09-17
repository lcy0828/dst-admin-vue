<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowRight, ChevronDown, CircleAlert, FileText, History, PackageCheck, PackageOpen, RefreshCw, Server } from '@lucide/vue'
import { gameReleasesV2API } from '@/api/v2'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useDashboardV2 } from '@/composables/useDashboardV2'
import {
  gameReleaseApplicationKey,
  gameReleaseGameVersions,
  gameReleaseNodeCount,
  gameReleasePlatformKey,
  gameReleaseVersionChannels
} from '@/lib/gameRelease.mjs'
import { gameInstalledVersionStatus } from '@/lib/gameInstalledVersion.mjs'
import {
  getManagementScope,
  MANAGEMENT_SCOPE_CHANGED_EVENT,
  managementScopeIncludesTarget,
  managementScopeRequest,
  managementScopeTargetId
} from '@/lib/managementScope.mjs'

const KLEI_DST_RELEASES_URL = 'https://kleiforums.com/game-updates/dst/'

const router = useRouter()
const { t } = useI18n()
const initialLoadPending = ref(true)
const popoverOpen = ref(false)
const fleetPlan = ref(null)
const fleetLoading = ref(false)
const fleetError = ref('')
const fleetLoaded = ref(false)
const technicalOpen = ref(false)
const managementScope = ref(getManagementScope())
const localActionsVisible = computed(() => managementScopeIncludesTarget('local', managementScope.value) && !fleetError.value && !fleetLoading.value)
let fleetRequestSequence = 0

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
} = useDashboardV2({ observeRuntime: false })

const officialGameVersion = computed(() => versionInfo.value.official?.version || '--')
const officialReleaseId = computed(() => versionInfo.value.official?.release_id || '')
const officialReleaseUrl = computed(() => versionInfo.value.official?.update_url || '')
const officialReleaseStale = computed(() => versionInfo.value.official?.stale === true)
const officialTestRelease = computed(() => versionInfo.value.official?.test_release)
const officialError = computed(() => versionError.value || versionInfo.value.official_check_error || '')
const fleetInstallations = computed(() => fleetPlan.value?.installations || [])
const fleetNodeCount = computed(() => gameReleaseNodeCount(fleetInstallations.value))
const fleetGameVersions = computed(() => gameReleaseGameVersions(fleetInstallations.value))
const currentGameVersionLabel = computed(() => {
  if (!fleetGameVersions.value.length) return '--'
  if (fleetGameVersions.value.length === 1) return fleetGameVersions.value[0]
  return t('dashboard.version.mixedGameVersions', { count: fleetGameVersions.value.length })
})
const fleetVersionChannels = computed(() => gameReleaseVersionChannels(fleetInstallations.value))
const fleetVersionChannelsLabel = computed(() => fleetVersionChannels.value
  .map(versionChannelLabel)
  .join(t('gameReleases.nodes.channelSeparator')))
const fleetStates = computed(() => fleetInstallations.value.map(fleetTargetGameStatus))
const fleetCheckFailed = computed(() => fleetStates.value.some(state => state.key === 'checkFailed'))
const fleetUpdateRequired = computed(() => fleetStates.value.some(state => state.key === 'ready'))
const fleetListHeight = computed(() => `${Math.min(fleetInstallations.value.length, 4) * 3.5}rem`)
const versionPending = computed(() => initialLoadPending.value || versionLoading.value)
const gameUpdateState = computed(() => {
  if (versionPending.value) return { key: 'checking', variant: 'outline' }
  if (gameUpdateBusy.value) {
    return { key: versionInfo.value.installed ? 'updating' : 'installing', variant: 'secondary' }
  }
  if (fleetLoading.value && !fleetLoaded.value) return { key: 'checking', variant: 'outline' }
  if (officialError.value || fleetError.value) return { key: 'loadFailed', variant: 'destructive' }
  if (fleetLoaded.value && !fleetInstallations.value.length && !localActionsVisible.value) return { key: 'updateStateUnknown', variant: 'outline' }
  if (fleetPlan.value && fleetInstallations.value.length) {
    if (officialError.value || fleetCheckFailed.value) return { key: 'loadFailed', variant: 'destructive' }
    if (fleetUpdateRequired.value) return { key: 'updateAvailable', variant: 'default' }
    if (fleetStates.value.every(state => state.key === 'upToDate')) return { key: 'upToDate', variant: 'secondary' }
    return { key: 'updateStateUnknown', variant: 'outline' }
  }
  if (versionError.value) return { key: 'loadFailed', variant: 'destructive' }
  if (!versionInfo.value.installed) return { key: 'installRequired', variant: 'outline' }
  if (versionInfo.value.latest?.up_to_date === false) return { key: 'updateAvailable', variant: 'default' }
  if (versionInfo.value.latest?.up_to_date === true) return { key: 'upToDate', variant: 'secondary' }
  return { key: 'updateStateUnknown', variant: 'outline' }
})
const triggerLabel = computed(() => [
  t('dashboard.version.simpleTitle'),
  `${t('dashboard.version.officialGame')} ${officialGameVersion.value}`,
  ...(fleetLoaded.value && !fleetError.value ? [t('dashboard.version.managedHosts', { count: fleetNodeCount.value })] : []),
  t(`dashboard.version.${gameUpdateState.value.key}`)
].join(' · '))

async function loadVersion(options = {}) {
  try {
    await refreshVersion(options)
  } finally {
    initialLoadPending.value = false
  }
}

async function loadFleet(options = {}) {
  if (fleetLoading.value || (fleetLoaded.value && !options.force)) return
  const sequence = ++fleetRequestSequence
  fleetLoading.value = true
  fleetError.value = ''
  try {
    const value = await gameReleasesV2API.installedVersions(managementScopeRequest(managementScope.value))
    if (sequence !== fleetRequestSequence) return
    fleetPlan.value = value
    fleetLoaded.value = true
  } catch (error) {
    if (sequence !== fleetRequestSequence) return
    fleetError.value = error?.message || t('common.errors.unknown')
    fleetLoaded.value = true
  } finally {
    if (sequence === fleetRequestSequence) fleetLoading.value = false
  }
}

async function refreshOverview() {
  await Promise.all([loadVersion({ fresh: true }), loadFleet({ force: true })])
}

function handlePopoverOpen(open) {
  popoverOpen.value = open
  if (open) {
    void loadFleet({ force: true })
  } else {
    technicalOpen.value = false
  }
}

function handleManagementScopeChange(event) {
  const previousTargetId = managementScopeTargetId(managementScope.value)
  managementScope.value = event?.detail || getManagementScope()
  if (previousTargetId === managementScopeTargetId(managementScope.value)) return
  fleetRequestSequence += 1
  fleetLoading.value = false
  fleetLoaded.value = false
  fleetPlan.value = null
  fleetError.value = ''
  void loadFleet({ force: true })
}

function openFleetUpdates() {
  popoverOpen.value = false
  router.push('/servers/releases')
}

function fleetTargetName(target) {
  return target?.targetName || (target?.targetId === 'local' ? t('gameReleases.values.local') : target?.targetId) || '--'
}

function fleetTargetGameStatus(target) {
  return gameInstalledVersionStatus(target, versionInfo.value.official)
}

function platformLabel(target) {
  return t(`gameReleases.values.platforms.${gameReleasePlatformKey(target?.os)}`)
}

function applicationLabel(target) {
  return t(`gameReleases.values.applications.${gameReleaseApplicationKey(target?.appId)}`)
}

function versionChannelLabel(target) {
  const platforms = Array.isArray(target?.platformKeys) && target.platformKeys.length
    ? target.platformKeys.map(key => t(`gameReleases.values.platforms.${key}`)).join(' / ')
    : platformLabel(target)
  return [platforms, applicationLabel(target), target?.appId ? `App ${target.appId}` : ''].filter(Boolean).join(' · ')
}

function fleetTargetMetadata(target) {
  const updateMethod = target?.updateMethod === 'steam-client'
    ? t('gameReleases.values.steamClient')
    : target?.updateMethod === 'steamcmd'
      ? t('gameReleases.values.steamcmd')
      : t('gameReleases.values.unknownUpdateMethod')
  return [
    target?.installationId || '--',
    versionChannelLabel(target),
    updateMethod,
    target?.online ? t('gameReleases.values.online') : t('gameReleases.values.offline')
  ].filter(Boolean).join(' · ')
}

function fleetTargetGameMetadata(target) {
  return [
    platformLabel(target),
    target?.online ? t('gameReleases.values.online') : t('gameReleases.values.offline')
  ].join(' · ')
}

function fleetTargetGameVersion(target) {
  return target?.gameVersion || '--'
}

function fleetTargetSteamVersions(target) {
  return `${target?.steamBuild || '--'} · ${target?.branch || '--'}`
}

onMounted(() => {
  window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, handleManagementScopeChange)
  loadVersion()
  void loadFleet()
  resumeUpdatePolling()
})

onBeforeUnmount(() => {
  window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, handleManagementScopeChange)
})
</script>

<template>
  <Popover :open="popoverOpen" @update:open="handlePopoverOpen">
    <PopoverTrigger as-child>
      <Button
        variant="ghost"
        size="sm"
        class="max-w-full px-2"
        :aria-label="triggerLabel"
        :title="triggerLabel"
      >
        <Spinner v-if="versionPending || fleetLoading" data-icon="inline-start" />
        <CircleAlert v-else-if="officialError || fleetError || fleetCheckFailed" data-icon="inline-start" />
        <PackageOpen v-else-if="fleetUpdateRequired || !versionInfo.installed || isVersionOutdated" data-icon="inline-start" />
        <PackageCheck v-else data-icon="inline-start" />
        <span class="hidden min-w-0 items-center gap-1.5 xl:flex">
          <span class="text-muted-foreground hidden 2xl:inline">{{ t('dashboard.version.officialGame') }}</span>
          <strong class="tabular-nums">{{ officialGameVersion }}</strong>
        </span>
        <Badge class="hidden 2xl:inline-flex" :variant="gameUpdateState.variant">
          {{ t(`dashboard.version.${gameUpdateState.key}`) }}
        </Badge>
      </Button>
    </PopoverTrigger>

    <PopoverContent align="end" :side-offset="8" class="max-h-[var(--reka-popover-content-available-height)] w-[min(24rem,calc(100vw-2rem))] gap-3 overflow-y-auto p-3">
      <PopoverHeader>
        <div class="flex items-center justify-between gap-3">
          <PopoverTitle>{{ t('dashboard.version.simpleTitle') }}</PopoverTitle>
          <Badge :variant="gameUpdateState.variant">{{ t(`dashboard.version.${gameUpdateState.key}`) }}</Badge>
        </div>
        <PopoverDescription class="sr-only">{{ triggerLabel }}</PopoverDescription>
      </PopoverHeader>

      <div class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 py-1">
        <div class="flex min-w-0 flex-col gap-0.5">
          <span class="text-muted-foreground text-xs">{{ t('dashboard.version.currentGameVersion') }}</span>
          <strong class="truncate text-lg font-semibold tabular-nums" :title="currentGameVersionLabel">{{ currentGameVersionLabel }}</strong>
        </div>
        <ArrowRight class="text-muted-foreground mb-1" aria-hidden="true" />
        <div class="flex min-w-0 flex-col items-end gap-0.5 text-right">
          <span class="text-muted-foreground text-xs">{{ t('dashboard.version.latestOfficialVersion') }}</span>
          <div class="flex max-w-full items-center justify-end gap-1">
            <strong class="truncate text-lg font-semibold tabular-nums" :title="officialGameVersion">{{ officialGameVersion }}</strong>
            <Badge v-if="officialReleaseStale" variant="outline">{{ t('dashboard.version.cached') }}</Badge>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-1">
        <Badge v-if="officialReleaseId" variant="outline">R{{ officialReleaseId }}</Badge>
        <Button v-if="officialReleaseUrl" variant="ghost" size="xs" as-child>
          <a :href="officialReleaseUrl" target="_blank" rel="noopener noreferrer">
            <FileText data-icon="inline-start" />
            {{ t('dashboard.version.currentReleaseNotes') }}
          </a>
        </Button>
        <Button variant="ghost" size="xs" as-child>
          <a :href="KLEI_DST_RELEASES_URL" target="_blank" rel="noopener noreferrer">
            <History data-icon="inline-start" />
            {{ t('dashboard.version.releaseHistory') }}
          </a>
        </Button>
      </div>

      <div v-if="officialTestRelease" class="flex flex-wrap items-center gap-1">
        <Badge variant="outline">{{ t('dashboard.version.testRelease') }} {{ officialTestRelease.version }}</Badge>
        <Button variant="ghost" size="xs" as-child>
          <a :href="officialTestRelease.url" target="_blank" rel="noopener noreferrer">
            <FileText data-icon="inline-start" />
            {{ t('dashboard.version.currentReleaseNotes') }}
          </a>
        </Button>
      </div>

      <Separator />

      <section class="flex min-w-0 flex-col gap-2" :aria-label="t('gameReleases.nodes.title')">
        <div class="flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-2">
            <Server class="text-muted-foreground" aria-hidden="true" />
            <h3 class="truncate text-sm font-semibold">{{ t('gameReleases.nodes.gameVersionsTitle') }}</h3>
          </div>
          <Badge v-if="fleetLoaded && fleetInstallations.length" variant="outline">
            {{ t('gameReleases.nodes.machineCount', { count: fleetNodeCount }) }}
          </Badge>
        </div>

        <div v-if="fleetLoading && !fleetLoaded" class="text-muted-foreground flex h-14 items-center justify-center gap-2 text-sm">
          <Spinner />
          <span>{{ t('gameReleases.nodes.loading') }}</span>
        </div>

        <Alert v-else-if="fleetError" variant="destructive">
          <CircleAlert />
          <AlertTitle>{{ t('gameReleases.nodes.loadFailed') }}</AlertTitle>
          <AlertDescription class="break-words">{{ fleetError }}</AlertDescription>
        </Alert>

        <p v-if="!fleetError && fleetLoaded && !fleetInstallations.length" class="text-muted-foreground py-2 text-sm">
          {{ t('gameReleases.nodes.empty') }}
        </p>

        <div v-if="!fleetError && fleetInstallations.length" class="max-h-56 overflow-y-auto px-2">
          <div v-for="target in fleetInstallations" :key="`${target.targetId}:${target.installationId}`" class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium" :title="fleetTargetName(target)">{{ fleetTargetName(target) }}</p>
              <p class="text-muted-foreground truncate text-xs">{{ fleetTargetGameMetadata(target) }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <strong class="text-sm font-semibold tabular-nums">{{ fleetTargetGameVersion(target) }}</strong>
              <Badge :variant="fleetTargetGameStatus(target).variant">
                {{ t(`gameReleases.values.${fleetTargetGameStatus(target).key}`) }}
              </Badge>
            </div>
            <Alert v-if="target.error" variant="destructive" class="col-span-2 min-w-0">
              <CircleAlert />
              <AlertTitle>{{ t('gameReleases.values.checkFailed') }}</AlertTitle>
              <AlertDescription class="break-words">{{ target.error }}</AlertDescription>
            </Alert>
          </div>
        </div>
      </section>

      <Collapsible v-if="!fleetError && fleetInstallations.length" v-model:open="technicalOpen">
        <CollapsibleTrigger as-child>
          <Button variant="ghost" size="sm" class="group w-full justify-between px-2">
            <span class="text-left">
              <span class="block text-sm">{{ t('gameReleases.nodes.steamDetails') }}</span>
              <span class="text-muted-foreground block text-xs font-normal">{{ t('gameReleases.nodes.steamDetailsDescription') }}</span>
            </span>
            <ChevronDown data-icon="inline-end" class="transition-transform group-data-[state=open]:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent class="flex min-w-0 flex-col gap-2 pt-2">
          <p v-if="fleetVersionChannels.length > 1" class="text-muted-foreground text-xs">
            {{ t('gameReleases.nodes.channelDescription', { channels: fleetVersionChannelsLabel }) }}
          </p>
          <ScrollArea class="max-h-[40vh] pr-3" :style="{ height: fleetListHeight }">
            <template v-for="(target, index) in fleetInstallations" :key="`${target.targetId}:${target.installationId}`">
              <Separator v-if="index" />
              <div class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium" :title="fleetTargetName(target)">{{ fleetTargetName(target) }}</p>
                  <p class="text-muted-foreground truncate text-xs" :title="fleetTargetMetadata(target)">{{ fleetTargetMetadata(target) }}</p>
                </div>
                <span class="shrink-0 text-xs font-medium tabular-nums" :title="fleetTargetSteamVersions(target)">{{ fleetTargetSteamVersions(target) }}</span>
              </div>
            </template>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      <Alert v-if="officialError" variant="destructive">
        <CircleAlert />
        <AlertTitle>{{ t('dashboard.version.loadFailed') }}</AlertTitle>
        <AlertDescription class="break-all">{{ officialError }}</AlertDescription>
      </Alert>

      <div class="flex items-center justify-end gap-2">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon-sm" :disabled="versionPending || fleetLoading" :aria-label="t('dashboard.version.check')" @click="refreshOverview">
              <Spinner v-if="versionPending || fleetLoading" />
              <RefreshCw v-else />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ t('dashboard.version.check') }}</TooltipContent>
        </Tooltip>
        <Button v-if="fleetInstallations.length" size="sm" @click="openFleetUpdates">
          <Server data-icon="inline-start" />
          {{ t('gameReleases.actions.open') }}
        </Button>
        <Button v-else-if="canInstallGame && localActionsVisible" size="sm" :disabled="gameUpdateBusy" @click="updateGame">
          <Spinner v-if="gameUpdateBusy" data-icon="inline-start" />
          <PackageOpen v-else data-icon="inline-start" />
          {{ t(gameUpdateBusy ? 'dashboard.version.installButtonBusy' : 'dashboard.version.installButton') }}
        </Button>
        <Button v-else-if="isVersionOutdated && canUpdateGame && localActionsVisible" size="sm" :disabled="gameUpdateBusy" @click="updateGame">
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

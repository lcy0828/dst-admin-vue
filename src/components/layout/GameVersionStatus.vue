<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowRight, ChevronDown, CircleAlert, FileText, History, PackageCheck, PackageOpen, RefreshCw, Server } from '@lucide/vue'
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
import { automationV2API, roomsV2API } from '@/api/v2'
import { useGameUpdate } from '@/composables/useGameUpdate'
import {
  gameReleaseApplicationKey,
  gameReleaseGameVersions,
  gameReleaseNodeCount,
  gameReleasePlatformKey,
  gameReleaseVersionChannels
} from '@/lib/gameRelease.mjs'
import { gameInstalledVersionStatus } from '@/lib/gameInstalledVersion.mjs'
import { summarizeFleetGameAutoUpdate, summarizeGameAutoUpdate } from '@/lib/roomAutoUpdateSupport.mjs'


const KLEI_DST_RELEASES_URL = 'https://kleiforums.com/game-updates/dst/'

const router = useRouter()
const { t } = useI18n()
const popoverOpen = ref(false)
const technicalOpen = ref(false)
const autoUpdateLoading = ref(false)
const autoUpdateReadFailed = ref(false)
const autoUpdateSummaries = ref([])
let autoUpdateSequence = 0
const update = useGameUpdate()
const overview = update.state
const versionInfo = computed(() => ({ installed: overview.installations.some(item => item.installed), official: overview.report?.officialRelease }))
const officialGameVersion = computed(() => overview.report?.officialRelease?.version || '--')
const officialReleaseId = computed(() => overview.report?.officialRelease?.releaseId || '')
const officialReleaseUrl = computed(() => overview.report?.officialRelease?.updateUrl || '')
const officialReleaseStale = computed(() => overview.report?.officialRelease?.stale === true || Boolean(overview.versionError))
const officialTestRelease = computed(() => overview.report?.officialRelease?.testRelease)
const officialError = computed(() => overview.versionError)
const fleetInstallations = computed(() => overview.installations)
const fleetLoading = computed(() => overview.loading)
const fleetError = computed(() => overview.installationsError)
const fleetLoaded = computed(() => overview.overviewLoaded)
const fleetNodeCount = computed(() => gameReleaseNodeCount(fleetInstallations.value))
const fleetGameVersions = computed(() => gameReleaseGameVersions(fleetInstallations.value))
const currentGameVersionLabel = computed(() => {
  if (!fleetGameVersions.value.length) return '--'
  if (fleetGameVersions.value.length === 1) return fleetGameVersions.value[0]
  return t('dashboard.version.mixedGameVersions', { count: fleetGameVersions.value.length })
})
const fleetVersionChannels = computed(() => gameReleaseVersionChannels(fleetInstallations.value))
const fleetVersionChannelsLabel = computed(() => fleetVersionChannels.value.map(versionChannelLabel).join(t('gameReleases.nodes.channelSeparator')))
const fleetStates = computed(() => fleetInstallations.value.map(fleetTargetGameStatus))
const fleetCheckFailed = computed(() => fleetStates.value.some(state => state.key === 'checkFailed'))
const fleetUpdateRequired = computed(() => update.availability.value === 'available')
const fleetListHeight = computed(() => `${Math.min(fleetInstallations.value.length, 4) * 3.5}rem`)
const versionPending = computed(() => !overview.overviewLoaded && overview.loading)
const gameUpdateState = computed(() => {
  if (versionPending.value) return { key: 'checking', variant: 'outline' }
  if (update.active.value) return { key: 'updating', variant: 'secondary' }
  if (fleetUpdateRequired.value) return { key: 'updateAvailable', variant: 'default' }
  if (officialError.value || fleetError.value || fleetCheckFailed.value) return { key: 'loadFailed', variant: 'destructive' }
  if (update.availability.value === 'current') return { key: 'upToDate', variant: 'secondary' }
  return { key: 'updateStateUnknown', variant: 'outline' }
})
const fleetAutoUpdateSummary = computed(() => summarizeFleetGameAutoUpdate(autoUpdateSummaries.value, { readFailed: autoUpdateReadFailed.value }))
const fleetAutoUpdateVariant = computed(() => (
  fleetAutoUpdateSummary.value.state === 'allEnabled' ? 'secondary' : 'outline'
))
const fleetAutoUpdateLabel = computed(() => {
  const summary = fleetAutoUpdateSummary.value
  const key = summary.state === 'allEnabled' && summary.total === 1 ? 'enabledSingle' : summary.state
  return t(`dashboard.version.autoUpdate.${key}`, summary)
})
const triggerLabel = computed(() => [t('dashboard.version.simpleTitle'), `${t('dashboard.version.officialGame')} ${officialGameVersion.value}`, t(`dashboard.version.${gameUpdateState.value.key}`)].join(' · '))
async function loadFleetGameAutoUpdate() {
  const sequence = ++autoUpdateSequence
  autoUpdateLoading.value = true
  try {
    const roomsResponse = await roomsV2API.controlPlaneList()
    const rooms = Array.isArray(roomsResponse?.items) ? roomsResponse.items : []
    const summaries = await Promise.all(rooms.map(async room => {
      try {
        const [tasksResult, groupsResult] = await Promise.all([
          automationV2API.tasks(room.id),
          automationV2API.groups(room.id)
        ])
        return summarizeGameAutoUpdate(tasksResult?.items || [], groupsResult?.items || [])
      } catch {
        return { state: 'unknown', statusKey: 'unknown', enabled: false }
      }
    }))
    if (sequence === autoUpdateSequence) {
      autoUpdateReadFailed.value = false
      autoUpdateSummaries.value = summaries
    }
  } catch {
    if (sequence === autoUpdateSequence) {
      autoUpdateReadFailed.value = true
      autoUpdateSummaries.value = []
    }
  } finally {
    if (sequence === autoUpdateSequence) autoUpdateLoading.value = false
  }
}
async function refreshOverview() {
  await Promise.all([update.ensureOverview({ fresh: true }), update.refreshPending(), loadFleetGameAutoUpdate()])
}
function handlePopoverOpen(open) {
  popoverOpen.value = open
  if (open) { void update.ensureOverview(); void update.refreshPending(); void loadFleetGameAutoUpdate() }
  else technicalOpen.value = false
}
function openAutoUpdateConfig() {
  popoverOpen.value = false
  router.push({ path: '/servers/releases', query: { autoUpdate: '1' } })
}
function openFleetUpdates() {
  popoverOpen.value = false
  const active = update.active.value
  if (active) router.push({ path: '/servers/releases', query: { maintenanceJob: active.currentJobId || active.sourceJobId || active.id } })
  else void update.openUpdate()
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

onMounted(() => { void update.ensureOverview(); void update.refreshPending() })
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
        <PackageOpen v-else-if="fleetUpdateRequired || !versionInfo.installed" data-icon="inline-start" />
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

      <div class="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs">
        <div class="flex min-w-0 items-center gap-1.5">
          <span class="text-muted-foreground">{{ t('dashboard.version.autoUpdate.label') }}</span>
          <Spinner v-if="autoUpdateLoading && !autoUpdateSummaries.length && !autoUpdateReadFailed" />
          <Badge v-else :variant="fleetAutoUpdateVariant">
            {{ fleetAutoUpdateLabel }}
          </Badge>
        </div>
        <Button variant="ghost" size="xs" @click="openAutoUpdateConfig">
          {{ t('dashboard.version.autoUpdate.configure') }}
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

      <div class="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" :disabled="versionPending || fleetLoading" @click="refreshOverview">
          <Spinner v-if="versionPending || fleetLoading" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          {{ t('dashboard.version.check') }}
        </Button>
        <Button v-if="fleetInstallations.some(item => item.installed) || update.active.value" size="sm" :disabled="overview.loading && !overview.overviewLoaded" @click="openFleetUpdates">
          <PackageCheck data-icon="inline-start" />
          {{ t(update.active.value ? update.active.value.stage === 'recovery_required' ? 'gameReleases.workflow.recovery' : 'gameReleases.workflow.progress' : 'gameReleases.workflow.update') }}
        </Button>
        <Button v-else size="sm" variant="outline" @click="router.push('/servers/releases')">
          <Server data-icon="inline-start" />{{ t('gameReleases.actions.open') }}
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</template>

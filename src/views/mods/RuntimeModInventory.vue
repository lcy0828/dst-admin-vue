<template>
  <div class="runtime-inventory">
    <section class="inventory-toolbar" :aria-label="$t('mods.runtimeInventory.machine.title')">
      <div v-if="targetsLoading" class="machine-loading"><Skeleton class="h-9 w-64 max-w-full" /></div>
      <template v-else-if="installationOptions.length">
        <div v-if="fixedTargetId" class="fixed-machine-scope">
          <div class="fixed-machine-label" :title="selectedOption?.machineName || fixedTargetName">
            <Monitor aria-hidden="true" />
            <span class="truncate">{{ selectedOption?.machineName || fixedTargetName }}</span>
          </div>
          <UiSelect v-if="installationOptions.length > 1" v-model="selectedKey" :disabled="updateBusy">
            <SelectTrigger class="installation-select" :aria-label="$t('mods.runtimeInventory.machine.installation')">
              <SelectValue :placeholder="$t('mods.runtimeInventory.machine.selectInstallation')" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem v-for="option in installationOptions" :key="option.key" :value="option.key">
                  {{ option.installationLabel }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </UiSelect>
        </div>
        <ToggleGroup
          v-else-if="useMachineSegments"
          :model-value="selectedKey"
          type="single"
          variant="outline"
          size="sm"
          class="machine-segments"
          @update:model-value="selectInstallation"
        >
          <ToggleGroupItem v-for="option in installationOptions" :key="option.key" :value="option.key" :disabled="updateBusy">
            <Monitor data-icon="inline-start" />
            <span class="truncate">{{ option.label }}</span>
            <span class="machine-dot" :data-online="option.online || undefined" aria-hidden="true" />
          </ToggleGroupItem>
        </ToggleGroup>
        <UiSelect v-else v-model="selectedKey" :disabled="updateBusy">
          <SelectTrigger class="machine-select" :aria-label="$t('mods.runtimeInventory.machine.title')">
            <SelectValue :placeholder="$t('mods.runtimeInventory.machine.select')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem v-for="option in installationOptions" :key="option.key" :value="option.key">
                {{ option.label }} · {{ $t(option.online ? 'mods.runtimeInventory.machine.online' : 'mods.runtimeInventory.machine.offline') }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </UiSelect>
      </template>

      <div class="inventory-toolbar-actions">
        <Badge v-if="selectedOption" :variant="selectedOption.online ? 'success' : 'destructive'">
          {{ $t(selectedOption.online ? 'mods.runtimeInventory.machine.online' : 'mods.runtimeInventory.machine.offline') }}
        </Badge>
        <UiButton
          type="button"
          size="icon-sm"
          variant="outline"
          :disabled="loading || targetsLoading || updateBusy || !selectedOption"
          :aria-label="$t('mods.actions.refresh')"
          :title="$t('mods.actions.refresh')"
          @click="refresh"
        >
          <Spinner v-if="loading" />
          <RefreshCw v-else />
        </UiButton>
      </div>
    </section>

    <Alert v-if="targetsError" variant="destructive">
      <TriangleAlert />
      <AlertTitle>{{ $t('mods.runtimeInventory.errors.targetsTitle') }}</AlertTitle>
      <AlertDescription>{{ targetsError }}</AlertDescription>
      <AlertAction><UiButton size="sm" variant="outline" @click="loadTargets">{{ $t('common.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <Alert v-else-if="selectedOption && !selectedOption.online">
      <MonitorOff />
      <AlertTitle>{{ $t('mods.runtimeInventory.offline.title', { machine: selectedOption.machineName }) }}</AlertTitle>
      <AlertDescription>{{ $t('mods.runtimeInventory.offline.description') }}</AlertDescription>
    </Alert>

    <template v-else-if="selectedOption">
      <div v-if="inventoryLoaded" class="inventory-summary" aria-live="polite">
        <div>
          <strong>{{ selectedOption.machineName }}</strong>
          <span>{{ $t('mods.runtimeInventory.summary.installation', { installation: selectedOption.installationLabel }) }}</span>
        </div>
        <div class="inventory-counts">
          <Badge variant="outline">{{ $t('mods.runtimeInventory.summary.total', { count: inventory.total || 0 }) }}</Badge>
          <Badge variant="secondary">{{ $t('mods.runtimeInventory.summary.installed', { count: installedCount }) }}</Badge>
          <Badge v-if="inventory.outdated" variant="warning">{{ $t('mods.runtimeInventory.summary.outdated', { count: inventory.outdated }) }}</Badge>
          <Badge v-if="inventory.invalid" variant="destructive">{{ $t('mods.runtimeInventory.summary.invalid', { count: inventory.invalid }) }}</Badge>
          <Badge v-if="inventory.unknown" variant="secondary">{{ $t('mods.runtimeInventory.summary.unknown', { count: inventory.unknown }) }}</Badge>
          <span v-if="inventory.observedAt">{{ $t('mods.runtimeInventory.summary.observedAt', { time: formatDate(inventory.observedAt) }) }}</span>
          <UiButton
            v-if="inventory.outdated && !updateBusy"
            type="button"
            size="sm"
            variant="outline"
            @click="updateOutdatedMods"
          >
            <RefreshCw data-icon="inline-start" />
            {{ $t('mods.runtimeInventory.actions.updateAll') }}
          </UiButton>
        </div>
      </div>
      <div v-else-if="loading" class="inventory-summary inventory-summary-loading" aria-hidden="true">
        <Skeleton class="h-9 w-56 max-w-full" />
        <Skeleton class="h-6 w-72 max-w-full" />
      </div>

      <UiButton v-if="updateBusy && updateJob?.id" variant="outline" class="w-fit" @click="jobStatus?.showJobProgress(updateJob.id)">
        <Spinner data-icon="inline-start" />{{ $t('globalJobs.viewProgress') }}
      </UiButton>

      <Alert v-if="inventoryWarnings.length">
        <CircleAlert />
        <AlertTitle>{{ $t('mods.runtimeInventory.warnings.title') }}</AlertTitle>
        <AlertDescription>
          <ul class="inventory-warning-list">
            <li v-for="warning in inventoryWarnings" :key="warning">{{ warning }}</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Alert v-if="loadError" variant="destructive">
        <TriangleAlert />
        <AlertTitle>{{ $t('mods.runtimeInventory.errors.inventoryTitle') }}</AlertTitle>
        <AlertDescription>{{ loadError }}</AlertDescription>
        <AlertAction><UiButton size="sm" variant="outline" @click="loadInventory">{{ $t('common.actions.retry') }}</UiButton></AlertAction>
      </Alert>

      <section v-if="!loadError" class="inventory-content">
        <div class="inventory-filters">
          <InputGroup class="inventory-search">
            <InputGroupAddon><Search /></InputGroupAddon>
            <InputGroupInput v-model="keyword" :placeholder="$t('mods.runtimeInventory.filters.search')" />
          </InputGroup>
          <ToggleGroup :model-value="status" type="single" variant="outline" size="sm" class="inventory-status-filter" @update:model-value="setStatus">
            <ToggleGroupItem value="installed">{{ $t('mods.runtimeInventory.filters.installed') }}</ToggleGroupItem>
            <ToggleGroupItem value="outdated">{{ $t('mods.runtimeInventory.filters.outdated') }}</ToggleGroupItem>
            <ToggleGroupItem value="attention">{{ $t('mods.runtimeInventory.filters.attention') }}</ToggleGroupItem>
            <ToggleGroupItem value="all">{{ $t('mods.runtimeInventory.filters.all') }}</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Card v-if="loading && !inventoryLoaded">
          <CardContent class="inventory-skeletons">
            <div v-for="index in 5" :key="index" class="inventory-skeleton-row">
              <Skeleton class="size-10" />
              <Skeleton class="h-4 w-48 max-w-full" />
              <Skeleton class="h-4 w-28" />
              <Skeleton class="h-5 w-16" />
            </div>
          </CardContent>
        </Card>

        <Card v-else-if="filteredItems.length">
          <CardHeader class="inventory-table-header">
            <div>
              <CardTitle>{{ $t('mods.runtimeInventory.table.title') }}</CardTitle>
              <CardDescription>{{ $t('mods.runtimeInventory.table.description', { count: filteredItems.length }) }}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{{ $t('mods.runtimeInventory.table.mod') }}</TableHead>
                  <TableHead>{{ $t('mods.runtimeInventory.table.version') }}</TableHead>
                  <TableHead>{{ $t('mods.runtimeInventory.table.content') }}</TableHead>
                  <TableHead>{{ $t('mods.runtimeInventory.table.size') }}</TableHead>
                  <TableHead class="inventory-room-cell">{{ $t('mods.runtimeInventory.table.rooms') }}</TableHead>
                  <TableHead class="inventory-action-cell">{{ $t('mods.runtimeInventory.table.actions') }}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="mod in filteredItems" :key="mod.id">
                  <TableCell class="min-w-60 whitespace-normal">
                    <div class="mod-identity">
                      <div class="mod-preview">
                        <Package v-if="!mod.previewUrl || brokenImages.has(mod.id)" />
                        <img v-else :src="modThumbnailUrl(mod.previewUrl, 80)" :alt="mod.name" loading="lazy" @error="markImageBroken(mod.id)" />
                      </div>
                      <div class="min-w-0">
                        <strong class="block truncate" :title="mod.name">{{ mod.name }}</strong>
                        <span class="text-muted-foreground text-xs">{{ mod.author || $t('mods.values.unknownAuthor') }} · {{ mod.id }}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell class="whitespace-normal">
                    <div class="version-cell">
                      <strong>{{ versionLabel(mod) }}</strong>
                      <span v-if="mod.steamUpdatedAt">{{ $t('mods.runtimeInventory.table.localSteamAt', { time: formatDate(mod.steamUpdatedAt) }) }}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="content-state-cell">
                      <Badge :variant="versionVariant(mod.versionStatus)">{{ versionStatusLabel(mod) }}</Badge>
                      <span v-if="contentReasonLabel(mod)">{{ contentReasonLabel(mod) }}</span>
                    </div>
                  </TableCell>
                  <TableCell>{{ formatBytes(mod.installedSize) }}</TableCell>
                  <TableCell class="inventory-room-cell whitespace-normal">
                    <div v-if="roomGroups(mod).length" class="room-references">
                      <div v-for="room in roomGroups(mod).slice(0, 1)" :key="room.key" class="room-reference-summary">
                        <strong class="truncate" :title="room.name">{{ room.name }}</strong>
                        <span v-if="room.worlds.length" class="truncate" :title="roomWorldsLabel(room)">{{ roomWorldsLabel(room) }}</span>
                      </div>
                      <Popover v-if="roomGroups(mod).length > 1">
                        <PopoverTrigger as-child>
                          <UiButton
                            type="button"
                            size="xs"
                            variant="ghost"
                            class="room-reference-more"
                            :aria-label="$t('mods.runtimeInventory.table.moreRooms', { count: roomGroups(mod).length - 1 })"
                          >
                            +{{ roomGroups(mod).length - 1 }}
                          </UiButton>
                        </PopoverTrigger>
                        <PopoverContent align="end" class="w-[min(22rem,calc(100vw-2rem))] gap-3 p-3">
                          <PopoverHeader>
                            <PopoverTitle>{{ $t('mods.runtimeInventory.table.rooms') }}</PopoverTitle>
                            <PopoverDescription>{{ $t('mods.runtimeInventory.table.roomsDescription') }}</PopoverDescription>
                          </PopoverHeader>
                          <div class="flex max-h-64 flex-col gap-1 overflow-y-auto">
                            <div v-for="room in roomGroups(mod)" :key="room.key" class="flex min-w-0 flex-col gap-0.5 rounded-md px-2 py-1.5 hover:bg-muted">
                              <strong class="truncate text-sm" :title="room.name">{{ room.name }}</strong>
                              <span v-if="room.worlds.length" class="truncate text-xs text-muted-foreground" :title="roomWorldsLabel(room)">{{ roomWorldsLabel(room) }}</span>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <span v-else class="text-muted-foreground text-xs">{{ $t('mods.runtimeInventory.table.unused') }}</span>
                  </TableCell>
                  <TableCell class="inventory-action-cell">
                    <UiButton
                      v-if="canUpdateMod(mod)"
                      class="inventory-action"
                      type="button"
                      size="sm"
                      variant="outline"
                      :disabled="updateBusy"
                      @click="updateMod(mod)"
                    >
                      <Spinner v-if="isModUpdating(mod)" data-icon="inline-start" />
                      <RefreshCw v-else data-icon="inline-start" />
                      {{ $t(updateActionKey(mod)) }}
                    </UiButton>
                    <span v-else class="text-muted-foreground text-xs">--</span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Empty v-else>
          <EmptyHeader>
            <EmptyMedia variant="icon"><PackageOpen /></EmptyMedia>
            <EmptyTitle>{{ $t(hasFilters ? 'mods.runtimeInventory.empty.filtered' : 'mods.runtimeInventory.empty.title') }}</EmptyTitle>
            <EmptyDescription>{{ $t(hasFilters ? 'mods.runtimeInventory.empty.filteredDescription' : 'mods.runtimeInventory.empty.description') }}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    </template>

    <Empty v-else-if="!targetsLoading && !targetsError">
      <EmptyHeader>
        <EmptyMedia variant="icon"><MonitorOff /></EmptyMedia>
        <EmptyTitle>{{ $t('mods.runtimeInventory.empty.noMachines') }}</EmptyTitle>
        <EmptyDescription>{{ $t('mods.runtimeInventory.empty.noMachinesDescription') }}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CircleAlert, Monitor, MonitorOff, Package, PackageOpen, RefreshCw, Search, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { modApi } from '@/api'
import { runtimeTargetsV2API } from '@/api/v2'
import { waitForV2Job } from '@/api/v2ConfigurationAdapters'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { useSharedJobStatus } from '@/composables/useGlobalJobStatus'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatModDate } from '@/i18n/modMessages'
import { i18n } from '@/i18n'
import { emitGlobalJobSubmitted } from '@/lib/globalJobs.mjs'
import { modThumbnailUrl } from '@/lib/modImages.mjs'
import { getManagementScope, MANAGEMENT_SCOPE_CHANGED_EVENT, managementScopeTargetId } from '@/lib/managementScope.mjs'
import { buildRuntimeInstallationOptions, filterRuntimeMods, groupRuntimeModRoomReferences, parseRuntimeInstallationKey, selectRuntimeInstallation } from '@/lib/runtimeModInventory.mjs'

const route = useRoute()
const router = useRouter()
const managementScope = ref(getManagementScope())
const targets = ref({ items: [] })
const selectedKey = ref('')
const inventory = ref(emptyRuntimeInventory())
const inventoryLoaded = ref(false)
const targetsLoading = ref(false)
const loading = ref(false)
const targetsError = ref('')
const loadError = ref('')
const keyword = ref('')
const status = ref('installed')
const brokenImages = ref(new Set())
const updatingAll = ref(false)
const updatingModIds = ref(new Set())
const updateJob = ref(null)
const jobStatus = useSharedJobStatus()
let requestSequence = 0

const fixedTargetId = computed(() => managementScopeTargetId(managementScope.value))
const fixedTargetName = computed(() => String(managementScope.value?.targetName || fixedTargetId.value))
const installationOptions = computed(() => buildRuntimeInstallationOptions(targets.value, fixedTargetId.value))
const selectedOption = computed(() => installationOptions.value.find(option => option.key === selectedKey.value) || null)
const useMachineSegments = computed(() => installationOptions.value.length > 0 && installationOptions.value.length <= 4)
const filteredItems = computed(() => filterRuntimeMods(inventory.value.items, keyword.value, status.value))
const roomReferenceGroups = computed(() => new Map(inventory.value.items.map(mod => [
  String(mod.id || ''),
  groupRuntimeModRoomReferences(mod.roomReferences)
])))
const hasFilters = computed(() => Boolean(keyword.value.trim()) || status.value !== 'installed')
const installedCount = computed(() => Number(inventory.value.current || 0) + Number(inventory.value.outdated || 0) + Number(inventory.value.unknown || 0))
const updateBusy = computed(() => updatingAll.value || updatingModIds.value.size > 0)
const inventoryWarnings = computed(() => [...new Set([
  inventory.value.metadataWarning,
  inventory.value.referencesWarning
].map(value => String(value || '').trim()).filter(Boolean))])

onMounted(() => {
  window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, handleManagementScopeChanged)
  void loadTargets()
})

onBeforeUnmount(() => {
  window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, handleManagementScopeChanged)
})

watch(selectedKey, value => {
  const selected = parseRuntimeInstallationKey(value)
  if (!selected) return
  router.replace({
    path: '/mods',
    query: { ...route.query, tab: 'catalog', source: 'runtime', modTarget: selected.targetId, modInstallation: selected.installationId }
  })
  void loadInventory()
})

function handleManagementScopeChanged(event) {
  managementScope.value = event?.detail || getManagementScope()
  const selected = selectRuntimeInstallation(
    installationOptions.value,
    String(route.query.modTarget || ''),
    String(route.query.modInstallation || '')
  )
  selectedKey.value = selected?.key || ''
}

async function loadTargets() {
  targetsLoading.value = true
  targetsError.value = ''
  try {
    targets.value = await runtimeTargetsV2API.list()
    const selected = selectRuntimeInstallation(
      installationOptions.value,
      String(route.query.modTarget || ''),
      String(route.query.modInstallation || '')
    )
    if (selected?.key === selectedKey.value) await loadInventory()
    else selectedKey.value = selected?.key || ''
  } catch (error) {
    targets.value = { items: [] }
    selectedKey.value = ''
    targetsError.value = error?.message || String(error)
  } finally {
    targetsLoading.value = false
  }
}

async function loadInventory() {
  const option = selectedOption.value
  const sequence = ++requestSequence
  loadError.value = ''
  inventory.value = emptyRuntimeInventory()
  inventoryLoaded.value = false
  if (!option || !option.online) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const value = await modApi.getRuntimeModInventory(option.targetId, option.installationId)
    const nextInventory = { ...emptyRuntimeInventory(), ...value, items: value.items || [] }
    if (sequence === requestSequence) {
      inventory.value = nextInventory
      inventoryLoaded.value = true
    }
  } catch (error) {
    if (sequence === requestSequence) loadError.value = runtimeInventoryError(error)
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function emptyRuntimeInventory() {
  return { items: [], total: 0, current: 0, outdated: 0, unknown: 0, invalid: 0 }
}

async function refresh() {
  await loadTargets()
}

function selectInstallation(value) {
  if (value) selectedKey.value = value
}

function setStatus(value) {
  if (value) status.value = value
}

function markImageBroken(modId) {
  brokenImages.value = new Set([...brokenImages.value, modId])
}

function roomGroups(mod) {
  return roomReferenceGroups.value.get(String(mod?.id || '')) || []
}

function roomWorldsLabel(room) {
  return (room?.worlds || []).map(world => world.name).join(' + ')
}

function versionLabel(mod) {
  const current = String(mod.currentVersion || '').trim()
  const latest = String(mod.latestVersion || '').trim()
  if (mod.versionStatus === 'outdated' && current && latest && current !== latest) {
    return i18n.global.t('mods.runtimeInventory.versions.transition', { current, latest })
  }
  if (current) return i18n.global.t('mods.runtimeInventory.versions.current', { version: current })
  if (latest) return i18n.global.t('mods.runtimeInventory.versions.latest', { version: latest })
  return i18n.global.t('mods.runtimeInventory.versions.unavailable')
}

function versionStatusLabel(mod) {
  const key = ['current', 'outdated', 'unknown', 'invalid'].includes(mod.versionStatus) ? mod.versionStatus : 'unknown'
  if (key === 'outdated' && mod.currentVersion === mod.latestVersion) {
    return i18n.global.t('mods.runtimeInventory.states.contentUpdated')
  }
  return i18n.global.t(`mods.runtimeInventory.states.${key}`)
}

function versionVariant(value) {
  if (value === 'current') return 'success'
  if (value === 'outdated') return 'warning'
  if (value === 'invalid') return 'destructive'
  return 'secondary'
}

function contentReasonLabel(mod) {
  const reason = mod.versionStatus === 'invalid'
    ? String(mod.fileReason || '').trim()
    : mod.versionStatus === 'unknown'
      ? String(mod.metadataReason || '').trim()
      : ''
  if (!reason) return ''
  const known = new Set([
    'unsafe_path', 'unreadable', 'invalid_directory', 'missing_modinfo', 'invalid_modinfo',
    'mod_version_unreadable', 'mod_version_unavailable', 'mod_version_invalid',
    'workshop_manifest_unavailable', 'workshop_manifest_unsafe', 'workshop_manifest_missing',
    'workshop_manifest_invalid', 'workshop_manifest_unreadable', 'workshop_manifest_item_missing'
  ])
  return known.has(reason)
    ? i18n.global.t(`mods.runtimeInventory.reasons.${reason}`)
    : i18n.global.t('mods.runtimeInventory.reasons.unknown', { reason })
}

function canUpdateMod(mod) {
  return mod?.versionStatus === 'outdated' || mod?.versionStatus === 'invalid'
}

function isModUpdating(mod) {
  return updatingModIds.value.has(String(mod?.id || ''))
}

function updateActionKey(mod) {
  if (isModUpdating(mod)) return mod?.versionStatus === 'invalid'
    ? 'mods.runtimeInventory.actions.redownloading'
    : 'mods.runtimeInventory.actions.updating'
  return mod?.versionStatus === 'invalid'
    ? 'mods.runtimeInventory.actions.redownload'
    : 'mods.runtimeInventory.actions.update'
}

async function updateMod(mod) {
  if (!canUpdateMod(mod) || updateBusy.value) return
  await runInstallationUpdate({ mod })
}

async function updateOutdatedMods() {
  if (!inventory.value.outdated || updateBusy.value) return
  await runInstallationUpdate({ all: true })
}

async function runInstallationUpdate({ mod = null, all = false } = {}) {
  const option = selectedOption.value
  const modId = String(mod?.id || '').trim()
  if (!option || !option.online || (!all && !modId)) return
  if (all) updatingAll.value = true
  else updatingModIds.value = new Set([...updatingModIds.value, modId])
  const operationName = all
    ? i18n.global.t('mods.runtimeInventory.progress.allMods')
    : mod?.name || `Workshop ${modId}`
  updateJob.value = { status: 'queued', progress: 0 }
  try {
    const job = all
      ? await modApi.updateOutdatedRuntimeMods(option.targetId, option.installationId)
      : await modApi.updateRuntimeMod(option.targetId, option.installationId, modId)
    updateJob.value = job
    emitGlobalJobSubmitted({ ...job, displayName: `${operationName} · ${option.label}` })
    await (jobStatus?.waitForJob || waitForV2Job)(job, 15 * 60 * 1000, value => {
      updateJob.value = value
    })
    if (selectedOption.value?.key === option.key) await loadInventory()
    toast.success(i18n.global.t(all
      ? 'mods.runtimeInventory.feedback.updatedAll'
      : 'mods.runtimeInventory.feedback.updated', { name: mod?.name || `Workshop ${modId}` }))
  } catch (error) {
    toast.error(i18n.global.t('mods.runtimeInventory.feedback.updateFailed', { error: runtimeInventoryError(error) }))
  } finally {
    if (all) updatingAll.value = false
    else updatingModIds.value = new Set([...updatingModIds.value].filter(value => value !== modId))
    updateJob.value = null
  }
}

function formatBytes(value) {
  const bytes = Number(value) || 0
  if (bytes <= 0) return '--'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / (1024 ** index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function formatDate(value) {
  return formatModDate(value, i18n.global.locale.value)
}

function runtimeInventoryError(error) {
  const message = error?.message || String(error)
  const detail = String(error?.details?.reason || '').trim()
  if (!detail || message.includes(detail)) return message
  return i18n.global.t('mods.errors.withDetail', { message, detail })
}
</script>

<style scoped>
.runtime-inventory,
.inventory-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
}

.inventory-toolbar,
.inventory-summary,
.inventory-filters,
.inventory-toolbar-actions,
.inventory-counts,
.mod-identity,
.inventory-skeleton-row {
  display: flex;
  align-items: center;
}

.inventory-toolbar,
.inventory-summary,
.inventory-filters {
  justify-content: space-between;
  gap: 12px;
}

.inventory-toolbar {
  min-height: 36px;
}

.machine-segments {
  display: grid;
  width: min(100%, 720px);
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.machine-segments :deep(button) {
  min-width: 0;
}

.machine-dot {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 999px;
  background: var(--destructive);
}

.machine-dot[data-online='true'] {
  background: var(--primary);
}

.machine-select {
  width: min(100%, 360px);
}

.fixed-machine-scope,
.fixed-machine-label {
  display: flex;
  min-width: 0;
  align-items: center;
}

.fixed-machine-scope {
  gap: 10px;
}

.fixed-machine-label {
  gap: 7px;
  font-size: 14px;
  font-weight: 600;
}

.fixed-machine-label > svg {
  width: 16px;
  height: 16px;
  flex: none;
  color: var(--muted-foreground);
}

.installation-select {
  width: min(100%, 240px);
}

.inventory-toolbar-actions,
.inventory-counts {
  flex-wrap: wrap;
  gap: 8px;
}

.inventory-update-tray {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--primary) 32%, var(--border));
  border-radius: 6px;
  background: color-mix(in srgb, var(--background) 96%, transparent);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--foreground) 8%, transparent);
  backdrop-filter: blur(10px);
}

.inventory-update-tray[data-fallback='true'] {
  border-color: color-mix(in srgb, var(--warning) 48%, var(--border));
}

.inventory-update-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
}

.inventory-update-operation {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 7px;
  color: var(--foreground);
  font-weight: 600;
}

.inventory-update-transfer {
  min-width: 0;
  overflow: hidden;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inventory-update-heading strong {
  flex: none;
  color: var(--foreground);
  font-variant-numeric: tabular-nums;
}

.inventory-summary {
  min-height: 44px;
  padding: 0 2px;
}

.inventory-summary-loading {
  width: 100%;
}

.inventory-summary > div:first-child,
.version-cell,
.content-state-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.inventory-summary span,
.version-cell span,
.content-state-cell span {
  color: var(--muted-foreground);
  font-size: 12px;
}

.inventory-warning-list {
  margin: 0;
  padding-left: 18px;
}

.inventory-search {
  width: min(100%, 360px);
}

.inventory-status-filter {
  flex: none;
}

.inventory-table-header {
  padding-bottom: 12px;
}

.inventory-action-cell {
  width: 1%;
  white-space: nowrap;
  text-align: right;
}

.inventory-action {
  width: 108px;
  justify-content: center;
}

.inventory-room-cell {
  width: 220px;
  min-width: 180px;
  max-width: 260px;
}

.room-references {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
}

.room-reference-summary {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}

.room-reference-summary strong,
.room-reference-summary span {
  display: block;
}

.room-reference-summary span {
  color: var(--muted-foreground);
  font-size: 12px;
}

.room-reference-more {
  flex: none;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

.inventory-skeletons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-block: 16px;
}

.inventory-skeleton-row {
  min-height: 48px;
  gap: 16px;
}

.mod-identity {
  min-width: 0;
  gap: 10px;
}

.mod-preview {
  position: relative;
  width: 40px;
  height: 40px;
  flex: none;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--muted);
}

.mod-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.mod-preview > svg {
  position: absolute;
  inset: 10px;
  width: 18px;
  height: 18px;
  color: var(--muted-foreground);
}

@media (max-width: 760px) {
  .inventory-toolbar,
  .inventory-summary,
  .inventory-filters {
    align-items: stretch;
    flex-direction: column;
  }

  .machine-segments,
  .machine-select,
  .installation-select,
  .inventory-search {
    width: 100%;
  }

  .fixed-machine-scope {
    align-items: stretch;
    flex-direction: column;
  }

  .inventory-toolbar-actions {
    justify-content: space-between;
  }

  .inventory-update-heading {
    flex-wrap: wrap;
  }

  .inventory-update-operation {
    flex-basis: calc(100% - 48px);
  }

  .inventory-update-transfer {
    order: 3;
    width: 100%;
  }

  .inventory-status-filter {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

<template>
  <div class="world-maps-page">
    <header class="page-heading">
      <div>
        <h1>{{ t('worldMaps.title') }}</h1>
        <p>{{ t('worldMaps.subtitle') }}</p>
      </div>
      <UiButton variant="outline" :disabled="sourceLoading || worldsLoading || mapsLoading || sessionsLoading" @click="reloadSelectedWorld">
        <Spinner v-if="mapsLoading || sessionsLoading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        {{ t('worldMaps.actions.refresh') }}
      </UiButton>
    </header>

    <Alert v-if="sourceError" variant="destructive">
      <TriangleAlert />
      <AlertTitle>{{ t('worldMaps.errors.sourceLoadFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ sourceError }}</AlertDescription>
      <AlertAction><UiButton variant="outline" size="sm" :disabled="sourceLoading" @click="loadSources">{{ t('worldMaps.actions.retry') }}</UiButton></AlertAction>
    </Alert>

    <div v-if="sourceLoading" class="loading-grid">
      <Skeleton class="h-32" />
      <Skeleton class="h-80" />
      <Skeleton class="h-80" />
    </div>

    <template v-else>
      <Card>
        <CardHeader>
          <CardTitle>{{ t('worldMaps.source.title') }}</CardTitle>
          <CardDescription>{{ t('worldMaps.source.description') }}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup class="source-grid">
            <Field>
              <FieldLabel for="map-room-select">{{ t('worldMaps.source.archive') }}</FieldLabel>
              <UiSelect :model-value="selectedRoomId" :disabled="worldsLoading || !rooms.length" @update:model-value="handleRoomChange">
                <SelectTrigger id="map-room-select"><SelectValue :placeholder="t('worldMaps.source.selectArchive')" /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</SelectItem></SelectGroup></SelectContent>
              </UiSelect>
            </Field>
            <Field>
              <FieldLabel for="map-world-select">{{ t('worldMaps.source.world') }}</FieldLabel>
              <UiSelect :model-value="selectedWorldId" :disabled="worldsLoading || !worlds.length" @update:model-value="handleWorldChange">
                <SelectTrigger id="map-world-select"><SelectValue :placeholder="worldsLoading ? t('worldMaps.source.loadingWorlds') : t('worldMaps.source.selectWorld')" /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem v-for="world in worlds" :key="world.id" :value="world.id">{{ world.name }}</SelectItem></SelectGroup></SelectContent>
              </UiSelect>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Alert v-if="selectedRoomId && !renderer.available">
        <TriangleAlert />
        <AlertTitle>{{ t('worldMaps.renderer.unavailableTitle') }}</AlertTitle>
        <AlertDescription>{{ t('worldMaps.renderer.unavailableDescription') }}</AlertDescription>
      </Alert>
      <Alert v-else-if="renderer.available">
        <CircleCheck />
        <AlertTitle>{{ t('worldMaps.renderer.readyTitle') }}</AlertTitle>
        <AlertDescription>{{ renderer.path || t('worldMaps.renderer.readyDescription') }}</AlertDescription>
      </Alert>

      <Alert v-if="generationJob">
        <Spinner v-if="generationBusy" />
        <CircleCheck v-else-if="generationJob.status === 'succeeded'" />
        <TriangleAlert v-else />
        <AlertTitle>{{ generationTitle }}</AlertTitle>
        <AlertDescription>
          <div class="job-status">
            <span>{{ generationDescription }}</span>
            <Progress v-if="generationBusy" :model-value="generationProgress" />
          </div>
        </AlertDescription>
        <AlertAction v-if="generationBusy"><UiButton variant="outline" size="sm" :disabled="cancelLoading" @click="cancelGeneration"><Spinner v-if="cancelLoading" data-icon="inline-start" />{{ t('worldMaps.actions.cancelJob') }}</UiButton></AlertAction>
      </Alert>

      <div class="workspace-grid">
        <div class="control-column">
          <Card>
            <CardHeader>
              <CardTitle>{{ t('worldMaps.generation.title') }}</CardTitle>
              <CardDescription>{{ t('worldMaps.generation.description') }}</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel for="map-session-select">{{ t('worldMaps.generation.sessionSnapshot') }}</FieldLabel>
                  <UiSelect v-model="selectedSessionId" :disabled="sessionsLoading || !sessions.length">
                    <SelectTrigger id="map-session-select"><SelectValue :placeholder="sessionsLoading ? t('worldMaps.generation.readingSessions') : t('worldMaps.generation.selectSession')" /></SelectTrigger>
                    <SelectContent><SelectGroup><SelectItem v-for="session in sessions" :key="session.id" :value="session.id">{{ session.sessionId }} / {{ session.fileName }}</SelectItem></SelectGroup></SelectContent>
                  </UiSelect>
                  <FieldDescription v-if="selectedSession">{{ t('worldMaps.generation.snapshotMetadata', { size: formatMapBytes(selectedSession.size), count: selectedSession.playerCount, time: formatMapTime(selectedSession.modifiedAt) }) }}</FieldDescription>
                </Field>
                <FieldSet>
                  <FieldLegend variant="label">{{ t('worldMaps.generation.layers') }}</FieldLegend>
                  <FieldDescription>{{ t('worldMaps.generation.layersDescription') }}</FieldDescription>
                  <ToggleGroup v-model="generationLayers" type="multiple" variant="outline" :spacing="1" class="layer-picker">
                    <ToggleGroupItem v-for="layer in WORLD_MAP_LAYERS" :key="layer.id" :value="layer.id" :disabled="layer.id === 'terrain'">{{ mapLayerLabel(layer.id) }}</ToggleGroupItem>
                  </ToggleGroup>
                </FieldSet>
              </FieldGroup>
            </CardContent>
            <CardFooter class="justify-between gap-3">
              <span class="text-muted-foreground text-xs">{{ t('worldMaps.generation.diagnosticSnapshots', { count: sessions.length }) }}</span>
              <UiButton :disabled="!canGenerate" @click="generateMap">
                <Spinner v-if="generationBusy" data-icon="inline-start" />
                <MapPinned v-else data-icon="inline-start" />
                {{ generationBusy ? t('worldMaps.actions.generating') : t('worldMaps.actions.generate') }}
              </UiButton>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{{ t('worldMaps.sessions.title') }}</CardTitle>
              <CardDescription>{{ sessions.length ? t('worldMaps.sessions.countDescription', { count: sessions.length }) : t('worldMaps.sessions.unavailableDescription') }}</CardDescription>
            </CardHeader>
            <CardContent>
              <div v-if="sessionsLoading" class="inline-loading"><Spinner /><span>{{ t('worldMaps.generation.readingSessions') }}</span></div>
              <Alert v-else-if="sessionError" variant="destructive"><TriangleAlert /><AlertTitle>{{ t('worldMaps.sessions.loadFailedTitle') }}</AlertTitle><AlertDescription>{{ sessionError }}</AlertDescription></Alert>
              <ScrollArea v-else-if="sessions.length" class="session-scroll">
                <ShadcnTable>
                  <TableHeader><TableRow><TableHead>{{ t('worldMaps.sessions.columns.snapshot') }}</TableHead><TableHead>{{ t('worldMaps.sessions.columns.size') }}</TableHead><TableHead class="text-right">{{ t('worldMaps.sessions.columns.actions') }}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow v-for="session in sessions" :key="session.id">
                      <TableCell><div class="session-name"><strong class="truncate">{{ session.fileName }}</strong><span class="truncate">{{ session.sessionId }}</span><Badge v-if="session.latest" variant="secondary">{{ t('worldMaps.sessions.latest') }}</Badge></div></TableCell>
                      <TableCell>{{ formatMapBytes(session.size) }}</TableCell>
                      <TableCell class="text-right"><UiButton size="icon-sm" variant="ghost" :disabled="sessionDownloadId === session.id" :aria-label="t('worldMaps.actions.downloadSessionAria', { file: session.fileName })" :title="t('worldMaps.actions.downloadSession')" @click="downloadSession(session)"><Spinner v-if="sessionDownloadId === session.id" /><Download v-else /></UiButton></TableCell>
                    </TableRow>
                  </TableBody>
                </ShadcnTable>
              </ScrollArea>
              <Empty v-else><EmptyHeader><EmptyMedia variant="icon"><FileArchive /></EmptyMedia><EmptyTitle>{{ t('worldMaps.sessions.emptyTitle') }}</EmptyTitle><EmptyDescription>{{ t('worldMaps.sessions.emptyDescription') }}</EmptyDescription></EmptyHeader></Empty>
            </CardContent>
          </Card>
        </div>

        <div class="viewer-column">
          <Card class="map-viewer-card">
            <CardHeader>
              <CardTitle>{{ currentMap ? t('worldMaps.viewer.worldTitle', { world: selectedWorld?.name || t('worldMaps.values.defaultWorld') }) : t('worldMaps.viewer.title') }}</CardTitle>
              <CardDescription v-if="currentMap">{{ currentMap.width }} × {{ currentMap.height }} · {{ currentMap.sessionLabel }}</CardDescription>
              <CardDescription v-else>{{ t('worldMaps.viewer.description') }}</CardDescription>
              <CardAction v-if="currentMap"><Badge variant="outline">{{ formatMapTime(currentMap.finishedAt || currentMap.createdAt) }}</Badge></CardAction>
            </CardHeader>
            <CardContent>
              <template v-if="currentMap">
                <ToggleGroup :model-value="visibleLayers" type="multiple" variant="outline" :spacing="1" class="viewer-layers" @update:model-value="updateVisibleLayers">
                  <ToggleGroupItem v-for="layer in currentMapLayers" :key="layer" :value="layer">{{ mapLayerLabel(layer) }}</ToggleGroupItem>
                </ToggleGroup>
                <div class="map-canvas" :style="mapCanvasStyle">
                  <Skeleton v-if="!allVisibleLayersLoaded" class="map-skeleton" />
                  <img
                    v-for="(layer, index) in renderedVisibleLayers"
                    :key="`${currentMap.id}-${layer}`"
                    :src="mapImageSources[layer]"
                    :alt="t('worldMaps.viewer.layerAlt', { world: selectedWorld?.name || t('worldMaps.values.defaultWorld'), layer: mapLayerLabel(layer) })"
                    :class="cn('map-layer', index > 0 && 'map-layer--overlay')"
                    @load="markLayerLoaded(layer)"
                    @error="markLayerFailed(layer)"
                  >
                </div>
                <Alert v-if="failedLayers.length" variant="destructive" class="mt-4"><TriangleAlert /><AlertTitle>{{ t('worldMaps.viewer.partialLayersFailed') }}</AlertTitle><AlertDescription>{{ failedLayers.map(mapLayerLabel).join(listSeparator) }}</AlertDescription></Alert>
              </template>
              <Empty v-else><EmptyHeader><EmptyMedia variant="icon"><MapIcon /></EmptyMedia><EmptyTitle>{{ t('worldMaps.viewer.emptyTitle') }}</EmptyTitle><EmptyDescription>{{ renderer.available ? t('worldMaps.viewer.emptyRendererReady') : t('worldMaps.viewer.emptyRendererUnavailable') }}</EmptyDescription></EmptyHeader></Empty>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{{ t('worldMaps.history.title') }}</CardTitle>
              <CardDescription>{{ t('worldMaps.history.description') }}</CardDescription>
            </CardHeader>
            <CardContent>
              <div v-if="mapsLoading" class="inline-loading"><Spinner /><span>{{ t('worldMaps.history.loading') }}</span></div>
              <Alert v-else-if="mapError" variant="destructive"><TriangleAlert /><AlertTitle>{{ t('worldMaps.history.loadFailedTitle') }}</AlertTitle><AlertDescription>{{ mapError }}</AlertDescription></Alert>
              <div v-else-if="worldMaps.length" class="history-table">
                <ShadcnTable>
                  <TableHeader><TableRow><TableHead>{{ t('worldMaps.history.columns.time') }}</TableHead><TableHead>{{ t('worldMaps.history.columns.session') }}</TableHead><TableHead>{{ t('worldMaps.history.columns.status') }}</TableHead><TableHead>{{ t('worldMaps.history.columns.stage') }}</TableHead><TableHead>{{ t('worldMaps.history.columns.layers') }}</TableHead><TableHead class="text-right">{{ t('worldMaps.history.columns.actions') }}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow v-for="map in worldMaps" :key="map.id">
                      <TableCell>{{ formatMapTime(map.createdAt) }}</TableCell>
                      <TableCell class="max-w-52 truncate" :title="map.sessionLabel">{{ map.sessionLabel }}</TableCell>
                      <TableCell><Badge :variant="mapStatusMeta(map.status).variant">{{ mapStatusMeta(map.status).label }}</Badge></TableCell>
                      <TableCell>{{ mapStageLabel(map.stage) }}</TableCell>
                      <TableCell>{{ normalizeMapLayers(map.layers).map(mapLayerLabel).join(listSeparator) }}</TableCell>
                      <TableCell class="text-right">
                        <UiButton v-if="map.status === 'succeeded'" size="icon-sm" variant="ghost" :title="t('worldMaps.actions.viewMap')" :aria-label="t('worldMaps.actions.viewMap')" @click="selectMap(map)"><Eye /></UiButton>
                        <UiButton v-else-if="map.status === 'failed'" size="icon-sm" variant="ghost" :title="t('worldMaps.actions.viewDiagnostic')" :aria-label="t('worldMaps.actions.viewDiagnosticAria')" @click="openDiagnostic(map)"><FileWarning /></UiButton>
                        <Spinner v-else />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </ShadcnTable>
              </div>
              <Empty v-else><EmptyHeader><EmptyMedia variant="icon"><History /></EmptyMedia><EmptyTitle>{{ t('worldMaps.history.emptyTitle') }}</EmptyTitle><EmptyDescription>{{ t('worldMaps.history.emptyDescription') }}</EmptyDescription></EmptyHeader></Empty>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>

    <UiDialog :open="Boolean(diagnosticMap)" @update:open="open => { if (!open) diagnosticMap = null }">
      <DialogScrollContent class="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{{ t('worldMaps.diagnostic.title') }}</DialogTitle><DialogDescription>{{ diagnosticMap?.sessionLabel }}</DialogDescription></DialogHeader>
        <div v-if="diagnosticMap" class="diagnostic-content">
          <Alert variant="destructive"><TriangleAlert /><AlertTitle>{{ t('worldMaps.generation.failedTitle') }}</AlertTitle><AlertDescription>{{ diagnosticDescription }}</AlertDescription></Alert>
          <FieldSet><FieldLegend variant="label">{{ t('worldMaps.diagnostic.rendererOutput') }}</FieldLegend><pre class="diagnostic-log">{{ diagnosticMap.log || t('worldMaps.diagnostic.noLogs') }}</pre></FieldSet>
        </div>
      </DialogScrollContent>
    </UiDialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import {
  CircleCheck,
  Download,
  Eye,
  FileArchive,
  FileWarning,
  History,
  Map as MapIcon,
  MapPinned,
  RefreshCw,
  TriangleAlert
} from '@lucide/vue'
import { jobsV2API, roomsV2API, worldMapsV2API } from '@/api/v2'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog as UiDialog, DialogDescription, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  formatWorldMapTime,
  worldMapDiagnosticError,
  worldMapErrorDetail,
  worldMapJobFailure,
  worldMapLayerLabel,
  worldMapStageLabel,
  worldMapStatusMeta
} from '@/i18n/worldMapsMessages.js'
import { cn } from '@/lib/utils'
import {
  WORLD_MAP_LAYERS,
  formatMapBytes,
  normalizeMapLayers
} from '@/lib/worldMaps.mjs'
import { RUNTIME_TARGET_CHANGED_EVENT } from '@/utils/runtimeTarget'
import { toast } from 'vue-sonner'

const TERMINAL_JOB_STATES = new Set(['succeeded', 'failed', 'canceled'])
const { locale, t } = useI18n()
const route = useRoute()
const router = useRouter()

const rooms = ref([])
const worlds = ref([])
const maps = ref([])
const sessions = ref([])
const selectedRoomId = ref('')
const selectedWorldId = ref('')
const selectedSessionId = ref('')
const selectedMapId = ref('')
const generationLayers = ref(WORLD_MAP_LAYERS.map(layer => layer.id))
const visibleLayers = ref([])
const loadedLayers = ref([])
const failedLayers = ref([])
const mapImageSources = ref({})
const renderer = ref({ available: false, path: '' })

const sourceLoading = ref(false)
const worldsLoading = ref(false)
const mapsLoading = ref(false)
const sessionsLoading = ref(false)
const sourceFailure = ref(null)
const mapFailure = ref(null)
const sessionFailure = ref(null)

const generationJob = ref(null)
const activeJobId = ref('')
const cancelLoading = ref(false)
const sessionDownloadId = ref('')
const diagnosticMap = ref(null)

let loadEpoch = 0
let jobEpoch = 0
let imageEpoch = 0
let destroyed = false

const selectedWorld = computed(() => worlds.value.find(world => world.id === selectedWorldId.value) || null)
const selectedSession = computed(() => sessions.value.find(session => session.id === selectedSessionId.value) || null)
const sourceError = computed(() => localizedFailure(sourceFailure.value))
const mapError = computed(() => localizedFailure(mapFailure.value))
const sessionError = computed(() => localizedFailure(sessionFailure.value))
const worldMaps = computed(() => maps.value.filter(map => map.worldId === selectedWorldId.value))
const currentMap = computed(() => worldMaps.value.find(map => map.id === selectedMapId.value && map.status === 'succeeded') || null)
const currentMapLayers = computed(() => normalizeMapLayers(currentMap.value?.layers))
const renderedVisibleLayers = computed(() => visibleLayers.value.filter(layer => mapImageSources.value[layer]))
const generationBusy = computed(() => Boolean(activeJobId.value))
const canGenerate = computed(() => Boolean(
  renderer.value.available && selectedRoomId.value && selectedWorldId.value && selectedSessionId.value && !generationBusy.value
))
const allVisibleLayersLoaded = computed(() => (
  visibleLayers.value.length > 0 && visibleLayers.value.every(layer => loadedLayers.value.includes(layer) || failedLayers.value.includes(layer))
))
const mapCanvasStyle = computed(() => {
  if (!currentMap.value?.width || !currentMap.value?.height) return {}
  return { aspectRatio: `${currentMap.value.width} / ${currentMap.value.height}` }
})
const generationProgress = computed(() => {
  const targets = generationJob.value?.targets || []
  if (!targets.length) return generationBusy.value ? 15 : 100
  const completed = targets.filter(target => TERMINAL_JOB_STATES.has(target.status)).length
  return Math.round((completed / targets.length) * 100)
})
const listSeparator = computed(() => t('worldMaps.values.listSeparator'))
const generationTitle = computed(() => {
  if (generationBusy.value) return t('worldMaps.generation.runningTitle')
  if (generationJob.value?.status === 'succeeded') return t('worldMaps.generation.completedTitle')
  if (generationJob.value?.status === 'canceled') return t('worldMaps.generation.canceledTitle')
  return t('worldMaps.generation.failedTitle')
})
const generationDescription = computed(() => {
  if (generationBusy.value) return t('worldMaps.generation.runningDescription')
  if (generationJob.value?.status !== 'succeeded') return mapJobFailure(generationJob.value)
  return t('worldMaps.generation.publishedDescription')
})
const diagnosticDescription = computed(() => {
  const stage = mapStageLabel(diagnosticMap.value?.stage)
  const error = worldMapDiagnosticError(diagnosticMap.value?.errorMessage, t)
  return error
    ? t('worldMaps.diagnostic.failedStageWithError', { stage, error })
    : t('worldMaps.diagnostic.failedStage', { stage })
})

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

function formatMapTime(value) {
  return formatWorldMapTime(value, locale.value)
}

function mapLayerLabel(layer) {
  return worldMapLayerLabel(layer, t)
}

function mapStatusMeta(status) {
  return worldMapStatusMeta(status, t)
}

function mapStageLabel(stage) {
  return worldMapStageLabel(stage, t)
}

function mapJobFailure(job) {
  return worldMapJobFailure(job, t)
}

function errorDetail(error) {
  return worldMapErrorDetail(error, t)
}

function localizedFailure(failure) {
  return failure ? t(failure.key, { error: errorDetail(failure.error) }) : ''
}

function routeValue(value) {
  return Array.isArray(value) ? value[0] : String(value || '')
}

function pickByRoute(items, queryValue) {
  const wanted = routeValue(queryValue)
  return items.find(item => item.id === wanted || item.name === wanted)?.id || items[0]?.id || ''
}

function updateRouteSelection() {
  const query = { ...route.query }
  if (selectedRoomId.value) query.room = selectedRoomId.value
  else delete query.room
  if (selectedWorldId.value) query.world = selectedWorldId.value
  else delete query.world
  router.replace({ query }).catch(() => {})
}

function clearMapImages() {
  imageEpoch += 1
  Object.values(mapImageSources.value).forEach(url => URL.revokeObjectURL(url))
  mapImageSources.value = {}
  loadedLayers.value = []
  failedLayers.value = []
}

async function loadMapImages(mapId, layers) {
  clearMapImages()
  const token = imageEpoch
  await Promise.all(layers.map(async layer => {
    try {
      const blob = await worldMapsV2API.imageBlob(mapId, layer)
      if (destroyed || token !== imageEpoch) return
      const url = URL.createObjectURL(blob)
      if (destroyed || token !== imageEpoch) {
        URL.revokeObjectURL(url)
        return
      }
      mapImageSources.value = { ...mapImageSources.value, [layer]: url }
    } catch (error) {
      if (destroyed || token !== imageEpoch) return
      markLayerFailed(layer)
    }
  }))
}

async function loadSources() {
  const epoch = ++loadEpoch
  sourceLoading.value = true
  sourceFailure.value = null
  mapFailure.value = null
  sessionFailure.value = null
  maps.value = []
  sessions.value = []
  selectMap(null)
  try {
    const response = await roomsV2API.list()
    if (destroyed || epoch !== loadEpoch) return
    rooms.value = (response.items || []).filter(room => room.managed)
    selectedRoomId.value = pickByRoute(rooms.value, route.query.room)
    if (selectedRoomId.value) await loadSelectedRoom(epoch)
  } catch (error) {
    if (destroyed || epoch !== loadEpoch) return
    sourceFailure.value = { key: 'worldMaps.errors.roomsLoadFailed', error }
    rooms.value = []
    worlds.value = []
  } finally {
    if (!destroyed && epoch === loadEpoch) sourceLoading.value = false
  }
}

async function loadSelectedRoom(epoch) {
  worldsLoading.value = true
  sourceFailure.value = null
  try {
    const response = await roomsV2API.worlds(selectedRoomId.value)
    if (destroyed || epoch !== loadEpoch) return
    worlds.value = response.items || []
    selectedWorldId.value = pickByRoute(worlds.value, route.query.world)
    updateRouteSelection()
    await loadSelectedWorld(epoch)
  } catch (error) {
    if (destroyed || epoch !== loadEpoch) return
    worlds.value = []
    selectedWorldId.value = ''
    sourceFailure.value = { key: 'worldMaps.errors.worldsLoadFailed', error }
  } finally {
    if (!destroyed && epoch === loadEpoch) worldsLoading.value = false
  }
}

async function loadSelectedWorld(epoch) {
  if (!selectedRoomId.value || !selectedWorldId.value) return
  await Promise.all([loadMaps(epoch), loadSessions(epoch)])
}

async function loadMaps(epoch, resumeJob = true) {
  mapsLoading.value = true
  mapFailure.value = null
  try {
    const response = await worldMapsV2API.list(selectedRoomId.value)
    if (destroyed || epoch !== loadEpoch) return
    maps.value = response.items || []
    renderer.value = { available: Boolean(response.rendererAvailable), path: response.rendererPath || '' }
    const available = worldMaps.value.filter(map => map.status === 'succeeded')
    if (!available.some(map => map.id === selectedMapId.value)) selectMap(available[0] || null)
    const running = worldMaps.value.find(map => map.status === 'running' && map.sourceJobId)
    if (resumeJob && running && !activeJobId.value) void monitorJob(running.sourceJobId, true)
  } catch (error) {
    if (destroyed || epoch !== loadEpoch) return
    mapFailure.value = { key: 'worldMaps.errors.mapsLoadFailed', error }
    maps.value = []
    renderer.value = { available: false, path: '' }
  } finally {
    if (!destroyed && epoch === loadEpoch) mapsLoading.value = false
  }
}

async function loadSessions(epoch) {
  sessionsLoading.value = true
  sessionFailure.value = null
  try {
    const response = await worldMapsV2API.sessions(selectedRoomId.value, selectedWorldId.value)
    if (destroyed || epoch !== loadEpoch) return
    sessions.value = response.items || []
    if (!sessions.value.some(session => session.id === selectedSessionId.value)) {
      selectedSessionId.value = sessions.value.find(session => session.latest)?.id || sessions.value[0]?.id || ''
    }
  } catch (error) {
    if (destroyed || epoch !== loadEpoch) return
    sessionFailure.value = { key: 'worldMaps.errors.sessionsLoadFailed', error }
    sessions.value = []
    selectedSessionId.value = ''
  } finally {
    if (!destroyed && epoch === loadEpoch) sessionsLoading.value = false
  }
}

async function handleRoomChange(roomId) {
  const epoch = ++loadEpoch
  jobEpoch += 1
  activeJobId.value = ''
  generationJob.value = null
  selectedRoomId.value = roomId
  selectedWorldId.value = ''
  selectedSessionId.value = ''
  selectMap(null)
  maps.value = []
  sessions.value = []
  await loadSelectedRoom(epoch)
}

async function handleWorldChange(worldId) {
  const epoch = ++loadEpoch
  jobEpoch += 1
  activeJobId.value = ''
  generationJob.value = null
  selectedWorldId.value = worldId
  selectedSessionId.value = ''
  selectMap(null)
  updateRouteSelection()
  await loadSelectedWorld(epoch)
}

async function reloadSelectedWorld() {
  if (!selectedRoomId.value || !selectedWorldId.value) {
    await loadSources()
    return
  }
  const epoch = ++loadEpoch
  await loadSelectedWorld(epoch)
}

function selectMap(map) {
  selectedMapId.value = map?.id || ''
  const layers = normalizeMapLayers(map?.layers)
  visibleLayers.value = layers
  if (map?.id && layers.length) void loadMapImages(map.id, layers)
  else clearMapImages()
}

function updateVisibleLayers(layers) {
  const normalized = normalizeMapLayers(layers)
  if (!normalized.length) return
  visibleLayers.value = normalized
  if (currentMap.value) void loadMapImages(currentMap.value.id, normalized)
}

function markLayerLoaded(layer) {
  if (!loadedLayers.value.includes(layer)) loadedLayers.value = [...loadedLayers.value, layer]
  failedLayers.value = failedLayers.value.filter(item => item !== layer)
}

function markLayerFailed(layer) {
  if (!failedLayers.value.includes(layer)) failedLayers.value = [...failedLayers.value, layer]
}

function openDiagnostic(map) {
  diagnosticMap.value = map
}

async function generateMap() {
  if (!canGenerate.value) return
  try {
    const layers = normalizeMapLayers(['terrain', ...generationLayers.value])
    const job = await worldMapsV2API.generate(selectedRoomId.value, {
      worldId: selectedWorldId.value,
      sessionId: selectedSessionId.value,
      layers
    })
    generationJob.value = job
    activeJobId.value = job.id
    toast.success(t('worldMaps.feedback.generationSubmitted'))
    await loadMaps(loadEpoch, false)
    await monitorJob(job.id, false)
  } catch (error) {
    activeJobId.value = ''
    toast.error(t('worldMaps.feedback.generationFailed', { error: errorDetail(error) }))
  }
}

async function downloadSession(session) {
  if (!session?.id || sessionDownloadId.value) return
  sessionDownloadId.value = session.id
  try {
    const blob = await worldMapsV2API.sessionBlob(session.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dst-session-${session.sessionId}-${session.fileName}.bin`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.success(t('worldMaps.feedback.sessionDownloadStarted'))
  } catch (error) {
    toast.error(t('worldMaps.feedback.sessionDownloadFailed', { error: errorDetail(error) }))
  } finally {
    sessionDownloadId.value = ''
  }
}

async function monitorJob(jobId, silent) {
  if (!jobId) return
  const token = ++jobEpoch
  activeJobId.value = jobId
  const deadline = Date.now() + 10 * 60 * 1000
  try {
    while (!destroyed && token === jobEpoch && Date.now() < deadline) {
      const job = await jobsV2API.get(jobId)
      if (destroyed || token !== jobEpoch) return
      generationJob.value = job
      if (TERMINAL_JOB_STATES.has(job.status)) {
        if (job.status === 'succeeded') {
          if (!silent) toast.success(t('worldMaps.generation.completedTitle'))
        } else if (!silent) {
          toast.error(t('worldMaps.feedback.generationIncomplete', { error: mapJobFailure(job) }))
        }
        await loadMaps(loadEpoch, false)
        const generated = worldMaps.value.find(map => map.sourceJobId === jobId && map.status === 'succeeded')
        if (generated) selectMap(generated)
        return
      }
      await delay(700)
    }
    if (!destroyed && token === jobEpoch) toast.warning(t('worldMaps.feedback.jobStillRunning'))
  } catch (error) {
    if (!destroyed && token === jobEpoch && !silent) toast.error(t('worldMaps.feedback.jobStatusFailed', { error: errorDetail(error) }))
  } finally {
    if (token === jobEpoch) activeJobId.value = ''
  }
}

async function cancelGeneration() {
  if (!activeJobId.value || cancelLoading.value) return
  cancelLoading.value = true
  try {
    await jobsV2API.cancel(activeJobId.value)
    toast.success(t('worldMaps.feedback.cancelRequested'))
  } catch (error) {
    toast.error(t('worldMaps.feedback.cancelFailed', { error: errorDetail(error) }))
  } finally {
    cancelLoading.value = false
  }
}

function handleRuntimeTargetChange() {
  loadEpoch += 1
  jobEpoch += 1
  activeJobId.value = ''
  generationJob.value = null
  selectMap(null)
  void loadSources()
}

onMounted(() => {
  window.addEventListener(RUNTIME_TARGET_CHANGED_EVENT, handleRuntimeTargetChange)
  void loadSources()
})

onBeforeUnmount(() => {
  destroyed = true
  loadEpoch += 1
  jobEpoch += 1
  clearMapImages()
  window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, handleRuntimeTargetChange)
})
</script>

<style scoped>
.world-maps-page,
.control-column,
.viewer-column,
.job-status,
.session-name,
.diagnostic-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.world-maps-page {
  gap: 24px;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-heading h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
}

.page-heading p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.loading-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(280px, 0.75fr) minmax(0, 1.25fr);
}

.loading-grid > :first-child {
  grid-column: 1 / -1;
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.workspace-grid {
  display: grid;
  align-items: start;
  grid-template-columns: minmax(320px, 0.72fr) minmax(0, 1.28fr);
  gap: 20px;
}

.control-column,
.viewer-column {
  gap: 20px;
}

.layer-picker,
.viewer-layers {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
}

.inline-loading {
  display: flex;
  min-height: 160px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--muted-foreground);
}

.job-status {
  gap: 8px;
}

.session-scroll {
  height: 320px;
}

.session-name {
  max-width: 220px;
  gap: 2px;
}

.session-name span {
  color: var(--muted-foreground);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
}

.map-viewer-card {
  min-width: 0;
}

.map-canvas {
  position: relative;
  display: grid;
  width: 100%;
  max-height: 68vh;
  min-height: 280px;
  margin-top: 16px;
  place-items: center;
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--muted);
}

.map-skeleton {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
}

.map-layer {
  display: block;
  width: 100%;
  height: 100%;
  max-height: 68vh;
  object-fit: contain;
}

.map-layer--overlay {
  position: absolute;
  inset: 0;
}

.history-table {
  width: 100%;
  overflow-x: auto;
}

.history-table :deep(table) {
  min-width: 760px;
}

.diagnostic-content {
  gap: 16px;
}

.diagnostic-log {
  max-height: 48vh;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border-radius: var(--radius);
  background: var(--muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

@media (max-width: 1100px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .page-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .source-grid,
  .loading-grid {
    grid-template-columns: 1fr;
  }

  .loading-grid > :first-child {
    grid-column: auto;
  }

  .map-canvas {
    min-height: 220px;
  }
}
</style>

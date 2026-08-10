<template>
  <div class="world-maps-page">
    <header class="page-heading">
      <div>
        <h1>{{ t('worldMaps.title') }}</h1>
        <p>{{ t('worldMaps.subtitle') }}</p>
      </div>
      <UiButton variant="outline" :disabled="pageBusy" @click="reloadSelectedWorld">
        <Spinner v-if="mapsLoading || sessionsLoading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        {{ t('worldMaps.actions.refresh') }}
      </UiButton>
    </header>

    <Alert v-if="sourceError" variant="destructive">
      <TriangleAlert />
      <AlertTitle>{{ t('worldMaps.errors.sourceLoadFailedTitle') }}</AlertTitle>
      <AlertDescription>{{ sourceError }}</AlertDescription>
      <AlertAction>
        <UiButton variant="outline" size="sm" :disabled="sourceLoading" @click="loadSources">
          {{ t('worldMaps.actions.retry') }}
        </UiButton>
      </AlertAction>
    </Alert>

    <div v-if="sourceLoading" class="loading-grid">
      <Skeleton class="h-28" />
      <Skeleton class="h-[34rem]" />
      <Skeleton class="h-[34rem]" />
    </div>

    <template v-else>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{{ t('worldMaps.source.title') }}</CardTitle>
          <CardDescription>{{ t('worldMaps.source.description') }}</CardDescription>
          <CardAction>
            <Badge v-if="renderer.available" variant="outline">
              {{ t('worldMaps.renderer.protocol', { version: renderer.protocolVersion || '--' }) }}
            </Badge>
            <Badge v-else variant="secondary">{{ t('worldMaps.renderer.unavailableBadge') }}</Badge>
          </CardAction>
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
        <AlertDescription>
          {{ renderer.error || t('worldMaps.renderer.unavailableDescription') }}
        </AlertDescription>
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
        <AlertAction v-if="generationBusy">
          <UiButton variant="outline" size="sm" :disabled="cancelLoading" @click="cancelGeneration">
            <Spinner v-if="cancelLoading" data-icon="inline-start" />
            {{ t('worldMaps.actions.cancelJob') }}
          </UiButton>
        </AlertAction>
      </Alert>

      <div class="workspace-grid">
        <Card ref="mapViewerCard" class="map-viewer-card">
          <CardHeader>
            <CardTitle>{{ currentMap ? t('worldMaps.viewer.worldTitle', { world: selectedWorld?.name || t('worldMaps.values.defaultWorld') }) : t('worldMaps.viewer.title') }}</CardTitle>
            <CardDescription v-if="currentMap">
              {{ currentMap.width }} × {{ currentMap.height }} · {{ currentMap.sessionLabel }}
            </CardDescription>
            <CardDescription v-else>{{ t('worldMaps.viewer.description') }}</CardDescription>
            <CardAction v-if="currentMap">
              <Badge variant="outline">{{ formatMapTime(currentMap.finishedAt || currentMap.createdAt) }}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent class="map-card-content">
            <template v-if="currentMap">
              <div class="map-toolbar">
                <div class="feature-search">
                  <InputGroup>
                    <InputGroupAddon><Search /></InputGroupAddon>
                    <InputGroupInput v-model="featureSearch" :placeholder="t('worldMaps.viewer.searchPlaceholder')" @focus="searchOpen = true" />
                    <InputGroupAddon v-if="featureSearch" align="inline-end">
                      <InputGroupButton size="icon-xs" :aria-label="t('worldMaps.actions.clearSearch')" @click="clearFeatureSearch">
                        <X />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </div>
                <TooltipProvider :delay-duration="200">
                  <div class="map-tools">
                    <Tooltip><TooltipTrigger as-child><UiButton variant="outline" size="icon-sm" :aria-label="t('worldMaps.actions.zoomOut')" @click="mapCanvas?.zoomOut()"><ZoomOut /></UiButton></TooltipTrigger><TooltipContent>{{ t('worldMaps.actions.zoomOut') }}</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger as-child><UiButton variant="outline" size="icon-sm" :aria-label="t('worldMaps.actions.zoomIn')" @click="mapCanvas?.zoomIn()"><ZoomIn /></UiButton></TooltipTrigger><TooltipContent>{{ t('worldMaps.actions.zoomIn') }}</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger as-child><UiButton variant="outline" size="icon-sm" :aria-label="t('worldMaps.actions.fitMap')" @click="mapCanvas?.fit()"><Scan /></UiButton></TooltipTrigger><TooltipContent>{{ t('worldMaps.actions.fitMap') }}</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger as-child><UiButton variant="outline" size="icon-sm" :aria-label="mapViewerFullscreen ? t('worldMaps.actions.exitFullscreen') : t('worldMaps.actions.fullscreen')" @click="toggleMapFullscreen"><Minimize2 v-if="mapViewerFullscreen" /><Maximize2 v-else /></UiButton></TooltipTrigger><TooltipContent>{{ mapViewerFullscreen ? t('worldMaps.actions.exitFullscreen') : t('worldMaps.actions.fullscreen') }}</TooltipContent></Tooltip>
                  </div>
                </TooltipProvider>
              </div>

              <div v-if="featureSearch.trim() && searchOpen" class="search-results">
                <div class="search-results-heading">
                  <span>{{ t('worldMaps.viewer.searchResults', { count: featureSearchResults.length }) }}</span>
                  <Badge variant="secondary">{{ mapFeatures.length }}</Badge>
                </div>
                <ScrollArea v-if="featureSearchResults.length" class="search-results-scroll">
                  <div class="search-result-list">
                    <UiButton v-for="feature in featureSearchResults" :key="feature.id" variant="ghost" class="search-result" @click="focusFeature(feature)">
                      <MapPin data-icon="inline-start" />
                      <span class="truncate">{{ feature.prefab }}</span>
                      <span class="search-result-coordinates">{{ formatCoordinates(feature) }}</span>
                    </UiButton>
                  </div>
                </ScrollArea>
                <p v-else class="search-empty">{{ t('worldMaps.viewer.noSearchResults') }}</p>
              </div>

              <div class="category-filter">
                <span class="category-filter-label">{{ t('worldMaps.viewer.categoryFilters') }}</span>
                <ToggleGroup v-model="visibleCategories" type="multiple" variant="outline" :spacing="1" class="category-toggle-group">
                  <ToggleGroupItem v-for="category in WORLD_MAP_CATEGORIES" :key="category.id" :value="category.id">
                    <span class="category-swatch" :data-category="category.id" aria-hidden="true" />
                    {{ featureCategoryLabel(category.id) }}
                    <span class="category-count">{{ featureCounts[category.id] || 0 }}</span>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div class="map-surface">
                <Skeleton v-if="mapArtifactLoading || !terrainLoaded" class="map-loading" />
                <DstMapCanvas
                  v-if="terrainURL && manifest"
                  ref="mapCanvas"
                  :terrain-url="terrainURL"
                  :manifest="manifest"
                  :features="mapFeatures"
                  :visible-categories="visibleCategories"
                  :selected-feature-id="selectedFeature?.id || ''"
                  @feature-selected="handleFeatureSelected"
                  @image-loaded="terrainLoaded = true"
                  @image-error="handleTerrainError"
                />
              </div>

              <Alert v-if="artifactError" variant="destructive">
                <TriangleAlert />
                <AlertTitle>{{ t('worldMaps.viewer.artifactLoadFailedTitle') }}</AlertTitle>
                <AlertDescription>{{ artifactError }}</AlertDescription>
              </Alert>
              <Alert v-else-if="terrainFailed" variant="destructive">
                <TriangleAlert />
                <AlertTitle>{{ t('worldMaps.viewer.terrainLoadFailedTitle') }}</AlertTitle>
                <AlertDescription>{{ t('worldMaps.viewer.terrainLoadFailedDescription') }}</AlertDescription>
              </Alert>
              <Alert v-else-if="legacyMap">
                <TriangleAlert />
                <AlertTitle>{{ t('worldMaps.viewer.legacyTitle') }}</AlertTitle>
                <AlertDescription>{{ t('worldMaps.viewer.legacyDescription') }}</AlertDescription>
              </Alert>

              <div v-if="manifest" class="map-statistics">
                <div><span>{{ t('worldMaps.viewer.statistics.tiles') }}</span><strong>{{ manifest.statistics?.tileCount ?? '--' }}</strong></div>
                <Separator orientation="vertical" />
                <div><span>{{ t('worldMaps.viewer.statistics.features') }}</span><strong>{{ mapFeatures.length }}</strong></div>
                <Separator orientation="vertical" />
                <div><span>{{ t('worldMaps.viewer.statistics.unknownTiles') }}</span><strong>{{ manifest.statistics?.unknownTileCount ?? 0 }}</strong></div>
                <Separator orientation="vertical" />
                <div><span>{{ t('worldMaps.viewer.statistics.warnings') }}</span><strong>{{ mapWarnings.length }}</strong></div>
              </div>
            </template>
            <Empty v-else>
              <EmptyHeader>
                <EmptyMedia variant="icon"><MapIcon /></EmptyMedia>
                <EmptyTitle>{{ t('worldMaps.viewer.emptyTitle') }}</EmptyTitle>
                <EmptyDescription>{{ renderer.available ? t('worldMaps.viewer.emptyRendererReady') : t('worldMaps.viewer.emptyRendererUnavailable') }}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>

        <div class="side-column">
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
                  <FieldLegend variant="label">{{ t('worldMaps.generation.output') }}</FieldLegend>
                  <FieldDescription>{{ t('worldMaps.generation.outputDescription') }}</FieldDescription>
                  <div class="output-badges">
                    <Badge v-for="layer in WORLD_MAP_LAYERS" :key="layer.id" variant="secondary">{{ mapLayerLabel(layer.id) }}</Badge>
                  </div>
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
              <CardTitle>{{ t('worldMaps.worldState.title') }}</CardTitle>
              <CardDescription>{{ t('worldMaps.worldState.description') }}</CardDescription>
              <CardAction v-if="currentMap?.rendererVersion"><Badge variant="outline">{{ currentMap.rendererVersion }}</Badge></CardAction>
            </CardHeader>
            <CardContent>
              <div v-if="worldStateEntries.length" class="world-state-list">
                <div v-for="entry in worldStateEntries" :key="entry.key" class="world-state-entry">
                  <span>{{ entry.key }}</span>
                  <code>{{ entry.value }}</code>
                </div>
              </div>
              <Empty v-else>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Gauge /></EmptyMedia>
                  <EmptyTitle>{{ t('worldMaps.worldState.emptyTitle') }}</EmptyTitle>
                  <EmptyDescription>{{ t('worldMaps.worldState.emptyDescription') }}</EmptyDescription>
                </EmptyHeader>
              </Empty>
              <Alert v-if="mapWarnings.length" class="map-warning-alert">
                <TriangleAlert />
                <AlertTitle>{{ t('worldMaps.worldState.warningsTitle', { count: mapWarnings.length }) }}</AlertTitle>
                <AlertDescription><ul><li v-for="warning in mapWarnings" :key="warning">{{ warning }}</li></ul></AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>

      <div class="records-grid">
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
                <TableHeader><TableRow><TableHead>{{ t('worldMaps.history.columns.time') }}</TableHead><TableHead>{{ t('worldMaps.history.columns.session') }}</TableHead><TableHead>{{ t('worldMaps.history.columns.status') }}</TableHead><TableHead>{{ t('worldMaps.history.columns.features') }}</TableHead><TableHead>{{ t('worldMaps.history.columns.warnings') }}</TableHead><TableHead class="text-right">{{ t('worldMaps.history.columns.actions') }}</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow v-for="map in worldMaps" :key="map.id" :data-state="map.id === selectedMapId ? 'selected' : undefined">
                    <TableCell>{{ formatMapTime(map.createdAt) }}</TableCell>
                    <TableCell class="max-w-52 truncate" :title="map.sessionLabel">{{ map.sessionLabel }}</TableCell>
                    <TableCell><div class="status-cell"><Badge :variant="mapStatusMeta(map.status).variant">{{ mapStatusMeta(map.status).label }}</Badge><span>{{ mapStageLabel(map.stage) }}</span></div></TableCell>
                    <TableCell>{{ map.featureCount ?? '--' }}</TableCell>
                    <TableCell>{{ map.warningCount ?? '--' }}</TableCell>
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
    </template>

    <Sheet :open="featurePanelOpen" @update:open="handleFeaturePanelOpen">
      <SheetContent class="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{{ selectedFeature?.prefab || t('worldMaps.feature.title') }}</SheetTitle>
          <SheetDescription v-if="selectedFeature">{{ featureCategoryLabel(selectedFeature.category) }} · {{ formatCoordinates(selectedFeature) }}</SheetDescription>
        </SheetHeader>
        <ScrollArea v-if="selectedFeature" class="feature-detail-scroll">
          <div class="feature-detail">
            <div class="feature-coordinate-grid">
              <div><span>{{ t('worldMaps.feature.worldCoordinates') }}</span><strong>{{ formatCoordinates(selectedFeature) }}</strong></div>
              <div><span>{{ t('worldMaps.feature.pixelCoordinates') }}</span><strong>{{ formatPixelCoordinates(selectedFeature) }}</strong></div>
            </div>
            <Separator />
            <div>
              <h3>{{ t('worldMaps.feature.properties') }}</h3>
              <ShadcnTable v-if="selectedFeatureProperties.length">
                <TableBody><TableRow v-for="property in selectedFeatureProperties" :key="property.key"><TableCell class="feature-property-key">{{ property.key }}</TableCell><TableCell class="feature-property-value">{{ property.value }}</TableCell></TableRow></TableBody>
              </ShadcnTable>
              <p v-else class="feature-empty-properties">{{ t('worldMaps.feature.noProperties') }}</p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>

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
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import {
  CircleCheck,
  Download,
  Eye,
  FileArchive,
  FileWarning,
  Gauge,
  History,
  Map as MapIcon,
  MapPin,
  MapPinned,
  Maximize2,
  Minimize2,
  RefreshCw,
  Scan,
  Search,
  TriangleAlert,
  X,
  ZoomIn,
  ZoomOut
} from '@lucide/vue'
import { jobsV2API, roomsV2API, worldMapsV2API } from '@/api/v2'
import DstMapCanvas from '@/components/worlds/DstMapCanvas.vue'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog as UiDialog, DialogDescription, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  formatWorldMapTime,
  worldMapDiagnosticError,
  worldMapErrorDetail,
  worldMapFeatureCategoryLabel,
  worldMapJobFailure,
  worldMapLayerLabel,
  worldMapStageLabel,
  worldMapStatusMeta
} from '@/i18n/worldMapsMessages.js'
import {
  WORLD_MAP_CATEGORIES,
  WORLD_MAP_LAYERS,
  defaultFeatureCategories,
  formatMapBytes,
  mapFeatureCounts,
  normalizeFeatureCategories,
  searchMapFeatures
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
const renderer = ref({ available: false, path: '', protocolVersion: '', version: '', artifacts: [], error: '' })

const sourceLoading = ref(false)
const worldsLoading = ref(false)
const mapsLoading = ref(false)
const sessionsLoading = ref(false)
const sourceFailure = ref(null)
const mapFailure = ref(null)
const sessionFailure = ref(null)

const terrainURL = ref('')
const terrainLoaded = ref(false)
const terrainFailed = ref(false)
const manifest = ref(null)
const mapFeatures = ref([])
const mapArtifactLoading = ref(false)
const mapArtifactFailure = ref(null)
const legacyMap = ref(false)
const mapCanvas = ref(null)
const mapViewerCard = ref(null)
const mapViewerFullscreen = ref(false)
const visibleCategories = ref(defaultFeatureCategories())
const selectedFeature = ref(null)
const featurePanelOpen = ref(false)
const featureSearch = ref('')
const searchOpen = ref(false)

const generationJob = ref(null)
const activeJobId = ref('')
const cancelLoading = ref(false)
const sessionDownloadId = ref('')
const diagnosticMap = ref(null)

let loadEpoch = 0
let jobEpoch = 0
let artifactEpoch = 0
let destroyed = false

const selectedWorld = computed(() => worlds.value.find(world => world.id === selectedWorldId.value) || null)
const selectedSession = computed(() => sessions.value.find(session => session.id === selectedSessionId.value) || null)
const sourceError = computed(() => localizedFailure(sourceFailure.value))
const mapError = computed(() => localizedFailure(mapFailure.value))
const sessionError = computed(() => localizedFailure(sessionFailure.value))
const artifactError = computed(() => localizedFailure(mapArtifactFailure.value))
const worldMaps = computed(() => maps.value.filter(map => map.worldId === selectedWorldId.value))
const currentMap = computed(() => worldMaps.value.find(map => map.id === selectedMapId.value && map.status === 'succeeded') || null)
const generationBusy = computed(() => Boolean(activeJobId.value))
const pageBusy = computed(() => sourceLoading.value || worldsLoading.value || mapsLoading.value || sessionsLoading.value)
const canGenerate = computed(() => Boolean(renderer.value.available && selectedRoomId.value && selectedWorldId.value && selectedSessionId.value && !generationBusy.value))
const featureCounts = computed(() => mapFeatureCounts(mapFeatures.value))
const featureSearchResults = computed(() => searchMapFeatures(mapFeatures.value, featureSearch.value))
const mapWarnings = computed(() => Array.isArray(manifest.value?.warnings) ? manifest.value.warnings : [])
const worldStateEntries = computed(() => Object.entries(manifest.value?.worldState || {}).map(([key, value]) => ({ key, value: formatPropertyValue(value) })))
const selectedFeatureProperties = computed(() => Object.entries(selectedFeature.value?.properties || {}).map(([key, value]) => ({ key, value: formatPropertyValue(value) })))
const generationProgress = computed(() => {
  const targets = generationJob.value?.targets || []
  if (!targets.length) return generationBusy.value ? 15 : 100
  const completed = targets.filter(target => TERMINAL_JOB_STATES.has(target.status)).length
  return Math.round((completed / targets.length) * 100)
})
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
  return error ? t('worldMaps.diagnostic.failedStageWithError', { stage, error }) : t('worldMaps.diagnostic.failedStage', { stage })
})

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

function formatMapTime(value) { return formatWorldMapTime(value, locale.value) }
function mapLayerLabel(layer) { return worldMapLayerLabel(layer, t) }
function featureCategoryLabel(category) { return worldMapFeatureCategoryLabel(category, t) }
function mapStatusMeta(status) { return worldMapStatusMeta(status, t) }
function mapStageLabel(stage) { return worldMapStageLabel(stage, t) }
function mapJobFailure(job) { return worldMapJobFailure(job, t) }
function errorDetail(error) { return worldMapErrorDetail(error, t) }
function localizedFailure(failure) { return failure ? t(failure.key, { error: errorDetail(failure.error) }) : '' }

function formatCoordinates(feature) {
  return `${Number(feature?.x || 0).toFixed(1)}, ${Number(feature?.z || 0).toFixed(1)}`
}

function formatPixelCoordinates(feature) {
  return `${Number(feature?.pixelX || 0).toFixed(1)}, ${Number(feature?.pixelY || 0).toFixed(1)}`
}

function formatPropertyValue(value) {
  if (value === null || value === undefined) return '--'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try { return JSON.stringify(value) } catch { return String(value) }
}

function routeValue(value) { return Array.isArray(value) ? value[0] : String(value || '') }
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

function clearMapArtifacts() {
  artifactEpoch += 1
  if (terrainURL.value) URL.revokeObjectURL(terrainURL.value)
  terrainURL.value = ''
  terrainLoaded.value = false
  terrainFailed.value = false
  manifest.value = null
  mapFeatures.value = []
  mapArtifactFailure.value = null
  legacyMap.value = false
  selectedFeature.value = null
  featurePanelOpen.value = false
  featureSearch.value = ''
  searchOpen.value = false
  mapArtifactLoading.value = false
}

function legacyManifest(map) {
  const width = Number(map?.width)
  const height = Number(map?.height)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  return {
    protocolVersion: 'legacy',
    map: { imageWidth: width, imageHeight: height },
    statistics: { tileCount: 0, unknownTileCount: 0, featureCount: 0 },
    worldState: {},
    warnings: []
  }
}

async function loadMapArtifacts(map) {
  clearMapArtifacts()
  if (!map?.id) return
  const token = artifactEpoch
  mapArtifactLoading.value = true
  const [imageResult, manifestResult, featuresResult] = await Promise.allSettled([
    worldMapsV2API.imageBlob(map.id, 'terrain'),
    worldMapsV2API.manifest(map.id),
    worldMapsV2API.features(map.id)
  ])
  if (destroyed || token !== artifactEpoch) return
  try {
    if (imageResult.status === 'rejected') throw imageResult.reason
    let nextManifest
    let nextFeatures
    if (manifestResult.status === 'fulfilled' && featuresResult.status === 'fulfilled') {
      nextManifest = manifestResult.value
      nextFeatures = featuresResult.value?.features
      if (nextManifest?.protocolVersion !== '1' || !Array.isArray(nextFeatures)) throw { code: 'INVALID_RESPONSE' }
    } else if (manifestResult.reason?.status === 404 && featuresResult.reason?.status === 404) {
      nextManifest = legacyManifest(map)
      nextFeatures = []
      legacyMap.value = true
      if (!nextManifest) throw { code: 'INVALID_RESPONSE' }
    } else {
      throw manifestResult.status === 'rejected' ? manifestResult.reason : featuresResult.reason
    }
    const width = Number(nextManifest?.map?.imageWidth)
    const height = Number(nextManifest?.map?.imageHeight)
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw { code: 'INVALID_RESPONSE' }
    if (map.sourceSha256 && nextManifest.sourceSha256 !== map.sourceSha256) throw { code: 'INVALID_RESPONSE' }
    if (!legacyMap.value && Number(nextManifest?.statistics?.featureCount) !== nextFeatures.length) throw { code: 'INVALID_RESPONSE' }
    manifest.value = nextManifest
    mapFeatures.value = nextFeatures
    terrainURL.value = URL.createObjectURL(imageResult.value)
  } catch (error) {
    mapArtifactFailure.value = { key: 'worldMaps.errors.artifactsLoadFailed', error }
  } finally {
    if (!destroyed && token === artifactEpoch) mapArtifactLoading.value = false
  }
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
    renderer.value = response.renderer || {
      available: Boolean(response.rendererAvailable), path: response.rendererPath || '', protocolVersion: '', version: '', artifacts: [], error: ''
    }
    const available = worldMaps.value.filter(map => map.status === 'succeeded')
    if (!available.some(map => map.id === selectedMapId.value)) selectMap(available[0] || null)
    const running = worldMaps.value.find(map => map.status === 'running' && map.sourceJobId)
    if (resumeJob && running && !activeJobId.value) void monitorJob(running.sourceJobId, true)
  } catch (error) {
    if (destroyed || epoch !== loadEpoch) return
    mapFailure.value = { key: 'worldMaps.errors.mapsLoadFailed', error }
    maps.value = []
    renderer.value = { available: false, path: '', protocolVersion: '', version: '', artifacts: [], error: '' }
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
    if (!sessions.value.some(session => session.id === selectedSessionId.value)) selectedSessionId.value = sessions.value.find(session => session.latest)?.id || sessions.value[0]?.id || ''
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
  if (!selectedRoomId.value || !selectedWorldId.value) return loadSources()
  const epoch = ++loadEpoch
  await loadSelectedWorld(epoch)
}

function selectMap(map) {
  selectedMapId.value = map?.id || ''
  void loadMapArtifacts(map)
}

function clearFeatureSearch() {
  featureSearch.value = ''
  searchOpen.value = false
}

async function focusFeature(feature) {
  const category = WORLD_MAP_CATEGORIES.some(item => item.id === feature?.category) ? feature.category : 'other'
  visibleCategories.value = normalizeFeatureCategories([...visibleCategories.value, category])
  selectedFeature.value = feature
  searchOpen.value = false
  await nextTick()
  mapCanvas.value?.focusFeature(feature.id)
  await exitMapFullscreen()
  featurePanelOpen.value = true
}

async function handleFeatureSelected(feature) {
  selectedFeature.value = feature
  if (feature) await exitMapFullscreen()
  featurePanelOpen.value = Boolean(feature)
}

function mapViewerElement() {
  return mapViewerCard.value?.$el || null
}

async function exitMapFullscreen() {
  if (document.fullscreenElement === mapViewerElement()) await document.exitFullscreen()
}

async function toggleMapFullscreen() {
  const element = mapViewerElement()
  if (!element?.requestFullscreen) return
  if (document.fullscreenElement === element) await document.exitFullscreen()
  else await element.requestFullscreen()
}

function handleFullscreenChange() {
  mapViewerFullscreen.value = document.fullscreenElement === mapViewerElement()
  nextTick(() => mapCanvas.value?.fit())
}

function handleTerrainError() {
  terrainFailed.value = true
  terrainLoaded.value = true
}

function handleFeaturePanelOpen(open) {
  featurePanelOpen.value = open
  if (!open) selectedFeature.value = null
}

function openDiagnostic(map) { diagnosticMap.value = map }

async function generateMap() {
  if (!canGenerate.value) return
  try {
    const job = await worldMapsV2API.generate(selectedRoomId.value, {
      worldId: selectedWorldId.value,
      sessionId: selectedSessionId.value,
      layers: WORLD_MAP_LAYERS.map(layer => layer.id)
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
        } else if (!silent) toast.error(t('worldMaps.feedback.generationIncomplete', { error: mapJobFailure(job) }))
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
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  void loadSources()
})

onBeforeUnmount(() => {
  destroyed = true
  loadEpoch += 1
  jobEpoch += 1
  clearMapArtifacts()
  window.removeEventListener(RUNTIME_TARGET_CHANGED_EVENT, handleRuntimeTargetChange)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})
</script>

<style scoped>
.world-maps-page,
.side-column,
.job-status,
.session-name,
.diagnostic-content,
.feature-detail,
.search-result-list {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.world-maps-page {
  gap: 20px;
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
  letter-spacing: 0;
}

.page-heading p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.loading-grid,
.source-grid,
.workspace-grid,
.records-grid,
.feature-coordinate-grid {
  display: grid;
  min-width: 0;
}

.loading-grid {
  grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.8fr);
  gap: 16px;
}

.loading-grid > :first-child {
  grid-column: 1 / -1;
}

.source-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.workspace-grid {
  align-items: start;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
  gap: 20px;
}

.records-grid {
  align-items: start;
  grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.8fr);
  gap: 20px;
}

.side-column,
.job-status,
.diagnostic-content,
.feature-detail {
  gap: 16px;
}

.map-viewer-card,
.map-card-content {
  min-width: 0;
}

.map-viewer-card:fullscreen {
  width: 100vw;
  height: 100vh;
  border: 0;
  border-radius: 0;
  background: var(--background);
}

.map-viewer-card:fullscreen .map-card-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.map-viewer-card:fullscreen .map-surface {
  flex: 1 0 55vh;
  height: auto;
  max-height: none;
}

.map-card-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.map-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  gap: 10px;
}

.map-tools,
.category-filter,
.category-toggle-group,
.output-badges,
.status-cell {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.category-filter {
  align-items: flex-start;
  flex-direction: column;
}

.category-filter-label,
.search-results-heading {
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 500;
}

.category-toggle-group,
.output-badges {
  width: 100%;
  flex-wrap: wrap;
}

.category-swatch {
  display: inline-block;
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted-foreground);
}

.category-swatch[data-category='spawnPoint'] { background: #f59e0b; }
.category-swatch[data-category='player'] { background: #dc2626; }
.category-swatch[data-category='walrusCamp'] { background: #7c3aed; }
.category-swatch[data-category='landmark'] { background: #0f766e; }
.category-swatch[data-category='resource'] { background: #16a34a; }
.category-swatch[data-category='other'] { background: #71717a; }

.category-count {
  color: var(--muted-foreground);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.search-results {
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
}

.search-results-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 4px 8px;
}

.search-results-scroll {
  height: 180px;
}

.search-result-list {
  gap: 2px;
}

.search-result {
  width: 100%;
  justify-content: flex-start;
}

.search-result-coordinates {
  margin-left: auto;
  color: var(--muted-foreground);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
}

.search-empty,
.feature-empty-properties {
  margin: 0;
  padding: 18px 8px;
  color: var(--muted-foreground);
  text-align: center;
  font-size: 13px;
}

.map-surface {
  position: relative;
  width: 100%;
  height: clamp(360px, 56vh, 680px);
  min-height: 360px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
}

.map-loading {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.map-statistics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  min-height: 54px;
  align-items: stretch;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.map-statistics > div {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
}

.map-statistics span {
  color: var(--muted-foreground);
  font-size: 12px;
}

.map-statistics strong {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.map-statistics [data-slot='separator'] {
  height: auto;
  margin: 9px 0;
}

.world-state-list {
  display: grid;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  max-height: 320px;
  overflow: auto;
}

.world-state-entry {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(90px, 0.35fr) minmax(0, 0.65fr);
  gap: 10px;
  padding: 9px 10px;
  border-bottom: 1px solid var(--border);
}

.world-state-entry:last-child {
  border-bottom: 0;
}

.world-state-entry span {
  color: var(--muted-foreground);
  font-size: 12px;
}

.world-state-entry code {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 11px;
}

.map-warning-alert {
  margin-top: 14px;
}

.map-warning-alert ul {
  display: flex;
  margin: 6px 0 0;
  padding-left: 18px;
  flex-direction: column;
  gap: 4px;
}

.inline-loading {
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--muted-foreground);
}

.history-table {
  width: 100%;
  overflow-x: auto;
}

.history-table :deep(table) {
  min-width: 720px;
}

.status-cell {
  align-items: flex-start;
  flex-direction: column;
  gap: 3px;
}

.status-cell span {
  color: var(--muted-foreground);
  font-size: 11px;
}

.session-scroll {
  height: 330px;
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

.feature-detail-scroll {
  min-height: 0;
  flex: 1;
  padding-right: 12px;
}

.feature-coordinate-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.feature-coordinate-grid > div {
  display: flex;
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  flex-direction: column;
  gap: 3px;
}

.feature-coordinate-grid span {
  color: var(--muted-foreground);
  font-size: 11px;
}

.feature-coordinate-grid strong {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
}

.feature-detail h3 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
}

.feature-property-key {
  width: 38%;
  color: var(--muted-foreground);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
}

.feature-property-value {
  overflow-wrap: anywhere;
  font-size: 12px;
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

@media (max-width: 1180px) {
  .workspace-grid,
  .records-grid {
    grid-template-columns: 1fr;
  }

  .side-column {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .page-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .source-grid,
  .loading-grid,
  .side-column,
  .feature-coordinate-grid {
    grid-template-columns: 1fr;
  }

  .loading-grid > :first-child {
    grid-column: auto;
  }

  .map-toolbar {
    grid-template-columns: 1fr;
  }

  .map-tools {
    justify-content: flex-end;
  }

  .map-surface {
    height: 420px;
    min-height: 320px;
  }

  .map-statistics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .map-statistics [data-slot='separator'] {
    display: none;
  }
}
</style>

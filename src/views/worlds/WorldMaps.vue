<template>
  <div class="world-maps-page">
    <header class="page-heading">
      <div>
        <h1>地图与 Session</h1>
        <p>查看世界地图版本、生成任务和原始 Session 快照。</p>
      </div>
      <UiButton variant="outline" :disabled="sourceLoading || worldsLoading || mapsLoading || sessionsLoading" @click="reloadSelectedWorld">
        <Spinner v-if="mapsLoading || sessionsLoading" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        刷新
      </UiButton>
    </header>

    <Alert v-if="sourceError" variant="destructive">
      <TriangleAlert />
      <AlertTitle>地图数据加载失败</AlertTitle>
      <AlertDescription>{{ sourceError }}</AlertDescription>
      <AlertAction><UiButton variant="outline" size="sm" :disabled="sourceLoading" @click="loadSources">重试</UiButton></AlertAction>
    </Alert>

    <div v-if="sourceLoading" class="loading-grid">
      <Skeleton class="h-32" />
      <Skeleton class="h-80" />
      <Skeleton class="h-80" />
    </div>

    <template v-else>
      <Card>
        <CardHeader>
          <CardTitle>世界来源</CardTitle>
          <CardDescription>只列出已接管房间的真实世界和 Session 文件。</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup class="source-grid">
            <Field>
              <FieldLabel for="map-room-select">存档</FieldLabel>
              <UiSelect :model-value="selectedRoomId" :disabled="worldsLoading || !rooms.length" @update:model-value="handleRoomChange">
                <SelectTrigger id="map-room-select"><SelectValue placeholder="选择存档" /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</SelectItem></SelectGroup></SelectContent>
              </UiSelect>
            </Field>
            <Field>
              <FieldLabel for="map-world-select">世界</FieldLabel>
              <UiSelect :model-value="selectedWorldId" :disabled="worldsLoading || !worlds.length" @update:model-value="handleWorldChange">
                <SelectTrigger id="map-world-select"><SelectValue :placeholder="worldsLoading ? '正在加载世界' : '选择世界'" /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem v-for="world in worlds" :key="world.id" :value="world.id">{{ world.name }}</SelectItem></SelectGroup></SelectContent>
              </UiSelect>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Alert v-if="selectedRoomId && !renderer.available">
        <TriangleAlert />
        <AlertTitle>地图渲染器未就绪</AlertTitle>
        <AlertDescription>当前节点未找到可执行的 dst-map-renderer。已有地图查看和 Session 下载不受影响，新地图生成暂不可用。</AlertDescription>
      </Alert>
      <Alert v-else-if="renderer.available">
        <CircleCheck />
        <AlertTitle>地图渲染器已就绪</AlertTitle>
        <AlertDescription>{{ renderer.path || '当前节点已完成地图渲染器配置。' }}</AlertDescription>
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
        <AlertAction v-if="generationBusy"><UiButton variant="outline" size="sm" :disabled="cancelLoading" @click="cancelGeneration"><Spinner v-if="cancelLoading" data-icon="inline-start" />取消任务</UiButton></AlertAction>
      </Alert>

      <div class="workspace-grid">
        <div class="control-column">
          <Card>
            <CardHeader>
              <CardTitle>生成地图</CardTitle>
              <CardDescription>从选定 Session 生成经过校验的不可变地图版本。</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel for="map-session-select">Session 快照</FieldLabel>
                  <UiSelect v-model="selectedSessionId" :disabled="sessionsLoading || !sessions.length">
                    <SelectTrigger id="map-session-select"><SelectValue :placeholder="sessionsLoading ? '正在读取 Session' : '选择 Session'" /></SelectTrigger>
                    <SelectContent><SelectGroup><SelectItem v-for="session in sessions" :key="session.id" :value="session.id">{{ session.sessionId }} / {{ session.fileName }}</SelectItem></SelectGroup></SelectContent>
                  </UiSelect>
                  <FieldDescription v-if="selectedSession">{{ formatMapBytes(selectedSession.size) }} · {{ selectedSession.playerCount }} 位玩家数据 · {{ formatMapTime(selectedSession.modifiedAt) }}</FieldDescription>
                </Field>
                <FieldSet>
                  <FieldLegend variant="label">地图图层</FieldLegend>
                  <FieldDescription>地形层始终生成，可叠加位置和世界状态图层。</FieldDescription>
                  <ToggleGroup v-model="generationLayers" type="multiple" variant="outline" :spacing="1" class="layer-picker">
                    <ToggleGroupItem v-for="layer in WORLD_MAP_LAYERS" :key="layer.id" :value="layer.id" :disabled="layer.id === 'terrain'">{{ layer.label }}</ToggleGroupItem>
                  </ToggleGroup>
                </FieldSet>
              </FieldGroup>
            </CardContent>
            <CardFooter class="justify-between gap-3">
              <span class="text-muted-foreground text-xs">{{ sessions.length }} 个可诊断快照</span>
              <UiButton :disabled="!canGenerate" @click="generateMap">
                <Spinner v-if="generationBusy" data-icon="inline-start" />
                <MapPinned v-else data-icon="inline-start" />
                {{ generationBusy ? '正在生成' : '生成地图' }}
              </UiButton>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session 诊断</CardTitle>
              <CardDescription>{{ sessions.length ? `当前世界共 ${sessions.length} 个快照` : '当前世界没有可用 Session' }}</CardDescription>
            </CardHeader>
            <CardContent>
              <div v-if="sessionsLoading" class="inline-loading"><Spinner /><span>正在读取 Session</span></div>
              <Alert v-else-if="sessionError" variant="destructive"><TriangleAlert /><AlertTitle>Session 读取失败</AlertTitle><AlertDescription>{{ sessionError }}</AlertDescription></Alert>
              <ScrollArea v-else-if="sessions.length" class="session-scroll">
                <ShadcnTable>
                  <TableHeader><TableRow><TableHead>快照</TableHead><TableHead>大小</TableHead><TableHead class="text-right">操作</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow v-for="session in sessions" :key="session.id">
                      <TableCell><div class="session-name"><strong class="truncate">{{ session.fileName }}</strong><span class="truncate">{{ session.sessionId }}</span><Badge v-if="session.latest" variant="secondary">最新</Badge></div></TableCell>
                      <TableCell>{{ formatMapBytes(session.size) }}</TableCell>
                      <TableCell class="text-right"><UiButton size="icon-sm" variant="ghost" :disabled="sessionDownloadId === session.id" :aria-label="`下载 Session ${session.fileName}`" title="下载 Session" @click="downloadSession(session)"><Spinner v-if="sessionDownloadId === session.id" /><Download v-else /></UiButton></TableCell>
                    </TableRow>
                  </TableBody>
                </ShadcnTable>
              </ScrollArea>
              <Empty v-else><EmptyHeader><EmptyMedia variant="icon"><FileArchive /></EmptyMedia><EmptyTitle>没有 Session 快照</EmptyTitle><EmptyDescription>世界首次保存后，Session 文件会在这里出现。</EmptyDescription></EmptyHeader></Empty>
            </CardContent>
          </Card>
        </div>

        <div class="viewer-column">
          <Card class="map-viewer-card">
            <CardHeader>
              <CardTitle>{{ currentMap ? `${selectedWorld?.name || '世界'}地图` : '地图查看器' }}</CardTitle>
              <CardDescription v-if="currentMap">{{ currentMap.width }} × {{ currentMap.height }} · {{ currentMap.sessionLabel }}</CardDescription>
              <CardDescription v-else>选择或生成一个可用地图版本。</CardDescription>
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
                    :alt="`${selectedWorld?.name || '世界'} ${mapLayerLabel(layer)}图层`"
                    :class="cn('map-layer', index > 0 && 'map-layer--overlay')"
                    @load="markLayerLoaded(layer)"
                    @error="markLayerFailed(layer)"
                  >
                </div>
                <Alert v-if="failedLayers.length" variant="destructive" class="mt-4"><TriangleAlert /><AlertTitle>部分地图图层加载失败</AlertTitle><AlertDescription>{{ failedLayers.map(mapLayerLabel).join('、') }}</AlertDescription></Alert>
              </template>
              <Empty v-else><EmptyHeader><EmptyMedia variant="icon"><MapIcon /></EmptyMedia><EmptyTitle>还没有可用地图</EmptyTitle><EmptyDescription>{{ renderer.available ? '选择 Session 后生成第一个地图版本。' : '配置地图渲染器后即可从 Session 生成地图。' }}</EmptyDescription></EmptyHeader></Empty>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>地图版本</CardTitle>
              <CardDescription>成功版本、运行任务和失败诊断均保留在同一历史中。</CardDescription>
            </CardHeader>
            <CardContent>
              <div v-if="mapsLoading" class="inline-loading"><Spinner /><span>正在读取地图版本</span></div>
              <Alert v-else-if="mapError" variant="destructive"><TriangleAlert /><AlertTitle>地图历史读取失败</AlertTitle><AlertDescription>{{ mapError }}</AlertDescription></Alert>
              <div v-else-if="worldMaps.length" class="history-table">
                <ShadcnTable>
                  <TableHeader><TableRow><TableHead>时间</TableHead><TableHead>Session</TableHead><TableHead>状态</TableHead><TableHead>阶段</TableHead><TableHead>图层</TableHead><TableHead class="text-right">操作</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow v-for="map in worldMaps" :key="map.id">
                      <TableCell>{{ formatMapTime(map.createdAt) }}</TableCell>
                      <TableCell class="max-w-52 truncate" :title="map.sessionLabel">{{ map.sessionLabel }}</TableCell>
                      <TableCell><Badge :variant="mapStatusMeta(map.status).variant">{{ mapStatusMeta(map.status).label }}</Badge></TableCell>
                      <TableCell>{{ mapStageLabel(map.stage) }}</TableCell>
                      <TableCell>{{ normalizeMapLayers(map.layers).map(mapLayerLabel).join('、') }}</TableCell>
                      <TableCell class="text-right">
                        <UiButton v-if="map.status === 'succeeded'" size="icon-sm" variant="ghost" title="查看地图" aria-label="查看地图" @click="selectMap(map)"><Eye /></UiButton>
                        <UiButton v-else-if="map.status === 'failed'" size="icon-sm" variant="ghost" title="查看诊断" aria-label="查看地图失败诊断" @click="openDiagnostic(map)"><FileWarning /></UiButton>
                        <Spinner v-else />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </ShadcnTable>
              </div>
              <Empty v-else><EmptyHeader><EmptyMedia variant="icon"><History /></EmptyMedia><EmptyTitle>没有地图版本</EmptyTitle><EmptyDescription>生成任务提交后，状态会显示在这里。</EmptyDescription></EmptyHeader></Empty>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>

    <UiDialog :open="Boolean(diagnosticMap)" @update:open="open => { if (!open) diagnosticMap = null }">
      <DialogScrollContent class="sm:max-w-3xl">
        <DialogHeader><DialogTitle>地图生成诊断</DialogTitle><DialogDescription>{{ diagnosticMap?.sessionLabel }}</DialogDescription></DialogHeader>
        <div v-if="diagnosticMap" class="diagnostic-content">
          <Alert variant="destructive"><TriangleAlert /><AlertTitle>{{ diagnosticMap.errorMessage || '地图生成失败' }}</AlertTitle><AlertDescription>失败阶段：{{ mapStageLabel(diagnosticMap.stage) }}</AlertDescription></Alert>
          <FieldSet><FieldLegend variant="label">渲染器输出</FieldLegend><pre class="diagnostic-log">{{ diagnosticMap.log || '渲染器没有返回日志。' }}</pre></FieldSet>
        </div>
      </DialogScrollContent>
    </UiDialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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
import { cn } from '@/lib/utils'
import {
  WORLD_MAP_LAYERS,
  formatMapBytes,
  formatMapTime,
  mapJobFailure,
  mapLayerLabel,
  mapStageLabel,
  mapStatusMeta,
  normalizeMapLayers
} from '@/lib/worldMaps.mjs'
import { RUNTIME_TARGET_CHANGED_EVENT } from '@/utils/runtimeTarget'
import { toast } from 'vue-sonner'

const TERMINAL_JOB_STATES = new Set(['succeeded', 'failed', 'canceled'])
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
const sourceError = ref('')
const mapError = ref('')
const sessionError = ref('')

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
const generationTitle = computed(() => {
  if (generationBusy.value) return '地图生成任务正在执行'
  if (generationJob.value?.status === 'succeeded') return '地图生成完成'
  if (generationJob.value?.status === 'canceled') return '地图生成已取消'
  return '地图生成失败'
})
const generationDescription = computed(() => {
  const target = (generationJob.value?.targets || [])[0]
  if (target?.message) return target.message
  if (generationBusy.value) return '正在运行外部渲染器并校验输出图层。'
  if (generationJob.value?.status !== 'succeeded') return mapJobFailure(generationJob.value)
  return '新地图版本已经发布。'
})

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

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
  sourceError.value = ''
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
    sourceError.value = error.message || '无法读取已接管房间'
    rooms.value = []
    worlds.value = []
  } finally {
    if (!destroyed && epoch === loadEpoch) sourceLoading.value = false
  }
}

async function loadSelectedRoom(epoch) {
  worldsLoading.value = true
  sourceError.value = ''
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
    sourceError.value = error.message || '无法读取世界列表'
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
  mapError.value = ''
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
    mapError.value = error.message || '无法读取地图版本'
    maps.value = []
    renderer.value = { available: false, path: '' }
  } finally {
    if (!destroyed && epoch === loadEpoch) mapsLoading.value = false
  }
}

async function loadSessions(epoch) {
  sessionsLoading.value = true
  sessionError.value = ''
  try {
    const response = await worldMapsV2API.sessions(selectedRoomId.value, selectedWorldId.value)
    if (destroyed || epoch !== loadEpoch) return
    sessions.value = response.items || []
    if (!sessions.value.some(session => session.id === selectedSessionId.value)) {
      selectedSessionId.value = sessions.value.find(session => session.latest)?.id || sessions.value[0]?.id || ''
    }
  } catch (error) {
    if (destroyed || epoch !== loadEpoch) return
    sessionError.value = error.message || '无法读取 Session 快照'
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
    toast.success('地图生成任务已提交')
    await loadMaps(loadEpoch, false)
    await monitorJob(job.id, false)
  } catch (error) {
    activeJobId.value = ''
    toast.error(`地图生成失败：${error.message || '未知错误'}`)
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
    toast.success('Session 下载已开始')
  } catch (error) {
    toast.error(`Session 下载失败：${error.message || '未知错误'}`)
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
          if (!silent) toast.success('地图生成完成')
        } else if (!silent) {
          toast.error(`地图生成未完成：${mapJobFailure(job)}`)
        }
        await loadMaps(loadEpoch, false)
        const generated = worldMaps.value.find(map => map.sourceJobId === jobId && map.status === 'succeeded')
        if (generated) selectMap(generated)
        return
      }
      await delay(700)
    }
    if (!destroyed && token === jobEpoch) toast.warning('地图任务仍在执行，请稍后刷新状态')
  } catch (error) {
    if (!destroyed && token === jobEpoch && !silent) toast.error(`地图任务状态读取失败：${error.message || '未知错误'}`)
  } finally {
    if (token === jobEpoch) activeJobId.value = ''
  }
}

async function cancelGeneration() {
  if (!activeJobId.value || cancelLoading.value) return
  cancelLoading.value = true
  try {
    await jobsV2API.cancel(activeJobId.value)
    toast.success('已提交地图任务取消请求')
  } catch (error) {
    toast.error(`取消地图任务失败：${error.message || '未知错误'}`)
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

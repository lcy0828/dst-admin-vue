<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Activity, CircleAlert, Download, RefreshCw } from '@lucide/vue'
import { roomsV2API, performanceV2API } from '@/api/v2'
import { preferredRoomId } from '@/lib/pageScope.mjs'
import { performanceCSV, performanceWorldSummaries } from '@/lib/performanceReport.mjs'
import { MANAGEMENT_SCOPE_CHANGED_EVENT, managementScopeTargetId } from '@/lib/managementScope.mjs'
import { rememberRoomSelection } from '@/lib/workspacePreferences.mjs'
import PerformanceChart from '@/components/worlds/PerformanceChart.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'

const { t, locale } = useI18n(), route = useRoute(), router = useRouter()
const rooms = ref([]), roomId = ref(''), worldId = ref('all'), range = ref('24')
const settings = ref(null), report = ref(null), requestedFrom = ref('')
const loading = ref(true), catalogLoading = ref(true), saving = ref(false), error = ref('')
const showSettings = ref(false), customFrom = ref(''), customTo = ref('')
let alive = true, sequence = 0, catalogSequence = 0
const selectedRoom = computed(() => rooms.value.find(room => room.id === roomId.value))
const roomWorlds = computed(() => selectedRoom.value?.worlds || [])
const scorePoints = computed(() => (report.value?.items || []).filter(point => point.scoreVersion === report.value.scoreVersion))
const summaries = computed(() => {
  const order = new Map(roomWorlds.value.map((world, index) => [world.id, index]))
  return performanceWorldSummaries(report.value || {}).sort((a, b) => (order.get(a.worldId) ?? Infinity) - (order.get(b.worldId) ?? Infinity) || a.worldName.localeCompare(b.worldName, locale.value))
})
const retentionClipped = computed(() => report.value && Date.parse(report.value.from) > Date.parse(requestedFrom.value) + 1000)
const customRangeValid = computed(() => {
  const from = new Date(customFrom.value), to = new Date(customTo.value)
  return Number.isFinite(from.getTime()) && Number.isFinite(to.getTime()) && from < to
})
const display = value => Number.isFinite(value) ? new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }).format(value) : t('performance.noRecords')
function duration(value) {
  const seconds = Math.max(0, Number(value) || 0)
  const [unit, amount] = seconds >= 3600 ? ['durationHours', seconds / 3600] : seconds >= 60 ? ['durationMinutes', seconds / 60] : ['seconds', seconds]
  return t(`performance.${unit}`, { value: display(amount) })
}
function missingScore(world) {
  const reason = ['PAUSED', 'SIMULATION_NOT_ADVANCING', 'NOT_RUNNING', 'CLOCK_DISCONTINUITY', 'SIMULATION_CLOCK_UNAVAILABLE', 'WARMING_UP', 'TIME_SCALE_CHANGED', 'HISTORICAL_ONLY'].includes(world.missingReason) ? world.missingReason : 'NO_VALID_SIMULATION_WINDOW'
  return t(`performance.missingScore.${reason}`)
}
function localDateInput(value) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function selectRoom(value) {
  worldId.value = 'all'
  roomId.value = value
}
function applyRouteScope() {
  const selected = preferredRoomId(rooms.value, route.query.roomId)
  roomId.value = selected
  worldId.value = typeof route.query.worldId === 'string' ? route.query.worldId : 'all'
}
async function loadRooms() {
  const current = ++catalogSequence
  sequence++; report.value = null; settings.value = null
  loading.value = true; catalogLoading.value = true; error.value = ''
  try {
    const result = await roomsV2API.list()
    if (!alive || current !== catalogSequence) return
    rooms.value = (result.items || []).filter(room => room.managed)
    catalogLoading.value = false
    const previous = [roomId.value, worldId.value]
    applyRouteScope()
    if (previous[0] === roomId.value && previous[1] === worldId.value && roomId.value) await load()
    if (!roomId.value) {
      loading.value = false
      if (rooms.value.length && route.query.roomId) error.value = t('performance.roomUnavailable')
    }
  } catch (e) {
    if (alive && current === catalogSequence) { error.value = e.message || t('performance.failure'); loading.value = false }
  } finally { if (alive && current === catalogSequence) catalogLoading.value = false }
}
async function load() {
  if (catalogLoading.value) return
  if (!roomId.value) {
    loading.value = false
    if (rooms.value.length && route.query.roomId) error.value = t('performance.roomUnavailable')
    return
  }
  const current = ++sequence, room = roomId.value
  loading.value = true; error.value = ''
  if (worldId.value !== 'all' && !roomWorlds.value.some(world => world.id === worldId.value)) {
    error.value = t('performance.worldUnavailable'); report.value = null; loading.value = false; return
  }
  const to = range.value === 'custom' ? new Date(customTo.value) : new Date()
  const from = range.value === 'custom' ? new Date(customFrom.value) : new Date(to - Number(range.value) * 3600000)
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to) {
    error.value = t('performance.invalidRange'); report.value = null; loading.value = false; return
  }
  try {
    const [data, config] = await Promise.all([
      performanceV2API.report(room, { from: from.toISOString(), to: to.toISOString(), ...(worldId.value !== 'all' ? { worldId: worldId.value } : {}), maxPoints: 600 }),
      performanceV2API.settings(room)
    ])
    if (!alive || current !== sequence || room !== roomId.value) return
    report.value = data; settings.value = config; requestedFrom.value = from.toISOString()
  } catch (e) { if (alive && current === sequence) { report.value = null; error.value = e.message || t('performance.failure') } }
  finally { if (alive && current === sequence) loading.value = false }
}
async function save() {
  if (!settings.value || saving.value) return
  const room = roomId.value, config = { ...settings.value, intervalSeconds: Number(settings.value.intervalSeconds), retentionDays: Number(settings.value.retentionDays), aggregateDays: Number(settings.value.aggregateDays) }, current = sequence
  saving.value = true
  try {
    const result = await performanceV2API.save(room, config)
    if (alive && room === roomId.value && current === sequence) { settings.value = result; toast.success(t('performance.saved')) }
  } catch (e) { if (alive && room === roomId.value) error.value = e.message || t('performance.failure') }
  finally { saving.value = false }
}
function download() {
  const url = URL.createObjectURL(new Blob([performanceCSV(report.value)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url; link.download = `dst-performance-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url)
}
watch([roomId, worldId, range], ([room, world, period], [previousRoom]) => {
  if (period === 'custom' && (!customFrom.value || !customTo.value)) {
    const to = report.value?.to || new Date().toISOString()
    customTo.value = localDateInput(to)
    customFrom.value = localDateInput(report.value?.from || new Date(Date.parse(to) - 86400000).toISOString())
  }
  sequence++; report.value = null; error.value = ''
  if (room !== previousRoom) { settings.value = null; showSettings.value = false }
  if (!room) {
    loading.value = false
    if (rooms.value.length && route.query.roomId) error.value = t('performance.roomUnavailable')
    return
  }
  rememberRoomSelection(managementScopeTargetId(), room)
  const queryWorld = typeof route.query.worldId === 'string' ? route.query.worldId : 'all'
  if (route.query.roomId !== room || queryWorld !== world) {
    void router.replace({ query: { ...route.query, roomId: room, worldId: world !== 'all' ? world : undefined } })
  }
  void load()
})
watch(() => [route.query.roomId, route.query.worldId], () => { if (rooms.value.length && !catalogLoading.value) applyRouteScope() })
onMounted(() => { void loadRooms(); window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, loadRooms) })
onBeforeUnmount(() => { alive = false; sequence++; catalogSequence++; window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, loadRooms) })
</script>

<template>
  <div class="flex min-w-0 flex-col gap-5">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">{{ t('performance.title') }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('performance.description') }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" :disabled="loading || !roomId" @click="load">
          <Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ t('performance.refresh') }}
        </Button>
        <Button variant="outline" size="sm" :disabled="loading || !report?.items?.length" @click="download">
          <Download data-icon="inline-start" />{{ t('performance.export') }}
        </Button>
      </div>
    </header>
    <Alert v-if="error" variant="destructive">
      <CircleAlert /><AlertTitle>{{ t('performance.failure') }}</AlertTitle><AlertDescription>{{ error }}</AlertDescription>
    </Alert>
    <Card>
      <CardHeader><CardTitle>{{ t('performance.filters') }}</CardTitle><CardDescription>{{ t('performance.scopeHelp') }}</CardDescription></CardHeader>
      <CardContent>
        <FieldGroup class="grid gap-4 md:grid-cols-3">
          <Field>
            <FieldLabel for="performance-room">{{ t('performance.room') }}</FieldLabel>
            <Select :model-value="roomId || undefined" :disabled="catalogLoading || !rooms.length" @update:model-value="selectRoom">
              <SelectTrigger id="performance-room" class="w-full min-w-0"><SelectValue :placeholder="t('roomScope.choose')" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</SelectItem></SelectGroup></SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel for="performance-world">{{ t('performance.world') }}</FieldLabel>
            <Select v-model="worldId" :disabled="!roomId || catalogLoading">
              <SelectTrigger id="performance-world" class="w-full min-w-0"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="all">{{ t('performance.all') }}</SelectItem><SelectItem v-for="world in roomWorlds" :key="world.id" :value="world.id">{{ world.name }}</SelectItem></SelectGroup></SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel for="performance-range">{{ t('performance.range') }}</FieldLabel>
            <Select v-model="range">
              <SelectTrigger id="performance-range" class="w-full min-w-0"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="(label, value) in { '1': 'hours1', '24': 'hours24', '168': 'days7', '2160': 'days90', custom: 'custom' }" :key="value" :value="value">{{ t(`performance.${label}`) }}</SelectItem></SelectGroup></SelectContent>
            </Select>
          </Field>
          <template v-if="range === 'custom'">
            <Field><FieldLabel for="performance-from">{{ t('performance.from') }}</FieldLabel><Input id="performance-from" v-model="customFrom" type="datetime-local" /></Field>
            <Field><FieldLabel for="performance-to">{{ t('performance.to') }}</FieldLabel><Input id="performance-to" v-model="customTo" type="datetime-local" /></Field>
            <Field class="justify-end"><Button :disabled="loading || !roomId || !customRangeValid" @click="load">{{ t('performance.applyRange') }}</Button></Field>
          </template>
        </FieldGroup>
      </CardContent>
    </Card>
    <p v-if="report" class="text-xs text-muted-foreground">
      {{ new Date(report.from).toLocaleString(locale) }} – {{ new Date(report.to).toLocaleString(locale) }} · {{ t('performance.resolution', { value: report.resolutionSeconds }) }}
      <span v-if="retentionClipped"> · {{ t('performance.retentionClipped') }}</span>
    </p>
    <div v-if="loading" class="flex flex-col gap-4"><Skeleton class="h-32 w-full" /><Skeleton class="h-72 w-full" /></div>
    <template v-else-if="report?.items?.length">
      <Alert v-if="report.truncated"><CircleAlert /><AlertDescription>{{ t('performance.truncated') }}</AlertDescription></Alert>
      <div class="grid min-w-0 gap-4 xl:grid-cols-2">
        <Card v-for="world in summaries" :key="world.worldId" class="min-w-0" data-performance-world>
          <CardHeader>
            <CardTitle class="flex flex-wrap items-center gap-2"><span class="min-w-0 wrap-anywhere">{{ world.worldName }}</span><Badge v-if="!world.hasScore" variant="outline">{{ t('performance.unavailable') }}</Badge></CardTitle>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            <div v-if="world.hasScore" class="grid grid-cols-3 gap-3">
              <div v-for="(value, key) in { average: display(world.averageScore), minimum: display(world.minimumScore), low: duration(world.lowSeconds) }" :key="key" class="min-w-0 wrap-anywhere">
                <p class="text-xs text-muted-foreground">{{ t(`performance.${key}`) }}</p><p class="mt-1 text-xl font-semibold tabular-nums">{{ value }}</p>
              </div>
            </div>
            <p v-else class="text-sm text-muted-foreground">{{ missingScore(world) }}</p>
            <div class="grid grid-cols-3 gap-3">
              <div v-for="(value, key) in { cpuPeak: world.peakCPUPercent == null ? t('performance.noRecords') : `${display(world.peakCPUPercent)}%`, memoryPeak: world.peakRSSBytes > 0 ? `${display(world.peakRSSBytes / 1048576)} MiB` : t('performance.noRecords'), recorded: duration(world.observedSeconds) }" :key="key" class="min-w-0 wrap-anywhere">
                <p class="text-xs text-muted-foreground">{{ t(`performance.${key}`) }}</p><p class="mt-1 text-lg font-semibold tabular-nums">{{ value }}</p>
              </div>
            </div>
            <p v-for="finding in world.findings" :key="finding.code" class="flex items-start gap-2 text-sm">
              <Badge :variant="finding.severity === 'warning' ? 'warning' : 'outline'" class="shrink-0"><Activity /></Badge><span>{{ t(`performance.findings.${finding.code}`) }}</span>
            </p>
          </CardContent>
          <CardFooter class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{{ t('performance.valid') }} {{ duration(world.validSeconds) }}</span><span>{{ t('performance.coverage') }} {{ display(world.coverage * 100) }}%</span>
          </CardFooter>
        </Card>
      </div>
      <p class="text-xs text-muted-foreground">{{ t('performance.coverageHelp') }}</p>
      <Card v-for="metric in ['score', 'cpuPercent', 'rssBytes']" :key="metric">
        <CardHeader><CardTitle>{{ t(`performance.metrics.${metric}`) }}</CardTitle></CardHeader>
        <CardContent><PerformanceChart :points="metric === 'score' ? scorePoints : report.items" :metric="metric" :resolution="report.resolutionSeconds" :events="report.events || []" /></CardContent>
      </Card>
      <Card v-if="report.events?.length || report.eventsWarning">
        <CardHeader><CardTitle>{{ t('performance.eventTitle') }}</CardTitle><CardDescription>{{ t('performance.eventHelp') }}</CardDescription></CardHeader>
        <CardContent>
          <p v-if="report.eventsTruncated || report.eventsWarning" class="mb-3 text-sm text-muted-foreground">{{ t(report.eventsWarning ? 'performance.eventsUnavailable' : 'performance.eventsLimited') }}</p>
          <ul class="m-0 flex list-none flex-col divide-y p-0">
            <li v-for="event in [...(report.events || [])].reverse()" :key="event.id" class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <time class="text-xs text-muted-foreground" :datetime="event.at">{{ new Date(event.at).toLocaleString(locale) }}</time><span>{{ event.worldName || event.worldId }}</span>
              <Badge variant="outline">{{ t(`performance.events.${event.type}`) }}</Badge><span v-if="event.source" class="text-xs text-muted-foreground">{{ t(`performance.sources.${event.source}`) }}</span>
              <span v-if="event.reasonCode" class="text-xs text-muted-foreground">{{ event.reasonCode }}</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </template>
    <Empty v-else-if="!error"><EmptyHeader><EmptyTitle>{{ t(rooms.length ? 'performance.empty' : 'performance.noRooms') }}</EmptyTitle><EmptyDescription>{{ t('performance.emptyHint') }}</EmptyDescription></EmptyHeader></Empty>
    <Card v-if="settings">
      <CardHeader><CardTitle><Button variant="ghost" @click="showSettings = !showSettings">{{ t('performance.settings') }}</Button></CardTitle></CardHeader>
      <template v-if="showSettings">
        <CardContent>
          <FieldGroup>
            <Field orientation="horizontal"><Switch id="performance-enabled" v-model="settings.enabled" :disabled="saving || loading" /><FieldLabel for="performance-enabled">{{ t('performance.enabled') }}</FieldLabel></Field>
            <FieldGroup class="grid gap-4 sm:grid-cols-3">
              <Field v-for="field in [{ key: 'intervalSeconds', label: 'interval', min: 15, max: 300 }, { key: 'retentionDays', label: 'retention', min: 1, max: 30 }, { key: 'aggregateDays', label: 'aggregate', min: settings.retentionDays, max: 180 }]" :key="field.key">
                <FieldLabel :for="`performance-${field.key}`">{{ t(`performance.${field.label}`) }}</FieldLabel><Input :id="`performance-${field.key}`" v-model.number="settings[field.key]" type="number" :min="field.min" :max="field.max" :disabled="saving || loading" />
              </Field>
            </FieldGroup>
            <FieldDescription>{{ t('performance.settingsHint') }}</FieldDescription>
          </FieldGroup>
        </CardContent>
        <CardFooter><Button :disabled="saving || loading" @click="save"><Spinner v-if="saving" data-icon="inline-start" />{{ t('performance.save') }}</Button></CardFooter>
      </template>
    </Card>
  </div>
</template>

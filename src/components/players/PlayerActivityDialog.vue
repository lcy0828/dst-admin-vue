<script setup>
import { computed, onBeforeUnmount, reactive, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download, RefreshCw, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { playerActivityV2API as api } from '@/api/v2'
import { activityQuery } from '@/lib/playerActivity.mjs'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import PlayerActivityRecords from './PlayerActivityRecords.vue'

const props = defineProps({ open: Boolean, player: { type: Object, default: null }, rooms: { type: Array, default: () => [] }, initialRoomId: { type: String, default: '' } })
const emit = defineEmits(['update:open'])
const { t } = useI18n()
const id = useId()
const room = ref(''), user = ref(''), world = ref(''), kind = ref(''), hours = ref('24'), tab = ref('timeline')
const resyncing = ref(false)
const status = ref(null), data = ref(null), loading = ref(false), saving = ref(false), error = ref('')
const form = reactive({})
const roomId = computed(() => props.player?.room_id || props.player?.roomId || room.value)
const playerId = computed(() => props.player?.user_id || props.player?.userId || user.value.trim())
const worlds = computed(() => status.value?.worlds || [])
const items = computed(() => data.value?.items || [])
const time = value => value ? formatSystemDateTime(value) : '—'
const limits = { positionIntervalSeconds: [5, 300], minimumDistance: [0, 100], combatIntervalSeconds: [5, 120], flushIntervalSeconds: [2, 30], syncIntervalSeconds: [5, 60], retentionDays: [1, 90], maximumMiB: [16, 2048] }
const validSettings = computed(() => Boolean(form.revision) && Object.entries(limits).every(([key, [min, max]]) => Number.isInteger(Number(form[key])) && Number(form[key]) >= min && Number(form[key]) <= max))
let sequence = 0, controller, queryNow = Date.now(), syncTimer, syncEpoch = 0
function stopSyncWatch() { ++syncEpoch; clearTimeout(syncTimer); resyncing.value = false }
function reset() { stopSyncWatch(); ++sequence; controller?.abort(); loading.value = false; status.value = null; data.value = null; error.value = ''; world.value = ''; kind.value = ''; queryNow = Date.now() }
async function load(before = '', refresh = true) {
  if (!props.open || !roomId.value) return
  const request = ++sequence
  controller?.abort(); controller = new AbortController()
  const selectedRoom = roomId.value
  loading.value = true; error.value = ''
  if (!before) queryNow = Date.now()
  data.value = null
  try {
    if (refresh || !status.value) {
      const value = await api.status(selectedRoom, { signal: controller.signal })
      if (request !== sequence) return
      status.value = value
      if (!form.revision || refresh) Object.assign(form, value.settings)
    }
    if (tab.value === 'settings' || tab.value === 'trajectory' && !playerId.value) return
    const query = activityQuery({ userId: playerId.value, worldId: world.value, kind: tab.value === 'timeline' ? kind.value : '', hours: hours.value, before, now: queryNow })
    if (tab.value === 'combat') { delete query.limit; delete query.before }
    if (tab.value === 'trajectory') query.projection = 'compact'
    const value = await api[tab.value === 'timeline' ? 'events' : tab.value](selectedRoom, query, { signal: controller.signal })
    if (request === sequence) data.value = value
  } catch (e) {
    if (request === sequence && e.code !== 'ERR_CANCELED' && e.name !== 'CanceledError') error.value = t('activity.error')
  } finally { if (request === sequence) loading.value = false }
}
async function save() {
  if (!validSettings.value || saving.value) return
  const selectedRoom = roomId.value
  saving.value = true; error.value = ''
  try {
    const input = { ...form }
    for (const key of Object.keys(limits)) input[key] = Number(input[key])
    const value = await api.save(selectedRoom, input)
    if (props.open && roomId.value === selectedRoom) { Object.assign(form, value); if (status.value) { status.value.settings = value; for (const w of status.value.worlds) w.pending = w.appliedRevision !== value.revision; } toast.success(t('activity.saved')) }
  } catch { if (props.open && roomId.value === selectedRoom) error.value = t('activity.saveError') }
  finally { saving.value = false }
}
async function resync() {
  if (resyncing.value || !roomId.value) return
  stopSyncWatch()
  const epoch = syncEpoch, selectedRoom = roomId.value
  const previous = new Map(worlds.value.map(w => [w.worldId, w.lastAttemptAt]))
  resyncing.value = true
  try {
    await api.resync(selectedRoom)
    if (epoch !== syncEpoch || !props.open) return
    toast.success(t('activity.resyncAccepted'))
    let remaining = 8
    const poll = async () => {
      if (epoch !== syncEpoch || !props.open || roomId.value !== selectedRoom) return
      try {
        const value = await api.status(selectedRoom)
        if (epoch !== syncEpoch || !props.open || roomId.value !== selectedRoom) return
        status.value = value
        const observed = value.worlds?.length && value.worlds.every(w => w.lastAttemptAt && w.lastAttemptAt !== previous.get(w.worldId))
        if (observed || --remaining <= 0) { resyncing.value = false; return }
      } catch { if (--remaining <= 0) { resyncing.value = false; return } }
      if (epoch === syncEpoch) syncTimer = setTimeout(poll, 3000)
    }
    syncTimer = setTimeout(poll, 1000)
  } catch {
    if (epoch === syncEpoch) { resyncing.value = false; error.value = t('activity.resyncError') }
  }
}
function exportPage() {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ roomId: roomId.value, exportedAt: new Date().toISOString(), scope: 'current-page', view: tab.value, ...data.value }, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = `player-activity-${tab.value}.json`; link.click(); URL.revokeObjectURL(url)
}
watch(() => props.open, open => { if (open && !props.player) room.value = props.initialRoomId || props.rooms[0]?.id || '' }, { flush: 'sync' })
watch([() => props.open, roomId, () => props.player?.user_id || props.player?.userId || ''], () => { reset(); delete form.revision; if (props.open) { if (!roomId.value) room.value = props.initialRoomId || props.rooms[0]?.id || ''; else load() } }, { immediate: true })
watch(tab, () => load('', false))
// Finish invalidating filters synchronously, before a room reset starts its
// replacement request. A queued filter watcher could otherwise abort that read.
watch([user, world, kind, hours], () => { ++sequence; controller?.abort(); loading.value = false; data.value = null }, { flush: 'sync' })
onBeforeUnmount(() => { stopSyncWatch(); ++sequence; controller?.abort() })
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="flex max-h-[92dvh] w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-5xl">
      <DialogHeader class="shrink-0 pr-5"><DialogTitle>{{ t('activity.title') }}<template v-if="player"> · {{ player.player_name || playerId }}</template></DialogTitle><DialogDescription>{{ t('activity.coverage') }}</DialogDescription></DialogHeader>
      <div class="flex min-h-0 flex-col gap-4 overflow-y-auto">
        <form class="flex flex-col gap-3" @submit.prevent="load()">
          <FieldGroup class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field v-if="!player"><FieldLabel :for="`${id}-room`">{{ t('activity.room') }}</FieldLabel><NativeSelect :id="`${id}-room`" v-model="room"><NativeSelectOption v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }}</NativeSelectOption></NativeSelect></Field>
            <Field v-if="!player && tab !== 'settings'"><FieldLabel :for="`${id}-user`">{{ t('activity.player') }}</FieldLabel><Input :id="`${id}-user`" v-model="user" placeholder="KU_…" maxlength="128" /></Field>
            <Field v-if="tab !== 'settings'"><FieldLabel :for="`${id}-world`">{{ t('activity.world') }}</FieldLabel><NativeSelect :id="`${id}-world`" v-model="world"><NativeSelectOption value="">{{ t('activity.all') }}</NativeSelectOption><NativeSelectOption v-for="w in worlds" :key="w.worldId" :value="w.worldId">{{ w.worldName }}</NativeSelectOption></NativeSelect></Field>
            <Field v-if="tab !== 'settings'"><FieldLabel :for="`${id}-time`">{{ t('activity.period') }}</FieldLabel><NativeSelect :id="`${id}-time`" v-model="hours"><NativeSelectOption v-for="h in ['1', '24', '168']" :key="h" :value="h">{{ t(`activity.h${h}`) }}</NativeSelectOption></NativeSelect></Field>
            <Field v-if="tab === 'timeline'"><FieldLabel :for="`${id}-kind`">{{ t('activity.category') }}</FieldLabel><NativeSelect :id="`${id}-kind`" v-model="kind"><NativeSelectOption value="">{{ t('activity.all') }}</NativeSelectOption><NativeSelectOption v-for="[key, label] in [['position', 'position'], ['action.', 'action'], ['combat.', 'combatKind'], ['player.', 'lifecycle'], ['collection.', 'collection']]" :key="key" :value="key">{{ t(`activity.${label}`) }}</NativeSelectOption></NativeSelect></Field>
          </FieldGroup>
          <div class="flex flex-wrap items-center gap-2"><Button type="submit" size="sm" variant="outline" :disabled="loading || !roomId || saving"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ t('activity.refresh') }}</Button><Button size="sm" variant="outline" type="button" :disabled="resyncing || !roomId || saving" @click="resync"><Spinner v-if="resyncing" data-icon="inline-start" />{{ t('activity.resync') }}</Button><Button v-if="data" size="sm" variant="ghost" type="button" @click="exportPage"><Download data-icon="inline-start" />{{ t('activity.export') }}</Button><span v-if="status" class="text-xs text-muted-foreground">{{ t('activity.stored', { count: status.storedEvents, mib: (status.storedBytes / 1048576).toFixed(1) }) }}</span></div>
        </form>
        <Tabs v-model="tab"><TabsList class="flex h-auto flex-wrap justify-start"><TabsTrigger v-for="key in ['timeline', 'trajectory', 'combat', 'settings']" :key="key" :value="key">{{ t(`activity.${key}`) }}</TabsTrigger></TabsList></Tabs>
        <Alert v-if="error" variant="destructive"><TriangleAlert /><AlertTitle>{{ error }}</AlertTitle></Alert>
        <div v-if="status" class="grid gap-2 sm:grid-cols-2">
          <div v-for="w in worlds" :key="w.worldId" class="flex flex-col gap-1 rounded-md border p-3 text-xs">
            <div class="flex flex-wrap items-center gap-2"><span class="font-medium">{{ w.worldName }}</span><Badge :variant="['unavailable', 'degraded'].includes(w.state) ? 'destructive' : 'secondary'">{{ t(`activity.status.${w.state}`) }}</Badge><Badge variant="outline">{{ t(w.pending ? 'activity.pending' : 'activity.applied') }}</Badge><Badge v-if="w.syncState" variant="secondary">{{ t(`activity.sync.${w.syncState}`) }}</Badge></div>
            <span>{{ t('activity.sourceTime') }}: {{ time(w.sourceUpdatedAt) }} · {{ t('activity.collected') }}: {{ time(w.lastCollectedAt) }}</span>
            <span>{{ t('activity.lastEvent') }}: {{ time(w.lastEventAt) }} · {{ t('activity.gaps', { count: w.gapCount }) }} · {{ t('activity.dropped', { count: w.dropped }) }}</span>
            <span v-if="w.backlog">{{ t('activity.backlog', { count: w.backlog }) }}</span>
            <span v-if="w.coverage && !w.coverage.complete">{{ t('activity.coverageSummary', { pending: w.coverage.pendingSegments + w.coverage.isolatedSegments, unavailable: w.coverage.unavailableRanges, recovered: w.coverage.recoveredSegments }) }}</span>
            <span v-if="w.coverage?.legacyUnknown">{{ t('activity.legacyUnknown') }}</span>
            <span v-if="w.nextRetryAt">{{ t('activity.retryAt') }}: {{ time(w.nextRetryAt) }}</span>
            <p v-if="w.state === 'unavailable'" class="text-muted-foreground">{{ t('activity.nodeHint') }}</p>
            <p v-if="w.configError" class="break-words text-muted-foreground">{{ t('activity.configRetry') }} · {{ w.configError }}</p>
            <p v-if="w.writeUnconfirmed" class="text-muted-foreground">{{ t('activity.writeUnconfirmed') }}</p>
            <details v-if="w.error || w.diagnostics?.length" class="text-muted-foreground"><summary class="cursor-pointer">{{ t('activity.diagnostics') }}</summary><p v-if="w.error" class="break-words font-mono">{{ w.error }}</p><p v-for="d in w.diagnostics" :key="`${d.generation}-${d.code}`" class="break-words font-mono">{{ d.generation }} · {{ d.code }} {{ d.field }}</p></details>
          </div>
        </div>
        <div v-if="loading" class="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Spinner />{{ t('activity.loading') }}</div>
        <form v-else-if="tab === 'settings' && status" class="flex flex-col gap-4" @submit.prevent="save">
          <p class="text-sm text-muted-foreground">{{ t('activity.dynamic') }}</p>
          <FieldGroup class="grid gap-4 sm:grid-cols-2">
            <Field v-for="[key, label] in [['enabled', 'enabled'], ['positions', 'positions'], ['actions', 'actions'], ['combat', 'combatToggle']]" :key="key" orientation="horizontal"><Switch :id="`${id}-${key}`" v-model="form[key]" :disabled="saving" /><FieldLabel :for="`${id}-${key}`">{{ t(`activity.${label}`) }}</FieldLabel></Field>
            <Field v-for="[key, [min, max]] in Object.entries(limits)" :key="key"><FieldLabel :for="`${id}-${key}`">{{ t(`activity.${key}`) }}</FieldLabel><Input :id="`${id}-${key}`" v-model.number="form[key]" type="number" :min="min" :max="max" step="1" required :disabled="saving" /><FieldDescription>{{ min }}–{{ max }}</FieldDescription></Field>
          </FieldGroup>
          <p class="text-xs text-muted-foreground">{{ t('activity.budget') }}</p>
          <Button class="self-start" type="submit" :disabled="saving || !validSettings"><Spinner v-if="saving" data-icon="inline-start" />{{ t('activity.save') }}</Button>
        </form>
        <Alert v-else-if="tab === 'trajectory' && !playerId"><AlertDescription>{{ t('activity.requirePlayer') }}</AlertDescription></Alert>
        <template v-else-if="data && !error">
          <PlayerActivityRecords :data="data" :tab="tab" :worlds="worlds" />
          <div v-if="tab !== 'combat'" class="flex flex-wrap items-center gap-2"><span class="text-xs text-muted-foreground">{{ t('activity.page', { count: items.length }) }}</span><Button v-if="data.hasMore" size="sm" variant="outline" @click="load(data.nextCursor, false)">{{ t('activity.next') }}</Button><Button size="sm" variant="ghost" @click="load()">{{ t('activity.first') }}</Button></div>
        </template>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Backpack, RefreshCw, TriangleAlert } from '@lucide/vue'
import { playersV2API } from '@/api/v2'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import InventoryItem from './InventoryItem.vue'
import { filterInventoryTree } from '@/lib/playerInventory.mjs'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'

const props = defineProps({ open: Boolean, player: { type: Object, default: null }, rooms: { type: Array, default: () => [] }, initialRoomId: { type: String, default: '' } })
const emit = defineEmits(['update:open'])
const { t, te } = useI18n()
const id = useId()
const selectedRoom = ref('')
const enteredId = ref('')
const source = ref('auto')
const selection = ref(null)
const query = ref('')
const data = ref(null)
const error = ref(null)
const loading = ref(false)
let sequence = 0
let controller
const roomId = computed(() => props.player?.room_id || props.player?.roomId || selectedRoom.value)
const playerId = computed(() => props.player?.user_id || props.player?.id || enteredId.value.trim())
const playerName = computed(() => props.player?.player_name || props.player?.name || playerId.value)
const candidates = computed(() => error.value?.details?.candidates || [])
const errorCode = computed(() => error.value?.code || 'unknown')
const errorText = computed(() => t(te(`inventory.errors.${errorCode.value}`) ? `inventory.errors.${errorCode.value}` : 'inventory.errors.unknown'))
const sections = computed(() => [
  { id: 'equipment', items: filterInventoryTree(data.value?.equipment, query.value) },
  { id: 'active', items: filterInventoryTree(data.value?.activeItem ? [data.value.activeItem] : [], query.value) },
  { id: 'items', items: filterInventoryTree(data.value?.inventory, query.value) }
])
const hasMatches = computed(() => sections.value.some(section => section.items.length))
const timeText = value => value ? formatSystemDateTime(value) : t('inventory.unknownTime')

async function load(refresh = false, reset = false) {
  if (!props.open || !roomId.value || !playerId.value) return
  const request = ++sequence
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  error.value = null
  if (reset) data.value = null
  try {
    const value = await playersV2API.inventory(roomId.value, playerId.value, {
      source: source.value, refresh, ...(selection.value ? { worldId: selection.value.worldId, sourceId: selection.value.sourceId } : {})
    }, { signal: controller.signal })
    if (request === sequence) data.value = value
  } catch (failure) {
    if (request === sequence && failure.code !== 'ERR_CANCELED' && failure.name !== 'CanceledError') error.value = failure
  } finally { if (request === sequence) loading.value = false }
}
function selectSource(value) { source.value = value; selection.value = null; load(false, true) }
function selectCandidate(index) { selection.value = candidates.value[Number(index)]; source.value = 'save'; load(false, true) }
function reset() { ++sequence; controller?.abort(); data.value = null; error.value = null; loading.value = false; selection.value = null }
watch([() => props.open, () => props.player?.room_id, () => props.player?.roomId, () => props.player?.user_id, () => props.player?.id], () => {
  reset(); query.value = ''; source.value = 'auto'
  if (props.open) {
    selectedRoom.value = props.initialRoomId || props.rooms[0]?.id || ''
    enteredId.value = ''
    if (props.player) load()
  }
}, { immediate: true })
watch([selectedRoom, enteredId], () => { if (!props.player) reset() })
onBeforeUnmount(() => { ++sequence; controller?.abort() })
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="flex w-[calc(100%-2rem)] max-h-[90dvh] flex-col overflow-hidden sm:max-w-4xl">
      <DialogHeader class="shrink-0 pr-6"><DialogTitle>{{ t('inventory.title') }}<template v-if="playerName"> · {{ playerName }}</template></DialogTitle><DialogDescription>{{ t('inventory.coverage') }}</DialogDescription></DialogHeader>
      <form v-if="!player" class="shrink-0" @submit.prevent="load(false, true)">
        <FieldGroup class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field class="min-w-0 flex-1"><FieldLabel :for="`${id}-room`">{{ t('inventory.room') }}</FieldLabel><Select v-model="selectedRoom"><SelectTrigger :id="`${id}-room`"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</SelectItem></SelectGroup></SelectContent></Select></Field>
          <Field class="min-w-0 flex-1"><FieldLabel :for="`${id}-player`">{{ t('inventory.playerId') }}</FieldLabel><Input :id="`${id}-player`" v-model="enteredId" placeholder="KU_…" maxlength="128" autocomplete="off" /></Field>
          <Button type="submit" :disabled="loading || !roomId || !playerId">{{ t('inventory.read') }}</Button>
        </FieldGroup>
      </form>
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <Select :model-value="source" @update:model-value="selectSource"><SelectTrigger class="w-40" :aria-label="t('inventory.source')"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="value in ['auto', 'live', 'save']" :key="value" :value="value">{{ t(`inventory.${value}`) }}</SelectItem></SelectGroup></SelectContent></Select>
        <Input v-model="query" class="min-w-40 flex-1" :placeholder="t('inventory.search')" :aria-label="t('inventory.search')" />
        <Button variant="outline" :disabled="loading || !roomId || !playerId" @click="load(true)"><Spinner v-if="loading" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" />{{ t('inventory.refresh') }}</Button>
      </div>
      <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 [scrollbar-gutter:stable]" :aria-busy="loading">
        <Alert v-if="error" variant="destructive"><TriangleAlert /><AlertTitle>{{ errorText }}</AlertTitle><AlertDescription class="flex flex-col gap-2">
          <Select v-if="candidates.length" @update:model-value="selectCandidate"><SelectTrigger :aria-label="t('inventory.choose')"><SelectValue :placeholder="t('inventory.choose')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="(candidate, index) in candidates" :key="`${candidate.worldId}:${candidate.sourceId}`" :value="String(index)">{{ t('inventory.candidate', { world: candidate.worldName || candidate.worldId || t('inventory.unknownWorld'), time: timeText(candidate.fileModifiedAt), index: index + 1 }) }}</SelectItem></SelectGroup></SelectContent></Select>
          <details><summary class="cursor-pointer">{{ t('inventory.details') }}</summary><p class="break-all">{{ errorCode }}<template v-if="error.requestId"> · {{ error.requestId }}</template></p></details>
        </AlertDescription></Alert>
        <p v-if="loading" role="status" class="text-sm text-muted-foreground">{{ t(data ? 'inventory.refreshing' : 'inventory.loading') }}</p>
        <div v-if="loading && !data" class="grid grid-cols-1 gap-3 sm:grid-cols-2"><Skeleton v-for="index in 6" :key="index" class="h-20" /></div>
        <template v-if="data">
          <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Badge variant="secondary">{{ t(`inventory.${data.source}`) }}</Badge><span>{{ data.worldName || data.worldId }}</span><span>{{ t('inventory.captured', { time: timeText(data.capturedAt) }) }}</span><span v-if="data.fileModifiedAt">{{ t('inventory.modified', { time: timeText(data.fileModifiedAt) }) }}</span></div>
          <p v-if="data.source === 'save'" class="text-xs text-muted-foreground">{{ t('inventory.snapshotHint') }}</p>
          <Alert v-if="data.status === 'partial'"><TriangleAlert /><AlertTitle>{{ t('inventory.partial') }}</AlertTitle><AlertDescription>{{ t('inventory.partialHint') }}<details class="mt-2"><summary class="cursor-pointer">{{ t('inventory.details') }}</summary>{{ data.limitsReached?.join(' · ') }}</details></AlertDescription></Alert>
          <Empty v-if="data.empty"><EmptyHeader><EmptyMedia variant="icon"><Backpack /></EmptyMedia><EmptyTitle>{{ t('inventory.empty') }}</EmptyTitle><EmptyDescription>{{ t('inventory.emptyDescription') }}</EmptyDescription></EmptyHeader></Empty>
          <p v-else-if="!hasMatches && query" class="py-4 text-center text-sm text-muted-foreground">{{ t('inventory.noMatch') }}</p>
          <div v-else class="flex min-w-0 flex-col gap-4">
            <section v-for="section in sections" :key="section.id" class="flex min-w-0 flex-col gap-2" :aria-label="t(`inventory.${section.id}`)"><h3 class="flex items-center gap-2 text-sm font-medium">{{ t(`inventory.${section.id}`) }}<span v-if="section.id === 'items' && data.slotCount != null" class="text-xs text-muted-foreground">{{ t('inventory.slotCount', { count: data.slotCount }) }}</span></h3><ul v-if="section.items.length" class="grid min-w-0 grid-cols-1 items-start gap-2 sm:grid-cols-2"><InventoryItem v-for="item in section.items" :key="item.nodeId" :item="item" :room-id="data.roomId" :world-id="data.worldId" :query="query" /></ul><p v-else class="text-xs text-muted-foreground">{{ data.status === 'partial' ? t('inventory.unreadContents') : t('inventory.noItems') }}</p></section>
          </div>
        </template>
      </div>
    </DialogContent>
  </Dialog>
</template>

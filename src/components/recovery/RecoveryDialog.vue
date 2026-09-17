<template>
  <UiDialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogScrollContent class="max-w-5xl">
      <DialogHeader>
        <DialogTitle>{{ $t(scope === 'room' ? 'recovery.rooms.title' : 'recovery.worlds.title') }}</DialogTitle>
        <DialogDescription>{{ $t(scope === 'room' ? 'recovery.rooms.description' : 'recovery.worlds.description') }}</DialogDescription>
      </DialogHeader>

      <Field v-if="scope === 'world'">
        <FieldLabel for="recovery-room">{{ $t('recovery.selectRoom') }}</FieldLabel>
        <UiSelect id="recovery-room" v-model="selectedRoomId">
          <SelectTrigger><SelectValue :placeholder="$t('recovery.selectRoomPlaceholder')" /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</SelectItem></SelectGroup></SelectContent>
        </UiSelect>
      </Field>

      <Alert v-if="error" variant="destructive">
        <TriangleAlert />
        <AlertTitle>{{ $t('recovery.open') }}</AlertTitle>
        <AlertDescription>{{ $t('recovery.loadFailed', { error: error.message }) }}</AlertDescription>
      </Alert>
      <div v-if="loading" class="recovery-skeleton" :aria-label="$t('recovery.loading')" aria-busy="true">
        <Skeleton v-for="index in 4" :key="index" class="h-12 w-full" />
      </div>
      <Empty v-else-if="!error && items.length === 0">
        <EmptyHeader><EmptyMedia variant="icon"><ArchiveRestore /></EmptyMedia><EmptyTitle>{{ $t('recovery.empty') }}</EmptyTitle><EmptyDescription>{{ $t('recovery.emptyDescription') }}</EmptyDescription></EmptyHeader>
      </Empty>
      <div v-else-if="!error" class="table-wrap">
        <UiTable>
          <TableHeader><TableRow><TableHead>{{ $t('recovery.columns.name') }}</TableHead><TableHead>{{ $t('recovery.columns.directory') }}</TableHead><TableHead>{{ $t('recovery.columns.deletedAt') }}</TableHead><TableHead>{{ $t('recovery.columns.recoveryName') }}</TableHead><TableHead class="text-right">{{ $t('recovery.columns.actions') }}</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow v-for="item in items" :key="item.recoveryName">
              <TableCell>{{ item.displayName }}</TableCell>
              <TableCell>{{ item.directoryName }}</TableCell>
              <TableCell>{{ formatDate(item.deletedAt) }}</TableCell>
              <TableCell><code>{{ item.recoveryName }}</code></TableCell>
              <TableCell><div class="row-actions"><UiButton size="sm" variant="outline" :disabled="Boolean(busyName)" @click="restore(item)"><Spinner v-if="busyName === item.recoveryName" data-icon="inline-start" /><ArchiveRestore v-else data-icon="inline-start" />{{ $t('recovery.actions.restore') }}</UiButton><UiButton size="sm" variant="destructive" :disabled="Boolean(busyName)" @click="openPurge(item)"><Trash2 data-icon="inline-start" />{{ $t('recovery.actions.purge') }}</UiButton></div></TableCell>
            </TableRow>
          </TableBody>
        </UiTable>
      </div>

      <DialogFooter><UiButton variant="outline" @click="$emit('update:open', false)">{{ $t('common.actions.close') }}</UiButton></DialogFooter>
    </DialogScrollContent>
  </UiDialog>

  <UiDialog v-model:open="purgeOpen">
    <DialogContent>
      <DialogHeader><DialogTitle>{{ $t('recovery.purgeTitle') }}</DialogTitle><DialogDescription>{{ $t('recovery.purgeDescription') }}</DialogDescription></DialogHeader>
      <DialogFooter><UiButton variant="outline" @click="purgeOpen = false">{{ $t('recovery.actions.cancelPurge') }}</UiButton><UiButton variant="destructive" :disabled="Boolean(busyName)" @click="purge"><Spinner v-if="busyName" data-icon="inline-start" />{{ $t('recovery.actions.confirmPurge') }}</UiButton></DialogFooter>
    </DialogContent>
  </UiDialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ArchiveRestore, Trash2, TriangleAlert } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { roomsV2API } from '@/api/v2'
import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button as UiButton } from '@/components/ui/button'
import { Dialog as UiDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldLabel } from '@/components/ui/field'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const props = defineProps({
  open: { type: Boolean, default: false },
  scope: { type: String, required: true },
  rooms: { type: Array, default: () => [] },
  initialRoomId: { type: String, default: '' }
})
const emit = defineEmits(['update:open', 'restored'])
const { t, locale } = useI18n()
const items = ref([])
const loading = ref(false)
const error = ref(null)
const selectedRoomId = ref('')
const busyName = ref('')
const purgeOpen = ref(false)
const selectedItem = ref(null)

function formatDate(value) {
  return formatSystemDateTime(value, {
    locale: locale.value,
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}
async function load() {
  if (!props.open || (props.scope === 'world' && !selectedRoomId.value)) {
    items.value = []
    return
  }
  loading.value = true
  error.value = null
  try {
    const response = props.scope === 'room'
      ? await roomsV2API.recoveries()
      : await roomsV2API.worldRecoveries(selectedRoomId.value)
    items.value = response.items || []
  } catch (cause) {
    error.value = cause
    items.value = []
  } finally {
    loading.value = false
  }
}
async function restore(item) {
  busyName.value = item.recoveryName
  try {
    if (props.scope === 'room') await roomsV2API.restoreRoom(item.recoveryName)
    else await roomsV2API.restoreWorld(selectedRoomId.value, item.recoveryName)
    toast.success(t('recovery.restoreSucceeded', { name: item.displayName }))
    emit('restored')
    await load()
  } catch (cause) {
    toast.error(t('recovery.restoreFailed', { error: cause.message }))
  } finally {
    busyName.value = ''
  }
}
function openPurge(item) {
  selectedItem.value = item
  purgeOpen.value = true
}
async function purge() {
  if (!selectedItem.value) return
  const confirmation = selectedItem.value.recoveryName
  busyName.value = selectedItem.value.recoveryName
  try {
    if (props.scope === 'room') await roomsV2API.purgeRoomRecovery(selectedItem.value.recoveryName, confirmation)
    else await roomsV2API.purgeWorldRecovery(selectedRoomId.value, selectedItem.value.recoveryName, confirmation)
    toast.success(t('recovery.purgeSucceeded', { name: selectedItem.value.displayName }))
    purgeOpen.value = false
    await load()
  } catch (cause) {
    toast.error(t('recovery.purgeFailed', { error: cause.message }))
  } finally {
    busyName.value = ''
  }
}

watch(() => props.open, open => {
  if (!open) return
  selectedRoomId.value = props.initialRoomId || props.rooms[0]?.id || ''
  load()
})
watch(selectedRoomId, load)
</script>

<style scoped>
.recovery-skeleton,
.row-actions {
  display: flex;
  gap: 8px;
}
.recovery-skeleton {
  flex-direction: column;
}
.row-actions {
  justify-content: flex-end;
}
.table-wrap {
  overflow-x: auto;
}
code {
  font-family: var(--font-mono);
  font-size: 12px;
}
</style>

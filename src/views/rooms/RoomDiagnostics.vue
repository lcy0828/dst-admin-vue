<template>
  <div class="flex min-w-0 flex-col gap-5">
    <header class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-normal">{{ t('distributed.diagnostics.title') }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('distributed.diagnostics.description') }}</p>
      </div>
      <UiButton variant="outline" :disabled="loadingRooms || !selectedRoomId" @click="loadRooms">
        <Spinner v-if="loadingRooms" data-icon="inline-start" />
        <RefreshCw v-else data-icon="inline-start" />
        {{ t('common.actions.refresh') }}
      </UiButton>
    </header>

    <FieldGroup class="max-w-sm">
      <Field>
        <FieldLabel for="diagnostics-room">{{ t('distributed.diagnostics.room') }}</FieldLabel>
        <UiSelect :model-value="selectedRoomId" :disabled="loadingRooms" @update:model-value="selectRoom">
          <SelectTrigger id="diagnostics-room">
            <SelectValue :placeholder="t('distributed.diagnostics.selectRoom')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem v-for="room in rooms" :key="room.id" :value="String(room.id)">{{ room.name }}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </UiSelect>
      </Field>
    </FieldGroup>

    <Alert v-if="roomsError" variant="destructive">
      <CircleAlert />
      <AlertTitle>{{ t('distributed.diagnostics.loadRoomsFailed') }}</AlertTitle>
      <AlertDescription>{{ roomsError }}</AlertDescription>
    </Alert>

    <div v-if="loadingRooms && rooms.length === 0" class="flex flex-col gap-2" :aria-label="t('common.states.loading')">
      <Skeleton v-for="index in 4" :key="index" class="h-14 w-full" />
    </div>

    <Empty v-else-if="!roomsError && rooms.length === 0">
      <EmptyHeader>
        <EmptyMedia variant="icon"><Stethoscope /></EmptyMedia>
        <EmptyTitle>{{ t('distributed.diagnostics.noRoomsTitle') }}</EmptyTitle>
        <EmptyDescription>{{ t('distributed.diagnostics.noRoomsDescription') }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <UiButton variant="outline" @click="router.push('/rooms/list')">{{ t('navigation.roomList') }}</UiButton>
      </EmptyContent>
    </Empty>

    <template v-else-if="selectedRoomId">
      <RuntimeOverviewPanel
        :room-id="selectedRoomId"
        show-diagnostics-action
        @diagnose="selectShard"
      />

      <RoomWorldStatePanel :room-id="selectedRoomId" />

      <RoomLogOverviewPanel :room-id="selectedRoomId" />

      <template v-if="selectedShard">
        <Alert>
          <RadioTower />
          <AlertTitle>{{ t('distributed.diagnostics.selectedTitle', { world: selectedShard.worldName }) }}</AlertTitle>
          <AlertDescription>{{ t('distributed.diagnostics.selectedDescription', { target: selectedShard.target?.name || selectedShard.placement?.appliedTargetId || '--' }) }}</AlertDescription>
        </Alert>
        <RuntimeDiagnosticsPanel
          :room-id="selectedRoomId"
          :world-id="selectedShard.worldId"
          :world-name="selectedShard.worldName"
        />
      </template>

      <Empty v-else>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Activity /></EmptyMedia>
          <EmptyTitle>{{ t('distributed.diagnostics.selectWorldTitle') }}</EmptyTitle>
          <EmptyDescription>{{ t('distributed.diagnostics.selectWorldDescription') }}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Activity, CircleAlert, RadioTower, RefreshCw, Stethoscope } from '@lucide/vue'
import { roomsV2API } from '@/api/v2'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button as UiButton } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select as UiSelect, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import RuntimeDiagnosticsPanel from '@/components/runtime/RuntimeDiagnosticsPanel.vue'
import RoomLogOverviewPanel from '@/components/runtime/RoomLogOverviewPanel.vue'
import RoomWorldStatePanel from '@/components/runtime/RoomWorldStatePanel.vue'
import RuntimeOverviewPanel from '@/components/runtime/RuntimeOverviewPanel.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const rooms = ref([])
const selectedRoomId = ref('')
const selectedShard = ref(null)
const loadingRooms = ref(false)
const roomsError = ref('')

async function loadRooms() {
  loadingRooms.value = true
  roomsError.value = ''
  try {
    const response = await roomsV2API.controlPlaneList()
    rooms.value = (response.items || []).filter(room => room.managed)
    const requested = String(route.query.roomId || selectedRoomId.value || '')
    selectedRoomId.value = rooms.value.some(room => String(room.id) === requested)
      ? requested
      : (rooms.value[0] ? String(rooms.value[0].id) : '')
    await replaceRoomQuery()
  } catch (cause) {
    rooms.value = []
    selectedRoomId.value = ''
    selectedShard.value = null
    roomsError.value = cause.message || t('common.errors.unknown')
  } finally {
    loadingRooms.value = false
  }
}

async function replaceRoomQuery() {
  const nextQuery = { ...route.query }
  if (selectedRoomId.value) nextQuery.roomId = selectedRoomId.value
  else delete nextQuery.roomId
  if (String(route.query.roomId || '') !== selectedRoomId.value) {
    await router.replace({ query: nextQuery })
  }
}

function selectRoom(value) {
  selectedRoomId.value = String(value || '')
  selectedShard.value = null
  void replaceRoomQuery()
}

function selectShard(shard) {
  selectedShard.value = shard
}

onMounted(loadRooms)
</script>

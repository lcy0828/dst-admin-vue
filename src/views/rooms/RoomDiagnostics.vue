<template>
  <div class="flex min-w-0 flex-col gap-5">
    <header class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-normal">{{ t('distributed.diagnostics.title') }}</h1>
      </div>
      <div class="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
        <RoomScopeSelect :model-value="selectedRoomId" :rooms="rooms" :loading="loadingRooms" @update:model-value="selectRoom" />
        <UiButton variant="outline" :disabled="refreshing || loadingRooms || !selectedRoomId" @click="refreshPage">
          <Spinner v-if="refreshing" data-icon="inline-start" />
          <RefreshCw v-else data-icon="inline-start" />
          {{ t('common.actions.refresh') }}
        </UiButton>
      </div>
    </header>

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
        ref="overviewPanel"
        :room-id="selectedRoomId"
        show-diagnostics-action
        @diagnose="selectShard"
      />

      <template v-if="selectedShard">
        <Alert>
          <RadioTower />
          <AlertTitle>{{ t('distributed.diagnostics.selectedTitle', { world: selectedShard.worldName }) }}</AlertTitle>
          <AlertDescription>{{ t('distributed.diagnostics.selectedDescription', { target: selectedShardEndpoint }) }}</AlertDescription>
          <AlertAction>
            <UiButton size="icon-sm" variant="ghost" :aria-label="t('common.actions.close')" :title="t('common.actions.close')" @click="selectedShard = null">
              <X />
            </UiButton>
          </AlertAction>
        </Alert>
        <RuntimeDiagnosticsPanel
          :room-id="selectedRoomId"
          :world-id="selectedShard.worldId"
          :world-name="selectedShard.worldName"
        />
      </template>

      <Tabs v-model="activeSection" :unmount-on-hide="true" class="min-w-0">
        <TabsList variant="line" class="max-w-full justify-start">
          <TabsTrigger value="logs">
            <ScrollText data-icon="inline-start" />
            {{ t('distributed.diagnostics.logsTab') }}
          </TabsTrigger>
          <TabsTrigger value="events">
            <History data-icon="inline-start" />
            {{ t('distributed.diagnostics.eventsTab') }}
          </TabsTrigger>
          <TabsTrigger value="runtime">
            <Wrench data-icon="inline-start" />
            {{ t('runtime.title') }}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="logs" class="pt-3">
          <RoomLogOverviewPanel v-if="activeSection === 'logs'" ref="logPanel" :room-id="selectedRoomId" embedded />
        </TabsContent>
        <TabsContent value="events" class="pt-3">
          <RuntimeAuditPanel
            v-if="activeSection === 'events'"
            ref="auditPanel"
            :room-id="selectedRoomId"
            :worlds="selectedRoomWorlds"
            embedded
          />
        </TabsContent>
        <TabsContent value="runtime" class="pt-3">
          <RuntimeStatusPanel
            v-if="activeSection === 'runtime'"
            ref="runtimeStatusPanel"
            :room-id="selectedRoomId"
          />
        </TabsContent>
      </Tabs>
    </template>
  </div>
</template>

<script setup>
import RoomScopeSelect from '@/components/layout/RoomScopeSelect.vue'
import { preferredRoomId } from '@/lib/pageScope.mjs'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { CircleAlert, History, RadioTower, RefreshCw, ScrollText, Stethoscope, Wrench, X } from '@lucide/vue'
import { roomsV2API } from '@/api/v2'
import { runtimeEndpointLabel } from '@/lib/roomPlacement.mjs'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button as UiButton } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import RuntimeDiagnosticsPanel from '@/components/runtime/RuntimeDiagnosticsPanel.vue'
import RuntimeAuditPanel from '@/components/runtime/RuntimeAuditPanel.vue'
import RoomLogOverviewPanel from '@/components/runtime/RoomLogOverviewPanel.vue'
import RuntimeOverviewPanel from '@/components/runtime/RuntimeOverviewPanel.vue'
import RuntimeStatusPanel from '@/components/runtime/RuntimeStatusPanel.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const rooms = ref([])
const selectedRoomId = ref('')
const selectedShard = ref(null)
const loadingRooms = ref(false)
const refreshing = ref(false)
const roomsError = ref('')
const activeSection = ref('logs')
const overviewPanel = ref(null)
const logPanel = ref(null)
const auditPanel = ref(null)
const runtimeStatusPanel = ref(null)
const selectedRoomWorlds = computed(() => {
  const room = rooms.value.find(item => String(item.id) === selectedRoomId.value)
  return Array.isArray(room?.worlds) ? room.worlds : []
})
const selectedShardEndpoint = computed(() => runtimeEndpointLabel(
  { targets: selectedShard.value?.target ? [selectedShard.value.target] : [] },
  selectedShard.value?.placement?.appliedTargetId,
  selectedShard.value?.placement?.appliedInstallationId
))

async function loadRooms() {
  loadingRooms.value = true
  roomsError.value = ''
  try {
    const response = await roomsV2API.controlPlaneList()
    rooms.value = response.items || []
    selectedRoomId.value = preferredRoomId(rooms.value, route.query.roomId || selectedRoomId.value || undefined)
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

async function refreshPage() {
  refreshing.value = true
  try {
    await loadRooms()
    await nextTick()
    if (!selectedRoomId.value) return
    const refreshes = [overviewPanel.value?.loadOverview()]
    if (activeSection.value === 'logs') refreshes.push(logPanel.value?.loadLogs())
    if (activeSection.value === 'events') refreshes.push(auditPanel.value?.loadEvents())
    if (activeSection.value === 'runtime') refreshes.push(runtimeStatusPanel.value?.loadStatus())
    await Promise.allSettled(refreshes.filter(Boolean))
  } finally {
    refreshing.value = false
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
  activeSection.value = 'logs'
  void replaceRoomQuery()
}

function selectShard(shard) {
  selectedShard.value = shard
}

onMounted(loadRooms)
</script>

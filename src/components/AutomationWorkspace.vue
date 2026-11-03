<template>
  <AutomationBoundPage v-if="boundApi" :key="pageKey" :page="page" :api="boundApi" />
  <div v-else class="flex flex-col gap-6">
    <h1 class="text-2xl font-semibold">{{ $t('automationScope.title') }}</h1>
    <Skeleton v-if="loading" class="h-40 w-full" />
    <Alert v-else-if="error" variant="destructive">
      <AlertTitle>{{ $t('automationScope.failed') }}</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
      <AlertAction class="flex flex-wrap gap-2"><Button variant="outline" @click="load">{{ $t('common.actions.retry') }}</Button><Button v-if="route.params.id || route.query.roomId" variant="outline" @click="chooseAgain">{{ $t('automationScope.chooseAgain') }}</Button></AlertAction>
    </Alert>
    <template v-else>
      <AutomationRoomSelect v-if="rooms.length" />
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{{ $t(rooms.length ? 'automationScope.chooseTitle' : 'automationScope.emptyTitle') }}</EmptyTitle>
          <EmptyDescription>{{ $t(rooms.length ? 'automationScope.chooseDescription' : 'automationScope.emptyDescription') }}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </template>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { realCronTaskApi } from '@/api/cronApi'
import { AUTOMATION_SCOPE_EVENT } from '@/lib/automationScope.mjs'
import AutomationBoundPage from '@/components/AutomationBoundPage.vue'
import AutomationRoomSelect from '@/components/AutomationRoomSelect.vue'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'

defineProps({ page: { type: [Object, Function], required: true } })
const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const rooms = ref([])
const boundApi = shallowRef(null)
const pageKey = ref(0)
let sequence = 0
let selecting = false
function dispose() { boundApi.value?.dispose(); boundApi.value = null }
function detailKind() {
  if (['EditTask'].includes(route.name)) return 'task'
  if (['EditTaskGroup', 'TaskGroupDetail'].includes(route.name)) return 'group'
  if (['TaskLogDetail', 'TaskExecutionResult'].includes(route.name)) return 'run'
  return ''
}
async function load() {
  const request = ++sequence
  dispose()
  loading.value = true
  error.value = ''
  try {
    let state = await realCronTaskApi.getRoomScope({ refresh: true })
    if (request !== sequence) return
    selecting = true
    try {
      const preferred = typeof route.query.roomId === 'string' ? route.query.roomId : ''
      const kind = detailKind()
      if (kind && route.params.id) await realCronTaskApi.resolveRoom(kind, route.params.id, preferred)
      else if (preferred) realCronTaskApi.setRoom(preferred)
    } finally { selecting = false }
    if (request !== sequence) return
    state = await realCronTaskApi.getRoomScope()
    if (request !== sequence) return
    rooms.value = state.rooms
    if (state.roomId) {
      pageKey.value++
      boundApi.value = realCronTaskApi.forCurrentRoom()
    }
  } catch (cause) {
    if (request === sequence) error.value = cause.message
  } finally { if (request === sequence) loading.value = false }
}
function chooseAgain() {
  const kind = detailKind()
  const path = kind === 'run' ? '/cron/logs' : kind === 'group' ? '/cron/groups' : '/cron/tasks'
  return router.replace({ path, query: {} })
}
function changed() { if (!selecting) void load() }
window.addEventListener(AUTOMATION_SCOPE_EVENT, changed)
watch(() => route.fullPath, load, { immediate: true })
onBeforeUnmount(() => {
  sequence++
  dispose()
  window.removeEventListener(AUTOMATION_SCOPE_EVENT, changed)
})
</script>

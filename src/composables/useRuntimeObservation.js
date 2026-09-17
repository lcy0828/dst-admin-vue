import { onBeforeUnmount, onMounted, ref } from 'vue'
import { runtimeObservationsV2API } from '@/api/v2'
import { invalidateScopedRuntimeOverviewCaches } from '@/api/v2LegacyAdapters'
import {
  createRuntimeObservationStreamRegistry,
  runtimeObservationChangesViews,
  RUNTIME_OBSERVATION_UPDATED_EVENT
} from '@/lib/runtimeObservationStreams.mjs'
import {
  getManagementScope,
  MANAGEMENT_SCOPE_CHANGED_EVENT,
  managementScopeTargetId
} from '@/lib/managementScope.mjs'

const registry = createRuntimeObservationStreamRegistry({
  buildURL: scope => runtimeObservationsV2API.streamURL(scope)
})

export function useRuntimeObservation() {
  const state = ref('connecting')
  const observations = ref([])
  const error = ref('')
  const refreshing = ref(false)
  let unsubscribe = null
  let subscribedTargetId = null
  let dispatchTimer = null

  function dispatchUpdate(detail) {
    invalidateScopedRuntimeOverviewCaches()
    if (dispatchTimer !== null) clearTimeout(dispatchTimer)
    dispatchTimer = setTimeout(() => {
      dispatchTimer = null
      window.dispatchEvent(new CustomEvent(RUNTIME_OBSERVATION_UPDATED_EVENT, { detail }))
    }, 250)
  }

  function applyEvent(activity) {
    const { eventName, data } = activity
    if (eventName === 'observation.snapshot') observations.value = Array.isArray(data?.items) ? data.items : []
    const observation = data?.observation
    if (observation?.targetId) {
      const index = observations.value.findIndex(item => (
        item.targetId === observation.targetId && item.installationId === observation.installationId
      ))
      const next = [...observations.value]
      if (index >= 0) next[index] = observation
      else next.push(observation)
      observations.value = next
    }
    refreshing.value = observations.value.some(item => item.state === 'refreshing')
    error.value = String(observation?.error || '')
    if (runtimeObservationChangesViews(eventName)) {
      dispatchUpdate({ eventName, observation })
    }
  }

  function connect(scope = getManagementScope()) {
    unsubscribe?.()
    subscribedTargetId = managementScopeTargetId(scope)
    unsubscribe = registry.subscribe({ targetId: subscribedTargetId }, {
      onState: value => { state.value = value },
      onEvent: applyEvent
    })
  }

  function handleScopeChange(event) {
    const scope = event?.detail || getManagementScope()
    if (subscribedTargetId === managementScopeTargetId(scope)) return
    observations.value = []
    error.value = ''
    connect(scope)
  }

  async function refresh() {
    refreshing.value = true
    error.value = ''
    try {
      const result = await runtimeObservationsV2API.refresh({ targetId: managementScopeTargetId(getManagementScope()) })
      observations.value = Array.isArray(result?.items) ? result.items : observations.value
      dispatchUpdate({ eventName: 'observation.manual-refresh' })
      return result
    } catch (cause) {
      error.value = cause?.message || 'Unable to refresh runtime observations.'
      throw cause
    } finally {
      refreshing.value = false
    }
  }

  onMounted(() => {
    connect()
    window.addEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, handleScopeChange)
  })
  onBeforeUnmount(() => {
    unsubscribe?.()
    unsubscribe = null
    if (dispatchTimer !== null) clearTimeout(dispatchTimer)
    window.removeEventListener(MANAGEMENT_SCOPE_CHANGED_EVENT, handleScopeChange)
  })

  return { error, observations, refresh, refreshing, state }
}

export { RUNTIME_OBSERVATION_UPDATED_EVENT }

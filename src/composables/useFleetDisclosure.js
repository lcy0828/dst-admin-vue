import { computed, ref, unref } from 'vue'
import { toast } from 'vue-sonner'
import { runtimeTargetsV2API } from '@/api/v2'
import { translate } from '@/i18n/index.js'
import {
  evaluateFleetDisclosure,
  isControllerOnlyDeployment,
  readStoredFleetMode,
  writeStoredFleetMode
} from '@/lib/fleetDisclosure.mjs'
import {
  getManagementScope,
  MANAGEMENT_SCOPE_TARGET,
  setManagementScope
} from '@/lib/managementScope.mjs'
import { runtimeTargetName } from '@/lib/runtimeTargetPresentation.mjs'
import { RUNTIME_TARGETS_UPDATED_EVENT } from '@/utils/runtimeTarget'

const targets = ref([])
const targetsLoaded = ref(false)
const targetsLoading = ref(false)
const capabilitiesState = ref(null)
const storedMode = ref(readStoredFleetMode())

let inFlightPromise = null
let listenerAttached = false

function attachListeners() {
  if (listenerAttached || typeof window === 'undefined') return
  listenerAttached = true
  window.addEventListener(RUNTIME_TARGETS_UPDATED_EVENT, () => {
    void refreshTargets({ silent: true })
  })
}

function targetLabel(target) {
  return runtimeTargetName(target, translate)
}

function reconcileManagementScope(items) {
  const scope = getManagementScope()
  if (items.length === 1) {
    const only = items[0]
    setManagementScope({
      kind: MANAGEMENT_SCOPE_TARGET,
      targetId: only.id,
      targetName: targetLabel(only),
      targetKind: only.kind,
      agentId: only.agentId,
      online: only.online,
      configured: only.configured
    })
    return
  }
  if (scope.kind === MANAGEMENT_SCOPE_TARGET) {
    const target = items.find(item => item.id === scope.targetId)
    setManagementScope(target
      ? {
          kind: MANAGEMENT_SCOPE_TARGET,
          targetId: target.id,
          targetName: targetLabel(target),
          targetKind: target.kind,
          agentId: target.agentId,
          online: target.online,
          configured: target.configured
        }
      : { kind: 'all' })
  }
}

function syncStoredMode() {
  const evaluated = evaluateFleetDisclosure({
    targets: targets.value,
    targetsLoaded: targetsLoaded.value,
    capabilities: capabilitiesState.value,
    storedMode: storedMode.value
  })
  if (evaluated.ready) {
    storedMode.value = writeStoredFleetMode(evaluated.mode)
  }
}

export async function refreshTargets({ silent = false } = {}) {
  attachListeners()
  if (inFlightPromise) return inFlightPromise
  targetsLoading.value = true
  inFlightPromise = (async () => {
    try {
      const value = await runtimeTargetsV2API.list()
      const items = Array.isArray(value?.items) ? value.items : []
      targets.value = items
      targetsLoaded.value = true
      reconcileManagementScope(items)
      syncStoredMode()
      return items
    } catch (error) {
      if (!silent) {
        toast.error(translate('app.remote.loadFailedDetail', { error: error?.message || translate('common.errors.unknown') }))
      }
      return targets.value
    } finally {
      targetsLoading.value = false
      inFlightPromise = null
    }
  })()
  return inFlightPromise
}

export async function ensureFleetTargetsLoaded({ silent = true } = {}) {
  attachListeners()
  if (targetsLoaded.value) return targets.value
  return refreshTargets({ silent })
}

export function updateCapabilities(capabilities) {
  capabilitiesState.value = capabilities || null
  if (isControllerOnlyDeployment(capabilities)) {
    storedMode.value = writeStoredFleetMode('fleet')
  } else if (targetsLoaded.value) {
    syncStoredMode()
  }
}

export function useFleetDisclosure(routeSource = null) {
  attachListeners()
  const disclosure = computed(() => evaluateFleetDisclosure({
    targets: targets.value,
    targetsLoaded: targetsLoaded.value,
    capabilities: capabilitiesState.value,
    route: unref(routeSource),
    storedMode: storedMode.value
  }))
  const showFleetControls = computed(() => disclosure.value.showFleetControls)
  const fleetMode = computed(() => disclosure.value.mode === 'fleet')

  return {
    targets,
    targetsLoaded,
    targetsLoading,
    disclosure,
    showFleetControls,
    fleetMode,
    refreshTargets,
    ensureFleetTargetsLoaded,
    updateCapabilities
  }
}

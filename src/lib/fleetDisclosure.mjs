export const FLEET_DISCLOSURE_STORAGE_KEY = 'dstFleetDisclosureMode'

function disclosureStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage || null
  } catch {
    return null
  }
}

export function readStoredFleetMode() {
  const storage = disclosureStorage()
  if (!storage) return 'single'
  try {
    return storage.getItem(FLEET_DISCLOSURE_STORAGE_KEY) === 'fleet' ? 'fleet' : 'single'
  } catch {
    return 'single'
  }
}

export function writeStoredFleetMode(mode) {
  const normalized = mode === 'fleet' ? 'fleet' : 'single'
  const storage = disclosureStorage()
  if (!storage) return normalized
  try {
    storage.setItem(FLEET_DISCLOSURE_STORAGE_KEY, normalized)
  } catch {
    // Persistence avoids initial S2-S4 layout shift; transient failures can be ignored safely.
  }
  return normalized
}

export function isRemoteTarget(target) {
  if (!target || typeof target !== 'object') return false
  if (target.kind === 'agent') return true
  if (String(target.agentId || '').trim()) return true
  const id = String(target.id || '').trim()
  return Boolean(id && id !== 'local' && target.kind !== 'local')
}

export function isControllerOnlyDeployment(capabilities) {
  const deployment = capabilities?.deployment
  if (!deployment || typeof deployment !== 'object') return false
  return deployment.localExecutorEnabled === false
    || deployment.role === 'controller_only'
    || deployment.packaging === 'control_plane'
}

export function hasFleetDeepLink(route) {
  if (!route || typeof route !== 'object') return false
  const path = String(route.path || '')
  if (path === '/agents' || path.startsWith('/agents/')) return true
  if (path === '/rooms/topology' || path.startsWith('/rooms/topology/')) return true
  const query = route.query && typeof route.query === 'object' ? route.query : {}
  if (String(query.deployment || '').trim() === 'edit') return true
  const targetId = String(query.targetId || '').trim()
  return Boolean(targetId && targetId !== 'local')
}

export function evaluateFleetDisclosure({
  targets = [],
  targetsLoaded = false,
  capabilities = null,
  route = null,
  storedMode = 'single'
} = {}) {
  const items = Array.isArray(targets) ? targets : []
  const targetCount = items.length
  const hasRemoteTargets = items.some(isRemoteTarget)
  const controllerOnly = isControllerOnlyDeployment(capabilities)
  const distributedEnabled = targetCount > 1 || hasRemoteTargets || controllerOnly
  const ready = Boolean(targetsLoaded || controllerOnly)
  const fallbackMode = storedMode === 'fleet' ? 'fleet' : 'single'
  const mode = ready ? (distributedEnabled ? 'fleet' : 'single') : fallbackMode
  const deepLink = hasFleetDeepLink(route)
  const showFleetControls = mode === 'fleet' || deepLink

  return {
    ready,
    mode,
    targetCount,
    hasRemoteTargets,
    controllerOnly,
    distributedEnabled,
    deepLink,
    showFleetControls
  }
}

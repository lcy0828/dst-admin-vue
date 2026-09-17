export const MANAGEMENT_SCOPE_ALL = 'all'
export const MANAGEMENT_SCOPE_TARGET = 'target'
export const MANAGEMENT_SCOPE_CHANGED_EVENT = 'management-scope-changed'

const STORAGE_KEY = 'dstManagementScope'
const defaultScope = () => ({ kind: MANAGEMENT_SCOPE_ALL, targetId: '', targetName: '' })

let activeScope = restoreStoredScope()

function scopeStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage || null
  } catch {
    return null
  }
}

function normalizeScope(input = {}) {
  const targetId = String(input.targetId || input.id || '').trim()
  if (input.kind !== MANAGEMENT_SCOPE_TARGET || !targetId) return defaultScope()
  return {
    kind: MANAGEMENT_SCOPE_TARGET,
    targetId,
    targetName: String(input.targetName || input.name || targetId).trim() || targetId,
    targetKind: String(input.targetKind || input.runtimeKind || '').trim(),
    agentId: String(input.agentId || '').trim(),
    online: input.online !== false,
    configured: input.configured !== false
  }
}

function restoreStoredScope() {
  const storage = scopeStorage()
  if (!storage) return defaultScope()
  try {
    return normalizeScope(JSON.parse(storage.getItem(STORAGE_KEY) || window.sessionStorage?.getItem(STORAGE_KEY) || '{}'))
  } catch {
    return defaultScope()
  }
}

function persistScope(scope) {
  const storage = scopeStorage()
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({
      kind: scope.kind,
      targetId: scope.targetId,
      targetName: scope.targetName
    }))
  } catch {
    // Scope persistence is optional; the active page still receives the event.
  }
}

export function getManagementScope() {
  return { ...activeScope }
}

export function setManagementScope(input = {}) {
  const next = normalizeScope(input)
  const changed = next.kind !== activeScope.kind || next.targetId !== activeScope.targetId ||
    next.targetName !== activeScope.targetName || next.agentId !== activeScope.agentId || next.online !== activeScope.online ||
    next.configured !== activeScope.configured
  activeScope = next
  persistScope(next)
  if (changed && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MANAGEMENT_SCOPE_CHANGED_EVENT, { detail: getManagementScope() }))
  }
  return getManagementScope()
}

export function managementScopeTargetId(scope = activeScope) {
  return scope?.kind === MANAGEMENT_SCOPE_TARGET ? String(scope.targetId || '').trim() : ''
}

export function managementScopeRequest(scope = activeScope) {
  const targetId = managementScopeTargetId(scope)
  return targetId ? { targetIds: [targetId] } : {}
}

export function managementScopeIncludesTarget(targetId, scope = activeScope) {
  const selectedTargetId = managementScopeTargetId(scope)
  return !selectedTargetId || String(targetId || '').trim() === selectedTargetId
}

export function filterManagementTargets(items, selector = item => item?.targetId, scope = activeScope) {
  return (Array.isArray(items) ? items : []).filter(item => managementScopeIncludesTarget(selector(item), scope))
}

export function filterManagementRooms(items, scope = activeScope) {
  const selectedTargetId = managementScopeTargetId(scope)
  if (!selectedTargetId) return Array.isArray(items) ? items : []
  return (Array.isArray(items) ? items : []).filter(room => {
    const targetIds = Array.isArray(room?.targetIds) ? room.targetIds : []
    return targetIds.some(targetId => String(targetId || '').trim() === selectedTargetId)
  })
}

export const LOCAL_RUNTIME_TARGET_ID = 'local'
export const RUNTIME_TARGET_CHANGED_EVENT = 'runtime-target-changed'
export const RUNTIME_TARGETS_UPDATED_EVENT = 'runtime-targets-updated'

let activeTarget = {
  id: LOCAL_RUNTIME_TARGET_ID,
  kind: 'local',
  name: 'Local',
  status: 'configuration_required',
  configured: false,
  online: true,
  default: true
}

export function getActiveRuntimeTarget() {
  return { ...activeTarget }
}

export function setActiveRuntimeTarget(target) {
  const next = target?.id ? { ...target } : {
    id: LOCAL_RUNTIME_TARGET_ID,
    kind: 'local',
    name: 'Local',
    status: 'configuration_required',
    configured: false,
    online: true,
    default: true
  }
  activeTarget = next
  window.dispatchEvent(new CustomEvent(RUNTIME_TARGET_CHANGED_EVENT, { detail: next }))
  return getActiveRuntimeTarget()
}

export function announceRuntimeTargetsUpdated() {
  window.dispatchEvent(new CustomEvent(RUNTIME_TARGETS_UPDATED_EVENT))
}

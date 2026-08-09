export function runtimeTargetName(target, translate) {
  if (target?.kind === 'local') return translate('app.remote.local')
  return target?.name || target?.id || translate('common.states.unknown')
}

export function runtimeTargetMeta(target, translate) {
  if (target?.kind === 'local') {
    return translate(target.status === 'ready' ? 'app.remote.localAvailable' : 'app.remote.localPending')
  }
  if (!target?.configured) return translate('app.remote.remoteUnconfigured')
  return translate(target.online ? 'app.remote.remoteOnline' : 'app.remote.remoteOffline')
}

export function retainUnavailableRemoteTarget(items, selectedId, previousTarget) {
  const targets = Array.isArray(items) ? items.slice() : []
  if (previousTarget?.id === selectedId && !targets.some(target => target.id === selectedId)) {
    targets.unshift({
      ...previousTarget,
      ...(previousTarget.kind === 'agent' ? { online: false } : {})
    })
  }
  return targets
}

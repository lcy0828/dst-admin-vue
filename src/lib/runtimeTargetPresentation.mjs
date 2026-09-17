export function runtimeTargetName(target, translate) {
  return target?.name
    || (target?.kind === 'local' ? translate('app.remote.local') : target?.id)
    || translate('common.states.unknown')
}

export function runtimeTargetMeta(target, translate) {
  if (target?.kind === 'local') {
    return translate(target.status === 'ready' ? 'app.remote.localAvailable' : 'app.remote.localPending')
  }
  if (!target?.configured) {
    return translate(target.online ? 'app.remote.remotePendingOnline' : 'app.remote.remoteUnconfigured')
  }
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

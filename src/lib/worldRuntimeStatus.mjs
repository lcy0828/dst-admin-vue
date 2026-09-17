const KNOWN_WORLD_STATUSES = new Set(['stopped', 'starting', 'running', 'failed', 'stopping'])

export function worldRuntimeStatus(worldOrStatus) {
  const value = typeof worldOrStatus === 'string'
    ? worldOrStatus
    : worldOrStatus?.status
  const status = String(value || '').trim().toLowerCase()
  return KNOWN_WORLD_STATUSES.has(status) ? status : 'unknown'
}

export function worldStatusLabel(worldOrStatus, translator) {
  const status = worldRuntimeStatus(worldOrStatus)
  const presentationStatus = isWorldSaveWriteFailed(worldOrStatus)
    ? 'saveFailed'
    : isWorldPaused(worldOrStatus) ? 'paused' : status
  if (typeof translator === 'function') return translator(`worldRuntime.statuses.${presentationStatus}`)
  return {
    stopped: '已停止',
    starting: '启动中',
    running: '运行中',
    paused: '运行中 · 已暂停',
    saveFailed: '保存异常',
    failed: '启动失败',
    stopping: '停止中',
    unknown: '状态未知'
  }[presentationStatus]
}

export function worldStatusVariant(worldOrStatus) {
  if (isWorldSaveWriteFailed(worldOrStatus)) return 'destructive'
  if (isWorldPaused(worldOrStatus)) return 'info'
  return {
    stopped: 'outline',
    starting: 'warning',
    running: 'success',
    failed: 'destructive',
    stopping: 'warning',
    unknown: 'outline'
  }[worldRuntimeStatus(worldOrStatus)]
}

export function isWorldPaused(world) {
  return worldRuntimeStatus(world) === 'running' && world?.paused === true
}

export function worldStatusCode(world) {
  if (!world || typeof world !== 'object') return ''
  return String(world.statusCode || world.status_code || '').trim().toUpperCase()
}

export function isWorldSaveWriteFailed(world) {
  return worldRuntimeStatus(world) === 'running' && worldStatusCode(world) === 'SAVE_WRITE_FAILED'
}

export function worldStatusMessage(world) {
  if (!world || typeof world !== 'object') return ''
  return String(world.statusMessage || world.status_message || '').trim()
}

export function worldControlAvailable(world) {
  if (!world || typeof world !== 'object') return false
  return world.controlAvailable !== false && world.control_available !== false
}

export function isWorldStarting(worldOrStatus) {
  return worldRuntimeStatus(worldOrStatus) === 'starting'
}

export function canStartWorld(world) {
  return worldControlAvailable(world) && ['stopped', 'failed'].includes(worldRuntimeStatus(world))
}

export function canStopWorld(world) {
  return worldControlAvailable(world) && worldRuntimeStatus(world) === 'running'
}

export function canRequestStopWorld(world) {
  return worldControlAvailable(world) && ['starting', 'running'].includes(worldRuntimeStatus(world))
}

export function canCleanFailedWorld(world) {
  return worldControlAvailable(world) && worldRuntimeStatus(world) === 'failed'
}

export function canConfigureWorld(world) {
  return worldControlAvailable(world) && worldRuntimeStatus(world) === 'stopped'
}

export function canDeleteWorld(world) {
  return worldControlAvailable(world) && worldRuntimeStatus(world) === 'stopped'
}

export function worldActionRequiresConfirmation(action) {
  return ['stop', 'restart', 'cleanup'].includes(String(action || '').trim().toLowerCase())
}

export function isMasterWorld(world) {
  if (!world || typeof world !== 'object') return false
  if (typeof world.isMaster === 'boolean') return world.isMaster
  if (typeof world.is_master === 'boolean') return world.is_master
  const role = String(world.role || world.worldRole || world.world_role || '').trim().toLowerCase()
  if (role) return role === 'master'
  return String(world.directoryName || world.directory_name || '').trim().toLowerCase() === 'master'
}

export function compareWorldRoles(left, right) {
  return Number(isMasterWorld(right)) - Number(isMasterWorld(left))
}

export function worldLifecycleScope(worlds, target, action) {
  const roomWorlds = Array.isArray(worlds) ? worlds.filter(Boolean) : []
  const selected = target && roomWorlds.find(world => world.id === target.id)
  const normalizedAction = String(action || '').trim().toLowerCase()
  if (!selected || !['start', 'stop', 'restart', 'cleanup'].includes(normalizedAction)) {
    return { allowed: false, reason: 'invalid-target', worlds: [], addedWorlds: [] }
  }

  const affected = [selected]
  const master = roomWorlds.find(isMasterWorld)
  if (isMasterWorld(selected) && ['stop', 'restart'].includes(normalizedAction)) {
    affected.push(...roomWorlds.filter(world => (
      world.id !== selected.id && ['starting', 'running'].includes(worldRuntimeStatus(world))
    )))
  } else if (!isMasterWorld(selected) && ['start', 'restart'].includes(normalizedAction) && master) {
    const masterStatus = worldRuntimeStatus(master)
    if (['stopped', 'failed'].includes(masterStatus)) {
      if (!canStartWorld(master)) {
        return { allowed: false, reason: 'master-unavailable', worlds: [], addedWorlds: [] }
      }
      affected.unshift(master)
    } else if (!['starting', 'running'].includes(masterStatus)) {
      return { allowed: false, reason: 'master-state-unknown', worlds: [], addedWorlds: [] }
    }
  }

  const unique = affected.filter((world, index, values) => (
    values.findIndex(value => value.id === world.id) === index
  ))
  return {
    allowed: true,
    reason: '',
    worlds: unique,
    addedWorlds: unique.filter(world => world.id !== selected.id)
  }
}

export function worldLifecycleSelection(worlds, targets, action) {
  const roomWorlds = Array.isArray(worlds) ? worlds.filter(Boolean) : []
  const selectedTargets = Array.isArray(targets) ? targets.filter(Boolean) : []
  const scopes = selectedTargets.map(target => worldLifecycleScope(roomWorlds, target, action))
  const blocked = scopes.find(scope => !scope.allowed)
  if (blocked) return blocked

  const affected = scopes.flatMap(scope => scope.worlds).filter((world, index, values) => (
    values.findIndex(value => value.id === world.id) === index
  ))
  affected.sort((left, right) => Number(isMasterWorld(right)) - Number(isMasterWorld(left)))
  const selectedIDs = new Set(selectedTargets.map(world => world.id))
  return {
    allowed: affected.length > 0,
    reason: affected.length > 0 ? '' : 'invalid-target',
    worlds: affected,
    addedWorlds: affected.filter(world => !selectedIDs.has(world.id))
  }
}

export function worldPrimaryAction(world, translator) {
  const status = worldRuntimeStatus(world)
  const label = (key, fallback) => typeof translator === 'function'
    ? translator(`worldRuntime.actions.${key}`)
    : fallback
  if (status === 'running') {
    return { kind: 'stop', label: label('stop', '停止'), variant: 'destructive', disabled: !canRequestStopWorld(world) }
  }
  if (status === 'stopped') {
    return { kind: 'start', label: label('start', '启动'), variant: 'default', disabled: !canStartWorld(world) }
  }
  if (status === 'failed') {
    return { kind: 'start', label: label('retry', '重试启动'), variant: 'default', disabled: !canStartWorld(world) }
  }
  if (status === 'starting') {
    return { kind: 'stop', label: label('stopStarting', '停止启动'), variant: 'destructive', disabled: !canRequestStopWorld(world) }
  }
  if (status === 'stopping') {
    return { kind: null, label: label('stopping', '停止中'), variant: 'secondary', disabled: true }
  }
  return { kind: null, label: label('unavailable', '不可操作'), variant: 'outline', disabled: true }
}

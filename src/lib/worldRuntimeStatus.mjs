const KNOWN_WORLD_STATUSES = new Set(['stopped', 'starting', 'running', 'failed', 'stopping'])

export function worldRuntimeStatus(worldOrStatus) {
  const value = typeof worldOrStatus === 'string'
    ? worldOrStatus
    : worldOrStatus?.status
  const status = String(value || '').trim().toLowerCase()
  return KNOWN_WORLD_STATUSES.has(status) ? status : 'unknown'
}

export function worldStatusLabel(worldOrStatus) {
  return {
    stopped: '已停止',
    starting: '启动中',
    running: '运行中',
    failed: '启动失败',
    stopping: '停止中',
    unknown: '状态未知'
  }[worldRuntimeStatus(worldOrStatus)]
}

export function worldStatusVariant(worldOrStatus) {
  return {
    stopped: 'secondary',
    starting: 'outline',
    running: 'default',
    failed: 'destructive',
    stopping: 'outline',
    unknown: 'outline'
  }[worldRuntimeStatus(worldOrStatus)]
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

export function canCleanFailedWorld(world) {
  return worldControlAvailable(world) && worldRuntimeStatus(world) === 'failed'
}

export function canConfigureWorld(world) {
  return worldControlAvailable(world) && worldRuntimeStatus(world) === 'stopped'
}

export function canDeleteWorld(world) {
  return worldControlAvailable(world) && worldRuntimeStatus(world) === 'stopped'
}

export function worldPrimaryAction(world) {
  const status = worldRuntimeStatus(world)
  if (status === 'running') {
    return { kind: 'stop', label: '停止', variant: 'destructive', disabled: !canStopWorld(world) }
  }
  if (status === 'stopped') {
    return { kind: 'start', label: '启动', variant: 'default', disabled: !canStartWorld(world) }
  }
  if (status === 'failed') {
    return { kind: 'start', label: '重试启动', variant: 'default', disabled: !canStartWorld(world) }
  }
  if (status === 'starting') {
    return { kind: null, label: '启动中', variant: 'secondary', disabled: true }
  }
  if (status === 'stopping') {
    return { kind: null, label: '停止中', variant: 'secondary', disabled: true }
  }
  return { kind: null, label: '不可操作', variant: 'outline', disabled: true }
}

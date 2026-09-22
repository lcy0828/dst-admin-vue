export function orderMachineTargets(targets) {
  // Connection changes and editable names must not move a row under the cursor.
  return [...targets].sort((left, right) => Number(right.kind === 'local') - Number(left.kind === 'local') || left.id.localeCompare(right.id, 'en'))
}

export function machineAddresses(target) {
  return [...new Set((target.ipAddresses || []).map(value => String(value).trim()).filter(value =>
    value && !/^(?:0\.0\.0\.0|127\.|::(?:1)?$|0:0:0:0:0:0:0:[01]$)/.test(value)
  ))].sort((a, b) => Number(a.includes(':')) - Number(b.includes(':')) || a.localeCompare(b, 'en'))
}

function timestamp(value) {
  if (typeof value === 'number') return value < 1e12 ? value * 1000 : value
  return Date.parse(value || '')
}

export function recentMachineSample(value, now = Date.now()) {
  const time = timestamp(value)
  return Number.isFinite(time) && now - time < 90000 && time - now < 30000
}

export function machinePresentation({ target, agent, infrastructure, installations = [], localStatus = {}, failed = false, installationFailed = false, now = Date.now() }) {
  const addresses = machineAddresses(target)
  const address = target.displayAddress || addresses[0] || ''
  const container = target.containerized === true || agent?.deployment_profile === 'container'
  const automaticName = target.name === target.hostname || target.name === target.agentId
  const name = target.displayNameCustom || (!automaticName && target.name && target.name !== '本机')
    ? target.name : target.kind === 'local' ? '' : (/^[a-f\d]{12,64}$/i.test(target.hostname || '') ? '' : target.hostname || '')
  const observations = (infrastructure?.machines || []).filter(item => item.targetId === target.id)
  const worlds = observations.flatMap(item => (item.worlds || []).map(world => ({
    ...world, installationId: item.installationId, observedAt: item.observedAt,
    known: Boolean(target.online && !failed && item.available && !item.stale && world.known && recentMachineSample(item.observedAt, now))
  })))
  const running = worlds.filter(world => world.known && world.running).length
  const unknown = worlds.some(world => !world.known)
  const observed = observations.length > 0 && observations.every(item => item.available && !item.stale && recentMachineSample(item.observedAt, now))
  const roomCount = new Set(worlds.map(world => world.roomId)).size
  const installs = installations.filter(item => item.targetId === target.id)
  let game = 'waiting'
  if (!target.online || failed || unknown) game = 'unknown'
  else if (running > 0) game = 'running'
  else if (installationFailed) game = 'checkFailed'
  else if (installs.length && installs.every(item => !item.error && item.installed === false && item.installationId)) game = 'missing'
  else if (installs.some(item => item.installed) && observed) game = 'stopped'
  else if (installs.some(item => item.error)) game = 'checkFailed'
  else if (!target.configured) game = 'configure'

  const local = target.kind === 'local'
  const metricTime = local ? localStatus.observedAt : agent?.metrics_observed_at
  const metricsFresh = target.online && recentMachineSample(metricTime, now) && (local ? !localStatus.stale : !agent?.metrics_stale)
  const sample = observations.filter(item => item.available && !item.stale && recentMachineSample(item.observedAt, now))
    .sort((left, right) => timestamp(right.observedAt) - timestamp(left.observedAt))[0]
  // Memory and its capacity warning must describe the same observation.
  const snapshotMemory = sample?.memory?.total_bytes > 0
  const memory = snapshotMemory ? {
    usedBytes: sample.memory.used_bytes, totalBytes: sample.memory.total_bytes, availableBytes: sample.memory.available_bytes
  } : metricsFresh ? local ? localStatus.memory : { usedBytes: agent?.memory?.allocated, totalBytes: agent?.memory?.system, availableBytes: agent?.memory?.available } : null
  const resourceFresh = Boolean(!failed && target.online && memory?.totalBytes > 0)
  const cpu = metricsFresh && !failed ? local ? localStatus.cpu?.usageAvailable ? localStatus.cpu.usage : null : agent?.cpu_usage_available ? agent.cpu_usage : null : null
  const memoryRisk = Boolean(resourceFresh && snapshotMemory && ['tight', 'critical'].includes(sample.capacity?.memoryState))
  return { target, agent, id: target.id, name, address, addresses, container, addressNeedsReview: !target.displayAddress && container,
    observations, worlds, running, unknown, roomCount, installs, game, memory, cpu, resourceFresh, memoryRisk,
    observedAt: snapshotMemory ? sample.observedAt : metricTime || observations.find(item => item.observedAt)?.observedAt,
    lastRunning: worlds.filter(world => world.running).length,
    lastWorldObservedAt: observations.map(item => item.observedAt).filter(Boolean).sort()[0],
    environment: (infrastructure?.environments || []).find(item => item.targetId === target.id),
    primary: !target.online ? 'diagnose' : game === 'missing' ? 'install' : game === 'configure' ? 'configure' : 'manage'
  }
}

import { formatSystemDateTime } from './dateTime.mjs'
import { formatDurationSeconds } from './localeFormatters.mjs'

export function hasMetric(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
}

export function percentage(value) {
  if (!hasMetric(value)) return 0
  const normalized = Math.max(0, Math.min(100, Number(value)))
  return Math.round(normalized * 10) / 10
}

export function loadPercentage(value, capacity) {
  if (!hasMetric(value) || !hasMetric(capacity) || Number(capacity) <= 0) return 0
  return percentage((Number(value) / Number(capacity)) * 100)
}

export function systemLoadSeverity(value, capacity) {
  if (!hasMetric(value) || !hasMetric(capacity) || Number(capacity) <= 0) {
    return { key: 'unavailable', percent: null }
  }

  const ratio = Math.max(0, Number(value) / Number(capacity))
  const percent = Math.round(ratio * 100)
  if (ratio >= 1) return { key: 'overloaded', percent }
  if (ratio >= 0.7) return { key: 'elevated', percent }
  return { key: 'normal', percent }
}

export function formatMemory(value) {
  if (!hasMetric(value)) return '--'
  return Number(value) < 1024 ? `${Number(value).toFixed(2)} MB` : `${(Number(value) / 1024).toFixed(2)} GB`
}

export function formatDisk(value) {
  return hasMetric(value) ? `${Number(value).toFixed(2)} GB` : '--'
}

export function formatDecimal(value) {
  return hasMetric(value) ? Number(value).toFixed(2) : '--'
}

export function formatResourceDateTime(value, locale = 'zh-CN') {
  return formatSystemDateTime(value, {
    locale,
    fallback: value ? String(value) : '--',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

export function formatSystemUptime(status = {}, translator) {
  const seconds = status.uptime_seconds ?? status.uptime
  if (hasMetric(seconds) && typeof translator === 'function') return formatDurationSeconds(seconds, translator)
  return status.uptime_formatted || '--'
}

function bytesToMiB(value) {
  const bytes = Number(value)
  return Number.isFinite(bytes) && bytes >= 0 ? bytes / (1024 * 1024) : null
}

function bytesToGiB(value) {
  const bytes = Number(value)
  return Number.isFinite(bytes) && bytes >= 0 ? bytes / (1024 * 1024 * 1024) : null
}

function metricValue(available, value) {
  return available && hasMetric(value) ? Number(value) : null
}

export function remoteAgentResourceStatus(agent = {}, target = {}) {
  const metrics = agent.metrics || {}
  const memoryTotal = bytesToMiB(metrics.memoryTotal)
  const memoryUsed = bytesToMiB(metrics.memoryUsed)
  const memoryAvailable = bytesToMiB(metrics.memoryAvailable)
  const cpuAvailable = metrics.cpuUsageAvailable === true || (Array.isArray(metrics.cpuCoreUsage) && metrics.cpuCoreUsage.length > 0)
  const diskAvailable = metrics.diskUsageAvailable === true || Number(metrics.diskTotal) > 0
  const loadSupported = metrics.loadSupported === true

  return {
    mode: 'target',
    hostname: agent.hostname || '',
    os_info: [agent.os, agent.arch].filter(Boolean).join(' '),
    cpu_model: metrics.cpuModel || agent.hostname || agent.displayName || agent.id || '--',
    cpu_cores: metrics.physicalCores || null,
    cpu_threads: metrics.logicalProcessors || metrics.cpuCount || null,
    cpu_usage: metricValue(cpuAvailable, metrics.cpuUsage),
    cpu_core_usage: cpuAvailable && Array.isArray(metrics.cpuCoreUsage) ? metrics.cpuCoreUsage : [],
    cpu_load1: metricValue(loadSupported, metrics.load1),
    cpu_load5: metricValue(loadSupported, metrics.load5),
    cpu_load15: metricValue(loadSupported, metrics.load15),
    total_memory: memoryTotal,
    used_memory: memoryUsed,
    free_memory: memoryAvailable,
    memory_usage: memoryTotal > 0 && memoryUsed !== null ? (memoryUsed / memoryTotal) * 100 : null,
    total_disk: diskAvailable ? bytesToGiB(metrics.diskTotal) : null,
    used_disk: diskAvailable ? bytesToGiB(metrics.diskUsed) : null,
    free_disk: diskAvailable ? bytesToGiB(metrics.diskAvailable) : null,
    disk_usage: metricValue(diskAvailable, metrics.diskUsage),
    disk_path: diskAvailable ? metrics.diskPath || '' : '',
    uptime_seconds: metrics.uptimeSeconds ?? null,
    current_time: metrics.observedAt || agent.lastReportAt || agent.lastHeartbeat || null,
    warnings: [],
    application: {
      targetId: target.targetId || `agent:${agent.id || ''}`,
      targetName: agent.displayName || agent.hostname || target.targetName || agent.id || '--',
      agentVersion: agent.version || '',
      metricsStale: agent.metricsStale === true
    }
  }
}

export function nodeResourceStatus(node = {}, target = {}) {
  const host = node.host || {}
  const cpu = node.cpu || {}
  const memory = node.memory || {}
  const disk = node.disk || {}
  const cpuUsageAvailable = cpu.usageAvailable === true
  const memoryAvailable = memory.available === true
  const diskAvailable = disk.available === true
  const loadSupported = cpu.loadSupported === true
  const memoryTotal = memoryAvailable ? bytesToMiB(memory.totalBytes) : null
  const memoryUsed = memoryAvailable ? bytesToMiB(memory.usedBytes) : null

  return {
    mode: 'target',
    hostname: host.hostname || '',
    os_info: [host.platform, host.version, host.architecture].filter(Boolean).join(' '),
    cpu_model: cpu.available ? cpu.model || node.name || '--' : null,
    cpu_cores: cpu.available && Number(cpu.cores) > 0 ? Number(cpu.cores) : null,
    cpu_threads: cpu.available && Number(cpu.threads) > 0 ? Number(cpu.threads) : null,
    cpu_usage: metricValue(cpuUsageAvailable, cpu.usage),
    cpu_core_usage: cpuUsageAvailable && Array.isArray(cpu.coreUsage) ? cpu.coreUsage : [],
    cpu_load1: metricValue(loadSupported, cpu.load1),
    cpu_load5: metricValue(loadSupported, cpu.load5),
    cpu_load15: metricValue(loadSupported, cpu.load15),
    total_memory: memoryTotal,
    used_memory: memoryUsed,
    free_memory: memoryAvailable ? bytesToMiB(memory.availableBytes) : null,
    memory_usage: memoryAvailable && hasMetric(memory.usage)
      ? Number(memory.usage)
      : (memoryTotal > 0 && memoryUsed !== null ? (memoryUsed / memoryTotal) * 100 : null),
    total_disk: diskAvailable ? bytesToGiB(disk.totalBytes) : null,
    used_disk: diskAvailable ? bytesToGiB(disk.usedBytes) : null,
    free_disk: diskAvailable ? bytesToGiB(disk.availableBytes) : null,
    disk_usage: metricValue(diskAvailable, disk.usage),
    disk_path: diskAvailable ? disk.path || '' : '',
    uptime_seconds: host.available ? host.uptimeSeconds ?? null : null,
    current_time: node.observedAt || node.receivedAt || null,
    warnings: Array.isArray(node.warnings) ? node.warnings : [],
    application: {
      targetId: node.targetId || target.targetId || '',
      targetName: node.name || target.targetName || host.hostname || '--',
      agentVersion: node.agentVersion || '',
      nodeKind: node.kind || '',
      nodeOnline: node.online !== false,
      metricsStale: node.stale === true,
      staleReason: node.staleReason || ''
    }
  }
}

function resourceWarningState(resource = {}, options = {}) {
  if (options.online === false) return { key: 'offline', alert: true }
  if (options.stale === true) return { key: 'stale', alert: true }

  const capacity = resource.cpu_threads || resource.cpu_cores
  const load = systemLoadSeverity(resource.cpu_load5, capacity)
  if (
    percentage(resource.cpu_usage) >= 90 ||
    percentage(resource.memory_usage) >= 90 ||
    percentage(resource.disk_usage) >= 90 ||
    load.key === 'overloaded'
  ) {
    return { key: 'warning', alert: true }
  }
  const required = [resource.cpu_usage, resource.memory_usage, resource.disk_usage]
  if (required.some(value => !hasMetric(value))) return { key: 'incomplete', alert: true }
  return { key: 'healthy', alert: false }
}

function fleetMachine(input = {}) {
  const resource = input.resource || {}
  const warning = resourceWarningState(resource, input)
  return {
    id: input.id || '',
    kind: input.kind || 'agent',
    name: input.name || input.id || '--',
    hostname: input.hostname || resource.hostname || '',
    online: input.online !== false,
    stale: input.stale === true,
    state: warning.key,
    alert: warning.alert,
    resource
  }
}

export function fleetResourceStatus(controllerStatus = {}, agentCollection = {}, controllerName = '') {
  const agents = Array.isArray(agentCollection) ? agentCollection : (agentCollection?.items || [])
  const controller = fleetMachine({
    id: 'local',
    kind: 'local',
    name: controllerName || controllerStatus.hostname || 'Local',
    hostname: controllerStatus.hostname || '',
    online: true,
    stale: false,
    resource: { ...controllerStatus, mode: 'target' }
  })
  const machines = [controller, ...agents.map(agent => fleetMachine({
    id: `agent:${agent.id || ''}`,
    kind: 'agent',
    name: agent.displayName || agent.hostname || agent.id || '--',
    hostname: agent.hostname || '',
    online: agent.status === 'online',
    stale: agent.metricsStale === true,
    resource: remoteAgentResourceStatus(agent)
  }))]

  return {
    mode: 'fleet',
    machines,
    summary: {
      total: machines.length,
      online: machines.filter(machine => machine.online).length,
      alerts: machines.filter(machine => machine.alert).length
    },
    current_time: controllerStatus.current_time || new Date().toISOString()
  }
}

export function fleetNodeResourceStatus(snapshot = {}, controllerName = '') {
  const nodes = Array.isArray(snapshot) ? snapshot : (snapshot?.items || [])
  const machines = nodes.map(node => fleetMachine({
    id: node.targetId || '',
    kind: node.kind || 'agent',
    name: node.kind === 'local' && controllerName ? controllerName : node.name || node.targetId || '--',
    hostname: node.host?.hostname || '',
    online: node.online !== false,
    stale: node.stale === true,
    resource: nodeResourceStatus(node)
  }))

  return {
    mode: 'fleet',
    machines,
    summary: {
      total: machines.length,
      online: machines.filter(machine => machine.online).length,
      alerts: machines.filter(machine => machine.alert).length
    },
    current_time: snapshot?.observedAt || new Date().toISOString()
  }
}

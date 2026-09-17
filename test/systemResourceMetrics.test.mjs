import test from 'node:test'
import assert from 'node:assert/strict'

import {
	 fleetNodeResourceStatus,
  fleetResourceStatus,
	 nodeResourceStatus,
  remoteAgentResourceStatus,
  systemLoadSeverity
} from '../src/lib/systemResourceMetrics.mjs'

test('canonical node resources render local and Agent metrics through one shape', () => {
  const observedAt = '2026-08-28T10:00:00Z'
  const remote = {
    targetId: 'agent:debian12',
    name: 'Debian 12',
    kind: 'agent',
    online: true,
    stale: false,
    agentVersion: '2.9.1',
    observedAt,
    host: { available: true, hostname: 'debian12', platform: 'linux', architecture: 'amd64', uptimeSeconds: 3600 },
    cpu: { available: true, usageAvailable: true, cores: 8, threads: 16, usage: 12.5, coreUsage: [10, 15], loadSupported: true, load1: 1, load5: 0.5, load15: 0.25 },
    memory: { available: true, totalBytes: 8 * 1024 ** 3, usedBytes: 2 * 1024 ** 3, availableBytes: 6 * 1024 ** 3, usage: 25 },
    disk: { available: true, path: '/srv', totalBytes: 100 * 1024 ** 3, usedBytes: 20 * 1024 ** 3, availableBytes: 80 * 1024 ** 3, usage: 20 },
    warnings: []
  }
  const status = nodeResourceStatus(remote)
  assert.equal(status.cpu_usage, 12.5)
  assert.equal(status.total_memory, 8192)
  assert.equal(status.total_disk, 100)
  assert.equal(status.application.targetId, 'agent:debian12')

  const fleet = fleetNodeResourceStatus({
    observedAt,
    items: [
      { ...remote, targetId: 'local', kind: 'local', name: 'controller' },
      remote
    ]
  }, '控制机')
  assert.equal(fleet.machines.length, 2)
  assert.equal(fleet.machines[0].name, '控制机')
  assert.equal(fleet.machines[1].resource.cpu_threads, 16)
})

test('system load severity compares the five-minute load with logical CPU capacity', () => {
  assert.deepEqual(systemLoadSeverity(4.43, 12), {
    key: 'normal',
    percent: 37
  })
  assert.deepEqual(systemLoadSeverity(8.4, 12), {
    key: 'elevated',
    percent: 70
  })
  assert.deepEqual(systemLoadSeverity(12, 12), {
    key: 'overloaded',
    percent: 100
  })
  assert.deepEqual(systemLoadSeverity(18, 12), {
    key: 'overloaded',
    percent: 150
  })
})

test('system load severity reports unavailable metrics safely', () => {
  const unavailable = { key: 'unavailable', percent: null }
  assert.deepEqual(systemLoadSeverity(null, 12), unavailable)
  assert.deepEqual(systemLoadSeverity(4, 0), unavailable)
  assert.deepEqual(systemLoadSeverity('invalid', 12), unavailable)
})

test('remote agent metrics use the same fields as controller metrics', () => {
  const status = remoteAgentResourceStatus({
    id: 'worker-a',
    hostname: 'worker-a.local',
    version: '2.9.0',
    status: 'online',
    metrics: {
      physicalCores: 6,
      logicalProcessors: 12,
      cpuModel: 'Test CPU',
      cpuUsage: 25,
      cpuCoreUsage: [10, 40],
      cpuUsageAvailable: true,
      load1: 1,
      load5: 2,
      load15: 3,
      loadSupported: true,
      memoryTotal: 8 * 1024 ** 3,
      memoryUsed: 2 * 1024 ** 3,
      memoryAvailable: 6 * 1024 ** 3,
      diskTotal: 100 * 1024 ** 3,
      diskUsed: 40 * 1024 ** 3,
      diskAvailable: 60 * 1024 ** 3,
      diskUsage: 40,
      diskUsageAvailable: true
    }
  })

  assert.equal(status.cpu_usage, 25)
  assert.equal(status.total_memory, 8192)
  assert.equal(status.used_memory, 2048)
  assert.equal(status.total_disk, 100)
  assert.equal(status.disk_usage, 40)
  assert.equal(status.cpu_load5, 2)
  assert.equal(status.application.agentVersion, '2.9.0')
})

test('remote agent metrics preserve valid zero samples', () => {
  const status = remoteAgentResourceStatus({
    metrics: {
      cpuUsage: 0,
      cpuUsageAvailable: true,
      load1: 0,
      load5: 0,
      load15: 0,
      loadSupported: true,
      diskTotal: 100,
      diskUsage: 0,
      diskUsageAvailable: true
    }
  })

  assert.equal(status.cpu_usage, 0)
  assert.equal(status.cpu_load1, 0)
  assert.equal(status.disk_usage, 0)
})

test('fleet summary counts machines and warnings without averaging unrelated hosts', () => {
  const controller = {
    hostname: 'controller',
    cpu_usage: 20,
    cpu_threads: 8,
    cpu_load5: 1,
    memory_usage: 30,
    disk_usage: 40
  }
  const fleet = fleetResourceStatus(controller, { items: [
    {
      id: 'healthy',
      status: 'online',
      metrics: {
        logicalProcessors: 4,
        cpuUsage: 10,
        cpuCoreUsage: [10],
        cpuUsageAvailable: true,
        memoryTotal: 1024,
        memoryUsed: 256,
        diskTotal: 1000,
        diskUsed: 200,
        diskUsage: 20,
        diskUsageAvailable: true
      }
    },
    { id: 'offline', status: 'offline', metrics: {} }
  ] }, '控制机')

  assert.equal(fleet.mode, 'fleet')
  assert.deepEqual(fleet.summary, { total: 3, online: 2, alerts: 1 })
  assert.equal(fleet.machines[0].name, '控制机')
  assert.equal(fleet.machines[2].state, 'offline')
  assert.equal(fleet.cpu_usage, undefined)
})

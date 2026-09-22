import test from 'node:test'
import assert from 'node:assert/strict'
import { machineAddresses, machinePresentation, orderMachineTargets } from '../src/lib/machineManagement.mjs'
import { machineMessages } from '../src/i18n/machineMessages.js'

const now = Date.parse('2026-09-20T01:00:00Z')
const observedAt = new Date(now - 1000).toISOString()

test('machine order stays stable when connectivity and names change', () => {
  const values = [{ id: 'agent:b', kind: 'agent', online: true }, { id: 'local', kind: 'local' }, { id: 'agent:a', kind: 'agent', online: false }]
  const before = orderMachineTargets(values).map(item => item.id)
  values.reverse(); values[0].online = true; values[0].name = 'Renamed'
  assert.deepEqual(orderMachineTargets(values).map(item => item.id), before)
  assert.equal(before[0], 'local')
})
function fixture() {
  return { now, target: { id: 'local', kind: 'local', online: true, configured: true, name: '本机', containerized: true, hostname: 'abcd12345678', ipAddresses: ['172.18.0.2'] },
    localStatus: { observedAt, cpu: { usage: 0, usageAvailable: true }, memory: { usedBytes: 2e9, totalBytes: 4e9 } },
    infrastructure: { machines: [{ targetId: 'local', installationId: 'default', available: true, stale: false, observedAt, capacity: { memoryState: 'healthy' }, worlds: [
      { roomId: 'room', worldId: 'master', running: true, known: true }, { roomId: 'room', worldId: 'caves', running: true, known: true },
    ] }] }, installations: [{ targetId: 'local', installationId: 'default', installed: true }] }
}

test('machine addresses stay stable and display override does not replace reported addresses', () => {
  const input = fixture()
  input.target.ipAddresses = ['::', '127.0.0.1', '192.168.1.4', '2001:db8::4', '192.168.1.2', '192.168.1.4']
  assert.deepEqual(machineAddresses(input.target), ['192.168.1.2', '192.168.1.4', '2001:db8::4'])
  assert.equal(machinePresentation(input).addressNeedsReview, true)
  input.target.displayAddress = 'dst.example.com'
  const view = machinePresentation(input)
  assert.equal(view.address, 'dst.example.com'); assert.equal(view.addressNeedsReview, false)
  assert.equal(view.addresses.length, 3); assert.equal(view.name, '')
  input.target.displayNameCustom = true; input.target.name = 'abcd12345678'
  assert.equal(machinePresentation(input).name, 'abcd12345678')
})

test('local and remote worlds share counts; disconnected data is historical, never a stopped world', () => {
  const input = fixture()
  let view = machinePresentation(input)
  assert.equal(view.running, 2); assert.equal(view.roomCount, 1); assert.equal(view.game, 'running'); assert.equal(view.cpu, 0)
  input.target.online = false
  view = machinePresentation(input)
  assert.equal(view.game, 'unknown'); assert.equal(view.running, 0); assert.equal(view.lastRunning, 2)
  assert.equal(view.resourceFresh, false); assert.equal(view.primary, 'diagnose')
  assert.equal(view.worlds.every(world => !world.known), true)
})

test('stale or failed observations do not look current and do not generate zero metrics', () => {
  const input = fixture(); input.now += 100000
  let view = machinePresentation(input)
  assert.equal(view.game, 'unknown'); assert.equal(view.cpu, null); assert.equal(view.resourceFresh, false)
  input.now = now; input.failed = true
  view = machinePresentation(input)
  assert.equal(view.game, 'unknown'); assert.equal(view.resourceFresh, false)
})

test('configured paths are not proof of installation; multi-installation room counts are deduplicated', () => {
  const input = fixture(); input.infrastructure.machines[0].worlds = []; input.installations = []
  assert.equal(machinePresentation(input).game, 'waiting')
  input.installations = [{ targetId: 'local', installationId: 'default', installed: false }]
  assert.equal(machinePresentation(input).primary, 'install')
  input.installations[0].error = 'inspection failed'
  assert.equal(machinePresentation(input).game, 'checkFailed')
  const populated = fixture()
  populated.infrastructure.machines.push({ ...populated.infrastructure.machines[0], installationId: 'second', worlds: [{ roomId: 'room', worldId: 'extra', known: true, running: true }] })
  assert.equal(machinePresentation(populated).roomCount, 1)
  assert.equal(machinePresentation(populated).running, 3)
})

test('machine translations have complete bilingual coverage', () => {
  assert.deepEqual(Object.keys(machineMessages['zh-CN'].machines).sort(), Object.keys(machineMessages['en-US'].machines).sort())
  assert.doesNotMatch(JSON.stringify(machineMessages['en-US']), /[\u3400-\u9fff]/)
})

test('memory warning and displayed usage come from the same snapshot', () => {
  const input = fixture()
  input.infrastructure.machines[0].memory = { used_bytes: 3.8e9, total_bytes: 4e9, available_bytes: 2e8 }
  input.infrastructure.machines[0].capacity.memoryState = 'critical'
  const view = machinePresentation(input)
  assert.equal(view.memoryRisk, true)
  assert.equal(view.memory.usedBytes, 3.8e9)
  assert.equal(view.memory.availableBytes, 2e8)
  assert.equal(view.cpu, 0)
})

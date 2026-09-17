import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canCleanFailedWorld,
  canConfigureWorld,
  canDeleteWorld,
  canStartWorld,
  canRequestStopWorld,
  canStopWorld,
  compareWorldRoles,
  isWorldStarting,
  isWorldPaused,
  isWorldSaveWriteFailed,
  isMasterWorld,
  worldActionRequiresConfirmation,
  worldControlAvailable,
  worldLifecycleScope,
  worldLifecycleSelection,
  worldPrimaryAction,
  worldRuntimeStatus,
  worldStatusLabel,
  worldStatusMessage,
  worldStatusCode,
  worldStatusVariant
} from '../src/lib/worldRuntimeStatus.mjs'

test('main-shard ordering follows explicit role and flags instead of name, type, or runtime state', () => {
  const worlds = [
    { id: 'named-master', name: 'Master', directoryName: 'Master', role: 'custom', type: 'forest', status: 'running' },
    { id: 'caves', name: 'Caves', role: 'caves', status: 'running' },
    { id: 'actual-master', name: 'Z World 99', role: 'master', type: 'cave', status: 'stopped' }
  ]
  assert.deepEqual([...worlds].sort(compareWorldRoles).map(world => world.id), ['actual-master', 'named-master', 'caves'])
  assert.equal(compareWorldRoles({ isMaster: true }, { isMaster: false }), -1)
  assert.equal(compareWorldRoles({ is_master: false }, { is_master: true }), 1)
  assert.equal(compareWorldRoles({ worldRole: 'master' }, { worldRole: 'caves' }), -1)
  assert.equal(compareWorldRoles({ name: 'Master' }, { name: 'Caves' }), 0)
  assert.equal(compareWorldRoles(null, {}), 0)
})

test('world status presentation covers every backend runtime state', () => {
  assert.equal(worldRuntimeStatus('RUNNING'), 'running')
  assert.equal(worldRuntimeStatus({ status: 'starting' }), 'starting')
  assert.equal(worldRuntimeStatus({ status: 'unexpected' }), 'unknown')
  assert.equal(worldStatusLabel('stopped'), '已停止')
  assert.equal(worldStatusLabel('starting'), '启动中')
  assert.equal(worldStatusLabel('running'), '运行中')
  assert.equal(worldStatusLabel('failed'), '启动失败')
  assert.equal(worldStatusLabel('unknown'), '状态未知')
  assert.equal(worldStatusVariant('running'), 'success')
  assert.equal(worldStatusVariant('starting'), 'warning')
  assert.equal(worldStatusVariant('stopped'), 'outline')
  assert.equal(worldStatusVariant('failed'), 'destructive')
  assert.equal(worldStatusVariant('unknown'), 'outline')
  assert.equal(worldStatusLabel({ status: 'running', statusCode: 'SAVE_WRITE_FAILED' }), '保存异常')
  assert.equal(worldStatusVariant({ status: 'running', statusCode: 'SAVE_WRITE_FAILED' }), 'destructive')
  assert.equal(isWorldStarting('starting'), true)
})

test('pause is an optional observation and does not change lifecycle controls', () => {
  const world = { status: 'running', paused: true, controlAvailable: true }
  assert.equal(worldStatusLabel(world), '运行中 · 已暂停')
  assert.equal(worldStatusVariant(world), 'info')
  assert.equal(isWorldPaused(world), true)
  assert.equal(worldRuntimeStatus(world), 'running')
  assert.equal(canStopWorld(world), true)
  assert.equal(canStartWorld(world), false)
  assert.equal(worldPrimaryAction(world).kind, 'stop')
  for (const paused of [undefined, null, false, 'true']) {
    assert.equal(worldStatusLabel({ ...world, paused }), '运行中')
    assert.equal(isWorldPaused({ ...world, paused }), false)
  }
  assert.equal(worldStatusLabel({ ...world, status: 'stopped' }), '已停止')
  assert.equal(worldStatusLabel({ ...world, status: 'failed' }), '启动失败')
  assert.equal(worldStatusLabel({ ...world, statusCode: 'SAVE_WRITE_FAILED' }), '保存异常')
  assert.equal(worldStatusVariant({ ...world, statusCode: 'SAVE_WRITE_FAILED' }), 'destructive')
  assert.equal(worldStatusLabel(world, key => key), 'worldRuntime.statuses.paused')
})

test('world status reads v2 and legacy adapter fields', () => {
  assert.equal(worldStatusMessage({ statusMessage: 'v2 failure' }), 'v2 failure')
  assert.equal(worldStatusMessage({ status_message: 'legacy failure' }), 'legacy failure')
  assert.equal(worldControlAvailable({ controlAvailable: false }), false)
  assert.equal(worldControlAvailable({ control_available: false }), false)
  assert.equal(worldControlAvailable({ controlAvailable: true }), true)
  assert.equal(worldStatusCode({ status_code: 'save_write_failed' }), 'SAVE_WRITE_FAILED')
  assert.equal(isWorldSaveWriteFailed({ status: 'running', status_code: 'SAVE_WRITE_FAILED' }), true)
  assert.equal(isWorldSaveWriteFailed({ status: 'failed', status_code: 'SAVE_WRITE_FAILED' }), false)
  assert.equal(canStopWorld({ status: 'running', statusCode: 'SAVE_WRITE_FAILED', controlAvailable: true }), true)
})

test('starting blocks duplicate starts but permits a graceful stop request', () => {
  assert.equal(canStartWorld({ status: 'starting', controlAvailable: true }), false)
  assert.equal(canStopWorld({ status: 'starting', controlAvailable: true }), false)
  assert.equal(canRequestStopWorld({ status: 'starting', controlAvailable: true }), true)
  assert.deepEqual(worldPrimaryAction({ status: 'starting', controlAvailable: true }), {
    kind: 'stop',
    label: '停止启动',
    variant: 'destructive',
    disabled: false
  })

  assert.equal(canStartWorld({ status: 'failed', control_available: true }), true)
  assert.equal(canCleanFailedWorld({ status: 'failed', control_available: true }), true)
  assert.equal(canDeleteWorld({ status: 'failed', control_available: true }), false)
  assert.equal(canConfigureWorld({ status: 'failed', control_available: true }), false)
  assert.deepEqual(worldPrimaryAction({ status: 'failed', control_available: true }), {
    kind: 'start',
    label: '重试启动',
    variant: 'default',
    disabled: false
  })
})

test('control capability overrides otherwise valid actions', () => {
  assert.equal(canStartWorld({ status: 'stopped', controlAvailable: false }), false)
  assert.equal(canStartWorld({ status: 'failed', control_available: false }), false)
  assert.equal(canStopWorld({ status: 'running', controlAvailable: false }), false)
  assert.equal(canRequestStopWorld({ status: 'starting', controlAvailable: false }), false)
  assert.equal(canCleanFailedWorld({ status: 'failed', controlAvailable: false }), false)
  assert.equal(canDeleteWorld({ status: 'stopped', controlAvailable: false }), false)
  assert.equal(canConfigureWorld({ status: 'stopped', controlAvailable: false }), false)
  assert.equal(worldPrimaryAction({ status: 'running', controlAvailable: false }).disabled, true)
  assert.equal(worldPrimaryAction({ status: 'unknown', controlAvailable: true }).disabled, true)
})

test('only disruptive world actions require confirmation', () => {
  assert.equal(worldActionRequiresConfirmation('start'), false)
  assert.equal(worldActionRequiresConfirmation('stop'), true)
  assert.equal(worldActionRequiresConfirmation('restart'), true)
  assert.equal(worldActionRequiresConfirmation('cleanup'), true)
  assert.equal(worldActionRequiresConfirmation(''), false)
})

test('dependent start includes a stopped Master and skips an active Master', () => {
  const master = { id: 'master', role: 'master', status: 'stopped', controlAvailable: true }
  const caves = { id: 'caves', role: 'caves', status: 'stopped', controlAvailable: true }

  assert.equal(isMasterWorld(master), true)
  assert.deepEqual(worldLifecycleScope([caves, master], caves, 'start').worlds.map(world => world.id), [
    'master',
    'caves'
  ])

  master.status = 'running'
  assert.deepEqual(worldLifecycleScope([caves, master], caves, 'start').worlds.map(world => world.id), ['caves'])
})

test('explicit Master identity wins over stale legacy role and directory fallbacks', () => {
  assert.equal(isMasterWorld({ isMaster: false, role: 'master', directoryName: 'Master' }), false)
  assert.equal(isMasterWorld({ is_master: false, role: 'master', directory_name: 'Master' }), false)
  assert.equal(isMasterWorld({ isMaster: true, role: 'caves', type: 'cave', directoryName: 'CavePrime' }), true)
})

test('Master stop and restart include only active dependent worlds', () => {
  const master = { id: 'master', isMaster: true, status: 'running', controlAvailable: true }
  const caves = { id: 'caves', role: 'caves', status: 'starting', controlAvailable: false }
  const ocean = { id: 'ocean', role: 'custom', status: 'stopped', controlAvailable: true }

  for (const action of ['stop', 'restart']) {
    const scope = worldLifecycleScope([master, caves, ocean], master, action)
    assert.equal(scope.allowed, true)
    assert.deepEqual(scope.worlds.map(world => world.id), ['master', 'caves'])
    assert.deepEqual(scope.addedWorlds.map(world => world.id), ['caves'])
  }
})

test('dependent start blocks while Master state cannot be trusted', () => {
  const caves = { id: 'caves', role: 'caves', status: 'stopped', controlAvailable: true }
  const unknownMaster = { id: 'master', role: 'master', status: 'unknown', controlAvailable: true }
  const unavailableMaster = { id: 'master', role: 'master', status: 'failed', controlAvailable: false }

  assert.deepEqual(worldLifecycleScope([unknownMaster, caves], caves, 'start'), {
    allowed: false,
    reason: 'master-state-unknown',
    worlds: [],
    addedWorlds: []
  })
  assert.equal(worldLifecycleScope([unavailableMaster, caves], caves, 'start').reason, 'master-unavailable')
})

test('multi-world lifecycle selection deduplicates the shared Master dependency', () => {
  const master = { id: 'master', role: 'master', status: 'stopped', controlAvailable: true }
  const caves = { id: 'caves', role: 'caves', status: 'stopped', controlAvailable: true }
  const ocean = { id: 'ocean', role: 'custom', status: 'failed', controlAvailable: true }
  const scope = worldLifecycleSelection([ocean, caves, master], [caves, ocean], 'start')

  assert.equal(scope.allowed, true)
  assert.deepEqual(scope.worlds.map(world => world.id), ['master', 'caves', 'ocean'])
  assert.deepEqual(scope.addedWorlds.map(world => world.id), ['master'])
})

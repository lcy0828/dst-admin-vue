import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canCleanFailedWorld,
  canConfigureWorld,
  canDeleteWorld,
  canStartWorld,
  canRequestStopWorld,
  canStopWorld,
  isWorldStarting,
  worldControlAvailable,
  worldPrimaryAction,
  worldRuntimeStatus,
  worldStatusLabel,
  worldStatusMessage,
  worldStatusVariant
} from '../src/lib/worldRuntimeStatus.mjs'

test('world status presentation covers every backend runtime state', () => {
  assert.equal(worldRuntimeStatus('RUNNING'), 'running')
  assert.equal(worldRuntimeStatus({ status: 'starting' }), 'starting')
  assert.equal(worldRuntimeStatus({ status: 'unexpected' }), 'unknown')
  assert.equal(worldStatusLabel('stopped'), '已停止')
  assert.equal(worldStatusLabel('starting'), '启动中')
  assert.equal(worldStatusLabel('running'), '运行中')
  assert.equal(worldStatusLabel('failed'), '启动失败')
  assert.equal(worldStatusVariant('failed'), 'destructive')
  assert.equal(isWorldStarting('starting'), true)
})

test('world status reads v2 and legacy adapter fields', () => {
  assert.equal(worldStatusMessage({ statusMessage: 'v2 failure' }), 'v2 failure')
  assert.equal(worldStatusMessage({ status_message: 'legacy failure' }), 'legacy failure')
  assert.equal(worldControlAvailable({ controlAvailable: false }), false)
  assert.equal(worldControlAvailable({ control_available: false }), false)
  assert.equal(worldControlAvailable({ controlAvailable: true }), true)
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

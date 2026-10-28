import assert from 'node:assert/strict'
import test from 'node:test'
import {
  effectiveWorldRuntimeMode,
  resolveRuntimeSelection,
  runtimeModeSummary,
  runtimeRequestOptions,
} from '../src/lib/runtimeModeInheritance.mjs'

test('ordinary start and restart inherit without a selection dialog or capability request', async () => {
  const unexpected = () => { throw new Error('ordinary operation must not open the chooser') }
  assert.deepEqual(await resolveRuntimeSelection({ room_id: 'room' }, unexpected, unexpected), {})
  assert.deepEqual(runtimeRequestOptions({}), {})
  assert.deepEqual(runtimeRequestOptions({ runtimeMode: 'game' }), { runtimeMode: 'game' })
})

test('explicit modes and version checks survive both adapter naming conventions', async () => {
  const unexpected = () => { throw new Error('explicit selection must not reopen the chooser') }
  assert.deepEqual(await resolveRuntimeSelection({ runtime_mode: 'luajit', runtime_version: '3.4.0' }, unexpected, unexpected), { runtimeMode: 'luajit', runtimeVersion: '3.4.0' })
  assert.deepEqual(runtimeRequestOptions({ runtimeMode: 'arena-gc', runtimeVersion: '3.4.0' }), { runtimeMode: 'arena-gc', runtimeVersion: '3.4.0' })
})

test('optional chooser uses the selected room and never silently converts cancellation into Game Lua', async () => {
  const availability = { selectionState: 'mixed', worlds: [{ worldId: 'master', effectiveMode: 'luajit' }] }
  const input = { room_id: 'room', choose_runtime_mode: true }
  const chosen = await resolveRuntimeSelection(input, async value => {
    assert.equal(value, input)
    return { data: availability }
  }, async value => {
    assert.equal(value, availability)
    return { value: 'game', version: 'game' }
  })
  assert.deepEqual(chosen, { runtimeMode: 'game', runtimeVersion: 'game' })
  await assert.rejects(resolveRuntimeSelection(input, async () => availability, async () => { throw new Error('cancelled') }), /cancelled/)
  await assert.rejects(resolveRuntimeSelection(input, async () => availability, async () => ({ value: 'mixed' })), /INVALID_RUNTIME_SELECTION/)
})

test('runtime display uses the current process when active and remembered mode when stopped', () => {
  assert.equal(effectiveWorldRuntimeMode({ status: 'running', runtimeMode: 'luajit', preferredRuntimeMode: 'game' }), 'luajit')
  assert.equal(effectiveWorldRuntimeMode({ status: 'stopped', runtimeMode: 'game', preferredRuntimeMode: 'luajit' }), 'luajit')
  assert.equal(effectiveWorldRuntimeMode({ status: 'running', preferredRuntimeMode: 'luajit' }), '')
  assert.equal(effectiveWorldRuntimeMode({ status: 'running', runtimeMode: 'unknown' }), '')
  assert.equal(effectiveWorldRuntimeMode({ status: 'unknown', preferredRuntimeMode: 'game' }), '')
})

test('mixed and unknown world selections cannot be presented as a Game Lua default', () => {
  assert.equal(runtimeModeSummary([{ status: 'running', runtimeMode: 'luajit' }, { status: 'stopped', preferredRuntimeMode: 'game' }]), 'mixed')
  assert.equal(runtimeModeSummary([{ status: 'running' }, { status: 'stopped', preferredRuntimeMode: 'game' }]), 'unknown')
  assert.equal(runtimeModeSummary([{ status: 'stopped', preferredRuntimeMode: 'luajit' }]), 'luajit')
})

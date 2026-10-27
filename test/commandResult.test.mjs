import test from 'node:test'
import assert from 'node:assert/strict'
import { commandResultState, receiptCheckState, canRefreshCommandReceipt } from '../src/lib/commandResult.mjs'

test('Command results distinguish zero, empty capture, missing capture, failure and uncertainty', () => {
  assert.equal(commandResultState({ status: 'sending' }), 'waiting')
  assert.equal(commandResultState({ status: 'succeeded', output: { text: '0\n' } }), 'output')
  assert.equal(commandResultState({ status: 'succeeded', output: { text: '', truncated: false } }), 'no_output')
  assert.equal(commandResultState({ status: 'succeeded' }), 'output_unavailable')
  assert.equal(commandResultState({ status: 'failed', output: { text: 'partial output' } }), 'failed')
  for (const status of ['sent', 'uncertain', 'unresponsive']) {
    assert.equal(commandResultState({ status }), 'unconfirmed')
  }
  // Old controllers without resultState keep the same visible evidence rules.
  assert.equal(commandResultState({ status: 'sent', resultState: 'output', output: { text: 'old' } }), 'unconfirmed')
})

test('Receipt lookup is limited to eligible unconfirmed runs before their deadline', () => {
  const now = Date.now()
  const run = { status: 'uncertain', receiptRefreshUntil: new Date(now + 1000).toISOString() }
  assert.equal(canRefreshCommandReceipt(run, now), true)
  assert.equal(canRefreshCommandReceipt(run, now + 1000), false)
  assert.equal(receiptCheckState(run, now + 1000), 'expired')
  for (const status of ['succeeded', 'failed', 'sent', 'sending']) {
    assert.equal(canRefreshCommandReceipt({ ...run, status }, now), false)
  }
  for (const status of ['not_found', 'unavailable']) {
    const checked = { ...run, receiptCheck: { status } }
    assert.equal(canRefreshCommandReceipt(checked, now), true)
    assert.equal(receiptCheckState(checked, now), status)
  }
  assert.equal(canRefreshCommandReceipt({ ...run, receiptCheck: { status: 'unsupported' } }, now), false)
  assert.equal(canRefreshCommandReceipt({ status: 'uncertain' }, now), false)
})

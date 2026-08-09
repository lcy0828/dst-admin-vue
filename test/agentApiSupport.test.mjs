import test from 'node:test'
import assert from 'node:assert/strict'

import {
  isLegacyCommandTerminal,
  normalizeAgentCommandTimeout
} from '../src/api/agentApiSupport.mjs'

test('Agent command timeout follows the backend 5 to 300 second contract', () => {
  assert.equal(normalizeAgentCommandTimeout(5), 5)
  assert.equal(normalizeAgentCommandTimeout('300'), 300)
  assert.throws(() => normalizeAgentCommandTimeout(4), /5 至 300/)
  assert.throws(() => normalizeAgentCommandTimeout(301), /5 至 300/)
  assert.throws(() => normalizeAgentCommandTimeout(10.5), /整数/)
})

test('completed, failed and canceled commands are terminal', () => {
  assert.equal(isLegacyCommandTerminal('completed'), true)
  assert.equal(isLegacyCommandTerminal('failed'), true)
  assert.equal(isLegacyCommandTerminal('canceled'), true)
  assert.equal(isLegacyCommandTerminal('running'), false)
  assert.equal(isLegacyCommandTerminal('pending'), false)
})

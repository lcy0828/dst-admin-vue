import test from 'node:test'
import assert from 'node:assert/strict'
import { gameUpdateDialogState as state } from '../src/lib/gameUpdateDialogState.mjs'

test('update dialog requires explicit fresh evidence and separates current from action states', () => {
  assert.equal(state({}), 'idle')
  assert.equal(state({ plan: { ready: true } }), 'idle')
  assert.equal(state({ plan: { ready: true, updateRequired: false } }), 'current')
  assert.equal(state({ plan: { ready: true, updateRequired: true } }), 'available')
  assert.equal(state({ plan: { ready: false, updateRequired: false } }), 'blocked')
  assert.equal(state({ preparing: true, plan: { ready: true, updateRequired: false } }), 'checking')
  assert.equal(state({ uncertain: true, preparing: true }), 'uncertain')
  assert.equal(state({ active: {}, uncertain: true }), 'active')
})

import assert from 'node:assert/strict'
import test from 'node:test'

import { busiestCPUCore } from '../src/lib/cpuMetrics.mjs'

test('busiestCPUCore reports the hottest logical CPU instead of the host average', () => {
  assert.deepEqual(busiestCPUCore([12.5, 91.2, 37.8]), { index: 1, usage: 91.2 })
})

test('busiestCPUCore ignores invalid samples and clamps provider values', () => {
  assert.deepEqual(busiestCPUCore([null, 'invalid', 120]), { index: 2, usage: 100 })
  assert.equal(busiestCPUCore([null, undefined, '']), null)
  assert.equal(busiestCPUCore([]), null)
  assert.equal(busiestCPUCore(undefined), null)
})

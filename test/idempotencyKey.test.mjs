import assert from 'node:assert/strict'
import test from 'node:test'

import { createIdempotencyKey } from '../src/lib/idempotencyKey.mjs'

test('idempotency keys use native randomUUID when available', () => {
  const expected = '44d63fd7-0668-4c0e-94f8-047ae2dbe18a'
  assert.equal(createIdempotencyKey({ randomUUID: () => expected }), expected)
})

test('idempotency keys support non-secure LAN origins without randomUUID', () => {
  const cryptoAPI = {
    getRandomValues(bytes) {
      bytes.forEach((_, index) => { bytes[index] = index })
      return bytes
    }
  }
  assert.equal(createIdempotencyKey(cryptoAPI), '00010203-0405-4607-8809-0a0b0c0d0e0f')
})

test('idempotency keys recover when randomUUID is present but denied', () => {
  const cryptoAPI = {
    randomUUID() {
      throw new DOMException('Only secure origins are allowed', 'SecurityError')
    },
    getRandomValues(bytes) {
      bytes.fill(0xab)
      return bytes
    }
  }
  assert.match(createIdempotencyKey(cryptoAPI), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})

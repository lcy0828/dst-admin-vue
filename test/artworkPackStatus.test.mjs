import assert from 'node:assert/strict'
import test from 'node:test'
import { artworkPackStatus } from '../src/lib/artworkPackStatus.mjs'

test('artwork installation is distinct from unknown and failed status reads', () => {
  assert.equal(artworkPackStatus(null, { loading: true }).key, 'checking')
  assert.equal(artworkPackStatus(null).key, 'unknown')
  assert.equal(artworkPackStatus(null, { error: 'offline' }).key, 'checkFailed')
  assert.equal(artworkPackStatus({ available: {} }).key, 'notInstalled')
  assert.equal(artworkPackStatus({ available: {}, installed: {} }).key, 'installed')
  assert.equal(artworkPackStatus({ installed: {} }, { error: 'offline' }).key, 'checkFailed')
  assert.equal(artworkPackStatus({ error: 'invalid_installed_pack' }).key, 'needsRepair')
  assert.equal(artworkPackStatus({ busy: true }).key, 'processing')
  assert.equal(artworkPackStatus({ installed: {} }, { pending: true }).key, 'processing')
})

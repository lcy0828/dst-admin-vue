import assert from 'node:assert/strict'
import test from 'node:test'
import { gameBroadcastWorld, gameDeliveryLabel, gameDeliveryOutcome, gameNotificationOutcome } from '../src/lib/gameNotificationResults.mjs'

test('game notification presentation requires execution evidence, including for older servers', () => {
  const old = { status: 'succeeded', successCount: 1, deliveries: [
    { status: 'succeeded', worldName: 'Master', observedAt: '2026-01-01T00:00:00Z' },
    { status: 'skipped', worldName: 'Caves', message: 'Not sent again' }
  ] }
  assert.equal(gameNotificationOutcome(old), 'submitted')
  assert.equal(gameDeliveryOutcome(old.deliveries[0]), 'submitted')
  assert.equal(gameDeliveryLabel(old.deliveries[1]), 'skipped')
  assert.equal(gameBroadcastWorld(old), 'Master')
  assert.equal(gameNotificationOutcome({ status: 'succeeded', successCount: 9 }), 'submitted')
  assert.equal(gameDeliveryOutcome({ status: 'failed', errorCode: 'NOTIFICATION_SEND_FAILED' }), 'unconfirmed')
  assert.equal(gameDeliveryOutcome({ status: 'failed', errorCode: 'JOB_CREATE_FAILED' }), 'failed')
  assert.equal(gameNotificationOutcome({ ...old, outcome: 'unconfirmed' }), 'unconfirmed')
  assert.equal(gameNotificationOutcome({ ...old, outcome: 'confirmed' }), 'confirmed')
  assert.equal(gameNotificationOutcome({ ...old, outcome: 'unexpected' }), 'submitted')
})

test('skipped worlds distinguish actual stopped worlds from room broadcast deduplication', () => {
  assert.equal(gameDeliveryLabel({ status: 'skipped', outcome: 'skipped', skipReason: 'world_stopped' }), 'worldStopped')
  assert.equal(gameDeliveryLabel({ status: 'skipped', outcome: 'skipped', skipReason: 'room_broadcast' }), 'roomBroadcast')
  assert.equal(gameDeliveryLabel({ status: 'skipped', outcome: 'skipped', skipReason: 'broadcast_attempted' }), 'broadcastAttempted')
  assert.equal(gameDeliveryLabel({ status: 'skipped', message: 'world stopped' }), 'skipped', 'message text is not structured evidence')
  assert.equal(gameDeliveryLabel({ status: 'failed', outcome: 'unconfirmed', skipReason: 'world_stopped' }), 'unconfirmed')
})

test('a confirmed room broadcast is not a partial failure because another world was unavailable', () => {
  const notice = { status: 'partial', deliveries: [
    { status: 'failed', outcome: 'failed', worldName: 'Master' },
    { status: 'succeeded', outcome: 'confirmed', worldName: 'Caves' }
  ] }
  assert.equal(gameNotificationOutcome(notice), 'confirmed')
  assert.equal(gameBroadcastWorld(notice), 'Caves')
  notice.deliveries[1].outcome = 'unconfirmed'
  assert.equal(gameNotificationOutcome(notice), 'unconfirmed')
})

test('waiting, cancellation and skipped history never imply successful execution', () => {
  assert.equal(gameNotificationOutcome({ status: 'queued' }), 'waiting')
  assert.equal(gameNotificationOutcome({ status: 'sending' }), 'waiting')
  assert.equal(gameNotificationOutcome({ status: 'succeeded', deliveries: [{ status: 'queued' }] }), 'waiting')
  assert.equal(gameNotificationOutcome({ status: 'failed' }), 'failed')
  assert.equal(gameNotificationOutcome({ status: 'canceled' }), 'canceled')
  assert.equal(gameNotificationOutcome({ status: 'skipped' }), 'skipped')
  assert.equal(gameBroadcastWorld({ deliveries: [{ status: 'skipped', worldName: 'Caves' }] }), '')
  assert.equal(gameBroadcastWorld({ deliveries: [{ status: 'skipped', broadcastWorldName: 'Master' }] }), 'Master')
})

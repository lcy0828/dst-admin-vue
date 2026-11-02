const outcomes = new Set(['waiting', 'submitted', 'confirmed', 'unconfirmed', 'failed', 'skipped', 'canceled'])

export function gameDeliveryOutcome(delivery = {}) {
  if (outcomes.has(delivery.outcome)) return delivery.outcome
  if (delivery.status === 'succeeded') return 'submitted'
  if (delivery.status === 'failed') {
    return ['NOTIFICATION_SEND_FAILED', 'SERVICE_RESTARTED'].includes(delivery.errorCode) ? 'unconfirmed' : 'failed'
  }
  if (['skipped', 'canceled'].includes(delivery.status)) return delivery.status
  return 'waiting'
}

export function gameNotificationOutcome(notification = {}) {
  if (outcomes.has(notification.outcome)) return notification.outcome
  const evidence = (notification.deliveries || []).map(gameDeliveryOutcome)
  for (const outcome of ['confirmed', 'submitted', 'unconfirmed']) {
    if (evidence.includes(outcome)) return outcome
  }
  if (['queued', 'sending'].includes(notification.status) || evidence.includes('waiting')) return 'waiting'
  if (notification.status === 'canceled') return 'canceled'
  if (notification.status === 'failed' || evidence.includes('failed')) return 'failed'
  if (['succeeded', 'partial'].includes(notification.status)) return 'submitted'
  return 'skipped'
}

export function gameDeliveryLabel(delivery = {}) {
  if (gameDeliveryOutcome(delivery) !== 'skipped') return gameDeliveryOutcome(delivery)
  if (delivery.skipReason === 'world_stopped') return 'worldStopped'
  if (delivery.skipReason === 'room_broadcast') return 'roomBroadcast'
  if (delivery.skipReason === 'broadcast_attempted') return 'broadcastAttempted'
  return 'skipped'
}

export function gameBroadcastWorld(notification = {}) {
  const deliveries = notification.deliveries || []
  const source = deliveries.find(item => ['confirmed', 'submitted', 'unconfirmed'].includes(gameDeliveryOutcome(item)))
    || deliveries.find(item => item.status === 'failed' && (item.targetId || item.sentAt))
  if (source) return source.worldName || ''
  return deliveries.find(item => item.broadcastWorldName)?.broadcastWorldName || ''
}

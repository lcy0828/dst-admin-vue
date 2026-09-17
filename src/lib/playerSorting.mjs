import { playerHistoryTime } from './playerHistoryPresentation.mjs'

export function playerPlayDays(player) {
  const value = player?.player_age
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '') return null
  const days = Number(value)
  if (!Number.isFinite(days) || days < 0) return null
  const field = player?.field_states?.age
  if (field?.status === 'unavailable') return null
  // History-only identities have a default zero without any age observation.
  if (days === 0 && player?.field_states && !field) return null
  return days
}

const timeFields = new Set([
  'first_seen', 'last_seen', 'status_change', 'updated_at',
  'last_connected_at', 'last_disconnected_at', 'banned_at', 'ban_expires_at'
])
const presenceOrder = { online: 0, stale: 1, offline: 2 }
const nameOrder = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })

function sortableValue(player, key) {
  if (key === 'player_age') return playerPlayDays(player)
  if (key === 'status') return presenceOrder[player.status] ?? null
  const value = player[key]
  if (timeFields.has(key)) return playerHistoryTime(value) ? new Date(value).getTime() : null
  return value === '' || value == null ? null : value
}

function compareValues(left, right, direction) {
  if (left === right) return 0
  // Unknown values always follow recorded values, including ascending sorts.
  if (left == null) return 1
  if (right == null) return -1
  if (typeof left === 'string' && typeof right === 'string') return nameOrder.compare(left, right) * direction
  return (left > right ? 1 : -1) * direction
}

export function sortPlayers(players, sortBy, sortOrder = 'asc') {
  const direction = sortOrder === 'desc' ? -1 : 1
  return [...players].sort((left, right) => {
    if (sortBy) {
      const primary = compareValues(sortableValue(left, sortBy), sortableValue(right, sortBy), direction)
      if (primary) return primary
    } else {
      const online = Number(right.status === 'online') - Number(left.status === 'online')
      if (online) return online
      const days = compareValues(playerPlayDays(left), playerPlayDays(right), -1)
      if (days) return days
    }
    const recent = compareValues(sortableValue(left, 'last_seen'), sortableValue(right, 'last_seen'), -1)
    if (recent) return recent
    // Room and player identity keep equal samples stable across refreshes/pages.
    const leftID = `${left.room_id || ''}:${left.user_id || left.id || ''}`
    const rightID = `${right.room_id || ''}:${right.user_id || right.id || ''}`
    return leftID < rightID ? -1 : leftID > rightID ? 1 : 0
  })
}

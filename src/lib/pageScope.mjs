import { managementScopeTargetId } from './managementScope.mjs'
import { readWorkspaceSelection } from './workspacePreferences.mjs'

// Only pages whose data or actions use the selected machine expose this control.
export function pageHasMachineScope({ path, query = {} }) {
  if (path === '/rooms/settings') return Boolean(query.id || query.edit === 'true')
  return [
    '/dashboard', '/mods', '/rooms/list', '/rooms/topology', '/rooms/diagnostics',
    '/rooms/special-lists', '/rooms/token', '/worlds/list', '/worlds/settings',
    '/worlds/state', '/worlds/maps', '/players/list', '/players/bans',
    '/logs/query', '/announcements', '/backups', '/servers/tools', '/servers/releases'
  ].includes(path)
}

export function queryAfterMachineChange(route, targetId) {
  const query = { ...route.query, targetId }
  for (const key of ['roomId', 'roomName', 'worldId', 'archive', 'room', 'world', 'playerId']) delete query[key]
  if (route.path === '/rooms/settings') {
    delete query.id
    query.edit = 'true'
  }
  return query
}

export function preferredRoomId(rooms, requested, { allowAll = false, targetId = managementScopeTargetId() } = {}) {
  const items = Array.isArray(rooms) ? rooms : []
  const explicit = typeof requested === 'string'
  const reference = explicit ? requested : readWorkspaceSelection(targetId).roomId
  if (reference) {
    const match = items.find(room => [room.id, room.name, room.directoryName].includes(reference))
    if (match) return String(match.id)
    // A broken deep link must not silently open another room's configuration.
    if (explicit) return ''
  }
  if (allowAll && !reference) return ''
  const running = items.find(room => room.isRunning || room.status === 'running' ||
    room.worlds?.some(world => ['running', 'starting'].includes(world.status)))
  return String((running || items[0])?.id || '')
}

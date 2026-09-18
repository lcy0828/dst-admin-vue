import { resolveRoomWeather } from './roomWeather.mjs'
import { selectWorkspaceRoom } from './fleetOverview.mjs'

// The layout owns the source. A mounted workspace supplies its existing reads;
// other pages only read the selected room while automatic weather is visible.
export function createRoomWeatherFeed({ loadOverview, loadStates, publish, interval = () => 5000,
  schedule = (callback, delay) => setTimeout(callback, delay), cancel = handle => clearTimeout(handle), now = () => Date.now() }) {
  let context = { active: false, targetId: '', roomId: '' }
  let room = null
  let roomLoadedAt = 0
  let timer = null
  let generation = 0
  let inFlight = false
  let disposed = false
  const workspaces = new Set()
  const active = () => !disposed && context.active && workspaces.size === 0

  function queue(delay = 0) {
    if (timer !== null) cancel(timer)
    timer = null
    if (active() && !inFlight) timer = schedule(refresh, delay)
  }
  async function refresh() {
    timer = null
    if (!active() || inFlight) return
    inFlight = true
    const current = generation
    try {
      if (!room || now() - roomLoadedAt >= 30_000) {
        const overview = await loadOverview(context.targetId)
        if (current !== generation || !active()) return
        const preferred = context.roomId || room?.id
        room = preferred ? overview.rooms?.find(item => item.id === preferred) || null
          : selectWorkspaceRoom(overview.rooms || [])
        roomLoadedAt = now()
      }
      const response = room ? await loadStates(room.id) : { items: [] }
      if (current === generation && active()) publish(resolveRoomWeather(room, response.items || []))
    } catch {
      if (current === generation && active()) publish(resolveRoomWeather(room, []))
    } finally {
      inFlight = false
      queue(current === generation ? Math.max(5000, interval()) : 0)
    }
  }
  function configure(next) {
    if (disposed) return
    const targetChanged = next.targetId !== context.targetId
    const selectionChanged = targetChanged || next.roomId !== context.roomId
    if (!selectionChanged && next.active === context.active) return
    context = { ...next }
    generation += 1
    if (selectionChanged && (targetChanged || room?.id !== next.roomId)) {
      room = null; roomLoadedAt = 0; publish(null)
    }
    queue()
  }
  function claimWorkspace() {
    const token = Symbol('workspace')
    workspaces.add(token)
    generation += 1
    queue()
    return {
      publish(selectedRoom, snapshots) {
        if (disposed || !workspaces.has(token)) return
        room = selectedRoom
        roomLoadedAt = now()
        publish(resolveRoomWeather(room, snapshots))
      },
      release() {
        if (!workspaces.delete(token)) return
        generation += 1
        queue()
      }
    }
  }
  function dispose() {
    disposed = true
    generation += 1
    workspaces.clear()
    queue()
  }
  return { configure, claimWorkspace, dispose }
}

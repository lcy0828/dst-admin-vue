// A page owns one immutable room binding. Switching rooms invalidates requests
// and confirmations; ordinary reads never discover tasks in unrelated rooms.
export const AUTOMATION_SCOPE_EVENT = 'automation-scope-changed'
export const AUTH_SCOPE_EVENT = 'auth-scope-changed'
const ROOM_KEY = 'dst-admin.automation.room-id'
export function createAutomationScope({ listRooms, storage, changed = () => {} }) {
  let rooms = null
  let request = null
  let generation = 0
  let roomId = storage?.getItem(ROOM_KEY) || ''
  const stale = () => Object.assign(new Error('房间或登录状态已变化，请在当前页面重新操作'), { code: 'AUTOMATION_SCOPE_CHANGED' })
  function select(id) {
    if (id && !rooms?.some(room => room.id === id)) throw new Error('所选房间不可访问，请重新选择')
    if (roomId === id) return
    roomId = id
    generation++
    if (id) storage?.setItem(ROOM_KEY, id)
    else storage?.removeItem(ROOM_KEY)
    changed()
  }
  async function load({ refresh = false } = {}) {
    if (request) return request
    if (rooms && !refresh) return { rooms, roomId, generation }
    const epoch = generation
    const pending = (async () => {
      const response = await listRooms()
      if (epoch !== generation) throw stale()
      rooms = response.items || []
      if (roomId && !rooms.some(room => room.id === roomId)) select('')
      if (!roomId && rooms.length === 1) select(rooms[0].id)
      return { rooms, roomId, generation }
    })()
    request = pending
    try { return await pending } finally { if (request === pending) request = null }
  }
  function invalidate({ forget = false } = {}) {
    generation++
    rooms = null
    request = null
    if (forget) { roomId = ''; storage?.removeItem(ROOM_KEY) }
    changed()
  }
  function capture() {
    const room = rooms?.find(item => item.id === roomId)
    if (!room) throw new Error('请先选择要管理的房间')
    return { room, generation, disposed: false }
  }
  function assert(binding) {
    if (!binding || binding.disposed || binding.generation !== generation || binding.room.id !== roomId) throw stale()
  }
  return { load, select, invalidate, capture, assert }
}

export function guardAutomationAPI(api, scope, binding) {
  return new Proxy(api, { get(target, name) {
    if (typeof target[name] !== 'function') return target[name]
    return async (...args) => {
      scope.assert(binding)
      const result = await target[name](...args)
      scope.assert(binding)
      return result
    }
  } })
}

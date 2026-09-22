export const LUA_MAX_BYTES = 4096
export const luaByteLength = text => new TextEncoder().encode(String(text)).length
export const validPrefab = value => /^[a-z0-9_]{1,80}$/.test(String(value))
export function manualEntity(id) {
  return validPrefab(id) ? { key: `manual:${id}`, id, nameZhCN: id, nameEn: id, source: 'manual', type: 'unknown', capabilities: ['give', 'spawn', 'remove'] } : null
}
export function commandArguments(parameters, values) {
  const result = {}
  for (const parameter of parameters || []) {
    const value = values[parameter.name]
    if (value === '' || value === undefined || value === null) {
      if (parameter.required && parameter.default === undefined) return null
      continue
    }
    if (parameter.type === 'boolean') {
      if (![true, false, 'true', 'false'].includes(value)) return null
      result[parameter.name] = value === true || value === 'true'
      continue
    }
    if (['number', 'integer'].includes(parameter.type)) {
      const number = Number(value)
      if (!Number.isFinite(number) || (parameter.type === 'integer' && !Number.isInteger(number)) || (parameter.minimum !== undefined && number < parameter.minimum) || (parameter.maximum !== undefined && number > parameter.maximum)) return null
      result[parameter.name] = number
    } else {
      if (parameter.type === 'enum' && !(parameter.options || []).includes(value)) return null
      result[parameter.name] = String(value)
    }
  }
  return result
}
export function luaPlayerContext(playerId) {
  // DST user IDs are ASCII; never interpolate arbitrary player names into Lua.
  if (!/^KU_[A-Za-z0-9_-]{3,64}$/.test(playerId || '')) return ''
  return `local player = UserToPlayer("${playerId}")\nassert(player, "Player is not online in this world")\n`
}
export function workbenchExample(id, playerId) {
  const player = luaPlayerContext(playerId)
  if (id === 'world') return 'print("World:", TheWorld.prefab)\nprint("Day:", TheWorld.state.cycles + 1)\nprint("Season:", TheWorld.state.season)'
  if (id === 'mods') return 'for _, id in ipairs(ModManager.enabledmods or {}) do\n    local mod = ModManager:GetMod(id)\n    print(id, mod and mod.modinfo and mod.modinfo.name or id)\nend'
  if (!player) return ''
  if (id === 'player') return player + 'for name in pairs(player.components or {}) do\n    print(name)\nend'
  if (id === 'give') return player + 'local prefab = "goldnugget" -- Replace with a vanilla or mod Prefab\nassert(Prefabs[prefab], "Prefab is not registered in this world")\nlocal item = SpawnPrefab(prefab)\nassert(item, "Prefab could not be spawned")\nif not item.components.inventoryitem then\n    item:Remove()\n    error("This entity is not an inventory item")\nend\nplayer.components.inventory:GiveItem(item)'
  return ''
}

// Keep one read in flight and one latest pending input. Merely ignoring stale
// responses still lets slow Runtime/Agent commands pile up on the server.
export function createLatestWorkbenchRead({ request, onResult, onError, onSettled }) {
  let active = false, pending = null, revision = 0, closed = false, controller = null
  async function drain() {
    if (active || closed) return
    active = true
    try {
      while (pending && !closed) {
        const current = pending
        pending = null
        controller = new AbortController()
        try {
          const value = await request(current.input, controller.signal)
          if (!closed && current.revision === revision) onResult(value)
        } catch (error) {
          if (!closed && current.revision === revision) onError(error)
        } finally {
          controller = null
          if (!closed && current.revision === revision) onSettled()
        }
      }
    } finally {
      active = false
    }
  }
  return {
    enqueue(input) {
      if (closed) return
      pending = { input, revision: ++revision }
      void drain()
    },
    invalidate() { ++revision; pending = null },
    dispose() { closed = true; ++revision; pending = null; controller?.abort() }
  }
}

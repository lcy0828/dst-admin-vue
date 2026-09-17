export function composeModWorldEnabled(mod, worldId, enabled) {
  if (!mod || typeof mod !== 'object' || !worldId) return mod

  const enabledWorlds = new Set(Array.isArray(mod.enabledWorlds) ? mod.enabledWorlds : [])
  if (enabled) enabledWorlds.add(worldId)
  else enabledWorlds.delete(worldId)

  const nextEnabledWorlds = [...enabledWorlds].sort()
  return {
    ...mod,
    enabled: nextEnabledWorlds.length > 0,
    enabledWorlds: nextEnabledWorlds
  }
}

export function composeModWorldConfigured(mod, worldId, configured, enabled = false) {
  if (!mod || typeof mod !== 'object' || !worldId) return mod

  const configuredWorlds = new Set(Array.isArray(mod.configuredWorlds) ? mod.configuredWorlds : [])
  if (configured) configuredWorlds.add(worldId)
  else configuredWorlds.delete(worldId)

  const next = {
    ...mod,
    configured: configuredWorlds.size > 0,
    configuredWorlds: [...configuredWorlds].sort()
  }
  return composeModWorldEnabled(next, worldId, configured && enabled)
}

export function composeModConfigurationPatch(sourceOverrides = {}, targetOverrides = {}) {
  const patch = Object.fromEntries(
    Object.keys(targetOverrides)
      .filter(key => !Object.prototype.hasOwnProperty.call(sourceOverrides, key))
      .map(key => [key, null])
  )
  for (const [key, value] of Object.entries(sourceOverrides)) patch[key] = value
  return patch
}

export function sameModConfigurationOverrides(sourceOverrides = {}, targetOverrides = {}) {
  const keys = new Set([...Object.keys(sourceOverrides), ...Object.keys(targetOverrides)])
  return [...keys].every(key =>
    Object.prototype.hasOwnProperty.call(sourceOverrides, key) === Object.prototype.hasOwnProperty.call(targetOverrides, key) &&
    JSON.stringify(sourceOverrides[key]) === JSON.stringify(targetOverrides[key])
  )
}

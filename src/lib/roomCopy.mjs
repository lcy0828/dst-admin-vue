const ACCESS_KEYS = Object.freeze(['admin', 'block', 'white'])

function entryId(entry) {
  if (typeof entry === 'string') return entry.trim()
  return String(entry?.id || entry?.userId || entry?.kuId || '').trim()
}

export function accessListIds(entries = []) {
  return [...new Set(entries.map(entryId).filter(Boolean))]
}

export function composeAccessCopy(current = {}, source = {}, selected = ACCESS_KEYS, mode = 'merge') {
  const selectedKeys = new Set(selected)
  return Object.fromEntries(ACCESS_KEYS.map(key => {
    const currentValues = accessListIds(current[key])
    if (!selectedKeys.has(key)) return [key, currentValues]
    const sourceValues = accessListIds(source[key])
    return [key, mode === 'replace'
      ? sourceValues
      : [...new Set([...currentValues, ...sourceValues])]]
  }))
}

export function summarizeAccessCopy(current = {}, result = {}) {
  return Object.fromEntries(ACCESS_KEYS.map(key => {
    const before = new Set(accessListIds(current[key]))
    const after = new Set(accessListIds(result[key]))
    return [key, {
      total: after.size,
      added: [...after].filter(id => !before.has(id)).length,
      removed: [...before].filter(id => !after.has(id)).length
    }]
  }))
}

function explicitMasterValue(world = {}) {
  if (typeof world.isMaster === 'boolean') return world.isMaster
  if (typeof world.is_master === 'boolean') return world.is_master
  const role = String(world.role || world.worldRole || '').trim().toLowerCase()
  if (role) return role === 'master'
  return null
}

function worldIdentity(world = {}) {
  const explicitMaster = explicitMasterValue(world)
  if (explicitMaster === true) return 'master'

  const type = String(world.type || world.worldType || '').trim().toLowerCase()
  if (type === 'forest' || type === 'cave') return `type:${type}`

  const role = String(world.role || world.worldRole || '').trim().toLowerCase()
  if (role === 'caves') return 'type:cave'

  const directory = String(world.directoryName || world.directory_name || world.id || '').trim().toLowerCase()
  if (explicitMaster === null && directory === 'master') return 'master'

  const value = `${world.id || ''} ${world.name || ''} ${directory}`.toLowerCase()
  if (/\b(caves?|caveworld|underground)\b/.test(value)) return 'type:cave'
  if (/\b(forest|overworld)\b/.test(value)) return 'type:forest'
  return `named:${String(world.name || world.id || '').trim().toLowerCase()}`
}

export function matchRoomWorlds(sourceWorlds = [], targetWorlds = []) {
  const unusedTargets = new Set(targetWorlds.map(world => world.id))
  return sourceWorlds.map(source => {
    const identity = worldIdentity(source)
    const sourceId = String(source.id || '').trim().toLowerCase()
    const sourceName = String(source.name || '').trim().toLowerCase()
    const exactId = targetWorlds.find(target => (
      unusedTargets.has(target.id) && String(target.id || '').trim().toLowerCase() === sourceId
    ))
    const exactName = targetWorlds.find(target => (
      unusedTargets.has(target.id)
      && sourceName
      && String(target.name || '').trim().toLowerCase() === sourceName
      && worldIdentity(target) === identity
    ))
    const target = exactId || exactName || targetWorlds.find(item => (
      unusedTargets.has(item.id) && worldIdentity(item) === identity
    )) || null
    if (target) unusedTargets.delete(target.id)
    return { source, target, role: identity }
  })
}

export const ROOM_COPY_SECTION_FIELDS = Object.freeze({
  gameplay: Object.freeze([
    'game_mode', 'max_players', 'pvp', 'pause_when_empty', 'vote_enabled', 'vote_kick_enabled'
  ]),
  network: Object.freeze([
    'cluster_description', 'cluster_password', 'cluster_intention', 'cluster_language',
    'whitelist_slots', 'tick_rate', 'autosaver_enabled', 'idle_timeout',
    'lan_only_cluster', 'offline_cluster'
  ]),
  system: Object.freeze(['console_enabled', 'max_snapshots']),
  steam: Object.freeze(['steam_group_only', 'steam_group_id', 'steam_group_admins'])
})

export function pickCopiedRoomFields(source = {}, selectedSections = []) {
  const fields = selectedSections.flatMap(section => ROOM_COPY_SECTION_FIELDS[section] || [])
  return Object.fromEntries(fields.filter(key => Object.hasOwn(source, key)).map(key => [key, source[key]]))
}

function booleanValue(value) {
  return value === true || value === 'true' || value === 'yes'
}

function integerValue(value) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function roomCopyValuesFromConfig(config = {}) {
  const gameplay = config.GAMEPLAY || {}
  const network = config.NETWORK || {}
  const misc = config.MISC || {}
  const steam = config.STEAM || {}
  return {
    game_mode: gameplay.game_mode,
    max_players: integerValue(gameplay.max_players),
    pvp: booleanValue(gameplay.pvp),
    pause_when_empty: booleanValue(gameplay.pause_when_empty),
    vote_enabled: booleanValue(gameplay.vote_enabled),
    vote_kick_enabled: booleanValue(gameplay.vote_kick_enabled),
    cluster_description: network.cluster_description,
    cluster_password: network.cluster_password,
    cluster_intention: network.cluster_intention,
    cluster_language: network.cluster_language,
    whitelist_slots: integerValue(network.whitelist_slots),
    tick_rate: integerValue(network.tick_rate),
    autosaver_enabled: booleanValue(network.autosaver_enabled),
    idle_timeout: integerValue(network.idle_timeout),
    lan_only_cluster: booleanValue(network.lan_only_cluster),
    offline_cluster: booleanValue(network.offline_cluster),
    console_enabled: booleanValue(misc.console_enabled),
    max_snapshots: integerValue(misc.max_snapshots),
    steam_group_only: booleanValue(steam.steam_group_only),
    steam_group_id: integerValue(steam.steam_group_id),
    steam_group_admins: booleanValue(steam.steam_group_admins)
  }
}

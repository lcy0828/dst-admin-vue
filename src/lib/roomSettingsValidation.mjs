export const ROOM_BACKEND_FIELD_KEYS = Object.freeze({
  clusterName: 'cluster_name',
  clusterDescription: 'cluster_description',
  clusterPassword: 'cluster_password',
  clusterIntention: 'cluster_intention',
  clusterLanguage: 'cluster_language',
  gameMode: 'game_mode',
  maxPlayers: 'max_players',
  pvp: 'pvp',
  pauseWhenEmpty: 'pause_when_empty',
  voteEnabled: 'vote_enabled',
  voteKickEnabled: 'vote_kick_enabled',
  consoleEnabled: 'console_enabled',
  lanOnly: 'lan_only_cluster',
  offline: 'offline_cluster',
  whitelistSlots: 'whitelist_slots',
  tickRate: 'tick_rate',
  autosaverEnabled: 'autosaver_enabled',
  idleTimeout: 'idle_timeout',
  maxSnapshots: 'max_snapshots',
  shardEnabled: 'shard_enabled',
  bindIp: 'bind_ip',
  masterIp: 'master_ip',
  masterPort: 'master_port',
  clusterKey: 'cluster_key',
  steamGroupOnly: 'steam_group_only',
  steamGroupId: 'steam_group_id',
  steamGroupAdmins: 'steam_group_admins'
})

export const ROOM_FIELD_RULES = Object.freeze({
  game_mode: { options: ['survival', 'endless', 'wilderness'] },
  max_players: { required: true, integer: true, min: 1, max: 64, constraint: 'rangePlayers' },
  cluster_name: { required: true, maxLength: 64, singleLine: true, constraint: 'singleLineMax' },
  cluster_description: { maxLength: 512, singleLine: true, constraint: 'singleLineMax' },
  cluster_password: { maxLength: 64, singleLine: true, constraint: 'singleLineMaxOptional' },
  cluster_intention: { options: ['cooperative', 'competitive', 'social', 'madness'] },
  cluster_language: { options: ['zh', 'en'] },
  whitelist_slots: { integer: true, min: 0, dynamicMax: 'max_players', constraint: 'reservedSlots' },
  tick_rate: { integer: true, min: 15, max: 60, constraint: 'rangeTickRate' },
  idle_timeout: { integer: true, min: 0, constraint: 'zeroDisablesNonNegative' },
  max_snapshots: { integer: true, min: 1, constraint: 'minimumSnapshots' },
  bind_ip: { maxBytes: 255, singleLine: true, constraint: 'singleLineMaxBytes' },
  master_ip: { maxBytes: 255, singleLine: true, constraint: 'singleLineMaxBytes' },
  master_port: { required: true, integer: true, min: 1, max: 65535, constraint: 'rangePort' },
  cluster_key: { required: true, maxBytes: 256, singleLine: true, constraint: 'singleLineMaxBytes' },
  steam_group_id: { integer: true, min: 0, constraint: 'nonNegativeInteger' }
})

export const ROOM_ARCHIVE_RULE = Object.freeze({
  maxLength: 64,
  pattern: /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
})

export function frontendRoomFieldKey(key) {
  return ROOM_BACKEND_FIELD_KEYS[key] || key
}

export function roomFieldRule(key, form = {}, schema = []) {
  const local = ROOM_FIELD_RULES[key] || {}
  const backendKey = Object.entries(ROOM_BACKEND_FIELD_KEYS).find(([, frontendKey]) => frontendKey === key)?.[0]
  const backend = schema.find(field => field.key === backendKey) || {}
  const dynamicMaximum = local.dynamicMax ? Number(form[local.dynamicMax]) : undefined
  return {
    ...local,
    required: local.required ?? Boolean(backend.required),
    min: backend.minimum ?? local.min,
    max: Number.isFinite(dynamicMaximum) ? dynamicMaximum : (backend.maximum ?? local.max)
  }
}

export function validateRoomField(key, value, form = {}, schema = []) {
  const rule = roomFieldRule(key, form, schema)
  const empty = value === '' || value === null || value === undefined

  if (rule.required && empty) return { code: 'required' }
  if (empty) return null

  if (rule.integer) {
    const number = Number(value)
    if (!Number.isInteger(number)) return { code: 'integer' }
    if (rule.min !== undefined && number < rule.min) {
      return rule.max !== undefined
        ? { code: 'range', min: rule.min, max: rule.max }
        : { code: 'minimum', min: rule.min }
    }
    if (rule.max !== undefined && number > rule.max) {
      return { code: 'range', min: rule.min, max: rule.max }
    }
  }

  const text = String(value)
  if (rule.singleLine && /[\0\r\n]/.test(text)) return { code: 'singleLine' }
  if (rule.maxLength !== undefined && [...text].length > rule.maxLength) {
    return { code: 'maxLength', max: rule.maxLength }
  }
  if (rule.maxBytes !== undefined && new TextEncoder().encode(text).length > rule.maxBytes) {
    return { code: 'maxBytes', max: rule.maxBytes }
  }
  if (rule.options && !rule.options.includes(value)) return { code: 'option' }
  return null
}

export function validateRoomSettings(form, schema = [], disabled = () => false) {
  const errors = {}
  for (const key of Object.keys(ROOM_FIELD_RULES)) {
    if (disabled(key)) continue
    const error = validateRoomField(key, form[key], form, schema)
    if (error) errors[key] = error
  }
  return errors
}

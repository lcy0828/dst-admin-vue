const LOG_TYPE_KEYS = Object.freeze({
  system: 'logs.types.system',
  chat: 'logs.types.chat',
  player: 'logs.types.player',
  entity: 'logs.types.entity',
  world: 'logs.types.world',
  error: 'logs.types.error',
  warning: 'logs.types.warning',
  unknown: 'logs.types.unknown',
  startup: 'logs.types.startup',
  worldgen: 'logs.types.worldgen',
  diagnostic: 'logs.types.diagnostic',
  version: 'logs.types.version',
  listplayers: 'logs.types.listplayers',
  remoteexcute: 'logs.types.remoteexcute',
  remoteinpute: 'logs.types.remoteinpute',
  join_game: 'logs.types.join_game',
  leave_game: 'logs.types.leave_game',
  connection: 'logs.types.connection',
  diskspace: 'logs.types.diskspace',
  snapshot: 'logs.types.snapshot',
  TokenPurpose: 'logs.types.TokenPurpose',
  HardwareStats: 'logs.types.HardwareStats',
  validating_portal: 'logs.types.validating_portal',
  start_mode: 'logs.types.start_mode',
  taskgrouplist: 'logs.types.taskgrouplist',
  override: 'logs.types.override',
  Network_tick: 'logs.types.Network_tick',
  SyncWorldSettings: 'logs.types.SyncWorldSettings',
  generated_settings: 'logs.types.generated_settings',
  mount_file_sys: 'logs.types.mount_file_sys'
})

export const KNOWN_LOG_TYPES = Object.freeze(Object.keys(LOG_TYPE_KEYS))

export function logTypeLabel(type, translate) {
  const value = String(type || '').trim()
  const key = LOG_TYPE_KEYS[value]
  return key ? translate(key) : value
}

export function logTypeOptions(translate) {
  return KNOWN_LOG_TYPES.map(value => ({ value, label: logTypeLabel(value, translate) }))
}

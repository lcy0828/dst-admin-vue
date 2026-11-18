function integerOrFallback(value, fallback = 0) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : fallback
}

function booleanOrFalse(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

export function serverConfigFromLegacyIni(config = {}) {
  return {
    serverPort: integerOrFallback(config?.network?.server_port, 0),
    isMaster: booleanOrFalse(config?.shard?.is_master),
    shardName: config?.shard?.name ?? '',
    shardId: integerOrFallback(config?.shard?.id, -1),
    encodeUserPath: booleanOrFalse(config?.account?.encode_user_path),
    masterServerPort: integerOrFallback(config?.steam?.master_server_port, 0),
    authenticationPort: integerOrFallback(config?.steam?.authentication_port, 0)
  }
}

export function legacyIniFromServerConfig(server = {}) {
  return {
    network: { server_port: server.serverPort },
    shard: {
      is_master: Boolean(server.isMaster),
      name: server.shardName ?? '',
      id: server.shardId
    },
    account: { encode_user_path: Boolean(server.encodeUserPath) },
    steam: {
      master_server_port: server.masterServerPort,
      authentication_port: server.authenticationPort
    }
  }
}

export function extractConfigEditorError(error) {
  if (!error) return null
  const code = String(error.code || error?.context?.targetErrorCode || '').trim()
  const details = error.details && typeof error.details === 'object' ? error.details : {}
  const fields = details.fields && typeof details.fields === 'object' ? details.fields : null
  const fieldEntries = fields ? Object.entries(fields).filter(([, value]) => Boolean(value)) : []
  const line = Number(details.line) > 0 ? Number(details.line) : 0
  const column = Number(details.column) > 0 ? Number(details.column) : 0
  let file = String(details.file || '').trim()
  if (!file && fieldEntries.length > 0) {
    if (fieldEntries.every(([key]) => key.startsWith('server.'))) {
      file = 'server.ini'
    } else if (fieldEntries.every(([key]) => (
      key.startsWith('overrides.')
      || key.startsWith('leveldataoverride.')
      || key.startsWith('overridePatch.')
    ))) {
      file = 'leveldataoverride.lua'
    }
  }
  const expectedWorldType = String(details.expected || '').trim()
  const actualWorldType = String(details.actual || '').trim()
  const fieldSummary = fieldEntries.map(([key, value]) => `${key}: ${value}`).join('; ')
  const rawMessage = fieldSummary || String(error.rawMessage || error.detail || error.message || '').trim()

  return {
    code,
    file,
    line,
    column,
    fields: fields || {},
    expectedWorldType,
    actualWorldType,
    rawMessage,
    isLocationMismatch: code === 'WORLD_LOCATION_MISMATCH',
    isSyntaxError: code === 'INVALID_CONFIGURATION_SYNTAX' || code === 'INVALID_MOD_CONFIGURATION_SYNTAX',
    isTooLarge: code === 'CONFIGURATION_FILE_TOO_LARGE',
    isRevisionConflict: code === 'CONFIG_REVISION_CONFLICT' || code === 'REVISION_CONFLICT',
    isTopologyChanged: code === 'TOPOLOGY_CHANGED' || code === 'ROOM_TOPOLOGY_CHANGED'
  }
}

export function findMatchingWorldForLocation(worlds = [], actualWorldType = '', currentWorldName = '') {
  const wanted = String(actualWorldType || '').trim()
  if (!wanted || !Array.isArray(worlds)) return null
  return worlds.find(world => world && world.type === wanted && world.name !== currentWorldName) || null
}

export function defaultModOverridesScope(worlds = []) {
  return Array.isArray(worlds) && worlds.length > 1 ? 'room' : 'world'
}

export function resolveModOverridesWorldIds(scope, currentWorldId, worlds = []) {
  const validWorlds = Array.isArray(worlds) ? worlds.filter(world => world?.id) : []
  if (scope === 'room' && validWorlds.length > 0) {
    return validWorlds.map(world => world.id)
  }
  if (currentWorldId) return [currentWorldId]
  return validWorlds[0]?.id ? [validWorlds[0].id] : []
}

export function summarizeModOverridesPreview(preview) {
  const rawChanges = Array.isArray(preview?.changes) ? preview.changes : []
  const notices = Array.isArray(preview?.notices) ? preview.notices : []
  const missingWorkshopIds = Array.isArray(preview?.missingWorkshopIds) ? preview.missingWorkshopIds : []
  const missingLocalModIds = Array.isArray(preview?.missingLocalModIds) ? preview.missingLocalModIds : []

  let added = 0
  let removed = 0
  let enabledChanged = 0
  let optionsChanged = 0

  const changes = rawChanges.map(item => {
    const action = String(item?.operation || item?.action || '').trim()
    switch (action) {
      case 'added':
        added += 1
        break
      case 'removed':
        removed += 1
        break
      case 'enabled_changed':
        enabledChanged += 1
        break
      case 'options_changed':
        optionsChanged += 1
        break
      default:
        break
    }
    return {
      ...item,
      action,
      operation: action
    }
  })

  return {
    added,
    removed,
    enabledChanged,
    optionsChanged,
    totalChanges: changes.length,
    changes,
    missingWorkshopIds,
    missingLocalModIds,
    missingWorkshopCount: missingWorkshopIds.length,
    missingLocalCount: missingLocalModIds.length,
    primaryActionMode: missingWorkshopIds.length > 0 ? 'download_and_save' : 'save_only',
    hasKleiHeaderNotice: notices.includes('stripped_klei_header'),
    hasBareTableNotice: notices.includes('wrapped_bare_table')
  }
}

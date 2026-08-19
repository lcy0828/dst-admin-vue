import { adapterError } from './adapterProtocol.mjs'

export const LEGACY_TERMINAL_COMMAND_STATUSES = new Set([
  'completed',
  'failed',
  'canceled'
])

export function isLegacyCommandTerminal(status) {
  return LEGACY_TERMINAL_COMMAND_STATUSES.has(status)
}

export function normalizeAgentCommandTimeout(value) {
  const timeout = Number(value)
  if (!Number.isInteger(timeout) || timeout < 5 || timeout > 300) {
    throw adapterError('INVALID_AGENT_TIMEOUT', { context: { value } })
  }
  return timeout
}

function runtimeString(value, camelKey, snakeKey) {
  return String(value?.[camelKey] ?? value?.[snakeKey] ?? '').trim()
}

export function normalizeAgentRuntimeInstallations(values) {
  if (!Array.isArray(values)) return []
  const seen = new Set()
  return values.flatMap(value => {
    const installation = {
      id: runtimeString(value, 'id', 'id'),
      driver: runtimeString(value, 'driver', 'driver'),
      savePath: runtimeString(value, 'savePath', 'save_path'),
      serverPath: runtimeString(value, 'serverPath', 'server_path'),
      steamcmdPath: runtimeString(value, 'steamcmdPath', 'steamcmd_path'),
      ugcPath: runtimeString(value, 'ugcPath', 'ugc_path'),
      workshopContentPath: runtimeString(value, 'workshopContentPath', 'workshop_content_path'),
      serverMode: runtimeString(value, 'serverMode', 'server_mode')
    }
    if (!installation.id || !installation.savePath || !installation.serverPath || seen.has(installation.id)) return []
    seen.add(installation.id)
    return [installation]
  })
}

export function bindAgentRuntimeInstallation(config, installation) {
  if (!installation?.id) return { ...config }
  return {
    ...config,
    installationId: installation.id,
    savePath: installation.savePath,
    serverPath: installation.serverPath,
    steamcmdPath: installation.steamcmdPath,
    ugcPath: installation.ugcPath,
    workshopContentPath: installation.workshopContentPath,
    serverMode: installation.serverMode
  }
}

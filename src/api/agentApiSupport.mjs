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

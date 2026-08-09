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
    throw new Error('Agent 命令超时时间必须是 5 至 300 秒的整数')
  }
  return timeout
}

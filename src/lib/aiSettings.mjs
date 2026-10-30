export const DEFAULT_AI_LIMITS = Object.freeze({ maxRounds: 8, maxToolCalls: 12, timeoutSeconds: 150 })

export function aiSettingsForm(config = {}) {
  return { ...config, limits: { ...DEFAULT_AI_LIMITS, ...config.limits }, apiKey: '', clearKey: false }
}

export function aiLimitValue(key, value) {
  if (value === '' || value == null || typeof value === 'boolean') return null
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 0 || (key === 'timeoutSeconds' && number > 9223372036)) return null
  return number
}

export function aiLimitsInput(limits) {
  const result = {}
  for (const key of Object.keys(DEFAULT_AI_LIMITS)) {
    const value = aiLimitValue(key, limits?.[key])
    if (value == null) return null
    result[key] = value
  }
  return result
}

export function aiTokenInput(value) {
  const name = String(value?.name || '').trim()
  const days = Number(value?.days)
  const profile = value?.profile
  const roomIds = Array.isArray(value?.roomIds) ? [...new Set(value.roomIds)] : []
  if (!name || name.length > 100 || !Number.isInteger(days) || days < 1 || days > 365 ||
      !['game-read', 'game-manage', 'panel-manage'].includes(profile) || roomIds.length > 64 ||
      roomIds.some(id => typeof id !== 'string' || !id || id.length > 255 || /[\0\r\n]/.test(id)) ||
      (profile !== 'panel-manage' && roomIds.length === 0)) return null
  return { name, days, profile, roomIds }
}

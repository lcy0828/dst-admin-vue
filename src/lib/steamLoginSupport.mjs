export const STEAM_GUARD_CODE_PATTERN = /^[A-Za-z0-9]{5}$/
export const STEAM_USERNAME_PATTERN = /^[A-Za-z0-9_]{1,64}$/
export const STEAM_LOGIN_ACTIVE_STATES = ['connecting', 'guard_email', 'guard_mobile', 'guard_approval']

export function isSteamLoginActive(status) {
  return STEAM_LOGIN_ACTIVE_STATES.includes(status?.state)
}

export function isSteamGuardCodePrompt(status) {
  return ['guard_email', 'guard_mobile'].includes(status?.state)
}

export function canFallbackApprovalToCode(status) {
  return status?.state === 'guard_approval' && Boolean(status?.passwordSet) && Boolean(status?.sessionId)
}

export function initialSteamLoginUiMode(status) {
  if (status?.mode === 'account') {
    return status.passwordSet ? 'account_password' : 'account_cached'
  }
  return 'anonymous'
}

export function hasSavedSteamPassword(status, username) {
  const trimmed = String(username || '').trim()
  return Boolean(status?.passwordSet) && Boolean(trimmed) && status.username === trimmed
}

export function isValidSteamUsername(username) {
  const trimmed = String(username || '').trim()
  return STEAM_USERNAME_PATTERN.test(trimmed) && trimmed.toLowerCase() !== 'anonymous'
}

export function isValidOptionalGuardCode(code) {
  const trimmed = String(code || '').trim()
  return !trimmed || STEAM_GUARD_CODE_PATTERN.test(trimmed)
}

export function canSubmitSteamLoginConfig({ loading, submitting, status, uiMode, username, password, loginCode }) {
  if (loading || submitting || !status || status.recoveryRequired || isSteamLoginActive(status)) return false
  if (uiMode === 'anonymous') return true
  if (!isValidSteamUsername(username)) return false
  if (uiMode === 'account_cached') return true
  if (uiMode === 'account_password') {
    return Boolean(password || hasSavedSteamPassword(status, username)) && isValidOptionalGuardCode(loginCode)
  }
  return false
}

export function buildSteamLoginSavePlan({ uiMode, username, password, loginCode }) {
  if (uiMode === 'anonymous') {
    return {
      configureInput: { action: 'configure', mode: 'anonymous' },
      loginInput: null,
    }
  }
  const trimmedUser = String(username || '').trim()
  if (uiMode === 'account_cached') {
    return {
      configureInput: {
        action: 'configure',
        mode: 'account',
        username: trimmedUser,
        useCachedCredentials: true,
      },
      loginInput: { action: 'login' },
    }
  }
  const normalizedCode = String(loginCode || '').trim().toUpperCase()
  return {
    configureInput: {
      action: 'configure',
      mode: 'account',
      username: trimmedUser,
      ...(password ? { password } : {}),
    },
    loginInput: {
      action: 'login',
      ...(normalizedCode ? { code: normalizedCode } : {}),
    },
  }
}

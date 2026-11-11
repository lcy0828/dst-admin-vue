import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildSteamLoginSavePlan,
  canFallbackApprovalToCode,
  canSubmitSteamLoginConfig,
  hasSavedSteamPassword,
  initialSteamLoginUiMode,
  isSteamGuardCodePrompt,
  isSteamLoginActive,
  isValidOptionalGuardCode,
  isValidSteamUsername,
} from '../src/lib/steamLoginSupport.mjs'

test('isValidSteamUsername and isValidOptionalGuardCode validate user inputs cleanly', () => {
  assert.equal(isValidSteamUsername('steam_user_01'), true)
  assert.equal(isValidSteamUsername(' anonymous '), false)
  assert.equal(isValidSteamUsername('user@example.com'), false)
  assert.equal(isValidSteamUsername('中文昵称'), false)
  assert.equal(isValidOptionalGuardCode(''), true)
  assert.equal(isValidOptionalGuardCode(' a9z7q '), true)
  assert.equal(isValidOptionalGuardCode('1234'), false)
})

test('initialSteamLoginUiMode distinguishes anonymous, stored-password, and cached-credential profiles', () => {
  assert.equal(initialSteamLoginUiMode({ mode: 'anonymous', passwordSet: false, state: 'anonymous' }), 'anonymous')
  assert.equal(initialSteamLoginUiMode({ mode: 'account', username: 'steam_user', passwordSet: true, state: 'ready' }), 'account_password')
  assert.equal(initialSteamLoginUiMode({ mode: 'account', username: 'steam_user', passwordSet: false, state: 'configured' }), 'account_cached')
  assert.equal(initialSteamLoginUiMode({ mode: 'unavailable', passwordSet: false, recoveryRequired: true, state: 'failed' }), 'anonymous')
})

test('canSubmitSteamLoginConfig allows username-only cached mode and validates optional one-time Guard code', () => {
  const baseStatus = { mode: 'anonymous', passwordSet: false, state: 'anonymous' }

  // Cached credentials mode requires a valid Steam account name and no password
  assert.equal(canSubmitSteamLoginConfig({
    loading: false,
    submitting: false,
    status: baseStatus,
    uiMode: 'account_cached',
    username: 'steam_user',
    password: '',
    loginCode: '',
  }), true)

  assert.equal(canSubmitSteamLoginConfig({
    loading: false,
    submitting: false,
    status: baseStatus,
    uiMode: 'account_cached',
    username: 'anonymous',
    password: '',
    loginCode: '',
  }), false)

  assert.equal(canSubmitSteamLoginConfig({
    loading: false,
    submitting: false,
    status: baseStatus,
    uiMode: 'account_cached',
    username: 'user@example.com',
    password: '',
    loginCode: '',
  }), false)

  // Password mode requires password (unless already saved for the same username) and valid optional 5-char code
  assert.equal(canSubmitSteamLoginConfig({
    loading: false,
    submitting: false,
    status: baseStatus,
    uiMode: 'account_password',
    username: 'steam_user',
    password: '',
    loginCode: '',
  }), false)

  assert.equal(canSubmitSteamLoginConfig({
    loading: false,
    submitting: false,
    status: baseStatus,
    uiMode: 'account_password',
    username: 'steam_user',
    password: 'secret',
    loginCode: '123',
  }), false)

  assert.equal(canSubmitSteamLoginConfig({
    loading: false,
    submitting: false,
    status: baseStatus,
    uiMode: 'account_password',
    username: 'steam_user',
    password: 'secret',
    loginCode: 'a1b2c',
  }), true)

  // Saved password retention allows re-verifying with a one-time code without re-entering password
  const savedStatus = { mode: 'account', username: 'steam_user', passwordSet: true, state: 'configured' }
  assert.equal(hasSavedSteamPassword(savedStatus, ' steam_user '), true)
  assert.equal(hasSavedSteamPassword(savedStatus, 'other_user'), false)
  assert.equal(canSubmitSteamLoginConfig({
    loading: false,
    submitting: false,
    status: savedStatus,
    uiMode: 'account_password',
    username: 'steam_user',
    password: '',
    loginCode: 'Z9Y8X',
  }), true)
})

test('buildSteamLoginSavePlan produces exact configure and login payloads for all 3 modes', () => {
  assert.deepEqual(
    buildSteamLoginSavePlan({ uiMode: 'anonymous', username: 'steam_user', password: 'ignored', loginCode: 'ABCDE' }),
    {
      configureInput: { action: 'configure', mode: 'anonymous' },
      loginInput: null,
    }
  )

  assert.deepEqual(
    buildSteamLoginSavePlan({ uiMode: 'account_cached', username: ' steam_user ', password: 'ignored', loginCode: 'ABCDE' }),
    {
      configureInput: { action: 'configure', mode: 'account', username: 'steam_user', useCachedCredentials: true },
      loginInput: { action: 'login' },
    }
  )

  assert.deepEqual(
    buildSteamLoginSavePlan({ uiMode: 'account_password', username: ' steam_user ', password: '', loginCode: ' a1b2c ' }),
    {
      configureInput: { action: 'configure', mode: 'account', username: 'steam_user' },
      loginInput: { action: 'login', code: 'A1B2C' },
    }
  )

  assert.deepEqual(
    buildSteamLoginSavePlan({ uiMode: 'account_password', username: 'steam_user', password: 'secret', loginCode: '' }),
    {
      configureInput: { action: 'configure', mode: 'account', username: 'steam_user', password: 'secret' },
      loginInput: { action: 'login' },
    }
  )
})

test('approval fallback is enabled only during guard_approval when a password is stored', () => {
  assert.equal(isSteamLoginActive({ state: 'guard_approval' }), true)
  assert.equal(isSteamGuardCodePrompt({ state: 'guard_approval' }), false)
  assert.equal(isSteamGuardCodePrompt({ state: 'guard_mobile' }), true)
  assert.equal(canFallbackApprovalToCode({ state: 'guard_approval', passwordSet: true, sessionId: 's-1' }), true)
  assert.equal(canFallbackApprovalToCode({ state: 'guard_approval', passwordSet: false, sessionId: 's-1' }), false)
  assert.equal(canFallbackApprovalToCode({ state: 'guard_mobile', passwordSet: true, sessionId: 's-1' }), false)
})

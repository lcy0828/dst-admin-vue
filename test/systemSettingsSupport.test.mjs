import test from 'node:test'
import assert from 'node:assert/strict'

import {
  editableSystemSettingValues,
  TERMINAL_SYSTEM_JOB_STATES
} from '../src/api/systemSettingsSupport.mjs'

test('system settings payload excludes environment-controlled and read-only fields', () => {
  const values = editableSystemSettingValues([
    { id: 'ui.systemName', editable: true },
    { id: 'security.sessionTimeout', editable: false, environment: 'DST_ADMIN_SESSION_TIMEOUT' },
    { id: 'security.twoFactorAuth', editable: false }
  ], {
    'ui.systemName': 'DST Admin',
    'security.sessionTimeout': '30',
    'security.twoFactorAuth': 'true'
  })

  assert.deepEqual(values, { 'ui.systemName': 'DST Admin' })
})

test('system jobs use the backend canceled spelling as a terminal state', () => {
  assert.equal(TERMINAL_SYSTEM_JOB_STATES.has('succeeded'), true)
  assert.equal(TERMINAL_SYSTEM_JOB_STATES.has('failed'), true)
  assert.equal(TERMINAL_SYSTEM_JOB_STATES.has('canceled'), true)
  assert.equal(TERMINAL_SYSTEM_JOB_STATES.has('cancelled'), false)
  assert.equal(TERMINAL_SYSTEM_JOB_STATES.has('running'), false)
})

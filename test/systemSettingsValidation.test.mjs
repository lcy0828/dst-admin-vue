import test from 'node:test'
import assert from 'node:assert/strict'
import { systemSettingsSnapshot, validateEmailFields, validateSystemSettingsForm } from '../src/lib/systemSettingsValidation.mjs'

test('allows saving basic settings when no SMTP fields are configured', () => {
  const result = validateSystemSettingsForm({
    systemName: 'DST Admin',
    adminEmail: '',
    smtpServer: '',
    smtpUsername: '',
    smtpPassword: '',
    senderEmail: ''
  })
  assert.equal(result.valid, true)
  assert.equal(result.basicValid, true)
  assert.equal(result.emailValid, true)
})

test('validates SMTP server and sender email when any email field is provided', () => {
  const result = validateSystemSettingsForm({
    systemName: 'DST Admin',
    adminEmail: '',
    smtpServer: 'smtp.example.com',
    smtpUsername: 'mailer',
    smtpPassword: '',
    senderEmail: 'invalid-email'
  })
  assert.equal(result.valid, false)
  assert.equal(result.basicValid, true)
  assert.equal(result.emailValid, false)
  assert.equal(result.errors.smtpPassword, 'smtpPasswordRequired')
  assert.equal(result.errors.senderEmail, 'emailInvalid')
})

test('requires smtpServer when senderEmail is entered without smtpServer', () => {
  const result = validateEmailFields({
    smtpServer: '',
    smtpUsername: '',
    smtpPassword: '',
    senderEmail: 'bot@example.com'
  })
  assert.equal(result.valid, false)
  assert.equal(result.errors.smtpServer, 'smtpServerRequired')
})

test('allows omitted smtpPassword when smtpPasswordConfigured is true', () => {
  const result = validateEmailFields(
    {
      smtpServer: 'smtp.example.com',
      smtpUsername: 'mailer',
      smtpPassword: '',
      senderEmail: 'bot@example.com'
    },
    { includeSender: true, smtpPasswordConfigured: true }
  )
  assert.equal(result.valid, true)
})

test('allows saving non-email settings when smtpPasswordConfigured is true and visible SMTP inputs are cleared', () => {
  const result = validateSystemSettingsForm(
    {
      systemName: 'DST Admin',
      adminEmail: '',
      smtpServer: '',
      smtpUsername: '',
      smtpPassword: '',
      senderEmail: ''
    },
    { smtpPasswordConfigured: true }
  )
  assert.equal(result.valid, true)
  assert.equal(result.emailValid, true)
})

test('requires smtpServer for test connection even when all fields are empty', () => {
  const result = validateEmailFields({}, { includeSender: false })
  assert.equal(result.valid, false)
  assert.equal(result.errors.smtpServer, 'smtpServerRequired')
  assert.equal(result.errors.senderEmail, '')
})

test('systemSettingsSnapshot tracks global fields consistently and ignores unrelated fields', () => {
  const baseline = {
    systemName: 'DST Admin',
    adminEmail: '',
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    theme: '#27272a',
    passwordComplexity: false,
    minPasswordLength: 6,
    sessionTimeout: 1440,
    maxLoginAttempts: 5,
    ipWhitelist: '',
    backupLocation: '/data/backups',
    smtpServer: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    senderEmail: ''
  }

  assert.equal(
    systemSettingsSnapshot({ ...baseline, smtpPort: '587', twoFactorAuth: true }),
    systemSettingsSnapshot(baseline)
  )
  assert.notEqual(
    systemSettingsSnapshot({ ...baseline, backupLocation: '/mnt/backups' }),
    systemSettingsSnapshot(baseline)
  )
  assert.notEqual(
    systemSettingsSnapshot({ ...baseline, passwordComplexity: true }),
    systemSettingsSnapshot(baseline)
  )
})

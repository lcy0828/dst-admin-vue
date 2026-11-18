export function isValidEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

export function validateEmailFields(settings = {}, { includeSender = true, smtpPasswordConfigured = false } = {}) {
  const errors = {
    smtpServer: '',
    smtpUsername: '',
    smtpPassword: '',
    senderEmail: ''
  }

  const smtpServer = String(settings.smtpServer || '').trim()
  const smtpUsername = String(settings.smtpUsername || '').trim()
  const smtpPassword = String(settings.smtpPassword || '').trim()
  const senderEmail = String(settings.senderEmail || '').trim()

  const hasAnyEmailInput = Boolean(
    smtpServer || smtpUsername || smtpPassword || senderEmail
  )

  if (!includeSender || hasAnyEmailInput) {
    if (!smtpServer) {
      errors.smtpServer = 'smtpServerRequired'
    }
    if (smtpUsername && !smtpPassword && !smtpPasswordConfigured) {
      errors.smtpPassword = 'smtpPasswordRequired'
    }
    if (includeSender) {
      if (!senderEmail) {
        errors.senderEmail = 'senderEmailRequired'
      } else if (!isValidEmailAddress(senderEmail)) {
        errors.senderEmail = 'emailInvalid'
      }
    }
  }

  return {
    valid: Object.values(errors).every(message => !message),
    errors
  }
}

export function validateSystemSettingsForm(settings = {}, options = {}) {
  const errors = {
    systemName: '',
    adminEmail: '',
    smtpServer: '',
    smtpUsername: '',
    smtpPassword: '',
    senderEmail: ''
  }

  if (!String(settings.systemName || '').trim()) {
    errors.systemName = 'systemNameRequired'
  }
  const adminEmail = String(settings.adminEmail || '').trim()
  if (adminEmail && !isValidEmailAddress(adminEmail)) {
    errors.adminEmail = 'emailInvalid'
  }

  const emailResult = validateEmailFields(settings, { ...options, includeSender: true })
  Object.assign(errors, emailResult.errors)

  const basicValid = !errors.systemName && !errors.adminEmail
  const emailValid = emailResult.valid

  return {
    valid: basicValid && emailValid,
    basicValid,
    emailValid,
    errors
  }
}

export function systemSettingsSnapshot(settings = {}) {
  return JSON.stringify({
    systemName: String(settings.systemName ?? ''),
    adminEmail: String(settings.adminEmail ?? ''),
    language: String(settings.language || 'zh-CN'),
    timezone: String(settings.timezone || 'Asia/Shanghai'),
    dateFormat: String(settings.dateFormat || 'YYYY-MM-DD'),
    theme: String(settings.theme ?? ''),
    passwordComplexity: Boolean(settings.passwordComplexity),
    minPasswordLength: Number(settings.minPasswordLength ?? 6),
    sessionTimeout: Number(settings.sessionTimeout ?? 1440),
    maxLoginAttempts: Number(settings.maxLoginAttempts ?? 5),
    ipWhitelist: String(settings.ipWhitelist ?? ''),
    backupLocation: String(settings.backupLocation ?? ''),
    smtpServer: String(settings.smtpServer ?? ''),
    smtpPort: Number(settings.smtpPort ?? 587),
    smtpUsername: String(settings.smtpUsername ?? ''),
    smtpPassword: String(settings.smtpPassword ?? ''),
    senderEmail: String(settings.senderEmail ?? '')
  })
}

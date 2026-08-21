export const SAVE_IMPORT_TERMINAL_JOB_STATES = new Set(['succeeded', 'failed', 'canceled'])
export const SAVE_IMPORT_ARCHIVE_EXTENSIONS = Object.freeze(['.zip', '.tar', '.tar.gz', '.tgz'])

const DIRECTORY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/

export function saveImportStatusKey(status) {
  const value = String(status || '').toLowerCase()
  return ['uploaded', 'analyzing', 'ready', 'invalid', 'applying', 'applied'].includes(value)
    ? `backups.imports.statuses.${value}`
    : 'backups.imports.statuses.unknown'
}

export function saveImportStatusVariant(status) {
  if (status === 'invalid') return 'destructive'
  if (status === 'ready' || status === 'applied') return 'default'
  return 'secondary'
}

export function saveImportCompatibilityKey(compatibility) {
  const value = String(compatibility || '').toLowerCase()
  return ['ready', 'needs_attention', 'blocked'].includes(value)
    ? `backups.imports.compatibility.${value}`
    : 'backups.imports.compatibility.unknown'
}

export function saveImportCompatibilityVariant(compatibility) {
  if (compatibility === 'blocked') return 'destructive'
  if (compatibility === 'ready') return 'default'
  return 'secondary'
}

export function saveImportDiagnosticKey(code) {
  const normalized = String(code || '').trim()
  return normalized ? `backups.imports.diagnostics.${normalized}` : ''
}

export function saveImportDiagnosticVariant(severity) {
  return severity === 'error' ? 'destructive' : 'default'
}

export function saveImportRoleKey(role) {
  const value = String(role || '').toLowerCase()
  return ['master', 'caves', 'custom'].includes(value)
    ? `backups.imports.roles.${value}`
    : 'backups.imports.roles.custom'
}

export function isSupportedSaveImportFile(fileName) {
  const value = String(fileName || '').trim().toLowerCase()
  return SAVE_IMPORT_ARCHIVE_EXTENSIONS.some(extension => value.endsWith(extension))
}

export function missingWorkshopMods(candidate) {
  return (candidate?.mods || []).filter(mod => !mod.downloaded)
}

export function hasCandidateDiagnostic(candidate, code) {
  return (candidate?.diagnostics || []).some(diagnostic => diagnostic.code === code)
}

export function defaultSaveImportPlan(candidate, mode = 'new') {
  const replacement = mode === 'replace'
  return {
    candidateId: candidate?.id || '',
    mode,
    targetRoomId: '',
    directoryName: replacement ? '' : String(candidate?.directoryName || 'ImportedCluster'),
    roomName: replacement ? '' : String(candidate?.name || ''),
    confirmation: '',
    tokenPolicy: replacement ? 'preserve' : (candidate?.tokenPresent ? 'source' : 'provided'),
    clusterToken: '',
    networkPolicy: replacement ? 'preserve' : 'auto',
    modPolicy: missingWorkshopMods(candidate).length ? 'install_missing' : 'require_downloaded',
    allowPartial: false,
    allowMissingToken: false
  }
}

export function normalizeSaveImportPlan(plan, candidate) {
  const result = { ...plan, candidateId: candidate?.id || plan.candidateId }
  if (result.mode === 'replace') {
    result.directoryName = ''
    result.roomName = ''
  } else {
    result.targetRoomId = ''
    result.confirmation = ''
    if (result.tokenPolicy === 'preserve') result.tokenPolicy = candidate?.tokenPresent ? 'source' : 'provided'
    if (result.networkPolicy === 'preserve') result.networkPolicy = 'auto'
  }
  if (result.tokenPolicy !== 'provided') result.clusterToken = ''
  if (result.tokenPolicy !== 'none' && !(result.tokenPolicy === 'source' && !candidate?.tokenPresent)) {
    result.allowMissingToken = false
  }
  if (!hasCandidateDiagnostic(candidate, 'MASTER_MISSING')) result.allowPartial = false
  return result
}

export function validateSaveImportPlan(plan, candidate, targetRoom) {
  if (!candidate?.id) return 'candidateRequired'
  if (candidate.compatibility === 'blocked') return 'candidateBlocked'
  if (plan.mode === 'replace') {
    if (!targetRoom) return 'targetRequired'
    if (plan.confirmation !== targetRoom.name) return 'confirmationMismatch'
  } else if (!DIRECTORY_PATTERN.test(String(plan.directoryName || ''))) {
    return 'directoryInvalid'
  }
  if (plan.tokenPolicy === 'provided' && !String(plan.clusterToken || '').trim()) return 'tokenRequired'
  if (plan.tokenPolicy === 'source' && !candidate.tokenPresent && !plan.allowMissingToken) return 'missingTokenNotAllowed'
  if (plan.tokenPolicy === 'none' && !plan.allowMissingToken) return 'missingTokenNotAllowed'
  if (hasCandidateDiagnostic(candidate, 'MASTER_MISSING') && !plan.allowPartial) return 'partialNotAllowed'
  return ''
}

export function saveImportJobFailure(job) {
  const target = (job?.targets || []).find(item => item?.status === 'failed' || item?.error)
  return target?.error || job?.error || null
}

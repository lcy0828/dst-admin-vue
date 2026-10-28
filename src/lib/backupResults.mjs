const failureCodes = new Set([
  'SNAPSHOT_ROUND_UNCONFIRMED', 'SAVE_IN_PROGRESS', 'TARGET_SNAPSHOT_PASSED',
  'SAVE_WRITE_FAILED', 'BARRIER_EXPIRED', 'BACKUP_TIMEOUT', 'RUNTIME_UPDATE_REQUIRED',
  'HOT_BACKUP_UNAVAILABLE', 'TOPOLOGY_CHANGED', 'ARCHIVE_INTEGRITY_FAILED', 'CONTROLLER_RESTARTED'
])

export function backupArtifactState(value) {
  if (value?.artifactState) return value.artifactState
  if (value?.verifiedAt || Number(value?.size) > 0 || value?.status === 'verified') return 'available'
  return value?.status === 'creating' || value?.status === 'staging' ? 'staging' : 'not_generated'
}

export function backupFailureMessage(value, operation, t) {
  const state = backupArtifactState(value)
  if (state === 'missing' || state === 'corrupt') return t(`distributed.backups.artifacts.${state}`)
  let code = value?.failureCode
  const original = value?.failure || operation?.failure || value?.validationError || ''
  // Legacy failed rows retain the original evidence, with a readable summary.
  if (!code && original.includes('cross-shard snapshot barrier failed')) code = 'SNAPSHOT_ROUND_UNCONFIRMED'
  if (failureCodes.has(code)) return t(`distributed.backups.failureReasons.${code}`)
  return original
}

export function verifiedBackupParts(value) {
  return (value?.parts || []).filter(part => part.status === 'verified' && backupArtifactState(part) === 'available').length
}

const UNAVAILABLE_CODES = new Set([
  'ENDPOINT_NOT_FOUND',
  'METHOD_NOT_ALLOWED',
  'MOD_PUBLICATION_UNAVAILABLE',
  'NOT_FOUND',
  'ROUTE_NOT_FOUND'
])

const TERMINAL_STATES = new Set([
  'canceled',
  'failed',
  'recovery_required',
  'rolled_back',
  'skipped',
  'succeeded'
])

const ACTIVE_ACTIVATION_STATES = new Set(['pending', 'restarting', 'confirming'])

const ACTIVATION_STATUS_KEYS = Object.freeze({
  skipped: 'skipped',
  pending: 'pending',
  restarting: 'restarting',
  confirming: 'confirming',
  succeeded: 'succeeded',
  failed: 'failed'
})

const STATUS_KEYS = Object.freeze({
  queued: 'queued',
  running: 'running',
  succeeded: 'succeeded',
  failed: 'failed',
  skipped: 'skipped',
  canceled: 'canceled',
  rolled_back: 'rolledBack',
  recovery_required: 'recoveryRequired',
  previewed: 'previewed',
  preparing: 'preparing',
  prepared: 'prepared',
  publishing: 'publishing',
  committed: 'committed',
  completing: 'completing'
})

const PHASE_KEYS = Object.freeze({
  preflight: 'preflight',
  stage: 'stage',
  staging: 'stage',
  download: 'download',
  downloading: 'download',
  verify: 'verify',
  verifying: 'verify',
  backup: 'backup',
  configure: 'configure',
  configuring: 'configure',
  publish: 'publish',
  publishing: 'publish',
  reconcile: 'reconcile',
  rollback: 'rollback',
  rolled_back: 'rollback',
  complete: 'complete',
  completing: 'complete'
})

const BLOCKER_KEYS = Object.freeze({
  NODE_OFFLINE: 'nodeOffline',
  TARGET_OFFLINE: 'nodeOffline',
  PLACEMENT_CHANGED: 'placementChanged',
  TOPOLOGY_REVISION_CONFLICT: 'placementChanged',
  MOD_PUBLICATION_TOPOLOGY_CHANGED: 'topologyChanged',
  TARGET_OBSERVE_FAILED: 'nodeOffline',
  RUNTIME_VERSION_BLOCKED: 'capabilityMissing',
  DISK_INSUFFICIENT: 'insufficientDisk',
  INSUFFICIENT_DISK: 'insufficientDisk',
  INSUFFICIENT_DISK_SPACE: 'insufficientDisk',
  MOD_MISSING: 'missingMod',
  WORKSHOP_DOWNLOAD_MISSING: 'missingMod',
  CHECKSUM_MISMATCH: 'checksumMismatch',
  BACKUP_FAILED: 'backupFailure',
  BACKUP_FAILURE: 'backupFailure',
  CAPABILITY_MISSING: 'capabilityMissing',
  MOD_PUBLICATION_CAPABILITY_MISSING: 'capabilityMissing',
  MOD_VERSION_CONFLICT: 'versionConflict'
})

const PROGRESS_BY_STATUS = Object.freeze({
  queued: 5,
  previewed: 5,
  preparing: 20,
  prepared: 40,
  publishing: 60,
  committed: 75,
  completing: 90,
  running: 50,
  succeeded: 100,
  failed: 100,
  canceled: 100,
  skipped: 100,
  rolled_back: 100,
  recovery_required: 100
})

export function isModPublicationUnavailable(error) {
  return UNAVAILABLE_CODES.has(String(error?.code || '').toUpperCase())
}

export function publicationStatusKey(status) {
  return STATUS_KEYS[String(status || '').trim().toLowerCase()] || 'unknown'
}

export function publicationPhaseKey(phase) {
  return PHASE_KEYS[String(phase || '').trim().toLowerCase()] || 'unknown'
}

export function publicationOutcomeKey(outcome) {
  const normalized = String(outcome || '').trim().toLowerCase()
  return ['full', 'partial', 'none'].includes(normalized) ? normalized : 'unknown'
}

export function publicationBlockerKey(code) {
  return BLOCKER_KEYS[String(code || '').trim().toUpperCase()] || 'unknown'
}

export function publicationStatusVariant(status) {
  const key = publicationStatusKey(status)
  if (['failed', 'recoveryRequired'].includes(key)) return 'destructive'
  if (['succeeded', 'committed'].includes(key)) return 'default'
  if (['running', 'preparing', 'prepared', 'publishing', 'completing'].includes(key)) return 'secondary'
  return 'outline'
}

export function publicationProgress(value) {
  const explicit = Number(value?.progress)
  if (Number.isFinite(explicit)) return Math.min(100, Math.max(0, explicit))
  if (value?.completed) return 100
  if (value?.published) return 75
  if (value?.prepared) return 40
  return PROGRESS_BY_STATUS[String(value?.status || '').trim().toLowerCase()] || 0
}

export function publicationTargetPhase(target) {
  if (target?.rolledBack) return 'rollback'
  if (target?.completed) return 'complete'
  if (target?.published) return 'publish'
  if (target?.prepared) return 'stage'
  if (target?.cacheEnsured) return 'download'
  return target?.status || ''
}

export function publicationIsTerminal(value) {
  return TERMINAL_STATES.has(String(value?.status || '').trim().toLowerCase())
}

export function publicationActivationStatusKey(status) {
  return ACTIVATION_STATUS_KEYS[String(status || '').trim().toLowerCase()] || 'unknown'
}

export function publicationActivationStatusVariant(status) {
  const key = publicationActivationStatusKey(status)
  if (key === 'failed') return 'destructive'
  if (key === 'succeeded') return 'default'
  if (ACTIVE_ACTIVATION_STATES.has(key)) return 'secondary'
  return 'outline'
}

export function publicationNeedsPolling(value) {
  return !publicationIsTerminal(value) || ACTIVE_ACTIVATION_STATES.has(String(value?.activation?.status || '').trim().toLowerCase())
}

export function publicationCanActivate(value) {
  const status = String(value?.status || '').trim().toLowerCase()
  const activation = String(value?.activation?.status || '').trim().toLowerCase()
  return status === 'succeeded' && value?.commitDecision === true && value?.restartRequired === true && !ACTIVE_ACTIVATION_STATES.has(activation)
}

export function publicationTargetWorlds(target) {
  return (target?.worlds || []).map(world => world.worldName || world.name || world.worldId || world.id).filter(Boolean)
}

export function publicationTargetName(target) {
  return target?.targetName || target?.name || target?.nodeId || target?.targetId || '--'
}

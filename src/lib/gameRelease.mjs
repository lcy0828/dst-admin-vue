const RELEASE_STAGES = new Set([
  'previewed',
  'protecting',
  'stopping',
  'staged',
  'updating',
  'verified',
  'restarting',
  'confirming',
  'succeeded',
  'failed',
  'recovery_required'
])

const TERMINAL_RELEASE_STAGES = new Set(['succeeded', 'failed', 'recovery_required'])
const RETRYABLE_RELEASE_STAGES = new Set(['failed', 'recovery_required'])

const BLOCKER_KEYS = Object.freeze({
  TARGET_OFFLINE: 'targetOffline',
  INVENTORY_STALE: 'inventoryStale',
  CAPABILITY_MISSING: 'capabilityMissing',
  INSTALLATION_IDENTITY_INVALID: 'installationIdentityInvalid',
  INSTALLATION_MISSING: 'installationMissing',
  STEAMCMD_UNAVAILABLE: 'steamcmdUnavailable',
  UPDATE_UNSUPPORTED: 'updateUnsupported',
  DISK_INSUFFICIENT: 'diskInsufficient',
  VERSION_OBSERVE_FAILED: 'versionObserveFailed',
  SHARD_INVENTORY_MISSING: 'shardInventoryMissing',
  SHARD_STATUS_FAILED: 'shardStatusFailed'
})

export function gameReleaseStageKey(stage) {
  const normalized = String(stage || '').toLowerCase()
  return RELEASE_STAGES.has(normalized) ? normalized : 'unknown'
}

export function gameReleaseStageVariant(stage) {
  const normalized = gameReleaseStageKey(stage)
  if (normalized === 'failed' || normalized === 'recovery_required') return 'destructive'
  if (normalized === 'succeeded' || normalized === 'verified') return 'secondary'
  return 'outline'
}

export function gameReleaseIsTerminal(release) {
  return TERMINAL_RELEASE_STAGES.has(gameReleaseStageKey(release?.stage))
}

export function gameReleaseCanRetry(release) {
  return Boolean(release?.id && RETRYABLE_RELEASE_STAGES.has(gameReleaseStageKey(release?.stage)))
}

export function gameReleaseBlockerKey(code) {
  return BLOCKER_KEYS[String(code || '').toUpperCase()] || 'unknown'
}

export function gameReleaseJobIsTerminal(job) {
  return ['succeeded', 'failed', 'canceled'].includes(String(job?.status || '').toLowerCase())
}

export function gameReleaseJobFailed(job) {
  return ['failed', 'canceled'].includes(String(job?.status || '').toLowerCase())
}

export function gameReleaseJobProgress(job) {
  const progress = Number(job?.progress)
  if (!Number.isFinite(progress)) return null
  return Math.min(100, Math.max(0, progress))
}

export function gameReleaseFindByJob(releases, jobId) {
  return (Array.isArray(releases) ? releases : []).find(item => item?.sourceJobId === jobId) || null
}

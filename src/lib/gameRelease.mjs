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
  'recovery_required',
  'abandoned'
])

const TERMINAL_RELEASE_STAGES = new Set(['succeeded', 'failed', 'recovery_required', 'abandoned'])
const RETRYABLE_RELEASE_STAGES = new Set(['failed', 'recovery_required'])

const BLOCKER_KEYS = Object.freeze({
  TARGET_OFFLINE: 'targetOffline',
  INVENTORY_STALE: 'inventoryStale',
  INVENTORY_REFRESH_FAILED: 'inventoryRefreshFailed',
  SHARD_RUNNING: 'shardRunning',
  BACKUP_DISK_INSUFFICIENT: 'backupDiskInsufficient',
  CAPABILITY_MISSING: 'capabilityMissing',
  INSTALLATION_IDENTITY_INVALID: 'installationIdentityInvalid',
  INSTALLATION_MISSING: 'installationMissing',
  STEAMCMD_UNAVAILABLE: 'steamcmdUnavailable',
  STEAM_CLIENT_UPDATE_REQUIRED: 'steamClientUpdateRequired',
  UPDATE_UNSUPPORTED: 'updateUnsupported',
  DISK_INSUFFICIENT: 'diskInsufficient',
  VERSION_OBSERVE_FAILED: 'versionObserveFailed',
  VERSION_CHECK_TIMEOUT: 'versionCheckTimeout',
  LATEST_BUILD_UNAVAILABLE: 'latestBuildUnavailable',
  SHARD_INVENTORY_MISSING: 'shardInventoryMissing',
  SHARD_STATUS_FAILED: 'shardStatusFailed'
})

const PLATFORM_KEYS = Object.freeze({
  darwin: 'macos',
  mac: 'macos',
  macos: 'macos',
  linux: 'linux',
  windows: 'windows',
  win32: 'windows'
})

const APPLICATION_KEYS = Object.freeze({
  '322330': 'gameClient',
  '343050': 'dedicatedServer'
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

export function gameReleaseCanFinish(release) {
  return gameReleaseCanRetry(release) && Boolean(release?.plan?.planHash) &&
    Array.isArray(release.installations) && release.installations.length > 0 &&
    release.installations.length === release.plan.installations?.length &&
    release.installations.every(item => ['verified', 'succeeded'].includes(item.stage))
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

export function gameReleaseInstallationStatus(installation) {
  if ((installation?.blockers || []).length) return { key: 'blocked', variant: 'destructive' }
  if (installation?.upToDate && installation?.updateMethod === 'steam-client') {
    return { key: 'steamManaged', variant: 'outline' }
  }
  if (installation?.upToDate) return { key: 'upToDate', variant: 'secondary' }
  return { key: 'ready', variant: 'outline' }
}

export function gameReleaseNodeCount(installations) {
  const targetIds = new Set()
  for (const installation of installations || []) {
    const targetId = String(installation?.targetId || '').trim()
    if (targetId) targetIds.add(targetId)
  }
  return targetIds.size
}

export function gameReleaseGameVersions(installations) {
  return [...new Set((installations || [])
    .map(installation => String(installation?.gameVersion || '').trim())
    .filter(Boolean))]
}

export function gameReleasePlatformKey(value) {
  return PLATFORM_KEYS[String(value || '').trim().toLowerCase()] || 'unknown'
}

export function gameReleaseApplicationKey(value) {
  return APPLICATION_KEYS[String(value || '').trim()] || 'unknown'
}

export function gameReleaseVersionChannels(installations) {
  const channels = []
  const channelByKey = new Map()
  for (const installation of installations || []) {
    const appId = String(installation?.appId || '').trim()
    const updateMethod = String(installation?.updateMethod || '').trim().toLowerCase()
    const platformKey = gameReleasePlatformKey(installation?.os)
    const key = `${appId}\u0000${updateMethod}`
    let channel = channelByKey.get(key)
    if (!channel) {
      channel = { appId, updateMethod, platformKeys: [] }
      channelByKey.set(key, channel)
      channels.push(channel)
    }
    if (!channel.platformKeys.includes(platformKey)) channel.platformKeys.push(platformKey)
  }
  return channels
}

export function gameReleaseRecoveryRequest(release, { validateUnknown = false } = {}) {
  const plan = release?.plan || {}
  const installations = plan.selectedInstallations?.length
    ? plan.selectedInstallations
    : (plan.installations || []).map(({ targetId, installationId }) => ({ targetId, installationId }))
  return { installations: installations.map(item => ({ ...item })), policy: { ...(plan.policy || {}), ...(validateUnknown ? { validate: true } : {}) } }
}

export function gameReleaseWriteState(state) {
  return ['not_started', 'dispatched', 'unknown', 'failed', 'version_changed', 'verified'].includes(state) ? state : 'unavailable'
}

// Use the names captured by this update, even if a room is renamed or deleted
// later. No extra room/node requests are needed while polling progress.
export function gameReleaseResultRows(release) {
  const plans = release?.plan?.installations || []
  const installations = (release?.installations || []).map(result => ({
    ...plans.find(plan => plan.targetId === result.targetId && plan.installationId === result.installationId),
    ...result
  }))
  const shards = (release?.shards || []).map(result => {
    const installation = plans.find(plan => plan.targetId === result.targetId && plan.installationId === result.installationId)
    const planned = installation?.shards?.find(shard => shard.roomId === result.roomId && shard.worldId === result.worldId)
    return { ...planned, ...result, targetName: installation?.targetName }
  })
  const backups = (release?.plan?.affectedRoomIds || []).map((roomId, index) => {
    const shard = plans.flatMap(plan => plan.shards || []).find(shard => shard.roomId === roomId)
    return { roomId, roomName: shard?.roomName || shard?.roomDirectory || '', id: release?.protectionBackupIds?.[index] || '' }
  })
  return { installations, shards, backups }
}

export function gameReleaseProgress(release) {
  const rows = gameReleaseResultRows(release)
  const stage = gameReleaseStageKey(release?.stage)
  const terminal = gameReleaseIsTerminal(release)
  const running = rows.shards.filter(shard => shard.wasRunning)
  const restore = release?.plan?.policy?.restartRunning !== false ? running : []
  const counts = [
    [running.filter(shard => shard.stoppedAt || shard.stage === 'staged' && shard.runtimeState === 'stopped').length, running.length],
    [rows.backups.filter(backup => backup.id).length, rows.backups.length],
    [rows.installations.filter(item => ['verified', 'succeeded'].includes(item.stage)).length, rows.installations.length],
    [restore.filter(shard => shard.startedAt && ['confirming', 'succeeded'].includes(shard.stage)).length, restore.length],
    [restore.filter(shard => shard.loadConfirmedAt && shard.stage === 'succeeded').length, restore.length]
  ]
  const stages = ['stopping', 'protecting', 'updating', 'restarting', 'confirming']
  const current = ({ stopping: 0, protecting: 1, staged: 2, updating: 2, verified: 2, restarting: 3, confirming: 4 })[stage] ?? -1
  // Counts come from recorded evidence. A failed job's generic 100% only means
  // it finished processing; it must not turn incomplete update steps green.
  const noUpdate = release?.plan?.updateRequired === false
  let interrupted = terminal && stage !== 'succeeded' ? counts.findIndex(([done, total]) => done < total) : -1
  if (interrupted < 0 && terminal && stage !== 'succeeded') interrupted = 4
  const steps = stages.map((key, index) => {
    const [done, total] = counts[index]
    const skipped = noUpdate || total === 0 || stage === 'abandoned' && index >= 3
    const complete = !skipped && done === total
    let state = skipped ? 'skipped' : complete ? 'done' : 'pending'
    if (!terminal && index === current && !skipped && !complete) state = 'active'
    if (index === interrupted && !skipped) state = 'interrupted'
    return { key, done, total, state }
  })
  return {
    stage, terminal, steps, rows,
    completed: steps.filter(step => ['done', 'skipped'].includes(step.state)).length,
    restored: counts[4][0], restoreTotal: restore.length,
    keptStopped: rows.shards.length - restore.length,
    noUpdate
  }
}

export function gameReleaseShardState(shard, release) {
  if (release?.stage === 'abandoned') return shard?.runtimeState === 'running' ? 'running' : 'stopped'
  if (shard?.errorMessage || shard?.stage === 'failed') return 'failed'
  if (shard?.stage === 'succeeded') {
    if (shard.runtimeState === 'running') return 'running'
    if (shard.runtimeState === 'stopped') return shard.wasRunning ? 'stopped' : 'keptStopped'
    return 'completed'
  }
  if (shard?.stage === 'stopping' || shard?.stopRequestedAt && !shard?.stoppedAt) return 'stopping'
  if (shard?.stage === 'restarting') return 'restarting'
  if (shard?.stage === 'confirming') return 'confirming'
  if (!shard?.wasRunning) return 'keptStopped'
  if (shard?.stoppedAt || shard?.runtimeState === 'stopped') {
    return release?.plan?.policy?.restartRunning === false ? 'stopped' : 'waitingRestore'
  }
  return 'pending'
}

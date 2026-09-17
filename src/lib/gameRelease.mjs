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

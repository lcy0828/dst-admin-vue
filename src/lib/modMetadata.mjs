const readyVersionStates = new Set(['ready', 'current', 'outdated', 'unknown'])
const text = value => String(value || '').trim()
const timestamp = value => Math.max(0, Date.parse(value) || 0)

// Display-only comparison, matching the server's manifest > timestamp > version
// precedence. Mutations and update jobs still recheck on the server.
export function runtimeModVersionStatus(current = {}, latest = {}) {
  if (!readyVersionStates.has(current.status)) return current.status
  const manifest = text(current.steamManifestId)
  const latestManifest = text(latest.steamManifestId)
  if (manifest && latestManifest) return manifest === latestManifest ? 'current' : 'outdated'
  const updated = timestamp(current.steamUpdatedAt)
  const latestUpdated = timestamp(latest.updatedAt)
  if (updated && latestUpdated) return latestUpdated > updated + 1000 ? 'outdated' : 'current'
  const version = text(current.version)
  const latestVersion = text(latest.version)
  if (version && latestVersion) return version === latestVersion ? 'current' : 'outdated'
  return 'unknown'
}

export function enrichModMetadata(items = [], metadata = {}) {
  return items.map(item => {
    const id = text(item.modid || item.id)
    const latest = metadata[id]
    if (!latest) return item
    const hasVersionEvidence = Boolean(text(latest.steamManifestId) || text(latest.version) || timestamp(latest.updatedAt))
    const runtimeVersions = (item.runtimeVersions || []).map(current => {
      const status = runtimeModVersionStatus(current, latest)
      return { ...current, status: status === 'unknown' && current.status === 'outdated' ? 'outdated' : status }
    })
    const versions = new Set(runtimeVersions.map(current => text(current.version)).filter(Boolean))
    const current = runtimeVersions.filter(value => value.status === 'current').length
    const outdated = runtimeVersions.filter(value => value.status === 'outdated').length
    const unknown = runtimeVersions.filter(value => value.status === 'unknown').length
    const versionStatus = versions.size > 1 ? 'mixed'
      : outdated > 0 ? 'outdated'
        : current > 0 && unknown === 0 ? 'current'
          : unknown > 0 ? 'unknown' : item.runtimeVersionStatus
    const rating = Number(latest.ratingCount) > 0 || Number(latest.score) > 0 ? Number(latest.score) : null
    return {
      ...item,
      name: text(latest.name) || item.name,
      author: text(latest.author) || item.author,
      description: latest.description || item.description,
      image: latest.previewUrl || item.image,
      latestVersion: latest.version || (!hasVersionEvidence ? item.latestVersion : '') || '',
      updatedAt: timestamp(latest.updatedAt) ? latest.updatedAt : item.updatedAt,
      update_time: timestamp(latest.updatedAt) ? latest.updatedAt : item.update_time,
      subscriptions: Number(latest.subscriptions) || 0,
      subscribers: String(Number(latest.subscriptions) || 0),
      rating,
      ratingCount: Number(latest.ratingCount) || 0,
      tags: latest.tags || item.tags,
      runtimeVersions,
      runtimeCurrentTargets: current,
      runtimeOutdatedTargets: outdated,
      runtimeUnknownVersionTargets: unknown,
      runtimeVersionStatus: versionStatus,
      updateAvailable: outdated > 0 || (!hasVersionEvidence && item.updateAvailable === true)
    }
  })
}

function clean(value) {
  return String(value || '').trim()
}

function modId(value = {}) {
  return clean(value.modid || value.id)
}

function runtimeCatalogMod(item = {}) {
  const id = modId(item)
  return {
    id,
    modid: id,
    name: clean(item.name) || `Workshop ${id}`,
    author: clean(item.author),
    description: clean(item.description),
    image: clean(item.previewUrl || item.image),
    version: clean(item.currentVersion || item.version),
    currentVersion: clean(item.currentVersion),
    latestVersion: clean(item.latestVersion || item.version),
    update_time: item.updatedAt || item.steamUpdatedAt || '',
    updatedAt: item.updatedAt || item.steamUpdatedAt || '',
    subscribers: String(Number(item.subscriptions) || 0),
    subscriptions: Number(item.subscriptions) || 0,
    rating: Number(item.score) || 0,
    ratingCount: Number(item.ratingCount) || 0,
    tags: Array.isArray(item.tags) ? item.tags : [],
    configured: false,
    enabled: false,
    installed: true,
    downloaded: false,
    loaded: false,
    machineOnly: true,
    configuredWorlds: [],
    enabledWorlds: [],
    installedWorlds: [],
    loadedWorlds: [],
    runtimeVersions: [],
    runtimeReadyTargets: 0,
    runtimePendingTargets: 0,
    runtimeUnavailableTargets: 0,
    runtimeTotalTargets: 0,
    updateAvailable: item.versionStatus === 'outdated'
  }
}

export function mergeRoomModCatalog(configured = [], observations = []) {
  const items = new Map((configured || []).map(item => [modId(item), {
    ...item,
    machineOnly: false,
    runtimeVersions: [],
    runtimeReadyTargets: 0,
    runtimePendingTargets: 0,
    runtimeUnavailableTargets: 0,
    runtimeTotalTargets: 0
  }]).filter(([id]) => id))
  const endpoints = Array.isArray(observations) ? observations : []
  for (const observation of endpoints) {
    for (const runtimeMod of observation?.inventory?.items || []) {
      const id = modId(runtimeMod)
      if (!id) continue
      const current = items.get(id) || runtimeCatalogMod(runtimeMod)
      const versions = Array.isArray(current.runtimeVersions) ? [...current.runtimeVersions] : []
      versions.push({
        targetId: observation.targetId,
        targetName: observation.name || '',
        installationId: observation.installationId,
        version: runtimeMod.currentVersion || '',
        steamManifestId: runtimeMod.steamManifestId || '',
        steamUpdatedAt: runtimeMod.steamUpdatedAt || null,
        status: runtimeMod.fileStatus && runtimeMod.fileStatus !== 'ready' ? runtimeMod.fileStatus : runtimeMod.versionStatus || 'unknown',
        metadataReason: runtimeMod.metadataReason || ''
      })
      const ready = runtimeMod.fileStatus === 'ready'
      items.set(id, {
        ...current,
        name: current.name || runtimeMod.name || `Workshop ${id}`,
        author: current.author || runtimeMod.author || '',
        image: current.image || runtimeMod.previewUrl || '',
        currentVersion: current.currentVersion || runtimeMod.currentVersion || '',
        latestVersion: current.latestVersion || runtimeMod.latestVersion || '',
        runtimeVersions: versions,
        runtimeReadyTargets: Number(current.runtimeReadyTargets) + (ready ? 1 : 0),
        runtimePendingTargets: Number(current.runtimePendingTargets) + (ready ? 0 : 1),
        updateAvailable: Boolean(current.updateAvailable || runtimeMod.versionStatus === 'outdated')
      })
    }
  }
  const unavailable = endpoints.filter(item => item?.error).length
  const total = endpoints.length
  return [...items.values()].map(item => {
    const observed = item.runtimeVersions.length
    // Inventories omit missing Mods. Preserve each absent or unreachable
    // endpoint so the UI can name the machine and direct downloads there.
    const runtimeVersions = [...item.runtimeVersions]
    for (const endpoint of endpoints) {
      if (runtimeVersions.some(value => value.targetId === endpoint.targetId && value.installationId === endpoint.installationId)) continue
      runtimeVersions.push({ targetId: endpoint.targetId, targetName: endpoint.name || '', installationId: endpoint.installationId, status: endpoint.error ? 'unavailable' : 'missing' })
    }
    const missing = Math.max(0, total - unavailable - observed)
    const pending = Number(item.runtimePendingTargets) + unavailable + missing
    const statuses = item.runtimeVersions.map(value => value.status)
    const currentTargets = statuses.filter(value => value === 'current').length
    const outdatedTargets = statuses.filter(value => value === 'outdated').length
    const versions = [...new Set(item.runtimeVersions.map(value => clean(value.version)).filter(Boolean))]
    const runtimeVersionStatus = versions.length > 1
      ? 'mixed'
      : outdatedTargets > 0
        ? 'outdated'
        : observed > 0 && currentTargets === observed
          ? 'current'
          : 'unknown'
    return {
      ...item,
      runtimeVersions,
      runtimeObserved: total > 0,
      runtimeFileStatus: total === 0 || unavailable > 0 ? 'unavailable' : pending > 0 ? 'pending' : 'ready',
      runtimeVersionStatus,
      runtimeCurrentTargets: currentTargets,
      runtimeOutdatedTargets: outdatedTargets,
      runtimeTotalTargets: total,
      runtimeUnavailableTargets: unavailable,
      runtimePendingTargets: pending,
      updateAvailable: Boolean(item.updateAvailable || outdatedTargets > 0)
    }
  })
}

export function roomModSortWeight(item = {}, worldIds = []) {
  const configured = new Set(item.configuredWorlds || [])
  const enabled = new Set(item.enabledWorlds || [])
  const worlds = (worldIds || []).filter(Boolean)
  if (worlds.length > 0 && worlds.every(id => configured.has(id) && enabled.has(id))) return 0
  if (worlds.some(id => enabled.has(id))) return 1
  if (item.machineOnly) return 2
  return 3
}

function compareText(left, right) {
  return clean(left).localeCompare(clean(right), undefined, { numeric: true, sensitivity: 'base' })
}

export function sortRoomModCatalog(items = [], sortBy = 'enabled', worldIds = []) {
  return [...(items || [])].sort((left, right) => {
    let order = 0
    if (sortBy === 'enabled') order = roomModSortWeight(left, worldIds) - roomModSortWeight(right, worldIds)
    else if (sortBy === 'update_status') order = Number(Boolean(right.updateAvailable)) - Number(Boolean(left.updateAvailable))
    else if (sortBy === 'update_time') order = compareText(right.update_time || right.updatedAt, left.update_time || left.updatedAt)
    else if (sortBy === 'author') order = compareText(left.author, right.author)
    else if (sortBy === 'subscribers') order = (Number(right.subscriptions || right.subscribers) || 0) - (Number(left.subscriptions || left.subscribers) || 0)
    else if (sortBy === 'rating') order = (Number(right.rating) || 0) - (Number(left.rating) || 0)
    else order = compareText(left.name, right.name)
    return order || compareText(left.name, right.name) || compareText(modId(left), modId(right))
  })
}

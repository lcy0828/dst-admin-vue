export function runtimeInstallationKey(targetId, installationId) {
  return JSON.stringify([String(targetId || ''), String(installationId || '')])
}

export function parseRuntimeInstallationKey(value) {
  try {
    const parsed = JSON.parse(String(value || ''))
    if (!Array.isArray(parsed) || parsed.length !== 2 || !parsed[0] || !parsed[1]) return null
    return { targetId: String(parsed[0]), installationId: String(parsed[1]) }
  } catch {
    return null
  }
}

export function buildRuntimeInstallationOptions(response = {}, scopedTargetId = '') {
  const scopeTargetId = String(scopedTargetId || '').trim()
  const targets = (Array.isArray(response?.items) ? response.items : [])
    .filter(target => !scopeTargetId || String(target?.id || '').trim() === scopeTargetId)
  const options = []
  const seen = new Set()
  for (const target of targets) {
    const targetId = String(target?.id || '').trim()
    if (!targetId) continue
    const installations = Array.isArray(target.installations) && target.installations.length
      ? target.installations
      : [{ id: target?.config?.installationId || target?.defaultInstallationId || 'default' }]
    for (const installation of installations) {
      const installationId = String(installation?.id || '').trim()
      if (!installationId) continue
      const key = runtimeInstallationKey(targetId, installationId)
      if (seen.has(key)) continue
      seen.add(key)
      const machineName = String(target.name || target.hostname || targetId)
      options.push({
        key,
        targetId,
        installationId,
        machineName,
        label: installations.length > 1 ? `${machineName} · ${installationId}` : machineName,
        installationLabel: String(installation.displayName || installationId),
        online: Boolean(target.online),
        status: String(target.status || ''),
        default: targetId === response?.defaultTargetId && installationId === (target.defaultInstallationId || target?.config?.installationId || installationId)
      })
    }
  }
  return options.sort((left, right) => {
    if (left.default !== right.default) return left.default ? -1 : 1
    return left.label.localeCompare(right.label, undefined, { numeric: true })
  })
}

export function selectRuntimeInstallation(options = [], targetId = '', installationId = '') {
  const exact = options.find(option => option.targetId === targetId && option.installationId === installationId)
  return exact || options.find(option => option.default && option.online) || options.find(option => option.online) || options[0] || null
}

export function filterRuntimeMods(items = [], keyword = '', status = 'installed') {
  const normalized = String(keyword || '').trim().toLowerCase()
  return (items || []).filter(item => {
    const matchesKeyword = !normalized || [item.name, item.author, item.id]
      .some(value => String(value || '').toLowerCase().includes(normalized))
    const versionStatus = String(item.versionStatus || '')
    const matchesStatus = status === 'all' ||
      (status === 'installed' && (item.fileStatus === 'ready' || ['current', 'outdated', 'unknown'].includes(versionStatus))) ||
      (status === 'outdated' && versionStatus === 'outdated') ||
      (status === 'attention' && item.fileStatus !== 'ready')
    return matchesKeyword && matchesStatus
  })
}

export function groupRuntimeModRoomReferences(references = []) {
  const rooms = new Map()
  for (const reference of references || []) {
    const roomId = String(reference?.roomId || '').trim()
    const roomName = String(reference?.roomName || '').trim()
    if (!roomId && !roomName) continue

    const roomKey = roomId || `name:${roomName}`
    let room = rooms.get(roomKey)
    if (!room) {
      room = { key: roomKey, id: roomId, name: roomName || roomId, worlds: [] }
      rooms.set(roomKey, room)
    }

    const worldId = String(reference?.worldId || '').trim()
    const worldName = String(reference?.worldName || '').trim()
    if (!worldId && !worldName) continue
    const worldKey = worldId || `name:${worldName}`
    if (!room.worlds.some(world => world.key === worldKey)) {
      room.worlds.push({ key: worldKey, id: worldId, name: worldName || worldId })
    }
  }
  return [...rooms.values()]
}

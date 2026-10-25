// Canonical IDs are returned by the server. Keep Workshop-only actions strict.
export function isLocalMod(mod = {}) {
  return mod.source === 'local' || String(mod.modid || mod.id || '').startsWith('local:')
}

export function modDirectoryName(mod = {}) {
  if (mod.directoryName) return mod.directoryName
  const id = String(mod.modid || mod.id || '')
  return isLocalMod(mod) ? id.slice('local:'.length) : `workshop-${id}`
}

export function modSourceFields(mod = {}) {
  return { source: isLocalMod(mod) ? 'local' : 'workshop', directoryName: modDirectoryName(mod) }
}

export function workshopMetadataIds(items = []) {
  return [...new Set(items.filter(item => !isLocalMod(item))
    .map(item => String(item.modid || item.id || ''))
    .filter(id => /^[0-9]{1,20}$/.test(id)))]
}

export function localModCopy(mod = {}, scope = null) {
  const copies = mod.runtimeVersions || []
  const selected = scope || mod.detailsScope || copies[0]
  return selected?.targetId && selected?.installationId
    ? { targetId: selected.targetId, installationId: selected.installationId }
    : null
}

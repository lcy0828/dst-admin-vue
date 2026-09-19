const ATTENTION_STATES = new Set(['corrupt', 'unavailable'])
const PREPARE_STATES = new Set(['pending'])

// Persisted errors from older Controllers can contain one line per Mod.
// Keep diagnostics intact while presenting one short explanation on the home page.
export function roomModUpdateErrorKey(state) {
  const message = String(state?.errorMessage || '').trim()
  if (!message) return ''
  if (state?.errorCode === 'MOD_RUNTIME_UPDATE_FAILED') return 'mods.autoUpdate.errors.downloadFailed'
  if (state?.errorCode === 'MOD_WORLD_RESTART_FAILED') return 'mods.autoUpdate.errors.restartFailed'
  if (state?.errorCode === 'MOD_UPDATE_CHECK_FAILED' && message.split('\n').every(line =>
    /^Workshop \d+ 在 .+ 的版本未确认[：:]\s*(invalid|missing|not_installed)\s*$/.test(line.trim()))) {
    return 'mods.autoUpdate.errors.localFilesUnavailable'
  }
  const checkFailed = state?.errorCode === 'MOD_UPDATE_CHECK_FAILED' ||
    /GetPublishedFileDetails|load Steam Workshop details|版本未确认|未返回可比较的版本信息/i.test(message)
  if (checkFailed) {
    return /deadline exceeded|timed?\s*out|timeout|超时/i.test(message)
      ? 'mods.autoUpdate.errors.checkTimeout'
      : 'mods.autoUpdate.errors.checkFailed'
  }
  return 'mods.autoUpdate.errors.failed'
}

function modID(value) {
  return String(value?.modid || value?.id || '').trim()
}

// Fact refreshes omit Workshop presentation. Keep names and images while new
// metadata loads, but always take versions and operational state from fresh facts.
export function retainRoomModPresentation(items = [], previous = []) {
  const known = new Map(previous.map(item => [modID(item), item]))
  return items.map(item => {
    const id = modID(item)
    const cached = id ? known.get(id) : null
    if (!cached) return item
    const name = String(item.name || '').trim()
    return {
      ...item,
      name: (!name || name === `Workshop ${id}`) ? cached.name || item.name : item.name,
      image: item.image || cached.image || ''
    }
  })
}

function normalizedAvailableIDs(overview) {
  return new Set((overview?.state?.availableModIds || []).map(value => String(value).trim()).filter(Boolean))
}

export function roomModOperationalStatus(mod) {
  if (mod?.configured && !mod?.enabled) return 'disabled'
  const status = String(mod?.runtimeFileStatus || '').trim()
  if (status === 'pending') return (mod.runtimeVersions || []).some(item => item.status === 'invalid') ? 'corrupt' : 'pending'
  if (status === 'unavailable') return 'unavailable'
  if (status === 'corrupt') return 'corrupt'
  if (status === 'ready') return mod?.enabled ? 'enabled' : 'ready'
  return 'unavailable'
}

export function roomModStatusVariant(status) {
  if (status === 'enabled') return 'success'
  if (status === 'ready') return 'info'
  if (status === 'pending') return 'warning'
  if (status === 'corrupt' || status === 'unavailable') return 'destructive'
  return 'outline'
}

// Reuse the placement names already loaded by the page; this needs no request.
export function roomModFileStatusLabel(mod, targets, t) {
  const labels = (mod?.runtimeVersions || []).flatMap(item => {
    const status = item.status === 'invalid' ? 'incomplete_on'
      : ['missing', 'not_installed'].includes(item.status) ? 'missing_on'
        : item.status === 'unavailable' ? 'unavailable_on' : ''
    if (!status) return []
    const target = (targets || []).find(target => target?.id === item.targetId)
    const machine = item.targetId === 'local' ? t('servers.list.targets.local')
      : target?.name || target?.displayName || item.targetName || item.targetId
    if (!machine) return []
    return [t(`servers.workspace.mods.status.${status}`, { machine })]
  })
  return [...new Set(labels)].join(' · ')
}

function priority(row) {
  if (row.updateAvailable) return 0
  if (ATTENTION_STATES.has(row.status)) return 1
  if (PREPARE_STATES.has(row.status)) return 2
  return 3
}

export function buildRoomModOverview(mods = [], overview = null) {
  const available = normalizedAvailableIDs(overview)
  const rows = []
  const seen = new Set()

  for (const mod of mods || []) {
    const id = modID(mod)
    if (!id || seen.has(id)) continue
    seen.add(id)
    // The update workflow retains its IDs until worlds restart. Fresh disk
    // comparisons on every target take precedence over that pending restart.
    const currentOnAllTargets = Number(mod.runtimeTotalTargets) > 0
      && Number(mod.runtimeCurrentTargets) === Number(mod.runtimeTotalTargets)
    const updateAvailable = (available.has(id) && !currentOnAllTargets) || Number(mod.runtimeOutdatedTargets) > 0 || mod.updateAvailable === true || mod.health === 'update_available'
    rows.push({
      ...mod,
      id,
      modid: id,
      name: String(mod.name || `Workshop ${id}`).trim(),
      updateAvailable,
      status: roomModOperationalStatus(mod)
    })
  }

  return rows.sort((left, right) => {
    const severity = priority(left) - priority(right)
    if (severity !== 0) return severity
    return left.name.localeCompare(right.name, undefined, { numeric: true })
  })
}

export function roomModAttentionCount(rows = []) {
  return rows.filter(row => ATTENTION_STATES.has(row.status)).length
}

export function roomModPrepareCount(rows = []) {
  return rows.filter(row => PREPARE_STATES.has(row.status)).length
}

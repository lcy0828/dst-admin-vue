const MODES = new Set(['game', 'luajit', 'arena-gc'])

export function runtimeRequestOptions(input = {}) {
  const mode = input.runtime_mode || input.runtimeMode
  const version = input.runtime_version || input.runtimeVersion
  return {
    ...(mode ? { runtimeMode: mode } : {}),
    ...(version ? { runtimeVersion: version } : {}),
  }
}

// Inheritance is represented by an omitted mode, never by synthesizing game.
export async function resolveRuntimeSelection(input, loadModes, chooseMode) {
  const explicit = runtimeRequestOptions(input)
  if (explicit.runtimeMode || !(input?.choose_runtime_mode || input?.chooseRuntimeMode)) return explicit
  const response = await loadModes(input)
  const selection = await chooseMode(response?.data || response || {})
  if (!MODES.has(selection?.value)) throw new Error('INVALID_RUNTIME_SELECTION')
  return {
    runtimeMode: selection.value,
    ...(selection.version ? { runtimeVersion: selection.version } : {}),
  }
}

export function effectiveWorldRuntimeMode(world = {}) {
  const status = world.status || world.runtime?.state
  if (!['running', 'starting', 'stopped', 'failed'].includes(status)) return ''
  const active = ['running', 'starting'].includes(status)
  const mode = active ? world.runtimeMode || world.runtime?.runtimeMode : world.preferredRuntimeMode
  return MODES.has(mode) ? mode : ''
}

export function runtimeModeSummary(worlds = []) {
  if (!worlds.length) return 'inherit'
  const modes = worlds.map(effectiveWorldRuntimeMode)
  if (modes.some(mode => !mode)) return 'unknown'
  return new Set(modes).size > 1 ? 'mixed' : modes[0]
}

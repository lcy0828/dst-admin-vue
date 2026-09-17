export const GAME_RUNTIME_MODE = 'game'
export const LUAJIT_RUNTIME_MODES = ['luajit', 'arena-gc']

export function runtimeSelectionFromMode(mode) {
  return { engine: LUAJIT_RUNTIME_MODES.includes(mode) ? 'luajit' : 'game', generationalGCEnabled: mode === 'arena-gc' }
}

export function runtimeModeFromSelection({ engine, generationalGCEnabled }) {
  if (engine !== 'luajit') return GAME_RUNTIME_MODE
  return generationalGCEnabled ? 'arena-gc' : 'luajit'
}

export function firstSupportedLuaJITMode(modes, preferredMode = '') {
  const supported = new Set(Array.isArray(modes) ? modes : [])
  const candidates = [preferredMode, ...LUAJIT_RUNTIME_MODES]
  return candidates.find(mode => LUAJIT_RUNTIME_MODES.includes(mode) && supported.has(mode)) || ''
}

export function normalizeRuntimePackageVersion(value) {
  const match = String(value || '').trim().match(/^v?(\d+\.\d+\.\d+)$/i)
  return match?.[1] || ''
}

export function luaJITPackageOptions(availability) {
  return (Array.isArray(availability?.packages) ? availability.packages : [])
    .filter(option => option?.provider === 'dontstarve-luajit2' && normalizeRuntimePackageVersion(option?.version))
    .map(option => ({
      ...option,
      version: normalizeRuntimePackageVersion(option.version),
      platforms: Array.isArray(option.platforms) ? option.platforms : [],
    }))
}

export function preferredRuntimePackageVersion(availability) {
  const options = luaJITPackageOptions(availability)
  const targets = Array.isArray(availability?.targets) ? availability.targets : []
  const installed = [...new Set(targets
    .map(target => normalizeRuntimePackageVersion(target?.packageVersion))
    .filter(Boolean))]
  if (installed.length === 1 && options.some(option => option.version === installed[0])) return installed[0]

  const platforms = [...new Set(targets.map(target => String(target?.os || '').toLowerCase()).filter(Boolean))]
  if (platforms.length === 1) {
    const platform = platforms[0]
    const recommended = platform === 'darwin' ? '2.9.2' : '3.0.0'
    if (options.some(option => option.version === recommended && option.platforms.includes(platform))) return recommended
  }
  return options.find(option => targets.some(target => normalizeRuntimePackageVersion(target?.packageVersion) === option.version))?.version || options[0]?.version || ''
}

export function runtimePackageVersionReady(availability, version) {
  const normalized = normalizeRuntimePackageVersion(version)
  const option = luaJITPackageOptions(availability).find(item => item.version === normalized)
  const targets = Array.isArray(availability?.targets) ? availability.targets : []
  if (!option || targets.length === 0) return false

  return targets.every(target => {
    const platform = String(target?.os || '').toLowerCase()
    const supportedModes = Array.isArray(target?.supportedModes) ? target.supportedModes : []
    return option.platforms.includes(platform)
      && normalizeRuntimePackageVersion(target?.packageVersion) === normalized
      && LUAJIT_RUNTIME_MODES.some(mode => supportedModes.includes(mode))
  })
}

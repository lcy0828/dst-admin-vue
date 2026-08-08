const DEFAULTS = Object.freeze({
  systemName: '饥荒管理系统',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  dateFormat: 'YYYY-MM-DD',
  theme: '#3f7656'
})

const LEGACY_DEFAULT_THEME = '#d97932'

let current = { ...DEFAULTS }

function fieldValue(settings, id, fallback) {
  const field = settings?.fields?.find(item => item.id === id)
  return field?.value || fallback
}

function normalizeHex(value) {
  const match = /^#([0-9a-f]{6})/i.exec(value || '')
  const normalized = match ? `#${match[1].toLowerCase()}` : DEFAULTS.theme
  return normalized === LEGACY_DEFAULT_THEME ? DEFAULTS.theme : normalized
}

function mix(hex, target, amount) {
  const source = [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16))
  const destination = [1, 3, 5].map(index => Number.parseInt(target.slice(index, index + 2), 16))
  const channel = source.map((value, index) => Math.round(value + (destination[index] - value) * amount))
  return `#${channel.map(value => value.toString(16).padStart(2, '0')).join('')}`
}

export function applySystemPreferences(settings) {
  current = {
    systemName: fieldValue(settings, 'ui.systemName', DEFAULTS.systemName),
    language: fieldValue(settings, 'ui.language', DEFAULTS.language),
    timezone: fieldValue(settings, 'ui.timezone', DEFAULTS.timezone),
    dateFormat: fieldValue(settings, 'ui.dateFormat', DEFAULTS.dateFormat),
    theme: normalizeHex(fieldValue(settings, 'ui.theme', DEFAULTS.theme))
  }

  document.documentElement.lang = current.language
  const root = document.documentElement.style
  root.setProperty('--primary-color', current.theme)
  root.setProperty('--tech-accent-blue', current.theme)
  root.setProperty('--el-color-primary', current.theme)
  for (let index = 3; index <= 9; index += 1) {
    root.setProperty(`--el-color-primary-light-${index}`, mix(current.theme, '#ffffff', index / 10))
  }
  root.setProperty('--el-color-primary-dark-2', mix(current.theme, '#000000', 0.2))
  window.dispatchEvent(new CustomEvent('system-preferences-updated', { detail: { ...current } }))
  return { ...current }
}

export function getSystemPreferences() {
  return { ...current }
}

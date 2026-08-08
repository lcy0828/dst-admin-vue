import { DEFAULT_THEME_ID, normalizeThemeColor, resolveThemePreset } from '@/theme/themePresets'

const DEFAULTS = Object.freeze({
  systemName: '饥荒管理系统',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  dateFormat: 'YYYY-MM-DD',
  theme: '#e5482d',
  themePreset: DEFAULT_THEME_ID
})

let current = { ...DEFAULTS }

function fieldValue(settings, id, fallback) {
  const field = settings?.fields?.find(item => item.id === id)
  return field?.value || fallback
}

function mix(hex, target, amount) {
  const source = [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16))
  const destination = [1, 3, 5].map(index => Number.parseInt(target.slice(index, index + 2), 16))
  const channel = source.map((value, index) => Math.round(value + (destination[index] - value) * amount))
  return `#${channel.map(value => value.toString(16).padStart(2, '0')).join('')}`
}

function applyThemeVariables(themeValue) {
  const preset = resolveThemePreset(themeValue)
  const root = document.documentElement
  const style = root.style
  const borderLight = mix(preset.border, '#ffffff', 0.35)
  const borderLighter = mix(preset.border, '#ffffff', 0.62)
  const primaryLight = mix(preset.primary, '#ffffff', 0.9)
  const primaryDark = mix(preset.primary, '#000000', 0.2)
  const shadowRgb = [1, 3, 5]
    .map(index => Number.parseInt(preset.text.slice(index, index + 2), 16))
    .join(', ')

  const variables = {
    '--primary-color': preset.primary,
    '--accent-color': preset.accent,
    '--success-color': '#2f8a57',
    '--warning-color': '#c97908',
    '--danger-color': '#d14343',
    '--info-color': preset.muted,
    '--text-primary': preset.text,
    '--text-regular': preset.regular,
    '--text-secondary': preset.muted,
    '--border-color': preset.border,
    '--bg-color': preset.background,
    '--bg-color-light': preset.surface,
    '--bg-color-dark': preset.surfaceMuted,
    '--surface-color': preset.surface,
    '--surface-muted': preset.surfaceMuted,
    '--sidebar-color': preset.sidebar,
    '--sidebar-color-deep': preset.sidebarDeep,
    '--sidebar-text': preset.sidebarText,
    '--sidebar-active': preset.sidebarActive,
    '--sidebar-active-bg': mix(preset.sidebarActive, preset.sidebar, 0.92),
    '--shadow-card': `0 1px 2px rgba(${shadowRgb}, 0.06)`,
    '--shadow-card-hover': `0 2px 6px rgba(${shadowRgb}, 0.08)`,
    '--shadow-overlay': `0 12px 32px rgba(${shadowRgb}, 0.16)`,
    '--text-color-primary': preset.text,
    '--text-color-regular': preset.regular,
    '--text-color-secondary': preset.muted,
    '--text-color-placeholder': mix(preset.muted, '#ffffff', 0.2),
    '--border-color-base': preset.borderBase,
    '--border-color-light': preset.border,
    '--border-color-lighter': borderLight,
    '--border-color-extra-light': borderLighter,
    '--sidebar-bg': preset.sidebar,
    '--sidebar-active-text': preset.sidebarActive,
    '--sidebar-hover-bg': preset.sidebarDeep,
    '--header-bg': preset.surface,
    '--header-text': preset.regular,
    '--header-border': preset.border,
    '--card-bg': preset.surface,
    '--card-border': borderLight,
    '--table-header-bg': preset.surfaceMuted,
    '--table-row-hover-bg': mix(preset.surfaceMuted, '#ffffff', 0.42),
    '--table-border': borderLight,
    '--tech-white-primary': preset.surface,
    '--tech-white-secondary': preset.surfaceMuted,
    '--tech-white-tertiary': mix(preset.surfaceMuted, '#ffffff', 0.5),
    '--tech-accent-blue': preset.primary,
    '--tech-accent-light-blue': primaryLight,
    '--tech-accent-dark-blue': primaryDark,
    '--tech-text-primary': preset.text,
    '--tech-text-secondary': preset.regular,
    '--tech-text-tertiary': preset.muted,
    '--tech-border-light': preset.border,
    '--tech-border-lighter': borderLight,
    '--tech-border-extra-light': borderLighter,
    '--tech-success': '#2f8a57',
    '--tech-warning': '#c97908',
    '--tech-danger': '#d14343',
    '--tech-info': preset.muted,
    '--el-color-primary': preset.primary,
    '--el-color-success': '#2f8a57',
    '--el-color-warning': '#c97908',
    '--el-color-danger': '#d14343',
    '--el-color-info': preset.muted,
    '--el-text-color-primary': preset.text,
    '--el-text-color-regular': preset.regular,
    '--el-text-color-secondary': preset.muted,
    '--el-border-color': preset.borderBase,
    '--el-border-color-light': preset.border,
    '--el-border-color-lighter': borderLight,
    '--el-border-color-extra-light': borderLighter,
    '--el-fill-color-light': preset.surfaceMuted,
    '--el-fill-color-lighter': mix(preset.surfaceMuted, '#ffffff', 0.55),
    '--el-fill-color-extra-light': mix(preset.surfaceMuted, '#ffffff', 0.72),
    '--el-fill-color-blank': preset.surface,
    '--el-bg-color': preset.surface,
    '--el-bg-color-page': preset.background
  }

  for (const [name, value] of Object.entries(variables)) style.setProperty(name, value)
  for (let index = 3; index <= 9; index += 1) {
    style.setProperty(`--el-color-primary-light-${index}`, mix(preset.primary, '#ffffff', index / 10))
  }
  style.setProperty('--el-color-primary-dark-2', primaryDark)
  root.dataset.themePreset = preset.id
  return preset
}

function notifyPreferencesUpdated() {
  window.dispatchEvent(new CustomEvent('system-preferences-updated', { detail: { ...current } }))
}

export function applySystemPreferences(settings) {
  const theme = normalizeThemeColor(fieldValue(settings, 'ui.theme', DEFAULTS.theme))
  const preset = resolveThemePreset(theme)
  current = {
    systemName: fieldValue(settings, 'ui.systemName', DEFAULTS.systemName),
    language: fieldValue(settings, 'ui.language', DEFAULTS.language),
    timezone: fieldValue(settings, 'ui.timezone', DEFAULTS.timezone),
    dateFormat: fieldValue(settings, 'ui.dateFormat', DEFAULTS.dateFormat),
    theme,
    themePreset: preset.id
  }

  document.documentElement.lang = current.language
  applyThemeVariables(current.theme)
  notifyPreferencesUpdated()
  return { ...current }
}

export function previewSystemTheme(themeValue) {
  const theme = normalizeThemeColor(themeValue)
  const preset = applyThemeVariables(theme)
  current = { ...current, theme, themePreset: preset.id }
  notifyPreferencesUpdated()
  return { ...current }
}

export function getSystemPreferences() {
  return { ...current }
}

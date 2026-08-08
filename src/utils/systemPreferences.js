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

function luminance(hex) {
  const channels = [1, 3, 5]
    .map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function readableForeground(background) {
  const backgroundLuminance = luminance(background)
  const contrast = foreground => {
    const foregroundLuminance = luminance(foreground)
    return (Math.max(backgroundLuminance, foregroundLuminance) + 0.05)
      / (Math.min(backgroundLuminance, foregroundLuminance) + 0.05)
  }
  return contrast('#ffffff') >= contrast('#111111') ? '#ffffff' : '#111111'
}

function applyThemeVariables(themeValue) {
  const preset = resolveThemePreset(themeValue)
  const root = document.documentElement
  const style = root.style
  const darkMode = root.classList.contains('dark')
  const palette = darkMode
    ? {
        background: mix(preset.sidebarDeep, '#000000', 0.08),
        surface: mix(preset.sidebar, '#ffffff', 0.04),
        surfaceMuted: mix(preset.sidebar, '#ffffff', 0.09),
        text: '#f3f4f2',
        regular: '#d0d4d1',
        muted: '#a4aaa6',
        border: mix(preset.sidebar, '#ffffff', 0.16),
        borderBase: mix(preset.sidebar, '#ffffff', 0.26),
        sidebar: mix(preset.sidebar, '#000000', 0.05),
        sidebarDeep: mix(preset.sidebarDeep, '#000000', 0.1)
      }
    : preset
  const success = darkMode ? '#55a878' : '#2f8a57'
  const warning = darkMode ? '#e5a436' : '#c97908'
  const danger = darkMode ? '#e26262' : '#d14343'
  const borderLight = mix(palette.border, '#ffffff', darkMode ? 0.12 : 0.35)
  const borderLighter = mix(palette.border, darkMode ? '#000000' : '#ffffff', darkMode ? 0.18 : 0.62)
  const primaryLight = mix(preset.primary, '#ffffff', 0.9)
  const primaryDark = mix(preset.primary, '#000000', 0.2)
  const secondary = palette.surfaceMuted
  const semanticAccent = mix(preset.primary, palette.surface, darkMode ? 0.82 : 0.9)
  const shadowColor = darkMode ? '#000000' : palette.text
  const shadowRgb = [1, 3, 5]
    .map(index => Number.parseInt(shadowColor.slice(index, index + 2), 16))
    .join(', ')

  const variables = {
    '--primary-color': preset.primary,
    '--accent-color': preset.accent,
    '--success-color': success,
    '--warning-color': warning,
    '--danger-color': danger,
    '--info-color': palette.muted,
    '--text-primary': palette.text,
    '--text-regular': palette.regular,
    '--text-secondary': palette.muted,
    '--border-color': palette.border,
    '--bg-color': palette.background,
    '--bg-color-light': palette.surface,
    '--bg-color-dark': palette.surfaceMuted,
    '--surface-color': palette.surface,
    '--surface-muted': palette.surfaceMuted,
    '--sidebar-color': palette.sidebar,
    '--sidebar-color-deep': palette.sidebarDeep,
    '--sidebar-text': preset.sidebarText,
    '--sidebar-active': preset.sidebarActive,
    '--sidebar-active-bg': mix(preset.sidebarActive, palette.sidebar, 0.92),
    '--shadow-card': `0 1px 2px rgba(${shadowRgb}, 0.06)`,
    '--shadow-card-hover': `0 2px 6px rgba(${shadowRgb}, 0.08)`,
    '--shadow-overlay': `0 12px 32px rgba(${shadowRgb}, 0.16)`,
    '--text-color-primary': palette.text,
    '--text-color-regular': palette.regular,
    '--text-color-secondary': palette.muted,
    '--text-color-placeholder': mix(palette.muted, darkMode ? '#000000' : '#ffffff', 0.2),
    '--border-color-base': palette.borderBase,
    '--border-color-light': palette.border,
    '--border-color-lighter': borderLight,
    '--border-color-extra-light': borderLighter,
    '--sidebar-bg': palette.sidebar,
    '--sidebar-active-text': preset.sidebarActive,
    '--sidebar-hover-bg': palette.sidebarDeep,
    '--header-bg': palette.surface,
    '--header-text': palette.regular,
    '--header-border': palette.border,
    '--card-bg': palette.surface,
    '--card-border': borderLight,
    '--table-header-bg': palette.surfaceMuted,
    '--table-row-hover-bg': mix(palette.surfaceMuted, '#ffffff', darkMode ? 0.04 : 0.42),
    '--table-border': borderLight,
    '--tech-white-primary': palette.surface,
    '--tech-white-secondary': palette.surfaceMuted,
    '--tech-white-tertiary': mix(palette.surfaceMuted, '#ffffff', darkMode ? 0.05 : 0.5),
    '--tech-accent-blue': preset.primary,
    '--tech-accent-light-blue': primaryLight,
    '--tech-accent-dark-blue': primaryDark,
    '--tech-text-primary': palette.text,
    '--tech-text-secondary': palette.regular,
    '--tech-text-tertiary': palette.muted,
    '--tech-border-light': palette.border,
    '--tech-border-lighter': borderLight,
    '--tech-border-extra-light': borderLighter,
    '--tech-success': success,
    '--tech-warning': warning,
    '--tech-danger': danger,
    '--tech-info': palette.muted,
    '--el-color-primary': preset.primary,
    '--el-color-success': success,
    '--el-color-warning': warning,
    '--el-color-danger': danger,
    '--el-color-info': palette.muted,
    '--el-text-color-primary': palette.text,
    '--el-text-color-regular': palette.regular,
    '--el-text-color-secondary': palette.muted,
    '--el-border-color': palette.borderBase,
    '--el-border-color-light': palette.border,
    '--el-border-color-lighter': borderLight,
    '--el-border-color-extra-light': borderLighter,
    '--el-fill-color-light': palette.surfaceMuted,
    '--el-fill-color-lighter': mix(palette.surfaceMuted, '#ffffff', darkMode ? 0.04 : 0.55),
    '--el-fill-color-extra-light': mix(palette.surfaceMuted, '#ffffff', darkMode ? 0.07 : 0.72),
    '--el-fill-color-blank': palette.surface,
    '--el-bg-color': palette.surface,
    '--el-bg-color-page': palette.background,
    '--background': palette.background,
    '--foreground': palette.text,
    '--card': palette.surface,
    '--card-foreground': palette.text,
    '--popover': palette.surface,
    '--popover-foreground': palette.text,
    '--primary': preset.primary,
    '--primary-foreground': readableForeground(preset.primary),
    '--secondary': secondary,
    '--secondary-foreground': palette.text,
    '--muted': secondary,
    '--muted-foreground': palette.muted,
    '--accent': semanticAccent,
    '--accent-foreground': palette.text,
    '--destructive': danger,
    '--destructive-foreground': readableForeground(danger),
    '--border': palette.border,
    '--input': palette.borderBase,
    '--ring': preset.primary,
    '--chart-1': preset.primary,
    '--chart-2': success,
    '--chart-3': preset.accent,
    '--chart-4': danger,
    '--chart-5': palette.muted,
    '--sidebar': palette.sidebar,
    '--sidebar-foreground': preset.sidebarText,
    '--sidebar-primary': preset.sidebarActive,
    '--sidebar-primary-foreground': readableForeground(preset.sidebarActive),
    '--sidebar-accent': palette.sidebarDeep,
    '--sidebar-accent-foreground': preset.sidebarText,
    '--sidebar-border': mix(palette.sidebar, '#ffffff', 0.14),
    '--sidebar-ring': preset.sidebarActive
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

export function refreshSystemTheme() {
  applyThemeVariables(current.theme)
}

export function getSystemPreferences() {
  return { ...current }
}

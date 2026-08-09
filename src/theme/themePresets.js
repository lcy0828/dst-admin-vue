export const DEFAULT_THEME_ID = 'zinc'

export const THEME_PRESETS = Object.freeze([
  {
    id: 'zinc',
    name: 'Shadcn 中性',
    primary: '#27272a',
    accent: '#f59e0b',
    sidebar: '#fafafa',
    sidebarDeep: '#f4f4f5',
    sidebarText: '#18181b',
    sidebarActive: '#27272a',
    sidebarBorder: '#e4e4e7',
    semanticAccent: '#f4f4f5',
    ring: '#71717a',
    background: '#ffffff',
    surface: '#ffffff',
    surfaceMuted: '#f4f4f5',
    text: '#18181b',
    regular: '#3f3f46',
    muted: '#71717a',
    border: '#e4e4e7',
    borderBase: '#d4d4d8',
    dark: {
      primary: '#e4e4e7',
      accent: '#f59e0b',
      sidebar: '#18181b',
      sidebarDeep: '#27272a',
      sidebarText: '#fafafa',
      sidebarActive: '#e4e4e7',
      sidebarBorder: '#3f3f46',
      semanticAccent: '#27272a',
      ring: '#a1a1aa',
      background: '#09090b',
      surface: '#18181b',
      surfaceMuted: '#27272a',
      text: '#fafafa',
      regular: '#d4d4d8',
      muted: '#a1a1aa',
      border: '#3f3f46',
      borderBase: '#52525b'
    }
  },
  {
    id: 'graphite',
    name: '石墨朱橙',
    primary: '#e5482d',
    accent: '#f59e0b',
    sidebar: '#242626',
    sidebarDeep: '#1b1d1c',
    sidebarText: '#e9ece9',
    sidebarActive: '#ffb24a',
    background: '#f7f7f5',
    surface: '#ffffff',
    surfaceMuted: '#f0f1ee',
    text: '#252826',
    regular: '#4f5551',
    muted: '#707672',
    border: '#e1e4e1',
    borderBase: '#cdd2ce'
  },
  {
    id: 'emerald',
    name: '翡翠橙光',
    primary: '#0f8a5f',
    accent: '#ff7a1a',
    sidebar: '#102a24',
    sidebarDeep: '#0a201b',
    sidebarText: '#e6f1ed',
    sidebarActive: '#ff9a4a',
    background: '#f5f8f6',
    surface: '#ffffff',
    surfaceMuted: '#edf3ef',
    text: '#17251f',
    regular: '#52635b',
    muted: '#65756d',
    border: '#dce6e0',
    borderBase: '#c8d8cf'
  },
  {
    id: 'teal',
    name: '青柚珊瑚',
    primary: '#0e8f88',
    accent: '#ff6b4a',
    sidebar: '#173b3f',
    sidebarDeep: '#102e31',
    sidebarText: '#e5f1f1',
    sidebarActive: '#ff9279',
    background: '#f5f9f8',
    surface: '#ffffff',
    surfaceMuted: '#edf4f2',
    text: '#1b2d2c',
    regular: '#526764',
    muted: '#667a78',
    border: '#d8e6e3',
    borderBase: '#c3d7d3'
  },
  {
    id: 'indigo',
    name: '靛蓝琥珀',
    primary: '#4f46e5',
    accent: '#f59e0b',
    sidebar: '#25294a',
    sidebarDeep: '#1c203b',
    sidebarText: '#eaebf5',
    sidebarActive: '#ffbf55',
    background: '#f7f7fc',
    surface: '#ffffff',
    surfaceMuted: '#f0f0f8',
    text: '#25263d',
    regular: '#56586e',
    muted: '#6c6e83',
    border: '#e0e1ec',
    borderBase: '#cccede'
  }
].map(preset => Object.freeze({
  ...preset,
  ...(preset.dark ? { dark: Object.freeze(preset.dark) } : {})
})))

const DEFAULT_THEME = THEME_PRESETS.find(preset => preset.id === DEFAULT_THEME_ID)
const CUSTOM_BASE_THEME = THEME_PRESETS.find(preset => preset.id === 'graphite')
const LEGACY_DEFAULT_COLORS = new Set(['#3f7656', '#d97932'])

function normalizedHex(value) {
  const match = /^#([0-9a-f]{6})/i.exec(String(value || '').trim())
  return match ? `#${match[1].toLowerCase()}` : ''
}

export function themePresetById(id) {
  return THEME_PRESETS.find(preset => preset.id === id) || DEFAULT_THEME
}

export function normalizeThemeColor(value) {
  const normalized = normalizedHex(value)
  if (!normalized || LEGACY_DEFAULT_COLORS.has(normalized)) return DEFAULT_THEME.primary
  return normalized
}

export function resolveThemePreset(value) {
  const primary = normalizeThemeColor(value)
  const preset = THEME_PRESETS.find(item => item.primary === primary)
  return preset || Object.freeze({ ...CUSTOM_BASE_THEME, id: 'custom', name: '自定义主题', primary })
}

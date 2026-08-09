export const COMMAND_CATEGORY_IDS = Object.freeze({
  INFO: 'info',
  PLAYER: 'player',
  WORLD: 'world',
  SYSTEM: 'system',
  CUSTOM: 'custom'
})

const LEGACY_COMMAND_CATEGORIES = Object.freeze({
  '信息查询': COMMAND_CATEGORY_IDS.INFO,
  '玩家操作': COMMAND_CATEGORY_IDS.PLAYER,
  '世界操作': COMMAND_CATEGORY_IDS.WORLD,
  '系统操作': COMMAND_CATEGORY_IDS.SYSTEM,
  '自定义命令': COMMAND_CATEGORY_IDS.CUSTOM,
  '基础操作': 'basic',
  '查询': COMMAND_CATEGORY_IDS.INFO,
  '玩家管理': COMMAND_CATEGORY_IDS.PLAYER,
  '世界信息': 'world_info',
  '世界控制': 'world_control',
  '危险操作': 'dangerous'
})

export const KNOWN_COMMAND_CATEGORY_IDS = Object.freeze([
  ...Object.values(COMMAND_CATEGORY_IDS),
  'basic',
  'world_info',
  'world_control',
  'dangerous'
])

export function normalizeCommandCategory(value, fallback = COMMAND_CATEGORY_IDS.CUSTOM) {
  const category = String(value ?? '').trim()
  if (!category) return fallback
  return LEGACY_COMMAND_CATEGORIES[category] || category
}

export function isKnownCommandCategory(value) {
  return KNOWN_COMMAND_CATEGORY_IDS.includes(normalizeCommandCategory(value))
}

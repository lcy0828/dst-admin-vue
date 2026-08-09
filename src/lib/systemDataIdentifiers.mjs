export const SYSTEM_EXECUTOR_ID = 'system'

export const SYSTEM_AUTOMATION_GROUP_IDS = Object.freeze({
  UNGROUPED: 'ungrouped',
  PLAYER_MANAGEMENT: 'player-management'
})

export const ANNOUNCEMENT_TYPE_IDS = Object.freeze({
  IMPORTANT: 'important',
  NOTICE: 'notice'
})

const SYSTEM_AUTOMATION_GROUP_ALIASES = new Map([
  [SYSTEM_AUTOMATION_GROUP_IDS.UNGROUPED, SYSTEM_AUTOMATION_GROUP_IDS.UNGROUPED],
  ['Ungrouped', SYSTEM_AUTOMATION_GROUP_IDS.UNGROUPED],
  ['未分组', SYSTEM_AUTOMATION_GROUP_IDS.UNGROUPED],
  [SYSTEM_AUTOMATION_GROUP_IDS.PLAYER_MANAGEMENT, SYSTEM_AUTOMATION_GROUP_IDS.PLAYER_MANAGEMENT],
  ['Player management', SYSTEM_AUTOMATION_GROUP_IDS.PLAYER_MANAGEMENT],
  ['玩家管理', SYSTEM_AUTOMATION_GROUP_IDS.PLAYER_MANAGEMENT]
])

export function normalizeSystemAutomationGroup(value) {
  const normalized = String(value || '').trim()
  return SYSTEM_AUTOMATION_GROUP_ALIASES.get(normalized) || normalized
}

export function isSystemAutomationGroup(value, expected) {
  return normalizeSystemAutomationGroup(value) === expected
}

export function announcementTypeId(important) {
  return important ? ANNOUNCEMENT_TYPE_IDS.IMPORTANT : ANNOUNCEMENT_TYPE_IDS.NOTICE
}

import { systemTimeZone } from './dateTime.mjs'

export const GAME_AUTO_UPDATE_ACTION = 'game.update-empty'
export const ROOM_MAINTENANCE_GROUP_NAME = 'room-maintenance'

export const GAME_AUTO_UPDATE_SCHEDULES = Object.freeze({
  every15: '*/15 * * * *',
  every30: '*/30 * * * *',
  hourly: '0 * * * *'
})

async function resolveDefaultV2Apis() {
  return import('../api/v2.js')
}

export function modUpdateModeFromPolicy(policy = {}) {
  if (!policy || !policy.autoCheck) return 'manual'
  return policy.autoPrepare && policy.applyWhenEmpty ? 'auto' : 'notify'
}

export function normalizeModUpdateDraft(policy = {}) {
  const interval = Number(policy?.checkIntervalMinutes)
  const grace = Number(policy?.emptyGraceSeconds)
  return {
    mode: modUpdateModeFromPolicy(policy),
    checkIntervalMinutes: Number.isInteger(interval) && interval >= 5 && interval <= 1440
      ? interval
      : (policy?.revision ? 5 : 15),
    emptyGraceSeconds: Number.isInteger(grace) && grace >= 30 && grace <= 1800
      ? grace
      : 60,
    gameAnnouncement: policy?.gameAnnouncement !== false
  }
}

export function buildModUpdatePolicyPayload(draft = {}, expectedRevision = '') {
  const mode = ['manual', 'notify', 'auto'].includes(draft.mode) ? draft.mode : 'manual'
  const automatic = mode === 'auto'
  const notify = mode === 'notify'
  return {
    autoCheck: automatic || notify,
    autoPrepare: automatic,
    applyWhenEmpty: automatic,
    restartWithPlayers: false,
    gameAnnouncement: automatic ? draft.gameAnnouncement !== false : true,
    checkIntervalMinutes: Number(draft.checkIntervalMinutes) || 15,
    emptyGraceSeconds: Number(draft.emptyGraceSeconds) || 60,
    expectedRevision: String(expectedRevision || '')
  }
}

export function summarizeModAutoUpdate(overview) {
  if (!overview || !overview.policy) {
    return {
      mode: 'unknown',
      state: 'unknown',
      statusKey: 'unknown',
      enabled: false,
      variant: 'outline',
      availableCount: 0,
      pendingCount: 0
    }
  }
  const mode = modUpdateModeFromPolicy(overview.policy)
  const state = overview.state || {}
  const availableCount = Array.isArray(state.availableModIds) ? state.availableModIds.length : 0
  const pendingCount = Array.isArray(state.pendingUpdate?.modIds)
    ? state.pendingUpdate.modIds.length
    : (state.preparedAt ? availableCount : 0)

  if (state.status === 'blocked' || state.status === 'rolled_back') {
    return { mode, state: 'blocked', statusKey: 'blocked', enabled: mode === 'auto', variant: 'destructive', availableCount, pendingCount }
  }
  if (mode === 'auto') {
    if (state.status === 'waiting_for_players' || state.status === 'scheduled' || pendingCount > 0) {
      return { mode, state: 'pendingEmpty', statusKey: 'pendingEmpty', enabled: true, variant: 'warning', availableCount, pendingCount }
    }
    return { mode, state: 'auto', statusKey: 'auto', enabled: true, variant: 'success', availableCount, pendingCount }
  }
  if (mode === 'notify') {
    return {
      mode,
      state: 'notify',
      statusKey: 'notify',
      enabled: false,
      variant: availableCount > 0 ? 'warning' : 'secondary',
      availableCount,
      pendingCount
    }
  }
  return {
    mode: 'manual',
    state: 'manual',
    statusKey: 'manual',
    enabled: false,
    variant: availableCount > 0 ? 'warning' : 'outline',
    availableCount,
    pendingCount
  }
}

export function gameAutoUpdateSchedulePreset(schedule = '') {
  const normalized = String(typeof schedule === 'object' && schedule !== null ? schedule.cron || '' : schedule || '').trim()
  return Object.keys(GAME_AUTO_UPDATE_SCHEDULES).find(
    key => GAME_AUTO_UPDATE_SCHEDULES[key] === normalized
  ) || 'custom'
}

export function summarizeGameAutoUpdate(tasks = [], groups = []) {
  const gameTasks = (Array.isArray(tasks) ? tasks : []).filter(
    task => task?.action === GAME_AUTO_UPDATE_ACTION
  )
  if (!gameTasks.length) {
    return {
      configured: false,
      enabled: false,
      groupPaused: false,
      multiple: false,
      state: 'manual',
      statusKey: 'manual',
      variant: 'outline',
      schedule: GAME_AUTO_UPDATE_SCHEDULES.every15,
      preset: 'every15',
      task: null
    }
  }
  const task = gameTasks[0]
  const group = (Array.isArray(groups) ? groups : []).find(item => (item?.id || item?.groupId) === task.groupId)
  const groupPaused = Boolean(group && !group.enabled)
  const enabled = Boolean(task.enabled && !groupPaused)
  const failed = task.lastStatus === 'failed'
  const statusKey = groupPaused
    ? 'groupPaused'
    : task.enabled
      ? (failed ? 'failed' : 'auto')
      : 'paused'
  const variant = failed
    ? 'destructive'
    : enabled
      ? 'success'
      : groupPaused
        ? 'warning'
        : 'outline'

  return {
    configured: true,
    enabled,
    groupPaused,
    multiple: gameTasks.length > 1,
    state: statusKey,
    statusKey,
    variant,
    schedule: task.schedule || GAME_AUTO_UPDATE_SCHEDULES.every15,
    preset: gameAutoUpdateSchedulePreset(task.schedule || GAME_AUTO_UPDATE_SCHEDULES.every15),
    timezone: task.timezone || systemTimeZone(),
    task
  }
}

export function summarizeFleetGameAutoUpdate(roomSummaries = [], { readFailed = false } = {}) {
  if (readFailed) {
    return {
      total: 0,
      enabled: 0,
      totalRooms: 0,
      enabledRooms: 0,
      pausedRooms: 0,
      state: 'unknown',
      statusKey: 'unknown',
      variant: 'outline'
    }
  }
  const items = (Array.isArray(roomSummaries) ? roomSummaries : []).map(item => item?.summary || item)
  if (!items.length) {
    return {
      total: 0,
      enabled: 0,
      totalRooms: 0,
      enabledRooms: 0,
      pausedRooms: 0,
      state: 'noRooms',
      statusKey: 'noRooms',
      variant: 'outline'
    }
  }
  const unknownRooms = items.filter(item => item?.state === 'unknown').length
  if (unknownRooms === items.length) {
    return {
      total: items.length,
      enabled: 0,
      totalRooms: items.length,
      enabledRooms: 0,
      pausedRooms: 0,
      state: 'unknown',
      statusKey: 'unknown',
      variant: 'outline'
    }
  }
  const enabledRooms = items.filter(item => Boolean(item?.enabled)).length
  const pausedRooms = items.filter(item => !item?.enabled && (item?.configured || item?.state === 'paused' || item?.state === 'groupPaused')).length
  if (enabledRooms === items.length) {
    return {
      total: items.length,
      enabled: enabledRooms,
      totalRooms: items.length,
      enabledRooms,
      pausedRooms,
      state: 'allEnabled',
      statusKey: 'allEnabled',
      variant: 'success'
    }
  }
  if (enabledRooms > 0) {
    return {
      total: items.length,
      enabled: enabledRooms,
      totalRooms: items.length,
      enabledRooms,
      pausedRooms,
      state: 'partialEnabled',
      statusKey: 'partialEnabled',
      variant: 'secondary'
    }
  }
  if (pausedRooms > 0) {
    return {
      total: items.length,
      enabled: 0,
      totalRooms: items.length,
      enabledRooms: 0,
      pausedRooms,
      state: 'paused',
      statusKey: 'paused',
      variant: 'warning'
    }
  }
  return {
    total: items.length,
    enabled: 0,
    totalRooms: items.length,
    enabledRooms: 0,
    pausedRooms: 0,
    state: 'manual',
    statusKey: 'manual',
    variant: 'outline'
  }
}

export async function configureRoomGameAutoUpdate(roomId, {
  enabled = true,
  preset = '',
  schedule = '',
  timezone = systemTimeZone(),
  taskName = '无人时更新游戏并重启',
  tasks = null,
  groups = null,
  enablePausedGroup = false,
  automationApi = null
} = {}) {
  const client = automationApi || (await resolveDefaultV2Apis()).automationV2API
  const resolvedSchedule = String(
    schedule || GAME_AUTO_UPDATE_SCHEDULES[preset] || GAME_AUTO_UPDATE_SCHEDULES.every15
  ).trim() || GAME_AUTO_UPDATE_SCHEDULES.every15
  const resolvedTasks = Array.isArray(tasks)
    ? tasks
    : ((await client.tasks(roomId))?.items || [])
  const resolvedGroups = Array.isArray(groups)
    ? groups
    : ((await client.groups(roomId))?.items || [])
  const gameTasks = resolvedTasks.filter(item => item?.action === GAME_AUTO_UPDATE_ACTION)
  const existingTask = gameTasks[0] || null

  let group = resolvedGroups.find(item => item?.id === existingTask?.groupId) ||
    resolvedGroups.find(item => item?.name === ROOM_MAINTENANCE_GROUP_NAME)

  let nextGroups = [...resolvedGroups]
  if (!group) {
    group = await client.createGroup(roomId, {
      name: ROOM_MAINTENANCE_GROUP_NAME,
      description: '',
      type: 'custom',
      enabled: true
    })
    nextGroups = [...nextGroups, group]
  } else if (!group.enabled && enabled && enablePausedGroup && typeof client.updateGroup === 'function') {
    group = await client.updateGroup(roomId, group.id, {
      name: group.name,
      description: group.description || '',
      type: group.type || 'custom',
      enabled: true,
      expectedRevision: group.revision || ''
    })
    nextGroups = nextGroups.map(item => item.id === group.id ? group : item)
  }

  const payload = {
    enabled: Boolean(enabled),
    schedule: resolvedSchedule,
    timezone: String(timezone || systemTimeZone()).trim() || systemTimeZone(),
    groupId: group.id,
    name: existingTask?.name || taskName,
    description: existingTask?.description || '',
    action: GAME_AUTO_UPDATE_ACTION,
    worldIds: [],
    parameters: {},
    timeoutSeconds: 3600,
    retryTimes: 0,
    retryIntervalSeconds: 60,
    dependencies: existingTask?.dependencies || [],
    expectedRevision: existingTask?.revision || ''
  }

  const savedTask = existingTask
    ? await client.updateTask(roomId, existingTask.id, payload)
    : await client.createTask(roomId, payload)

  const nextTasks = existingTask
    ? gameTasks.map(item => item.id === existingTask.id ? savedTask : item)
    : [savedTask]

  return { task: savedTask, group, tasks: nextTasks, groups: nextGroups }
}

export async function applyNewRoomAutomationDefaults(roomId, {
  automaticBackup = false,
  automaticModUpdate = false,
  automaticGameUpdate = false,
  translator = key => key,
  timezone = systemTimeZone(),
  backupsApi = null,
  modUpdatesApi = null,
  automationApi = null
} = {}) {
  const warnings = []
  if (!roomId) return warnings

  if (automaticBackup) {
    try {
      const backupClient = backupsApi || (await resolveDefaultV2Apis()).backupsV2API
      const schedules = await backupClient.schedules(roomId)
      const defaults = schedules?.defaults || {}
      if (!schedules?.items?.length && !schedules?.legacyPolicy?.enabled) {
        await backupClient.configureSchedule(roomId, {
          name: translator('novice.backupName'),
          schedule: defaults.schedule || '0 4 * * *',
          timezone: defaults.timezone || timezone || 'Asia/Shanghai',
          keep: 7,
          enabled: true,
          createNew: true
        })
      }
    } catch {
      warnings.push(translator('novice.backupSetupFailed'))
    }
  }

  if (automaticModUpdate) {
    try {
      const modClient = modUpdatesApi || (await resolveDefaultV2Apis()).modUpdatesV2API
      const current = await modClient.overview(roomId)
      const payload = buildModUpdatePolicyPayload({
        mode: 'auto',
        checkIntervalMinutes: 15,
        emptyGraceSeconds: 60,
        gameAnnouncement: true
      }, current?.policy?.revision || '')
      await modClient.updatePolicy(roomId, payload)
    } catch {
      warnings.push(translator('novice.modAutoUpdateSetupFailed'))
    }
  }

  if (automaticGameUpdate) {
    try {
      await configureRoomGameAutoUpdate(roomId, {
        enabled: true,
        schedule: GAME_AUTO_UPDATE_SCHEDULES.every15,
        timezone,
        taskName: translator('novice.gameAutoUpdateTaskName'),
        enablePausedGroup: true,
        automationApi
      })
    } catch {
      warnings.push(translator('novice.gameAutoUpdateSetupFailed'))
    }
  }

  return warnings
}

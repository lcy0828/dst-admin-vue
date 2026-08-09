import {
  automationV2API,
  consoleV2API,
  roomsV2API
} from './v2'
import {
  isSystemAutomationGroup,
  SYSTEM_AUTOMATION_GROUP_IDS,
  SYSTEM_EXECUTOR_ID
} from '@/lib/systemDataIdentifiers.mjs'

const ROOM_KEY = 'dst-admin.automation.room-id'
const SUCCESS_STATUSES = new Set(['succeeded'])
const FAILURE_STATUSES = new Set(['failed', 'canceled', 'skipped'])

let roomCatalog = []
let activeRoomId = sessionStorage.getItem(ROOM_KEY) || ''
let taskCache = new Map()
let groupCache = new Map()
let actionCache = []
let commandCache = []
let exportHistory = []

function nested(data, message = '操作成功') {
  return {
    code: 200,
    status: 200,
    msg: message,
    message,
    data: { code: 200, status: 200, data, msg: message, message }
  }
}

async function loadRooms(force = false) {
  if (roomCatalog.length && !force) return roomCatalog
  const response = await roomsV2API.list()
  const rooms = (response.items || []).filter(room => room.managed)
  roomCatalog = await Promise.all(rooms.map(async room => {
    const worlds = await roomsV2API.worlds(room.id)
    return { ...room, worlds: worlds.items || [] }
  }))
  if (activeRoomId && !roomCatalog.some(room => room.id === activeRoomId)) {
    activeRoomId = ''
    sessionStorage.removeItem(ROOM_KEY)
  }
  if (!activeRoomId && roomCatalog.length === 1) setActiveRoom(roomCatalog[0].id)
  return roomCatalog
}

function setActiveRoom(roomId) {
  if (roomId && !roomCatalog.some(room => room.id === roomId)) {
    throw new Error('所选房间不存在或尚未接管')
  }
  activeRoomId = roomId || ''
  if (activeRoomId) sessionStorage.setItem(ROOM_KEY, activeRoomId)
  else sessionStorage.removeItem(ROOM_KEY)
}

async function activeRoom() {
  const rooms = await loadRooms()
  if (!rooms.length) throw new Error('当前没有已接管的真实房间')
  const room = rooms.find(item => item.id === activeRoomId)
  if (room) return room
  if (rooms.length === 1) {
    setActiveRoom(rooms[0].id)
    return rooms[0]
  }
  throw new Error('请先选择要管理的房间')
}

async function findRoomFor(kind, id) {
  const rooms = await loadRooms()
  const ordered = activeRoomId
    ? [...rooms.filter(room => room.id === activeRoomId), ...rooms.filter(room => room.id !== activeRoomId)]
    : rooms
  for (const room of ordered) {
    try {
      if (kind === 'task') await automationV2API.task(room.id, id)
      if (kind === 'run') await automationV2API.run(room.id, id)
      if (kind === 'group') {
        const response = await automationV2API.groups(room.id)
        if (!(response.items || []).some(item => item.id === id)) continue
      }
      setActiveRoom(room.id)
      return room
    } catch (error) {
      if (error.status !== 404) throw error
    }
  }
  throw new Error('没有找到对应的定时任务数据')
}

async function roomForCached(kind, id) {
  const cache = kind === 'task' ? taskCache : groupCache
  const cached = cache.get(id)
  if (cached) {
    const rooms = await loadRooms()
    const room = rooms.find(item => item.id === cached.roomId)
    if (room) {
      setActiveRoom(room.id)
      return room
    }
  }
  return findRoomFor(kind, id)
}

function mapGroup(group, roomId) {
  groupCache.set(group.id, { roomId, raw: group })
  return {
    id: group.id,
    room_id: roomId,
    name: group.name,
    description: group.description,
    type: group.type || 'custom',
    status: group.enabled ? 1 : 0,
    task_count: group.taskCount || 0,
    revision: group.revision,
    created_at: group.createdAt,
    updated_at: group.updatedAt
  }
}

function taskType(action) {
  return action === 'command.execute' ? 'tmux_command' : 'function'
}

function taskArguments(task) {
  if (task.action === 'command.execute') {
    const definition = commandCache.find(item => item.id === task.parameters?.commandId)
    const argumentsValue = task.parameters?.arguments || {}
    if (definition) return (definition.parameters || []).map(parameter => argumentsValue[parameter.name] ?? '')
    return Object.values(argumentsValue)
  }
  const definition = actionCache.find(item => item.id === task.action)
  if (definition) return (definition.parameters || []).map(name => task.parameters?.[name] ?? '')
  return Object.values(task.parameters || {})
}

function mapTask(task, roomId, tasks = []) {
  taskCache.set(task.id, { roomId, raw: task })
  const dependencies = (task.dependencies || []).map(id => {
    const dependency = tasks.find(item => item.id === id)
    return { id, name: dependency?.name || id }
  })
  const type = taskType(task.action)
  const args = taskArguments(task)
  const worldId = task.worldIds?.[0] || ''
  const commandId = task.parameters?.commandId || ''
  const target = type === 'tmux_command'
    ? JSON.stringify([worldId, commandId, ...args])
    : task.action
  return {
    id: task.id,
    room_id: roomId,
    name: task.name,
    description: task.description,
    group_id: task.groupId,
    group_name: task.groupName,
    spec: task.schedule,
    timezone: task.timezone,
    type,
    target,
    args,
    status: task.enabled ? 1 : 0,
    timeout: task.timeoutSeconds,
    retry_times: task.retryTimes || 0,
    retry_interval: task.retryIntervalSeconds || 60,
    dependencies,
    session_name: worldId,
    command_id: commandId,
    command_params: args,
    tmux_task: type === 'tmux_command' ? {
      session_name: worldId,
      command_id: commandId,
      command_params: args
    } : null,
    last_run_time: task.lastRunAt,
    last_status: task.lastStatus === 'succeeded' ? 1 : 0,
    next_run_time: task.nextRunAt,
    revision: task.revision,
    created_at: task.createdAt,
    updated_at: task.updatedAt
  }
}

function mapRun(run) {
  return {
    id: run.id,
    task_id: run.taskId,
    task_name: run.taskName,
    task_type: taskType(run.action),
    group_id: run.groupId,
    group_name: run.groupName,
    status: run.status === 'succeeded' ? 'success' : run.status,
    raw_status: run.status,
    trigger_type: run.trigger === 'manual' ? 1 : 0,
    is_manual: run.trigger === 'manual' ? 1 : 0,
    start_time: run.startedAt || run.createdAt,
    end_time: run.finishedAt,
    created_at: run.createdAt,
    updated_at: run.finishedAt,
    duration: run.durationMs,
    retry_count: run.retryCount || 0,
    executor: SYSTEM_EXECUTOR_ID,
    output: run.output,
    error: run.error,
    params: { action: run.action, jobId: run.jobId }
  }
}

async function loadTaskData(room) {
  const response = await automationV2API.tasks(room.id)
  const tasks = response.items || []
  return tasks.map(task => mapTask(task, room.id, tasks))
}

async function ensureDefaultGroup(room) {
  const response = await automationV2API.groups(room.id)
  const existing = (response.items || []).find(group => (
    isSystemAutomationGroup(group.name, SYSTEM_AUTOMATION_GROUP_IDS.UNGROUPED)
  ))
  if (existing) return existing
  return automationV2API.createGroup(room.id, {
    name: SYSTEM_AUTOMATION_GROUP_IDS.UNGROUPED,
    description: 'System group for ungrouped automation tasks',
    type: 'system',
    enabled: true
  })
}

function valueForParameter(value, parameter) {
  if (parameter?.type === 'integer') {
    const parsed = Number(value)
    if (!Number.isInteger(parsed)) throw new Error(`${parameter.label || parameter.name}必须是整数`)
    return parsed
  }
  return value
}

async function taskInput(data, room, existing = null) {
  if (data.type === 'shell') throw new Error('定时 Shell 已被后端安全策略禁用，请改用受控函数')
  if (data.type === 'tmux_raw_command') throw new Error('定时 TMUX 原始命令已被后端安全策略禁用，请改用内建命令')
  let groupId = data.group_id
  if (!groupId || groupId === 0 || groupId === '0') groupId = (await ensureDefaultGroup(room)).id
  const parameters = {}
  const worldIds = []
  let action = data.target
  if (data.type === 'tmux_command') {
    action = 'command.execute'
    const definition = commandCache.find(item => item.id === data.command_id)
    if (!definition) throw new Error('请选择真实存在的内建命令')
    if (!data.session_name) throw new Error('请选择命令执行世界')
    const selectedWorld = room.worlds.find(world => world.id === data.session_name || world.name === data.session_name || world.directoryName === data.session_name)
    if (!selectedWorld) throw new Error('所选命令执行世界不存在')
    worldIds.push(selectedWorld.id)
    const values = data.command_params || []
    const argumentsValue = {}
    ;(definition.parameters || []).forEach((parameter, index) => {
      if (values[index] !== undefined && values[index] !== '') {
        argumentsValue[parameter.name] = valueForParameter(values[index], parameter)
      }
    })
    parameters.commandId = definition.id
    parameters.arguments = argumentsValue
  } else {
    const definition = actionCache.find(item => item.id === action)
    if (!definition) throw new Error('请选择真实存在的受控函数')
    ;(definition.parameters || []).forEach((name, index) => {
      const value = data.args?.[index]
      if (value === undefined || value === '') return
      parameters[name] = name === 'keep' ? Number(value) : value
    })
  }
  return {
    groupId,
    name: String(data.name || '').trim(),
    description: String(data.description || '').trim(),
    enabled: data.status === 1,
    schedule: String(data.spec || '').trim(),
    timezone: data.timezone || 'Asia/Shanghai',
    action,
    worldIds,
    parameters,
    timeoutSeconds: data.timeout > 0 ? data.timeout : 300,
    retryTimes: data.retry_times || 0,
    retryIntervalSeconds: data.retry_interval || 60,
    dependencies: (data.dependencies || []).map(item => typeof item === 'object' ? item.id : item),
    expectedRevision: existing?.revision || ''
  }
}

async function loadAllRuns(room, params = {}) {
  const items = []
  let offset = 0
  let hasMore = true
  while (hasMore) {
    const response = await automationV2API.runs(room.id, { ...params, limit: 100, offset })
    items.push(...(response.items || []))
    offset += response.items?.length || 0
    hasMore = Boolean(response.items?.length) && offset < response.total
  }
  return items
}

function dateKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function chartData(runs, days) {
  const length = Math.max(1, Number(days) || 30)
  const dates = []
  const buckets = new Map()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let offset = length - 1; offset >= 0; offset--) {
    const date = new Date(today)
    date.setDate(date.getDate() - offset)
    const key = dateKey(date)
    dates.push(key)
    buckets.set(key, { success: 0, failed: 0, durations: [] })
  }
  runs.forEach(run => {
    const bucket = buckets.get(dateKey(run.createdAt))
    if (!bucket) return
    if (SUCCESS_STATUSES.has(run.status)) bucket.success++
    else if (FAILURE_STATUSES.has(run.status)) bucket.failed++
    if (run.finishedAt && run.durationMs >= 0) bucket.durations.push(run.durationMs / 1000)
  })
  return {
    dates,
    success: dates.map(key => buckets.get(key).success),
    failed: dates.map(key => buckets.get(key).failed),
    durations: dates.map(key => {
      const values = buckets.get(key).durations
      return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : 0
    })
  }
}

function statsData(runs) {
  const terminal = runs.filter(run => SUCCESS_STATUSES.has(run.status) || FAILURE_STATUSES.has(run.status))
  const success = terminal.filter(run => SUCCESS_STATUSES.has(run.status)).length
  const failed = terminal.length - success
  const durations = terminal.filter(run => run.finishedAt).map(run => run.durationMs)
  return {
    total_count: terminal.length,
    success_count: success,
    fail_count: failed,
    success_rate: terminal.length ? Math.round(success / terminal.length * 100) : 0,
    avg_duration: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
    last_run_time: runs[0]?.finishedAt || runs[0]?.createdAt || '',
    last_status: runs[0]?.status === 'succeeded' ? 1 : 0
  }
}

async function runsForChart(room, params, days) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (Math.max(1, Number(days) || 30) - 1))
  return loadAllRuns(room, { ...params, startDate: dateKey(start) })
}

export const realCronTaskApi = {
  async getRoomScope(force = false) {
    const rooms = await loadRooms(force)
    return {
      rooms: rooms.map(room => ({ id: room.id, name: room.name, directoryName: room.directoryName })),
      roomId: activeRoomId
    }
  },

  setRoom(roomId) {
    setActiveRoom(roomId)
  },

  async getTasks(params = {}) {
    const room = await activeRoom()
    let tasks = await loadTaskData(room)
    if (params.group_id) tasks = tasks.filter(task => task.group_id === params.group_id)
    if (params.type) tasks = tasks.filter(task => task.type === params.type)
    if (params.status !== '' && params.status !== undefined) tasks = tasks.filter(task => task.status === Number(params.status))
    if (params.keyword) {
      const keyword = String(params.keyword).trim().toLowerCase()
      tasks = tasks.filter(task => `${task.name} ${task.description}`.toLowerCase().includes(keyword))
    }
    const total = tasks.length
    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.max(1, Number(params.limit || params.page_size) || total || 20)
    const items = tasks.slice((page - 1) * limit, page * limit)
    return {
      code: 200,
      status: 200,
      data: { items, total, code: 200, status: 200, data: { items, tasks: items, total } }
    }
  },

  async getTaskDetail(id) {
    const room = await roomForCached('task', id)
    const task = await automationV2API.task(room.id, id)
    const tasks = (await automationV2API.tasks(room.id)).items || []
    return nested(mapTask(task, room.id, tasks), '任务详情已刷新')
  },

  async addTask(data) {
    const room = await activeRoom()
    await this.getFunctions()
    await this.getTmuxCommands()
    const created = await automationV2API.createTask(room.id, await taskInput(data, room))
    return nested(mapTask(created, room.id), '添加任务成功')
  },

  async updateTask(id, data) {
    const room = await roomForCached('task', id)
    const current = await automationV2API.task(room.id, id)
    await this.getFunctions()
    await this.getTmuxCommands()
    const updated = await automationV2API.updateTask(room.id, id, await taskInput(data, room, current))
    return nested(mapTask(updated, room.id), '更新任务成功')
  },

  async deleteTask(id) {
    const room = await roomForCached('task', id)
    const result = await automationV2API.deleteTask(room.id, id)
    taskCache.delete(id)
    return nested(result, '删除任务成功')
  },

  async setTaskEnabled(id, enabled) {
    const room = await roomForCached('task', id)
    const current = await automationV2API.task(room.id, id)
    const updated = await automationV2API.updateTask(room.id, id, {
      groupId: current.groupId,
      name: current.name,
      description: current.description,
      enabled,
      schedule: current.schedule,
      timezone: current.timezone,
      action: current.action,
      worldIds: current.worldIds,
      parameters: current.parameters,
      timeoutSeconds: current.timeoutSeconds,
      retryTimes: current.retryTimes,
      retryIntervalSeconds: current.retryIntervalSeconds,
      dependencies: current.dependencies,
      expectedRevision: current.revision
    })
    return nested(mapTask(updated, room.id), enabled ? '启用任务成功' : '禁用任务成功')
  },

  enableTask(id) { return this.setTaskEnabled(id, true) },
  disableTask(id) { return this.setTaskEnabled(id, false) },

  async runTask(id) {
    const room = await roomForCached('task', id)
    const job = await automationV2API.runTask(room.id, id)
    const runs = await automationV2API.runs(room.id, { taskId: id, limit: 1, offset: 0 })
    return nested({ job_id: job.id, log_id: runs.items?.[0]?.id, message: '任务已开始运行' }, '任务已开始运行')
  },

  async getFunctions() {
    const room = await activeRoom()
    const response = await automationV2API.actions(room.id)
    actionCache = response.items || []
    const functions = {}
    actionCache.filter(action => action.id !== 'command.execute').forEach(action => {
      functions[action.id] = {
        name: action.id,
        description: action.name + (action.description ? `：${action.description}` : ''),
        param_types: action.parameters || []
      }
    })
    return { code: 200, data: functions, msg: '受控函数列表已刷新' }
  },

  async getGroups() {
    const room = await activeRoom()
    const response = await automationV2API.groups(room.id)
    const groups = (response.items || []).map(group => mapGroup(group, room.id))
    return nested(groups, '任务组列表已刷新')
  },

  async getGroupDetail(id) {
    const room = await roomForCached('group', id)
    const response = await automationV2API.groups(room.id)
    const group = (response.items || []).find(item => item.id === id)
    if (!group) throw new Error('任务组不存在')
    return nested(mapGroup(group, room.id), '任务组详情已刷新')
  },

  async addGroup(data) {
    const room = await activeRoom()
    const created = await automationV2API.createGroup(room.id, {
      name: data.name,
      description: data.description,
      type: data.type,
      enabled: data.status === 1
    })
    return nested(mapGroup(created, room.id), '添加任务组成功')
  },

  async updateGroup(id, data) {
    const room = await roomForCached('group', id)
    const response = await automationV2API.groups(room.id)
    const current = (response.items || []).find(item => item.id === id)
    if (!current) throw new Error('任务组不存在')
    const updated = await automationV2API.updateGroup(room.id, id, {
      name: data.name,
      description: data.description,
      type: data.type,
      enabled: data.status === 1,
      expectedRevision: current.revision
    })
    return nested(mapGroup(updated, room.id), '更新任务组成功')
  },

  async deleteGroup(id) {
    const room = await roomForCached('group', id)
    const result = await automationV2API.deleteGroup(room.id, id)
    groupCache.delete(id)
    return nested(result, '删除任务组成功')
  },

  async setGroupEnabled(id, enabled) {
    const room = await roomForCached('group', id)
    const response = await automationV2API.groups(room.id)
    const current = (response.items || []).find(item => item.id === id)
    if (!current) throw new Error('任务组不存在')
    const updated = await automationV2API.updateGroup(room.id, id, {
      name: current.name,
      description: current.description,
      type: current.type,
      enabled,
      expectedRevision: current.revision
    })
    return nested(mapGroup(updated, room.id), enabled ? '启用任务组成功' : '禁用任务组成功')
  },

  enableGroup(id) { return this.setGroupEnabled(id, true) },
  disableGroup(id) { return this.setGroupEnabled(id, false) },

  async getGroupTasks(id) {
    const room = await roomForCached('group', id)
    const tasks = await loadTaskData(room)
    return nested(tasks.filter(task => task.group_id === id), '任务组任务已刷新')
  },

  async getTmuxSessions() {
    const room = await activeRoom()
    return nested(room.worlds.map(world => ({
      name: world.id,
      session_name: world.id,
      archive_name: room.name,
      world_name: world.name,
      state: world.status,
      room_id: room.id,
      world_id: world.id
    })), '世界列表已刷新')
  },

  async getTmuxCommands() {
    const room = await activeRoom()
    const response = await consoleV2API.definitions(room.id)
    commandCache = response.items || []
    return nested(commandCache.map(command => ({
      ...command,
      type: command.category,
      command: command.description,
      needs_params: (command.parameters || []).length > 0,
      param_desc: (command.parameters || []).map(parameter => parameter.label).join('、'),
      example: (command.parameters || []).map(parameter => parameter.options?.[0] ?? parameter.minimum ?? '').filter(Boolean).join('、')
    })), '内建命令列表已刷新')
  },

  async getLogs(params = {}) {
    const room = await activeRoom()
    const status = params.status === 'success' ? 'succeeded' : params.status
    const response = await automationV2API.runs(room.id, {
      taskId: params.task_id || undefined,
      status: status || undefined,
      startDate: params.start_date || undefined,
      endDate: params.end_date || undefined,
      limit: params.page_size || 20,
      offset: (Math.max(1, params.page || 1) - 1) * (params.page_size || 20)
    })
    return { code: 200, data: { logs: (response.items || []).map(mapRun), total: response.total || 0 } }
  },

  async getLogDetail(id) {
    const room = await findRoomFor('run', id)
    return { code: 200, data: mapRun(await automationV2API.run(room.id, id)) }
  },

  async clearLogs(data) {
    const room = await activeRoom()
    const result = await automationV2API.clearRuns(room.id, {
      keepDays: data.keep_days,
      taskId: data.task_id || '',
      status: data.status === 'success' ? 'succeeded' : data.status || ''
    })
    return nested({ deleted_count: result.deletedCount }, '清理日志成功')
  },

  async getRecentLogs() {
    return this.getLogs({ page: 1, page_size: 10 })
  },

  async getTaskStats(taskId) {
    const room = await roomForCached('task', taskId)
    return { code: 200, data: statsData(await loadAllRuns(room, { taskId })) }
  },

  async getTaskChart(taskId, params = {}) {
    const room = await roomForCached('task', taskId)
    return { code: 200, data: chartData(await runsForChart(room, { taskId }, params.days), params.days) }
  },

  async getTaskDurationChart(taskId, params = {}) {
    return this.getTaskChart(taskId, params)
  },

  async getGroupStats(groupId) {
    const room = await roomForCached('group', groupId)
    const tasks = (await automationV2API.tasks(room.id)).items?.filter(task => task.groupId === groupId) || []
    const stats = statsData(await loadAllRuns(room, { groupId }))
    return nested({
      total_tasks: tasks.length,
      enabled_tasks: tasks.filter(task => task.enabled).length,
      success_rate: stats.success_rate,
      avg_duration: Number((stats.avg_duration / 1000).toFixed(2))
    })
  },

  async getGroupChart(groupId, params = {}) {
    const room = await roomForCached('group', groupId)
    const runs = await runsForChart(room, { groupId }, params.days)
    const tasks = (await automationV2API.tasks(room.id)).items?.filter(task => task.groupId === groupId) || []
    const counts = new Map()
    runs.forEach(run => counts.set(run.taskId, (counts.get(run.taskId) || 0) + 1))
    return nested({
      ...chartData(runs, params.days),
      tasks_data: tasks.map(task => ({ name: task.name, value: counts.get(task.id) || 0 }))
    })
  },

  async getGroupsChart(params = {}) {
    return this.getOverviewChart(params)
  },

  async getOverviewChart(params = {}) {
    const room = await activeRoom()
    const runs = await runsForChart(room, {}, params.days)
    const tasks = (await automationV2API.tasks(room.id)).items || []
    const stats = statsData(runs)
    return nested({
      ...chartData(runs, params.days),
      stats: {
        total_tasks: tasks.length,
        total_executions: stats.total_count,
        success_rate: stats.success_rate,
        avg_duration: Number((stats.avg_duration / 1000).toFixed(2))
      }
    })
  },

  async exportTasks(data) {
    const room = await activeRoom()
    const document = await automationV2API.export(room.id)
    const filename = `${String(data.filename || 'task_config').replace(/[^A-Za-z0-9._-]/g, '_')}.json`
    const content = JSON.stringify(document, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    exportHistory.unshift({ filename, description: data.description || '', size: blob.size, created_at: new Date().toLocaleString(), blob })
    return nested({ filename }, '真实任务配置已生成')
  },

  getExportFiles() {
    return Promise.resolve(nested(exportHistory.map(file => ({
      filename: file.filename,
      description: file.description,
      size: file.size,
      created_at: file.created_at
    })), '本次浏览器导出记录已刷新'))
  },

  downloadExportFile(filename) {
    const file = exportHistory.find(item => item.filename === filename)
    if (!file) return Promise.reject(new Error('当前浏览器会话中没有该导出记录，请重新导出'))
    return Promise.resolve({ data: file.blob })
  },

  deleteExportFile(filename) {
    exportHistory = exportHistory.filter(item => item.filename !== filename)
    return Promise.resolve(nested({ deleted: true }, '已移除本次浏览器导出记录'))
  },

  async importTasks(formData) {
    const room = await activeRoom()
    const file = formData.get('file')
    const mode = formData.get('mode')
    if (!file) throw new Error('请选择要导入的 JSON 文件')
    let document
    try {
      document = JSON.parse(await file.text())
    } catch (error) {
      throw new Error('导入文件不是有效 JSON')
    }
    const preview = await automationV2API.previewImport(room.id, document)
    if (!preview.valid) {
      throw new Error((preview.issues || []).map(issue => `${issue.path}: ${issue.message}`).join('；') || '导入预览未通过')
    }
    const result = await automationV2API.import(room.id, {
      document,
      digest: preview.digest,
      replace: mode === 'override'
    })
    return nested(result, `导入完成：${result.groupsCreated} 个组，${result.tasksCreated} 个任务`)
  }
}

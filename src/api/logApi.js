import {
  jobsV2API,
  logRulesV2API,
  roomsV2API,
  structuredLogsV2API
} from './v2'

const TERMINAL_JOB_STATES = new Set(['succeeded', 'failed', 'canceled'])
const success = (data, msg = '操作成功') => ({ status: 200, data, msg })
let archiveCatalog = []

function resolveArchive(reference) {
  const value = typeof reference === 'object'
    ? reference.room_id || reference.roomId || reference.archive_name || reference.archive
    : reference
  const room = archiveCatalog.find(item => item.id === value || item.name === value)
  if (!room) throw new Error('没有找到所选存档，请重新选择')
  return room
}

function resolveWorld(room, reference) {
  const value = typeof reference === 'object'
    ? reference.world_id || reference.worldId || reference.world_name || reference.world
    : reference
  const world = room.worlds.find(item => item.id === value || item.name === value)
  if (!world) throw new Error('没有找到所选世界，请重新选择')
  return world
}

async function waitForJob(job, timeoutMs = 120000) {
  if (!job?.id) throw new Error('后端没有返回任务 ID')
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const current = await jobsV2API.get(job.id)
    if (!TERMINAL_JOB_STATES.has(current.status)) {
      await new Promise(resolve => setTimeout(resolve, 500))
      continue
    }
    if (current.status !== 'succeeded') {
      const failed = (current.targets || []).find(item => item.status === 'failed')
      throw new Error(failed?.error?.message || current.error?.message || '日志刷新任务执行失败')
    }
    return current
  }
  throw new Error('日志刷新任务超时，请到任务记录中查看最终状态')
}

function mapRule(rule) {
  return {
    id: rule.id,
    room_id: rule.roomId,
    name: rule.name,
    description: rule.description,
    log_type: rule.logType,
    pattern: rule.pattern,
    is_regex: rule.regex,
    is_enabled: rule.enabled,
    priority: rule.priority,
    match_mode: rule.matchMode || 'single',
    tail_pattern: rule.tailPattern || '',
    built_in: Boolean(rule.builtIn),
    created_at: rule.createdAt,
    updated_at: rule.updatedAt
  }
}

function ruleInput(rule) {
  return {
    name: String(rule.name || '').trim(),
    description: String(rule.description || '').trim(),
    logType: String(rule.log_type || '').trim(),
    pattern: String(rule.pattern || '').trim(),
    regex: Boolean(rule.is_regex),
    enabled: Boolean(rule.is_enabled),
    priority: Number(rule.priority),
    matchMode: rule.match_mode || 'single',
    tailPattern: rule.match_mode === 'head_tail' ? String(rule.tail_pattern || '').trim() : ''
  }
}

export const realLogApi = {
  async getActiveLogParsers() {
    const response = await roomsV2API.list()
    const rooms = (response.items || []).filter(room => room.managed)
    const worldsByRoom = await Promise.all(rooms.map(async room => ({
      room,
      worlds: (await roomsV2API.worlds(room.id)).items || []
    })))
    const parsers = worldsByRoom.flatMap(({ room, worlds }) => worlds
      .filter(world => world.status === 'running')
      .map(world => ({
        id: `${room.id}_${world.id}`,
        room_id: room.id,
        world_id: world.id,
        archive_name: room.name,
        world_name: world.name,
        server_type: world.role === 'master' ? 'Forest' : world.role === 'caves' ? 'Caves' : 'Custom',
        log_file: `${room.directoryName}/${world.directoryName}/server_log.txt`,
        status: world.status,
        last_activity: null,
        client_count: null
      })))
    return success(parsers, '活跃日志解析器已刷新')
  },

  async getArchivesWithLogs() {
    const response = await roomsV2API.list()
    const rooms = (response.items || []).filter(room => room.managed)
    archiveCatalog = await Promise.all(rooms.map(async room => {
      const worlds = await roomsV2API.worlds(room.id)
      return {
        id: room.id,
        name: room.name,
        directory_name: room.directoryName,
        worlds: (worlds.items || []).map(world => ({
          id: world.id,
          name: world.name,
          directory_name: world.directoryName
        }))
      }
    }))
    return success(archiveCatalog.map(room => ({
      archive_name: room.name,
      worlds: room.worlds.map(world => world.name)
    })), '日志房间列表已刷新')
  },

  async getLogsData(params) {
    const room = resolveArchive(params)
    const world = params.world || params.world_id ? resolveWorld(room, params) : null
    const response = await structuredLogsV2API.list(room.id, {
      worldId: world?.id,
      type: params.type || undefined,
      limit: params.page_size || 20,
      offset: (Math.max(1, params.page || 1) - 1) * (params.page_size || 20)
    })
    return success({
      logs: (response.items || []).map(item => ({
        id: item.id,
        room_id: item.roomId,
        world_id: item.worldId,
        world_name: item.worldName,
        log_type: item.type,
        content: item.content,
        raw_content: item.rawContent,
        timestamp: item.occurredAt || item.observedAt,
        rule_id: item.ruleId,
        rule_name: item.ruleName
      })),
      total: response.total || 0,
      counts: response.counts || {},
      last_refreshed_at: response.lastRefreshedAt || null
    }, '日志查询完成')
  },

  async getRoomOptions() {
    if (!archiveCatalog.length) await this.getArchivesWithLogs()
    return archiveCatalog.map(room => ({ id: room.id, name: room.name }))
  },

  async getLogTypes(reference) {
    if (!reference || (!reference.archive && !reference.room_id && typeof reference !== 'string')) return success([])
    const room = resolveArchive(reference)
    const response = await logRulesV2API.list(room.id)
    return success([...new Set((response.items || []).map(item => item.logType))])
  },

  async refresh(roomId) {
    if (!roomId) throw new Error('请先选择存档')
    const job = await structuredLogsV2API.refresh(roomId)
    return success(await waitForJob(job), '日志解析刷新完成')
  },

  async cleanupLog(data) {
    const room = resolveArchive(data)
    const world = resolveWorld(room, data)
    const result = await structuredLogsV2API.clear(room.id, world.id)
    return success(result, `已清空 ${result.deleted || 0} 条解析日志`)
  },

  getArchiveList() {
    return this.getArchivesWithLogs()
  },

  async getWorldsByArchive(archiveName) {
    if (!archiveCatalog.length) await this.getArchivesWithLogs()
    return resolveArchive(archiveName).worlds.map(world => ({ name: world.name }))
  }
}

export const realRuleManagementApi = {
  async getRulesList(roomReference) {
    if (!roomReference) throw new Error('请先选择存档')
    const room = resolveArchive(roomReference)
    const response = await logRulesV2API.list(room.id)
    return success((response.items || []).map(mapRule))
  },

  async addRule(roomReference, data) {
    if (data === undefined) {
      data = roomReference
      roomReference = data
    }
    const room = resolveArchive(roomReference)
    return success(mapRule(await logRulesV2API.create(room.id, ruleInput(data))), '添加解析规则成功')
  },

  async updateRule(roomReference, ruleId, data) {
    const room = resolveArchive(roomReference)
    return success(mapRule(await logRulesV2API.update(room.id, ruleId, ruleInput(data))), '编辑解析规则成功')
  },

  async deleteRule(roomReference, ruleId) {
    const room = resolveArchive(roomReference)
    return success(await logRulesV2API.delete(room.id, ruleId), '删除解析规则成功')
  },

  async testRule(roomReference, data, sample) {
    const room = resolveArchive(roomReference)
    return success(await logRulesV2API.test(room.id, { ...ruleInput(data), sample }))
  }
}

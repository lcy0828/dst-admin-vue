import {
  jobsV2API,
  logRulesV2API,
  roomsV2API,
  structuredLogsV2API
} from './v2'
import { buildStructuredLogFilter, inspectStructuredLogRefreshJob, normalizeStructuredLogList } from '../lib/logQuerySupport.mjs'
import { adapterError, adapterSuccess } from './adapterProtocol.mjs'

const success = (data, msg = 'operation_succeeded') => adapterSuccess(data, msg)
let archiveCatalog = []

function resolveArchive(reference) {
  const value = typeof reference === 'object'
    ? reference.room_id || reference.roomId || reference.archive_name || reference.archive
    : reference
  const room = archiveCatalog.find(item => item.id === value || item.name === value)
  if (!room) throw adapterError('ROOM_NOT_FOUND', { context: { reference: value || '' } })
  return room
}

function resolveWorld(room, reference) {
  const value = typeof reference === 'object'
    ? reference.world_id || reference.worldId || reference.world_name || reference.world
    : reference
  const world = room.worlds.find(item => item.id === value || item.name === value)
  if (!world) throw adapterError('WORLD_NOT_FOUND', { context: { reference: value || '' } })
  return world
}

async function waitForJob(job, timeoutMs = 120000) {
  if (!job?.id) throw adapterError('JOB_ID_MISSING')
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const current = await jobsV2API.get(job.id)
    const result = inspectStructuredLogRefreshJob(current)
    if (!result.terminal) {
      await new Promise(resolve => setTimeout(resolve, 500))
      continue
    }
    if (!result.usable) throw adapterError('LOG_REFRESH_FAILED', { detail: result.errorMessage })
    return current
  }
  throw adapterError('LOG_REFRESH_TIMEOUT')
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
        status: world.status,
        control_available: world.controlAvailable !== false,
        status_message: world.statusMessage || ''
      })))
    return success(parsers, 'active_worlds_loaded')
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
      room_id: room.id,
      archive_name: room.name,
      worlds: room.worlds.map(world => ({
        world_id: world.id,
        world_name: world.name,
        directory_name: world.directory_name
      }))
    })), 'log_rooms_loaded')
  },

  async getLogsData(params) {
    const room = resolveArchive(params)
    const world = params.world || params.world_id ? resolveWorld(room, params) : null
    const response = await structuredLogsV2API.list(room.id, buildStructuredLogFilter(params, world?.id))
    return success(normalizeStructuredLogList(response), 'logs_loaded')
  },

  async getRoomOptions() {
    await this.getArchivesWithLogs()
    return archiveCatalog.map(room => ({ id: room.id, name: room.name }))
  },

  async getLogTypes(reference) {
    if (!reference || (!reference.archive && !reference.room_id && typeof reference !== 'string')) return success([])
    const room = resolveArchive(reference)
    const response = await logRulesV2API.list(room.id)
    return success([...new Set((response.items || []).map(item => item.logType))])
  },

  async refresh(roomReference) {
    if (!roomReference) throw adapterError('ROOM_REQUIRED')
    const room = resolveArchive(roomReference)
    const job = await structuredLogsV2API.refresh(room.id)
    return success(await waitForJob(job), 'log_refresh_completed')
  },

  async cleanupLog(data) {
    const room = resolveArchive(data)
    const world = resolveWorld(room, data)
    const result = await structuredLogsV2API.clear(room.id, world.id)
    return success(result, 'logs_cleared')
  }
}

export const realRuleManagementApi = {
  async getRulesList(roomReference) {
    if (!roomReference) throw adapterError('ROOM_REQUIRED')
    const room = resolveArchive(roomReference)
    const response = await logRulesV2API.list(room.id)
    return success((response.items || []).map(mapRule))
  },

  async addRule(roomReference, data) {
    const room = resolveArchive(roomReference)
    return success(mapRule(await logRulesV2API.create(room.id, ruleInput(data))), 'log_rule_created')
  },

  async updateRule(roomReference, ruleId, data) {
    const room = resolveArchive(roomReference)
    return success(mapRule(await logRulesV2API.update(room.id, ruleId, ruleInput(data))), 'log_rule_updated')
  },

  async deleteRule(roomReference, ruleId) {
    const room = resolveArchive(roomReference)
    return success(await logRulesV2API.delete(room.id, ruleId), 'log_rule_deleted')
  },

  async testRule(roomReference, data, sample) {
    const room = resolveArchive(roomReference)
    return success(await logRulesV2API.test(room.id, { ...ruleInput(data), sample }))
  },

  async getMigrationPreview(roomReference) {
    const room = resolveArchive(roomReference)
    return logRulesV2API.migrationPreview(room.id)
  },

  async migrateLegacyRules(roomReference) {
    const room = resolveArchive(roomReference)
    return logRulesV2API.migrateLegacy(room.id)
  }
}

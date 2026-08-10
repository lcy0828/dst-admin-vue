import { agentsV2API } from './v2'
import { isLegacyCommandTerminal, normalizeAgentCommandTimeout } from './agentApiSupport.mjs'
import { adapterError, adapterSuccess } from './adapterProtocol.mjs'

const success = (data, msg = 'data_loaded') => adapterSuccess(data, msg, {
  numericCode: true,
  messageAlias: true,
  successFlag: true
})

function seconds(value) {
  if (!value) return 0
  const milliseconds = new Date(value).getTime()
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : 0
}

function legacyAgent(agent = {}) {
  const details = agent.details || {}
  const metrics = agent.metrics || {}
  const user = details.user && typeof details.user === 'object'
    ? details.user
    : { name: details.username || details.user || '' }
  return {
    ...details,
    id: agent.id,
    agent_uuid: agent.id,
    hostname: agent.hostname,
    os: agent.os,
    arch: agent.arch,
    agent_version: agent.version,
    version: agent.version,
    ip_addresses: agent.ipAddresses || [],
    status: agent.status,
    connected: agent.status === 'online',
    last_heartbeat: seconds(agent.lastHeartbeat),
    last_report_at: seconds(agent.lastReportAt),
    cpu_count: metrics.cpuCount || 0,
    memory: {
      allocated: metrics.memoryUsed || 0,
      system: metrics.memoryTotal || 0
    },
    uptime_seconds: metrics.uptimeSeconds || 0,
    user,
    current_dir: details.current_dir || details.currentDir || '',
    capabilities: agent.capabilities || [],
    created_at: agent.createdAt,
    updated_at: agent.updatedAt
  }
}

function legacyStatus(status) {
  return {
    queued: 'pending',
    running: 'running',
    succeeded: 'completed',
    failed: 'failed',
    canceled: 'canceled'
  }[status] || status
}

function v2Status(status) {
  return {
    pending: 'queued',
    running: 'running',
    completed: 'succeeded',
    failed: 'failed',
    canceled: 'canceled'
  }[status] || status || undefined
}

function legacyCommand(command = {}) {
  const status = legacyStatus(command.status)
  return {
    command_id: command.id,
    agent_id: command.agentId,
    agent_name: command.agentName,
    type: command.action,
    content: command.action,
    action: command.action,
    status,
    success: command.status === 'succeeded',
    job_id: command.jobId,
    remote_id: command.remoteId,
    output: command.output || '',
    error_msg: command.error || '',
    exit_code: command.exitCode,
    start_time: command.startedAt || command.createdAt,
    end_time: command.finishedAt,
    duration_ms: command.durationMs || 0,
    created_at: command.createdAt,
    terminal: isLegacyCommandTerminal(status)
  }
}

function commandParams(params = {}) {
  const result = {
    limit: params.limit || params.page_size || 25,
    offset: params.offset ?? (((params.page || 1) - 1) * (params.page_size || params.limit || 25))
  }
  if (params.status) result.status = v2Status(params.status)
  if (params.query || params.search) result.query = params.query || params.search
  if (params.startDate) result.startDate = params.startDate
  if (params.endDate) result.endDate = params.endDate
  return result
}

function actionFromLegacy(input = {}) {
  if (input.action === 'system.refresh' || input.action === 'disk.inspect') return input.action
  const content = String(input.content || '').trim()
  if (content === 'system.refresh' || content === 'uname -a && cat /etc/os-release') return 'system.refresh'
  if (content === 'disk.inspect' || content === 'df -h' || content === 'df -Pk') return 'disk.inspect'
  return ''
}

async function submitCommand(input) {
  const action = actionFromLegacy(input)
  if (!action) {
    throw adapterError('INVALID_AGENT_ACTION', { context: { action: input.action || '' } })
  }
  const agentId = input.agent_id || input.agentId
  if (!agentId) throw adapterError('AGENT_REQUIRED')
  const job = await agentsV2API.runCommand(agentId, {
    action,
    timeoutSeconds: normalizeAgentCommandTimeout(input.timeout ?? input.timeoutSeconds ?? 30)
  })
  const history = await agentsV2API.agentCommands(agentId, { limit: 25, offset: 0 })
  const command = (history.items || []).find(item => item.jobId === job.id)
  return success({
    command_id: command?.id || '',
    job_id: job.id,
    status: job.status
  }, 'agent_command_submitted')
}

async function commandHistory(agentId, params = {}) {
  const value = agentId
    ? await agentsV2API.agentCommands(agentId, commandParams(params))
    : await agentsV2API.commands(commandParams(params))
  return success({
    items: (value.items || []).map(legacyCommand),
    total: value.total || 0,
    limit: value.limit,
    offset: value.offset
  })
}

export const realAgentApi = {
  async getAgentList() {
    const value = await agentsV2API.list()
    return success((value.items || []).map(legacyAgent))
  },
  async getAgent(agentId) {
    return success(legacyAgent(await agentsV2API.get(agentId)))
  },
  async forgetAgent(agentId) {
    return success(await agentsV2API.forget(agentId), 'agent_forgotten')
  },
  async getActions() {
    const value = await agentsV2API.actions()
    return success(value.items || [])
  },
  async getSecurityKey() {
    const value = await agentsV2API.security()
    return success({ ...value, key: value.maskedKey || '', revealed: false })
  },
  async generateNewKey() {
    const value = await agentsV2API.rotateKey('ROTATE AGENT KEY')
    return success({ ...value, key: value.newKey, revealed: true }, 'agent_security_key_rotated')
  },
  executeCommand: submitCommand,
  async getCommandResult(commandId) {
    return success(legacyCommand(await agentsV2API.command(commandId)))
  },
  getCommandHistory(params = {}) {
    return commandHistory('', params)
  },
  getCommandHistoryByAgentId(agentId, params = {}) {
    return commandHistory(agentId, params)
  }
}

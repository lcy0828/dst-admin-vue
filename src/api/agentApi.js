import { agentsV2API } from './v2'

const terminalStatuses = new Set(['completed', 'failed', 'canceled'])

const success = (data, msg = '获取成功') => ({
  code: 200,
  data,
  msg,
  message: msg,
  success: true
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
    canceled: 'canceled',
    timeout: 'failed'
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
    terminal: terminalStatuses.has(status)
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
    throw new Error('当前生产接口只允许“刷新系统信息”和“检查磁盘”两个领域动作')
  }
  const agentId = input.agent_id || input.agentId
  const job = await agentsV2API.runCommand(agentId, {
    action,
    timeoutSeconds: Math.min(300, Math.max(5, Number(input.timeout || input.timeoutSeconds || 30)))
  })
  const history = await agentsV2API.agentCommands(agentId, { limit: 25, offset: 0 })
  const command = (history.items || []).find(item => item.jobId === job.id)
  return success({
    command_id: command?.id || '',
    job_id: job.id,
    status: job.status
  }, '命令已提交')
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
    return success(await agentsV2API.forget(agentId), 'Agent 记录已移除')
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
    return success({ ...value, key: value.newKey, revealed: true }, '新密钥已生成，请立即保存')
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

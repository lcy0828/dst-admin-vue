import { consoleV2API, roomsV2API } from './v2'

export const COMMAND_TYPES = {
  INFO: '信息查询',
  PLAYER: '玩家操作',
  WORLD: '世界操作',
  SYSTEM: '系统操作',
  CUSTOM: '自定义命令'
}

const serverKey = (roomId, worldId) => `${roomId}::${worldId}`

const parseServerKey = value => {
  const separator = String(value || '').indexOf('::')
  if (separator <= 0 || separator === String(value).length - 2) {
    throw new Error('请选择有效的服务器世界')
  }
  return {
    roomId: value.slice(0, separator),
    worldId: value.slice(separator + 2)
  }
}

const mapDefinition = definition => ({
  ...definition,
  type: definition.category,
  command: definition.script,
  isBuiltin: Boolean(definition.isBuiltin),
  is_builtin: Boolean(definition.isBuiltin),
  parameterized: (definition.parameters || []).length > 0,
  needs_params: (definition.parameters || []).length > 0,
  parameters: definition.parameters || []
})

const toDefinitionInput = command => ({
  name: String(command.name || '').trim(),
  description: String(command.description || '').trim(),
  category: String(command.type || command.category || COMMAND_TYPES.CUSTOM).trim(),
  script: String(command.command || command.script || '').trim(),
  parameters: command.parameterized === false ? [] : (command.parameters || []).map(parameter => ({
    name: String(parameter.name || '').trim(),
    label: String(parameter.label || '').trim(),
    type: parameter.type || 'string',
    required: Boolean(parameter.required),
    description: String(parameter.description || '').trim(),
    default: parameter.default === '' ? undefined : parameter.default,
    options: parameter.options || undefined,
    minimum: parameter.minimum,
    maximum: parameter.maximum
  }))
})

const mapServer = (room, world) => ({
  id: serverKey(room.id, world.id),
  session_name: serverKey(room.id, world.id),
  room_id: room.id,
  world_id: world.id,
  archive_name: room.name,
  world_name: world.name,
  room_name: room.name,
  name: `${room.name} - ${world.name}`
})

let serverCache = []

async function loadServers() {
  const roomResponse = await roomsV2API.list()
  const rooms = roomResponse.items || []
  const groups = await Promise.all(rooms.map(async room => {
    const response = await roomsV2API.worlds(room.id)
    return (response.items || []).map(world => mapServer(room, world))
  }))
  serverCache = groups.flat()
  return serverCache
}

class CommandManager {
  constructor() {
    this.commands = []
  }

  async refresh() {
    const response = await consoleV2API.definitions()
    this.commands = (response.items || []).map(mapDefinition)
    return this.getAllCommands()
  }

  getAllCommands() {
    return [...this.commands]
  }

  getCommandsByType(type) {
    return this.commands.filter(command => command.type === type)
  }

  getBuiltinCommands() {
    return this.commands.filter(command => command.isBuiltin)
  }

  getCustomCommands() {
    return this.commands.filter(command => !command.isBuiltin)
  }

  getCommandById(id) {
    return this.commands.find(command => command.id === id)
  }

  async addCommand(command) {
    const created = mapDefinition(await consoleV2API.createDefinition(toDefinitionInput(command)))
    this.commands.push(created)
    return created
  }

  async updateCommand(id, command) {
    const updated = mapDefinition(await consoleV2API.updateDefinition(id, toDefinitionInput(command)))
    const index = this.commands.findIndex(item => item.id === id)
    if (index >= 0) this.commands.splice(index, 1, updated)
    return updated
  }

  async deleteCommand(id) {
    await consoleV2API.deleteDefinition(id)
    this.commands = this.commands.filter(command => command.id !== id)
    return true
  }

  exportCommands() {
    return JSON.stringify(this.getCustomCommands().map(command => ({
      name: command.name,
      description: command.description,
      category: command.category,
      script: command.script,
      parameters: command.parameters
    })), null, 2)
  }

  async importCommands(jsonString) {
    const document = JSON.parse(jsonString)
    if (!Array.isArray(document)) throw new Error('导入文件必须是命令数组')
    const created = []
    for (const command of document) {
      created.push(await this.addCommand({
        ...command,
        type: command.type || command.category,
        command: command.command || command.script,
        parameterized: Array.isArray(command.parameters) && command.parameters.length > 0
      }))
    }
    return created
  }
}

export const commandManager = new CommandManager()

export const commandApi = {
  async getAllCommands() {
    const commands = await commandManager.refresh()
    return { items: commands }
  },
  async getCommand(id) {
    return mapDefinition(await consoleV2API.definition(id))
  },
  addCommand: command => commandManager.addCommand(command),
  updateCommand: (id, command) => commandManager.updateCommand(id, command),
  deleteCommand: id => commandManager.deleteCommand(id),
  getServers: loadServers,
  async executeCommand(server, commandId, argumentsMap = {}, confirmation = '') {
    const target = parseServerKey(server)
    return consoleV2API.execute(target.roomId, target.worldId, {
      commandId,
      arguments: argumentsMap,
      confirmation
    })
  },
  async executeRawCommand(server, command, confirmation) {
    const target = parseServerKey(server)
    return consoleV2API.executeRaw(target.roomId, target.worldId, { command, confirmation })
  },
  async getCommandHistory() {
    const servers = serverCache.length > 0 ? serverCache : await loadServers()
    const rooms = [...new Map(servers.map(server => [server.room_id, server])).values()]
    const responses = await Promise.all(rooms.map(server => consoleV2API.runs(server.room_id, { limit: 50 })))
    return responses.flatMap(response => response.items || [])
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      .slice(0, 50)
  },
  async clearCommandHistory() {
    const servers = serverCache.length > 0 ? serverCache : await loadServers()
    const roomIds = [...new Set(servers.map(server => server.room_id))]
    const results = await Promise.all(roomIds.map(roomId => consoleV2API.clearRuns(roomId)))
    return results.reduce((total, result) => total + (result.deleted || 0), 0)
  },
  getCommandResult: (roomId, runId) => consoleV2API.run(roomId, runId),
  resolveServer: parseServerKey
}

export default commandManager

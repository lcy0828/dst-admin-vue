/**
 * 命令管理模块
 * 用于管理和执行发送到饥荒服务器的各种命令
 */
import request from './request';
import config from './config';

// 命令类型枚举
export const COMMAND_TYPES = {
  INFO: '信息查询',
  PLAYER: '玩家操作',
  WORLD: '世界操作',
  SYSTEM: '系统操作',
  CUSTOM: '自定义命令'
};

// 默认内置命令列表
const DEFAULT_COMMANDS = [
  {
    id: 'list_players',
    name: '获取玩家列表',
    type: COMMAND_TYPES.PLAYER,
    command: 'for i, v in ipairs(TheNet:GetClientTable()) do print(string.format("[DST-ADMIN-GO] [Listplayers] [%d] [%s] [%s] [%s] [%s] ", i-1, string.format("%03d", v.playerage), v.userid, v.name, v.prefab)) end',
    description: '获取当前服务器中的所有玩家信息',
    isBuiltin: true
  },
  {
    id: 'world_info',
    name: '获取世界信息',
    type: COMMAND_TYPES.INFO,
    command: 'print("[DST-ADMIN-GO]","[World Basic Info]", TheWorld.state.cycles + 1,TheWorld.state.season,TheWorld.state.remainingdaysinseason)',
    description: '获取当前世界的基本信息，包括天数、季节和剩余天数',
    isBuiltin: true
  },
  {
    id: 'save_world',
    name: '保存世界',
    type: COMMAND_TYPES.WORLD,
    command: 'print("[DST-ADMIN-GO]","[Save World]",c_save())',
    description: '保存当前世界状态',
    isBuiltin: true
  },
  {
    id: 'announce',
    name: '发送公告',
    type: COMMAND_TYPES.SYSTEM,
    command: 'print("[DST-ADMIN-GO]","[Send Announcement]",c_announce("{message}"))',
    description: '向所有玩家发送公告信息',
    isBuiltin: true,
    parameterized: true,
    parameters: [
      {
        name: 'message',
        label: '公告内容',
        type: 'string',
        required: true
      }
    ]
  },
  {
    id: 'spawn_entity',
    name: '生成实体',
    type: COMMAND_TYPES.WORLD,
    command: 'print("[DST-ADMIN-GO]","[Spawn Entity]",c_spawn("{prefab}", {count}))',
    description: '在指定位置生成实体',
    isBuiltin: true,
    parameterized: true,
    parameters: [
      {
        name: 'prefab',
        label: '实体代码',
        type: 'string',
        required: true
      },
      {
        name: 'count',
        label: '数量',
        type: 'number',
        required: false,
        default: 1
      }
    ]
  },
  {
    id: 'kick_player',
    name: '踢出玩家',
    type: COMMAND_TYPES.PLAYER,
    command: 'print("[DST-ADMIN-GO]","[Kick Player]",TheNet:Kick("{userid}"))',
    description: '将指定玩家踢出服务器',
    isBuiltin: true,
    parameterized: true,
    parameters: [
      {
        name: 'userid',
        label: '玩家ID',
        type: 'string',
        required: true
      }
    ]
  },
  {
    id: 'regenerate_world',
    name: '重新生成世界',
    type: COMMAND_TYPES.WORLD,
    command: 'print("[DST-ADMIN-GO]","[Regenerate World]",c_regenerateworld())',
    description: '重新生成当前世界，保留玩家数据但重置世界',
    isBuiltin: true
  },
  {
    id: 'roll_back',
    name: '回档',
    type: COMMAND_TYPES.WORLD,
    command: 'print("[DST-ADMIN-GO]","[Rollback]",c_rollback({days}))',
    description: '将世界回档指定天数',
    isBuiltin: true,
    parameterized: true,
    parameters: [
      {
        name: 'days',
        label: '回档天数',
        type: 'number',
        required: true
      }
    ]
  },
  {
    id: 'get_season',
    name: '获取季节',
    type: COMMAND_TYPES.INFO,
    command: 'print("[DST-ADMIN-GO]","[Get Season]",TheWorld.state.season)',
    description: '获取当前世界的季节',
    isBuiltin: true
  },
  {
    id: 'get_days',
    name: '获取天数',
    type: COMMAND_TYPES.INFO,
    command: 'print("[DST-ADMIN-GO]","[Get Days]",TheWorld.state.cycles + 1)',
    description: '获取当前世界的天数',
    isBuiltin: true
  }
];

// 初始化命令存储
const initCommandStore = () => {
  // 尝试从localStorage读取自定义命令
  let customCommands = [];
  try {
    const storedCommands = localStorage.getItem('dstadmin_custom_commands');
    if (storedCommands) {
      customCommands = JSON.parse(storedCommands);
    }
  } catch (e) {
    console.error('读取自定义命令失败:', e);
  }
  
  // 合并内置命令和自定义命令
  return [...DEFAULT_COMMANDS, ...customCommands];
};

// 命令管理类
class CommandManager {
  constructor() {
    this.commands = initCommandStore();
    this.isInitialized = false;
    this.initializeFromServer();
  }
  
  // 从服务器初始化命令
  async initializeFromServer() {
    try {
      const response = await request.get('/tmux/commands');
      if (response && response.data && Array.isArray(response.data)) {
        // 合并服务器命令和本地命令，以服务器命令为准
        this.commands = response.data;
        this.isInitialized = true;
      } else if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
        this.commands = response.data.data;
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('从服务器初始化命令失败:', error);
      // 初始化失败使用本地命令
    }
  }
  
  // 获取所有命令
  getAllCommands() {
    return this.commands;
  }
  
  // 按类型获取命令
  getCommandsByType(type) {
    return this.commands.filter(cmd => cmd.type === type || cmd.category === type);
  }
  
  // 获取内置命令
  getBuiltinCommands() {
    return this.commands.filter(cmd => cmd.isBuiltin || cmd.is_builtin);
  }
  
  // 获取自定义命令
  getCustomCommands() {
    return this.commands.filter(cmd => !cmd.isBuiltin && !cmd.is_builtin);
  }
  
  // 根据ID获取命令
  getCommandById(id) {
    return this.commands.find(cmd => cmd.id === id);
  }
  
  // 添加新命令
  async addCommand(command) {
    // 生成唯一ID
    if (!command.id) {
      command.id = 'custom_' + Date.now();
    }
    
    // 确保类型有效
    if (!Object.values(COMMAND_TYPES).includes(command.type) && !command.category) {
      command.type = COMMAND_TYPES.CUSTOM;
    }
    
    // 设置为非内置命令
    command.isBuiltin = false;
    command.is_builtin = false;
    
    try {
      // 尝试发送到服务器
      const response = await request.post('/tmux/commands', command);
      if (response && response.data) {
        const newCommand = response.data.data || response.data;
        // 添加到命令列表
        this.commands.push(newCommand);
        return newCommand;
      }
    } catch (error) {
      console.error('添加命令到服务器失败:', error);
      // 如果服务器添加失败，则添加到本地
      this.commands.push(command);
      // 保存到本地存储
      this._saveCustomCommands();
      return command;
    }
  }
  
  // 更新命令
  async updateCommand(id, updatedCommand) {
    const index = this.commands.findIndex(cmd => cmd.id === id);
    
    if (index === -1) {
      throw new Error(`找不到ID为${id}的命令`);
    }
    
    const oldCommand = this.commands[index];
    
    // 不能修改内置命令的某些属性
    if (oldCommand.isBuiltin || oldCommand.is_builtin) {
      delete updatedCommand.id;
      delete updatedCommand.isBuiltin;
      delete updatedCommand.is_builtin;
      delete updatedCommand.command; // 不允许修改内置命令的实际命令
      delete updatedCommand.script; // 不允许修改内置命令的脚本
    }
    
    try {
      // 尝试发送到服务器
      const response = await request.put(`/tmux/commands/${id}`, updatedCommand);
      if (response && response.data) {
        const newCommand = response.data.data || response.data;
        // 更新命令列表
        this.commands[index] = newCommand;
        return newCommand;
      }
    } catch (error) {
      console.error('更新服务器命令失败:', error);
      // 如果服务器更新失败，则更新本地
      // 更新命令
      this.commands[index] = { ...oldCommand, ...updatedCommand };
      
      // 保存到本地存储
      this._saveCustomCommands();
      
      return this.commands[index];
    }
  }
  
  // 删除命令
  async deleteCommand(id) {
    const command = this.getCommandById(id);
    
    if (!command) {
      throw new Error(`找不到ID为${id}的命令`);
    }
    
    if (command.isBuiltin || command.is_builtin) {
      throw new Error('不能删除内置命令');
    }
    
    try {
      // 尝试发送到服务器
      await request.delete(`/tmux/commands/${id}`);
      // 从数组中移除
      this.commands = this.commands.filter(cmd => cmd.id !== id);
      return true;
    } catch (error) {
      console.error('从服务器删除命令失败:', error);
      // 如果服务器删除失败，则从本地删除
      // 从数组中移除
      this.commands = this.commands.filter(cmd => cmd.id !== id);
      
      // 保存到本地存储
      this._saveCustomCommands();
      
      return true;
    }
  }
  
  // 重置为默认命令
  resetToDefault() {
    this.commands = [...DEFAULT_COMMANDS];
    localStorage.removeItem('dstadmin_custom_commands');
    return this.commands;
  }
  
  // 准备命令执行
  prepareCommand(id, parameters = {}) {
    const command = this.getCommandById(id);
    
    if (!command) {
      throw new Error(`找不到ID为${id}的命令`);
    }
    
    let commandString = command.command || command.script;
    
    // 如果命令需要参数替换
    if (command.parameterized || command.needs_params) {
      // 检查必需参数
      if (command.parameters) {
        const requiredParams = command.parameters.filter(param => param.required);
        for (const param of requiredParams) {
          if (parameters[param.name] === undefined) {
            throw new Error(`缺少必需参数: ${param.label || param.name}`);
          }
        }
      }
      
      // 替换参数
      Object.keys(parameters).forEach(key => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        const value = parameters[key] === undefined && command.parameters 
                     ? (command.parameters.find(p => p.name === key)?.default || '')
                     : parameters[key];
        commandString = commandString.replace(regex, value);
      });
    }
    
    return commandString;
  }
  
  // 执行命令 (使用新的API)
  executeCommand(id, parameters = {}, sessionName = '') {
    const command = this.getCommandById(id);
    
    if (!command) {
      throw new Error(`找不到ID为${id}的命令`);
    }
    
    // 使用新的模块化命令API
    return request.post('/tmux/command', {
      command_id: id,
      params: parameters,
      session_name: sessionName
    });
  }
  
  // 执行原始命令 (保持向后兼容)
  executeRawCommand(commandString, sessionName = '') {
    // 使用原始命令API
    return request.post('/tmux/raw-command', {
      command: commandString,
      session_name: sessionName
    });
  }
  
  // 保存自定义命令到本地存储
  _saveCustomCommands() {
    const customCommands = this.getCustomCommands();
    localStorage.setItem('dstadmin_custom_commands', JSON.stringify(customCommands));
  }
  
  // 导出命令
  exportCommands() {
    const customCommands = this.getCustomCommands();
    return JSON.stringify(customCommands);
  }
  
  // 导入命令
  importCommands(jsonString) {
    try {
      const importedCommands = JSON.parse(jsonString);
      
      if (!Array.isArray(importedCommands)) {
        throw new Error('导入的数据格式不正确');
      }
      
      // 为导入的命令生成新ID以避免冲突
      const commandsToAdd = importedCommands.map(cmd => ({
        ...cmd,
        id: 'imported_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        isBuiltin: false, // 确保导入的命令是自定义的
        is_builtin: false
      }));
      
      // 添加到命令列表
      this.commands.push(...commandsToAdd);
      
      // 保存到本地存储
      this._saveCustomCommands();
      
      return commandsToAdd;
    } catch (e) {
      throw new Error('导入命令失败: ' + e.message);
    }
  }
}

// 导出命令管理器实例
export const commandManager = new CommandManager();

// 导出命令操作API
export const commandApi = {
  // 执行命令 (新API)
  executeCommand(commandId, params = {}, sessionName = '') {
    return request.post('/tmux/command', {
      command_id: commandId,
      params,
      session_name: sessionName
    });
  },
  
  // 执行原始命令 (兼容旧API)
  executeRawCommand(command, sessionName = '') {
    return request.post('/tmux/raw-command', {
      command,
      session_name: sessionName
    });
  },
  
  // 获取所有命令
  getAllCommands(category = '') {
    const url = category ? `/tmux/commands?category=${encodeURIComponent(category)}` : '/tmux/commands';
    return request.get(url);
  },
  
  // 获取单个命令
  getCommand(id) {
    return request.get(`/tmux/commands/${id}`);
  },
  
  // 添加命令
  addCommand(command) {
    return request.post('/tmux/commands', command);
  },
  
  // 更新命令
  updateCommand(id, command) {
    return request.put(`/tmux/commands/${id}`, command);
  },
  
  // 删除命令
  deleteCommand(id) {
    return request.delete(`/tmux/commands/${id}`);
  },
  
  // 获取命令执行历史
  getCommandHistory() {
    return request.get('/tmux/command/history');
  },
  
  // 获取命令执行结果
  getCommandResult(commandId) {
    return request.get(`/tmux/command/result/${commandId}`);
  }
};

export default commandManager; 
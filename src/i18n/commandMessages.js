import { normalizeCommandCategory } from '../lib/commandCategories.mjs'
import { formatSystemDateTime } from '../lib/dateTime.mjs'

export const commandMessages = {
  'zh-CN': {
    commands: {
      title: '命令管理',
      subtitle: '向世界分片执行 Lua 命令，并维护可复用的命令模板。',
      actions: {
        refresh: '刷新',
        reload: '重新加载',
        execute: '执行命令',
        useExample: '使用示例',
        commonCommands: '常用命令',
        batch: '批量命令',
        clearHistory: '清空历史',
        saveFile: '保存文件',
        rerun: '重新执行',
        copy: '复制命令',
        export: '导出',
        import: '导入',
        add: '添加命令',
        edit: '编辑',
        delete: '删除',
        cancel: '取消',
        confirm: '确定',
        close: '关闭',
        start: '开始执行',
        addParameter: '添加参数',
        deleteParameter: '删除参数'
      },
      load: {
        title: '命令数据加载失败',
        loadingAria: '正在读取命令'
      },
      execute: {
        title: '执行命令',
        description: '使用结构化模板或直接向分片发送 Lua 命令。',
        modes: { structured: '结构化命令', raw: '原始命令' },
        server: '选择服务器',
        selectServer: '请选择服务器',
        command: '选择命令',
        selectCommand: '请选择要执行的命令',
        parameters: '命令参数',
        examplePlaceholder: '示例：{example}',
        inputPlaceholder: '请输入{name}',
        selectParameter: '请选择{name}',
        exampleDescription: '示例：{example}',
        preview: '命令预览',
        rawContent: '命令内容',
        rawPlaceholder: '请输入原始命令，例如：{example}',
        searchCommands: '搜索命令',
        result: { success: '执行成功', uncertain: '执行结果不确定', failed: '执行失败' }
      },
      history: {
        title: '命令历史记录',
        columns: {
          time: '执行时间',
          server: '服务器',
          command: '命令',
          status: '状态',
          actions: '操作'
        }
      },
      manage: {
        title: '服务器命令管理',
        description: '维护自定义 Lua 命令及参数定义。',
        all: '全部命令',
        columns: {
          name: '命令名称',
          type: '命令类型',
          description: '命令描述',
          builtin: '内置命令',
          actions: '操作'
        },
        yes: '是',
        no: '否',
        empty: '当前分类没有命令',
        emptyDescription: '切换分类，或添加新的自定义命令。'
      },
      dialog: {
        addTitle: '添加命令',
        editTitle: '编辑命令',
        description: '定义命令脚本、分类及可选参数。',
        name: '命令名称',
        namePlaceholder: '请输入命令名称',
        type: '命令类型',
        typePlaceholder: '请选择命令类型',
        commandDescription: '命令描述',
        descriptionPlaceholder: '请输入命令描述',
        script: '命令脚本',
        scriptPlaceholder: '请输入 Lua 命令脚本，例如：{example}',
        parameterized: '包含参数',
        parameter: {
          name: '参数名',
          label: '标签',
          labelPlaceholder: '消息内容',
          type: '类型',
          default: '默认值',
          defaultPlaceholder: '默认值',
          required: '必填'
        },
        parameterTypes: { string: '字符串', number: '数字', boolean: '布尔值' }
      },
      batch: {
        title: '批量执行命令',
        description: '每行一条命令，按顺序执行；以 # 开头的行会被忽略。',
        commandList: '命令列表',
        listPlaceholder: '# 每行输入一条命令',
        interval: '执行间隔（毫秒）',
        success: '成功',
        failed: '失败'
      },
      statuses: {
        succeeded: '已确认',
        sent: '已发送（未验证）',
        sending: '发送中',
        uncertain: '结果不确定',
        unresponsive: '控制台无响应',
        failed: '失败',
        canceled: '已取消',
        unknown: '未知'
      },
      categories: {
        info: '信息查询',
        player: '玩家操作',
        world: '世界操作',
        system: '系统操作',
        custom: '自定义命令',
        basic: '基础操作',
        world_info: '世界信息',
        world_control: '世界控制',
        dangerous: '危险操作'
      },
      builtins: {
        save_world: { name: '保存世界', description: '立即保存当前世界', parameters: {} },
        list_players: { name: '列出玩家', description: '将当前玩家列表写入服务器日志', parameters: {} },
        shutdown: { name: '关闭分片', description: '保存并关闭当前分片', parameters: {} },
        regenerate: { name: '重新生成世界', description: '删除当前进度并重新生成世界', parameters: {} },
        announce: {
          name: '发送公告',
          description: '向当前房间的玩家发送公告',
          parameters: { message: { label: '公告内容' } }
        },
        set_season: {
          name: '设置季节',
          description: '切换当前世界季节',
          parameters: {
            season: {
              label: '季节',
              options: { autumn: '秋季', winter: '冬季', spring: '春季', summer: '夏季' }
            }
          }
        },
        rollback: {
          name: '回档',
          description: '将当前世界回退指定数量的存档快照',
          parameters: { days: { label: '回档点数' } }
        }
      },
      common: {
        announce: { name: '公告消息', description: '向所有玩家发送一条公告' },
        give: { name: '生成物品', description: '生成指定物品' },
        spawn: { name: '生成生物', description: '在当前位置生成生物' },
        regenerate: { name: '重生世界', description: '重新生成世界' },
        rollback: { name: '回档', description: '将世界回退指定数量的存档快照' },
        kick: { name: '踢出玩家', description: '踢出指定玩家' },
        ban: { name: '封禁玩家', description: '永久封禁指定玩家' },
        players: { name: '显示玩家列表', description: '显示所有在线玩家' },
        season: { name: '查看当前季节', description: '显示当前世界季节' },
        day: { name: '查看当前天数', description: '显示当前世界天数' },
        save: { name: '保存世界', description: '手动保存当前世界状态' }
      },
      confirmation: {
        missingServer: '未找到目标服务器',
        message: '该操作会向房间“{room}”的游戏控制台发送 Lua 命令，请确认是否执行。',
        title: '执行确认',
        execute: '确认执行',
        mismatch: '房间名不匹配'
      },
      feedback: {
        invalidParameter: '参数名不能为空',
        incompleteForm: '请完整填写命令名称、类型、描述和脚本',
        added: '添加命令成功',
        updated: '更新命令成功',
        deleteConfirm: '确定要删除命令“{name}”吗？',
        deleteTitle: '删除命令',
        deleted: '删除命令成功',
        imported: '成功导入 {count} 个命令',
        importPartial: '已导入 {imported}/{total} 个命令；{error}',
        exported: '命令导出成功',
        exampleApplied: '已应用示例值',
        selectServer: '请选择服务器',
        selectCommand: '请选择要执行的命令',
        enterCommand: '请输入命令内容',
        sent: '命令执行成功',
        sentToConsole: 'DST 已确认命令执行成功',
        loadedForRerun: '已加载命令，点击执行按钮运行',
        batchCopyUnsupported: '批量命令无法直接复制',
        copied: '命令已复制到剪贴板',
        enterCommandList: '请输入命令列表',
        noValidCommands: '没有有效的命令',
        batchSummary: '批量命令执行完成：共 {total} 条命令，成功 {success} 条，失败 {failed} 条',
        historyClearConfirm: '确定要清空所有命令历史记录吗？',
        historyClearTitle: '清空命令历史',
        historyCleared: '已清空 {count} 条历史记录'
      },
      errors: {
        withDetail: '{message}：{detail}',
        unknown: '未知错误',
        operation: '命令操作失败',
        commandList: '获取命令列表失败',
        serverList: '获取服务器列表失败',
        commandDetails: '获取命令详情失败',
        delete: '删除命令失败',
        import: '导入命令失败',
        export: '导出命令失败',
        execution: '命令执行出错',
        executionFailed: '命令执行失败',
        history: '加载命令历史记录失败',
        clearHistory: '清空历史记录失败',
        copy: '复制命令失败',
        batch: '批量命令执行失败',
        batchItem: '执行出错',
        codes: {
          COMMAND_INVALID_SERVER: '请选择有效的服务器世界',
          COMMAND_MISSING_RUN_ID: '后端没有返回命令执行记录 ID',
          COMMAND_RUN_TIMEOUT: '等待命令发送完成超时，请到命令历史确认最终结果',
          COMMAND_RUN_FAILED: '命令执行失败',
          COMMAND_OUTCOME_UNKNOWN: '未收到命令执行回执，结果无法确认',
          CONSOLE_UNRESPONSIVE: '分片控制台无响应',
          RUNTIME_UNAVAILABLE: '目标分片 Runtime 尚未就绪，命令没有发送',
          COMMAND_SEND_FAILED: '命令发送失败',
          COMMAND_CANCELED: '命令请求已取消',
          COMMAND_COMPILE_FAILED: 'Lua 命令编译失败',
          COMMAND_EXECUTION_FAILED: 'Lua 命令执行失败',
          INVALID_SCRIPT: 'Lua 命令内容无效',
          COMMAND_IMPORT_INVALID_FORMAT: '导入文件必须是命令数组',
          COMMAND_IMPORT_ITEM_FAILED: '第 {itemNumber} 条命令导入失败'
        }
      }
    }
  },
  'en-US': {
    commands: {
      title: 'Command Management',
      subtitle: 'Run Lua commands on world shards and maintain reusable command templates.',
      actions: {
        refresh: 'Refresh', reload: 'Reload', execute: 'Execute command', useExample: 'Use example',
        commonCommands: 'Common commands', batch: 'Batch commands', clearHistory: 'Clear history',
        saveFile: 'Save file', rerun: 'Run again', copy: 'Copy command', export: 'Export', import: 'Import',
        add: 'Add command', edit: 'Edit', delete: 'Delete', cancel: 'Cancel', confirm: 'Confirm', close: 'Close',
        start: 'Start execution', addParameter: 'Add parameter', deleteParameter: 'Delete parameter'
      },
      load: { title: 'Failed to load command data', loadingAria: 'Loading commands' },
      execute: {
        title: 'Execute Command',
        description: 'Use a structured template or send a Lua command directly to a shard.',
        modes: { structured: 'Structured command', raw: 'Raw command' },
        server: 'Server', selectServer: 'Select a server', command: 'Command', selectCommand: 'Select a command to execute',
        parameters: 'Command Parameters', examplePlaceholder: 'Example: {example}', inputPlaceholder: 'Enter {name}',
        selectParameter: 'Select {name}', exampleDescription: 'Example: {example}', preview: 'Command Preview',
        rawContent: 'Command Content', rawPlaceholder: 'Enter a raw command, for example: {example}',
        searchCommands: 'Search commands', result: { success: 'Execution succeeded', uncertain: 'Execution outcome uncertain', failed: 'Execution failed' }
      },
      history: {
        title: 'Command History',
        columns: { time: 'Execution time', server: 'Server', command: 'Command', status: 'Status', actions: 'Actions' }
      },
      manage: {
        title: 'Server Command Management',
        description: 'Maintain custom Lua commands and parameter definitions.',
        all: 'All commands',
        columns: { name: 'Command name', type: 'Command type', description: 'Description', builtin: 'Built in', actions: 'Actions' },
        yes: 'Yes', no: 'No', empty: 'No commands in this category',
        emptyDescription: 'Switch categories or add a new custom command.'
      },
      dialog: {
        addTitle: 'Add Command', editTitle: 'Edit Command',
        description: 'Define the command script, category, and optional parameters.',
        name: 'Command name', namePlaceholder: 'Enter a command name', type: 'Command type', typePlaceholder: 'Select a command type',
        commandDescription: 'Description', descriptionPlaceholder: 'Enter a command description', script: 'Command script',
        scriptPlaceholder: 'Enter a Lua command script, for example: {example}', parameterized: 'Has parameters',
        parameter: { name: 'Parameter name', label: 'Label', labelPlaceholder: 'Message content', type: 'Type', default: 'Default value', defaultPlaceholder: 'Default value', required: 'Required' },
        parameterTypes: { string: 'String', number: 'Number', boolean: 'Boolean' }
      },
      batch: {
        title: 'Execute Batch Commands',
        description: 'Run one command per line in order. Lines starting with # are ignored.',
        commandList: 'Command list', listPlaceholder: '# Enter one command per line', interval: 'Interval (milliseconds)',
        success: 'Succeeded', failed: 'Failed'
      },
      statuses: {
        succeeded: 'Confirmed', sent: 'Sent (unverified)', sending: 'Sending', uncertain: 'Outcome uncertain',
        unresponsive: 'Console unresponsive', failed: 'Failed', canceled: 'Canceled', unknown: 'Unknown'
      },
      categories: {
        info: 'Information queries', player: 'Player operations', world: 'World operations', system: 'System operations',
        custom: 'Custom commands', basic: 'Basic operations', world_info: 'World information',
        world_control: 'World control', dangerous: 'Dangerous operations'
      },
      builtins: {
        save_world: { name: 'Save world', description: 'Save the current world immediately', parameters: {} },
        list_players: { name: 'List players', description: 'Write the current player list to the server log', parameters: {} },
        shutdown: { name: 'Shut down shard', description: 'Save and shut down the current shard', parameters: {} },
        regenerate: { name: 'Regenerate world', description: 'Delete current progress and regenerate the world', parameters: {} },
        announce: {
          name: 'Send announcement',
          description: 'Send an announcement to players in the current room',
          parameters: { message: { label: 'Announcement content' } }
        },
        set_season: {
          name: 'Set season',
          description: 'Change the current world season',
          parameters: {
            season: {
              label: 'Season',
              options: { autumn: 'Autumn', winter: 'Winter', spring: 'Spring', summer: 'Summer' }
            }
          }
        },
        rollback: {
          name: 'Roll back',
          description: 'Roll the current world back by the specified number of save snapshots',
          parameters: { days: { label: 'Rollback points' } }
        }
      },
      common: {
        announce: { name: 'Announcement', description: 'Send an announcement to all players' },
        give: { name: 'Give Item', description: 'Give the specified item' },
        spawn: { name: 'Spawn Creature', description: 'Spawn a creature at the current location' },
        regenerate: { name: 'Regenerate World', description: 'Regenerate the world' },
        rollback: { name: 'Rollback', description: 'Roll the world back by the specified number of save snapshots' },
        kick: { name: 'Kick Player', description: 'Kick the specified player' },
        ban: { name: 'Ban Player', description: 'Permanently ban the specified player' },
        players: { name: 'List Players', description: 'List all online players' },
        season: { name: 'Current Season', description: 'Show the current world season' },
        day: { name: 'Current Day', description: 'Show the current world day' },
        save: { name: 'Save World', description: 'Manually save the current world state' }
      },
      confirmation: {
        missingServer: 'Target server not found',
        message: 'This action sends a Lua command to the game console for room “{room}”. Continue?',
        title: 'Execution Confirmation', execute: 'Execute', mismatch: 'Room name does not match'
      },
      feedback: {
        invalidParameter: 'Parameter names cannot be empty',
        incompleteForm: 'Complete the command name, type, description, and script',
        added: 'Command added', updated: 'Command updated', deleteConfirm: 'Delete command “{name}”?',
        deleteTitle: 'Delete Command', deleted: 'Command deleted', imported: 'Imported {count} commands',
        importPartial: 'Imported {imported}/{total} commands; {error}', exported: 'Commands exported',
        exampleApplied: 'Example value applied', selectServer: 'Select a server', selectCommand: 'Select a command to execute',
        enterCommand: 'Enter command content', sent: 'Command executed successfully', sentToConsole: 'DST confirmed command execution',
        loadedForRerun: 'Command loaded. Use the execute button to run it.',
        batchCopyUnsupported: 'Batch commands cannot be copied directly', copied: 'Command copied to the clipboard',
        enterCommandList: 'Enter a command list', noValidCommands: 'No valid commands',
        batchSummary: 'Batch complete: {total} commands, {success} succeeded, {failed} failed',
        historyClearConfirm: 'Clear all command history?', historyClearTitle: 'Clear Command History',
        historyCleared: 'Cleared {count} history records'
      },
      errors: {
        withDetail: '{message}: {detail}', unknown: 'Unknown error', operation: 'Command operation failed',
        commandList: 'Failed to load commands', serverList: 'Failed to load servers',
        commandDetails: 'Failed to load command details', delete: 'Failed to delete command',
        import: 'Failed to import commands', export: 'Failed to export commands', execution: 'Command execution error',
        executionFailed: 'Command execution failed', history: 'Failed to load command history',
        clearHistory: 'Failed to clear command history', copy: 'Failed to copy command',
        batch: 'Batch command execution failed', batchItem: 'Execution error',
        codes: {
          COMMAND_INVALID_SERVER: 'Select a valid server world',
          COMMAND_MISSING_RUN_ID: 'The backend did not return a command run ID',
          COMMAND_RUN_TIMEOUT: 'Timed out waiting for command delivery. Check command history for the final result.',
          COMMAND_RUN_FAILED: 'Command execution failed',
          COMMAND_OUTCOME_UNKNOWN: 'No execution receipt was received, so the outcome cannot be confirmed',
          CONSOLE_UNRESPONSIVE: 'The shard console is unresponsive',
          RUNTIME_UNAVAILABLE: 'The target shard Runtime is not ready; the command was not sent',
          COMMAND_SEND_FAILED: 'Command delivery failed',
          COMMAND_CANCELED: 'The command request was canceled',
          COMMAND_COMPILE_FAILED: 'The Lua command could not be compiled',
          COMMAND_EXECUTION_FAILED: 'The Lua command failed during execution',
          INVALID_SCRIPT: 'The Lua command content is invalid',
          COMMAND_IMPORT_INVALID_FORMAT: 'The import file must be an array of commands',
          COMMAND_IMPORT_ITEM_FAILED: 'Command {itemNumber} could not be imported'
        }
      }
    }
  }
}

export function translateCommandCategory(translate, hasTranslation, value) {
  const category = normalizeCommandCategory(value)
  const key = `commands.categories.${category}`
  return hasTranslation(key) ? translate(key) : category
}

export function translateBuiltinCommandField(translate, hasTranslation, command, field) {
  const fallback = command?.[field] || ''
  if (!command || !(command.isBuiltin || command.is_builtin) || !command.id) return fallback
  const key = `commands.builtins.${command.id}.${field}`
  return hasTranslation(key) ? translate(key) : fallback
}

export function translateBuiltinParameterField(translate, hasTranslation, command, parameter, field) {
  const fallback = parameter?.[field] || ''
  if (!command || !(command.isBuiltin || command.is_builtin) || !command.id || !parameter?.name) return fallback
  const key = `commands.builtins.${command.id}.parameters.${parameter.name}.${field}`
  return hasTranslation(key) ? translate(key) : fallback
}

export function translateBuiltinParameterOption(translate, hasTranslation, command, parameter, option) {
  if (!command || !(command.isBuiltin || command.is_builtin) || !command.id || !parameter?.name) return option
  const key = `commands.builtins.${command.id}.parameters.${parameter.name}.options.${option}`
  return hasTranslation(key) ? translate(key) : option
}

export function translateCommandStatus(translate, hasTranslation, value) {
  if (value === undefined || value === null || value === '') return translate('commands.statuses.unknown')
  const key = `commands.statuses.${value}`
  return hasTranslation(key) ? translate(key) : value
}

export function formatCommandTime(value, locale = 'zh-CN') {
  const activeLocale = typeof locale === 'string' ? locale : locale?.value
  return formatSystemDateTime(value, {
    locale: activeLocale === 'en-US' ? 'en-US' : 'zh-CN',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false
  })
}

export function localizeCommandError(translate, hasTranslation, error, fallbackKey = 'commands.errors.operation') {
  const codeKey = error?.code ? `commands.errors.codes.${error.code}` : ''
  const hasCodeMessage = Boolean(codeKey && hasTranslation(codeKey))
  const message = hasCodeMessage ? translate(codeKey, error) : translate(fallbackKey)
  const detail = error?.detail || (!hasCodeMessage ? error?.message : '')
  return detail ? translate('commands.errors.withDetail', { message, detail }) : message
}

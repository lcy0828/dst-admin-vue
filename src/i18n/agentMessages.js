export const agentMessages = {
  'zh-CN': {
    agents: {
      list: {
        title: 'Agent 管理中心',
        subtitle: '管理远程节点、运行时配置与资源状态。',
        loadingAria: '正在读取 Agent 状态',
        metrics: {
          online: '在线 Agent',
          onlineDescription: '当前保持连接的节点',
          total: 'Agent 总数',
          totalDescription: '已注册的远程节点',
          operatingSystems: '操作系统',
          operatingSystemsDescription: '已接入的系统类型'
        },
        actions: {
          details: '详情',
          runtimeConfig: '运行时配置',
          configureRuntime: '配置远程运行时',
          executeCommand: '执行命令',
          remove: '移除'
        },
        fields: {
          system: '系统',
          ipAddress: 'IP 地址',
          cpuCores: '{count} 核心',
          memory: '内存',
          uptime: '运行时间',
          user: '用户',
          path: '路径',
          lastHeartbeat: '最后心跳',
          memoryUsage: '内存使用',
          memoryUsageAria: '{name} 内存使用率'
        },
        values: {
          notAvailable: '不可用'
        },
        duration: {
          daysHours: '{days} 天 {hours} 小时',
          hoursMinutes: '{hours} 小时 {minutes} 分钟',
          minutes: '{minutes} 分钟'
        },
        empty: {
          title: '暂无 Agent 连接',
          description: '配置安全密钥并启动 Agent 后，节点会显示在这里。',
          add: '添加 Agent'
        },
        details: {
          title: 'Agent 详情',
          description: '节点身份、系统与连接信息。',
          hostname: '主机名',
          version: '版本',
          capabilities: '能力'
        },
        runtime: {
          title: '远程运行时配置',
          description: '保存此 Agent 的 DST 路径和兼容运行时。当前版本尚未开放房间、日志、备份等远程领域操作。',
          scope: '配置作用域：仅此 Agent',
          displayName: '显示名称',
          serverMode: '服务端模式',
          mode64: '64 位',
          mode32: '32 位',
          savePath: 'DST 存档路径',
          serverPath: 'DST 服务端路径',
          backupPath: '备份路径',
          advanced: '模组与兼容运行时',
          ugcPath: 'UGC 路径',
          steamcmdPath: 'SteamCMD 路径',
          workshopPath: 'Workshop 内容路径',
          luaCommand: 'Lua 命令',
          luaFallbackPath: 'Lua fallback 路径',
          removeConfig: '移除配置',
          saveConfig: '保存配置'
        },
        validation: {
          displayName: '请输入显示名称',
          savePath: '请输入远程存档路径',
          serverPath: '请输入远程服务端路径',
          required: '请完成必填的运行时配置'
        },
        feedback: {
          loadFailedTitle: 'Agent 列表加载失败',
          loadFailed: '获取 Agent 列表失败',
          runtimeLoadFailedTitle: '远程运行时配置加载失败',
          runtimeLoadFailed: '无法读取远程运行时配置',
          runtimeSaved: '远程路径配置已保存；远程领域操作尚未开放',
          runtimeSavedRefreshFailed: '远程路径配置已保存，但刷新配置状态失败',
          runtimeSaveFailed: '保存远程运行时配置失败：{error}',
          runtimeRemoveConfirm: '确定移除“{name}”的远程运行时配置吗？',
          runtimeRemoveTitle: '移除运行时配置',
          runtimeRemoved: '远程运行时配置已移除',
          runtimeRemovedRefreshFailed: '远程运行时配置已移除，但刷新配置状态失败',
          runtimeRemoveFailed: '移除远程运行时配置失败：{error}',
          agentRemoveConfirm: '确定移除离线 Agent“{name}”的历史记录吗？',
          agentRemoveTitle: '移除 Agent',
          agentRemoved: 'Agent 记录已移除',
          agentRemoveFailed: '移除 Agent 失败：{error}',
          errorWithDetail: '{message}：{detail}'
        }
      }
    }
  },
  'en-US': {
    agents: {
      list: {
        title: 'Agent management',
        subtitle: 'Manage remote nodes, runtime configuration, and resource status.',
        loadingAria: 'Loading Agent status',
        metrics: {
          online: 'Online Agents',
          onlineDescription: 'Nodes that are currently connected',
          total: 'Total Agents',
          totalDescription: 'Registered remote nodes',
          operatingSystems: 'Operating systems',
          operatingSystemsDescription: 'Connected operating system types'
        },
        actions: {
          details: 'Details',
          runtimeConfig: 'Runtime configuration',
          configureRuntime: 'Configure remote runtime',
          executeCommand: 'Run command',
          remove: 'Remove'
        },
        fields: {
          system: 'System',
          ipAddress: 'IP address',
          cpuCores: '{count} cores',
          memory: 'Memory',
          uptime: 'Uptime',
          user: 'User',
          path: 'Path',
          lastHeartbeat: 'Last heartbeat',
          memoryUsage: 'Memory usage',
          memoryUsageAria: '{name} memory usage'
        },
        values: {
          notAvailable: 'N/A'
        },
        duration: {
          daysHours: '{days}d {hours}h',
          hoursMinutes: '{hours}h {minutes}m',
          minutes: '{minutes}m'
        },
        empty: {
          title: 'No Agents connected',
          description: 'Nodes will appear here after you configure the security key and start an Agent.',
          add: 'Add Agent'
        },
        details: {
          title: 'Agent details',
          description: 'Node identity, system, and connection information.',
          hostname: 'Hostname',
          version: 'Version',
          capabilities: 'Capabilities'
        },
        runtime: {
          title: 'Remote runtime configuration',
          description: 'Save this Agent\'s DST paths and compatible runtime. Remote room, log, and backup operations are not available yet.',
          scope: 'Scope: this Agent only',
          displayName: 'Display name',
          serverMode: 'Server mode',
          mode64: '64-bit',
          mode32: '32-bit',
          savePath: 'DST archive path',
          serverPath: 'DST server path',
          backupPath: 'Backup path',
          advanced: 'Mods and compatible runtime',
          ugcPath: 'UGC path',
          steamcmdPath: 'SteamCMD path',
          workshopPath: 'Workshop content path',
          luaCommand: 'Lua command',
          luaFallbackPath: 'Lua fallback path',
          removeConfig: 'Remove configuration',
          saveConfig: 'Save configuration'
        },
        validation: {
          displayName: 'Enter a display name',
          savePath: 'Enter the remote archive path',
          serverPath: 'Enter the remote server path',
          required: 'Complete the required runtime fields'
        },
        feedback: {
          loadFailedTitle: 'Failed to load Agents',
          loadFailed: 'Unable to load the Agent list',
          runtimeLoadFailedTitle: 'Failed to load remote runtime configuration',
          runtimeLoadFailed: 'Unable to load remote runtime configuration',
          runtimeSaved: 'Remote paths saved. Remote domain operations are not available yet.',
          runtimeSavedRefreshFailed: 'Remote paths were saved, but the configuration status could not be refreshed.',
          runtimeSaveFailed: 'Failed to save remote runtime configuration: {error}',
          runtimeRemoveConfirm: 'Remove the remote runtime configuration for “{name}”?',
          runtimeRemoveTitle: 'Remove runtime configuration',
          runtimeRemoved: 'Remote runtime configuration removed',
          runtimeRemovedRefreshFailed: 'Remote runtime configuration was removed, but the configuration status could not be refreshed.',
          runtimeRemoveFailed: 'Failed to remove remote runtime configuration: {error}',
          agentRemoveConfirm: 'Remove the saved record for offline Agent “{name}”?',
          agentRemoveTitle: 'Remove Agent',
          agentRemoved: 'Agent record removed',
          agentRemoveFailed: 'Failed to remove Agent: {error}',
          errorWithDetail: '{message}: {detail}'
        }
      }
    }
  }
}

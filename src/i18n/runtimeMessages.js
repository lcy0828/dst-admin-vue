const catalog = {
  'zh-CN': {
    runtime: {
      title: '数据采集 Runtime',
      description: '管理 customcommands.lua 中由系统维护的采集模块。玩家列表、世界状态、事件与诊断依赖此模块。',
      refresh: '刷新状态',
      installAll: '安装或修复全部',
      noRooms: '没有可管理的房间',
      noRoomsDescription: '创建或接管房间后即可安装 Runtime。',
      loadFailed: 'Runtime 状态读取失败',
      partialFailed: '{count} 个房间暂时无法读取 Runtime 状态。',
      columns: { room: '房间', world: '世界', install: '安装状态', health: '运行状态', version: '版本', actions: '操作' },
      installStates: { missing: '未安装', installed: '已安装', outdated: '需要升级', invalid: '需要修复', unknown: '未知' },
      healthStates: { ready: '运行正常', starting: '正在启动', stopped: '分片已停止', degraded: '运行异常', unavailable: '不可用', unknown: '未知' },
      actions: { install: '安装', repair: '修复', upgrade: '升级', activate: '激活', reload: '热重载' },
      messages: {
        actionSucceeded: '{action}已完成',
        actionFailed: '{action}失败：{error}',
        roomInstallSucceeded: '房间 Runtime 已安装或修复',
        roomInstallFailed: '房间 Runtime 安装失败：{error}'
      },
      diagnostics: {
        title: 'Runtime 事件与诊断',
        description: '读取 Runtime 产生的短事件记录，并按需执行诊断。',
        unavailable: '选择有效的房间和世界后可查看 Runtime 事件与诊断。',
        eventsTab: '事件',
        diagnosticsTab: '诊断',
        refreshEvents: '刷新事件',
        noEvents: '暂无 Runtime 事件',
        noEventsDescription: 'Runtime 产生事件后会显示在这里。',
        eventLoadFailed: '事件读取失败：{error}',
        columns: { sequence: '序号', kind: '类型', occurredAt: '发生时间', fields: '内容' },
        profile: '诊断类型',
        profiles: { summary: '运行概览', prefab: '实体统计', performance: '性能采样' },
        prefab: '实体 Prefab',
        prefabPlaceholder: '例如 hound',
        sampleLimit: '样本数量',
        duration: '采样秒数',
        capture: '执行诊断',
        latest: '最近诊断',
        noDiagnostic: '暂无诊断报告',
        noDiagnosticDescription: '选择诊断类型并执行后，结果会显示在这里。',
        diagnosticLoadFailed: '最近诊断暂不可用：{error}',
        captureSucceeded: '诊断执行完成',
        captureFailed: '诊断执行失败：{error}',
        result: '诊断结果',
        completedAt: '完成时间',
        code: '结果代码'
      }
    }
  },
  'en-US': {
    runtime: {
      title: 'Telemetry Runtime',
      description: 'Manage the system-owned modules in customcommands.lua. Player data, world state, events, and diagnostics depend on this runtime.',
      refresh: 'Refresh Status',
      installAll: 'Install or Repair All',
      noRooms: 'No managed rooms',
      noRoomsDescription: 'Create or adopt a room to install the runtime.',
      loadFailed: 'Failed to load runtime status',
      partialFailed: 'Runtime status is unavailable for {count} room(s).',
      columns: { room: 'Room', world: 'World', install: 'Installation', health: 'Health', version: 'Version', actions: 'Actions' },
      installStates: { missing: 'Missing', installed: 'Installed', outdated: 'Upgrade needed', invalid: 'Repair needed', unknown: 'Unknown' },
      healthStates: { ready: 'Ready', starting: 'Starting', stopped: 'Shard stopped', degraded: 'Degraded', unavailable: 'Unavailable', unknown: 'Unknown' },
      actions: { install: 'Install', repair: 'Repair', upgrade: 'Upgrade', activate: 'Activate', reload: 'Hot Reload' },
      messages: {
        actionSucceeded: '{action} completed',
        actionFailed: '{action} failed: {error}',
        roomInstallSucceeded: 'Room runtime installed or repaired',
        roomInstallFailed: 'Room runtime installation failed: {error}'
      },
      diagnostics: {
        title: 'Runtime Events and Diagnostics',
        description: 'Read compact runtime events and run diagnostics on demand.',
        unavailable: 'Select a valid room and world to inspect runtime events and diagnostics.',
        eventsTab: 'Events',
        diagnosticsTab: 'Diagnostics',
        refreshEvents: 'Refresh Events',
        noEvents: 'No runtime events',
        noEventsDescription: 'Events produced by the runtime will appear here.',
        eventLoadFailed: 'Failed to load events: {error}',
        columns: { sequence: 'Sequence', kind: 'Kind', occurredAt: 'Occurred At', fields: 'Fields' },
        profile: 'Diagnostic profile',
        profiles: { summary: 'Runtime Summary', prefab: 'Prefab Count', performance: 'Performance Sample' },
        prefab: 'Prefab',
        prefabPlaceholder: 'For example, hound',
        sampleLimit: 'Sample limit',
        duration: 'Duration in seconds',
        capture: 'Run Diagnostic',
        latest: 'Latest Diagnostic',
        noDiagnostic: 'No diagnostic report',
        noDiagnosticDescription: 'Choose a profile and run it to see the report.',
        diagnosticLoadFailed: 'Latest diagnostic is unavailable: {error}',
        captureSucceeded: 'Diagnostic completed',
        captureFailed: 'Diagnostic failed: {error}',
        result: 'Result',
        completedAt: 'Completed At',
        code: 'Result Code'
      }
    }
  }
}

export const runtimeMessages = catalog

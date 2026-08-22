const JOB_KIND_KEYS = Object.freeze({
  'agent.command': 'agentCommand',
  'agent.inventory': 'agentInventory',
  'automation.run': 'automationRun',
  'backup.create': 'backupCreate',
  'backup.prune': 'backupPrune',
  'backup.restore': 'backupRestore',
  'backup.snapshot': 'backupSnapshot',
  'backup-set.create': 'backupSetCreate',
  'backup-set.recover': 'backupSetRecover',
  'backup-set.restore': 'backupSetRestore',
  'game-notification.send': 'gameNotificationSend',
  'game.release': 'gameUpdate',
  'game.release.retry': 'gameUpdateRetry',
  'game.update': 'gameUpdate',
  'log.structured.refresh': 'structuredLogRefresh',
  'map.generate': 'mapGenerate',
  'mod.install': 'modInstall',
  'mod.publication': 'modSync',
  'mod.publication.activation': 'modActivate',
  'mod.publication.retry': 'modSyncRetry',
  'placement.migrate': 'placementMigrate',
  'player.refresh': 'playerRefresh',
  'room.provision': 'roomProvision',
  'room.provision.recover': 'roomProvisionRecover',
  'room.restart': 'roomRestart',
  'room.start': 'roomStart',
  'room.stop': 'roomStop',
  'rooms.restart': 'roomsRestart',
  'rooms.start': 'roomsStart',
  'rooms.stop': 'roomsStop',
  'save-import.analyze': 'saveImportAnalyze',
  'save-import.apply': 'saveImportApply',
  'world.state.refresh': 'worldStateRefresh'
})

export const globalJobMessages = Object.freeze({
  'zh-CN': {
    globalJobs: {
      title: '后台任务',
      descriptionLive: '任务状态正在实时更新',
      descriptionConnecting: '正在重新连接任务状态',
      trigger: {
        active: '{count} 个任务执行中',
        failed: '{count} 个任务需要处理',
        summary: '{active} 个任务执行中，{failed} 个任务失败',
        unavailable: '任务状态暂时不可用'
      },
      sections: {
        active: '正在执行',
        failed: '需要处理'
      },
      status: {
        queued: '等待执行',
        running: '执行中',
        failed: '执行失败'
      },
      progress: '{value}%',
      remaining: '另有 {count} 个任务',
      clearFailures: '清除失败提醒',
      dismissFailure: '忽略此失败提醒',
      loadFailed: '无法读取后台任务：{detail}',
      unknownFailure: '任务执行失败',
      targets: '目标：{value}',
      kinds: {
        agentCommand: '执行节点命令',
        agentInventory: '读取节点资源',
        automationRun: '执行自动化任务',
        backupCreate: '创建存档备份',
        backupPrune: '清理旧备份',
        backupRestore: '恢复存档备份',
        backupSnapshot: '创建定时存档备份',
        backupSetCreate: '创建跨节点备份',
        backupSetRecover: '修复跨节点备份',
        backupSetRestore: '恢复跨节点备份',
        gameNotificationSend: '发送游戏通知',
        gameUpdate: '更新游戏服务端',
        gameUpdateRetry: '重试游戏服务端更新',
        structuredLogRefresh: '刷新结构化日志',
        mapGenerate: '生成世界地图',
        modInstall: '下载模组',
        modSync: '同步房间模组',
        modActivate: '应用房间模组',
        modSyncRetry: '重试同步房间模组',
        placementMigrate: '迁移世界运行位置',
        playerRefresh: '刷新玩家状态',
        roomProvision: '投放房间',
        roomProvisionRecover: '修复房间投放',
        roomRestart: '重启房间',
        roomStart: '启动房间',
        roomStop: '停止房间',
        roomsRestart: '重启多个房间',
        roomsStart: '启动多个房间',
        roomsStop: '停止多个房间',
        saveImportAnalyze: '检查导入存档',
        saveImportApply: '导入存档',
        worldStateRefresh: '刷新世界状态'
      }
    }
  },
  'en-US': {
    globalJobs: {
      title: 'Background tasks',
      descriptionLive: 'Task status is updating in real time',
      descriptionConnecting: 'Reconnecting to task updates',
      trigger: {
        active: '{count} tasks in progress',
        failed: '{count} tasks need attention',
        summary: '{active} tasks in progress, {failed} failed',
        unavailable: 'Task status is temporarily unavailable'
      },
      sections: {
        active: 'In progress',
        failed: 'Needs attention'
      },
      status: {
        queued: 'Queued',
        running: 'Running',
        failed: 'Failed'
      },
      progress: '{value}%',
      remaining: '{count} more tasks',
      clearFailures: 'Clear failure alerts',
      dismissFailure: 'Dismiss this failure alert',
      loadFailed: 'Unable to load background tasks: {detail}',
      unknownFailure: 'The task failed',
      targets: 'Targets: {value}',
      kinds: {
        agentCommand: 'Run node command',
        agentInventory: 'Read node resources',
        automationRun: 'Run automation',
        backupCreate: 'Create save backup',
        backupPrune: 'Prune old backups',
        backupRestore: 'Restore save backup',
        backupSnapshot: 'Create scheduled save backup',
        backupSetCreate: 'Create multi-node backup',
        backupSetRecover: 'Repair multi-node backup',
        backupSetRestore: 'Restore multi-node backup',
        gameNotificationSend: 'Send in-game notification',
        gameUpdate: 'Update game server',
        gameUpdateRetry: 'Retry game server update',
        structuredLogRefresh: 'Refresh structured logs',
        mapGenerate: 'Generate world map',
        modInstall: 'Download mod',
        modSync: 'Sync room mods',
        modActivate: 'Apply room mods',
        modSyncRetry: 'Retry room mod sync',
        placementMigrate: 'Move world runtime',
        playerRefresh: 'Refresh players',
        roomProvision: 'Provision room',
        roomProvisionRecover: 'Repair room provisioning',
        roomRestart: 'Restart room',
        roomStart: 'Start room',
        roomStop: 'Stop room',
        roomsRestart: 'Restart rooms',
        roomsStart: 'Start rooms',
        roomsStop: 'Stop rooms',
        saveImportAnalyze: 'Inspect imported save',
        saveImportApply: 'Import save',
        worldStateRefresh: 'Refresh world state'
      }
    }
  }
})

export function globalJobKindLabel(kind, translate) {
  const key = JOB_KIND_KEYS[kind]
  return key ? translate(`globalJobs.kinds.${key}`) : kind || translate('globalJobs.title')
}

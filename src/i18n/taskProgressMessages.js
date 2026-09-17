export const taskProgressMessages = {
  'zh-CN': {
    taskProgress: {
      title: '更新并重启', room: '房间 {name}',
      unconfirmed: '启动结果待确认',
      worlds: {
        title: '世界启动进度', master: '主分片', readyCount: '已就绪 {ready} / {total} 个世界',
        overall: '阶段进度 {value}%', estimate: '约 {value}%', progress: '{name} 启动进度',
        estimateHint: '进度按游戏日志阶段估算，不代表剩余时间；出现就绪标记后才显示完成。',
        legacyHint: '此任务未记录各世界的启动阶段，可查看世界日志了解当前状态。',
        downloadRecords: '下载记录', started: '{count} 个世界已启动', restarted: '{count} 个世界已重启', estimateLabel: '进度如何计算',
        stages: { queued: '等待执行', stopping: '正在停止旧进程', stopped: '已停止，等待启动', starting: '正在启动，等待游戏日志', initializing: '正在初始化游戏', loading_mods: '正在加载模组', generating_world: '正在生成世界', loading_world: '正在加载世界存档', connecting: '正在连接分片', ready: '世界已就绪', failed: '启动未完成', canceled: '操作已取消', unconfirmed: '启动结果待确认', notStarted: '未执行启动', disconnected: '连接中断，等待恢复' }
      },
      downloads: '文件下载', completedCount: '已完成 {completed} / {total} 个模组', modsCompleted: '{count} 个模组处理完成', failedCount: '{count} 个失败',
      itemStates: { queued: '等待下载', downloading: '正在下载', succeeded: '下载完成', failed: '下载失败', notStarted: '未执行', unconfirmed: '结果待确认', unknown: '暂无记录', disconnected: '连接中断' },
      counts: { downloading: '下载中 {count} 个', queued: '等待 {count} 个', notStarted: '未执行 {count} 个', unconfirmed: '结果待确认 {count} 个', disconnected: '等待恢复 {count} 个' },
      downloaded: '已下载', locateCurrent: '定位当前下载', locateFailed: '定位失败项', listHint: '按下载顺序排列，可滚动查看',
      errorDetails: '查看错误详情', itemError: '查看 {name} 在 {machine} 的错误详情',
      issues: { io: 'SteamCMD 报告 I/O 错误，可检查网络、磁盘空间和下载目录权限。', timeout: '下载超时，请检查这台机器连接 Steam 的网络。', diskFull: '磁盘空间不足，清理下载所在磁盘后再试。', permission: '下载目录无法访问，请检查这台机器上的目录权限。', unknown: '下载未完成，可展开详情查看原始错误。' },
      itemProgress: '{name} 的下载进度', machine: '运行机器', noBytes: '正在连接 Steam / 获取文件大小', confirmingDownload: '正在完成下载',
      downloadFailure: '部分模组下载失败，已完成的结果保留在列表中。展开详情查看原因。',
      technicalDetails: '技术详情', oldTask: '此任务未记录逐个模组的下载结果',
      applying: '应用文件', applyHint: '完成后会显示结果，不会重启世界', close: '关闭此任务展示', batch: '模组 {current}/{total}', taskCount: '{count} 个任务', switchTask: '切换查看任务',
      queued: '等待执行', starting: '启动世界', checking: '检查更新', downloading: '下载模组',
      waiting: '等待重启条件', restarting: '重启世界', succeeded: '任务已完成',
      failed: '任务失败', canceled: '任务已取消',
      elapsed: '已用时 {time}', duration: '耗时 {time}',
      details: '展开详情', collapse: '收起详情', minimize: '收起为悬浮进度圈', minimizeShort: '收起', restore: '点击展开任务详情',
      bubble: { queued: '等待', starting: '启动', checking: '检查', downloading: '下载', applying: '应用', waiting: '等待', restarting: '重启', succeeded: '完成', failed: '失败', canceled: '取消', reconnecting: '重连', warning: '注意', unconfirmed: '待确认' },
      more: '另有 {count} 个任务', tasks: '查看任务',
      downloadPercent: '当前下载 {value}%', downloadBytes: '已下载 {value}',
      reconnecting: '正在重新连接，进度恢复后会继续更新',
      failureSummary: '操作未完成，展开详情查看原因',
      working: '正在执行，请稍候', taskId: '任务 ID',
      progressLabel: '任务进度', stagesLabel: '执行阶段',
      downloadDone: '下载完成后继续重启原本运行的世界',
      restartHint: '正在等待世界启动结果', finishedHint: '可收起为悬浮圈，点击圆圈即可重新展开'
    }
  },
  'en-US': {
    taskProgress: {
      title: 'Update and restart', room: 'Room {name}',
      unconfirmed: 'Startup unconfirmed',
      worlds: {
        title: 'World startup progress', master: 'Master shard', readyCount: '{ready} / {total} worlds ready',
        overall: 'Stage progress {value}%', estimate: '≈ {value}%', progress: 'Startup progress for {name}',
        estimateHint: 'Estimated from game log stages, not remaining time. Completion requires a readiness signal.',
        legacyHint: 'This task did not record individual startup stages. Check world logs for the current state.',
        downloadRecords: 'Download records', started: '{count} worlds started', restarted: '{count} worlds restarted', estimateLabel: 'How progress is calculated',
        stages: { queued: 'Waiting to execute', stopping: 'Stopping old process', stopped: 'Stopped, waiting to start', starting: 'Starting, waiting for game logs', initializing: 'Initializing game', loading_mods: 'Loading Mods', generating_world: 'Generating world', loading_world: 'Loading world save', connecting: 'Connecting shards', ready: 'World ready', failed: 'Startup incomplete', canceled: 'Operation canceled', unconfirmed: 'Startup unconfirmed', notStarted: 'Not started', disconnected: 'Disconnected, waiting to reconnect' }
      },
      downloads: 'File downloads', completedCount: '{completed} of {total} Mods completed', modsCompleted: '{count} Mods completed', failedCount: '{count} failed',
      itemStates: { queued: 'Queued', downloading: 'Downloading', succeeded: 'Downloaded', failed: 'Download failed', notStarted: 'Not started', unconfirmed: 'Result unconfirmed', unknown: 'No record', disconnected: 'Disconnected' },
      counts: { downloading: '{count} downloading', queued: '{count} queued', notStarted: '{count} not started', unconfirmed: '{count} unconfirmed', disconnected: '{count} awaiting connection' },
      downloaded: 'Loaded', locateCurrent: 'Find current download', locateFailed: 'Find failed download', listHint: 'In download order. Scroll to view all.',
      errorDetails: 'View error details', itemError: 'View error details for {name} on {machine}',
      issues: { io: 'SteamCMD reported an I/O error. Check the network, disk space and download directory permissions.', timeout: 'The download timed out. Check this machine’s connection to Steam.', diskFull: 'The disk is full. Free space on the download disk and try again.', permission: 'The download directory could not be accessed. Check its permissions on this machine.', unknown: 'The download did not complete. Open details to see the original error.' },
      itemProgress: 'Download progress for {name}', machine: 'Runtime machine', noBytes: 'Connecting to Steam / obtaining file size', confirmingDownload: 'Finishing download',
      downloadFailure: 'Some Mod downloads failed. Completed results are retained in the list. Open details for the cause.',
      technicalDetails: 'Technical details', oldTask: 'This task did not record per-Mod download results',
      applying: 'Apply files', applyHint: 'Results will appear here. Worlds will not restart.', close: 'Close this task display', batch: 'Mod {current}/{total}', taskCount: '{count} tasks', switchTask: 'Choose a task',
      queued: 'Queued', starting: 'Start worlds', checking: 'Check for updates', downloading: 'Download mods',
      waiting: 'Waiting to restart', restarting: 'Restart worlds', succeeded: 'Task completed',
      failed: 'Task failed', canceled: 'Task canceled',
      elapsed: 'Elapsed {time}', duration: 'Took {time}',
      details: 'Show details', collapse: 'Hide details', minimize: 'Minimize to floating progress ring', minimizeShort: 'Minimize', restore: 'Open task details',
      bubble: { queued: 'Queued', starting: 'Start', checking: 'Check', downloading: 'Load', applying: 'Apply', waiting: 'Wait', restarting: 'Restart', succeeded: 'Done', failed: 'Failed', canceled: 'Canceled', reconnecting: 'Offline', warning: 'Notice', unconfirmed: 'Check' },
      more: '{count} other tasks', tasks: 'View tasks',
      downloadPercent: 'Current download {value}%', downloadBytes: '{value} downloaded',
      reconnecting: 'Reconnecting. Progress will resume when the connection returns.',
      failureSummary: 'The operation did not complete. Open details for the reason.',
      working: 'Working, please wait', taskId: 'Task ID',
      progressLabel: 'Task progress', stagesLabel: 'Task stages',
      downloadDone: 'Running worlds will restart after the download finishes',
      restartHint: 'Waiting for world startup results', finishedHint: 'Minimize to the floating ring and click it to reopen'
    }
  }
}

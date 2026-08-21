export const gameReleaseMessages = {
  'zh-CN': {
    gameReleases: {
      title: '游戏服务端更新',
      subtitle: '在控制面统一检查并更新本机与远程节点上的 DST 专用服务器。',
      actions: {
        open: '管理游戏更新', refresh: '刷新更新记录', preview: '检查更新范围', previewing: '正在检查',
        publish: '备份并开始更新', retry: '重试失败更新', view: '查看详情'
      },
      notice: {
        title: '更新期间会自动保护并恢复房间',
        description: '系统会先备份受影响的房间并安全停止世界，更新和校验 Steam build 后，再恢复更新前正在运行的世界。多节点房间会自动按正确顺序处理。'
      },
      form: {
        title: '更新选项', description: '先检查本次更新影响的节点、房间和世界；检查结果变化后需要重新确认。',
        desiredVersion: '目标 Steam build', desiredPlaceholder: '留空使用 Steam 最新 build',
        desiredDescription: '手动填写时只能使用当前 Steam 最新 build，不能发布未经验证的任意版本。',
        cleanCache: '更新前清理 SteamCMD 下载缓存', cleanCacheDescription: '磁盘空间紧张或缓存损坏时启用；会增加下载时间。',
        restartRunning: '更新后恢复原先运行的分片', restartRunningDescription: '只恢复发布前正在运行或启动中的分片。',
        loadConfirmation: '启动确认', loadLogs: '检查新日志', loadNone: '仅确认进程',
        loadDescriptions: { logs: '读取本次启动后的新日志，逐分片确认世界加载。', none: '只恢复进程，不把日志加载标记作为成功条件。' },
        timeout: '单阶段超时（秒）', timeoutDescription: '允许 30 至 900 秒，默认 300 秒。'
      },
      plan: {
        title: '更新范围', description: '{installations} 个安装目标，影响 {rooms} 个房间。',
        ready: '可以更新', blocked: '更新受阻', upToDate: '全部已是最新版本', updateRequired: '需要更新',
        topology: '拓扑版本', planHash: '计划哈希', targetVersion: '目标 build',
        blockerTitle: '更新检查未通过', blockerDescription: '处理以下问题后重新检查更新范围。',
        noUpdateTitle: '所有安装目标均为最新版本', noUpdateDescription: '不需要执行停服、备份或更新。'
      },
      columns: {
        target: '运行目标', installation: '安装实例', versions: '当前 → 目标', disk: '可用 / 要求',
        shards: '运行分片', status: '状态', release: '发布', createdAt: '创建时间', rooms: '房间 / 世界',
        stage: '阶段', beforeAfter: '更新前 → 更新后', evidence: '加载证据', updatedAt: '更新时间'
      },
      values: {
        local: '本机', online: '在线', offline: '离线', ready: '待更新', blocked: '阻断', upToDate: '已是最新',
        runningShards: '{running} / {total} 运行', master: 'Master', secondary: 'Secondary', noEvidence: '暂无证据'
      },
      stages: {
        previewed: '已生成计划', protecting: '保护备份', stopping: '停止分片', staged: '准备更新', updating: '更新安装',
        verified: '版本已校验', restarting: '恢复分片', confirming: '确认世界加载', succeeded: '发布成功',
        failed: '发布失败', recovery_required: '需要人工恢复', unknown: '未知阶段'
      },
      blockers: {
        targetOffline: '目标节点离线', inventoryStale: '节点运行清单缺失或过期', capabilityMissing: '节点不支持版本发布协议',
        installationIdentityInvalid: '安装实例标识无效', installationMissing: '未发现 DST 专用服务器安装',
        steamcmdUnavailable: 'SteamCMD 不可用', updateUnsupported: '该安装方式不支持面板更新', diskInsufficient: '磁盘可用空间不足',
        versionObserveFailed: '读取安装版本失败', shardInventoryMissing: '运行清单中未发现分片', shardStatusFailed: '读取分片状态失败', unknown: '未知阻断项'
      },
      job: {
        title: '更新任务', queued: '等待执行', running: '正在执行', succeeded: '任务完成', failed: '任务失败', canceled: '任务已取消', unknown: '未知任务状态'
      },
      history: {
        title: '更新记录', description: '保留每次检查、保护备份、安装结果和世界恢复状态。',
        loading: '正在读取更新记录', emptyTitle: '还没有游戏更新记录', emptyDescription: '执行第一次游戏服务端更新后，记录会显示在这里。'
      },
      details: {
        title: '更新详情', description: '更新任务 {id} 的真实执行阶段与逐目标结果。', backups: '保护备份',
        installationResults: '安装结果', shardResults: '分片恢复与加载确认', noSelection: '选择一条发布记录查看完整证据。'
      },
      confirm: {
        title: '确认备份并更新', description: '确认后将保护受影响的房间，创建备份并停止正在运行的世界。',
        warningTitle: '更新期间房间会暂时停止', warningDescription: '本次更新会影响 {rooms} 个房间和 {shards} 个分片。失败时系统会保留恢复状态和完整记录。',
        submit: '创建备份并更新'
      },
      feedback: {
        historyFailed: '读取更新记录失败：{error}', previewReady: '更新范围已检查', previewFailed: '检查更新范围失败：{error}',
        submitted: '游戏更新任务已提交', submitFailed: '提交游戏更新失败：{error}', retrySubmitted: '重试任务已提交',
        retryFailed: '提交重试失败：{error}', detailsFailed: '读取更新详情失败：{error}', taskFailed: '更新任务失败：{error}',
        invalidJobResponse: '后端未返回可跟踪的更新任务', completionUnconfirmed: '更新任务已结束，但连续多次未能读取对应记录；请刷新更新历史并核对恢复状态'
      }
    }
  },
  'en-US': {
    gameReleases: {
      title: 'Game server updates',
      subtitle: 'Inspect and update DST dedicated-server installations across local and remote targets from the control plane.',
      actions: {
        open: 'Manage game updates', refresh: 'Refresh update history', preview: 'Check update scope', previewing: 'Checking',
        publish: 'Back up and update', retry: 'Retry failed update', view: 'View details'
      },
      notice: {
        title: 'Rooms are protected and restored automatically',
        description: 'The system backs up affected rooms, safely stops worlds, updates and verifies each Steam build, then restores the worlds that were running before the update. Multi-node rooms are handled in the correct order.'
      },
      form: {
        title: 'Update options', description: 'Check affected nodes, rooms, and worlds first. Changes to the result require a new confirmation.',
        desiredVersion: 'Desired Steam build', desiredPlaceholder: 'Leave empty for the latest Steam build',
        desiredDescription: 'A manual value must still match the current latest Steam build. Arbitrary unverified versions are rejected.',
        cleanCache: 'Clear SteamCMD download cache first', cleanCacheDescription: 'Use for low disk space or a damaged cache. It increases download time.',
        restartRunning: 'Restore previously running shards', restartRunningDescription: 'Only shards that were running or starting before the release are restored.',
        loadConfirmation: 'Startup confirmation', loadLogs: 'Inspect fresh logs', loadNone: 'Process only',
        loadDescriptions: { logs: 'Read logs created after this start and confirm world loading per shard.', none: 'Restore processes without requiring a load marker in logs.' },
        timeout: 'Per-stage timeout (seconds)', timeoutDescription: 'Allowed range: 30 to 900 seconds. Default: 300.'
      },
      plan: {
        title: 'Update scope', description: '{installations} installations across {rooms} rooms.',
        ready: 'Ready to update', blocked: 'Update blocked', upToDate: 'Everything is current', updateRequired: 'Update required',
        topology: 'Topology revision', planHash: 'Plan hash', targetVersion: 'Desired build',
        blockerTitle: 'Release preflight failed', blockerDescription: 'Resolve these blockers and build a new plan.',
        noUpdateTitle: 'Every installation is current', noUpdateDescription: 'No stop, backup, or update operation is required.'
      },
      columns: {
        target: 'Runtime target', installation: 'Installation', versions: 'Current → desired', disk: 'Available / required',
        shards: 'Running shards', status: 'Status', release: 'Release', createdAt: 'Created', rooms: 'Room / world',
        stage: 'Stage', beforeAfter: 'Before → after', evidence: 'Load evidence', updatedAt: 'Updated'
      },
      values: {
        local: 'Local', online: 'Online', offline: 'Offline', ready: 'Pending update', blocked: 'Blocked', upToDate: 'Current',
        runningShards: '{running} / {total} running', master: 'Master', secondary: 'Secondary', noEvidence: 'No evidence'
      },
      stages: {
        previewed: 'Plan ready', protecting: 'Protection backups', stopping: 'Stopping shards', staged: 'Update staged', updating: 'Updating installation',
        verified: 'Version verified', restarting: 'Restoring shards', confirming: 'Confirming world load', succeeded: 'Release succeeded',
        failed: 'Release failed', recovery_required: 'Manual recovery required', unknown: 'Unknown stage'
      },
      blockers: {
        targetOffline: 'Target is offline', inventoryStale: 'Runtime inventory is missing or stale', capabilityMissing: 'Target lacks the release protocol',
        installationIdentityInvalid: 'Installation identity is invalid', installationMissing: 'DST dedicated-server installation not found',
        steamcmdUnavailable: 'SteamCMD is unavailable', updateUnsupported: 'This installation cannot be updated by the panel', diskInsufficient: 'Insufficient free disk space',
        versionObserveFailed: 'Failed to observe the installed version', shardInventoryMissing: 'Shard missing from runtime inventory', shardStatusFailed: 'Failed to read shard state', unknown: 'Unknown blocker'
      },
      job: {
        title: 'Release job', queued: 'Queued', running: 'Running', succeeded: 'Job completed', failed: 'Job failed', canceled: 'Job canceled', unknown: 'Unknown job status'
      },
      history: {
        title: 'Release history', description: 'Every plan, protection backup, installation result, and shard load marker remains auditable.',
        loading: 'Loading release history', emptyTitle: 'No game release yet', emptyDescription: 'Execution history appears here after the first plan is confirmed.'
      },
      details: {
        title: 'Release details', description: 'Real execution stages and per-target results for release {id}.', backups: 'Protection backups',
        installationResults: 'Installation results', shardResults: 'Shard restore and load confirmation', noSelection: 'Select a release to inspect its complete evidence.'
      },
      confirm: {
        title: 'Confirm interruption and release', description: 'This locks affected rooms, creates protection backups, and stops currently running shards.',
        warningTitle: 'This is a cross-node stop operation', warningDescription: 'The release affects {rooms} rooms and {shards} shards. Failures retain recovery and audit state and are never reported as partial success.',
        submit: 'Protect and publish'
      },
      feedback: {
        historyFailed: 'Failed to load release history: {error}', previewReady: 'Release plan created', previewFailed: 'Failed to build release plan: {error}',
        submitted: 'Game release job submitted', submitFailed: 'Failed to submit game release: {error}', retrySubmitted: 'Retry job submitted',
        retryFailed: 'Failed to submit retry: {error}', detailsFailed: 'Failed to load release details: {error}', taskFailed: 'Release job failed: {error}',
        invalidJobResponse: 'The backend did not return a trackable release job', completionUnconfirmed: 'The release job ended, but its release record could not be read after repeated attempts. Refresh release history and verify recovery state.'
      }
    }
  }
}

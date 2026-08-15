export const gameReleaseMessages = {
  'zh-CN': {
    gameReleases: {
      title: '游戏版本发布',
      subtitle: '在控制面统一检查并更新本机与远程节点上的 DST 专用服务器。',
      actions: {
        open: '管理版本发布', refresh: '刷新发布记录', preview: '生成发布计划', previewing: '正在检查',
        publish: '确认并开始发布', retry: '重试失败发布', view: '查看详情'
      },
      notice: {
        title: '发布按整个运行拓扑执行',
        description: '系统先创建每个受影响房间的保护备份，再按 Secondary → Master 停止分片，逐节点更新并精确校验 Steam build，最后按 Master → Secondary 恢复原运行状态。'
      },
      form: {
        title: '发布策略', description: '先生成只读计划；计划哈希、拓扑或目标版本变化后必须重新确认。',
        desiredVersion: '目标 Steam build', desiredPlaceholder: '留空使用 Steam 最新 build',
        desiredDescription: '手动填写时只能使用当前 Steam 最新 build，不能发布未经验证的任意版本。',
        cleanCache: '更新前清理 SteamCMD 下载缓存', cleanCacheDescription: '磁盘空间紧张或缓存损坏时启用；会增加下载时间。',
        restartRunning: '更新后恢复原先运行的分片', restartRunningDescription: '只恢复发布前正在运行或启动中的分片。',
        loadConfirmation: '启动确认', loadLogs: '检查新日志', loadNone: '仅确认进程',
        loadDescriptions: { logs: '读取本次启动后的新日志，逐分片确认世界加载。', none: '只恢复进程，不把日志加载标记作为成功条件。' },
        timeout: '单阶段超时（秒）', timeoutDescription: '允许 30 至 900 秒，默认 300 秒。'
      },
      plan: {
        title: '版本矩阵', description: '{installations} 个安装目标，影响 {rooms} 个房间。',
        ready: '可以发布', blocked: '发布受阻', upToDate: '全部已是最新版本', updateRequired: '需要更新',
        topology: '拓扑版本', planHash: '计划哈希', targetVersion: '目标 build',
        blockerTitle: '发布预检未通过', blockerDescription: '处理以下阻断项后重新生成计划。',
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
        title: '发布任务', queued: '等待执行', running: '正在执行', succeeded: '任务完成', failed: '任务失败', canceled: '任务已取消', unknown: '未知任务状态'
      },
      history: {
        title: '发布记录', description: '保留每次计划、保护备份、安装结果和分片加载证据。',
        loading: '正在读取发布记录', emptyTitle: '还没有版本发布记录', emptyDescription: '生成并确认第一份发布计划后，执行记录会显示在这里。'
      },
      details: {
        title: '发布详情', description: '发布 {id} 的真实执行阶段与逐目标结果。', backups: '保护备份',
        installationResults: '安装结果', shardResults: '分片恢复与加载确认', noSelection: '选择一条发布记录查看完整证据。'
      },
      confirm: {
        title: '确认中断并发布', description: '确认后将锁定受影响房间，创建保护备份并停止正在运行的分片。',
        warningTitle: '这是跨节点停服操作', warningDescription: '发布会影响 {rooms} 个房间和 {shards} 个分片。失败时系统保留恢复状态和审计记录，不会把部分成功伪装成完成。',
        submit: '创建保护备份并发布'
      },
      feedback: {
        historyFailed: '读取发布记录失败：{error}', previewReady: '发布计划已生成', previewFailed: '生成发布计划失败：{error}',
        submitted: '版本发布任务已提交', submitFailed: '提交版本发布失败：{error}', retrySubmitted: '重试任务已提交',
        retryFailed: '提交重试失败：{error}', detailsFailed: '读取发布详情失败：{error}', taskFailed: '发布任务失败：{error}',
        invalidJobResponse: '后端未返回可跟踪的发布任务', completionUnconfirmed: '发布任务已结束，但连续多次未能读取对应发布记录；请刷新发布历史并核对恢复状态'
      }
    }
  },
  'en-US': {
    gameReleases: {
      title: 'Game releases',
      subtitle: 'Inspect and update DST dedicated-server installations across local and remote targets from the control plane.',
      actions: {
        open: 'Manage releases', refresh: 'Refresh releases', preview: 'Build release plan', previewing: 'Checking',
        publish: 'Confirm and publish', retry: 'Retry failed release', view: 'View details'
      },
      notice: {
        title: 'A release covers the complete runtime topology',
        description: 'The system creates protection backups, stops Secondary shards before Master, updates and verifies every Steam build, then restores Master before Secondary to the previous runtime state.'
      },
      form: {
        title: 'Release policy', description: 'Build a read-only plan first. A changed plan hash, topology, or desired version requires a new confirmation.',
        desiredVersion: 'Desired Steam build', desiredPlaceholder: 'Leave empty for the latest Steam build',
        desiredDescription: 'A manual value must still match the current latest Steam build. Arbitrary unverified versions are rejected.',
        cleanCache: 'Clear SteamCMD download cache first', cleanCacheDescription: 'Use for low disk space or a damaged cache. It increases download time.',
        restartRunning: 'Restore previously running shards', restartRunningDescription: 'Only shards that were running or starting before the release are restored.',
        loadConfirmation: 'Startup confirmation', loadLogs: 'Inspect fresh logs', loadNone: 'Process only',
        loadDescriptions: { logs: 'Read logs created after this start and confirm world loading per shard.', none: 'Restore processes without requiring a load marker in logs.' },
        timeout: 'Per-stage timeout (seconds)', timeoutDescription: 'Allowed range: 30 to 900 seconds. Default: 300.'
      },
      plan: {
        title: 'Version matrix', description: '{installations} installations across {rooms} rooms.',
        ready: 'Ready to publish', blocked: 'Release blocked', upToDate: 'Everything is current', updateRequired: 'Update required',
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

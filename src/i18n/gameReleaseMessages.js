export const gameReleaseMessages = {
  'zh-CN': {
    gameReleases: {
      title: '游戏服务端管理',
      subtitle: '查看各机器的安装状态，安装或接入已有服务端，并管理 LuaJIT 和游戏更新。',
      actions: {
        open: '管理游戏更新', refresh: '刷新更新记录', check: '检查是否有更新', checking: '正在检查',
        publish: '备份并开始更新', retry: '重试失败更新', view: '查看详情'
      },
      simple: {
        title: '游戏更新', description: '检查版本不会停服；确认更新后自动备份并恢复房间。',
        notChecked: '尚未检查版本', notCheckedDescription: '点击“检查是否有更新”后，系统会显示各主机当前游戏版本、最新官方版本和受影响的房间。',
        resultTitle: '检查结果', resultDescription: '先确认官方游戏版本和影响范围；Steam 安装信息可在技术详情中查看。',
        currentGameVersion: '当前游戏版本', latestOfficialVersion: '最新正式版本', affectedNodes: '运行节点', affectedRoomsAndWorlds: '受影响房间 / 世界',
        mixedGameVersions: '{count} 个不同游戏版本', cached: '缓存', officialVersionUnavailable: '最新官方版本暂不可用'
      },
      nodes: {
        title: '主机游戏版本', count: '{nodes} 台主机 / {installations} 个安装',
        gameVersionsTitle: '主机游戏版本', machineCount: '{count} 台主机',
        loading: '正在读取各主机版本', empty: '暂无部署了世界的运行主机', loadFailed: '主机版本读取失败',
        steamDetails: 'Steam 安装详情', steamDetailsDescription: 'AppID、平台与 Build 仅用于内部更新判断',
        channelTitle: '为什么 Build 不同', channelDescription: '当前包含多个版本通道：{channels}。不同系统和安装类型使用不同 AppID，因此 Steam Build 数字可以不同，只能在同一 AppID 内比较。', channelSeparator: '；'
      },
      advanced: {
        title: '高级选项', description: '通常保持默认即可，仅在缓存损坏或需要调整启动校验时修改。'
      },
      technical: {
        title: '技术详情', description: '查看平台、AppID、Steam Build、安装方式、磁盘空间和计划标识。'
      },
      notice: {
        title: '更新期间会自动保护并恢复房间',
        description: '系统会先备份受影响的房间并安全停止世界，更新和校验 Steam build 后，再恢复更新前正在运行的世界。多节点房间会自动按正确顺序处理。'
      },
      form: {
        title: '更新选项', description: '先检查本次更新影响的节点、房间和世界；检查结果变化后需要重新确认。',
        desiredVersion: '目标 Steam build', desiredPlaceholder: '留空使用 Steam 最新 build',
        desiredDescription: '通常留空。手动填写时也只能使用 Steam 当前最新 build。',
        cleanCache: '更新前清理 SteamCMD 下载缓存', cleanCacheDescription: '磁盘空间紧张或缓存损坏时启用；会增加下载时间。',
        restartRunning: '更新后恢复原先运行的分片', restartRunningDescription: '只恢复更新前正在运行或启动中的分片。',
        loadConfirmation: '启动确认', loadLogs: '检查新日志', loadNone: '仅确认进程',
        loadDescriptions: { logs: '读取本次启动后的新日志，逐分片确认世界加载。', none: '只恢复进程，不把日志加载标记作为成功条件。' },
        timeout: '单阶段超时（秒）', timeoutDescription: '允许 30 至 900 秒，默认 300 秒。'
      },
      plan: {
        title: '更新范围', description: '{installations} 个安装目标，影响 {rooms} 个房间。',
        ready: '可以更新', checked: '检查完成', blocked: '更新受阻', upToDate: '全部已是最新版本', updateRequired: '需要更新',
        topology: '拓扑版本', planHash: '计划哈希', targetVersion: '目标 build',
        blockerTitle: '更新检查未通过', blockerDescription: '处理以下问题后重新检查更新范围。',
        noUpdateTitle: '所有安装目标均为最新版本', noUpdateDescription: '不需要执行停服、备份或更新。',
        steamManagedDescription: '本机游戏已是最新版本。该安装由 Steam 客户端维护，面板不会修改 Steam 管理的游戏文件。'
      },
      columns: {
        target: '运行目标', installation: '安装实例', gameVersion: '游戏版本', channel: '平台 / Steam 应用', steamVersions: '当前 Build → 目标 Build', updateMethod: '更新方式', disk: '可用 / 要求',
        shards: '运行分片', status: '状态', release: '更新任务', createdAt: '创建时间', rooms: '房间 / 世界',
        stage: '阶段', beforeAfter: '更新前 → 更新后', evidence: '加载证据', updatedAt: '更新时间'
      },
      values: {
        checkFailed: '检查失败', notInstalled: '未安装', unknown: '状态待确认', testBranch: '测试分支', otherBranch: '其他分支',
        local: '本机', online: '在线', offline: '离线', ready: '待更新', blocked: '阻断', upToDate: '已是最新', steamManaged: 'Steam 已是最新',
        steamClient: 'Steam 客户端管理', steamcmd: '面板自动更新', unknownUpdateMethod: '更新方式未知',
        platforms: { macos: 'macOS', linux: 'Linux', windows: 'Windows', unknown: '未知系统' },
        applications: { gameClient: 'DST 游戏客户端', dedicatedServer: 'DST 专用服务器', unknown: '未知 Steam 应用' },
        runningShards: '{running} / {total} 运行', master: 'Master', secondary: 'Secondary', noEvidence: '暂无证据'
      },
      stages: {
        previewed: '已生成计划', protecting: '保护备份', stopping: '停止分片', staged: '准备更新', updating: '更新安装',
        verified: '版本已校验', restarting: '恢复分片', confirming: '确认世界加载', succeeded: '更新成功',
        failed: '更新失败', recovery_required: '需要人工恢复', unknown: '未知阶段'
      },
      blockers: {
        targetOffline: '目标节点离线', inventoryStale: '节点运行清单缺失或过期', capabilityMissing: '节点不支持版本更新协议',
        installationIdentityInvalid: '安装实例标识无效', installationMissing: '未发现 DST 专用服务器安装',
        steamcmdUnavailable: 'SteamCMD 不可用', steamClientUpdateRequired: '请先在 Steam 客户端中更新本机游戏', updateUnsupported: '该安装方式不支持面板更新', diskInsufficient: '磁盘可用空间不足',
        versionObserveFailed: '读取安装版本失败', versionCheckTimeout: '该主机版本检查超时', latestBuildUnavailable: '无法查询 Steam 最新 Build',
        shardInventoryMissing: '运行清单中未发现分片', shardStatusFailed: '读取分片状态失败', unknown: '未知阻断项'
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
        installationResults: '安装结果', shardResults: '分片恢复与加载确认', noSelection: '选择一条更新记录查看完整证据。'
      },
      confirm: {
        title: '确认备份并更新', description: '确认后将保护受影响的房间，创建备份并停止正在运行的世界。',
        warningTitle: '更新期间房间会暂时停止', warningDescription: '本次更新会影响 {rooms} 个房间和 {shards} 个分片。失败时系统会保留恢复状态和完整记录。',
        submit: '创建备份并更新'
      },
      feedback: {
        operationFailedTitle: '检查或更新失败',
        historyFailed: '读取更新记录失败：{error}', previewReady: '更新范围已检查', previewFailed: '检查更新范围失败：{error}',
        submitted: '游戏更新任务已提交', submitFailed: '提交游戏更新失败：{error}', retrySubmitted: '重试任务已提交',
        retryFailed: '提交重试失败：{error}', detailsFailed: '读取更新详情失败：{error}', taskFailed: '更新任务失败：{error}',
        invalidJobResponse: '后端未返回可跟踪的更新任务', completionUnconfirmed: '更新任务已结束，但连续多次未能读取对应记录；请刷新更新历史并核对恢复状态',
        officialVersionUnavailable: '无法读取最新官方游戏版本'
      }
    }
  },
  'en-US': {
    gameReleases: {
      title: 'Game server management',
      subtitle: 'Inspect installations on each host, install or connect an existing server, and manage LuaJIT and game updates.',
      actions: {
        open: 'Manage game updates', refresh: 'Refresh update history', check: 'Check for updates', checking: 'Checking',
        publish: 'Back up and update', retry: 'Retry failed update', view: 'View details'
      },
      simple: {
        title: 'Game updates', description: 'Version checks keep rooms running. Confirmed updates back up and restore rooms.',
        notChecked: 'Version not checked yet', notCheckedDescription: 'Select “Check for updates” to see each host’s current game version, the latest official version, and affected rooms.',
        resultTitle: 'Check result', resultDescription: 'Review official game versions and impact first. Steam installation data is available under technical details.',
        currentGameVersion: 'Current game version', latestOfficialVersion: 'Latest stable version', affectedNodes: 'Runtime nodes', affectedRoomsAndWorlds: 'Affected rooms / worlds',
        mixedGameVersions: '{count} different game versions', cached: 'Cached', officialVersionUnavailable: 'Latest official version unavailable'
      },
      nodes: {
        title: 'Game versions by host', count: '{nodes} hosts / {installations} installations',
        gameVersionsTitle: 'Game version by host', machineCount: '{count} hosts',
        loading: 'Loading host versions', empty: 'No runtime host has a deployed world', loadFailed: 'Failed to load host versions',
        steamDetails: 'Steam installation details', steamDetailsDescription: 'AppID, platform, and build are used only for update checks',
        channelTitle: 'Why the builds differ', channelDescription: 'Multiple version channels are present: {channels}. Operating systems and installation types can use different App IDs, so Steam build numbers may differ and are comparable only within one App ID.', channelSeparator: '; '
      },
      advanced: {
        title: 'Advanced options', description: 'Keep the defaults unless a download cache is damaged or startup verification needs adjustment.'
      },
      technical: {
        title: 'Technical details', description: 'Inspect platform, AppID, Steam builds, update method, disk capacity, and plan identifiers.'
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
        restartRunning: 'Restore previously running shards', restartRunningDescription: 'Only shards that were running or starting before the update are restored.',
        loadConfirmation: 'Startup confirmation', loadLogs: 'Inspect fresh logs', loadNone: 'Process only',
        loadDescriptions: { logs: 'Read logs created after this start and confirm world loading per shard.', none: 'Restore processes without requiring a load marker in logs.' },
        timeout: 'Per-stage timeout (seconds)', timeoutDescription: 'Allowed range: 30 to 900 seconds. Default: 300.'
      },
      plan: {
        title: 'Update scope', description: '{installations} installations across {rooms} rooms.',
        ready: 'Ready to update', checked: 'Check complete', blocked: 'Update blocked', upToDate: 'Everything is current', updateRequired: 'Update required',
        topology: 'Topology revision', planHash: 'Plan hash', targetVersion: 'Desired build',
        blockerTitle: 'Update check failed', blockerDescription: 'Resolve these blockers and check again.',
        noUpdateTitle: 'Every installation is current', noUpdateDescription: 'No stop, backup, or update operation is required.',
        steamManagedDescription: 'The local game is current. Steam manages this installation, so the panel will not modify its game files.'
      },
      columns: {
        target: 'Runtime target', installation: 'Installation', gameVersion: 'Game version', channel: 'Platform / Steam app', steamVersions: 'Current build → desired build', updateMethod: 'Update method', disk: 'Available / required',
        shards: 'Running shards', status: 'Status', release: 'Update job', createdAt: 'Created', rooms: 'Room / world',
        stage: 'Stage', beforeAfter: 'Before → after', evidence: 'Load evidence', updatedAt: 'Updated'
      },
      values: {
        checkFailed: 'Check failed', notInstalled: 'Not installed', unknown: 'Unconfirmed', testBranch: 'Test branch', otherBranch: 'Other branch',
        local: 'Local', online: 'Online', offline: 'Offline', ready: 'Pending update', blocked: 'Blocked', upToDate: 'Current', steamManaged: 'Current in Steam',
        steamClient: 'Managed by Steam', steamcmd: 'Panel-managed', unknownUpdateMethod: 'Unknown update method',
        platforms: { macos: 'macOS', linux: 'Linux', windows: 'Windows', unknown: 'Unknown OS' },
        applications: { gameClient: 'DST game client', dedicatedServer: 'DST dedicated server', unknown: 'Unknown Steam app' },
        runningShards: '{running} / {total} running', master: 'Master', secondary: 'Secondary', noEvidence: 'No evidence'
      },
      stages: {
        previewed: 'Plan ready', protecting: 'Protection backups', stopping: 'Stopping shards', staged: 'Update staged', updating: 'Updating installation',
        verified: 'Version verified', restarting: 'Restoring shards', confirming: 'Confirming world load', succeeded: 'Update succeeded',
        failed: 'Update failed', recovery_required: 'Manual recovery required', unknown: 'Unknown stage'
      },
      blockers: {
        targetOffline: 'Target is offline', inventoryStale: 'Runtime inventory is missing or stale', capabilityMissing: 'Target lacks the update protocol',
        installationIdentityInvalid: 'Installation identity is invalid', installationMissing: 'DST dedicated-server installation not found',
        steamcmdUnavailable: 'SteamCMD is unavailable', steamClientUpdateRequired: 'Update the local game in Steam first', updateUnsupported: 'This installation cannot be updated by the panel', diskInsufficient: 'Insufficient free disk space',
        versionObserveFailed: 'Failed to observe the installed version', versionCheckTimeout: 'Version check timed out on this host', latestBuildUnavailable: 'Could not query the latest Steam build',
        shardInventoryMissing: 'Shard missing from runtime inventory', shardStatusFailed: 'Failed to read shard state', unknown: 'Unknown blocker'
      },
      job: {
        title: 'Update job', queued: 'Queued', running: 'Running', succeeded: 'Job completed', failed: 'Job failed', canceled: 'Job canceled', unknown: 'Unknown job status'
      },
      history: {
        title: 'Update history', description: 'Every plan, protection backup, installation result, and shard load marker remains auditable.',
        loading: 'Loading update history', emptyTitle: 'No game update yet', emptyDescription: 'Execution history appears here after the first update.'
      },
      details: {
        title: 'Update details', description: 'Real execution stages and per-target results for update {id}.', backups: 'Protection backups',
        installationResults: 'Installation results', shardResults: 'Shard restore and load confirmation', noSelection: 'Select an update to inspect its complete evidence.'
      },
      confirm: {
        title: 'Confirm backup and update', description: 'This locks affected rooms, creates protection backups, and stops currently running shards.',
        warningTitle: 'Rooms will stop temporarily', warningDescription: 'The update affects {rooms} rooms and {shards} shards. Failures retain recovery and audit state and are never reported as partial success.',
        submit: 'Back up and update'
      },
      feedback: {
        operationFailedTitle: 'Check or update failed',
        historyFailed: 'Failed to load update history: {error}', previewReady: 'Update check completed', previewFailed: 'Failed to check for updates: {error}',
        submitted: 'Game update job submitted', submitFailed: 'Failed to submit game update: {error}', retrySubmitted: 'Retry job submitted',
        retryFailed: 'Failed to submit retry: {error}', detailsFailed: 'Failed to load update details: {error}', taskFailed: 'Update job failed: {error}',
        invalidJobResponse: 'The backend did not return a trackable update job', completionUnconfirmed: 'The update job ended, but its record could not be read after repeated attempts. Refresh update history and verify recovery state.',
        officialVersionUnavailable: 'Could not load the latest official game version'
      }
    }
  }
}

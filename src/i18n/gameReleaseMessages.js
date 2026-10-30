export const gameReleaseMessages = {
  'zh-CN': {
    gameReleases: {
      title: '游戏服务端管理',
      subtitle: '查看各机器的安装状态，安装或接入已有服务端，并管理 LuaJIT 和游戏更新。',
      actions: {
        open: '管理游戏更新', refresh: '刷新更新记录', check: '检查是否有更新', checking: '正在检查',
        publish: '备份并开始更新', retry: '继续更新 / 恢复', view: '查看详情'
      },
      simple: {
        checkedScope: '检查范围', affectedScope: '影响范围', scopeSummary: '{rooms} 个房间 · {worlds} 个世界', runningSummary: '{count} 个世界运行中',
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
        description: '系统会安全停止相关世界，创建并验证保护备份，更新与校验游戏后恢复原先运行的世界。共用安装和跨节点房间会一起处理。'
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
        runningShards: '{running} / {total} 运行', master: '主世界', secondary: '附属世界', noEvidence: '尚未确认加载',
        unknownRoom: '未知房间', unknownWorld: '未知世界', unknownTarget: '未知机器', defaultInstallation: '默认安装'
      },
      stages: {
        previewed: '已生成计划', protecting: '保护备份', stopping: '停止分片', staged: '准备更新', updating: '更新安装',
        verified: '版本已校验', restarting: '恢复分片', confirming: '确认世界加载', succeeded: '更新成功',
        abandoned: '已结束维护', failed: '更新失败', recovery_required: '需要人工恢复', unknown: '未知阶段'
      },
      blockers: {
        targetOffline: '目标节点离线', inventoryRefreshFailed: '运行清单刷新失败', shardRunning: '维护期间世界仍在运行', backupDiskInsufficient: '备份磁盘空间不足', inventoryStale: '节点运行清单缺失或过期', capabilityMissing: '节点不支持版本更新协议',
        installationIdentityInvalid: '安装实例标识无效', installationMissing: '未发现 DST 专用服务器安装',
        steamcmdUnavailable: 'SteamCMD 不可用', steamClientUpdateRequired: '请先在 Steam 客户端中更新本机游戏', updateUnsupported: '该安装方式不支持面板更新', diskInsufficient: '磁盘可用空间不足',
        versionObserveFailed: '读取安装版本失败', versionCheckTimeout: '该主机版本检查超时', latestBuildUnavailable: '无法查询 Steam 最新 Build',
        shardInventoryMissing: '运行清单中未发现分片', shardStatusFailed: '读取分片状态失败', unknown: '未知阻断项'
      },
      writeStates: { not_started: '尚未写入游戏文件', dispatched: '更新已下发，等待结果', unknown: '写入结果待确认', failed: '本次写入未通过验证', version_changed: '实际版本变化，需重新检查', verified: '安装完整性已验证', unavailable: '旧记录未提供写入状态' },
      recovery: { title: '下一步', finish: '结束维护，保持当前状态', finishDescription: '仅在所有游戏安装已完整验证、世界状态明确后结束维护。不会启动或停止世界，不会回退游戏，也不会修改原运行时偏好。结束后可以重新安装加速组件，再手动启动。安装不完整或写入结果未知时会拒绝此操作。', finished: '游戏安装已验证，维护已结束。世界保持当前状态，未继续自动启动；需要时可修复加速组件后手动启动。', acceleratorWarning: '加速组件需要检查', acceleratorRepair: '官方游戏安装已验证，但加速组件启动入口修复未完成。请查看逐项警告；需要时可结束维护后重新安装加速组件。', runtimeFallback: '所选加速组件不可用；相关世界使用原版运行时恢复，原偏好已保留。可在停服后修复加速组件。', repair: '校验修复并继续', repairDescription: '将保留原保护备份和世界恢复设置，在确认节点无其他写入后发起新的 SteamCMD 文件校验；可能需要重新下载部分游戏文件。校验成功前不启动相关世界。', recheck: '重新检查并继续', continue: '按新版本继续原任务', expected: '目标版本 {version}', confirmDescription: 'Steam 最新版本已变化。确认后继续原更新任务，保留原保护备份和世界恢复设置。', retry_release: '继续原任务。已验证的安装不重复下载；原本停止的世界保持停止。', preview_and_retry: 'Steam 最新版本已变化。重新检查后可按新版本继续原任务。', inspect_release: '更新已下发，但写入结果尚未确认。点击继续会先检查原操作回执，确认前不会重复下载或启动相关世界。' },
      job: { processing: '正在处理更新任务', progressMeaning: '此进度表示任务步骤的处理情况；最终结果以安装验证与世界恢复状态为准。',
        title: '更新任务', queued: '等待执行', running: '正在执行', succeeded: '任务完成', failed: '任务失败', canceled: '任务已取消', unknown: '未知任务状态'
      },
      progress: {
        title: '更新进度', steps: '更新执行步骤', updatedAt: '最近更新：{time}',
        stepsLabels: { stopping: '停止世界', protecting: '保护备份', updating: '更新并校验', restarting: '恢复世界', confirming: '确认加载' },
        states: { pending: '等待', active: '进行中', done: '已完成', skipped: '无需执行', interrupted: '未完成' },
        hints: {
          previewed: '任务已建立，正在准备执行。', stopping: '正在安全停止原先运行的世界；全部停止后才会备份和更新。',
          protecting: '正在创建并验证各房间的保护备份，尚未更新游戏文件。', staged: '保护备份已完成，正在检查安装条件。',
          updating: 'SteamCMD 正在下载更新并校验文件，完成后会读取实际版本。本步骤暂不提供下载百分比。',
          verified: '游戏文件已校验，正在准备恢复原先运行的世界。', restarting: '正在恢复原先运行的世界；原本停止的世界保持停止。',
          confirming: '正在等待各世界加载完成，进程启动不代表更新任务已经完成。', unknown: '正在读取更新任务的执行阶段。'
        },
        success: '游戏更新完成', noUpdate: '检查完成，游戏无需更新', actualBuild: '实际 Steam Build',
        restored: '已恢复并确认 {count}/{total} 个世界，另有 {stopped} 个世界保持停止。', incomplete: '更新尚未完整完成，请查看安装及世界恢复结果。',
        backups: '保护备份 {count}/{total} 个房间', backupReady: '备份已验证', backupPending: '等待备份',
        shardStates: { pending: '等待停服', stopping: '正在停止', waitingRestore: '已停止，等待更新完成后恢复', restarting: '正在启动', confirming: '等待加载完成', running: '已恢复运行', stopped: '已停止，不自动恢复', keptStopped: '保持停止（更新前未运行）', completed: '处理完成', failed: '处理失败' },
        noLoadNeeded: '此世界无需恢复运行', processConfirmed: '进程运行已确认', logConfirmed: '世界加载已确认',
        awaitingRecord: '正在读取任务的实际执行阶段…', queued: '等待执行', refresh: '重新读取进度',
        historyTask: '游戏服务端更新', inspectIds: '任务标识'
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
        title: '确认备份并更新', description: '确认后将安全停止相关世界、创建保护备份，再更新并恢复原运行状态。',
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
        publish: 'Back up and update', retry: 'Resume update / restore', view: 'View details'
      },
      simple: {
        checkedScope: 'Checked scope', affectedScope: 'Update scope', scopeSummary: '{rooms} rooms · {worlds} worlds', runningSummary: '{count} worlds running',
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
        description: 'The system safely stops affected worlds, creates verified protection backups, updates and validates the game, then restores previously running worlds. Shared installations and split rooms are handled together.'
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
        runningShards: '{running} / {total} running', master: 'Master world', secondary: 'Secondary world', noEvidence: 'Loading not confirmed yet',
        unknownRoom: 'Unknown room', unknownWorld: 'Unknown world', unknownTarget: 'Unknown host', defaultInstallation: 'Default installation'
      },
      stages: {
        previewed: 'Plan ready', protecting: 'Protection backups', stopping: 'Stopping shards', staged: 'Update staged', updating: 'Updating installation',
        verified: 'Version verified', restarting: 'Restoring shards', confirming: 'Confirming world load', succeeded: 'Update succeeded',
        abandoned: 'Maintenance ended', failed: 'Update failed', recovery_required: 'Manual recovery required', unknown: 'Unknown stage'
      },
      blockers: {
        targetOffline: 'Target is offline', inventoryRefreshFailed: 'Runtime inventory refresh failed', shardRunning: 'World still running during maintenance', backupDiskInsufficient: 'Insufficient space on backup disk', inventoryStale: 'Runtime inventory is missing or stale', capabilityMissing: 'Target lacks the update protocol',
        installationIdentityInvalid: 'Installation identity is invalid', installationMissing: 'DST dedicated-server installation not found',
        steamcmdUnavailable: 'SteamCMD is unavailable', steamClientUpdateRequired: 'Update the local game in Steam first', updateUnsupported: 'This installation cannot be updated by the panel', diskInsufficient: 'Insufficient free disk space',
        versionObserveFailed: 'Failed to observe the installed version', versionCheckTimeout: 'Version check timed out on this host', latestBuildUnavailable: 'Could not query the latest Steam build',
        shardInventoryMissing: 'Shard missing from runtime inventory', shardStatusFailed: 'Failed to read shard state', unknown: 'Unknown blocker'
      },
      writeStates: { not_started: 'Game files not written', dispatched: 'Update dispatched; awaiting result', unknown: 'Write outcome unconfirmed', failed: 'Write did not pass validation', version_changed: 'Installed version changed; recheck required', verified: 'Installation integrity verified', unavailable: 'Write state unavailable in this older record' },
      recovery: { title: 'Next step', finish: 'End maintenance, keep current state', finishDescription: 'End maintenance only after every installation is verified and every world has a stable state. This does not start or stop worlds, roll back the game, or change runtime preferences. Repair the accelerator and start worlds manually afterwards. Incomplete or unknown writes block this action.', finished: 'The game installation is verified and maintenance has ended. Worlds retain their current state; automatic restart was skipped. Repair the accelerator before starting manually if needed.', acceleratorWarning: 'Check optional accelerator', acceleratorRepair: 'The official game installation is verified, but accelerator launcher repair is incomplete. Review the individual warnings; end verified maintenance before reinstalling if needed.', runtimeFallback: 'The selected accelerator was unavailable. Affected worlds were restored with the official runtime; the original preference was retained. Repair the accelerator while worlds are stopped.', repair: 'Validate, repair and continue', repairDescription: 'Keep the original protection backups and world restore settings. Once node checks confirm no other writer, start a new SteamCMD file validation; some game files may be downloaded again. Related worlds stay stopped until verified.', recheck: 'Recheck and continue', continue: 'Continue original release with new build', expected: 'Expected build {version}', confirmDescription: 'The latest Steam build has changed. Continue the original release while retaining its protection backups and world restore settings.', retry_release: 'Resume the original release. Verified installations are not downloaded again; originally stopped worlds stay stopped.', preview_and_retry: 'The latest Steam build changed. Recheck before continuing the original release with the new build.', inspect_release: 'The update was dispatched but its outcome is not confirmed. Continue checks the original operation receipt before resending or starting related worlds.' },
      job: { processing: 'Processing update', progressMeaning: 'Progress reflects processed task steps. Installation verification and world restoration determine the final result.',
        title: 'Update job', queued: 'Queued', running: 'Running', succeeded: 'Job completed', failed: 'Job failed', canceled: 'Job canceled', unknown: 'Unknown job status'
      },
      progress: {
        title: 'Update progress', steps: 'Update steps', updatedAt: 'Last updated: {time}',
        stepsLabels: { stopping: 'Stop worlds', protecting: 'Protect backups', updating: 'Update and validate', restarting: 'Restore worlds', confirming: 'Confirm loading' },
        states: { pending: 'Waiting', active: 'In progress', done: 'Completed', skipped: 'Not required', interrupted: 'Incomplete' },
        hints: {
          previewed: 'The task has been created and is preparing to run.', stopping: 'Safely stopping previously running worlds before backups and game changes.',
          protecting: 'Creating and verifying protection backups for each room. Game files have not been updated yet.', staged: 'Protection backups are complete. Checking installation prerequisites.',
          updating: 'SteamCMD is downloading updates and validating files. The installed build will be checked afterward. Download percentage is not available for this step.',
          verified: 'Game files have been validated. Preparing to restore previously running worlds.', restarting: 'Restoring previously running worlds. Worlds that were stopped remain stopped.',
          confirming: 'Waiting for each world to finish loading. Starting a process does not complete the update.', unknown: 'Reading the current update stage.'
        },
        success: 'Game update completed', noUpdate: 'Check complete; no game update needed', actualBuild: 'Actual Steam build',
        restored: '{count}/{total} worlds restored and confirmed; {stopped} worlds remain stopped.', incomplete: 'The update is incomplete. Check installation and world restore results.',
        backups: 'Protection backups: {count}/{total} rooms', backupReady: 'Backup verified', backupPending: 'Waiting for backup',
        shardStates: { pending: 'Waiting to stop', stopping: 'Stopping', waitingRestore: 'Stopped; waiting for the update before restoring', restarting: 'Starting', confirming: 'Waiting for world loading', running: 'Restored and running', stopped: 'Stopped; automatic restore disabled', keptStopped: 'Kept stopped (not running before update)', completed: 'Completed', failed: 'Failed' },
        noLoadNeeded: 'World does not need to be restored', processConfirmed: 'Running process confirmed', logConfirmed: 'World loading confirmed',
        awaitingRecord: 'Reading the actual update stage…', queued: 'Queued', refresh: 'Reload progress',
        historyTask: 'Game server update', inspectIds: 'Task identifiers'
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

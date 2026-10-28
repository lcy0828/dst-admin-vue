export const softwareUpdateMessages = {
  'zh-CN': { softwareUpdate: {
    agentTitle: 'Agent 软件更新', agentDescription: '下载、校验并更新此机器上的 Agent。',
    controllerTransfer: '控制端传包', agentSources: '默认由 Agent 自行下载；无法访问下载源时可选择控制端传包。',
    agentOffline: 'Agent 当前离线，连接恢复后可检查和更新。', agentReconnecting: '正在等待 Agent 重启并重新连接。',
    confirmAgentUpdate: '更新 Agent 到 {version}？',
    agentConfirmation: 'Agent 会短暂断开并自动重连。存档、配置和运行中的游戏世界保留；请先等待该机器的其他任务完成。新版启动或重连失败会自动恢复原版。',
    title: '软件更新', management: '管理服务', description: '在页面更新管理服务和界面。',
    current: '当前版本', latest: '最新版本', available: '发现新版', upToDate: '已是最新版本', unknown: '尚未检查',
    check: '检查更新', checking: '正在检查', update: '更新到 {version}', apply: '安装并重启',
    source: '下载来源', auto: '自动', direct: 'GitHub', proxy: '国内代理',
    autoDescription: '自动模式优先访问 GitHub，连接失败时使用 ghfast.top。',
    checkFailed: '检查新版失败', loadFailed: '暂时无法连接管理服务', retry: '重新连接',
    actionFailed: '更新操作暂未完成',
    unsupported: '当前部署需要通过安装包或镜像升级',
    reasons: { development_build: '开发构建仅支持查看版本。', launcher_unavailable: '请先安装支持在线更新的正式版。', platform_unavailable: '此平台暂未提供在线更新包。' },
    packageMissing: '此版本尚未提供在线更新包，请使用 Release 安装包或镜像升级。',
    notes: '更新说明', release: '查看 GitHub Release', progress: '更新进度', downloaded: '{downloaded} / {total}',
    phases: { downloading: '下载更新包', verifying: '校验更新包', prepared: '已校验，等待安装', restarting: '正在重启管理服务', succeeded: '更新完成', failed: '更新失败', rolled_back: '新版启动失败，已恢复原版本' },
    reconnecting: '正在等待管理服务恢复，恢复后自动刷新页面。',
    restartTimeout: '等待重启超时。请重新连接；若仍无法恢复，请查看管理服务日志。',
    trackingReconnect: '连接暂时中断，正在重新获取更新进度。',
    connectionTimeout: '暂时无法获取更新进度，后台任务可能仍在继续。点击重新连接可继续查看。',
    observationTimeout: '等待更新结果超时。点击重新连接可继续查看后台任务。',
    starting: '管理服务正在完成启动检查，请稍候。',
    confirmUpdate: '更新管理服务到 {version}？', confirmApply: '安装已校验的 {version}？',
    confirmDescription: '更新后管理页面会短暂断开并自动刷新。正在运行的游戏房间继续运行，存档、配置和数据库保留。请先等待下载、备份等后台任务完成。',
    confirm: '继续', cancel: '取消', scope: '此处更新当前管理服务；独立 Agent 在机器管理中单独升级。',
    imageNote: '系统依赖或基础镜像变更仍需更新镜像；普通版本更新可在此完成。'
  } },
  'en-US': { softwareUpdate: {
    agentTitle: 'Agent software updates', agentDescription: 'Download, verify and update the Agent on this machine.',
    controllerTransfer: 'Controller relay', agentSources: 'The Agent downloads directly by default. Use the controller relay if download sources are unreachable.',
    agentOffline: 'The Agent is offline. Check and update after it reconnects.', agentReconnecting: 'Waiting for the Agent to restart and reconnect.',
    confirmAgentUpdate: 'Update the Agent to {version}?',
    agentConfirmation: 'The Agent briefly disconnects and reconnects automatically. Saves, configuration and running game worlds are preserved. Wait for other tasks on this machine to finish. Failed startup or reconnection restores the previous program.',
    title: 'Software updates', management: 'Management service', description: 'Update the management service and web UI here.',
    current: 'Current version', latest: 'Latest version', available: 'Update available', upToDate: 'Up to date', unknown: 'Not checked yet',
    check: 'Check for updates', checking: 'Checking', update: 'Update to {version}', apply: 'Install and restart',
    source: 'Download source', auto: 'Automatic', direct: 'GitHub', proxy: 'China proxy',
    autoDescription: 'Automatic mode tries GitHub first, then ghfast.top if the connection fails.',
    checkFailed: 'Release check failed', loadFailed: 'Cannot connect to the management service', retry: 'Reconnect',
    actionFailed: 'Update could not be completed',
    unsupported: 'Upgrade this deployment using a release package or container image',
    reasons: { development_build: 'Development builds only display version information.', launcher_unavailable: 'Install an official release with online update support first.', platform_unavailable: 'An online update bundle is not available for this platform.' },
    packageMissing: 'This release does not include an online update bundle. Use its release package or container image.',
    notes: 'Release notes', release: 'View GitHub Release', progress: 'Update progress', downloaded: '{downloaded} / {total}',
    phases: { downloading: 'Downloading update', verifying: 'Verifying update', prepared: 'Verified, ready to install', restarting: 'Restarting management service', succeeded: 'Update complete', failed: 'Update failed', rolled_back: 'New version failed to start; previous version restored' },
    reconnecting: 'Waiting for the service to return. This page will refresh automatically.',
    restartTimeout: 'Restart timed out. Reconnect, or check the management service logs if it remains unavailable.',
    trackingReconnect: 'Connection interrupted. Reconnecting to update progress.',
    connectionTimeout: 'Update progress is unavailable. The background task may still be running. Reconnect to continue observing it.',
    observationTimeout: 'Waiting for the update result timed out. Reconnect to continue observing the background task.',
    starting: 'The management service is completing its startup check. Please wait.',
    confirmUpdate: 'Update the management service to {version}?', confirmApply: 'Install verified version {version}?',
    confirmDescription: 'The management UI briefly disconnects and refreshes after updating. Running game rooms continue; saves, settings and databases are preserved. Wait for downloads, backups and other background jobs to finish first.',
    confirm: 'Continue', cancel: 'Cancel', scope: 'Updates apply to this management service. Upgrade standalone Agents separately in Machines.',
    imageNote: 'System dependency and base image changes still require an image update. Routine releases can be installed here.'
  } }
}

Object.assign(softwareUpdateMessages["zh-CN"].softwareUpdate, {
  "proxyMode": "网络代理",
  "proxyURL": "代理地址",
  "secretSaved": "已保存，留空保留",
  "timeout": "下载总时限（分钟）",
  "saveSettings": "保存更新设置",
  "savingSettings": "正在保存",
  "settingsSaved": "更新设置已保存",
  "proxyModes": {
    "inherit": "继承工坊代理",
    "agentInherit": "使用此 Agent 的系统代理",
    "system": "使用系统环境代理",
    "direct": "不使用代理",
    "custom": "自定义代理"
  },
  "proxyHelp": "用于检查版本、下载校验文件和程序包。",
  "agentProxyHelp": "地址由此 Agent 访问；127.0.0.1 指 Agent 所在机器。",
  "backgroundCheck": "后台检查软件新版",
  "backgroundHelp": "默认每 30 分钟检查。有启用的管理服务或 Agent 新版订阅时定期检查，关闭浏览器后也可提醒。同一渠道对同一组件、节点和版本不重复入队。",
  "interval": "检查间隔（分钟）",
  "resumed": "正在接着上次的进度下载",
  "actualSource": "实际下载来源",
  "routes": {
    "direct": "GitHub",
    "mirror": "国内镜像",
    "proxy": "国内镜像",
    "auto": "自动",
    "configured-proxy": "已配置代理",
    "controller": "控制端"
  },
  "proxy": "国内镜像",
  "autoDescription": "自动模式依次尝试已配置代理、GitHub 直连和国内镜像。固定来源不自动换源。"
})
Object.assign(softwareUpdateMessages["en-US"].softwareUpdate, {
  "proxyMode": "Network proxy",
  "proxyURL": "Proxy URL",
  "secretSaved": "Saved; leave blank to keep",
  "timeout": "Download deadline (minutes)",
  "saveSettings": "Save update settings",
  "savingSettings": "Saving",
  "settingsSaved": "Update settings saved",
  "proxyModes": {
    "inherit": "Inherit Workshop proxy",
    "agentInherit": "Use this Agent’s system proxy",
    "system": "System environment proxy",
    "direct": "No proxy",
    "custom": "Custom proxy"
  },
  "proxyHelp": "Used for release checks, checksums and archives.",
  "agentProxyHelp": "The Agent connects to this address. 127.0.0.1 means the Agent machine.",
  "backgroundCheck": "Check software releases in the background",
  "backgroundHelp": "Checks every 30 minutes by default when an enabled channel subscribes to releases, even with the browser closed. Each channel queues a component, node and version once.",
  "interval": "Check interval (minutes)",
  "resumed": "Resuming the previous download",
  "actualSource": "Download route",
  "routes": {
    "direct": "GitHub",
    "mirror": "China mirror",
    "proxy": "China mirror",
    "auto": "Automatic",
    "configured-proxy": "Configured proxy",
    "controller": "Controller"
  },
  "proxy": "China mirror",
  "autoDescription": "Automatic mode tries the configured proxy, direct GitHub and the China mirror. A fixed source does not switch automatically."
})

softwareUpdateMessages['zh-CN'].softwareUpdate.resume = '继续下载 {version}'
softwareUpdateMessages['en-US'].softwareUpdate.resume = 'Resume download of {version}'
softwareUpdateMessages['zh-CN'].softwareUpdate.phases.interrupted = '下载已中断，可继续'
softwareUpdateMessages['en-US'].softwareUpdate.phases.interrupted = 'Download interrupted; resume available'

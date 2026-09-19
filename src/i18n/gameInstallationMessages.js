export const gameInstallationMessages = {
  'zh-CN': { gameInstallation: {
    title: '游戏服务端', currentVersion: '当前版本', description: '安装游戏或接入已有目录。',
    refresh: '刷新安装状态', loading: '正在读取安装状态…', empty: '当前范围没有可管理的运行机器。',
    installed: '已安装', missing: '未安装', offline: '离线', unknown: '检测失败', version: '游戏版本 {version}',
    location: '安装位置', actualLocation: '已有服务端目录', saves: '存档目录', steamReady: 'SteamCMD 可用', steamMissing: 'SteamCMD 未配置',
    install: '安装游戏服务端', update: '更新 / 校验', adopt: '使用已有服务端', rooms: '管理房间',
    installTitle: '安装或校验游戏服务端', installDescription: '在 {target} 的 {path} 执行 SteamCMD 下载与校验。请先停止使用该目录的全部世界；存档目录保留。更新后如需使用 LuaJIT，可在下方重新安装 / 修复。',
    confirmInstall: '开始安装 / 校验', cancel: '取消', adoptTitle: '接入已有游戏服务端',
    adoptDescription: '填写所选运行机器上的目录。接入后复用该目录中的游戏文件，继续使用下方所示的存档目录。已有存档如需导入，请在房间管理中单独操作。',
    path: '该机器上的游戏目录', pathPlaceholder: '/opt/dst-existing/server', probe: '检测目录', checking: '正在检测…',
    detected: '检测到 DST {version}', confirmAdopt: '使用此服务端', preserve: '仅可接入到空的安装位置；不会搬动源目录或覆盖现有文件。',
    working: '任务正在执行，可查看进度和结果。', done: '游戏服务端已就绪', failed: '操作未完成', trackingFailed: '暂时无法读取任务，请刷新状态重试。',
    stages: { install: '连接 Steam / 准备安装', prepare: '分配空间 / 准备文件', download: '下载游戏文件', validate: '校验游戏文件', ready: '安装完成' },
    waitingProgress: '等待 SteamCMD 返回进度…', speed: '下载速度（估算）', measuring: '等待采样…', speedHint: '根据 SteamCMD 已处理字节估算；校验阶段不显示下载速度。', latestOutput: '最新 SteamCMD 输出',
    progress: '当前阶段进度', noVersion: '版本未知', needsRegistration: '请先在运行机器登记游戏和存档路径。'
  } },
  'en-US': { gameInstallation: {
    title: 'Game server', currentVersion: 'Installed version', description: 'Install the game or connect an existing directory.',
    refresh: 'Refresh installation status', loading: 'Reading installation status…', empty: 'No runtime hosts are available in this scope.',
    installed: 'Installed', missing: 'Not installed', offline: 'Offline', unknown: 'Inspection failed', version: 'Game version {version}',
    location: 'Installation location', actualLocation: 'Existing game directory', saves: 'Save directory', steamReady: 'SteamCMD available', steamMissing: 'SteamCMD not configured',
    install: 'Install game server', update: 'Update / validate', adopt: 'Use existing server', rooms: 'Manage rooms',
    installTitle: 'Install or validate game server', installDescription: 'Run SteamCMD download and validation at {path} on {target}. Stop all worlds using this directory first. Saves are preserved. Reinstall / repair LuaJIT below after a game update if needed.',
    confirmInstall: 'Start install / validation', cancel: 'Cancel', adoptTitle: 'Connect an existing game server',
    adoptDescription: 'Enter a directory on the selected runtime host. The game files are reused and the save directory shown below stays active. Import any existing saves separately through room management.',
    path: 'Game directory on this host', pathPlaceholder: '/opt/dst-existing/server', probe: 'Inspect directory', checking: 'Inspecting…',
    detected: 'DST {version} detected', confirmAdopt: 'Use this server', preserve: 'Only empty installation locations can be connected. Source files are not moved or overwritten.',
    working: 'The task is running. Progress and results are shown here.', done: 'Game server is ready', failed: 'Operation did not complete', trackingFailed: 'Cannot read task status. Refresh to retry.',
    stages: { install: 'Connecting to Steam / preparing', prepare: 'Allocating space / preparing files', download: 'Downloading game files', validate: 'Validating game files', ready: 'Installation complete' },
    waitingProgress: 'Waiting for SteamCMD progress…', speed: 'Download rate (estimated)', measuring: 'Measuring…', speedHint: 'Estimated from SteamCMD byte progress. Download rate is hidden during validation.', latestOutput: 'Latest SteamCMD output',
    progress: 'Current stage progress', noVersion: 'Unknown version', needsRegistration: 'Register the game and save paths on this runtime host first.'
  } }
}

export const gameInstallationMessages = {
  'zh-CN': { gameInstallation: {
    maintenance: {
      title: '更新 / 校验游戏服务端', checking: '正在检查安装和相关世界…', recheck: '重新检查', blocked: '暂时无法开始',
      ready: '可以开始', downtime: '需要短暂停服', affected: '受影响的世界',
      managedDescription: '先创建保护备份，再停止相关世界并更新、校验游戏文件。存档目录保留。',
      idleDescription: '当前安装未被游戏进程使用。校验会补齐损坏文件，并下载 Steam 当前版本；存档目录保留。',
      willStop: '将停止', staysStopped: '保持停止', unknownState: '状态待确认',
      sharedScope: '共用安装或同属跨节点房间的世界需要一起处理，以避免游戏版本不一致。',
      restart: '完成后恢复运行', restartHint: '仅恢复操作前运行的世界；关闭后这些世界将保持停止。',
      confirmStop: '确认停服并更新 / 校验', confirmValidate: '开始更新 / 校验', viewDetails: '查看更新记录',
      blockers: {
        USAGE_UNAVAILABLE: '无法确认安装的使用状态，请重新检查；旧版 Agent 需先升级。',
        UNMANAGED_GAME_RUNNING: '此目录被未纳入更新计划的游戏进程使用，请先停止这些进程，再重新检查。',
        SHARD_STATE_UNCERTAIN: '世界正在切换状态或状态无法确认，请稍后重新检查。'
      }
    },
	steamLogin: {
		retryRead: '重新读取状态',
		reset: '重置登录设置', resetTitle: '重置此节点的 Steam 登录设置？', resetDescription: '清除此 SteamCMD 共用的面板账号配置，并切换为匿名登录。之后可重新配置账号。游戏文件、模组和存档不会改动。', resetConfirm: '确认重置',
		approvalTitle: '在 Steam 手机应用中确认', approvalHint: '打开 Steam 手机应用并批准此次登录；本页会显示验证结果。',
		title: 'Steam 登录', description: '此节点的游戏安装、更新和模组下载共用登录设置。默认使用匿名登录。', loading: '正在读取登录设置…', mode: '登录方式', anonymous: '匿名登录（默认）', account: 'Steam 账号登录', username: 'Steam 账号', usernameHint: '填写登录账号名，而非昵称或 Steam ID。', password: '密码', passwordSaved: '已保存，留空保留原密码', passwordHint: '密码加密保存在运行节点，不会再次返回页面。', emailCode: '邮件验证码', mobileCode: 'Steam Guard 动态验证码', codeHint: '输入当前的 5 位验证码。验证码仅用于本次登录。', submitCode: '提交验证码', failed: 'Steam 登录未完成', save: '保存', saveAndVerify: '保存并验证登录', close: '关闭', cancelLogin: '取消登录', readyHint: '登录验证通过。可返回安装、更新或重试此前失败的下载任务。', clearHint: '保存后使用匿名登录，并清除面板保存的账号与密码。',
		states: { anonymous: '匿名登录', configured: '账号已配置，待验证', connecting: '正在登录 Steam…', guard_email: '等待邮件验证码', guard_mobile: '等待动态验证码', guard_approval: '等待手机确认', ready: '账号验证通过', failed: '需要处理' },
		errors: { CREDENTIALS_UNAVAILABLE: '保存的登录设置或加密密钥无法读取，下载已暂停。请重置登录设置，再重新配置账号或使用匿名登录。', GUARD_REQUIRED: 'Steam 需要验证，请点击“保存并验证登录”后输入验证码，再重试下载。', INVALID_PASSWORD: '账号或密码错误，请检查后重新验证。', ACCESS_DENIED: 'Steam 拒绝访问，请检查账号权限。', STEAM_NETWORK: '无法连接 Steam，请检查此运行节点的网络。', LOGIN_TIMEOUT: '登录超时，请重试并检查节点网络。', LOGIN_CANCELLED: '本次登录已取消。', LOGIN_FAILED: '登录失败，请检查账号或重新验证。' }
	},
    title: '游戏服务端', currentVersion: '当前版本', description: '安装游戏或接入已有目录。',
    refresh: '刷新安装状态', loading: '正在读取安装状态…', empty: '当前范围没有可管理的运行机器。',
    installed: '已安装', missing: '未安装', offline: '离线', unknown: '检测失败', version: '游戏版本 {version}',
    location: '安装位置', actualLocation: '已有服务端目录', saves: '存档目录', steamReady: 'SteamCMD 可用', steamMissing: 'SteamCMD 未配置',
    install: '安装游戏服务端', update: '更新 / 校验', moreMaintenance: '更多维护', validateFiles: '校验 / 修复文件', adopt: '使用已有服务端', rooms: '管理房间',
    installTitle: '安装游戏服务端', installDescription: '检查 {target} 的 {path}，确认后执行下载与文件校验。',
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
    maintenance: {
      title: 'Update / validate game server', checking: 'Checking the installation and affected worlds…', recheck: 'Check again', blocked: 'Cannot start yet',
      ready: 'Ready to start', downtime: 'Brief downtime required', affected: 'Affected worlds',
      managedDescription: 'Create protection backups, then stop affected worlds and update and validate game files. Save directories are preserved.',
      idleDescription: 'No game process is using this installation. Validation repairs files and downloads the current Steam version. Saves are preserved.',
      willStop: 'Will stop', staysStopped: 'Keep stopped', unknownState: 'State unknown',
      sharedScope: 'Worlds sharing an installation or belonging to connected rooms across nodes are included to keep game versions consistent.',
      restart: 'Resume worlds when finished', restartHint: 'Resume only worlds that were running before this operation. Turn off to leave them stopped.',
      confirmStop: 'Stop worlds and update / validate', confirmValidate: 'Start update / validation', viewDetails: 'View update history',
      blockers: {
        USAGE_UNAVAILABLE: 'Installation usage could not be confirmed. Check again; older Agents need to be upgraded first.',
        UNMANAGED_GAME_RUNNING: 'Game processes outside this update plan use the directory. Stop them first, then check again.',
        SHARD_STATE_UNCERTAIN: 'A world is changing state or its state is unknown. Check again shortly.'
      }
    },
	steamLogin: {
		retryRead: 'Retry status',
		reset: 'Reset login settings', resetTitle: 'Reset Steam login settings on this node?', resetDescription: 'Clear the panel account settings shared by this SteamCMD and switch to anonymous login. You can then configure an account again. Game files, mods and saves are preserved.', resetConfirm: 'Confirm reset',
		approvalTitle: 'Confirm in the Steam mobile app', approvalHint: 'Open the Steam mobile app and approve this login. The result will appear here.',
		title: 'Steam login', description: 'Game installation, updates and mod downloads on this node share these settings. Anonymous login is the default.', loading: 'Reading login settings…', mode: 'Login method', anonymous: 'Anonymous (default)', account: 'Steam account', username: 'Steam account name', usernameHint: 'Use your login name, not a nickname or Steam ID.', password: 'Password', passwordSaved: 'Saved; leave blank to keep it', passwordHint: 'Encrypted on the runtime node and never returned to the UI.', emailCode: 'Email verification code', mobileCode: 'Steam Guard authenticator code', codeHint: 'Enter the current 5-character code. It is used only for this login.', submitCode: 'Submit code', failed: 'Steam login incomplete', save: 'Save', saveAndVerify: 'Save and verify login', close: 'Close', cancelLogin: 'Cancel login', readyHint: 'Login verified. Return to installation, updates or retry the previously failed download.', clearHint: 'Saving switches to anonymous login and removes the account and password stored by the panel.',
		states: { anonymous: 'Anonymous login', configured: 'Account configured; verification pending', connecting: 'Connecting to Steam…', guard_email: 'Waiting for email code', guard_mobile: 'Waiting for authenticator code', guard_approval: 'Waiting for mobile approval', ready: 'Account verified', failed: 'Action needed' },
		errors: { CREDENTIALS_UNAVAILABLE: 'Saved login settings or their encryption key cannot be read. Downloads are paused. Reset login settings, then configure an account again or use anonymous login.', GUARD_REQUIRED: 'Steam needs verification. Choose “Save and verify login”, enter the code, then retry the download.', INVALID_PASSWORD: 'Incorrect account or password. Check and verify again.', ACCESS_DENIED: 'Steam denied access. Check the account permissions.', STEAM_NETWORK: 'Cannot connect to Steam. Check this runtime node’s network.', LOGIN_TIMEOUT: 'Login timed out. Retry and check the node’s network.', LOGIN_CANCELLED: 'This login was cancelled.', LOGIN_FAILED: 'Login failed. Check the account or verify again.' }
	},
    title: 'Game server', currentVersion: 'Installed version', description: 'Install the game or connect an existing directory.',
    refresh: 'Refresh installation status', loading: 'Reading installation status…', empty: 'No runtime hosts are available in this scope.',
    installed: 'Installed', missing: 'Not installed', offline: 'Offline', unknown: 'Inspection failed', version: 'Game version {version}',
    location: 'Installation location', actualLocation: 'Existing game directory', saves: 'Save directory', steamReady: 'SteamCMD available', steamMissing: 'SteamCMD not configured',
    install: 'Install game server', update: 'Update / validate', moreMaintenance: 'More maintenance', validateFiles: 'Validate / repair files', adopt: 'Use existing server', rooms: 'Manage rooms',
    installTitle: 'Install game server', installDescription: 'Check {path} on {target} before downloading and validating game files.',
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

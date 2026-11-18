export const shellPreviewMessages = {
  'zh-CN': {
    shellPreview: {
      badge: '交互预览 · 模拟数据',
      title: '单机 / 多机渐进展开对比',
      subtitle: '切换 S1–S4 部署场景，对比顶栏、侧栏、房间放置卡片与工作台减负效果（全程离线模拟，无真实请求）。',
      toggleLocale: 'English',
      toggleTheme: '切换主题',
      toggleSidebar: '折叠侧栏',
      roomStateLabel: '模拟房间状态',
      roomStopped: '已停止',
      roomRunning: '运行中',
      scenarios: {
        s1: 'S1 · 单机 2C4G',
        s2: 'S2 · 多台 All-in-One',
        s3: 'S3 · 控制机 + Agent',
        s4: 'S4 · 房间跨机拆分'
      },
      scenarioMeta: {
        s1: '一台 2 vCPU / 4 GiB 主机 · 主从双世界 · 多机控件收起，界面保持单行直接可控。',
        s2: '多台独立 All-in-One 纳管 · 同一行顶栏追加范围切换，控制端设置标注全局归属。',
        s3: '控制机 + 远程 Agent（当前聚焦远程节点）· 全局与单机作用域清晰区分。',
        s4: 'Master 在控制机、Caves 在远程 Agent · 放置卡片展开分片归属与直连路由。'
      },
      disclosureSummary: {
        label: 'Fleet Disclosure',
        single: '单机简洁模式 (mode=single)',
        fleet: '多机展开模式 (mode=fleet)',
        targets: '{count} 个运行目标',
        hiddenScope: '顶栏范围切换：已隐藏',
        shownScope: '顶栏范围切换：已追加',
        sidebarCompact: '侧栏多机入口：收进「更多」',
        sidebarExpanded: '侧栏多机入口：顶层展开'
      },
      mock: {
        roomName: '666777 · 荒野生存',
        roomMeta: 'Master + Caves · 2 个世界',
        cpuMem2c4g: 'CPU 18% · 内存 1.4 / 3.8 GiB',
        cpuMemAgent: 'CPU 42% · 内存 5.1 / 16.0 GiB',
        cpuMemAll: '2 节点合计 · 6.5 / 19.8 GiB',
        gameVersion: 'Build 750412',
        localHost: '本机 (All-in-One)',
        workerHost: 'aio-hk (All-in-One)',
        agentHost: 'tokyo-agent (Agent)',
        worker2Host: 'worker-2 (Agent)',
        defaultInstall: '默认安装',
        nativeInstall: 'native 安装',
        shardLinkLabel: '跨机分片互联',
        shardLinkRoute: 'Master ↔ Caves · 10.0.0.12:10888 (LAN)',
        controllerCardDesc: 'SMTP、备份保留与 UI 偏好作用于控制端，不随顶部机器筛选改变。',
        masterRole: '地上主世界 (Master)',
        cavesRole: '洞穴从世界 (Caves)',
        playersValue: '3 / 6 人',
        playersIdle: '0 / 6 人',
        dayValue: '第 142 天',
        seasonValue: '冬季 (8/15)',
        phaseValue: '黄昏',
        weatherValue: '2°C · 小雪',
        cycleValue: '5 分 12 秒',
        freshnessLive: '刚刚同步',
        connectionValue: '198.51.100.10:10999',
        bottomTabs: {
          console: '控制台',
          players: '玩家 (3)',
          logs: '日志',
          backups: '备份'
        },
        consoleSample: '[00:14:22]: [Shard] Master & Caves world ticks steady at 60 FPS.',
        playersSample: 'Wilson (管理员)、Willow、Wolfgang 在线，可执行便捷复活/踢出。',
        logsSample: '[Info] Auto-save completed cleanly without mod warnings.',
        backupsSample: '最近备份：今天 04:00 · 一键回档与跨机迁移就绪。'
      }
    }
  },
  'en-US': {
    shellPreview: {
      badge: 'Interactive Preview · Mock Data',
      title: 'Single-Host vs. Fleet Progressive Disclosure',
      subtitle: 'Switch between S1–S4 scenarios to compare header, sidebar, room placement card, and workspace simplification with zero live API calls.',
      toggleLocale: '简体中文',
      toggleTheme: 'Toggle theme',
      toggleSidebar: 'Toggle sidebar',
      roomStateLabel: 'Simulated room state',
      roomStopped: 'Stopped',
      roomRunning: 'Running',
      scenarios: {
        s1: 'S1 · Single 2C4G Host',
        s2: 'S2 · Multi All-in-One',
        s3: 'S3 · Controller + Agent',
        s4: 'S4 · Split-Machine Room'
      },
      scenarioMeta: {
        s1: 'One 2 vCPU / 4 GiB host · Master + Caves · Fleet controls stay tucked away on a clean single-row shell.',
        s2: 'Multiple All-in-One hosts managed centrally · Scope switcher appends inline; Controller settings keep their scope badge.',
        s3: 'Controller + remote Agent (focused on remote target) · Node scope and Controller-only settings stay distinct.',
        s4: 'Master on local host, Caves on remote Agent · Placement card shows per-world targets and verified shard link.'
      },
      disclosureSummary: {
        label: 'Fleet Disclosure',
        single: 'Single-host mode (mode=single)',
        fleet: 'Fleet mode (mode=fleet)',
        targets: '{count} runtime targets',
        hiddenScope: 'Header scope switcher: Hidden',
        shownScope: 'Header scope switcher: Inline',
        sidebarCompact: 'Fleet sidebar nav: Folded into More',
        sidebarExpanded: 'Fleet sidebar nav: Top-level'
      },
      mock: {
        roomName: '666777 · Survival',
        roomMeta: 'Master + Caves · 2 worlds',
        cpuMem2c4g: 'CPU 18% · RAM 1.4 / 3.8 GiB',
        cpuMemAgent: 'CPU 42% · RAM 5.1 / 16.0 GiB',
        cpuMemAll: '2 nodes · RAM 6.5 / 19.8 GiB',
        gameVersion: 'Build 750412',
        localHost: 'Local (All-in-One)',
        workerHost: 'aio-hk (All-in-One)',
        agentHost: 'tokyo-agent (Agent)',
        worker2Host: 'worker-2 (Agent)',
        defaultInstall: 'default install',
        nativeInstall: 'native install',
        shardLinkLabel: 'Cross-machine shard route',
        shardLinkRoute: 'Master ↔ Caves · 10.0.0.12:10888 (LAN)',
        controllerCardDesc: 'SMTP, retention, and UI preferences apply to the Controller and do not follow node filtering.',
        masterRole: 'Surface (Master)',
        cavesRole: 'Caves (Secondary)',
        playersValue: '3 / 6 online',
        playersIdle: '0 / 6 online',
        dayValue: 'Day 142',
        seasonValue: 'Winter (8/15)',
        phaseValue: 'Dusk',
        weatherValue: '2°C · Light snow',
        cycleValue: '5m 12s remaining',
        freshnessLive: 'Live sample',
        connectionValue: '198.51.100.10:10999',
        bottomTabs: {
          console: 'Console',
          players: 'Players (3)',
          logs: 'Logs',
          backups: 'Backups'
        },
        consoleSample: '[00:14:22]: [Shard] Master & Caves world ticks steady at 60 FPS.',
        playersSample: 'Wilson (Admin), Willow, and Wolfgang online with inline actions ready.',
        logsSample: '[Info] Auto-save completed cleanly without mod warnings.',
        backupsSample: 'Latest backup: Today 04:00 · Rollback & cross-machine migration ready.'
      }
    }
  }
}

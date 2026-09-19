export const roomTopologyMessages = {
  'zh-CN': {
    roomTopology: {
      trigger: '拓扑',
      title: '房间连接拓扑',
      description: '玩家从 Master 进入房间，从世界连接 Master。',
      refresh: '刷新拓扑',
      refreshing: '正在刷新拓扑',
      observedAt: '运行数据：{time}',
      noObservedAt: '暂无运行数据时间',
      configuredAt: '配置更新：{time}',
      summary: '{worlds} 个世界',
      modes: {
        singleMachine: '单机部署',
        multiInstallation: '同机多实例',
        distributed: '跨机器部署'
      },
      health: {
        healthy: '拓扑完整',
        warning: '配置待确认',
        error: '连接受阻',
        unavailable: '拓扑不可用'
      },
      lanes: {
        complete: '房间连接关系',
        room: '房间 · {room}'
      },
      nodes: {
        players: '玩家入口',
        playersDescription: '外部玩家连接 Master',
        master: '主世界',
        secondary: '从世界'
      },
      fields: {
        endpoint: '连接地址',
        machine: '运行机器',
        worldType: '世界类型',
        shardId: 'Shard ID',
        installation: '游戏服务端',
        playerPort: '玩家端口',
        shardPort: 'Shard 端口',
        worldPort: '世界端口',
        route: '互联线路',
        placement: '运行位置',
        protocol: 'UDP',
        instanceId: '安装实例 ID：{id}',
        pendingTarget: '计划迁移至 {machine}'
      },
      worldTypes: {
        forest: '森林',
        cave: '洞穴',
        unknown: '未知'
      },
      installations: {
        default: '默认游戏服务端',
        native: '裸机游戏服务端',
        container: 'Docker 游戏服务端',
        registered: '已登记游戏服务端',
        unknown: '未识别游戏服务端'
      },
      routes: {
        local: '同机互联',
        lan: '局域网',
        overlay: '虚拟组网',
        tunnel: '内网穿透',
        public: '公网',
        configured: '已配置地址',
        manual: '自定义线路',
        missing: '未配置线路',
        toMaster: '连接 Master',
        destination: '连接 Master：{endpoint}',
        localDestination: '通过同机网络连接 Master',
        unavailable: '尚未选择可用的 Master 互联地址'
      },
      entrySources: {
        configured: '已配置 · 未验证',
        detected: '出口地址 · 未验证',
        lan: '内网地址 · 未验证',
        draft: '预览地址 · 未保存',
        panel: '面板地址 · 未验证',
        local: '本机地址 · 仅本机',
        missing: '未配置玩家入口'
      },
      runtime: {
        running: '运行中',
        stopped: '已停止',
        starting: '启动中',
        failed: '启动失败',
        unknown: '状态未知'
      },
      placement: {
        aligned: '位置一致',
        planned: '等待迁移',
        target_offline: '机器离线',
        inventory_stale: '清单已过期',
        inventory_missing: '清单缺失',
        shard_missing: '世界未投放',
        conflict: '资源冲突',
        unknown: '位置未知'
      },
      issues: {
        title: '{count} 个连接问题',
        description: '拓扑中的异常会直接影响玩家进入或世界间连接。',
        noticeTitle: '{count} 个配置提醒',
        noticeDescription: '这些提醒描述运行目标、清单或待投放文件，不代表线路已经中断。',
        riskTitle: '{count} 个运行风险',
        riskDescription: '这些资源风险不会改变连接拓扑，但可能影响世界启动或稳定性。',
        masterMissing: '当前房间没有可识别的 Master 世界。',
        masterMultiple: '当前房间存在 {count} 个 Master 世界；启动前必须只保留一个主分片。',
        playerEntryMissing: '尚未配置可用的玩家连接地址。',
        targetUnassigned: '世界“{world}”尚未分配运行机器。',
        targetOffline: '世界“{world}”所在机器“{machine}”当前离线。',
        installationUnavailable: '世界“{world}”使用的游戏服务端清单不可用或已经过期。',
        shardLinkMissing: 'Secondary 世界“{world}”没有到 Master 的互联线路。'
      },
      feedback: {
        refreshFailed: '拓扑刷新失败：{error}'
      }
    }
  },
  'en-US': {
    roomTopology: {
      trigger: 'Topology',
      title: 'Room connection topology',
      description: 'Players join through Master; secondary worlds connect to Master.',
      refresh: 'Refresh topology',
      refreshing: 'Refreshing topology',
      observedAt: 'Runtime data: {time}',
      noObservedAt: 'No runtime observation time available',
      configuredAt: 'Configuration updated: {time}',
      summary: '{worlds} worlds',
      modes: {
        singleMachine: 'Single machine',
        multiInstallation: 'Multiple local installations',
        distributed: 'Distributed room'
      },
      health: {
        healthy: 'Topology complete',
        warning: 'Configuration review',
        error: 'Connection blocked',
        unavailable: 'Topology unavailable'
      },
      lanes: {
        complete: 'Room connection map',
        room: 'Room · {room}'
      },
      nodes: {
        players: 'Player entry',
        playersDescription: 'External players connect to Master',
        master: 'Master shard',
        secondary: 'Secondary shard'
      },
      fields: {
        endpoint: 'Endpoint',
        machine: 'Runtime machine',
        worldType: 'World type',
        shardId: 'Shard ID',
        installation: 'Game server',
        playerPort: 'Player port',
        shardPort: 'Shard port',
        worldPort: 'World port',
        route: 'Shard route',
        placement: 'Runtime placement',
        protocol: 'UDP',
        instanceId: 'Installation ID: {id}',
        pendingTarget: 'Planned move to {machine}'
      },
      worldTypes: {
        forest: 'Forest',
        cave: 'Caves',
        unknown: 'Unknown'
      },
      installations: {
        default: 'Default game server',
        native: 'Native game server',
        container: 'Docker game server',
        registered: 'Registered game server',
        unknown: 'Unknown game server'
      },
      routes: {
        local: 'Same machine',
        lan: 'LAN',
        overlay: 'Overlay network',
        tunnel: 'Tunnel',
        public: 'Public network',
        configured: 'Configured endpoint',
        manual: 'Custom route',
        missing: 'Route not configured',
        toMaster: 'Connects to Master',
        destination: 'Connects to Master at {endpoint}',
        localDestination: 'Connects to Master over the local machine network',
        unavailable: 'No usable Master interconnect endpoint is selected'
      },
      entrySources: {
        configured: 'Configured · unverified',
        detected: 'Egress address · unverified',
        lan: 'LAN address · unverified',
        draft: 'Preview · unsaved',
        panel: 'Panel address · unverified',
        local: 'Local address · this host only',
        missing: 'Player entry not configured'
      },
      runtime: {
        running: 'Running',
        stopped: 'Stopped',
        starting: 'Starting',
        failed: 'Start failed',
        unknown: 'Unknown state'
      },
      placement: {
        aligned: 'Placement aligned',
        planned: 'Migration pending',
        target_offline: 'Machine offline',
        inventory_stale: 'Inventory stale',
        inventory_missing: 'Inventory missing',
        shard_missing: 'World not provisioned',
        conflict: 'Resource conflict',
        unknown: 'Placement unknown'
      },
      issues: {
        title: '{count} connection issues',
        description: 'These topology problems can prevent player access or links between worlds.',
        noticeTitle: '{count} configuration notices',
        noticeDescription: 'These notices describe runtime targets, inventory, or pending files and do not necessarily mean a broken route.',
        riskTitle: '{count} runtime risks',
        riskDescription: 'These resource risks do not change the connection topology, but may affect startup or stability.',
        masterMissing: 'No Master world can be identified for this room.',
        masterMultiple: 'This room has {count} Master worlds; exactly one must remain before startup.',
        playerEntryMissing: 'No usable player connection endpoint is configured.',
        targetUnassigned: 'World “{world}” has no runtime machine assigned.',
        targetOffline: 'Machine “{machine}” hosting world “{world}” is offline.',
        installationUnavailable: 'The game-server inventory used by world “{world}” is unavailable or stale.',
        shardLinkMissing: 'Secondary world “{world}” has no route to Master.'
      },
      feedback: {
        refreshFailed: 'Failed to refresh topology: {error}'
      }
    }
  }
}

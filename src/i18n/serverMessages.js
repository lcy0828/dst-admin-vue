export const serverMessages = {
  'zh-CN': {
    runtimeData: {
      noObservation: '暂无采集时间',
      freshness: { live: '实时', delayed: '数据延迟', stopped: '停服前数据', unavailable: '暂无数据' },
      descriptions: {
        live: '分片正在运行，数据在两分钟内更新。',
        delayed: '分片正在启动，或运行中的数据已超过两分钟未更新。',
        stopped: '分片已停止，显示的是停服前最后一次有效数据。',
        unavailable: '当前没有世界状态快照，或暂时无法确认分片运行状态。'
      }
    },
    runtimeAudit: {
      unexpectedExit: '上次异常退出',
      defaultMessage: '未发现对应的停止、重启或清理请求，分片会话已消失。',
      source: '来源：{source}',
      sources: { api: 'Web 操作', automation: '自动化', game_update: '游戏更新', system_monitor: '系统监测', external: '外部或未知' },
      history: {
        title: '运行事件',
        description: '记录启动、停止、清理和进程退出的来源，便于追查异常退出。',
        refresh: '刷新运行事件',
        loadFailed: '运行事件读取失败',
        empty: '暂无运行事件',
        emptyDescription: '从现在起发生的启动、停止和异常退出会记录在这里。',
        columns: { time: '时间', world: '世界', event: '事件', source: '来源', transition: '状态变化', context: '世界与来源', lifecycle: '事件与状态', reason: '原因', trace: '关联记录' },
        events: {
          start_requested: '请求启动', stop_requested: '请求停止', restart_requested: '请求重启', cleanup_requested: '请求清理',
          session_started: '会话已创建', running: '运行就绪', failed: '启动失败', stopped: '正常退出', unexpected_exit: '异常退出', unknown: '未知事件'
        },
        states: { stopped: '已停止', starting: '启动中', running: '运行中', failed: '启动失败', stopping: '停止中', unknown: '未知' },
        job: '任务',
        request: '请求'
      }
    },
    servers: {
      list: {
        title: '服务器状态',
        subtitle: '监控当前运行目标中的世界分片，并执行启动或停止操作。',
        filters: {
          title: '筛选范围',
          description: '按运行状态、房间和世界类型缩小结果。',
          allShards: '全部分片',
          running: '运行中',
          stopped: '已停止',
          failed: '启动失败',
          roomPlaceholder: '按存档筛选',
          allRooms: '全部存档',
          typePlaceholder: '按类型筛选',
          allTypes: '全部类型',
          forest: '森林服务器',
          cave: '洞穴服务器'
        },
        shards: {
          title: '世界分片',
          description: '状态来自当前选择的本机或远程运行目标。',
          loadFailed: '服务器状态读取失败',
          loadingAria: '正在读取服务器状态',
          columns: {
            name: '服务器名称',
            day: '天数',
            season: '季节',
            target: '运行目标',
            actions: '操作'
          },
          unavailable: '当前分片状态不可控制',
          cleanup: '清理会话',
          configure: '配置',
          configureDisabled: '请先停止或清理该分片',
          empty: '暂无服务器数据',
          emptyDescription: '创建房间后，可以在这里启动和监控服务器。',
          createRoom: '创建新房间',
          startRoom: '启动现有房间'
        },
        startDialog: {
          title: '选择并启动房间',
          description: '选择当前运行目标中的房间和真实世界分片。',
          room: '选择房间',
          roomPlaceholder: '请选择房间',
          worlds: '选择世界',
          worldsDescription: '已运行或当前目标不可控制的分片不会重复启动。',
          submit: '启动所选分片'
        },
        worldTypes: {
          forest: '森林',
          cave: '洞穴',
          custom: '自定义'
        },
        seasons: {
          autumn: '秋季',
          winter: '冬季',
          spring: '春季',
          summer: '夏季'
        },
        targets: {
          local: '本机',
          remote: '{name}（远程）'
        },
        feedback: {
          refreshed: '服务器状态已刷新',
          loadFailed: '无法读取当前运行目标的服务器状态',
          selectRoom: '请选择房间',
          selectWorld: '请至少选择一个世界',
          selectedWorldUnavailable: '所选世界已运行或当前目标不可控制',
          roomStarted: '启动完成',
          roomStartFailed: '启动失败：{error}',
          actionConfirm: '确定要{action}“{room} / {world}”吗？',
          actionTitle: '{action}服务器',
          actionButton: '确认{action}',
          actionCanceled: '已取消{action}',
          actionCompleted: '{action}完成',
          actionFailed: '{action}失败：{error}',
          cleanupUnavailable: '当前分片没有可清理的失败会话',
          cleanupConfirm: '确定要停止并清理“{room} / {world}”的失败会话吗？',
          cleanupTitle: '清理失败会话',
          cleanupButton: '确认清理',
          cleanupSucceeded: '失败会话已清理',
          cleanupFailed: '清理失败：{error}'
        }
      },
      workspace: {
        kicker: '当前房间',
        title: '房间控制',
        dashboardTitle: '房间与分片',
        roomSummary: '{name} · {count} 个世界',
        noRoomSelected: '尚未选择房间',
        roomSelect: '选择房间',
        refresh: '刷新工作台',
        reload: '重新加载',
        actions: {
          all: '全部',
          start: '启动',
          stop: '停止',
          restart: '重启',
          cleanup: '清理失败会话'
        },
        units: {
          players: '人'
        },
        states: {
          readFailed: '读取失败',
          noRecords: '暂无记录',
          unavailable: '不可用',
          available: '可用',
          notSelected: '未选择',
          dataReadFailed: '数据读取失败',
          statusUnavailable: '状态不可用',
          listReadFailed: '列表读取失败'
        },
        empty: {
          noRooms: '当前目标没有已接管的房间',
          openRooms: '前往房间管理',
          noWorlds: '当前房间没有世界',
          selectWorld: '请选择世界'
        },
        overview: {
          label: '服务器概况',
          worldStatus: '世界状态',
          runningShards: '{count} 个分片运行中',
          onlinePlayers: '在线玩家',
          totalPlayers: '共 {count} 人',
          attentionWorlds: '异常世界',
          attentionCount: '{count} 个'
        },
        backups: {
          latest: '最近备份',
          creating: '正在创建',
          create: '创建备份',
          recordCount: '{count} 个记录',
          loadFailed: '备份列表读取失败',
          empty: '暂无备份记录',
          emptyDescription: '创建房间备份后会显示在这里。'
        },
        worlds: {
          title: '世界与分片',
          description: '当前房间的分片列表',
          roomSettings: '房间设置',
          startAll: '全部启动',
          stopAll: '全部停止',
          directoryUnset: '未设置目录',
          day: '天数',
          dayValue: '第 {count} 天',
          season: '季节',
          seasonProgress: '{world}季节进度 {progress}',
          phase: '昼夜',
          phaseProgress: '{world}当前时段进度 {progress}',
          weather: '天气 / 温度',
          temperatureValue: '{value} °C',
          moon: '月相',
          nightmare: '梦魇周期',
          players: '玩家',
          onlinePlayerCount: '{count} 人在线',
          dataTime: '数据时间',
          control: '控制',
          cleanupFailedSession: '清理失败会话',
          restart: '重启世界',
          configure: '世界配置',
          actionLabel: '{action}世界',
          roles: {
            forest: '森林世界',
            cave: '洞穴世界',
            custom: '自定义世界'
          }
        },
        operations: {
          title: '运行控制',
          description: '查看当前分片日志、房间聊天记录，或向选定世界发送控制台命令。',
          liveLogs: '实时日志',
          chatLogs: '聊天记录',
          shardLogs: '分片日志'
        },
        chat: {
          title: '聊天记录',
          search: '搜索聊天记录',
          searchPlaceholder: '搜索玩家、KU ID 或聊天内容',
          searchAction: '搜索',
          refresh: '刷新聊天记录',
          kindFilter: '按消息类型筛选',
          worldFilter: '按世界筛选',
          allKinds: '全部类型',
          allWorlds: '全部世界',
          kinds: { say: '发言', whisper: '私聊', announcement: '事件' },
          announcements: { join: '加入', leave: '离开', death: '死亡', resurrect: '复活', vote: '投票', skin: '皮肤' },
          columns: { realTime: '真实时间', runtime: '运行时间', kind: '类型', player: '玩家', content: '内容', source: '来源' },
          system: '系统',
          unknownSource: '未知世界',
          total: '共 {count} 条',
          kindCount: '{kind} {count}',
          startedAt: '启动于 {time}',
          updatedAt: '更新于 {time}',
          realTimeUnavailable: '真实时间不可用',
          loading: '正在读取聊天记录',
          loadFailed: '聊天记录读取失败',
          retry: '重试',
          partialTitle: '部分世界记录不可用',
          partialDescription: '有 {count} 个世界暂时无法读取，当前结果仍可查看。',
          truncatedTitle: '记录已截取',
          truncatedDescription: '当前显示日志文件最近的记录。',
          empty: '暂无聊天记录',
          emptyDescription: '当前筛选条件下没有记录。',
          range: '第 {start}-{end} 条，共 {total} 条',
          previous: '上一页',
          next: '下一页'
        },
        console: {
          title: '控制台',
          loading: '正在加载控制台...',
          selectTarget: '选择控制台目标世界',
          selectWorld: '选择目标世界',
          commandManager: '命令管理',
          unavailable: '控制台不可用',
          placeholder: '输入 Lua 控制台命令',
          commandAria: 'Lua 控制台命令',
          target: '目标：{name}',
          execute: '执行',
          sent: '命令已发送',
          failed: '命令执行失败',
          sentDescription: '命令已发送到分片控制台',
          sendFailed: '命令发送失败',
          runRecord: '运行记录 {id}',
          confirmDescription: '该操作会向分片发送 Lua 命令，请输入房间名“{room}”确认',
          confirmTitle: '执行确认',
          confirmExecute: '确认执行',
          roomMismatch: '房间名不匹配',
          commonCommands: {
            title: '常用命令',
            save: '保存世界',
            players: '查看在线玩家',
            day: '查看世界天数',
            season: '查看当前季节',
            announce: '发送公告'
          }
        },
        context: {
          title: '房间概况',
          description: '当前房间的玩家、备份和快捷入口',
          loading: '正在加载房间信息...'
        },
        players: {
          title: '玩家',
          onlineCount: '{count} 人在线',
          presenceSummary: '{online} 人在线 · {stale} 人状态已过期',
          unknownWorld: '未知世界',
          loadFailed: '玩家数据读取失败',
          empty: '暂无玩家记录',
          emptyDescription: '玩家加入房间后会显示在这里。',
          unknownCharacter: '未知角色',
          characters: {
            wilson: '威尔逊',
            willow: '薇洛',
            wolfgang: '沃尔夫冈',
            wendy: '温蒂',
            wx78: 'WX-78',
            wickerbottom: '薇克巴顿',
            woodie: '伍迪',
            wes: '韦斯',
            waxwell: '麦斯威尔',
            wathgrithr: '薇格弗德',
            webber: '韦伯',
            winona: '薇诺娜',
            wortox: '沃拓克斯',
            wormwood: '沃姆伍德',
            warly: '沃利',
            wurt: '沃特',
            walter: '沃尔特',
            wanda: '旺达',
            wonkey: '芜猴'
          }
        },
        quickNav: {
          title: '快捷入口',
          description: '打开当前房间的常用管理页面。',
          label: '服务器快捷入口',
          players: '玩家管理',
          mods: '模组管理',
          worldState: '世界状态',
          logQuery: '日志查询'
        },
        feedback: {
          loadFailedTitle: '工作台加载失败',
          loadFailed: '无法读取房间和世界状态',
          playersLoadFailed: '玩家数据读取失败',
          backupsLoadFailed: '备份列表读取失败',
          consoleTargetsLoadFailed: '控制台目标读取失败',
          worldStatesLoadFailed: '世界状态快照读取失败',
          actionUnavailable: '当前世界状态不可执行该操作',
          actionTitle: '{action}世界',
          actionConfirm: '确定要{action}“{room} / {world}”吗？',
          actionButton: '确认{action}',
          cleanupButton: '确认清理',
          actionSubmitted: '已提交 {world} 的{action}任务',
          actionCompleted: '{action}完成',
          actionFailed: '{action}失败：{error}',
          roomActionUnavailable: '当前房间没有可执行该操作的世界',
          roomActionTitle: '{action}整个房间',
          roomActionConfirm: '确定要{action}“{room}”中的 {count} 个世界吗？',
          roomActionButton: '确认全部{action}',
          roomActionSubmitted: '已提交 {count} 个世界的{action}任务',
          roomActionCompleted: '房间全部{action}完成',
          roomActionFailed: '房间{action}失败：{error}',
          backupCreated: '备份已创建',
          backupCreateFailed: '创建备份失败：{error}',
          errorWithDetail: '{message}：{detail}'
        }
      },
      liveLogs: {
        fields: {
          room: '房间',
          world: '世界',
          selectRoom: '选择房间',
          selectWorld: '选择世界',
          follow: '实时跟随',
          autoScroll: '自动滚动',
          timeDisplay: '时间显示',
          timeDisplayPlaceholder: '选择时间显示方式',
          timeModes: { wallclock: '真实时间', runtime: '运行时长' },
          autoScrollLatest: '自动滚动到最新日志',
          search: '搜索日志'
        },
        actions: {
          download: '下载日志',
          close: '关闭',
          reconnect: '重新连接',
          clear: '清空当前显示'
        },
        terminal: {
          defaultTitle: '世界日志',
          states: {
            idle: '待选择',
            connecting: '连接中',
            reconnecting: '重连中',
            connected: '实时',
            paused: '已暂停',
            error: '已断开',
            unknown: '未知'
          },
          selectTarget: '请选择房间和世界以查看日志',
          loading: '正在读取日志...',
          noWorlds: '当前房间没有可用世界',
          archiveLoadFailed: '获取房间列表失败',
          loadFailed: '日志读取失败',
          rotated: '日志文件已轮转：{file}',
          reconnecting: '日志流暂时中断，正在自动重连',
          snapshot: '{file} · {count} 行',
          systemPrefix: '[系统]',
          errorPrefix: '[错误]'
        },
        viewer: {
          defaultTitle: '服务器日志',
          streamFailed: '日志流连接失败',
          empty: '暂无日志记录',
          emptyDescription: '日志流连接后，新日志会显示在这里。',
          connecting: '正在连接日志流...',
          loadedLines: '已加载 {count} 行日志'
        },
        feedback: {
          roomNotFound: '未找到房间：{room}',
          worldNotFound: '未找到世界：{world}',
          targetRequired: '未指定存档或世界',
          streamUnavailable: '无法创建日志流连接',
          readFailed: '读取日志失败：{error}',
          reconnecting: '日志流暂时中断，正在自动重连。',
          downloadStarted: '日志下载已开始',
          downloadFailed: '下载日志失败：{error}'
        }
      }
    }
  },
  'en-US': {
    runtimeData: {
      noObservation: 'No observation time',
      freshness: { live: 'Live', delayed: 'Delayed', stopped: 'Pre-stop data', unavailable: 'No data' },
      descriptions: {
        live: 'The shard is running and this data was updated within two minutes.',
        delayed: 'The shard is starting, or its running data has not updated for more than two minutes.',
        stopped: 'The shard is stopped. This is the last valid snapshot before it stopped.',
        unavailable: 'No world-state snapshot is available, or the shard runtime state cannot currently be confirmed.'
      }
    },
    runtimeAudit: {
      unexpectedExit: 'Last exit unexpected',
      defaultMessage: 'The shard session disappeared without a matching stop, restart, or cleanup request.',
      source: 'Source: {source}',
      sources: { api: 'Web action', automation: 'Automation', game_update: 'Game update', system_monitor: 'System monitor', external: 'External or unknown' },
      history: {
        title: 'Runtime events',
        description: 'Audit the source of start, stop, cleanup, and process-exit events.',
        refresh: 'Refresh runtime events',
        loadFailed: 'Could not load runtime events',
        empty: 'No runtime events',
        emptyDescription: 'Start, stop, and unexpected-exit events occurring from now on will appear here.',
        columns: { time: 'Time', world: 'World', event: 'Event', source: 'Source', transition: 'State change', context: 'World and source', lifecycle: 'Event and state', reason: 'Reason', trace: 'Trace' },
        events: {
          start_requested: 'Start requested', stop_requested: 'Stop requested', restart_requested: 'Restart requested', cleanup_requested: 'Cleanup requested',
          session_started: 'Session created', running: 'Runtime ready', failed: 'Startup failed', stopped: 'Expected exit', unexpected_exit: 'Unexpected exit', unknown: 'Unknown event'
        },
        states: { stopped: 'Stopped', starting: 'Starting', running: 'Running', failed: 'Startup failed', stopping: 'Stopping', unknown: 'Unknown' },
        job: 'Job',
        request: 'Request'
      }
    },
    servers: {
      list: {
        title: 'Server status',
        subtitle: 'Monitor world shards on the active runtime target and start or stop them.',
        filters: {
          title: 'Filter scope',
          description: 'Narrow results by runtime status, room, and world type.',
          allShards: 'All shards',
          running: 'Running',
          stopped: 'Stopped',
          failed: 'Start failed',
          roomPlaceholder: 'Filter by archive',
          allRooms: 'All archives',
          typePlaceholder: 'Filter by type',
          allTypes: 'All types',
          forest: 'Forest servers',
          cave: 'Cave servers'
        },
        shards: {
          title: 'World shards',
          description: 'Status comes from the currently selected local or remote runtime target.',
          loadFailed: 'Failed to load server status',
          loadingAria: 'Loading server status',
          columns: {
            name: 'Server name',
            day: 'Day',
            season: 'Season',
            target: 'Runtime target',
            actions: 'Actions'
          },
          unavailable: 'This shard cannot be controlled in its current state',
          cleanup: 'Clean up session',
          configure: 'Configure',
          configureDisabled: 'Stop or clean up this shard first',
          empty: 'No server data',
          emptyDescription: 'Create a room to start and monitor its servers here.',
          createRoom: 'Create room',
          startRoom: 'Start existing room'
        },
        startDialog: {
          title: 'Select and start a room',
          description: 'Select a room and its real world shards on the active runtime target.',
          room: 'Select room',
          roomPlaceholder: 'Select a room',
          worlds: 'Select worlds',
          worldsDescription: 'Running shards and shards that cannot be controlled on the current target will not be started again.',
          submit: 'Start selected shards'
        },
        worldTypes: {
          forest: 'Forest',
          cave: 'Caves',
          custom: 'Custom'
        },
        seasons: {
          autumn: 'Autumn',
          winter: 'Winter',
          spring: 'Spring',
          summer: 'Summer'
        },
        targets: {
          local: 'Local',
          remote: '{name} (Remote)'
        },
        feedback: {
          refreshed: 'Server status refreshed',
          loadFailed: 'Unable to load server status from the active runtime target',
          selectRoom: 'Select a room',
          selectWorld: 'Select at least one world',
          selectedWorldUnavailable: 'The selected worlds are already running or cannot be controlled on the active target',
          roomStarted: 'Start completed',
          roomStartFailed: 'Start failed: {error}',
          actionConfirm: '{action} “{room} / {world}”?',
          actionTitle: '{action} server',
          actionButton: 'Confirm {action}',
          actionCanceled: '{action} canceled',
          actionCompleted: '{action} complete',
          actionFailed: '{action} failed: {error}',
          cleanupUnavailable: 'This shard has no failed session to clean up',
          cleanupConfirm: 'Stop and clean up the failed session for “{room} / {world}”?',
          cleanupTitle: 'Clean up failed session',
          cleanupButton: 'Clean up',
          cleanupSucceeded: 'Failed session cleaned up',
          cleanupFailed: 'Cleanup failed: {error}'
        }
      },
      workspace: {
        kicker: 'Current room',
        title: 'Room control',
        dashboardTitle: 'Rooms and shards',
        roomSummary: '{name} · {count} worlds',
        noRoomSelected: 'No room selected',
        roomSelect: 'Select a room',
        refresh: 'Refresh workspace',
        reload: 'Reload',
        actions: {
          all: 'All',
          start: 'Start',
          stop: 'Stop',
          restart: 'Restart',
          cleanup: 'Clean up failed session'
        },
        units: {
          players: 'players'
        },
        states: {
          readFailed: 'Failed to read',
          noRecords: 'No records',
          unavailable: 'Unavailable',
          available: 'Available',
          notSelected: 'Not selected',
          dataReadFailed: 'Failed to read data',
          statusUnavailable: 'Status unavailable',
          listReadFailed: 'Failed to read list'
        },
        empty: {
          noRooms: 'No managed rooms on the current target',
          openRooms: 'Open room management',
          noWorlds: 'This room has no worlds',
          selectWorld: 'Select a world'
        },
        overview: {
          label: 'Server overview',
          worldStatus: 'World status',
          runningShards: '{count} shards running',
          onlinePlayers: 'Online players',
          totalPlayers: '{count} players total',
          attentionWorlds: 'Worlds needing attention',
          attentionCount: '{count}'
        },
        backups: {
          latest: 'Latest backup',
          creating: 'Creating',
          create: 'Create backup',
          recordCount: '{count} records',
          loadFailed: 'Failed to load backups',
          empty: 'No backups',
          emptyDescription: 'Room backups will appear here after they are created.'
        },
        worlds: {
          title: 'Worlds and shards',
          description: 'Shards in the current room',
          roomSettings: 'Room settings',
          startAll: 'Start all',
          stopAll: 'Stop all',
          directoryUnset: 'Directory not set',
          day: 'Day',
          dayValue: 'Day {count}',
          season: 'Season',
          seasonProgress: '{world} season progress {progress}',
          phase: 'Day cycle',
          phaseProgress: '{world} phase progress {progress}',
          weather: 'Weather / temperature',
          temperatureValue: '{value} °C',
          moon: 'Moon phase',
          nightmare: 'Nightmare cycle',
          players: 'Players',
          onlinePlayerCount: '{count} online',
          dataTime: 'Data time',
          control: 'Control',
          cleanupFailedSession: 'Clean up failed session',
          restart: 'Restart world',
          configure: 'Configure world',
          actionLabel: '{action} world',
          roles: {
            forest: 'Forest world',
            cave: 'Caves world',
            custom: 'Custom world'
          }
        },
        operations: {
          title: 'Runtime control',
          description: 'View shard logs and room chat, or send a console command to the selected world.',
          liveLogs: 'Live logs',
          chatLogs: 'Chat history',
          shardLogs: 'Shard logs'
        },
        chat: {
          title: 'Chat history',
          search: 'Search chat history',
          searchPlaceholder: 'Search player, KU ID, or message',
          searchAction: 'Search',
          refresh: 'Refresh chat history',
          kindFilter: 'Filter by message type',
          worldFilter: 'Filter by world',
          allKinds: 'All types',
          allWorlds: 'All worlds',
          kinds: { say: 'Chat', whisper: 'Whisper', announcement: 'Event' },
          announcements: { join: 'Joined', leave: 'Left', death: 'Death', resurrect: 'Resurrected', vote: 'Vote', skin: 'Skin' },
          columns: { realTime: 'Real time', runtime: 'Runtime', kind: 'Type', player: 'Player', content: 'Message', source: 'Source' },
          system: 'System',
          unknownSource: 'Unknown world',
          total: '{count} records',
          kindCount: '{kind} {count}',
          startedAt: 'Started {time}',
          updatedAt: 'Updated {time}',
          realTimeUnavailable: 'Real time unavailable',
          loading: 'Loading chat history',
          loadFailed: 'Failed to load chat history',
          retry: 'Retry',
          partialTitle: 'Some world records are unavailable',
          partialDescription: '{count} worlds could not be read. Available records are still shown.',
          truncatedTitle: 'Records truncated',
          truncatedDescription: 'Showing the most recent records from the log files.',
          empty: 'No chat records',
          emptyDescription: 'No records match the current filters.',
          range: '{start}-{end} of {total}',
          previous: 'Previous',
          next: 'Next'
        },
        console: {
          title: 'Console',
          loading: 'Loading console...',
          selectTarget: 'Select a console target world',
          selectWorld: 'Select a target world',
          commandManager: 'Command management',
          unavailable: 'Console unavailable',
          placeholder: 'Enter a Lua console command',
          commandAria: 'Lua console command',
          target: 'Target: {name}',
          execute: 'Execute',
          sent: 'Command sent',
          failed: 'Command failed',
          sentDescription: 'The command was sent to the shard console',
          sendFailed: 'Failed to send command',
          runRecord: 'Run record {id}',
          confirmDescription: 'This sends a Lua command to the shard. Enter the room name “{room}” to confirm.',
          confirmTitle: 'Confirm execution',
          confirmExecute: 'Execute command',
          roomMismatch: 'Room name does not match',
          commonCommands: {
            title: 'Common commands',
            save: 'Save world',
            players: 'List online players',
            day: 'Show world day',
            season: 'Show current season',
            announce: 'Send announcement'
          }
        },
        context: {
          title: 'Room context',
          description: 'Players, backups, and quick links for the current room',
          loading: 'Loading room details...'
        },
        players: {
          title: 'Players',
          onlineCount: '{count} online',
          presenceSummary: '{online} online · {stale} stale',
          unknownWorld: 'Unknown world',
          loadFailed: 'Failed to load players',
          empty: 'No player records',
          emptyDescription: 'Players will appear here after they join the room.',
          unknownCharacter: 'Unknown character',
          characters: {
            wilson: 'Wilson',
            willow: 'Willow',
            wolfgang: 'Wolfgang',
            wendy: 'Wendy',
            wx78: 'WX-78',
            wickerbottom: 'Wickerbottom',
            woodie: 'Woodie',
            wes: 'Wes',
            waxwell: 'Maxwell',
            wathgrithr: 'Wigfrid',
            webber: 'Webber',
            winona: 'Winona',
            wortox: 'Wortox',
            wormwood: 'Wormwood',
            warly: 'Warly',
            wurt: 'Wurt',
            walter: 'Walter',
            wanda: 'Wanda',
            wonkey: 'Wonkey'
          }
        },
        quickNav: {
          title: 'Quick links',
          description: 'Open common management pages for the current room.',
          label: 'Server quick links',
          players: 'Players',
          mods: 'Mods',
          worldState: 'World state',
          logQuery: 'Log query'
        },
        feedback: {
          loadFailedTitle: 'Failed to load workspace',
          loadFailed: 'Unable to load room and world status',
          playersLoadFailed: 'Failed to load player data',
          backupsLoadFailed: 'Failed to load backups',
          consoleTargetsLoadFailed: 'Failed to load console targets',
          worldStatesLoadFailed: 'Failed to load world state snapshots',
          actionUnavailable: 'This action is unavailable in the current world state',
          actionTitle: '{action} world',
          actionConfirm: '{action} “{room} / {world}”?',
          actionButton: 'Confirm {action}',
          cleanupButton: 'Clean up',
          actionSubmitted: '{action} requested for {world}',
          actionCompleted: '{action} complete',
          actionFailed: '{action} failed: {error}',
          roomActionUnavailable: 'No world in this room can perform this action',
          roomActionTitle: '{action} entire room',
          roomActionConfirm: '{action} {count} worlds in “{room}”?',
          roomActionButton: 'Confirm {action} all',
          roomActionSubmitted: '{action} requested for {count} worlds',
          roomActionCompleted: 'Room {action} complete',
          roomActionFailed: 'Room {action} failed: {error}',
          backupCreated: 'Backup created',
          backupCreateFailed: 'Failed to create backup: {error}',
          errorWithDetail: '{message}: {detail}'
        }
      },
      liveLogs: {
        fields: {
          room: 'Room',
          world: 'World',
          selectRoom: 'Select a room',
          selectWorld: 'Select a world',
          follow: 'Follow live',
          autoScroll: 'Auto-scroll',
          timeDisplay: 'Time display',
          timeDisplayPlaceholder: 'Select time display',
          timeModes: { wallclock: 'Real time', runtime: 'Runtime' },
          autoScrollLatest: 'Scroll to the latest log automatically',
          search: 'Search logs'
        },
        actions: {
          download: 'Download logs',
          close: 'Close',
          reconnect: 'Reconnect',
          clear: 'Clear current display'
        },
        terminal: {
          defaultTitle: 'World logs',
          states: {
            idle: 'Select a world',
            connecting: 'Connecting',
            reconnecting: 'Reconnecting',
            connected: 'Live',
            paused: 'Paused',
            error: 'Disconnected',
            unknown: 'Unknown'
          },
          selectTarget: 'Select a room and world to view logs',
          loading: 'Reading logs...',
          noWorlds: 'This room has no available worlds',
          archiveLoadFailed: 'Failed to load rooms',
          loadFailed: 'Failed to read logs',
          rotated: 'Log file rotated: {file}',
          reconnecting: 'The log stream was interrupted and is reconnecting automatically',
          snapshot: '{file} · {count} lines',
          systemPrefix: '[System]',
          errorPrefix: '[Error]'
        },
        viewer: {
          defaultTitle: 'Server logs',
          streamFailed: 'Log stream connection failed',
          empty: 'No log entries',
          emptyDescription: 'New entries will appear here after the log stream connects.',
          connecting: 'Connecting to the log stream...',
          loadedLines: '{count} log lines loaded'
        },
        feedback: {
          roomNotFound: 'Room not found: {room}',
          worldNotFound: 'World not found: {world}',
          targetRequired: 'No archive or world was specified',
          streamUnavailable: 'Unable to create the log stream connection',
          readFailed: 'Failed to read logs: {error}',
          reconnecting: 'The log stream was interrupted and is reconnecting automatically.',
          downloadStarted: 'Log download started',
          downloadFailed: 'Failed to download logs: {error}'
        }
      }
    }
  }
}

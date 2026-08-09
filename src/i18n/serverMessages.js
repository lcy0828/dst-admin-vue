export const serverMessages = {
  'zh-CN': {
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
      liveLogs: {
        fields: {
          room: '房间',
          world: '世界',
          selectRoom: '选择房间',
          selectWorld: '选择世界',
          follow: '实时跟随',
          autoScroll: '自动滚动',
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
      liveLogs: {
        fields: {
          room: 'Room',
          world: 'World',
          selectRoom: 'Select a room',
          selectWorld: 'Select a world',
          follow: 'Follow live',
          autoScroll: 'Auto-scroll',
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

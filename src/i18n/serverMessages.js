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
      }
    }
  }
}

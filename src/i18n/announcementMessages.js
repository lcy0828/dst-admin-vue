export const announcementMessages = {
  'zh-CN': {
    announcements: {
      title: '游戏通知',
      subtitle: '向运行中的世界发送游戏内消息，并管理维护操作前的玩家提醒。',
      actions: {
        send: '发送通知',
        details: '查看投递详情'
      },
      emptyRooms: {
        title: '没有可用房间',
        description: '房间所在 Agent 可用时才能发送游戏通知和配置操作提醒。'
      },
      composer: {
        title: '即时通知',
        description: '从一个运行中的世界发送房间广播，由游戏转发到相连世界，避免重复公告。',
        room: '房间',
        roomPlaceholder: '选择房间',
        roomDescription: '选择需要接收消息的游戏房间。',
        worlds: '世界状态',
        worldDescription: '已停止的世界会被跳过，并记录在发送历史中。',
        runningCount: '{running} / {total} 个世界运行中',
        message: '通知内容',
        messagePlaceholder: '输入要在游戏内显示的消息',
        messageCount: '{count} / 500 个字符'
      },
      policy: {
        title: '操作前通知',
        description: '控制停服、重启、停服备份、游戏更新和模组重启前的游戏内倒计时提醒。',
        enabled: '启用倒计时通知',
        enabledDescription: '确认无人在线时跳过；无法确认人数时仍会提醒和等待。',
        countdown: '提前通知时间',
        countdownDescription: '系统会在倒计时开始及剩余 30 秒、10 秒时提醒，超出所设时长的节点会跳过。',
        seconds: '{count} 秒',
        behaviorTitle: '不会阻断管理操作',
        behaviorDescription: '通知投递失败会保留记录，但不会阻止停止或重启；取消任务会同时取消倒计时。'
      },
      history: {
        title: '发送历史',
        description: '查看公告发送记录和游戏确认结果。',
        columns: {
          time: '发送时间',
          source: '触发来源',
          message: '通知内容',
          result: '投递结果',
          details: '详情'
        },
        counts: '已提交 {success} · 未完成 {failed} · 未单独发送 {skipped}',
        empty: '还没有发送记录',
        emptyDescription: '发送即时通知、自动化通知或执行带倒计时的维护操作后，记录会显示在这里。',
        total: '共 {count} 条记录'
      },
      detail: {
        title: '投递详情',
        description: '{room} · {time}',
        localTarget: '本机',
        agentTarget: '运行机器 · {agent}',
        noTarget: '—',
        master: '地面',
        caves: '洞穴',
        wholeRoom: '接收范围：整个房间',
        viaWorld: '接收范围：整个房间 · 发送世界：{world}',
        sharedBroadcast: '通过{world}广播，由游戏转发到相连世界。',
        noReplay: '已尝试发送房间广播，为避免重复公告未再次发送。',
        stoppedDescription: '该世界未运行，未从此处发送。',
        expand: '各世界发送记录',
        columns: {
          world: '世界',
          target: '运行机器',
          status: '状态',
          message: '结果',
          time: '记录时间'
        }
      },
      sources: {
        manual: '手动发送',
        room_stop: '停止房间',
        room_restart: '重启房间',
        game_update: '游戏更新',
        mod_sync: '模组同步',
        backup: '停服备份',
        automation: '自动化任务'
      },
      statuses: {
        queued: '等待发送',
        sending: '发送中',
        succeeded: '已提交',
        partial: '部分提交',
        failed: '发送失败',
        skipped: '未发送',
        canceled: '已取消'
      },
      deliveryStatuses: {
        queued: '等待发送',
        succeeded: '已提交',
        failed: '发送失败',
        skipped: '未单独发送',
        canceled: '已取消'
      },
      outcomes: {
        waiting: '正在发送', submitted: '已提交', confirmed: '游戏已执行',
        unconfirmed: '结果未确认', failed: '发送失败', skipped: '未发送', canceled: '已取消',
        worldStopped: '世界未运行', roomBroadcast: '无需重复发送', broadcastAttempted: '未重复尝试'
      },
      outcomeDescriptions: {
        waiting: '正在发送公告并等待游戏确认，等待超时后会显示“结果未确认”。',
        submitted: '公告已提交，目前没有游戏执行确认。旧版本发送记录也会显示此状态。',
        confirmed: '已收到游戏执行广播的确认；这不代表每位玩家都已收到。',
        unconfirmed: '未收到有效的游戏确认，公告可能已经发出。系统不会自动重发，以免重复。',
        failed: '本次发送未完成，请展开各世界发送记录查看原因。',
        skipped: '没有发送公告，请展开各世界发送记录查看原因。',
        canceled: '发送任务已取消。'
      },
      worldStatuses: {
        running: '运行中',
        starting: '启动中',
        stopped: '已停止',
        failed: '异常',
        unknown: '未知'
      },
      validation: {
        messageRequired: '请输入通知内容',
        messageLength: '通知内容不能超过 500 个字符'
      },
      feedback: {
        loadFailed: '加载游戏通知失败',
        sent: '公告已提交，尚未确认游戏执行',
        confirmed: '公告已由游戏执行',
        unconfirmed: '未能确认公告执行结果，可能已经发出；不会自动重发',
        noRunningWorlds: '当前没有运行中的世界，未发送通知',
        sendFailed: '游戏通知发送失败，请查看投递详情',
        policySaved: '操作通知策略已保存',
        policySaveFailed: '操作通知策略保存失败'
      }
    }
  },
  'en-US': {
    announcements: {
      title: 'Game notifications',
      subtitle: 'Send in-game messages and manage player warnings before maintenance operations.',
      actions: {
        send: 'Send notification',
        details: 'View delivery details'
      },
      emptyRooms: {
        title: 'No available rooms',
		description: 'Register a room before sending game notifications or configuring operation warnings.'
      },
      composer: {
        title: 'Immediate notification',
        description: 'Broadcast once through a running world. The game forwards it to connected worlds without duplicate announcements.',
        room: 'Room',
        roomPlaceholder: 'Select a room',
        roomDescription: 'Select the game room that should receive this message.',
        worlds: 'World status',
        worldDescription: 'Stopped worlds are skipped and retained in delivery history.',
        runningCount: '{running} of {total} worlds running',
        message: 'Message',
        messagePlaceholder: 'Enter the message to display in game',
        messageCount: '{count} / 500 characters'
      },
      policy: {
        title: 'Pre-operation notification',
        description: 'Control in-game countdown warnings before stops, restarts, stopped backups, game updates, and mod activation restarts.',
        enabled: 'Enable countdown notifications',
        enabledDescription: 'Skip when no players are online; if the player count is unavailable, keep the warning window.',
        countdown: 'Advance warning',
        countdownDescription: 'Warnings are sent when the countdown starts and at 30 and 10 seconds remaining, skipping checkpoints longer than the selected duration.',
        seconds: '{count} seconds',
        behaviorTitle: 'Management actions remain available',
        behaviorDescription: 'Delivery failures are recorded but do not block stop or restart. Canceling the Job also cancels the countdown.'
      },
      history: {
        title: 'Delivery history',
        description: 'Announcement submissions and game execution confirmations.',
        columns: {
          time: 'Sent at',
          source: 'Source',
          message: 'Message',
          result: 'Result',
          details: 'Details'
        },
        counts: '{success} submitted · {failed} incomplete · {skipped} not sent separately',
        empty: 'No delivery history',
        emptyDescription: 'Immediate messages, automated notifications, and maintenance countdown warnings appear here after they are sent.',
        total: '{count} records'
      },
      detail: {
        title: 'Delivery details',
        description: '{room} · {time}',
        localTarget: 'Local',
        agentTarget: 'Machine · {agent}',
        noTarget: '—',
        master: 'Surface',
        caves: 'Caves',
        wholeRoom: 'Audience: entire room',
        viaWorld: 'Audience: entire room · sending world: {world}',
        sharedBroadcast: 'Broadcast through {world}; the game forwards it to connected worlds.',
        noReplay: 'A room broadcast was attempted. No additional attempt was made to avoid duplicates.',
        stoppedDescription: 'This world was stopped, so it was not used to send the announcement.',
        expand: 'Sending records by world',
        columns: {
          world: 'World',
          target: 'Machine',
          status: 'Status',
          message: 'Result',
          time: 'Recorded at'
        }
      },
      sources: {
        manual: 'Manual',
        room_stop: 'Room stop',
        room_restart: 'Room restart',
        game_update: 'Game update',
        mod_sync: 'Mod sync',
        backup: 'Stopped backup',
        automation: 'Automation'
      },
      statuses: {
        queued: 'Queued',
        sending: 'Sending',
        succeeded: 'Submitted',
        partial: 'Partially submitted',
        failed: 'Failed',
        skipped: 'Not sent',
        canceled: 'Canceled'
      },
      deliveryStatuses: {
        queued: 'Queued',
        succeeded: 'Submitted',
        failed: 'Failed',
        skipped: 'Not sent separately',
        canceled: 'Canceled'
      },
      outcomes: {
        waiting: 'Sending', submitted: 'Submitted', confirmed: 'Executed by game',
        unconfirmed: 'Result unconfirmed', failed: 'Failed', skipped: 'Not sent', canceled: 'Canceled',
        worldStopped: 'World stopped', roomBroadcast: 'No separate send needed', broadcastAttempted: 'No additional attempt'
      },
      outcomeDescriptions: {
        waiting: 'Sending the announcement and waiting for game confirmation. A timeout will be shown as unconfirmed.',
        submitted: 'The announcement was submitted without game execution confirmation. Older records also use this state.',
        confirmed: 'The game confirmed broadcast execution; this does not confirm receipt by every player.',
        unconfirmed: 'No valid game confirmation was received. The announcement may have been sent and will not be retried automatically.',
        failed: 'Sending did not complete. Expand the world records to see the reason.',
        skipped: 'No announcement was sent. Expand the world records to see the reason.',
        canceled: 'The sending task was canceled.'
      },
      worldStatuses: {
        running: 'Running',
        starting: 'Starting',
        stopped: 'Stopped',
        failed: 'Failed',
        unknown: 'Unknown'
      },
      validation: {
        messageRequired: 'Enter a notification message',
        messageLength: 'The message cannot exceed 500 characters'
      },
      feedback: {
        loadFailed: 'Could not load game notifications',
        sent: 'Announcement submitted without game execution confirmation',
        confirmed: 'The game executed the announcement',
        unconfirmed: 'Execution is unconfirmed; the announcement may have been sent and will not be retried automatically',
        noRunningWorlds: 'No worlds are running, so no message was sent',
        sendFailed: 'The game notification failed. Review delivery details.',
        policySaved: 'Operation notification policy saved',
        policySaveFailed: 'Could not save the operation notification policy'
      }
    }
  }
}

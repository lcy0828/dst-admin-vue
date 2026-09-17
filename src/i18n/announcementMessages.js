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
        description: '控制停止、重启、游戏更新和 Mod 重启生效前的游戏内倒计时提醒。',
        enabled: '启用倒计时通知',
        enabledDescription: '仅在检测到在线玩家时等待倒计时。',
        countdown: '提前通知时间',
        countdownDescription: '系统会在倒计时开始及剩余 30 秒、10 秒时提醒，超出所设时长的节点会跳过。',
        seconds: '{count} 秒',
        behaviorTitle: '不会阻断管理操作',
        behaviorDescription: '通知投递失败会保留记录，但不会阻止停止或重启；取消任务会同时取消倒计时。'
      },
      history: {
        title: '发送历史',
        description: '保留手动通知和系统操作提醒的实际分片投递结果。',
        columns: {
          time: '发送时间',
          source: '触发来源',
          message: '通知内容',
          result: '投递结果',
          details: '详情'
        },
        counts: '成功 {success} · 失败 {failed} · 跳过 {skipped}',
        empty: '还没有发送记录',
        emptyDescription: '发送即时通知、自动化通知或执行带倒计时的维护操作后，记录会显示在这里。',
        total: '共 {count} 条记录'
      },
      detail: {
        title: '投递详情',
        description: '{room} · {time}',
        localTarget: '本机',
        agentTarget: 'Agent · {agent}',
        noTarget: '未投递',
        columns: {
          world: '世界',
          target: '运行目标',
          status: '状态',
          message: '结果',
          time: '观测时间'
        }
      },
      sources: {
        manual: '手动发送',
        room_stop: '停止房间',
        room_restart: '重启房间',
        game_update: '游戏更新',
        mod_sync: '模组同步',
        automation: '自动化任务'
      },
      statuses: {
        queued: '等待发送',
        sending: '发送中',
        succeeded: '发送成功',
        partial: '部分成功',
        failed: '发送失败',
        skipped: '未发送',
        canceled: '已取消'
      },
      deliveryStatuses: {
        queued: '等待发送',
        succeeded: '发送成功',
        failed: '发送失败',
        skipped: '世界未运行',
        canceled: '已取消'
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
        sent: '房间广播已提交',
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
        description: 'Control in-game countdown warnings before stops, restarts, game updates, and Mod activation restarts.',
        enabled: 'Enable countdown notifications',
        enabledDescription: 'The countdown only waits when online players are detected.',
        countdown: 'Advance warning',
        countdownDescription: 'Warnings are sent when the countdown starts and at 30 and 10 seconds remaining, skipping checkpoints longer than the selected duration.',
        seconds: '{count} seconds',
        behaviorTitle: 'Management actions remain available',
        behaviorDescription: 'Delivery failures are recorded but do not block stop or restart. Canceling the Job also cancels the countdown.'
      },
      history: {
        title: 'Delivery history',
        description: 'Actual per-Shard results for manual messages and operation warnings.',
        columns: {
          time: 'Sent at',
          source: 'Source',
          message: 'Message',
          result: 'Result',
          details: 'Details'
        },
        counts: '{success} sent · {failed} failed · {skipped} skipped',
        empty: 'No delivery history',
        emptyDescription: 'Immediate messages, automated notifications, and maintenance countdown warnings appear here after they are sent.',
        total: '{count} records'
      },
      detail: {
        title: 'Delivery details',
        description: '{room} · {time}',
        localTarget: 'Local',
        agentTarget: 'Agent · {agent}',
        noTarget: 'Not delivered',
        columns: {
          world: 'World',
          target: 'Runtime target',
          status: 'Status',
          message: 'Result',
          time: 'Observed at'
        }
      },
      sources: {
        manual: 'Manual',
        room_stop: 'Room stop',
        room_restart: 'Room restart',
        game_update: 'Game update',
        mod_sync: 'Mod sync',
        automation: 'Automation'
      },
      statuses: {
        queued: 'Queued',
        sending: 'Sending',
        succeeded: 'Sent',
        partial: 'Partially sent',
        failed: 'Failed',
        skipped: 'Not sent',
        canceled: 'Canceled'
      },
      deliveryStatuses: {
        queued: 'Queued',
        succeeded: 'Sent',
        failed: 'Failed',
        skipped: 'World stopped',
        canceled: 'Canceled'
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
        sent: 'Room broadcast submitted',
        noRunningWorlds: 'No worlds are running, so no message was sent',
        sendFailed: 'The game notification failed. Review delivery details.',
        policySaved: 'Operation notification policy saved',
        policySaveFailed: 'Could not save the operation notification policy'
      }
    }
  }
}

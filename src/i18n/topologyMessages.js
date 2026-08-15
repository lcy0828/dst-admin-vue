export const topologyMessages = {
  'zh-CN': {
    topology: {
      title: '房间运行拓扑',
      subtitle: '规划每个世界分片的运行节点，并检查整台服务器的容量与冲突。',
      room: '房间',
      selectRoom: '选择已接管房间',
      loadingRooms: '正在读取房间',
      planningBadge: '规划与迁移',
      actions: {
        preview: '预览计划',
        previewing: '正在预览',
        save: '保存计划',
        saving: '正在保存'
      },
      batch: {
        open: '批量操作',
        title: '跨房间批量操作',
        description: '按房间选择世界分片。执行前会合并检查所有节点容量，每个房间使用独立租约。',
        resultTitle: '批量操作结果',
        resultDescription: '每个世界保留独立结果；部分房间失败不会隐藏其他房间的成功结果。',
        action: '操作',
        actions: {
          start: '启动',
          stop: '停止',
          restart: '重启',
          save: '保存'
        },
        actionDescriptions: {
          start: '仅显示当前可启动的世界。启动后超出建议容量时需要再次确认。',
          stop: '停止选中的运行中或启动中的世界，并立即中断同房间的待执行启动。',
          restart: '依次重启选中的运行中世界；每个房间内部会先完成全量预检。',
          save: '向选中的运行中世界发送保存命令。'
        },
        loading: '正在读取所有房间的世界状态',
        roomSummary: '已选 {selected} / 可操作 {eligible}',
        selectRoom: '选择可操作项',
        clearRoom: '清除此房间',
        runtimeTarget: '运行节点：{name}',
        worldsFailed: '世界状态加载失败',
        capacityTitle: '跨房间合并容量预检',
        capacityDescription: '同一台服务器可以承载同一房间或不同房间的多层世界；同一节点上的所有运行中 Shard 与本次新增 Shard 会合并计算。建议一颗物理核心最多运行一层世界，并额外预留 1 核；超出只告警并要求确认。',
        submit: '执行 {rooms} 个房间 / {worlds} 个世界',
        submitting: '正在执行',
        resultSummary: '成功 {succeeded} 个，未成功 {failed} 个。',
        retryFailed: '重试未成功项 ({count})',
        noRetryableTargets: '未成功项的状态已变化，请重新选择可操作的世界。',
        columns: {
          target: '房间 / 世界',
          status: '结果',
          message: '说明'
        },
        outcomes: {
          full: '全部操作成功',
          partial: '部分操作完成',
          none: '操作未完成'
        },
        statuses: {
          succeeded: '成功',
          failed: '失败',
          canceled: '已取消',
          unknown: '未知'
        },
        feedback: {
          completed: '批量操作已全部完成',
          partial: '批量操作部分完成，请检查逐世界结果',
          retrying: '正在重新读取世界状态并重试未成功项',
          failed: '批量操作失败：{error}'
        }
      },
      policy: {
        title: '同机多房间与多层世界容量建议',
        description: '同一服务器可以运行多个房间和多个世界分片。保守建议一颗物理核心最多运行一层世界，并额外为系统、Agent、SteamCMD 与备份至少预留 1 核；超出时可能卡顿。该规则只告警，不是硬限制或性能保证。'
      },
      planning: {
        title: '先保存期望位置，再逐世界迁移',
        description: '保存计划只更新期望位置，不移动文件。停止对应世界后，使用“迁移”执行校验、传输、原子切换和源端可恢复保留；成功后才更新当前生效节点。'
      },
      capacity: {
        title: '节点容量',
        description: '计划数量会跨房间累计，并保留当前未受管的 DST 进程。',
        columns: {
          target: '运行节点',
          status: '节点状态',
          observed: '当前运行',
          unmanaged: '未受管',
          planned: '已规划',
          projected: '规划后',
          budget: '建议容量',
          observedAt: '数据时间'
        },
        physical: '{count} 个物理核心',
        physicalEstimated: '{count} 个物理核心（估算）',
        logical: '{count} 个逻辑处理器',
        projectedValue: '{projected} / {limit}',
        unknownLimit: '{projected} / --',
        reserve: '已为系统预留 {count} 核',
        states: {
          available: '可用',
          full: '达到建议上限',
          overcommitted: '已超出建议',
          unknown: '无法判断'
        }
      },
      placements: {
        title: '世界放置',
        description: '离线但已配置的节点可以提前选择；保存后，在每个待迁移世界上执行迁移。',
        columns: {
          world: '世界',
          role: '角色',
          desired: '期望节点',
          applied: '当前生效节点',
          state: '规划状态'
        },
        selectTarget: '选择运行节点',
        offlineSuffix: '离线',
        states: {
          aligned: '位置一致',
          planned: '等待执行迁移',
          target_offline: '目标离线',
          inventory_stale: '清单已过期',
          inventory_missing: '缺少清单',
          shard_missing: '缺少世界文件',
          conflict: '运行冲突',
          unknown: '未知'
        },
        roles: {
          master: '主世界',
          caves: '洞穴',
          custom: '自定义世界',
          unknown: '未知'
        }
      },
      migration: {
        action: '迁移',
        title: '迁移 {world}',
        description: '系统会校验源端与目标端、复制存档并原子切换生效 Placement；失败时不会回落控制器本机路径。',
        stoppedTitle: '世界必须已停止',
        stoppedDescription: '迁移期间不得有进程写入存档。若世界仍在运行，后端会拒绝执行且不会修改文件。',
        source: '当前节点',
        target: '目标节点',
        confirmation: '房间名确认',
        confirmationDescription: '输入“{room}”确认迁移。',
        confirm: '开始迁移',
        completed: '世界迁移完成，生效 Placement 已更新',
        failed: '世界迁移失败：{error}'
      },
      target: {
        local: '本机',
        online: '在线',
        offline: '离线',
        ready: '已配置',
        unconfigured: '未配置',
        inventoryCurrent: '数据正常',
        inventoryStale: '数据过期',
        inventoryMissing: '等待清单'
      },
      issues: {
        title: '检查结果',
        description: '保存前需要关注以下容量、文件或运行状态。',
        emptyTitle: '没有发现阻塞性问题',
        emptyDescription: '当前计划未发现容量、文件或运行状态阻塞。'
      },
      empty: {
        title: '没有可规划的房间',
        description: '先在房间列表中接管至少一个 DST 房间。'
      },
      loading: '正在读取运行拓扑',
      feedback: {
        roomsFailedTitle: '房间列表加载失败',
        topologyFailedTitle: '拓扑加载失败',
        previewFailed: '预览拓扑失败：{error}',
        saveFailed: '保存拓扑失败：{error}',
        previewReady: '容量预览已更新',
        saved: '期望运行拓扑已保存',
        revisionChanged: '拓扑已被其他请求修改，页面已刷新'
      },
      overcommit: {
        title: '确认超出建议核心容量',
        description: '规划后至少一个节点的运行分片数将超过“一颗物理核心一层世界，并额外预留 1 核”的建议。继续保存可能导致 tick 延迟、网络抖动或卡顿，但不会立即启动或迁移分片。',
        cancel: '返回调整',
        confirm: '了解风险并保存'
      },
      time: {
        unavailable: '暂无观测时间'
      }
    }
  },
  'en-US': {
    topology: {
      title: 'Room runtime topology',
      subtitle: 'Plan the runtime target for every Shard and inspect whole-node capacity and conflicts.',
      room: 'Room',
      selectRoom: 'Select a managed room',
      loadingRooms: 'Loading rooms',
      planningBadge: 'Plan and migrate',
      actions: {
        preview: 'Preview plan',
        previewing: 'Previewing',
        save: 'Save plan',
        saving: 'Saving'
      },
      batch: {
        open: 'Batch actions',
        title: 'Cross-room batch action',
        description: 'Select world Shards by room. Node capacity is evaluated across the entire batch, while each room keeps an independent lease.',
        resultTitle: 'Batch action results',
        resultDescription: 'Every world keeps an independent result, and failures in one room do not hide successes in another.',
        action: 'Action',
        actions: {
          start: 'Start',
          stop: 'Stop',
          restart: 'Restart',
          save: 'Save'
        },
        actionDescriptions: {
          start: 'Only startable worlds are shown. Starting beyond recommended capacity requires another confirmation.',
          stop: 'Stop selected running or starting worlds and immediately interrupt pending starts in the same room.',
          restart: 'Restart selected running worlds in order after completing each room preflight.',
          save: 'Send a save command to the selected running worlds.'
        },
        loading: 'Loading world state for all rooms',
        roomSummary: '{selected} selected / {eligible} available',
        selectRoom: 'Select available',
        clearRoom: 'Clear room',
        runtimeTarget: 'Runtime node: {name}',
        worldsFailed: 'Failed to load world state',
        capacityTitle: 'Merged cross-room capacity preflight',
        capacityDescription: 'One server may host multiple Shards from the same room or different rooms. All running Shards and all Shards added by this batch are counted together per node. Run at most one Shard per physical core and reserve one additional core. Exceeding this guidance warns and requires confirmation.',
        submit: 'Run for {rooms} rooms / {worlds} worlds',
        submitting: 'Running action',
        resultSummary: '{succeeded} succeeded and {failed} did not succeed.',
        retryFailed: 'Retry unsuccessful ({count})',
        noRetryableTargets: 'The unsuccessful targets changed state. Select the worlds that are still actionable.',
        columns: {
          target: 'Room / world',
          status: 'Result',
          message: 'Details'
        },
        outcomes: {
          full: 'All actions succeeded',
          partial: 'Batch partially completed',
          none: 'Batch did not complete'
        },
        statuses: {
          succeeded: 'Succeeded',
          failed: 'Failed',
          canceled: 'Canceled',
          unknown: 'Unknown'
        },
        feedback: {
          completed: 'The batch action completed',
          partial: 'The batch partially completed. Review the per-world results.',
          retrying: 'Refreshing world state and retrying unsuccessful targets',
          failed: 'Batch action failed: {error}'
        }
      },
      policy: {
        title: 'Capacity guidance for multiple rooms and Shards',
        description: 'One server may run multiple rooms and Shards. Conservatively, run at most one Shard per physical core and reserve at least one additional core for the OS, Agent, SteamCMD, and backups. Exceeding this budget may cause lag. This is advisory, not a hard limit or a performance guarantee.'
      },
      planning: {
        title: 'Save desired placement, then migrate each world',
        description: 'Saving updates desired placement without moving files. Stop the world and use Migrate to validate, transfer, atomically activate, and retain recoverable source data. Applied placement changes only after success.'
      },
      capacity: {
        title: 'Node capacity',
        description: 'Planned counts include every managed room and retain currently observed unmanaged DST processes.',
        columns: {
          target: 'Runtime target',
          status: 'Node status',
          observed: 'Running now',
          unmanaged: 'Unmanaged',
          planned: 'Planned',
          projected: 'After plan',
          budget: 'Recommended capacity',
          observedAt: 'Data time'
        },
        physical: '{count} physical cores',
        physicalEstimated: '{count} physical cores (estimated)',
        logical: '{count} logical processors',
        projectedValue: '{projected} / {limit}',
        unknownLimit: '{projected} / --',
        reserve: '{count} core reserved for the system',
        states: {
          available: 'Available',
          full: 'At recommended limit',
          overcommitted: 'Over recommended limit',
          unknown: 'Unknown'
        }
      },
      placements: {
        title: 'Shard placement',
        description: 'Configured offline nodes may be selected in advance. After saving, run migration for each pending world.',
        columns: {
          world: 'World',
          role: 'Role',
          desired: 'Desired target',
          applied: 'Applied target',
          state: 'Planning state'
        },
        selectTarget: 'Select a runtime target',
        offlineSuffix: 'offline',
        states: {
          aligned: 'Placement aligned',
          planned: 'Waiting to migrate',
          target_offline: 'Target offline',
          inventory_stale: 'Inventory stale',
          inventory_missing: 'Inventory missing',
          shard_missing: 'Shard files missing',
          conflict: 'Runtime conflict',
          unknown: 'Unknown'
        },
        roles: {
          master: 'Master',
          caves: 'Caves',
          custom: 'Custom Shard',
          unknown: 'Unknown'
        }
      },
      migration: {
        action: 'Migrate',
        title: 'Migrate {world}',
        description: 'The system validates both targets, copies the save, and atomically activates the placement. Failure never falls back to a similarly named controller-local path.',
        stoppedTitle: 'The world must be stopped',
        stoppedDescription: 'No process may write the save during migration. The backend rejects a running world without changing files.',
        source: 'Current target',
        target: 'Destination',
        confirmation: 'Room-name confirmation',
        confirmationDescription: 'Enter "{room}" to confirm migration.',
        confirm: 'Start migration',
        completed: 'World migrated and applied placement updated',
        failed: 'World migration failed: {error}'
      },
      target: {
        local: 'Local',
        online: 'Online',
        offline: 'Offline',
        ready: 'Configured',
        unconfigured: 'Not configured',
        inventoryCurrent: 'Current',
        inventoryStale: 'Stale',
        inventoryMissing: 'Waiting for inventory'
      },
      issues: {
        title: 'Checks',
        description: 'Review these capacity, file, or runtime conditions before saving.',
        emptyTitle: 'No blocking issue detected',
        emptyDescription: 'No capacity, file, or runtime-state blocker was detected.'
      },
      empty: {
        title: 'No room is available for planning',
        description: 'Manage at least one DST room from the room list first.'
      },
      loading: 'Loading runtime topology',
      feedback: {
        roomsFailedTitle: 'Failed to load rooms',
        topologyFailedTitle: 'Failed to load topology',
        previewFailed: 'Failed to preview topology: {error}',
        saveFailed: 'Failed to save topology: {error}',
        previewReady: 'Capacity preview updated',
        saved: 'Desired runtime topology saved',
        revisionChanged: 'The topology changed in another request and has been refreshed'
      },
      overcommit: {
        title: 'Confirm recommended core capacity is exceeded',
        description: 'After this plan, at least one node exceeds the recommendation of one Shard per physical core with one additional core reserved. Continuing may cause tick delay, network jitter, or lag, but it will not immediately start or migrate any Shard.',
        cancel: 'Review plan',
        confirm: 'Acknowledge and save'
      },
      time: {
        unavailable: 'No observation time'
      }
    }
  }
}

export const topologyMessages = {
  'zh-CN': {
    topology: {
      title: '房间运行拓扑',
      subtitle: '规划每个世界分片的运行节点，并检查整台服务器的容量与冲突。',
      room: '房间',
      selectRoom: '选择已接管房间',
      loadingRooms: '正在读取房间',
      planningBadge: '仅规划',
      actions: {
        preview: '预览计划',
        previewing: '正在预览',
        save: '保存计划',
        saving: '正在保存'
      },
      policy: {
        title: '同机多房间与多层世界容量建议',
        description: '同一服务器可以运行多个房间和多个世界分片。保守建议一颗物理核心最多运行一层世界，并额外为系统、Agent、SteamCMD 与备份至少预留 1 核；超出时可能卡顿。该规则只告警，不是硬限制或性能保证。'
      },
      planning: {
        title: '远程执行尚未开放',
        description: '这里保存的是期望运行位置，不会迁移存档、停止当前分片或在远程节点启动进程。完成类型化控制、租约与 fencing 前，实际生效位置保持不变。'
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
        description: '离线但已配置的节点可以提前选择；保存后仍不会自动迁移。',
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
          planned: '等待迁移能力',
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
        emptyDescription: '当前计划仍只用于规划，实际迁移能力尚未启用。'
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
      planningBadge: 'Planning only',
      actions: {
        preview: 'Preview plan',
        previewing: 'Previewing',
        save: 'Save plan',
        saving: 'Saving'
      },
      policy: {
        title: 'Capacity guidance for multiple rooms and Shards',
        description: 'One server may run multiple rooms and Shards. Conservatively, run at most one Shard per physical core and reserve at least one additional core for the OS, Agent, SteamCMD, and backups. Exceeding this budget may cause lag. This is advisory, not a hard limit or a performance guarantee.'
      },
      planning: {
        title: 'Remote execution is not enabled',
        description: 'This page saves desired placement only. It will not migrate saves, stop current Shards, or start remote processes. Applied placement remains unchanged until typed control, leases, and fencing are complete.'
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
        description: 'Configured offline nodes may be selected in advance. Saving still does not migrate anything.',
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
          planned: 'Waiting for migration support',
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
        emptyDescription: 'The current plan is still planning-only; runtime migration is not enabled.'
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

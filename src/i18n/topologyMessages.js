export const topologyMessages = {
  'zh-CN': {
    topology: {
      title: '部署总览',
      subtitle: '跨房间查看世界运行位置、机器容量与运行冲突；日常调整请从房间设置进入。',
      room: '房间',
      selectRoom: '选择房间',
      loadingRooms: '正在读取房间',
      planningBadge: '规划与迁移',
      actions: {
        preview: '预览计划',
        previewing: '正在预览',
        save: '保存计划',
        saving: '正在保存'
      },
      roomPlacement: {
        title: '运行位置',
        description: '为整个房间选择运行机器，需要时再分别设置每个世界。',
        dialog: {
          title: '更改房间运行位置',
          description: '默认让所有世界位于同一台机器；跨机器部署时再展开逐世界设置。'
        },
        mode: {
          label: '部署方式',
          advancedLabel: '不同世界使用不同运行位置',
          colocated: '同一台机器',
          colocatedDescription: '所有世界共用一台机器上的游戏安装。',
          perWorld: '分别设置世界',
          perWorldDescription: '为各世界单独选择机器和游戏安装。'
        },
        target: {
          roomLabel: '房间运行机器',
          roomDescription: '这次选择会同时应用到房间内的全部世界。',
          placeholder: '选择运行机器',
          search: '搜索机器名称、主机名或 ID',
          empty: '暂无已配置的运行机器',
          noMatch: '没有匹配的机器',
          capacity: '{projected} / {limit} 个世界',
          capacityUnknown: '容量未知'
        },
        installation: {
          label: '游戏安装',
          placeholder: '选择游戏安装',
          defaultSuffix: '（默认）'
        },
        worlds: {
          title: '逐世界运行位置',
          description: '当前机器始终保留显示，修改后只移动发生变化的世界。',
          current: '当前：{target}',
          targetLabel: '{world} 的运行机器'
        },
        shardLinks: {
          title: '世界互联线路',
          description: '检查其他世界的机器能否连接主世界。',
          probe: '重新探测',
          probing: '正在探测',
          probeFailedTitle: '线路探测失败',
          probeFailed: '世界互联线路探测失败：{error}',
          deferredTitle: '将在执行时验证线路',
          deferredDescription: '{reason}。你仍可选择候选线路；首次投放会停服后复测，迁移已有世界时请先停止整个房间再重新探测。',
          routeTitle: '{source} → {master}',
          routeDescription: '其他世界通过所选地址连接主世界，主世界的本地端口为 UDP {port}。',
          selectionRequired: '请选择一条可用或待验证的线路。只有一个候选可选时会自动选择。',
          noCandidateTitle: '这台 Master 暂无候选地址',
          noCandidateDescription: '没有可展示的网卡或网络配置地址，请在下方添加内网穿透地址。',
          noRouteTitle: '没有可选择的互联地址',
          noRouteDescription: '请检查 Master 运行机器的网卡地址，或在下方添加内网穿透地址和端口。',
          manualTitle: '添加内网穿透或自定义地址',
          manualDescription: '端口可以与 Master 本地监听端口不同；添加后会从每台 Secondary 机器重新探测。',
          address: '地址或域名',
          addressPlaceholder: '例如 192.168.2.23 或 tunnel.example.com',
          port: 'UDP 端口',
          addAndProbe: '添加并探测',
          removeManual: '移除自定义候选',
          savedCandidate: '已保存线路',
          status: {
            reachable: '可用',
            reachableLatency: '可用 · {latency} ms',
            unreachable: '不可达',
            unverified: '待执行时验证',
            pending: '等待探测'
          },
          kind: {
            lan: '内网',
            overlay: '组网地址',
            configured: '已配置地址',
            manual: '自定义',
            public: '公网',
            interface: '网卡地址'
          }
        },
        summary: {
          worlds: '{count} 个世界',
          distributed: '分布在 {count} 台机器',
          installations: '同一机器的 {count} 个安装实例',
          ready: '位置正常',
          pending: '{count} 项待执行',
          routePending: '线路待应用',
          conflict: '需要处理'
        },
        review: {
          changeTitle: '{count} 个世界将更改位置',
          routeChangeTitle: '世界互联线路将更新',
          routeChangeDescription: '仅更新连接线路，不移动或重启世界。',
          cancelTitle: '将取消尚未执行的计划',
          cancelDescription: '保存后，期望位置会恢复为当前实际运行位置。',
          noChangeTitle: '运行位置没有变化',
          noChangeDescription: '当前选择与实际运行位置一致。',
          confirmTitle: '再次点击确认执行',
          confirmDescription: '确认后将保存计划，并依次投放或迁移 {count} 个世界。',
          saveOnlyDescription: '确认后将保存新的运行位置计划。',
          overcommitDescription: '计划超出建议核心容量；再次点击表示了解风险并继续。',
          runtimeTitle: '{count} 个运行中的世界会短暂停服',
          runtimeDescription: '系统会先安全停止这些世界，完成投放或迁移后在新位置恢复运行；原本停止的世界仍保持停止。',
          issueTitle: '预检发现 {count} 项需要关注'
        },
        execution: {
          saving: '正在保存运行位置',
          migrating: '正在迁移 {world}',
          provisioning: '正在投放 {count} 个世界',
          routing: '正在应用世界互联线路',
          pausedTitle: '计划已保存，执行暂时暂停',
          pausedDescription: '{count} 台机器尚未就绪，请检查连接和机器状态，恢复后刷新并继续。',
          completedTitle: '运行位置已应用',
          completedDescription: '变更已完成，世界运行位置已刷新。',
          notAdvanced: '任务完成后运行位置没有推进，已停止继续执行，请刷新后检查 Agent 和存档状态'
        },
        actions: {
          change: '分配机器',
          review: '检查变更',
          reviewing: '正在检查',
          confirm: '确认并执行',
          applying: '正在应用'
        },
        feedback: {
          loadFailedTitle: '运行位置加载失败',
          loadFailed: '运行位置加载失败：{error}',
          previewFailed: '运行位置预检失败：{error}',
          blocked: '当前变更存在阻塞项，请先处理后再执行',
          applyFailedTitle: '运行位置应用失败',
          applyFailed: '运行位置应用失败：{error}',
          planSaved: '运行位置计划已保存，目标恢复后可继续执行',
          completed: '房间运行位置已更新'
        }
      },
      batch: {
        open: '批量操作',
        title: '跨房间批量操作',
        description: '选择要操作的房间和世界。',
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
        runtimeTarget: '运行机器：{name}',
        worldsFailed: '世界状态加载失败',
        capacityTitle: '跨房间合并容量预检',
        capacityDescription: '按每台机器上已运行和本次启动的世界总数估算负载。超过建议容量会提醒，仍可确认继续。',
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
        description: '同一服务器可以运行多个房间和多个世界分片。建议每个有效 CPU 最多运行一层世界；2 核及以下不额外预留整核，3 核及以上为系统和维护任务预留 1 核。该规则只告警，不是硬限制或性能保证。'
      },
      planning: {
        title: '先保存期望位置，再投放或迁移',
        description: '保存计划只更新期望位置，不移动文件。首次把本机房间放到远程节点时使用“投放配置”；已有远程分片换节点必须使用“迁移”。两者都只在校验和原子发布成功后更新当前生效节点。'
      },
      risks: {
        conflictTitle: '发现 {count} 处端口或 CPU 冲突',
        conflictDescription: '其他房间使用了相同资源，受影响的世界启动前会被阻止。展开高级信息可查看具体端口。',
        overlapTitle: '停止的房间有 {count} 个重复端口配置',
        overlapDescription: '停止状态下可以复用端口；系统只会在这些房间准备同时启动时阻止操作。新建房间会自动分配不同端口。',
        overlapPorts: '重复端口：{ports}',
        issueTitle: '当前有 {count} 项需要处理',
        checkFailedTitle: '资源检查失败'
      },
      advanced: {
        title: '高级信息',
        description: '容量明细、端口与 CPU、投放记录和技术诊断',
        viewDetails: '查看详情',
        openDiagnostics: '打开集中诊断'
      },
      capacity: {
        title: '节点容量',
        description: '计划数量会跨房间累计，并保留当前未受管的 DST 进程。',
        compactTitle: '机器容量',
        compactHint: '数字为规划世界数 / 建议上限，详细依据已收进高级信息。',
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
        description: '离线但已配置的节点可以提前选择。保存后，本机首次部署到缺少文件的远程节点使用“投放配置”；已有远程存档换节点使用“迁移”。',
        simpleDescription: '只读对照当前生效位置与期望位置；运行位置统一从上方房间编辑器调整。',
        columns: {
          world: '世界',
          role: '角色',
          desired: '期望节点',
          applied: '当前生效节点',
          state: '规划状态'
        },
        selectTarget: '选择运行节点',
        offlineSuffix: '离线',
        noAction: '无需操作',
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
          master: '主分片',
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
        confirmationDescription: '迁移目标房间为“{room}”。',
        confirm: '开始迁移',
        completed: '世界迁移完成，生效 Placement 已更新',
        completedRefreshFailed: '世界迁移任务已完成，但最新拓扑读取失败，当前继续显示上次数据',
        failed: '世界迁移失败：{error}'
      },
      provision: {
        action: '投放配置',
        title: '向远程节点投放房间配置',
        description: '将为当前房间的 {count} 个待投放分片创建目录与受管配置。',
        scopeTitle: '只投放固定白名单配置',
        scopeDescription: '仅包含 cluster.ini、Cluster Token、特殊名单、server.ini、世界生成配置、Mod 配置、customcommands.lua 与 DST Runtime 文件；不提供任意路径写入、任意文件上传或远程 Shell。传输采用分块哈希校验和原子发布。',
        stoppedTitle: '房间全部世界必须已停止',
        stoppedDescription: '投放会统一生成跨节点 cluster.ini，并在全部目标发布成功后一次性提交生效 Placement。任一分片仍在运行、目标已有同名分片或拓扑发生变化时都会拒绝执行。',
        confirmation: '房间名确认',
        confirmationDescription: '待投放配置属于房间“{room}”。',
        confirm: '开始投放',
        operationTitle: '最近配置投放',
        operationDescription: '持久化操作状态更新于 {time}。',
        operationFailure: '投放未正常完成',
        operationsLoadFailedTitle: '配置投放记录加载失败',
        recover: '继续恢复',
        columns: { world: '世界', target: '目标节点', phase: '阶段', size: '传输大小', updatedAt: '更新时间' },
        statuses: { running: '执行中', succeeded: '已完成', rolled_back: '已回滚', recovery_required: '需要恢复', failed: '失败', unknown: '未知' },
        phases: { planned: '已规划', uploading: '正在投放', commit_decided: '已决定提交', topology_committed: '拓扑已提交', completed: '已完成', rolled_back: '已回滚', unknown: '未知阶段' },
        stepPhases: { not_started: '尚未派发', planned: '等待 Agent 确认', uploading: '正在上传', published: '已原子发布', existing: '已在生效节点', completed: '已完成清理', rolled_back: '已回滚', unknown: '未知阶段' },
        completed: '房间配置已投放，生效 Placement 已统一更新',
        completedRefreshFailed: '投放任务已结束，但最新拓扑或持久化操作状态读取失败，请刷新后复核',
        failed: '配置投放失败：{error}',
        recovered: '配置投放恢复已完成',
        recoverFailed: '配置投放恢复仍未完成：{error}'
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
        description: '先创建房间或等待 Agent 上报至少一个 DST 房间。'
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
        description: '规划后至少一个节点的运行分片数将超过动态建议容量。2 核及以下不额外预留整核，3 核及以上默认预留 1 核。继续保存可能导致 tick 延迟、网络抖动或卡顿，但不会立即启动或迁移分片。',
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
      title: 'Deployment overview',
      subtitle: 'Review world placement, machine capacity, and conflicts across rooms. Use room settings for routine changes.',
      room: 'Room',
      selectRoom: 'Select a room',
      loadingRooms: 'Loading rooms',
      planningBadge: 'Plan and migrate',
      actions: {
        preview: 'Preview plan',
        previewing: 'Previewing',
        save: 'Save plan',
        saving: 'Saving'
      },
      roomPlacement: {
        title: 'Runtime location',
        description: 'Choose one machine for the room, then assign individual worlds only when needed.',
        dialog: {
          title: 'Change room runtime location',
          description: 'Keep every world on one machine by default. Expand per-world placement only for cross-machine Shards.'
        },
        mode: {
          label: 'Deployment mode',
          advancedLabel: 'Use different runtime locations',
          colocated: 'One machine',
          colocatedDescription: 'All worlds share one game installation on one machine.',
          perWorld: 'Set each world',
          perWorldDescription: 'Choose a machine and game installation for each world.'
        },
        target: {
          roomLabel: 'Room machine',
          roomDescription: 'This selection applies to every world in the room.',
          placeholder: 'Select a runtime machine',
          search: 'Search by machine name, hostname, or ID',
          empty: 'No configured runtime machines',
          noMatch: 'No matching machines',
          capacity: '{projected} / {limit} worlds',
          capacityUnknown: 'Capacity unavailable'
        },
        installation: {
          label: 'Installation',
          placeholder: 'Select an installation',
          defaultSuffix: '(default)'
        },
        worlds: {
          title: 'Per-world runtime location',
          description: 'The current machine stays visible. Only changed worlds will move.',
          current: 'Current: {target}',
          targetLabel: 'Runtime machine for {world}'
        },
        shardLinks: {
          title: 'Shard interconnect routes',
          description: 'Each Secondary runtime machine probes every candidate Master address and port directly.',
          probe: 'Probe again',
          probing: 'Probing',
          probeFailedTitle: 'Route probe failed',
          probeFailed: 'Failed to probe Shard interconnect routes: {error}',
          deferredTitle: 'Route will be verified during execution',
          deferredDescription: '{reason}. You may still choose a candidate. Initial provisioning probes again after stopping the room; stop the entire room and probe again before migrating an existing world.',
          routeTitle: '{source} → {master}',
          routeDescription: 'Other worlds connect to the primary world through this address. Its local port is UDP {port}.',
          selectionRequired: 'Select a reachable or pending route. The only selectable candidate is chosen automatically.',
          noCandidateTitle: 'No candidate address on this Master',
          noCandidateDescription: 'No interface or configured network address is available. Add a tunnel endpoint below.',
          noRouteTitle: 'No interconnect endpoint is available',
          noRouteDescription: 'Check the Master machine network addresses or add a tunnel address and port below.',
          manualTitle: 'Add a tunnel or custom endpoint',
          manualDescription: 'The exposed port may differ from the local Master port. Every Secondary machine probes it after it is added.',
          address: 'Address or hostname',
          addressPlaceholder: 'For example, 192.168.2.23 or tunnel.example.com',
          port: 'UDP port',
          addAndProbe: 'Add and probe',
          removeManual: 'Remove custom candidate',
          savedCandidate: 'Saved route',
          status: {
            reachable: 'Reachable',
            reachableLatency: 'Reachable · {latency} ms',
            unreachable: 'Unreachable',
            unverified: 'Verify during execution',
            pending: 'Waiting for probe'
          },
          kind: {
            lan: 'LAN',
            overlay: 'Overlay',
            configured: 'Configured',
            manual: 'Custom',
            public: 'Public',
            interface: 'Interface'
          }
        },
        summary: {
          worlds: '{count} worlds',
          distributed: 'Distributed across {count} machines',
          installations: '{count} installations on one machine',
          ready: 'Location ready',
          pending: '{count} pending',
          routePending: 'Route pending',
          conflict: 'Needs attention'
        },
        review: {
          changeTitle: '{count} worlds will move',
          routeChangeTitle: 'Shard interconnect routes will change',
          routeChangeDescription: 'Updates the connection route without moving or restarting worlds.',
          cancelTitle: 'Pending placement will be canceled',
          cancelDescription: 'The desired location will return to the current applied location after saving.',
          noChangeTitle: 'Runtime location is unchanged',
          noChangeDescription: 'The current selection matches the applied runtime location.',
          confirmTitle: 'Click again to confirm',
          confirmDescription: 'The plan will be saved, then {count} worlds will be provisioned or migrated in sequence.',
          saveOnlyDescription: 'The new runtime placement plan will be saved.',
          overcommitDescription: 'The plan exceeds recommended core capacity. Click again to accept the risk and continue.',
          runtimeTitle: '{count} running worlds will pause briefly',
          runtimeDescription: 'The system stops these worlds safely and restores them at the new location after provisioning or migration. Worlds that were stopped remain stopped.',
          issueTitle: 'Preflight found {count} items to review'
        },
        execution: {
          saving: 'Saving runtime placement',
          migrating: 'Migrating {world}',
          provisioning: 'Provisioning {count} worlds',
          routing: 'Applying Shard interconnect routes',
          pausedTitle: 'Plan saved; execution paused',
          pausedDescription: '{count} machines are not ready. Check their connection and status, then refresh to continue.',
          completedTitle: 'Runtime location applied',
          completedDescription: 'Changes are complete and world locations have been refreshed.',
          notAdvanced: 'The runtime location did not advance after the job completed. Execution stopped; refresh and inspect the Agent and save state.'
        },
        actions: {
          change: 'Assign machines',
          review: 'Review changes',
          reviewing: 'Reviewing',
          confirm: 'Confirm and apply',
          applying: 'Applying'
        },
        feedback: {
          loadFailedTitle: 'Failed to load runtime location',
          loadFailed: 'Failed to load runtime location: {error}',
          previewFailed: 'Runtime placement preflight failed: {error}',
          blocked: 'This change has blocking issues. Resolve them before applying it.',
          applyFailedTitle: 'Failed to apply runtime location',
          applyFailed: 'Failed to apply runtime location: {error}',
          planSaved: 'Runtime placement plan saved. Continue after the target recovers.',
          completed: 'Room runtime location updated'
        }
      },
      batch: {
        open: 'Batch actions',
        title: 'Cross-room batch action',
        description: 'Select the rooms and worlds to operate on.',
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
        runtimeTarget: 'Machine: {name}',
        worldsFailed: 'Failed to load world state',
        capacityTitle: 'Merged cross-room capacity preflight',
        capacityDescription: 'Estimates load from running and newly selected worlds on each machine. You can confirm and continue if the suggested capacity is exceeded.',
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
        description: 'One server may run multiple rooms and Shards. Run at most one Shard per effective CPU. Hosts with up to 2 effective CPUs reserve no whole CPU; hosts with 3 or more reserve 1 CPU for the OS and maintenance. Exceeding this budget may cause lag. This is advisory, not a hard limit or a performance guarantee.'
      },
      planning: {
        title: 'Save desired placement, then provision or migrate',
        description: 'Saving changes desired placement without moving files. Use Provision configuration for the first deployment of a local room to remote nodes. Existing remote Shards must use Migrate. Applied placement changes only after verified atomic publication.'
      },
      risks: {
        conflictTitle: '{count} port or CPU conflicts found',
        conflictDescription: 'Another room uses the same resources, so affected worlds will be blocked from starting. Open advanced details to see the specific ports.',
        overlapTitle: '{count} duplicate port configurations in stopped rooms',
        overlapDescription: 'Stopped rooms may reuse ports. The system blocks the operation only when those rooms are about to start together. New rooms receive distinct ports automatically.',
        overlapPorts: 'Duplicate ports: {ports}',
        issueTitle: '{count} items need attention',
        checkFailedTitle: 'Resource check failed'
      },
      advanced: {
        title: 'Advanced details',
        description: 'Capacity details, ports and CPU, provisioning history, and technical diagnostics',
        viewDetails: 'View details',
        openDiagnostics: 'Open diagnostics'
      },
      capacity: {
        title: 'Node capacity',
        description: 'Planned counts include every registered room and retain currently observed external DST processes.',
        compactTitle: 'Machine capacity',
        compactHint: 'Values show planned worlds / recommended limit. The calculation details are under Advanced details.',
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
        description: 'Configured offline nodes may be selected in advance. After saving, use Provision configuration for a first local-to-remote deployment with missing files, and Migrate for an existing remote save.',
        simpleDescription: 'Read-only comparison of applied and desired placement. Use the room editor above for every placement change.',
        columns: {
          world: 'World',
          role: 'Role',
          desired: 'Desired target',
          applied: 'Applied target',
          state: 'Planning state'
        },
        selectTarget: 'Select a runtime target',
        offlineSuffix: 'offline',
        noAction: 'No action needed',
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
        confirmationDescription: 'The migration belongs to room "{room}".',
        confirm: 'Start migration',
        completed: 'World migrated and applied placement updated',
        completedRefreshFailed: 'The world migration completed, but the latest topology could not be loaded. The previous data remains visible.',
        failed: 'World migration failed: {error}'
      },
      provision: {
        action: 'Provision configuration',
        title: 'Provision room configuration to remote nodes',
        description: 'Create directories and managed configuration for {count} pending Shards in this room.',
        scopeTitle: 'Fixed configuration allowlist only',
        scopeDescription: 'Only cluster.ini, the Cluster Token, special lists, server.ini, world-generation settings, Mod settings, customcommands.lua, and DST Runtime files are included. This does not expose arbitrary path writes, arbitrary uploads, or a remote shell. Transfers use chunk hashes and atomic publication.',
        stoppedTitle: 'Every world in the room must be stopped',
        stoppedDescription: 'Provisioning renders one cross-node cluster.ini and commits applied placement only after every target publishes successfully. A running Shard, an existing target Shard, or a topology change blocks the operation.',
        confirmation: 'Room-name confirmation',
        confirmationDescription: 'Pending configuration will be provisioned for room "{room}".',
        confirm: 'Start provisioning',
        operationTitle: 'Latest configuration provision',
        operationDescription: 'Durable operation state updated at {time}.',
        operationFailure: 'Provisioning did not complete normally',
        operationsLoadFailedTitle: 'Failed to load provision operations',
        recover: 'Continue recovery',
        columns: { world: 'World', target: 'Target node', phase: 'Phase', size: 'Transfer size', updatedAt: 'Updated at' },
        statuses: { running: 'Running', succeeded: 'Completed', rolled_back: 'Rolled back', recovery_required: 'Recovery required', failed: 'Failed', unknown: 'Unknown' },
        phases: { planned: 'Planned', uploading: 'Provisioning', commit_decided: 'Commit decided', topology_committed: 'Topology committed', completed: 'Completed', rolled_back: 'Rolled back', unknown: 'Unknown phase' },
        stepPhases: { not_started: 'Not dispatched', planned: 'Awaiting Agent confirmation', uploading: 'Uploading', published: 'Atomically published', existing: 'Already on applied target', completed: 'Cleanup complete', rolled_back: 'Rolled back', unknown: 'Unknown phase' },
        completed: 'Room configuration provisioned and applied placement committed together',
        completedRefreshFailed: 'The provision job ended, but the latest topology or durable operation state could not be loaded. Refresh and verify.',
        failed: 'Configuration provisioning failed: {error}',
        recovered: 'Configuration provisioning recovery completed',
        recoverFailed: 'Configuration provisioning recovery is still incomplete: {error}'
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
        description: 'After this plan, at least one node exceeds its dynamic recommended capacity. Hosts with up to 2 effective CPUs reserve no whole CPU; hosts with 3 or more reserve 1 CPU. Continuing may cause tick delay, network jitter, or lag, but it will not immediately start or migrate any Shard.',
        cancel: 'Review plan',
        confirm: 'Acknowledge and save'
      },
      time: {
        unavailable: 'No observation time'
      }
    }
  }
}

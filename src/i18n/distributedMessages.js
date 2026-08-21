export const distributedMessages = {
  'zh-CN': {
    distributed: {
      runtime: {
        title: '集中运行状态',
        description: '按当前生效 Placement 聚合本机与远程节点的进程、Runtime 健康和诊断数据。',
        loading: '正在读取集中运行状态',
        loadFailed: '集中运行状态加载失败',
        notReadyTitle: '部分远程执行条件尚未满足',
        notReadyDescription: '检查节点在线状态、Runtime 配置、清单新鲜度和 Placement 问题后再执行操作。',
        stream: { connecting: '事件流重连中', live: '实时事件已连接', partial: '部分事件流重连中', unavailable: '事件流不可用' },
        summary: { total: '世界总数', healthy: '健康', degraded: '需关注', unavailable: '不可用', running: '运行中', planned: '待迁移' },
        columns: { world: '世界', target: '生效节点', runtime: '进程状态', health: 'Runtime 健康', diagnostic: '最近诊断', observedAt: '数据时间' },
        states: { healthy: '健康', degraded: '需关注', unavailable: '不可用' },
        runtimeStates: { running: '运行中', stopped: '已停止', starting: '启动中', failed: '失败', unknown: '未知' },
        freshness: { live: '实时', stale: '已过期', unavailable: '不可用' },
        noHealth: '尚无健康快照',
        healthReady: 'Runtime 已就绪',
        healthNotReady: 'Runtime 尚未就绪',
        noDiagnostic: '尚无诊断结果',
        diagnosticAvailable: '诊断结果可用'
      },
      diagnostics: {
        title: '集中 Runtime 诊断',
        description: '按生效 Placement 在本机或远程 Agent 上读取事件并执行诊断，不依赖当前手动选择的管理目标。',
        room: '房间',
        selectRoom: '选择已接管房间',
        loadRoomsFailed: '房间列表加载失败',
        noRoomsTitle: '没有可诊断的房间',
        noRoomsDescription: '创建或接管房间，并完成 Runtime 安装后即可使用集中诊断。',
        action: '打开诊断',
        selectedTitle: '正在诊断 {world}',
        selectedDescription: '请求将由控制中心发送到生效节点 {target}。',
        selectWorldTitle: '选择一个世界开始诊断',
        selectWorldDescription: '上方列表同时展示本机和远程世界；只有运行中且节点在线的世界可以执行诊断。'
      },
      roomLogs: {
        title: '房间实时日志',
        description: '按生效 Placement 同时读取所有分片；单个节点异常不会隐藏其他世界的日志。',
        query: '日志关键词', queryPlaceholder: '搜索所有世界的日志', loadFailed: '房间日志加载失败',
        partialTitle: '部分世界日志不可用', partialDescription: '{count} 个世界读取失败，其他可用日志仍已显示。',
        available: '{available} / {total} 可用', availableStatus: '可用', unavailable: '不可用', readAt: '读取于 {time}',
        emptyTitle: '房间还没有世界', emptyDescription: '创建世界后可在这里集中检查实时日志。',
        file: '文件', size: '大小', updatedAt: '文件更新时间', noMatchesTitle: '没有匹配日志',
        noMatchesDescription: '当前关键词在该世界最近的日志中没有匹配项。', roles: { master: '主世界', caves: '洞穴', custom: '自定义分片' }
      },
      worldStates: {
        title: '房间世界状态', description: '同时展示所有分片的季节、时间与数据新鲜度；未采样世界也不会从列表消失。',
        total: '{count} 个世界', loadFailed: '房间世界状态加载失败', emptyTitle: '房间还没有世界',
        emptyDescription: '创建世界后可在这里集中检查状态。', notObserved: '尚未采样', cycles: '已完成 {count} 个昼夜循环',
        columns: { world: '世界', runtime: '进程', season: '季节 / 天数', phase: '时间阶段', temperature: '温度', freshness: '数据时间' },
        roles: { master: '主世界', caves: '洞穴', custom: '自定义分片' }
      },
      infrastructure: {
        title: '运行基础设施',
        description: '统一查看 Runtime Provider、执行环境、网络作用域、端口租约和 CPU 分配。',
        loading: '正在读取运行基础设施',
        loadFailed: '运行基础设施加载失败',
        savedRefreshFailed: '配置已保存，但最新基础设施状态读取失败，当前继续显示上次数据',
        conflictTitle: '资源预检发现冲突',
        conflictDescription: '当前存在 {count} 个端口或 CPU 冲突，相关世界启动前会被阻止。',
        roomResourcesTitle: '当前房间资源',
        roomResourcesDescription: '端口按网络作用域判冲突；CPU 默认不绑核，独占策略必须覆盖完整物理核心。',
        columns: { provider: 'Provider', environment: '执行环境', network: '网络', cpu: 'CPU 拓扑', observedAt: '观测时间', world: '世界', ports: '端口租约', cpuPolicy: 'CPU 策略' },
        providerKinds: { local: '本机', agent: 'Agent' },
        environmentKinds: { native: '裸机', container: '容器' },
        portPurposes: { dst_server: '玩家', cluster_master: '分片通信', steam_authentication: 'Steam 鉴权', steam_master_server: 'Steam 列表', unknown: '未知' },
        cpuSummary: '{physical} 物理核 / {logical} 逻辑 CPU',
        cpuTopologyReady: '物理核心与 SMT 拓扑可用',
        cpuTopologyMissing: '仅提供保守容量估算',
        editNetwork: '编辑网络地址',
        configureCPU: '配置 CPU',
        cpuPolicies: { none: '不绑核', shared: '共享 CPU', exclusive: '独占物理核心' },
        cpuPolicyDescriptions: {
          none: '交给操作系统调度，仅保留一核一层的容量提醒。',
          shared: '限制到选中的逻辑 CPU，但允许多个世界共享。',
          exclusive: '为该世界独占完整物理核心，不能与其他世界重叠。'
        },
        cpuUnbound: '由系统调度',
        logicalCPUSelection: '逻辑 CPU：{cpus}',
        cpuExecutionStates: { desired: '等待执行', prepared: '已准备', applied: '已生效', released: '已释放', failed: '执行失败', unknown: '未观测' },
        cpuObserved: '实际 CPU：{cpus} · {time}',
        networkDialog: {
          title: '编辑网络 Profile',
          description: '监听地址属于进程，公布地址必须能被其他分片或玩家实际访问。',
          name: '名称',
          bindAddress: '监听地址',
          bindDescription: '留空时使用 0.0.0.0；裸机和 host 网络不要把跨节点通信限制在 loopback。',
          advertiseAddress: '公布地址',
          advertiseDescription: '本机单节点可留空；跨节点场景填写其他服务器可以访问的 IP 或主机名。',
          required: '此项不能为空',
          saved: '网络 Profile 已更新'
        },
        cpuDialog: {
          title: '配置 {world} 的 CPU',
          description: '容量提醒、CPU quota 与独占绑核是不同能力；此处只配置该世界的 CPU 放置。',
          policy: 'CPU 策略',
          logicalCPUs: '逻辑 CPU',
          logicalCPUDescription: '独占模式需要选择同一物理核心的全部 SMT sibling。',
          topologyMissingTitle: '节点没有上报 CPU 拓扑',
          topologyMissingDescription: '仍可按逻辑 CPU 使用共享策略，但无法安全使用独占物理核心；刷新 Agent 清单后可获得完整拓扑。',
          coreIdentity: '封装 {package} / 物理核心 {core}',
          logicalCPUOnly: '未上报物理核心与 SMT 关系',
          allowSMTRisk: '允许不完整 SMT sibling 选择',
          allowSMTRiskDescription: '仅用于明确了解拓扑风险的兼容场景；可能造成资源竞争。',
          invalidTitle: 'CPU 分配无效',
          saved: 'CPU 分配已更新'
        }
      },
      kubernetes: {
        title: 'Kubernetes Provider',
        description: '查看 Kubernetes 实验运行边界、只读能力和生产化安全门禁。',
        experimental: '实验能力',
        available: '可用',
        unavailable: '不可用',
        verified: '已验证',
        unverified: '未验证',
        loadFailed: 'Kubernetes Provider 状态加载失败',
        status: { disabled: '默认关闭', configuration_required: '需要配置', available: '配置可用' },
        disabled: {
          title: 'Kubernetes Provider 默认关闭',
          description: '启用并完成受信配置后，仅开放资源观察、预检和类型化计划预览。'
        },
        configuration: {
          title: 'Kubernetes Provider 尚未完成配置',
          description: '检查 Provider 配置、HTTPS API Server、CA 和 bearer token 文件。'
        },
        readOnly: {
          title: '当前仅提供只读观察与预检',
          description: 'Apply 始终关闭；生命周期、Console、Mod 同步和备份恢复尚未开放。SQLite 控制面仍须单副本运行。'
        },
        provider: {
          provider: 'Provider', namespace: 'Namespace', image: '固定摘要镜像', profiles: '受信 Profile', freshness: '最大观测时效',
          profileCount: '{storage} 个存储 / {compute} 个计算', freshnessValue: '{seconds} 秒'
        },
        columns: { capability: '能力', gate: '安全门禁', state: '状态' },
        features: {
          title: 'Provider 能力', observe: '受管资源观察', preflight: 'Shard 安全预检', typed_plan: '类型化计划预览',
          apply: '应用 Kubernetes 变更', lifecycle: 'Shard 生命周期', console: 'Console 通道', mods: 'Mod 分发',
          backup_restore: '一致性备份与恢复', unknown: '未知能力'
        },
        gates: {
          title: '生产化门禁', lease_fencing_admission: 'Lease / fencing admission', lease_aware_supervisor: 'Lease 感知 Supervisor',
          pod_uid_ownership: 'Pod UID 所有权', pvc_uid_ownership: 'PVC UID 所有权', network_policy: 'NetworkPolicy 强制执行',
          secondary_master_dns: 'Secondary 到 Master DNS', published_udp: '公网 UDP / Steam', exclusive_cpu: '独占物理核心', unknown: '未知门禁'
        }
      },
      backups: {
        tab: '房间备份',
        title: '房间备份',
        description: '把房间内的所有世界保存为一份完整备份。',
        room: '房间',
        selectRoom: '选择已接管房间',
        create: '创建备份',
        restore: '恢复',
        details: '详情',
        notRestorableTitle: '这不是可恢复的世界存档',
        notRestorable: '该记录仅包含配置或缺少 Session 存档证据，不能恢复世界。',
        contentKinds: { gameSave: '世界存档', configurationOnly: '仅配置', unknown: '未确认内容' },
        saveEvidence: { session: 'Session：{value}', latestSnapshot: '最新快照：{value}', shardIndexPresent: 'shardindex 已校验', shardIndexMissing: '缺少 shardindex' },
        modesTitle: '默认不停服备份',
        modesDescription: '默认保持玩家在线；只有运行环境不支持同步保存时，才需要手动改为停止后备份。',
        modes: { cold: '停止后备份', hot: '不停服备份' },
        coldTitle: '当前使用 Cold-consistent 模式',
        coldDescription: '创建备份时按 Secondary → Master 停止全部分片，完成校验后按 Master → Secondary 恢复原运行状态。固定等待不会被当成热备份证据。',
        loadFailed: '备份加载失败',
        operationsLoadFailed: '备份操作记录加载失败',
        loading: '正在读取备份',
        emptyTitle: '还没有备份',
        emptyDescription: '创建第一份备份后，可以在这里恢复房间的全部世界。',
        columns: { name: '备份名称', status: '状态', mode: '备份方式', parts: '世界校验', size: '压缩大小', running: '原运行世界', createdAt: '创建时间' },
        partCount: '{verified} / {total} 已校验',
        statuses: { creating: '创建中', verified: '已校验', partial: '部分完成', failed: '失败', corrupt: '已损坏', unknown: '未知' },
        partStatuses: { pending: '等待中', staging: '暂存中', verified: '已校验', failed: '失败', unknown: '未知' },
        operationKinds: { create: '创建备份', restore: '恢复存档', unknown: '备份操作' },
        operationStatuses: { running: '操作进行中', succeeded: '操作完成', rolled_back: '已安全回滚', recovery_required: '需要恢复', failed: '操作失败', unknown: '状态未知' },
        operationPhases: { planned: '已规划', barrier_preparing: '正在准备分片屏障', barrier_committing: '正在触发统一保存', barrier_waiting: '正在等待保存回执', stopping: '正在停服', staging: '正在暂存备份', protecting: '正在创建系统快照', preparing: '正在准备恢复', prepared: '恢复内容已准备', publishing: '正在写入存档', published: '存档已写入', completing: '正在完成清理', completed: '已完成', failed: '已失败', rolled_back: '已回滚', recovered: '已恢复或回滚', unknown: '未知阶段' },
        partColumns: { world: '世界', target: '节点', status: '状态', barrier: '保存屏障证据' },
        recoveryRequiredTitle: '{count} 个备份操作需要恢复',
        recoveryRequiredDescription: '备份创建或存档恢复的清理、回滚、原运行状态恢复尚未完成。系统会后台重试，也可以立即手动重试。',
        retryRecovery: '立即重试恢复',
        operationSummary: '最近{kind}操作：{status}',
        operationUpdatedAt: '操作状态更新于 {time}',
        operationPhase: '操作阶段',
        protectionSet: '恢复前系统快照',
        createDialog: {
          title: '创建房间备份',
          description: '系统会自动备份房间内的全部世界，无需选择世界所在机器。',
          mode: '备份方式',
          modeOptions: { cold: '停止后备份', hot: '不停服备份（默认）' },
          modeDescriptions: {
            cold: '暂时停止全部世界后备份，兼容性最高。',
            hot: '默认方式。保持房间运行，并在所有世界完成同一次保存后备份。'
          },
          interruptionTitle: '房间会短暂停服',
          interruptionDescription: '操作将获取房间租约，停止所有世界，逐节点生成并校验备份，最后恢复原先运行中的世界。',
          requirementTitles: { cold: '房间会短暂停服', hot: '默认保持房间运行' },
          requirementDescriptions: {
            cold: '系统会依次停止全部世界，完成备份和校验后自动恢复原来的运行状态。',
            hot: '系统会等待所有运行中的世界完成同一次保存；任一世界无法确认时都会终止备份，不会停服、不会生成不完整备份。此时可手动改选停止后备份。'
          },
          name: '备份名称',
          namePlaceholder: '留空则使用当前时间',
          nameDescription: '最多 128 个字符。',
          confirm: { cold: '停服并创建', hot: '在线创建' }
        },
        errors: { hotUnavailable: '当前房间无法确认所有世界已完成同一次保存。房间没有停服，请改选“停止后备份”后重试。' },
        detailsDialog: { title: '备份详情', description: '查看各世界的文件校验结果和不停服备份保存证据。', manifest: '校验清单版本', files: '文件数', contentKind: '备份内容', topologyRevision: '拓扑版本', barrierId: '保存批次 ID', snapshot: '统一快照序号', snapshotTransition: '快照 {before} → {after}' },
        restoreDialog: {
          title: '恢复一致性备份',
          description: '系统会先创建保护快照，再安全写入所有世界并恢复原运行状态。',
          overwriteTitle: '这会覆盖当前房间存档',
          overwriteDescription: '拓扑版本、文件完整性或目标节点不满足条件时，恢复会停止并进入可审计的恢复流程。',
          confirmation: '房间名确认',
          confirmationDescription: '输入“{room}”确认恢复。',
          confirm: '创建保护快照并恢复'
        },
        feedback: { created: '存档备份已创建并校验', createdRefreshFailed: '备份任务已完成，但最新备份列表读取失败，当前继续显示上次数据', createFailed: '创建存档备份失败：{error}', detailsFailed: '读取备份详情失败：{error}', restored: '存档恢复完成', restoreFailed: '恢复存档失败：{error}', recoveryPending: '存档已写入，但仍有恢复清理待完成', operationStateUnknown: '任务已结束，但未能确认持久化操作状态，请刷新后复核', recovered: '恢复清理已完成', recoverFailed: '恢复清理仍未完成：{error}' }
      }
    }
  },
  'en-US': {
    distributed: {
      runtime: {
        title: 'Centralized runtime status',
        description: 'Aggregate process, Runtime health, and diagnostics from local and remote nodes by applied placement.',
        loading: 'Loading centralized runtime status', loadFailed: 'Failed to load centralized runtime status',
        notReadyTitle: 'Some remote execution prerequisites are not ready', notReadyDescription: 'Check node connectivity, Runtime configuration, inventory freshness, and placement issues before running operations.',
        stream: { connecting: 'Event stream reconnecting', live: 'Live events connected', partial: 'Some event streams are reconnecting', unavailable: 'Event stream unavailable' },
        summary: { total: 'Worlds', healthy: 'Healthy', degraded: 'Needs attention', unavailable: 'Unavailable', running: 'Running', planned: 'Awaiting migration' },
        columns: { world: 'World', target: 'Applied target', runtime: 'Process', health: 'Runtime health', diagnostic: 'Latest diagnostic', observedAt: 'Observed at' },
        states: { healthy: 'Healthy', degraded: 'Needs attention', unavailable: 'Unavailable' },
        runtimeStates: { running: 'Running', stopped: 'Stopped', starting: 'Starting', failed: 'Failed', unknown: 'Unknown' },
        freshness: { live: 'Live', stale: 'Stale', unavailable: 'Unavailable' },
        noHealth: 'No health snapshot', healthReady: 'Runtime ready', healthNotReady: 'Runtime not ready', noDiagnostic: 'No diagnostic result', diagnosticAvailable: 'Diagnostic available'
      },
      diagnostics: {
        title: 'Centralized Runtime diagnostics',
        description: 'Read events and run diagnostics on the local host or a remote Agent by applied Placement, independent of the manually selected management target.',
        room: 'Room',
        selectRoom: 'Select a managed room',
        loadRoomsFailed: 'Failed to load rooms',
        noRoomsTitle: 'No room is ready for diagnostics',
        noRoomsDescription: 'Create or adopt a room and install its Runtime to use centralized diagnostics.',
        action: 'Open diagnostics',
        selectedTitle: 'Diagnosing {world}',
        selectedDescription: 'The control plane sends requests to the applied target {target}.',
        selectWorldTitle: 'Select a world to begin',
        selectWorldDescription: 'The table above includes local and remote worlds. Diagnostics are available only while the world is running and its target is online.'
      },
      roomLogs: {
        title: 'Room live logs',
        description: 'Read every Shard through its applied Placement while retaining available logs when one target fails.',
        query: 'Log query', queryPlaceholder: 'Search logs across all worlds', loadFailed: 'Failed to load room logs',
        partialTitle: 'Some world logs are unavailable', partialDescription: '{count} worlds failed while all available logs remain visible.',
        available: '{available} / {total} available', availableStatus: 'Available', unavailable: 'Unavailable', readAt: 'Read at {time}',
        emptyTitle: 'This room has no worlds', emptyDescription: 'Create a world to inspect its live logs here.',
        file: 'File', size: 'Size', updatedAt: 'File updated', noMatchesTitle: 'No matching logs',
        noMatchesDescription: 'The current query did not match the recent logs for this world.', roles: { master: 'Master', caves: 'Caves', custom: 'Custom Shard' }
      },
      worldStates: {
        title: 'Room world state', description: 'Show season, phase, and freshness for every Shard without dropping worlds that have not been sampled.',
        total: '{count} worlds', loadFailed: 'Failed to load room world state', emptyTitle: 'This room has no worlds',
        emptyDescription: 'Create a world to inspect its state here.', notObserved: 'Not sampled', cycles: '{count} completed day-night cycles',
        columns: { world: 'World', runtime: 'Process', season: 'Season / days', phase: 'Phase', temperature: 'Temperature', freshness: 'Observed at' },
        roles: { master: 'Master', caves: 'Caves', custom: 'Custom Shard' }
      },
      infrastructure: {
        title: 'Runtime infrastructure', description: 'Inspect Runtime providers, execution environments, network scopes, port leases, and CPU allocations.', loading: 'Loading runtime infrastructure', loadFailed: 'Failed to load runtime infrastructure', savedRefreshFailed: 'The configuration was saved, but the latest infrastructure state could not be loaded. The previous data remains visible.',
        conflictTitle: 'Resource preflight found conflicts', conflictDescription: '{count} port or CPU conflicts currently block related worlds from starting.', roomResourcesTitle: 'Current room resources', roomResourcesDescription: 'Ports conflict within their network scope. CPU is unbound by default; exclusive mode must select a complete physical core.',
        columns: { provider: 'Provider', environment: 'Environment', network: 'Network', cpu: 'CPU topology', observedAt: 'Observed at', world: 'World', ports: 'Port leases', cpuPolicy: 'CPU policy' },
        providerKinds: { local: 'Local', agent: 'Agent' }, environmentKinds: { native: 'Native', container: 'Container' },
        portPurposes: { dst_server: 'Players', cluster_master: 'Shard link', steam_authentication: 'Steam auth', steam_master_server: 'Steam listing', unknown: 'Unknown' },
        cpuSummary: '{physical} physical / {logical} logical', cpuTopologyReady: 'Physical-core and SMT topology available', cpuTopologyMissing: 'Conservative capacity estimate only', editNetwork: 'Edit network addresses', configureCPU: 'Configure CPU',
        cpuPolicies: { none: 'Unbound', shared: 'Shared CPUs', exclusive: 'Exclusive physical core' },
        cpuPolicyDescriptions: { none: 'Let the OS schedule this world and retain advisory capacity checks only.', shared: 'Constrain the world to selected logical CPUs while allowing sharing.', exclusive: 'Reserve complete non-overlapping physical cores for this world.' },
        cpuUnbound: 'Scheduled by the OS', logicalCPUSelection: 'Logical CPUs: {cpus}',
        cpuExecutionStates: { desired: 'Pending execution', prepared: 'Prepared', applied: 'Applied', released: 'Released', failed: 'Execution failed', unknown: 'Not observed' },
        cpuObserved: 'Effective CPUs: {cpus} · {time}',
        networkDialog: { title: 'Edit network profile', description: 'The bind address belongs to the process; the advertised address must be reachable by other Shards or players.', name: 'Name', bindAddress: 'Bind address', bindDescription: 'An empty value defaults to 0.0.0.0. Do not use loopback for cross-node communication.', advertiseAddress: 'Advertised address', advertiseDescription: 'Leave empty for a local single-node setup, or use an IP or hostname reachable from the other servers.', required: 'This field is required', saved: 'Network profile updated' },
        cpuDialog: { title: 'Configure CPU for {world}', description: 'Capacity guidance, quotas, and exclusive pinning are separate capabilities. This form configures CPU placement only.', policy: 'CPU policy', logicalCPUs: 'Logical CPUs', logicalCPUDescription: 'Exclusive mode must include every SMT sibling of a selected physical core.', topologyMissingTitle: 'Physical CPU topology was not reported', topologyMissingDescription: 'Shared logical-CPU limits remain available, but exclusive physical-core pinning is unsafe until the Agent inventory includes complete topology.', coreIdentity: 'Package {package} / physical core {core}', logicalCPUOnly: 'Physical-core and SMT relationship unavailable', allowSMTRisk: 'Allow incomplete SMT sibling selection', allowSMTRiskDescription: 'Compatibility escape hatch for operators who understand the contention risk.', invalidTitle: 'Invalid CPU allocation', saved: 'CPU allocation updated' }
      },
      kubernetes: {
        title: 'Kubernetes Provider',
        description: 'Inspect the experimental Kubernetes runtime boundary, read-only capabilities, and production safety gates.',
        experimental: 'Experimental',
        available: 'Available',
        unavailable: 'Unavailable',
        verified: 'Verified',
        unverified: 'Unverified',
        loadFailed: 'Failed to load Kubernetes Provider state',
        status: { disabled: 'Default off', configuration_required: 'Configuration required', available: 'Configured' },
        disabled: {
          title: 'Kubernetes Provider is off by default',
          description: 'After trusted configuration, only observation, preflight, and typed plan preview become available.'
        },
        configuration: {
          title: 'Kubernetes Provider configuration is incomplete',
          description: 'Check the Provider configuration, HTTPS API Server, CA, and bearer token files.'
        },
        readOnly: {
          title: 'Observation and preflight only',
          description: 'Apply remains disabled. Lifecycle, Console, Mod sync, and backup/restore are unavailable. The SQLite control plane remains single-replica.'
        },
        provider: {
          provider: 'Provider', namespace: 'Namespace', image: 'Digest-pinned image', profiles: 'Trusted profiles', freshness: 'Observation age limit',
          profileCount: '{storage} storage / {compute} compute', freshnessValue: '{seconds} seconds'
        },
        columns: { capability: 'Capability', gate: 'Safety gate', state: 'State' },
        features: {
          title: 'Provider capabilities', observe: 'Managed resource observation', preflight: 'Shard safety preflight', typed_plan: 'Typed plan preview',
          apply: 'Apply Kubernetes changes', lifecycle: 'Shard lifecycle', console: 'Console transport', mods: 'Mod distribution',
          backup_restore: 'Consistent backup and restore', unknown: 'Unknown capability'
        },
        gates: {
          title: 'Production gates', lease_fencing_admission: 'Lease / fencing admission', lease_aware_supervisor: 'Lease-aware supervisor',
          pod_uid_ownership: 'Pod UID ownership', pvc_uid_ownership: 'PVC UID ownership', network_policy: 'Enforced NetworkPolicy',
          secondary_master_dns: 'Secondary-to-Master DNS', published_udp: 'Published UDP / Steam', exclusive_cpu: 'Exclusive physical core', unknown: 'Unknown gate'
        }
      },
      backups: {
        tab: 'Room backups', title: 'Room backups', description: 'Save every world in a room as one complete backup.', room: 'Room', selectRoom: 'Select a managed room', create: 'Create backup', restore: 'Restore', details: 'Details',
        notRestorableTitle: 'This is not a restorable world save', notRestorable: 'This record contains configuration only or lacks Session save evidence and cannot restore a world.', contentKinds: { gameSave: 'World save', configurationOnly: 'Configuration only', unknown: 'Unconfirmed content' },
        saveEvidence: { session: 'Session: {value}', latestSnapshot: 'Latest snapshot: {value}', shardIndexPresent: 'shardindex verified', shardIndexMissing: 'shardindex missing' },
        modesTitle: 'Online backup by default', modesDescription: 'Players stay online by default. Choose a stopped backup manually only when the runtime cannot coordinate online saves.', modes: { cold: 'Stop, then back up', hot: 'Back up online' },
        coldTitle: 'Stopped backup mode is active', coldDescription: 'Backups stop Secondary Shards before Master, verify all parts, then restore the previous state by starting Master before Secondary. A fixed delay is never treated as online-backup evidence.', loadFailed: 'Failed to load backups', operationsLoadFailed: 'Failed to load backup operations', loading: 'Loading backups', emptyTitle: 'No backups yet', emptyDescription: 'Create your first backup to restore every world in the room together.',
        columns: { name: 'Backup name', status: 'Status', mode: 'Backup method', parts: 'World verification', size: 'Compressed size', running: 'Previously running', createdAt: 'Created at' }, partCount: '{verified} / {total} verified',
        statuses: { creating: 'Creating', verified: 'Verified', partial: 'Partial', failed: 'Failed', corrupt: 'Corrupt', unknown: 'Unknown' }, partStatuses: { pending: 'Pending', staging: 'Staging', verified: 'Verified', failed: 'Failed', unknown: 'Unknown' },
        operationKinds: { create: 'backup creation', restore: 'save restore', unknown: 'backup' },
        operationStatuses: { running: 'Operation running', succeeded: 'Operation complete', rolled_back: 'Safely rolled back', recovery_required: 'Recovery required', failed: 'Operation failed', unknown: 'Unknown status' },
        operationPhases: { planned: 'Planned', barrier_preparing: 'Preparing Shard barriers', barrier_committing: 'Triggering coordinated save', barrier_waiting: 'Waiting for save receipts', stopping: 'Stopping Shards', staging: 'Staging backup', protecting: 'Creating system snapshot', preparing: 'Preparing restore', prepared: 'Restore prepared', publishing: 'Writing saves', published: 'Saves written', completing: 'Completing cleanup', completed: 'Completed', failed: 'Failed', rolled_back: 'Rolled back', recovered: 'Recovered or rolled back', unknown: 'Unknown phase' },
        partColumns: { world: 'World', target: 'Target', status: 'Status', barrier: 'Save-barrier proof' },
        recoveryRequiredTitle: '{count} backup operations need recovery', recoveryRequiredDescription: 'Cleanup, rollback, or prior runtime restoration remains incomplete for a backup creation or save restore. The system retries in the background, and you can retry immediately.', retryRecovery: 'Retry recovery now',
        operationSummary: 'Latest {kind} operation: {status}', operationUpdatedAt: 'Operation status updated at {time}', operationPhase: 'Operation phase', protectionSet: 'Pre-restore system snapshot',
        createDialog: { title: 'Create room backup', description: 'The system includes every world automatically, regardless of where it runs.', mode: 'Backup method', modeOptions: { cold: 'Stop, then back up', hot: 'Online backup (default)' }, modeDescriptions: { cold: 'Temporarily stop every world for maximum compatibility.', hot: 'Default method. Keep the room running and back up after every world completes the same save.' }, interruptionTitle: 'The room will stop briefly', interruptionDescription: 'The operation stops all worlds, creates and verifies the backup, then restores the previous running state.', requirementTitles: { cold: 'The room will stop briefly', hot: 'Keep the room running by default' }, requirementDescriptions: { cold: 'The system stops every world in order, verifies the backup, and automatically restores the previous running state.', hot: 'The system waits for every running world to complete the same save. If any world cannot be confirmed, the backup ends without stopping the room or creating an incomplete backup. You can then choose a stopped backup manually.' }, name: 'Backup name', namePlaceholder: 'Leave empty to use the current time', nameDescription: 'Maximum 128 characters.', confirm: { cold: 'Stop and create', hot: 'Create online' } },
        errors: { hotUnavailable: 'The system could not confirm that every world completed the same save. The room stayed online; choose “Stop, then back up” and retry.' },
        detailsDialog: { title: 'Backup details', description: 'Review file verification for every world and the save evidence for online backups.', manifest: 'Verification format', files: 'Files', contentKind: 'Backup content', topologyRevision: 'Topology revision', barrierId: 'Save batch ID', snapshot: 'Coordinated snapshot', snapshotTransition: 'Snapshot {before} → {after}' },
        restoreDialog: { title: 'Restore save backup', description: 'A protection snapshot is created before every world save is written safely and its previous runtime state is restored.', overwriteTitle: 'This overwrites the current room save', overwriteDescription: 'Topology, integrity, or target failures stop the restore and enter an auditable recovery path.', confirmation: 'Room-name confirmation', confirmationDescription: 'Enter "{room}" to confirm restore.', confirm: 'Create snapshot and restore' },
        feedback: { created: 'Save backup created and verified', createdRefreshFailed: 'The backup completed, but the latest backup list could not be loaded. The previous data remains visible.', createFailed: 'Failed to create save backup: {error}', detailsFailed: 'Failed to load backup details: {error}', restored: 'Save restored', restoreFailed: 'Failed to restore save: {error}', recoveryPending: 'Save data was written, but recovery cleanup is still pending', operationStateUnknown: 'The job finished, but its durable operation state could not be confirmed. Refresh and verify before continuing.', recovered: 'Recovery cleanup completed', recoverFailed: 'Recovery cleanup is still incomplete: {error}' }
      }
    }
  }
}

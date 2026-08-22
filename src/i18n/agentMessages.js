export const agentMessages = {
  'zh-CN': {
    agents: {
      profile: {
        title: '部署角色',
        description: '当前实例既能管理本机，也能按需接入多台裸机或 All-in-One 节点。',
        loading: '正在读取部署配置',
        roleLabel: '管理角色',
        roleDescription: '部署封装不变，只调整本机执行器与集中管理连接。',
        packaging: {
          native: '裸机部署',
          all_in_one: 'All-in-One',
          container: 'Docker 独立世界',
          control_plane: '独立控制端'
        },
        roles: {
          standalone: {
            label: '仅管理本机',
            description: '直接控制本机 DST，不开放节点接入。'
          },
          controller_worker: {
            label: '本机 + 集中管理',
            description: '管理本机，同时接入其他裸机或 All-in-One。'
          },
          managed_worker: {
            label: '加入管理中心',
            description: '本机 DST 由一个上级管理中心统一控制。'
          },
          controller_only: {
            label: '仅集中管理',
            description: '不控制本机 DST，只管理已接入节点。'
          }
        },
        connection: {
          connected: '已连接上级',
          disconnected: '上级未连接'
        },
        controllerUrl: {
          label: '上级管理中心地址',
          description: '使用 ws:// 或 wss:// 地址，并指向管理中心的 /agent。'
        },
        memberKey: {
          label: '节点连接密钥',
          description: '填写上级管理中心“安全配置”中生成的通信密钥；已保存的密钥不会回显。',
          placeholder: '粘贴节点连接密钥',
          configuredPlaceholder: '已配置，留空保持不变'
        },
        environmentManaged: {
          title: '角色由环境变量管理',
          description: '当前部署锁定了一个或多个角色开关，请修改部署环境后重启。'
        },
        restart: {
          title: '配置等待重启生效',
          description: '页面展示的运行角色仍是当前进程状态；重启管理服务后才会切换。'
        },
        unsupported: {
          title: '后端尚不支持统一部署角色',
          description: '请先升级后端，再配置集中管理。'
        },
        validation: {
          controllerUrlRequired: '请输入上级管理中心地址',
          memberKeyRequired: '首次加入管理中心必须填写节点连接密钥'
        },
        actions: {
          save: '保存角色'
        },
        saveHint: '角色变化需要重启当前管理服务，不会自动重启 DST 世界。',
        feedback: {
          loadFailed: '部署配置加载失败',
          invalid: '部署配置校验失败',
          unchanged: '部署角色没有变化',
          saved: '部署角色已保存，请重启管理服务使其生效',
          saveFailed: '保存部署角色失败'
        }
      },
      list: {
        title: '机器管理',
        subtitle: '统一管理本机和已接入的远程机器；机器名称可自定义，主机名保持不变。',
        loadingAria: '正在读取机器状态',
        metrics: {
          online: '在线 Agent',
          onlineDescription: '当前保持连接的节点',
          total: 'Agent 总数',
          totalDescription: '已注册的远程节点',
          operatingSystems: '操作系统',
          operatingSystemsDescription: '已接入的系统类型',
          summaryAria: '节点运行摘要',
          onlineSummary: '{online}/{total} 台机器在线',
          shardSummary: '远程运行世界 {count}',
          capacitySummary: '{count} 个远程容量提醒'
        },
        actions: {
          details: '详情',
          rename: '重命名机器',
          systemSettings: '系统设置',
          runtimeConfig: '运行时配置',
          configureRuntime: '配置远程运行时',
          executeCommand: '执行命令',
          remove: '移除',
          refreshInventory: '刷新节点清单',
          expandTopology: '展开房间和世界',
          collapseTopology: '收起房间和世界'
        },
        fields: {
          system: '系统',
          ipAddress: 'IP 地址',
          cpuCores: '{count} 核心',
          topology: '拓扑',
          node: '机器',
          worldCapacity: '运行环境 / 世界容量',
          cpu: 'CPU',
          memory: '内存',
          memoryAvailable: '可用 {value}',
          uptime: '运行时间',
          user: '用户',
          path: '路径',
          lastHeartbeat: '最后心跳',
          observedAt: '数据时间',
          actions: '操作',
          physicalCores: '{count} 个物理核心',
          logicalProcessors: '{count} 个逻辑处理器',
          installation: 'DST 安装',
          savePath: '存档路径',
          serverPath: '服务端路径',
          inventoryReceivedAt: '控制端接收时间',
          masterPort: 'Master 端口 {port}',
          shard: '世界分片',
          role: '角色',
          ports: '端口',
          process: '进程',
          processResources: '进程资源',
          memoryUsage: '内存使用',
          memoryUsageAria: '{name} 内存使用率'
        },
        values: {
          notAvailable: '不可用',
          unknown: '未知',
          unknownNode: '未命名节点',
          localMachine: '本机',
          defaultRuntime: '本机 DST',
          estimated: '估算',
          available: '可用',
          missing: '缺失',
          clusterKeyReady: 'Cluster Key 已配置',
          clusterKeyMissing: 'Cluster Key 缺失',
          running: '运行中',
          stopped: '未运行'
        },
        duration: {
          daysHours: '{days} 天 {hours} 小时',
          hoursMinutes: '{hours} 小时 {minutes} 分钟',
          minutes: '{minutes} 分钟'
        },
        capacity: {
          policyTitle: '同机多世界容量建议',
          policyDescription: '同一服务器可以运行多个房间和多个世界分片。每个运行中的 Shard 至少预留 1 个物理核心，并额外为系统、Agent、SteamCMD 与备份任务保留 1 核；这是保守提醒，不是强制限制或性能保证。',
          localRecommendation: '按物理核心建议最多运行 {count} 层世界',
          progressAria: '{name} 的世界分片容量使用率',
          states: {
            available: '可用',
            full: '已满载',
            overcommitted: '已超配',
            unknown: '未知'
          },
          available: '运行 {running}/{limit}，还可安排 {available} 层',
          full: '运行 {running}/{limit}，已达到建议上限',
          overcommitted: '运行 {running}/{limit}，同一核心承载多层世界可能卡顿',
          unknown: '缺少新鲜的物理核心或世界进程数据'
        },
        inventory: {
          loading: '读取中',
          current: '数据正常',
          stale: '数据已过期',
          waiting: '等待采集',
          configured: '运行时已配置',
          notConfigured: '未配置运行时',
          upgradeRequired: '需升级 Agent',
          agentOffline: 'Agent 离线，无法刷新',
          configureFirst: '请先配置远程运行时路径',
          upgradeFirst: '请先升级远程 Agent',
          oldAgentTitle: '当前 Agent 不支持运行时清单',
          oldAgentDescription: '升级到 2.1.0 或更高版本后，才能识别节点上的房间、世界进程和物理核心容量。',
          loadFailedTitle: '节点清单读取失败',
          notConfiguredTitle: '先配置该节点的 DST 路径',
          notConfiguredDescription: '清单采集只读取明确配置的存档目录和服务端目录，不会自动扫描整台服务器。',
          waitingTitle: '尚未收到节点清单',
          waitingDescription: '在线节点会定期自动上报，也可以点击本行的刷新按钮立即采集。',
          warningTitle: '节点扫描提示',
          staleReasons: {
            agent_offline: 'Agent 已离线，保留的是最后一次快照',
            clock_skew: 'Agent 与控制端时钟偏差过大',
            report_expired: '快照超过有效时间窗口',
            report_missing: '节点尚未提供观测时间',
            unknown: '快照当前不可作为实时数据'
          }
        },
        topology: {
          title: '{name} 的 DST 拓扑',
          description: '按房间列出该节点识别到的 Shard、端口和对应专服进程。',
          emptyTitle: '没有识别到房间',
          emptyDescription: '已配置的存档路径中没有可识别的 Cluster 和 Shard。',
          roles: {
            master: '主世界',
            secondary: '从世界',
            unknown: '未识别'
          },
          serverPort: '游戏 {port}',
          masterServerPort: 'Master {port}',
          authenticationPort: '认证 {port}',
          processResources: 'CPU {cpu}% / 内存 {memory}'
        },
        empty: {
          title: '暂无可管理机器',
          description: '当前未启用本机运行环境，也没有远程 Agent 连接。',
          add: '添加 Agent'
        },
        rename: {
          title: '重命名机器',
          description: '使用容易识别的名称。主机名和节点 ID 不会被修改。',
          displayName: '机器名称',
          hostname: '主机名：{hostname}',
          validation: '请输入 1–100 个字符的机器名称，不能包含控制字符',
          saved: '机器已重命名为“{name}”',
          saveFailed: '机器重命名失败：{error}'
        },
        details: {
          title: 'Agent 详情',
          description: '节点身份、系统与连接信息。',
          hostname: '主机名',
          version: '版本',
          capabilities: '能力'
        },
        runtime: {
          title: '远程运行时配置',
          description: '选择 Agent 已登记的 DST 安装，供房间投放、分片控制、日志、模组、更新和备份等远程操作使用。',
          scope: '配置作用域：仅此 Agent',
          installation: 'DST 安装实例',
          installationPlaceholder: '选择 Agent 上已登记的安装',
          trustedInstallationDescription: '安装 ID 与路径由 Agent 配置提供并锁定；如需修改，请先更新 Agent 配置并重启 Agent。',
          manualInstallationDescription: '旧版 Agent 未提供受信安装清单；升级前可手工填写，安装 ID 必须与 Agent 配置一致。',
          noInstallationsTitle: 'Agent 未登记 DST 安装',
          noInstallationsDescription: '该 Agent 已支持受信安装清单，但当前清单为空。请先在 Agent 配置中添加 runtime 安装并重启 Agent。',
          legacyTitle: '兼容旧版 Agent 的手工配置',
          legacyDescription: '当前 Agent 尚未上报受信安装清单。可继续手工配置，但建议升级到 2.5.2 或更高版本，以避免安装 ID 或路径不一致。',
          staleInstallationTitle: '原配置与 Agent 清单不一致',
          staleInstallationDescription: '原安装 ID 已不存在或路径发生变化。请重新选择已登记的安装并确认后保存。',
          drivers: {
            native: '裸机',
            container: '容器'
          },
          displayName: '显示名称',
          serverMode: '服务端模式',
          mode64: '64 位',
          mode32: '32 位',
          savePath: 'DST 存档路径',
          serverPath: 'DST 服务端路径',
          backupPath: '备份路径',
          advanced: '模组与兼容运行时',
          ugcPath: 'UGC 路径',
          steamcmdPath: 'SteamCMD 路径',
          workshopPath: 'Workshop 内容路径',
          luaCommand: 'Lua 命令',
          luaFallbackPath: 'Lua fallback 路径',
          removeConfig: '移除配置',
          saveConfig: '保存配置'
        },
        validation: {
          installationId: '请选择或填写有效的 DST 安装实例',
          displayName: '请输入显示名称',
          savePath: '请输入远程存档路径',
          serverPath: '请输入远程服务端路径',
          required: '请完成必填的运行时配置'
        },
        feedback: {
          loadFailedTitle: 'Agent 列表加载失败',
          loadFailed: '获取 Agent 列表失败',
          runtimeLoadFailedTitle: '远程运行时配置加载失败',
          runtimeLoadFailed: '无法读取远程运行时配置',
          runtimeSaved: '远程运行时配置已保存',
          runtimeSavedRefreshFailed: '远程路径配置已保存，但刷新配置状态失败',
          runtimeSaveFailed: '保存远程运行时配置失败：{error}',
          runtimeRemoveConfirm: '确定移除“{name}”的远程运行时配置吗？',
          runtimeRemoveTitle: '移除运行时配置',
          runtimeRemoved: '远程运行时配置已移除',
          runtimeRemovedRefreshFailed: '远程运行时配置已移除，但刷新配置状态失败',
          runtimeRemoveFailed: '移除远程运行时配置失败：{error}',
          agentRemoveConfirm: '确定移除离线 Agent“{name}”的历史记录吗？',
          agentRemoveTitle: '移除 Agent',
          agentRemoved: 'Agent 记录已移除',
          agentRemoveFailed: '移除 Agent 失败：{error}',
          inventoryRefreshed: '“{name}”的节点清单已刷新',
          inventoryRefreshedLoadFailed: '“{name}”的节点清单刷新任务已完成，但最新清单读取失败，当前继续显示上次数据',
          inventoryRefreshFailed: '刷新节点清单失败：{error}',
          errorWithDetail: '{message}：{detail}'
        }
      },
      command: {
        title: 'Agent 命令管理',
        subtitle: '向已连接节点发送白名单动作并检查执行结果。',
        guard: {
          title: '仅执行受控动作',
          description: '生产后端不提供任意 Shell 或 PowerShell 执行能力。可用动作由当前后端实时返回。'
        },
        actions: {
          retry: '重试',
          reset: '重置',
          execute: '执行动作',
          refresh: '刷新',
          resetFilters: '重置筛选',
          viewDetails: '查看详情',
          refreshResult: '刷新结果',
          copyOutput: '复制输出'
        },
        execute: {
          title: '命令执行',
          description: '选择一个或多个在线 Agent，并执行后端允许的动作。',
          batchMode: '批量执行',
          agentId: 'Agent ID',
          selectAgent: '请选择 Agent',
          selectOnlineAgents: '选择一个或多个在线 Agent。',
          controlledAction: '受控动作',
          loadingActions: '正在读取可用动作',
          selectAction: '请选择受控动作',
          selectActionDescription: '请选择后端允许的领域动作。',
          timeout: '超时时间（秒）'
        },
        history: {
          title: '命令历史',
          description: '按节点、状态和时间范围检索历史结果。',
          filters: {
            agent: 'Agent',
            selectAgent: '选择 Agent',
            allAgents: '全部 Agent',
            status: '状态',
            commandStatus: '命令状态',
            allStatuses: '全部状态',
            keyword: '关键词',
            searchPlaceholder: '搜索命令内容',
            startDate: '开始日期',
            endDate: '结束日期'
          },
          emptyTitle: '暂无命令历史',
          emptyDescription: '当前筛选条件下没有执行记录。',
          columns: {
            commandId: '命令 ID',
            agentId: 'Agent ID',
            type: '类型',
            content: '命令内容',
            status: '状态',
            result: '结果',
            executedAt: '执行时间',
            actions: '操作'
          },
          total: '共 {count} 条',
          pageSizeAria: '每页显示条数',
          perPage: '{count} 条/页',
          previousPage: '上一页',
          nextPage: '下一页'
        },
        details: {
          title: '命令详情',
          description: '查看命令参数、状态和节点返回内容。',
          fields: {
            commandId: '命令 ID',
            agentId: 'Agent ID',
            type: '命令类型',
            status: '状态',
            exitCode: '退出码',
            result: '结果',
            startedAt: '开始时间',
            endedAt: '结束时间',
            duration: '执行耗时'
          },
          output: '输出',
          error: '错误',
          noOutput: '无输出内容',
          executionError: '命令执行错误'
        },
        statuses: {
          pending: '待执行',
          running: '执行中',
          completed: '已完成',
          failed: '失败',
          canceled: '已取消'
        },
        results: {
          success: '成功',
          failed: '失败',
          canceled: '已取消'
        },
        values: {
          unknown: '未知',
          unknownHost: '未知主机',
          offline: '离线',
          notAvailable: '不可用'
        },
        units: {
          milliseconds: '{value} 毫秒',
          seconds: '{value} 秒'
        },
        knownActions: {
          systemRefresh: {
            name: '刷新系统信息',
            description: '请求节点重新上报主机、运行时间和内存信息'
          },
          diskInspect: {
            name: '检查磁盘',
            description: '以参数数组执行只读磁盘容量检查'
          }
        },
        feedback: {
          agentLoadFailedTitle: 'Agent 列表加载失败',
          agentLoadFailed: '获取 Agent 列表失败',
          agentInvalidResponse: 'Agent 列表响应格式错误',
          actionLoadFailedTitle: '受控动作加载失败',
          actionLoadFailed: '获取允许动作失败',
          historyLoadFailedTitle: '命令历史加载失败',
          historyLoadFailed: '获取命令历史失败',
          selectOnlineAgent: '请选择在线 Agent',
          selectActionAndTimeout: '请选择受控动作并填写超时时间',
          selectedAgentOffline: '所选 Agent 已离线或不在当前列表中，请刷新后重试',
          timeoutInvalid: 'Agent 命令超时时间必须是 5 至 300 秒的整数',
          actionUnavailable: '所选动作已不在后端白名单中，请刷新页面后重试',
          batchSent: '成功发送命令至 {count} 个 Agent',
          batchFailed: '{count} 个 Agent 命令发送失败',
          commandSent: '命令已发送',
          executionFailed: '命令执行失败',
          executionLong: '命令执行时间较长，请在历史记录中查看结果',
          executionSucceeded: '命令执行成功',
          resultRefreshed: '命令结果刷新成功',
          resultRefreshFailed: '刷新命令结果失败',
          outputCopied: '命令输出已复制到剪贴板',
          outputCopyFailed: '复制命令输出失败',
          noOutputToCopy: '没有可复制的命令输出',
          clipboardDenied: '浏览器未允许写入剪贴板',
          errorWithDetail: '{message}：{detail}'
        }
      },
      security: {
        title: 'Agent 安全设置',
        subtitle: '管理 Agent 连接密钥和安装配置。',
        key: {
          title: 'API 密钥',
          description: 'Agent 使用此密钥建立经过验证的连接。现有密钥不会再次显示明文。',
          current: '当前密钥',
          maskedDescription: '出于安全考虑，服务端仅返回现有密钥的掩码。',
          unavailableTitle: '密钥管理不可用',
          unavailableDescription: '当前后端未开放密钥轮换能力。'
        },
        actions: {
          hide: '隐藏',
          show: '显示',
          copyKey: '复制密钥',
          generateKey: '生成新密钥'
        },
        install: {
          title: '安装 Agent',
          description: '根据节点环境选择安装命令或手动配置。',
          dockerUnavailable: '当前仓库没有发布可验证的 Agent Docker 镜像。'
        },
        manual: {
          title: '手动安装',
          downloadTitle: '下载 Agent 安装文件',
          buildFrom: '从',
          repository: '项目仓库',
          buildForSystem: '构建适合您系统的 Agent 二进制文件。',
          configureTitle: '配置 Agent',
          configureDescription: '创建配置文件',
          runTitle: '运行 Agent',
          serviceTitle: '设置为系统服务（可选）',
          serviceDescription: '为确保 Agent 在系统重启后自动运行，可以将其注册为系统服务。'
        },
        feedback: {
          loadFailedTitle: '安全配置加载失败',
          loadFailed: '获取 API 密钥失败',
          maskedNotCopyable: '现有密钥只提供掩码；轮换后可复制一次新密钥',
          keyCopied: 'API 密钥已复制到剪贴板',
          copyKeyFailed: '复制 API 密钥失败：{error}',
          rotateConfirm: '生成新密钥将使现有密钥失效，所有使用旧密钥的 Agent 需要更新配置。确定要继续吗？',
          rotateTitle: '生成新密钥',
          rotateConfirmFailed: '无法确认密钥轮换：{error}',
          statusRefreshFailed: '新密钥已生成，但安全状态刷新失败：{error}',
          keyGenerated: '新密钥已生成，请立即保存',
          generateFailed: '生成新密钥失败：{error}',
          installCopied: '安装命令已复制到剪贴板',
          copyInstallFailed: '复制安装命令失败：{error}',
          configCopied: '配置内容已复制到剪贴板',
          copyConfigFailed: '复制配置内容失败：{error}',
          runCopied: '运行命令已复制到剪贴板',
          copyRunFailed: '复制运行命令失败：{error}',
          clipboardDenied: '浏览器未允许写入剪贴板',
          errorWithDetail: '{message}：{detail}'
        }
      }
    }
  },
  'en-US': {
    agents: {
      profile: {
        title: 'Deployment role',
        description: 'This instance can manage its local DST runtime and optionally coordinate native or All-in-One nodes.',
        loading: 'Loading deployment configuration',
        roleLabel: 'Management role',
        roleDescription: 'The packaging stays unchanged; only the local executor and centralized connections are adjusted.',
        packaging: {
          native: 'Native',
          all_in_one: 'All-in-One',
          container: 'Container shards',
          control_plane: 'Control plane'
        },
        roles: {
          standalone: {
            label: 'Local only',
            description: 'Control the local DST runtime without accepting nodes.'
          },
          controller_worker: {
            label: 'Local + centralized',
            description: 'Control the local runtime and additional native or All-in-One nodes.'
          },
          managed_worker: {
            label: 'Join a controller',
            description: 'Let one upstream controller manage this local DST runtime.'
          },
          controller_only: {
            label: 'Centralized only',
            description: 'Manage connected nodes without controlling a local DST runtime.'
          }
        },
        connection: {
          connected: 'Upstream connected',
          disconnected: 'Upstream disconnected'
        },
        controllerUrl: {
          label: 'Upstream controller URL',
          description: 'Use a ws:// or wss:// URL that points to the controller /agent endpoint.'
        },
        memberKey: {
          label: 'Node connection key',
          description: 'Use the communication key generated under the upstream controller Security page. Stored keys are never revealed.',
          placeholder: 'Paste the node connection key',
          configuredPlaceholder: 'Configured; leave blank to keep it'
        },
        environmentManaged: {
          title: 'Role managed by environment variables',
          description: 'One or more role switches are locked by this deployment. Update its environment and restart instead.'
        },
        restart: {
          title: 'Configuration is waiting for restart',
          description: 'The displayed runtime role is still the current process state and changes after the management service restarts.'
        },
        unsupported: {
          title: 'The backend does not support unified deployment roles',
          description: 'Upgrade the backend before configuring centralized management.'
        },
        validation: {
          controllerUrlRequired: 'Enter the upstream controller URL',
          memberKeyRequired: 'A node connection key is required when joining for the first time'
        },
        actions: {
          save: 'Save role'
        },
        saveHint: 'Role changes require a management service restart and never restart DST worlds automatically.',
        feedback: {
          loadFailed: 'Failed to load deployment configuration',
          invalid: 'Deployment configuration is invalid',
          unchanged: 'The deployment role is unchanged',
          saved: 'Deployment role saved. Restart the management service to apply it',
          saveFailed: 'Failed to save deployment role'
        }
      },
      list: {
        title: 'Machine management',
        subtitle: 'Manage the local machine and connected remote machines together. Display names are editable while hostnames stay unchanged.',
        loadingAria: 'Loading machine status',
        metrics: {
          online: 'Online Agents',
          onlineDescription: 'Nodes that are currently connected',
          total: 'Total Agents',
          totalDescription: 'Registered remote nodes',
          operatingSystems: 'Operating systems',
          operatingSystemsDescription: 'Connected operating system types',
          summaryAria: 'Node runtime summary',
          onlineSummary: '{online}/{total} machines online',
          shardSummary: '{count} remote worlds running',
          capacitySummary: '{count} remote capacity notices'
        },
        actions: {
          details: 'Details',
          rename: 'Rename machine',
          systemSettings: 'System settings',
          runtimeConfig: 'Runtime configuration',
          configureRuntime: 'Configure remote runtime',
          executeCommand: 'Run command',
          remove: 'Remove',
          refreshInventory: 'Refresh node inventory',
          expandTopology: 'Expand rooms and worlds',
          collapseTopology: 'Collapse rooms and worlds'
        },
        fields: {
          system: 'System',
          ipAddress: 'IP address',
          cpuCores: '{count} cores',
          topology: 'Topology',
          node: 'Machine',
          worldCapacity: 'Runtime / world capacity',
          cpu: 'CPU',
          memory: 'Memory',
          memoryAvailable: '{value} available',
          uptime: 'Uptime',
          user: 'User',
          path: 'Path',
          lastHeartbeat: 'Last heartbeat',
          observedAt: 'Observed at',
          actions: 'Actions',
          physicalCores: '{count} physical cores',
          logicalProcessors: '{count} logical processors',
          installation: 'DST installation',
          savePath: 'Save path',
          serverPath: 'Server path',
          inventoryReceivedAt: 'Received by controller',
          masterPort: 'Master port {port}',
          shard: 'World shard',
          role: 'Role',
          ports: 'Ports',
          process: 'Process',
          processResources: 'Process resources',
          memoryUsage: 'Memory usage',
          memoryUsageAria: '{name} memory usage'
        },
        values: {
          notAvailable: 'N/A',
          unknown: 'Unknown',
          unknownNode: 'Unnamed node',
          localMachine: 'Local',
          defaultRuntime: 'Local DST',
          estimated: 'estimated',
          available: 'Available',
          missing: 'Missing',
          clusterKeyReady: 'Cluster key configured',
          clusterKeyMissing: 'Cluster key missing',
          running: 'Running',
          stopped: 'Not running'
        },
        duration: {
          daysHours: '{days}d {hours}h',
          hoursMinutes: '{hours}h {minutes}m',
          minutes: '{minutes}m'
        },
        capacity: {
          policyTitle: 'Capacity guidance for multiple worlds per node',
          policyDescription: 'One server may run multiple rooms and world shards. Reserve at least one physical core for every running Shard and one additional core for the OS, Agent, SteamCMD, and backups. This is conservative guidance, not a hard limit or performance guarantee.',
          localRecommendation: 'Up to {count} worlds recommended by physical core count',
          progressAria: 'World shard capacity usage for {name}',
          states: {
            available: 'Available',
            full: 'At capacity',
            overcommitted: 'Overcommitted',
            unknown: 'Unknown'
          },
          available: '{running}/{limit} running, {available} suggested slots available',
          full: '{running}/{limit} running, at the suggested limit',
          overcommitted: '{running}/{limit} running; sharing one core across worlds may cause lag',
          unknown: 'Fresh physical-core or world-process data is unavailable'
        },
        inventory: {
          loading: 'Loading',
          current: 'Current',
          stale: 'Stale',
          waiting: 'Awaiting inventory',
          configured: 'Runtime configured',
          notConfigured: 'Runtime not configured',
          upgradeRequired: 'Agent upgrade required',
          agentOffline: 'The Agent is offline and cannot refresh',
          configureFirst: 'Configure the remote runtime paths first',
          upgradeFirst: 'Upgrade the remote Agent first',
          oldAgentTitle: 'This Agent does not support runtime inventory',
          oldAgentDescription: 'Upgrade to version 2.1.0 or later to discover rooms, world processes, and physical-core capacity on this node.',
          loadFailedTitle: 'Failed to load node inventory',
          notConfiguredTitle: 'Configure the DST paths for this node',
          notConfiguredDescription: 'Inventory collection only reads explicitly configured save and server directories. It does not scan the entire server.',
          waitingTitle: 'No node inventory received yet',
          waitingDescription: 'Online nodes report periodically. Use the refresh action on this row to collect immediately.',
          warningTitle: 'Node scan notice',
          staleReasons: {
            agent_offline: 'The Agent is offline; this is the last saved snapshot',
            clock_skew: 'The Agent and controller clocks differ too much',
            report_expired: 'The snapshot is outside the freshness window',
            report_missing: 'The node did not provide an observation time',
            unknown: 'This snapshot cannot be treated as live data'
          }
        },
        topology: {
          title: 'DST topology on {name}',
          description: 'Rooms, Shards, ports, and their dedicated server processes discovered on this node.',
          emptyTitle: 'No rooms discovered',
          emptyDescription: 'No recognizable Clusters or Shards were found under the configured save path.',
          roles: {
            master: 'Master world',
            secondary: 'Secondary world',
            unknown: 'Unknown'
          },
          serverPort: 'Game {port}',
          masterServerPort: 'Master {port}',
          authenticationPort: 'Auth {port}',
          processResources: 'CPU {cpu}% / memory {memory}'
        },
        empty: {
          title: 'No manageable machines',
          description: 'The local runtime is disabled and no remote Agent is connected.',
          add: 'Add Agent'
        },
        rename: {
          title: 'Rename machine',
          description: 'Choose a recognizable display name. The hostname and node ID will not change.',
          displayName: 'Machine name',
          hostname: 'Hostname: {hostname}',
          validation: 'Enter a machine name from 1 to 100 characters without control characters',
          saved: 'Machine renamed to “{name}”',
          saveFailed: 'Failed to rename machine: {error}'
        },
        details: {
          title: 'Agent details',
          description: 'Node identity, system, and connection information.',
          hostname: 'Hostname',
          version: 'Version',
          capabilities: 'Capabilities'
        },
        runtime: {
          title: 'Remote runtime configuration',
          description: 'Select a DST installation registered by this Agent for remote provisioning, Shard control, logs, mods, updates, and backups.',
          scope: 'Scope: this Agent only',
          installation: 'DST installation',
          installationPlaceholder: 'Select a registered Agent installation',
          trustedInstallationDescription: 'The Agent configuration owns and locks the installation ID and paths. Update the Agent configuration and restart it to change them.',
          manualInstallationDescription: 'This older Agent does not provide a trusted installation registry. Manual values remain available until upgrade and must match its configuration.',
          noInstallationsTitle: 'No DST installation is registered',
          noInstallationsDescription: 'This Agent supports the trusted installation registry, but its registry is empty. Add a runtime installation to the Agent configuration and restart the Agent.',
          legacyTitle: 'Manual compatibility for an older Agent',
          legacyDescription: 'This Agent does not report a trusted installation registry yet. Manual configuration remains available, but upgrade to version 2.5.2 or later to prevent installation ID or path mismatches.',
          staleInstallationTitle: 'The saved installation no longer matches',
          staleInstallationDescription: 'The previous installation ID was removed or its paths changed. Select a registered installation, review it, and save again.',
          drivers: {
            native: 'Native',
            container: 'Container'
          },
          displayName: 'Display name',
          serverMode: 'Server mode',
          mode64: '64-bit',
          mode32: '32-bit',
          savePath: 'DST archive path',
          serverPath: 'DST server path',
          backupPath: 'Backup path',
          advanced: 'Mods and compatible runtime',
          ugcPath: 'UGC path',
          steamcmdPath: 'SteamCMD path',
          workshopPath: 'Workshop content path',
          luaCommand: 'Lua command',
          luaFallbackPath: 'Lua fallback path',
          removeConfig: 'Remove configuration',
          saveConfig: 'Save configuration'
        },
        validation: {
          installationId: 'Select or enter a valid DST installation',
          displayName: 'Enter a display name',
          savePath: 'Enter the remote archive path',
          serverPath: 'Enter the remote server path',
          required: 'Complete the required runtime fields'
        },
        feedback: {
          loadFailedTitle: 'Failed to load Agents',
          loadFailed: 'Unable to load the Agent list',
          runtimeLoadFailedTitle: 'Failed to load remote runtime configuration',
          runtimeLoadFailed: 'Unable to load remote runtime configuration',
          runtimeSaved: 'Remote runtime configuration saved',
          runtimeSavedRefreshFailed: 'Remote paths were saved, but the configuration status could not be refreshed.',
          runtimeSaveFailed: 'Failed to save remote runtime configuration: {error}',
          runtimeRemoveConfirm: 'Remove the remote runtime configuration for “{name}”?',
          runtimeRemoveTitle: 'Remove runtime configuration',
          runtimeRemoved: 'Remote runtime configuration removed',
          runtimeRemovedRefreshFailed: 'Remote runtime configuration was removed, but the configuration status could not be refreshed.',
          runtimeRemoveFailed: 'Failed to remove remote runtime configuration: {error}',
          agentRemoveConfirm: 'Remove the saved record for offline Agent “{name}”?',
          agentRemoveTitle: 'Remove Agent',
          agentRemoved: 'Agent record removed',
          agentRemoveFailed: 'Failed to remove Agent: {error}',
          inventoryRefreshed: 'Node inventory refreshed for “{name}”',
          inventoryRefreshedLoadFailed: 'The inventory refresh completed for “{name}”, but the latest inventory could not be read. The previous data remains visible.',
          inventoryRefreshFailed: 'Failed to refresh node inventory: {error}',
          errorWithDetail: '{message}: {detail}'
        }
      },
      command: {
        title: 'Agent commands',
        subtitle: 'Send allowlisted actions to connected nodes and inspect their results.',
        guard: {
          title: 'Controlled actions only',
          description: 'The production backend does not allow arbitrary Shell or PowerShell execution. Available actions are provided by the current backend.'
        },
        actions: {
          retry: 'Retry',
          reset: 'Reset',
          execute: 'Run action',
          refresh: 'Refresh',
          resetFilters: 'Reset filters',
          viewDetails: 'View details',
          refreshResult: 'Refresh result',
          copyOutput: 'Copy output'
        },
        execute: {
          title: 'Run a command',
          description: 'Select one or more online Agents and run an action allowed by the backend.',
          batchMode: 'Batch mode',
          agentId: 'Agent ID',
          selectAgent: 'Select an Agent',
          selectOnlineAgents: 'Select one or more online Agents.',
          controlledAction: 'Controlled action',
          loadingActions: 'Loading available actions',
          selectAction: 'Select a controlled action',
          selectActionDescription: 'Select a domain action allowed by the backend.',
          timeout: 'Timeout (seconds)'
        },
        history: {
          title: 'Command history',
          description: 'Filter command results by node, status, and date range.',
          filters: {
            agent: 'Agent',
            selectAgent: 'Select an Agent',
            allAgents: 'All Agents',
            status: 'Status',
            commandStatus: 'Command status',
            allStatuses: 'All statuses',
            keyword: 'Keyword',
            searchPlaceholder: 'Search command content',
            startDate: 'Start date',
            endDate: 'End date'
          },
          emptyTitle: 'No command history',
          emptyDescription: 'No command runs match the current filters.',
          columns: {
            commandId: 'Command ID',
            agentId: 'Agent ID',
            type: 'Type',
            content: 'Command content',
            status: 'Status',
            result: 'Result',
            executedAt: 'Executed at',
            actions: 'Actions'
          },
          total: '{count} total',
          pageSizeAria: 'Rows per page',
          perPage: '{count} per page',
          previousPage: 'Previous page',
          nextPage: 'Next page'
        },
        details: {
          title: 'Command details',
          description: 'Inspect command parameters, status, and node output.',
          fields: {
            commandId: 'Command ID',
            agentId: 'Agent ID',
            type: 'Command type',
            status: 'Status',
            exitCode: 'Exit code',
            result: 'Result',
            startedAt: 'Started at',
            endedAt: 'Ended at',
            duration: 'Duration'
          },
          output: 'Output',
          error: 'Error',
          noOutput: 'No output',
          executionError: 'Command execution error'
        },
        statuses: {
          pending: 'Pending',
          running: 'Running',
          completed: 'Completed',
          failed: 'Failed',
          canceled: 'Canceled'
        },
        results: {
          success: 'Success',
          failed: 'Failed',
          canceled: 'Canceled'
        },
        values: {
          unknown: 'Unknown',
          unknownHost: 'Unknown host',
          offline: 'Offline',
          notAvailable: 'N/A'
        },
        units: {
          milliseconds: '{value} ms',
          seconds: '{value} s'
        },
        knownActions: {
          systemRefresh: {
            name: 'Refresh system information',
            description: 'Request a fresh host, uptime, and memory report from the node'
          },
          diskInspect: {
            name: 'Inspect disk usage',
            description: 'Run a read-only disk capacity inspection with an argument array'
          }
        },
        feedback: {
          agentLoadFailedTitle: 'Failed to load Agents',
          agentLoadFailed: 'Unable to load the Agent list',
          agentInvalidResponse: 'The Agent list response is invalid',
          actionLoadFailedTitle: 'Failed to load controlled actions',
          actionLoadFailed: 'Unable to load allowed actions',
          historyLoadFailedTitle: 'Failed to load command history',
          historyLoadFailed: 'Unable to load command history',
          selectOnlineAgent: 'Select an online Agent',
          selectActionAndTimeout: 'Select a controlled action and enter a timeout',
          selectedAgentOffline: 'A selected Agent is offline or no longer listed. Refresh and try again.',
          timeoutInvalid: 'The Agent command timeout must be an integer from 5 to 300 seconds',
          actionUnavailable: 'The selected action is no longer on the backend allowlist. Refresh and try again.',
          batchSent: 'Command sent to {count} Agents',
          batchFailed: 'Failed to send commands to {count} Agents',
          commandSent: 'Command sent',
          executionFailed: 'Command execution failed',
          executionLong: 'The command is taking longer than expected. Check its result in command history.',
          executionSucceeded: 'Command completed successfully',
          resultRefreshed: 'Command result refreshed',
          resultRefreshFailed: 'Failed to refresh the command result',
          outputCopied: 'Command output copied to the clipboard',
          outputCopyFailed: 'Failed to copy command output',
          noOutputToCopy: 'There is no command output to copy',
          clipboardDenied: 'The browser did not allow clipboard access',
          errorWithDetail: '{message}: {detail}'
        }
      },
      security: {
        title: 'Agent security',
        subtitle: 'Manage Agent connection keys and installation settings.',
        key: {
          title: 'API key',
          description: 'Agents use this key to establish authenticated connections. Existing keys are never shown again in plain text.',
          current: 'Current key',
          maskedDescription: 'For security, the server only returns a masked representation of an existing key.',
          unavailableTitle: 'Key management unavailable',
          unavailableDescription: 'The current backend does not support key rotation.'
        },
        actions: {
          hide: 'Hide',
          show: 'Show',
          copyKey: 'Copy key',
          generateKey: 'Generate new key'
        },
        install: {
          title: 'Install Agent',
          description: 'Choose an installation command or configure the Agent manually for the node environment.',
          dockerUnavailable: 'This repository does not publish a verifiable Agent Docker image.'
        },
        manual: {
          title: 'Manual installation',
          downloadTitle: 'Build the Agent binary',
          buildFrom: 'Build an Agent binary for your system from the',
          repository: 'project repository',
          buildForSystem: '.',
          configureTitle: 'Configure Agent',
          configureDescription: 'Create the configuration file',
          runTitle: 'Run Agent',
          serviceTitle: 'Configure a system service (optional)',
          serviceDescription: 'Register the Agent as a system service so it starts automatically after the system restarts.'
        },
        feedback: {
          loadFailedTitle: 'Failed to load security settings',
          loadFailed: 'Unable to load the API key',
          maskedNotCopyable: 'Existing keys are only available as masks. A newly rotated key can be copied once.',
          keyCopied: 'API key copied to the clipboard',
          copyKeyFailed: 'Failed to copy API key: {error}',
          rotateConfirm: 'Generating a new key invalidates the current key. Every Agent using the old key must be updated. Continue?',
          rotateTitle: 'Generate new key',
          rotateConfirmFailed: 'Could not confirm key rotation: {error}',
          statusRefreshFailed: 'The new key was generated, but security status could not be refreshed: {error}',
          keyGenerated: 'New key generated. Save it now.',
          generateFailed: 'Failed to generate a new key: {error}',
          installCopied: 'Installation command copied to the clipboard',
          copyInstallFailed: 'Failed to copy installation command: {error}',
          configCopied: 'Configuration copied to the clipboard',
          copyConfigFailed: 'Failed to copy configuration: {error}',
          runCopied: 'Run command copied to the clipboard',
          copyRunFailed: 'Failed to copy run command: {error}',
          clipboardDenied: 'The browser did not allow clipboard access',
          errorWithDetail: '{message}: {detail}'
        }
      }
    }
  }
}

const AGENT_COMMAND_STATUS_KEYS = Object.freeze({
  pending: 'pending',
  queued: 'pending',
  running: 'running',
  completed: 'completed',
  succeeded: 'completed',
  failed: 'failed',
  canceled: 'canceled'
})

const AGENT_COMMAND_ACTION_KEYS = Object.freeze({
  'system.refresh': 'systemRefresh',
  'disk.inspect': 'diskInspect'
})

export function agentCommandStatusLabel(status, translate) {
  const key = AGENT_COMMAND_STATUS_KEYS[status]
  return key ? translate(`agents.command.statuses.${key}`) : status || translate('agents.command.values.unknown')
}

export function agentCommandActionName(action, translate) {
  const key = AGENT_COMMAND_ACTION_KEYS[action?.id]
  return key ? translate(`agents.command.knownActions.${key}.name`) : action?.name || action?.id || ''
}

export function agentCommandActionDescription(action, translate) {
  const key = AGENT_COMMAND_ACTION_KEYS[action?.id]
  return key ? translate(`agents.command.knownActions.${key}.description`) : action?.description || ''
}

export function createAgentCommandFailure(key, error) {
  const detail = typeof error === 'string' ? error : error?.message
  return { key, detail: String(detail || '').trim() }
}

export function agentCommandFailureText(failure, translate) {
  if (!failure) return ''
  const message = translate(failure.key)
  return failure.detail
    ? translate('agents.command.feedback.errorWithDetail', { message, detail: failure.detail })
    : message
}

export function formatAgentCommandTime(timestamp, locale, translate) {
  if (!timestamp) return translate('agents.command.values.notAvailable')
  const numeric = typeof timestamp === 'string' && /^\d+$/.test(timestamp) ? Number(timestamp) : timestamp
  const value = typeof numeric === 'number' && numeric < 1000000000000 ? numeric * 1000 : numeric
  return formatSystemDateTime(value, {
    locale,
    fallback: translate('agents.command.values.notAvailable'),
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit'
  })
}

export function formatAgentCommandDuration(durationMs, locale, translate) {
  const duration = Number(durationMs)
  if (!Number.isFinite(duration) || duration < 0) return translate('agents.command.values.notAvailable')
  if (duration < 1000) {
    return translate('agents.command.units.milliseconds', { value: Math.round(duration).toLocaleString(locale) })
  }
  const seconds = (duration / 1000).toLocaleString(locale, { maximumFractionDigits: 2 })
  return translate('agents.command.units.seconds', { value: seconds })
}
import { formatSystemDateTime } from '../lib/dateTime.mjs'

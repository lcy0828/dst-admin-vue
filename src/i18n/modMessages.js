import { formatSystemDateTime } from '../lib/dateTime.mjs'

const MOD_VALUE_KEYS = Object.freeze({
  health: Object.freeze({
    healthy: 'healthy',
    disabled: 'disabled',
    not_downloaded: 'notDownloaded',
    not_installed: 'notInstalled',
    not_loaded: 'notLoaded',
    update_available: 'updateAvailable',
    corrupt: 'corrupt',
    parse_warning: 'parseWarning'
  }),
  parser: Object.freeze({ go: 'go', lua: 'lua' }),
  repairAction: Object.freeze({
    repair: 'repair',
    restart: 'restart',
    update: 'update',
    configure: 'configure'
  }),
  source: Object.freeze({
    configured: 'configured',
    path: 'path',
    standard: 'standard'
  }),
  fieldType: Object.freeze({
    boolean: 'boolean',
    number: 'number',
    string: 'string',
    text: 'text',
    select: 'select',
    json: 'json'
  })
})

const MOD_FAILURE_CODE_KEYS = Object.freeze({
  MOD_PUBLICATION_RESULT_MISSING: 'mods.publication.errors.resultMissing',
  MOD_PUBLICATION_PREVIEW_BLOCKED: 'mods.publication.errors.previewBlocked',
  MOD_RUNTIME_TARGET_REQUIRED: 'mods.errors.runtimeTargetRequired',
  PREVIEW_BLOCKED: 'mods.publication.errors.previewBlocked',
  MOD_PUBLICATION_REQUIRED: 'mods.publication.errors.publicationRequired',
  PLAN_CHANGED: 'mods.publication.errors.planChanged',
  TOPOLOGY_CHANGED: 'mods.publication.errors.topologyChanged',
  REMOTE_RUNTIME_ACTION_UNAVAILABLE: 'mods.publication.errors.remoteActionUnavailable',
  REMOTE_RUNTIME_MUTATION_UNAVAILABLE: 'mods.publication.errors.remoteMutationUnavailable'
})

export const modMessages = {
  'zh-CN': {
    mods: {
      metadata: {
        notice: '工坊资料提示',
        localFactsAvailable: '名称或作者资料缺失，可点击“重试获取资料”。不影响模组使用。',
        retry: '重试获取资料',
        retrying: '正在获取资料…',
        retryCompleted: '工坊名称、作者资料已补全',
        retryIncomplete: '本次仍有 {count} 个模组的资料未获取到，已保留现有信息。'
      },
      management: {
        title: '模组管理',
        subtitle: '搜索模组、管理各机器已下载内容，并选择房间启用。',
        tabs: { workshop: '创意工坊', catalog: '机器模组', room: '房间模组' },
        workshop: {
          title: '创意工坊',
          description: '搜索和查看模组；加入房间后，系统会把文件准备到对应运行机器。'
        },
        catalog: {
          title: '机器模组',
          description: '选择机器，查看和更新 DST 实际使用的模组文件。'
        },
        room: {
          title: '房间模组',
          description: '选择房间，查看和调整每个世界启用的模组。'
        },
        scopes: { workshop: '创意工坊', downloaded: '全部内容', updates: '可更新' }
      },
      values: {
        unknown: '未知',
        unknownAuthor: '未知作者',
        installed: '已安装',
        downloaded: '已下载',
        notDownloaded: '未下载',
        enabled: '已启用',
        disabled: '已禁用',
        on: '开启',
        off: '关闭',
        subscriptions: '订阅',
        rating: '评分',
        health: {
          healthy: '状态正常',
          disabled: '已禁用',
          notDownloaded: '尚未下载',
          notInstalled: '尚未安装',
          notLoaded: '尚未加载',
          updateAvailable: '有可用更新',
          corrupt: '文件损坏',
          parseWarning: '解析警告'
        },
        parser: { go: 'Go 解析器', lua: 'Lua 兼容解析器' },
        repairAction: { repair: '修复', restart: '重启', update: '更新', configure: '配置' },
        source: { configured: '手动配置', path: '环境路径', standard: '标准位置' },
        fieldType: { boolean: '布尔值', number: '数字', string: '字符串', text: '文本', select: '选项', json: 'JSON 数据' }
      },
      workshop: {
        detailsTitle: '模组详情',
        detailsDescription: 'Steam Workshop 与本地模组文件提供的完整信息。',
        loadingDetails: '正在加载模组详情',
        summary: '工坊信息',
        fileAndActivity: '文件与活跃数据',
        description: '模组描述',
        noDescription: '该模组暂无描述。',
        workshopId: 'Workshop ID',
        version: '版本',
        author: '作者',
        rating: '评分',
        ratingCount: '{count} 个评价',
        noRatings: '暂无评分',
        subscriptions: '订阅',
        favorites: '收藏',
        views: '浏览',
        fileSize: '文件大小',
        publishedAt: '发布时间',
        updatedAt: '更新时间',
        tags: '分类标签',
        steamPage: 'Steam 详情',
        changelog: '更新说明',
        categories: {
          all: '全部分类', character: '角色', item: '物品', pet: '宠物', creature: '生物',
          environment: '环境', interface: '界面', utility: '工具', art: '美术', worldgen: '世界生成',
          tweak: '玩法调整', scenario: '场景', language: '语言', other: '其他', tutorial: '教程',
          clientOnly: '仅客户端', serverOnly: '仅服务端', allClientsRequire: '所有客户端必装', serverAdmin: '服务器管理'
        }
      },
      actions: {
        refresh: '刷新',
        refreshing: '刷新中',
        add: '添加模组',
        addToRoom: '添加到房间',
        downloadAndAddToRoom: '下载并添加到房间',
        addToWorld: '添加',
        enableInRoom: '在全部世界启用',
        disableInRoom: '在全部世界停用',
        copyConfiguration: '复制配置',
        searchWorkshop: '搜索创意工坊',
        getConfigFile: '获取配置文件',
        filter: '筛选',
        reset: '重置',
        retry: '重试',
        configure: '配置',
        details: '查看详情',
        update: '更新',
        updateMod: '更新模组',
        download: '下载',
        downloadMod: '下载模组',
        downloading: '下载中',
        close: '关闭',
        cancel: '取消',
        confirm: '确定',
        downloadConfigFile: '下载配置文件',
        saveConfig: '保存配置',
        resetDefaults: '恢复默认值',
        backToInstalled: '返回已下载模组',
        backToLibrary: '返回模组内容库',
        search: '搜索',
        more: '更多操作'
      },
      errors: {
        withDetail: '{message}：{detail}',
        withRequestId: '{message}（请求 ID：{requestId}）',
        withJobId: '{message}（任务 ID：{jobId}）',
        withRequestAndJobId: '{message}（请求 ID：{requestId}；任务 ID：{jobId}）',
        context: '加载模组上下文失败',
        library: '获取模组内容库失败',
        addToRoom: '添加模组到房间失败',
        roomSwitch: '切换房间失败',
        list: '获取模组列表失败',
        installedList: '获取已安装模组失败',
        search: '搜索模组失败',
        details: '获取模组详情失败',
        config: '获取模组配置失败',
        customConfig: '获取用户自定义配置失败',
        toggleEnable: '启用模组失败',
        toggleDisable: '禁用模组失败',
        update: '更新模组失败',
        runtimeTargetRequired: '没有可更新的运行机器，请刷新模组列表后重试',
        uninstall: '卸载模组失败',
        configFile: '获取配置文件失败',
        saveConfig: '保存模组配置失败',
        copyConfiguration: '复制模组配置失败',
        download: '下载模组失败',
        runtimeInventory: '读取机器模组状态失败',
        refresh: '刷新模组状态失败'
      },
      publication: {
        title: '房间模组同步',
        description: '按当前运行位置，把模组文件和每个世界的独立配置同步到对应节点。',
        loadFailedTitle: '同步状态加载失败',
        actions: {
          open: '跨机同步',
          preview: '检查变更', publish: '应用到房间', retryFailed: '重试失败节点',
          cancel: '取消同步', viewStatus: '查看同步状态', activate: '重启并确认加载'
        },
        fields: {
          topologyRevision: '部署版本', target: '目标机器', worlds: '世界', mods: '模组',
          requiredBytes: '所需空间', currentVersion: '当前版本', desiredVersion: '目标版本',
          status: '状态', phase: '阶段', progress: '进度', message: '信息'
        },
        values: { ready: '可以应用', blocked: '同步受阻', warning: '同步警告', offline: '节点离线', unavailable: '尚不可用' },
        summary: { warnings: '{count} 条警告', blockers: '{count} 个阻塞项', affectedRooms: '同时影响 {count} 个房间' },
        unavailable: {
          title: '当前版本不支持跨机器同步模组',
          description: '请升级管理服务后重试。本机模组操作仍可使用。'
        },
        latest: { title: '最近一次同步', empty: '当前房间还没有同步记录。先检查变更，再应用到房间。' },
        statusDialog: {
          title: '模组同步状态',
          description: '同步任务 {id} 在各目标节点和世界上的实际执行结果。'
        },
        activation: {
          field: '生效方式',
          manual: '保存，稍后重启',
          restart: '保存并重启生效',
          descriptions: {
            manual: '先安全写入文件和配置，不中断正在运行的游戏；需要稍后重启分片才会完整生效。',
            restart: '同步成功后按洞穴优先停止、地面优先启动，并从新日志中确认每个分片已完成加载。'
          },
          restartTitle: '这会短暂中断当前房间',
          restartDescription: '系统只重启本次变更涉及的运行中分片；原本停服的分片保持停服。任何分片未确认加载都会保留失败状态和恢复入口。',
          badge: '生效：{status}',
          failedTitle: '模组激活失败',
          requiredTitle: '已同步，仍需重启分片',
          requiredDescription: '文件与配置已经提交，但运行中的 DST 仍在使用旧状态。可以现在协调重启并按日志确认加载。',
          statuses: {
            skipped: '等待手动重启', pending: '等待重启', restarting: '正在协调重启',
            confirming: '正在确认加载', succeeded: '已加载确认', failed: '激活失败', unknown: '状态未知'
          },
          columns: {
            world: '世界', target: '目标节点', status: '激活状态', runtime: '运行状态',
            evidence: '加载证据', observedAt: '确认时间'
          }
        },
        states: {
          queued: '排队中', running: '执行中', succeeded: '已成功', failed: '失败', skipped: '已跳过',
          canceled: '已取消', rolledBack: '已回滚', recoveryRequired: '需要恢复', previewed: '已预览',
          preparing: '准备中', prepared: '已准备', publishing: '同步中', committed: '已提交',
          completing: '收尾中', unknown: '未知状态'
        },
        phases: {
          preflight: '预检', stage: '暂存', download: '下载', verify: '校验', backup: '保护备份',
          configure: '写入配置', publish: '同步文件', reconcile: '状态对齐', rollback: '回滚',
          complete: '完成', unknown: '等待阶段信息'
        },
        outcomes: { full: '全部成功', partial: '部分成功', none: '未生效', unknown: '结果待确认' },
        blockers: {
          nodeOffline: '目标机器离线', placementChanged: '世界运行位置已变化', topologyChanged: '房间部署已变化',
          insufficientDisk: '节点磁盘空间不足', missingMod: '缺少模组文件', checksumMismatch: '模组文件校验失败',
          backupFailure: '保护快照失败', capabilityMissing: '节点缺少模组同步能力', versionConflict: '模组版本冲突',
          unknown: '同步检查未通过'
        },
        errors: {
          resultMissing: '同步任务已完成，但没有找到对应记录，请刷新同步状态后重试',
          previewBlocked: '同步检查未通过，请查看目标节点的阻断项并处理后重试',
          publicationRequired: '房间模组必须通过当前运行位置同步，不能使用旧的本地写入接口',
          planChanged: '模组或目标状态已变化，请重新检查变更',
          topologyChanged: '房间部署已变化，请刷新页面并重新检查变更',
          remoteActionUnavailable: '当前远程节点不支持这项模组读取操作',
          remoteMutationUnavailable: '当前运行位置不支持直接写入模组，请使用房间模组同步',
          unknown: '未知错误'
        },
        feedback: {
          previewReady: '变更检查已完成，请核对目标节点和世界',
          previewFailed: '检查模组变更失败：{error}', topologyLoadFailed: '房间拓扑读取失败：{error}', submitted: '模组同步已提交',
          publishFailed: '提交模组同步失败：{error}', retrySubmitted: '失败节点已重新提交',
          retryFailed: '重试失败节点失败：{error}', activationSubmitted: '分片重启和加载确认任务已提交',
          activationFailed: '模组激活失败：{error}'
        }
      },
      autoUpdate: {
        title: '模组更新策略',
        checkUnavailable: '更新状态待确认',
        filesUnavailable: '部分机器的模组版本无法比较',
        errors: {
          localFilesUnavailable: '上次检查时，部分机器缺少模组文件或文件不完整，无法与工坊版本比较。可在模组管理中直接下载到对应机器；文件补全后再检查更新。',
          checkTimeout: 'Steam 更新检查超时，暂时无法确认最新版本。',
          checkFailed: '本次未能确认模组更新，请重新检查。',
          downloadFailed: '模组下载失败，未执行世界重启。可查看详情后重试更新。',
          restartFailed: '模组已下载，但世界重启未全部完成。请查看详情。',
          failed: '模组更新受阻，请查看详情。',
          showDetails: '查看详情', hideDetails: '收起详情'
        },
        description: '按房间管理 Workshop 检查、运行机器预下载和无人时生效。',
        loading: '正在读取更新策略',
        actions: { open: '更新策略', checkNow: '立即检查', save: '保存策略' },
        mode: {
          title: '更新方式',
          description: '自动行为只作用于这个房间实际运行位置中的安装实例。',
          manual: '手动', notify: '仅提醒', auto: '无人自动更新',
          manualDescription: '只在你点击“立即检查”时读取 Workshop，不自动下载或重启。',
          notifyDescription: '定期检查并在页面提示可用更新，不改动运行节点。',
          autoDescription: '直接在各运行机器下载更新，全部成功且所有玩家持续离线后，重启原本运行的世界。'
        },
        fields: {
          interval: '检查间隔', grace: '无人宽限时间', announcement: '游戏内公告',
          announcementDescription: '有玩家在线时只公告一次，说明更新会等到全部离线后进行。'
        },
        intervals: { seconds: '{count} 秒', minutes: '{count} 分钟', hours: '{count} 小时' },
        safety: {
          title: '不会在玩家在线或遥测过期时重启',
          description: '系统先主动采集所有世界的玩家状态，连续无人达到宽限时间后，再在重启前复查一次；任何未知状态都会取消本次自动重启。'
        },
        status: {
          idle: '更新策略', checking: '正在检查更新', available: '发现可用更新', preparing: '正在预下载', prepared: '更新已准备',
          waiting_for_players: '等待玩家离线', scheduled: '等待无人宽限', activating: '正在应用更新', verifying: '正在确认加载',
          loaded: '更新已完成', blocked: '更新受阻', rolled_back: '更新已回滚',
          checkingDescription: '正在读取 Workshop 最新版本。', availableDescription: '发现 {count} 个模组可更新。',
          preparingDescription: '正在获取最新版本并准备到各运行机器。', preparedDescription: '所有运行机器已准备好，尚未重启世界。',
          waitingPlayersDescription: '当前有 {count} 名玩家在线，系统不会重启世界。', scheduledDescription: '房间当前无人，正在等待宽限时间结束。',
          activatingDescription: '模组下载完成，正在重启原本运行的世界。', verifyingDescription: '正在确认世界启动结果。',
          loadedDescription: '运行机器的模组已更新，原本运行的世界已完成重启。', blockedDescription: '本次更新受阻，请查看错误后重试。',
          rolled_backDescription: '发布未完成，系统已恢复之前的模组状态。'
        },
        feedback: {
          loadFailed: '读取模组更新策略失败：{error}', saved: '模组更新策略已保存', saveFailed: '保存模组更新策略失败：{error}',
          checkStarted: '模组更新检查已提交，可在任务中心查看进度', checkFailed: '提交模组更新检查失败：{error}'
        }
      },
      installed: {
        title: '房间模组',
        subtitle: '查看并管理每个世界启用的模组。',
        filters: {
          title: '筛选模组',
          description: '选择房间后查看模组及其启用范围。',
          room: '房间',
          selectRoom: '请选择房间',
          status: '状态',
          statuses: { all: '全部', allEnabled: '全部世界启用', partial: '部分世界启用', machineOnly: '机器已有', disabled: '全部停用' },
          sort: '排序方式',
          sorts: { enabled: '启用优先', updateStatus: '可更新优先', name: '名称', author: '作者', updatedAt: '更新时间', subscribers: '订阅数', rating: '评分' },
          keyword: '关键词',
          keywordPlaceholder: '搜索模组'
        },
        loadFailedTitle: '模组列表加载失败',
        loading: '正在加载模组列表',
        worldState: {
          selectWorld: '请选择世界',
          notConfigured: '未添加'
        },
        worldMatrix: {
          title: '启用世界',
          description: '启用状态可按世界控制',
          summary: '{enabled}/{total} 个世界启用',
          unassigned: '尚未分配运行位置',
          separateConfig: '按世界分别配置',
          mixedTitle: '各世界的模组配置不一致',
          mixedDescription: '统一保存会替换所选世界的配置差异，启用状态保持不变。',
          chooseSource: '选择配置来源',
          sourceWorld: '来源世界',
          sourceWarning: '将以所选世界的配置为基础。下一步确认保存后，应用到已添加此模组的所有世界。',
          reviewShared: '确认配置',
          modeSaveFailed: '配置模式保存失败：{error}',
          configureTogether: '统一配置'
        },
        operational: {
          machineOnly: '机器已有，未加入房间',
          machineCoverage: '{ready}/{total} 台运行机器已有',
          ready: '机器文件已就绪',
          readyTargets: '{ready}/{total} 台机器已就绪',
          enabled: '已启用',
          pending: '未下载',
          pendingTargets: '{count} 台机器缺少文件',
          downloadOnMachines: '直接下载到房间所在机器',
          unavailable: '机器状态不可用',
          unavailableTargets: '无法读取 {count} 台机器',
          noTarget: '运行位置不可用',
          disabled: '房间未启用',
          corrupt: '运行机器文件异常'
        },
        versions: {
          current: '当前 v{version}',
          latest: '最新 v{version}',
          transition: '当前 v{current} → 最新 v{latest}',
          mixed: '运行机器版本不一致 · 最新 v{latest}',
          unknown: '当前版本未识别 · 最新 v{latest}'
        },
        profile: {
          title: '房间默认配置',
          description: '默认应用到所有继承世界，只有明确设置的世界保留例外',
          roomDefault: '房间默认',
          appliesTo: '当前应用到 {count} 个世界',
          configureDefault: '配置房间默认',
          applyToRoom: '应用到整个房间',
          exceptions: '世界例外',
          exceptionSummary: '{count} 个世界使用独立设置',
          inherited: '继承房间默认',
          defaultSource: '房间默认来源',
          overridden: '独立设置',
          notConfiguredException: '此世界未添加',
          notSet: '尚未设为房间默认',
          setWorldOverride: '单独设置',
          defaultUnavailable: '请先把模组应用到整个房间'
        },
        actions: { addToRoom: '加入房间' },
        replicas: {
          title: '运行机器', description: '各机器上的模组状态',
          technicalDetails: '技术详情',
          loading: '正在读取节点同步诊断',
          readyCoverage: '{ready}/{total} 节点就绪', loadedCoverage: '{loaded}/{total} 世界已加载',
          stateUnavailable: '节点状态读取失败', unavailable: '无法读取节点模组状态：{error}',
          untracked: '这个模组还没有发布观测记录。首次同步后会显示每台机器的实际状态。', untrackedShort: '等待首次同步',
          cached: '已缓存', published: '已发布', configured: '已配置', loaded: '已加载',
          pendingRestart: '待重启加载', pending: '等待同步', publishing: '正在收敛', ready: '节点就绪', failed: '同步异常',
          loadedPlaceholder: '0/0 世界已加载', observedAt: '观测于 {time}', revision: '版本 {revision}',
          sources: { steam: '来源：节点 Steam', peer: '来源：节点直传', controller: '来源：控制器', cache: '来源：本机缓存', legacy_upload: '来源：兼容上传', unknown: '来源：未知' },
          fetch: {
            title: '下载来源', observed: '本次传输速度',
            routes: { cache: '机器已有', steam: 'Steam 下载', peer: '其他机器传输', controller: '管理端传输', legacy_upload: '兼容上传', unknown: '未知来源' },
            status: { selected: '已采用', succeeded: '可用', failed: '不可用', unavailable: '不可用', skipped: '未验证', available: '可用', unknown: '未验证' },
            rate: '有效吞吐 {value}', noTransfer: '命中，无需传输', speedUnavailable: '可用，未上报速度', notMeasured: '未产生传输',
            reasons: {
              CACHE_MISS: '当前安装没有该精确版本缓存', SOURCE_NOT_NEEDED: '前一条线路已经满足本次下载',
              FETCH_CAPABILITY_MISSING: '运行节点版本不支持自行获取模组', PEER_CAPABILITY_MISSING: '当前节点组合不支持节点间直传',
              PEER_SOURCE_UNAVAILABLE: '当前没有持有该精确版本且可直连的节点', PEER_GRANT_FAILED: '节点直传授权失败',
              CONTROLLER_SOURCE_UNAVAILABLE: '管理端没有所需版本的文件', STEAM_FETCH_FAILED: '运行机器从 Steam 下载失败',
              STEAM_VERSION_MISMATCH: 'Steam 当前版本与房间需要的精确版本不一致', PEER_FETCH_FAILED: '节点直传失败',
              CONTROLLER_FETCH_FAILED: '从管理端下载失败', LEGACY_UPLOAD_FAILED: '兼容上传失败',
              FETCH_MANIFEST_MISMATCH: '下载内容校验结果与期望版本不一致', MOD_IMPORT_FAILED: '下载完成，但导入节点缓存失败',
              MOD_FETCH_FAILED: '模组下载失败'
            }
          },
          stages: {
            cached: { ready: '已缓存', pending: '未缓存' },
            published: { ready: '已发布', pending: '未发布' },
            configured: { ready: '已配置', pending: '未配置' },
            loaded: { ready: '已加载', pending: '未加载' }
          }
        },
        consistency: {
          title: '客户端必装模组未覆盖全部世界',
          description: '玩家切换世界时可能出现模组不一致。建议在该房间的全部世界启用。'
        },
        aria: {
          toggle: '切换 {name}',
          toggleWorld: '在 {world} 切换 {mod}',
          toggleRoomDefault: '切换 {mod} 的房间默认状态',
          configureRoomDefault: '配置 {mod} 的房间默认参数',
          separateWorldConfig: '切换 {mod} 的按世界分别配置',
          configureWorld: '配置 {world} 的 {mod}',
          openWorldMenu: '打开 {world} 的模组操作',
          openMenu: '打开 {name} 操作菜单',
          operationProgress: '{name} 处理进度 {value}%',
          expand: '展开 {name} 的世界设置',
          collapse: '收起 {name} 的世界设置',
          menuTitle: '模组操作'
        },
        empty: {
          noMods: '还没有安装任何模组',
          noModsDescription: '从创意工坊搜索并添加模组。',
          noRooms: '没有可管理的房间',
          noRoomsDescription: '先创建房间或等待 Agent 上报，再管理模组。'
        },
        details: {
          title: '模组详情',
          description: '已安装模组的版本、兼容性和文件信息。',
          modDescription: '模组描述',
          noDescription: '该模组暂无描述',
          compatibility: '兼容性',
          compatibilityValues: {
            dst: '饥荒联机版',
            ds: '单机版饥荒',
            rog: '巨人国',
            sw: '海难',
            hamlet: '哈姆雷特'
          },
          fileInfo: '文件信息',
          modId: '模组 ID',
          installPath: '安装位置',
          fileSize: '文件大小',
          installedAt: '安装时间'
        },
        uninstall: {
          title: '从房间移除模组',
          description: '此操作只删除该房间各世界中的模组引用和配置，不会删除节点上的 Workshop 文件。',
          worldTitle: '从这个世界移除模组',
          worldDescription: '只删除“{world}”中的模组引用和独立配置，其他世界不受影响。',
          confirmationDescription: 'Workshop 文件仍会保留，请确认是否从当前范围移除模组。',
          roomName: '当前房间',
          placeholder: '当前房间：{name}',
          fallbackPlaceholder: '当前房间'
        },
        roomCopy: {
          action: '复制其他房间模组', title: '从其他房间复制模组',
          description: '把来源房间的模组、启用状态和独立参数复制到“{room}”。',
          loading: '正在读取来源房间的世界和模组', worldMappings: '世界对应关系',
          worldMappingsDescription: '系统优先按 Master、Caves 和同名世界自动匹配。', noMatch: '没有对应世界',
          summary: '将处理 {mods} 个模组、{assignments} 个世界配置',
          mergeDescription: '目标房间额外已有的模组会保留；只添加或更新来源房间包含的模组。运行中的世界在下次重启后生效。',
          progress: '{completed}/{total} · {item}', confirm: '复制模组',
          loadFailed: '读取来源房间模组失败：{error}', success: '已完成 {count} 个模组世界配置的复制',
          partial: '成功 {completed} 项，失败 {failed} 项。首个错误：{error}'
        },
        copy: {
          title: '复制模组配置',
          description: '将“{source}”的模组配置复制到其他已添加此模组的世界。',
          targets: '目标世界',
          targetsDescription: '目标世界原有的自定义参数会被替换；启用或停用状态保持不变。',
          noTargets: '没有其他已添加该模组的世界可供复制'
        },
        configFile: {
          title: '模组配置文件',
          loading: '正在读取配置文件'
        },
        feedback: {
          selectConfigWorld: '请先选择要配置的世界',
          configUpdated: '模组 {id} 配置已更新！',
          noWorlds: '当前房间没有可配置的世界',
          selectConfiguredWorld: '请先选择一个已使用该模组的世界',
          addedToWorld: '已将模组 {name} 添加并启用到 {world}，运行中的世界将在下次重启后生效',
          addedToRoom: '已将模组 {name} 添加并启用到整个房间，运行中的世界将在下次重启后生效',
          enabledInRoom: '已在全部世界启用模组 {name}，运行中的世界将在下次重启后生效',
          disabledInRoom: '已在全部世界停用模组 {name}，运行中的世界将在下次重启后生效',
          enabledInWorld: '已在 {world} 启用模组 {name}，运行中的世界将在下次重启后生效',
          disabledInWorld: '已在 {world} 停用模组 {name}，运行中的世界将在下次重启后生效',
          updated: '模组 {name} 已更新',
          confirmRoomName: '请确认移除模组',
          uninstalled: '模组 {name} 已从房间移除，节点文件仍然保留',
          removedFromWorld: '模组 {name} 已从 {world} 移除，其他世界和节点文件不受影响',
          configurationCopied: '已将 {source} 的配置复制到 {count} 个世界，运行中的世界将在下次重启后生效',
          configurationAlreadySame: '所选世界的配置已经与 {source} 一致',
          configurationPartiallyCopied: '已复制到 {count} 个世界，后续目标失败：{error}',
          selectViewWorld: '请先选择要查看的世界',
          configFileMissing: '该世界还没有 modoverrides.lua 文件',
          noDownloadContent: '没有可下载的配置内容',
          configFileDownloaded: '模组配置文件已成功下载'
        }
      },
      library: {
        title: '模组内容目录',
        subtitle: '控制器保留可校验版本作为迁移和回滚兜底；运行节点默认直接从 Steam 获取相同内容。',
        filters: {
          title: '筛选内容库模组',
          description: '按名称、作者、Workshop ID 或内容库状态查找模组。',
          keyword: '关键词',
          keywordPlaceholder: '搜索名称、作者或 Workshop ID',
          status: '内容状态',
          statuses: { all: '全部', downloaded: '已下载', attention: '需要处理' },
          sort: '排序',
          sorts: { updatedAt: '最近更新', name: '名称', author: '作者', version: '版本', subscriptions: '订阅数', rating: '评分' }
        },
        loadFailedTitle: '模组内容库加载失败',
        table: {
          title: '控制器内容',
          total: '显示 {count} 个模组',
          mod: '模组',
          workshop: 'Workshop 数据',
          status: '状态',
          updatedAt: '更新时间',
          actions: '操作'
        },
        empty: {
          noMods: '内容库中还没有 Workshop 模组',
          noModsDescription: '从 Workshop 保存一个精确版本后，可用于版本不一致或节点无法直连 Steam 时兜底。',
          noMatches: '没有匹配的内容库模组',
          noMatchesDescription: '调整关键词或状态筛选后重试。'
        },
        feedback: {
          downloading: '正在下载到控制器内容库...',
          updating: '正在更新控制器内容库文件...',
          downloaded: '模组 {name} 已下载到控制器内容库',
          updated: '模组 {name} 的控制器内容已更新',
          refreshed: '已刷新模组 {name} 的版本和本地状态'
        }
      },
      runtimeInventory: {
        machine: { title: '运行机器', select: '选择机器', installation: '安装实例', selectInstallation: '选择安装实例', online: '在线', offline: '离线' },
        summary: {
          installation: '安装实例：{installation}', total: '{count} 个目录', installed: '{count} 个已安装', outdated: '{count} 个可更新',
          invalid: '{count} 个不完整目录', unknown: '{count} 个版本未知', observedAt: '读取于 {time}'
        },
        filters: { search: '搜索名称、作者或 Workshop ID', installed: '已安装', outdated: '可更新', attention: '不完整', all: '全部目录' },
        table: {
          title: '机器实际内容', description: '显示 {count} 个模组', mod: '模组', version: '当前 / 最新版本',
          content: '内容状态', size: '占用空间', rooms: '使用房间', roomsDescription: '此模组由以下房间和世界引用。', moreRooms: '另外 {count} 个房间',
          actions: '操作', unused: '未被房间引用', localSteamAt: '本机 Steam 内容：{time}'
        },
        actions: { update: '更新', updating: '更新中', redownload: '重新下载', redownloading: '下载中', updateAll: '全部更新', updatingAll: '全部更新中' },
        progress: {
          aria: '机器模组处理进度 {value}%', detail: '{stage} · {name}', allMods: '全部可更新模组',
          queued: '等待开始', downloading: '正在下载并校验', preparing: '正在准备机器文件',
          publishing: '正在应用机器文件', verifying: '正在确认结果', completed: '处理完成'
        },
        feedback: { updated: '已更新机器模组 {name}；房间配置和世界进程未改变', updatedAll: '这台机器的可更新模组已全部更新；世界未重启', updateFailed: '机器模组更新失败：{error}' },
        versions: { transition: 'v{current} → v{latest}', current: 'v{version}', latest: '最新 v{version}', unavailable: '版本未填写' },
        states: { current: '已是最新', outdated: '有可用更新', contentUpdated: 'Workshop 内容已更新', unknown: '版本未知', invalid: '目录不完整' },
        reasons: {
          unsafe_path: '目录路径不安全', unreadable: '目录无法读取', invalid_directory: '内容目录无效',
          missing_modinfo: '缺少 modinfo.lua，可能是 Steam 空目录或下载中断', invalid_modinfo: 'modinfo.lua 无效',
          mod_version_unreadable: '版本文件无法读取', mod_version_unavailable: '模组未填写版本', mod_version_invalid: '版本字段无效',
          workshop_manifest_unavailable: 'Steam 清单位置未知', workshop_manifest_unsafe: 'Steam 清单路径不安全',
          workshop_manifest_missing: '缺少 Steam 安装清单', workshop_manifest_invalid: 'Steam 安装清单无效',
          workshop_manifest_unreadable: 'Steam 安装清单无法读取', workshop_manifest_item_missing: 'Steam 清单中没有此模组',
          unknown: '详细原因：{reason}'
        },
        offline: { title: '{machine} 当前离线', description: '恢复机器连接后，点击刷新查看已下载模组。' },
        warnings: { title: '部分补充信息不可用' },
        errors: { targetsTitle: '机器列表读取失败', inventoryTitle: '机器模组内容读取失败' },
        empty: {
          title: '这台机器还没有模组文件', description: '房间添加模组或节点完成预下载后会显示在这里。',
          filtered: '没有匹配的模组', filteredDescription: '调整关键词或状态筛选后重试。',
          noMachines: '没有可读取的运行机器', noMachinesDescription: '请先完成本机 Runtime 或 Agent 安装实例配置。'
        }
      },
      addToRoom: {
        title: '下载并添加到房间',
        description: '为“{name}”选择房间和世界；模组会直接下载到这些世界所在的运行机器。',
        loadFailedTitle: '房间信息加载失败',
        room: '房间',
        loadingRooms: '正在加载房间',
        selectRoom: '请选择房间',
        roomDescription: '系统只修改所选世界的 modoverrides.lua；不会备份、停服或自动重启。',
        noRoomsTitle: '没有可管理的房间',
        noRoomsDescription: '请先创建房间或等待 Agent 上报。',
        worlds: '应用到世界',
        worldsDescription: '默认选择该房间的全部世界，也可以只选择地面或洞穴。',
        noWorlds: '该房间没有可配置的世界。',
        dependencies: '同时添加依赖模组',
        dependenciesDescription: '依赖模组会一并准备到所选世界的运行机器。',
        targets: '应用节点',
        targetsDescription: '按所选世界的运行机器分组。',
        unknownTarget: '尚未确定运行机器',
        planReady: '变更检查已完成，请核对后应用到房间。',
        planBlocked: '同步计划存在阻塞项，暂时不能提交。',
        legacyFallback: '后端不支持跨节点同步，已使用原有本地添加方式。',
        progress: {
          aria: '模组添加进度 {value}%', checking: '正在检查模组文件', downloading: '正在下载并校验模组',
          preparing: '正在准备运行机器', applying: '正在应用房间配置', completed: '模组已准备完成'
        },
        apply: '添加并启用',
        applying: '正在添加',
        adding: '正在添加',
        added: '模组 {name} 已添加到所选房间世界'
      },
      downloadToMachine: {
        title: '下载模组到机器',
        description: '只把“{name}”下载到所选运行机器，不修改任何房间配置。',
        machine: '运行机器',
        selectMachine: '请选择运行机器',
        machineDescription: 'SteamCMD 将直接在 {machine} 下载和校验文件。',
        noMachine: '当前范围没有在线的运行机器。',
        failedTitle: '模组下载失败',
        downloading: '正在通过 SteamCMD 下载并校验',
        progress: '模组下载进度 {value}%',
        download: '下载',
        redownload: '重新下载',
        downloadUpdate: '下载更新',
        downloadingAction: '下载中',
        downloaded: '模组 {name} 已下载到 {machine}；房间配置未改变',
        states: { missing: '未下载', current: '已下载', outdated: '可更新', unknown: '已下载 · 版本未确认', invalid: '文件不完整', unavailable: '状态不可用' }
      },
      search: {
        title: '搜索模组',
        subtitle: '从创意工坊查找模组，然后直接加入房间。',
        form: {
          title: '搜索条件',
          description: '输入创意工坊模组名称或 Workshop ID。',
          room: '房间',
          loadingRooms: '正在加载房间',
          selectRoom: '请选择房间',
          name: '模组名称或 Workshop ID',
          namePlaceholder: '输入名称或 ID，留空浏览热门模组',
          sort: '排序',
          category: '分类',
          days: '时间范围',
          pageSize: '每页数量'
        },
        sorts: {
          relevance: '相关度', trend: '热门趋势', mostRecent: '最新发布', lastUpdated: '最近更新',
          mostSubscribed: '订阅最多', topRated: '评分最高'
        },
        days: { one: '今天', seven: '最近 7 天', thirty: '最近 30 天', ninety: '最近 90 天', year: '最近一年', all: '全部时间' },
        results: '{count} 个结果',
        loadFailedTitle: '模组数据加载失败',
        empty: {
          noResults: '没有找到匹配的模组',
          noResultsDescription: '尝试调整关键词、排序、分类或时间范围。',
          notSearched: '正在准备 Workshop 浏览数据'
        },
        details: {
          title: '模组详情',
          description: '创意工坊模组信息。',
          modDescription: '模组描述'
        },
        feedback: {
          enterKeyword: '请输入搜索关键词',
          installedConfirm: '模组“{name}”已下载，是否要更新？',
          updateTitle: '更新模组',
          selectRoom: '请先选择房间',
          downloading: '正在下载模组，请耐心等待...',
          updated: '更新成功',
          downloaded: '模组内容已准备',
          refreshed: '已刷新版本和本地状态'
        },
        downloadStatus: {
          queuedTitle: '下载任务已提交',
          queuedDescription: '正在等待 SteamCMD 开始处理。',
          runningTitle: '正在下载模组',
          runningDescription: 'SteamCMD 正在下载并校验 Workshop 文件。',
          succeededTitle: '模组内容准备完成',
          succeededDescription: '模组内容已准备，可以加入房间。',
          failedTitle: '下载失败',
          failedDescription: '下载任务没有完成，可以重新尝试。'
        },
        runtimeStatus: {
          current: '已下载', outdated: '可更新', unknown: '已下载 · 版本未确认', invalid: '文件不完整', notDownloaded: '所选机器尚未下载',
          failedTitle: '部分机器下载状态不可用', failedDescription: '有 {count} 台在线机器未能读取模组目录，可重试刷新。'
        }
      },
      config: {
        title: '模组配置 - {name}',
        unnamed: '未命名模组',
        loadingName: '加载中...',
        description: '正在编辑“{world}”世界的独立模组配置。',
        roomDescription: '正在统一配置房间内的 {count} 个世界。',
        target: '配置应用位置：{target}',
        roomTarget: '配置范围：{count} 个世界',
        targetUnknown: '尚未获取该世界的运行机器',
        saveBehaviorTitle: '保存不会重启世界',
        saveBehaviorDescription: '保存不会重启世界，配置在下次启动时生效。',
        roomSaveBehaviorDescription: '以上世界使用相同配置。保存不会重启世界，配置在下次启动时生效。',
        loading: '加载模组配置中...',
        loadFailedTitle: '模组配置加载失败',
        modDescription: '模组描述',
        optionHelp: '查看 {label} 说明',
        selectOption: '请选择',
        emptyTitle: '该模组没有配置选项',
        emptyDescription: '仍可直接启用或停用该模组。',
        unavailable: '无法加载模组信息',
        feedback: {
          resetConfirm: '确定要删除当前世界的自定义覆盖并恢复模组默认值吗？未知配置项会保留。',
          resetTitle: '确认恢复默认值',
          resetSuccess: '已载入模组默认值，保存后生效',
          noChanges: '没有需要保存的配置变更',
          saved: '配置已保存，运行中的世界将在下次重启后生效',
          savingTitle: '正在保存配置',
          savingDescription: '正在写入配置文件',
          saveCompletedTitle: '配置已保存',
          saveFailedTitle: '配置保存失败',
          saveFailedDescription: '运行节点未完成配置同步，可以修改后重试。',
          unsavedConfirm: '您有未保存的配置更改，确定要关闭吗？',
          closeTitle: '关闭模组配置'
        }
      }
    }
  },
  'en-US': {
    mods: {
      metadata: {
        notice: 'Workshop information',
        localFactsAvailable: 'Names or authors are missing. Click “Retry information” to fetch them. Mod usage is unaffected.',
        retry: 'Retry information',
        retrying: 'Fetching information…',
        retryCompleted: 'Workshop names and authors are now complete',
        retryIncomplete: 'Information is still unavailable for {count} Mods. Existing information has been kept.'
      },
      management: {
        title: 'Mod Management',
        subtitle: 'Find Mods, manage downloads on each machine, and enable them for rooms.',
        tabs: { workshop: 'Workshop', catalog: 'Machine Mods', room: 'Room Mods' },
        workshop: {
          title: 'Workshop',
          description: 'Find and inspect Mods. Adding one to a room prepares its files on the relevant runtime machines.'
        },
        catalog: {
          title: 'Machine Mods',
          description: 'Select a machine to inspect and update the Mod files DST actually uses.'
        },
        room: {
          title: 'Room Mods',
          description: 'Select a room to inspect and change the Mods enabled in each world.'
        },
        scopes: { workshop: 'Workshop', downloaded: 'All Content', updates: 'Updates' }
      },
      values: {
        unknown: 'Unknown',
        unknownAuthor: 'Unknown author',
        installed: 'Installed',
        downloaded: 'Downloaded',
        notDownloaded: 'Not downloaded',
        enabled: 'Enabled',
        disabled: 'Disabled',
        on: 'On',
        off: 'Off',
        subscriptions: 'subscribers',
        rating: 'rating',
        health: {
          healthy: 'Healthy',
          disabled: 'Disabled',
          notDownloaded: 'Not downloaded',
          notInstalled: 'Not installed',
          notLoaded: 'Not loaded',
          updateAvailable: 'Update available',
          corrupt: 'Corrupt files',
          parseWarning: 'Parse warning'
        },
        parser: { go: 'Go parser', lua: 'Lua compatibility parser' },
        repairAction: { repair: 'Repair', restart: 'Restart', update: 'Update', configure: 'Configure' },
        source: { configured: 'Configured', path: 'PATH', standard: 'Standard location' },
        fieldType: { boolean: 'Boolean', number: 'Number', string: 'String', text: 'Text', select: 'Select', json: 'JSON data' }
      },
      workshop: {
        detailsTitle: 'Mod Details',
        detailsDescription: 'Complete information from Steam Workshop and the local mod package.',
        loadingDetails: 'Loading mod details',
        summary: 'Workshop Summary',
        fileAndActivity: 'Files and Activity',
        description: 'Mod Description',
        noDescription: 'This mod does not have a description.',
        workshopId: 'Workshop ID',
        version: 'Version',
        author: 'Author',
        rating: 'Rating',
        ratingCount: '{count} ratings',
        noRatings: 'Not rated yet',
        subscriptions: 'Subscribers',
        favorites: 'Favorites',
        views: 'Views',
        fileSize: 'File Size',
        publishedAt: 'Published',
        updatedAt: 'Updated',
        tags: 'Categories',
        steamPage: 'Steam Details',
        changelog: 'Change Notes',
        categories: {
          all: 'All Categories', character: 'Character', item: 'Item', pet: 'Pet', creature: 'Creature',
          environment: 'Environment', interface: 'Interface', utility: 'Utility', art: 'Art', worldgen: 'World Generation',
          tweak: 'Tweak', scenario: 'Scenario', language: 'Language', other: 'Other', tutorial: 'Tutorial',
          clientOnly: 'Client Only', serverOnly: 'Server Only', allClientsRequire: 'All Clients Require', serverAdmin: 'Server Admin'
        }
      },
      actions: {
        refresh: 'Refresh',
        refreshing: 'Refreshing',
        add: 'Add Mod',
        addToRoom: 'Add to Room',
        downloadAndAddToRoom: 'Download and Add to Room',
        addToWorld: 'Add',
        enableInRoom: 'Enable in All Worlds',
        disableInRoom: 'Disable in All Worlds',
        copyConfiguration: 'Copy Configuration',
        searchWorkshop: 'Search Workshop',
        getConfigFile: 'Get Configuration File',
        filter: 'Filter',
        reset: 'Reset',
        retry: 'Retry',
        configure: 'Configure',
        details: 'View Details',
        update: 'Update',
        updateMod: 'Update Mod',
        download: 'Download',
        downloadMod: 'Download Mod',
        downloading: 'Downloading',
        close: 'Close',
        cancel: 'Cancel',
        confirm: 'Confirm',
        downloadConfigFile: 'Download Configuration File',
        saveConfig: 'Save Configuration',
        resetDefaults: 'Restore Defaults',
        backToInstalled: 'Back to Installed Mods',
        backToLibrary: 'Back to Mod Content Library',
        search: 'Search',
        more: 'More actions'
      },
      errors: {
        withDetail: '{message}: {detail}',
        withRequestId: '{message} (request ID: {requestId})',
        withJobId: '{message} (job ID: {jobId})',
        withRequestAndJobId: '{message} (request ID: {requestId}; job ID: {jobId})',
        context: 'Could not load the mod context',
        library: 'Could not load the mod content library',
        addToRoom: 'Could not add the mod to the room',
        roomSwitch: 'Could not switch rooms',
        list: 'Could not load the mod list',
        installedList: 'Could not load installed mods',
        search: 'Could not search for mods',
        details: 'Could not load mod details',
        config: 'Could not load the mod configuration',
        customConfig: 'Could not load the custom mod configuration',
        toggleEnable: 'Could not enable the mod',
        toggleDisable: 'Could not disable the mod',
        update: 'Could not update the mod',
        runtimeTargetRequired: 'No updatable runtime machine was found. Refresh the mod list and try again.',
        uninstall: 'Could not uninstall the mod',
        configFile: 'Could not load the configuration file',
        saveConfig: 'Could not save the mod configuration',
        copyConfiguration: 'Could not copy the mod configuration',
        download: 'Could not download the mod',
        runtimeInventory: 'Could not read machine Mod status',
        refresh: 'Could not refresh the mod status'
      },
      publication: {
        title: 'Room Mod Sync',
        description: 'Sync mod files and each world\'s independent configuration to the nodes where those worlds run.',
        loadFailedTitle: 'Failed to Load Sync Status',
        actions: {
          open: 'Cross-node Sync',
          preview: 'Check Changes', publish: 'Apply to Room', retryFailed: 'Retry Failed Nodes',
          cancel: 'Cancel Sync', viewStatus: 'View Sync Status', activate: 'Restart and Confirm Load'
        },
        fields: {
          topologyRevision: 'Topology Revision', target: 'Target Node', worlds: 'Worlds', mods: 'Mods',
          requiredBytes: 'Required Space', currentVersion: 'Current Version', desiredVersion: 'Desired Version',
          status: 'Status', phase: 'Phase', progress: 'Progress', message: 'Message'
        },
        values: { ready: 'Ready to Apply', blocked: 'Sync Blocked', warning: 'Sync Warning', offline: 'Node Offline', unavailable: 'Unavailable' },
        summary: { warnings: '{count} warnings', blockers: '{count} blockers', affectedRooms: 'Affects {count} rooms' },
        unavailable: {
          title: 'Cross-node mod sync is not available from this backend',
          description: 'Update the management service and retry. Local mod actions are still available.'
        },
        latest: { title: 'Latest Sync', empty: 'This room has no sync history. Check changes before applying them to the room.' },
        statusDialog: {
          title: 'Mod Sync Status',
          description: 'Actual target-node and world results for sync task {id}.'
        },
        activation: {
          field: 'Activation Mode',
          manual: 'Save and Restart Later',
          restart: 'Save and Restart Now',
          descriptions: {
            manual: 'Write files and configuration safely without interrupting the running game. Restart the shards later to fully activate the changes.',
            restart: 'After syncing, stop secondary shards first, start the master first, and confirm every shard from newly written load logs.'
          },
          restartTitle: 'This briefly interrupts the current room',
          restartDescription: 'Only running shards affected by these changes are restarted. Shards that were stopped remain stopped. Any unconfirmed shard retains a failed state and recovery path.',
          badge: 'Activation: {status}',
          failedTitle: 'Mod Activation Failed',
          requiredTitle: 'Synced, Shard Restart Still Required',
          requiredDescription: 'Files and configuration are committed, but running DST processes still use the previous state. Restart now and confirm loading from fresh logs.',
          statuses: {
            skipped: 'Awaiting Manual Restart', pending: 'Restart Pending', restarting: 'Coordinating Restart',
            confirming: 'Confirming Load', succeeded: 'Load Confirmed', failed: 'Activation Failed', unknown: 'Unknown Status'
          },
          columns: {
            world: 'World', target: 'Target Node', status: 'Activation', runtime: 'Runtime',
            evidence: 'Load Evidence', observedAt: 'Confirmed At'
          }
        },
        states: {
          queued: 'Queued', running: 'Running', succeeded: 'Succeeded', failed: 'Failed', skipped: 'Skipped',
          canceled: 'Canceled', rolledBack: 'Rolled Back', recoveryRequired: 'Recovery Required', previewed: 'Previewed',
          preparing: 'Preparing', prepared: 'Prepared', publishing: 'Syncing', committed: 'Committed',
          completing: 'Completing', unknown: 'Unknown Status'
        },
        phases: {
          preflight: 'Preflight', stage: 'Stage', download: 'Download', verify: 'Verify', backup: 'Protection Backup',
          configure: 'Configure', publish: 'Sync Files', reconcile: 'Reconcile', rollback: 'Rollback',
          complete: 'Complete', unknown: 'Awaiting Phase Data'
        },
        outcomes: { full: 'Full Success', partial: 'Partial Success', none: 'No Changes Applied', unknown: 'Outcome Pending' },
        blockers: {
          nodeOffline: 'Target machine is offline', placementChanged: 'World location has changed', topologyChanged: 'Room deployment has changed',
          insufficientDisk: 'Insufficient disk space on the node', missingMod: 'Mod files are missing', checksumMismatch: 'Mod file checksum mismatch',
          backupFailure: 'Protection snapshot failed', capabilityMissing: 'Node mod-sync capability is missing', versionConflict: 'Mod version conflict',
          unknown: 'Sync check did not pass'
        },
        errors: {
          resultMissing: 'The sync job completed, but its record could not be found. Refresh the sync status and try again.',
          previewBlocked: 'The sync check did not pass. Resolve the target blockers and try again.',
          publicationRequired: 'Room mods must be synced to their current runtime locations instead of using the legacy local write API.',
          planChanged: 'The mod content or target state changed. Check the changes again.',
          topologyChanged: 'The room topology changed. Refresh the page and check the changes again.',
          remoteActionUnavailable: 'This remote node does not support the requested mod read operation',
          remoteMutationUnavailable: 'The active runtime location cannot be modified directly; use room mod sync',
          unknown: 'Unknown error'
        },
        feedback: {
          previewReady: 'Change check completed. Review the target nodes and worlds.',
          previewFailed: 'Could not check mod changes: {error}', topologyLoadFailed: 'Could not load room topology: {error}', submitted: 'Mod sync submitted',
          publishFailed: 'Could not submit mod sync: {error}', retrySubmitted: 'Failed nodes were resubmitted',
          retryFailed: 'Could not retry failed nodes: {error}', activationSubmitted: 'Shard restart and load confirmation submitted',
          activationFailed: 'Could not activate the synced mods: {error}'
        }
      },
      autoUpdate: {
        title: 'Mod Update Policy',
        checkUnavailable: 'Update status needs confirmation',
        filesUnavailable: 'Some machine Mod versions cannot be compared',
        errors: {
          localFilesUnavailable: 'The last check found missing or incomplete Mod files on some machines. Download directly to those machines in Mod management, then check for updates again.',
          checkTimeout: 'The Steam update check timed out. Latest versions could not be confirmed.',
          checkFailed: 'Mod updates could not be confirmed. Please check again.',
          downloadFailed: 'Mod downloads failed. No worlds were restarted. Review the details before retrying the update.',
          restartFailed: 'Mods were downloaded, but some world restarts did not finish. Review the details.',
          failed: 'The Mod update was blocked. Review the details.',
          showDetails: 'View details', hideDetails: 'Hide details'
        },
        description: 'Manage Workshop checks, runtime-machine prefetch, and empty-room activation per room.',
        loading: 'Loading update policy',
        actions: { open: 'Update Policy', checkNow: 'Check Now', save: 'Save Policy' },
        mode: {
          title: 'Update Mode',
          description: 'Automatic actions only affect installations in this room\'s applied runtime placement.',
          manual: 'Manual', notify: 'Notify Only', auto: 'Update When Empty',
          manualDescription: 'Read Workshop only when you click Check Now. Nothing is downloaded or restarted automatically.',
          notifyDescription: 'Check on a schedule and show available updates without changing runtime nodes.',
          autoDescription: 'Download updates directly on each runtime machine, then restart previously running worlds after all downloads succeed and every player has stayed offline for the grace period.'
        },
        fields: {
          interval: 'Check Interval', grace: 'Empty Grace Period', announcement: 'In-game Announcement',
          announcementDescription: 'When players are online, announce once that the update will wait until everyone leaves.'
        },
        intervals: { seconds: '{count} seconds', minutes: '{count} minutes', hours: '{count} hours' },
        safety: {
          title: 'Never restarts with players online or stale telemetry',
          description: 'The system actively samples every world, waits for continuous empty time, and checks again immediately before restarting. Any unknown state cancels the automatic restart.'
        },
        status: {
          idle: 'Update Policy', checking: 'Checking for Updates', available: 'Updates Available', preparing: 'Prefetching', prepared: 'Update Prepared',
          waiting_for_players: 'Waiting for Players', scheduled: 'Empty Grace Period', activating: 'Applying Update', verifying: 'Confirming Load',
          loaded: 'Update Completed', blocked: 'Update Blocked', rolled_back: 'Update Rolled Back',
          checkingDescription: 'Reading the latest Workshop versions.', availableDescription: '{count} mods have updates available.',
          preparingDescription: 'Fetching the latest versions and preparing them on each runtime machine.', preparedDescription: 'Every runtime machine is ready; no world has been restarted yet.',
          waitingPlayersDescription: '{count} players are online, so the system will not restart the worlds.', scheduledDescription: 'The room is empty and the grace period is running.',
          activatingDescription: 'Downloads finished. Restarting only worlds that were already running.', verifyingDescription: 'Checking world startup results.',
          loadedDescription: 'Runtime mods have been updated and previously running worlds have restarted.', blockedDescription: 'This update was blocked. Review the error and retry.',
          rolled_backDescription: 'Publication did not complete and the previous Mod state was restored.'
        },
        feedback: {
          loadFailed: 'Could not load the Mod update policy: {error}', saved: 'Mod update policy saved', saveFailed: 'Could not save the Mod update policy: {error}',
          checkStarted: 'Mod update check submitted. Progress is available in the job center.', checkFailed: 'Could not submit the Mod update check: {error}'
        }
      },
      installed: {
        title: 'Room Mods',
        subtitle: 'Inspect and manage the Mods enabled in each world.',
        filters: {
          title: 'Filter Mods',
          description: 'Select a room to inspect its Mods and enabled worlds.',
          room: 'Room',
          selectRoom: 'Select a room',
          status: 'Status',
          statuses: { all: 'All', allEnabled: 'Enabled in All Worlds', partial: 'Enabled in Some Worlds', machineOnly: 'On Machine', disabled: 'All Disabled' },
          sort: 'Sort By',
          sorts: { enabled: 'Enabled First', updateStatus: 'Updates First', name: 'Name', author: 'Author', updatedAt: 'Updated', subscribers: 'Subscribers', rating: 'Rating' },
          keyword: 'Keyword',
          keywordPlaceholder: 'Search mods'
        },
        loadFailedTitle: 'Failed to Load Mods',
        loading: 'Loading mods',
        worldState: {
          selectWorld: 'Select a world',
          notConfigured: 'Not Added'
        },
        worldMatrix: {
          title: 'Enabled Worlds',
          description: 'Enabled state can be controlled per world',
          summary: '{enabled}/{total} worlds enabled',
          unassigned: 'Runtime location not assigned',
          separateConfig: 'Configure worlds separately',
          mixedTitle: 'Worlds have different Mod configurations',
          mixedDescription: 'Saving together replaces configuration differences while keeping each world enabled or disabled.',
          chooseSource: 'Choose configuration source',
          sourceWorld: 'Source world',
          sourceWarning: 'The selected configuration will apply to every world with this Mod after you review and save it.',
          reviewShared: 'Review configuration',
          modeSaveFailed: 'Could not save configuration mode: {error}',
          configureTogether: 'Configure together'
        },
        operational: {
          machineOnly: 'On machine, not added to room',
          machineCoverage: 'Present on {ready}/{total} runtime machines',
          ready: 'Machine files are ready',
          readyTargets: '{ready}/{total} machines ready',
          enabled: 'Enabled',
          pending: 'Not downloaded',
          pendingTargets: 'Files missing on {count} machines',
          downloadOnMachines: 'Download directly on the room’s machines',
          unavailable: 'Machine state unavailable',
          unavailableTargets: 'Cannot read {count} machines',
          noTarget: 'Runtime location unavailable',
          disabled: 'Not enabled in room',
          corrupt: 'Runtime files have errors'
        },
        versions: {
          current: 'Current v{version}',
          latest: 'Latest v{version}',
          transition: 'Current v{current} → latest v{latest}',
          mixed: 'Runtime machines use different versions · latest v{latest}',
          unknown: 'Current version is unknown · latest v{latest}'
        },
        profile: {
          title: 'Room Default Configuration',
          description: 'Applies to inheriting worlds by default; only explicit world settings remain exceptions',
          roomDefault: 'Room Default',
          appliesTo: 'Currently applies to {count} worlds',
          configureDefault: 'Configure room default',
          applyToRoom: 'Apply to entire room',
          exceptions: 'World Exceptions',
          exceptionSummary: '{count} worlds use independent settings',
          inherited: 'Inherits room default',
          defaultSource: 'Room default source',
          overridden: 'Independent settings',
          notConfiguredException: 'Not added to this world',
          notSet: 'Not set as room default',
          setWorldOverride: 'Set independently',
          defaultUnavailable: 'Apply this mod to the entire room first'
        },
        actions: { addToRoom: 'Add to Room' },
        replicas: {
          title: 'Machines', description: 'Mod status on each machine',
          technicalDetails: 'Technical details',
          loading: 'Loading node synchronization diagnostics',
          readyCoverage: '{ready}/{total} nodes ready', loadedCoverage: '{loaded}/{total} worlds loaded',
          stateUnavailable: 'Node state unavailable', unavailable: 'Unable to read node Mod state: {error}',
          untracked: 'This Mod has no publication observation yet. Per-node state appears after the first synchronization.', untrackedShort: 'Awaiting first sync',
          cached: 'Cached', published: 'Published', configured: 'Configured', loaded: 'Loaded',
          pendingRestart: 'Restart required', pending: 'Pending sync', publishing: 'Converging', ready: 'Node ready', failed: 'Sync issue',
          loadedPlaceholder: '0/0 worlds loaded', observedAt: 'Observed {time}', revision: 'Revision {revision}',
          sources: { steam: 'Source: node Steam', peer: 'Source: node transfer', controller: 'Source: controller', cache: 'Source: local cache', legacy_upload: 'Source: compatibility upload', unknown: 'Source: unknown' },
          fetch: {
            title: 'Download paths', observed: 'Observed real transfers; no synthetic speed test',
            routes: { cache: 'Already on machine', steam: 'Steam download', peer: 'From another machine', controller: 'From management server', legacy_upload: 'Compatibility upload', unknown: 'Unknown source' },
            status: { selected: 'Selected', succeeded: 'Available', failed: 'Unavailable', unavailable: 'Unavailable', skipped: 'Unverified', available: 'Available', unknown: 'Unverified' },
            rate: 'Effective {value}', noTransfer: 'Cache hit, no transfer', speedUnavailable: 'Available, speed not reported', notMeasured: 'No transfer observed',
            reasons: {
              CACHE_MISS: 'This installation does not have the exact cached version', SOURCE_NOT_NEEDED: 'An earlier path already satisfied this fetch',
              FETCH_CAPABILITY_MISSING: 'The Runtime version cannot fetch Mods directly', PEER_CAPABILITY_MISSING: 'This node combination does not support peer transfer',
              PEER_SOURCE_UNAVAILABLE: 'No reachable node currently has the exact version', PEER_GRANT_FAILED: 'Peer transfer authorization failed',
              CONTROLLER_SOURCE_UNAVAILABLE: 'The management server does not have the required files', STEAM_FETCH_FAILED: 'The machine could not download this mod from Steam',
              STEAM_VERSION_MISMATCH: 'Steam currently serves a different version than the Room requires', PEER_FETCH_FAILED: 'Node-to-node transfer failed',
              CONTROLLER_FETCH_FAILED: 'Download from the management server failed', LEGACY_UPLOAD_FAILED: 'Compatibility upload failed',
              FETCH_MANIFEST_MISMATCH: 'Downloaded content did not match the expected exact version', MOD_IMPORT_FAILED: 'Download completed but cache import failed',
              MOD_FETCH_FAILED: 'Mod download failed'
            }
          },
          stages: {
            cached: { ready: 'Cached', pending: 'Not cached' },
            published: { ready: 'Published', pending: 'Not published' },
            configured: { ready: 'Configured', pending: 'Not configured' },
            loaded: { ready: 'Loaded', pending: 'Not loaded' }
          }
        },
        consistency: {
          title: 'Client-required mod is not enabled in every world',
          description: 'Players may encounter a mod mismatch while changing worlds. Enable it in every world in this room.'
        },
        aria: {
          toggle: 'Toggle {name}',
          toggleWorld: 'Toggle {mod} in {world}',
          toggleRoomDefault: 'Toggle the room default for {mod}',
          configureRoomDefault: 'Configure room defaults for {mod}',
          separateWorldConfig: 'Toggle separate world configuration for {mod}',
          configureWorld: 'Configure {mod} in {world}',
          openWorldMenu: 'Open mod actions for {world}',
          openMenu: 'Open actions for {name}',
          operationProgress: '{name} progress {value}%',
          expand: 'Expand world settings for {name}',
          collapse: 'Collapse world settings for {name}',
          menuTitle: 'Mod actions'
        },
        empty: {
          noMods: 'No mods installed yet',
          noModsDescription: 'Find and add mods from the Steam Workshop.',
          noRooms: 'No manageable rooms',
          noRoomsDescription: 'Create a room or wait for an Agent to report one before managing mods.'
        },
        details: {
          title: 'Mod Details',
          description: 'Version, compatibility, and file information for the installed mod.',
          modDescription: 'Mod Description',
          noDescription: 'This mod does not have a description.',
          compatibility: 'Compatibility',
          compatibilityValues: {
            dst: 'Don\'t Starve Together',
            ds: 'Don\'t Starve',
            rog: 'Reign of Giants',
            sw: 'Shipwrecked',
            hamlet: 'Hamlet'
          },
          fileInfo: 'File Information',
          modId: 'Mod ID',
          installPath: 'Install Location',
          fileSize: 'File Size',
          installedAt: 'Installed At'
        },
        uninstall: {
          title: 'Remove Mod from Room',
          description: 'This removes the Mod and its settings from this room only. Downloaded files remain available for other rooms.',
          worldTitle: 'Remove Mod from This World',
          worldDescription: 'Only the mod reference and independent configuration in “{world}” are removed. Other worlds are unchanged.',
          confirmationDescription: 'Workshop files remain available. Confirm removal from the selected scope.',
          roomName: 'Current Room',
          placeholder: 'Current room: {name}',
          fallbackPlaceholder: 'Current room'
        },
        roomCopy: {
          action: 'Copy room mods', title: 'Copy mods from another room',
          description: 'Copy mods, enabled state, and per-world settings from the source into “{room}”.',
          loading: 'Loading source worlds and mods', worldMappings: 'World mappings',
          worldMappingsDescription: 'Master, Caves, and identical world names are matched automatically.', noMatch: 'No matching world',
          summary: '{mods} mods and {assignments} world configurations will be processed',
          mergeDescription: 'Extra mods in the target room are kept. Only mods from the source are added or updated. Running worlds apply changes after their next restart.',
          progress: '{completed}/{total} · {item}', confirm: 'Copy mods',
          loadFailed: 'Failed to load source room mods: {error}', success: 'Copied {count} mod world configurations',
          partial: '{completed} succeeded and {failed} failed. First error: {error}'
        },
        copy: {
          title: 'Copy Mod Configuration',
          description: 'Copy mod settings from “{source}” to other worlds that already use this mod.',
          targets: 'Target Worlds',
          targetsDescription: 'Existing custom settings in target worlds are replaced. Their enabled state is preserved.',
          noTargets: 'No other world using this mod is available as a copy target'
        },
        configFile: {
          title: 'Mod Configuration File',
          loading: 'Reading configuration file'
        },
        feedback: {
          selectConfigWorld: 'Select the world to configure first',
          configUpdated: 'Configuration updated for mod {id}.',
          noWorlds: 'This room has no configurable worlds',
          selectConfiguredWorld: 'Select a world that uses this mod first',
          addedToWorld: 'Added and enabled mod {name} in {world}; a running world applies it after its next restart',
          addedToRoom: 'Added and enabled mod {name} for the entire room; running worlds apply it after their next restart',
          enabledInRoom: 'Enabled mod {name} in every world; running worlds apply it after their next restart',
          disabledInRoom: 'Disabled mod {name} in every world; running worlds apply it after their next restart',
          enabledInWorld: 'Enabled mod {name} in {world}; a running world applies it after its next restart',
          disabledInWorld: 'Disabled mod {name} in {world}; a running world applies it after its next restart',
          updated: 'Updated mod {name}',
          confirmRoomName: 'Confirm mod removal',
          uninstalled: 'Removed mod {name} from the room; node files were retained',
          removedFromWorld: 'Removed mod {name} from {world}; other worlds and node files were not changed',
          configurationCopied: 'Copied the {source} configuration to {count} worlds; running worlds apply it after their next restart',
          configurationAlreadySame: 'The selected worlds already match the {source} configuration',
          configurationPartiallyCopied: 'Copied to {count} worlds before a later target failed: {error}',
          selectViewWorld: 'Select the world to view first',
          configFileMissing: 'This world does not have a modoverrides.lua file yet',
          noDownloadContent: 'There is no configuration content to download',
          configFileDownloaded: 'Mod configuration file downloaded'
        }
      },
      library: {
        title: 'Mod Content Catalog',
        subtitle: 'The controller keeps verifiable versions for migration and rollback fallback; runtime nodes fetch matching content directly from Steam by default.',
        filters: {
          title: 'Filter Content Library',
          description: 'Find mods by name, author, Workshop ID, or content-library state.',
          keyword: 'Keyword',
          keywordPlaceholder: 'Search name, author, or Workshop ID',
          status: 'Content State',
          statuses: { all: 'All', downloaded: 'Downloaded', attention: 'Needs attention' },
          sort: 'Sort',
          sorts: { updatedAt: 'Recently Updated', name: 'Name', author: 'Author', version: 'Version', subscriptions: 'Subscribers', rating: 'Rating' }
        },
        loadFailedTitle: 'Failed to Load Mod Content Library',
        table: {
          title: 'Controller Content',
          total: 'Showing {count} mods',
          mod: 'Mod',
          workshop: 'Workshop Data',
          status: 'Status',
          updatedAt: 'Updated',
          actions: 'Actions'
        },
        empty: {
          noMods: 'No Workshop mods in the content library',
          noModsDescription: 'Save an exact Workshop version for cases where a node cannot reach Steam or Steam now serves a different version.',
          noMatches: 'No matching content-library mods',
          noMatchesDescription: 'Adjust the keyword or status filter and try again.'
        },
        feedback: {
          downloading: 'Downloading to the controller content library...',
          updating: 'Updating controller content files...',
          downloaded: 'Downloaded mod {name} to the controller content library',
          updated: 'Updated controller content for mod {name}',
          refreshed: 'Refreshed version and local status for mod {name}'
        }
      },
      runtimeInventory: {
        machine: { title: 'Runtime Machine', select: 'Select a machine', installation: 'Installation', selectInstallation: 'Select an installation', online: 'Online', offline: 'Offline' },
        summary: {
          installation: 'Installation: {installation}', total: '{count} directories', installed: '{count} installed', outdated: '{count} updates',
          invalid: '{count} incomplete', unknown: '{count} unknown', observedAt: 'Read at {time}'
        },
        filters: { search: 'Search name, author, or Workshop ID', installed: 'Installed', outdated: 'Updates', attention: 'Incomplete', all: 'All directories' },
        table: {
          title: 'Actual Machine Content', description: 'Showing {count} mods', mod: 'Mod', version: 'Current / Latest',
          content: 'Content Status', size: 'Disk Usage', rooms: 'Used By', roomsDescription: 'Rooms and worlds that reference this Mod.', moreRooms: '{count} more rooms',
          actions: 'Actions', unused: 'Not referenced by a room', localSteamAt: 'Local Steam content: {time}'
        },
        actions: { update: 'Update', updating: 'Updating', redownload: 'Redownload', redownloading: 'Downloading', updateAll: 'Update All', updatingAll: 'Updating All' },
        progress: {
          aria: 'Machine Mod progress {value}%', detail: '{stage} · {name}', allMods: 'All available updates',
          queued: 'Waiting to start', downloading: 'Downloading and verifying', preparing: 'Preparing machine files',
          publishing: 'Applying machine files', verifying: 'Confirming the result', completed: 'Completed'
        },
        feedback: { updated: 'Updated machine Mod {name}; room configuration and world processes were not changed', updatedAll: 'All outdated Mods on this machine are updated; worlds were not restarted', updateFailed: 'Machine Mod update failed: {error}' },
        versions: { transition: 'v{current} → v{latest}', current: 'v{version}', latest: 'Latest v{version}', unavailable: 'No version declared' },
        states: { current: 'Up to date', outdated: 'Update available', contentUpdated: 'Workshop content updated', unknown: 'Version unknown', invalid: 'Incomplete directory' },
        reasons: {
          unsafe_path: 'Unsafe directory path', unreadable: 'Directory is unreadable', invalid_directory: 'Invalid content directory',
          missing_modinfo: 'modinfo.lua is missing; this may be an empty Steam directory or an interrupted download', invalid_modinfo: 'modinfo.lua is invalid',
          mod_version_unreadable: 'Version file is unreadable', mod_version_unavailable: 'The Mod does not declare a version', mod_version_invalid: 'Invalid version field',
          workshop_manifest_unavailable: 'Steam manifest location is unknown', workshop_manifest_unsafe: 'Unsafe Steam manifest path',
          workshop_manifest_missing: 'Steam installation manifest is missing', workshop_manifest_invalid: 'Steam installation manifest is invalid',
          workshop_manifest_unreadable: 'Steam installation manifest is unreadable', workshop_manifest_item_missing: 'Mod is absent from the Steam manifest',
          unknown: 'Details: {reason}'
        },
        offline: { title: '{machine} is offline', description: 'Reconnect the machine, then refresh to view downloaded mods.' },
        warnings: { title: 'Some supplemental data is unavailable' },
        errors: { targetsTitle: 'Could not load machines', inventoryTitle: 'Could not read machine Mod content' },
        empty: {
          title: 'No Mod files on this machine', description: 'Mods appear after a room adds them or the node finishes prefetching.',
          filtered: 'No matching Mods', filteredDescription: 'Adjust the keyword or status filter and try again.',
          noMachines: 'No readable runtime machines', noMachinesDescription: 'Configure a local Runtime or an Agent installation first.'
        }
      },
      addToRoom: {
        title: 'Download and Add to Room',
        description: 'Choose the room and worlds for “{name}”. The Mod downloads directly to the machines running those worlds.',
        loadFailedTitle: 'Failed to Load Rooms',
        room: 'Room',
        loadingRooms: 'Loading rooms',
        selectRoom: 'Select a room',
        roomDescription: 'Only modoverrides.lua for the selected worlds is changed. The system does not back up, stop, or restart them.',
        noRoomsTitle: 'No Manageable Rooms',
        noRoomsDescription: 'Create a room or wait for an Agent to report one first.',
        worlds: 'Apply to Worlds',
        worldsDescription: 'All worlds are selected by default. You can choose only surface or caves instead.',
        noWorlds: 'This room has no configurable worlds.',
        dependencies: 'Add Dependencies Too',
        dependenciesDescription: 'Dependencies are prepared on the runtime machines for the selected worlds too.',
        targets: 'Apply to Nodes',
        targetsDescription: 'Selected worlds grouped by the machines they run on.',
        unknownTarget: 'Machine not determined',
        planReady: 'The change check is complete. Review it before applying to the room.',
        planBlocked: 'The sync plan has blockers and cannot be submitted.',
        legacyFallback: 'Cross-node sync is unavailable; the existing local add operation was used.',
        progress: {
          aria: 'Mod add progress {value}%', checking: 'Checking Mod files', downloading: 'Downloading and verifying the Mod',
          preparing: 'Preparing runtime machines', applying: 'Applying room configuration', completed: 'Mod content is ready'
        },
        apply: 'Add and Enable',
        applying: 'Adding',
        adding: 'Adding',
        added: 'Added mod {name} to the selected room worlds'
      },
      downloadToMachine: {
        title: 'Download Mod to Machine',
        description: 'Download “{name}” only to the selected runtime machine without changing room configuration.',
        machine: 'Runtime Machine',
        selectMachine: 'Select a runtime machine',
        machineDescription: 'SteamCMD will download and verify files directly on {machine}.',
        noMachine: 'There is no online runtime machine in the current scope.',
        failedTitle: 'Mod Download Failed',
        downloading: 'Downloading and verifying with SteamCMD',
        progress: 'Mod download progress {value}%',
        download: 'Download',
        redownload: 'Redownload',
        downloadUpdate: 'Download Update',
        downloadingAction: 'Downloading',
        downloaded: 'Downloaded Mod {name} to {machine}; room configuration was not changed',
        states: { missing: 'Not Downloaded', current: 'Downloaded', outdated: 'Update Available', unknown: 'Downloaded · Version Unconfirmed', invalid: 'Incomplete Files', unavailable: 'Status Unavailable' }
      },
      search: {
        title: 'Search Mods',
        subtitle: 'Find Workshop Mods and add them directly to a room.',
        form: {
          title: 'Search',
          description: 'Enter a Workshop Mod name or ID.',
          room: 'Room',
          loadingRooms: 'Loading rooms',
          selectRoom: 'Select a room',
          name: 'Mod Name or Workshop ID',
          namePlaceholder: 'Enter a name or ID, or leave blank to browse popular mods',
          sort: 'Sort',
          category: 'Category',
          days: 'Time Range',
          pageSize: 'Page Size'
        },
        sorts: {
          relevance: 'Relevance', trend: 'Trending', mostRecent: 'Newest', lastUpdated: 'Recently Updated',
          mostSubscribed: 'Most Subscribed', topRated: 'Top Rated'
        },
        days: { one: 'Today', seven: 'Last 7 Days', thirty: 'Last 30 Days', ninety: 'Last 90 Days', year: 'Last Year', all: 'All Time' },
        results: '{count} results',
        loadFailedTitle: 'Failed to Load Mod Data',
        empty: {
          noResults: 'No matching mods found',
          noResultsDescription: 'Try another keyword, sort order, category, or time range.',
          notSearched: 'Preparing Workshop browsing data'
        },
        details: {
          title: 'Mod Details',
          description: 'Steam Workshop mod information.',
          modDescription: 'Mod Description'
        },
        feedback: {
          enterKeyword: 'Enter a search keyword',
          installedConfirm: '“{name}” is already downloaded. Update it?',
          updateTitle: 'Update Mod',
          selectRoom: 'Select a room first',
          downloading: 'Downloading the mod. This may take a while...',
          updated: 'Mod updated',
          downloaded: 'Mod content is ready',
          refreshed: 'Version and local status refreshed'
        },
        downloadStatus: {
          queuedTitle: 'Download queued',
          queuedDescription: 'Waiting for SteamCMD to start.',
          runningTitle: 'Downloading mod',
          runningDescription: 'SteamCMD is downloading and verifying the Workshop files.',
          succeededTitle: 'Mod content ready',
          succeededDescription: 'The Mod content is ready to be added to a room.',
          failedTitle: 'Download failed',
          failedDescription: 'The download did not finish. You can try again.'
        },
        runtimeStatus: {
          current: 'Downloaded', outdated: 'Update Available', unknown: 'Downloaded · Version Unconfirmed', invalid: 'Incomplete Files', notDownloaded: 'Not downloaded on the selected machines',
          failedTitle: 'Some Machine Download Statuses Are Unavailable', failedDescription: '{count} online machines could not read their Mod directories. Retry to refresh.'
        }
      },
      config: {
        title: 'Mod Configuration - {name}',
        unnamed: 'Unnamed mod',
        loadingName: 'Loading...',
        description: 'Editing the independent mod configuration for world “{world}”.',
        roomDescription: 'Editing one configuration for {count} worlds in this room.',
        target: 'Configuration location: {target}',
        roomTarget: 'Configuration scope: {count} worlds',
        targetUnknown: 'The machine for this world is not available yet',
        saveBehaviorTitle: 'Saving does not restart the world',
        saveBehaviorDescription: 'Saving does not restart the world. Changes take effect the next time it starts.',
        roomSaveBehaviorDescription: 'These worlds use the same settings. Saving does not restart them; changes take effect the next time they start.',
        loading: 'Loading mod configuration...',
        loadFailedTitle: 'Failed to Load Mod Configuration',
        modDescription: 'Mod Description',
        optionHelp: 'View help for {label}',
        selectOption: 'Select an option',
        emptyTitle: 'This mod has no configuration options',
        emptyDescription: 'You can still enable or disable the mod directly.',
        unavailable: 'Could not load mod information',
        feedback: {
          resetConfirm: 'Remove custom overrides for this world and restore the mod defaults? Unknown options will be preserved.',
          resetTitle: 'Confirm Restore Defaults',
          resetSuccess: 'Mod defaults loaded; save to apply them',
          noChanges: 'There are no configuration changes to save',
          saved: 'Configuration saved; a running world will apply it on its next restart',
          savingTitle: 'Saving configuration',
          savingDescription: 'Writing the configuration file',
          saveCompletedTitle: 'Configuration saved',
          saveFailedTitle: 'Configuration save failed',
          saveFailedDescription: 'The runtime node did not complete the configuration sync. Update the values and try again.',
          unsavedConfirm: 'You have unsaved configuration changes. Close anyway?',
          closeTitle: 'Close Mod Configuration'
        }
      }
    }
  }
}

export function translateModBuiltinValue(translate, kind, value) {
  if (value === undefined || value === null || value === '') return translate('mods.values.unknown')
  const normalized = String(value).trim().toLowerCase()
  const key = MOD_VALUE_KEYS[kind]?.[normalized]
  return key ? translate(`mods.values.${kind}.${key}`) : value
}

export function formatModDate(value, locale = 'zh-CN') {
  const activeLocale = typeof locale === 'string' ? locale : locale?.value
  return formatSystemDateTime(value, {
    locale: activeLocale === 'en-US' ? 'en-US' : 'zh-CN',
    fallback: value ? String(value) : '--',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

export function createModFailure(key, error) {
  const code = String(error?.code || '').trim()
  const localizedAdapterError = error?.name === 'AdapterProtocolError' && MOD_FAILURE_CODE_KEYS[code]
  return {
    key,
    detail: String(error?.detail || error?.details?.reason || (localizedAdapterError ? '' : error?.message) || '').trim(),
    ...(code ? { code } : {}),
    ...(error?.requestId ? { requestId: String(error.requestId) } : {}),
    ...(error?.context?.jobId ? { jobId: String(error.context.jobId) } : {})
  }
}

export function formatModFailure(translate, failure) {
  if (!failure) return ''
  const message = translate(MOD_FAILURE_CODE_KEYS[failure.code] || failure.key)
  const formatted = failure.detail
    ? translate('mods.errors.withDetail', { message, detail: failure.detail })
    : message
  const requestId = String(failure.requestId || '').trim()
  const jobId = String(failure.jobId || '').trim()
  const showRequestId = requestId && !formatted.includes(requestId)
  const showJobId = jobId && !formatted.includes(jobId)
  if (showRequestId && showJobId) {
    return translate('mods.errors.withRequestAndJobId', { message: formatted, requestId, jobId })
  }
  if (showRequestId) return translate('mods.errors.withRequestId', { message: formatted, requestId })
  if (showJobId) return translate('mods.errors.withJobId', { message: formatted, jobId })
  return formatted
}

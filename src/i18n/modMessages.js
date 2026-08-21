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
      management: {
        title: '模组管理',
        subtitle: '在一个页面完成 Workshop 浏览、下载和房间启用配置。',
        tabs: { library: '浏览与下载', room: '房间启用' },
        library: {
          title: '模组库',
          description: '搜索新模组，或查看已下载内容与可用更新。'
        },
        scopes: { workshop: 'Workshop', downloaded: '已下载', updates: '可更新' }
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
        summary: 'Workshop 概览',
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
        removeFromRoom: '从房间移除',
        confirmRemoveFromRoom: '确认移除',
        searchWorkshop: '搜索 Workshop',
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
        uninstall: '卸载模组',
        close: '关闭',
        cancel: '取消',
        confirm: '确定',
        confirmUninstall: '确认卸载',
        downloadConfigFile: '下载配置文件',
        saveConfig: '保存配置',
        resetDefaults: '恢复默认值',
        backToInstalled: '返回已下载模组',
        backToLibrary: '返回模组内容库',
        search: '搜索'
      },
      errors: {
        withDetail: '{message}：{detail}',
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
        uninstall: '卸载模组失败',
        configFile: '获取配置文件失败',
        saveConfig: '保存模组配置失败',
        download: '下载模组失败',
        refresh: '刷新模组状态失败'
      },
      publication: {
        title: '房间模组发布',
        description: '按当前 Placement 将模组文件和每个世界的独立配置发布到对应节点。',
        loadFailedTitle: '发布状态加载失败',
        actions: {
          preview: '预览发布', publish: '确认发布', retryFailed: '重试失败节点',
          cancel: '取消发布', viewStatus: '查看发布状态', activate: '重启并确认加载'
        },
        fields: {
          topologyRevision: '拓扑版本', target: '目标节点', worlds: '世界', mods: '模组',
          requiredBytes: '所需空间', currentVersion: '当前版本', desiredVersion: '目标版本',
          status: '状态', phase: '阶段', progress: '进度', message: '信息'
        },
        values: { ready: '可以发布', blocked: '发布受阻', warning: '发布警告', offline: '节点离线', unavailable: '尚不可用' },
        summary: { warnings: '{count} 条警告', blockers: '{count} 个阻塞项' },
        unavailable: {
          title: '后端尚未提供跨节点模组发布',
          description: '当前仍保留原有本地模组操作；远程或混合 Placement 不会伪装成本地成功。'
        },
        latest: { title: '最近一次发布', empty: '当前房间还没有发布记录。先预览计划，再确认发布。' },
        statusDialog: {
          title: '模组发布状态',
          description: '发布 {id} 在各目标节点和世界上的实际执行结果。'
        },
        activation: {
          field: '生效方式',
          manual: '仅发布，稍后重启',
          restart: '发布后协调重启',
          descriptions: {
            manual: '先原子发布文件和配置，不中断正在运行的游戏；需要稍后重启分片才会完整生效。',
            restart: '发布成功后按洞穴优先停止、地面优先启动，并从新日志中确认每个分片已完成加载。'
          },
          restartTitle: '这会短暂中断当前房间',
          restartDescription: '系统只重启发布计划中的运行中分片；原本停服的分片保持停服。任何分片未确认加载都会保留失败状态和恢复入口。',
          badge: '生效：{status}',
          failedTitle: '模组激活失败',
          requiredTitle: '已发布，仍需重启分片',
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
          preparing: '准备中', prepared: '已准备', publishing: '发布中', committed: '已提交',
          completing: '收尾中', unknown: '未知状态'
        },
        phases: {
          preflight: '预检', stage: '暂存', download: '下载', verify: '校验', backup: '保护备份',
          configure: '写入配置', publish: '发布', reconcile: '状态对齐', rollback: '回滚',
          complete: '完成', unknown: '等待阶段信息'
        },
        outcomes: { full: '全部成功', partial: '部分成功', none: '未生效', unknown: '结果待确认' },
        blockers: {
          nodeOffline: '目标节点离线', placementChanged: '世界 Placement 已变化', topologyChanged: '房间拓扑已变化',
          insufficientDisk: '节点磁盘空间不足', missingMod: '缺少模组文件', checksumMismatch: '模组文件校验失败',
          backupFailure: '保护备份失败', capabilityMissing: '节点缺少发布能力', versionConflict: '模组版本冲突',
          unknown: '发布预检未通过'
        },
        errors: {
          resultMissing: '发布任务已完成，但没有找到对应的发布记录，请刷新发布历史后重试',
          previewBlocked: '发布预检未通过，请查看目标节点的阻断项并处理后重试',
          publicationRequired: '房间模组必须通过 Placement 发布，不能使用旧的本地写入接口',
          planChanged: '模组或目标状态已变化，请重新预览发布计划',
          topologyChanged: '房间拓扑已变化，请刷新页面并重新预览发布计划',
          remoteActionUnavailable: '当前远程节点不支持这项模组读取操作',
          remoteMutationUnavailable: '当前 Placement 不支持直接写入模组，请使用房间发布',
          unknown: '未知错误'
        },
        feedback: {
          previewReady: '发布计划已生成，请核对目标节点和世界',
          previewFailed: '生成发布计划失败：{error}', topologyLoadFailed: '房间拓扑读取失败：{error}', submitted: '模组发布已提交',
          publishFailed: '提交模组发布失败：{error}', retrySubmitted: '失败节点已重新提交',
          retryFailed: '重试失败节点失败：{error}', activationSubmitted: '分片重启和加载确认任务已提交',
          activationFailed: '模组激活失败：{error}'
        }
      },
      installed: {
        title: '房间模组',
        subtitle: '管理房间引用的模组；地面与洞穴的启用状态和参数互相独立。',
        filters: {
          title: '筛选模组',
          description: '先选择房间，再选择具体世界编辑其启用状态和配置。',
          room: '房间',
          selectRoom: '请选择房间',
          world: '世界',
          selectWorld: '配置与文件查看目标',
          status: '状态',
          statuses: { all: '全部', enabled: '已启用', disabled: '已禁用', notConfigured: '当前世界未使用' },
          sort: '排序方式',
          sorts: { name: '名称', author: '作者', updatedAt: '更新时间', subscribers: '订阅数', rating: '评分' },
          keyword: '关键词',
          keywordPlaceholder: '搜索模组'
        },
        loadFailedTitle: '模组列表加载失败',
        loading: '正在加载模组列表',
        worldState: {
          selectWorld: '请选择世界',
          notConfigured: '当前世界未使用'
        },
        aria: {
          toggle: '切换 {name}',
          openMenu: '打开 {name} 操作菜单',
          menuTitle: '模组操作'
        },
        empty: {
          noMods: '还没有安装任何模组',
          noModsDescription: '从创意工坊搜索并添加模组。',
          noRooms: '没有可管理的房间',
          noRoomsDescription: '先创建或接管一个房间，再管理模组。'
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
          confirmationDescription: '输入完整房间名确认从该房间移除。',
          roomName: '完整房间名',
          placeholder: '请输入 {name}',
          fallbackPlaceholder: '请输入完整房间名'
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
          enabled: '已启用模组 {name}',
          disabled: '已禁用模组 {name}',
          updated: '模组 {name} 已更新',
          confirmRoomName: '请输入完整房间名确认移除',
          uninstalled: '模组 {name} 已从房间移除，节点文件仍然保留',
          selectViewWorld: '请先选择要查看的世界',
          configFileMissing: '该世界还没有 modoverrides.lua 文件',
          noDownloadContent: '没有可下载的配置内容',
          configFileDownloaded: '模组配置文件已成功下载'
        }
      },
      library: {
        title: '模组内容库',
        subtitle: 'Workshop 内容由控制器统一下载和管理；添加到房间后，再按世界 Placement 发布到对应节点。',
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
          title: '控制器内容库',
          total: '显示 {count} 个模组',
          mod: '模组',
          workshop: 'Workshop 数据',
          status: '状态',
          updatedAt: '更新时间',
          actions: '操作'
        },
        empty: {
          noMods: '内容库中还没有 Workshop 模组',
          noModsDescription: '从 Workshop 搜索并下载后，文件会由控制器统一管理。',
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
      addToRoom: {
        title: '添加模组到房间',
        description: '为“{name}”选择房间和世界。不同世界可以使用不同配置。',
        loadFailedTitle: '房间信息加载失败',
        room: '房间',
        loadingRooms: '正在加载房间',
        selectRoom: '请选择房间',
        roomDescription: '系统会自动把模组文件和配置应用到所选世界。',
        noRoomsTitle: '没有可管理的房间',
        noRoomsDescription: '请先创建或接管房间。',
        worlds: '应用到世界',
        worldsDescription: '默认选择该房间的全部世界，也可以只选择地面或洞穴。',
        noWorlds: '该房间没有可配置的世界。',
        enabled: '立即启用',
        enabledDescription: '关闭后仍会写入配置，但所选世界暂不加载该模组。',
        dependencies: '同时配置依赖模组',
        dependenciesDescription: '系统会自动下载并应用该模组所需的依赖。',
        targets: '发布目标',
        targetsDescription: '所选世界按当前生效的 Placement 分组。',
        unknownTarget: 'Placement 尚未应用',
        planReady: '发布计划已就绪，请核对后确认发布。',
        planBlocked: '发布计划存在阻塞项，暂时不能提交。',
        legacyFallback: '后端不支持跨节点发布，已使用原有本地添加方式。',
        apply: '添加并应用',
        applying: '正在应用',
        adding: '正在添加',
        added: '模组 {name} 已添加到所选房间世界'
      },
      search: {
        title: '搜索模组',
        subtitle: '从创意工坊检索并下载到控制器内容库，再按房间 Placement 发布。',
        form: {
          title: '搜索条件',
          description: '输入创意工坊模组名称或 Workshop ID；下载不修改任何房间配置。',
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
          downloaded: '已下载到控制器内容库',
          refreshed: '已刷新版本和本地状态'
        },
        downloadStatus: {
          queuedTitle: '下载任务已提交',
          queuedDescription: '正在等待 SteamCMD 开始处理。',
          runningTitle: '正在下载模组',
          runningDescription: 'SteamCMD 正在下载并校验 Workshop 文件。',
          succeededTitle: '节点下载完成',
          succeededDescription: 'Workshop 文件已保存到控制器内容库，尚未发布到任何房间。',
          failedTitle: '下载失败',
          failedDescription: '下载任务没有完成，可以重新尝试。'
        }
      },
      config: {
        title: '模组配置 - {name}',
        unnamed: '未命名模组',
        loadingName: '加载中...',
        description: '正在编辑“{world}”世界的独立模组配置。',
        target: '配置发布目标：{target}',
        targetUnknown: '尚未获取该世界的 Placement',
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
          saved: '配置已保存',
          publicationSubmitted: '配置发布已提交',
          unsavedConfirm: '您有未保存的配置更改，确定要关闭吗？',
          closeTitle: '关闭模组配置'
        }
      }
    }
  },
  'en-US': {
    mods: {
      management: {
        title: 'Mod Management',
        subtitle: 'Browse Workshop, download mods, and configure room usage from one page.',
        tabs: { library: 'Browse & Download', room: 'Room Usage' },
        library: {
          title: 'Mod Library',
          description: 'Discover new mods or review downloaded content and available updates.'
        },
        scopes: { workshop: 'Workshop', downloaded: 'Downloaded', updates: 'Updates' }
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
        removeFromRoom: 'Remove from Room',
        confirmRemoveFromRoom: 'Confirm Removal',
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
        uninstall: 'Uninstall Mod',
        close: 'Close',
        cancel: 'Cancel',
        confirm: 'Confirm',
        confirmUninstall: 'Confirm Uninstall',
        downloadConfigFile: 'Download Configuration File',
        saveConfig: 'Save Configuration',
        resetDefaults: 'Restore Defaults',
        backToInstalled: 'Back to Installed Mods',
        backToLibrary: 'Back to Mod Content Library',
        search: 'Search'
      },
      errors: {
        withDetail: '{message}: {detail}',
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
        uninstall: 'Could not uninstall the mod',
        configFile: 'Could not load the configuration file',
        saveConfig: 'Could not save the mod configuration',
        download: 'Could not download the mod',
        refresh: 'Could not refresh the mod status'
      },
      publication: {
        title: 'Room Mod Publication',
        description: 'Publish mod files and each world\'s independent configuration to the nodes selected by the active Placement.',
        loadFailedTitle: 'Failed to Load Publication Status',
        actions: {
          preview: 'Preview Publication', publish: 'Confirm Publication', retryFailed: 'Retry Failed Nodes',
          cancel: 'Cancel Publication', viewStatus: 'View Publication Status', activate: 'Restart and Confirm Load'
        },
        fields: {
          topologyRevision: 'Topology Revision', target: 'Target Node', worlds: 'Worlds', mods: 'Mods',
          requiredBytes: 'Required Space', currentVersion: 'Current Version', desiredVersion: 'Desired Version',
          status: 'Status', phase: 'Phase', progress: 'Progress', message: 'Message'
        },
        values: { ready: 'Ready to Publish', blocked: 'Publication Blocked', warning: 'Publication Warning', offline: 'Node Offline', unavailable: 'Unavailable' },
        summary: { warnings: '{count} warnings', blockers: '{count} blockers' },
        unavailable: {
          title: 'Cross-node mod publication is not available from this backend',
          description: 'Existing local mod actions remain available. Remote or mixed Placements will not be reported as local successes.'
        },
        latest: { title: 'Latest Publication', empty: 'This room has no publication history. Preview a plan before publishing.' },
        statusDialog: {
          title: 'Mod Publication Status',
          description: 'Actual target-node and world results for publication {id}.'
        },
        activation: {
          field: 'Activation Mode',
          manual: 'Publish Only, Restart Later',
          restart: 'Restart After Publication',
          descriptions: {
            manual: 'Publish files and configuration atomically without interrupting the running game. Restart the shards later to fully activate the changes.',
            restart: 'After publication, stop secondary shards first, start the master first, and confirm every shard from newly written load logs.'
          },
          restartTitle: 'This briefly interrupts the current room',
          restartDescription: 'Only running shards in the publication plan are restarted. Shards that were stopped remain stopped. Any unconfirmed shard retains a failed state and recovery path.',
          badge: 'Activation: {status}',
          failedTitle: 'Mod Activation Failed',
          requiredTitle: 'Published, Shard Restart Still Required',
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
          preparing: 'Preparing', prepared: 'Prepared', publishing: 'Publishing', committed: 'Committed',
          completing: 'Completing', unknown: 'Unknown Status'
        },
        phases: {
          preflight: 'Preflight', stage: 'Stage', download: 'Download', verify: 'Verify', backup: 'Protection Backup',
          configure: 'Configure', publish: 'Publish', reconcile: 'Reconcile', rollback: 'Rollback',
          complete: 'Complete', unknown: 'Awaiting Phase Data'
        },
        outcomes: { full: 'Full Success', partial: 'Partial Success', none: 'No Changes Applied', unknown: 'Outcome Pending' },
        blockers: {
          nodeOffline: 'Target node is offline', placementChanged: 'World Placement has changed', topologyChanged: 'Room topology has changed',
          insufficientDisk: 'Insufficient disk space on the node', missingMod: 'Mod files are missing', checksumMismatch: 'Mod file checksum mismatch',
          backupFailure: 'Protection backup failed', capabilityMissing: 'Node publication capability is missing', versionConflict: 'Mod version conflict',
          unknown: 'Publication preflight did not pass'
        },
        errors: {
          resultMissing: 'The publication job completed, but its publication record could not be found. Refresh the publication history and try again.',
          previewBlocked: 'Publication preflight did not pass. Resolve the target blockers and try again.',
          publicationRequired: 'Room mods must be changed through Placement-aware publication, not the legacy local write API.',
          planChanged: 'The mod content or target state changed. Preview the publication plan again.',
          topologyChanged: 'The room topology changed. Refresh the page and preview the publication plan again.',
          remoteActionUnavailable: 'This remote node does not support the requested mod read operation',
          remoteMutationUnavailable: 'The active Placement cannot be modified directly; use room publication',
          unknown: 'Unknown error'
        },
        feedback: {
          previewReady: 'Publication plan generated. Review the target nodes and worlds.',
          previewFailed: 'Could not generate the publication plan: {error}', topologyLoadFailed: 'Could not load room topology: {error}', submitted: 'Mod publication submitted',
          publishFailed: 'Could not submit the mod publication: {error}', retrySubmitted: 'Failed nodes were resubmitted',
          retryFailed: 'Could not retry failed nodes: {error}', activationSubmitted: 'Shard restart and load confirmation submitted',
          activationFailed: 'Could not activate the published mods: {error}'
        }
      },
      installed: {
        title: 'Room Mods',
        subtitle: 'Manage mods referenced by a room. Surface and caves keep independent state and settings.',
        filters: {
          title: 'Filter Mods',
          description: 'Select a room, then choose the exact world whose state and settings you want to edit.',
          room: 'Room',
          selectRoom: 'Select a room',
          world: 'World',
          selectWorld: 'Configuration and file target',
          status: 'Status',
          statuses: { all: 'All', enabled: 'Enabled', disabled: 'Disabled', notConfigured: 'Not Used in This World' },
          sort: 'Sort By',
          sorts: { name: 'Name', author: 'Author', updatedAt: 'Updated', subscribers: 'Subscribers', rating: 'Rating' },
          keyword: 'Keyword',
          keywordPlaceholder: 'Search mods'
        },
        loadFailedTitle: 'Failed to Load Mods',
        loading: 'Loading mods',
        worldState: {
          selectWorld: 'Select a world',
          notConfigured: 'Not used in this world'
        },
        aria: {
          toggle: 'Toggle {name}',
          openMenu: 'Open actions for {name}',
          menuTitle: 'Mod actions'
        },
        empty: {
          noMods: 'No mods installed yet',
          noModsDescription: 'Find and add mods from the Steam Workshop.',
          noRooms: 'No manageable rooms',
          noRoomsDescription: 'Create or adopt a room before managing mods.'
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
          description: 'This removes the mod reference and settings from this room only. Workshop files remain in the controller content library.',
          confirmationDescription: 'Enter the full room name to confirm removal from this room.',
          roomName: 'Full Room Name',
          placeholder: 'Enter {name}',
          fallbackPlaceholder: 'Enter the full room name'
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
          enabled: 'Enabled mod {name}',
          disabled: 'Disabled mod {name}',
          updated: 'Updated mod {name}',
          confirmRoomName: 'Enter the full room name to confirm removal',
          uninstalled: 'Removed mod {name} from the room; node files were retained',
          selectViewWorld: 'Select the world to view first',
          configFileMissing: 'This world does not have a modoverrides.lua file yet',
          noDownloadContent: 'There is no configuration content to download',
          configFileDownloaded: 'Mod configuration file downloaded'
        }
      },
      library: {
        title: 'Mod Content Library',
        subtitle: 'The controller downloads and manages Workshop content centrally. Room publication then distributes it by each world\'s Placement.',
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
          title: 'Controller Content Library',
          total: 'Showing {count} mods',
          mod: 'Mod',
          workshop: 'Workshop Data',
          status: 'Status',
          updatedAt: 'Updated',
          actions: 'Actions'
        },
        empty: {
          noMods: 'No Workshop mods in the content library',
          noModsDescription: 'The controller manages files here after they are downloaded from the Workshop.',
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
      addToRoom: {
        title: 'Add Mod to Room',
        description: 'Choose the room and worlds for “{name}”. Each world can keep different settings.',
        loadFailedTitle: 'Failed to Load Rooms',
        room: 'Room',
        loadingRooms: 'Loading rooms',
        selectRoom: 'Select a room',
        roomDescription: 'The system automatically applies mod files and configuration to the selected worlds.',
        noRoomsTitle: 'No Manageable Rooms',
        noRoomsDescription: 'Create or adopt a room first.',
        worlds: 'Apply to Worlds',
        worldsDescription: 'All worlds are selected by default. You can choose only surface or caves instead.',
        noWorlds: 'This room has no configurable worlds.',
        enabled: 'Enable Immediately',
        enabledDescription: 'When off, settings are written but selected worlds do not load the mod yet.',
        dependencies: 'Configure Dependencies Too',
        dependenciesDescription: 'The system automatically downloads and applies required dependencies.',
        targets: 'Publication Targets',
        targetsDescription: 'Selected worlds grouped by their currently applied Placement.',
        unknownTarget: 'Placement not applied',
        planReady: 'The publication plan is ready. Review it before confirming publication.',
        planBlocked: 'The publication plan has blockers and cannot be submitted.',
        legacyFallback: 'Cross-node publication is unavailable; the existing local add operation was used.',
        apply: 'Add and Apply',
        applying: 'Applying',
        adding: 'Adding',
        added: 'Added mod {name} to the selected room worlds'
      },
      search: {
        title: 'Search Mods',
        subtitle: 'Find Workshop mods, download them to the controller content library, then publish them by room Placement.',
        form: {
          title: 'Search',
          description: 'Enter a Workshop mod name or ID. Downloading does not change any room configuration.',
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
          downloaded: 'Downloaded to the controller content library',
          refreshed: 'Version and local status refreshed'
        },
        downloadStatus: {
          queuedTitle: 'Download queued',
          queuedDescription: 'Waiting for SteamCMD to start.',
          runningTitle: 'Downloading mod',
          runningDescription: 'SteamCMD is downloading and verifying the Workshop files.',
          succeededTitle: 'Node download complete',
          succeededDescription: 'Workshop files are stored in the controller content library and have not been published to a room.',
          failedTitle: 'Download failed',
          failedDescription: 'The download did not finish. You can try again.'
        }
      },
      config: {
        title: 'Mod Configuration - {name}',
        unnamed: 'Unnamed mod',
        loadingName: 'Loading...',
        description: 'Editing the independent mod configuration for world “{world}”.',
        target: 'Configuration publication target: {target}',
        targetUnknown: 'The world Placement is not available yet',
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
          saved: 'Configuration saved',
          publicationSubmitted: 'Configuration publication submitted',
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
    detail: String(error?.detail || (localizedAdapterError ? '' : error?.message) || '').trim(),
    ...(code ? { code } : {}),
    ...(error?.requestId ? { requestId: String(error.requestId) } : {})
  }
}

export function formatModFailure(translate, failure) {
  if (!failure) return ''
  const message = translate(MOD_FAILURE_CODE_KEYS[failure.code] || failure.key)
  return failure.detail
    ? translate('mods.errors.withDetail', { message, detail: failure.detail })
    : message
}

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

export const modMessages = {
  'zh-CN': {
    mods: {
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
      actions: {
        refresh: '刷新',
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
        resetDefaults: '重置为默认配置',
        backToInstalled: '返回已下载模组',
        backToLibrary: '返回节点模组库',
        search: '搜索'
      },
      errors: {
        withDetail: '{message}：{detail}',
        context: '加载模组上下文失败',
        library: '获取节点模组库失败',
        addToRoom: '添加模组到房间失败',
        roomSwitch: '切换房间失败',
        list: '获取模组列表失败',
        installedList: '获取已安装模组失败',
        search: '搜索模组失败',
        config: '获取模组配置失败',
        customConfig: '获取用户自定义配置失败',
        toggleEnable: '启用模组失败',
        toggleDisable: '禁用模组失败',
        update: '更新模组失败',
        uninstall: '卸载模组失败',
        configFile: '获取配置文件失败',
        saveConfig: '保存模组配置失败',
        download: '下载模组失败'
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
          statuses: { all: '全部', enabled: '已启用', disabled: '已禁用' },
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
        title: '节点模组库',
        subtitle: '管理当前运行节点下载的 Workshop 文件；节点库不隶属于任何房间。',
        filters: {
          title: '筛选节点模组',
          description: '按名称、作者、Workshop ID 或本地状态查找模组。',
          keyword: '关键词',
          keywordPlaceholder: '搜索名称、作者或 Workshop ID',
          status: '本地状态',
          statuses: { all: '全部', downloaded: '已下载', attention: '需要处理' }
        },
        loadFailedTitle: '节点模组库加载失败',
        table: {
          title: '当前节点',
          total: '显示 {count} 个模组',
          mod: '模组',
          status: '状态',
          updatedAt: '更新时间',
          actions: '操作'
        },
        empty: {
          noMods: '节点上还没有 Workshop 模组',
          noModsDescription: '从 Workshop 搜索并下载后，模组会出现在这里。',
          noMatches: '没有匹配的节点模组',
          noMatchesDescription: '调整关键词或状态筛选后重试。'
        },
        feedback: {
          downloading: '正在下载到当前节点...',
          updating: '正在更新节点文件...',
          downloaded: '模组 {name} 已下载到当前节点',
          updated: '模组 {name} 的节点文件已更新'
        }
      },
      addToRoom: {
        title: '添加模组到房间',
        description: '为“{name}”选择房间和世界。不同世界可以使用不同配置。',
        loadFailedTitle: '房间信息加载失败',
        room: '房间',
        loadingRooms: '正在加载房间',
        selectRoom: '请选择房间',
        roomDescription: '下载文件属于当前节点；这里只决定哪个房间引用该模组。',
        noRoomsTitle: '没有可管理的房间',
        noRoomsDescription: '请先创建或接管房间。',
        worlds: '应用到世界',
        worldsDescription: '默认选择该房间的全部世界，也可以只选择地面或洞穴。',
        noWorlds: '该房间没有可配置的世界。',
        enabled: '立即启用',
        enabledDescription: '关闭后仍会写入配置，但所选世界暂不加载该模组。',
        dependencies: '同时配置依赖模组',
        dependenciesDescription: '依赖文件必须已经下载到当前节点。',
        adding: '正在添加',
        added: '模组 {name} 已添加到所选房间世界'
      },
      search: {
        title: '搜索模组',
        subtitle: '从创意工坊检索并下载到当前运行节点。',
        form: {
          title: '搜索条件',
          description: '输入创意工坊模组名称或 Workshop ID；下载不修改任何房间配置。',
          room: '房间',
          loadingRooms: '正在加载房间',
          selectRoom: '请选择房间',
          name: '模组名称或 Workshop ID',
          namePlaceholder: '输入模组名称或 Workshop ID'
        },
        loadFailedTitle: '模组数据加载失败',
        empty: {
          noResults: '没有找到匹配的模组',
          noResultsDescription: '尝试使用其他关键词。',
          notSearched: '尚未搜索模组'
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
          downloaded: '已下载到当前节点'
        },
        downloadStatus: {
          queuedTitle: '下载任务已提交',
          queuedDescription: '正在等待 SteamCMD 开始处理。',
          runningTitle: '正在下载模组',
          runningDescription: 'SteamCMD 正在下载并校验 Workshop 文件。',
          succeededTitle: '节点下载完成',
          succeededDescription: 'Workshop 文件已保存到当前节点，尚未修改任何房间配置。',
          failedTitle: '下载失败',
          failedDescription: '下载任务没有完成，可以重新尝试。'
        }
      },
      config: {
        title: '模组配置 - {name}',
        unnamed: '未命名模组',
        loadingName: '加载中...',
        description: '修改当前世界的模组配置选项。',
        loading: '加载模组配置中...',
        loadFailedTitle: '模组配置加载失败',
        modDescription: '模组描述',
        optionHelp: '查看 {label} 说明',
        selectOption: '请选择',
        emptyTitle: '该模组没有配置选项',
        emptyDescription: '仍可直接启用或停用该模组。',
        unavailable: '无法加载模组信息',
        feedback: {
          resetConfirm: '确定要重置所有配置为默认值吗？',
          resetTitle: '确认重置',
          resetSuccess: '配置已重置为默认值',
          noChanges: '没有需要保存的配置变更',
          saved: '配置已保存',
          unsavedConfirm: '您有未保存的配置更改，确定要关闭吗？',
          closeTitle: '关闭模组配置'
        }
      }
    }
  },
  'en-US': {
    mods: {
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
      actions: {
        refresh: 'Refresh',
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
        resetDefaults: 'Reset to Defaults',
        backToInstalled: 'Back to Installed Mods',
        backToLibrary: 'Back to Node Library',
        search: 'Search'
      },
      errors: {
        withDetail: '{message}: {detail}',
        context: 'Could not load the mod context',
        library: 'Could not load the node mod library',
        addToRoom: 'Could not add the mod to the room',
        roomSwitch: 'Could not switch rooms',
        list: 'Could not load the mod list',
        installedList: 'Could not load installed mods',
        search: 'Could not search for mods',
        config: 'Could not load the mod configuration',
        customConfig: 'Could not load the custom mod configuration',
        toggleEnable: 'Could not enable the mod',
        toggleDisable: 'Could not disable the mod',
        update: 'Could not update the mod',
        uninstall: 'Could not uninstall the mod',
        configFile: 'Could not load the configuration file',
        saveConfig: 'Could not save the mod configuration',
        download: 'Could not download the mod'
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
          statuses: { all: 'All', enabled: 'Enabled', disabled: 'Disabled' },
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
          description: 'This removes the mod reference and settings from this room only. Workshop files remain in the node library.',
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
        title: 'Node Mod Library',
        subtitle: 'Manage Workshop files downloaded on the active runtime node. The library does not belong to any room.',
        filters: {
          title: 'Filter Node Mods',
          description: 'Find mods by name, author, Workshop ID, or local state.',
          keyword: 'Keyword',
          keywordPlaceholder: 'Search name, author, or Workshop ID',
          status: 'Local State',
          statuses: { all: 'All', downloaded: 'Downloaded', attention: 'Needs attention' }
        },
        loadFailedTitle: 'Failed to Load Node Mod Library',
        table: {
          title: 'Active Node',
          total: 'Showing {count} mods',
          mod: 'Mod',
          status: 'Status',
          updatedAt: 'Updated',
          actions: 'Actions'
        },
        empty: {
          noMods: 'No Workshop mods on this node',
          noModsDescription: 'Mods appear here after they are downloaded from the Workshop.',
          noMatches: 'No matching node mods',
          noMatchesDescription: 'Adjust the keyword or status filter and try again.'
        },
        feedback: {
          downloading: 'Downloading to the active node...',
          updating: 'Updating node files...',
          downloaded: 'Downloaded mod {name} to the active node',
          updated: 'Updated node files for mod {name}'
        }
      },
      addToRoom: {
        title: 'Add Mod to Room',
        description: 'Choose the room and worlds for “{name}”. Each world can keep different settings.',
        loadFailedTitle: 'Failed to Load Rooms',
        room: 'Room',
        loadingRooms: 'Loading rooms',
        selectRoom: 'Select a room',
        roomDescription: 'Downloaded files belong to the active node. This only controls which room references the mod.',
        noRoomsTitle: 'No Manageable Rooms',
        noRoomsDescription: 'Create or adopt a room first.',
        worlds: 'Apply to Worlds',
        worldsDescription: 'All worlds are selected by default. You can choose only surface or caves instead.',
        noWorlds: 'This room has no configurable worlds.',
        enabled: 'Enable Immediately',
        enabledDescription: 'When off, settings are written but selected worlds do not load the mod yet.',
        dependencies: 'Configure Dependencies Too',
        dependenciesDescription: 'Dependency files must already be downloaded on the active node.',
        adding: 'Adding',
        added: 'Added mod {name} to the selected room worlds'
      },
      search: {
        title: 'Search Mods',
        subtitle: 'Find Workshop mods and download them to the active runtime node.',
        form: {
          title: 'Search',
          description: 'Enter a Workshop mod name or ID. Downloading does not change any room configuration.',
          room: 'Room',
          loadingRooms: 'Loading rooms',
          selectRoom: 'Select a room',
          name: 'Mod Name or Workshop ID',
          namePlaceholder: 'Enter a mod name or Workshop ID'
        },
        loadFailedTitle: 'Failed to Load Mod Data',
        empty: {
          noResults: 'No matching mods found',
          noResultsDescription: 'Try a different keyword.',
          notSearched: 'No mod search yet'
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
          downloaded: 'Downloaded to the active node'
        },
        downloadStatus: {
          queuedTitle: 'Download queued',
          queuedDescription: 'Waiting for SteamCMD to start.',
          runningTitle: 'Downloading mod',
          runningDescription: 'SteamCMD is downloading and verifying the Workshop files.',
          succeededTitle: 'Node download complete',
          succeededDescription: 'Workshop files are stored on the active node. No room configuration was changed.',
          failedTitle: 'Download failed',
          failedDescription: 'The download did not finish. You can try again.'
        }
      },
      config: {
        title: 'Mod Configuration - {name}',
        unnamed: 'Unnamed mod',
        loadingName: 'Loading...',
        description: 'Change this mod\'s configuration for the current world.',
        loading: 'Loading mod configuration...',
        loadFailedTitle: 'Failed to Load Mod Configuration',
        modDescription: 'Mod Description',
        optionHelp: 'View help for {label}',
        selectOption: 'Select an option',
        emptyTitle: 'This mod has no configuration options',
        emptyDescription: 'You can still enable or disable the mod directly.',
        unavailable: 'Could not load mod information',
        feedback: {
          resetConfirm: 'Reset all options to their default values?',
          resetTitle: 'Confirm Reset',
          resetSuccess: 'Configuration reset to defaults',
          noChanges: 'There are no configuration changes to save',
          saved: 'Configuration saved',
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
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const activeLocale = typeof locale === 'string' ? locale : locale?.value
  return new Intl.DateTimeFormat(activeLocale === 'en-US' ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date)
}

export function createModFailure(key, error) {
  return {
    key,
    detail: String(error?.detail || error?.message || '').trim()
  }
}

export function formatModFailure(translate, failure) {
  if (!failure) return ''
  const message = translate(failure.key)
  return failure.detail
    ? translate('mods.errors.withDetail', { message, detail: failure.detail })
    : message
}

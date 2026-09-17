const PLAYER_STATUS_KEYS = Object.freeze({
  online: 'online',
  stale: 'stale',
  offline: 'offline',
  '在线': 'online',
  '最后已知在线': 'stale',
  '离线': 'offline'
})

const PLAYER_GAMEPLAY_STATE_KEYS = Object.freeze({
  selecting_character: 'selectingCharacter',
  loading: 'loading',
  alive: 'alive',
  dead: 'dead',
  ghost: 'ghost',
  migrating: 'migrating',
  unknown: 'unknown'
})

const PLAYER_CHARACTER_ALIASES = Object.freeze({
  maxwell: 'waxwell',
  wigfrid: 'wathgrithr',
  '威尔逊': 'wilson',
  '薇洛': 'willow',
  '沃尔夫冈': 'wolfgang',
  '温蒂': 'wendy',
  '薇克巴顿': 'wickerbottom',
  '伍迪': 'woodie',
  '韦斯': 'wes',
  '麦斯威尔': 'waxwell',
  '薇格弗德': 'wathgrithr',
  '韦伯': 'webber',
  '薇诺娜': 'winona',
  '沃利': 'warly',
  '沃尔特': 'walter',
  '沃拓克斯': 'wortox',
  '沃姆伍德': 'wormwood',
  '沃特': 'wurt',
  '旺达': 'wanda',
  '芜猴': 'wonkey'
})

const PLAYER_BAN_DURATION_ALIASES = Object.freeze({
  '1h': '1h',
  '6h': '6h',
  '12h': '12h',
  '1d': '1d',
  '3d': '3d',
  '7d': '7d',
  '30d': '30d',
  permanent: 'permanent',
  '1小时': '1h',
  '6小时': '6h',
  '12小时': '12h',
  '1天': '1d',
  '3天': '3d',
  '7天': '7d',
  '30天': '30d',
  '永久': 'permanent'
})

const PLAYER_WORLD_STATE_KEYS = Object.freeze({
  running: 'running',
  stopped: 'stopped',
  starting: 'starting',
  stopping: 'stopping',
  failed: 'failed',
  '运行中': 'running',
  '已停止': 'stopped',
  '启动中': 'starting',
  '停止中': 'stopping',
  '失败': 'failed'
})

const PLAYER_ERROR_CODES = new Set([
  'INVALID_PLAYER_ACTION',
  'INVALID_PLAYER_INPUT',
  'PLAYER_NOT_FOUND',
  'CONFIRMATION_REQUIRED',
  'AGENT_UPGRADE_REQUIRED',
  'AGENT_UNAVAILABLE',
  'ROOM_NOT_MANAGED',
  'ROOM_UNAVAILABLE',
  'WORLD_NOT_RUNNING',
  'PLAYER_TARGET_UNAVAILABLE',
  'RUNTIME_NOT_INSTALLED',
  'RUNTIME_UNAVAILABLE',
  'PLAYER_SNAPSHOT_UNAVAILABLE',
  'PLAYER_COMMAND_NOT_DISPATCHED',
  'INVALID_RESOURCE_ID',
  'RESOURCE_NOT_FOUND',
  'PLAYER_OPERATION_FAILED',
  'PLAYER_PROBE_TIMEOUT',
  'JOB_CREATE_FAILED',
  'INVALID_JSON'
])

export const PLAYER_CHARACTER_IDS = Object.freeze([
  'wilson',
  'willow',
  'wolfgang',
  'wendy',
  'wx78',
  'wickerbottom',
  'woodie',
  'wes',
  'waxwell',
  'wathgrithr',
  'webber',
  'winona',
  'warly',
  'walter',
  'wortox',
  'wormwood',
  'wurt',
  'wanda',
  'wonkey'
])

export const PLAYER_BAN_DURATION_IDS = Object.freeze([
  '1h',
  '6h',
  '12h',
  '1d',
  '3d',
  '7d',
  '30d',
  'permanent'
])

function localeCode(locale) {
  return locale === 'en-US' ? 'en-US' : 'zh-CN'
}

export function normalizePlayerStatus(status) {
  return PLAYER_STATUS_KEYS[status] || status
}

export function isPlayerOnline(status) {
  return normalizePlayerStatus(status) === 'online'
}

export function isLivePlayerMetric(player, field, value) {
  if (!isPlayerOnline(player?.status)) return false
  if (value === null || value === undefined || value === '') return false
  if (!Number.isFinite(Number(value))) return false
  const fieldState = player?.field_states?.[field]
  return !fieldState?.status || fieldState.status === 'live'
}

export function isKnownPlayerMetric(player, field, value) {
  if (value === null || value === undefined || value === '') return false
  if (!Number.isFinite(Number(value))) return false
  const fieldState = player?.field_states?.[field]
  return !fieldState?.status || fieldState.status !== 'unavailable'
}

export function formatPlayerPercentage(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '--'
  return `${Math.round(Math.max(0, Math.min(100, numeric)))}%`
}

export function formatPlayerVital(current, maximum, percentage, locale) {
  const hasCurrent = current !== null && current !== undefined && current !== ''
  const hasMaximum = maximum !== null && maximum !== undefined && maximum !== ''
  const currentValue = Number(current)
  const maximumValue = Number(maximum)
  if (hasCurrent && hasMaximum && Number.isFinite(currentValue) && currentValue >= 0 && Number.isFinite(maximumValue) && maximumValue > 0) {
    const formatter = new Intl.NumberFormat(localeCode(locale), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    })
    return `${formatter.format(currentValue)} / ${formatter.format(maximumValue)}`
  }
  return formatPlayerPercentage(percentage)
}

export function formatPlayerTemperature(value, locale) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '--'
  const formatted = new Intl.NumberFormat(localeCode(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(numeric)
  return `${formatted} °C`
}

export function playerStatusMeta(status, translate) {
  const key = PLAYER_STATUS_KEYS[status]
  return {
    label: key ? translate(`players.statuses.${key}`) : status || translate('players.values.unknownStatus'),
    variant: key === 'online' ? 'success' : (key === 'stale' ? 'warning' : 'outline')
  }
}

export function normalizePlayerGameplayState(state) {
  const normalized = String(state || '').trim().toLowerCase()
  return PLAYER_GAMEPLAY_STATE_KEYS[normalized] ? normalized : (normalized || 'unknown')
}

export function playerGameplayStateLabel(state, translate) {
  const normalized = normalizePlayerGameplayState(state)
  const key = PLAYER_GAMEPLAY_STATE_KEYS[normalized]
  return key ? translate(`players.gameplayStates.${key}`) : translate('players.gameplayStates.unknown')
}

export function playerPresenceMeta(player, translate) {
  if (player?.history_only) return { label: translate('players.statuses.history'), variant: 'outline' }
  const presence = normalizePlayerStatus(player?.status)
  if (presence === 'offline') {
    return { label: translate('players.statuses.offline'), variant: 'outline' }
  }
  const gameplay = normalizePlayerGameplayState(player?.gameplay_state)
  const gameplayLabel = playerGameplayStateLabel(gameplay, translate)
  if (presence === 'stale') {
    return {
      label: player?.gameplay_state
        ? translate('players.statuses.staleGameplay', { state: gameplayLabel })
        : translate('players.statuses.stale'),
      variant: 'warning'
    }
  }
  if (presence !== 'online') return playerStatusMeta(player?.status, translate)
  if (!player?.gameplay_state) return { label: translate('players.statuses.online'), variant: 'success' }
  return {
    label: translate('players.statuses.onlineGameplay', { state: gameplayLabel }),
    variant: ['dead', 'ghost'].includes(gameplay) ? 'destructive' : (['loading', 'selecting_character', 'migrating'].includes(gameplay) ? 'warning' : 'success')
  }
}

export function playerCharacterLabel(prefab, translate) {
  if (!prefab) return translate('players.values.unknownCharacter')
  const normalized = normalizePlayerCharacterPrefab(prefab)
  return PLAYER_CHARACTER_IDS.includes(normalized)
    ? translate(`players.characters.${normalized}`)
    : prefab
}

export function playerAvatarState(player) {
  if (!isPlayerOnline(player?.status) || player?.history_only) return 'static'
  const freshness = player?.field_states?.gameplayState?.status
  if (freshness && freshness !== 'live') return 'static'
  const gameplay = normalizePlayerGameplayState(player?.gameplay_state)
  if (['selecting_character', 'loading'].includes(gameplay)) return gameplay
  return player?.prefab ? 'active' : 'static'
}

export function playerCharacterDisplayLabel(player, translate) {
  const state = playerAvatarState(player)
  return ['selecting_character', 'loading'].includes(state)
    ? playerGameplayStateLabel(state, translate)
    : playerCharacterLabel(player?.prefab, translate)
}

export function normalizePlayerCharacterPrefab(prefab) {
  const original = String(prefab || '').trim()
  if (!original) return ''
  const lowered = original.toLowerCase()
  const normalized = PLAYER_CHARACTER_ALIASES[original] || PLAYER_CHARACTER_ALIASES[lowered] || lowered
  if (PLAYER_CHARACTER_IDS.includes(normalized)) return normalized
  return PLAYER_CHARACTER_IDS.find(character => normalized.startsWith(`${character}_`)) || ''
}

export function playerBanDurationLabel(duration, translate) {
  if (!duration) return translate('players.values.unknownDuration')
  const normalized = PLAYER_BAN_DURATION_ALIASES[duration]
  return normalized ? translate(`players.banDurations.${normalized}`) : duration
}

export function playerWorldStateLabel(status, translate) {
  const key = PLAYER_WORLD_STATE_KEYS[status]
  return key ? translate(`players.worldStates.${key}`) : status || translate('players.values.unknownStatus')
}

export function playerNetworkLabel(score, translate) {
  const keys = { 0: 'excellent', 1: 'fair', 2: 'poor' }
  const key = keys[score]
  if (key) return translate(`players.network.${key}`)
  return score === null || score === undefined || score === ''
    ? translate('players.values.unknown')
    : String(score)
}

export function playerPerformanceLabel(performance, translate) {
  const keys = { 0: 'good', 1: 'fair', 2: 'poor' }
  const key = keys[performance]
  if (key) return translate(`players.performance.${key}`)
  return performance === null || performance === undefined || performance === ''
    ? translate('players.values.unknown')
    : String(performance)
}

export function formatPlayerDate(value, locale) {
  if (!value || !Number.isFinite(new Date(value).getTime()) || new Date(value).getUTCFullYear() < 2000) return '-'
  return formatSystemDateTime(value, {
    locale: localeCode(locale),
    fallback: '-',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

export function formatBanExpiry(value, locale, translate, now = Date.now()) {
  if (!value) return translate('players.banList.expiry.permanent')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return translate('players.banList.expiry.unknown')
  if (date.getTime() <= now) return translate('players.banList.expiry.expired')
  return formatPlayerDate(value, locale)
}

export function playerErrorDetail(value, translate) {
  if (!value) return translate('players.values.unknownError')
  const data = value?.response?.data
  const code = data?.code || value?.code
  if (PLAYER_ERROR_CODES.has(code)) return translate(`players.errors.codes.${code}`)
  return data?.message || data?.msg || value?.message || String(value)
}

export const playerMessages = {
  'zh-CN': {
    players: {
      values: {
        unknown: '未知',
        unknownError: '未知错误',
        unknownStatus: '未知状态',
        unknownCharacter: '未知角色',
        unknownDuration: '未知时长',
        unknownPlayer: '未知玩家',
        unknownWorld: '未知世界',
        noReason: '未记录原因',
        enabled: '开启',
        disabled: '关闭'
      },
      actions: {
        refresh: '刷新',
        refreshSettings: '自动刷新设置',
        saveRefreshSettings: '保存设置',
        retry: '重试',
        search: '搜索',
        query: '查询',
        reset: '重置',
        cancel: '取消',
        confirm: '确认',
        confirmAction: '确认执行',
        details: '详情',
        export: '导出数据',
        manualUpdate: '手动更新',
        defaultTaskWorld: '默认任务世界',
        addSchedule: '添加定时任务',
        startUpdate: '开始更新',
        confirmAdd: '确认添加',
        confirmBan: '确认封禁',
        confirmReselect: '确认重选',
        unban: '解除封禁',
        openPlayerMenu: '打开玩家操作菜单',
        playerActions: '玩家操作',
        openDiagnostics: '房间诊断',
        openWorkbench: '打开游戏工作台',
        viewOnSteam: '在 Steam 中查看',
        viewPlayerOnSteam: '在 Steam 中查看玩家'
      },
      fields: {
        archive: '存档名称',
        status: '玩家状态',
        character: '角色',
        keyword: '关键词',
        playerId: '玩家 ID',
        playerName: '玩家名称',
        days: '游玩天数',
        network: '网络质量',
        performance: '性能',
        performanceMetric: '性能指标',
        firstSeen: '最早记录',
        lastSeen: '最后记录',
        lastConnected: '最近连接',
        lastDisconnected: '最近断开',
        statusChanged: '状态变更',
        createdAt: '创建时间',
        updatedAt: '更新时间',
        lastRefreshed: '最近采样时间',
        presenceObservedAt: '最后确认在线',
        world: '世界名称',
        roomAndWorld: '房间 / 世界',
        action: '操作',
        banReason: '封禁原因',
        banDuration: '封禁时长',
        bannedAt: '封禁时间',
        expiresAt: '到期时间',
        fullRoomName: '完整房间名',
        gameWorld: '游戏世界',
        taskName: '任务名称',
        schedule: '执行计划',
        taskDescription: '任务描述',
        refreshRoom: '房间',
        autoRefresh: '自动刷新',
        refreshInterval: '刷新间隔'
      },
      refreshIntervals: { seconds30: '30 秒', seconds60: '1 分钟', seconds120: '2 分钟', seconds300: '5 分钟', seconds600: '10 分钟' },
      statuses: { history: '历史记录', online: '在线', stale: '最后已知在线', offline: '离线', onlineGameplay: '在线 · {state}', staleGameplay: '状态已过期 · 上次{state}' },
      gameplayStates: { selectingCharacter: '选择角色', loading: '进入世界中', alive: '游戏中', dead: '死亡中', ghost: '幽灵状态', migrating: '切换世界中', unknown: '状态未知' },
      worldStates: { running: '运行中', stopped: '已停止', starting: '启动中', stopping: '停止中', failed: '失败' },
      network: { excellent: '极佳', fair: '中等', poor: '很差' },
      performance: { good: '性能良好', fair: '性能一般', poor: '性能差' },
      characters: {
        wilson: '威尔逊', willow: '薇洛', wolfgang: '沃尔夫冈', wendy: '温蒂', wx78: 'WX-78',
        wickerbottom: '薇克巴顿', woodie: '伍迪', wes: '韦斯', waxwell: '麦斯威尔', wathgrithr: '薇格弗德',
        webber: '韦伯', winona: '薇诺娜', warly: '沃利', walter: '沃尔特', wortox: '沃拓克斯',
        wormwood: '沃姆伍德', wurt: '沃特', wanda: '旺达', wonkey: '芜猴'
      },
      banDurations: {
        '1h': '1 小时', '6h': '6 小时', '12h': '12 小时', '1d': '1 天',
        '3d': '3 天', '7d': '7 天', '30d': '30 天', permanent: '永久'
      },
      sorting: {
        playDays: '游玩 {count} 天',
        daysHint: '游戏内天数，以最近采集数据为准；同组内未知天数排在最后。'
      },
      list: {
        title: '玩家列表',
        subtitle: '查询玩家记录、在线状态并执行世界内操作。',
        taskWorld: '定时任务默认世界：{world}',
        filterTitle: '筛选玩家',
        filterDescription: '按存档、在线状态、角色或关键词缩小范围。',
        allArchives: '全部存档',
        allStatuses: '全部状态',
        allCharacters: '全部角色',
        searchPlaceholder: '搜索玩家名称或 ID',
        total: '共 {count} 名玩家',
        loadFailedTitle: '玩家列表加载失败',
        currentRefreshFailedTitle: '当前玩家状态采集失败',
        currentRefreshFailedDescription: '下面显示的是已有玩家记录，不代表当前在线状态：{error}',
        partialTitle: '部分房间加载失败',
        partialDescription: '已显示可用数据；{count} 个房间暂时不可用：{rooms}',
        loading: '正在加载玩家列表',
        emptyTitle: '暂无玩家数据',
        emptyDescription: '选择存档或手动更新玩家列表。',
        perPage: '每页',
        perPageAria: '每页显示数量',
        administrator: '管理员',
        friend: '好友',
        sampledAt: '采样于 {time}',
        staleObservedAt: '最后确认于 {time}',
        presenceConflict: '分片冲突',
        presenceConflictDescription: '同一轮采样在以下世界同时发现该玩家：{worlds}'
      },
      detail: {
        title: '玩家详情',
        description: '身份、连接状态和服务器操作。',
        gameActions: '游戏操作',
        dangerousActions: '危险操作',
        managementActions: '玩家管理',
        staleTitle: '在线状态已过期',
        staleDescription: '该玩家最后于 {time} 确认在线，最新采集失败。刷新成功前，实时游戏操作已禁用。',
        presenceConflictTitle: '玩家位置存在冲突',
        presenceConflictDescription: '以下分片同时报告该 KU ID 在线：{worlds}。操作前请刷新玩家数据并检查分片连接。'
      },
      quick: {
        trigger: '操作', common: '常用操作', character: '角色调整', management: '管理操作',
        managementHint: '执行前需确认',
        recovery: '状态恢复',
        previewNotice: '离线预览 · 仅查看界面，不执行游戏指令', previewPlayer: '示例玩家（仅供预览）',
        recover: '恢复三维', clean: '清除异常', give: '给予物品', teleport: '传送 / 召回',
        speed: '调整移速', penalty: '清除上限惩罚', more: '游戏工作台', unban: '解除封禁', itemLibrary: '更多物品',
        back: '返回玩家操作', close: '关闭玩家操作', chooseItem: '选择物品', quantity: '数量',
        quantityHint: '按个数给予，范围 1–40。', moreItems: '更多物品，打开游戏工作台',
        giveSubmit: '给予 {count} 个{item}', speedSubmit: '应用移速',
        teleportSubmit: '确认传送', recallSubmit: '确认召回', speedValue: '移速倍率', normalSpeed: '正常 · 1×',
        speedHint: '设置新的移速倍率；1 倍为正常速度。', direction: '操作方式', destination: '目标玩家',
        forward: '将 {player} 传送到对方身边', recall: '将对方召回 {player} 身边',
        loadingTargets: '正在读取在线玩家…', noTargets: '当前世界没有其他可传送的在线玩家。',
        teleportHint: '只支持同一世界内的在线玩家。', retry: '重新读取',
        liveUnavailable: '玩家离线、在线状态未确认或位置冲突时，实时游戏操作不可用。',
        succeeded: '已完成「{action}」操作：{player}', failed: '玩家操作失败：{error}',
        partialFailure: '已完成 {completed}/{total} 项操作，其余未完成：{error}',
        refreshFailed: '操作已完成，但玩家数据刷新失败：{error}',
        items: { log: '木头', twigs: '树枝', cutgrass: '草', flint: '燧石', meatballs: '肉丸', reviver: '告密的心' }
      },
      operations: {
        godMode: '无敌模式', creativeMode: '制作模式', resurrect: '复活玩家', changeCharacter: '重选人物',
        kick: '踢出玩家', kickShort: '踢出', ban: '封禁玩家', banShort: '封禁', kill: '杀死玩家', killShort: '杀死'
      },
      dialogs: {
        ban: {
          title: '封禁玩家', reasonPlaceholder: '请输入封禁原因', roomPlaceholder: '当前房间',
          roomPlaceholderNamed: '当前房间：{room}', description: '封禁会修改房间黑名单。'
        },
        godMode: { title: '设置无敌模式', player: '玩家 {player}' },
        creativeMode: { title: '设置制作模式', player: '玩家 {player}' },
        session: {
          title: '默认任务世界', description: '用于预填定时刷新任务；实时玩家操作始终发送到玩家当前所在世界。',
          placeholder: '选择世界', empty: '没有可用的世界'
        },
        refreshSettings: {
          title: '自动刷新设置', description: '设置当前房间的玩家状态采集频率。', loading: '正在读取设置',
          loadFailed: '读取自动刷新设置失败', roomPlaceholder: '选择房间', enabledDescription: '仅采集运行中的世界；确认暂停时跳过，恢复运行后继续。'
        },
        update: {
          title: '手动更新玩家列表', description: '从服务器读取最新的真实玩家信息。',
          archivePlaceholder: '选择存档', allWorlds: '所有世界', allWorldsDescription: '留空表示所有世界。'
        },
        character: {
          title: '重选人物', description: '玩家 {player} 当前角色为 {character}。', warningTitle: '玩家数据会被重置',
          warningDescription: '完成后玩家可以重新选择角色。'
        },
        schedule: {
          title: '添加定时更新任务', description: '定期从选中世界同步玩家列表。', worldPlaceholder: '选择游戏世界',
          specPlaceholder: '例如：0 */3 * * * *', specDescription: '支持五段 Cron，或以 0 秒开头的六段 Cron。'
        }
      },
      validation: {
        banReasonRequired: '请输入封禁原因', banRoomMismatch: '请确认封禁操作', kuIdMismatch: '目标玩家不一致',
        taskNameRequired: '请输入任务名称', taskNameLength: '长度应在 2 到 50 个字符之间', worldRequired: '请选择游戏世界',
        cronRequired: '请输入 Cron 表达式', cronInvalid: '请输入五段 Cron，或以 0 秒开头的六段 Cron', formIncomplete: '请完善表单信息',
        archiveRequired: '请选择存档', roomNameMismatch: '房间名不匹配'
      },
      confirmations: {
        appendKuId: '{description} 目标玩家：{id}。',
        kickTitle: '踢出玩家', kickDescription: '踢出玩家 {player} 会立即中断其连接。',
        characterTitle: '确认重选人物', characterDescription: '重选人物会重置玩家 {player} 的角色数据。',
        killTitle: '杀死玩家', killDescription: '该操作会导致玩家 {player} 立即死亡。',
        resurrectTitle: '复活玩家', resurrectDescription: '确认复活玩家 {player}。'
      },
      feedback: {
        listLoadFailed: '获取玩家列表失败：{error}', kickLoading: '正在踢出玩家...', kickSucceeded: '已踢出玩家 {player}', kickFailed: '踢出玩家失败：{error}',
        banSucceeded: '已封禁玩家 {player}', banFailed: '封禁玩家失败：{error}', characterSucceeded: '已重置玩家 {player}，玩家可以重新选择角色',
        characterFailed: '重选人物失败：{error}', noScheduleWorld: '没有可用于定时更新的游戏世界', scheduleSucceeded: '定时更新任务添加成功',
        scheduleFailed: '添加定时任务失败：{error}', exportLoading: '正在导出真实玩家数据...', exportSucceeded: '已导出 {count} 条真实玩家数据',
        exportFailed: '导出玩家数据失败：{error}', copyDenied: '浏览器未允许复制', steamCopied: 'Steam ID 已复制到剪贴板', copyFailed: '复制失败：{error}',
        archivesLoadFailed: '获取存档列表失败：{error}', worldsLoadFailed: '获取游戏世界失败：{error}', worldRequired: '请选择一个游戏世界',
        taskWorldSet: '已设置默认任务世界：{world}', actionLoading: '正在执行操作...', commandFailed: '命令执行失败', killSucceeded: '已杀死玩家 {player}',
        killFailed: '杀死玩家失败：{error}', godModeSucceeded: '已{status}玩家 {player} 的无敌模式', godModeFailed: '设置无敌模式失败：{error}',
        creativeModeSucceeded: '已{status}玩家 {player} 的制作模式', creativeModeFailed: '设置制作模式失败：{error}', resurrectSucceeded: '已复活玩家 {player}',
        resurrectFailed: '复活玩家失败：{error}', updateSucceeded: '玩家列表更新成功', updateSucceededReloadFailed: '玩家采集任务已完成，但最新列表读取失败，当前继续显示上次数据', updatePartial: '可用房间已更新，{count} 个房间更新失败', updateFailed: '更新玩家列表失败：{error}', addFailed: '添加失败',
        refreshSettingsNoRooms: '没有可设置的房间', refreshSettingsLoadFailed: '读取自动刷新设置失败：{error}', refreshSettingsSaved: '自动刷新设置已保存', refreshSettingsSaveFailed: '保存自动刷新设置失败：{error}'
      },
      export: {
        fileName: '玩家数据_{date}.csv',
        columns: { archive: '存档名称', world: '世界名称', playerName: '玩家名称', character: '角色', days: '天数', status: '状态', firstSeen: '最早记录', lastSeen: '最后记录' }
      },
      banList: {
        title: '封禁记录', subtitle: '查看玩家操作产生的封禁原因与期限；名单本体在房间黑名单中维护。', filterTitle: '筛选记录',
        filterDescription: '按房间或玩家关键词查询封禁记录。', room: '房间', allRooms: '全部房间', keywordPlaceholder: '玩家名称、KU ID 或封禁原因',
        loadFailedTitle: '封禁记录加载失败', recordsTitle: '封禁记录', total: '共 {count} 条有效记录', loading: '正在读取封禁记录',
        emptyTitle: '没有封禁记录', emptyDescription: '当前筛选范围内没有被封禁的玩家。', expiry: { permanent: '永久', unknown: '未知', expired: '已到期' },
        unbanPrompt: '解除封禁会修改房间“{room}”的黑名单，请确认是否继续。', unbanSucceeded: '已解除 {player} 的封禁',
        unbanFailed: '解除封禁失败：{error}', archivesLoadFailed: '房间列表加载失败：{error}'
      },
      errors: {
        codes: {
          INVALID_PLAYER_ACTION: '不支持该玩家操作', INVALID_PLAYER_INPUT: '玩家操作参数无效', PLAYER_NOT_FOUND: '未找到该玩家', CONFIRMATION_REQUIRED: '需要确认此操作',
          AGENT_UPGRADE_REQUIRED: '目标 Agent 版本过旧，请升级 Agent 后重试', AGENT_UNAVAILABLE: '目标 Agent 当前离线或连接不可用',
          ROOM_NOT_MANAGED: '该房间不在管理范围内', ROOM_UNAVAILABLE: '房间当前不可用，请检查运行节点与拓扑状态', WORLD_NOT_RUNNING: '该世界未运行', PLAYER_TARGET_UNAVAILABLE: '玩家操作目标当前不可用',
          RUNTIME_NOT_INSTALLED: '目标世界尚未安装玩家采集 Runtime', RUNTIME_UNAVAILABLE: '目标世界 Runtime 当前不可用', PLAYER_SNAPSHOT_UNAVAILABLE: '目标世界尚未产生可用的玩家快照', PLAYER_COMMAND_NOT_DISPATCHED: '玩家命令未能发送到目标运行节点',
          INVALID_RESOURCE_ID: '资源 ID 无效', RESOURCE_NOT_FOUND: '未找到该资源',
          PLAYER_OPERATION_FAILED: '玩家操作执行失败', PLAYER_PROBE_TIMEOUT: '玩家状态检测超时', JOB_CREATE_FAILED: '无法创建任务', INVALID_JSON: 'JSON 数据无效'
        }
      }
    }
  },
  'en-US': {
    players: {
      values: {
        unknown: 'Unknown', unknownError: 'Unknown error', unknownStatus: 'Unknown status', unknownCharacter: 'Unknown character', unknownDuration: 'Unknown duration',
        unknownPlayer: 'Unknown player', unknownWorld: 'Unknown world', noReason: 'No reason recorded', enabled: 'enabled', disabled: 'disabled'
      },
      actions: {
        refresh: 'Refresh', refreshSettings: 'Auto-refresh settings', saveRefreshSettings: 'Save settings', retry: 'Retry', search: 'Search', query: 'Search', reset: 'Reset', cancel: 'Cancel', confirm: 'Confirm', confirmAction: 'Confirm', details: 'Details',
        export: 'Export data', manualUpdate: 'Manual update', defaultTaskWorld: 'Default task world', addSchedule: 'Add scheduled task', startUpdate: 'Start update', confirmAdd: 'Add task',
        confirmBan: 'Ban player', confirmReselect: 'Reselect character', unban: 'Unban', openPlayerMenu: 'Open player actions menu', playerActions: 'Player actions', openDiagnostics: 'Room diagnostics', openWorkbench: 'Open game workbench',
        viewOnSteam: 'View on Steam', viewPlayerOnSteam: 'View player on Steam'
      },
      fields: {
        archive: 'Archive', status: 'Player status', character: 'Character', keyword: 'Keyword', playerId: 'Player ID', playerName: 'Player name', days: 'Days played', network: 'Network quality',
        performance: 'Performance', performanceMetric: 'Performance metric', firstSeen: 'First recorded', lastSeen: 'Last recorded', lastConnected: 'Last connected', lastDisconnected: 'Last disconnected', statusChanged: 'Status changed', createdAt: 'Created at',
        updatedAt: 'Updated at', lastRefreshed: 'Last sampled', presenceObservedAt: 'Last confirmed online', world: 'World', roomAndWorld: 'Room / World', action: 'Actions', banReason: 'Ban reason', banDuration: 'Ban duration', bannedAt: 'Banned at',
        expiresAt: 'Expires at', fullRoomName: 'Full room name', gameWorld: 'Game world', taskName: 'Task name', schedule: 'Schedule', taskDescription: 'Task description',
        refreshRoom: 'Room', autoRefresh: 'Auto refresh', refreshInterval: 'Refresh interval'
      },
      refreshIntervals: { seconds30: '30 seconds', seconds60: '1 minute', seconds120: '2 minutes', seconds300: '5 minutes', seconds600: '10 minutes' },
      statuses: { history: 'Historical record', online: 'Online', stale: 'Last known online', offline: 'Offline', onlineGameplay: 'Online · {state}', staleGameplay: 'Stale · Last {state}' },
      gameplayStates: { selectingCharacter: 'Selecting character', loading: 'Entering world', alive: 'In game', dead: 'Dying', ghost: 'Ghost', migrating: 'Changing world', unknown: 'Unknown state' },
      worldStates: { running: 'Running', stopped: 'Stopped', starting: 'Starting', stopping: 'Stopping', failed: 'Failed' },
      network: { excellent: 'Excellent', fair: 'Fair', poor: 'Poor' },
      performance: { good: 'Good', fair: 'Fair', poor: 'Poor' },
      characters: {
        wilson: 'Wilson', willow: 'Willow', wolfgang: 'Wolfgang', wendy: 'Wendy', wx78: 'WX-78', wickerbottom: 'Wickerbottom', woodie: 'Woodie', wes: 'Wes',
        waxwell: 'Maxwell', wathgrithr: 'Wigfrid', webber: 'Webber', winona: 'Winona', warly: 'Warly', walter: 'Walter', wortox: 'Wortox', wormwood: 'Wormwood',
        wurt: 'Wurt', wanda: 'Wanda', wonkey: 'Wonkey'
      },
      banDurations: { '1h': '1 hour', '6h': '6 hours', '12h': '12 hours', '1d': '1 day', '3d': '3 days', '7d': '7 days', '30d': '30 days', permanent: 'Permanent' },
      sorting: {
        playDays: '{count} days played',
        daysHint: 'In-game days from the latest sample; unknown values appear last within each presence group.'
      },
      list: {
        title: 'Players', subtitle: 'Review player records and online status, then run in-world actions.', taskWorld: 'Default scheduled-task world: {world}', filterTitle: 'Filter players',
        filterDescription: 'Narrow the list by archive, online status, character, or keyword.', allArchives: 'All archives', allStatuses: 'All statuses', allCharacters: 'All characters',
        searchPlaceholder: 'Search player name or ID', total: '{count} players', loadFailedTitle: 'Could not load players', currentRefreshFailedTitle: 'Could not collect current player state',
        currentRefreshFailedDescription: 'The records below are historical and do not represent current presence: {error}', partialTitle: 'Some rooms could not be loaded',
        partialDescription: 'Available data is shown; {count} rooms are unavailable: {rooms}', loading: 'Loading players', emptyTitle: 'No player data',
        emptyDescription: 'Select an archive or update the player list manually.', perPage: 'Per page', perPageAria: 'Players per page', administrator: 'Administrator', friend: 'Friend',
        sampledAt: 'Sampled at {time}', staleObservedAt: 'Last confirmed at {time}',
        presenceConflict: 'Shard conflict', presenceConflictDescription: 'This player was observed in these worlds during the same sampling window: {worlds}'
      },
      detail: {
        title: 'Player details', description: 'Identity, connection status, and server actions.', gameActions: 'Game actions', dangerousActions: 'Dangerous actions', managementActions: 'Player management',
        staleTitle: 'Presence data is stale', staleDescription: 'This player was last confirmed online at {time}. The latest observation failed, so live game actions are disabled until a successful refresh.',
        presenceConflictTitle: 'Player location conflict', presenceConflictDescription: 'These Shards simultaneously reported the same KU ID online: {worlds}. Refresh player data and inspect Shard connectivity before acting.'
      },
      quick: {
        trigger: 'Actions', common: 'Common actions', character: 'Character', management: 'Management',
        managementHint: 'Confirmation required',
        recovery: 'Recovery',
        previewNotice: 'Offline preview · No game actions will be executed', previewPlayer: 'Example player (preview only)',
        recover: 'Restore vitals', clean: 'Clear debuffs', give: 'Give items', teleport: 'Teleport / recall',
        speed: 'Move speed', penalty: 'Clear health penalty', more: 'Game workbench', unban: 'Unban player', itemLibrary: 'More items',
        back: 'Back to player actions', close: 'Close player actions', chooseItem: 'Choose an item', quantity: 'Quantity',
        quantityHint: 'Give 1–40 individual items.', moreItems: 'More items in the game workbench',
        giveSubmit: 'Give {count} × {item}', speedSubmit: 'Apply speed',
        teleportSubmit: 'Confirm teleport', recallSubmit: 'Confirm recall', speedValue: 'Speed multiplier', normalSpeed: 'Normal · 1×',
        speedHint: 'Set a new speed multiplier; 1× is normal speed.', direction: 'Direction', destination: 'Target player',
        forward: 'Move {player} to the other player', recall: 'Bring the other player to {player}',
        loadingTargets: 'Loading online players…', noTargets: 'No other available players are online in this world.',
        teleportHint: 'Only online players in the same world are supported.', retry: 'Try again',
        liveUnavailable: 'Live actions require confirmed online presence without conflicting world locations.',
        succeeded: 'Completed “{action}” for {player}', failed: 'Player action failed: {error}',
        partialFailure: 'Completed {completed}/{total} actions; the rest did not complete: {error}',
        refreshFailed: 'The action completed, but player data could not be refreshed: {error}',
        items: { log: 'Log', twigs: 'Twigs', cutgrass: 'Grass', flint: 'Flint', meatballs: 'Meatballs', reviver: 'Telltale Heart' }
      },
      operations: {
        godMode: 'God mode', creativeMode: 'Creative mode', resurrect: 'Resurrect player', changeCharacter: 'Reselect character', kick: 'Kick player', kickShort: 'Kick',
        ban: 'Ban player', banShort: 'Ban', kill: 'Kill player', killShort: 'Kill'
      },
      dialogs: {
        ban: { title: 'Ban player', reasonPlaceholder: 'Enter a ban reason', roomPlaceholder: 'Current room', roomPlaceholderNamed: 'Current room: {room}', description: 'Banning updates the room blacklist.' },
        godMode: { title: 'Set god mode', player: 'Player {player}' }, creativeMode: { title: 'Set creative mode', player: 'Player {player}' },
        session: { title: 'Default task world', description: 'Used to prefill scheduled refresh tasks. Live player actions always target the player\'s current world.', placeholder: 'Select a world', empty: 'No worlds are available' },
        refreshSettings: { title: 'Auto-refresh settings', description: 'Set the player collection interval for this room.', loading: 'Loading settings', loadFailed: 'Could not load auto-refresh settings', roomPlaceholder: 'Select a room', enabledDescription: 'Collects running worlds only; skips confirmed paused worlds and continues after they resume.' },
        update: { title: 'Update player list manually', description: 'Read the latest real player information from the server.', archivePlaceholder: 'Select an archive', allWorlds: 'All worlds', allWorldsDescription: 'Leave blank to update every world.' },
        character: { title: 'Reselect character', description: '{player} is currently playing {character}.', warningTitle: 'Player data will be reset', warningDescription: 'The player can select a character again afterward.' },
        schedule: { title: 'Add scheduled update', description: 'Periodically sync the player list from the selected world.', worldPlaceholder: 'Select a game world', specPlaceholder: 'Example: 0 */3 * * * *', specDescription: 'Supports five-field Cron or six-field Cron starting at second 0.' }
      },
      validation: {
        banReasonRequired: 'Enter a ban reason', banRoomMismatch: 'Confirm the ban operation', kuIdMismatch: 'Target player does not match', taskNameRequired: 'Enter a task name',
        taskNameLength: 'Use between 2 and 50 characters', worldRequired: 'Select a game world', cronRequired: 'Enter a Cron expression', cronInvalid: 'Enter five-field Cron or six-field Cron starting at second 0',
        formIncomplete: 'Complete the required fields', archiveRequired: 'Select an archive', roomNameMismatch: 'Room name does not match'
      },
      confirmations: {
        appendKuId: '{description} Target player: {id}.', kickTitle: 'Kick player', kickDescription: 'Kicking {player} will disconnect them immediately.',
        characterTitle: 'Confirm character reselection', characterDescription: 'Reselecting a character resets the character data for {player}.', killTitle: 'Kill player',
        killDescription: 'This action immediately kills {player}.', resurrectTitle: 'Resurrect player', resurrectDescription: 'Resurrect {player}.'
      },
      feedback: {
        listLoadFailed: 'Could not load players: {error}', kickLoading: 'Kicking player...', kickSucceeded: 'Kicked {player}', kickFailed: 'Could not kick player: {error}',
        banSucceeded: 'Banned {player}', banFailed: 'Could not ban player: {error}', characterSucceeded: 'Reset {player}; they can select a character again', characterFailed: 'Could not reselect character: {error}',
        noScheduleWorld: 'No game world is available for scheduled updates', scheduleSucceeded: 'Scheduled update added', scheduleFailed: 'Could not add scheduled update: {error}',
        exportLoading: 'Exporting real player data...', exportSucceeded: 'Exported {count} real player records', exportFailed: 'Could not export player data: {error}', copyDenied: 'The browser did not allow copying',
        steamCopied: 'Steam ID copied to the clipboard', copyFailed: 'Copy failed: {error}', archivesLoadFailed: 'Could not load archives: {error}', worldsLoadFailed: 'Could not load game worlds: {error}',
        worldRequired: 'Select a game world', taskWorldSet: 'Default task world set to {world}', actionLoading: 'Running action...', commandFailed: 'Command failed', killSucceeded: 'Killed {player}',
        killFailed: 'Could not kill player: {error}', godModeSucceeded: '{status} god mode for {player}', godModeFailed: 'Could not set god mode: {error}',
        creativeModeSucceeded: '{status} creative mode for {player}', creativeModeFailed: 'Could not set creative mode: {error}', resurrectSucceeded: 'Resurrected {player}',
        resurrectFailed: 'Could not resurrect player: {error}', updateSucceeded: 'Player list updated', updateSucceededReloadFailed: 'Player collection completed, but the latest list could not be loaded. The previous data remains visible.', updatePartial: 'Available rooms were updated; {count} rooms failed', updateFailed: 'Could not update player list: {error}', addFailed: 'Could not add task',
        refreshSettingsNoRooms: 'No room is available to configure', refreshSettingsLoadFailed: 'Could not load auto-refresh settings: {error}', refreshSettingsSaved: 'Auto-refresh settings saved', refreshSettingsSaveFailed: 'Could not save auto-refresh settings: {error}'
      },
      export: {
        fileName: 'players_{date}.csv',
        columns: { archive: 'Archive', world: 'World', playerName: 'Player name', character: 'Character', days: 'Days', status: 'Status', firstSeen: 'First seen', lastSeen: 'Last seen' }
      },
      banList: {
        title: 'Ban records', subtitle: 'Review reasons and expiry dates created by player actions; manage list membership in the room blocklist.', filterTitle: 'Filter records', filterDescription: 'Search ban records by room or player keyword.',
        room: 'Room', allRooms: 'All rooms', keywordPlaceholder: 'Player name, KU ID, or ban reason', loadFailedTitle: 'Could not load ban records', recordsTitle: 'Ban records',
        total: '{count} active records', loading: 'Loading ban records', emptyTitle: 'No ban records', emptyDescription: 'No banned players match the current filters.',
        expiry: { permanent: 'Permanent', unknown: 'Unknown', expired: 'Expired' }, unbanPrompt: 'Unbanning updates the blacklist for room “{room}”. Continue?',
        unbanSucceeded: 'Unbanned {player}', unbanFailed: 'Could not unban player: {error}', archivesLoadFailed: 'Could not load rooms: {error}'
      },
      errors: {
        codes: {
          INVALID_PLAYER_ACTION: 'This player action is not supported', INVALID_PLAYER_INPUT: 'The player action input is invalid', PLAYER_NOT_FOUND: 'Player not found', CONFIRMATION_REQUIRED: 'This action requires confirmation',
          AGENT_UPGRADE_REQUIRED: 'The target Agent is outdated. Upgrade the Agent and try again.', AGENT_UNAVAILABLE: 'The target Agent is offline or unavailable.',
          ROOM_NOT_MANAGED: 'This room is not managed', ROOM_UNAVAILABLE: 'This room is unavailable. Check its runtime node and topology.', WORLD_NOT_RUNNING: 'The world is not running', PLAYER_TARGET_UNAVAILABLE: 'The player action target is currently unavailable.',
          RUNTIME_NOT_INSTALLED: 'The player collection Runtime is not installed for the target world.', RUNTIME_UNAVAILABLE: 'The target world Runtime is currently unavailable.', PLAYER_SNAPSHOT_UNAVAILABLE: 'The target world has not produced a usable player snapshot.', PLAYER_COMMAND_NOT_DISPATCHED: 'The player command could not be sent to the target runtime node.',
          INVALID_RESOURCE_ID: 'The resource ID is invalid', RESOURCE_NOT_FOUND: 'Resource not found',
          PLAYER_OPERATION_FAILED: 'The player operation failed', PLAYER_PROBE_TIMEOUT: 'The player probe timed out', JOB_CREATE_FAILED: 'Could not create the job', INVALID_JSON: 'The JSON payload is invalid'
        }
      }
    }
  }
}
import { formatSystemDateTime } from '../lib/dateTime.mjs'

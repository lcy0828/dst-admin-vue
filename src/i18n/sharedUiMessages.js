const DEFAULT_SHARED_UI_LOCALE = 'zh-CN'

export const sharedUiMessages = Object.freeze({
  'zh-CN': {
    roomScope: { choose: '选择房间', current: '当前房间：{name}', all: '全部房间', loading: '加载房间…', empty: '暂无房间', search: '搜索房间名称', noMatches: '没有匹配的房间', running: '运行中', stopped: '已停止' },
    pagination: {
      previous: '上一页',
      next: '下一页',
    },
    sidebar: {
      title: '主导航',
      description: '访问饥荒管理系统的各个功能区域。',
      toggle: '切换侧边栏',
    },
    dialog: {
      close: '关闭',
    },
    feedback: {
      confirmTitle: '确认操作',
      promptTitle: '请输入',
      maintenance: {
        checking: '正在确认房间在线人数…',
        checkingHint: '从运行中的世界即时读取，不使用上次采集人数。',
        empty: '本次确认：房间无人在线',
        online: '本次确认：房间有 {count} 人在线',
        unknown: '暂时无法确认在线人数',
        emptyHint: '执行前会再次确认；仍无人时直接操作，不发送倒计时公告。',
        countdown: '按房间设置提前 {seconds} 秒通知后执行。',
        unknownCountdown: '人数未知时保留通知等待：按房间设置提前 {seconds} 秒通知后执行。',
        disabled: '此房间已关闭操作通知，确认后将直接操作。',
        unavailableHint: '无法取得当前人数和通知设置。继续后由服务端重新确认，人数未知时不会按空服处理。',
        immediateHint: '“立即执行”只跳过本次通知和等待，不修改房间设置。',
        immediate: '立即执行',
        notifyFirst: '按设置通知后执行',
      },
    },
  },
  'en-US': {
    roomScope: { choose: 'Choose room', current: 'Current room: {name}', all: 'All rooms', loading: 'Loading rooms…', empty: 'No rooms', search: 'Search rooms', noMatches: 'No matching rooms', running: 'Running', stopped: 'Stopped' },
    pagination: {
      previous: 'Previous page',
      next: 'Next page',
    },
    sidebar: {
      title: 'Main navigation',
      description: 'Access every area of the DST administration system.',
      toggle: 'Toggle sidebar',
    },
    dialog: {
      close: 'Close',
    },
    feedback: {
      confirmTitle: 'Confirm action',
      promptTitle: 'Enter a value',
      maintenance: {
        checking: 'Checking online players…',
        checkingHint: 'Reading running worlds now, without using the previous player sample.',
        empty: 'Checked now: no players online',
        online: 'Checked now: {count} players online',
        unknown: 'Unable to confirm online players',
        emptyHint: 'Checked again before execution. If still empty, proceed without a countdown announcement.',
        countdown: 'Notify {seconds} seconds before maintenance, as configured.',
        unknownCountdown: 'Keep the warning period while the count is unknown: notify {seconds} seconds before maintenance.',
        disabled: 'Operation notices are disabled for this room. Confirmation proceeds directly.',
        unavailableHint: 'Player count and notification settings are unavailable. The server will check again; an unknown count is not treated as empty.',
        immediateHint: '“Execute now” skips notices and waiting for this operation only. Room settings stay unchanged.',
        immediate: 'Execute now',
        notifyFirst: 'Notify, then execute',
      },
    },
  },
})

export function normalizeSharedUiLocale(locale) {
  return Object.hasOwn(sharedUiMessages, locale) ? locale : DEFAULT_SHARED_UI_LOCALE
}

export function currentSharedUiLocale() {
  if (typeof document === 'undefined') return DEFAULT_SHARED_UI_LOCALE
  return normalizeSharedUiLocale(document.documentElement.lang)
}

export function sharedUiText(key, locale = currentSharedUiLocale()) {
  const catalog = sharedUiMessages[normalizeSharedUiLocale(locale)]
  const value = String(key || '').split('.').reduce((current, segment) => current?.[segment], catalog)
  return typeof value === 'string' ? value : key
}

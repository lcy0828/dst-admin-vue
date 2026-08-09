const DEFAULT_SHARED_UI_LOCALE = 'zh-CN'

export const sharedUiMessages = Object.freeze({
  'zh-CN': {
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
    },
  },
  'en-US': {
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

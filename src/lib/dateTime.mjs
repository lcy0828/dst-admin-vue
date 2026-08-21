const DEFAULT_TIME_ZONE = 'Asia/Shanghai'

export function systemTimeZone() {
  if (typeof document === 'undefined') return DEFAULT_TIME_ZONE
  return document.documentElement.dataset.systemTimezone || DEFAULT_TIME_ZONE
}

export function formatSystemDateTime(value, options = {}) {
  const {
    locale = 'zh-CN',
    fallback = '--',
    timeZone = systemTimeZone(),
    ...formatOptions
  } = options
  if (value === undefined || value === null || value === '') return fallback
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return fallback === null ? String(value) : fallback
  const resolved = Object.keys(formatOptions).length > 0
    ? formatOptions
    : { dateStyle: 'medium', timeStyle: 'medium' }
  try {
    return new Intl.DateTimeFormat(locale, { ...resolved, timeZone }).format(date)
  } catch {
    return new Intl.DateTimeFormat(locale, { ...resolved, timeZone: DEFAULT_TIME_ZONE }).format(date)
  }
}

export function formatSystemUnixTime(seconds, options = {}) {
  const numeric = Number(seconds)
  if (!Number.isFinite(numeric)) return options.fallback ?? '--'
  return formatSystemDateTime(numeric * 1000, options)
}

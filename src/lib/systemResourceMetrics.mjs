import { formatSystemDateTime } from '@/lib/dateTime.mjs'
import { formatDurationSeconds } from '@/lib/localeFormatters.mjs'

export function hasMetric(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
}

export function percentage(value) {
  if (!hasMetric(value)) return 0
  const normalized = Math.max(0, Math.min(100, Number(value)))
  return Math.round(normalized * 10) / 10
}

export function loadPercentage(value, capacity) {
  if (!hasMetric(value) || !hasMetric(capacity) || Number(capacity) <= 0) return 0
  return percentage((Number(value) / Number(capacity)) * 100)
}

export function formatMemory(value) {
  if (!hasMetric(value)) return '--'
  return Number(value) < 1024 ? `${Number(value).toFixed(2)} MB` : `${(Number(value) / 1024).toFixed(2)} GB`
}

export function formatDisk(value) {
  return hasMetric(value) ? `${Number(value).toFixed(2)} GB` : '--'
}

export function formatDecimal(value) {
  return hasMetric(value) ? Number(value).toFixed(2) : '--'
}

export function formatResourceDateTime(value, locale = 'zh-CN') {
  return formatSystemDateTime(value, {
    locale,
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

export function formatSystemUptime(status = {}, translator) {
  const seconds = status.uptime_seconds ?? status.uptime
  if (hasMetric(seconds) && typeof translator === 'function') return formatDurationSeconds(seconds, translator)
  return status.uptime_formatted || '--'
}

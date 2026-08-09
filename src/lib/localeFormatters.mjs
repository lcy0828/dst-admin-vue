export function formatDurationSeconds(seconds, translate, fallback = '--') {
  const numeric = Number(seconds)
  if (!Number.isFinite(numeric) || numeric < 0 || typeof translate !== 'function') return fallback

  const totalMinutes = Math.floor(numeric / 60)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return translate('common.duration.daysHours', { days, hours })
  if (hours > 0) return translate('common.duration.hoursMinutes', { hours, minutes })
  return translate('common.duration.minutes', { minutes })
}

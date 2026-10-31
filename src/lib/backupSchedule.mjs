// Only lossless five-field presets are represented by the simple controls.
// Opening or renaming an existing task must never normalize its expression.
export function readBackupSchedule(schedule) {
  const fields = String(schedule || '').trim().split(/\s+/)
  if (fields.length !== 5 || fields.slice(2).join(' ') !== '* * *') return { kind: 'custom' }
  if (!/^\d{1,2}$/.test(fields[0]) || Number(fields[0]) > 59) return { kind: 'custom' }
  const minute = Number(fields[0])
  if (/^\d{1,2}$/.test(fields[1]) && Number(fields[1]) < 24) {
    return { kind: 'daily', time: `${fields[1].padStart(2, '0')}:${fields[0].padStart(2, '0')}` }
  }
  if (fields[1] === '*') return { kind: 'hourly', interval: 1, minute }
  if (/^\*\/(?:[1-9]|1\d|2[0-3])$/.test(fields[1])) return { kind: 'hourly', interval: Number(fields[1].slice(2)), minute }
  return { kind: 'custom' }
}

export function writeBackupSchedule({ kind, time = '04:00', interval = 1, minute = 0 }) {
  if (kind === 'daily' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    const [hour, min] = time.split(':').map(Number)
    return `${min} ${hour} * * *`
  }
  if (kind === 'hourly' && Number.isInteger(Number(interval)) && Number(interval) >= 1 && Number(interval) <= 23 &&
      Number.isInteger(Number(minute)) && Number(minute) >= 0 && Number(minute) <= 59) {
    return `${Number(minute)} ${Number(interval) === 1 ? '*' : `*/${Number(interval)}`} * * *`
  }
  return null
}

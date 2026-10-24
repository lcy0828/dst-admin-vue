const accessFiles = new Set(['adminlist.txt', 'blocklist.txt', 'whitelist.txt', 'cluster.ini'])

export function accessListReadError(error, translate) {
  if (!['ACCESS_LIST_INVALID', 'ACCESS_LIST_READ_FAILED'].includes(error?.code)) return error?.message || ''
  const detail = error.details || {}
  const file = accessFiles.has(detail.file) ? detail.file : ''
  const line = Number.isSafeInteger(detail.line) && detail.line > 0 ? detail.line : 0
  const prefix = 'rooms.specialLists.feedback.'
  let key = 'targetReadFailed'
  if (detail.reason === 'invalid_id') key = file && line ? 'invalidFileLine' : 'invalidFile'
  else if (detail.reason === 'invalid_encoding') key = 'invalidEncoding'
  else if (detail.reason === 'too_many_entries') key = 'tooManyEntries'
  else if (detail.reason === 'incomplete_snapshot') key = 'incompleteSnapshot'
  else if (file) key = 'fileReadFailed'
  const message = translate(prefix + key, { file, line })
  return /^[\w:-]{1,128}$/.test(error.requestId || '')
    ? `${message} · ${translate(prefix + 'requestId', { id: error.requestId })}`
    : message
}

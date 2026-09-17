const CHAT_KINDS = new Set(['say', 'whisper', 'announcement'])

const boundedInteger = (value, fallback, minimum, maximum) => {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, parsed))
}

export function buildChatLogFilter({ query = '', worldId = '', kind = '', page = 1, pageSize = 100 } = {}) {
  const limit = boundedInteger(pageSize, 100, 1, 500)
  const currentPage = boundedInteger(page, 1, 1, Number.MAX_SAFE_INTEGER)
  const normalizedKind = CHAT_KINDS.has(String(kind).trim()) ? String(kind).trim() : ''
  const filter = {
    limit,
    offset: (currentPage - 1) * limit
  }
  const normalizedQuery = String(query).trim()
  const normalizedWorldId = String(worldId).trim()
  if (normalizedQuery) filter.query = normalizedQuery
  if (normalizedWorldId) filter.worldId = normalizedWorldId
  if (normalizedKind) filter.kind = normalizedKind
  return filter
}

export function normalizeChatLogList(value) {
  const source = value && typeof value === 'object' ? value : {}
  const counts = source.counts && typeof source.counts === 'object' ? source.counts : {}
  return {
    items: Array.isArray(source.items) ? source.items : [],
    total: Math.max(0, Number(source.total) || 0),
    counts: {
      say: Math.max(0, Number(counts.say) || 0),
      whisper: Math.max(0, Number(counts.whisper) || 0),
      announcement: Math.max(0, Number(counts.announcement) || 0)
    },
    partial: Boolean(source.partial),
    truncated: Boolean(source.truncated),
    availableWorlds: Math.max(0, Number(source.availableWorlds) || 0),
    unavailableWorlds: Math.max(0, Number(source.unavailableWorlds) || 0),
    startedAt: source.startedAt || '',
    updatedAt: source.updatedAt || '',
    problems: Array.isArray(source.problems) ? source.problems : [],
    historyAvailable: Boolean(source.historyAvailable),
    pendingGenerations: Math.max(0, Number(source.pendingGenerations) || 0),
    unavailableGenerations: Math.max(0, Number(source.unavailableGenerations) || 0),
    parseErrors: Math.max(0, Number(source.parseErrors) || 0),
    uncertainTimes: Math.max(0, Number(source.uncertainTimes) || 0),
    parseProblems: Array.isArray(source.parseProblems) ? source.parseProblems : [],
    syncState: String(source.syncState || ''),
    syncMessage: String(source.syncMessage || ''),
    lastSyncedAt: source.lastSyncedAt || ''
  }
}

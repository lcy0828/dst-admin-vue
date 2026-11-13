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

export function buildChatHistoryReviewItems({ parseErrors = 0, uncertainTimes = 0, unavailableGenerations = 0 } = {}) {
  const items = []
  const missing = Math.max(0, Number(unavailableGenerations) || 0)
  const errors = Math.max(0, Number(parseErrors) || 0)
  const times = Math.max(0, Number(uncertainTimes) || 0)
  if (missing > 0) items.push({ key: 'unavailableGenerations', messageKey: 'servers.workspace.chat.reviewUnavailableGenerations', count: missing })
  if (errors > 0) items.push({ key: 'parseErrors', messageKey: 'servers.workspace.chat.reviewParseErrors', count: errors })
  if (times > 0) items.push({ key: 'uncertainTimes', messageKey: 'servers.workspace.chat.reviewUncertainTimes', count: times })
  return items
}

export function shouldShowPrimaryChatRepairAction({ historyAvailable = false, syncState = '', pendingGenerations = 0, activeRepair = false } = {}) {
  if (!historyAvailable) return false
  if (activeRepair) return true
  if ((Number(pendingGenerations) || 0) > 0) return true
  return syncState === 'partial' || syncState === 'pending' || syncState === 'catching_up'
}

export function formatChatParseProblem(problem, worlds = []) {
  const raw = String(problem || '').trim()
  if (!raw) return ''
  const separator = raw.indexOf(' / ')
  if (separator <= 0 || !Array.isArray(worlds) || worlds.length === 0) return raw
  const worldId = raw.slice(0, separator).trim()
  const matched = worlds.find(world => String(world?.id || '').trim() === worldId && String(world?.name || '').trim())
  if (!matched) return raw
  return `${String(matched.name).trim()} / ${raw.slice(separator + 3)}`
}

// DST Game Emoji font covers U+F0000-U+F0031; other PUA ranges (BMP U+E000-U+F8FF
// controller/mod icons such as Status Announcements U+E102, and extended supplementary
// PUA U+F0032+) have no system font glyph and otherwise render as missing-glyph boxes.
const UNSUPPORTED_PUA_PATTERN = /[\uE000-\uF8FF\u{F0032}-\u{FFFFF}\u{100000}-\u{10FFFF}]+/gu

export function formatDstChatText(value, { fallback = '' } = {}) {
  if (value == null) return ''
  const raw = String(value)
  if (!raw.trim()) return ''
  const cleaned = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(UNSUPPORTED_PUA_PATTERN, '').replace(/[ \t]{2,}/g, ' ').trim())
    .filter((line, index, lines) => line !== '' || (index > 0 && index < lines.length - 1))
    .join('\n')
    .trim()
  if (!cleaned) return fallback
  return cleaned
}

export function formatDstChatPlayer(entry, { systemLabel = '', fallback = '' } = {}) {
  const rawName = String(entry?.playerName || '').trim()
  const formatted = formatDstChatText(rawName)
  if (formatted) return formatted
  const playerId = String(entry?.playerId || '').trim()
  if (playerId) return playerId
  if (rawName) return fallback
  return systemLabel
}

export function isChatContentExpandable(text) {
  const value = String(text || '')
  if (!value) return false
  if (value.includes('\n')) return true
  let width = 0
  for (const char of value) {
    const code = char.codePointAt(0)
    width += code > 0x7f ? 2 : 1
    if (width > 48) return true
  }
  return false
}

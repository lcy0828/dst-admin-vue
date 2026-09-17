export const LIVE_LOG_LINE_OPTIONS = Object.freeze(['100', '300', '500', '1000', '2000'])
export const DEFAULT_LIVE_LOG_LINE_COUNT = '300'
export const ALL_LIVE_LOG_LINES = 'all'

const MAX_STREAM_TAIL = 2000
const MIN_TERMINAL_SCROLLBACK = 5000
const TERMINAL_ROWS_PER_LOG_LINE = 4
const TERMINAL_SCROLLBACK_PADDING = 1000

export function liveLogRequestLimit(value) {
  if (value === ALL_LIVE_LOG_LINES) return MAX_STREAM_TAIL
  return LIVE_LOG_LINE_OPTIONS.includes(String(value))
    ? Number(value)
    : Number(DEFAULT_LIVE_LOG_LINE_COUNT)
}

export function limitLiveLogLines(lines, value) {
  const normalized = Array.isArray(lines) ? lines.map(line => String(line ?? '')) : []
  if (value === ALL_LIVE_LOG_LINES) return normalized
  return normalized.slice(-liveLogRequestLimit(value))
}

export function liveLogScrollbackSize(lineCount, value) {
  const parsedLineCount = Number(lineCount)
  const currentLineCount = Number.isFinite(parsedLineCount)
    ? Math.max(0, Math.floor(parsedLineCount))
    : 0
  const retainedLineCount = value === ALL_LIVE_LOG_LINES
    ? currentLineCount
    : Math.max(currentLineCount, liveLogRequestLimit(value))
  const requiredRows = retainedLineCount * TERMINAL_ROWS_PER_LOG_LINE + TERMINAL_SCROLLBACK_PADDING

  return Math.max(
    MIN_TERMINAL_SCROLLBACK,
    Math.ceil(requiredRows / TERMINAL_SCROLLBACK_PADDING) * TERMINAL_SCROLLBACK_PADDING
  )
}

export function splitLiveLogText(value) {
  const normalized = String(value ?? '').replace(/\r\n?/g, '\n')
  if (!normalized) return []
  const lines = normalized.split('\n')
  if (lines.at(-1) === '') lines.pop()
  return lines
}

export function mergeLiveLogTail(currentLines, incomingLines, value) {
  const current = limitLiveLogLines(currentLines, value)
  const incoming = Array.isArray(incomingLines) ? incomingLines.map(line => String(line ?? '')) : []
  let overlap = Math.min(current.length, incoming.length)

  overlapSearch:
  for (; overlap > 0; overlap -= 1) {
    const currentStart = current.length - overlap
    for (let index = 0; index < overlap; index += 1) {
      if (current[currentStart + index] !== incoming[index]) continue overlapSearch
    }
    break
  }

  return limitLiveLogLines([...current, ...incoming.slice(overlap)], value)
}

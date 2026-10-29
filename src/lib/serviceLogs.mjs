export function mergeServiceLogPages(previous = [], incoming = [], maximum = 1000) {
  const seen = new Set(previous.map(entry => entry.id))
  return [...previous, ...incoming.filter(entry => {
    if (!entry.id || seen.has(entry.id)) return false
    seen.add(entry.id)
    return true
  })].slice(0, maximum)
}

export function serviceLogFilters(input, now = new Date()) {
  const query = { sourceId: input.sourceId || 'controller', limit: 100, from: new Date(now.getTime() - Number(input.hours || 1) * 3600000).toISOString(), to: now.toISOString() }
  for (const key of ['level', 'component', 'keyword', 'jobId', 'requestId', 'operationId']) {
    const value = String(input[key] || '').trim()
    if (value && value !== 'all') query[key] = value
  }
  return query
}

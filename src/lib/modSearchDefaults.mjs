export function resolveModSearchSort(keyword, currentSort, sortManuallySelected = false) {
  if (sortManuallySelected) return currentSort
  return String(keyword || '').trim() ? 'relevance' : 'trend'
}

export function isModItemQuery(keyword) {
  const value = String(keyword || '').trim()
  if (/^\d{1,20}$/.test(value)) return true
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.toLowerCase() === 'steamcommunity.com' && url.pathname === '/sharedfiles/filedetails/' && /^\d{1,20}$/.test(url.searchParams.get('id') || '')
  } catch {
    return false
  }
}

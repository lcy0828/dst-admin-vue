export function resolveModSearchSort(keyword, currentSort, sortManuallySelected = false) {
  if (sortManuallySelected) return currentSort
  return String(keyword || '').trim() ? 'relevance' : 'trend'
}

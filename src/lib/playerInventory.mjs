export function filterInventoryTree(items, query = '') {
  const text = query.trim().toLocaleLowerCase()
  if (!text) return items || []
  return (items || []).flatMap(item => {
    if ([item.prefab, item.name, item.slot].some(value => String(value || '').toLocaleLowerCase().includes(text))) return [item]
    const contents = filterInventoryTree(item.contents, text)
    return contents.length ? [{ ...item, contents }] : []
  })
}

export function inventoryMetricText(metric, format = value => String(value)) {
  if (metric?.value == null || !Number.isFinite(metric.value)) return ''
  if (metric.ratio != null && Number.isFinite(metric.ratio)) return `${format(Math.round(metric.ratio * 100))}%`
  return format(Math.round(metric.value * 10) / 10)
}

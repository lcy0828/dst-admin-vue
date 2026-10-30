export function filterInventoryTree(items, query = '') {
  const text = query.trim().toLocaleLowerCase()
  if (!text) return items || []
  return (items || []).flatMap(item => {
    if ([item.prefab, item.name, item.displayName, ...(item.searchNames || []), item.slot].some(value => String(value || '').toLocaleLowerCase().includes(text))) return [item]
    const contents = filterInventoryTree(item.contents, text)
    return contents.length ? [{ ...item, contents }] : []
  })
}

export function inventoryNameIndex(items = []) {
  return new Map(items.filter(item => item.id && !item.modId).map(item => [item.id, { zh: item.nameZhCN, en: item.nameEn }]))
}

export function localizeInventoryItems(items, names, locale) {
  return (items || []).map(item => {
    // Custom names and Mod overrides belong to their source; a vanilla prefab
    // match must never replace them with an unrelated catalog name.
    const entry = item.modId ? null : names?.get(item.prefab)
    const meaningfulName = item.name && item.name !== item.prefab
    const custom = meaningfulName && (!['strings', 'prefab'].includes(item.nameSource) ||
      (entry && item.nameSource === 'strings' && ![entry.zh, entry.en].includes(item.name)))
    const translated = locale === 'zh-CN' ? entry?.zh || entry?.en : entry?.en || entry?.zh
    return { ...item,
      displayName: custom ? item.name : translated || item.name || item.prefab,
      searchNames: [entry?.zh, entry?.en].filter(Boolean),
      contents: localizeInventoryItems(item.contents, names, locale)
    }
  })
}

export function inventoryMetricText(metric, format = value => String(value)) {
  if (metric?.value == null || !Number.isFinite(metric.value)) return ''
  if (metric.ratio != null && Number.isFinite(metric.ratio)) return `${format(Math.round(metric.ratio * 100))}%`
  return format(Math.round(metric.value * 10) / 10)
}

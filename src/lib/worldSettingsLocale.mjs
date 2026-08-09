export function worldSettingsCatalogPath(locale) {
  return locale === 'en-US'
    ? '/static/json/dst_world_setting_en.json'
    : '/static/json/dst_world_setting_zh.json'
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

export function applyWorldSettingsLabels(target, catalog) {
  if (!target || !catalog) return target

  for (const [groupKey, group] of Object.entries(target)) {
    const catalogGroup = catalog[groupKey]
    if (!catalogGroup) continue

    for (const [categoryKey, category] of Object.entries(group)) {
      const catalogCategory = catalogGroup[categoryKey]
      if (!catalogCategory) continue

      if (typeof catalogCategory.text === 'string') category.text = catalogCategory.text
      if (Object.prototype.hasOwnProperty.call(catalogCategory, 'desc')) {
        category.desc = clone(catalogCategory.desc)
      }

      for (const [itemKey, item] of Object.entries(category.items || {})) {
        const catalogItem = catalogCategory.items?.[itemKey]
        if (!catalogItem) continue
        if (typeof catalogItem.text === 'string') item.text = catalogItem.text
        if (Object.prototype.hasOwnProperty.call(catalogItem, 'desc')) {
          item.desc = clone(catalogItem.desc)
        }
      }
    }
  }

  return target
}

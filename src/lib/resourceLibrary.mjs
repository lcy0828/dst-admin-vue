import { validPrefab } from './workbench.mjs'

export const resourceCategories = ['all', 'item', 'food', 'equipment', 'structure', 'creature', 'boss', 'nature', 'other']
const categorySet = new Set(resourceCategories.slice(1))
const commonOrder = ['cutgrass', 'twigs', 'log', 'rocks', 'flint', 'goldnugget', 'boards', 'cutstone', 'rope', 'meatballs', 'perogies', 'healingsalve', 'reviver', 'gears', 'silk', 'nightmarefuel', 'livinglog', 'torch', 'lantern', 'axe', 'pickaxe', 'shovel', 'hammer', 'spear', 'hambat', 'armorwood', 'footballhat', 'backpack', 'cane', 'firepit', 'cookpot', 'icebox', 'treasurechest', 'beefalo', 'pigman', 'deerclops']
const commonRank = new Map(commonOrder.map((id, index) => [id, commonOrder.length - index]))
const HISTORY_KEY = 'dst.workbench.resource-history.v1'
const DAY = 86400000
const normalize = value => String(value || '').trim().toLocaleLowerCase()
export const resourceIdentity = entity => `${entity.modId || (entity.source === 'manual' ? 'manual' : 'vanilla')}:${entity.id}`

export function mergeResourceDirectory(builtin = [], runtime = []) {
  const map = new Map()
  for (const item of builtin) {
    if (!validPrefab(item.id)) continue
    map.set(item.id, { ...item, key: `resource:${item.id}`, category: categorySet.has(item.category) ? item.category : 'other', registered: false })
  }
  for (const item of runtime) {
    if (!validPrefab(item.id)) continue
    const base = map.get(item.id)
    // An override is a different resource: do not borrow vanilla art, category,
    // popularity or translated names from a prefab with the same ID.
    const merged = item.modId ? { ...item, common: false, artworkUrl: item.artworkUrl || '', category: 'other' } : {
      ...base, ...item,
      nameZhCN: base?.nameZhCN || item.nameZhCN,
      nameEn: base?.nameEn || item.nameEn,
      common: base?.common || false,
      category: base?.category || 'other'
    }
    map.set(item.id, { ...merged, key: `resource:${item.id}`, source: 'runtime', registered: true })
  }
  return [...map.values()].map(item => ({ ...item, searchText: normalize([item.id, item.nameZhCN, item.nameEn, item.modName, item.modId].join(' ')) }))
}

export function sanitizeResourceHistory(value, now = Date.now()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([key, entry]) =>
    key.length <= 220 && /^[^:]+:[a-z0-9_]{1,80}$/.test(key) && entry &&
    Number.isFinite(entry.at) && entry.at <= now && entry.at > now - 90 * DAY &&
    Number.isFinite(entry.uses) && entry.uses >= 0 && entry.uses <= 1000 &&
    Number.isFinite(entry.finds) && entry.finds >= 0 && entry.finds <= 1000
  ).sort((a, b) => b[1].at - a[1].at).slice(0, 200).map(([key, entry]) => [key, {
    at: entry.at, uses: entry.uses, finds: entry.finds,
    usedAt: Number.isFinite(entry.usedAt) && entry.usedAt <= now ? Math.max(0, entry.usedAt) : 0,
    pickedAt: Number.isFinite(entry.pickedAt) && entry.pickedAt <= now ? Math.max(0, entry.pickedAt) : 0
  }]))
}

export function readResourceHistory(storage, now = Date.now()) {
  try { return sanitizeResourceHistory(JSON.parse((storage || globalThis.localStorage)?.getItem(HISTORY_KEY) || '{}'), now) } catch { return {} }
}
export function clearResourceHistory(storage) {
  try { (storage || globalThis.localStorage)?.removeItem(HISTORY_KEY) } catch { /* Storage is optional. */ }
}
export function updateResourceHistory(history, entity, event, now = Date.now()) {
  const clean = sanitizeResourceHistory(history, now)
  if (!validPrefab(entity?.id) || !['use', 'search'].includes(event)) return clean
  const key = resourceIdentity(entity)
  const previous = clean[key] || { at: now, uses: 0, finds: 0, usedAt: 0, pickedAt: 0 }
  if (event === 'search' && now - previous.pickedAt < 60000) return clean
  const decay = 2 ** (-(now - previous.at) / (30 * DAY))
  clean[key] = { at: now, uses: Math.min(1000, previous.uses * decay + (event === 'use' ? 1 : 0)), finds: Math.min(1000, previous.finds * decay + (event === 'search' ? 1 : 0)), usedAt: event === 'use' ? now : previous.usedAt, pickedAt: event === 'search' ? now : previous.pickedAt }
  return sanitizeResourceHistory(clean, now)
}
export function rememberResource(entity, event, storage) {
  try { (storage || globalThis.localStorage)?.setItem(HISTORY_KEY, JSON.stringify(updateResourceHistory(readResourceHistory(storage), entity, event))) } catch { /* Private browsing can disable storage. */ }
}

export function queryResources(items, { query = '', category = 'all', source = 'all', sort = 'smart', history = {}, now = Date.now(), locale = 'zh-CN' } = {}) {
  const q = normalize(query), tokens = q.split(/\s+/).filter(Boolean)
  const counts = Object.fromEntries(resourceCategories.map(key => [key, 0]))
  const ranked = []
  for (const item of items) {
    if (source === 'vanilla' && item.modId || source === 'mods' && !item.modId || !['all', 'vanilla', 'mods'].includes(source) && item.modId !== source) continue
    if (!tokens.every(token => item.searchText.includes(token))) continue
    counts.all++; counts[item.category]++
    if (category !== 'all' && item.category !== category) continue
    const names = [item.id, item.nameZhCN, item.nameEn].map(normalize)
    const relevance = !q ? 0 : names.includes(q) ? 3 : names.some(name => name.startsWith(q)) ? 2 : 1
    const entry = history[resourceIdentity(item)]
    const decay = entry ? 2 ** (-Math.max(0, now - entry.at) / (30 * DAY)) : 0
    const personal = entry ? (Math.log2(1 + entry.uses) * 12 + Math.log2(1 + entry.finds) * 3) * decay : 0
    const seed = !item.modId ? (commonRank.get(item.id) || (item.common ? 1 : 0)) / 100 : 0
    const score = personal + (entry?.usedAt ? 2 ** (-Math.max(0, now - entry.usedAt) / (7 * DAY)) : 0) + seed
    const name = locale === 'zh-CN' ? item.nameZhCN : item.nameEn
    ranked.push({ item, relevance, score, recent: entry?.usedAt || 0, name: name || item.id })
  }
  const compareName = new Intl.Collator(locale).compare
  ranked.sort((a, b) => b.relevance - a.relevance || (sort === 'name' ? compareName(a.name, b.name) : sort === 'recent' ? b.recent - a.recent || b.score - a.score : b.score - a.score) || (a.item.category === 'other') - (b.item.category === 'other') || a.item.id.localeCompare(b.item.id))
  return { items: ranked.map(row => row.item), counts }
}

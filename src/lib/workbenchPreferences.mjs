const KEY = 'dst.workbench.preferences.v1'
const actions = ['batch', 'map', 'cycle', 'materials', 'unlock', 'announce']
export const feedbackModes = ['panel_detail', 'panel_compact', 'panel_chat', 'nearby_speech', 'world_chat', 'off']
export const defaultPreferences = Object.freeze({ quantity: 10, radius: 10, grid: false, showCode: true, autoFavoriteEquipment: false, middleAction: 'batch', feedback: 'panel_detail', showModNames: true, moreCategories: false, highlightSelection: true, quickFavorites: true, printCommands: false, favorites: [], skins: {} })
const prefab = value => typeof value === 'string' && /^[a-z0-9_]{1,80}$/.test(value)
export function sanitizeWorkbenchPreferences(value) {
  const v = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const bounded = (key, min, max) => Number.isInteger(v[key]) && v[key] >= min && v[key] <= max ? v[key] : defaultPreferences[key]
  return { quantity: bounded('quantity', 1, 40), radius: bounded('radius', 1, 64), ...Object.fromEntries(['grid', 'showCode', 'autoFavoriteEquipment', 'showModNames', 'moreCategories', 'highlightSelection', 'quickFavorites', 'printCommands'].map(key => [key, typeof v[key] === 'boolean' ? v[key] : defaultPreferences[key]])), middleAction: actions.includes(v.middleAction) ? v.middleAction : 'batch', feedback: feedbackModes.includes(v.feedback) ? v.feedback : 'panel_detail', favorites: [...new Set((Array.isArray(v.favorites) ? v.favorites : []).filter(prefab))].slice(0, 500), skins: Object.fromEntries(Object.entries(v.skins && typeof v.skins === 'object' ? v.skins : {}).filter(([key, skin]) => prefab(key) && prefab(skin)).slice(0, 500)) }
}
export function readWorkbenchPreferences(storage = globalThis.localStorage) { try { return sanitizeWorkbenchPreferences(JSON.parse(storage?.getItem(KEY) || '{}')) } catch { return sanitizeWorkbenchPreferences({}) } }
export function writeWorkbenchPreferences(value, storage = globalThis.localStorage) { const clean = sanitizeWorkbenchPreferences(value); try { storage?.setItem(KEY, JSON.stringify(clean)); if (typeof window !== 'undefined') window.dispatchEvent(new Event('dst:workbench-preferences')) } catch { /* Optional local storage. */ } return clean }
export function snapWorkbenchPoint(point, grid = false) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z) || Math.abs(point.x) > 16000 || Math.abs(point.z) > 16000) return null
  return grid ? { x: Math.round((point.x - 2) / 4) * 4 + 2, z: Math.round((point.z - 2) / 4) * 4 + 2 } : { x: Math.round(point.x * 10) / 10, z: Math.round(point.z * 10) / 10 }
}

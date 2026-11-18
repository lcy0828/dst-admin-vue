export const PLAYER_LIST_COLUMNS_STORAGE_KEY = 'dst-admin.player-list.columns'

export const PLAYER_COLUMN_DEFINITIONS = Object.freeze([
  { id: 'roomAndWorld', labelKey: 'players.fields.roomAndWorld', defaultVisible: true, locked: false },
  { id: 'playerName', labelKey: 'players.fields.playerName', defaultVisible: true, locked: true },
  { id: 'kuId', labelText: 'KU ID', defaultVisible: false, locked: false },
  { id: 'character', labelKey: 'players.fields.character', defaultVisible: true, locked: false },
  { id: 'days', labelKey: 'players.fields.days', defaultVisible: true, locked: false },
  { id: 'status', labelKey: 'players.fields.status', defaultVisible: true, locked: false },
  { id: 'network', labelKey: 'players.fields.network', defaultVisible: false, locked: false },
  { id: 'steamId', labelText: 'Steam ID', defaultVisible: false, locked: false },
  { id: 'firstSeen', labelKey: 'players.fields.firstSeen', defaultVisible: false, locked: false },
  { id: 'lastSeen', labelKey: 'players.fields.lastSeen', defaultVisible: false, locked: false },
  { id: 'action', labelKey: 'players.fields.action', defaultVisible: true, locked: true }
])

export const DEFAULT_VISIBLE_PLAYER_COLUMNS = Object.freeze(
  PLAYER_COLUMN_DEFINITIONS.filter(column => column.defaultVisible).map(column => column.id)
)

const VALID_IDS = new Set(PLAYER_COLUMN_DEFINITIONS.map(column => column.id))
const LOCKED_IDS = PLAYER_COLUMN_DEFINITIONS.filter(column => column.locked).map(column => column.id)

export function normalizeVisiblePlayerColumns(value) {
  if (!Array.isArray(value)) return [...DEFAULT_VISIBLE_PLAYER_COLUMNS]
  const selected = new Set(value.filter(id => VALID_IDS.has(id)))
  for (const locked of LOCKED_IDS) selected.add(locked)
  return PLAYER_COLUMN_DEFINITIONS.filter(column => selected.has(column.id)).map(column => column.id)
}

export function readVisiblePlayerColumns(storage = typeof localStorage === 'undefined' ? null : localStorage) {
  try {
    const raw = storage?.getItem?.(PLAYER_LIST_COLUMNS_STORAGE_KEY)
    if (!raw) return [...DEFAULT_VISIBLE_PLAYER_COLUMNS]
    return normalizeVisiblePlayerColumns(JSON.parse(raw))
  } catch {
    return [...DEFAULT_VISIBLE_PLAYER_COLUMNS]
  }
}

export function saveVisiblePlayerColumns(columns, storage = typeof localStorage === 'undefined' ? null : localStorage) {
  const normalized = normalizeVisiblePlayerColumns(columns)
  try {
    storage?.setItem?.(PLAYER_LIST_COLUMNS_STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // Column visibility preferences are optional when browser storage is unavailable.
  }
  return normalized
}

export function togglePlayerColumn(columns, columnId, nextVisible) {
  const definition = PLAYER_COLUMN_DEFINITIONS.find(column => column.id === columnId)
  if (!definition) return normalizeVisiblePlayerColumns(columns)
  if (definition.locked) return normalizeVisiblePlayerColumns(columns)
  const selected = new Set(normalizeVisiblePlayerColumns(columns))
  if (nextVisible === undefined) {
    if (selected.has(columnId)) selected.delete(columnId)
    else selected.add(columnId)
  } else if (nextVisible) {
    selected.add(columnId)
  } else {
    selected.delete(columnId)
  }
  return normalizeVisiblePlayerColumns([...selected])
}

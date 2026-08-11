export const WORLD_MAP_LAYERS = Object.freeze([
  { id: 'terrain' },
  { id: 'features' },
  { id: 'worldState' }
])

export const WORLD_MAP_CATEGORIES = Object.freeze([
  { id: 'spawnPoint', defaultVisible: true },
  { id: 'player', defaultVisible: true },
  { id: 'walrusCamp', defaultVisible: true },
  { id: 'landmark', defaultVisible: true },
  { id: 'resource', defaultVisible: false },
  { id: 'other', defaultVisible: false }
])

// The renderer's image axes are opposite the game's default 45-degree camera
// basis, so the complete map needs the equivalent 135-degree view rotation.
export const DST_DEFAULT_MAP_ROTATION = 3 * Math.PI / 4
export const DST_MAP_ROTATION_STEP = Math.PI / 4

const categoryOrder = new Map(WORLD_MAP_CATEGORIES.map((category, index) => [category.id, index]))

export function normalizeMapRotation(rotation) {
  const fullTurn = 2 * Math.PI
  let normalized = Number(rotation) % fullTurn
  if (!Number.isFinite(normalized)) return DST_DEFAULT_MAP_ROTATION
  if (normalized > Math.PI) normalized -= fullTurn
  if (normalized <= -Math.PI) normalized += fullTurn
  return normalized
}

export function mapFitState(width, height, rotation, viewport, padding = [24, 24, 24, 24]) {
  const imageWidth = Number(width)
  const imageHeight = Number(height)
  const viewportWidth = Number(viewport?.[0])
  const viewportHeight = Number(viewport?.[1])
  if (![imageWidth, imageHeight, viewportWidth, viewportHeight].every(value => Number.isFinite(value) && value > 0)) {
    return null
  }

  const inset = Array.from({ length: 4 }, (_, index) => Math.max(0, Number(padding?.[index]) || 0))
  const availableWidth = Math.max(1, viewportWidth - inset[1] - inset[3])
  const availableHeight = Math.max(1, viewportHeight - inset[0] - inset[2])
  const angle = normalizeMapRotation(rotation)
  const cosine = Math.abs(Math.cos(angle))
  const sine = Math.abs(Math.sin(angle))
  const rotatedWidth = imageWidth * cosine + imageHeight * sine
  const rotatedHeight = imageWidth * sine + imageHeight * cosine

  return {
    center: [imageWidth / 2, imageHeight / 2],
    resolution: Math.max(rotatedWidth / availableWidth, rotatedHeight / availableHeight)
  }
}

export function mapIconPresentation(category, zoom, selected = false) {
  const normalizedCategory = categoryOrder.has(category) ? category : 'other'
  const normalizedZoom = Number.isFinite(Number(zoom)) ? Number(zoom) : 0
  if (selected) return { visible: true, size: 38 }
  if (normalizedCategory === 'resource' && normalizedZoom < 3) return { visible: false, size: 0 }
  if (normalizedCategory === 'other' && normalizedZoom < 4) return { visible: false, size: 0 }
  if (normalizedZoom < 1.75) {
    return { visible: true, size: ['spawnPoint', 'player'].includes(normalizedCategory) ? 24 : 18 }
  }
  if (normalizedZoom < 3.5) return { visible: true, size: 24 }
  return { visible: true, size: 32 }
}

export function normalizeFeatureCategories(categories) {
  if (!Array.isArray(categories)) return []
  return [...new Set(categories)]
    .filter(category => categoryOrder.has(category))
    .sort((left, right) => categoryOrder.get(left) - categoryOrder.get(right))
}

export function defaultFeatureCategories() {
  return WORLD_MAP_CATEGORIES.filter(category => category.defaultVisible).map(category => category.id)
}

export function mapFeatureCounts(features) {
  const counts = Object.fromEntries(WORLD_MAP_CATEGORIES.map(category => [category.id, 0]))
  for (const feature of Array.isArray(features) ? features : []) {
    const category = categoryOrder.has(feature?.category) ? feature.category : 'other'
    counts[category] += 1
  }
  return counts
}

export function searchMapFeatures(features, query, limit = 80) {
  const needle = String(query || '').trim().toLocaleLowerCase()
  if (!needle) return []
  const result = []
  for (const feature of Array.isArray(features) ? features : []) {
    const prefab = String(feature?.prefab || '')
    const id = String(feature?.id || '')
    if (!prefab.toLocaleLowerCase().includes(needle) && !id.toLocaleLowerCase().includes(needle)) continue
    result.push(feature)
    if (result.length >= Math.max(1, Number(limit) || 80)) break
  }
  return result
}

export function mapLayerLabel(layer) {
  return WORLD_MAP_LAYERS.find(item => item.id === layer)?.id || layer
}

export function mapStatusMeta(status) {
  return {
    running: { label: '生成中', variant: 'secondary' },
    succeeded: { label: '可用', variant: 'default' },
    failed: { label: '失败', variant: 'destructive' }
  }[status] || { label: status || '未知', variant: 'outline' }
}

export function mapStageLabel(stage) {
  return {
    snapshot: '复制快照',
    renderer: '渲染',
    staging: '准备目录',
    validate: '校验图片',
    publish: '发布',
    interrupted: '服务中断',
    complete: '完成'
  }[stage] || stage || '--'
}

export function formatMapBytes(value) {
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes < 0) return '--'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let size = bytes
  let unit = -1
  do {
    size /= 1024
    unit += 1
  } while (size >= 1024 && unit < units.length - 1)
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unit]}`
}

export function formatMapTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '--' : date.toLocaleString('zh-CN', { hour12: false })
}

export function mapJobFailure(job) {
  const failed = (job?.targets || []).find(target => target.status === 'failed')
  return failed?.error?.message || job?.error?.message || '地图生成任务未成功完成'
}

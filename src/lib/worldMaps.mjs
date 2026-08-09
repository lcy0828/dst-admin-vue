export const WORLD_MAP_LAYERS = Object.freeze([
  { id: 'terrain', label: '地形' },
  { id: 'walrusCamps', label: '海象营地' },
  { id: 'spawnPoints', label: '出生点' },
  { id: 'players', label: '玩家' },
  { id: 'worldState', label: '世界状态' }
])

const layerOrder = new Map(WORLD_MAP_LAYERS.map((layer, index) => [layer.id, index]))

export function normalizeMapLayers(layers) {
  if (!Array.isArray(layers)) return []
  return [...new Set(layers)]
    .filter(layer => layerOrder.has(layer))
    .sort((left, right) => layerOrder.get(left) - layerOrder.get(right))
}

export function mapLayerLabel(layer) {
  return WORLD_MAP_LAYERS.find(item => item.id === layer)?.label || layer
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

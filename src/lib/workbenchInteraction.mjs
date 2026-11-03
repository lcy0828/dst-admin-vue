// Fixed protocol metadata only; the server owns all execution and authorization.
export function workbenchInteraction(command, values = {}) {
  const row = (command?.actions || []).find(action => Object.keys(action.parameters || {}).length && Object.entries(action.parameters).every(([key, value]) => values[key] === value))
  const flow = row?.interaction || command?.interaction
  if (flow) return Object.keys(flow).sort().join(',') === 'effectVersion,kind,resultVersion' && flow.kind === 'preview-confirm-v1' && [1, 2].includes(flow.resultVersion) && typeof flow.effectVersion === 'string' && flow.effectVersion.length >= 1 && flow.effectVersion.length <= 32 ? flow : { unsupported: true }
  // Compatibility with released servers without interaction metadata.
  if (command?.id === 'act_nearby_entities' && !command.actions?.some(action => action.interaction) && ['extinguish', 'freeze', 'sleep', 'pacify', 'delete', 'kill'].includes(values.action)) return { kind: 'preview-confirm-v1', resultVersion: 1 }
  return null
}

export function batchPreview(run, started, interaction) {
  const batch = run?.batch
  if (run?.status !== 'succeeded' || run.executionOutcome !== 'confirmed' || batch?.state !== 'preview' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(batch.previewId || '')) return null
  const version = batch.version || 1
  if (interaction?.resultVersion !== version || !Number.isInteger(batch.matched) || batch.matched < 1 || batch.matched > 40) return null
  const seconds = version === 2 ? batch.expiresAt - batch.observedAt : batch.expiresIn
  if (seconds !== 30 || (version === 2 && (!Number.isSafeInteger(batch.expiresAt) || !Number.isSafeInteger(batch.observedAt)))) return null
  return { id: batch.previewId, until: started + seconds * 1000 }
}

export const batchReason = (reason, english = false) => (english ? {
  CPU_BUDGET: 'Time limit reached', TARGET_CHANGED: 'Target changed', TARGET_UNAVAILABLE: 'Target unavailable',
  INVENTORY_FULL: 'Inventory full', INVENTORY_UNAVAILABLE: 'Inventory unavailable', MATERIAL_UNAVAILABLE: 'Fertilizer unavailable',
  EFFECT_UNCONFIRMED: 'Effect not confirmed', OUTPUT_UNCONFIRMED: 'Harvest output not confirmed', TRANSITION_PENDING: 'Transformation not confirmed',
  REBUILD_UNAVAILABLE: 'Rebuild unavailable', REBUILD_UNCONFIRMED: 'Rebuild not confirmed',
} : {
  CPU_BUDGET: '已达到本次处理时限', TARGET_CHANGED: '对象状态已变化', TARGET_UNAVAILABLE: '暂时无法核对对象',
  INVENTORY_FULL: '背包空间不足', INVENTORY_UNAVAILABLE: '无法读取背包', MATERIAL_UNAVAILABLE: '无法准备肥料',
  EFFECT_UNCONFIRMED: '效果待确认', OUTPUT_UNCONFIRMED: '收获物品的去向待确认', TRANSITION_PENDING: '变身结果待确认，暂停时需等待游戏继续',
  REBUILD_UNAVAILABLE: '暂时无法重建', REBUILD_UNCONFIRMED: '重建结果待确认',
})[reason] || (english ? 'Result needs checking' : '结果待核对')

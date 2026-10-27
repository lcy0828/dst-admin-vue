export const spawnAuditMessages = {
  'zh-CN': {
    spawnAudit: {
      title: '生成记录', origin: '执行时玩家位置', prefab: '生成对象', quantity: '数量', destination: '去向 / 实际落点',
      inventory: '已确认进入物品栏', unresolved: '去向未确认（可能已合并或被模组处理）', unknown: '位置未知',
      total: '本次记录到 {count} 个生成对象', partial: '生成记录不完整', unavailable: '没有可用的生成位置记录',
      incompleteHint: '仅展示这次命令回执中确认的记录；缺少记录不代表未生成，也不会自动重新执行。',
      omitted: '另有 {count} 个对象未包含在明细中。', positionHint: '坐标为记录时的位置，不代表当前位置；实体标识不能跨重启使用。',
    },
  },
  'en-US': {
    spawnAudit: {
      title: 'Spawn records', origin: 'Player position at execution', prefab: 'Spawned object', quantity: 'Quantity', destination: 'Destination / observed position',
      inventory: 'Confirmed in an inventory', unresolved: 'Destination unconfirmed (possibly merged or handled by a mod)', unknown: 'Position unknown',
      total: '{count} spawned objects recorded', partial: 'Spawn records are incomplete', unavailable: 'No spawn position records available',
      incompleteHint: 'Only evidence captured in this command receipt is shown. Missing records do not mean nothing spawned. The command will not be replayed automatically.',
      omitted: '{count} additional objects are missing from the details.', positionHint: 'Coordinates describe the observation time, not the current position. Entity identifiers do not survive a world restart.',
    },
  },
}

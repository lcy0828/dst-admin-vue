export const inventoryMessages = {
  'zh-CN': { inventory: {
    title: '玩家背包', view: '查看背包', byId: '按玩家 ID 查询', playerId: '玩家 ID', room: '房间',
    auto: '自动选择', live: '在线实时', save: '存档快照', source: '数据来源', refresh: '刷新', read: '读取背包',
    loading: '正在确认玩家位置并读取物品…', refreshing: '正在更新，以下仍为上次读取结果',
    search: '搜索物品名称或 prefab', equipment: '装备', items: '物品栏', active: '鼠标手持',
    empty: '未发现携带物品', emptyDescription: '已完整读取支持的装备、物品栏和手持槽。', noMatch: '已读取内容中没有匹配物品', noItems: '没有物品',
    snapshotHint: '存档只包含最近落盘的数据，可能与当前状态不同。文件时间不代表下线时间。',
    partial: '部分内容尚未读取', partialHint: '结果达到读取边界或含不支持的数据；未显示的内容不能视为空。搜索仅覆盖已读取内容。',
    coverage: '支持标准物品与容器组件；模组私有存储可能不包含在结果中。', captured: '读取于 {time}', modified: '文件时间 {time}', unknownTime: '时间未知',
    choose: '选择存档来源', candidate: '{world} · {time} · #{index}', unknownWorld: '未知世界', details: '读取详情', slotCount: '{count} 个槽位', slot: '槽位 {slot}', contents: '容器内 {count} 项',
    unreadContents: '部分内容未读取', metrics: { perishable: '保鲜', fuel: '燃料', armor: '护甲', uses: '次数' },
    errors: {
      SOURCE_AMBIGUOUS: '发现多个存档来源，请选择要查看的世界或来源。',
      PLAYER_LOCATION_UNCERTAIN: '暂时无法确定玩家所在世界，可能正在迁移。可重新读取或切换到存档快照。',
      PLAYER_NOT_READY: '玩家正在加载或选择角色，暂时没有可读取的背包。', PLAYER_NOT_ONLINE: '玩家未在该世界中，可切换到存档快照。',
      PLAYER_SNAPSHOT_NOT_FOUND: '当前世界尚未找到该玩家的存档，不能据此判断背包为空。',
      INVENTORY_CAPABILITY_UNAVAILABLE: '运行节点或游戏采集模块尚不支持背包查询，请更新后重试；存档快照可独立读取。',
      TARGET_OFFLINE: '运行节点当前离线，无法读取。', INVENTORY_TIMEOUT: '读取超时，请稍后手动重试。', INVENTORY_BUSY: '该世界正在处理读取请求，请稍后重试。',
      SAVE_CHANGED: '存档在读取时发生变化，请重试。', SAVE_INVALID: '存档内容无效或无法安全读取。', SAVE_FORMAT_UNSUPPORTED: '当前玩家存档格式暂不支持。',
      SAVE_LIMIT_EXCEEDED: '该存档超过读取限制。', ID_MAPPING_UNSUPPORTED: '停服时暂无法定位这种格式的玩家 ID。', INVALID_PLAYER_ID: '请输入有效的 KU_ 玩家 ID。', unknown: '读取失败，请重试或查看读取详情。'
    }
  } },
  'en-US': { inventory: {
    title: 'Player inventory', view: 'View inventory', byId: 'Look up player ID', playerId: 'Player ID', room: 'Room',
    auto: 'Automatic', live: 'Live inventory', save: 'Saved snapshot', source: 'Data source', refresh: 'Refresh', read: 'Read inventory',
    loading: 'Locating the player and reading items…', refreshing: 'Updating; the previous result remains visible', search: 'Search item name or prefab',
    equipment: 'Equipment', items: 'Inventory', active: 'Held item', empty: 'No carried items found', emptyDescription: 'All supported equipment, inventory and held-item sections were read.',
    noMatch: 'No matching items in the available result', noItems: 'No items', snapshotHint: 'This is the latest persisted snapshot. It may differ from current state. File time is not a logout time.',
    partial: 'Some contents were not read', partialHint: 'A read limit or unsupported data was encountered. Missing content is not empty. Search covers the returned items only.',
    coverage: 'Standard item and container components are supported. Private Mod storage may not be included.', captured: 'Read at {time}', modified: 'File time {time}', unknownTime: 'Time unknown',
    choose: 'Choose a snapshot source', candidate: '{world} · {time} · #{index}', unknownWorld: 'Unknown world', details: 'Read details', slotCount: '{count} slots', slot: 'Slot {slot}', contents: '{count} contained items',
    unreadContents: 'Some contents were not read', metrics: { perishable: 'Freshness', fuel: 'Fuel', armor: 'Armor', uses: 'Uses' },
    errors: {
      SOURCE_AMBIGUOUS: 'Multiple saved sources were found. Choose a world or source.', PLAYER_LOCATION_UNCERTAIN: 'The player location is uncertain, possibly during migration. Retry or select a saved snapshot.',
      PLAYER_NOT_READY: 'The player is loading or choosing a character. Inventory is not ready.', PLAYER_NOT_ONLINE: 'The player is not in this world. Try a saved snapshot.',
      PLAYER_SNAPSHOT_NOT_FOUND: 'No player snapshot was found in the selected worlds. This does not mean their inventory is empty.',
      INVENTORY_CAPABILITY_UNAVAILABLE: 'Update the execution node or game Runtime to read inventories. Saved snapshots can be read independently.',
      TARGET_OFFLINE: 'The execution node is offline.', INVENTORY_TIMEOUT: 'The read timed out. Retry manually.', INVENTORY_BUSY: 'The world is handling another read. Try again shortly.',
      SAVE_CHANGED: 'The save changed during the read. Retry.', SAVE_INVALID: 'The save is invalid or cannot be read safely.', SAVE_FORMAT_UNSUPPORTED: 'This player save format is not supported.',
      SAVE_LIMIT_EXCEEDED: 'The save exceeds the read limits.', ID_MAPPING_UNSUPPORTED: 'This player ID format cannot be located while the world is stopped.',
      INVALID_PLAYER_ID: 'Enter a valid KU_ player ID.', unknown: 'The read failed. Retry or inspect the read details.'
    }
  } }
}

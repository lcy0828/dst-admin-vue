export const recoveryMessages = {
  'zh-CN': {
    recovery: {
      rooms: { title: '房间回收站', description: '恢复误删房间，或永久清理不再需要的数据。恢复后房间会重新接管。' },
      worlds: { title: '世界回收站', description: '按房间查看已删除世界。恢复世界前，房间内所有分片必须停止。' },
      open: '回收站',
      selectRoom: '选择房间',
      selectRoomPlaceholder: '请选择房间',
      columns: { name: '名称', directory: '原目录', deletedAt: '删除时间', recoveryName: '回收项', actions: '操作' },
      actions: { restore: '恢复', purge: '永久清理', cancelPurge: '取消清理', confirmPurge: '确认永久清理' },
      empty: '回收站为空',
      emptyDescription: '删除的内容会先保留在这里。',
      loading: '正在读取回收站',
      loadFailed: '回收站读取失败：{error}',
      restoreSucceeded: '已恢复 {name}',
      restoreFailed: '恢复失败：{error}',
      purgeSucceeded: '已永久清理 {name}',
      purgeFailed: '永久清理失败：{error}',
      purgeTitle: '永久清理回收项',
      purgeDescription: '此操作无法撤销。请输入完整回收项名称以确认。',
      confirmation: '完整回收项名称',
      confirmationMismatch: '回收项名称不一致',
      deleteLocation: '恢复位置：{path}'
    }
  },
  'en-US': {
    recovery: {
      rooms: { title: 'Room Recycle Bin', description: 'Restore deleted rooms or permanently remove data you no longer need. Restored rooms are adopted automatically.' },
      worlds: { title: 'World Recycle Bin', description: 'Inspect deleted worlds by room. Every shard in the room must be stopped before restoring a world.' },
      open: 'Recycle Bin',
      selectRoom: 'Room',
      selectRoomPlaceholder: 'Select a room',
      columns: { name: 'Name', directory: 'Original Directory', deletedAt: 'Deleted At', recoveryName: 'Recovery Item', actions: 'Actions' },
      actions: { restore: 'Restore', purge: 'Permanently Delete', cancelPurge: 'Cancel', confirmPurge: 'Permanently Delete' },
      empty: 'Recycle bin is empty',
      emptyDescription: 'Deleted content is retained here first.',
      loading: 'Loading recycle bin',
      loadFailed: 'Failed to load recycle bin: {error}',
      restoreSucceeded: 'Restored {name}',
      restoreFailed: 'Restore failed: {error}',
      purgeSucceeded: 'Permanently deleted {name}',
      purgeFailed: 'Permanent deletion failed: {error}',
      purgeTitle: 'Permanently Delete Recovery Item',
      purgeDescription: 'This action cannot be undone. Enter the complete recovery item name to confirm.',
      confirmation: 'Complete recovery item name',
      confirmationMismatch: 'Recovery item name does not match',
      deleteLocation: 'Recovery location: {path}'
    }
  }
}

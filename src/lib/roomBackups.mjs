// A room can contain existing ZIP backups and coordinated backup sets. Keep
// their identity through every action so legacy screens can use both formats.
export function createRoomBackupsAPI(legacy, sets) {
  const apiFor = backup => backup.source === 'legacy' ? legacy : sets
  return {
    async list(roomId) {
      const [old, current] = await Promise.all([legacy.list(roomId), sets.list(roomId)])
      const items = [
        ...(old.items || []).map(item => ({ ...item, source: 'legacy', restorable: item.status === 'verified' })),
        ...(current.items || []).map(item => ({ ...item, source: 'set' }))
      ].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      return { items, total: items.length }
    },
    create: (roomId, name = '') => sets.create(roomId, name, 'automatic'),
    restore: (backup, confirmation) => apiFor(backup).restore(backup.id, confirmation),
    delete: backup => apiFor(backup).delete(backup.id, backup.name),
    downloadURL: backup => apiFor(backup).downloadURL(backup.id)
  }
}

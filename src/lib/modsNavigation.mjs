export function resolveModsActiveTab(query = {}, { hasRooms = true } = {}) {
  const explicitTab = String(query.tab || '').trim()
  if (explicitTab === 'room' || explicitTab === 'workshop' || explicitTab === 'catalog') {
    return explicitTab
  }
  if (
    query.source === 'runtime' ||
    ['downloaded', 'updates'].includes(String(query.scope || '').trim())
  ) {
    return 'catalog'
  }
  if (String(query.roomId || '').trim()) {
    return 'room'
  }
  return hasRooms ? 'room' : 'workshop'
}

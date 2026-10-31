// Display names never determine existing room paths or IDs.
export function newRoomDirectoryName() {
  const suffix = globalThis.crypto?.randomUUID?.().replaceAll('-', '').slice(0, 16)
    || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  return `room_${suffix}`
}

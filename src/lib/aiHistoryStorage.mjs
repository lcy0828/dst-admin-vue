const MAX_BYTES = 512 * 1024
const prefix = 'dst-admin-ai-chat-v1:'
const files = items => (Array.isArray(items) ? items : []).slice(0, 8).filter(item => typeof item?.id === 'string' && /^[a-f0-9-]{36}$/.test(item.id)).map(item => ({ id: item.id, name: String(item.name || '').slice(0, 255), size: Number(item.size) || 0, createdAt: item.createdAt }))

function snapshot(value) {
  const messages = (Array.isArray(value?.messages) ? value.messages : []).slice(-32)
    .filter(message => ['user', 'assistant'].includes(message?.role) && typeof message.content === 'string')
    .map(message => ({
      role: message.role, content: message.content.slice(0, 32768),
      attachments: files(message.attachments),
      privateInputs: files(message.privateInputs),
      calls: (Array.isArray(message.calls) ? message.calls : []).slice(-12).map(call => {
        const data = JSON.stringify(call.data ?? null)
        return {
          callId: typeof call.callId === 'string' ? call.callId.slice(0, 64) : undefined,
          tool: String(call.tool || '').slice(0, 64), status: String(call.status || '').slice(0, 32),
          data: data.length <= 8192 ? call.data : { _aiTruncated: true, excerpt: data.slice(0, 4096), tail: data.slice(-2048) }
        }
      })
    }))
  return {
    version: 1, selectedRoom: typeof value?.selectedRoom === 'string' ? value.selectedRoom.slice(0, 255) : 'all',
    draft: typeof value?.draft === 'string' ? value.draft.slice(0, 8192) : '', attachments: files(value?.attachments), privateInputs: files(value?.privateInputs), messages, interrupted: value?.busy === true || value?.interrupted === true
  }
}

export function createAIHistoryStorage({ getUser, storage }) {
  let key = '', generation = 0
  return {
    async load() {
      const epoch = generation
      const user = await getUser()
      if (epoch !== generation || !user?.username) return null
      key = prefix + encodeURIComponent(`${user.id ?? ''}:${user.username}`)
      const raw = storage.getItem(key)
      if (!raw || raw.length > MAX_BYTES) return null
      try { const value = JSON.parse(raw); return value.version === 1 ? snapshot(value) : null } catch { return null }
    },
    save(value) {
      if (!key) return
      const data = snapshot(value)
      let encoded = JSON.stringify(data)
      // Retain the latest conversation and receipts without exhausting browser storage.
      while (new TextEncoder().encode(encoded).length > MAX_BYTES && data.messages.length > 2) {
        data.messages.splice(0, 2); encoded = JSON.stringify(data)
      }
      if (new TextEncoder().encode(encoded).length > MAX_BYTES) {
        for (const message of data.messages) for (const call of message.calls) call.data = { _aiTruncated: true }
        encoded = JSON.stringify(data)
      }
      storage.setItem(key, encoded)
    },
    release() { generation++; key = '' }
  }
}

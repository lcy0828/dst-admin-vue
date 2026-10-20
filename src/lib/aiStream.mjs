// Send only text history, within the server's message and UTF-8 byte budgets.
export function aiConversation(messages) {
  const encoder = new TextEncoder()
  const result = []
  let bytes = 0
  for (const message of [...messages].reverse()) {
    if (!message.content || !['user', 'assistant'].includes(message.role)) continue
    const size = encoder.encode(message.content).length
    if (size > 8192 || bytes + size > 48 * 1024 || result.length === 16) break
    const files = message.role === 'user' ? message.attachments?.map(file => file.id).filter(Boolean).slice(0, 8) : null
    const privateInputs = message.role === 'user' ? message.privateInputs?.map(input => input.id).filter(Boolean).slice(0, 8) : null
    result.unshift({ role: message.role, content: message.content, ...(files?.length ? { files } : {}), ...(privateInputs?.length ? { privateInputs } : {}) })
    bytes += size
  }
  return result
}

// Decode bounded SSE frames across arbitrary UTF-8/network chunk boundaries.
export async function readAIEvents(response, onEvent = () => {}) {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('AI_STREAM_UNAVAILABLE')
  const decoder = new TextDecoder()
  let buffer = ''
  let result = null
  const consume = () => {
    let end
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)
      const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
      if (!data) continue
      const event = JSON.parse(data)
      onEvent(event)
      if (event.type === 'error') throw new Error(event.error || 'AI_REQUEST_FAILED')
      if (event.type === 'complete') result = event.result
    }
  }
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      if (buffer.length > 256 * 1024) throw new Error('AI_STREAM_TOO_LARGE')
      consume()
    }
    buffer += decoder.decode()
    consume()
    if (!result) throw new Error('AI_STREAM_INTERRUPTED')
    return result
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

import assert from 'node:assert/strict'
import test from 'node:test'
import { aiConversation, readAIEvents } from '../src/lib/aiStream.mjs'

function stream(text, chunks = [1, 2, 3, 7]) {
  const data = new TextEncoder().encode(text)
  return { body: new ReadableStream({
    start(controller) {
      let i = 0, n = 0
      while (i < data.length) { const size = chunks[n++ % chunks.length]; controller.enqueue(data.slice(i, i + size)); i += size }
      controller.close()
    }
  }) }
}

test('AI SSE preserves Chinese UTF-8 across arbitrary chunks and retains receipts', async () => {
  const events = []
  const response = await readAIEvents(stream('data: {"type":"thinking"}\n\ndata: {"type":"result","call":{"callId":"exact-call","status":"succeeded"}}\n\ndata: {"type":"complete","result":{"content":"已返回真实结果","calls":[]}}\n\n'), event => events.push(event))
  assert.equal(response.content, '已返回真实结果')
  assert.equal(events[1].call.callId, 'exact-call')
  assert.equal(events.length, 3)
})

test('AI SSE rejects interrupted and error streams instead of showing success', async () => {
  await assert.rejects(() => readAIEvents(stream('data: {"type":"thinking"}\n\n')), /AI_STREAM_INTERRUPTED/)
  await assert.rejects(() => readAIEvents(stream('data: {"type":"error","error":"AI_BUSY"}\n\n')), /AI_BUSY/)
  await assert.rejects(() => readAIEvents(stream('data: broken\n\n')), SyntaxError)
  await assert.rejects(() => readAIEvents(stream('x'.repeat(256 * 1024 + 1), [270000])), /AI_STREAM_TOO_LARGE/)
})

test('AI conversation includes only bounded text with the newest user message', () => {
  const history = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'user' : 'assistant', content: 'a'.repeat(5000), calls: ['private-tool-object'] }))
  const result = aiConversation(history)
  assert.equal(result.at(-1).role, 'user')
  assert.ok(result.length <= 16)
  assert.ok(result.reduce((sum, message) => sum + new TextEncoder().encode(message.content).length, 0) <= 48 * 1024)
  assert.ok(result.every(message => !('calls' in message)))
  assert.deepEqual(aiConversation([{ role: 'assistant', content: '长'.repeat(3000) }, { role: 'user', content: '继续' }]), [{ role: 'user', content: '继续' }])
})

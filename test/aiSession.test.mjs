import test from 'node:test'
import assert from 'node:assert/strict'
import { createAISession } from '../src/lib/aiSession.mjs'

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function setup(overrides = {}) {
  const counts = { status: 0, rooms: 0, chat: 0, history: 0 }
  const api = {
    async status() { counts.status++; return { config: { enabled: true, endpoint: 'https://example.com/v1', model: 'model' }, tools: [], mcpPath: '/mcp' } },
    async history() { counts.history++; return { items: [] } },
    async chat(input) { counts.chat++; return { content: 'actual result for ' + input.roomId } },
    ...overrides
  }
  const session = createAISession({ api, roomsAPI: { async controlPlaneList() { counts.rooms++; return { items: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] } } }, t: key => key, locale: () => 'zh-CN' })
  return { session, counts }
}

test('global AI is lazy, deduplicates opening loads, and does not load history until requested', async () => {
  const { session, counts } = setup()
  assert.deepEqual(counts, { status: 0, rooms: 0, chat: 0, history: 0 })
  await Promise.all([session.load({ roomId: 'a' }), session.load({ roomId: 'a' })])
  assert.equal(session.selectedRoom.value, 'a')
  assert.deepEqual(counts, { status: 1, rooms: 1, chat: 0, history: 0 })
  await session.load()
  assert.equal(counts.status, 1)
})

test('closing and navigating preserves drafts, context, pending operations and captured receipts', async () => {
  const done = deferred()
  let input, options
  const { session } = setup({ chat: async (body, opts) => { input = body; options = opts; return done.promise } })
  await session.load({ roomId: 'a' })
  session.draft.value = 'save this room'
  await session.load({ roomId: 'b' })
  assert.equal(session.selectedRoom.value, 'a')
  const sending = session.send()
  session.open.value = false
  await session.load({ roomId: 'b' })
  assert.equal(session.selectedRoom.value, 'a')
  session.selectRoom('b')
  assert.equal(session.selectedRoom.value, 'a')
  assert.equal(options.signal.aborted, false)
  options.onEvent({ type: 'result', tool: 'room_control', call: { callId: 'receipt-1', status: 'succeeded', data: { id: 'job-1' } } })
  done.resolve({ content: 'submitted save job-1' })
  await sending
  assert.equal(input.roomId, 'a')
  assert.equal(session.messages.value.at(-1).calls[0].callId, 'receipt-1')
  assert.equal(session.messages.value.at(-1).content, 'submitted save job-1')
  session.open.value = true
  assert.equal(session.messages.value.length, 2)
})

test('full-page and floating sends cannot create duplicate requests; room switching is explicit', async () => {
  const done = deferred()
  let requests = 0
  const { session } = setup({ chat: async () => { requests++; return done.promise } })
  await session.load({ roomId: 'a' })
  session.draft.value = 'question'
  const first = session.send()
  await session.send()
  assert.equal(requests, 1)
  done.resolve({ content: 'result' }); await first
  await session.load({ roomId: 'b' })
  assert.equal(session.selectedRoom.value, 'a')
  session.selectRoom('b')
  assert.equal(session.selectedRoom.value, 'b')
  assert.equal(session.messages.value.length, 2)
  assert.equal(session.messages.value.at(-1).content, 'result')
})

test('logout clears state and rejects late SSE/results without repopulating the next session', async () => {
  const done = deferred()
  let options
  const { session, counts } = setup({ chat: async (_body, opts) => { options = opts; return done.promise } })
  await session.load({ roomId: 'a' })
  session.draft.value = 'question'; session.open.value = true
  const sending = session.send()
  session.reset()
  assert.equal(options.signal.aborted, true)
  options.onEvent({ type: 'result', call: { callId: 'old-session' } })
  done.resolve({ content: 'late answer' }); await sending
  assert.deepEqual(session.messages.value, [])
  assert.equal(session.initialized.value, false)
  assert.equal(session.open.value, false)
  assert.equal(session.busy.value, false)
  assert.equal(counts.history, 0)
})

test('logout during initialization cannot restore configuration from the old account', async () => {
  const done = deferred()
  const { session } = setup({ status: () => done.promise })
  const loading = session.load({ roomId: 'a' })
  session.reset()
  done.resolve({ config: { enabled: true, endpoint: 'private', model: 'old' }, tools: [] })
  await loading
  assert.equal(session.config.value.enabled, false)
  assert.equal(session.loading.value, false)
  assert.deepEqual(session.rooms.value, [])
})

test('failed initialization can be retried and stop preserves already captured tool evidence', async () => {
  let attempt = 0
  const { session } = setup({
    async status() { if (!attempt++) throw new Error('offline'); return { config: { enabled: true, endpoint: 'endpoint', model: 'model' } } },
    chat: async (_input, { signal, onEvent }) => {
      onEvent({ type: 'result', tool: 'room_status', call: { callId: 'receipt' } })
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true }))
    }
  })
  await session.load()
  assert.equal(session.error.value, 'offline')
  await session.load({ roomId: 'a', force: true })
  assert.ok(session.chatReady.value)
  session.draft.value = 'question'
  const sending = session.send(); session.stop(); await sending
  assert.equal(session.messages.value.at(-1).content, 'ai.stopped')
  assert.equal(session.messages.value.at(-1).calls[0].callId, 'receipt')
})

test('uploaded file references reach chat without binary contents and room changes retain the conversation', async () => {
  let submitted
  const file = { id: 'fef4a0c5-dad0-4046-bfca-64fb346dddfb', name: 'backup.zip', size: 123 }
  const { session } = setup({ upload: async () => file, chat: async input => { submitted = input; return { content: '请选择导入目标。' } } })
  await session.load({ roomId: 'a' })
  await session.upload({ name: 'backup.zip', size: 123 })
  assert.equal(session.attachments.value[0].id, file.id)
  await session.send()
  assert.deepEqual(submitted.messages.at(-1).files, [file.id])
  assert.equal(submitted.messages.at(-1).content, 'ai.attachedPrompt')
  assert.equal(session.attachments.value.length, 0)
  session.selectRoom('b')
  assert.equal(session.messages.value.length, 2)
  assert.equal(session.messages.value[0].attachments[0].name, 'backup.zip')
})

test('private values are replaced by references before chat and are never placed in history state', async () => {
  let submitted, stored
  const ref = { id: 'af9e61e0-006f-4ec7-ae56-ecc9c8c4c72c', name: 'Steam code' }
  const { session } = setup({ privateInput: async input => { stored = input; return ref }, chat: async input => { submitted = input; return { content: 'configured' } } })
  await session.load({ roomId: 'a' })
  assert.equal(await session.addPrivateInput('Steam code', 'ABCDE'), true)
  assert.equal(stored.value, 'ABCDE')
  session.draft.value = 'continue'
  await session.send()
  assert.deepEqual(submitted.messages.at(-1).privateInputs, [ref.id])
  assert.equal(JSON.stringify(submitted).includes('ABCDE'), false)
  assert.equal(JSON.stringify(session.messages.value).includes('ABCDE'), false)
})

test('provider failure retains operation receipts and explains that submitted tasks may continue', async () => {
  const { session } = setup({ chat: async (_body, { onEvent }) => {
    onEvent({ type: 'result', tool: 'api_runAutomationTask', call: { callId: 'submitted-backup', status: 'succeeded', data: { data: { id: 'job-1', status: 'queued' } } } })
    throw new Error('AI_PROVIDER_CONNECTION_FAILED')
  } })
  await session.load({ roomId: 'a' })
  session.draft.value = 'back up now'
  await session.send()
  assert.equal(session.error.value, 'ai.providerConnectionFailed')
  assert.equal(session.messages.value.at(-1).calls[0].callId, 'submitted-backup')
  assert.equal(session.messages.value.at(-1).content, 'ai.partialReply\n\nai.providerConnectionFailed')
})

test('provider quota rejection is shown as an actionable quota message', async () => {
  const { session } = setup({ chat: async () => { throw new Error('AI_PROVIDER_QUOTA_EXHAUSTED') } })
  await session.load({ roomId: 'a' })
  session.draft.value = 'question'
  await session.send()
  assert.equal(session.error.value, 'ai.providerQuotaExhausted')
  assert.equal(session.messages.value.at(-1).content, 'ai.providerQuotaExhausted')
})

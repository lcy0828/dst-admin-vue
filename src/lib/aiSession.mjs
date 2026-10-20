import { computed, reactive, toRefs } from 'vue'
import { aiConversation } from './aiStream.mjs'

const initial = () => ({
  open: false, initialized: false, loading: false, error: '', rooms: [], calls: [], tools: [],
  mcpPath: '/mcp', config: { revision: 'initial', enabled: false, endpoint: '', model: '', keyConfigured: false },
  selectedRoom: 'all', draft: '', attachments: [], privateInputs: [], uploading: false, uploadProgress: 0, messages: [], busy: false, activityLoading: false, phase: null, persistenceError: false
})

// Owned by the app, so route and panel unmounts cannot interrupt a conversation.
// All work is explicit; creating a session performs no requests or polling.
export function createAISession({ api, roomsAPI, t, locale, history }) {
  const state = reactive(initial())
  let generation = 0, pendingLoad = null, pendingHistory = null, controller = null, restored = false
  const chatReady = computed(() => state.initialized && state.config.enabled && state.config.endpoint && state.config.model)
  const phase = computed(() => state.phase?.summarizing ? t('ai.summarizing') : state.phase ? t('ai.thinking') : '')

  function persist() {
    if (!restored || !history) return
    try { history.save(state); state.persistenceError = false } catch { state.persistenceError = true }
  }

  function failureText(value) {
    const code = typeof value === 'string' ? value : value?.message || ''
    const keys = {
      AI_PROVIDER_QUOTA_EXHAUSTED: 'ai.providerQuotaExhausted',
      AI_PROVIDER_CONNECTION_FAILED: 'ai.providerConnectionFailed', AI_PROVIDER_TIMEOUT: 'ai.providerTimeout',
      AI_PROVIDER_HTTP_400: 'ai.providerInvalidRequest', AI_PROVIDER_HTTP_401: 'ai.providerRejected', AI_PROVIDER_HTTP_403: 'ai.providerRejected',
      AI_PROVIDER_HTTP_429: 'ai.providerBusy', AI_PROVIDER_HTTP_500: 'ai.providerUnavailable', AI_PROVIDER_HTTP_502: 'ai.providerUnavailable',
      AI_PROVIDER_HTTP_503: 'ai.providerUnavailable', AI_PROVIDER_HTTP_504: 'ai.providerUnavailable', AI_STREAM_INTERRUPTED: 'ai.replyInterrupted'
    }
    return keys[code] ? t(keys[code]) : code || t('ai.failure')
  }
  function fail(value) { state.error = failureText(value) }
  function clear() {
    if (state.busy || state.uploading) return
    state.messages = []; state.draft = ''; state.attachments = []; state.privateInputs = []; state.phase = null; state.error = ''
  }
  function selectRoom(value) {
    if (state.busy || state.uploading) return
    const id = String(value || 'all')
    if (id !== 'all' && !state.rooms.some(room => String(room.id) === id)) return
    state.selectedRoom = id
  }
  function adoptRoom(roomId) {
    // Navigation must not silently retarget a conversation or an unsent question.
    if (state.busy || state.uploading || state.attachments.length || state.privateInputs.length || state.messages.length || state.draft.trim()) return
    const match = state.rooms.find(room => String(room.id) === String(roomId))
    if (match) state.selectedRoom = String(match.id)
  }
  async function load({ roomId = '', force = false } = {}) {
    const epoch = generation
    if (!pendingLoad && (!state.initialized || force)) {
      state.loading = true; state.error = ''
      const task = (async () => {
        if (!restored) {
          try {
            const saved = await history?.load()
            if (epoch !== generation) return
            if (saved) {
              state.selectedRoom = saved.selectedRoom; state.draft = saved.draft; state.messages = saved.messages; state.attachments = saved.attachments || []; state.privateInputs = saved.privateInputs || []
              if (saved.interrupted) {
                const last = state.messages.at(-1)
                if (last?.role === 'assistant') last.content = [last.content, t('ai.interrupted')].filter(Boolean).join('\n\n')
                else state.messages.push({ role: 'assistant', content: t('ai.interrupted'), calls: [] })
              }
            }
          } catch { if (epoch === generation) state.persistenceError = true }
          if (epoch !== generation) return
          restored = true
        }
        const results = await Promise.allSettled([api.status(), roomsAPI.controlPlaneList({ all: true })])
        if (epoch !== generation) return
        if (results[0].status === 'fulfilled') {
          const data = results[0].value
          state.config = data.config; state.tools = data.tools || []; state.mcpPath = data.mcpPath || '/mcp'
        } else fail(results[0].reason)
        if (results[1].status === 'fulfilled') {
          state.rooms = results[1].value.items || []
          if (!state.busy && !state.messages.length && !state.draft.trim() && !state.rooms.some(room => String(room.id) === state.selectedRoom)) {
            state.selectedRoom = state.rooms.length === 1 ? String(state.rooms[0].id) : 'all'
          }
        } else fail(results[1].reason)
        state.initialized = results.every(result => result.status === 'fulfilled')
      })()
      pendingLoad = task
      task.finally(() => {
        if (epoch === generation) { state.loading = false; if (pendingLoad === task) pendingLoad = null }
      })
    }
    await pendingLoad
    if (epoch === generation) adoptRoom(roomId)
  }
  async function refreshCalls() {
    if (pendingHistory) return pendingHistory
    const epoch = generation
    state.activityLoading = true
    const task = (async () => {
      try {
        const data = await api.history()
        if (epoch === generation) state.calls = data.items || []
      } catch (value) { if (epoch === generation) fail(value) }
      finally { if (epoch === generation) { state.activityLoading = false; pendingHistory = null } }
    })()
    pendingHistory = task
    return task
  }
  async function send() {
    if (state.busy || state.uploading || (!state.draft.trim() && !state.attachments.length && !state.privateInputs.length) || !chatReady.value) return
    const content = state.draft.trim() || t('ai.attachedPrompt')
    if (new TextEncoder().encode(content).length > 8192) { fail(t('ai.messageTooLong')); return }
    const epoch = generation
    state.error = ''; state.draft = ''; state.messages.push({ role: 'user', content, attachments: [...state.attachments], privateInputs: [...state.privateInputs] }); state.attachments = []; state.privateInputs = []
    const input = aiConversation(state.messages)
    const callIds = state.messages.flatMap(message => message.calls || []).map(call => call.callId).filter(Boolean).slice(-16)
    const response = reactive({ role: 'assistant', content: '', calls: [] })
    state.messages.push(response)
    if (state.messages.length > 32) state.messages.splice(0, state.messages.length - 32)
    state.busy = true; state.phase = {}; controller = new AbortController()
    const activeController = controller
    try {
      const result = await api.chat({ messages: input, callIds, roomId: state.selectedRoom === 'all' ? '' : state.selectedRoom, locale: locale() }, {
        signal: activeController.signal,
        onEvent(event) {
          if (epoch !== generation) return
          if (event.type === 'thinking') state.phase = {}
          if (event.type === 'summarizing') state.phase = { summarizing: true }
          if (event.type === 'tool') state.phase = { tool: event.tool }
          if (event.type === 'result' && event.call) response.calls.push({ ...event.call, tool: event.tool })
          if (event.type === 'tool_error') response.calls.push({ tool: event.tool, status: 'failed', data: { error: event.error } })
        }
      })
      if (epoch === generation) response.content = result.content || t('ai.emptyReply')
    } catch (value) {
      if (epoch !== generation) return
      if (value.name === 'AbortError') response.content = t('ai.stopped')
      else {
        fail(value)
        response.content = response.calls.length ? t('ai.partialReply') + '\n\n' + failureText(value) : failureText(value)
      }
    } finally {
      if (epoch === generation) {
        state.busy = false; controller = null; state.phase = null
        await refreshCalls()
      }
    }
  }
  function saved(config) { state.config = config; state.error = '' }
  async function addPrivateInput(name, value) {
    if (state.busy || state.privateInputs.length >= 8) return false
    const epoch = generation
    try {
      const input = await api.privateInput({ name, value })
      if (epoch !== generation) return false
      state.privateInputs.push(input); persist(); return true
    } catch (cause) { if (epoch === generation) fail(cause); return false }
  }
  function removePrivateInput(id) { if (!state.busy) { state.privateInputs = state.privateInputs.filter(input => input.id !== id); persist() } }
  async function upload(file) {
    if (!file || state.uploading || state.busy || !chatReady.value) return
    if (state.attachments.length >= 8 || file.size > 2 * 1024 ** 3) { fail(t('ai.fileLimit')); return }
    const epoch = generation
    state.uploading = true; state.uploadProgress = 0; state.error = ''
    const activeController = new AbortController(); controller = activeController
    try {
      const item = await api.upload(file, event => { if (epoch === generation) state.uploadProgress = Math.min(100, Math.round((event.loaded / (event.total || file.size || 1)) * 100)) }, activeController.signal)
      if (epoch === generation) { state.attachments.push(item); persist() }
    } catch (value) { if (epoch === generation && !activeController.signal.aborted) fail(value) }
    finally { if (epoch === generation) { state.uploading = false; controller = null } }
  }
  async function removeAttachment(id) {
    if (state.busy || state.uploading) return
    try { await api.deleteAttachment(id); state.attachments = state.attachments.filter(file => file.id !== id); persist() }
    catch (value) { fail(value) }
  }
  function reset() {
    persist(); history?.release(); restored = false
    generation += 1; controller?.abort(); controller = null
    pendingLoad = null; pendingHistory = null
    Object.assign(state, initial())
  }
  return { ...toRefs(state), phase, chatReady, load, refreshCalls, send, clear, selectRoom, saved, fail, reset, persist, upload, removeAttachment, addPrivateInput, removePrivateInput, stop: () => controller?.abort() }
}

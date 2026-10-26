const activePhases = new Set(['downloading', 'verifying', 'restarting'])
export const softwareUpdateActive = operation => activePhases.has(operation?.phase)
export const softwareUpdateRetryable = error => !error?.status || error.status === 408 || error.status === 429 || error.status >= 500

// One shared controller: no release polling when idle, and one in-flight status
// request while an update is active. Kept framework-free to test reconnects.
export function createSoftwareUpdateController({ api, changed, reload, storage, now = Date.now, schedule = setTimeout, unschedule = clearTimeout }) {
  const state = { snapshot: null, loading: false, checking: false, acting: false, error: '', reconnecting: false, retrying: false }
  let timer, disposed = false, statusRequest, checkRequest, initialized = false, restartUntil = 0, retryUntil = 0, autoApplyFailed = false
  const key = 'dst-admin-software-operation'
  const readPending = () => { try { return storage?.getItem(key) || '' } catch { return '' } }
  const writePending = id => { try { if (id) storage?.setItem(key, id); else storage?.removeItem(key) } catch { /* storage may be disabled */ } }
  let pending = readPending()
  const emit = () => { if (!disposed) changed({ ...state }) }
  const stopTimer = () => { if (timer != null) unschedule(timer); timer = null }
  const fail = error => { state.error = error?.message || String(error); emit() }

  function poll() {
    stopTimer()
    if (restartUntil && now() >= restartUntil) {
      state.reconnecting = false; state.retrying = false
      state.error = 'SOFTWARE_RESTART_TIMEOUT'
      emit()
      return
    }
    if (retryUntil && now() >= retryUntil) {
      state.reconnecting = false; state.retrying = false
      state.error = 'SOFTWARE_CONNECTION_TIMEOUT'
      emit()
      return
    }
    if (!disposed && (softwareUpdateActive(state.snapshot?.operation) || state.reconnecting || state.retrying || state.snapshot?.supported && state.snapshot.ready === false)) {
      timer = schedule(() => { timer = null; void refresh() }, 1000)
    }
  }

  async function accept(snapshot) {
    if (disposed) return
    state.snapshot = snapshot
    const operation = snapshot?.operation
    state.reconnecting = false; state.retrying = false; retryUntil = 0
    if (snapshot?.supported && snapshot.ready === false && !restartUntil) restartUntil = now() + 120000
    if (snapshot?.ready && !softwareUpdateActive(operation)) restartUntil = 0
    if (operation?.phase === 'restarting' && !restartUntil) restartUntil = now() + 120000
    if (pending && operation?.id === pending && operation.phase === 'succeeded' && snapshot.current?.version === operation.version && snapshot.ready !== false) {
      pending = ''
      writePending('')
      stopTimer()
      emit()
      reload()
      return
    }
    if (operation?.phase === 'rolled_back' && pending === operation.id && snapshot.ready !== false) {
      pending = ''; writePending(''); stopTimer(); emit(); reload(); return
    }
    if (['failed', 'interrupted'].includes(operation?.phase) || operation?.phase === 'rolled_back' && snapshot.ready !== false) {
      if (operation.id === pending) { pending = ''; writePending('') }
      if (snapshot.ready !== false) restartUntil = 0
    }
    emit()
    if (operation?.phase === 'prepared' && operation.id === pending && !autoApplyFailed) await apply()
    if (!state.acting) poll()
  }

  function refresh() {
    if (statusRequest) return statusRequest
    state.loading = !state.snapshot
    emit()
    statusRequest = (async () => {
      try {
        const snapshot = await api.status()
        state.error = ''
        await accept(snapshot)
      } catch (error) {
        const tracking = pending || softwareUpdateActive(state.snapshot?.operation) || state.snapshot?.supported && state.snapshot.ready === false
        if (tracking && softwareUpdateRetryable(error)) {
          if (!restartUntil && !retryUntil) retryUntil = now() + 120000
          state.reconnecting = Boolean(restartUntil)
          state.retrying = !state.reconnecting
          state.error = ''
          poll()
        } else {
          state.reconnecting = false; state.retrying = false
          stopTimer()
          fail(error)
        }
      } finally { state.loading = false; statusRequest = null; emit() }
    })()
    return statusRequest
  }

  function check(force = false, source = '') {
    if (checkRequest) return checkRequest
    state.checking = true
    emit()
    checkRequest = (async () => {
      try { await accept(await api.check(force, source)); state.error = '' }
      catch (error) { fail(error) }
      finally { state.checking = false; checkRequest = null; emit() }
    })()
    return checkRequest
  }

  async function action(execute, restarting) {
    if (state.acting || disposed) return
    stopTimer()
    state.acting = true
    state.error = ''
    if (restarting) { restartUntil = now() + 120000; state.reconnecting = true }
    emit()
    try {
      const operation = await execute()
      pending = operation.id
      writePending(pending)
      state.snapshot = { ...state.snapshot, operation }
      autoApplyFailed = false
    } catch (error) {
      autoApplyFailed = true
      if (restarting && softwareUpdateRetryable(error)) {
        state.reconnecting = true
      } else {
        restartUntil = 0
        state.reconnecting = false
        fail(error)
      }
    } finally { state.acting = false; emit(); poll() }
  }

  async function apply() {
    const id = state.snapshot?.operation?.id
    if (!id || state.snapshot.operation.phase !== 'prepared') return
    // Record authorization before the request: the connection may drop after
    // the server accepted it but before the browser received the response.
    pending = id
    writePending(id)
    await action(() => api.apply(id), true)
  }

  return {
    state, refresh, check, apply,
    reconnect() { restartUntil = 0; retryUntil = 0; return refresh() },
    async initialize() {
      if (initialized) return
      initialized = true
      await refresh()
      if (!disposed && !softwareUpdateActive(state.snapshot?.operation) && !state.reconnecting && !state.retrying) await check()
    },
    update(version, source) { return action(() => api.update(version, source), false) },
    dispose() { disposed = true; stopTimer() }
  }
}

export function formatSoftwareBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  const units = ['B', 'KiB', 'MiB', 'GiB']
  let index = 0
  while (bytes >= 1024 && index < units.length - 1) { bytes /= 1024; index += 1 }
  return `${bytes.toFixed(index ? 1 : 0)} ${units[index]}`
}

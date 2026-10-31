const activePhases = new Set(['downloading', 'verifying', 'restarting'])
export const softwareUpdateActive = operation => activePhases.has(operation?.phase)
export const softwareUpdateRetryable = error => !error?.status || error.status === 408 || error.status === 429 || error.status >= 500

function compareVersions(left, right) {
  const parse = value => typeof value === 'string' && /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value) ? value.replace(/^v/, '').split('.').map(Number) : null
  const a = parse(left), b = parse(right)
  if (!a || !b || [...a, ...b].some(n => n > 4294967295)) return null
  for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return Math.sign(a[i] - b[i]) }
  return 0
}

export const softwareUpdateTargetAhead = (snapshot, version = snapshot?.operation?.version) => compareVersions(version, snapshot?.current?.version) === 1

// The newest available version stays reachable even when an older task remains
// in history. Shared by the Controller and selected-Agent panels.
export function softwareUpdateAction(snapshot) {
  if (!snapshot?.supported) return null
  const operation = snapshot.operation, latest = snapshot.check?.latest
  const prepared = operation?.phase === 'prepared' && softwareUpdateTargetAhead(snapshot)
  const resumable = ['failed', 'interrupted'].includes(operation?.phase) && softwareUpdateTargetAhead(snapshot)
  if (latest?.onlineUpdate && snapshot.check.hasUpdate && softwareUpdateTargetAhead(snapshot, latest.version) && (!(prepared || resumable) || compareVersions(latest.version, operation.version) === 1)) return { kind: 'update', version: latest.version }
  if (prepared) return { kind: 'apply', version: operation.version, operationId: operation.id }
  if (resumable) return { kind: 'resume', version: operation.version }
  return null
}

// One shared controller: no release polling when idle, and one in-flight status
// request while an update is active. Kept framework-free to test reconnects.
export function createSoftwareUpdateController({ api, changed, reload, storage, now = Date.now, schedule = setTimeout, unschedule = clearTimeout }) {
  const state = { snapshot: null, loading: false, checking: false, acting: false, canceling: false, error: '', reconnecting: false, retrying: false }
  let timer, disposed = false, statusRequest, checkRequest, initialized = false, restartUntil = 0, retryUntil = 0, autoApplyFailed = false
  const key = 'dst-admin-software-operation'
  const readPending = () => { try { return storage?.getItem(key) || '' } catch { return '' } }
  const writePending = id => { try { if (id) storage?.setItem(key, id); else storage?.removeItem(key) } catch { /* storage may be disabled */ } }
  let pending = readPending(), canceledId = ''
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
    if (snapshot?.operation?.id === canceledId && state.snapshot?.operation?.phase === 'canceled' && ['downloading', 'verifying', 'prepared'].includes(snapshot.operation.phase)) return
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
    if (['failed', 'interrupted', 'superseded', 'canceled'].includes(operation?.phase) || operation?.phase === 'prepared' && !softwareUpdateTargetAhead(snapshot) || operation?.phase === 'rolled_back' && snapshot.ready !== false) {
      if (operation.id === pending) { pending = ''; writePending('') }
      if (snapshot.ready !== false) restartUntil = 0
    }
    emit()
    if (operation?.phase === 'prepared' && snapshot.ready !== false && softwareUpdateTargetAhead(snapshot) && operation.id === pending && !autoApplyFailed && operation.id !== canceledId && !state.canceling) await apply()
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
        // A rejected apply may have invalidated a missing/corrupt prepared
        // package. Read its persisted result once so the UI offers a download.
        if (restarting) {
          try { await accept(await api.status()) } catch { /* Keep the actionable error. */ }
        }
      }
    } finally { state.acting = false; emit(); poll() }
  }

  async function apply(expectedId = state.snapshot?.operation?.id) {
    const id = state.snapshot?.operation?.id
    if (!id || id !== expectedId || id === canceledId || state.canceling || state.snapshot.ready === false || state.snapshot.operation.phase !== 'prepared' || !softwareUpdateTargetAhead(state.snapshot)) return
    // Record authorization before the request: the connection may drop after
    // the server accepted it but before the browser received the response.
    pending = id
    writePending(id)
    await action(() => api.apply(id), true)
  }

  return {
    state, refresh, check, apply,
    async cancel() {
      const operation = state.snapshot?.operation
      if (!operation?.id || !['downloading', 'verifying', 'prepared'].includes(operation.phase) || state.acting || state.canceling || state.reconnecting || disposed) return
      canceledId = operation.id
      pending = ''; writePending(''); autoApplyFailed = true
      state.canceling = true; state.error = ''; stopTimer(); emit()
      try {
        const result = await api.cancel(operation.id)
        if (!disposed) state.snapshot = { ...state.snapshot, operation: result }
      } catch (error) {
        if (!softwareUpdateRetryable(error)) canceledId = ''
        fail(error)
      }
      finally { state.canceling = false; emit(); if (!disposed) await refresh() }
    },
    reconnect() { restartUntil = 0; retryUntil = 0; return refresh() },
    async initialize() {
      if (initialized) return
      initialized = true
      await refresh()
      if (!disposed && !softwareUpdateActive(state.snapshot?.operation) && !state.reconnecting && !state.retrying) await check()
    },
    update(version, source) { canceledId = ''; return action(() => api.update(version, source), false) },
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

// Project the existing update stream into the common task dock; no new poller.
export function softwareUpdateTask(state, visibleId) {
  const operation = state.snapshot?.operation
  if (!operation?.id || operation.id !== visibleId) return null
  const phase = operation.phase
  const status = ['downloading', 'verifying', 'prepared', 'restarting'].includes(phase) ? 'running' : phase === 'succeeded' || phase === 'superseded' ? 'succeeded' : phase === 'canceled' ? 'canceled' : 'failed'
  return { id: `software:${operation.id}`, kind: 'software.update', softwarePhase: phase, status,
    createdAt: operation.startedAt, finishedAt: status === 'running' ? undefined : operation.updatedAt,
    message: operation.error || '', progressDetail: { phase: phase === 'downloading' ? 'downloading' : phase === 'restarting' || phase === 'prepared' ? 'applying' : 'checking' },
    transfer: { currentBytes: operation.downloadedBytes, totalBytes: operation.totalBytes, bytesPerSecond: operation.bytesPerSecond } }
}

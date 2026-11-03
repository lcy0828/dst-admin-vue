import { gameInstalledVersionStatus } from './gameInstalledVersion.mjs'

const copy = value => JSON.parse(JSON.stringify(value))
const finished = new Set(['succeeded', 'failed', 'abandoned'])
const scopeRequest = scope => scope?.kind === 'target' && scope.targetId ? { targetIds: [scope.targetId] } : {}
const scopeKey = scope => scopeRequest(scope).targetIds?.[0] || '*'
const belongs = (release, scope) => !scopeRequest(scope).targetIds ||
  release?.plan?.installations?.some(item => item.targetId === scope.targetId)

export function gameUpdateAvailability(installations, official) {
  const states = installations.map(item => gameInstalledVersionStatus(item, official))
  if (states.some(item => item.key === 'ready')) return 'available'
  if (states.length && states.every(item => item.key === 'upToDate')) return 'current'
  return 'unknown'
}

export function createGameUpdateController({ api, versionAPI, changed = () => {}, now = Date.now, submitted = () => {} }) {
  const state = {
    scope: {}, report: null, installations: [], overviewLoaded: false, loading: false,
    versionError: '', installationsError: '', checkedAt: 0,
    pending: [], records: [], pendingError: '', pendingLoading: false, activeJobs: [], accepted: null,
    open: false, preparing: false, submitting: false, plan: null, error: '',
    planChanged: false, previousPlan: null, uncertain: false, requestId: '',
    diagnostics: [], diagnosticsLoading: false, diagnosticsError: '',
    backupBeforeUpdate: true, stopDelaySeconds: 60,
    decisionReleaseId: '', decisionError: '', decisionUncertain: false, decisionUncertainReleaseId: ''
  }
  const releaseFlights = new Map()
  let disposed = false, overviewSequence = 0, dialogSequence = 0
  let overviewFlight = null, pendingFlight = null, request = null
  const emit = () => { if (!disposed) changed({ ...state }) }
  const currentPending = () => state.pending.find(item => belongs(item, state.scope)) || null
  const busy = () => currentPending() || state.accepted || state.activeJobs[0] || null

  function setScope(scope) {
    if (scopeKey(scope) === scopeKey(state.scope)) {
      state.scope = copy(scope || {})
      emit()
      return
    }
    overviewSequence++
    overviewFlight = null
    state.scope = copy(scope || {})
    state.installations = []
    state.overviewLoaded = false
    state.checkedAt = 0
    state.loading = false
    state.installationsError = ''
    close()
    state.plan = null
    emit()
  }

  function ensureOverview({ fresh = false } = {}) {
    if (disposed) return Promise.resolve()
    if (overviewFlight) return overviewFlight
    if (!fresh && state.overviewLoaded && now() - state.checkedAt < 30_000) return Promise.resolve()
    const sequence = ++overviewSequence
    const scope = copy(state.scope)
    state.loading = true
    emit()
    overviewFlight = (async () => {
      const [version, installed] = await Promise.allSettled([
        versionAPI.version({ fresh, lightweight: true }), api.installedVersions(scopeRequest(scope))
      ])
      if (disposed || sequence !== overviewSequence) return
      if (version.status === 'fulfilled') {
        if (version.value?.officialRelease) state.report = version.value
        state.versionError = version.value?.officialCheckError || (version.value?.officialRelease ? '' : 'Official release unavailable')
      } else state.versionError = version.reason?.message || 'Version check failed'
      if (installed.status === 'fulfilled') {
        state.installations = installed.value?.installations || []
        state.installationsError = ''
      } else state.installationsError = installed.reason?.message || 'Installation check failed'
      state.overviewLoaded = true
      state.checkedAt = now()
      state.loading = false
      overviewFlight = null
      emit()
    })()
    return overviewFlight
  }

  function refreshPending() {
    if (disposed) return Promise.resolve()
    if (pendingFlight) return pendingFlight
    state.pendingLoading = true
    emit()
    pendingFlight = (async () => {
      try {
        const items = []
        // Query unresolved records directly; recent history can hide old recovery.
        for (let offset = 0; offset < 1000; offset += 100) {
          const result = await api.list({ pending: true, limit: 100, offset })
          const page = result?.items || []
          items.push(...page.filter(item => !finished.has(item.stage)))
          if (offset + page.length >= Number(result?.total || 0)) break
          if (!page.length || offset === 900) throw new Error('Incomplete update status')
        }
        if (disposed) return
        state.pending = items
        for (const item of items) rememberRelease(item, false)
        state.pendingError = ''
        const accepted = state.accepted
        if (accepted) {
          const match = items.find(item => item.id === accepted.id || item.sourceJobId === accepted.id || item.currentJobId === accepted.id)
          if (match) state.accepted = null
          else {
            // The job can finish before the first list read. Its durable ID equals
            // the initial job ID, so read the record instead of assuming success.
            try {
              const release = await readRelease(accepted.releaseId || accepted.id)
              if (release?.id) rememberRelease(release, false)
            } catch { /* A queued job may not have a durable release yet. */ }
          }
        }
      } catch (error) {
        if (!disposed) state.pendingError = error?.message || 'Update status unavailable'
      } finally {
        if (!disposed) { state.pendingLoading = false; pendingFlight = null; emit() }
      }
    })()
    return pendingFlight
  }

  function readRelease(id) {
    if (releaseFlights.has(id)) return releaseFlights.get(id)
    const flight = Promise.resolve().then(() => api.get(id)).then(release => {
      if (!disposed) rememberRelease(release)
      return release
    }).finally(() => releaseFlights.delete(id))
    releaseFlights.set(id, flight)
    return flight
  }

  async function refreshProgress() {
    const records = state.pending.filter(item => !finished.has(item.stage) && item.stage !== 'recovery_required').slice(0, 4)
    if (records.length) await Promise.allSettled(records.map(item => readRelease(item.id)))
    else if (state.activeJobs.length || state.accepted) await refreshPending()
  }

  function setActiveJobs(jobs) {
    state.activeJobs = (jobs || []).filter(job => ['game.release', 'game.release.retry'].includes(job.kind) && ['queued', 'running'].includes(job.status))
    emit()
  }

  function rememberRelease(release, notify = true) {
    if (!release?.id || disposed) return
    state.records = [release, ...state.records.filter(item => item.id !== release.id)].slice(0, 20)
    state.pending = state.pending.filter(item => item.id !== release.id)
    if (!finished.has(release.stage)) state.pending.push(release)
    if (state.accepted && (release.id === state.accepted.id || release.sourceJobId === state.accepted.id || release.currentJobId === state.accepted.id)) state.accepted = null
    if (release.id === state.decisionUncertainReleaseId && release.nextAction !== 'backup_decision') {
      state.decisionUncertain = false
      state.decisionUncertainReleaseId = ''
    }
    if (notify) emit()
  }

  async function openUpdate(options = {}) {
    if (state.submitting || disposed) return
    if (state.open) return
    state.open = true
    state.plan = null
    state.error = ''
    state.planChanged = false
    state.previousPlan = null
    state.diagnostics = []
    state.diagnosticsError = ''
    state.diagnosticsLoading = false
    request = copy({ ...scopeRequest(state.scope), ...options, includeModDiagnostics: false })
    state.backupBeforeUpdate = request.policy?.skipBackup !== true
    state.stopDelaySeconds = request.policy?.stopDelaySeconds ?? 60
    emit()
    if (state.uncertain) { await refreshPending(); return }
    await prepare()
  }

  async function prepare({ changedPlan = false } = {}) {
    if (!state.open || state.submitting || state.uncertain || disposed) return
    const sequence = ++dialogSequence
    const previous = state.plan
    state.preparing = true
    state.plan = null
    state.error = ''
    state.diagnostics = []
    emit()
    await refreshPending()
    if (disposed || sequence !== dialogSequence || !state.open) return
    if (state.pendingError || busy()) {
      state.preparing = false
      emit()
      return
    }
    try {
      const plan = await api.preview(copy(request))
      if (disposed || sequence !== dialogSequence || !state.open) return
      state.plan = plan
      state.planChanged = changedPlan
      state.previousPlan = changedPlan ? previous : null
    } catch (error) {
      if (disposed || sequence !== dialogSequence) return
      state.error = error?.message || 'Update preflight failed'
    } finally {
      if (!disposed && sequence === dialogSequence) { state.preparing = false; emit() }
    }
  }

  function close() {
    if (state.submitting) return
    dialogSequence++
    state.open = false
    state.preparing = false
    state.diagnosticsLoading = false
    emit()
  }

  async function loadDiagnostics() {
    if (!state.plan || state.preparing || state.submitting || state.diagnosticsLoading || disposed) return
    const sequence = dialogSequence, hash = state.plan.planHash
    state.diagnosticsLoading = true
    state.diagnosticsError = ''
    emit()
    try {
      const result = await api.preview({ ...copy(request), includeModDiagnostics: true })
      if (disposed || sequence !== dialogSequence || !state.open) return
      if (result.planHash !== hash) {
        state.previousPlan = state.plan
        state.plan = result
        state.planChanged = true
      }
      state.diagnostics = result.modDiagnostics || []
    } catch (error) {
      if (!disposed && sequence === dialogSequence) state.diagnosticsError = error?.message || 'Diagnostics unavailable'
    } finally {
      if (!disposed && sequence === dialogSequence) { state.diagnosticsLoading = false; emit() }
    }
  }

  async function submit() {
    const plan = state.plan
    if (!state.open || state.preparing || state.submitting || state.uncertain || state.diagnosticsLoading ||
      !plan?.ready || !plan.updateRequired || !Number.isInteger(Number(state.stopDelaySeconds)) || Number(state.stopDelaySeconds) < 0 || Number(state.stopDelaySeconds) > 360 || state.stopDelaySeconds === '' || busy() || disposed) return
    state.submitting = true
    state.error = ''
    emit()
    const input = {
      ...copy(request), desiredVersion: plan.desiredVersion,
      policy: { ...copy(plan.policy), skipBackup: !state.backupBeforeUpdate, stopDelaySeconds: Number(state.stopDelaySeconds) },
      confirmed: true
    }
    delete input.includeModDiagnostics
    try {
      const job = await api.create(input)
      if (!job?.id) throw new Error('Update response has no job ID')
      if (disposed) return
      state.accepted = { ...job, plan: copy(plan) }
      state.open = false
      state.plan = null
      submitted(job)
    } catch (error) {
      if (disposed) return
      state.error = error?.message || 'Update submission failed'
      state.requestId = error?.requestId || ''
      if (['PLAN_CHANGED', 'DESIRED_VERSION_CHANGED', 'TOPOLOGY_CHANGED', 'PREVIEW_BLOCKED'].includes(error?.code)) {
        state.submitting = false
        await prepare({ changedPlan: true })
      } else if (!error?.status || error.status >= 500 || error.status === 408) {
        // A lost response is not proof that the server rejected the write.
        // Preserve this state across close/reopen and only reconcile via reads.
        state.uncertain = true
        state.plan = null
        await refreshPending()
      } else {
        state.plan = null
        await refreshPending()
      }
    } finally {
      if (!disposed) { state.submitting = false; emit() }
    }
  }

  function setOptions({ backupBeforeUpdate = state.backupBeforeUpdate, stopDelaySeconds = state.stopDelaySeconds }) {
    if (state.submitting) return
    state.backupBeforeUpdate = backupBeforeUpdate
    state.stopDelaySeconds = stopDelaySeconds
    emit()
  }

  async function resolveBackup(releaseId, action) {
    if (disposed || state.decisionReleaseId || state.decisionUncertain || state.accepted || state.activeJobs.length || !['retry', 'skip', 'cancel'].includes(action)) return
    state.decisionReleaseId = releaseId
    state.decisionError = ''
    emit()
    try {
      const input = action === 'retry' ? {} : { confirmed: true, ...(action === 'skip' ? { skipBackup: true } : { cancelUpdate: true }) }
      const job = await api.retry(releaseId, input)
      if (!job?.id) throw new Error('Update response has no job ID')
      if (disposed) return
      state.accepted = { ...job, releaseId }
      submitted(job)
      await readRelease(releaseId).catch(() => {})
    } catch (error) {
      if (disposed) return
      state.decisionError = error?.message || 'Update submission failed'
      if (!error?.status || error.status >= 500 || error.status === 408) {
        state.decisionUncertain = true
        state.decisionUncertainReleaseId = releaseId
      }
    } finally {
      if (!disposed) { state.decisionReleaseId = ''; emit() }
    }
  }

  return {
    state, setScope, ensureOverview, refreshPending, setActiveJobs, openUpdate, prepare, close, loadDiagnostics, submit,
    currentPending, busy, rememberRelease, readRelease, refreshProgress, setOptions, resolveBackup,
    dispose() { disposed = true; overviewSequence++; dialogSequence++ }
  }
}

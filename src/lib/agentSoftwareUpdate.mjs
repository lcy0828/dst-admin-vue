// One selected Agent, with bounded observation only during an explicit job.
// Leaving the panel stops requests; the server job continues and can be resumed.
import { softwareUpdateRetryable } from './softwareUpdate.mjs'
export function createAgentSoftwareController({ id, api, jobs, storage, onChange = () => {}, changed = () => {}, now = Date.now, delay = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  const state = { snapshot: null, loading: false, checking: false, acting: false, job: null, error: '', reconnecting: false }
  const key = `dst-agent-software:${id}`
  let alive = true, loading, checking, observing
  const publish = () => { if (alive) onChange(state) }
  const fail = error => { state.error = error?.message || String(error); publish() }
  const remember = job => { try { if (job) storage?.setItem(key, job.id); else storage?.removeItem(key) } catch { /* Storage is optional. */ } }
  function remembered() { try { return storage?.getItem(key) || '' } catch { return '' } }
  async function refresh(preserveError = false) {
    if (loading) return loading
    state.loading = true; publish()
    loading = (async () => {
      try { const snapshot = await api.software(id); if (alive) { state.snapshot = snapshot; if (!preserveError) state.error = '' } }
      catch (error) { if (alive && (!preserveError || !state.error)) fail(error) }
      finally { state.loading = false; loading = null; publish() }
    })()
    return loading
  }
  async function check(source = 'auto', force = true) {
    if (checking || state.acting) return checking
    state.checking = true; state.error = ''; publish()
    checking = (async () => {
      try { const snapshot = await api.checkSoftware(id, { source, force }); if (alive) state.snapshot = snapshot }
      catch (error) { if (alive) fail(error) }
      finally { state.checking = false; checking = null; publish() }
    })()
    return checking
  }
  async function observe(jobID) {
    if (observing) return observing
    state.acting = true; state.error = ''; publish()
    observing = (async () => {
      const deadline = now() + 19 * 60 * 1000
      let retryUntil = 0
      try {
        while (alive) {
          if (now() >= deadline) throw Error('SOFTWARE_OBSERVATION_TIMEOUT')
          let job
          try { job = await jobs.controlPlaneGet(jobID) }
          catch (error) {
            if (!alive) return
            if (!softwareUpdateRetryable(error)) throw error
            if (!retryUntil) retryUntil = now() + 120000
            if (now() >= retryUntil) throw Error('SOFTWARE_CONNECTION_TIMEOUT')
            state.reconnecting = true; publish()
            await delay(2000)
            continue
          }
          if (!alive) return
          retryUntil = 0; state.reconnecting = false
          state.job = job; publish()
          if (['succeeded', 'failed', 'canceled'].includes(job.status)) {
            remember(null)
            if (job.status !== 'succeeded') {
              const failure = job.targets?.find(target => target.error)?.error || job.error
              throw Error(failure?.message || job.message || 'Agent update failed')
            }
            changed(); break
          }
          await delay(2000)
        }
      } catch (error) { if (alive) fail(error) }
      finally { observing = null; state.acting = false; state.reconnecting = false; publish(); if (alive) await refresh(true) }
    })()
    return observing
  }
  async function start({ version, source = 'auto', operationId = '' }) {
    if (state.acting || state.checking || !version) return
    state.acting = true; state.error = ''; state.job = null; publish()
    try {
      const job = await api.updateSoftware(id, { version, confirmation: version, source, operationId })
      remember(job)
      if (!alive) return
      state.job = job
      await observe(job.id)
    } catch (error) { if (alive) fail(error) }
    finally { state.acting = false; publish() }
  }
  async function initialize() {
    const jobID = remembered()
    if (jobID) { await observe(jobID); return }
    await refresh()
    if (alive && state.snapshot?.supported && !state.snapshot?.check?.latest && !state.snapshot?.operation?.phase?.match(/^(downloading|verifying|restarting)$/)) await check('auto', false)
  }
  return { state, refresh, check, start, initialize, reconnect: () => { const jobID = remembered(); return jobID ? observe(jobID) : refresh() }, dispose() { alive = false } }
}

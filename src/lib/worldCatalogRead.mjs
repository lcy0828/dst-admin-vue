// Browsing can retry reads; gameplay commands must never use this helper.
export function retryableCatalogError(error) {
  if (typeof error?.details?.retryable === 'boolean') return error.details.retryable
  return ['RUNTIME_BUSY', 'RUNTIME_CATALOG_CHANGED', 'RUNTIME_CATALOG_TIMEOUT', 'RUNTIME_CATALOG_UNAVAILABLE', 'ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error?.code) || [502, 503, 504].includes(error?.status)
}

export function waitForCatalogRetry(delay, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return }
    const cancel = () => { clearTimeout(timer); reject(signal.reason) }
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve() }, delay)
    signal.addEventListener('abort', cancel, { once: true })
  })
}

export function createWorldCatalogRead({ request, onState, onResult, onError, retryDelays = [1000, 2500], wait = waitForCatalogRetry }) {
  let revision = 0, controller = null, closed = false
  function cancel() { ++revision; controller?.abort(); controller = null }
  return {
    cancel,
    dispose() { closed = true; cancel() },
    async start(input) {
      if (closed) return
      cancel()
      const current = revision, abort = new AbortController()
      controller = abort
      for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
        if (closed || current !== revision || abort.signal.aborted) return
        onState({ phase: 'loading', attempt: attempt + 1 })
        try {
          const result = await request(input, abort.signal)
          if (closed || current !== revision || abort.signal.aborted) return
          onResult(result)
          onState({ phase: 'ready', attempt: attempt + 1 })
          return
        } catch (error) {
          if (closed || current !== revision || abort.signal.aborted) return
          if (!retryableCatalogError(error) || attempt === retryDelays.length) {
            onError(error)
            onState({ phase: 'failed', attempt: attempt + 1 })
            return
          }
          onState({ phase: 'retrying', attempt: attempt + 1 })
          try { await wait(retryDelays[attempt], abort.signal) } catch { return }
        }
      }
    }
  }
}

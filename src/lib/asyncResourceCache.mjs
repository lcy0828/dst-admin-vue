export function createAsyncResourceCache({ ttlMs = 0, now = Date.now } = {}) {
  let cachedValue
  let hasCachedValue = false
  let expiresAt = 0
  let inFlight = null
  let generation = 0

  async function load(loader) {
    if (hasCachedValue && now() < expiresAt) return cachedValue
    if (inFlight) return inFlight

    const requestGeneration = generation
    const request = Promise.resolve()
      .then(loader)
      .then(value => {
        if (requestGeneration === generation) {
          cachedValue = value
          hasCachedValue = true
          expiresAt = now() + Math.max(0, ttlMs)
        }
        return value
      })
      .finally(() => {
        if (inFlight === request) inFlight = null
      })

    inFlight = request
    return request
  }

  function invalidate() {
    generation += 1
    cachedValue = undefined
    hasCachedValue = false
    expiresAt = 0
    inFlight = null
  }

  return { invalidate, load }
}

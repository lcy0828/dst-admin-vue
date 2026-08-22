export const ACTIVE_JOB_STATUSES = Object.freeze(['queued', 'running'])

function timestamp(job) {
  const value = Date.parse(job?.createdAt || '')
  return Number.isFinite(value) ? value : 0
}

function newestFirst(left, right) {
  return timestamp(right) - timestamp(left)
}

export function mergeActiveJobs(...collections) {
  const jobs = new Map()
  for (const collection of collections) {
    for (const job of collection || []) {
      if (!job?.id || !ACTIVE_JOB_STATUSES.includes(job.status)) continue
      jobs.set(job.id, job)
    }
  }
  return [...jobs.values()].sort(newestFirst)
}

export function parseGlobalJobEvent(value) {
  try {
    const event = typeof value === 'string' ? JSON.parse(value) : value
    return event?.data?.id ? event.data : null
  } catch {
    return null
  }
}

export function reduceGlobalJobEvent(state, eventType, value, failureLimit = 5) {
  const job = parseGlobalJobEvent(value)
  if (!job) return state

  const active = new Map((state.activeJobs || []).map(item => [item.id, item]))
  if (ACTIVE_JOB_STATUSES.includes(job.status)) active.set(job.id, job)
  else active.delete(job.id)

  let failures = state.recentFailures || []
  if (['job.completed', 'job.interrupted'].includes(eventType) && job.status === 'failed') {
    failures = [job, ...failures.filter(item => item.id !== job.id)].slice(0, failureLimit)
  }

  return {
    activeJobs: [...active.values()].sort(newestFirst),
    recentFailures: failures
  }
}

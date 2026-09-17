export const ACTIVE_JOB_STATUSES = Object.freeze(['queued', 'running'])
export const GLOBAL_JOB_SUBMITTED_EVENT = 'dst-admin:job-submitted'

export function emitGlobalJobSubmitted(job) {
  if (!job?.id || typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return false
  window.dispatchEvent(new CustomEvent(GLOBAL_JOB_SUBMITTED_EVENT, { detail: job }))
  return true
}

export function globalJobFailureToastId(jobOrId) {
  const id = typeof jobOrId === 'object' ? jobOrId?.id : jobOrId
  const normalized = String(id || '').trim()
  return normalized ? `global-job-failure:${normalized}` : undefined
}

export function globalJobWarningToastId(jobOrId) {
  const id = typeof jobOrId === 'object' ? jobOrId?.id : jobOrId
  const normalized = String(id || '').trim()
  return normalized ? `global-job-warning:${normalized}` : undefined
}

export function globalJobFailure(job) {
  const targets = Array.isArray(job?.targets) ? job.targets : []
  const target = targets.find(item => item?.status === 'failed' && item?.error?.message)
    || targets.find(item => item?.error?.message)
  const error = target?.error || job?.error || {}
  return {
    code: String(error.code || '').trim(),
    message: String(error.message || job?.message || '').trim(),
    targetName: String(target?.name || '').trim()
  }
}

export function globalJobWarning(job) {
  const targets = Array.isArray(job?.targets) ? job.targets : []
  const warnedTargets = targets.filter(item => item?.warning?.message)
  const target = warnedTargets[0]
  const warning = target?.warning || job?.warning || {}
  const message = String(warning.message || '').trim()
  return {
    code: String(warning.code || '').trim(),
    message,
    targetName: String(target?.name || '').trim(),
    count: warnedTargets.length || (message ? 1 : 0)
  }
}

export function globalJobTransfer(job) {
  const value = job?.transfer
  if (!value || typeof value !== 'object') return null
  const currentBytes = positiveNumber(value.currentBytes)
  const totalBytes = positiveNumber(value.totalBytes)
  const bytesPerSecond = positiveNumber(value.bytesPerSecond)
  if (!currentBytes && !totalBytes && !bytesPerSecond) return null
  return {
    currentBytes: totalBytes ? Math.min(currentBytes, totalBytes) : currentBytes,
    totalBytes,
    bytesPerSecond
  }
}

export function formatJobBytes(value) {
  const bytes = positiveNumber(value)
  if (!bytes) return ''
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const precision = index === 0 ? 0 : 1
  return `${(bytes / (1024 ** index)).toFixed(precision)} ${units[index]}`
}

export function formatJobRate(value) {
  const formatted = formatJobBytes(value)
  return formatted ? `${formatted}/s` : ''
}

function positiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

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

export function reduceGlobalJobEvent(state, eventType, value, failureLimit = 5, warningLimit = failureLimit) {
  const job = parseGlobalJobEvent(value)
  if (!job) return state

  const active = new Map((state.activeJobs || []).map(item => [item.id, item]))
  if (ACTIVE_JOB_STATUSES.includes(job.status)) active.set(job.id, job)
  else active.delete(job.id)

  let failures = state.recentFailures || []
  let warnings = state.recentWarnings || []
  if (['job.completed', 'job.interrupted'].includes(eventType)) {
    if (job.status === 'failed') {
      failures = [job, ...failures.filter(item => item.id !== job.id)].slice(0, failureLimit)
    }
    warnings = warnings.filter(item => item.id !== job.id)
    if (job.status === 'succeeded' && globalJobWarning(job).message) {
      warnings = [job, ...warnings].slice(0, warningLimit)
    }
  }

  return {
    activeJobs: [...active.values()].sort(newestFirst),
    recentFailures: failures,
    recentWarnings: warnings
  }
}

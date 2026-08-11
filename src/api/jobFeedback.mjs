export function jobFailure(job) {
  const failed = (job?.targets || []).find(target => target.error?.message)
  const error = failed?.error || job?.error || {}
  return { code: error.code || '', message: error.message || '' }
}

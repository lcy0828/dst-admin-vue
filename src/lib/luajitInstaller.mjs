export function luaJITInstallationKey(item) {
  return JSON.stringify([item?.targetId || '', item?.installationId || ''])
}

export function luaJITJobTerminal(job) {
  return ['succeeded', 'failed', 'partial', 'cancelled', 'canceled', 'partial_failed'].includes(job?.status)
}

export function luaJITJobError(job, fallback = 'LuaJIT operation did not complete') {
  const target = (job?.targets || []).find(item => item.error)
  return job?.error?.message || target?.error?.message || (['failed', 'partial', 'partial_failed', 'cancelled', 'canceled'].includes(job?.status) ? job?.message || fallback : '')
}

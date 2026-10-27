// Evidence states are shared by the workspace and the workbench. Keep the
// fallback for history returned by older controllers.
export function commandResultState(run) {
  if (run?.status === 'sending') return 'waiting'
  if (run?.status === 'failed') return 'failed'
  if (run?.status !== 'succeeded') return 'unconfirmed'
  if (!run.output || typeof run.output.text !== 'string') return 'output_unavailable'
  return run.output.text.length || run.output.truncated ? 'output' : 'no_output'
}

export function receiptCheckState(run, now = Date.now()) {
  const until = Date.parse(run?.receiptRefreshUntil || '')
  if (Number.isFinite(until) && now >= until && commandResultState(run) === 'unconfirmed') return 'expired'
  return run?.receiptCheck?.status || ''
}

export function canRefreshCommandReceipt(run, now = Date.now()) {
  const until = Date.parse(run?.receiptRefreshUntil || '')
  return ['uncertain', 'unresponsive'].includes(run?.status) &&
    Number.isFinite(until) && now < until &&
    !['expired', 'unsupported'].includes(run?.receiptCheck?.status)
}

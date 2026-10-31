// Only an explicit, completed check can establish that an installation is current.
export function gameUpdateDialogState({ preparing, active, uncertain, error, pendingError, plan } = {}) {
  if (active) return 'active'
  if (uncertain) return 'uncertain'
  if (preparing) return 'checking'
  if (error || pendingError) return 'error'
  if (!plan) return 'idle'
  if (plan.blockers?.length || plan.ready !== true) return 'blocked'
  if (plan.updateRequired === false) return 'current'
  return plan.updateRequired === true ? 'available' : 'idle'
}

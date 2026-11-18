export const SETUP_STEPS = Object.freeze(['deployment', 'environment', 'game', 'room', 'review'])

export function initialSetupSteps({
  fleetMode = false,
  remote = false,
  member = false,
  includeDeployment = false
} = {}) {
  return (fleetMode || remote || member || includeDeployment)
    ? SETUP_STEPS
    : SETUP_STEPS.filter(step => step !== 'deployment')
}

export function setupStep(value, allowedSteps = SETUP_STEPS) {
  const steps = Array.isArray(allowedSteps) && allowedSteps.length ? allowedSteps : SETUP_STEPS
  return steps.includes(value) ? value : steps[0]
}

export function recommendedSetupStep({ installed = false, roomCount = 0, localExecutorEnabled = true } = {}) {
  if (!localExecutorEnabled) return 'deployment'
  if (!installed) return 'game'
  if (Number(roomCount) <= 0) return 'room'
  return 'review'
}

export function authenticatedDestination(session, redirect = '/dashboard') {
  if (session?.onboarding?.required) return '/setup'
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') && redirect !== '/login'
    ? redirect : '/dashboard'
}

export function setupRouteRedirect(session, path) {
  if (session?.setupRequired) return path === '/setup' ? null : '/setup'
  if (!session?.authenticated || !session?.onboarding?.required || path === '/setup') return null
  // These are existing editors used by the wizard, with a visible return link.
  const tasks = ['/agents/list', '/agents/security', '/system/settings', '/rooms/settings', '/backups']
  return tasks.includes(path) ? null : '/setup'
}

export function accountErrors({ username, password, confirmPassword }, policy = {}, creating = true) {
  const errors = {}
  if (!username?.trim()) errors.username = 'usernameRequired'
  if (!password) errors.password = 'passwordRequired'
  else if (creating) {
    if (Array.from(password).length < (policy.minimumLength || 6)) errors.password = 'passwordShort'
    else if (new TextEncoder().encode(password).length > (policy.maximumBytes || 72)) errors.password = 'passwordLong'
    else if (policy.requireComplexity && !(/[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password))) errors.password = 'passwordComplexity'
  }
  if (creating && !confirmPassword) errors.confirmPassword = 'confirmRequired'
  else if (creating && confirmPassword !== password) errors.confirmPassword = 'passwordMismatch'
  return errors
}

export function setupPendingItems({ capabilities, readiness, installations, rooms, restartRequired, errors = [] }) {
  const pending = []
  if (errors.length) pending.push('unavailable')
  if (restartRequired) pending.push('restart')
  const deployment = capabilities?.deployment
  if (!deployment) return [...pending, 'environment']
  if (deployment.memberEnabled) {
    if (!deployment.memberConnected) pending.push('member')
    return pending
  }
  if (deployment.localExecutorEnabled !== false && (!readiness || readiness.checks?.some(check => check.required && check.status === 'fail' && check.id !== 'serverExecutable'))) pending.push('environment')
  const online = (installations || []).filter(item => item.online && !item.error)
  if (!online.some(item => item.installed)) pending.push(deployment.localExecutorEnabled === false ? 'agent' : 'game')
  if (!rooms?.length) pending.push('room')
  else if (rooms.some(room => {
    const targets = room.targetIds || []
    return !room.worldCount || !room.controlAvailable || !targets.length || targets.some(target =>
      (deployment.localExecutorEnabled === false && target === 'local') ||
      !room.availableTargetIds?.includes(target) ||
      !online.some(item => item.targetId === target && item.installed)
    )
  })) pending.push('placement')
  return pending
}

export function setupPendingAction(item, { deploymentVisible = false } = {}) {
  switch (item) {
    case 'unavailable':
      return { kind: 'refresh', labelKey: 'setup.pendingActions.unavailable' }
    case 'restart':
      return {
        kind: 'step',
        step: deploymentVisible ? 'deployment' : 'environment',
        labelKey: 'setup.pendingActions.restart'
      }
    case 'environment':
      return { kind: 'step', step: 'environment', labelKey: 'setup.pendingActions.environment' }
    case 'member':
      return { kind: 'step', step: 'deployment', labelKey: 'setup.pendingActions.member' }
    case 'agent':
      return { kind: 'route', route: '/agents/list', labelKey: 'setup.pendingActions.agent' }
    case 'game':
      return { kind: 'step', step: 'game', labelKey: 'setup.pendingActions.game' }
    case 'room':
      return { kind: 'step', step: 'room', labelKey: 'setup.pendingActions.room' }
    case 'placement':
      return { kind: 'step', step: 'room', labelKey: 'setup.pendingActions.placement' }
    default:
      return null
  }
}

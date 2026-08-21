const PACKAGING_VALUES = new Set(['native', 'all_in_one', 'container', 'control_plane'])

export function normalizePackaging(value) {
  return PACKAGING_VALUES.has(value) ? value : 'native'
}

export function dashboardOnboardingState({
  localExecutorEnabled = true,
  installed = false,
  roomCount = 0,
  runningShards = 0
} = {}) {
  if (!localExecutorEnabled) {
    const complete = Number(runningShards) > 0
    return {
      mode: 'remote',
      visible: !complete,
      complete,
      completedCount: complete ? 1 : 0,
      progress: complete ? 100 : 0,
      currentStep: complete ? '' : 'agent',
      steps: []
    }
  }

  const steps = [
    { id: 'game', complete: Boolean(installed) },
    { id: 'room', complete: Number(roomCount) > 0 },
    { id: 'start', complete: Number(runningShards) > 0 }
  ]
  const current = steps.find(step => !step.complete)
  const completedCount = steps.filter(step => step.complete).length

  return {
    mode: 'local',
    visible: Boolean(current),
    complete: !current,
    completedCount,
    progress: Math.round((completedCount / steps.length) * 100),
    currentStep: current?.id || '',
    steps: steps.map(step => ({
      ...step,
      current: step.id === current?.id
    }))
  }
}

export function requiredSetupBlockers(checks, { installed = false } = {}) {
  if (!Array.isArray(checks)) return []
  return checks.filter(check => {
    if (!check || check.required !== true || check.status !== 'fail') return false
    return installed || check.id !== 'serverExecutable'
  })
}

export function performanceIndicator({ running = false, paused = false, point = null, loadState = 'pending' } = {}) {
  if (!running) return { state: 'stopped', value: null }
  if (paused || point?.state === 'paused' || point?.reason === 'PAUSED') return { state: 'paused', value: null }
  if (['idle', 'sleeping'].includes(point?.state) || point?.reason === 'SIMULATION_NOT_ADVANCING') return { state: 'sleeping', value: null }
  if (loadState === 'unavailable' || point?.state === 'unavailable') return { state: 'unavailable', value: null }
  if (point?.reason === 'CLOCK_DISCONTINUITY') return { state: 'clockError', value: null }
  if (point?.reason === 'SIMULATION_CLOCK_UNAVAILABLE') return { state: 'incomplete', value: null }
  if (point?.reason === 'TIME_SCALE_CHANGED') return { state: 'resampling', value: null }
  if (point?.state === 'running' && Number.isFinite(point.score) && point.score >= 0 && point.score <= 100) return { state: 'scored', value: point.score }
  if (!point || point.reason === 'WARMING_UP') return { state: 'pending', value: null }
  return { state: 'unavailable', value: null }
}

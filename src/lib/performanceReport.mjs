export function performanceSeries(points, metric, resolutionSeconds = 30) {
  const groups = new Map()
  for (const point of points.filter(point => Number.isFinite(Date.parse(point.at))).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    const key = JSON.stringify([point.roomId, point.worldId])
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(point)
  }
  return [...groups.entries()].map(([id, observations]) => {
    const first = observations[0], data = []
    let previousIdentity
    for (const point of observations) {
      const identity = JSON.stringify([point.targetId, point.installationId, point.instanceId, point.scoreVersion])
      const at = Date.parse(point.at), previous = data.at(-1)
      const raw = point[metric]
      const observed = metric !== 'rssBytes' || raw > 0 && ['running', 'paused', 'idle'].includes(point.state)
      const value = observed && typeof raw === 'number' && Number.isFinite(raw) ? (metric === 'rssBytes' ? raw / 1048576 : raw) : null
      if (previous?.[0] === at) {
        // Conflicting simultaneous observations cannot establish one world value.
        if (identity !== previousIdentity || previous[1] !== value) previous[1] = null
      } else {
        // One series per world keeps axis tooltips unique. Explicit gaps preserve
        // restart, migration and scoring boundaries without connecting instances.
        if (previous && (identity !== previousIdentity || at - previous[0] > resolutionSeconds * 1600)) {
          data.push([previous[0] + Math.min(resolutionSeconds * 1000, (at - previous[0]) / 2), null])
        }
        data.push([at, value])
      }
      previousIdentity = identity
    }
    return { id, name: first.worldName || first.worldId, worldId: first.worldId, data }
  })
}

export function performanceCSV(report) {
  const cell = value => {
    const text = String(value ?? '')
    return `"${(/^[=+\-@]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`
  }
  const columns = ['at', 'roomId', 'worldId', 'targetId', 'installationId', 'worldName', 'state', 'score', 'minimumScore', 'cpuPercent', 'rssBytes', 'validSeconds', 'lowSeconds', 'instanceId', 'scoreVersion']
  return '\uFEFF' + [columns.join(','), ...(report.items || []).map(point => columns.map(key => cell(point[key])).join(','))].join('\r\n')
}

export function performanceWorldSummaries(report = {}) {
  const worlds = new Map()
  const duration = (Date.parse(report.to) - Date.parse(report.from)) / 1000
  for (const summary of report.worlds || []) {
    if (!worlds.has(summary.worldId)) worlds.set(summary.worldId, [])
    worlds.get(summary.worldId).push(summary)
  }
  const latest = new Map()
  for (const point of report.items || []) {
    if (point.scoreVersion !== report.scoreVersion) continue
    const previous = latest.get(point.worldId)
    if (!previous || Date.parse(point.at) > Date.parse(previous.at)) latest.set(point.worldId, point)
  }
  const positive = value => Number.isFinite(value) && value > 0 ? value : 0
  return [...worlds.entries()].map(([worldId, summaries]) => {
    const current = summaries.find(summary => summary.scoreVersion === report.scoreVersion)
    const hasScore = positive(current?.validSeconds) > 0 && Number.isFinite(current?.averageScore)
    const observedSeconds = summaries.reduce((sum, summary) => sum + positive(summary.observedSeconds), 0)
    const cpu = summaries.map(summary => summary.peakCPUPercent).filter(value => Number.isFinite(value) && value >= 0)
    const findings = new Map()
    for (const summary of summaries) {
      for (const finding of summary.findings || []) {
        if (['NO_VALID_SIMULATION_WINDOW', 'PARTIAL_COVERAGE'].includes(finding.code)) continue
        if (summary !== current && !['CPU_CORE_BUSY', 'UNEXPECTED_EXIT_RECORDED'].includes(finding.code)) continue
        const previous = findings.get(finding.code)
        if (!previous || positive(finding.value) > positive(previous.value)) findings.set(finding.code, finding)
      }
    }
    const point = latest.get(worldId)
    const reason = !current ? 'HISTORICAL_ONLY'
      : point?.state === 'paused' ? 'PAUSED'
        : ['idle', 'sleeping'].includes(point?.state) ? 'SIMULATION_NOT_ADVANCING'
          : ['stopped', 'failed'].includes(point?.state) ? 'NOT_RUNNING'
            : point?.reason || 'NO_VALID_SIMULATION_WINDOW'
    return {
      worldId,
      worldName: current?.worldName || summaries.at(-1)?.worldName || worldId,
      scoreVersion: report.scoreVersion,
      hasScore,
      averageScore: hasScore ? current.averageScore : null,
      minimumScore: hasScore && Number.isFinite(current.minimumScore) ? current.minimumScore : null,
      lowSeconds: hasScore ? positive(current.lowSeconds) : null,
      validSeconds: hasScore ? positive(current.validSeconds) : 0,
      observedSeconds,
      coverage: Number.isFinite(duration) && duration > 0 ? Math.min(1, observedSeconds / duration) : 0,
      peakCPUPercent: cpu.length ? Math.max(...cpu) : null,
      peakRSSBytes: Math.max(0, ...summaries.map(summary => positive(summary.peakRSSBytes))),
      missingReason: reason,
      findings: [...findings.values()]
    }
  })
}

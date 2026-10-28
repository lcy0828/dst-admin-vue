export function performanceSeries(points, metric, resolutionSeconds = 30) {
  const groups = new Map()
  for (const point of [...points].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    const key = JSON.stringify([point.worldId, point.targetId, point.installationId, point.instanceId, point.scoreVersion])
    if (!groups.has(key)) groups.set(key, { name: point.worldName || point.worldId, worldId: point.worldId, data: [] })
    const series = groups.get(key), at = Date.parse(point.at)
    const previous = series.data.at(-1)
    if (previous && at - previous[0] > resolutionSeconds * 1600) series.data.push([previous[0] + resolutionSeconds * 1000, null])
    const raw = point[metric]
    const observed = metric !== 'rssBytes' || raw > 0 && ['running', 'paused', 'idle'].includes(point.state)
    const value = observed && typeof raw === 'number' && Number.isFinite(raw) ? (metric === 'rssBytes' ? raw / 1048576 : raw) : null
    series.data.push([at, value])
  }
  return [...groups.values()]
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

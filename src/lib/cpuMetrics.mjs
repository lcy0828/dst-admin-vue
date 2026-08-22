export function busiestCPUCore(coreUsage) {
  if (!Array.isArray(coreUsage)) return null

  let busiest = null
  coreUsage.forEach((value, index) => {
    if (value === null || value === undefined || value === '') return
    const usage = Number(value)
    if (!Number.isFinite(usage)) return
    const normalized = Math.max(0, Math.min(100, usage))
    if (!busiest || normalized > busiest.usage) busiest = { index, usage: normalized }
  })
  return busiest
}

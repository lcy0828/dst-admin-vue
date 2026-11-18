import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

// No patched picomatch release exists as of 2026-11-18. This advisory needs
// attacker-controlled build globs; our Vite/Sass build uses repository inputs.
// These tools are not shipped in the embedded web UI. Review within 30 days;
// never suppress other advisories, direct runtime uses, or registry failures.
const advisory = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf'
const expires = Date.parse('2026-12-18T00:00:00Z')
const buildChain = new Set(['picomatch', 'vite', 'tinyglobby', 'fdir', '@parcel/watcher'])
const levels = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 }

export function assessAudit(report, lock, now = Date.now()) {
  if (report?.auditReportVersion !== 2 || report.error || !report.vulnerabilities || !report.metadata?.vulnerabilities) {
    throw new Error('Dependency audit did not return a valid registry report')
  }
  const entries = report.vulnerabilities
  function reviewed(name, seen = new Set()) {
    const finding = entries[name]
    if (now >= expires || seen.has(name) || !buildChain.has(name) || !finding || finding.severity !== 'high' || !finding.via?.length) return false
    if (finding.isDirect && name !== 'vite') return false
    if (name === 'picomatch' && (!finding.nodes?.length || !finding.nodes.every(node => lock.packages?.[node]?.version === '4.0.7'))) return false
    const next = new Set(seen).add(name)
    return finding.via.every(via => typeof via === 'string'
      ? reviewed(via, next)
      : name === 'picomatch' && via.name === 'picomatch' && via.url === advisory && via.severity === 'high' && via.range === '<=4.0.7')
  }
  const blocked = []
  const accepted = []
  for (const [name, finding] of Object.entries(entries)) {
    if (!(finding.severity in levels)) throw new Error(`Unknown audit severity for ${name}`)
    if (levels[finding.severity] < levels.moderate) continue
    if (reviewed(name)) accepted.push(name)
    else blocked.push(name)
  }
  return { blocked, accepted }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = spawnSync('npm', ['audit', '--json', '--registry=https://registry.npmjs.org'], { encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024 })
    if (result.error || ![0, 1].includes(result.status)) throw new Error('Could not complete dependency audit')
    const report = JSON.parse(result.stdout)
    const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))
    const { blocked, accepted } = assessAudit(report, lock)
    if (accepted.length) console.warn(`Reviewed build-tool advisory ${advisory}; review expires 2026-12-18 (${accepted.join(', ')})`)
    if (blocked.length) throw new Error(`Unreviewed dependency advisories: ${blocked.join(', ')}. Run npm audit for details.`)
    console.log('Dependency audit passed; no unreviewed moderate-or-higher advisories')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

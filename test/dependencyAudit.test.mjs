import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assessAudit } from '../scripts/audit-dependencies.mjs'

const now = Date.parse('2026-11-18T00:00:00Z')
const lock = { packages: { 'node_modules/picomatch': { version: '4.0.7' } } }
function report() {
  return {
    auditReportVersion: 2,
    metadata: { vulnerabilities: { total: 2 } },
    vulnerabilities: {
      picomatch: { severity: 'high', isDirect: false, nodes: ['node_modules/picomatch'], via: [{ name: 'picomatch', url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf', severity: 'high', range: '<=4.0.7' }] },
      vite: { severity: 'high', isDirect: true, via: ['picomatch'] }
    }
  }
}

test('accepts only the reviewed build-tool advisory before its expiry', () => {
  assert.deepEqual(assessAudit(report(), lock, now), { accepted: ['picomatch', 'vite'], blocked: [] })
  assert.deepEqual(assessAudit(report(), lock, Date.parse('2026-12-18T00:00:00Z')).blocked, ['picomatch', 'vite'])
})

test('blocks new advisories, direct use, severity increases and dependency drift', () => {
  for (const change of [
    r => { r.vulnerabilities.picomatch.via[0].url = 'https://github.com/advisories/GHSA-unknown' },
    r => { r.vulnerabilities.picomatch.isDirect = true },
    r => { r.vulnerabilities.picomatch.nodes = [] },
    r => { r.vulnerabilities.picomatch.severity = 'critical' },
    r => { r.vulnerabilities.picomatch.via.push({ name: 'picomatch', url: 'another-advisory' }) },
    r => { r.vulnerabilities.vite.via.push('unknown-package') }
  ]) {
    const input = report()
    change(input)
    assert.ok(assessAudit(input, lock, now).blocked.length)
  }
  assert.ok(assessAudit(report(), { packages: {} }, now).blocked.length)
})

test('unrelated runtime dependencies and registry errors fail the audit', () => {
  const input = report()
  input.vulnerabilities.runtime = { severity: 'moderate', isDirect: true, via: ['picomatch'] }
  assert.deepEqual(assessAudit(input, lock, now).blocked, ['runtime'])
  assert.throws(() => assessAudit({ error: { code: 'E404' } }, lock, now))
  assert.throws(() => assessAudit({}, lock, now))
  input.vulnerabilities.runtime.severity = 'unexpected'
  assert.throws(() => assessAudit(input, lock, now))
})

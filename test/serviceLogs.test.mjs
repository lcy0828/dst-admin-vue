import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeServiceLogPages, serviceLogFilters } from '../src/lib/serviceLogs.mjs'

test('paginated logs remain bounded and deduplicate entries across refresh and history', () => {
  assert.deepEqual(mergeServiceLogPages([{ id: 'a' }], [{ id: 'a' }, { id: 'b' }, { id: 'b' }, {}]), [{ id: 'a' }, { id: 'b' }])
  assert.equal(mergeServiceLogPages([{ id: 'a' }], [{ id: 'b' }, { id: 'c' }], 2).length, 2)
})
test('explicit log source and exact filter window survive continuation', () => {
  const value = serviceLogFilters({ sourceId: 'agent:n1', hours: 24, level: 'error', jobId: ' job-1 ', keyword: ' failed ' }, new Date('2026-10-29T10:00:00Z'))
  assert.deepEqual(value, { sourceId: 'agent:n1', from: '2026-10-28T10:00:00.000Z', to: '2026-10-29T10:00:00.000Z', limit: 100, level: 'error', jobId: 'job-1', keyword: 'failed' })
  const defaults = serviceLogFilters({ level: 'all' })
  assert.equal(defaults.sourceId, 'controller')
  assert.equal('level' in defaults, false)
})

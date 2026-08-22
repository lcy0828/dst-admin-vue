import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mergeActiveJobs,
  parseGlobalJobEvent,
  reduceGlobalJobEvent
} from '../src/lib/globalJobs.mjs'
import { globalJobKindLabel, globalJobMessages } from '../src/i18n/globalJobMessages.js'

function translator(locale) {
  return key => key.split('.').reduce((value, segment) => value?.[segment], globalJobMessages[locale]) || key
}

test('active job snapshots merge queued and running jobs without duplicates', () => {
  const jobs = mergeActiveJobs(
    [{ id: 'a', status: 'queued', createdAt: '2026-08-22T01:00:00Z' }],
    [
      { id: 'a', status: 'running', createdAt: '2026-08-22T01:00:00Z' },
      { id: 'b', status: 'succeeded', createdAt: '2026-08-22T02:00:00Z' }
    ]
  )
  assert.deepEqual(jobs.map(job => [job.id, job.status]), [['a', 'running']])
})

test('job events update active work and retain only new failures', () => {
  const running = reduceGlobalJobEvent(
    { activeJobs: [], recentFailures: [] },
    'job.running',
    JSON.stringify({ data: { id: 'a', kind: 'room.start', status: 'running', createdAt: '2026-08-22T01:00:00Z' } })
  )
  assert.equal(running.activeJobs.length, 1)

  const failed = reduceGlobalJobEvent(
    running,
    'job.completed',
    JSON.stringify({ data: { id: 'a', kind: 'room.start', status: 'failed', createdAt: '2026-08-22T01:00:00Z' } })
  )
  assert.equal(failed.activeJobs.length, 0)
  assert.deepEqual(failed.recentFailures.map(job => job.id), ['a'])
})

test('invalid SSE data is ignored and known job kinds are localized', () => {
  assert.equal(parseGlobalJobEvent('{broken'), null)
  assert.equal(globalJobKindLabel('backup.create', translator('zh-CN')), '创建存档备份')
  assert.equal(globalJobKindLabel('backup.create', translator('en-US')), 'Create save backup')
  assert.equal(globalJobKindLabel('custom.action', translator('zh-CN')), 'custom.action')
})

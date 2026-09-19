import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import {
  formatJobBytes,
  formatJobRate,
  globalJobFailure,
  globalJobFailureToastId,
  globalJobTransfer,
  globalJobWarning,
  globalJobWarningToastId,
  mergeActiveJobs,
  parseGlobalJobEvent,
  reduceGlobalJobEvent
} from '../src/lib/globalJobs.mjs'
import { globalJobKindLabel, globalJobMessages } from '../src/i18n/globalJobMessages.js'

const jobStatusComposable = fs.readFileSync(new URL('../src/composables/useGlobalJobStatus.js', import.meta.url), 'utf8')
const jobStatusComponent = fs.readFileSync(new URL('../src/components/layout/GlobalJobStatus.vue', import.meta.url), 'utf8')

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
  assert.deepEqual(failed.recentWarnings, [])
})

test('successful jobs retain target warnings without becoming failures', () => {
  const job = {
    id: 'warning-job',
    kind: 'room.start',
    status: 'succeeded',
    createdAt: '2026-09-02T01:00:00Z',
    targets: [{
      name: 'Master',
      status: 'succeeded',
      warning: {
        code: 'MOD_LOAD_CONFIRMATION_FAILED',
        message: '分片已启动，但模组加载确认未通过: context deadline exceeded'
      }
    }]
  }
  const state = reduceGlobalJobEvent(
    { activeJobs: [{ ...job, status: 'running' }], recentFailures: [], recentWarnings: [] },
    'job.completed',
    JSON.stringify({ data: job })
  )

  assert.equal(state.activeJobs.length, 0)
  assert.deepEqual(state.recentFailures, [])
  assert.deepEqual(state.recentWarnings.map(item => item.id), ['warning-job'])
  assert.deepEqual(globalJobWarning(state.recentWarnings[0]), {
    code: 'MOD_LOAD_CONFIRMATION_FAILED',
    message: '分片已启动，但模组加载确认未通过: context deadline exceeded',
    targetName: 'Master',
    count: 1
  })
})

test('job progress events advance the active task card snapshot', () => {
  const state = reduceGlobalJobEvent(
    { activeJobs: [{ id: 'a', status: 'running', progress: 0 }], recentFailures: [] },
    'job.progress',
    JSON.stringify({ data: { id: 'a', kind: 'room.start', status: 'running', progress: 47 } })
  )

  assert.equal(state.activeJobs[0].progress, 47)
})

test('job transfer snapshots format speed and byte totals without fake zero rates', () => {
  const transfer = globalJobTransfer({
    transfer: { currentBytes: 32 << 20, totalBytes: 92 << 20, bytesPerSecond: 4_500_375 }
  })
  assert.deepEqual(transfer, {
    currentBytes: 32 << 20,
    totalBytes: 92 << 20,
    bytesPerSecond: 4_500_375
  })
  assert.equal(formatJobBytes(transfer.currentBytes), '32.0 MiB')
  assert.equal(formatJobRate(transfer.bytesPerSecond), '4.3 MiB/s')
  assert.equal(globalJobTransfer({ transfer: { currentBytes: 0, totalBytes: 0, bytesPerSecond: 0 } }), null)
  assert.equal(formatJobRate(0), '')
  assert.match(jobStatusComponent, /globalJobs\.transfer\.progress/)
  assert.match(jobStatusComponent, /taskTransfer\(job\)/)
})

test('invalid SSE data is ignored and known job kinds are localized', () => {
  assert.equal(parseGlobalJobEvent('{broken'), null)
  assert.equal(globalJobKindLabel('backup.create', translator('zh-CN')), '创建存档备份')
  assert.equal(globalJobKindLabel('player.resurrect', translator('zh-CN')), '复活玩家')
  assert.equal(globalJobKindLabel('configuration.room.apply', translator('zh-CN')), '保存房间设置')
  assert.equal(globalJobKindLabel('mod.installation.update', translator('zh-CN')), '更新机器模组')
  assert.equal(globalJobKindLabel('mod.installation.download', translator('zh-CN')), '下载机器模组')
  assert.equal(globalJobKindLabel('backup.create', translator('en-US')), 'Create save backup')
  assert.equal(globalJobKindLabel('custom.action', translator('zh-CN')), 'custom.action')
})

test('global job failures use a stable toast identity and surface failure details', () => {
  assert.equal(globalJobFailureToastId({ id: 'job-123' }), 'global-job-failure:job-123')
  assert.equal(globalJobFailureToastId(''), undefined)
  assert.match(jobStatusComponent, /watch\(recentFailures/)
  assert.match(jobStatusComponent, /notifiedFailureIds\.has\(toastId\)/)
  assert.match(jobStatusComponent, /toast\.error\(t\('globalJobs\.failureToastTitle'/)
  assert.match(jobStatusComponent, /description:\s*t\('globalJobs\.failureToastDescription'/)
  assert.match(jobStatusComponent, /v-model:open="popoverOpen"/)
  assert.match(jobStatusComponent, /if \(hasNewFailure\) popoverOpen\.value = true/)
  assert.match(jobStatusComponent, /\{ flush: 'sync' \}/)
})

test('global job warnings have separate toast and accessible task panel feedback', () => {
  assert.equal(globalJobWarningToastId({ id: 'job-123' }), 'global-job-warning:job-123')
  assert.equal(globalJobWarningToastId(''), undefined)
  assert.match(jobStatusComponent, /watch\(recentWarnings/)
  assert.match(jobStatusComponent, /toast\.warning\(t\('globalJobs\.warningToastTitle'/)
  assert.match(jobStatusComponent, /aria-live="polite"/)
  assert.match(jobStatusComponent, /globalJobs\.sections\.warning/)
  assert.match(jobStatusComponent, /:variant="failureCount \? 'destructive' : warningCount \? 'warning' : 'secondary'"/)
})

test('global job panel stays within the viewport and prioritizes failures', () => {
  assert.match(jobStatusComponent, /max-h-\[min\(42rem,calc\(100vh-2rem\)\)\]/)
  assert.match(jobStatusComponent, /overflow-y-auto/)
  assert.ok(
    jobStatusComponent.indexOf("globalJobs.sections.failed")
      < jobStatusComponent.indexOf("globalJobs.sections.warning")
  )
})

test('global job feedback prefers the concrete failed target reason', () => {
  const job = {
    id: 'bf770050-95dc-4534-9fc0-a6f5b31a17f4',
    kind: 'room.start',
    status: 'failed',
    message: '任务执行失败',
    error: { code: 'RESOURCE_PREFLIGHT_FAILED', message: '任务执行失败' },
    targets: [
      {
        name: 'Master',
        status: 'failed',
        error: {
          code: 'RESOURCE_PREFLIGHT_FAILED',
          message: '网络作用域 host:local 的 UDP 10888 同时配置给 room1/Master(cluster_master) 与 testtest/Master(cluster_master)'
        }
      },
      { name: 'Caves', status: 'failed', error: { code: 'RESOURCE_PREFLIGHT_FAILED', message: 'UDP 10888 端口冲突' } }
    ]
  }
  const state = reduceGlobalJobEvent(
    { activeJobs: [job], recentFailures: [] },
    'job.completed',
    JSON.stringify({ data: job })
  )
  const failure = globalJobFailure(state.recentFailures[0])

  assert.equal(state.activeJobs.length, 0)
  assert.deepEqual(failure, {
    code: 'RESOURCE_PREFLIGHT_FAILED',
    message: '网络作用域 host:local 的 UDP 10888 同时配置给 room1/Master(cluster_master) 与 testtest/Master(cluster_master)',
    targetName: 'Master'
  })
})

test('global job SSE releases hidden tabs and reconnects without duplicate work', () => {
  assert.match(jobStatusComposable, /if \(refreshPromise\) return refreshPromise/)
  assert.match(jobStatusComposable, /if \(!lifecycleActive \|\| eventSource \|\| typeof EventSource !== 'function'\) return/)
  assert.match(jobStatusComposable, /if \(document\.visibilityState === 'hidden'\) \{\s*disconnect\(\)/)
  assert.match(jobStatusComposable, /document\.addEventListener\('visibilitychange', handleVisibilityChange\)/)
  assert.match(jobStatusComposable, /window\.addEventListener\('pagehide', handlePageHide\)/)
  assert.match(jobStatusComposable, /window\.addEventListener\('pageshow', handlePageShow\)/)
  assert.match(jobStatusComposable, /function disconnect\(\) \{[\s\S]*?eventSource = null[\s\S]*?source\?\.close\(\)/)
  assert.match(jobStatusComposable, /function resume\(\) \{[\s\S]*?connect\(\)[\s\S]*?if \(!eventSource\) void refreshActiveJobs\(\)/)
  assert.match(jobStatusComposable, /jobsV2API\.eventsURL\(lastEventId\)/)
  assert.match(jobStatusComposable, /'job\.progress'/)
  assert.match(jobStatusComposable, /GLOBAL_JOB_SUBMITTED_EVENT/)
  assert.match(jobStatusComposable, /function handleJobSubmitted\(event\) \{[\s\S]*?applyJobEvent\(isActiveJob\(job\) \? 'job\.created' : 'job\.completed'/)
  assert.match(jobStatusComposable, /window\.addEventListener\(GLOBAL_JOB_SUBMITTED_EVENT, handleJobSubmitted\)/)
  assert.match(jobStatusComposable, /window\.removeEventListener\(GLOBAL_JOB_SUBMITTED_EVENT, handleJobSubmitted\)/)
  assert.match(jobStatusComposable, /if \(event\.lastEventId\) lastEventId = event\.lastEventId/)
  assert.match(jobStatusComposable, /document\.removeEventListener\('visibilitychange', handleVisibilityChange\)/)
})

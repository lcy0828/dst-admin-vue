import test from 'node:test'
import assert from 'node:assert/strict'
import { jobElapsedSeconds, modDownloadGroups, modDownloadIssue, modDownloadSummary, taskProgress, readableTaskText, retainCompletedProgressJob, worldRestartProgress, isTaskProgressJob } from '../src/lib/taskProgress.mjs'

test('batch completion counts fully downloaded Mods, not machines or the current download percentage', () => {
  const job = { status: 'running', progressDetail: { items: [
    { workshopId: '100', targetId: 'local', status: 'succeeded' },
    { workshopId: '100', targetId: 'agent:node', status: 'succeeded' },
    { workshopId: '200', targetId: 'local', status: 'succeeded' },
    { workshopId: '200', targetId: 'agent:node', status: 'downloading', totalBytes: 100, currentBytes: 100 },
    { workshopId: '300', targetId: 'local', status: 'queued' },
    { workshopId: '400', targetId: 'local', status: 'queued' }
  ] } }
  const summary = modDownloadSummary(job)
  assert.equal(summary.total, 4)
  assert.equal(summary.counts.succeeded, 1)
  assert.equal(summary.percent, 25)
  assert.equal(summary.counts.downloading, 1)
  assert.equal(summary.counts.queued, 2)
  const failed = modDownloadSummary({ ...job, status: 'failed' })
  assert.equal(failed.counts.notStarted, 2)
  assert.equal(failed.counts.unconfirmed, 1)
  assert.equal(failed.percent, 25)
  assert.equal(modDownloadSummary({ progressDetail: { workshopId: '100', totalItems: 4 }, status: 'succeeded' }).percent, null)
})

test('download failure hints distinguish explicit disk and network errors without guessing unknown causes', () => {
  assert.equal(modDownloadIssue('SteamCMD I/O Operation Failed'), 'io')
  assert.equal(modDownloadIssue('context deadline exceeded'), 'timeout')
  assert.equal(modDownloadIssue('failed: permission denied'), 'permission')
  assert.equal(modDownloadIssue('failed: no space left on device'), 'diskFull')
  assert.equal(modDownloadIssue('ODPF failed entirely: 2'), 'unknown')
})

test('per-Mod progress preserves successes, failures and unstarted work after reconnect', () => {
  const job = { status: 'failed', progressDetail: { items: [
    { workshopId: '100', targetId: 'local', status: 'succeeded' },
    { workshopId: '200', targetId: 'local', status: 'failed', currentBytes: 40, totalBytes: 100 },
    { workshopId: '300', targetId: 'local', status: 'queued' },
    { workshopId: '400', targetId: 'local', status: 'downloading' }
  ] } }
  const groups = modDownloadGroups(JSON.parse(JSON.stringify(job)), { '100': { name: '棱镜', previewUrl: '/thumb.png' } })
  assert.deepEqual(groups.map(group => group.status), ['succeeded', 'failed', 'notStarted', 'unconfirmed'])
  assert.equal(groups[0].name, '棱镜')
  assert.equal(groups[0].image, '/thumb.png')
  assert.deepEqual(groups.map(group => group.downloads[0].percent), [100, 40, null, null])
})

test('a Mod is only complete when all of its machine downloads succeed', () => {
  const groups = modDownloadGroups({ status: 'running', progressDetail: { items: [
    { workshopId: '100', targetId: 'local', status: 'succeeded' },
    { workshopId: '100', targetId: 'agent:node', status: 'downloading', currentBytes: 100, totalBytes: 100 }
  ] } })
  assert.equal(groups.length, 1)
  assert.equal(groups[0].downloads.length, 2)
  assert.equal(groups[0].status, 'downloading')
})

test('old tasks never invent results for earlier Mods and labels hide internal target IDs', () => {
  const groups = modDownloadGroups({ status: 'failed', progressDetail: { workshopId: '200', currentItem: 2, totalItems: 4 } })
  assert.equal(groups.length, 1)
  assert.equal(groups[0].status, 'unknown')
  assert.equal(readableTaskText('Insight · agent:compat-native-agent-42/native', { 'agent:compat-native-agent-42': 'debian12' }), 'Insight · debian12')
  assert.ok(!readableTaskText('Insight · agent:unknown/native').includes('agent:'))
})

test('batch download percentage and ordinal refer to the current item, not the whole task', () => {
  const job = { kind: 'mod.installation.update-all', status: 'running', progress: 45, progressDetail: { stage: 'mod.cache', workshopId: '111', currentItem: 2, totalItems: 3 }, transfer: { currentBytes: 65, totalBytes: 100 } }
  const model = taskProgress(job)
  assert.deepEqual(model.item, { workshopId: '111', current: 2, total: 3 })
  assert.equal(model.percent, 65)
  const next = taskProgress({ ...job, progressDetail: { ...job.progressDetail, currentItem: 3, workshopId: '222' }, transfer: null })
  assert.equal(next.percent, null)
  assert.equal(next.item.current, 3)
})

test('ordinary downloads and room additions never show a world restart phase', () => {
  for (const kind of ['mod.installation.download', 'mod.installation.update', 'mod.installation.update-all', 'mod.install']) {
    const model = taskProgress({ kind, status: 'running', progress: 89 })
    assert.equal(model.restart, false)
    assert.equal(model.phase, 'applying')
    assert.ok(!model.stages.includes('restarting'))
    assert.equal(retainCompletedProgressJob([], { id: kind, kind, status: 'succeeded' }).length, 1)
  }
})

test('download uses actual byte progress, never the weighted workflow percentage', () => {
  const model = taskProgress({ status: 'running', progress: 42, transfer: { currentBytes: 65, totalBytes: 100, bytesPerSecond: 20 } })
  assert.equal(model.phase, 'downloading')
  assert.equal(model.percent, 65)
  assert.equal(taskProgress({ status: 'running', progress: 10 }).percent, null)
  assert.equal(taskProgress({ status: 'running', progress: 5 }).phase, 'checking')
})

test('restart and completion do not present stale download bytes as total task progress', () => {
  const transfer = { currentBytes: 100, totalBytes: 100, bytesPerSecond: 20 }
  const restart = taskProgress({ status: 'running', progress: 89, transfer })
  assert.equal(restart.phase, 'restarting')
  assert.equal(restart.percent, null)
  assert.equal(restart.transfer, null)
  assert.equal(taskProgress({ status: 'running', progress: 65 }).phase, 'waiting')
  const failure = taskProgress({ status: 'failed', progress: 100, transfer })
  assert.equal(failure.status, 'failed')
  assert.equal(failure.percent, null)
  assert.equal(taskProgress({ status: 'succeeded', progress: 100 }).percent, 100)
})

test('restart uses independent log milestones, orders Master first and preserves incomplete results', () => {
  const job = { kind: 'mod.update.activate', status: 'running', progress: 98, transfer: { currentBytes: 100, totalBytes: 100 }, progressDetail: { stage: 'world.restart', worlds: [
    { worldId: 'caves', name: 'Caves', stage: 'loading_world', percent: 80 },
    { worldId: 'master', name: 'Master', isMaster: true, stage: 'ready', percent: 100 }
  ] } }
  const progress = worldRestartProgress(job)
  assert.deepEqual(progress.worlds.map(world => world.name), ['Master', 'Caves'])
  assert.equal(progress.ready, 1)
  assert.equal(progress.percent, 90)
  assert.equal(progress.worlds[1].active, true)
  assert.equal(taskProgress(job).percent, 90)
  assert.equal(taskProgress(job).transfer, null)
  const interrupted = { ...job, status: 'failed', progress: 100 }
  assert.equal(worldRestartProgress(interrupted).worlds[0].stage, 'ready')
  assert.equal(worldRestartProgress(interrupted).worlds[1].stage, 'unconfirmed')
  assert.equal(taskProgress(interrupted).percent, 90)
  // A start request can finish successfully while readiness remains unconfirmed.
  const unconfirmed = { ...job, status: 'succeeded', progress: 100 }
  assert.equal(taskProgress(unconfirmed).status, 'unconfirmed')
  assert.equal(taskProgress(unconfirmed).percent, 90)
  assert.equal(worldRestartProgress(job).worlds[1].stage, 'loading_world')
})

test('no readiness is invented from a percentage, job completion, or missing legacy records', () => {
  const job = { kind: 'mod.update.activate', status: 'succeeded', progress: 100, progressDetail: { worlds: [
    { worldId: 'a', stage: 'ready', percent: 100 },
    { worldId: 'b', stage: 'failed', percent: 100, message: 'port in use' },
    { worldId: 'c', stage: 'queued', percent: 0 }
  ] } }
  const progress = worldRestartProgress(job)
  assert.equal(progress.ready, 1)
  assert.deepEqual(progress.worlds.map(world => world.stage), ['ready', 'failed', 'notStarted'])
  assert.equal(progress.worlds[1].percent, 99)
  assert.equal(progress.worlds[1].message, 'port in use')
  assert.equal(taskProgress(job).status, 'failed')
  assert.equal(worldRestartProgress({ status: 'running', progress: 90 }).percent, null)
  const downloadFailure = taskProgress({ kind: 'mod.update.activate', status: 'failed', progress: 100, progressDetail: { stage: 'mod.cache' } })
  assert.equal(downloadFailure.phase, 'downloading')
})

test('duration stops at completion and rejects invalid or future timestamps', () => {
  const startedAt = '2026-09-12T01:00:00Z'
  const finishedAt = '2026-09-12T01:01:43Z'
  assert.equal(jobElapsedSeconds({ startedAt, finishedAt }, Date.parse('2026-09-12T02:00:00Z')), 103)
  assert.equal(jobElapsedSeconds({ startedAt: 'invalid' }), 0)
  assert.equal(jobElapsedSeconds({ startedAt }, Date.parse('2026-09-12T00:59:00Z')), 0)
})

test('ordinary single-world, room and batch starts share progress without Mod workflow phases', () => {
  for (const kind of ['room.start', 'rooms.start', 'room.restart', 'rooms.restart']) {
    const job = { id: kind, kind, status: 'running', progress: 85, progressDetail: { worlds: [
      { worldId: 'room-a:master', name: '房间 A / Master', isMaster: true, stage: 'ready', percent: 100 },
      { worldId: 'room-b:master', name: '房间 B / Master', isMaster: true, stage: 'loading_mods', percent: 55 }
    ] } }
    assert.equal(isTaskProgressJob(job), true)
    const model = taskProgress(job)
    assert.equal(model.phase, kind.endsWith('.start') ? 'starting' : 'restarting')
    assert.equal(model.percent, 77)
    assert.equal(model.lifecycle, true)
    assert.equal(model.stages.length, 1)
    assert.equal(model.transfer, null)
    assert.equal(modDownloadGroups(job).length, 0)
    assert.deepEqual(worldRestartProgress(job).worlds.map(world => world.name), ['房间 A / Master', '房间 B / Master'])
    assert.equal(retainCompletedProgressJob([], { ...job, status: 'failed' }).length, 1)
    assert.equal(taskProgress({ ...job, progressDetail: null, progress: 5 }).percent, null)
  }
  assert.equal(isTaskProgressJob({ kind: 'room.save' }), false)
  assert.equal(isTaskProgressJob({ kind: 'room.stop' }), false)
})

test('recent update results survive removal from active jobs without retaining routine background tasks', () => {
  const job = { id: 'a', kind: 'mod.update.activate', status: 'succeeded' }
  let items = retainCompletedProgressJob([], job)
  items = retainCompletedProgressJob(items, { ...job, message: 'finished' })
  assert.equal(items.length, 1)
  assert.equal(items[0].message, 'finished')
  assert.equal(retainCompletedProgressJob(items, { ...job, kind: 'player.refresh' }), items)
  assert.equal(retainCompletedProgressJob(items, { ...job, status: 'running' }), items)
  for (let i = 0; i < 10; i++) items = retainCompletedProgressJob(items, { ...job, id: String(i) })
  assert.equal(items.length, 5)
})

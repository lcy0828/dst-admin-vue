import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { gameReleaseMessages } from '../src/i18n/gameReleaseMessages.js'
import { messages } from '../src/i18n/messages.js'
import { gameReleaseDownloads, gameReleaseProgress, gameReleaseResultRows, gameReleaseShardState } from '../src/lib/gameRelease.mjs'

let server, Component, Dock
before(async () => {
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' })
  Component = (await server.ssrLoadModule('/src/components/runtime/GameReleaseProgress.vue')).default
  Dock = (await server.ssrLoadModule('/src/components/layout/TaskProgressDock.vue')).default
})
after(async () => { await server?.close() })

export function releaseFixture(stage = 'updating') {
  const shardPlans = [
    { roomId: 'encoded-room', roomName: '测试房间', worldId: 'encoded-master', worldName: 'Master', isMaster: true, wasRunning: true },
    { roomId: 'encoded-room', roomName: '测试房间', worldId: 'encoded-caves', worldName: 'Caves', isMaster: false, wasRunning: false }
  ].map(item => ({ ...item, targetId: 'local', installationId: 'default' }))
  return {
    id: 'release-1', sourceJobId: 'job-1', stage,
    plan: { updateRequired: true, affectedRoomIds: ['encoded-room'], policy: { restartRunning: true, loadConfirmation: 'logs' }, installations: [
      { targetId: 'local', targetName: 'Local runtime', installationId: 'default', shards: shardPlans }
    ] },
    protectionBackupIds: ['backup-1'],
    installations: [{ targetId: 'local', installationId: 'default', stage: 'updating', beforeVersion: '700', expectedVersion: '701', writeState: 'dispatched' }],
    shards: shardPlans.map(({ roomName, worldName, ...item }) => ({ ...item, stage: 'staged', runtimeState: 'stopped', ...(item.wasRunning ? { stoppedAt: '2026-10-27T12:00:00Z' } : {}) })),
    updatedAt: '2026-10-27T12:01:00Z'
  }
}

async function render(release, locale = 'zh-CN') {
  const app = createSSRApp({ render: () => h(Component, { release }) })
  app.provide(Symbol.for('dst-admin:game-update'), { state: { activeJobs: [] } })
  app.use(createI18n({ legacy: false, locale, messages: gameReleaseMessages }))
  return renderToString(app)
}

async function renderDock(props) {
  const app = createSSRApp({ render: () => h(Dock, props) })
  app.provide(Symbol.for('dst-admin:game-update'), { state: { activeJobs: [] } })
  app.use(createI18n({ legacy: false, locale: 'zh-CN', messages }))
  return renderToString(app)
}

test('shared game dock uses the durable release stage before the generic job catches up', async () => {
  const html = await renderDock({
    job: { id: 'job-1', kind: 'game.release', status: 'running', progressDetail: { phase: 'checking' } },
    release: releaseFixture()
  })
  assert.match(html, /更新安装/)
  assert.doesNotMatch(html, /检查更新|aria-valuenow="100"/)
  for (const step of ['停止世界', '保护备份', '更新并校验', '恢复世界', '确认加载']) assert.match(html, new RegExp(step))
})

test('shared software dock names panel downloads and exposes stopping alongside actual byte progress', async () => {
  const html = await renderDock({
    job: { id: 'software:example', kind: 'software.update', softwarePhase: 'downloading', status: 'running',
      progressDetail: { phase: 'downloading' }, transfer: { currentBytes: 1024, totalBytes: 10240, bytesPerSecond: 1024 } },
    cancelable: true
  })
  assert.match(html, /下载更新包/)
  assert.match(html, /停止下载/)
  assert.match(html, /1\.0 KiB\/s/)
  assert.match(html, /1\.0 KiB \/ 10\.0 KiB/)
  assert.doesNotMatch(html, /下载模组/)
})

test('results use immutable room/world/agent names from the exact installation plan', () => {
  const release = releaseFixture()
  release.plan.installations.push({ targetId: 'agent:node', targetName: '远程服务器', installationId: 'default', shards: [
    { roomId: 'encoded-room', worldId: 'remote-world', roomName: '测试房间', worldName: '远程洞穴' }
  ] })
  release.shards.push({ targetId: 'agent:node', installationId: 'default', roomId: 'encoded-room', worldId: 'remote-world', stage: 'previewed' })
  const original = structuredClone(release)
  const rows = gameReleaseResultRows(release)
  assert.equal(rows.shards[0].roomName, '测试房间')
  assert.equal(rows.shards[0].worldName, 'Master')
  assert.equal(rows.shards[2].worldName, '远程洞穴')
  assert.equal(rows.shards[2].targetName, '远程服务器')
  assert.equal(rows.backups[0].roomName, '测试房间')
  assert.deepEqual(release, original)
})

test('update progress reports observed stages and keeps download progress indeterminate', async () => {
  const release = releaseFixture()
  const progress = gameReleaseProgress(release)
  assert.deepEqual(progress.steps.map(step => step.state), ['done', 'done', 'active', 'pending', 'pending'])
  assert.equal(progress.steps[3].total, 1, 'only originally running worlds count toward restoration')
  const html = await render(release)
  assert.match(html, /停止世界/)
  assert.match(html, /保护备份/)
  assert.match(html, /更新并校验/)
  assert.match(html, /恢复世界/)
  assert.match(html, /确认加载/)
  assert.match(html, /data-indeterminate="true"/)
  assert.doesNotMatch(html, /aria-valuenow="100"|游戏更新完成/)
  assert.match(html, /更新已开始，等待下载进度/)
})

function withDownload(phase = 'downloading') {
  const release = releaseFixture()
  const now = Date.now()
  Object.assign(release.installations[0], {
    operationId: 'update-operation', startedAt: new Date(now - 6000).toISOString(),
    progress: { operationId: 'update-operation', phase, attempt: 1, currentBytes: 1024, totalBytes: 4096,
      bytesPerSecond: 512, observedAt: new Date(now).toISOString(), phaseStartedAt: new Date(now - 5000).toISOString() }
  })
  return release
}

test('page and task dock show measured download bytes and speed without completing the update', async () => {
  const release = withDownload()
  for (const html of [await render(release), await renderDock({ job: { id: 'job-1', kind: 'game.release', status: 'running' }, release })]) {
    assert.match(html, /正在下载更新/)
    assert.match(html, /25%/)
    assert.match(html, /1\.0 KiB \/ 4\.0 KiB/)
    assert.match(html, /512 B\/s/)
    assert.match(html, /已用时 0:06/)
    assert.match(html, /aria-valuenow="25"/)
    assert.doesNotMatch(html, /游戏更新完成|暂不提供下载百分比/)
  }
  release.installations[0].progress.currentBytes = 4096
  assert.equal(gameReleaseProgress(release).steps[2].state, 'active')
  const html = await render(release)
  assert.match(html, /100%/)
  assert.doesNotMatch(html, /游戏更新完成/)
})

test('validation has its own percentage and clears download speed', async () => {
  const release = withDownload('validating')
  const html = await render(release)
  assert.match(html, /正在校验游戏文件/)
  assert.match(html, /25%/)
  assert.doesNotMatch(html, /B\/s/)
  release.installations[0].progress = { ...release.installations[0].progress, phase: 'preparing', attempt: 2, currentBytes: 0, totalBytes: 0 }
  const retry = await render(release)
  assert.match(retry, /正在进行一次修复/)
  assert.match(retry, /data-indeterminate="true"/)
  assert.doesNotMatch(retry, /25%|aria-valuenow="100"/)
})

test('a finished generic job cannot override an updating release with success', async () => {
  const release = withDownload()
  const html = await renderDock({ job: { id: 'job-1', kind: 'game.release', status: 'succeeded', progress: 100 }, release })
  assert.match(html, /正在下载更新/)
  assert.match(html, /已校验安装 0\/1/)
  assert.match(html, /data-status="downloading"/)
  assert.doesNotMatch(html, /游戏更新完成/)
})

test('a disconnected task dock preserves historical byte counts without presenting a live speed', async () => {
  const release = withDownload()
  const html = await renderDock({ job: { id: 'job-1', kind: 'game.release', status: 'running' }, release, connected: false })
  assert.match(html, /1\.0 KiB \/ 4\.0 KiB/)
  assert.match(html, /data-indeterminate="true"/)
  assert.doesNotMatch(html, /512 B\/s|25%|aria-valuenow="25"|游戏更新完成/)
})

test('missing, stale, mismatched and invalid progress never becomes zero or an invented percentage', () => {
  const release = withDownload()
  const p = release.installations[0].progress
  assert.equal(gameReleaseDownloads(release, Date.parse(p.observedAt) + 31_000)[0].percent, null)
  assert.equal(gameReleaseDownloads(release, Date.parse(p.observedAt) + 31_000)[0].transfer.bytesPerSecond, 0)
  for (const patch of [{ operationId: 'old-operation' }, { totalBytes: 0 }, { currentBytes: -1 }, { currentBytes: 5000 }, { totalBytes: '4096' }, { observedAt: 'invalid' }]) {
    release.installations[0].progress = { ...p, ...patch }
    assert.equal(gameReleaseDownloads(release)[0].percent, null)
  }
  delete release.installations[0].progress
  assert.equal(gameReleaseDownloads(release)[0].phase, 'waiting')
  release.stage = 'failed'
  assert.deepEqual(gameReleaseDownloads(release), [])
})

test('silent output remains waiting and a remote target is named from its plan', async () => {
  const release = withDownload()
  Object.assign(release.installations[0], { targetId: 'agent:test', startedAt: new Date(Date.now() - 120_000).toISOString() })
  release.plan.installations[0].targetId = 'agent:test'
  release.plan.installations[0].targetName = '测试节点'
  release.plan.installations.push({ targetId: 'local', installationId: 'default' })
  release.installations[0].progress.observedAt = new Date(Date.now() - 60_000).toISOString()
  const html = await render(release)
  assert.match(html, /测试节点/)
  assert.match(html, /暂未收到新进度，仍在等待更新结果/)
  assert.doesNotMatch(html, /512 B\/s|25%|游戏更新完成/)
})

test('failed and partially restored releases never display fake 100% completion', async () => {
  const release = releaseFixture('recovery_required')
  release.installations[0].stage = 'failed'
  release.installations[0].writeState = 'unknown'
  release.errorMessage = '节点连接已断开，写入结果待确认'
  const progress = gameReleaseProgress(release)
  assert.equal(progress.steps[2].state, 'interrupted')
  assert.equal(progress.steps[3].state, 'pending')
  const html = await render(release)
  assert.match(html, /节点连接已断开/)
  assert.doesNotMatch(html, /游戏更新完成|aria-valuenow="100"|data-indeterminate/)
})

test('success includes the actual build and restored count while stopped worlds stay explicit', async () => {
  const release = releaseFixture('succeeded')
  Object.assign(release.installations[0], { stage: 'succeeded', writeState: 'verified', afterVersion: '701' })
  Object.assign(release.shards[0], { stage: 'succeeded', runtimeState: 'running', startedAt: release.updatedAt, loadConfirmedAt: release.updatedAt })
  release.shards[1].stage = 'succeeded'
  const progress = gameReleaseProgress(release)
  assert.deepEqual(progress.steps.map(step => step.state), ['done', 'done', 'done', 'done', 'done'])
  assert.equal(progress.restored, 1)
  assert.equal(progress.keptStopped, 1)
  assert.equal(gameReleaseShardState(progress.rows.shards[1], release), 'keptStopped')
  const html = await render(release)
  assert.match(html, /游戏更新完成/)
  assert.match(html, /已恢复并确认 1\/1 个世界，另有 1 个世界保持停止/)
  assert.match(html, /700 → 701/)
  assert.match(html, />本机</)
  assert.doesNotMatch(html, />local<|Local runtime|data-indeterminate/)
  const english = await render(release, 'en-US')
  assert.match(english, /Game update completed/)
  assert.match(english, /1\/1 worlds restored and confirmed/)
})

test('restart disabled, empty rooms and no-update records skip actions rather than inventing loads', () => {
  const release = releaseFixture('verified')
  release.plan.policy.restartRunning = false
  const progress = gameReleaseProgress(release)
  assert.equal(progress.steps[3].state, 'skipped')
  assert.equal(progress.steps[4].state, 'skipped')
  assert.equal(progress.restoreTotal, 0)
  assert.equal(gameReleaseShardState(release.shards[0], release), 'stopped')
  release.plan.updateRequired = false
  assert.ok(gameReleaseProgress(release).steps.every(step => step.state === 'skipped'))
  const empty = gameReleaseProgress({ stage: 'previewed' })
  assert.equal(empty.terminal, false)
  assert.equal(empty.restoreTotal, 0)
})

test('per-world labels distinguish dispatch, stopped, starting and confirmed running', () => {
  const release = releaseFixture()
  const shard = release.shards[0]
  assert.equal(gameReleaseShardState(shard, release), 'waitingRestore')
  assert.equal(gameReleaseShardState({ ...shard, stoppedAt: null, stage: 'stopping', stopRequestedAt: release.updatedAt }, release), 'stopping')
  assert.equal(gameReleaseShardState({ ...shard, stage: 'restarting' }, release), 'restarting')
  assert.equal(gameReleaseShardState({ ...shard, stage: 'confirming' }, release), 'confirming')
  assert.equal(gameReleaseShardState({ ...shard, stage: 'succeeded', runtimeState: 'running' }, release), 'running')
  assert.equal(gameReleaseShardState({ ...shard, stage: 'failed', errorMessage: 'failed' }, release), 'failed')
})

test('right-corner progress shows countdown and a skipped backup without inventing completion', async () => {
  const release = releaseFixture('notifying')
  release.plan.policy.stopDelaySeconds = 60
  release.plan.policy.skipBackup = true
  release.protectionBackupIds = []
  release.countdownEndsAt = new Date(Date.now() + 60_000).toISOString()
  const progress = gameReleaseProgress(release)
  assert.equal(progress.steps[0].key, 'notifying')
  assert.equal(progress.steps[0].state, 'active')
  assert.equal(progress.steps.find(step => step.key === 'protecting').state, 'skipped')
  const html = await renderDock({ job: { id: 'job-1', kind: 'game.release', status: 'running' }, release })
  assert.match(html, /停服倒计时/)
  assert.match(html, /距离停止世界还有/)
  assert.match(html, /本次已跳过备份/)
  assert.doesNotMatch(html, /aria-valuenow="100"/)
})

test('backup-decision pause exposes retry, skip and cancel in the task dock', async () => {
  const release = releaseFixture('recovery_required')
  release.nextAction = 'backup_decision'
  release.errorMessage = '测试备份失败'
  release.protectionBackupIds = []
  const html = await renderDock({ job: { id: 'job-1', kind: 'game.release', status: 'failed' }, release })
  for (const label of ['备份未成功，等待你的选择', '重试备份', '跳过备份继续', '取消并恢复运行']) assert.match(html, new RegExp(label))
  assert.match(html, /data-status="waiting"/)
  assert.doesNotMatch(html, /aria-valuenow="100"/)
})

test('canceling before a write explains that original running worlds were restored', async () => {
  const release = releaseFixture('abandoned')
  release.errorCode = 'UPDATE_CANCELED'
  release.errorMessage = '已取消更新并恢复原先运行的世界'
  release.protectionBackupIds = []
  Object.assign(release.shards[0], { runtimeState: 'running', startedAt: release.updatedAt })
  const progress = gameReleaseProgress(release)
  assert.deepEqual(progress.steps.map(step => step.state), ['done', 'skipped', 'skipped', 'done', 'skipped'])
  assert.equal(progress.restored, 1)
  assert.equal(progress.keptStopped, 1)
  const html = await render(release)
  assert.match(html, /已取消更新/)
  assert.match(html, /已取消更新并恢复原先运行的世界/)
  assert.doesNotMatch(html, /游戏更新完成|Steam Build/)
  const dock = await renderDock({ job: { id: 'job-2', kind: 'game.release.retry', status: 'succeeded', progress: 100 }, release })
  assert.match(dock, /data-status="canceled"/)
  assert.match(dock, /已取消更新/)
  assert.doesNotMatch(dock, /游戏更新完成/)
})

test('cancel recovery is independent of the update restart preference and skips worlds never stopped', () => {
  const release = releaseFixture('abandoned')
  release.errorCode = 'UPDATE_CANCELED'
  release.plan.policy.restartRunning = false
  Object.assign(release.shards[0], { runtimeState: 'running', startedAt: release.updatedAt })
  assert.equal(gameReleaseProgress(release).steps[3].state, 'done')
  delete release.shards[0].stoppedAt
  delete release.shards[0].startedAt
  const progress = gameReleaseProgress(release)
  assert.equal(progress.steps[0].state, 'skipped')
  assert.equal(progress.steps[3].state, 'skipped')
  assert.equal(progress.keptStopped, 1)
  assert.equal(progress.restoreTotal, 0)

  delete release.errorCode
  assert.equal(gameReleaseProgress(release).steps[3].state, 'skipped', 'legacy end-maintenance records do not claim restoration')
})

test('backup-space failure leaves stopping pending and identifies backup as the blocked step', () => {
  const release = releaseFixture('recovery_required')
  release.nextAction = 'backup_decision'
  release.protectionBackupIds = []
  delete release.shards[0].stoppedAt
  release.shards[0].stage = 'previewed'
  release.shards[0].runtimeState = 'running'
  const progress = gameReleaseProgress(release)
  assert.equal(progress.steps[0].state, 'pending')
  assert.equal(progress.steps[1].state, 'interrupted')
})

test('interrupted countdown does not claim completed notification or failed stop', () => {
  const release = releaseFixture('failed')
  release.plan.policy.stopDelaySeconds = 360
  release.countdownEndsAt = '2026-10-27T12:06:00Z'
  release.errorCode = 'CANCELED'
  release.protectionBackupIds = []
  delete release.shards[0].stoppedAt
  Object.assign(release.shards[0], { stage: 'previewed', runtimeState: 'running' })
  const progress = gameReleaseProgress(release)
  assert.equal(progress.steps[0].state, 'interrupted')
  assert.equal(progress.steps[0].done, 0)
  assert.equal(progress.steps[1].state, 'pending')
})

test('minimized backup-decision task never turns the failed job progress into 100 percent', async () => {
  const release = releaseFixture('recovery_required')
  release.nextAction = 'backup_decision'
  const html = await renderDock({ job: { id: 'job-1', kind: 'game.release', status: 'failed', progress: 100 }, release, minimized: true })
  assert.match(html, /data-status="waiting"/)
  assert.doesNotMatch(html, /task-progress-bubble-percent|aria-valuenow="100"/)
})

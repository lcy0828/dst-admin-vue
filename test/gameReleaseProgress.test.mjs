import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { gameReleaseMessages } from '../src/i18n/gameReleaseMessages.js'
import { gameReleaseProgress, gameReleaseResultRows, gameReleaseShardState } from '../src/lib/gameRelease.mjs'

let server, Component
before(async () => {
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' })
  Component = (await server.ssrLoadModule('/src/components/runtime/GameReleaseProgress.vue')).default
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
  app.use(createI18n({ legacy: false, locale, messages: gameReleaseMessages }))
  return renderToString(app)
}

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
  assert.match(html, /SteamCMD 正在下载更新并校验文件/)
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

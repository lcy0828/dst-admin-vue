import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  gameReleaseBlockerKey,
  gameReleaseCanRetry,
  gameReleaseFindByJob,
  gameReleaseInstallationStatus,
  gameReleaseIsTerminal,
  gameReleaseJobFailed,
  gameReleaseJobIsTerminal,
  gameReleaseJobProgress,
  gameReleaseNodeCount,
  gameReleaseGameVersions,
  gameReleaseApplicationKey,
  gameReleasePlatformKey,
  gameReleaseStageKey,
  gameReleaseStageVariant,
  gameReleaseVersionChannels
} from '../src/lib/gameRelease.mjs'

const source = path => readFile(new URL(path, import.meta.url), 'utf8')

test('game release helpers preserve backend stages and real job progress', () => {
  assert.equal(gameReleaseStageKey('recovery_required'), 'recovery_required')
  assert.equal(gameReleaseStageKey('invented'), 'unknown')
  assert.equal(gameReleaseStageVariant('failed'), 'destructive')
  assert.equal(gameReleaseStageVariant('succeeded'), 'secondary')
  assert.equal(gameReleaseIsTerminal({ stage: 'confirming' }), false)
  assert.equal(gameReleaseIsTerminal({ stage: 'succeeded' }), true)
  assert.equal(gameReleaseCanRetry({ id: 'release-1', stage: 'recovery_required' }), true)
  assert.equal(gameReleaseCanRetry({ id: 'release-1', stage: 'succeeded' }), false)
  assert.equal(gameReleaseBlockerKey('DISK_INSUFFICIENT'), 'diskInsufficient')
  assert.equal(gameReleaseBlockerKey('VERSION_CHECK_TIMEOUT'), 'versionCheckTimeout')
  assert.equal(gameReleaseBlockerKey('LATEST_BUILD_UNAVAILABLE'), 'latestBuildUnavailable')
  assert.equal(gameReleaseBlockerKey('future-code'), 'unknown')
  assert.equal(gameReleaseJobIsTerminal({ status: 'running' }), false)
  assert.equal(gameReleaseJobIsTerminal({ status: 'failed' }), true)
  assert.equal(gameReleaseJobFailed({ status: 'canceled' }), true)
  assert.equal(gameReleaseJobProgress({ progress: 117 }), 100)
  assert.equal(gameReleaseJobProgress({}), null)
  assert.equal(gameReleaseFindByJob([{ id: 'r1', sourceJobId: 'j1' }], 'j1')?.id, 'r1')
  assert.deepEqual(gameReleaseInstallationStatus({ blockers: [{ code: 'TARGET_OFFLINE' }] }), { key: 'blocked', variant: 'destructive' })
  assert.deepEqual(gameReleaseInstallationStatus({ upToDate: true }), { key: 'upToDate', variant: 'secondary' })
  assert.equal(gameReleaseNodeCount([{ targetId: 'local' }, { targetId: 'agent:a' }, { targetId: 'agent:a' }]), 2)
  assert.deepEqual(gameReleaseGameVersions([
    { gameVersion: '747465' }, { gameVersion: '747465' }, { gameVersion: '747464' }, {}
  ]), ['747465', '747464'])
  assert.equal(gameReleasePlatformKey('darwin'), 'macos')
  assert.equal(gameReleasePlatformKey('win32'), 'windows')
  assert.equal(gameReleasePlatformKey('other'), 'unknown')
  assert.equal(gameReleaseApplicationKey('322330'), 'gameClient')
  assert.equal(gameReleaseApplicationKey('343050'), 'dedicatedServer')
  assert.equal(gameReleaseApplicationKey('1'), 'unknown')
  assert.deepEqual(gameReleaseVersionChannels([
    { os: 'darwin', appId: '322330', updateMethod: 'steam-client' },
    { os: 'macos', appId: '322330', updateMethod: 'steam-client' },
    { os: 'linux', appId: '343050', updateMethod: 'steamcmd' },
    { os: 'windows', appId: '343050', updateMethod: 'steamcmd' }
  ]), [
    { appId: '322330', updateMethod: 'steam-client', platformKeys: ['macos'] },
    { appId: '343050', updateMethod: 'steamcmd', platformKeys: ['linux', 'windows'] }
  ])
})

test('game release API is always addressed through the control plane', async () => {
  const api = await source('../src/api/v2.js')
  const start = api.indexOf('export const gameReleasesV2API')
  const end = api.indexOf('export const containersV2API', start)
  const releaseAPI = api.slice(start, end)

  assert.match(releaseAPI, /game\/releases\/preview/)
  assert.match(releaseAPI, /actions\/retry/)
  assert.match(releaseAPI, /installedVersions:[\s\S]*?client\.get\('\/game\/installed-versions'/)
  assert.equal(releaseAPI.match(/runtimeTarget:\s*false/g)?.length, 6)
  assert.match(api, /GAME_RELEASE_REQUEST_TIMEOUT = 65_000/)
})

test('game release declarations cover plans, installation results, and shard evidence', async () => {
  const declarations = await source('../src/api/distributedManagement.d.ts')
  for (const name of ['GameReleasePlan', 'GameReleaseInstallationPlan', 'GameReleaseInstallationResult', 'GameReleaseShardResult', 'GameRelease']) {
    assert.match(declarations, new RegExp(`export interface ${name}`))
  }
  assert.match(declarations, /loadMarker\?:\s*string/)
  assert.match(declarations, /os:\s*string/)
  assert.match(declarations, /arch:\s*string/)
  assert.match(declarations, /protectionBackupIds:\s*string\[\]/)
  assert.match(declarations, /'recovery_required'/)
})

test('game release workspace uses accessible shadcn composition and real APIs', async () => {
  const view = await source('../src/views/servers/GameReleases.vue')
  assert.match(view, /<DialogTitle>/)
  assert.match(view, /<DialogDescription>/)
  assert.match(view, /<FieldGroup>/)
  assert.match(view, /<Collapsible v-model:open="advancedOpen">/)
  assert.match(view, /<Collapsible v-model:open="technicalOpen">/)
  assert.match(view, /<Table(?:\s|>)/)
  assert.match(view, /<Empty/)
  assert.match(view, /@click="previewRelease"/)
  assert.match(view, /gameReleases\.actions\.check/)
  assert.match(view, /gameReleasesV2API\.preview/)
  assert.match(view, /gameReleasesV2API\.create/)
  assert.match(view, /gameReleasesV2API\.retry/)
  assert.match(view, /managementScopeRequest\(managementScope\.value\)/)
  assert.match(view, /MANAGEMENT_SCOPE_CHANGED_EVENT/)
  assert.match(view, /jobsV2API\.controlPlaneGet\(jobId\)/)
  assert.match(view, /await loadHistory\(\)/)
  assert.doesNotMatch(view, /Promise\.all\(\[loadHistory\(\), previewRelease/)
  assert.match(view, /gameReleaseNodeCount\(planInstallations\.value\)/)
  assert.match(view, /gameReleaseGameVersions\(planInstallations\.value\)/)
  assert.match(view, /gameReleaseVersionChannels\(planInstallations\.value\)/)
  assert.match(view, /gameReleases\.nodes\.channelDescription/)
  assert.match(view, /function targetMetadata\(target\)/)
  assert.match(view, /gameReleasePlatformKey\(target\?\.os\)/)
  assert.match(view, /gameReleaseApplicationKey\(target\?\.appId\)/)
  assert.match(view, /blockerTargetLabel\(blocker\)/)
  assert.match(view, /target\?\.desiredVersion \|\| '--'/)
  assert.doesNotMatch(view, /target\.desiredVersion \|\| plan\.desiredVersion/)
  assert.match(view, /gameV2API\.version\(\{ fresh: true, lightweight: true \}\)/)
  assert.match(view, /const detail = blocker\?\.message\?\.trim\(\)/)
  assert.match(view, /target\.gameVersion \|\| '--'/)
  assert.match(view, /gameReleases\.simple\.latestOfficialVersion/)
  assert.doesNotMatch(view, /<Badge variant="outline">Steam build<\/Badge>/)
  assert.doesNotMatch(view, /bg-(blue|purple|orange|slate)-/)

  const technicalStart = view.indexOf('<Collapsible v-model:open="technicalOpen">')
  const technicalEnd = view.indexOf('</Collapsible>', technicalStart)
  const planHash = view.indexOf("gameReleases.plan.planHash")
  assert.ok(technicalStart >= 0 && planHash > technicalStart && planHash < technicalEnd)
  const nodes = view.indexOf("gameReleases.nodes.title")
  assert.ok(nodes >= 0 && nodes < technicalStart)
  for (const technicalValue of ['targetSteamVersions(target)', 'target.availableBytes', 'versionChannelLabel(target)', 'updateMethodLabel(target)']) {
    const position = view.indexOf(technicalValue, technicalStart)
    assert.ok(position > technicalStart && position < technicalEnd, `${technicalValue} should stay in technical details`)
  }
})

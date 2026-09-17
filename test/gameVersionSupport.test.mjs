import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { gameInstalledVersionStatus } from '../src/lib/gameInstalledVersion.mjs'

const adapters = fs.readFileSync(new URL('../src/api/v2LegacyAdapters.js', import.meta.url), 'utf8')
const gameVersionStatus = fs.readFileSync(new URL('../src/components/layout/GameVersionStatus.vue', import.meta.url), 'utf8')
const composable = fs.readFileSync(new URL('../src/composables/useDashboardV2.js', import.meta.url), 'utf8')

test('game version adapter keeps Klei releases separate from Steam builds', () => {
  assert.match(adapters, /officialRelease = version\.officialRelease/)
  assert.match(adapters, /version: officialRelease\.version/)
  assert.match(adapters, /version: version\.localVersion/)
  assert.match(adapters, /version: version\.latestVersion/)
  assert.match(adapters, /official_check_error: officialCheckError/)
})

test('global header keeps game versions compact and moves actions into a popover', () => {
  assert.match(gameVersionStatus, /const gameUpdateState = computed/)
  assert.match(gameVersionStatus, /const officialGameVersion = computed\(\(\) => versionInfo\.value\.official\?\.version \|\| '--'\)/)
  assert.match(gameVersionStatus, /dashboard\.version\.simpleTitle/)
  assert.match(gameVersionStatus, /dashboard\.version\.officialGame/)
  assert.doesNotMatch(gameVersionStatus, /dashboard\.version\.localSteamBuild/)
  assert.doesNotMatch(gameVersionStatus, /dashboard\.version\.latestSteamBuild/)
  assert.match(gameVersionStatus, /<Popover\b/)
  assert.match(gameVersionStatus, /gameReleasesV2API\.installedVersions\(managementScopeRequest\(managementScope\.value\)\)/)
  assert.doesNotMatch(gameVersionStatus, /gameReleasesV2API\.preview/)
  assert.match(gameVersionStatus, /useDashboardV2\(\{ observeRuntime: false \}\)/)
  assert.match(composable, /if \(!observeRuntime\) return\s+window\.addEventListener/)
  assert.match(gameVersionStatus, /MANAGEMENT_SCOPE_CHANGED_EVENT/)
  assert.match(gameVersionStatus, /gameReleaseNodeCount\(fleetInstallations\.value\)/)
  assert.match(gameVersionStatus, /gameReleaseGameVersions\(fleetInstallations\.value\)/)
  assert.match(gameVersionStatus, /gameReleaseVersionChannels\(fleetInstallations\.value\)/)
  assert.match(gameVersionStatus, /gameReleases\.nodes\.channelDescription/)
  assert.match(gameVersionStatus, /gameReleasePlatformKey\(target\?\.os\)/)
  assert.match(gameVersionStatus, /gameReleaseApplicationKey\(target\?\.appId\)/)
  assert.match(gameVersionStatus, /function fleetTargetMetadata\(target\)/)
  assert.match(gameVersionStatus, /target\?\.appId \? `App \$\{target\.appId\}`/)
  assert.match(gameVersionStatus, /function fleetTargetSteamVersions\(target\)/)
  assert.match(gameVersionStatus, /target\?\.steamBuild \|\| '--'/)
  assert.match(gameVersionStatus, /target\?\.branch \|\| '--'/)
  assert.doesNotMatch(gameVersionStatus, /target\.desiredVersion \|\| fleetPlan\?\.desiredVersion/)
  assert.match(gameVersionStatus, /<ScrollArea/)
  assert.match(gameVersionStatus, /<Collapsible v-if="!fleetError && fleetInstallations\.length" v-model:open="technicalOpen">/)
  assert.match(gameVersionStatus, /dashboard\.version\.currentGameVersion/)
  assert.match(gameVersionStatus, /dashboard\.version\.latestOfficialVersion/)
  assert.match(gameVersionStatus, /w-\[min\(24rem,calc\(100vw-2rem\)\)\]/)
  assert.match(gameVersionStatus, /@update:open="handlePopoverOpen"/)
  assert.match(gameVersionStatus, /v-if="fleetInstallations\.length"/)
  assert.match(gameVersionStatus, /openFleetUpdates/)
  assert.match(gameVersionStatus, /isVersionOutdated && canUpdateGame/)
  assert.match(gameVersionStatus, /v-else-if="isVersionOutdated" size="sm" variant="outline"/)
  assert.match(gameVersionStatus, /router\.push\('\/servers\/releases'\)/)
  assert.match(gameVersionStatus, /v-else-if="canInstallGame && localActionsVisible"/)
  assert.match(gameVersionStatus, /managementScopeIncludesTarget\('local', managementScope\.value\)/)
  assert.match(gameVersionStatus, /@click="updateGame"/)
  assert.doesNotMatch(gameVersionStatus, /<Card/)
  assert.doesNotMatch(gameVersionStatus, /updateStatus\.last_output/)
  assert.doesNotMatch(gameVersionStatus, /dashboard\.version\.steamUpdateState/)
  assert.match(gameVersionStatus, /versionInfo\.value\.official\?\.update_url/)
  assert.match(gameVersionStatus, /const KLEI_DST_RELEASES_URL = 'https:\/\/kleiforums\.com\/game-updates\/dst\/'/)
  assert.match(gameVersionStatus, /dashboard\.version\.currentReleaseNotes/)
  assert.match(gameVersionStatus, /dashboard\.version\.releaseHistory/)
})

test('update availability only follows the server comparison result', () => {
  assert.match(composable, /latest\?\.up_to_date === false/)
  assert.doesNotMatch(composable, /Number\(localValue\)/)
  assert.doesNotMatch(composable, /local < latest/)
})

test('lightweight version checks expose stable, test and query errors separately', () => {
  assert.match(adapters, /gameV2API\.version\(\{ fresh, lightweight: true \}\)/)
  assert.match(gameVersionStatus, /loadVersion\(\{ fresh: true \}\)/)
  assert.match(gameVersionStatus, /officialError\.value \|\| fleetError\.value/)
  assert.match(gameVersionStatus, /target\.error/)
  assert.match(gameVersionStatus, /officialTestRelease\.version/)
})

test('installed version comparison never treats test or failed reads as stable updates', () => {
  const installation = { installed: true, online: true, branch: 'public', gameVersion: '747465' }
  const official = { version: '747465', test_release: { version: '751622' } }
  const status = (changes = {}, release = official) => gameInstalledVersionStatus({ ...installation, ...changes }, release).key
  assert.equal(status(), 'upToDate')
  assert.equal(status({ gameVersion: '740477' }), 'ready')
  assert.equal(status({ gameVersion: '751622' }), 'unknown')
  assert.equal(status({ branch: 'updatebeta', gameVersion: '751622' }), 'testBranch')
  assert.equal(status({ branch: 'custom' }), 'otherBranch')
  assert.equal(status({ branch: '' }), 'unknown')
  assert.equal(status({ installed: false }), 'notInstalled')
  assert.equal(status({ online: false }), 'checkFailed')
  assert.equal(status({ error: 'context deadline exceeded' }), 'checkFailed')
  assert.equal(status({}, { ...official, stale: true }), 'unknown')
  assert.equal(status({}, { ...official, check_error: 'HTTP 503' }), 'unknown')
  assert.equal(status({ gameVersion: '' }), 'unknown')
  assert.equal(status({}, null), 'unknown')
})

test('queued game installation remains busy until the job becomes terminal', () => {
  assert.match(adapters, /run\.status === 'queued' \|\| run\.status === 'running'/)
  assert.match(adapters, /is_running: active/)
})

import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

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
  assert.match(gameVersionStatus, /const currentVersion = computed\(\(\) => versionInfo\.value\.local\?\.version \|\| '--'\)/)
  assert.match(gameVersionStatus, /const latestVersion = computed\(\(\) => versionInfo\.value\.latest\?\.version \|\| '--'\)/)
  assert.match(gameVersionStatus, /dashboard\.version\.simpleTitle/)
  assert.match(gameVersionStatus, /dashboard\.version\.currentVersion/)
  assert.match(gameVersionStatus, /dashboard\.version\.latestVersion/)
  assert.match(gameVersionStatus, /<Popover\b/)
  assert.match(gameVersionStatus, /isVersionOutdated && canUpdateGame/)
  assert.match(gameVersionStatus, /v-else-if="isVersionOutdated" size="sm" variant="outline"/)
  assert.match(gameVersionStatus, /router\.push\('\/servers\/releases'\)/)
  assert.match(gameVersionStatus, /v-if="canInstallGame"/)
  assert.match(gameVersionStatus, /@click="updateGame"/)
  assert.doesNotMatch(gameVersionStatus, /<Card/)
  assert.doesNotMatch(gameVersionStatus, /updateStatus\.last_output/)
  assert.doesNotMatch(gameVersionStatus, /dashboard\.version\.officialGame/)
  assert.doesNotMatch(gameVersionStatus, /dashboard\.version\.localSteamBuild/)
  assert.doesNotMatch(gameVersionStatus, /dashboard\.version\.steamUpdateState/)
  assert.doesNotMatch(gameVersionStatus, /versionInfo\.official\.update_url/)
})

test('update availability only follows the Steam API boolean result', () => {
  assert.match(composable, /latest\?\.up_to_date === false/)
  assert.doesNotMatch(composable, /Number\(localValue\)/)
  assert.doesNotMatch(composable, /local < latest/)
})

test('queued game installation remains busy until the job becomes terminal', () => {
  assert.match(adapters, /run\.status === 'queued' \|\| run\.status === 'running'/)
  assert.match(adapters, /is_running: active/)
})

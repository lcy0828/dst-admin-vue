import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const adapters = fs.readFileSync(new URL('../src/api/v2LegacyAdapters.js', import.meta.url), 'utf8')
const dashboard = fs.readFileSync(new URL('../src/views/v2/DashboardV2.vue', import.meta.url), 'utf8')
const composable = fs.readFileSync(new URL('../src/composables/useDashboardV2.js', import.meta.url), 'utf8')

test('game version adapter keeps Klei releases separate from Steam builds', () => {
  assert.match(adapters, /officialRelease = version\.officialRelease/)
  assert.match(adapters, /version: officialRelease\.version/)
  assert.match(adapters, /version: version\.localVersion/)
  assert.match(adapters, /version: version\.latestVersion/)
  assert.match(adapters, /official_check_error: officialCheckError/)
})

test('dashboard summarizes game updates without exposing build details', () => {
  assert.match(dashboard, /const gameUpdateState = computed/)
  assert.match(dashboard, /dashboard\.version\.simpleTitle/)
  assert.match(dashboard, /isVersionOutdated && canUpdateGame/)
  assert.match(dashboard, /router\.push\('\/servers\/releases'\)/)
  assert.match(dashboard, /v-if="canInstallGame"/)
  assert.match(dashboard, /@click="updateGame"/)
  assert.doesNotMatch(dashboard, /dashboard\.version\.officialGame/)
  assert.doesNotMatch(dashboard, /dashboard\.version\.localSteamBuild/)
  assert.doesNotMatch(dashboard, /dashboard\.version\.steamUpdateState/)
  assert.doesNotMatch(dashboard, /versionInfo\.official\.update_url/)
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

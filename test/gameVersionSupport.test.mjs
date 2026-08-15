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

test('dashboard labels official game versions and Steam builds independently', () => {
  assert.match(dashboard, /dashboard\.version\.officialGame/)
  assert.match(dashboard, /dashboard\.version\.localSteamBuild/)
  assert.match(dashboard, /dashboard\.version\.steamUpdateState/)
  assert.match(dashboard, /versionInfo\.official\.update_url/)
  assert.match(dashboard, /router\.push\('\/servers\/releases'\)/)
  assert.match(dashboard, /gameReleases\.actions\.open/)
  assert.doesNotMatch(dashboard, /@click="updateGame"/)
})

test('update availability only follows the Steam API boolean result', () => {
  assert.match(composable, /latest\?\.up_to_date === false/)
  assert.doesNotMatch(composable, /Number\(localValue\)/)
  assert.doesNotMatch(composable, /local < latest/)
})

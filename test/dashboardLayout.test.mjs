import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const dashboard = fs.readFileSync(new URL('../src/views/v2/DashboardV2.vue', import.meta.url), 'utf8')

test('dashboard starts with useful room operations without redundant overview chrome', () => {
  assert.doesNotMatch(dashboard, /grid grid-cols-2 gap-x-5 gap-y-3 px-4 py-2\.5 sm:grid-cols-4/)
  assert.doesNotMatch(dashboard, /<CardHeader class="sr-only">/)
  assert.equal((dashboard.match(/<Card size="sm">/g) || []).length, 2)
  assert.doesNotMatch(dashboard, /dashboard\.summary\.(runningShards|onlinePlayers|roomsAndWorlds|hostLoad)/)
  assert.match(dashboard, /grid min-w-0 grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2/)
  assert.match(dashboard, /<ServerWorkspace id="room-operations" embedded/)
  assert.doesNotMatch(dashboard, /dashboard\.(title|subtitle|lastUpdated|refreshAll)/)
  assert.doesNotMatch(dashboard, /roomOperations|deploymentPackaging/)
  assert.doesNotMatch(dashboard, /dashboard\.roomsOverview\.openControl/)
  assert.doesNotMatch(dashboard, /path: '\/servers\/workspace'/)
  assert.match(dashboard, /router\.push\('\/servers\/releases'\)/)
  assert.match(dashboard, /dashboard\.version\.openUpdateHelp/)
  assert.match(dashboard, /v-if="canInstallGame"/)
  assert.match(dashboard, /v-else-if="isVersionOutdated && canUpdateGame"/)
  assert.match(dashboard, /@click="updateGame"/)
  assert.doesNotMatch(dashboard, /<WorldLog|components\/WorldLog/)
  assert.doesNotMatch(dashboard, /handleServerAction|cleanupFailedServer|openStartDialog|startDialogOpen/)
  assert.doesNotMatch(dashboard, /dashboard\.summary\.serverProcesses/)
  assert.doesNotMatch(dashboard, /dashboard\.servers\.totalInstances/)
  assert.doesNotMatch(dashboard, /flex flex-col gap-5 pt-1/)
})

import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const dashboard = fs.readFileSync(new URL('../src/views/v2/DashboardV2.vue', import.meta.url), 'utf8')

test('dashboard keeps summary, resources, logs, and version panels compact', () => {
  assert.match(dashboard, /grid gap-3 sm:grid-cols-2 xl:grid-cols-4/)
  assert.equal((dashboard.match(/<Card size="sm">/g) || []).length, 8)
  assert.match(dashboard, /grid min-w-0 grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2/)
  assert.match(dashboard, /h-\[400px\] min-h-\[320px\]/)
  assert.match(dashboard, /router\.push\('\/servers\/releases'\)/)
  assert.match(dashboard, /gameReleases\.actions\.open/)
  assert.doesNotMatch(dashboard, /@click="updateGame"/)
  assert.doesNotMatch(dashboard, /dashboard\.summary\.serverProcesses/)
  assert.doesNotMatch(dashboard, /dashboard\.servers\.totalInstances/)
  assert.doesNotMatch(dashboard, /h-\[460px\] min-h-\[380px\]/)
  assert.doesNotMatch(dashboard, /flex flex-col gap-5 pt-1/)
})

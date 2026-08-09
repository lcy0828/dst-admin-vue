import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('localized pages do not prefer adapter messages for successful actions', () => {
  const dashboard = fs.readFileSync(new URL('../src/composables/useDashboardV2.js', import.meta.url), 'utf8')
  const logs = fs.readFileSync(new URL('../src/views/LogQueryView.vue', import.meta.url), 'utf8')

  assert.doesNotMatch(dashboard, /toast\.success\(response\.msg/)
  assert.match(dashboard, /toast\.success\(translate\('dashboard\.feedback\.roomStarted'/)
  assert.doesNotMatch(logs, /toast\.success\(response\.msg/)
  assert.match(logs, /toast\.success\(this\.\$t\('logs\.query\.feedback\.cleanupSuccess'\)\)/)
})

import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  dashboardOnboardingState,
  normalizePackaging,
  requiredSetupBlockers
} from '../src/lib/dashboardOnboarding.mjs'

const dashboard = fs.readFileSync(new URL('../src/views/v2/DashboardV2.vue', import.meta.url), 'utf8')
const onboarding = fs.readFileSync(new URL('../src/components/dashboard/DashboardOnboarding.vue', import.meta.url), 'utf8')
const api = fs.readFileSync(new URL('../src/api/v2.js', import.meta.url), 'utf8')

test('local onboarding advances from installation through room creation and startup', () => {
  const install = dashboardOnboardingState({ installed: false, roomCount: 0, runningShards: 0 })
  assert.equal(install.currentStep, 'game')
  assert.equal(install.progress, 0)

  const room = dashboardOnboardingState({ installed: true, roomCount: 0, runningShards: 0 })
  assert.equal(room.currentStep, 'room')
  assert.equal(room.progress, 33)

  const start = dashboardOnboardingState({ installed: true, roomCount: 1, runningShards: 0 })
  assert.equal(start.currentStep, 'start')
  assert.equal(start.progress, 67)

  const complete = dashboardOnboardingState({ installed: true, roomCount: 1, runningShards: 2 })
  assert.equal(complete.complete, true)
  assert.equal(complete.visible, false)
  assert.equal(complete.progress, 100)
})

test('controller-only onboarding directs users to remote nodes', () => {
  const state = dashboardOnboardingState({ localExecutorEnabled: false })
  assert.equal(state.mode, 'remote')
  assert.equal(state.currentStep, 'agent')
  assert.equal(state.visible, true)

  const active = dashboardOnboardingState({ localExecutorEnabled: false, runningShards: 1 })
  assert.equal(active.complete, true)
  assert.equal(active.visible, false)
})

test('readiness blockers ignore the expected missing executable before installation', () => {
  const checks = [
    { id: 'serverExecutable', required: true, status: 'fail' },
    { id: 'savePath', required: true, status: 'fail' },
    { id: 'steamcmd', required: false, status: 'warning' }
  ]
  assert.deepEqual(requiredSetupBlockers(checks, { installed: false }).map(check => check.id), ['savePath'])
  assert.deepEqual(requiredSetupBlockers(checks, { installed: true }).map(check => check.id), ['serverExecutable', 'savePath'])
})

test('dashboard onboarding uses real capabilities, checks, and shadcn controls', () => {
  assert.match(api, /setupChecks: \(\) => client\.get\('\/system\/setup-checks'/)
  assert.match(dashboard, /<DashboardOnboarding/)
  assert.match(dashboard, /:capabilities="capabilities"/)
  assert.match(dashboard, /dashboard\.onboarding\.packaging/)
  assert.match(onboarding, /<Progress :model-value="state\.progress"/)
  assert.match(onboarding, /<Alert v-if="blockers\.length"/)
  assert.match(onboarding, /router\.push\('\/agents\/list'\)/)
  assert.match(onboarding, /router\.push\('\/system\/settings'\)/)
  assert.doesNotMatch(onboarding, /bg-(?:blue|green|red|yellow)-[0-9]/)
})

test('unknown packaging values fall back to native guidance', () => {
  assert.equal(normalizePackaging('container'), 'container')
  assert.equal(normalizePackaging('future-mode'), 'native')
})

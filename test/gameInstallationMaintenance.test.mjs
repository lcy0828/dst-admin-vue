import test from 'node:test'
import assert from 'node:assert/strict'
import { installationMaintenanceReady, installationMaintenanceRequest, installationMaintenanceWorlds } from '../src/lib/gameInstallation.mjs'

const selected = { targetId: 'agent:node', installationId: 'secondary' }
function preview() {
  return { mode: 'release', ready: true, installation: { ...selected, canInstall: true, usageState: 'running' }, blockers: [], plan: {
    ready: true, planHash: 'a'.repeat(64), selectedInstallations: [{ ...selected }],
    policy: { validate: true, restartRunning: true, cleanCache: false, loadConfirmation: 'logs', timeoutSeconds: 300 },
    installations: [{ targetName: 'Agent', shards: [{ roomId: 'room', worldId: 'master', wasRunning: true }, { roomId: 'room', worldId: 'archive', wasRunning: false }] }],
  } }
}

test('maintenance submits the confirmed exact scope and policy with hash confirmation', () => {
  const value = preview()
  const request = installationMaintenanceRequest(value, selected)
  assert.deepEqual(request.installations, [selected])
  assert.equal(request.policy.validate, true)
  assert.equal(request.confirmation, value.plan.planHash)
  assert.equal(request.planHash, value.plan.planHash)
  assert.equal(request.targetIds, undefined)
  assert.equal(installationMaintenanceWorlds(value).filter(world => world.wasRunning).length, 1)
  value.plan.policy.restartRunning = false
  assert.equal(installationMaintenanceRequest(value, selected).policy.restartRunning, false)
})

test('unconfirmed, stale or blocked preflight cannot become a mutation', () => {
  assert.equal(installationMaintenanceRequest(null, selected), null)
  for (const change of [value => { value.ready = false }, value => { value.blockers.push({ code: 'UNMANAGED_GAME_RUNNING' }) }, value => { value.installation.targetId = 'local' }, value => { value.plan.planHash = '' }, value => { value.plan.ready = false }, value => { value.plan.policy.validate = false }, value => { value.plan.selectedInstallations[0].installationId = 'default' }]) {
    const value = preview(); change(value)
    assert.equal(installationMaintenanceRequest(value, selected), null)
  }
  assert.equal(installationMaintenanceReady(preview(), { ...selected, targetId: 'local' }), false)
})

test('direct installation requires explicit idle observation, including older Agent replies', () => {
  const value = preview(); value.mode = 'install'; delete value.plan
  for (const state of ['running', 'unknown', undefined]) {
    value.installation.usageState = state
    assert.equal(installationMaintenanceRequest(value, selected), null)
  }
  value.installation.usageState = 'idle'
  assert.deepEqual(installationMaintenanceRequest(value, selected), selected)
})

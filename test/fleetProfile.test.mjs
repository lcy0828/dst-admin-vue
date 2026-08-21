import assert from 'node:assert/strict'
import test from 'node:test'

import { FLEET_ROLES, fleetFlagsForRole, fleetRoleFromFlags } from '../src/lib/fleetProfile.mjs'

const cases = [
  [FLEET_ROLES.STANDALONE, true, false, false],
  [FLEET_ROLES.CONTROLLER_WORKER, true, true, false],
  [FLEET_ROLES.MANAGED_WORKER, true, false, true],
  [FLEET_ROLES.CONTROLLER_ONLY, false, true, false]
]

test('Fleet roles map to one valid set of execution flags', () => {
  for (const [role, localExecutorEnabled, controllerEnabled, memberEnabled] of cases) {
    const flags = fleetFlagsForRole(role)
    assert.deepEqual(flags, { localExecutorEnabled, controllerEnabled, memberEnabled })
    assert.equal(fleetRoleFromFlags(flags), role)
  }
})

test('unknown roles fall back to local standalone operation', () => {
  assert.deepEqual(fleetFlagsForRole('unknown'), {
    localExecutorEnabled: true,
    controllerEnabled: false,
    memberEnabled: false
  })
})

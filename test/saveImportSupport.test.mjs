import assert from 'node:assert/strict'
import test from 'node:test'

import {
  defaultSaveImportPlan,
  isSupportedSaveImportFile,
  missingWorkshopMods,
  normalizeSaveImportPlan,
  saveImportCompatibilityKey,
  saveImportStatusKey,
  validateSaveImportPlan
} from '../src/lib/saveImportSupport.mjs'

const candidate = {
  id: 'candidate-1',
  directoryName: 'Cluster_1',
  name: 'Survival',
  compatibility: 'needs_attention',
  tokenPresent: false,
  diagnostics: [{ code: 'CLUSTER_TOKEN_MISSING' }],
  mods: [{ id: '1', downloaded: true }, { id: '2', downloaded: false }]
}

test('save import support accepts only implemented archive formats', () => {
  assert.equal(isSupportedSaveImportFile('cluster.ZIP'), true)
  assert.equal(isSupportedSaveImportFile('cluster.tar.gz'), true)
  assert.equal(isSupportedSaveImportFile('cluster.tgz'), true)
  assert.equal(isSupportedSaveImportFile('cluster.7z'), false)
})

test('save import protocol values resolve to locale keys', () => {
  assert.equal(saveImportStatusKey('ready'), 'backups.imports.statuses.ready')
  assert.equal(saveImportStatusKey('unexpected'), 'backups.imports.statuses.unknown')
  assert.equal(saveImportCompatibilityKey('needs_attention'), 'backups.imports.compatibility.needs_attention')
})

test('new import defaults preserve source intent while avoiding port conflicts', () => {
  const plan = defaultSaveImportPlan(candidate)
  assert.equal(plan.directoryName, 'Cluster_1')
  assert.equal(plan.tokenPolicy, 'provided')
  assert.equal(plan.networkPolicy, 'auto')
  assert.equal(plan.modPolicy, 'install_missing')
  assert.deepEqual(missingWorkshopMods(candidate).map(mod => mod.id), ['2'])
})

test('mode changes remove policies that are invalid outside replacement', () => {
  const plan = normalizeSaveImportPlan({
    ...defaultSaveImportPlan(candidate, 'replace'),
    mode: 'clone',
    directoryName: 'Clone_1'
  }, candidate)
  assert.notEqual(plan.tokenPolicy, 'preserve')
  assert.equal(plan.networkPolicy, 'auto')
  assert.equal(plan.targetRoomId, '')
  assert.equal(plan.confirmation, '')
})

test('deployment validation requires exact replacement confirmation and token intent', () => {
  const replacement = defaultSaveImportPlan(candidate, 'replace')
  replacement.targetRoomId = 'room-1'
  assert.equal(validateSaveImportPlan(replacement, candidate, { id: 'room-1', name: 'Existing Room' }), 'confirmationMismatch')

  replacement.confirmation = 'Existing Room'
  assert.equal(validateSaveImportPlan(replacement, candidate, { id: 'room-1', name: 'Existing Room' }), '')

  const create = defaultSaveImportPlan(candidate)
  assert.equal(validateSaveImportPlan(create, candidate, null), 'tokenRequired')
  create.tokenPolicy = 'none'
  assert.equal(validateSaveImportPlan(create, candidate, null), 'missingTokenNotAllowed')
  create.allowMissingToken = true
  assert.equal(validateSaveImportPlan(create, candidate, null), '')
})

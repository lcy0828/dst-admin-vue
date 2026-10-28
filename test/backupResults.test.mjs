import test from 'node:test'
import assert from 'node:assert/strict'
import { backupArtifactState, backupFailureMessage, verifiedBackupParts } from '../src/lib/backupResults.mjs'
const t = key => key

test('a historical barrier failure is not described as a corrupt ZIP', () => {
  const value = { status: 'failed', artifactState: 'not_generated', failure: 'cross-shard snapshot barrier failed' }
  assert.equal(backupArtifactState(value), 'not_generated')
  assert.equal(backupFailureMessage(value, { failure: value.failure }, t), 'distributed.backups.failureReasons.SNAPSHOT_ROUND_UNCONFIRMED')
})
test('structured save and release results retain their distinct meanings', () => {
  const value = { status: 'failed', failureCode: 'SAVE_IN_PROGRESS', barrierReleaseState: 'unconfirmed' }
  assert.equal(backupFailureMessage(value, null, t), 'distributed.backups.failureReasons.SAVE_IN_PROGRESS')
  assert.equal(backupArtifactState(value), 'not_generated')
})
test('published files that are missing or corrupt never count as verified', () => {
  for (const artifactState of ['missing', 'corrupt']) {
    const value = { status: 'verified', artifactState, parts: [{ status: 'verified', artifactState }] }
    assert.equal(verifiedBackupParts(value), 0)
    assert.equal(backupFailureMessage(value, null, t), `distributed.backups.artifacts.${artifactState}`)
  }
})
test('legacy verified backup and new staging result stay compatible', () => {
  assert.equal(verifiedBackupParts({ parts: [{ status: 'verified', size: 3 }, { status: 'pending' }] }), 1)
  assert.equal(backupArtifactState({ artifactState: 'staging', status: 'creating' }), 'staging')
  assert.equal(backupFailureMessage({ status: 'failed', failure: 'disk full' }, null, t), 'disk full')
})

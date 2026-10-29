import test from 'node:test'
import assert from 'node:assert/strict'
import { backupArtifactState, backupFailureMessage, verifiedBackupParts } from '../src/lib/backupResults.mjs'
const t = key => key

test('receipt schema failures have one readable summary including historical failures', () => {
  const original = 'cross-shard snapshot barrier failed\njson: unknown field "commitRequested"\njson: unknown field "commitRequested"'
  for (const failureCode of [undefined, 'SNAPSHOT_ROUND_UNCONFIRMED', 'BACKUP_SNAPSHOT_BARRIER_FAILED', 'SNAPSHOT_RECEIPT_INVALID']) {
    const value = { status: 'failed', failureCode, failure: original }
    assert.equal(backupFailureMessage(value, null, t), 'distributed.backups.failureReasons.SNAPSHOT_RECEIPT_INVALID')
    assert.equal(value.failure, original)
  }
  assert.equal(backupFailureMessage({ failureCode: 'SAVE_WRITE_FAILED', failure: original }, null, t), 'distributed.backups.failureReasons.SAVE_WRITE_FAILED')
})

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

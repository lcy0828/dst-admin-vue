import assert from 'node:assert/strict'
import test from 'node:test'
import { readBackupSchedule, writeBackupSchedule } from '../src/lib/backupSchedule.mjs'

test('simple backup times are translated without guessing complex legacy schedules', () => {
  assert.deepEqual(readBackupSchedule('0 4 * * *'), { kind: 'daily', time: '04:00' })
  assert.deepEqual(readBackupSchedule('15 */6 * * *'), { kind: 'hourly', interval: 6, minute: 15 })
  for (const value of ['0 0 4 * * *', '0 4 * * 1', '0 1,4 * * *', '@daily', '90 4 * * *', '0 25 * * *']) {
    assert.equal(readBackupSchedule(value).kind, 'custom', value)
  }
})

test('simple schedule edits validate clock and interval boundaries', () => {
  assert.equal(writeBackupSchedule({ kind: 'daily', time: '23:59' }), '59 23 * * *')
  assert.equal(writeBackupSchedule({ kind: 'hourly', interval: 6, minute: 15 }), '15 */6 * * *')
  assert.equal(writeBackupSchedule({ kind: 'daily', time: '24:00' }), null)
  assert.equal(writeBackupSchedule({ kind: 'hourly', interval: 0 }), null)
  assert.equal(writeBackupSchedule({ kind: 'hourly', interval: 1, minute: 60 }), null)
})

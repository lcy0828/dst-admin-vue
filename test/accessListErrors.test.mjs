import test from 'node:test'
import assert from 'node:assert/strict'
import { accessListReadError } from '../src/lib/accessListErrors.mjs'

const translate = (key, values) => `${key}: ${JSON.stringify(values)}`

test('access list diagnostics identify the file and line without echoing untrusted file paths or records', () => {
  const message = accessListReadError({ code: 'ACCESS_LIST_INVALID', details: { file: 'blocklist.txt', line: 2, reason: 'invalid_id' }, requestId: 'request-123' }, translate)
  assert.match(message, /invalidFileLine/)
  assert.match(message, /blocklist\.txt/)
  assert.match(message, /"line":2/)
  assert.match(message, /request-123/)
  const unsafe = accessListReadError({ code: 'ACCESS_LIST_INVALID', details: { file: '/private/player-records', line: 'user-id', reason: '<script>secret</script>' } }, translate)
  assert.doesNotMatch(unsafe, /player-records|user-id|secret/)
  assert.match(unsafe, /targetReadFailed/)
  assert.equal(accessListReadError({ code: 'AGENT_UPGRADE_REQUIRED', message: 'Upgrade Agent' }, translate), 'Upgrade Agent')
})

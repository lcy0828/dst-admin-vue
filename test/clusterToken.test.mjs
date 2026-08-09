import test from 'node:test'
import assert from 'node:assert/strict'
import { clusterTokenError } from '../src/lib/clusterToken.mjs'

test('cluster token validation rejects incomplete values without fixing the provider format', () => {
  assert.equal(clusterTokenError('expired'), '令牌内容不完整，请填写完整的 Klei 集群令牌')
  assert.equal(clusterTokenError('future_token_format_123'), '')
  assert.equal(clusterTokenError('pds-g^complete token'), '令牌不能包含空格或换行')
  assert.equal(clusterTokenError('', { required: false }), '')
})

test('cluster token validation delegates display messages to the active locale', () => {
  const translator = key => `translated:${key}`

  assert.equal(
    clusterTokenError('expired', { translator }),
    'translated:rooms.token.validation.incomplete',
  )
})

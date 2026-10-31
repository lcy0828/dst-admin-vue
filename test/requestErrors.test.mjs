import assert from 'node:assert/strict'
import test from 'node:test'
import { errorReport, recentRequestErrors, rememberRequestError, requestErrorMessage } from '../src/lib/requestErrors.mjs'

test('request summaries preserve uncertainty and keep raw diagnostics separately', () => {
  const error = { code: 'REQUEST_TIMEOUT', status: 0, rawMessage: 'diagnostic detail', details: { reason: 'probe failed' }, requestId: 'synthetic-request' }
  assert.match(requestErrorMessage(error), /暂时无法确认/)
  assert.doesNotMatch(requestErrorMessage(error), /diagnostic|synthetic-request|probe/)
  assert.deepEqual(JSON.parse(errorReport(error)), { code: error.code, status: error.status, message: error.rawMessage, details: error.details, requestId: error.requestId })
})

test('unknown request errors never show raw transport messages and error history stays bounded', () => {
  assert.match(requestErrorMessage({ code: 'FUTURE_CODE', message: 'raw internal path', status: 503 }), /报错记录/)
  assert.match(requestErrorMessage({ status: 403 }, 'en-US'), /permission/)
  for (let i = 0; i < 10; i++) rememberRequestError({ code: 'TEST', message: String(i) })
  assert.equal(recentRequestErrors().length, 5)
  assert.equal(recentRequestErrors()[0].message, '9')
})

test('account validation errors are not confused with expired sessions', () => {
  assert.match(requestErrorMessage({ code: 'INVALID_CREDENTIALS', status: 401 }), /用户名或密码/)
  assert.match(requestErrorMessage({ code: 'CURRENT_PASSWORD_INVALID', status: 401 }, 'en-US'), /current password/)
  assert.match(requestErrorMessage({ status: 401 }), /登录已过期/)
  assert.doesNotMatch(requestErrorMessage({ status: 409 }), /设置已被其他操作修改/)
})

test('copied errors redact credentials and bound recursive diagnostic data', () => {
 const loop = { accessToken: 'synthetic-secret', reason: 'https://username:password@example.invalid/ Bearer synthetic-secret' }
 loop.self = loop
 const report = errorReport({ details: loop })
 assert.doesNotMatch(report, /synthetic-secret|username:password/)
 assert.match(report, /hidden/)
 assert.ok(report.length < 10000)
})

test('wide diagnostic objects share a total output budget', () => {
 const details = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [String(i), Array(30).fill('x'.repeat(4000))]))
 const report = errorReport({ requestId: 'synthetic-request', details })
 assert.ok(report.length < 20000)
 assert.equal(JSON.parse(report).requestId, 'synthetic-request')
})

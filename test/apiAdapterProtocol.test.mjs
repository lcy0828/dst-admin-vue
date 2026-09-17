import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import {
  AdapterProtocolError,
  adapterError,
  adapterSuccess
} from '../src/api/adapterProtocol.mjs'

const ADAPTER_FILES = [
  'agentApi.js',
  'logApi.js',
  'modApi.js',
  'playerApi.js',
  'v2ConfigurationAdapters.js',
  'v2LegacyAdapters.js'
]
const jobAdapterSource = fs.readFileSync(new URL('../src/api/v2ConfigurationAdapters.js', import.meta.url), 'utf8')

test('legacy adapter success envelopes expose stable protocol identifiers', () => {
  assert.deepEqual(adapterSuccess({ id: 'job-1' }, 'job_submitted'), {
    status: 200,
    data: { id: 'job-1' },
    msg: 'job_submitted'
  })
  assert.deepEqual(adapterSuccess(null, 'agent_command_submitted', {
    numericCode: true,
    messageAlias: true,
    successFlag: true
  }), {
    status: 200,
    data: null,
    msg: 'agent_command_submitted',
    code: 200,
    message: 'agent_command_submitted',
    success: true
  })
  assert.throws(() => adapterSuccess(null, '操作成功'), /stable protocol identifier/)
})

test('adapter errors keep stable codes and technical detail separate', () => {
  const error = adapterError('ROOM_NOT_FOUND', {
    detail: 'lookup failed after catalog refresh',
    context: { reference: '周末服' }
  })
  assert.equal(error instanceof AdapterProtocolError, true)
  assert.equal(error.message, 'The requested room was not found: lookup failed after catalog refresh')
  assert.equal(error.code, 'ROOM_NOT_FOUND')
  assert.equal(error.detail, 'lookup failed after catalog refresh')
  assert.deepEqual(error.context, { reference: '周末服' })
  assert.throws(() => adapterError('未找到房间'), /stable protocol identifier/)
})

test('job waiting prefers temporary SSE and uses low-frequency centralized polling as fallback', () => {
  assert.match(jobAdapterSource, /new EventSource\(jobsV2API\.eventsURL\(\)/)
  assert.match(jobAdapterSource, /JOB_POLL_INTERVAL_MS = 2_000/)
  assert.doesNotMatch(jobAdapterSource, /delay\(300\)/)
  assert.match(jobAdapterSource, /current = await jobsV2API\.controlPlaneGet\(job\.id\)/)
})

test('adapter envelopes and locally generated errors do not embed localized system text', () => {
  for (const file of ADAPTER_FILES) {
    const source = fs.readFileSync(new URL(`../src/api/${file}`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /const success = [^\n]*[\p{Script=Han}]/u, file)
    assert.doesNotMatch(source, /success\([^\n]*[\p{Script=Han}]/u, file)
    assert.doesNotMatch(source, /throw new Error\([^\n]*[\p{Script=Han}]/u, file)
    assert.doesNotMatch(source, /requireValue\([^\n]*[\p{Script=Han}]/u, file)
  }
})

test('the game update confirmation remains the backend-required protocol literal', () => {
  const source = fs.readFileSync(
    new URL('../src/api/v2LegacyAdapters.js', import.meta.url),
    'utf8'
  )
  assert.match(source, /gameV2API\.update\(\{ confirmation: '更新游戏'/)
})

test('base API fallbacks use stable codes without localized adapter text', () => {
  const client = fs.readFileSync(new URL('../src/api/v2.js', import.meta.url), 'utf8')
  const index = fs.readFileSync(new URL('../src/api/index.js', import.meta.url), 'utf8')
  assert.doesNotMatch(client, /['`][^'`]*[\p{Script=Han}][^'`]*['`]/u)
  assert.match(client, /code: 'REQUEST_TIMEOUT'/)
  assert.match(client, /error\.code === 'ECONNABORTED'/)
  assert.match(client, /code: 'BACKEND_UNAVAILABLE'/)
  assert.match(client, /code: 'INVALID_RESPONSE'/)
  assert.match(client, /body\?\.details\?\.reason/)
  assert.match(client, /this\.detail = detail/)
  assert.match(index, /adapterError\('ITEM_API_UNAVAILABLE'\)/)
})

test('configuration adapters preserve the revision observed by the editor', () => {
  assert.match(jobAdapterSource, /applyRoomConfiguration\(room, config, expectedRevision = ''\)/)
  assert.match(jobAdapterSource, /expectedRevision: expectedRevision \|\| current\.revision/)
  assert.match(jobAdapterSource, /this\.apply\(input\.savename, input\.worldname, server, \{\}, input\.expectedRevision, \{/)
  assert.match(jobAdapterSource, /this\.apply\(room\.id, world\.id, \{\}, overrides, input\.expectedRevision, \{/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { luaJITInstallationKey, luaJITJobTerminal, luaJITJobError } from '../src/lib/luajitInstaller.mjs'
import { luajitInstallerMessages } from '../src/i18n/luajitInstallerMessages.js'

test('LuaJIT installations retain both machine and installation identity', () => {
  assert.notEqual(luaJITInstallationKey({ targetId: 'local', installationId: 'second' }), luaJITInstallationKey({ targetId: 'agent:node', installationId: 'second' }))
  assert.notEqual(luaJITInstallationKey({ targetId: 'agent:a/b', installationId: 'c' }), luaJITInstallationKey({ targetId: 'agent:a', installationId: 'b/c' }))
})
test('LuaJIT progress stops on failure and preserves the failing target message', () => {
  const job = { status: 'failed', targets: [{ error: { message: 'Worlds are still running' } }] }
  assert.equal(luaJITJobTerminal(job), true)
  assert.equal(luaJITJobError(job), 'Worlds are still running')
  assert.equal(luaJITJobTerminal({ status: 'running' }), false)
  assert.equal(luaJITJobError({ status: 'succeeded' }), '')
  assert.notEqual(luaJITJobError({ status: 'canceled' }), '')
})
test('LuaJIT installer provides matching Chinese and English messages', () => {
  assert.deepEqual(Object.keys(luajitInstallerMessages['zh-CN'].luajitInstaller).sort(), Object.keys(luajitInstallerMessages['en-US'].luajitInstaller).sort())
})

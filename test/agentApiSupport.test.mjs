import test from 'node:test'
import assert from 'node:assert/strict'

import {
  bindAgentRuntimeInstallation,
  isLegacyCommandTerminal,
  normalizeAgentCommandTimeout,
  normalizeAgentRuntimeInstallations,
  normalizeRuntimePerformance
} from '../src/api/agentApiSupport.mjs'

test('Agent command timeout follows the backend 5 to 300 second contract', () => {
  assert.equal(normalizeAgentCommandTimeout(5), 5)
  assert.equal(normalizeAgentCommandTimeout('300'), 300)
  assert.throws(() => normalizeAgentCommandTimeout(4), error => (
    error.code === 'INVALID_AGENT_TIMEOUT' && /5 to 300/.test(error.message)
  ))
  assert.throws(() => normalizeAgentCommandTimeout(301), { code: 'INVALID_AGENT_TIMEOUT' })
  assert.throws(() => normalizeAgentCommandTimeout(10.5), { code: 'INVALID_AGENT_TIMEOUT' })
})

test('completed, failed and canceled commands are terminal', () => {
  assert.equal(isLegacyCommandTerminal('completed'), true)
  assert.equal(isLegacyCommandTerminal('failed'), true)
  assert.equal(isLegacyCommandTerminal('canceled'), true)
  assert.equal(isLegacyCommandTerminal('running'), false)
  assert.equal(isLegacyCommandTerminal('pending'), false)
})

test('Agent runtime installations normalize trusted camel and wire keys', () => {
  assert.deepEqual(normalizeAgentRuntimeInstallations([
    {
      id: 'container', driver: 'container', savePath: '/srv/save', serverPath: '/srv/server',
      steamcmdPath: '/usr/games/steamcmd', ugcPath: '/srv/ugc', workshopContentPath: '/srv/workshop', serverMode: '64'
    },
    { id: 'native', driver: 'native', save_path: '/opt/save', server_path: '/opt/server', server_mode: '32' },
    { id: 'container', savePath: '/duplicate', serverPath: '/duplicate' },
    { id: 'incomplete', savePath: '/missing-server' }
  ]), [
    {
      id: 'container', driver: 'container', savePath: '/srv/save', serverPath: '/srv/server',
      steamcmdPath: '/usr/games/steamcmd', ugcPath: '/srv/ugc', workshopContentPath: '/srv/workshop', serverMode: '64'
    },
    {
      id: 'native', driver: 'native', savePath: '/opt/save', serverPath: '/opt/server',
      steamcmdPath: '', ugcPath: '', workshopContentPath: '', serverMode: '32'
    }
  ])
})

test('selecting an Agent installation replaces only Agent-owned runtime fields', () => {
  assert.deepEqual(bindAgentRuntimeInstallation({
    displayName: 'Node A', backupPath: '/backup', luaBinary: 'lua', savePath: '/stale'
  }, {
    id: 'container', savePath: '/srv/save', serverPath: '/srv/server', steamcmdPath: '',
    ugcPath: '/srv/ugc', workshopContentPath: '/srv/workshop', serverMode: '64'
  }), {
    displayName: 'Node A', backupPath: '/backup', luaBinary: 'lua', installationId: 'container',
    savePath: '/srv/save', serverPath: '/srv/server', steamcmdPath: '', ugcPath: '/srv/ugc',
    workshopContentPath: '/srv/workshop', serverMode: '64'
  })
})

test('runtime performance reports keep compatibility state separate from server architecture', () => {
  assert.deepEqual(normalizeRuntimePerformance({
    provider: 'dontstarve-luajit2', status: 'incompatible', canEnable: true,
    packageVersion: '2.9.1', gameVersion: '747465', signatureVersion: '728321',
    binarySha256: 'A'.repeat(64), supportedModes: ['game', 'game', 'invalid'],
    issues: ['signature_version_mismatch', 'signature_version_mismatch']
  }), {
    provider: 'dontstarve-luajit2', status: 'incompatible', canEnable: false,
    packageVersion: '2.9.1', gameVersion: '747465', signatureVersion: '728321',
    binarySha256: 'a'.repeat(64), supportedModes: ['game'], issues: ['signature_version_mismatch']
  })
  assert.equal(normalizeRuntimePerformance({ provider: 'game', status: 'unknown' }), null)
})

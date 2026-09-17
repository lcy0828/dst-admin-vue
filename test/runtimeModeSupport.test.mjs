import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { runtimeModeMessages } from '../src/i18n/runtimeModeMessages.js'
import {
  firstSupportedLuaJITMode,
  luaJITPackageOptions,
  preferredRuntimePackageVersion,
  runtimeModeFromSelection,
  runtimePackageVersionReady,
  runtimeSelectionFromMode,
} from '../src/lib/runtimeModeSelection.mjs'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('room startup selects a verified Lua runtime once and forwards it to API v2', async () => {
  const [helper, feedback, host, api, adapter] = await Promise.all([
    source('src/lib/startCapacityRisk.js'),
    source('src/lib/feedback.js'),
    source('src/components/FeedbackHost.vue'),
    source('src/api/v2.js'),
    source('src/api/v2LegacyAdapters.js'),
  ])

  assert.match(helper, /roomApi\.getRuntimeModes\(input\)/)
  assert.match(helper, /selectRuntimeMode\(availability\)/)
  assert.doesNotMatch(helper, /modes\.some/)
  assert.match(helper, /runtime_mode: runtimeSelection\.mode/)
  assert.match(helper, /runtime_version: runtimeSelection\.version/)
  assert.match(feedback, /requestFeedback\('runtime-mode'/)
  assert.match(host, /<ToggleGroup[\s\S]*?runtimeEngineValue/)
  assert.match(host, /const runtimeEngineValue = ref\('game'\)/)
  assert.match(host, /runtimeModeFromSelection/)
  assert.match(host, /runtimeSelectionUnavailableReason\(\)/)
  assert.match(host, /runtimeVersionValue/)
  assert.match(host, /<Select[\s\S]*?runtimeVersionValue/)
  assert.match(host, /runtimeMode\.incompatibleTarget/)
  assert.match(JSON.stringify(runtimeModeMessages['zh-CN']), /DontStarveLuaJIT2/)
  assert.match(api, /runtime-modes/)
  assert.match(api, /runtimeMode: options\.runtimeMode/)
  assert.match(api, /runtimeVersion: options\.runtimeVersion/)
  assert.match(adapter, /runtimeVersion: params\?\.runtime_version \|\| params\?\.runtimeVersion/)
})

test('runtime package versions remain explicit and require matching verified targets', () => {
  const availability = {
    packages: [
      { id: 'game', provider: 'game', channel: 'bundled', platforms: ['darwin', 'linux'], processScopedModes: true },
      { id: 'v2', provider: 'dontstarve-luajit2', version: '2.9.2', channel: 'preview', platforms: ['darwin', 'linux'], processScopedModes: false },
      { id: 'v3', provider: 'dontstarve-luajit2', version: '3.0.0', channel: 'preview', platforms: ['linux'], processScopedModes: true },
    ],
    targets: [{ os: 'linux', packageVersion: '3.0.0', supportedModes: ['game', 'luajit'] }],
  }

  assert.deepEqual(luaJITPackageOptions(availability).map(option => option.version), ['2.9.2', '3.0.0'])
  assert.equal(preferredRuntimePackageVersion(availability), '3.0.0')
  assert.equal(runtimePackageVersionReady(availability, '3.0.0'), true)
  assert.equal(runtimePackageVersionReady(availability, '2.9.2'), false)

  const macWithoutLuaJIT = {
    ...availability,
    targets: [{ os: 'darwin', gameVersion: '747465', supportedModes: ['game'] }],
  }
  assert.equal(preferredRuntimePackageVersion(macWithoutLuaJIT), '2.9.2')
  assert.equal(runtimePackageVersionReady(macWithoutLuaJIT, '2.9.2'), false)
})

test('runtime selection uses upstream modes without a custom JIT override', async () => {
  assert.equal(runtimeModeFromSelection({ engine: 'game' }), 'game')
  assert.equal(runtimeModeFromSelection({ engine: 'luajit' }), 'luajit')
  assert.equal(runtimeModeFromSelection({ engine: 'luajit', generationalGCEnabled: true }), 'arena-gc')
  assert.deepEqual(runtimeSelectionFromMode('luajit'), { engine: 'luajit', generationalGCEnabled: false })
  assert.deepEqual(runtimeSelectionFromMode('arena-gc'), { engine: 'luajit', generationalGCEnabled: true })
  assert.equal(firstSupportedLuaJITMode(['luajit']), 'luajit')
  assert.equal(firstSupportedLuaJITMode(['luajit-jit-on']), '')
  assert.doesNotMatch(await source('src/components/FeedbackHost.vue'), /runtime-jit-enabled|runtimeJITEnabled|luajit-jit-on|luajit-jit-off/)
  assert.equal(runtimePackageVersionReady({packages:[{provider:'dontstarve-luajit2',version:'3.0.0',platforms:['linux']}],targets:[{os:'linux',packageVersion:'3.0.0',supportedModes:['game','luajit']}]},'3.0.0'),true)
})

test('Lua runtime selector locales stay aligned and English contains no Chinese display text', () => {
  assert.deepEqual(
    Object.keys(runtimeModeMessages['zh-CN'].runtimeMode.engines).sort(),
    Object.keys(runtimeModeMessages['en-US'].runtimeMode.engines).sort(),
  )
  assert.deepEqual(
    Object.keys(runtimeModeMessages['zh-CN'].runtimeMode.advanced).sort(),
    Object.keys(runtimeModeMessages['en-US'].runtimeMode.advanced).sort(),
  )
  assert.deepEqual(
    Object.keys(runtimeModeMessages['zh-CN'].runtimeMode.version).sort(),
    Object.keys(runtimeModeMessages['en-US'].runtimeMode.version).sort(),
  )
  assert.doesNotMatch(JSON.stringify(runtimeModeMessages['en-US']), /[\p{Script=Han}]/u)
})

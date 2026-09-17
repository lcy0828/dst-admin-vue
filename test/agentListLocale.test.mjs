import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { agentMessages } from '../src/i18n/agentMessages.js'

function messageKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return child && typeof child === 'object' && !Array.isArray(child)
      ? messageKeys(child, path)
      : [path]
  }).sort()
}

test('Agent locale catalogs expose matching keys and English display text', () => {
  assert.deepEqual(
    messageKeys(agentMessages['en-US']),
    messageKeys(agentMessages['zh-CN'])
  )
  assert.doesNotMatch(JSON.stringify(agentMessages['en-US']), /[\u3400-\u9fff]/)
})

test('Agent list localizes presentation without rewriting runtime values', async () => {
  const source = await readFile(new URL('../src/views/agents/AgentList.vue', import.meta.url), 'utf8')
  const template = source.split('<script>')[0]

  assert.doesNotMatch(template, /[\u3400-\u9fff]/)
  assert.match(source, /ToggleGroupItem value="64"/)
  assert.match(source, /ToggleGroupItem value="32"/)
  assert.doesNotMatch(source, /ToggleGroupItem value="luajit"/)
  assert.match(source, /selectedRuntimePerformance/)
  assert.match(source, /signature_version_mismatch/)
  assert.match(source, /plugin_layout_unverified/)
  assert.match(source, /<UiSelect[\s\S]*runtimeRegistrySupported/)
  assert.match(source, /bindAgentRuntimeInstallation/)
  assert.match(source, /installation_registry_supported/)
  assert.match(source, /luaBinary: 'lua'/)
  assert.match(source, /save: '\/opt\/dst\/saves'/)
})

test('Agent errors and time values recompute from stable state in the active locale', async () => {
  const source = await readFile(new URL('../src/views/agents/AgentList.vue', import.meta.url), 'utf8')

  assert.match(source, /return \{ key, detail: String\(error\?\.message \|\| ''\)\.trim\(\) \}/)
  assert.match(source, /errors\.displayName = 'agents\.list\.validation\.displayName'/)
  assert.match(source, /this\.\$t\('agents\.list\.duration\.daysHours'/)
  assert.match(source, /const localeState = this\.\$i18n\?\.locale/)
  assert.match(source, /formatSystemDateTime\(date, \{/)
})

test('Agent topology uses the typed inventory job and one-core-per-Shard capacity guidance', async () => {
  const [view, api, adapter] = await Promise.all([
    readFile(new URL('../src/views/agents/AgentList.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/v2.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/agentApi.js', import.meta.url), 'utf8')
  ])

  assert.match(api, /\/agents\/\$\{encode\(agentId\)\}\/inventory`/)
  assert.match(api, /\/inventory\/actions\/refresh`/)
  assert.match(view, /waitForV2Job\(job, 45000\)/)
  assert.match(view, /runtime\.inventory\.read/)
  assert.match(view, /capacityForAgent\(agent\)\.runningShards/)
  assert.match(adapter, /recommendedShardLimit: capacity\.recommendedShardLimit/)
  assert.match(adapter, /installation_registry_supported: Boolean\(agent\.installationRegistrySupported\)/)
  assert.match(adapter, /installations: normalizeAgentRuntimeInstallations\(agent\.installations\)/)
  assert.match(adapter, /runtime_auto_adopt_disabled: Boolean\(agent\.runtimeAutoAdoptDisabled\)/)
  assert.match(agentMessages['zh-CN'].agents.list.capacity.policyDescription, /1–2 核机器不额外预留整核/)
  assert.match(agentMessages['en-US'].agents.list.capacity.policyDescription, /1–2 CPUs reserve no full CPU/i)
})

test('machine management includes local runtime and persistent target renaming', async () => {
  const [view, api, navigation] = await Promise.all([
    readFile(new URL('../src/views/agents/AgentList.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/v2.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/v2/navigation.js', import.meta.url), 'utf8')
  ])

  assert.match(api, /rename: \(targetId, displayName\) => client\.patch\(`\/runtime-targets\/\$\{encode\(targetId\)\}`/)
  assert.match(view, /localRuntimeTarget/)
  assert.match(view, /systemV2API\.status\(\)/)
  assert.match(view, /runtimeTargetsV2API\.rename\(this\.renameTarget\.id, displayName\)/)
  assert.match(view, /machineName\(agent\)/)
  assert.match(view, /agents\.list\.rename\.hostname/)
  assert.match(view, /agents\.list\.actions\.assignWorlds/)
  assert.match(view, /navigateToTopology\(\)/)
  assert.match(view, /this\.\$router\.push\('\/rooms\/topology'\)/)
  assert.match(navigation, /navigation\.agentList/)
  assert.equal(agentMessages['zh-CN'].agents.list.title, '机器管理')
  assert.equal(agentMessages['en-US'].agents.list.title, 'Machine management')
  assert.equal(agentMessages['zh-CN'].agents.list.runtime.performance.statuses.not_installed, 'LuaJIT 未安装')
})

test('Agent version management uses typed releases and stable per-machine controls', async () => {
  const [view, api, adapter] = await Promise.all([
    readFile(new URL('../src/views/agents/AgentList.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/v2.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/agentApi.js', import.meta.url), 'utf8')
  ])

  assert.match(api, /client\.get\('\/agent-releases'/)
  assert.match(api, /body\.set\('version', version\)/)
  assert.match(api, /\/agents\/\$\{encode\(agentId\)\}\/actions\/upgrade/)
  assert.match(view, /agentUpdate\(agent\)\.updateAvailable/)
  assert.match(view, /canUpgradeAgent\(agent\)/)
  assert.match(view, /waitForV2Job\(job, 480000\)/)
  assert.match(view, /releaseForm\.file\.size > this\.releaseMaxUploadBytes/)
  assert.match(view, /releaseUploadProgress/)
  assert.match(view, /update\.mode === 'container'/)
  assert.match(view, /update\.mode === 'migration'/)
  assert.match(adapter, /update: agent\.update \|\| \{\}/)
  assert.equal(agentMessages['zh-CN'].agents.list.updates.manage, 'Agent 版本')
  assert.equal(agentMessages['en-US'].agents.list.updates.manage, 'Agent versions')
})

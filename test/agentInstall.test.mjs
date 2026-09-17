import test from 'node:test'
import assert from 'node:assert/strict'
import { agentInstallCommands, agentNativeConfig } from '../src/lib/agentInstall.mjs'
test('Agent Docker instructions use official mirrors and persistent node state', () => {
  const cn = agentInstallCommands('wss://dst.example.com/agent').docker
  const global = agentInstallCommands('wss://dst.example.com/agent', 'dockerhub').docker
  assert.match(cn, /registry.cn-hangzhou.aliyuncs.com\/dstadmin\/dst-admin-go:agent-v1.0.0/)
  assert.match(global, /lcy0828\/dst-admin-go:agent-v1.0.0/)
  assert.match(cn, /dst-admin-agent:\/var\/lib\/dst-admin-agent/)
  assert.match(cn, /--group-add/)
  assert.match(cn, /read -r DST_ADMIN_AGENT_SECURITY_KEY/)
  assert.match(agentNativeConfig('wss://dst.example.com/agent'), /\[runtime.native\]/)
})
test('installation commands quote server URLs without evaluating shell substitutions', () => {
  const commands = agentInstallCommands("wss://example.com/agent?x='$(false)")
  assert.ok(commands.linux.includes("'wss://example.com/agent?x='\\''$(false)'"))
  assert.ok(commands.windows.includes("'wss://example.com/agent?x=''$(false)'"))
})

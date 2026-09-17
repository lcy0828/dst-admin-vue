import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sourceUrl = new URL('../src/views/agents/AgentSecurity.vue', import.meta.url)

test('Agent security delegates visible copy to the active locale', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  const template = source.split('<script>')[0]

  assert.doesNotMatch(template, /[\u3400-\u9fff]/)
  assert.match(source, /\$t\('agents\.security\./)
  assert.doesNotMatch(source, /response\.message \|\|/)
})

test('Agent security preserves key, command, URL, and config protocols', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /VITE_AGENT_SERVER_URL/)
  assert.match(source, /agentInstallCommands/)
  assert.match(source, /nativeConfig/)
  assert.doesNotMatch(source, /SECURITY_KEY = \$\{this\.apiKey\}/)
  assert.doesNotMatch(source, /dockerUnavailable/)

})

test('Agent security stores stable load failures and preserves backend details', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /key: 'agents\.security\.feedback\.loadFailed'/)
  assert.match(source, /detail: String\(error\.message \|\| ''\)\.trim\(\)/)
  assert.match(source, /agents\.security\.feedback\.errorWithDetail/)
})

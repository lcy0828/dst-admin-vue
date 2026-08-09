import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  retainUnavailableRemoteTarget,
  runtimeTargetMeta,
  runtimeTargetName
} from '../src/lib/runtimeTargetPresentation.mjs'

const messages = {
  'app.remote.local': 'Local',
  'app.remote.localAvailable': 'Local available',
  'app.remote.localPending': 'Local pending',
  'app.remote.remoteUnconfigured': 'Remote not configured',
  'app.remote.remoteOnline': 'Remote online',
  'app.remote.remoteOffline': 'Remote offline',
  'common.states.unknown': 'Unknown'
}
const translate = key => messages[key]

test('runtime target labels translate known state without rewriting custom target names', () => {
  assert.equal(runtimeTargetName({ id: 'local', kind: 'local', name: 'Local' }, translate), 'Local')
  assert.equal(runtimeTargetName({ id: 'agent-1', kind: 'agent', name: 'Game Host' }, translate), 'Game Host')
  assert.equal(runtimeTargetMeta({ kind: 'local', status: 'ready' }, translate), 'Local available')
  assert.equal(runtimeTargetMeta({ kind: 'agent', configured: false }, translate), 'Remote not configured')
  assert.equal(runtimeTargetMeta({ kind: 'agent', configured: true, online: false }, translate), 'Remote offline')
})

test('an unavailable selected remote target is retained instead of falling back to local', () => {
  const remote = { id: 'agent-1', kind: 'agent', name: 'Game Host', configured: true, online: true }
  const targets = retainUnavailableRemoteTarget([{ id: 'local', kind: 'local' }], remote.id, remote)

  assert.equal(targets[0].id, 'agent-1')
  assert.equal(targets[0].online, false)
  assert.equal(targets[1].id, 'local')
})

test('runtime target selectors localize their templates and do not reset target state on load errors', () => {
  const paths = [
    '../src/components/RuntimeTargetSwitch.vue',
    '../src/components/v2/RuntimeTargetSelectV2.vue'
  ]

  for (const path of paths) {
    const page = fs.readFileSync(new URL(path, import.meta.url), 'utf8')
    const template = page.slice(page.indexOf('<template>'), page.indexOf('</template>'))
    const catchBlock = page.slice(page.indexOf('catch (error)'))
    assert.doesNotMatch(template, /[\u3400-\u9fff]/, path)
    assert.doesNotMatch(catchBlock, /setActiveRuntimeTarget\(\)/, path)
    assert.match(page, /previousTarget/)
  }

  const state = fs.readFileSync(new URL('../src/utils/runtimeTarget.js', import.meta.url), 'utf8')
  assert.doesNotMatch(state, /name: '本机'/)
})

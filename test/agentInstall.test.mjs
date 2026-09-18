import test from 'node:test'
import assert from 'node:assert/strict'
import { agentInstallCommands, agentNativeConfig } from '../src/lib/agentInstall.mjs'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
test('Agent Docker instructions use official mirrors and persistent node state', () => {
  const cn = agentInstallCommands('wss://dst.example.com/agent').docker
  const global = agentInstallCommands('wss://dst.example.com/agent', 'dockerhub').docker
  assert.match(cn, /registry.cn-hangzhou.aliyuncs.com\/dstadmin\/dst-admin-go:agent-latest/)
  assert.match(global, /lcy0828\/dst-admin-go:agent-latest/)
  assert.match(cn, /dst-admin-agent:\/var\/lib\/dst-admin-agent/)
  assert.match(cn, /--group-add/)
  assert.match(cn, /--pull always/)
  assert.match(cn, /read -r DST_ADMIN_AGENT_SECURITY_KEY/)
  assert.match(agentNativeConfig('wss://dst.example.com/agent'), /\[runtime.native\]/)
})
test('installation commands quote server URLs without evaluating shell substitutions', () => {
  const commands = agentInstallCommands("wss://example.com/agent?x='$(false)")
  assert.ok(commands.linux.includes("'wss://example.com/agent?x='\\''$(false)'"))
  assert.ok(commands.windows.includes("'wss://example.com/agent?x=''$(false)'"))
})

test('native Agent instructions offer proxy and direct release downloads', () => {
  const proxy = agentInstallCommands('wss://example.com/agent').linux
  const direct = agentInstallCommands('wss://example.com/agent', 'aliyun', 'direct').linux
  assert.match(proxy, /https:\/\/ghfast.top\/https:\/\/github.com\/lcy0828\/dst-admin-go\/releases\/latest\/download/)
  assert.doesNotMatch(direct, /ghfast|go build/)
  assert.match(direct, /sha256sum -c/)
})

test('native installation verifies bytes before replacing binaries and preserves existing config', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'dst-agent-install-test-'))
  try {
    const fixture = path.join(root, 'fixture')
    const bin = path.join(root, 'bin')
    mkdirSync(fixture)
    mkdirSync(bin)
    writeFileSync(path.join(fixture, 'dst-admin-agent'), '#!/bin/sh\nprintf "%s" "$DST_ADMIN_AGENT_SERVER_URL" > launched-url\n', { mode: 0o755 })
    writeFileSync(path.join(fixture, 'agent.conf.example'), 'example config')
    const name = 'dst-admin-agent-linux-amd64.tar.gz'
    const archive = path.join(root, name)
    execFileSync('tar', ['-czf', archive, '-C', fixture, 'dst-admin-agent', 'agent.conf.example'])
    const checksum = createHash('sha256').update(readFileSync(archive)).digest('hex')
    writeFileSync(`${archive}.sha256`, `${checksum}  ${name}\n`)
    writeFileSync(path.join(bin, 'uname'), '#!/bin/sh\ncase "$1" in -s) echo Linux;; -m) echo x86_64;; esac\n', { mode: 0o755 })
    writeFileSync(path.join(bin, 'curl'), '#!/bin/sh\nwhile [ "$#" -gt 0 ]; do\ncase "$1" in https:*) url="$1";; -o) shift; output="$1";; esac\nshift\ndone\ncp "$DST_TEST_FIXTURES/${url##*/}" "$output"\n', { mode: 0o755 })
    if (spawnSync('which', ['sha256sum']).status !== 0) {
      writeFileSync(path.join(bin, 'sha256sum'), '#!/bin/sh\nexec shasum -a 256 "$@"\n', { mode: 0o755 })
    }
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, DST_TEST_FIXTURES: root }
    const server = "wss://example.com/agent?value='$(touch injected)'"
    const commands = agentInstallCommands(server).linux
    for (const corrupt of [true, false]) {
      const work = path.join(root, corrupt ? 'corrupt' : 'valid')
      mkdirSync(work)
      writeFileSync(path.join(work, 'agent.conf'), 'existing config')
      writeFileSync(path.join(work, 'runtime-state.json'), 'existing identity')
      writeFileSync(path.join(work, 'dst-admin-agent'), 'previous binary')
      writeFileSync(`${archive}.sha256`, `${corrupt ? '0'.repeat(64) : checksum}  ${name}\n`)
      const result = spawnSync('sh', ['-c', commands], { cwd: work, env, input: 'test-key\n', encoding: 'utf8' })
      assert.equal(readFileSync(path.join(work, 'agent.conf'), 'utf8'), 'existing config')
      assert.equal(readFileSync(path.join(work, 'runtime-state.json'), 'utf8'), 'existing identity')
      assert.equal(existsSync(path.join(work, 'injected')), false)
      if (corrupt) {
        assert.notEqual(result.status, 0)
        assert.equal(readFileSync(path.join(work, 'dst-admin-agent'), 'utf8'), 'previous binary')
        assert.equal(existsSync(path.join(work, 'launched-url')), false)
      } else {
        assert.equal(result.status, 0, result.stderr)
        assert.equal(readFileSync(path.join(work, 'launched-url'), 'utf8'), server)
      }
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

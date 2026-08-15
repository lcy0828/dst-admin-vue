import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  gameReleaseBlockerKey,
  gameReleaseCanRetry,
  gameReleaseFindByJob,
  gameReleaseIsTerminal,
  gameReleaseJobFailed,
  gameReleaseJobIsTerminal,
  gameReleaseJobProgress,
  gameReleaseStageKey,
  gameReleaseStageVariant
} from '../src/lib/gameRelease.mjs'

const source = path => readFile(new URL(path, import.meta.url), 'utf8')

test('game release helpers preserve backend stages and real job progress', () => {
  assert.equal(gameReleaseStageKey('recovery_required'), 'recovery_required')
  assert.equal(gameReleaseStageKey('invented'), 'unknown')
  assert.equal(gameReleaseStageVariant('failed'), 'destructive')
  assert.equal(gameReleaseStageVariant('succeeded'), 'secondary')
  assert.equal(gameReleaseIsTerminal({ stage: 'confirming' }), false)
  assert.equal(gameReleaseIsTerminal({ stage: 'succeeded' }), true)
  assert.equal(gameReleaseCanRetry({ id: 'release-1', stage: 'recovery_required' }), true)
  assert.equal(gameReleaseCanRetry({ id: 'release-1', stage: 'succeeded' }), false)
  assert.equal(gameReleaseBlockerKey('DISK_INSUFFICIENT'), 'diskInsufficient')
  assert.equal(gameReleaseBlockerKey('future-code'), 'unknown')
  assert.equal(gameReleaseJobIsTerminal({ status: 'running' }), false)
  assert.equal(gameReleaseJobIsTerminal({ status: 'failed' }), true)
  assert.equal(gameReleaseJobFailed({ status: 'canceled' }), true)
  assert.equal(gameReleaseJobProgress({ progress: 117 }), 100)
  assert.equal(gameReleaseJobProgress({}), null)
  assert.equal(gameReleaseFindByJob([{ id: 'r1', sourceJobId: 'j1' }], 'j1')?.id, 'r1')
})

test('game release API is always addressed through the control plane', async () => {
  const api = await source('../src/api/v2.js')
  const start = api.indexOf('export const gameReleasesV2API')
  const end = api.indexOf('export const containersV2API', start)
  const releaseAPI = api.slice(start, end)

  assert.match(releaseAPI, /game\/releases\/preview/)
  assert.match(releaseAPI, /actions\/retry/)
  assert.equal(releaseAPI.match(/runtimeTarget:\s*false/g)?.length, 5)
})

test('game release workspace uses accessible shadcn composition and real APIs', async () => {
  const view = await source('../src/views/servers/GameReleases.vue')
  assert.match(view, /<DialogTitle>/)
  assert.match(view, /<DialogDescription>/)
  assert.match(view, /<FieldGroup>/)
  assert.match(view, /<Table(?:\s|>)/)
  assert.match(view, /<Empty/)
  assert.match(view, /gameReleasesV2API\.preview/)
  assert.match(view, /gameReleasesV2API\.create/)
  assert.match(view, /gameReleasesV2API\.retry/)
  assert.doesNotMatch(view, /bg-(blue|purple|orange|slate)-/)
})

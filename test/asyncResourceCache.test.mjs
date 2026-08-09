import test from 'node:test'
import assert from 'node:assert/strict'

import { createAsyncResourceCache } from '../src/lib/asyncResourceCache.mjs'

test('concurrent consumers share one in-flight request', async () => {
  const cache = createAsyncResourceCache({ ttlMs: 1000 })
  let requests = 0
  let release
  const pending = new Promise(resolve => { release = resolve })
  const loader = async () => {
    requests += 1
    await pending
    return ['room']
  }

  const first = cache.load(loader)
  const second = cache.load(loader)
  release()

  assert.deepEqual(await first, ['room'])
  assert.deepEqual(await second, ['room'])
  assert.equal(requests, 1)
})

test('empty values are cached until the ttl expires', async () => {
  let time = 100
  const cache = createAsyncResourceCache({ ttlMs: 50, now: () => time })
  let requests = 0
  const loader = async () => {
    requests += 1
    return []
  }

  await cache.load(loader)
  await cache.load(loader)
  assert.equal(requests, 1)

  time = 151
  await cache.load(loader)
  assert.equal(requests, 2)
})

test('invalidation prevents an older request from repopulating the cache', async () => {
  const cache = createAsyncResourceCache({ ttlMs: 1000 })
  let releaseOld
  const oldRequest = cache.load(() => new Promise(resolve => { releaseOld = resolve }))

  await Promise.resolve()
  cache.invalidate()
  const freshRequest = cache.load(async () => ['fresh'])
  releaseOld(['stale'])

  assert.deepEqual(await oldRequest, ['stale'])
  assert.deepEqual(await freshRequest, ['fresh'])
  assert.deepEqual(await cache.load(async () => ['unexpected']), ['fresh'])
})

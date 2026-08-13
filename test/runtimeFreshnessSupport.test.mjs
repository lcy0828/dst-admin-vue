import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('legacy adapters preserve world-state freshness and latest-exit audit fields', async () => {
  const adapter = await source('src/api/v2LegacyAdapters.js')

  assert.match(adapter, /runtime_state: snapshot\.runtimeState \|\| 'unknown'/)
  assert.match(adapter, /freshness: snapshot\.freshness \|\| 'unavailable'/)
  assert.match(adapter, /age_seconds: snapshot\.ageSeconds \?\? null/)
  assert.match(adapter, /stale: snapshot\.stale \?\? true/)
  assert.match(adapter, /latest_exit: world\.latestExit \|\| null/)
})

test('server workspace stops polling player statistics when every shard is stopped', async () => {
  const workspace = await source('src/views/servers/ServerWorkspace.vue')

  assert.match(workspace, /silent && previousRoomId === this\.selectedRoomId && this\.runningWorlds\.length > 0/)
  assert.match(workspace, /RuntimeExitBadge/)
  assert.match(workspace, /WorldDataFreshnessBadge/)
})

test('world-state details prominently mark stale snapshots with their observation time', async () => {
  const [worldState, freshnessBadge, exitBadge] = await Promise.all([
    source('src/views/worlds/WorldState.vue'),
    source('src/components/runtime/WorldDataFreshnessBadge.vue'),
    source('src/components/runtime/RuntimeExitBadge.vue')
  ])

  assert.match(worldState, /v-if="worldState\.stale"/)
  assert.match(worldState, /:observed-at="worldState\.observed_at"/)
  assert.match(freshnessBadge, /Intl\.RelativeTimeFormat/)
  assert.match(freshnessBadge, /dateStyle: 'medium'/)
  assert.match(exitBadge, /event\?\.type === 'unexpected_exit'/)
})

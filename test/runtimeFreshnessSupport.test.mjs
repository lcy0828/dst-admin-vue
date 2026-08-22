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

test('server workspace stops polling players while keeping cached world freshness current', async () => {
  const workspace = await source('src/views/servers/ServerWorkspace.vue')

  assert.match(workspace, /useDashboardRefreshInterval\(\)/)
  assert.match(workspace, /if \(silent && this\.refreshInFlightCount > 0\) return false/)
  assert.match(workspace, /window\.setInterval\(\(\) => this\.refreshWorkspace\(true\), this\.refreshIntervalMs\)/)
  assert.match(workspace, /const liveRefreshes = \[this\.refreshWorldStates\(\)\]/)
  assert.match(workspace, /if \(this\.runningWorlds\.length > 0\) liveRefreshes\.push\(this\.refreshPlayerStats\(\)\)/)
  assert.doesNotMatch(workspace, /if \(silent && previousRoomId === this\.selectedRoomId[^}]+\}\s*else await this\.refreshRoomContext\(\)/)
  assert.match(workspace, /RuntimeExitBadge/)
  assert.match(workspace, /WorldDataFreshnessBadge/)
})

test('server workspace submits starts immediately and confirms disruptive actions', async () => {
  const workspace = await source('src/views/servers/ServerWorkspace.vue')

  assert.match(workspace, /if \(worldActionRequiresConfirmation\(action\)\) \{[\s\S]*?await confirmAction/)
  assert.match(workspace, /this\.setWorldActionPending\(roomId, world\.id, true\)[\s\S]*?toast\.info[\s\S]*?startRoomWithCapacityRisk\(target\)/)
  assert.match(workspace, /finally \{[\s\S]*?this\.setWorldActionPending\(roomId, world\.id, false\)/)
})

test('server workspace supports room-wide actions without blocking sibling shard controls', async () => {
  const workspace = await source('src/views/servers/ServerWorkspace.vue')

  assert.match(workspace, /servers\.workspace\.worlds\.startAll/)
  assert.match(workspace, /servers\.workspace\.worlds\.stopAll/)
  assert.match(workspace, /pendingWorldActions: \[\]/)
  assert.match(workspace, /isWorldActionPending\(world\.id\) \|\| Boolean\(roomActionKind\)/)
  assert.doesNotMatch(workspace, /Boolean\(worldActionId\)/)
  assert.match(workspace, /world_ids: worlds\.map\(world => world\.id\)/)
  assert.match(workspace, /if \(action === 'start'\) await startRoomWithCapacityRisk\(target\)/)
  assert.match(workspace, /if \(action === 'stop'\) await roomApi\.stopRoom\(target\)/)
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

test('server surfaces dispatch the primary stop action while a shard is starting', async () => {
  const [serverList, workspace, dashboard] = await Promise.all([
    source('src/views/servers/ServerList.vue'),
    source('src/views/servers/ServerWorkspace.vue'),
    source('src/composables/useDashboardV2.js')
  ])

  assert.match(serverList, /isStopping = primaryAction\.kind === 'stop'/)
  assert.match(serverList, /isStopping \? roomApi\.stopRoom\(request\) : startRoomWithCapacityRisk\(request\)/)
  assert.match(workspace, /action === 'stop' && !canRequestStopWorld\(world\)/)
  assert.match(dashboard, /stopping = primaryAction\.kind === 'stop'/)
  assert.match(dashboard, /stopping \? roomApi\.stopRoom\(input\) : startRoomWithCapacityRisk\(input\)/)
})

test('central diagnostics exposes full runtime lifecycle auditing without polling it', async () => {
  const [api, workspace, diagnostics, auditPanel] = await Promise.all([
    source('src/api/v2.js'),
    source('src/views/servers/ServerWorkspace.vue'),
    source('src/views/rooms/RoomDiagnostics.vue'),
    source('src/components/runtime/RuntimeAuditPanel.vue')
  ])

  assert.match(api, /lifecycleEvents: \(roomId, params = \{\}\) => client\.get/)
  assert.match(api, /`\/rooms\/\$\{encode\(roomId\)\}\/runtime-events`/)
  assert.doesNotMatch(workspace, /<RuntimeAuditPanel/)
  assert.match(diagnostics, /<RuntimeAuditPanel :room-id="selectedRoomId" :worlds="selectedRoomWorlds"/)
  assert.match(auditPanel, /event\.reasonCode/)
  assert.match(auditPanel, /event\.jobId/)
  assert.match(auditPanel, /event\.requestId/)
  assert.match(auditPanel, /min-w-\[920px\] table-fixed/)
  assert.match(auditPanel, /runtime-table-scroll hidden min-w-0 max-h-\[520px\] overflow-auto md:block/)
  assert.match(auditPanel, /runtime-table-scroll :deep\(\[data-slot='table-container'\]\)/)
  assert.match(auditPanel, /max-h-\[560px\] divide-y overflow-y-auto md:hidden/)
  assert.match(auditPanel, /runtimeAudit\.history\.columns\.context/)
  assert.match(auditPanel, /runtimeAudit\.history\.columns\.lifecycle/)
  assert.doesNotMatch(auditPanel, /setInterval/)
})

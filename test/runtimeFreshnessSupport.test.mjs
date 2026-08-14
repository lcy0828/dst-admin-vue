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

  assert.match(workspace, /if \(silent && previousRoomId === this\.selectedRoomId\) \{\s*if \(this\.runningWorlds\.length > 0\) await this\.refreshPlayerStats\(\)/)
  assert.doesNotMatch(workspace, /if \(silent && previousRoomId === this\.selectedRoomId[^}]+\}\s*else await this\.refreshRoomContext\(\)/)
  assert.match(workspace, /RuntimeExitBadge/)
  assert.match(workspace, /WorldDataFreshnessBadge/)
})

test('server workspace submits starts immediately and confirms disruptive actions', async () => {
  const workspace = await source('src/views/servers/ServerWorkspace.vue')

  assert.match(workspace, /if \(worldActionRequiresConfirmation\(action\)\) \{[\s\S]*?await confirmAction/)
  assert.match(workspace, /this\.worldActionId = world\.id[\s\S]*?toast\.info[\s\S]*?startRoomWithCapacityRisk\(target\)/)
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

test('server workspace exposes full runtime lifecycle auditing without polling it', async () => {
  const [api, workspace, auditPanel] = await Promise.all([
    source('src/api/v2.js'),
    source('src/views/servers/ServerWorkspace.vue'),
    source('src/components/runtime/RuntimeAuditPanel.vue')
  ])

  assert.match(api, /lifecycleEvents: \(roomId, params = \{\}\) => client\.get/)
  assert.match(api, /`\/rooms\/\$\{encode\(roomId\)\}\/runtime-events`/)
  assert.match(workspace, /<RuntimeAuditPanel ref="runtimeAudit"/)
  assert.match(workspace, /this\.\$refs\.runtimeAudit\?\.loadEvents\(\)/)
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

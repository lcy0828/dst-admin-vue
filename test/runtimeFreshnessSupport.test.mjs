import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('an authoritative empty world-state result never falls back to old overview values', async () => {
  const workspace = await source('src/views/servers/ServerWorkspace.vue')
  const method = (name, next) => {
    const start = workspace.indexOf(`    ${name}(world) {`)
    const end = workspace.indexOf(`    ${next}(world) {`, start)
    assert.ok(start >= 0 && end > start)
    return new Function(`return ({${workspace.slice(start, end)}})` )()[name]
  }
  const world = { day: 99, season: 'summer', stateObservedAt: '2026-09-03T00:00:00Z' }
  const context = {
    worldStateFor: () => ({ observedAt: '0001-01-01T00:00:00Z', observationState: 'pending' }),
    metricValue: value => value,
    seasonLabel: value => value || '--',
    $t: key => key
  }
  assert.equal(method('worldDayLabel', 'worldOnlinePlayerLabel').call(context, world), '--')
  assert.equal(method('worldSeasonLabel', 'worldSeasonIcon').call(context, world), '--')
  assert.equal(method('worldObservedAt', 'worldStateAgeSeconds').call(context, world), '')
  const diagnosticStart = workspace.indexOf('    worldRuntimeDiagnostic(world) {')
  const diagnosticEnd = workspace.indexOf('    protocolLabel(', diagnosticStart)
  const diagnostic = new Function(`return ({${workspace.slice(diagnosticStart, diagnosticEnd)}})`)().worldRuntimeDiagnostic
  assert.equal(diagnostic.call(context, world).message, 'servers.workspace.worlds.observationPending')
})

test('legacy adapters preserve world-state freshness and latest-exit audit fields', async () => {
  const adapter = await source('src/api/v2LegacyAdapters.js')

  assert.match(adapter, /runtime_state: snapshot\.runtimeState \|\| 'unknown'/)
  assert.match(adapter, /freshness: snapshot\.freshness \|\| 'unavailable'/)
  assert.match(adapter, /age_seconds: snapshot\.ageSeconds \?\? null/)
  assert.match(adapter, /stale: snapshot\.stale \?\? true/)
  assert.match(adapter, /runtime_message: snapshot\.runtimeMessage \|\| ''/)
  assert.match(adapter, /observation_error: snapshot\.observationError \|\| ''/)
  assert.match(adapter, /latest_exit: world\.latestExit \|\| null/)
})

test('room resolution and world selectors do not refresh every room state', async () => {
  const adapter = await source('src/api/v2LegacyAdapters.js')

  assert.match(adapter, /async function resolveRoom\(value\) \{\s*const rooms = await loadRoomCatalog\(\{ includeStates: false \}\)/)
  assert.match(adapter, /async getWorldList\(\) \{\s*return success\(await loadRoomCatalog\(\{ includeStates: false \}\)/)
})

test('server workspace uses runtime events for inventory and only polls live telemetry', async () => {
  const [workspace, observation, adapter] = await Promise.all([
    source('src/views/servers/ServerWorkspace.vue'),
    source('src/composables/useRuntimeObservation.js'),
    source('src/api/v2LegacyAdapters.js')
  ])

  assert.match(workspace, /useRoomRefreshInterval\(\)/)
  assert.match(workspace, /workspaceDisposed: false/)
  assert.match(workspace, /beforeUnmount\(\) \{\s*this\.workspaceDisposed = true/)
  assert.match(workspace, /await this\.refreshWorkspace\(\)\s*if \(!this\.workspaceDisposed\) this\.startRefreshTimer\(\)/)
  assert.match(workspace, /if \(this\.workspaceDisposed \|\| document\.visibilityState === 'hidden'\) return/)
  assert.match(workspace, /runtimeRefreshPending: false/)
  assert.match(workspace, /if \(silent && this\.refreshInFlightCount > 0\) \{[\s\S]*?this\.runtimeRefreshPending = true[\s\S]*?return false/)
  assert.match(workspace, /this\.refreshInFlightCount === 0 && this\.runtimeRefreshPending[\s\S]*?void this\.refreshWorkspace\(true\)/)
  assert.match(workspace, /window\.setInterval\(\(\) => this\.refreshPollingWorkspace\(\), this\.refreshIntervalMs\)/)
  assert.match(workspace, /runtimeObservationState === 'live'[\s\S]*?Promise\.all\(\[this\.refreshPlayerStats\(\), this\.refreshWorldStates\(\)\]\)[\s\S]*?return this\.refreshWorkspace\(true\)/)
  assert.match(workspace, /roomApi\.getScopedRuntimeOverview\(scopeTargetId\)/)
  assert.match(workspace, /if \(refreshWorldStates\) liveRefreshes\.push\(this\.refreshWorldStates\(\)\)/)
  assert.match(workspace, /if \(refreshPlayers && this\.runningWorlds\.length > 0\) liveRefreshes\.push\(this\.refreshPlayerStats\(\)\)/)
  assert.match(observation, /if \(runtimeObservationChangesViews\(eventName\)\)/)
  assert.doesNotMatch(workspace, /if \(silent && previousRoomId === this\.selectedRoomId[^}]+\}\s*else await this\.refreshRoomContext\(\)/)
  assert.match(adapter, /const roomCatalogWithoutStatesCache = createAsyncResourceCache/)
  assert.match(adapter, /if \(!includeStates\) \{[^}]+roomsV2API\.worlds\(room\.id\)[^}]+return mapRoom/s)
  assert.match(adapter, /const \[worlds, states\] = await Promise\.all\(\[[^\]]+worldStatesV2API\.list\(room\.id\)/s)
  assert.match(adapter, /async getRoomList\(options\) \{\s*return success\(await loadRoomCatalog\(options\)/)
  assert.match(adapter, /function invalidateRoomCatalog\(\) \{\s*roomCatalogCache\.invalidate\(\)\s*roomCatalogWithoutStatesCache\.invalidate\(\)/)
  assert.equal(adapter.match(/roomCatalogCache\.invalidate\(\)/g)?.length, 1)
  assert.match(workspace, /RuntimeExitBadge/)
  assert.match(workspace, /WorldDataFreshnessBadge/)
})

test('workspace renders lightweight player results independently from slower room context', async () => {
  const [workspace, playerApi, dashboard] = await Promise.all([
    source('src/views/servers/ServerWorkspace.vue'),
    source('src/api/playerApi.js'),
    source('src/views/Dashboard.vue')
  ])
  const contextStart = workspace.indexOf('async refreshRoomContext()')
  const contextEnd = workspace.indexOf('\n    async refreshTopologyDialog() {', contextStart)
  const contextRefresh = workspace.slice(contextStart, contextEnd)

  assert.ok(contextStart >= 0 && contextEnd > contextStart)
  assert.doesNotMatch(contextRefresh, /this\.playerStats = null/)
  assert.match(contextRefresh, /const playersCompletion = playerApi\.getPlayerStats\(roomName, this\.playerScopeWorldIds\(\), roomId\)\.then\(/)
  assert.ok(contextRefresh.indexOf('this.playerStats = response?.data || null') < contextRefresh.indexOf('await Promise.allSettled(['))
  assert.match(contextRefresh, /this\.contextLoading = false\s*await playersCompletion/)
  assert.doesNotMatch(contextRefresh, /this\.detectDefaultConnectionAddress\(\)/)
  assert.match(playerApi, /includeAccessLists: params\.include_access_lists !== false/)
  assert.match(playerApi, /roomId\s*\? \{ data: await roomPlayers\(\{ id: roomId, name: archiveName \}, \{ include_access_lists: false \}\)/)
  assert.match(dashboard, /playerApi\.getPlayerStats\(room\.name, \[\], room\.id\)/)
})

test('player list collects once on entry and keeps collection failures visible above historical records', async () => {
  const [players, messages] = await Promise.all([
    source('src/views/players/PlayerList.vue'),
    source('src/i18n/playerMessages.js')
  ])

  assert.match(players, /async created\(\)[\s\S]*?await this\.loadInitialPlayerData\(\)/)
  assert.match(players, /async loadInitialPlayerData\(\)[\s\S]*?await playerApi\.updatePlayerInfo\([\s\S]*?await this\.fetchPlayerList\(\)/)
  assert.match(players, /v-else-if="collectionError"[\s\S]*?currentRefreshFailedDescription/)
  assert.match(players, /this\.collectionError = error/)
  assert.match(messages, /currentRefreshFailedDescription: '下面显示的是已有玩家记录，不代表当前在线状态：\{error\}'/)
})

test('world-state API performs a direct read for every request', async () => {
  const api = await source('src/api/v2.js')

  assert.match(api, /list: roomId => client\.get\(`\/rooms\/\$\{encode\(roomId\)\}\/world-states`, \{ runtimeTarget: false \}\)/)
  assert.doesNotMatch(api, /worldStateRequests|worldStateCache|worldStateCaches|loadWorldStates/)
})

test('room catalogs and runtime overviews do not cache completed reads', async () => {
  const [adapter, api] = await Promise.all([
    source('src/api/v2LegacyAdapters.js'),
    source('src/api/v2.js')
  ])

  assert.match(adapter, /const roomCatalogCache = createAsyncResourceCache\(\{ ttlMs: 0 \}\)/)
  assert.match(adapter, /const roomCatalogWithoutStatesCache = createAsyncResourceCache\(\{ ttlMs: 0 \}\)/)
  assert.match(adapter, /scopedOverviewCaches\.set\(key, createAsyncResourceCache\(\{ ttlMs: 0 \}\)\)/)
  assert.doesNotMatch(adapter, /ttlMs: 750/)
  assert.match(api, /list: \(\) => client\.get\('\/rooms', \{ headers: \{ 'Cache-Control': 'no-store' \} \}\)/)
  assert.match(api, /get: roomId => client\.get\(`\/rooms\/\$\{encode\(roomId\)\}`, \{ headers: \{ 'Cache-Control': 'no-store' \} \}\)/)
  assert.match(api, /worlds: roomId => client\.get\(`\/rooms\/\$\{encode\(roomId\)\}\/worlds`, \{ headers: \{ 'Cache-Control': 'no-store' \} \}\)/)
})

test('server workspace presents room-operation telemetry deferrals without a failure alert', async () => {
  const [workspace, messages] = await Promise.all([
    source('src/views/servers/ServerWorkspace.vue'),
    source('src/i18n/serverMessages.js')
  ])

  assert.match(workspace, /observationState === 'deferred'/)
  assert.match(workspace, /observationCode === 'ROOM_OPERATION_IN_PROGRESS'/)
  assert.match(workspace, /tone: 'deferred'/)
  assert.match(workspace, /world-runtime-diagnostic\.is-deferred[\s\S]*?var\(--warning-foreground\)/)
  assert.match(messages, /observationDeferred: '房间操作中，数据更新暂缓'/)
})

test('server workspace uses the direct world-state response without a background repair pass', async () => {
  const workspace = await source('src/views/servers/ServerWorkspace.vue')

  assert.match(workspace, /const response = await worldStatesV2API\.list\(roomId\)[\s\S]*this\.worldStateSnapshots = response\?\.items \|\| \[\]/)
  assert.doesNotMatch(workspace, /refreshStaleWorldStates|worldStateRefreshAttemptKeys|worldStateRefreshActiveKeys|worldStateRefreshErrors/)
})

test('topology and game release previews refresh runtime observations only on user reads', async () => {
  const [topology, releases] = await Promise.all([
    source('src/views/rooms/RoomTopology.vue'),
    source('src/views/servers/GameReleases.vue')
  ])

  assert.match(topology, /async function loadTopology\(\{ refreshRuntime = true \} = \{\}\)/)
  assert.match(topology, /if \(refreshRuntime\) \{[\s\S]*?runtimeObservationsV2API\.refresh\(\{ roomId \}\)[\s\S]*?topologyV2API\.get\(roomId\)/)
  assert.match(topology, /handleRuntimeObservationUpdate\(\)[\s\S]*?loading\.value\) return[\s\S]*?loadTopology\(\{ refreshRuntime: false \}\)/)
  assert.match(releases, /runtimeObservationsV2API\.refresh\(\{ targetId: managementScopeTargetId\(managementScope\.value\) \}\)[\s\S]*?gameReleasesV2API\.preview\(request\)/)
})

test('automation room discovery coalesces active reads without retaining a completed room catalog', async () => {
  const api = await source('src/api/cronApi.js')

  assert.match(api, /let roomCatalogRequest = null/)
  assert.match(api, /if \(roomCatalogRequest\) return roomCatalogRequest/)
  assert.match(api, /roomCatalogRequest = request[\s\S]*?if \(roomCatalogRequest === request\) roomCatalogRequest = null/)
  assert.doesNotMatch(api, /if \(roomCatalog\.length && !force\) return roomCatalog/)
})

test('server workspace submits starts immediately and confirms disruptive actions', async () => {
  const workspace = await source('src/views/servers/ServerWorkspace.vue')

  assert.match(workspace, /if \(worldActionRequiresConfirmation\(action\)\) \{[\s\S]*?await confirmAction/)
  assert.match(workspace, /worldLifecycleScope\(this\.worlds, world, action\)[\s\S]*?affectedWorlds\.forEach\(item => this\.setWorldActionPending\(roomId, item\.id, true\)\)[\s\S]*?toast\.loading[\s\S]*?startRoomWithCapacityRisk\(\{ \.\.\.target, wait_for_completion: false \}\)/)
  assert.match(workspace, /emitGlobalJobSubmitted\(submittedJob\)/)
  assert.match(workspace, /finally \{[\s\S]*?refreshWorkspace\(true\)[\s\S]*?affectedWorlds\.forEach\(item => this\.setWorldActionPending\(roomId, item\.id, false\)\)/)
})

test('server workspace supports room-wide actions without blocking sibling shard controls', async () => {
  const workspace = await source('src/views/servers/ServerWorkspace.vue')

  assert.match(workspace, /servers\.workspace\.worlds\.startAll/)
  assert.match(workspace, /servers\.workspace\.worlds\.stopAll/)
  assert.match(workspace, /pendingWorldActions: \[\]/)
  assert.match(workspace, /isWorldActionPending\(world\.id\) \|\| isWorldStateActionPending\(world\.id\) \|\| isRollbackPending\(world\.id\) \|\| Boolean\(roomActionKind\)/)
  assert.doesNotMatch(workspace, /Boolean\(worldActionId\)/)
  assert.match(workspace, /world_ids: worlds\.map\(world => world\.id\)/)
  assert.match(workspace, /if \(action === 'start'\) \{[\s\S]*?wait_for_completion: false[\s\S]*?emitGlobalJobSubmitted\(submittedJob\)/)
  assert.match(workspace, /if \(action === 'stop'\) await roomApi\.stopRoom\(\{ \.\.\.target, \.\.\.maintenance \}\)/)
})

test('world-state details prominently mark stale snapshots with their observation time', async () => {
  const [worldState, freshnessBadge, exitBadge] = await Promise.all([
    source('src/views/worlds/WorldState.vue'),
    source('src/components/runtime/WorldDataFreshnessBadge.vue'),
    source('src/components/runtime/RuntimeExitBadge.vue')
  ])

  assert.match(worldState, /v-(?:else-)?if="worldState\.stale"/)
  assert.match(worldState, /:observed-at="worldState\.observed_at"/)
  assert.match(freshnessBadge, /Intl\.RelativeTimeFormat/)
  assert.match(freshnessBadge, /dateStyle: 'medium'/)
  assert.match(exitBadge, /event\?\.type === 'unexpected_exit'/)
})

test('world-state auto refresh stops while the page is hidden', async () => {
  const worldState = await source('src/views/worlds/WorldState.vue')

  assert.match(worldState, /mounted\(\) \{[\s\S]*?addEventListener\('visibilitychange', this\.handleVisibilityChange\)/)
  assert.match(worldState, /beforeUnmount\(\) \{[\s\S]*?removeEventListener\('visibilitychange', this\.handleVisibilityChange\)/)
  assert.match(worldState, /handleVisibilityChange\(\) \{[\s\S]*?visibilityState === 'hidden'[\s\S]*?clearRefreshInterval\(\)[\s\S]*?if \(this\.autoRefresh\)/)
})

test('world-state responses cannot overwrite a newer selection and expose diagnostics', async () => {
  const [worldState, adapter] = await Promise.all([
    source('src/views/worlds/WorldState.vue'),
    source('src/api/v2LegacyAdapters.js')
  ])

  assert.match(worldState, /worldStateRequestSequence/)
  assert.match(worldState, /const archiveName = this\.selectedArchive;\s*const worldName = this\.selectedWorld;\s*const requestSequence = \+\+this\.worldStateRequestSequence/)
  assert.match(worldState, /if \(requestSequence !== this\.worldStateRequestSequence\) return;/)
  assert.match(worldState, /v-if="worldStateDiagnostic"/)
  assert.match(adapter, /observation_state: snapshot\.observationState \|\| ''/)
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
  assert.match(diagnostics, /<RuntimeAuditPanel[\s\S]*?:room-id="selectedRoomId"[\s\S]*?:worlds="selectedRoomWorlds"[\s\S]*?embedded/)
  assert.match(diagnostics, /v-if="activeSection === 'events'"/)
  assert.match(auditPanel, /event\.reasonCode/)
  assert.match(auditPanel, /event\.jobId/)
  assert.match(auditPanel, /event\.requestId/)
  assert.match(auditPanel, /pageSize = 10/)
  assert.match(auditPanel, /filteredEvents/)
  assert.match(auditPanel, /visibleEvents/)
  assert.match(auditPanel, /min-w-\[760px\] table-fixed/)
  assert.match(auditPanel, /runtime-table-scroll hidden min-w-0 overflow-x-auto rounded-lg border md:block/)
  assert.match(auditPanel, /runtime-table-scroll :deep\(\[data-slot='table-container'\]\)/)
  assert.match(auditPanel, /divide-y rounded-lg border md:hidden/)
  assert.match(auditPanel, /runtimeAudit\.history\.columns\.context/)
  assert.match(auditPanel, /runtimeAudit\.history\.columns\.lifecycle/)
  assert.match(auditPanel, /runtimeAudit\.history\.filters\.abnormal/)
  assert.match(auditPanel, /expandedEventId === event\.id/)
  assert.doesNotMatch(auditPanel, /setInterval/)
})

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const source = path => readFile(new URL(path, root), 'utf8')

function section(value, start, end) {
  const from = value.indexOf(start)
  const to = value.indexOf(end, from + start.length)
  assert.ok(from >= 0, `missing section start: ${start}`)
  assert.ok(to > from, `missing section end: ${end}`)
  return value.slice(from, to)
}

test('node and player refreshes preserve usable data and reject obsolete responses', async () => {
  const [agents, players] = await Promise.all([
    source('src/views/agents/AgentList.vue'),
    source('src/views/players/PlayerList.vue')
  ])

  assert.match(agents, /agentRequestSequence/)
  assert.match(agents, /runtimeRequestSequence/)
  assert.match(agents, /inventoryRequestSequences/)
  assert.doesNotMatch(section(agents, 'async fetchAgentList()', 'refreshData()'), /this\.agentList\s*=\s*\[\]/)
  assert.doesNotMatch(section(agents, 'async fetchRuntimeTargets()', 'async fetchInventories()'), /this\.runtimeByAgent\s*=\s*\{\}/)
  assert.match(agents, /inventoryRefreshedLoadFailed/)

  const playerRefresh = section(players, 'async fetchPlayerList()', '// 刷新数据')
  assert.match(players, /playerRequestSequence/)
  assert.doesNotMatch(playerRefresh, /this\.playerList\s*=\s*\[\]/)
  assert.doesNotMatch(playerRefresh, /this\.pagination\.total\s*=\s*0/)
  assert.match(players, /updateSucceededReloadFailed/)
})

test('log and dashboard refreshes retain previous snapshots on transient failures', async () => {
  const [query, viewer, dashboard, dashboardView, systemResources, refreshInterval] = await Promise.all([
    source('src/views/LogQueryView.vue'),
    source('src/views/servers/LogViewer.vue'),
    source('src/composables/useDashboardV2.js'),
    source('src/views/v2/DashboardV2.vue'),
    source('src/composables/useSystemResourceStatus.js'),
    source('src/composables/useDashboardRefreshIntervals.js')
  ])

  const logQuery = section(query, 'async queryLogs(', '// 格式化日期')
  assert.doesNotMatch(logQuery, /this\.logData\s*=\s*\[\]/)
  assert.match(query, /loading && logData\.length === 0/)
  assert.match(viewer, /targetChanged/)
  assert.match(viewer, /loading && logs\.length === 0/)

  assert.match(systemResources, /if \(refreshPromise && refreshPromiseScope === scopeKey\) return refreshPromise/)
  assert.doesNotMatch(section(systemResources, 'async function refreshSystemResourceStatus(options = {})', 'function handleManagementScopeChange'), /status\.value\s*=\s*\{\}/)
  assert.match(dashboard, /serverRequestSequence/)
  assert.match(dashboard, /versionRequestSequence/)
  assert.doesNotMatch(dashboard, /playerApi|getPlayerStats|refreshPlayers/)
  assert.doesNotMatch(dashboard, /async function refreshRuntimeServers\(\)/)
  assert.doesNotMatch(section(dashboard, 'async function refreshServers()', 'function handleManagementScopeChange'), /(?:serverList|roomList)\.value\s*=\s*\[\]/)
  assert.match(section(dashboard, 'function handleManagementScopeChange', 'async function refreshVersion(options = {})'), /serverRequestSequence \+= 1[\s\S]*?serverList\.value = \[\]/)
  assert.match(dashboard, /updatePollInFlight/)
  assert.match(dashboard, /pollingReady && !updateStatus/)
  assert.doesNotMatch(dashboardView, /useRoomRefreshInterval|setInterval|refreshRuntimeServers/)
  assert.match(refreshInterval, /ROOM_REFRESH_INTERVAL_MS = 5_000/)
  assert.match(dashboardView, /onMounted\(refreshDashboard\)/)
})

test('distributed jobs distinguish completion from state reload and bound polling', async () => {
  const [runtime, backups, imports, releases, publications] = await Promise.all([
    source('src/components/runtime/RuntimeStatusPanel.vue'),
    source('src/views/backups/DistributedBackupPanel.vue'),
    source('src/views/backups/SaveImportsPanel.vue'),
    source('src/views/servers/GameReleases.vue'),
    source('src/components/mods/RoomModPublicationPanel.vue')
  ])

  assert.match(runtime, /retainedReports/)
  assert.match(runtime, /roomInstallPartial/)
  assert.match(runtime, /actionSucceededRefreshFailed/)

  assert.match(backups, /createdRefreshFailed/)
  assert.match(backups, /operationsLoaded/)
  assert.doesNotMatch(section(backups, '} catch (cause) {', '} finally {'), /(?:sets|operations)\.value\s*=\s*\[\]/)

  assert.match(imports, /importRequestSequence/)
  assert.match(imports, /jobStatusFailed/)
  assert.match(imports, /pollingTimedOut/)
  assert.match(imports, /jobStatusTimedOut/)
  assert.match(imports, /completedRefreshFailed/)
  assert.match(imports, /roomsLoadError/)
  assert.match(imports, /generation !== lifecycleGeneration/)

  assert.match(releases, /historyLoadingSequence/)
  assert.match(releases, /pollReadFailures >= 5/)
  assert.match(releases, /pollConfirmationMisses >= 10/)
  assert.match(releases, /invalidJobResponse/)

  assert.match(publications, /topologyLoadFailed/)
  assert.match(publications, /pollRequestSequence/)
  assert.match(publications, /if \(!publication\?\.id\) throw new Error/)
  assert.match(publications, /activationSubmitted/)
})

test('room starts release the workspace after submission and continue in the global task card', async () => {
  const [workspace, adapters, jobEvents] = await Promise.all([
    source('src/views/servers/ServerWorkspace.vue'),
    source('src/api/v2LegacyAdapters.js'),
    source('src/api/v2ConfigurationAdapters.js')
  ])

  assert.match(workspace, /wait_for_completion: false/)
  assert.match(workspace, /emitGlobalJobSubmitted\(submittedJob\)/)
  assert.match(workspace, /pruneStaleRoomActions\(Date\.now\(\), true\)/)
  assert.match(workspace, /\{ roomId, kind, token: nextToken, startedAt: Date\.now\(\) \}/)
  assert.match(workspace, /setRoomActionPending\(roomId, action, false, actionToken\)/)
  assert.match(workspace, /roomActionAccepted/)
  assert.match(workspace, /actionAccepted/)
  assert.match(adapters, /room_start_submitted/)
  assert.match(adapters, /params\?\.wait_for_completion === false/)
  assert.match(jobEvents, /'job\.progress'/)
})

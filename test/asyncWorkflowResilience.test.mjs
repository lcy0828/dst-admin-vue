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
  const [query, viewer, dashboard, dashboardView] = await Promise.all([
    source('src/views/LogQueryView.vue'),
    source('src/views/servers/LogViewer.vue'),
    source('src/composables/useDashboardV2.js'),
    source('src/views/v2/DashboardV2.vue')
  ])

  const logQuery = section(query, 'async queryLogs(', '// 格式化日期')
  assert.doesNotMatch(logQuery, /this\.logData\s*=\s*\[\]/)
  assert.match(query, /loading && logData\.length === 0/)
  assert.match(viewer, /targetChanged/)
  assert.match(viewer, /loading && logs\.length === 0/)

  assert.match(dashboard, /systemRequestSequence/)
  assert.match(dashboard, /serverRequestSequence/)
  assert.match(dashboard, /playerRequestSequence/)
  assert.match(dashboard, /versionRequestSequence/)
  assert.match(dashboard, /async function refreshRuntimeServers\(\)/)
  assert.match(dashboard, /observedSequence !== serverRequestSequence/)
  assert.doesNotMatch(section(dashboard, 'async function refreshServers()', 'async function refreshVersion()'), /(?:serverList|roomList)\.value\s*=\s*\[\]/)
  assert.match(dashboard, /updatePollInFlight/)
  assert.match(dashboard, /pollingReady && !updateStatus/)
  assert.match(dashboardView, /RUNTIME_REFRESH_INTERVAL_MS = 10_000/)
  assert.match(dashboardView, /document\.visibilityState === 'hidden'/)
  assert.match(dashboardView, /onBeforeUnmount\([\s\S]*?clearInterval/)
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

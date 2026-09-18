import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sourceUrl = new URL('../src/views/servers/ServerWorkspace.vue', import.meta.url)

test('server workspace translates known protocol values and preserves unknown values', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /worldStatusLabel\(status, key => this\.\$t\(key\)\)/)
  assert.match(source, /worldPrimaryAction\(world, key => this\.\$t\(key\)\)/)
  assert.match(source, /\['autumn', 'winter', 'spring', 'summer'\]\.includes\(normalized\)/)
  assert.match(source, /return season \|\| '--'/)
  assert.match(source, /playerCharacterDisplayLabel,[\s\S]*playerPresenceMeta\s*\n\} from '@\/i18n\/playerMessages\.js'/)
  assert.match(source, /playerCharacterDisplayLabel\(player, this\.\$t\)/)
  assert.match(source, /normalizePlayerStatus\(player\?\.status\)/)
  assert.match(source, /playerPresenceMeta\(player, this\.\$t\)/)
  assert.match(source, /const type = this\.\$t\(`servers\.workspace\.worlds\.roles\.\$\{this\.worldType\(world\)\}`\)/)
  assert.match(source, /this\.worldIsMaster\(world\) \? 'master' : 'secondary'/)
})

test('server workspace keeps Lua and backend error details while localizing presentation', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /command: 'c_save\(\)'/)
  assert.match(source, /command: "print\('当前天数: ' \.\. TheWorld\.state\.cycles \+ 1\)"/)
  assert.match(source, /nameKey: 'servers\.workspace\.console\.commonCommands\.save'/)
  assert.match(source, /return \{ key, detail: String\(error\?\.message \|\| ''\)\.trim\(\) \}/)
  assert.doesNotMatch(source, /response\?\.msg \|\|/)
})

test('server workspace formats dates with the active locale', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /const localeState = this\.\$i18n\?\.locale/)
  assert.match(source, /formatSystemDateTime\(date, \{ locale, hour: '2-digit', minute: '2-digit' \}\)/)
  assert.match(source, /formatSystemDateTime\(date, \{ locale, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' \}\)/)
  assert.match(source, /formatBackupTime\(value\)[\s\S]*month: '2-digit',[\s\S]*day: '2-digit',[\s\S]*hour: '2-digit',[\s\S]*minute: '2-digit'/)
})

test('server workspace keeps operational summaries inline and world facts on compact weighted columns', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /class="workspace-overview"/)
  assert.match(source, /class="status-summary" role="list"/)
  assert.match(source, /<Separator class="status-separator" orientation="vertical"/)
  assert.match(source, /minmax\(70px, 0\.7fr\)[\s\S]*minmax\(130px, 1\.35fr\)[\s\S]*minmax\(120px, 1\.2fr\)/)
  assert.match(source, /\.world-card-header \{\s*padding-block: 10px;/)
  assert.match(source, /\.world-facts \{[\s\S]*padding-left: 14px;\s*border-left: 1px solid var\(--border\);/)
  assert.match(source, /@media \(max-width: 1100px\) \{[\s\S]*\.world-facts \{[\s\S]*border-left: 0;/)
  assert.doesNotMatch(source, /class="status-card"/)
})

test('server workspace reuses cached world-state snapshots without forcing Lua refresh jobs', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /worldStatesV2API\.list\(roomId\)/)
  assert.match(source, /worldStateSnapshots/)
  assert.match(source, /worldSeasonProgress\(world\)/)
  assert.match(source, /worldPhaseProgress\(world\)/)
  assert.match(source, /worldWeatherLabel\(world\)/)
  assert.doesNotMatch(source, /world-states\/actions\/refresh/)
})

test('server workspace shows each world runtime machine and opens placement management', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /topologyV2API\.get\(roomId\)/)
  assert.match(source, /worldMachineName\(world\)/)
  assert.match(source, /servers\.workspace\.worlds\.machine/)
  assert.match(source, /\.world-identity\s*>\s*\.world-machine\s*\{[\s\S]*?display:\s*flex/)
  assert.match(source, /path: '\/rooms\/settings', query: \{ id: this\.selectedRoomId, deployment: 'edit' \}/)
})

test('server workspace keeps player count aligned with the world facts', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /grid-template-columns: minmax\(180px, 240px\) minmax\(0, 1fr\) auto/)
  assert.match(source, /worldOnlinePlayerLabel\(world\)/)
  assert.match(source, /online_by_world/)
  assert.doesNotMatch(source, /class="world-presence"/)
})

test('room control only shows room-scoped summary data', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /servers\.workspace\.overview\.attentionWorlds/)
  assert.match(source, /attentionWorldCount\(\)/)
  assert.doesNotMatch(source, /servers\.workspace\.overview\.diskUsage/)
  assert.doesNotMatch(source, /systemApi\.getDashboardStatus/)
})

test('server workspace does not reserve visible space for redundant operation copy', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /<CardHeader class="sr-only">\s*<CardTitle>\{\{ \$t\('servers\.workspace\.operations\.title'\) \}\}<\/CardTitle>/)
  assert.match(source, /<CardContent class="operation-content"><Tabs/)
  assert.match(source, /\.operation-content \{\s*padding-top: 12px;/)
})

test('server workspace operation tabs use a fixed responsive grid without horizontal scrolling', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /\.operation-tabs-list \{[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/)
  assert.match(source, /@media \(max-width: 520px\) \{[\s\S]*\.operation-tabs-list \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
  assert.doesNotMatch(source, /\.operation-tabs-list \{[^}]*overflow-x: auto;/)
})

test('server workspace keeps players in operations and removes the redundant context rail', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /<TabsTrigger value="players">/)
  assert.match(source, /class="players-panel"/)
  assert.match(source, /servers\.workspace\.backups\.latest/)
  assert.match(source, /formatBackupTime\(latestBackup\.createdAt \|\| latestBackup\.create_time\)/)
  assert.doesNotMatch(source, /class="context-(?:rail|card|section-backups|section-quick)/)
  assert.doesNotMatch(source, /servers\.workspace\.quickNav/)
  assert.doesNotMatch(source, /visibleBackups/)
})

test('server workspace collects fresh player state from the players panel', async () => {
  const [source, messages] = await Promise.all([
    readFile(sourceUrl, 'utf8'),
    readFile(new URL('../src/i18n/serverMessages.js', import.meta.url), 'utf8')
  ])

  assert.match(source, /:disabled="playersRefreshing \|\| !selectedRoom"/)
  assert.match(source, /<Spinner v-if="playersRefreshing" \/>[\s\S]*<RefreshCw v-else \/>/)
  assert.match(source, /@click="refreshPlayerStates"/)
  assert.match(source, /async refreshPlayerStates\(\)[\s\S]*playerApi\.updatePlayerInfo\(\{[\s\S]*archive_name: room\.name,[\s\S]*world_ids: this\.playerScopeWorldIds\(\)[\s\S]*reloadPlayerStats\(\{ preserveExisting: true, collected: true \}\)/)
  assert.match(source, /playersRefreshing: false/)
  assert.match(messages, /refresh: '刷新玩家状态',[\s\S]*refreshSucceeded: '玩家状态已刷新'/)
  assert.match(messages, /refresh: 'Refresh player state',[\s\S]*refreshSucceeded: 'Player state refreshed'/)
})

test('server workspace distinguishes live metrics from sampled survival state before players went offline', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /playerVitals\(player\)/)
  assert.match(source, /isKnownPlayerMetric\(player, metric\.field, metric\.current\)/)
  assert.match(source, /isLivePlayerMetric\(player, metric\.maxField, metric\.maximum\)/)
  assert.match(source, /field_states\?\.\[field\]\?\.observedAt/)
  assert.match(source, /servers\.workspace\.players\.sampledMetricsAt/)
  assert.match(source, /const observation = playerLastObservation\(player\)/)
  assert.match(source, /class="player-vitals-state"/)
  assert.match(source, /health_percent/)
  assert.match(source, /hunger_percent/)
  assert.match(source, /sanity_percent/)
  assert.match(source, /player\?\.moisture/)
  assert.match(source, /formatPlayerPercentage\(player\.moisture\)/)
  assert.match(source, /formatPlayerVital/)
  assert.match(source, /formatPlayerTemperature/)
  assert.match(source, /servers\.workspace\.players\.lastWorld/)
  assert.match(source, /\.players-panel \{\s*min-height: 220px;/)
  assert.doesNotMatch(source, /\.players-panel \{\s*min-height: 440px;/)
})

test('server workspace shows live player netscore as compact in-game network bars', async () => {
  const [source, indicator, messages] = await Promise.all([
    readFile(sourceUrl, 'utf8'),
    readFile(new URL('../src/components/players/PlayerNetworkIndicator.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/i18n/serverMessages.js', import.meta.url), 'utf8')
  ])

  assert.match(source, /<PlayerNetworkIndicator[\s\S]*:score="row\.player\.net_score"[\s\S]*:available="playerNetworkAvailable\(row\.player\)"/)
  assert.match(source, /!this\.playerSnapshotStale && isLivePlayerMetric\(player, 'netScore', player\?\.net_score\)/)
  assert.match(source, /class="player-context-line"/)
  assert.match(indicator, /playerNetworkLabel\(normalizedScore\.value, t\)/)
  assert.match(indicator, /normalizedScore\.value === null \? 0 : 3 - normalizedScore\.value/)
  assert.match(indicator, /<Tooltip v-if="normalizedScore !== null">/)
  assert.doesNotMatch(indicator, /player-network-empty|>--</)
  assert.match(indicator, /v-for="bar in 3"[\s\S]*bar <= activeBars/)
  assert.match(indicator, /is-excellent[\s\S]*var\(--success\)[\s\S]*is-fair[\s\S]*var\(--warning\)[\s\S]*is-poor[\s\S]*var\(--destructive\)/)
  assert.match(messages, /summary: '玩家网络质量：\{status\}（netscore \{score\}）'/)
  assert.match(messages, /summary: 'Player network quality: \{status\} \(netscore \{score\}\)'/)
})

test('server workspace exposes compact direct controls for every live player vital', async () => {
  const [source, control, messages] = await Promise.all([
    readFile(sourceUrl, 'utf8'),
    readFile(new URL('../src/components/players/PlayerVitalQuickControl.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/i18n/serverMessages.js', import.meta.url), 'utf8')
  ])

  assert.match(source, /<PlayerVitalQuickControl[\s\S]*@execute="executePlayerVitalAction\(row\.player, \$event\)"/)
  assert.match(source, /commandApi\.executeCommand\([\s\S]*?'set_player_stat',[\s\S]*?player_id: player\.user_id/)
  assert.match(source, /await playerApi\.updatePlayerInfo\(\{[\s\S]*?archive_name: room\.name,[\s\S]*?world_name: world\.name/)
  assert.match(source, /playerSnapshotStale/)
  assert.match(source, /!\['dead', 'ghost'\]\.includes\(gameplayState\)/)
  assert.match(source, /playerApi\.resurrectPlayer\(player, null, player\.user_id\)/)
  assert.doesNotMatch(source, /servers\.workspace\.players\.quickActions\.confirm/)

  assert.match(control, /<Popover(?: v-else)? v-model:open="open">/)
  assert.match(control, /v-if="disabled && !pending"[\s\S]*class="player-metric is-static"/)
  assert.match(control, /<Slider[\s\S]*<ToggleGroup[\s\S]*<InputGroup/)
  assert.match(control, /health: 100,[\s\S]*hunger: 100,[\s\S]*sanity: 100,[\s\S]*moisture: 0,[\s\S]*temperature: 0/)
  assert.match(control, /watch\(open, value => \{[\s\S]*if \(value\) resetDraft\(\)/)
  assert.doesNotMatch(control, /controlValue/)
  assert.match(control, /\[-20, 0, 35, 70, 90\]/)
  assert.match(control, /\[1, 25, 50, 75, 100\]/)
  assert.doesNotMatch(control, /<Select|Chevron|Arrow/)

  assert.match(messages, /metrics: \{ health: '生命', hunger: '饥饿', sanity: '理智', moisture: '湿度'/)
  assert.match(messages, /quickActions: \{[\s\S]*actionRefreshFailed:[\s\S]*reloadFailed:/)
})

test('server workspace uses compact semantic status cues and clear refresh scopes', async () => {
  const [source, messages, badge, freshness] = await Promise.all([
    readFile(sourceUrl, 'utf8'),
    readFile(new URL('../src/i18n/serverMessages.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/ui/badge/index.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/runtime/WorldDataFreshnessBadge.vue', import.meta.url), 'utf8')
  ])

  assert.doesNotMatch(source, /<CardDescription class="break-all">\{\{ selectedRoom\.directoryName/)
  assert.match(source, /class="player-heading-line"[\s\S]*<Badge[\s\S]*v-if="row\.vitals\.length"[\s\S]*class="player-vitals-state"/)
  assert.match(source, /class="player-row-actions"[\s\S]*<PlayerActionMenu/)
  assert.match(source, /\.player-row \{[\s\S]*grid-template-columns: 40px minmax\(0, 1fr\) auto;[\s\S]*align-items: center;/)
  assert.match(messages, /refresh: '刷新全部数据'/)
  assert.match(messages, /refresh: 'Refresh all data'/)
  assert.match(badge, /success:[\s\S]*border-success\/25[\s\S]*warning:[\s\S]*border-warning\/25/)
  assert.match(freshness, /normalizedFreshness\.value === 'live'\) return 'success'/)
  assert.match(freshness, /normalizedFreshness\.value === 'delayed'\) return 'warning'/)
})

test('server workspace shows the room directory and DST in-game host performance', async () => {
  const [source, indicator, messages] = await Promise.all([
    readFile(sourceUrl, 'utf8'),
    readFile(new URL('../src/components/worlds/WorldPerformanceIndicator.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/i18n/serverMessages.js', import.meta.url), 'utf8')
  ])

  assert.match(source, /selectedRoom\.directoryName[\s\S]*servers\.workspace\.roomDirectory/)
  assert.match(source, /<WorldPerformanceIndicator[\s\S]*:score="worldStateFor\(world\)\?\.hostPerformance"[\s\S]*:available="worldPerformanceAvailable\(world\)"/)
  assert.match(source, /world\?\.status === 'running' && snapshot\?\.freshness === 'live'/)
  assert.match(indicator, /normalizedScore\.value === null \? 0 : 3 - normalizedScore\.value/)
  assert.match(indicator, /v-for="bar in 3"[\s\S]*bar <= activeBars/)
  assert.match(indicator, /is-good[\s\S]*var\(--success\)[\s\S]*is-fair[\s\S]*var\(--warning\)[\s\S]*is-poor[\s\S]*var\(--destructive\)/)
  assert.match(messages, /roomDirectory: '房间目录：\{name\}'/)
  assert.match(messages, /good: '游戏内性能良好：绿色三格'[\s\S]*fair: '游戏内性能一般：黄色两格'[\s\S]*poor: '游戏内性能较差：红色一格'/)
})

test('server workspace progressively expands the player list and uses explicit world-state icons', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /const CONTEXT_PLAYER_LIMIT = 5/)
  assert.match(source, /const players = sortPlayers\(this\.playerStats\?\.recent_players \|\| \[\]\)/)
  assert.match(source, /this\.playerDisplayLimit === 'all' \? players : players\.slice\(0, this\.playerDisplayLimit\)/)
  assert.doesNotMatch(source, /CONTEXT_BACKUP_LIMIT/)
  assert.match(source, /\{ forest: Trees, cave: Mountain \}\[this\.worldType\(world\)\] \|\| Shapes/)
  assert.match(source, /autumn: Leaf,[\s\S]*winter: Snowflake,[\s\S]*spring: Sprout,[\s\S]*summer: Sun/)
  assert.match(source, /day: Sun,[\s\S]*dusk: Sunset,[\s\S]*night: Moon/)
  assert.match(source, /<WorldStateQuickControl[\s\S]*kind="day"[\s\S]*kind="season"[\s\S]*kind="phase"[\s\S]*kind="weather"/)
  assert.doesNotMatch(source, /Pickaxe|TreePine/)
})

test('server workspace world facts open compact direct state controls', async () => {
  const [source, control, messages] = await Promise.all([
    readFile(sourceUrl, 'utf8'),
    readFile(new URL('../src/components/worlds/WorldStateQuickControl.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/i18n/serverMessages.js', import.meta.url), 'utf8')
  ])

  assert.match(source, /@execute="executeWorldStateAction\(world, \$event\)"/)
  assert.match(source, /pendingWorldStateActions/)
  assert.doesNotMatch(source, /servers\.workspace\.worlds\.quickActions\.confirm/)
  assert.match(source, /commandApi\.executeCommand\([\s\S]*action\.commandId,[\s\S]*action\.arguments \|\| \{\},[\s\S]*room\.name/)
  assert.match(source, /worldStatesV2API\.refreshWorld\(room\.id, world\.id\)/)
  assert.match(source, /applyWorldStateSnapshot\(refreshed\.snapshot\)/)
  assert.match(source, /@world-state-refreshed="applyWorldStateSnapshot"/)
  assert.match(source, /canStopWorld\(world\)/)

  for (const command of ['skip_days', 'set_season', 'next_phase', 'set_phase', 'set_precipitation', 'set_world_wetness', 'set_world_temperature']) {
    assert.match(control, new RegExp(`['"]${command}['"]`), command)
  }
  assert.match(control, /<Popover v-model:open="open">/)
  assert.match(control, /<ToggleGroup[\s\S]*<Slider/)
  assert.match(control, /min="-25"[\s\S]*max="95"/)
  assert.doesNotMatch(control, /<Select|promptText|confirmationInput/)
  assert.match(messages, /quickActions:\s*\{[\s\S]*nextDay:[\s\S]*fixedTemperature:/)
})

test('server workspace exposes every world-state icon in a compact legend', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /<PopoverTrigger as-child>/)
  assert.match(source, /servers\.workspace\.worlds\.legend\.open/)
  assert.match(source, /worldLegendGroups\(\)/)
  assert.match(source, /key: 'realms',[\s\S]*icon: Trees[\s\S]*icon: Mountain/)
  assert.match(source, /key: 'seasons',[\s\S]*icon: Leaf[\s\S]*icon: Snowflake[\s\S]*icon: Sprout[\s\S]*icon: Sun/)
  assert.match(source, /key: 'phases',[\s\S]*icon: Sun[\s\S]*icon: Sunset[\s\S]*icon: Moon/)
})

test('server workspace exposes connection details from a compact header popover', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /class="connection-trigger-endpoint"/)
  assert.match(source, /servers\.workspace\.worlds\.connection\.trigger/)
  assert.match(source, /resolveRoomConnection\(\{/)
  assert.match(source, /worldListenPort\(\{/)
  assert.match(source, /buildDirectConnectCode\(/)
  assert.match(source, /topologyV2API\.infrastructure\(\)/)
  assert.match(source, /copyConnectionValue\(roomConnection\.endpoint, 'address'\)/)
  assert.match(source, /copyConnectionValue\(roomDirectConnectCode, 'code'\)/)
  assert.match(source, /v-model="connectionAddressDraft"/)
  assert.match(source, /roomConnection\.lanAddresses/)
  assert.match(source, /<SelectGroup>[\s\S]*<SelectItem v-for="address in roomConnection\.lanAddresses"/)
  assert.match(source, /servers\.workspace\.worlds\.connection\.lanAddress/)
  assert.match(source, /selectedLanConnectionAddress/)
  assert.match(source, /selectLanConnectionAddress/)
  assert.match(source, /draftAddress: this\.connectionPopoverOpen \? this\.connectionAddressDraft : ''/)
  assert.match(source, /topologyV2API\.detectNetworkProfileEgress\(profileId, region\)/)
  assert.match(source, /egressProbeRegion\(this\.activeLocale\)/)
  assert.match(source, /detectedAddress: this\.detectedConnectionAddress/)
  assert.match(source, /servers\.workspace\.worlds\.connection\.advertisedAddress/)
  assert.match(source, /this\.detectDefaultConnectionAddress\(\)/)
  assert.match(source, /topologyV2API\.updateNetworkProfile\(profile\.id,/)
  assert.match(source, /bindAddress: profile\.bindAddress \|\| '0\.0\.0\.0'/)
  assert.match(source, /advertiseAddress: address/)
  assert.doesNotMatch(source, /openMachineConnections/)
  assert.match(source, /path: '\/rooms\/settings', query: \{ id: this\.selectedRoomId, deployment: 'edit' \}/)
  assert.doesNotMatch(source, /connection-bar/)
})

test('server workspace follows configured snapshot retention for confirmed rollback', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /@click="handleWorldAction\(world, 'restart'\)"[\s\S]*@click="openRollbackDialog\(world\)"/)
  assert.match(source, /<UiDialog v-model:open="rollbackDialogOpen">/)
  assert.match(source, /configurationV2API\.room\(roomId\)/)
  assert.match(source, /roomMaxSnapshots: null/)
  assert.match(source, /void this\.loadRollbackConfiguration\(\)/)
  assert.match(source, /rollbackConfigurationError/)
  assert.match(source, /<Slider[\s\S]*:model-value="\[rollbackDays\]"[\s\S]*:max="roomMaxSnapshots"[\s\S]*@update:model-value="selectRollbackDays"/)
  assert.match(source, /<InputGroup class="rollback-number-input">/)
  assert.match(source, /Math\.min\(this\.roomMaxSnapshots, Math\.max\(1, Math\.round\(days\)\)\)/)
  assert.doesNotMatch(source, /rollbackQuickOptions|<ToggleGroupItem v-for="days/)
  assert.match(source, /commandApi\.executeCommand\(\s*`\$\{room\.id\}::\$\{world\.id\}`,\s*'rollback',\s*\{ days: Number\(this\.rollbackDays\) \},\s*room\.name\s*\)/)
  assert.doesNotMatch(source, /rollback-confirmation|promptText/)
})

test('server workspace expands lifecycle dependencies and reconciles state after failed jobs', async () => {
  const [source, helper, adapter, messages] = await Promise.all([
    readFile(new URL('../src/views/servers/ServerWorkspace.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/worldRuntimeStatus.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/v2LegacyAdapters.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/i18n/serverMessages.js', import.meta.url), 'utf8')
  ])

  assert.match(source, /worldLifecycleScope\(this\.worlds, world, action\)/)
  assert.match(source, /world_ids: affectedWorlds\.map\(item => item\.id\)/)
  assert.match(source, /actionDependencyConfirm/)
  assert.match(source, /toast\.loading\([\s\S]*?actionScopeSubmitted/)
  assert.match(source, /actionRefreshing[\s\S]*?id: operationToastId/)
  assert.match(source, /if \(requestStarted && !requestCanceled\) \{[\s\S]*?await this\.refreshWorkspace\(true\)/)
  assert.match(helper, /\['stopped', 'failed'\]\.includes\(masterStatus\)/)
  assert.match(helper, /\['stop', 'restart'\]\.includes\(normalizedAction\)/)
  assert.match(adapter, /async restartRoom\(input\)/)
  assert.match(adapter, /lifecycleWorldIDs\(room, input, 'restart'\)/)
  assert.match(adapter, /runtimeModes\(room\.id, lifecycleWorldIDs\(room, params, 'start'\)\)/)
  assert.match(messages, /dependencyMasterUnknown/)
})

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
  assert.match(source, /playerCharacterLabel\s*\n\} from '@\/i18n\/playerMessages\.js'/)
  assert.match(source, /return playerCharacterLabel\(prefab, this\.\$t\)/)
  assert.match(source, /normalizePlayerStatus\(player\?\.status\)/)
  assert.match(source, /return rawRole \|\| this\.\$t\('servers\.workspace\.worlds\.roles\.custom'\)/)
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
  assert.match(source, /formatSystemDateTime\(date, \{ locale, month: '2-digit', day: '2-digit' \}\)/)
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

test('server workspace promotes players to operations and keeps supporting context compact', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /<Card size="sm" class="context-card">/)
  assert.match(source, /<CardContent class="context-card-content">/)
  assert.equal((source.match(/<Separator class="context-separator/g) || []).length, 1)
  assert.match(source, /<TabsTrigger value="players">/)
  assert.match(source, /class="players-panel"/)
  assert.match(source, /class="context-section context-section-backups"/)
  assert.match(source, /class="context-section context-section-quick"/)
  assert.doesNotMatch(source, /class="context-section context-section-players"/)
  assert.doesNotMatch(source, /\$t\('servers\.workspace\.quickNav\.description'\)/)
})

test('server workspace shows only live survival metrics and labels cached player locations', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /playerVitals\(player\)/)
  assert.match(source, /isLivePlayerMetric\(player, metric\.field, metric\.raw\)/)
  assert.match(source, /health_percent/)
  assert.match(source, /hunger_percent/)
  assert.match(source, /sanity_percent/)
  assert.match(source, /formatPlayerTemperature/)
  assert.match(source, /servers\.workspace\.players\.lastWorld/)
  assert.match(source, /\.players-panel \{\s*min-height: 220px;/)
  assert.doesNotMatch(source, /\.players-panel \{\s*min-height: 440px;/)
})

test('server workspace keeps context lists bounded and uses explicit world-state icons', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /const CONTEXT_PLAYER_LIMIT = 5/)
  assert.match(source, /const CONTEXT_BACKUP_LIMIT = 3/)
  assert.match(source, /recent_players\?\.slice\(0, CONTEXT_PLAYER_LIMIT\)/)
  assert.match(source, /return this\.backups\.slice\(0, CONTEXT_BACKUP_LIMIT\)/)
  assert.match(source, /\? Mountain\s*: Trees/)
  assert.match(source, /autumn: Leaf,[\s\S]*winter: Snowflake,[\s\S]*spring: Sprout,[\s\S]*summer: Sun/)
  assert.match(source, /day: Sun,[\s\S]*dusk: Sunset,[\s\S]*night: Moon/)
  assert.match(source, /class="world-fact-value"/)
  assert.doesNotMatch(source, /Pickaxe|TreePine/)
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

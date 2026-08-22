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
  assert.match(source, /return prefab \|\| this\.\$t\('servers\.workspace\.players\.unknownCharacter'\)/)
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

test('server workspace keeps operational summaries inline and world facts on stable columns', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /class="workspace-overview"/)
  assert.match(source, /class="status-summary" role="list"/)
  assert.match(source, /<Separator class="status-separator" orientation="vertical"/)
  assert.match(source, /grid-template-columns: repeat\(7, minmax\(58px, 1fr\)\)/)
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

  assert.match(source, /grid-template-columns: minmax\(220px, 320px\) minmax\(0, 1fr\) auto/)
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

test('server workspace keeps context lists bounded and uses static realm icons', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /const CONTEXT_PLAYER_LIMIT = 5/)
  assert.match(source, /const CONTEXT_BACKUP_LIMIT = 3/)
  assert.match(source, /recent_players\?\.slice\(0, CONTEXT_PLAYER_LIMIT\)/)
  assert.match(source, /return this\.backups\.slice\(0, CONTEXT_BACKUP_LIMIT\)/)
  assert.match(source, /\? Pickaxe : TreePine/)
  assert.doesNotMatch(source, /\? Moon : Sun/)
})

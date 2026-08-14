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
  assert.match(source, /toLocaleTimeString\(locale,/)
  assert.match(source, /toLocaleDateString\(locale,/)
})

test('server workspace keeps operational summaries inline and world facts on stable columns', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /class="workspace-overview"/)
  assert.match(source, /class="status-summary" role="list"/)
  assert.match(source, /<Separator class="status-separator" orientation="vertical"/)
  assert.match(source, /grid-template-columns: repeat\(4, minmax\(72px, 1fr\)\)/)
  assert.doesNotMatch(source, /class="status-card"/)
})

test('server workspace does not reserve visible space for redundant operation copy', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /<CardHeader class="sr-only">\s*<CardTitle>\{\{ \$t\('servers\.workspace\.operations\.title'\) \}\}<\/CardTitle>/)
  assert.match(source, /<CardContent class="operation-content"><Tabs/)
  assert.match(source, /\.operation-content \{\s*padding-top: 12px;/)
})

test('server workspace consolidates room context into one compact card', async () => {
  const source = await readFile(sourceUrl, 'utf8')

  assert.match(source, /<Card size="sm" class="context-card">/)
  assert.match(source, /<CardContent class="context-card-content">/)
  assert.equal((source.match(/<Separator class="context-separator/g) || []).length, 2)
  assert.match(source, /class="context-section context-section-players"/)
  assert.match(source, /class="context-section context-section-backups"/)
  assert.match(source, /class="context-section context-section-quick"/)
  assert.doesNotMatch(source, /\$t\('servers\.workspace\.quickNav\.description'\)/)
})

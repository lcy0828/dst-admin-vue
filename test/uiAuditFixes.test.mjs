import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { cn } from '../src/lib/utils.js'
import { messages } from '../src/i18n/messages.js'
import {
  characterLabel,
  expansionLabel,
  expansionOptionLabel,
  toolGroupLabel
} from '../src/lib/workbenchExpansion.mjs'
import { resolveThemePreset, themePresetById } from '../src/theme/themePresets.js'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

function relativeLuminance(hex) {
  const channels = [1, 3, 5]
    .map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(value => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

test('floating assistant avoids /ai route, top header, fixed settings footer, and task dock collisions', async () => {
  const [assistant, dock, worldSettings] = await Promise.all([
    source('src/components/ai/AIFloatingAssistant.vue'),
    source('src/components/layout/TaskProgressDock.vue'),
    source('src/views/worlds/WorldSettings.vue')
  ])

  assert.match(assistant, /v-if="route\.path !== '\/ai'"/)
  assert.match(assistant, /if \(path === '\/ai' && open\.value\) open\.value = false/)
  assert.match(assistant, /top:\s*4rem;\s*height:\s*calc\(100dvh - 4rem\);/)
  assert.match(assistant, /body:has\(#settings-fixed-footer\)/)
  assert.match(assistant, /body:has\(\.task-progress-bubble\)/)
  assert.match(assistant, /body:has\(\.task-progress-dock\)/)
  assert.match(dock, /body:has\(#settings-fixed-footer\)/)
  assert.match(worldSettings, /@media \(max-width: 767px\)/)
  assert.doesNotMatch(worldSettings, /@media \(max-width: 768px\)/)
})

test('ScrollArea clips flex children cleanly and Table supports opt-out inner overflow', async () => {
  const [scrollArea, table, roomChat, spawnAudit, worldMaps] = await Promise.all([
    source('src/components/ui/scroll-area/ScrollArea.vue'),
    source('src/components/ui/table/Table.vue'),
    source('src/components/RoomChatPanel.vue'),
    source('src/components/game-tools/SpawnAuditResult.vue'),
    source('src/views/worlds/WorldMaps.vue')
  ])

  assert.match(scrollArea, /relative flex flex-col overflow-hidden/)
  assert.match(scrollArea, /min-h-0 w-full flex-1/)
  assert.match(scrollArea, /<ScrollBar v-if="horizontal" orientation="horizontal" \/>/)
  assert.match(table, /cn\('relative w-full overflow-x-auto', props\.containerClass\)/)
  assert.match(roomChat, /container-class="overflow-visible"/)
  assert.match(spawnAudit, /container-class="overflow-visible"/)
  assert.match(worldMaps, /<ScrollArea[^>]*\bhorizontal\b[^>]*class="session-scroll"/)
  assert.match(worldMaps, /container-class="overflow-visible"/)
})

test('AlertDialogContent and SheetContent allow responsive max-width overrides via tailwind-merge', async () => {
  const [alertDialog, sheet] = await Promise.all([
    source('src/components/ui/alert-dialog/AlertDialogContent.vue'),
    source('src/components/ui/sheet/SheetContent.vue')
  ])

  assert.doesNotMatch(alertDialog, /data-\[size=default\]:sm:max-w-sm/)
  assert.doesNotMatch(sheet, /data-\[side=right\]:sm:max-w-sm/)
  assert.equal(cn('max-w-xs sm:max-w-sm', 'sm:max-w-xl'), 'max-w-xs sm:max-w-xl')
  assert.equal(cn('sm:max-w-sm', 'sm:max-w-lg'), 'sm:max-w-lg')
  assert.equal(cn('sm:max-w-sm', 'sm:max-w-[30rem]'), 'sm:max-w-[30rem]')
})

test('Alert and AlertAction use intrinsic CSS grid columns instead of fixed absolute padding', async () => {
  const [alertVariantsSource, alertActionSource, aiView] = await Promise.all([
    source('src/components/ui/alert/index.js'),
    source('src/components/ui/alert/AlertAction.vue'),
    source('src/views/AIAssistant.vue')
  ])

  assert.doesNotMatch(alertVariantsSource, /pr-18/)
  assert.match(alertVariantsSource, /has-data-\[slot=alert-action\]:grid-cols-\[minmax\(0,1fr\)_auto\]/)
  assert.match(alertVariantsSource, /has-\[>svg\]:has-data-\[slot=alert-action\]:grid-cols-\[auto_minmax\(0,1fr\)_auto\]/)
  assert.doesNotMatch(alertActionSource, /\babsolute\b/)
  assert.match(alertActionSource, /col-start-2.*group-has-\[>svg\]\/alert:col-start-3/)
  assert.match(aiView, /<AlertAction v-if="!session\.initialized\.value">/)
})

test('ModList filter grid, sticky table action columns, and ModDetailsDialog scroll constraints are aligned', async () => {
  const [modList, modDetails, playerList, banList, logQuery] = await Promise.all([
    source('src/views/mods/ModList.vue'),
    source('src/views/mods/ModDetailsDialog.vue'),
    source('src/views/players/PlayerList.vue'),
    source('src/views/players/BanList.vue'),
    source('src/views/LogQueryView.vue')
  ])

  assert.match(modList, /<RoomScopeSelect[\s\S]*?<FieldGroup class="filter-form">/)
  assert.match(modList, /grid-template-columns:\s*auto minmax\(130px, 160px\) minmax\(150px, 180px\) minmax\(180px, 1fr\) auto;/)
  assert.doesNotMatch(modList, /grid-column:\s*1\s*\/\s*-2/)
  assert.match(modDetails, /\.details-scroll-area\s*\{\s*min-height:\s*0;\s*\}/)
  assert.match(playerList, /whitespace-normal break-all/)

  for (const tablePage of [playerList, banList, logQuery]) {
    assert.match(tablePage, /\.action-column\s*\{[\s\S]*?z-index:\s*10;/)
    assert.match(tablePage, /:deep\(tbody tr:hover\) \.action-column/)
  }
})

test('dark mode syncs Toaster, Sonner variables, PerformanceChart redraws, Slider thumb, and readable primaries', async () => {
  const [appSource, sonnerSource, chartSource, sliderSource] = await Promise.all([
    source('src/App.vue'),
    source('src/components/ui/sonner/Sonner.vue'),
    source('src/components/worlds/PerformanceChart.vue'),
    source('src/components/ui/slider/Slider.vue')
  ])

  assert.match(appSource, /:theme="currentTheme"/)
  assert.match(appSource, /themeManager\.addListener/)
  assert.doesNotMatch(sonnerSource, /hsl\(var\(--popover\)/)
  assert.match(sonnerSource, /color-mix\(in srgb, var\(--popover\)/)
  assert.match(chartSource, /themeManager\.addListener/)
  assert.match(chartSource, /system-preferences-updated/)
  assert.doesNotMatch(sliderSource, /\bbg-white\b/)
  assert.match(sliderSource, /\bbg-background\b/)

  for (const id of ['indigo', 'emerald', 'teal']) {
    const preset = themePresetById(id)
    assert.ok(preset.dark?.primary, `${id} should define a dark primary`)
    assert.ok(relativeLuminance(preset.dark.primary) >= 0.2, `${id} dark primary should remain legible`)
  }
  const customDarkNavy = resolveThemePreset('#1e1b4b')
  assert.ok(relativeLuminance(customDarkNavy.dark.primary) >= 0.24)
})

test('RoomList keeps existing cards visible during refresh and polls boundedly while worlds transition', async () => {
  const roomList = await source('src/views/rooms/RoomList.vue')

  assert.match(roomList, /v-if="loading && rooms\.length === 0"/)
  assert.match(roomList, /hasTransitioningWorlds\(\)/)
  assert.match(roomList, /syncTransitionRefresh\(\)/)
  assert.match(roomList, /refreshRooms\(force = false, notify = force, \{ silent = false \} = \{\}\)/)
})

test('Game tools subviews are localized in English and unknown routes render NotFoundView', async () => {
  const [entityTools, extraTools, mapEditor, prefs, notFound, routerSource] = await Promise.all([
    source('src/views/servers/EntityTools.vue'),
    source('src/components/game-tools/WorkbenchExtraTools.vue'),
    source('src/components/game-tools/WorkbenchMapEditor.vue'),
    source('src/components/game-tools/WorkbenchPreferences.vue'),
    source('src/views/NotFoundView.vue'),
    source('src/router/index.js')
  ])

  for (const sfc of [entityTools, extraTools, mapEditor, prefs, notFound]) {
    const templateStart = sfc.indexOf('<template>')
    const templateEnd = sfc.lastIndexOf('</template>')
    const template = sfc.slice(templateStart, templateEnd).replaceAll(/<!--[^]*?-->/g, '')
    assert.doesNotMatch(template, /[\u3400-\u9fff]/)
  }

  assert.equal(characterLabel('wilson', true), 'Wilson')
  assert.equal(characterLabel('wilson', false), '威尔逊')
  assert.equal(toolGroupLabel('player', true), 'Player & Modes')
  assert.equal(expansionLabel('invincible', true), 'Invincible')
  assert.equal(expansionOptionLabel('give_character_supplies', 'character', 'wathgrithr', true), 'Wigfrid')

  assert.equal(messages['en-US'].notFound.title, 'Page not found')
  assert.equal(messages['zh-CN'].notFound.title, '页面不存在')
  assert.match(routerSource, /path:\s*'\/:pathMatch\(\.\*\)\*'[\s\S]*?views\/NotFoundView\.vue/)
})

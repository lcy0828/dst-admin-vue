import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('Reka stateful controls use data-state selectors', async () => {
  const [switchSource, checkboxSource, radioSource, tabsSource] = await Promise.all([
    source('src/components/ui/switch/Switch.vue'),
    source('src/components/ui/checkbox/Checkbox.vue'),
    source('src/components/ui/radio-group/RadioGroupItem.vue'),
    source('src/components/ui/tabs/TabsTrigger.vue')
  ])

  assert.match(switchSource, /data-\[state=checked\]:bg-primary/)
  assert.match(switchSource, /data-\[state=unchecked\]:bg-input/)
  assert.match(checkboxSource, /data-\[state=checked\]:bg-primary/)
  assert.match(radioSource, /data-\[state=checked\]:bg-primary/)
  assert.match(tabsSource, /data-\[state=active\]:text-foreground/)

  for (const componentSource of [switchSource, checkboxSource, radioSource, tabsSource]) {
    assert.doesNotMatch(componentSource, /(?:^|:)data-(?:checked|unchecked|active):/)
  }
})

test('shared directional components use the orientation attribute contract', async () => {
  const [tabsRoot, tabsVariants, scrollBar, toggleGroup] = await Promise.all([
    source('src/components/ui/tabs/Tabs.vue'),
    source('src/components/ui/tabs/index.js'),
    source('src/components/ui/scroll-area/ScrollBar.vue'),
    source('src/components/ui/toggle-group/ToggleGroup.vue')
  ])

  assert.match(tabsRoot, /data-\[orientation=horizontal\]:flex-col/)
  assert.match(tabsVariants, /group-data-\[orientation=horizontal\]\/tabs:h-8/)
  assert.match(scrollBar, /data-\[orientation=vertical\]:h-full/)
  assert.match(toggleGroup, /:data-orientation="props\.orientation \|\| 'horizontal'"/)

  for (const componentSource of [tabsRoot, tabsVariants, scrollBar, toggleGroup]) {
    assert.doesNotMatch(componentSource, /(?:^|:)data-(?:horizontal|vertical):/)
  }
})

test('Reka overlays animate from their data-state values', async () => {
  const overlayPaths = [
    'src/components/ui/dialog/DialogContent.vue',
    'src/components/ui/dialog/DialogOverlay.vue',
    'src/components/ui/popover/PopoverContent.vue',
    'src/components/ui/select/SelectContent.vue',
    'src/components/ui/sheet/SheetContent.vue',
    'src/components/ui/sheet/SheetOverlay.vue'
  ]
  const overlaySources = await Promise.all(overlayPaths.map(source))

  for (const overlaySource of overlaySources) {
    assert.match(overlaySource, /data-\[state=open\]:/)
    assert.match(overlaySource, /data-\[state=closed\]:/)
    assert.doesNotMatch(overlaySource, /(?:^|:)data-(?:open|closed):/)
  }
})

test('room settings keeps tabs above content and switches in stable fields', async () => {
  const roomSettings = await source('src/views/rooms/RoomSettings.vue')

  assert.match(roomSettings, /orientation="horizontal"/)
  assert.match(roomSettings, /class="settings-tabs-nav"/)
  assert.match(roomSettings, /\.settings-tabs\s*\{[^}]*flex-direction:\s*column/s)
  assert.match(roomSettings, /\.settings-tab-list\s*\{[^}]*max-width:\s*none/s)
  assert.match(roomSettings, /'setting-field--switch': field\.type === 'switch'/)
  assert.match(roomSettings, /\.setting-field--switch\s*\{[^}]*min-height:\s*72px/s)
  assert.match(roomSettings, /data-slot='switch'.{0,80}flex:\s*none/s)
})

test('settings pages preserve dirty state and only show relevant save actions', async () => {
  const [roomSettings, worldSettings, systemSettings] = await Promise.all([
    source('src/views/rooms/RoomSettings.vue'),
    source('src/views/worlds/WorldSettings.vue'),
    source('src/views/SystemSettings.vue')
  ])

  assert.match(roomSettings, /baselineFingerprint/)
  assert.match(roomSettings, /this\.activeTab = invalidSection\.key/)
  assert.match(roomSettings, /async beforeRouteLeave\(\)/)
  assert.match(roomSettings, /saving:\s*false/)
  assert.match(worldSettings, /v-if="!loadError && showWorldSettingsFooter"/)
  assert.match(worldSettings, /\['worldgen', 'worldsettings'\]\.includes\(this\.worldSectionTab\)/)
  assert.match(systemSettings, /class="settings-tab-trigger"/)
  assert.match(systemSettings, /\.settings-tabs\s*\{[^}]*max-width:\s*none/s)
})

test('room settings exposes constraints and validates instead of clamping values', async () => {
  const roomSettings = await source('src/views/rooms/RoomSettings.vue')

  assert.match(roomSettings, /class="field-constraint"/)
  assert.match(roomSettings, /@blur="validateField\(field\)"/)
  assert.match(roomSettings, /:max="field\.max"/)
  assert.doesNotMatch(roomSettings, /normalizeNumberField/)
  assert.doesNotMatch(roomSettings, /Math\.min\(max, Math\.max/)
})

test('opening mod configuration keeps the list stable and delegates loading to the dialog', async () => {
  const [modList, modConfig] = await Promise.all([
    source('src/views/mods/ModList.vue'),
    source('src/views/mods/ModConfigDialog.vue')
  ])
  const openMethodStart = modList.indexOf('    openConfigDialog(mod) {')
  const openMethod = modList.slice(openMethodStart, modList.indexOf('    handleConfigUpdated(data)', openMethodStart))

  assert.match(openMethod, /this\.configDialogVisible = true/)
  assert.doesNotMatch(openMethod, /this\.loading = true/)
  assert.doesNotMatch(openMethod, /modApi\.getModConfig/)
  assert.match(modConfig, /await modApi\.getModConfig/)
  assert.match(modConfig, /v-if="loading" class="loading-container"/)
})

import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import test from 'node:test'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('Game tools are published through the API, canonical route, legacy redirect, and navigation', async () => {
  const [api, router, navigation, messages] = await Promise.all([
    source('src/api/v2.js'),
    source('src/router/index.js'),
    source('src/v2/navigation.js'),
    source('src/i18n/messages.js')
  ])

  assert.match(api, /entityCatalogV2API[\s\S]*?\/entity-catalog\/entities/)
  assert.match(router, /path:\s*'tools'[\s\S]*?EntityTools\.vue[\s\S]*?name:\s*'GameTools'/)
  assert.match(router, /path:\s*'entities'[\s\S]*?path:\s*'\/servers\/tools'/)
  assert.match(navigation, /navigation\.gameTools[^\n]+\/servers\/tools/)
  assert.match(messages, /gameTools:\s*'游戏工具'/)
  assert.match(messages, /gameTools:\s*'Game tools'/)
})

test('Game tools expose entity, player, and world sections', async () => {
  const page = await source('src/views/servers/EntityTools.vue')

  for (const section of ['entity', 'player', 'world']) {
    assert.match(page, new RegExp(`<TabsTrigger value="${section}"`))
    assert.match(page, new RegExp(`<TabsContent value="${section}"`))
  }
  for (const command of [
    'set_player_stat',
    'set_player_speed',
    'set_player_lock',
    'adjust_player_luck',
    'manage_player_skills',
    'set_monkey_curse',
    'clear_player_debuffs',
    'clear_player_inventory',
    'clear_player_naughtiness',
    'teleport_player',
    'relocate_players',
    'set_player_ability',
    'set_player_attack_multiplier',
    'toggle_player_ghost',
    'set_health_penalty',
    'set_character_power',
    'manage_followers',
    'spawn_domesticated_beefalo',
    'skip_days',
    'set_time_scale',
    'set_precipitation',
    'set_world_wetness',
    'set_world_temperature',
    'set_moon_phase',
    'trigger_world_event',
    'trigger_incident',
    'set_special_event',
    'stop_vote',
    'set_season',
    'next_phase',
    'set_phase',
    'set_clock_segments'
  ]) {
    assert.match(page, new RegExp(`['"]${command}['"]`), command)
  }
})

test('Entity operations keep exact Prefab commands bounded and make batch filtering optional', async () => {
  const page = await source('src/views/servers/EntityTools.vue')

  assert.match(page, /give:\s*40, spawn:\s*20, remove:\s*100/)
  assert.match(page, /direct:\s*'give_item'[\s\S]*materials:\s*'give_recipe_materials'[\s\S]*blueprint:\s*'give_blueprint'/)
  assert.match(page, /spawn:\s*'spawn_entity'[\s\S]*remove:\s*'remove_nearby_entities'[\s\S]*act:\s*'act_nearby_entities'/)
  assert.match(page, /give:\s*'give', spawn:\s*'spawn', remove:\s*'remove', act:\s*'remove'/)
  assert.match(page, /player_id:\s*player\.id,[\s\S]*action:\s*entityAction\.value,[\s\S]*radius:\s*Number\(radius\.value\)/)
  assert.match(page, /if \(entity\) argumentsMap\.prefab = entity\.id/)
  assert.match(page, /entityMode\.value === 'act' \|\| selectedEntity\.value/)
  assert.match(page, /giveVariant[\s\S]*direct[\s\S]*materials[\s\S]*blueprint/)
  assert.match(page, /giveQuantityMode = ref\('units'\)/)
  assert.match(page, /quantity_mode = giveQuantityMode\.value/)
  assert.match(page, /<ToggleGroupItem value="units">[\s\S]*<ToggleGroupItem value="stacks">/)
  assert.match(page, /stackCountHint/)
  assert.match(page, /async function submitEntityOperation\(\)[\s\S]*submitOperation\('entity', operation, ENTITY_CONFIRMATION_MODES\.has\(entityMode\.value\)\)/)
  assert.match(page, /async function executeOperation\(operation\)/)
  assert.match(page, /class="entity-submit-button"[\s\S]*@click="submitEntityOperation"[\s\S]*entitySubmitLabel/)
  assert.match(page, /\.entity-submit-button \{[^}]*max-width: 20rem;[^}]*white-space: normal;[^}]*overflow-wrap: anywhere;/)
  assert.doesNotMatch(page, /action:\s*entityAction\.value,[\s\S]{0,100}maximum:/)
  assert.match(page, /window\.setTimeout\(loadCatalog, 300\)/)
  assert.match(page, /entityMode\.value === 'act' \? 64 : 30/)
})

test('Every nearby entity action is allowlisted in the UI', async () => {
  const page = await source('src/views/servers/EntityTools.vue')
  const actions = [
    'delete', 'extinguish', 'ignite', 'restore', 'repair', 'repair_boat', 'freshen', 'heat', 'cool', 'salvage', 'haunt',
    'fertilize', 'grow', 'harvest', 'pick', 'chop', 'mine', 'hammer', 'dig', 'till', 'build_complete',
    'chaos', 'electrocute', 'kill', 'freeze', 'sleep', 'panic', 'pacify', 'root', 'taunt'
  ]

  for (const action of actions) {
    assert.match(page, new RegExp(`['"]${action}['"]`), action)
  }
  assert.match(page, /<TabsTrigger v-for="group in ENTITY_ACTION_GROUPS"/)
  assert.match(page, /<ToggleGroupItem v-for="action in group\.actions"/)
})

test('Long fixed action lists use grouped direct selection instead of dropdowns', async () => {
  const page = await source('src/views/servers/EntityTools.vue')

  assert.match(page, /class="target-toolbar"/)
  assert.match(page, /<header[^>]*class="game-tools-header"[^>]*>[\s\S]*class="target-toolbar"[\s\S]*size="icon-sm"/)
  assert.match(page, /<SelectTrigger size="sm" class="w-full">/)
  assert.doesNotMatch(page, /class="target-card"|class="game-tools-layout"/)
  assert.match(page, /data-operation-picker="player"/)
  assert.match(page, /data-operation-picker="world"/)
  assert.match(page, /PLAYER_OPERATION_GROUPS/)
  assert.match(page, /WORLD_OPERATION_GROUPS/)
  assert.match(page, /PLAYER_ABILITY_GROUPS/)
  assert.match(page, /WORLD_EVENT_GROUPS/)
  assert.match(page, /SPECIAL_EVENT_GROUPS/)
  assert.match(page, /CHARACTER_POWER_GROUPS/)
  assert.match(page, /class="operation-workbench"/)
  assert.match(page, /class="operation-category-tabs operation-category-tabs--player"/)
  assert.match(page, /class="operation-category-tabs operation-category-tabs--world"/)
  assert.match(page, /player-operation-editor-title/)
  assert.match(page, /world-operation-editor-title/)
  assert.match(page, /<Check v-if="playerOperation === operation\.id" class="action-choice-state"/)
  assert.match(page, /<Check v-if="worldOperation === operation\.id" class="action-choice-state"/)
  assert.match(page, /revealOperationEditor\(playerOperationEditor\)/)
  assert.match(page, /scrollIntoView/)
  assert.match(page, /\.operation-workbench--player \{[^}]*grid-template-columns: minmax\(15rem, 17rem\) auto minmax\(0, 1fr\)/)
  assert.doesNotMatch(page, /\.operation-content \{ min-height: 27rem; \}/)

  for (const model of ['playerOperation', 'worldOperation', 'entityAction', 'playerAbility', 'characterPowerAction', 'worldEvent', 'specialEvent', 'incident']) {
    assert.doesNotMatch(page, new RegExp(`<UiSelect v-model="${model}"`), model)
  }
})

test('Workbench action labels wrap without crossing the editor columns', async () => {
  const page = await source('src/views/servers/EntityTools.vue')

  assert.match(page, /\.operation-editor \.action-picker-groups \{ grid-template-columns: minmax\(0, 1fr\)/)
  assert.match(page, /\.operation-editor \.action-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(page, /\.operation-editor \.action-grid > :deep\(\[data-slot='toggle-group-item'\]:only-child\) \{ grid-column: 1 \/ -1;/)
  assert.match(page, /\.action-choice \{[^}]*overflow: hidden;[^}]*overflow-wrap: anywhere;/)
  assert.match(page, /\.action-choice > span \{[^}]*white-space: normal;[^}]*overflow-wrap: anywhere;/)
  assert.match(page, /class="action-choice h-auto whitespace-normal"><span>\{\{ t\(`entityTools\.worldEvents\./)
  assert.match(page, /class="simple-footer" :class="\{ 'simple-footer--locked': lockedTarget \}">\s*<div v-if="!lockedTarget" class="target-summary">/)
  assert.match(page, /class="operation-editor-actions">[\s\S]*class="player-submit-button"[\s\S]*@click="submitPlayerOperation"/)
  assert.match(page, /\.game-tools-page--embedded \.player-operation-card \{[^}]*border: 0;[^}]*box-shadow: none;/)
  assert.doesNotMatch(page, /playerOperation === operation\.id[\s\S]{0,120}<ChevronRight/)
})

test('Player operation switching keeps the desktop workbench geometry stable', async () => {
  const page = await source('src/views/servers/EntityTools.vue')

  assert.match(page, /\.operation-workbench--player \{ block-size: clamp\(20rem, 42dvh, 23rem\);/)
  assert.match(page, /\.player-operation-editor \{ block-size: 100%; overflow: hidden; \}/)
  assert.match(page, /\.player-operation-editor \.operation-editor-fields \{[^}]*flex: 1 1 auto;[^}]*overflow-y: auto;[^}]*scrollbar-gutter: stable;/)
  assert.match(page, /\.operation-editor-actions \{[^}]*flex: none;/)
  assert.match(page, /async function resetPlayerOperationEditorScroll\(\)[\s\S]*querySelector\('\.operation-editor-fields'\)[\s\S]*fields\.scrollTop = 0/)
  assert.match(page, /async function selectPlayerOperation\(value\)[\s\S]*await resetPlayerOperationEditorScroll\(\)[\s\S]*revealOperationEditor\(playerOperationEditor\)/)
  assert.match(page, /@container \(max-width: 52rem\) \{[\s\S]*\.operation-workbench--player \{ block-size: auto;/)
})

test('Player controls use balanced widths and reliable pointer targets', async () => {
  const page = await source('src/views/servers/EntityTools.vue')

  assert.match(page, /\.operation-workbench--player \{[^}]*grid-template-columns: minmax\(15rem, 17rem\) auto minmax\(0, 1fr\);/)
  assert.match(page, /class="action-grid player-action-grid"/)
  assert.match(page, /class="action-choice player-action-choice h-auto whitespace-normal"/)
  assert.match(page, /\.operation-workbench--player > \.action-picker :deep\(\.player-action-grid\) \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[^}]*gap: \.5rem;/)
  assert.match(page, /\.operation-workbench--player > \.action-picker :deep\(\.player-action-choice\) \{ display: grid;[^}]*min-height: 4rem;[^}]*grid-template-columns: 1\.125rem minmax\(0, 1fr\) 1\.125rem;[^}]*padding: \.75rem;[^}]*touch-action: manipulation;/)
  assert.match(page, /\.operation-category-tabs--player :deep\(button\) \{ min-height: 2\.75rem;[^}]*touch-action: manipulation;/)
  assert.doesNotMatch(page, /\.player-operation-editor :deep\(\[data-slot='toggle-group-item'\]\)/)
  assert.match(page, /\.player-submit-button \{[^}]*min-height: 2\.75rem;/)
})

test('Player rows retain the locked game workbench inside the action panel', async () => {
  const [menu, dialog, page] = await Promise.all([
    source('src/components/players/PlayerActionMenu.vue'),
    source('src/components/game-tools/GameToolsDialog.vue'),
    source('src/views/servers/EntityTools.vue')
  ])

  assert.match(menu, /<DialogContent/)
  assert.match(menu, /:aria-label="t\('players\.actions\.openWorkbench'\)"/)
  assert.match(menu, /@click="openWorkbench\(\)"/)
  assert.match(menu, /<GameToolsDialog[\s\S]*v-model:open="workbenchOpen"/)
  assert.match(menu, /:room-id="activePlayer\.room_id \|\| activePlayer\.roomId \|\| ''"/)
  assert.match(menu, /:world-id="activePlayer\.world_id \|\| activePlayer\.worldId \|\| ''"/)
  assert.match(menu, /:player-id="activePlayer\.user_id \|\| activePlayer\.id \|\| ''"/)
  assert.match(menu, /defaultWorkbenchSection = computed\(\(\) => canUseLiveActions\.value \? 'player' : 'world'\)/)
  assert.match(menu, /openWorkbench\(props\.requestedWorkbenchSection \|\| 'player'\)/)
  assert.match(menu, /@player-state-refreshed="emit\('player-state-refreshed', \$event\)"/)
  assert.match(menu, /@world-state-refreshed="emit\('world-state-refreshed', \$event\)"/)

  assert.match(dialog, /defineAsyncComponent\(\(\) => import\('@\/views\/servers\/EntityTools\.vue'\)\)/)
  assert.match(dialog, /<EntityTools[\s\S]*embedded[\s\S]*locked-target/)
  assert.match(dialog, /:initial-room-id="roomId"/)
  assert.match(dialog, /:initial-world-id="worldId"/)
  assert.match(dialog, /:initial-player-id="playerId"/)
  assert.match(dialog, /@player-state-refreshed="emit\('player-state-refreshed', \$event\)"/)
  assert.match(dialog, /@world-state-refreshed="emit\('world-state-refreshed', \$event\)"/)
  assert.match(page, /<header v-if="!embedded" class="game-tools-header">/)
  assert.match(page, /embedded && currentPlayer && !currentPlayerIsOnline/)
  assert.match(page, /refreshPlayerState: true/)
  assert.match(page, /playerApi\.updatePlayerInfo\(\{[\s\S]*?archive_name: room\.name,[\s\S]*?world_name: world\.name/)
  assert.match(page, /emit\('player-state-refreshed'/)
})

test('World tools remain available independently of an offline player target', async () => {
  const page = await source('src/views/servers/EntityTools.vue')

  assert.match(page, /const canExecuteWorld = computed\(\(\) => \{\s*if \(!currentRoom\.value \|\| !currentWorld\.value \|\| executing\.value\) return false/)
  assert.match(page, /<TabsTrigger value="world">/)
  for (const command of ['skip_days', 'next_phase', 'set_season', 'set_precipitation']) {
    assert.match(page, new RegExp(`['"]${command}['"]`), command)
  }
})

test('Built-in entities ship local artwork and retain a broken-image fallback', async () => {
  const page = await source('src/views/servers/EntityTools.vue')
  const images = await Promise.all([
    source('public/static/entities/cutgrass.webp'),
    source('public/static/entities/beefalo.webp'),
    source('public/static/entities/deerclops.webp'),
    source('public/static/entities/axe.webp'),
    source('public/static/entities/beequeen.webp'),
    source('public/static/entities/researchlab4.webp')
  ])
  const artworkFiles = await readdir(new URL('../public/static/entities/', import.meta.url))

  assert.match(page, /entity\?\.common[\s\S]*?\/static\/entities\/\$\{entity\.id\}\.webp/)
  assert.match(page, /brokenArtworkUrls/)
  assert.match(page, /loading="lazy" @error="markBrokenArtwork"/)
  assert.match(page, /<ScrollArea v-else-if="entities\.length > 0" class="entity-results-scroll">/)
  assert.match(page, /limit: 120/)
  assert.match(page, /error\?\.code !== 'INVALID_ENTITY_SEARCH'[\s\S]*?limit: 20/)
  assert.match(page, /grid-template-columns: repeat\(auto-fill, minmax\(17rem, 1fr\)\)/)
  assert.match(page, /min-height: 3\.5rem; grid-template-columns: 2\.75rem minmax\(0, 1fr\) auto/)
  assert.match(page, /inline-size: 2\.75rem; block-size: 2\.75rem/)
  assert.match(page, /height: clamp\(18rem, calc\(100dvh - 40rem\), 24rem\)/)
  assert.match(page, /class="selected-entity-artwork"/)
  assert.match(page, /entityTools\.catalog\.clearSearch/)
  assert.ok(images.every(image => image.length > 100))
  assert.ok(artworkFiles.filter(file => file.endsWith('.webp')).length >= 120)
})

test('Only dangerous operations require an in-place second click', async () => {
  const page = await source('src/views/servers/EntityTools.vue')

  assert.doesNotMatch(page, /<Dialog\s|confirmOpen|pendingOperation|openConfirmation/)
  assert.match(page, /ENTITY_CONFIRMATION_MODES = new Set\(\['spawn', 'remove', 'act'\]\)/)
  assert.match(page, /PLAYER_CONFIRMATION_OPERATIONS = new Set\(\['clear_player_inventory', 'toggle_player_ghost'\]\)/)
  assert.match(page, /WORLD_CONFIRMATION_OPERATIONS = new Set\(\['skip_days', 'trigger_world_event', 'trigger_incident'\]\)/)
  assert.match(page, /CONFIRMATION_WINDOW_MS = 8000/)
  assert.match(page, /confirmationRequired && !isConfirmationArmed\(section, operation\)[\s\S]*pendingConfirmation\.value = \{ section, key: operationKey\(operation\) \}/)
  assert.match(page, /entityConfirmationArmed \? 'destructive' : 'default'/)
  assert.match(page, /playerConfirmationArmed \? 'destructive' : 'default'/)
  assert.match(page, /worldConfirmationArmed \? 'destructive' : 'default'/)
  assert.equal((page.match(/entityTools\.actions\.clickAgainToConfirm/g) || []).length, 3)
  assert.match(page, /const executionError = ref\(''\)/)
  assert.match(page, /executionError\.value = t\('entityTools\.feedback\.executeFailed'/)
  assert.match(page, /<Alert v-if="executionError" variant="destructive" role="alert">/)
  assert.match(page, /entityTools\.actions\.giveNow/)
  assert.match(page, /operation\.commandId,[\s\S]*operation\.arguments,[\s\S]*room\.name/)
  assert.doesNotMatch(page, /promptText|inputValidator|confirmationInput|raw-commands/)
  assert.match(page, /refreshWorldState:\s*true/)
  assert.match(page, /worldStatesV2API\.refreshWorld\(room\.id, world\.id\)/)
  assert.match(page, /emit\('world-state-refreshed', refreshed\.snapshot\)/)
})

test('Routine player operations execute directly while destructive player operations require a second click', async () => {
  const [page, messages] = await Promise.all([
    source('src/views/servers/EntityTools.vue'),
    source('src/i18n/entityMessages.js')
  ])

  assert.match(page, /PLAYER_CONFIRMATION_OPERATIONS = new Set\(\['clear_player_inventory', 'toggle_player_ghost'\]\)/)
  assert.match(page, /async function submitPlayerOperation\(\)[\s\S]*submitOperation\('player', operation, PLAYER_CONFIRMATION_OPERATIONS\.has\(playerOperation\.value\)\)/)
  assert.match(messages, /executePlayerOperation: '执行\{operation\}'/)
  assert.match(messages, /executePlayerOperation: 'Run \{operation\}'/)
})

test('Existing player God and creative APIs are reused without reopening console abilities', async () => {
  const page = await source('src/views/servers/EntityTools.vue')

  assert.match(page, /PLAYER_API_ABILITIES = new Set\(\['god_mode', 'creative_mode'\]\)/)
  assert.match(page, /playerApi\.setGodMode\(player, operation\.arguments\.enabled, null\)/)
  assert.match(page, /playerApi\.setCreativeMode\(player, operation\.arguments\.enabled, null\)/)
  assert.match(page, /operation\.playerApiAbility[\s\S]*?else \{[\s\S]*?commandApi\.executeCommand/)
})

test('TMIR player parameters include percentage locks, naughtiness, recipes, and custom beefalo', async () => {
  const page = await source('src/views/servers/EntityTools.vue')

  for (const fragment of [
    "value_mode: playerLockResource.value === 'health' ? playerLockValueMode.value : 'absolute'",
    "mode: naughtinessMode.value",
    "argumentsMap.recipe_mode = recipeUnlockMode.value",
    "multiplier: Number(playerAttackMultiplier.value)",
    "beefaloTendency.value === 'custom'",
    'shadow_beef_bell',
    'wathgrithr'
  ]) {
    assert.match(page, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), fragment)
  }
  for (const action of ['wormwood_bloom_progress_start', 'wormwood_bloom_grow', 'merm_king_trident', 'merm_king_crown', 'merm_king_shoulder']) {
    assert.match(page, new RegExp(`['"]${action}['"]`), action)
  }
})

test('Player and world numeric controls match backend bounds', async () => {
  const page = await source('src/views/servers/EntityTools.vue')

  assert.match(page, /validNumber\(playerStatValue\.value, playerStat\.value === 'temperature' \? -20 : 0, playerStat\.value === 'temperature' \? 90 : 100\)/)
  assert.match(page, /validNumber\(playerSpeed\.value, -2, 100\)/)
  assert.match(page, /validNumber\(playerAttackMultiplier\.value, 0, 99999\)/)
  assert.match(page, /validNumber\(skipDays\.value, 1, 200, true\)/)
  assert.match(page, /validNumber\(timeScale\.value, 0, 20\)/)
  assert.match(page, /validNumber\(worldWetness\.value, 0, 100\)/)
  assert.match(page, /validNumber\(worldTemperature\.value, -25, 95\)/)
  assert.match(page, /Number\(daySegments\.value\) \+ Number\(duskSegments\.value\) \+ Number\(nightSegments\.value\) === 16/)
})

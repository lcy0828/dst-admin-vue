import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  normalizePlayerCharacterPrefab,
  PLAYER_CHARACTER_IDS
} from '../src/i18n/playerMessages.js'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('every official player character has a bundled WebP avatar', async () => {
  const avatars = await Promise.all(PLAYER_CHARACTER_IDS.map(async character => {
    const image = await readFile(new URL(`../public/static/characters/${character}.webp`, import.meta.url))
    return { character, image }
  }))

  assert.equal(avatars.length, PLAYER_CHARACTER_IDS.length)
  for (const { character, image } of avatars) {
    assert.equal(image.subarray(0, 4).toString('ascii'), 'RIFF', character)
    assert.equal(image.subarray(8, 12).toString('ascii'), 'WEBP', character)
  }
})

test('character avatars normalize aliases and base characters while preserving mod fallbacks', () => {
  assert.equal(normalizePlayerCharacterPrefab('maxwell'), 'waxwell')
  assert.equal(normalizePlayerCharacterPrefab('wigfrid'), 'wathgrithr')
  assert.equal(normalizePlayerCharacterPrefab('wilson_formal'), 'wilson')
  assert.equal(normalizePlayerCharacterPrefab('WENDY'), 'wendy')
  assert.equal(normalizePlayerCharacterPrefab('custom_mod_character'), '')
})

test('every official character has a small animated portrait with multiple actual frames', async () => {
  const root = new URL('../public/static/characters/animated/', import.meta.url)
  const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'))
  assert.deepEqual(Object.keys(manifest.characters).sort(), [...PLAYER_CHARACTER_IDS].sort())
  for (const character of PLAYER_CHARACTER_IDS) {
    const bytes = await readFile(new URL(`${character}.webp`, root))
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', character)
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', character)
    let frames = 0
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const size = bytes.readUInt32LE(offset + 4)
      assert.ok(offset + 8 + size <= bytes.length, `${character}: truncated chunk`)
      if (bytes.subarray(offset, offset + 4).toString() === 'ANMF') frames++
      offset += 8 + size + (size % 2)
    }
    assert.ok(frames > 1, `${character}: the portrait must actually be animated`)
    assert.ok(bytes.length < 64 * 1024, `${character}: keep the avatar lightweight`)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.characters[character].sha256)
  }
})

test('workspace player rows expose local actions without leaving the dashboard', async () => {
  const [avatar, workspace, playerList] = await Promise.all([
    source('src/components/players/CharacterAvatar.vue'),
    source('src/views/servers/ServerWorkspace.vue'),
    source('src/views/players/PlayerList.vue')
  ])

  assert.match(avatar, /<AvatarImage v-if="source"/)
  assert.match(avatar, /<AvatarFallback/)
  assert.doesNotMatch(avatar, /delay-ms/)
  assert.match(avatar, /assetBaseUrl\}\$\{characterId\.value\}\.webp/)

  assert.match(workspace, /v-for="row in recentPlayerRows"[\s\S]*?<CharacterAvatar/)
  assert.match(workspace, /class="player-avatar-action"[\s\S]*?@click="handlePlayerAvatarAction\(row\.player\)"/)
  assert.match(workspace, /v-else-if="playerIsGhost\(row\.player\)"[\s\S]*?<HeartPulse/)
  assert.match(workspace, /<PlayerVitalQuickControl[\s\S]*?@execute="executePlayerVitalAction\(row\.player, \$event\)"/)
  assert.match(workspace, /<PlayerActionMenu[\s\S]*?:player="row\.player"[\s\S]*?@updated="refreshPlayerAfterAction\(row\.player, \$event\)"/)
  assert.match(workspace, /playerWorkbenchTargetId === row\.player\.user_id \? playerWorkbenchRequest : 0/)
  assert.match(workspace, /normalizePlayerGameplayState\(player\?\.gameplay_state\) === 'ghost'/)
  assert.match(workspace, /playerApi\.resurrectPlayer\(player, null, player\.user_id\)/)
  assert.match(workspace, /playerApi\.updatePlayerInfo\(\{[\s\S]*?archive_name: room\.name,[\s\S]*?world_name: world\.name/)
  assert.match(workspace, /await this\.reloadPlayerStats\(\{ preserveExisting: true, collected: true \}\)/)
  assert.doesNotMatch(workspace, /PlayerActionSheet|playerActionOpen|openPlayer\(player\)/)

  assert.match(playerList, /<CharacterAvatar :prefab="player\.prefab"/)
  assert.match(playerList, /<CharacterAvatar :prefab="currentPlayer\.prefab"/)
  assert.match(playerList, /keyword: this\.\$route\.query\.playerId \|\| ''/)
  assert.match(playerList, /this\.openRequestedPlayer\(\)/)
  assert.match(playerList, /item\.user_id === playerId && \(!roomId \|\| item\.room_id === roomId\)/)
  assert.match(playerList, /<PlayerActionMenu :player="player"/)
  assert.match(playerList, /<PlayerActionMenu :player="currentPlayer"/)
})

test('local player menu confirms destructive actions and resurrects directly', async () => {
  const actions = await source('src/components/players/PlayerActionMenu.vue')

  assert.match(actions, /<DialogTrigger as-child>/)
  assert.match(actions, /players\.quick\.trigger/)
  assert.match(actions, /playerApi\.kickPlayer\(activePlayer\.value, null, confirmation\)/)
  assert.match(actions, /playerApi\.banPlayer\(activePlayer\.value/)
  assert.match(actions, /playerApi\.killPlayer\(activePlayer\.value, null, confirmation\)/)
  assert.match(actions, /playerApi\.resurrectPlayer\(activePlayer\.value, null, activePlayer\.value\.user_id\)/)
  assert.match(actions, /playerApi\.changeCharacter\(activePlayer\.value, null, confirmation\)/)
  assert.match(actions, /playerApi\.setGodMode\(activePlayer\.value, modeEnabled\.value, null\)/)
  assert.match(actions, /playerApi\.setCreativeMode\(activePlayer\.value, modeEnabled\.value, null\)/)
  assert.match(actions, /v-else-if="confirmingAction"[^>]*@submit\.prevent="runConfirmedAction\(quickAction\)"/)
  assert.doesNotMatch(actions, /resurrect:[\s\S]*?title: 'players\.confirmations\.resurrectTitle'/)
  assert.match(actions, /const confirmation = activePlayer\.value\.user_id/)
  assert.match(actions, /confirmation:\s*activePlayer\.value\.archive_name/)
  assert.doesNotMatch(actions, /inputValidator|banForm\.confirmation|ban-confirmation/)
  assert.match(actions, /<UiButton[^>]*@click="openBanDialog"/)
  assert.match(actions, /type="submit" variant="destructive"[^>]*>[\s\S]*?players\.actions\.confirmBan/)
  assert.doesNotMatch(actions, /<Sheet|player-operation-sheet/)
})

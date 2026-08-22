import assert from 'node:assert/strict'
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

test('workspace player rows open local actions without leaving the dashboard', async () => {
  const [avatar, workspace, playerList] = await Promise.all([
    source('src/components/players/CharacterAvatar.vue'),
    source('src/views/servers/ServerWorkspace.vue'),
    source('src/views/players/PlayerList.vue')
  ])

  assert.match(avatar, /<AvatarImage v-if="source"/)
  assert.match(avatar, /<AvatarFallback/)
  assert.match(avatar, /assetBaseUrl\}\$\{characterId\.value\}\.webp/)

  assert.match(workspace, /v-for="player in recentPlayers"[\s\S]*?<CharacterAvatar/)
  assert.match(workspace, /@click="openPlayer\(player\)"/)
  assert.match(workspace, /<PlayerActionSheet[\s\S]*?v-model:open="playerActionOpen"/)
  assert.match(workspace, /this\.selectedPlayer = \{ \.\.\.player \}/)
  assert.match(workspace, /this\.playerActionOpen = true/)
  assert.doesNotMatch(workspace, /openPlayer\(player\) \{[\s\S]*?path: '\/players\/list'/)

  assert.match(playerList, /<CharacterAvatar :prefab="player\.prefab"/)
  assert.match(playerList, /<CharacterAvatar :prefab="currentPlayer\.prefab"/)
  assert.match(playerList, /keyword: this\.\$route\.query\.playerId \|\| ''/)
  assert.match(playerList, /this\.openRequestedPlayer\(\)/)
  assert.match(playerList, /item\.user_id === playerId && \(!roomId \|\| item\.room_id === roomId\)/)
  assert.match(playerList, /players\.operations\.godMode/)
  assert.match(playerList, /players\.operations\.kick/)
  assert.match(playerList, /players\.operations\.ban/)
})

test('local player actions preserve every existing management operation and confirmation', async () => {
  const actions = await source('src/components/players/PlayerActionSheet.vue')

  assert.match(actions, /<SheetTitle>\{\{ t\('players\.detail\.title'\) \}\}<\/SheetTitle>/)
  assert.match(actions, /playerApi\.getPlayerDetail\(props\.player\)/)
  assert.match(actions, /playerApi\.kickPlayer\(activePlayer\.value, null, confirmation\)/)
  assert.match(actions, /playerApi\.banPlayer\(activePlayer\.value/)
  assert.match(actions, /playerApi\.killPlayer\(activePlayer\.value, null, confirmation\)/)
  assert.match(actions, /playerApi\.resurrectPlayer\(activePlayer\.value, null, confirmation\)/)
  assert.match(actions, /playerApi\.changeCharacter\(activePlayer\.value, null, confirmation\)/)
  assert.match(actions, /playerApi\.setGodMode\(activePlayer\.value, modeEnabled\.value, null\)/)
  assert.match(actions, /playerApi\.setCreativeMode\(activePlayer\.value, modeEnabled\.value, null\)/)
  assert.match(actions, /inputValidator: value => value === activePlayer\.value\.user_id/)
  assert.match(actions, /banForm\.confirmation !== activePlayer\.value\?\.archive_name/)
  assert.match(actions, /<SheetTitle>\{\{ playerName \}\}<\/SheetTitle>/)
  assert.match(actions, /<DropdownMenuItem variant="destructive" @select="openBanDialog">/)
  assert.doesNotMatch(actions, /player-danger-grid/)
})

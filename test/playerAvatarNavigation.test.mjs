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

test('workspace player rows open the exact actionable player details', async () => {
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
  assert.match(workspace, /playerId: player\.user_id/)
  assert.match(workspace, /roomId: player\.room_id \|\| this\.selectedRoomId/)

  assert.match(playerList, /<CharacterAvatar :prefab="player\.prefab"/)
  assert.match(playerList, /<CharacterAvatar :prefab="currentPlayer\.prefab"/)
  assert.match(playerList, /keyword: this\.\$route\.query\.playerId \|\| ''/)
  assert.match(playerList, /this\.openRequestedPlayer\(\)/)
  assert.match(playerList, /item\.user_id === playerId && \(!roomId \|\| item\.room_id === roomId\)/)
  assert.match(playerList, /players\.operations\.godMode/)
  assert.match(playerList, /players\.operations\.kick/)
  assert.match(playerList, /players\.operations\.ban/)
})

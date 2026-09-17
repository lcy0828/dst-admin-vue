import assert from 'node:assert/strict'
import test from 'node:test'
import { playerCanUseCharacterActions, playerQuickCommands } from '../src/lib/playerQuickActions.mjs'

test('character shortcuts remain unavailable while offline, ghosted, migrating or presence is conflicted', () => {
  const player = { status: 'online', gameplay_state: 'alive' }
  assert.equal(playerCanUseCharacterActions(player), true)
  for (const status of ['stale', 'offline']) assert.equal(playerCanUseCharacterActions({ ...player, status }), false)
  for (const gameplay_state of ['ghost', 'dead', 'loading', 'selecting_character', 'migrating']) {
    assert.equal(playerCanUseCharacterActions({ ...player, gameplay_state }), false)
  }
  assert.equal(playerCanUseCharacterActions({ ...player, presence_conflict: true }), false)
})

test('restore vitals only restores health, hunger and sanity to their percentages', () => {
  const commands = playerQuickCommands('recover', 'KU_SELF')
  assert.deepEqual(commands.map(item => item.arguments), ['health', 'hunger', 'sanity'].map(stat => ({ player_id: 'KU_SELF', stat, value: 100 })))
  assert.ok(commands.every(item => item.commandId === 'set_player_stat'))
})

test('quick speed accepts the normal multiplier and rejects unbounded input', () => {
  assert.equal(playerQuickCommands('speed', 'KU_SELF', { multiplier: 1 })[0].arguments.multiplier, 1)
  for (const multiplier of [-1, 0, 10, Infinity, NaN, 'oops']) assert.deepEqual(playerQuickCommands('speed', 'KU_SELF', { multiplier }), [])
})

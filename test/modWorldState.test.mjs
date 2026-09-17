import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  composeModConfigurationPatch,
  composeModWorldConfigured,
  composeModWorldEnabled,
  sameModConfigurationOverrides
} from '../src/lib/modWorldState.mjs'

test('room Mod switches update one world without mutating the prior snapshot', () => {
  const original = {
    modid: '1392778117',
    enabled: true,
    enabledWorlds: ['Master']
  }

  const enabledInCaves = composeModWorldEnabled(original, 'Caves', true)
  assert.deepEqual(enabledInCaves.enabledWorlds, ['Caves', 'Master'])
  assert.equal(enabledInCaves.enabled, true)
  assert.deepEqual(original.enabledWorlds, ['Master'])

  const disabledInMaster = composeModWorldEnabled(enabledInCaves, 'Master', false)
  assert.deepEqual(disabledInMaster.enabledWorlds, ['Caves'])
  assert.equal(disabledInMaster.enabled, true)

  const disabledEverywhere = composeModWorldEnabled(disabledInMaster, 'Caves', false)
  assert.deepEqual(disabledEverywhere.enabledWorlds, [])
  assert.equal(disabledEverywhere.enabled, false)
})

test('room Mod switches use optimistic state with failure rollback and no full list reload', async () => {
  const source = await readFile(new URL('../src/views/mods/ModList.vue', import.meta.url), 'utf8')
  const start = source.indexOf('    async toggleModStatus(mod, world, status) {')
  const end = source.indexOf('    openCopyDialog(mod, sourceWorld) {', start)
  const method = source.slice(start, end)
  const optimisticUpdate = method.indexOf('this.applyModWorldEnabled(mod.modid, roomId, worldId, status)')
  const request = method.indexOf('await modApi.toggleMod')

  assert.ok(optimisticUpdate >= 0 && optimisticUpdate < request)
  assert.match(method, /this\.applyModWorldEnabled\(mod\.modid, roomId, worldId, previousStatus\)/)
  assert.doesNotMatch(method, /fetchModsList/)
})

test('room Mod additions update one configured world without mutating the prior snapshot', () => {
  const original = {
    modid: '1392778117',
    configured: true,
    enabled: true,
    configuredWorlds: ['Master'],
    enabledWorlds: ['Master']
  }

  const added = composeModWorldConfigured(original, 'Caves', true, true)
  assert.deepEqual(added.configuredWorlds, ['Caves', 'Master'])
  assert.deepEqual(added.enabledWorlds, ['Caves', 'Master'])
  assert.deepEqual(original.configuredWorlds, ['Master'])

  const removed = composeModWorldConfigured(added, 'Master', false)
  assert.deepEqual(removed.configuredWorlds, ['Caves'])
  assert.deepEqual(removed.enabledWorlds, ['Caves'])
})

test('configuration copy replaces target overrides and clears target-only values', () => {
  const source = { difficulty: 'hard', keep_inventory: true }
  const target = { difficulty: 'easy', old_option: 3 }

  assert.deepEqual(composeModConfigurationPatch(source, target), {
    old_option: null,
    difficulty: 'hard',
    keep_inventory: true
  })
  assert.equal(sameModConfigurationOverrides(source, target), false)
  assert.equal(sameModConfigurationOverrides(source, { keep_inventory: true, difficulty: 'hard' }), true)
})

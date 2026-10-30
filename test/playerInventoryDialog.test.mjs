import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { computed, ref, shallowRef } from 'vue'
import { filterInventoryTree, localizeInventoryItems } from '../src/lib/playerInventory.mjs'

const source = await readFile(new URL('../src/components/players/PlayerInventoryDialog.vue', import.meta.url), 'utf8')
const script = source.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')

function dialog(inventory) {
  return runInNewContext(`${script}; ({ load, selectCandidate, data, error, source, candidates, sections, names })`, {
    computed, ref, shallowRef, filterInventoryTree, localizeInventoryItems, AbortController,
    defineProps: () => ({ open: true, player: { roomId: 'room', id: 'KU_TEST' }, rooms: [] }),
    defineEmits: () => () => {},
    useI18n: () => ({ t: key => key, te: () => true, locale: ref('zh-CN') }),
    useId: () => 'inventory-test',
    playersV2API: { inventory },
    loadInventoryNames: async () => new Map(),
    formatSystemDateTime: value => value,
    watch: () => {}, onBeforeUnmount: () => {}
  })
}

const saved = { source: 'save', worldId: 'caves', capturedAt: '2026-09-01T10:00:00Z', inventory: [{ prefab: 'cane', name: 'cane', nameSource: 'prefab' }] }

test('an ambiguous refresh clears the old inventory while awaiting a source choice', async () => {
  let calls = 0
  const candidates = [{ worldId: 'master', sourceId: 'a' }, { worldId: 'caves', sourceId: 'b' }]
  const view = dialog(async () => {
    if (++calls === 1) return saved
    throw { code: 'SOURCE_AMBIGUOUS', details: { candidates } }
  })
  await view.load()
  assert.equal(view.data.value.capturedAt, saved.capturedAt)
  await view.load(true)
  assert.equal(view.data.value, null)
  assert.equal(view.error.value.code, 'SOURCE_AMBIGUOUS')
  assert.equal(view.candidates.value.length, 2)
})

test('a failed refresh retains the original timestamp and items, without inventing an empty bag', async () => {
  let calls = 0
  const view = dialog(async () => {
    if (++calls === 1) return saved
    throw { code: 'INVENTORY_TIMEOUT' }
  })
  await view.load()
  await view.load(true)
  assert.equal(view.data.value.capturedAt, saved.capturedAt)
  assert.equal(view.data.value.inventory[0].prefab, 'cane')
  assert.equal(view.error.value.code, 'INVENTORY_TIMEOUT')
  assert.match(source, /<Badge v-if="error \|\| loading"[^>]*>\{\{ t\('inventory.previousResult'\) \}\}/)
})

test('late results cannot replace the result from a later inventory request', async () => {
  let resolveFirst
  let calls = 0
  const view = dialog(() => ++calls === 1 ? new Promise(resolve => { resolveFirst = resolve }) : Promise.resolve({ ...saved, worldId: 'master' }))
  const first = view.load()
  await view.load(true)
  resolveFirst(saved)
  await first
  assert.equal(view.data.value.worldId, 'master')
  assert.equal(view.error.value, null)
})

test('localized dialog sections can find Chinese names while preserving the raw snapshot', async () => {
  const view = dialog(async () => saved)
  view.names.value = new Map([['cane', { zh: '步行手杖', en: 'Walking Cane' }]])
  await view.load()
  assert.equal(view.sections.value.find(section => section.id === 'items').items[0].displayName, '步行手杖')
  assert.equal(view.data.value.inventory[0].name, 'cane')
})

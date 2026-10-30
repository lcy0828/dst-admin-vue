import test from 'node:test'
import assert from 'node:assert/strict'
import { filterInventoryTree, inventoryMetricText, inventoryNameIndex, localizeInventoryItems } from '../src/lib/playerInventory.mjs'

test('inventory search preserves container ancestry without changing original data', () => {
  const tree = [{ nodeId: 'bag', prefab: 'backpack', name: '背包', contents: [
    { nodeId: 'axe', prefab: 'axe', name: '斧头', contents: [] },
    { nodeId: 'twig', prefab: 'twigs', name: '树枝', contents: [] }
  ] }]
  assert.deepEqual(filterInventoryTree(tree, '斧头')[0].contents.map(item => item.prefab), ['axe'])
  assert.equal(tree[0].contents.length, 2)
  assert.equal(filterInventoryTree(tree, 'AXE')[0].nodeId, 'bag')
  assert.equal(filterInventoryTree(tree, 'not-an-item').length, 0)
  assert.equal(filterInventoryTree(tree, 'backpack')[0].contents.length, 2)
})

test('unknown metrics stay unknown while zero values remain visible', () => {
  assert.equal(inventoryMetricText({ value: null, ratio: null }), '')
  assert.equal(inventoryMetricText({ value: 0, ratio: 0 }), '0%')
  assert.equal(inventoryMetricText({ value: 10, maximum: null, ratio: null }), '10')
  assert.equal(inventoryMetricText({ value: 25, maximum: 100, ratio: 0.25 }), '25%')
})

test('saved inventories use catalog names and support Chinese search inside containers', () => {
  const names = inventoryNameIndex([
    { id: 'backpack', nameZhCN: '背包', nameEn: 'Backpack' },
    { id: 'cane', nameZhCN: '步行手杖', nameEn: 'Walking Cane' }
  ])
  const original = [{ prefab: 'backpack', name: 'backpack', nameSource: 'prefab', contents: [
    { prefab: 'cane', name: 'cane', nameSource: 'prefab', contents: [] }
  ] }]
  const localized = localizeInventoryItems(original, names, 'zh-CN')
  assert.equal(localized[0].displayName, '背包')
  assert.equal(localized[0].contents[0].displayName, '步行手杖')
  assert.equal(filterInventoryTree(localized, '手杖')[0].contents[0].prefab, 'cane')
  assert.equal(filterInventoryTree(localized, 'walking cane')[0].contents[0].prefab, 'cane')
  assert.equal(localizeInventoryItems(original, names, 'en-US')[0].contents[0].displayName, 'Walking Cane')
  assert.equal(original[0].contents[0].name, 'cane')
  assert.equal(original[0].displayName, undefined)
})

test('catalog fallback preserves custom names, unknown prefabs, and Mod overrides', () => {
  const names = inventoryNameIndex([{ id: 'cane', nameZhCN: '步行手杖' }, { id: 'mod_item', modId: '123', nameZhCN: '模组物品' }])
  const items = localizeInventoryItems([
    { prefab: 'cane', name: '我的手杖', nameSource: 'saved_name' },
    { prefab: 'cane', name: 'My cane', nameSource: 'custom_name' },
    { prefab: 'cane', name: 'Overridden cane', modId: '123', nameSource: 'strings' },
    { prefab: 'cane', name: '模组发光手杖', nameSource: 'strings' },
    { prefab: 'mod_item', name: 'mod_item', nameSource: 'prefab' },
    { prefab: 'unknown', name: 'unknown', nameSource: 'prefab' }
  ], names, 'zh-CN')
  assert.deepEqual(items.map(item => item.displayName), ['我的手杖', 'My cane', 'Overridden cane', '模组发光手杖', 'mod_item', 'unknown'])
  assert.equal(localizeInventoryItems([{ prefab: 'cane', name: 'cane' }], null, 'zh-CN')[0].displayName, 'cane')
})

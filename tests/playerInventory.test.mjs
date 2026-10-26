import test from 'node:test'
import assert from 'node:assert/strict'
import { filterInventoryTree, inventoryMetricText } from '../src/lib/playerInventory.mjs'

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

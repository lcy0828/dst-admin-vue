import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  DST_DEFAULT_MAP_ROTATION,
  DST_MAP_ROTATION_STEP,
  WORLD_MAP_LAYERS,
  defaultFeatureCategories,
  formatMapBytes,
  mapIconPresentation,
  mapFeatureCounts,
  mapJobFailure,
  mapStageLabel,
  mapStatusMeta,
  normalizeMapRotation,
  normalizeFeatureCategories,
  searchMapFeatures
} from '../src/lib/worldMaps.mjs'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('map layers expose only the renderer v1 structured artifact order', () => {
  assert.deepEqual(WORLD_MAP_LAYERS.map(layer => layer.id), ['terrain', 'features', 'worldState'])
})

test('feature categories remain stable, searchable, and counted without dropping MOD prefabs', () => {
  const features = [
    { id: 'multiplayer_portal:1', prefab: 'multiplayer_portal', category: 'spawnPoint' },
    { id: 'myth_tree:1', prefab: 'myth_tree', category: 'resource' },
    { id: 'mod_unknown:1', prefab: 'mod_unknown', category: 'custom' }
  ]
  assert.deepEqual(defaultFeatureCategories(), ['spawnPoint', 'player', 'walrusCamp', 'landmark'])
  assert.deepEqual(normalizeFeatureCategories(['other', 'spawnPoint', 'other', 'bad']), ['spawnPoint', 'other'])
  assert.deepEqual(mapFeatureCounts(features), {
    spawnPoint: 1, player: 0, walrusCamp: 0, landmark: 0, resource: 1, other: 1
  })
  assert.deepEqual(searchMapFeatures(features, 'MYTH').map(item => item.id), ['myth_tree:1'])
  assert.deepEqual(searchMapFeatures(features, 'mod_unknown').map(item => item.id), ['mod_unknown:1'])
})

test('map presentation starts upright and reduces icon clutter', () => {
  assert.equal(DST_DEFAULT_MAP_ROTATION, 0)
  assert.equal(DST_MAP_ROTATION_STEP, Math.PI / 4)
  assert.equal(normalizeMapRotation(DST_DEFAULT_MAP_ROTATION + 2 * Math.PI), DST_DEFAULT_MAP_ROTATION)
  assert.equal(normalizeMapRotation(Number.NaN), DST_DEFAULT_MAP_ROTATION)
  assert.equal(normalizeMapRotation(5 * Math.PI / 4), -3 * Math.PI / 4)
  assert.deepEqual(mapIconPresentation('landmark', 1, false), { visible: true, size: 18 })
  assert.deepEqual(mapIconPresentation('spawnPoint', 1, false), { visible: true, size: 24 })
  assert.deepEqual(mapIconPresentation('resource', 2.9, false), { visible: false, size: 0 })
  assert.deepEqual(mapIconPresentation('resource', 4, false), { visible: true, size: 32 })
  assert.deepEqual(mapIconPresentation('other', 0, true), { visible: true, size: 38 })
})

test('map status and stage labels cover every backend state', () => {
  assert.deepEqual(mapStatusMeta('running'), { label: '生成中', variant: 'secondary' })
  assert.deepEqual(mapStatusMeta('succeeded'), { label: '可用', variant: 'default' })
  assert.deepEqual(mapStatusMeta('failed'), { label: '失败', variant: 'destructive' })
  assert.equal(mapStageLabel('validate'), '校验图片')
  assert.equal(mapStageLabel('snapshot'), '复制快照')
  assert.equal(mapStageLabel('interrupted'), '服务中断')
})

test('session sizes remain readable across bytes and larger files', () => {
  assert.equal(formatMapBytes(900), '900 B')
  assert.equal(formatMapBytes(2048), '2.00 KB')
  assert.equal(formatMapBytes(12 * 1024 * 1024), '12.0 MB')
  assert.equal(formatMapBytes(-1), '--')
})

test('map job failures preserve the target renderer error', () => {
  assert.equal(mapJobFailure({
    targets: [{ status: 'failed', error: { message: 'renderer exited with code 2' } }]
  }), 'renderer exited with code 2')
})

test('formal map route and page use the authenticated v2 map contract', async () => {
  const [api, router, navigation, page, canvas] = await Promise.all([
    source('src/api/v2.js'),
    source('src/router/index.js'),
    source('src/v2/navigation.js'),
    source('src/views/worlds/WorldMaps.vue'),
    source('src/components/worlds/DstMapCanvas.vue')
  ])

  assert.match(api, /\/rooms\/\$\{encode\(roomId\)\}\/maps\/actions\/generate/)
  assert.match(api, /\/worlds\/\$\{encode\(worldId\)\}\/sessions/)
  assert.match(router, /path:\s*'maps'[\s\S]+WorldMaps\.vue/)
  assert.match(navigation, /to:\s*'\/worlds\/maps'/)
  assert.match(page, /worldMapsV2API\.generate/)
  assert.match(api, /'X-DST-Runtime-Target': getActiveRuntimeTarget\(\)\.id/)
  assert.match(page, /worldMapsV2API\.manifest/)
  assert.match(page, /worldMapsV2API\.features/)
  assert.match(page, /worldMapsV2API\.imageBlob/)
  assert.match(page, /worldMapsV2API\.sessionBlob/)
  assert.doesNotMatch(page, /sessionDownloadURL|imageURL/)
  assert.doesNotMatch(page, /legacyManifest|legacyMap/)
  assert.doesNotMatch(page, /mock|demo|Math\.random/)
  assert.match(canvas, /rotateWithView:\s*true/)
  assert.match(canvas, /rotation:\s*DST_DEFAULT_MAP_ROTATION/)
  assert.match(canvas, /imageloadend[\s\S]+scheduleFit\(0\)/)
  assert.match(canvas, /ResizeObserver\(\(\)\s*=>\s*scheduleFit\(0\)\)/)
})

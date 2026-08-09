import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  formatMapBytes,
  mapJobFailure,
  mapStageLabel,
  mapStatusMeta,
  normalizeMapLayers
} from '../src/lib/worldMaps.mjs'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('map layers reject unknown values, remove duplicates, and keep terrain below overlays', () => {
  assert.deepEqual(normalizeMapLayers([
    'players',
    'terrain',
    'unknown',
    'spawnPoints',
    'terrain'
  ]), ['terrain', 'spawnPoints', 'players'])
})

test('map status and stage labels cover every backend state', () => {
  assert.deepEqual(mapStatusMeta('running'), { label: '生成中', variant: 'secondary' })
  assert.deepEqual(mapStatusMeta('succeeded'), { label: '可用', variant: 'default' })
  assert.deepEqual(mapStatusMeta('failed'), { label: '失败', variant: 'destructive' })
  assert.equal(mapStageLabel('validate'), '校验图片')
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
  const [api, router, navigation, page] = await Promise.all([
    source('src/api/v2.js'),
    source('src/router/index.js'),
    source('src/v2/navigation.js'),
    source('src/views/worlds/WorldMaps.vue')
  ])

  assert.match(api, /\/rooms\/\$\{encode\(roomId\)\}\/maps\/actions\/generate/)
  assert.match(api, /\/worlds\/\$\{encode\(worldId\)\}\/sessions/)
  assert.match(router, /path:\s*'maps'[\s\S]+WorldMaps\.vue/)
  assert.match(navigation, /to:\s*'\/worlds\/maps'/)
  assert.match(page, /worldMapsV2API\.generate/)
  assert.match(api, /'X-DST-Runtime-Target': getActiveRuntimeTarget\(\)\.id/)
  assert.match(page, /worldMapsV2API\.imageBlob/)
  assert.match(page, /worldMapsV2API\.sessionBlob/)
  assert.doesNotMatch(page, /sessionDownloadURL|imageURL/)
  assert.doesNotMatch(page, /mock|demo|Math\.random/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  formatWorldMapTime,
  worldMapDiagnosticError,
  worldMapErrorDetail,
  worldMapFeatureCategoryLabel,
  worldMapJobFailure,
  worldMapLayerLabel,
  worldMapsMessages,
  worldMapStageLabel,
  worldMapStatusMeta
} from '../src/i18n/worldMapsMessages.js'

function translator(locale) {
  return (key, parameters = {}) => {
    let value = key.split('.').reduce((item, part) => item?.[part], worldMapsMessages[locale])
    for (const [name, replacement] of Object.entries(parameters)) {
      value = value.replaceAll(`{${name}}`, String(replacement))
    }
    return value
  }
}

function assertSameShape(left, right, path = []) {
  assert.equal(typeof right, typeof left, path.join('.'))
  if (!left || typeof left !== 'object' || Array.isArray(left)) return
  assert.deepEqual(Object.keys(right).sort(), Object.keys(left).sort(), path.join('.'))
  for (const key of Object.keys(left)) assertSameShape(left[key], right[key], [...path, key])
}

test('world map catalogs have matching locale keys', () => {
  assertSameShape(worldMapsMessages['zh-CN'], worldMapsMessages['en-US'])
  assert.doesNotMatch(JSON.stringify(worldMapsMessages['en-US']), /[\u3400-\u9fff]/)
})

test('world map labels translate known protocol values without rewriting unknown values', () => {
  const zh = translator('zh-CN')
  const en = translator('en-US')

  assert.equal(worldMapLayerLabel('features', zh), '实体')
  assert.equal(worldMapLayerLabel('features', en), 'Entities')
  assert.equal(worldMapLayerLabel('customOverlay', en), 'customOverlay')
  assert.deepEqual(worldMapStatusMeta('succeeded', en), { label: 'Available', variant: 'default' })
  assert.equal(worldMapStatusMeta('custom_status', en).label, 'custom_status')
  assert.equal(worldMapStageLabel('validate', en), 'Validating artifacts')
  assert.equal(worldMapFeatureCategoryLabel('resource', zh), '资源')
  assert.equal(worldMapFeatureCategoryLabel('customCategory', en), 'customCategory')
  assert.equal(worldMapStageLabel('custom_stage', zh), 'custom_stage')
})

test('world map errors localize stable codes and preserve custom diagnostics', () => {
  const en = translator('en-US')

  assert.equal(
    worldMapErrorDetail({ code: 'MAP_RENDERER_UNAVAILABLE', message: '地图渲染器不可用' }, en),
    'The map renderer is unavailable; configure it on this node first'
  )
  assert.equal(
    worldMapErrorDetail({ code: 'CUSTOM_RENDERER_ERROR', message: 'renderer exited with code 2' }, en),
    'renderer exited with code 2'
  )
  assert.equal(worldMapJobFailure({ targets: [] }, en), 'The map generation job did not complete successfully')
  assert.equal(worldMapJobFailure({
    targets: [{ status: 'failed', error: { code: 'MAP_GENERATION_FAILED', message: 'renderer exited with code 2' } }]
  }, en), 'renderer exited with code 2')
  assert.equal(
    worldMapDiagnosticError('服务重启导致地图生成中断，可重新生成', en),
    'A service restart interrupted the map generation job'
  )
  assert.equal(worldMapDiagnosticError('renderer exited with code 2', en), 'renderer exited with code 2')
})

test('world map time formatting follows the selected locale', () => {
  const value = '2026-08-10T08:05:04Z'
  assert.equal(formatWorldMapTime(value, 'zh-CN'), new Date(value).toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' }))
  assert.equal(formatWorldMapTime(value, 'en-US'), new Date(value).toLocaleString('en-US', { hour12: false, timeZone: 'Asia/Shanghai' }))
  assert.equal(formatWorldMapTime('invalid', 'en-US'), '--')
})

test('world maps page delegates visible copy and protocol labels to i18n', async () => {
  const page = await readFile(new URL('../src/views/worlds/WorldMaps.vue', import.meta.url), 'utf8')

  assert.match(page, /from 'vue-i18n'/)
  assert.match(page, /\bt\('worldMaps\./)
  assert.match(page, /worldMapLayerLabel\(layer, t\)/)
  assert.match(page, /formatWorldMapTime\(value, locale\.value\)/)
  assert.doesNotMatch(page, /[\u3400-\u9fff]/)
})
